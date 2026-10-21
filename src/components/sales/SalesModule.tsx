/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Commercial, Ventes, Facturation Normalisée OHADA & Règlements
 */

import React, { useState } from 'react';
import {
  Plus,
  FileText,
  Printer,
  CreditCard,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  User,
  ExternalLink,
  QrCode,
  Download,
} from 'lucide-react';
import {
  Tenant,
  Invoice,
  Customer,
  Product,
  TreasuryAccount,
  InvoiceItem,
  Role,
} from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs, StatusIndicator, EmptyState } from '../common/UIComponents';
import { createSalesJournalEntry, createPaymentJournalEntry } from '../../services/accountingEngine';
import { storage } from '../../services/storage';
import { PdfService } from '../../services/pdfService';

interface SalesModuleProps {
  tenant: Tenant;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  treasuryAccounts: TreasuryAccount[];
  userRole: Role;
  searchFilter: string;
}

export function SalesModule({
  tenant,
  invoices,
  customers,
  products,
  treasuryAccounts,
  userRole,
  searchFilter,
}: SalesModuleProps) {
  const [activeTab, setActiveTab] = useState<'factures' | 'devis' | 'clients'>('factures');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);

  // Modal State: Create Invoice
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'FACTURE_VENTE' | 'DEVIS_PROFORMA'>('FACTURE_VENTE');
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: '',
      quantity: 1,
      unitPriceHT: 0,
      vatRate: tenant.countryCode === 'CM' ? 19.25 : 18,
      totalHT: 0,
      totalVAT: 0,
      totalTTC: 0,
    },
  ]);
  const [notes, setNotes] = useState('Paiement par virement bancaire ou Wave Business.');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');

  // Calculations for current form
  const formSubtotalHT = items.reduce((acc, it) => acc + it.totalHT, 0);
  const formTotalVAT = items.reduce((acc, it) => acc + it.totalVAT, 0);
  const formTotalTTC = formSubtotalHT + formTotalVAT;

  const handleItemProductSelect = (index: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const updated = [...items];
    const qty = updated[index].quantity || 1;
    const vatRate = prod.vatRate;
    const totalHT = qty * prod.sellingPriceHT;
    const totalVAT = (totalHT * vatRate) / 100;

    updated[index] = {
      ...updated[index],
      productId: prod.id,
      description: prod.name,
      unitPriceHT: prod.sellingPriceHT,
      vatRate: vatRate,
      totalHT,
      totalVAT,
      totalTTC: totalHT + totalVAT,
    };
    setItems(updated);
  };

  const handleItemQtyPriceChange = (index: number, qty: number, price: number, vat: number) => {
    const updated = [...items];
    const totalHT = qty * price;
    const totalVAT = (totalHT * vat) / 100;

    updated[index] = {
      ...updated[index],
      quantity: qty,
      unitPriceHT: price,
      vatRate: vat,
      totalHT,
      totalVAT,
      totalTTC: totalHT + totalVAT,
    };
    setItems(updated);
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPriceHT: 0,
        vatRate: tenant.countryCode === 'CM' ? 19.25 : 18,
        totalHT: 0,
        totalVAT: 0,
        totalTTC: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    const countNumber = invoices.length + 1;
    const formattedNum = `${invoiceType === 'FACTURE_VENTE' ? 'FAC' : 'DEV'}-2026-${String(
      countNumber
    ).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      tenantId: tenant.id,
      branchId: tenant.currentBranchId,
      number: formattedNum,
      type: invoiceType,
      customerId: cust.id,
      customerName: cust.name,
      customerTaxNumber: cust.taxNumber,
      date: invoiceDate,
      dueDate: dueDate,
      status: invoiceType === 'FACTURE_VENTE' ? 'VALIDEE' : 'BROUILLON',
      items,
      subtotalHT: formSubtotalHT,
      totalVAT: formTotalVAT,
      discountAmount: 0,
      totalTTC: formTotalTTC,
      paidAmount: 0,
      remainingAmount: formTotalTTC,
      currency: tenant.currency,
      notes,
      accountingEntryGenerated: invoiceType === 'FACTURE_VENTE',
    };

    storage.addInvoice(newInvoice);

    // If sales invoice is validated, generate automatic OHADA entry
    if (invoiceType === 'FACTURE_VENTE') {
      const entry = createSalesJournalEntry(newInvoice, tenant.id);
      storage.addJournalEntry(entry);
    }

    // Reset form
    setCreateModalOpen(false);
    setItems([
      {
        id: 'item-1',
        description: '',
        quantity: 1,
        unitPriceHT: 0,
        vatRate: 18,
        totalHT: 0,
        totalVAT: 0,
        totalTTC: 0,
      },
    ]);
  };

  // Convert Devis into Invoice
  const handleConvertQuoteToInvoice = (quote: Invoice) => {
    const updatedNum = `FAC-2026-${String(invoices.length + 1).padStart(4, '0')}`;
    const newInvoice: Invoice = {
      ...quote,
      id: `inv-${Date.now()}`,
      number: updatedNum,
      type: 'FACTURE_VENTE',
      status: 'VALIDEE',
      accountingEntryGenerated: true,
    };
    storage.addInvoice(newInvoice);
    const entry = createSalesJournalEntry(newInvoice, tenant.id);
    storage.addJournalEntry(entry);
    // update original quote
    storage.updateInvoice(quote.id, { notes: `${quote.notes || ''} [Converti en facture ${updatedNum}]` });
  };

  // Handle Recording a Payment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay || paymentAmount <= 0) return;

    const acc = treasuryAccounts.find(a => a.id === paymentAccountId) || treasuryAccounts[0];
    const newPaid = (selectedInvoiceForPay.paidAmount || 0) + paymentAmount;
    const remaining = Math.max(0, selectedInvoiceForPay.totalTTC - newPaid);
    const newStatus = remaining === 0 ? 'PAYEE' : 'PARTIELLE';

    storage.updateInvoice(selectedInvoiceForPay.id, {
      paidAmount: newPaid,
      remainingAmount: remaining,
      status: newStatus,
    });

    // Record treasury movement
    storage.addTreasuryTransaction({
      id: `tx-${Date.now()}`,
      tenantId: tenant.id,
      accountId: acc.id,
      accountName: acc.name,
      date: new Date().toISOString().split('T')[0],
      type: 'ENCAISSEMENT',
      amount: paymentAmount,
      category: `Règlement facture ${selectedInvoiceForPay.number}`,
      reference: paymentRef || `ENC-${selectedInvoiceForPay.number}`,
      beneficiaryOrPayer: selectedInvoiceForPay.customerName,
      paymentMethod:
        acc.type === 'MOBILE_MONEY'
          ? 'MOBILE_MONEY'
          : acc.type === 'CAISSE'
          ? 'ESPECES'
          : 'VIREMENT',
      reconciled: true,
    });

    // Generate OHADA double-entry (Debit 5211/5651/5711, Credit 4111)
    const journalEntry = createPaymentJournalEntry(
      selectedInvoiceForPay,
      paymentAmount,
      acc.type,
      paymentRef || `ENC-${selectedInvoiceForPay.number}`,
      tenant.id
    );
    storage.addJournalEntry(journalEntry);

    setSelectedInvoiceForPay(null);
  };

  // Filtered lists
  const query = searchFilter.toLowerCase();
  const salesInvoices = invoices.filter(
    i =>
      i.type === 'FACTURE_VENTE' &&
      (i.number.toLowerCase().includes(query) || i.customerName.toLowerCase().includes(query))
  );
  const quotesList = invoices.filter(
    i =>
      i.type === 'DEVIS_PROFORMA' &&
      (i.number.toLowerCase().includes(query) || i.customerName.toLowerCase().includes(query))
  );
  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(query) ||
      (c.taxNumber && c.taxNumber.toLowerCase().includes(query))
  );

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Ventes & Facturation</h2>
          <p className="text-xs text-slate-500">
            Émission de devis, factures normalisées OHADA et encaissements multicanaux
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInvoiceType('DEVIS_PROFORMA');
              setCreateModalOpen(true);
            }}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Nouveau Devis
          </button>
          <button
            onClick={() => {
              setInvoiceType('FACTURE_VENTE');
              setCreateModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer Facture</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <SegmentedTabs
        tabs={[
          { id: 'factures', label: 'Factures de Vente', count: salesInvoices.length },
          { id: 'devis', label: 'Devis & Proformas', count: quotesList.length },
          { id: 'clients', label: 'Fichier Clients', count: filteredCustomers.length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB 1: Factures */}
      {activeTab === 'factures' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Numéro</th>
                  <th className="py-3 px-4 font-semibold">Client</th>
                  <th className="py-3 px-4 font-semibold">Date émission</th>
                  <th className="py-3 px-4 font-semibold">Échéance</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant HT</th>
                  <th className="py-3 px-4 font-semibold text-right">TVA</th>
                  <th className="py-3 px-4 font-semibold text-right">Total TTC</th>
                  <th className="py-3 px-4 font-semibold text-right">Reste Dû</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesInvoices.length > 0 ? (
                  salesInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{inv.customerName}</div>
                        {inv.customerTaxNumber && (
                          <div className="text-[10px] text-slate-400">{inv.customerTaxNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                      <td className="py-3 px-4 text-slate-600">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-slate-600 text-right">
                        {formatMoney(inv.subtotalHT, inv.currency)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-right">
                        {formatMoney(inv.totalVAT, inv.currency)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-right">
                        {formatMoney(inv.totalTTC, inv.currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            inv.remainingAmount > 0 ? 'text-amber-700' : 'text-slate-400'
                          }`}
                        >
                          {formatMoney(inv.remainingAmount, inv.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusIndicator status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'PAYEE' && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForPay(inv);
                                setPaymentAmount(inv.remainingAmount);
                                setPaymentAccountId(treasuryAccounts[0]?.id || '');
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-medium text-[11px] transition-colors cursor-pointer"
                              title="Enregistrer un encaissement"
                            >
                              Encaisser
                            </button>
                          )}
                          <button
                            onClick={() => PdfService.downloadInvoicePdf(inv, tenant)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Télécharger la Facture PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Aperçu & Impression Facture OHADA"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                      Aucune facture trouvée pour les critères spécifiés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Devis */}
      {activeTab === 'devis' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Numéro</th>
                  <th className="py-3 px-4 font-semibold">Client</th>
                  <th className="py-3 px-4 font-semibold">Date émission</th>
                  <th className="py-3 px-4 font-semibold">Validité jusqu'au</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant HT</th>
                  <th className="py-3 px-4 font-semibold text-right">Total TTC</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotesList.map(quote => (
                  <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{quote.number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{quote.customerName}</td>
                    <td className="py-3 px-4 text-slate-600">{quote.date}</td>
                    <td className="py-3 px-4 text-slate-600">{quote.dueDate}</td>
                    <td className="py-3 px-4 text-slate-600 text-right">
                      {formatMoney(quote.subtotalHT, quote.currency)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-right">
                      {formatMoney(quote.totalTTC, quote.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusIndicator status={quote.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleConvertQuoteToInvoice(quote)}
                          className="px-2.5 py-1 bg-[#0F5132] hover:bg-[#0c4028] text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Convertir en Facture</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => PdfService.downloadInvoicePdf(quote, tenant)}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                          title="Télécharger le Devis PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedInvoiceForPrint(quote)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                          title="Aperçu & Impression Devis OHADA"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Clients */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div
              key={cust.id}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{cust.name}</h4>
                    {cust.companyName && (
                      <p className="text-xs text-slate-500">{cust.companyName}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {cust.type}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div>{cust.phone}</div>
                  <div>{cust.email}</div>
                  <div className="text-slate-400">{cust.city}</div>
                  {cust.taxNumber && (
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      NINEA/NCC : {cust.taxNumber}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Encours dû</span>
                  <span
                    className={`font-bold ${
                      cust.outstandingBalance > 0 ? 'text-amber-700' : 'text-slate-700'
                    }`}
                  >
                    {formatMoney(cust.outstandingBalance, tenant.currency)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCustomerId(cust.id);
                    setInvoiceType('FACTURE_VENTE');
                    setCreateModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs text-[#0F5132] font-semibold hover:bg-[#0F5132]/5 rounded cursor-pointer"
                >
                  + Facturer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Créer une Facture ou Devis */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={invoiceType === 'FACTURE_VENTE' ? 'Nouvelle Facture de Vente' : 'Nouveau Devis Proforma'}
        subtitle="Normes OHADA / SYSCOHADA Révisé avec génération automatique des écritures"
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-5 text-xs">
          {/* Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Destinataire *</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0F5132]"
              >
                <option value="">Sélectionner un client...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date d'émission *</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0F5132]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date d'échéance / Paiement *</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0F5132]"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-2.5 font-semibold w-1/3">Désignation / Article</th>
                  <th className="p-2.5 font-semibold w-20 text-center">Quantité</th>
                  <th className="p-2.5 font-semibold text-right">Prix Unitaire HT</th>
                  <th className="p-2.5 font-semibold w-24 text-center">TVA %</th>
                  <th className="p-2.5 font-semibold text-right">Total HT</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <div className="space-y-1">
                        <select
                          value={item.productId || ''}
                          onChange={e => handleItemProductSelect(index, e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white"
                        >
                          <option value="">Sélectionner dans le catalogue...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name} ({formatMoney(p.sellingPriceHT, tenant.currency)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Description personnalisée..."
                          value={item.description}
                          onChange={e => {
                            const updated = [...items];
                            updated[index].description = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded text-xs"
                          required
                        />
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e =>
                          handleItemQtyPriceChange(
                            index,
                            parseFloat(e.target.value) || 1,
                            item.unitPriceHT,
                            item.vatRate
                          )
                        }
                        className="w-16 p-1.5 border border-slate-200 rounded text-center text-xs"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPriceHT}
                        onChange={e =>
                          handleItemQtyPriceChange(
                            index,
                            item.quantity,
                            parseFloat(e.target.value) || 0,
                            item.vatRate
                          )
                        }
                        className="w-28 p-1.5 border border-slate-200 rounded text-right text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <select
                        value={item.vatRate}
                        onChange={e =>
                          handleItemQtyPriceChange(
                            index,
                            item.quantity,
                            item.unitPriceHT,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="p-1.5 border border-slate-200 rounded text-xs bg-white"
                      >
                        <option value="18">18% (UEMOA)</option>
                        <option value="19.25">19.25% (CEMAC)</option>
                        <option value="0">0% (Exonéré)</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-semibold text-slate-800">
                      {formatMoney(item.totalHT, tenant.currency)}
                    </td>
                    <td className="p-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="text-slate-400 hover:text-rose-600 font-bold"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddItemRow}
            className="text-xs text-[#0F5132] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une ligne</span>
          </button>

          {/* Notes and Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Conditions de paiement & Mentions légales
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Génère automatiquement les écritures au Journal des Ventes (VT) et débite le compte
                4111.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total HT :</span>
                <span className="font-semibold text-slate-800">
                  {formatMoney(formSubtotalHT, tenant.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total TVA collectée :</span>
                <span className="font-semibold text-slate-800">
                  {formatMoney(formTotalVAT, tenant.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net à Payer TTC :</span>
                <span className="text-[#0F5132] font-extrabold text-base">
                  {formatMoney(formTotalTTC, tenant.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              Enregistrer et Valider
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Encaisser une Facture */}
      <Modal
        isOpen={!!selectedInvoiceForPay}
        onClose={() => setSelectedInvoiceForPay(null)}
        title={`Encaisser la Facture ${selectedInvoiceForPay?.number}`}
        subtitle={`Client : ${selectedInvoiceForPay?.customerName} · Reste à régler : ${formatMoney(
          selectedInvoiceForPay?.remainingAmount || 0,
          tenant.currency
        )}`}
        maxWidth="md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Montant Encaissé ({tenant.currency}) *</label>
            <input
              type="number"
              min="1"
              max={selectedInvoiceForPay?.remainingAmount}
              value={paymentAmount}
              onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-sm text-[#0F5132]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Compte de Trésorerie de Destination *</label>
            <select
              value={paymentAccountId}
              onChange={e => setPaymentAccountId(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              {treasuryAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type}) - Solde: {formatMoney(acc.balance, acc.currency)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Référence du règlement (ex: Virement N°, Wave TX, Chèque N°)
            </label>
            <input
              type="text"
              placeholder="Ex: WAVE-TX-10938472 / CHQ 00921"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-900 text-xs">
            Cette opération mettra à jour le solde du compte de trésorerie sélectionné et génèrera
            une écriture comptable d'apurement (Crédit compte 4111 / Débit compte 5211/5651).
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSelectedInvoiceForPay(null)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg cursor-pointer"
            >
              Confirmer l'Encaissement
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Impression Facture Normalisée OHADA */}
      <Modal
        isOpen={!!selectedInvoiceForPrint}
        onClose={() => setSelectedInvoiceForPrint(null)}
        title="Aperçu & Impression de Facture Normalisée"
        subtitle="Conforme Code Général des Impôts & Acte Uniforme OHADA"
        maxWidth="4xl"
      >
        {selectedInvoiceForPrint && (
          <div className="space-y-6">
            {/* Facture Printable Document Container */}
            <div className="bg-white p-8 border border-slate-200 rounded-lg text-slate-800 text-xs shadow-xs print-shadow-none">
              {/* Header Top */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-[#0F5132]">
                <div className="flex items-start gap-4">
                  {tenant.logoUrl && (
                    <div className="w-16 h-16 rounded-xl border border-slate-200 p-1 bg-white shrink-0 overflow-hidden shadow-2xs">
                      <img
                        src={tenant.logoUrl}
                        alt={tenant.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black text-[#0F5132] tracking-tight">{tenant.name}</h1>
                    <p className="text-xs text-slate-500 font-semibold">{tenant.legalForm} au capital de {formatMoney(tenant.capitalSocial, tenant.currency)}</p>
                    <div className="mt-2 text-slate-600 space-y-0.5">
                      <p>{tenant.address}, {tenant.city}</p>
                      <p>Tél : {tenant.phone} · Email : {tenant.email}</p>
                      <p className="font-semibold text-slate-900 mt-1">
                        {tenant.taxNumber} · {tenant.tradeRegisterNumber}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-[#0F5132] text-white font-extrabold px-4 py-1.5 rounded text-sm uppercase tracking-wider">
                    {selectedInvoiceForPrint.type === 'FACTURE_VENTE' ? 'Facture Définitive' : 'Devis Proforma'}
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">{selectedInvoiceForPrint.number}</div>
                  <div className="text-slate-500 mt-1">Date : {selectedInvoiceForPrint.date}</div>
                  <div className="text-slate-500">Échéance : {selectedInvoiceForPrint.dueDate}</div>
                </div>
              </div>

              {/* Client Box */}
              <div className="mt-6 flex justify-end">
                <div className="w-1/2 bg-slate-50 p-4 rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Facturé à :
                  </span>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoiceForPrint.customerName}</div>
                  {selectedInvoiceForPrint.customerTaxNumber && (
                    <div className="text-slate-600 mt-1">
                      Numéro Fiscal : {selectedInvoiceForPrint.customerTaxNumber}
                    </div>
                  )}
                  <div className="text-slate-500 mt-0.5">Dossier Client Certifié</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <table className="w-full text-left border border-slate-200">
                  <thead className="bg-[#0F5132] text-white font-semibold">
                    <tr>
                      <th className="p-2.5">Désignation des prestations ou marchandises</th>
                      <th className="p-2.5 text-center">Qté</th>
                      <th className="p-2.5 text-right">Prix Unitaire HT</th>
                      <th className="p-2.5 text-center">TVA</th>
                      <th className="p-2.5 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedInvoiceForPrint.items.map(it => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium text-slate-900">{it.description}</td>
                        <td className="p-2.5 text-center">{it.quantity}</td>
                        <td className="p-2.5 text-right">{formatMoney(it.unitPriceHT, tenant.currency)}</td>
                        <td className="p-2.5 text-center">{it.vatRate}%</td>
                        <td className="p-2.5 text-right font-semibold">{formatMoney(it.totalHT, tenant.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Totals & Legal Mention */}
              <div className="mt-6 grid grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-bold text-slate-700 block mb-1">Conditions de règlement :</span>
                    <p className="text-slate-600">{selectedInvoiceForPrint.notes || 'Paiement à réception par virement ou chèque.'}</p>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded border border-emerald-200/60">
                    <QrCode className="w-9 h-9 text-[#0F5132]" />
                    <div className="text-[11px] text-emerald-900">
                      <strong>Document Numérique Certifié GSPME</strong>
                      <div>Signature électronique & Piste d'audit OHADA</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total Hors Taxes (HT) :</span>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(selectedInvoiceForPrint.subtotalHT, tenant.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxe sur la Valeur Ajoutée (TVA) :</span>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(selectedInvoiceForPrint.totalVAT, tenant.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Net Total à Payer (TTC) :</span>
                    <span className="text-[#0F5132] font-black text-base">
                      {formatMoney(selectedInvoiceForPrint.totalTTC, tenant.currency)}
                    </span>
                  </div>
                  {selectedInvoiceForPrint.paidAmount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-700 pt-1">
                      <span>Montant déjà réglé :</span>
                      <span>{formatMoney(selectedInvoiceForPrint.paidAmount, tenant.currency)}</span>
                    </div>
                  )}
                  {selectedInvoiceForPrint.remainingAmount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-amber-700 pt-1">
                      <span>Solde Reste Dû :</span>
                      <span>{formatMoney(selectedInvoiceForPrint.remainingAmount, tenant.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Print & PDF action buttons */}
            <div className="flex justify-end gap-3 no-print">
              <button
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => PdfService.downloadInvoicePdf(selectedInvoiceForPrint, tenant)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                title="Générer et télécharger le document PDF vectoriel conforme OHADA"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le Fichier PDF</span>
              </button>
              <button
                onClick={() => PdfService.printCurrent()}
                className="px-5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
