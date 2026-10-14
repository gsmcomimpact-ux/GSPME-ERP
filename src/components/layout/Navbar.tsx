/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Barre Supérieure avec Sélecteur Multi-Entreprises & Devises
 */

import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Search, 
  Bell, 
  UserCheck, 
  MapPin, 
  Plus, 
  Globe2,
  Check,
  PlusCircle
} from 'lucide-react';
import { Tenant, User, Role } from '../../types';
import { COUNTRY_PACKS } from '../../services/currency';

interface NavbarProps {
  tenant: Tenant;
  tenants: Tenant[];
  onSelectTenant: (id: string) => void;
  onSelectBranch: (id: string) => void;
  currentUser: User;
  onSelectUserRole: (role: Role) => void;
  onOpenQuickCreate: (type: 'INVOICE' | 'CUSTOMER' | 'TRANSACTION' | 'PRODUCT') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewTenantModal: () => void;
  onOpenPublicSite?: () => void;
}

export function Navbar({
  tenant,
  tenants,
  onSelectTenant,
  onSelectBranch,
  currentUser,
  onSelectUserRole,
  onOpenQuickCreate,
  searchQuery,
  onSearchChange,
  onOpenNewTenantModal,
  onOpenPublicSite,
}: NavbarProps) {
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const countryPack = COUNTRY_PACKS[tenant.countryCode];
  const currentBranch = tenant.branches.find(b => b.id === tenant.currentBranchId) || tenant.branches[0];

  const rolesList: { role: Role; label: string; desc: string }[] = [
    { role: 'DIRECTEUR_GENERAL', label: 'Directeur Général', desc: 'Accès complet & validation' },
    { role: 'RESPONSABLE_FINANCIER', label: 'DAF & Expert Comptable', desc: 'Comptabilité, Trésorerie, Fiscalité' },
    { role: 'COMMERCIAL_VENTES', label: 'Commercial & Facturation', desc: 'Devis, Factures clients' },
    { role: 'LOGISTIQUE_STOCKS', label: 'Responsable Stocks', desc: 'Entrepôts, Réceptions, Sorties' },
    { role: 'GESTIONNAIRE_RH', label: 'Gestionnaire RH & Paie', desc: 'Personnel, Salaires, Déclarations' },
    { role: 'AUDITEUR_EXTERNE', label: 'Commissaire aux Comptes', desc: 'Consultation & Pistes d’audit' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
      {/* Left: Multi-Tenant & Branch Selectors */}
      <div className="flex items-center gap-3">
        {/* Tenant Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setTenantDropdownOpen(!tenantDropdownOpen);
              setBranchDropdownOpen(false);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#0F5132]/40 bg-slate-50/60 hover:bg-white text-left transition-all cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-[#0F5132] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {tenant.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                <span className="truncate max-w-[140px] md:max-w-[180px]">{tenant.name}</span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 rounded">
                  {tenant.countryCode}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>{tenant.legalForm}</span>
                <span aria-hidden="true">·</span>
                <span>{tenant.currency}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {tenantDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Mes Entreprises & Filiales
              </div>
              {tenants.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTenant(t.id);
                    setTenantDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                    t.id === tenant.id ? 'bg-[#0F5132]/5 text-[#0F5132] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="truncate max-w-[170px]">{t.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {COUNTRY_PACKS[t.countryCode]?.countryName} · {t.currency}
                      </div>
                    </div>
                  </div>
                  {t.id === tenant.id && <Check className="w-3.5 h-3.5 text-[#0F5132]" />}
                </button>
              ))}
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => {
                  setTenantDropdownOpen(false);
                  onOpenNewTenantModal();
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#0F5132] font-medium hover:bg-[#0F5132]/5 flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Créer une nouvelle entreprise</span>
              </button>
            </div>
          )}
        </div>

        {/* Branch / Établissement Switcher */}
        {tenant.branches.length > 0 && (
          <div className="relative hidden md:block">
            <button
              onClick={() => {
                setBranchDropdownOpen(!branchDropdownOpen);
                setTenantDropdownOpen(false);
                setRoleDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[130px] font-medium">{currentBranch?.name || 'Établissement'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {branchDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Établissements & Succursales
                </div>
                {tenant.branches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBranch(b.id);
                      setBranchDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer ${
                      b.id === tenant.currentBranchId ? 'text-[#0F5132] font-semibold bg-[#0F5132]/5' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div>{b.name}</div>
                      <div className="text-[10px] text-slate-400">{b.city}</div>
                    </div>
                    {b.id === tenant.currentBranchId && <Check className="w-3 h-3 text-[#0F5132]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Country & Legal Info */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pl-2 border-l border-slate-200">
          <Globe2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{countryPack.countryName}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{countryPack.taxNumberLabel}: {tenant.taxNumber}</span>
        </div>
      </div>

      {/* Middle: Search Bar */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Rechercher facture, client, article, écriture..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs rounded-lg border border-transparent focus:border-[#0F5132] focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right: Quick Create, Notifications & Role Switcher */}
      <div className="flex items-center gap-2.5">
        {onOpenPublicSite && (
          <button
            onClick={onOpenPublicSite}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#0F5132] border border-[#D4AF37]/40 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            title="Consulter le site public, les tarifs et la FAQ"
          >
            <Globe2 className="w-3.5 h-3.5 text-[#0F5132]" />
            <span>Site Public & Tarifs</span>
          </button>
        )}

        {/* Quick Action Button */}
        <div className="relative">
          <button
            onClick={() => setQuickCreateOpen(!quickCreateOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-medium rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Créer</span>
          </button>

          {quickCreateOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <button
                onClick={() => {
                  setQuickCreateOpen(false);
                  onOpenQuickCreate('INVOICE');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-[#0F5132] flex items-center gap-2 cursor-pointer"
              >
                <span>Nouvelle Facture de Vente</span>
              </button>
              <button
                onClick={() => {
                  setQuickCreateOpen(false);
                  onOpenQuickCreate('CUSTOMER');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-[#0F5132] flex items-center gap-2 cursor-pointer"
              >
                <span>Nouveau Client</span>
              </button>
              <button
                onClick={() => {
                  setQuickCreateOpen(false);
                  onOpenQuickCreate('PRODUCT');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-[#0F5132] flex items-center gap-2 cursor-pointer"
              >
                <span>Nouvel Article de Stock</span>
              </button>
              <button
                onClick={() => {
                  setQuickCreateOpen(false);
                  onOpenQuickCreate('TRANSACTION');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-[#0F5132] flex items-center gap-2 cursor-pointer"
              >
                <span>Mouvement de Trésorerie</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
          </button>

          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Alertes & Notifications</span>
                <span className="text-[10px] text-slate-400">2 nouvelles</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-200/50">
                  <div className="font-semibold text-amber-900">Seuil de stock critique</div>
                  <div className="text-[11px] text-amber-700">Peinture satinée 20L : plus que 8 unités en stock (seuil mini : 15).</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="font-semibold text-slate-800">Créance échue</div>
                  <div className="text-[11px] text-slate-600">Facture FAC-2026-0041 (CSE SA) : échéance dépassée.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role & User Switcher (RBAC Live Simulator) */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleDropdownOpen(!roleDropdownOpen);
              setTenantDropdownOpen(false);
              setBranchDropdownOpen(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-[#198754]/15 text-[#0F5132] flex items-center justify-center font-bold text-[10px]">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-semibold text-slate-900 leading-none">{currentUser.name}</div>
              <div className="text-[10px] text-[#0F5132] font-medium mt-0.5">
                {currentUser.role.replace(/_/g, ' ')}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tester les Profils & Rôles RBAC
                </div>
                <div className="text-[10px] text-slate-500">Basculez de rôle pour tester les autorisations</div>
              </div>
              {rolesList.map(item => (
                <button
                  key={item.role}
                  onClick={() => {
                    onSelectUserRole(item.role);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                    currentUser.role === item.role ? 'text-[#0F5132] font-semibold bg-[#0F5132]/5' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div>{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </div>
                  {currentUser.role === item.role && <Check className="w-3.5 h-3.5 text-[#0F5132]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
