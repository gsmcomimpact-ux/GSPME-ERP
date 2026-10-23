/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module F : Caisse & Points de Vente (POS / Vente Comptoir)
 */

import React, { useState } from 'react';
import {
  Store,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Smartphone,
  Banknote,
  CreditCard,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
} from 'lucide-react';
import { Tenant, Product, PosSession, PosReceipt, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { PdfService } from '../../services/pdfService';

interface PosModuleProps {
  tenant: Tenant;
  products: Product[];
  posSessions: PosSession[];
  userRole: Role;
}

export function PosModule({ tenant, products, posSessions, userRole }: PosModuleProps) {
  // Current active session
  const currentSession = posSessions.find(s => s.status === 'OUVERTE') || null;

  // Cart State for live POS
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [searchItem, setSearchItem] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'CARTE'>('ESPECES');
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Modals
  const [openSessionModalOpen, setOpenSessionModalOpen] = useState(false);
  const [closeSessionModalOpen, setCloseSessionModalOpen] = useState(false);
  const [initialCashAmount, setInitialCashAmount] = useState(100000);
  const [countedClosingCash, setCountedClosingCash] = useState(0);
  const [printedReceipt, setPrintedReceipt] = useState<PosReceipt | null>(null);

  // Cart calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.sellingPriceHT * item.quantity, 0);
  const cartDiscount = (cartSubtotal * discountPercent) / 100;
  const cartVAT = ((cartSubtotal - cartDiscount) * (tenant.countryCode === 'CM' ? 19.25 : 18)) / 100;
  const cartTotalTTC = cartSubtotal - cartDiscount + cartVAT;
  const cashChange = Math.max(0, cashTendered - cartTotalTTC);

  const categories = ['TOUS', ...Array.from(new Set(products.map(p => p.category)))];

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(c => c.product.id === product.id);
    if (existing) {
      setCart(cart.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map(c => {
          if (c.product.id === productId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as { product: Product; quantity: number }[]
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountPercent(0);
  };

  const handleCheckoutSubmit = () => {
    if (cart.length === 0 || !currentSession) return;

    const receiptNum = `TKT-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newReceipt: PosReceipt = {
      id: `rec-${Date.now()}`,
      sessionId: currentSession.id,
      receiptNumber: receiptNum,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: cart.map(c => ({
        name: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.sellingPriceHT,
        total: c.product.sellingPriceHT * c.quantity,
      })),
      subtotal: cartSubtotal - cartDiscount,
      tax: cartVAT,
      total: cartTotalTTC,
      paymentMethod,
      cashGiven: paymentMethod === 'ESPECES' ? cashTendered : cartTotalTTC,
      cashChange: paymentMethod === 'ESPECES' ? cashChange : 0,
    };

    storage.addPosReceipt(newReceipt);

    // Deduct stock for each product in cart
    cart.forEach(item => {
      storage.updateProductStock(item.product.id, -item.quantity, tenant.currentBranchId || 'wh-1');
    });

    setPrintedReceipt(newReceipt);
    handleClearCart();
    setCashTendered(0);
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: PosSession = {
      id: `pos-sess-${Date.now()}`,
      tenantId: tenant.id,
      branchId: tenant.currentBranchId,
      cashierName: 'Caissier Principal',
      openingTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      openingCashAmount: initialCashAmount,
      status: 'OUVERTE',
      totalSales: 0,
      transactionsCount: 0,
    };
    storage.addPosSession(newSession);
    setOpenSessionModalOpen(false);
  };

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    storage.closePosSession(currentSession.id, countedClosingCash);
    setCloseSessionModalOpen(false);
  };

  const filteredCatalog = products.filter(p => {
    const matchesCat = selectedCategory === 'TOUS' || p.category === selectedCategory;
    const q = searchItem.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* POS Top Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0F5132]/10 text-[#0F5132]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Point de Vente & Caisse Comptoir</h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  currentSession ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {currentSession ? 'Caisse Ouverte' : 'Caisse Fermée'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {currentSession
                ? `Session démarrée à ${currentSession.openingTime.split(' ')[1]} par ${currentSession.cashierName} · Fonds : ${formatMoney(currentSession.openingCashAmount, tenant.currency)}`
                : 'Veuillez ouvrir une session pour démarrer les encaissements'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentSession ? (
            <button
              onClick={() => setOpenSessionModalOpen(true)}
              className="px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Ouvrir la Caisse</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setCountedClosingCash(currentSession.openingCashAmount + currentSession.totalSales);
                setCloseSessionModalOpen(true);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Clôturer la Caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* POS Grid: Left Catalog / Right Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Catalog & Fast Search (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Search and Category filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Scanner code-barres ou rechercher un article..."
                value={searchItem}
                onChange={e => setSearchItem(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-[#0F5132] focus:outline-none"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0F5132] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredCatalog.map(prod => (
              <button
                key={prod.id}
                onClick={() => handleAddToCart(prod)}
                disabled={!currentSession}
                className={`p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-[#0F5132] text-left transition-all flex flex-col justify-between cursor-pointer ${
                  !currentSession ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-400">{prod.sku}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{prod.currentStock} {prod.unit}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-2 leading-tight">
                    {prod.name}
                  </h4>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-[#0F5132]">
                    {formatMoney(prod.sellingPriceHT, tenant.currency)}
                  </span>
                  <span className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-[#0F5132] hover:text-white transition-colors">
                    <Plus className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart & Payment Terminal (4/5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between h-[640px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">Panier en cours</span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.product.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {formatMoney(item.product.sellingPriceHT, tenant.currency)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-bold text-slate-900 w-16 text-right shrink-0">
                      {formatMoney(item.product.sellingPriceHT * item.quantity, tenant.currency)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aucun article sélectionné. Cliquez sur un produit à gauche.
                </div>
              )}
            </div>
          </div>

          {/* Payment Terminal Section */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total HT :</span>
                <span>{formatMoney(cartSubtotal, tenant.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <label htmlFor="pos-discount">Remise (%) :</label>
                <div className="flex items-center gap-2">
                  <input
                    id="pos-discount"
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 p-1 border border-slate-300 rounded text-right text-xs"
                  />
                  <span>- {formatMoney(cartDiscount, tenant.currency)}</span>
                </div>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>TVA estimée :</span>
                <span>{formatMoney(cartVAT, tenant.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-100">
                <span>Total Net TTC :</span>
                <span className="text-[#0F5132] text-base">{formatMoney(cartTotalTTC, tenant.currency)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block mb-1">Mode d'Encaissement</span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'ESPECES', label: 'Espèces', icon: Banknote },
                  { id: 'WAVE', label: 'Wave', icon: Smartphone },
                  { id: 'ORANGE_MONEY', label: 'Orange', icon: Smartphone },
                  { id: 'CARTE', label: 'Carte', icon: CreditCard },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-1.5 rounded-lg border text-center font-semibold cursor-pointer flex flex-col items-center gap-0.5 ${
                        paymentMethod === m.id
                          ? 'border-[#0F5132] bg-[#0F5132]/10 text-[#0F5132]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tendered & Change */}
            {paymentMethod === 'ESPECES' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Espèces Remises</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={cashTendered || ''}
                    onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 border border-slate-300 rounded font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Monnaie à Rendre</span>
                  <div className="p-1.5 bg-slate-100 rounded font-bold text-emerald-800 text-xs">
                    {formatMoney(cashChange, tenant.currency)}
                  </div>
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              onClick={handleCheckoutSubmit}
              disabled={cart.length === 0 || !currentSession}
              className={`w-full py-2.5 rounded-lg font-bold text-xs text-white shadow-xs cursor-pointer transition-colors ${
                cart.length > 0 && currentSession
                  ? 'bg-[#0F5132] hover:bg-[#0c4028]'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              Encaisser & Imprimer Ticket ({formatMoney(cartTotalTTC, tenant.currency)})
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Ouvrir Session de Caisse */}
      <Modal
        isOpen={openSessionModalOpen}
        onClose={() => setOpenSessionModalOpen(false)}
        title="Ouverture de Session de Caisse"
        subtitle="Saisie du fonds de caisse initial"
        maxWidth="sm"
      >
        <form onSubmit={handleOpenSession} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Fonds de Caisse Initial en Espèces ({tenant.currency}) *
            </label>
            <input
              type="number"
              min="0"
              value={initialCashAmount}
              onChange={e => setInitialCashAmount(parseFloat(e.target.value) || 0)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-sm text-[#0F5132]"
            />
          </div>

          <p className="text-slate-500 text-[11px]">
            Ce montant correspond à la monnaie disponible dans le tiroir-caisse au début de la journée.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenSessionModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Démarrer la Session
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Clôture de Caisse & Écart */}
      <Modal
        isOpen={closeSessionModalOpen}
        onClose={() => setCloseSessionModalOpen(false)}
        title="Clôture de Session & Contrôle d'Écart"
        subtitle="Comptage physique des espèces dans le tiroir"
        maxWidth="md"
      >
        <form onSubmit={handleCloseSession} className="space-y-4 text-xs">
          {currentSession && (
            <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Fonds initial :</span>
                <span className="font-semibold">{formatMoney(currentSession.openingCashAmount, tenant.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total ventes encaissées :</span>
                <span className="font-semibold">{formatMoney(currentSession.totalSales, tenant.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Théorique en caisse attendu :</span>
                <span>{formatMoney(currentSession.openingCashAmount + currentSession.totalSales, tenant.currency)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Montant réel compté dans le tiroir ({tenant.currency}) *
            </label>
            <input
              type="number"
              min="0"
              value={countedClosingCash}
              onChange={e => setCountedClosingCash(parseFloat(e.target.value) || 0)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-sm text-[#0F5132]"
            />
          </div>

          {currentSession && (
            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <span>Écart de caisse :</span>
              <span
                className={
                  countedClosingCash - (currentSession.openingCashAmount + currentSession.totalSales) === 0
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }
              >
                {formatMoney(
                  countedClosingCash - (currentSession.openingCashAmount + currentSession.totalSales),
                  tenant.currency
                )}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setCloseSessionModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg cursor-pointer"
            >
              Valider la Clôture
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Impression Ticket Thermique de Caisse */}
      <Modal
        isOpen={!!printedReceipt}
        onClose={() => setPrintedReceipt(null)}
        title="Ticket de Caisse Imprimé"
        subtitle="Format ticket thermique 80mm conforme"
        maxWidth="sm"
      >
        {printedReceipt && (
          <div className="space-y-4">
            <div className="bg-white p-5 border border-dashed border-slate-300 rounded font-mono text-[11px] text-slate-900 space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-xs uppercase">{tenant.name}</div>
                <div>{tenant.address}</div>
                <div>Tél : {tenant.phone}</div>
                <div className="font-semibold">{tenant.taxNumber}</div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Ticket N° {printedReceipt.receiptNumber}</span>
                <span>{printedReceipt.timestamp}</span>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                {printedReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.name.slice(0, 16)}</span>
                    <span className="font-bold">{formatMoney(it.total, tenant.currency)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 text-xs font-bold">
                <div className="flex justify-between">
                  <span>TOTAL TTC :</span>
                  <span>{formatMoney(printedReceipt.total, tenant.currency)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-normal text-slate-500">
                  <span>Mode paiement :</span>
                  <span>{printedReceipt.paymentMethod}</span>
                </div>
                {printedReceipt.cashChange && printedReceipt.cashChange > 0 ? (
                  <div className="flex justify-between text-[11px] text-emerald-800">
                    <span>Rendu monnaie :</span>
                    <span>{formatMoney(printedReceipt.cashChange, tenant.currency)}</span>
                  </div>
                ) : null}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <div>Merci de votre confiance !</div>
                <div>GSPME SaaS · Système certifié</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => setPrintedReceipt(null)}
                className="px-3 py-1.5 border border-slate-200 rounded text-xs cursor-pointer hover:bg-slate-50"
              >
                Fermer
              </button>
              <button
                onClick={() => PdfService.downloadPosReceiptPdf(printedReceipt, tenant)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Télécharger le ticket de caisse en fichier PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Ticket (PDF)</span>
              </button>
              <button
                onClick={() => PdfService.printCurrent()}
                className="px-4 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
