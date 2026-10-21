/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module P & Q : Console Commerciale & Super Admin SaaS (Monétisation & Gestion des Offres)
 */

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Server,
  Globe2,
  Users2,
  Building2,
  CreditCard,
  Layers,
  CheckCircle2,
  Activity,
  Sliders,
  Database,
  TrendingUp,
  Receipt,
  RotateCcw,
  Sparkles,
  Search,
  MessageSquare,
  AlertTriangle,
  XCircle,
  Edit2,
  Save,
  Check,
  Download,
} from 'lucide-react';
import {
  Tenant,
  SubscriptionPlanConfig,
  SubscriptionPlanId,
  SubscriptionOrder,
  SupportInquiry,
  CountryCode,
} from '../../types';
import { COUNTRY_PACKS, formatMoney } from '../../services/currency';
import { SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { subscriptionService } from '../../services/subscriptionService';
import { api } from '../../services/api';
import { PdfService } from '../../services/pdfService';

interface SaasAdminModuleProps {
  tenants: Tenant[];
  onSelectTenant: (id: string) => void;
  onOpenPublicSite?: () => void;
}

export function SaasAdminModule({ tenants, onSelectTenant, onOpenPublicSite }: SaasAdminModuleProps) {
  const [activeTab, setActiveTab] = useState<
    'monetisation' | 'offres' | 'commandes' | 'entreprises' | 'prospects' | 'packs'
  >('monetisation');

  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>(subscriptionService.getPlans());
  // Session serveur : pas de passerelle de paiement branchée, donc aucune commande fictive affichée
  const [orders, setOrders] = useState<SubscriptionOrder[]>(api.isEnabled() ? [] : subscriptionService.getOrders());
  const [inquiries, setInquiries] = useState<SupportInquiry[]>(subscriptionService.getSupportInquiries());
  const [inquiryError, setInquiryError] = useState('');

  // En session serveur, les demandes viennent de la base (formulaire public de la page d'accueil)
  useEffect(() => {
    if (!api.isEnabled()) return;
    api.listInquiries().then(setInquiries).catch(err => setInquiryError(err.message));
  }, []);

  const patchTenant = async (t: Tenant, changes: Record<string, unknown>) => {
    try {
      await api.patchTenant(t.id, changes);
      await storage.refreshFromServer();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const changeTenantPlan = (t: Tenant, planId: SubscriptionPlanId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    patchTenant(t, {
      subscriptionPlan: plan.id,
      subscriptionStatus: plan.monthlyPriceFCFA > 0 ? 'ACTIVE' : t.subscriptionStatus,
      monthlySubscriptionAmount: plan.monthlyPriceFCFA,
      maxUsers: plan.maxUsers,
      maxStorageMB: plan.maxStorageMB,
      activeModules: plan.allowedModules,
    });
  };

  const changeInquiryStatus = async (id: string, status: SupportInquiry['status']) => {
    setInquiryError('');
    try {
      if (api.isEnabled()) await api.setInquiryStatus(id, status);
      else subscriptionService.updateInquiryStatus(id, status);
      setInquiries(prev => prev.map(i => (i.id === id ? { ...i, status } : i)));
    } catch (err) {
      setInquiryError((err as Error).message);
    }
  };

  // Édition d'offre
  const [editingPlanId, setEditingPlanId] = useState<SubscriptionPlanId | null>(null);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editAnnualPrice, setEditAnnualPrice] = useState(0);
  const [editMaxUsers, setEditMaxUsers] = useState(0);
  const [editMaxStorageMB, setEditMaxStorageMB] = useState(0);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // Métriques de monétisation calculées en direct
  const metrics = subscriptionService.computeMonetizationMetrics();

  const handleStartEditPlan = (plan: SubscriptionPlanConfig) => {
    setEditingPlanId(plan.id);
    setEditMonthlyPrice(plan.monthlyPriceFCFA);
    setEditAnnualPrice(plan.annualPriceFCFA);
    setEditMaxUsers(plan.maxUsers);
    setEditMaxStorageMB(plan.maxStorageMB);
  };

  const handleSavePlan = (planId: SubscriptionPlanId) => {
    const updated = subscriptionService.updatePlan(planId, {
      monthlyPriceFCFA: Number(editMonthlyPrice),
      annualPriceFCFA: Number(editAnnualPrice),
      maxUsers: Number(editMaxUsers),
      maxStorageMB: Number(editMaxStorageMB),
    });
    setPlans(updated);
    setEditingPlanId(null);
    setEditSuccessMsg(`Offre ${planId} mise à jour avec succès.`);
    setTimeout(() => setEditSuccessMsg(''), 3000);
  };

  const handleResetPlans = () => {
    if (confirm('Voulez-vous réinitialiser les 4 offres à leurs valeurs par défaut ?')) {
      const def = subscriptionService.resetPlansToDefault();
      setPlans(def);
    }
  };

  return (
    <div className="space-y-5">
      {/* Super Admin Top Header */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Console Commerciale & Super Admin SaaS GSPME</span>
          </div>
          <h2 className="text-lg font-bold mt-1 tracking-tight">
            Monétisation, Pilotage des Revenus & Supervision Multi-Entreprises
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Séparation garantie entre l'administration de la plateforme et les espaces des entreprises clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPublicSite && (
            <button
              onClick={onOpenPublicSite}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Consulter le site vitrine et tester les tarifs"
            >
              <Globe2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Voir le Site Public & Tarifs</span>
            </button>
          )}
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Passerelles Mobile Money & Cartes Opérationnelles</span>
          </span>
        </div>
      </div>

      {/* KPI Monétisation & Revenus SaaS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">MRR (Revenu Récurrent Mensuel)</span>
          <div className="text-xl font-bold text-[#0F5132] mt-1">
            {formatMoney(metrics.mrr, 'XOF')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            ARR projeté : <strong>{formatMoney(metrics.arr, 'XOF')}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Abonnements Actifs</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.activeSubscriptions} / {metrics.totalTenants}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Taux d'activation : {Math.round((metrics.activeSubscriptions / (metrics.totalTenants || 1)) * 100)}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Revenu Moyen / Client (ARPU)</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatMoney(metrics.arpuFCFA, 'XOF')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Par mois par entreprise</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Santé Commerciale</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.churnRatePercent}% Churn
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics.pastDueSubscriptions} impayés · {metrics.cancelledSubscriptions} résiliations
          </div>
        </div>
      </div>

      {editSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{editSuccessMsg}</span>
        </div>
      )}

      {/* Navigation des Onglets */}
      <SegmentedTabs
        tabs={[
          { id: 'monetisation', label: 'Console Revenus & Répartition' },
          { id: 'offres', label: 'Gestion des 4 Offres SaaS' },
          { id: 'commandes', label: 'Historique des Commandes & Paiements', count: orders.length },
          { id: 'entreprises', label: 'Entreprises Clientes & Quotas', count: tenants.length },
          { id: 'prospects', label: 'Prospects & Demandes de Support', count: inquiries.length },
          { id: 'packs', label: 'Packs Pays Déployés', count: Object.keys(COUNTRY_PACKS).length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* ONGLET 1 : REVENUS & ANALYSE DE LA MONÉTISATION */}
      {activeTab === 'monetisation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
          {/* Répartition par Formule */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Répartition des Clients par Formule</span>
              <span className="text-[11px] font-normal text-slate-500">4 formules actives</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(metrics.byPlan).map(([pId, data]) => {
                const plan = plans.find(p => p.id === pId);
                const percent = metrics.totalTenants > 0 ? Math.round((data.count / metrics.totalTenants) * 100) : 0;

                return (
                  <div key={pId} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">
                        {plan?.name || pId} ({formatMoney(plan?.monthlyPriceFCFA || 0, 'XOF')}/m)
                      </span>
                      <div className="text-right">
                        <strong className="text-slate-900">{data.count} client{data.count > 1 ? 's' : ''}</strong>
                        <span className="text-slate-400 text-[11px] ml-2">({formatMoney(data.mrr, 'XOF')})</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0F5132]"
                        style={{ width: `${Math.max(8, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Répartition par Pays */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Répartition Géographique des Abonnés</span>
              <span className="text-[11px] font-normal text-slate-500">Zone OHADA</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(metrics.byCountry).map(([code, data]) => {
                const pack = COUNTRY_PACKS[code as CountryCode];
                const percent = metrics.totalTenants > 0 ? Math.round((data.count / metrics.totalTenants) * 100) : 0;

                return (
                  <div key={code} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {code}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {pack?.countryName || code} ({pack?.currency || 'FCFA'})
                        </span>
                      </div>
                      <div>
                        <strong>{data.count}</strong>
                        <span className="text-slate-400 text-[11px] ml-2">{formatMoney(data.mrr, pack?.currency || 'XOF')}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#D4AF37]"
                        style={{ width: `${Math.max(8, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2 : CONFIGURATION DES 4 OFFRES SAAS (TARIFS & QUOTAS) */}
      {activeTab === 'offres' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Paramétrage Central des 4 Offres Mensuelles</h3>
              <p className="text-xs text-slate-500">
                Modifiez les prix, les limites d'utilisateurs et le stockage alloué. Les modifications sont appliquées instantanément aux nouveaux clients.
              </p>
            </div>

            <button
              onClick={handleResetPlans}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurer valeurs par défaut</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {plans.map(plan => {
              const isEditing = editingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-black text-slate-900 text-base">{plan.name}</span>
                      <span className="text-[10px] font-bold bg-[#0F5132]/10 text-[#0F5132] px-2 py-0.5 rounded">
                        {plan.id}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">{plan.tagline}</p>

                    {isEditing ? (
                      <div className="space-y-2.5 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Prix Mensuel (FCFA)</label>
                          <input
                            type="number"
                            value={editMonthlyPrice}
                            onChange={e => setEditMonthlyPrice(Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Prix Annuel (FCFA)</label>
                          <input
                            type="number"
                            value={editAnnualPrice}
                            onChange={e => setEditAnnualPrice(Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Utilisateurs Max</label>
                          <input
                            type="number"
                            value={editMaxUsers}
                            onChange={e => setEditMaxUsers(Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Stockage (Mo)</label>
                          <input
                            type="number"
                            value={editMaxStorageMB}
                            onChange={e => setEditMaxStorageMB(Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 text-slate-700">
                        <div className="flex justify-between">
                          <span>Prix Mensuel :</span>
                          <strong className="text-slate-900">{formatMoney(plan.monthlyPriceFCFA, 'XOF')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Prix Annuel :</span>
                          <strong className="text-slate-900">{formatMoney(plan.annualPriceFCFA, 'XOF')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Utilisateurs max :</span>
                          <strong className="text-slate-900">{plan.maxUsers} sièges</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Stockage alloué :</span>
                          <strong className="text-slate-900">{(plan.maxStorageMB / 1024).toFixed(0)} Go</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Modules inclus :</span>
                          <strong className="text-slate-900">{plan.allowedModules.length} modules</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSavePlan(plan.id)}
                          className="flex-1 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Enregistrer</span>
                        </button>
                        <button
                          onClick={() => setEditingPlanId(null)}
                          className="px-2 py-1.5 border border-slate-200 text-slate-600 rounded-lg cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditPlan(plan)}
                        className="w-full py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Modifier l'offre</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ONGLET 3 : HISTORIQUE DES COMMANDES & TRANSACTIONS SAAS */}
      {activeTab === 'commandes' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">N° Commande</th>
                  <th className="py-3 px-4 font-semibold">Entreprise</th>
                  <th className="py-3 px-4 font-semibold">Formule & Cycle</th>
                  <th className="py-3 px-4 font-semibold">Passerelle</th>
                  <th className="py-3 px-4 font-semibold">Réf. Transaction</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant TTC</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.orderId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.orderId}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{o.companyName}</div>
                      <div className="text-[10px] text-slate-400">{o.contactEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#0F5132]">{o.planId}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({o.billingCycle})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {o.paymentMethod}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {o.transactionReference}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatMoney(o.amountTTC, o.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        CONFIRMÉ
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => PdfService.downloadSubscriptionInvoicePdf(o)}
                        className="px-2.5 py-1 text-[#0F5132] hover:bg-[#0F5132]/10 rounded font-semibold text-[11px] cursor-pointer flex items-center gap-1 mx-auto transition-colors"
                        title="Télécharger la facture SaaS certifiée en PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Facture PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ONGLET 4 : ENTREPRISES CLIENTES & QUOTAS */}
      {activeTab === 'entreprises' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Entreprise</th>
                  <th className="py-3 px-4 font-semibold">Pays</th>
                  <th className="py-3 px-4 font-semibold">Formule Actuelle</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-center">Quotas Sièges</th>
                  <th className="py-3 px-4 font-semibold text-center">Stockage</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {t.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold">{COUNTRY_PACKS[t.countryCode]?.countryName}</span>
                      <span className="text-[10px] text-slate-400 block">{t.currency}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded text-[11px]">
                        {t.subscriptionPlan}
                      </span>
                      {t.monthlySubscriptionAmount && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatMoney(t.monthlySubscriptionAmount, t.currency)}/mois
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          t.subscriptionStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.subscriptionStatus === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.subscriptionStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {t.maxUsers || 10} sièges
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {((t.maxStorageMB || 5120) / 1024).toFixed(0)} Go
                    </td>
                    <td className="py-3 px-4 text-right">
                      {api.isEnabled() ? (
                        t.id === 'tenant-platform' ? (
                          <span className="text-[11px] text-slate-400">Espace plateforme</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <select
                              aria-label={`Formule de ${t.name}`}
                              value={['STARTER', 'ESSENTIEL', 'BUSINESS', 'PREMIUM'].includes(t.subscriptionPlan) ? t.subscriptionPlan : ''}
                              onChange={e => changeTenantPlan(t, e.target.value as SubscriptionPlanId)}
                              className="p-1 border border-slate-300 rounded text-[11px] bg-white"
                            >
                              <option value="" disabled>—</option>
                              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {t.subscriptionStatus === 'CANCELLED' ? (
                              <button
                                onClick={() => patchTenant(t, { subscriptionStatus: 'ACTIVE' })}
                                className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 rounded font-semibold text-[11px] cursor-pointer"
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`Suspendre l'accès de « ${t.name} » ?`)) patchTenant(t, { subscriptionStatus: 'CANCELLED' });
                                }}
                                className="px-2.5 py-1 text-red-700 hover:bg-red-50 rounded font-semibold text-[11px] cursor-pointer"
                              >
                                Suspendre
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => onSelectTenant(t.id)}
                          className="px-2.5 py-1 text-[#0F5132] hover:bg-[#0F5132]/10 rounded font-semibold text-[11px] cursor-pointer"
                        >
                          Accéder à l'espace →
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

      {/* ONGLET 5 : PROSPECTS & DEMANDES DE SUPPORT */}
      {activeTab === 'prospects' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Demandes de Contact Recueillies sur le Site Public</h3>
          {inquiryError && <div role="alert" className="text-xs text-red-600 font-semibold">{inquiryError}</div>}
          {inquiries.length === 0 && <p className="text-xs text-slate-500">Aucune demande pour le moment.</p>}

          <div className="space-y-3">
            {inquiries.map(inq => (
              <div
                key={inq.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{inq.name}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-600">{inq.company}</span>
                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">
                      {inq.country}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    inq.status === 'TRAITE' ? 'bg-emerald-100 text-emerald-800' : inq.status === 'EN_COURS' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inq.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-[11px] text-[#0F5132] font-semibold">
                  {inq.subject}
                </div>

                <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                  "{inq.message}"
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>Email : <strong>{inq.email}</strong></span>
                  <span>Téléphone : <strong>{inq.phone}</strong></span>
                  <span>Date : {new Date(inq.createdAt).toLocaleString('fr-FR')}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {inq.status !== 'EN_COURS' && inq.status !== 'TRAITE' && (
                    <button
                      onClick={() => changeInquiryStatus(inq.id, 'EN_COURS')}
                      className="px-2.5 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-800 font-semibold hover:bg-sky-100 cursor-pointer"
                    >
                      Prendre en charge
                    </button>
                  )}
                  {inq.status !== 'TRAITE' && (
                    <button
                      onClick={() => changeInquiryStatus(inq.id, 'TRAITE')}
                      className="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100 cursor-pointer"
                    >
                      Marquer comme traité
                    </button>
                  )}
                  <a
                    href={`mailto:${inq.email}?subject=${encodeURIComponent('Re: ' + inq.subject)}`}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Répondre par email
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ONGLET 6 : PACKS PAYS DÉPLOYÉS */}
      {activeTab === 'packs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {Object.values(COUNTRY_PACKS).map(pack => (
            <div key={pack.code} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-[#0F5132]" />
                  <h4 className="font-bold text-slate-900">{pack.countryName}</h4>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">{pack.code}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div>Devise locale : <strong>{pack.currency} ({pack.currencySymbol})</strong></div>
                <div>TVA normale : <strong>{pack.vatRateDefault}%</strong></div>
                <div>Identifiant fiscal : <strong>{pack.taxNumberLabel}</strong></div>
                <div>Sécurité sociale : <strong>{pack.socialSecurityName}</strong></div>
                <div>Impôt sur salaire : <strong>{pack.payrollTaxName}</strong></div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                Passerelles Mobile Money : {pack.mobileMoneyProviders.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
