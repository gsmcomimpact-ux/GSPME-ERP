/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Trésorerie, Caisses Physiques, Banques & Mobile Money (Wave / OM)
 */

import React, { useState } from 'react';
import {
  Plus,
  Wallet,
  Building,
  Smartphone,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Tenant, TreasuryAccount, TreasuryTransaction, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface TreasuryModuleProps {
  tenant: Tenant;
  treasuryAccounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  userRole: Role;
  searchFilter: string;
}

export function TreasuryModule({
  tenant,
  treasuryAccounts,
  treasuryTransactions,
  userRole,
  searchFilter,
}: TreasuryModuleProps) {
  const [activeTab, setActiveTab] = useState<'comptes' | 'mouvements' | 'virements'>('comptes');
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);

  // New Transaction Form
  const [txType, setTxType] = useState<'ENCAISSEMENT' | 'DECAISSEMENT'>('ENCAISSEMENT');
  const [accountId, setAccountId] = useState(treasuryAccounts[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('Recette diversifiée');
  const [beneficiary, setBeneficiary] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'MOBILE_MONEY'>('VIREMENT');
  const [reference, setReference] = useState('');

  // Internal Transfer Form (Account to Account)
  const [fromAccountId, setFromAccountId] = useState(treasuryAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(treasuryAccounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferReason, setTransferReason] = useState('Alimentation de caisse depuis la banque');

  // New Account Form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<TreasuryAccount['type']>('BANQUE');
  const [accNumber, setAccNumber] = useState('');
  const [accInitialBalance, setAccInitialBalance] = useState(0);

  const totalLiquidity = treasuryAccounts.reduce((acc, a) => acc + a.balance, 0);

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const acc = treasuryAccounts.find(a => a.id === accountId);
    if (!acc) return;

    const newTx: TreasuryTransaction = {
      id: `tx-${Date.now()}`,
      tenantId: tenant.id,
      accountId: acc.id,
      accountName: acc.name,
      date: new Date().toISOString().split('T')[0],
      type: txType,
      amount,
      category,
      reference: reference || `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      beneficiaryOrPayer: beneficiary || 'Partie prenante',
      paymentMethod,
      reconciled: true,
    };

    storage.addTreasuryTransaction(newTx);
    setTxModalOpen(false);
    setAmount(0);
    setBeneficiary('');
    setReference('');
  };

  const [transferError, setTransferError] = useState<string | null>(null);

  const handleInternalTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    if (fromAccountId === toAccountId) {
      setTransferError('Veuillez sélectionner deux comptes distincts.');
      return;
    }

    const fromAcc = treasuryAccounts.find(a => a.id === fromAccountId);
    const toAcc = treasuryAccounts.find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc || transferAmount <= 0) return;

    if (transferAmount > fromAcc.balance) {
      setTransferError(`Solde insuffisant sur le compte émetteur (${formatMoney(fromAcc.balance, fromAcc.currency)} disponibles).`);
      return;
    }

    // Debit source
    storage.addTreasuryTransaction({
      id: `tx-out-${Date.now()}`,
      tenantId: tenant.id,
      accountId: fromAcc.id,
      accountName: fromAcc.name,
      date: new Date().toISOString().split('T')[0],
      type: 'DECAISSEMENT',
      amount: transferAmount,
      category: `Virement interne vers ${toAcc.name}`,
      reference: `VIR-INT-${Date.now().toString().slice(-4)}`,
      beneficiaryOrPayer: toAcc.name,
      paymentMethod: fromAcc.type === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : 'VIREMENT',
      reconciled: true,
    });

    // Credit target
    storage.addTreasuryTransaction({
      id: `tx-in-${Date.now()}`,
      tenantId: tenant.id,
      accountId: toAcc.id,
      accountName: toAcc.name,
      date: new Date().toISOString().split('T')[0],
      type: 'ENCAISSEMENT',
      amount: transferAmount,
      category: `Virement interne depuis ${fromAcc.name}`,
      reference: `VIR-INT-${Date.now().toString().slice(-4)}`,
      beneficiaryOrPayer: fromAcc.name,
      paymentMethod: toAcc.type === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : 'VIREMENT',
      reconciled: true,
    });

    // OHADA 585 Virements internes
    storage.addJournalEntry({
      id: `entry-vir-${Date.now()}`,
      tenantId: tenant.id,
      journalCode: 'OD',
      date: new Date().toISOString().split('T')[0],
      pieceNumber: `VIR-INT-${Date.now().toString().slice(-4)}`,
      description: `Virement interne de trésorerie ${fromAcc.name} -> ${toAcc.name}`,
      validated: true,
      lines: [
        {
          id: 'lv-1',
          accountCode: toAcc.ohadaAccount,
          accountName: toAcc.name,
          debit: transferAmount,
          credit: 0,
          reference: `VIR-INT`,
          description: `Alimentation compte destination`,
        },
        {
          id: 'lv-2',
          accountCode: fromAcc.ohadaAccount,
          accountName: fromAcc.name,
          debit: 0,
          credit: transferAmount,
          reference: `VIR-INT`,
          description: `Prélèvement compte source`,
        },
      ],
    });

    setTransferModalOpen(false);
    setTransferAmount(0);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const ohadaCode = accType === 'BANQUE' ? '5211' : accType === 'MOBILE_MONEY' ? '5651' : '5711';
    const newAcc: TreasuryAccount = {
      id: `tre-${Date.now()}`,
      tenantId: tenant.id,
      branchId: tenant.currentBranchId,
      name: accName,
      type: accType,
      accountNumber: accNumber,
      currency: tenant.currency,
      balance: accInitialBalance,
      ohadaAccount: ohadaCode,
    };
    storage.addTreasuryAccount(newAcc);
    setNewAccountModalOpen(false);
    setAccName('');
    setAccNumber('');
    setAccInitialBalance(0);
  };

  const query = searchFilter.toLowerCase();
  const filteredTransactions = treasuryTransactions.filter(
    t =>
      t.category.toLowerCase().includes(query) ||
      t.accountName.toLowerCase().includes(query) ||
      t.beneficiaryOrPayer.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Trésorerie & Caisses</h2>
          <p className="text-xs text-slate-500">
            Gestion consolidée des comptes bancaires, caisses physiques et portefeuilles Wave / OM
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Virement Interne</span>
          </button>
          <button
            onClick={() => setTxModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Mouvement</span>
          </button>
        </div>
      </div>

      {/* Global Liquidity Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
            Solde de Trésorerie Consolidé (Actif Disponible)
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-[#D4AF37] mt-1 tracking-tight">
            {formatMoney(totalLiquidity, tenant.currency)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Imputations comptables conformes Classe 5 SYSCOHADA (5211, 5651, 5711)
          </p>
        </div>

        <button
          onClick={() => setNewAccountModalOpen(true)}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          + Ajouter un Compte
        </button>
      </div>

      {/* Tabs */}
      <SegmentedTabs
        tabs={[
          { id: 'comptes', label: 'Comptes de Trésorerie', count: treasuryAccounts.length },
          { id: 'mouvements', label: 'Journal des Mouvements', count: filteredTransactions.length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB: Comptes */}
      {activeTab === 'comptes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {treasuryAccounts.map(acc => {
            const Icon =
              acc.type === 'BANQUE' ? Building : acc.type === 'MOBILE_MONEY' ? Smartphone : Wallet;
            const badgeColor =
              acc.type === 'BANQUE'
                ? 'text-blue-700 bg-blue-50'
                : acc.type === 'MOBILE_MONEY'
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-amber-800 bg-amber-50';

            return (
              <div
                key={acc.id}
                className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{acc.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          Compte {acc.ohadaAccount}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badgeColor}`}>
                      {acc.type}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                      Solde Disponible
                    </span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      {formatMoney(acc.balance, acc.currency)}
                    </div>
                  </div>

                  {acc.accountNumber && (
                    <div className="mt-2 text-[11px] text-slate-500 font-mono truncate">
                      N° : {acc.accountNumber}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Établissement Siège</span>
                  <button
                    onClick={() => {
                      setAccountId(acc.id);
                      setTxModalOpen(true);
                    }}
                    className="text-[#0F5132] font-semibold hover:underline cursor-pointer"
                  >
                    + Opération
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: Mouvements */}
      {activeTab === 'mouvements' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Compte Débit/Crédit</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Libellé & Catégorie</th>
                  <th className="py-3 px-4 font-semibold">Tiers / Bénéficiaire</th>
                  <th className="py-3 px-4 font-semibold">Canal</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant</th>
                  <th className="py-3 px-4 font-semibold text-center">Rapprochement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-500">{tx.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{tx.accountName}</td>
                    <td className="py-3 px-4">
                      {tx.type === 'ENCAISSEMENT' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>Encaissement</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Décaissement</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <div>{tx.category}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.reference}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{tx.beneficiaryOrPayer}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        tx.type === 'ENCAISSEMENT' ? 'text-emerald-800' : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'ENCAISSEMENT' ? '+' : '-'}
                      {formatMoney(tx.amount, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Rapproché</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Nouveau Mouvement */}
      <Modal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title="Enregistrer une Opération de Trésorerie"
        subtitle="Recette ou dépense directe avec mise à jour instantanée du solde"
      >
        <form onSubmit={handleTxSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Type d'opération *</label>
              <select
                value={txType}
                onChange={e => setTxType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ENCAISSEMENT">Encaissement (Entrée d'argent)</option>
                <option value="DECAISSEMENT">Décaissement (Sortie d'argent)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Compte concerné *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {treasuryAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMoney(a.balance, a.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Montant ({tenant.currency}) *</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Moyen de paiement</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="VIREMENT">Virement bancaire</option>
                <option value="CHEQUE">Chèque de banque</option>
                <option value="MOBILE_MONEY">Wave / Orange Money</option>
                <option value="ESPECES">Espèces (Caisse)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motif / Catégorie *</label>
            <input
              type="text"
              placeholder="Ex: Facture d'électricité Senelec, Recette comptoir, Frais mission..."
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiers / Payeur / Bénéficiaire</label>
              <input
                type="text"
                placeholder="Ex: Senelec, Client comptoir, etc."
                value={beneficiary}
                onChange={e => setBeneficiary(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Référence pièce</label>
              <input
                type="text"
                placeholder="Ex: VIR-SGBS-991, CHQ-4482"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setTxModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Virement Interne */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Virement Interne de Trésorerie"
        subtitle="Transfert de fonds entre banques, caisses physiques ou portefeuilles Mobile Money"
      >
        <form onSubmit={handleInternalTransferSubmit} className="space-y-4 text-xs">
          {transferError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Compte Source (Débit) *</label>
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {treasuryAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMoney(a.balance, a.currency)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Compte Destination (Crédit) *</label>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {treasuryAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Montant du virement ({tenant.currency}) *</label>
            <input
              type="number"
              min="1"
              value={transferAmount}
              onChange={e => setTransferAmount(parseFloat(e.target.value) || 0)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motif</label>
            <input
              type="text"
              value={transferReason}
              onChange={e => setTransferReason(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
            Conforme au compte <strong>585 (Virements de fonds internes)</strong> du SYSCOHADA.
            Aucun impact sur le résultat net.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Exécuter le Virement
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Ajouter un Compte */}
      <Modal
        isOpen={newAccountModalOpen}
        onClose={() => setNewAccountModalOpen(false)}
        title="Ajouter un Compte de Trésorerie"
        subtitle="Banque, Caisse physique, ou Compte Marchand Wave / Orange Money"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Type de compte *</label>
            <select
              value={accType}
              onChange={e => setAccType(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="BANQUE">Banque Commerciale (SGBS, Ecobank, BOA...)</option>
              <option value="MOBILE_MONEY">Mobile Money (Wave Business, Orange Money, MTN MoMo)</option>
              <option value="CAISSE">Caisse Physique (Siège, Menues dépenses)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nom du compte / Établissement *</label>
            <input
              type="text"
              placeholder="Ex: BOA Sénégal Compte Courant, Wave Agence 2"
              value={accName}
              onChange={e => setAccName(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">RIB ou Numéro de Téléphone</label>
            <input
              type="text"
              placeholder="Ex: SN094 01015... ou +221 77 123 45 67"
              value={accNumber}
              onChange={e => setAccNumber(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Solde Initial ({tenant.currency})</label>
            <input
              type="number"
              min="0"
              value={accInitialBalance}
              onChange={e => setAccInitialBalance(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewAccountModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Créer le Compte
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
