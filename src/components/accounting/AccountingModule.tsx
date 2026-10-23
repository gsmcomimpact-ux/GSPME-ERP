/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Comptabilité OHADA / SYSCOHADA Révisé
 */

import React, { useState } from 'react';
import {
  BookOpenCheck,
  FileSpreadsheet,
  Plus,
  Scale,
  Search,
  CheckCircle,
  FileText,
  TrendingUp,
  Download,
  Building,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { Tenant, JournalEntry, Role, OHADAAccount } from '../../types';
import { SYSCOHADA_PLAN_COMPTABLE } from '../../services/accountingEngine';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { computeStatements, balanceToRows, journalToRows, statementsToRows } from '../../services/financialStatements';
import { downloadCsv, slugify } from '../../services/exportService';

interface AccountingModuleProps {
  tenant: Tenant;
  journalEntries: JournalEntry[];
  userRole: Role;
  searchFilter: string;
}

export function AccountingModule({
  tenant,
  journalEntries,
  userRole,
  searchFilter,
}: AccountingModuleProps) {
  const [activeTab, setActiveTab] = useState<'journal' | 'grandLivre' | 'balance' | 'etats' | 'plan'>('journal');
  const [newEntryModalOpen, setNewEntryModalOpen] = useState(false);
  const [selectedJournalFilter, setSelectedJournalFilter] = useState<string>('ALL');

  // Saisie manuelle d'écriture
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalCode, setJournalCode] = useState<'OD' | 'VT' | 'AC' | 'BQ' | 'CA'>('OD');
  const [pieceNumber, setPieceNumber] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryLines, setEntryLines] = useState([
    { accountCode: '622', accountName: 'Locations et charges locatives', debit: 0, credit: 0, description: '' },
    { accountCode: '5211', accountName: 'Banques locales', debit: 0, credit: 0, description: '' },
  ]);

  // Calculations for Grand Livre and Balance
  const accountTotals: Record<string, { name: string; debit: number; credit: number; classe: number }> = {};

  journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (!accountTotals[line.accountCode]) {
        const found = SYSCOHADA_PLAN_COMPTABLE.find(a => a.code === line.accountCode);
        accountTotals[line.accountCode] = {
          name: line.accountName || found?.name || 'Compte auxiliaire',
          debit: 0,
          credit: 0,
          classe: found?.classe || parseInt(line.accountCode[0]) || 4,
        };
      }
      accountTotals[line.accountCode].debit += line.debit;
      accountTotals[line.accountCode].credit += line.credit;
    });
  });

  const balanceAccounts = Object.keys(accountTotals)
    .sort()
    .map(code => {
      const item = accountTotals[code];
      const soldeDebiteur = item.debit > item.credit ? item.debit - item.credit : 0;
      const soldeCrediteur = item.credit > item.debit ? item.credit - item.debit : 0;
      return {
        code,
        name: item.name,
        debit: item.debit,
        credit: item.credit,
        soldeDebiteur,
        soldeCrediteur,
        classe: item.classe,
      };
    });

  const totalJournalDebit = journalEntries.reduce(
    (acc, e) => acc + e.lines.reduce((s, l) => s + l.debit, 0),
    0
  );
  const totalJournalCredit = journalEntries.reduce(
    (acc, e) => acc + e.lines.reduce((s, l) => s + l.credit, 0),
    0
  );

  // Computations for Compte de Résultat OHADA
  const ventes701 = balanceAccounts.find(a => a.code === '701')?.credit || 0;
  const achats601 = balanceAccounts.find(a => a.code === '601')?.debit || 0;
  const margeCommerciale = ventes701 - achats601;

  const autresCharges605_632 = balanceAccounts
    .filter(a => ['605', '612', '622', '624', '628', '632'].includes(a.code))
    .reduce((acc, a) => acc + a.debit, 0);
  const valeurAjoutee = margeCommerciale - autresCharges605_632;

  const chargesPersonnel661 = balanceAccounts
    .filter(a => ['661', '664'].includes(a.code))
    .reduce((acc, a) => acc + a.debit, 0);
  const ebe = valeurAjoutee - chargesPersonnel661;
  const resultatNetEstime = ebe;

  const [entryError, setEntryError] = useState<string | null>(null);

  // États financiers SYSCOHADA (même source pour l'écran et les exports)
  const statements = computeStatements(journalEntries);
  const fileBase = `${slugify(tenant.name)}-${statements.asOf}`;
  const exportBilanPdf = () => {
    PdfService.downloadFinancialStatementsPdf(statements, tenant, `bilan-${fileBase}.pdf`);
    storage.logAudit('EXPORT', 'COMPTABILITE', 'Export du bilan et du compte de résultat (PDF)');
  };
  const exportBilanCsv = () => {
    downloadCsv(statementsToRows(statements, tenant.name, tenant.currency), `bilan-${fileBase}.csv`, { decimalComma: true });
    storage.logAudit('EXPORT', 'COMPTABILITE', 'Export du bilan et du compte de résultat (Excel/CSV)');
  };

  const handleManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);
    const sumDebit = entryLines.reduce((s, l) => s + l.debit, 0);
    const sumCredit = entryLines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(sumDebit - sumCredit) > 0.01) {
      setEntryError(`L'écriture n'est pas équilibrée ! Débit (${formatMoney(sumDebit, tenant.currency)}) != Crédit (${formatMoney(sumCredit, tenant.currency)})`);
      return;
    }

    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      tenantId: tenant.id,
      journalCode,
      date: entryDate,
      pieceNumber: pieceNumber || `OD-${Date.now().toString().slice(-4)}`,
      description: entryDesc,
      lines: entryLines.map((l, idx) => ({
        id: `l-${Date.now()}-${idx}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit,
        credit: l.credit,
        reference: pieceNumber || 'OD',
        description: l.description || entryDesc,
      })),
      validated: true,
    };

    storage.addJournalEntry(newEntry);
    setNewEntryModalOpen(false);
    setPieceNumber('');
    setEntryDesc('');
  };

  const filteredEntries = journalEntries.filter(e => {
    const matchesJournal = selectedJournalFilter === 'ALL' || e.journalCode === selectedJournalFilter;
    const q = searchFilter.toLowerCase();
    const matchesQuery =
      e.description.toLowerCase().includes(q) ||
      e.pieceNumber.toLowerCase().includes(q) ||
      e.lines.some(l => l.accountCode.includes(q) || l.accountName.toLowerCase().includes(q));
    return matchesJournal && matchesQuery;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Comptabilité SYSCOHADA Révisé</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              OHADA Conforme
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Livre-Journal, Grand Livre, Balance 4 colonnes et Bilan / Compte de Résultat
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewEntryModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Saisie d'Écriture Manuelle</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <SegmentedTabs
        tabs={[
          { id: 'journal', label: 'Livre-Journal des Écritures', count: filteredEntries.length },
          { id: 'grandLivre', label: 'Grand Livre des Comptes', count: balanceAccounts.length },
          { id: 'balance', label: 'Balance Générale 4 Colonnes' },
          { id: 'etats', label: 'Bilan & Compte de Résultat' },
          { id: 'plan', label: 'Plan de Comptes SYSCOHADA' },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB: Journal */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Journal Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Filtrer par Journal :</span>
              {['ALL', 'VT', 'AC', 'BQ', 'CA', 'OD'].map(j => (
                <button
                  key={j}
                  onClick={() => setSelectedJournalFilter(j)}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    selectedJournalFilter === j
                      ? 'bg-[#0F5132] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {j === 'ALL'
                    ? 'Tous'
                    : j === 'VT'
                    ? 'VT (Ventes)'
                    : j === 'AC'
                    ? 'AC (Achats)'
                    : j === 'BQ'
                    ? 'BQ (Banque)'
                    : j === 'CA'
                    ? 'CA (Caisse)'
                    : 'OD (Divers)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-slate-700 font-medium">
              <button
                onClick={() => {
                  downloadCsv(journalToRows(filteredEntries), `journal-${fileBase}.csv`, { decimalComma: true });
                  storage.logAudit('EXPORT', 'COMPTABILITE', `Export du livre-journal (${filteredEntries.length} écritures)`);
                }}
                className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                title="Exporter les écritures affichées vers Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter CSV</span>
              </button>
              <span>
                Total Débit : <strong>{formatMoney(totalJournalDebit, tenant.currency)}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">|</span>
              <span>
                Total Crédit : <strong>{formatMoney(totalJournalCredit, tenant.currency)}</strong>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  Math.abs(totalJournalDebit - totalJournalCredit) < 1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {Math.abs(totalJournalDebit - totalJournalCredit) < 1
                  ? 'Équilibré (Partie Double)'
                  : 'Déséquilibre'}
              </span>
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded">
                      Journal {entry.journalCode}
                    </span>
                    <span className="text-slate-500">{entry.date}</span>
                    <span className="font-semibold text-slate-800">Pièce : {entry.pieceNumber}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600 font-medium">{entry.description}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Validée</span>
                  </span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-4 w-28">N° Compte</th>
                      <th className="py-2 px-4">Intitulé du Compte</th>
                      <th className="py-2 px-4">Libellé d'écriture</th>
                      <th className="py-2 px-4 text-right w-36">Débit</th>
                      <th className="py-2 px-4 text-right w-36">Crédit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entry.lines.map(line => (
                      <tr key={line.id} className="hover:bg-slate-50/40">
                        <td className="py-2 px-4 font-mono font-bold text-slate-900">
                          {line.accountCode}
                        </td>
                        <td className="py-2 px-4 text-slate-800">{line.accountName}</td>
                        <td className="py-2 px-4 text-slate-500">{line.description}</td>
                        <td className="py-2 px-4 text-right font-medium text-slate-900">
                          {line.debit > 0 ? formatMoney(line.debit, tenant.currency) : '-'}
                        </td>
                        <td className="py-2 px-4 text-right font-medium text-slate-900">
                          {line.credit > 0 ? formatMoney(line.credit, tenant.currency) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Balance Générale 4 Colonnes */}
      {activeTab === 'balance' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Balance Générale des Comptes (Norme SYSCOHADA)</h3>
              <p className="text-slate-500 text-[11px]">Exercice en cours · {tenant.name}</p>
            </div>
            <div className="flex items-center gap-2">
            <button
              onClick={() => {
                downloadCsv(balanceToRows(statements.balance), `balance-${fileBase}.csv`, { decimalComma: true });
                storage.logAudit('EXPORT', 'COMPTABILITE', 'Export de la balance générale (CSV)');
              }}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Exporter la balance générale vers Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en Excel (CSV)</span>
            </button>
            <button
              onClick={() => PdfService.printCurrent()}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Imprimer la Balance Générale"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer la Balance</span>
            </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4 w-24">N° Compte</th>
                  <th className="py-3 px-4">Intitulé du Compte OHADA</th>
                  <th className="py-3 px-4 text-right">Mouvements Débit</th>
                  <th className="py-3 px-4 text-right">Mouvements Crédit</th>
                  <th className="py-3 px-4 text-right text-emerald-900">Solde Débiteur</th>
                  <th className="py-3 px-4 text-right text-blue-900">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balanceAccounts.map(b => (
                  <tr key={b.code} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{b.code}</td>
                    <td className="py-2.5 px-4 text-slate-800">{b.name}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {formatMoney(b.debit, tenant.currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {formatMoney(b.credit, tenant.currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-800">
                      {b.soldeDebiteur > 0 ? formatMoney(b.soldeDebiteur, tenant.currency) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-blue-800">
                      {b.soldeCrediteur > 0 ? formatMoney(b.soldeCrediteur, tenant.currency) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3 px-4">TOTAUX GÉNÉRAUX</td>
                  <td className="py-3 px-4 text-right">{formatMoney(totalJournalDebit, tenant.currency)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(totalJournalCredit, tenant.currency)}</td>
                  <td className="py-3 px-4 text-right text-emerald-800">
                    {formatMoney(
                      balanceAccounts.reduce((s, a) => s + a.soldeDebiteur, 0),
                      tenant.currency
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-800">
                    {formatMoney(
                      balanceAccounts.reduce((s, a) => s + a.soldeCrediteur, 0),
                      tenant.currency
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Bilan & Compte de Résultat */}
      {activeTab === 'etats' && (
        <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
          <span className="text-slate-600">
            États établis à partir de <strong>{journalEntries.filter(e => e.validated !== false).length}</strong> écritures validées.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={exportBilanPdf}
              className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exporter en PDF</span>
            </button>
            <button
              onClick={exportBilanCsv}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exporter en Excel (CSV)</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compte de Résultat SYSCOHADA */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Compte de Résultat SYSCOHADA Révisé
              </h3>
              <p className="text-xs text-slate-500">
                Soldes Intermédiaires de Gestion (SIG)
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">+ Ventes de marchandises (701)</span>
                <span className="font-semibold text-slate-800">{formatMoney(ventes701, tenant.currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">- Achats de marchandises (601)</span>
                <span className="font-semibold text-slate-800">({formatMoney(achats601, tenant.currency)})</span>
              </div>
              <div className="flex justify-between py-1.5 bg-slate-50 px-2 rounded font-bold text-slate-900">
                <span>= MARGE COMMERCIALE</span>
                <span className="text-[#0F5132]">{formatMoney(margeCommerciale, tenant.currency)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">- Autres achats & charges externes (605, 622, 632)</span>
                <span className="font-semibold text-slate-800">({formatMoney(autresCharges605_632, tenant.currency)})</span>
              </div>
              <div className="flex justify-between py-1.5 bg-slate-50 px-2 rounded font-bold text-slate-900">
                <span>= VALEUR AJOUTÉE (VA)</span>
                <span className="text-[#0F5132]">{formatMoney(valeurAjoutee, tenant.currency)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">- Charges de personnel (661, 664)</span>
                <span className="font-semibold text-slate-800">({formatMoney(chargesPersonnel661, tenant.currency)})</span>
              </div>
              <div className="flex justify-between py-1.5 bg-[#0F5132]/10 px-2 rounded font-extrabold text-sm text-[#0F5132]">
                <span>= EXCÉDENT BRUT D'EXPLOITATION (EBE)</span>
                <span>{formatMoney(ebe, tenant.currency)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between font-extrabold text-base text-slate-900">
                <span>RÉSULTAT NET DE L'EXERCICE</span>
                <span className="text-[#0F5132]">{formatMoney(resultatNetEstime, tenant.currency)}</span>
              </div>
            </div>
          </div>

          {/* Bilan Synthétique OHADA */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Bilan Synthétique (Actif / Passif)</h3>
              <p className="text-xs text-slate-500">Structure patrimoniale en {tenant.currency} · arrêtée au {statements.asOf}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {[
                { title: 'ACTIF (Emplois)', sections: statements.actif, total: statements.totalActif },
                { title: 'PASSIF (Ressources)', sections: statements.passif, total: statements.totalPassif },
              ].map(col => (
                <div key={col.title} className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                    {col.title}
                  </h4>
                  {col.sections.map(sec => (
                    <div key={sec.title}>
                      <div className="text-slate-500">{sec.title}</div>
                      <div className="font-bold text-slate-800">{formatMoney(sec.total, tenant.currency)}</div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-[#0F5132]">
                    <span>Total</span>
                    <span>{formatMoney(col.total, tenant.currency)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`text-[11px] font-semibold px-3 py-2 rounded-lg ${
                statements.ecart === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {statements.ecart === 0
                ? 'Bilan équilibré : total actif = total passif.'
                : `Écart actif − passif : ${formatMoney(statements.ecart, tenant.currency)} — vérifiez les écritures déséquilibrées.`}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB: Plan de Comptes OHADA */}
      {activeTab === 'plan' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span>Nomenclature officielle SYSCOHADA Révisé (Classes 1 à 9)</span>
            <span className="font-semibold text-slate-800">{SYSCOHADA_PLAN_COMPTABLE.length} comptes de base</span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 w-28">N° Compte</th>
                  <th className="py-2.5 px-4">Intitulé SYSCOHADA</th>
                  <th className="py-2.5 px-4 w-28 text-center">Classe</th>
                  <th className="py-2.5 px-4 w-28 text-center">Type</th>
                  <th className="py-2.5 px-4 w-28 text-center">Nature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SYSCOHADA_PLAN_COMPTABLE.map(acc => (
                  <tr key={acc.code} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acc.code}</td>
                    <td className="py-2.5 px-4 text-slate-800">{acc.name}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                        Classe {acc.classe}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600">{acc.type}</td>
                    <td className="py-2.5 px-4 text-center text-slate-500">{acc.nature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Saisie Manuelle au Journal */}
      <Modal
        isOpen={newEntryModalOpen}
        onClose={() => setNewEntryModalOpen(false)}
        title="Saisie d'Écriture Manuelle au Journal (Partie Double)"
        subtitle="Vérification de l'égalité stricte Débit = Crédit"
        maxWidth="2xl"
      >
        <form onSubmit={handleManualEntrySubmit} className="space-y-4 text-xs">
          {entryError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{entryError}</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Journal *</label>
              <select
                value={journalCode}
                onChange={e => setJournalCode(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="OD">OD - Opérations Diverses</option>
                <option value="BQ">BQ - Banque</option>
                <option value="CA">CA - Caisse</option>
                <option value="VT">VT - Ventes</option>
                <option value="AC">AC - Achats</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">N° Pièce Justificative</label>
              <input
                type="text"
                placeholder="Ex: OD-2026-09"
                value={pieceNumber}
                onChange={e => setPieceNumber(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Libellé général *</label>
            <input
              type="text"
              placeholder="Ex: Paiement loyer bureau Plateau par virement..."
              value={entryDesc}
              onChange={e => setEntryDesc(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Lines */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-2 w-32">Compte</th>
                  <th className="p-2">Intitulé</th>
                  <th className="p-2 text-right w-28">Débit</th>
                  <th className="p-2 text-right w-28">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entryLines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select
                        value={line.accountCode}
                        onChange={e => {
                          const updated = [...entryLines];
                          const found = SYSCOHADA_PLAN_COMPTABLE.find(a => a.code === e.target.value);
                          updated[idx].accountCode = e.target.value;
                          updated[idx].accountName = found?.name || '';
                          setEntryLines(updated);
                        }}
                        className="w-full p-1 border border-slate-200 rounded text-xs bg-white font-mono"
                      >
                        {SYSCOHADA_PLAN_COMPTABLE.map(a => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.name.slice(0, 20)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-slate-700 text-[11px] truncate">{line.accountName}</td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.debit}
                        onChange={e => {
                          const updated = [...entryLines];
                          updated[idx].debit = parseFloat(e.target.value) || 0;
                          setEntryLines(updated);
                        }}
                        className="w-full p-1 border border-slate-200 rounded text-right text-xs"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.credit}
                        onChange={e => {
                          const updated = [...entryLines];
                          updated[idx].credit = parseFloat(e.target.value) || 0;
                          setEntryLines(updated);
                        }}
                        className="w-full p-1 border border-slate-200 rounded text-right text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-xs font-bold pt-2">
            <span>
              Total Débit : {formatMoney(entryLines.reduce((s, l) => s + l.debit, 0), tenant.currency)}
            </span>
            <span>
              Total Crédit : {formatMoney(entryLines.reduce((s, l) => s + l.credit, 0), tenant.currency)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setNewEntryModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Valider l'Écriture
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
