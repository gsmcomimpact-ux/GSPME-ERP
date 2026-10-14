/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module L : Immobilisations, Équipements & Amortissements OHADA
 */

import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Calculator,
  Calendar,
  Layers,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Tenant, FixedAsset, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface FixedAssetsModuleProps {
  tenant: Tenant;
  fixedAssets: FixedAsset[];
  userRole: Role;
  searchFilter: string;
}

export function FixedAssetsModule({
  tenant,
  fixedAssets,
  userRole,
  searchFilter,
}: FixedAssetsModuleProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FixedAsset['category']>('VEHICULES_TRANSPORT');
  const [acquisitionCost, setAcquisitionCost] = useState(25000000);
  const [acquisitionDate, setAcquisitionDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationYears, setDurationYears] = useState(5);
  const [depreciationMethod, setDepreciationMethod] = useState<'LINEAIRE' | 'DEGRESSIF'>('LINEAIRE');

  const totalGrossAssetValue = fixedAssets.reduce((acc, a) => acc + a.acquisitionCost, 0);
  const totalDepreciation = fixedAssets.reduce((acc, a) => acc + a.accumulatedDepreciation, 0);
  const totalNetBookValue = fixedAssets.reduce((acc, a) => acc + a.netBookValue, 0);

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const count = fixedAssets.length + 1;
    const ohadaAsset = category === 'VEHICULES_TRANSPORT' ? '245' : category === 'MATERIEL_INDUSTRIEL' ? '241' : '244';

    const newAsset: FixedAsset = {
      id: `ast-${Date.now()}`,
      tenantId: tenant.id,
      code: code || `IMMO-${category.slice(0, 3)}-${String(count).padStart(2, '0')}`,
      name,
      category,
      acquisitionDate,
      commissioningDate: acquisitionDate,
      acquisitionCost,
      salvageValue: 0,
      durationYears,
      depreciationMethod,
      accumulatedDepreciation: 0,
      netBookValue: acquisitionCost,
      ohadaAccountAsset: ohadaAsset,
      ohadaAccountDeprec: '284',
      status: 'EN_SERVICE',
    };

    storage.addFixedAsset(newAsset);
    setCreateModalOpen(false);
    setName('');
    setCode('');
  };

  const query = searchFilter.toLowerCase();
  const filteredAssets = fixedAssets.filter(
    a =>
      a.name.toLowerCase().includes(query) ||
      a.code.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Immobilisations & Amortissements</h2>
          <p className="text-xs text-slate-500">
            Fichier des actifs corporels, plans d'amortissement et valeurs nettes comptables (VNC)
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Immobilisation</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Valeur Brute d'Acquisition (Classe 2)
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totalGrossAssetValue, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{fixedAssets.length} biens immobilisés</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Amortissements Cumulés (Compte 284)
          </span>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {formatMoney(totalDepreciation, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Perte de valeur économique constatée</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Valeur Nette Comptable (VNC)
          </span>
          <div className="text-xl font-bold text-[#0F5132] mt-1">
            {formatMoney(totalNetBookValue, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Inscrite à l'Actif du Bilan OHADA</div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Code Immo</th>
                <th className="py-3 px-4 font-semibold">Désignation</th>
                <th className="py-3 px-4 font-semibold">Compte OHADA</th>
                <th className="py-3 px-4 font-semibold">Mise en service</th>
                <th className="py-3 px-4 font-semibold text-center">Durée</th>
                <th className="py-3 px-4 font-semibold text-right">Valeur d'Acquisition</th>
                <th className="py-3 px-4 font-semibold text-right">Amort. Cumulés</th>
                <th className="py-3 px-4 font-semibold text-right">V.N.C.</th>
                <th className="py-3 px-4 font-semibold text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{asset.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{asset.name}</div>
                    <div className="text-[10px] text-slate-400">{asset.category.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    Compte {asset.ohadaAccountAsset}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{asset.commissioningDate}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700">{asset.durationYears} ans ({asset.depreciationMethod})</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">
                    {formatMoney(asset.acquisitionCost, tenant.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-500">
                    {formatMoney(asset.accumulatedDepreciation, tenant.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#0F5132]">
                    {formatMoney(asset.netBookValue, tenant.currency)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      En Service
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nouvelle Immobilisation */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Enregistrer une Immobilisation"
        subtitle="Entrée dans le patrimoine d'actif durable (Classe 2)"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Code / Réf *</label>
              <input
                type="text"
                placeholder="Ex: IMMO-TRP-05"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie d'Actif</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="VEHICULES_TRANSPORT">Matériel de transport (Camions, Véhicules)</option>
                <option value="MATERIEL_INDUSTRIEL">Matériel & Outillage industriel</option>
                <option value="INFORMATIQUE_BUREAUTIQUE">Matériel informatique & Mobilier</option>
                <option value="BATIMENTS">Bâtiments & Constructions</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Désignation du bien *</label>
            <input
              type="text"
              placeholder="Ex: Chariot Élévateur Toyota 3.5 Tonnes"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coût d'Acquisition ({tenant.currency}) *</label>
              <input
                type="number"
                min="1"
                value={acquisitionCost}
                onChange={e => setAcquisitionCost(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date d'Acquisition</label>
              <input
                type="date"
                value={acquisitionDate}
                onChange={e => setAcquisitionDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Durée (Années)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={durationYears}
                onChange={e => setDurationYears(parseInt(e.target.value) || 5)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-xs">
            L'amortissement annuel linéaire sera de <strong>{formatMoney(acquisitionCost / (durationYears || 1), tenant.currency)} / an</strong>.
            Une dotation au compte 681 sera imputable à chaque clôture d'exercice.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Enregistrer l'Immobilisation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
