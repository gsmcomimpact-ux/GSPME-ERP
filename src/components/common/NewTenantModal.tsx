/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Modal de Création d'une Nouvelle Entreprise SaaS Multi-Tenant
 */

import React, { useState } from 'react';
import { Tenant, CountryCode } from '../../types';
import { COUNTRY_PACKS } from '../../services/currency';
import { Modal } from './UIComponents';
import { storage } from '../../services/storage';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: (tenant: Tenant) => void;
}

export function NewTenantModal({ isOpen, onClose, onTenantCreated }: NewTenantModalProps) {
  const [name, setName] = useState('');
  const [legalForm, setLegalForm] = useState<Tenant['legalForm']>('SARL');
  const [countryCode, setCountryCode] = useState<CountryCode>('SN');
  const [taxNumber, setTaxNumber] = useState('');
  const [tradeRegisterNumber, setTradeRegisterNumber] = useState('');
  const [city, setCity] = useState('Dakar');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+221 ');
  const [email, setEmail] = useState('');
  const [capitalSocial, setCapitalSocial] = useState(10000000);

  const pack = COUNTRY_PACKS[countryCode];

  const handleCountryChange = (code: CountryCode) => {
    setCountryCode(code);
    if (code === 'SN') { setCity('Dakar'); setPhone('+221 '); }
    if (code === 'CI') { setCity('Abidjan'); setPhone('+225 '); }
    if (code === 'CM') { setCity('Douala'); setPhone('+237 '); }
    if (code === 'ML') { setCity('Bamako'); setPhone('+223 '); }
    if (code === 'BJ') { setCity('Cotonou'); setPhone('+229 '); }
    if (code === 'GN') { setCity('Conakry'); setPhone('+224 '); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `tenant-${countryCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const branchId = `branch-${newId}-hq`;

    const newTenant: Tenant = {
      id: newId,
      name,
      legalForm,
      countryCode,
      taxNumber: taxNumber || `${pack.taxNumberLabel} 000${Math.floor(100000 + Math.random() * 900000)}`,
      tradeRegisterNumber: tradeRegisterNumber || `${pack.tradeRegisterLabel} 2026-B-${Math.floor(1000 + Math.random() * 9000)}`,
      address: address || `Avenue Principale, ${city}`,
      city,
      phone,
      email: email || `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      currency: pack.currency,
      capitalSocial,
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      maxUsers: 15,
      maxStorageMB: 10240,
      activeModules: [
        'dashboard', 'crm', 'sales', 'purchases', 'inventory', 'pos',
        'accounting', 'treasury', 'payroll', 'projects', 'assets', 'documents', 'bi', 'ai', 'admin'
      ],
      currentBranchId: branchId,
      branches: [
        {
          id: branchId,
          tenantId: newId,
          name: `Siège ${city}`,
          city,
          address: address || `Avenue Principale, ${city}`,
          phone,
          isHeadquarters: true,
        },
      ],
    };

    storage.createTenant(newTenant);
    onTenantCreated(newTenant);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une Nouvelle Entreprise sur GSPME"
      subtitle="Initialisation d'un espace multi-tenant isolé selon la réglementation nationale"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pays d'implantation *</label>
            <select
              value={countryCode}
              onChange={e => handleCountryChange(e.target.value as CountryCode)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-[#0F5132]"
            >
              {Object.values(COUNTRY_PACKS).map(c => (
                <option key={c.code} value={c.code}>
                  {c.countryName} ({c.currencySymbol} · TVA {c.vatRateDefault}%)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Forme Juridique *</label>
            <select
              value={legalForm}
              onChange={e => setLegalForm(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
              <option value="SAS">SAS (Société par Actions Simplifiée)</option>
              <option value="SA">SA (Société Anonyme)</option>
              <option value="SUARL">SUARL (SARL Unipersonnelle)</option>
              <option value="GIE">GIE (Groupement d'Intérêt Économique)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Nom / Raison Sociale de l'Entreprise *</label>
          <input
            type="text"
            placeholder="Ex: Sahel Transit & Logistique SARL"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full p-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Numéro Fiscal ({pack.taxNumberLabel})
            </label>
            <input
              type="text"
              placeholder={`Ex: ${pack.taxNumberLabel} 10928372`}
              value={taxNumber}
              onChange={e => setTaxNumber(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Registre de Commerce ({pack.tradeRegisterLabel})
            </label>
            <input
              type="text"
              placeholder="Ex: RCCM 2026-B-1092"
              value={tradeRegisterNumber}
              onChange={e => setTradeRegisterNumber(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ville du Siège *</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Téléphone *</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Capital Social ({pack.currency})</label>
            <input
              type="number"
              min="100000"
              value={capitalSocial}
              onChange={e => setCapitalSocial(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-xs">
          Un espace de données étanche sera automatiquement initialisé avec le plan comptable
          SYSCOHADA Révisé, les taux de TVA applicables ({pack.vatRateDefault}%) et les devises du pack
          pays ({pack.currency}).
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg cursor-pointer"
          >
            Créer l'Entreprise
          </button>
        </div>
      </form>
    </Modal>
  );
}
