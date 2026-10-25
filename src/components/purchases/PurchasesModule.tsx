/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Achats, Fournisseurs & Dépenses d'Exploitation
 */

import React, { useState } from 'react';
import { Plus, ShoppingCart, Truck, CreditCard, Building, Calendar } from 'lucide-react';
import { Tenant, PurchaseInvoice, Supplier, TreasuryAccount, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs, StatusIndicator } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface PurchasesModuleProps {
  tenant: Tenant;
  purchases: PurchaseInvoice[];
  suppliers: Supplier[];
  treasuryAccounts: TreasuryAccount[];
  userRole: Role;
  searchFilter: string;
}

export function PurchasesModule({
  tenant,
  purchases,
  suppliers,
  treasuryAccounts,
  userRole,
  searchFilter,
}: PurchasesModuleProps) {
  const [activeTab, setActiveTab] = useState<'factures' | 'fournisseurs'>('factures');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPurchaseForPay, setSelectedPurchaseForPay] = useState<PurchaseInvoice | null>(null);

  // New Purchase Form
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [amountHT, setAmountHT] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(tenant.countryCode === 'CM' ? 19.25 : 18);
  const [expenseCategory, setExpenseCategory] = useState('Achats de marchandises en stock');
  const [ohadaAccount, setOhadaAccount] = useState('601');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const calculatedVAT = (amountHT * vatRate) / 100;
  const calculatedTTC = amountHT + calculatedVAT;

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) return;

    const newPurchase: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      tenantId: tenant.id,
      number: invoiceNumber || `FAC-FOURN-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: supp.id,
      supplierName: supp.name,
      date,
      dueDate,
      status: 'VALIDEE',
      totalHT: amountHT,
      totalVAT: calculatedVAT,
      totalTTC: calculatedTTC,
      paidAmount: 0,
      expenseCategory,
      ohadaAccount,
    };

    storage.addPurchase(newPurchase);

    // Generate OHADA entry
    storage.addJournalEntry({
      id: `entry-pur-${Date.now()}`,
      tenantId: tenant.id,
      journalCode: 'AC',
      date,
      pieceNumber: newPurchase.number,
      description: `Achat ${supp.name} (${newPurchase.number})`,
      validated: true,
      lines: [
        {
          id: `l-p-1`,
          accountCode: ohadaAccount,
          accountName: expenseCategory,
          debit: amountHT,
          credit: 0,
          reference: newPurchase.number,
          description: `Charges d'achat HT`,
        },
        {
          id: `l-p-2`,
          accountCode: '4452',
          accountName: 'État - TVA récupérable sur achats',
          debit: calculatedVAT,
          credit: 0,
          reference: newPurchase.number,
          description: `TVA déductible`,
        },
        {
          id: `l-p-3`,
          accountCode: '4011',
          accountName: 'Fournisseurs - Dettes d’exploitation',
          debit: 0,
          credit: calculatedTTC,
          reference: newPurchase.number,
          description: `Dette fournisseur ${supp.name}`,
        },
      ],
    });

    setCreateModalOpen(false);
    setAmountHT(0);
    setInvoiceNumber('');
  };

  const handlePayPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseForPay || paymentAmount <= 0) return;

    const acc = treasuryAccounts.find(a => a.id === paymentAccountId) || treasuryAccounts[0];

    // Record treasury cash out
    storage.addTreasuryTransaction({
      id: `tx-${Date.now()}`,
      tenantId: tenant.id,
      accountId: acc.id,
      accountName: acc.name,
      date: new Date().toISOString().split('T')[0],
      type: 'DECAISSEMENT',
      amount: paymentAmount,
      category: `Règlement fournisseur ${selectedPurchaseForPay.supplierName}`,
      reference: `REG-${selectedPurchaseForPay.number}`,
      beneficiaryOrPayer: selectedPurchaseForPay.supplierName,
      paymentMethod: acc.type === 'BANQUE' ? 'VIREMENT' : 'ESPECES',
      reconciled: true,
    });

    // Journal entry: Debit 4011 / Credit 5211
    storage.addJournalEntry({
      id: `entry-paypur-${Date.now()}`,
      tenantId: tenant.id,
      journalCode: acc.type === 'BANQUE' ? 'BQ' : 'CA',
      date: new Date().toISOString().split('T')[0],
      pieceNumber: `REG-${selectedPurchaseForPay.number}`,
      description: `Règlement facture ${selectedPurchaseForPay.number} (${selectedPurchaseForPay.supplierName})`,
      validated: true,
      lines: [
        {
          id: 'lp-1',
          accountCode: '4011',
          accountName: 'Fournisseurs - Dettes d’exploitation',
          debit: paymentAmount,
          credit: 0,
          reference: selectedPurchaseForPay.number,
          description: 'Règlement dette fournisseur',
        },
        {
          id: 'lp-2',
          accountCode: acc.ohadaAccount,
          accountName: acc.name,
          debit: 0,
          credit: paymentAmount,
          reference: selectedPurchaseForPay.number,
          description: 'Décaissement trésorerie',
        },
      ],
    });

    setPayModalOpen(false);
    setSelectedPurchaseForPay(null);
  };

  const query = searchFilter.toLowerCase();
  const filteredPurchases = purchases.filter(
    p =>
      p.number.toLowerCase().includes(query) ||
      p.supplierName.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Achats & Fournisseurs</h2>
          <p className="text-xs text-slate-500">
            Enregistrement des factures fournisseurs, imputation SYSCOHADA et suivi des décaissements
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Enregistrer Facture d'Achat</span>
        </button>
      </div>

      <SegmentedTabs
        tabs={[
          { id: 'factures', label: "Factures d'Achat & Dépenses", count: filteredPurchases.length },
          { id: 'fournisseurs', label: 'Fournisseurs Référencés', count: suppliers.length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {activeTab === 'factures' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Numéro Pièce</th>
                  <th className="py-3 px-4 font-semibold">Fournisseur</th>
                  <th className="py-3 px-4 font-semibold">Nature de Charge (OHADA)</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Échéance</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant HT</th>
                  <th className="py-3 px-4 font-semibold text-right">TVA Déductible</th>
                  <th className="py-3 px-4 font-semibold text-right">Total TTC</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map(pur => (
                  <tr key={pur.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{pur.number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{pur.supplierName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-mono text-slate-400 mr-1">{pur.ohadaAccount}</span>
                      <span>{pur.expenseCategory}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{pur.date}</td>
                    <td className="py-3 px-4 text-slate-500">{pur.dueDate}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {formatMoney(pur.totalHT, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatMoney(pur.totalVAT, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatMoney(pur.totalTTC, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusIndicator status={pur.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pur.status !== 'PAYEE' && (
                        <button
                          onClick={() => {
                            setSelectedPurchaseForPay(pur);
                            setPaymentAmount(pur.totalTTC - pur.paidAmount);
                            setPaymentAccountId(treasuryAccounts[0]?.id || '');
                            setPayModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fournisseurs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supp => (
            <div
              key={supp.id}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{supp.name}</h4>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {supp.category}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>{supp.phone}</div>
                  <div>{supp.email}</div>
                  <div className="text-slate-400">{supp.city}</div>
                  {supp.taxNumber && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      NINEA : {supp.taxNumber}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Dette à payer</span>
                  <span
                    className={`font-bold ${
                      supp.balancePayable > 0 ? 'text-amber-700' : 'text-slate-700'
                    }`}
                  >
                    {formatMoney(supp.balancePayable, tenant.currency)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Délai: {supp.paymentTermsDays} jours
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Enregistrer Facture d'Achat */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Enregistrer une Facture d'Achat Fournisseur"
        subtitle="Comptabilisation des charges d'exploitation et récupération de TVA"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fournisseur *</label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Sélectionner un fournisseur...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">N° Facture Fournisseur</label>
              <input
                type="text"
                placeholder="Ex: FAC-FOURN-9821"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Compte de Charge OHADA</label>
              <select
                value={ohadaAccount}
                onChange={e => {
                  setOhadaAccount(e.target.value);
                  if (e.target.value === '601') setExpenseCategory('Achats de marchandises');
                  if (e.target.value === '605') setExpenseCategory('Carburants et fournitures');
                  if (e.target.value === '622') setExpenseCategory('Locations et charges locatives');
                  if (e.target.value === '632') setExpenseCategory('Honoraires et intermédiaires');
                }}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="601">601 - Achats de marchandises en stock</option>
                <option value="602">602 - Achats de matières premières</option>
                <option value="605">605 - Fournitures & Carburant transport</option>
                <option value="622">622 - Locations et loyers</option>
                <option value="632">632 - Rémunérations et honoraires</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date Facture</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date d'Échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Montant Hors Taxes (HT) *</label>
              <input
                type="number"
                min="1"
                value={amountHT}
                onChange={e => setAmountHT(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Taux TVA Déductible</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  list="vat-suggestions-purchase"
                  value={vatRate}
                  onChange={e => setVatRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-slate-500">%</span>
                <datalist id="vat-suggestions-purchase"><option value="0" /><option value="5" /><option value="9" /><option value="18" /><option value="19.25" /></datalist>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 border border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>TVA Déductible (Compte 4452) :</span>
              <span className="font-semibold text-slate-800">
                {formatMoney(calculatedVAT, tenant.currency)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total TTC Dû au Fournisseur :</span>
              <span className="text-[#0F5132] font-black text-sm">
                {formatMoney(calculatedTTC, tenant.currency)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg cursor-pointer"
            >
              Enregistrer l'Achat
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Payer Fournisseur */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Règlement Fournisseur"
        subtitle={`Fournisseur : ${selectedPurchaseForPay?.supplierName} · Montant dû : ${formatMoney(
          selectedPurchaseForPay?.totalTTC || 0,
          tenant.currency
        )}`}
      >
        <form onSubmit={handlePayPurchase} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Montant à décaisser ({tenant.currency}) *</label>
            <input
              type="number"
              min="1"
              max={selectedPurchaseForPay?.totalTTC}
              value={paymentAmount}
              onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-sm text-[#0F5132]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Compte de débit *</label>
            <select
              value={paymentAccountId}
              onChange={e => setPaymentAccountId(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              {treasuryAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - Solde dispo: {formatMoney(acc.balance, acc.currency)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Valider le Paiement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
