/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Barre Latérale de Navigation ERP (Modules Complets A à P)
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  ShoppingCart,
  Boxes,
  Store,
  BookOpenCheck,
  Wallet,
  Users2,
  Briefcase,
  Truck,
  FolderOpen,
  BarChart3,
  Sparkles,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Globe2,
} from 'lucide-react';
import { Tenant } from '../../types';

export type NavModule =
  | 'dashboard'
  | 'crm'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'pos'
  | 'accounting'
  | 'treasury'
  | 'tax'
  | 'payroll'
  | 'assets'
  | 'projects'
  | 'documents'
  | 'bi'
  | 'ai'
  | 'admin'
  | 'tests'
  | 'saas';

interface SidebarProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  tenant: Tenant;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenPublicSite?: () => void;
}

export function Sidebar({
  activeModule,
  onSelectModule,
  tenant,
  collapsed,
  onToggleCollapse,
  onOpenPublicSite,
}: SidebarProps) {
  const navSections = [
    {
      title: 'Pilotage & Décision',
      items: [
        { id: 'dashboard' as NavModule, label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'bi' as NavModule, label: 'Rapports & Analytics', icon: BarChart3 },
        { id: 'ai' as NavModule, label: 'Assistant IA GSPME', icon: Sparkles, highlight: true },
      ],
    },
    {
      title: 'Commercial & Relations',
      items: [
        { id: 'crm' as NavModule, label: 'Clients & CRM', icon: Users },
        { id: 'sales' as NavModule, label: 'Ventes & Facturation', icon: Receipt },
        { id: 'pos' as NavModule, label: 'Caisse & Point de Vente', icon: Store },
        { id: 'purchases' as NavModule, label: 'Achats & Fournisseurs', icon: ShoppingCart },
        { id: 'inventory' as NavModule, label: 'Stocks & Entrepôts', icon: Boxes },
      ],
    },
    {
      title: 'Finance & OHADA',
      items: [
        { id: 'accounting' as NavModule, label: 'Comptabilité SYSCOHADA', icon: BookOpenCheck },
        { id: 'treasury' as NavModule, label: 'Trésorerie & Caisses', icon: Wallet },
        { id: 'tax' as NavModule, label: 'Fiscalité & Taxes (TVA)', icon: BookOpenCheck },
        { id: 'assets' as NavModule, label: 'Immobilisations', icon: Truck },
        { id: 'payroll' as NavModule, label: 'Paie & Ressources Humaines', icon: Users2 },
      ],
    },
    {
      title: 'Opérations & GED',
      items: [
        { id: 'projects' as NavModule, label: 'Gestion de Projets', icon: Briefcase },
        { id: 'documents' as NavModule, label: 'Documents & GED', icon: FolderOpen },
      ],
    },
    {
      title: 'Paramètres & Plateforme',
      items: [
        { id: 'admin' as NavModule, label: 'Paramètres Entreprise', icon: Settings },
        { id: 'tests' as NavModule, label: 'Qualité & Banc de Tests', icon: ShieldCheck },
        { id: 'saas' as NavModule, label: 'Super Admin SaaS', icon: ShieldAlert },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#0F5132] text-white flex flex-col justify-between transition-all duration-200 border-r border-[#0F5132]/20 select-none z-40 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white p-0.5 border border-white/20 shadow-xs shrink-0">
                  <img
                    src="/src/assets/images/gspme_logo.jpg"
                    alt="GSPME-ERP"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <div className="font-black tracking-tight text-sm text-white flex items-center">
                    <span>GSPME</span>
                    <span className="text-[#D4AF37]">-ERP</span>
                  </div>
                  <div className="text-[9px] text-white/70 font-medium">Croissance connectée</div>
                </div>
              </div>
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Réduire la barre latérale"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="mx-auto w-9 h-9 rounded-xl overflow-hidden bg-white p-0.5 border border-white/20 shadow-xs cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
              title="Agrandir la barre latérale"
            >
              <img
                src="/src/assets/images/gspme_logo.jpg"
                alt="GSPME-ERP"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-lg"
              />
            </button>
          )}
        </div>

        {/* Navigation Items Scroll Area */}
        <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold shadow-2xs border-l-3 border-[#D4AF37]'
                        : 'text-white/75 hover:text-white hover:bg-white/8'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D4AF37]' : item.highlight ? 'text-[#D4AF37]' : 'text-white/70'}`} />
                    {!collapsed && (
                      <span className="truncate flex items-center justify-between w-full">
                        <span>{item.label}</span>
                        {item.highlight && (
                          <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1 rounded font-bold uppercase">
                            IA
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bouton Accès Site Public & Tarifs */}
        {onOpenPublicSite && (
          <div className="px-3 pb-2">
            <button
              onClick={onOpenPublicSite}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 transition-all cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Consulter le site public, les tarifs et la FAQ"
            >
              <Globe2 className="w-4 h-4 shrink-0 text-[#D4AF37]" />
              {!collapsed && <span>Site Public & Tarifs</span>}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Tenant & Subscription Info */}
      <div className="p-3 border-t border-white/10 bg-black/10">
        {!collapsed ? (
          <div>
            <div className="flex items-center justify-between text-[11px] text-white/70 mb-0.5">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>SYSCOHADA Révisé</span>
              </span>
              <span className="text-[#D4AF37] font-semibold text-[10px]">
                {tenant.subscriptionPlan}
              </span>
            </div>
            <div className="text-[10px] text-white/50 truncate">
              {tenant.name}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          </div>
        )}
      </div>
    </aside>
  );
}
