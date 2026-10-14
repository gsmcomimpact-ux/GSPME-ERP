/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Modal de Création Rapide (Clients, Produits, Mouvements)
 */

import React, { useState } from 'react';
import { Tenant, Customer, Product, TreasuryAccount } from '../../types';
import { Modal } from './UIComponents';
import { storage } from '../../services/storage';

interface QuickCreateModalProps {
  isOpen: boolean;
  type: 'INVOICE' | 'CUSTOMER' | 'TRANSACTION' | 'PRODUCT' | null;
  onClose: () => void;
  tenant: Tenant;
  treasuryAccounts: TreasuryAccount[];
  onNavigateToInvoiceCreate: () => void;
}

export function QuickCreateModal({
  isOpen,
  type,
  onClose,
  tenant,
  treasuryAccounts,
  onNavigateToInvoiceCreate,
}: QuickCreateModalProps) {
  // Customer State
  const [custName, setCustName] = useState('');
  const [custType, setCustType] = useState<Customer['type']>('ENTREPRISE');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCity, setCustCity] = useState(tenant.city);
  const [custTaxNumber, setCustTaxNumber] = useState('');

  // Product State
  const [prodSku, setProdSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Matériaux Gros Œuvre');
  const [prodPurchasePrice, setProdPurchasePrice] = useState(0);
  const [prodSellingPrice, setProdSellingPrice] = useState(0);
  const [prodStock, setProdStock] = useState(10);

  // Transaction State
  const [txType, setTxType] = useState<'ENCAISSEMENT' | 'DECAISSEMENT'>('ENCAISSEMENT');
  const [txAccountId, setTxAccountId] = useState(treasuryAccounts[0]?.id || '');
  const [txAmount, setTxAmount] = useState(0);
  const [txCategory, setTxCategory] = useState('Vente comptoir');
  const [txBeneficiary, setTxBeneficiary] = useState('');

  if (!isOpen || !type) return null;

  if (type === 'INVOICE') {
    onClose();
    onNavigateToInvoiceCreate();
    return null;
  }

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      tenantId: tenant.id,
      name: custName,
      type: custType,
      category: 'PME',
      email: custEmail,
      phone: custPhone,
      city: custCity,
      taxNumber: custTaxNumber,
      creditLimit: 10000000,
      outstandingBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    storage.addCustomer(newCust);
    onClose();
    setCustName('');
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      tenantId: tenant.id,
      sku: prodSku || `ART-${Math.floor(100 + Math.random() * 900)}`,
      name: prodName,
      category: prodCategory,
      unit: 'unité',
      purchasePriceHT: prodPurchasePrice,
      sellingPriceHT: prodSellingPrice,
      vatRate: tenant.countryCode === 'CM' ? 19.25 : 18,
      stockMinAlert: 5,
      currentStock: prodStock,
      valuationMethod: 'PUMP',
      warehouseStock: {
        [tenant.branches[0]?.id || 'wh-1']: prodStock,
      },
    };
    storage.addProduct(newProd);
    onClose();
    setProdName('');
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = treasuryAccounts.find(a => a.id === txAccountId) || treasuryAccounts[0];
    storage.addTreasuryTransaction({
      id: `tx-${Date.now()}`,
      tenantId: tenant.id,
      accountId: acc.id,
      accountName: acc.name,
      date: new Date().toISOString().split('T')[0],
      type: txType,
      amount: txAmount,
      category: txCategory,
      reference: `REC-${Date.now().toString().slice(-4)}`,
      beneficiaryOrPayer: txBeneficiary || 'Partie prenante',
      paymentMethod: acc.type === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : 'ESPECES',
      reconciled: true,
    });
    onClose();
    setTxAmount(0);
  };

  return (
    <>
      {type === 'CUSTOMER' && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Nouveau Client"
          subtitle="Ajout au fichier tiers clients de l'entreprise"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom / Raison Sociale *</label>
              <input
                type="text"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type de Client</label>
                <select
                  value={custType}
                  onChange={e => setCustType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ENTREPRISE">Entreprise (B2B)</option>
                  <option value="PARTICULIER">Particulier (B2C)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro Fiscal (NINEA/NCC)</label>
                <input
                  type="text"
                  value={custTaxNumber}
                  onChange={e => setCustTaxNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléphone *</label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={custCity}
                  onChange={e => setCustCity(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={custEmail}
                onChange={e => setCustEmail(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
              >
                Créer Client
              </button>
            </div>
          </form>
        </Modal>
      )}

      {type === 'PRODUCT' && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Nouvel Article"
          subtitle="Ajout au catalogue et aux stocks"
        >
          <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code SKU</label>
                <input
                  type="text"
                  value={prodSku}
                  onChange={e => setProdSku(e.target.value)}
                  placeholder="Ex: REF-1092"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Matériaux Gros Œuvre">Matériaux Gros Œuvre</option>
                  <option value="Engins & Équipements">Engins & Équipements</option>
                  <option value="Finitions & Peinture">Finitions & Peinture</option>
                  <option value="Services & Prestations">Services & Prestations</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Désignation *</label>
              <input
                type="text"
                value={prodName}
                onChange={e => setProdName(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prix d'Achat HT ({tenant.currency})</label>
                <input
                  type="number"
                  min="0"
                  value={prodPurchasePrice}
                  onChange={e => setProdPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prix de Vente HT ({tenant.currency}) *</label>
                <input
                  type="number"
                  min="0"
                  value={prodSellingPrice}
                  onChange={e => setProdSellingPrice(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-[#0F5132]"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock Initial</label>
              <input
                type="number"
                min="0"
                value={prodStock}
                onChange={e => setProdStock(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
              >
                Enregistrer l'Article
              </button>
            </div>
          </form>
        </Modal>
      )}

      {type === 'TRANSACTION' && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Mouvement de Trésorerie Rapide"
          subtitle="Encaissement ou décaissement direct"
        >
          <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type d'opération *</label>
                <select
                  value={txType}
                  onChange={e => setTxType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ENCAISSEMENT">Encaissement (Recette)</option>
                  <option value="DECAISSEMENT">Décaissement (Dépense)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Compte de Trésorerie *</label>
                <select
                  value={txAccountId}
                  onChange={e => setTxAccountId(e.target.value)}
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
              <label className="block font-semibold text-slate-700 mb-1">Montant ({tenant.currency}) *</label>
              <input
                type="number"
                min="1"
                value={txAmount}
                onChange={e => setTxAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Libellé / Motif *</label>
              <input
                type="text"
                value={txCategory}
                onChange={e => setTxCategory(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiers concerné</label>
              <input
                type="text"
                placeholder="Ex: Client comptoir, Fournisseur divers"
                value={txBeneficiary}
                onChange={e => setTxBeneficiary(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
              >
                Enregistrer le Mouvement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
