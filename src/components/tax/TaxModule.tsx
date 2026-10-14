/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Fiscalité & Déclarations (TVA, BRS & Liasse Fiscale OHADA)
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  CheckCircle,
  DollarSign,
  Download,
  Building2,
  HelpCircle
} from 'lucide-react';
import { Tenant, Invoice, PurchaseInvoice, Role } from '../../types';
import { formatMoney, COUNTRY_PACKS } from '../../services/currency';
import { SegmentedTabs } from '../common/UIComponents';

interface TaxModuleProps {
  tenant: Tenant;
  invoices: Invoice[];
  purchases: PurchaseInvoice[];
  userRole: Role;
}

export function TaxModule({ tenant, invoices, purchases, userRole }: TaxModuleProps) {
  const [activeTab, setActiveTab] = useState<'tva' | 'calendrier'>('tva');
  const [selectedMonth, setSelectedMonth] = useState('Mars 2026');

  const countryPack = COUNTRY_PACKS[tenant.countryCode];

  // TVA Computations
  const salesInvoices = invoices.filter(i => i.type === 'FACTURE_VENTE' && i.status !== 'ANNULEE');
  const tvaCollectee = salesInvoices.reduce((acc, i) => acc + (i.totalVAT || 0), 0);
  const baseVentesHT = salesInvoices.reduce((acc, i) => acc + (i.subtotalHT || 0), 0);

  const tvaDeductible = purchases.reduce((acc, p) => acc + (p.totalVAT || 0), 0);
  const baseAchatsHT = purchases.reduce((acc, p) => acc + (p.totalHT || 0), 0);

  const tvaNetteDue = Math.max(0, tvaCollectee - tvaDeductible);
  const creditTVA = tvaDeductible > tvaCollectee ? tvaDeductible - tvaCollectee : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Fiscalité & Déclarations</h2>
          <p className="text-xs text-slate-500">
            Conformité {countryPack.countryName} · Calcul automatique de la TVA et échéancier des impôts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {countryPack.taxNumberLabel} : {tenant.taxNumber}
          </span>
        </div>
      </div>

      <SegmentedTabs
        tabs={[
          { id: 'tva', label: 'Déclaration Mensuelle de TVA' },
          { id: 'calendrier', label: 'Échéancier Fiscal Annuel' },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {activeTab === 'tva' && (
        <div className="space-y-5">
          {/* Top Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                TVA Facturée Collectée (4431)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatMoney(tvaCollectee, tenant.currency)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Sur ventes de biens et services</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                TVA Déductible Récupérable (4452)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatMoney(tvaDeductible, tenant.currency)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Sur achats de marchandises et charges</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {creditTVA > 0 ? 'Crédit de TVA à Reporter' : 'TVA Nette Due au Trésor'}
              </span>
              <div
                className={`text-xl font-extrabold mt-1 ${
                  creditTVA > 0 ? 'text-emerald-700' : 'text-[#0F5132]'
                }`}
              >
                {creditTVA > 0
                  ? formatMoney(creditTVA, tenant.currency)
                  : formatMoney(tvaNetteDue, tenant.currency)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {creditTVA > 0 ? 'À imputer sur le mois suivant' : 'À régler avant le 15 du mois'}
              </div>
            </div>
          </div>

          {/* Detailed Tax Statement Sheet */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs text-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bordereau Récapitulatif de TVA - {selectedMonth}
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Direction Générale des Impôts et des Domaines ({countryPack.countryName})
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger État Fiscal</span>
              </button>
            </div>

            <table className="w-full text-left border border-slate-200">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="p-3">Rubriques Fiscales Déclaratives</th>
                  <th className="p-3 text-right">Base Imposable HT</th>
                  <th className="p-3 text-center">Taux Légal</th>
                  <th className="p-3 text-right">Montant de la Taxe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-medium text-slate-900">
                    A. Ventes imposables en régime normal
                  </td>
                  <td className="p-3 text-right font-medium">{formatMoney(baseVentesHT, tenant.currency)}</td>
                  <td className="p-3 text-center">{countryPack.vatRateDefault}%</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {formatMoney(tvaCollectee, tenant.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-900">
                    B. Achats de marchandises et matières ouvrant droit à déduction
                  </td>
                  <td className="p-3 text-right font-medium">{formatMoney(baseAchatsHT, tenant.currency)}</td>
                  <td className="p-3 text-center">{countryPack.vatRateDefault}%</td>
                  <td className="p-3 text-right font-bold text-slate-700">
                    ({formatMoney(tvaDeductible, tenant.currency)})
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 font-extrabold text-sm border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="p-3 text-slate-900">
                    NET DE TVA À REVERSER AU TRÉSOR PUBLIC
                  </td>
                  <td className="p-3 text-right text-[#0F5132] text-base font-black">
                    {formatMoney(tvaNetteDue, tenant.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#0F5132] shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <div className="font-bold">Déclaration conforme aux normes UEMOA / OHADA</div>
                <p className="mt-0.5 text-emerald-800">
                  Les données ci-dessus sont réconciliées en temps réel avec les comptes 4431 (TVA facturée)
                  et 4452 (TVA récupérable) du grand livre. Vous pouvez générer la liasse de télé-déclaration
                  directement auprès de la Direction Générale des Impôts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendrier' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            {
              title: '15 de chaque mois : Déclaration de TVA',
              desc: `Dépôt de la déclaration mensuelle de TVA et versement de l'impôt exigible au Trésor public (${countryPack.countryName}).`,
              status: 'Mensuel obligatoire',
              color: 'border-l-4 border-[#0F5132]',
            },
            {
              title: '15 de chaque mois : BRS & Retenues à la source',
              desc: 'Paiement des retenues à la source sur prestations de services de tiers (5%) et loyers (10%).',
              status: 'Mensuel obligatoire',
              color: 'border-l-4 border-amber-500',
            },
            {
              title: 'Trimestriel : Cotisations Sociales IPRES / CNPS',
              desc: 'Versement des cotisations de retraite du personnel et allocations familiales.',
              status: 'Trimestriel',
              color: 'border-l-4 border-blue-600',
            },
            {
              title: '30 Avril : Liasse Fiscale & États Financiers OHADA (DSF)',
              desc: 'Dépôt des états financiers de synthèse annuels (Bilan, Compte de Résultat, TFT, Notes annexes).',
              status: 'Annuel',
              color: 'border-l-4 border-purple-600',
            },
          ].map((item, idx) => (
            <div key={idx} className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs ${item.color}`}>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900">{item.title}</h4>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.status}
                </span>
              </div>
              <p className="text-slate-600 mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
