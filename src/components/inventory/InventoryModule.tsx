/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Gestion des Stocks & Multi-Entrepôts
 */

import React, { useState } from 'react';
import {
  Plus,
  Boxes,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Layers
} from 'lucide-react';
import { Tenant, Product, Warehouse, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface InventoryModuleProps {
  tenant: Tenant;
  products: Product[];
  warehouses: Warehouse[];
  userRole: Role;
  searchFilter: string;
}

export function InventoryModule({
  tenant,
  products,
  warehouses,
  userRole,
  searchFilter,
}: InventoryModuleProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'entrepots' | 'mouvements'>('articles');
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // New Product Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Matériaux Gros Œuvre');
  const [unit, setUnit] = useState<Product['unit']>('tonne');
  const [purchasePriceHT, setPurchasePriceHT] = useState(0);
  const [sellingPriceHT, setSellingPriceHT] = useState(0);
  const [stockMinAlert, setStockMinAlert] = useState(10);
  const [initialQty, setInitialQty] = useState(10);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(warehouses[0]?.id || '');

  // Transfer Form State
  const [transferProductId, setTransferProductId] = useState(products[0]?.id || '');
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[1]?.id || '');
  const [transferQty, setTransferQty] = useState(5);

  // Inventory valuation
  const totalStockValuation = products.reduce((acc, p) => acc + p.currentStock * p.purchasePriceHT, 0);
  const criticalStockCount = products.filter(p => p.currentStock <= p.stockMinAlert && p.stockMinAlert > 0).length;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      tenantId: tenant.id,
      sku: sku || `ART-${Math.floor(100 + Math.random() * 900)}`,
      name,
      category,
      unit,
      purchasePriceHT,
      sellingPriceHT,
      vatRate: tenant.countryCode === 'CM' ? 19.25 : 18,
      stockMinAlert,
      currentStock: initialQty,
      valuationMethod: 'PUMP',
      warehouseStock: {
        [defaultWarehouseId]: initialQty,
      },
    };

    storage.addProduct(newProduct);
    setCreateProductOpen(false);
    // Reset form
    setName('');
    setSku('');
    setPurchasePriceHT(0);
    setSellingPriceHT(0);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceWarehouseId === targetWarehouseId) {
      alert('Veuillez sélectionner deux entrepôts différents.');
      return;
    }

    const prod = products.find(p => p.id === transferProductId);
    if (!prod) return;

    const sourceAvailable = prod.warehouseStock[sourceWarehouseId] || 0;
    if (transferQty > sourceAvailable) {
      alert(`Stock insuffisant dans l'entrepôt source (${sourceAvailable} disponibles).`);
      return;
    }

    // Deduct from source and add to target
    storage.updateProductStock(prod.id, -transferQty, sourceWarehouseId);
    storage.updateProductStock(prod.id, transferQty, targetWarehouseId);

    storage.logAudit(
      'MODIFICATION',
      'STOCKS',
      `Transfert inter-dépôts : ${transferQty} ${prod.unit} de ${prod.name} vers ${targetWarehouseId}`
    );

    setTransferModalOpen(false);
  };

  const query = searchFilter.toLowerCase();
  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Stocks & Multi-Entrepôts</h2>
          <p className="text-xs text-slate-500">
            Gestion des dépôts, mouvements d'entrées/sorties et valorisation au PUMP
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Transfert Inter-Dépôts</span>
          </button>
          <button
            onClick={() => setCreateProductOpen(true)}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvel Article</span>
          </button>
        </div>
      </div>

      {/* Top Inventory Stat Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Valeur Totale du Stock (PUMP)
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totalStockValuation, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Valorisation au coût d'achat moyen
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Nombre de Références Actives
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {products.length} articles
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Répartis sur {warehouses.length} entrepôt(s)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Alertes de Réapprovisionnement
          </span>
          <div
            className={`text-xl font-bold mt-1 ${
              criticalStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {criticalStockCount} alerte(s)
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {criticalStockCount > 0 ? 'Articles sous le stock de sécurité' : 'Stocks équilibrés'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <SegmentedTabs
        tabs={[
          { id: 'articles', label: 'Catalogue & Disponibilités', count: filteredProducts.length },
          { id: 'entrepots', label: 'Entrepôts & Magasins', count: warehouses.length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB: Articles */}
      {activeTab === 'articles' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU / Réf</th>
                  <th className="py-3 px-4 font-semibold">Désignation</th>
                  <th className="py-3 px-4 font-semibold">Catégorie</th>
                  <th className="py-3 px-4 font-semibold text-center">Unité</th>
                  <th className="py-3 px-4 font-semibold text-right">Prix d'Achat HT</th>
                  <th className="py-3 px-4 font-semibold text-right">Prix de Vente HT</th>
                  <th className="py-3 px-4 font-semibold text-right">Marge %</th>
                  <th className="py-3 px-4 font-semibold text-center">Stock Actuel</th>
                  <th className="py-3 px-4 font-semibold text-right">Valeur Stock</th>
                  <th className="py-3 px-4 font-semibold text-center">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isCritical = p.currentStock <= p.stockMinAlert && p.stockMinAlert > 0;
                  const marginPct =
                    p.sellingPriceHT > 0
                      ? (((p.sellingPriceHT - p.purchasePriceHT) / p.sellingPriceHT) * 100).toFixed(1)
                      : '0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{p.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        {/* Breakdown per warehouse */}
                        <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                          {warehouses.map(w => (
                            <span key={w.id}>
                              {w.name.split(' ')[0]}: {p.warehouseStock[w.id] || 0}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-slate-600 text-center">{p.unit}</td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {formatMoney(p.purchasePriceHT, tenant.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatMoney(p.sellingPriceHT, tenant.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-800">
                        +{marginPct}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-xs ${
                            isCritical ? 'bg-rose-100 text-rose-800' : 'text-slate-800'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatMoney(p.currentStock * p.purchasePriceHT, tenant.currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Critique</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-medium">Optimal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Entrepôts */}
      {activeTab === 'entrepots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map(w => (
            <div
              key={w.id}
              className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <WarehouseIcon className="w-4 h-4 text-[#0F5132]" />
                      <span>{w.name}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">{w.location}</p>
                  </div>
                  {w.isDefault && (
                    <span className="text-[10px] font-bold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded">
                      Principal
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div>Responsable de site : <strong>{w.managerName}</strong></div>
                  <div>Rattachement : Établissement Siège</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Capacité & Mouvements sous contrôle</span>
                <button
                  onClick={() => {
                    setSourceWarehouseId(w.id);
                    setTransferModalOpen(true);
                  }}
                  className="text-xs text-[#0F5132] font-semibold hover:underline cursor-pointer"
                >
                  Effectuer un transfert →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Créer un Article */}
      <Modal
        isOpen={createProductOpen}
        onClose={() => setCreateProductOpen(false)}
        title="Créer un Nouvel Article de Stock"
        subtitle="Catalogue unifié avec valorisation PUMP et alertes de seuil"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Code Réf / SKU *</label>
              <input
                type="text"
                placeholder="Ex: FER-12MM-01"
                value={sku}
                onChange={e => setSku(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Matériaux Gros Œuvre">Matériaux Gros Œuvre</option>
                <option value="Engins & Équipements">Engins & Équipements</option>
                <option value="Finitions & Peinture">Finitions & Peinture</option>
                <option value="Quincaillerie & Outillage">Quincaillerie & Outillage</option>
                <option value="Services & Prestations">Services & Prestations</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Désignation complète *</label>
            <input
              type="text"
              placeholder="Ex: Ciment Portland CPA 42.5 en sacs 50kg"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unité de mesure</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="tonne">Tonne</option>
                <option value="unité">Unité</option>
                <option value="carton">Carton</option>
                <option value="kg">Kilogramme</option>
                <option value="mètre">Mètre</option>
                <option value="forfait">Forfait</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prix d'Achat HT ({tenant.currency}) *</label>
              <input
                type="number"
                min="0"
                value={purchasePriceHT}
                onChange={e => setPurchasePriceHT(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prix de Vente HT ({tenant.currency}) *</label>
              <input
                type="number"
                min="0"
                value={sellingPriceHT}
                onChange={e => setSellingPriceHT(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-[#0F5132]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock Initial</label>
              <input
                type="number"
                min="0"
                value={initialQty}
                onChange={e => setInitialQty(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Seuil Alerte Minimum</label>
              <input
                type="number"
                min="1"
                value={stockMinAlert}
                onChange={e => setStockMinAlert(parseFloat(e.target.value) || 1)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Entrepôt de Réception Initial</label>
            <select
              value={defaultWarehouseId}
              onChange={e => setDefaultWarehouseId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.location})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setCreateProductOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Créer l'Article
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Transfert Inter-Dépôts */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfert de Stock Inter-Dépôts"
        subtitle="Mouvement logistique interne traçable avec mise à jour des inventaires"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Article à transférer *</label>
            <select
              value={transferProductId}
              onChange={e => setTransferProductId(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock global : {p.currentStock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Entrepôt Source (Départ) *</label>
              <select
                value={sourceWarehouseId}
                onChange={e => setSourceWarehouseId(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Entrepôt Destination (Arrivée) *</label>
              <select
                value={targetWarehouseId}
                onChange={e => setTargetWarehouseId(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Quantité à transférer *</label>
            <input
              type="number"
              min="1"
              value={transferQty}
              onChange={e => setTransferQty(parseFloat(e.target.value) || 1)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
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
              Valider le Transfert
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
