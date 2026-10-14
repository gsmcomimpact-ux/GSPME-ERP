/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Composants d'Interface Réutilisables & Design Constitution
 */

import React, { ReactNode } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'lg' }: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '4xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full ${maxWidthClass} max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon?: ReactNode;
  accentColor?: string;
}

export function KpiCard({ label, value, change, isPositive = true, subtext, icon }: KpiCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-[#0F5132]/30 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {(change || subtext) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {change && (
              <span className={`font-medium ${isPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                {change}
              </span>
            )}
            {change && subtext && <span aria-hidden="true" className="text-slate-300">·</span>}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function SegmentedTabs({ tabs, activeTab, onChange }: SegmentedTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-lg border border-slate-200/60 overflow-x-auto">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'bg-white text-[#0F5132] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#0F5132]/10 text-[#0F5132]' : 'text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StatusIndicator({ status }: { status: string }) {
  // Respecting anti-slop: clean text with color accent dot, not a chunky pill badge
  const config: Record<string, { label: string; dot: string; text: string }> = {
    PAYEE: { label: 'Payée', dot: 'bg-emerald-600', text: 'text-emerald-800' },
    VALIDEE: { label: 'Validée', dot: 'bg-emerald-700', text: 'text-emerald-800' },
    VALIDE: { label: 'Validé', dot: 'bg-emerald-700', text: 'text-emerald-800' },
    PARTIELLE: { label: 'Partiellement réglée', dot: 'bg-amber-500', text: 'text-amber-800' },
    BROUILLON: { label: 'Brouillon', dot: 'bg-slate-400', text: 'text-slate-600' },
    ANNULEE: { label: 'Annulée', dot: 'bg-rose-500', text: 'text-rose-700' },
    ACTIVE: { label: 'Actif', dot: 'bg-emerald-600', text: 'text-emerald-800' },
  };

  const current = config[status] || { label: status, dot: 'bg-slate-400', text: 'text-slate-700' };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${current.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} aria-hidden="true" />
      <span>{current.label}</span>
    </span>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
