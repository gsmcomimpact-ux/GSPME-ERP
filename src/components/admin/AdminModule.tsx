/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Administration, Multi-Sociétés, Rôles RBAC & Journal d'Audit
 */

import React, { useState } from 'react';
import {
  Building2,
  Users2,
  Shield,
  CreditCard,
  FileText,
  RotateCcw,
  Download,
  Plus,
  CheckCircle2,
  Globe2,
  Lock,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Tenant, User, AuditLog, Role, SubscriptionPlanId } from '../../types';
import { COUNTRY_PACKS, formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { api } from '../../services/api';
import { subscriptionService } from '../../services/subscriptionService';
import { PdfService } from '../../services/pdfService';

interface AdminModuleProps {
  tenant: Tenant;
  users: User[];
  auditLogs: AuditLog[];
  currentUser: User;
  onSelectTenant: (id: string) => void;
}

export function AdminModule({
  tenant,
  users,
  auditLogs,
  currentUser,
  onSelectTenant,
}: AdminModuleProps) {
  const [activeTab, setActiveTab] = useState<'societe' | 'utilisateurs' | 'abonnements' | 'audit'>('societe');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newBranchModalOpen, setNewBranchModalOpen] = useState(false);

  // Edit Company State
  const [name, setName] = useState(tenant.name);
  const [legalForm, setLegalForm] = useState(tenant.legalForm);
  const [taxNumber, setTaxNumber] = useState(tenant.taxNumber);
  const [tradeRegisterNumber, setTradeRegisterNumber] = useState(tenant.tradeRegisterNumber);
  const [address, setAddress] = useState(tenant.address);
  const [phone, setPhone] = useState(tenant.phone);
  const [email, setEmail] = useState(tenant.email);
  const [capitalSocial, setCapitalSocial] = useState(tenant.capitalSocial);
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || '');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast("Veuillez sélectionner un fichier d'image inférieur à 3 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Invite User State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('COMMERCIAL_VENTES');
  const [invitePassword, setInvitePassword] = useState('');

  // New Branch State
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  const countryPack = COUNTRY_PACKS[tenant.countryCode];

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateActiveTenant({
      name,
      legalForm,
      taxNumber,
      tradeRegisterNumber,
      address,
      phone,
      email,
      capitalSocial,
      logoUrl,
    });
    showToast('Informations de la société et logo mis à jour avec succès.');
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (api.isEnabled()) {
      // Mode serveur : le compte (avec mot de passe) est créé côté API, puis le cache est resynchronisé.
      try {
        await api.createUser({ name: inviteName, email: inviteEmail, password: invitePassword, role: inviteRole });
        await storage.refreshFromServer();
        setInviteModalOpen(false);
        setInviteName('');
        setInviteEmail('');
        setInvitePassword('');
      } catch (err) {
        alert((err as Error).message);
      }
      return;
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      tenantId: tenant.id,
      active: true,
      lastLogin: 'Jamais connecté (Invitation envoyée)',
    };
    storage.addUser(newUser);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    const newBranch = {
      id: `branch-${Date.now()}`,
      tenantId: tenant.id,
      name: branchName,
      city: branchCity,
      address: branchAddress,
      phone: branchPhone,
      isHeadquarters: false,
    };
    storage.updateActiveTenant({
      branches: [...tenant.branches, newBranch],
    });
    setNewBranchModalOpen(false);
    setBranchName('');
    setBranchCity('');
  };

  const handleExportData = () => {
    const data = {
      tenant,
      customers: storage.getCustomers(tenant.id),
      suppliers: storage.getSuppliers(tenant.id),
      products: storage.getProducts(tenant.id),
      invoices: storage.getInvoices(tenant.id),
      treasuryAccounts: storage.getTreasuryAccounts(tenant.id),
      journalEntries: storage.getJournalEntries(tenant.id),
      employees: storage.getEmployees(tenant.id),
      auditLogs: storage.getAuditLogs(tenant.id),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-gspme-${tenant.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    storage.logAudit('EXPORT', 'SYSTEME', 'Exportation complète des données de la société');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Paramètres & SaaS Multi-Entreprises</h2>
          <p className="text-xs text-slate-500">
            Gestion de l'espace entreprise, collaborateurs, rôles RBAC, abonnements et journal d'audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exporter les Données</span>
          </button>
        </div>
      </div>

      <SegmentedTabs
        tabs={[
          { id: 'societe', label: 'Société & Établissements' },
          { id: 'utilisateurs', label: 'Équipe & Rôles RBAC', count: users.length },
          { id: 'abonnements', label: 'Offre SaaS & Quotas' },
          { id: 'audit', label: "Journal d'Audit & Traçabilité", count: auditLogs.length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB: Société */}
      {activeTab === 'societe' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Coordonnées Officielles & Mentions Légales
            </h3>

            <form onSubmit={handleUpdateCompany} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Raison Sociale *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Forme Juridique</label>
                  <select
                    value={legalForm}
                    onChange={e => setLegalForm(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
                    <option value="SAS">SAS (Société par Actions Simplifiée)</option>
                    <option value="SA">SA (Société Anonyme)</option>
                    <option value="SUARL">SUARL</option>
                    <option value="GIE">GIE (Groupement d'Intérêt Économique)</option>
                    <option value="ENTREPRISE_INDIVIDUELLE">Entreprise Individuelle</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capital Social ({tenant.currency})</label>
                  <input
                    type="number"
                    value={capitalSocial}
                    onChange={e => setCapitalSocial(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {countryPack.taxNumberLabel} (Numéro Fiscal) *
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={e => setTaxNumber(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {countryPack.tradeRegisterLabel} (Registre du Commerce) *
                  </label>
                  <input
                    type="text"
                    value={tradeRegisterNumber}
                    onChange={e => setTradeRegisterNumber(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adresse Siège Social</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone Direction</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Officiel</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Logo de l'Entreprise */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800 text-xs">
                      Logo Officiel de l'Entreprise
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Ce logo sera imprimé sur vos factures, devis, reçus de point de vente et bulletins de paie.
                    </p>
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-red-600 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Retirer le logo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo de l'entreprise"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 stroke-1 text-slate-300" />
                        <span className="text-[9px] block">Aucun logo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs transition-colors">
                      <Upload className="w-4 h-4 text-[#0F5132]" />
                      <span>{logoUrl ? "Changer le logo" : "Téléverser une image de logo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Formats supportés : PNG, JPG, SVG, WebP (max 3 Mo).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg cursor-pointer"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>

          {/* Établissements & Succursales */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Établissements & Succursales</h3>
                <p className="text-slate-500 text-xs">Gestion multisites pour PME réparties</p>
              </div>
              <button
                onClick={() => setNewBranchModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un Établissement</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {tenant.branches.map(b => (
                <div key={b.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-slate-900">{b.name}</span>
                    {b.isHeadquarters && (
                      <span className="text-[10px] font-bold text-[#0F5132] bg-[#0F5132]/10 px-1.5 py-0.5 rounded">
                        Siège
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-2">{b.city} · {b.address}</div>
                  <div className="text-slate-600 mt-1 font-mono">{b.phone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Utilisateurs & RBAC */}
      {activeTab === 'utilisateurs' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Collaborateurs & Permissions RBAC</h3>
              <p className="text-slate-500">Contrôle d'accès strict par profil de poste</p>
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#0F5132] text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inviter un Collaborateur</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Nom</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Rôle & Périmètre</th>
                  <th className="py-3 px-4">Dernière Connexion</th>
                  <th className="py-3 px-4 text-center">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded text-[11px]">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{u.lastLogin}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-emerald-700 font-medium text-[11px]">Actif</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Abonnements & Monétisation de l'Entreprise */}
      {activeTab === 'abonnements' && (
        <div className="space-y-6 text-xs">
          {/* Bannière de l'Abonnement Actuel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-[#0F5132]/10 text-[#0F5132] px-2.5 py-0.5 rounded uppercase">
                  Abonnement Actif
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 font-medium">Cycle {tenant.billingCycle || 'MENSUEL'}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Formule {tenant.subscriptionPlan} — {formatMoney(tenant.monthlySubscriptionAmount ?? 5000, tenant.currency)} / mois
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Valide jusqu'au {tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString('fr-FR') : '31/12/2026'} · Renouvellement automatique par Mobile Money / Carte
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const dataToExport = {
                    tenant,
                    customers: storage.getCustomers(tenant.id),
                    invoices: storage.getInvoices(tenant.id),
                    purchases: storage.getPurchases(tenant.id),
                    products: storage.getProducts(tenant.id),
                    accounts: storage.getTreasuryAccounts(tenant.id),
                    exportDate: new Date().toISOString(),
                  };
                  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `gspme_export_${tenant.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Exporter l'intégralité des données de l'entreprise (Réversibilité contractuelle)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter toutes mes données</span>
              </button>
            </div>
          </div>

          {/* Grille des 4 Formules Configurables avec Bouton Changement d'Offre */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2">Changer ou Mettre à Niveau votre Offre</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {subscriptionService.getPlans().map(plan => {
                const isCurrent = tenant.subscriptionPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-xl border p-5 flex flex-col justify-between shadow-2xs ${
                      isCurrent ? 'border-[#0F5132] ring-2 ring-[#0F5132]/10 bg-emerald-50/10' : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h5 className="font-black text-slate-900 text-sm">{plan.name}</h5>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded">
                            Actuel
                          </span>
                        )}
                      </div>
                      <div className="text-base font-extrabold text-[#0F5132] mt-2">
                        {plan.monthlyPriceFCFA === 0 ? 'Gratuit (0 FR CFA)' : formatMoney(plan.monthlyPriceFCFA, 'XOF')}
                        {plan.monthlyPriceFCFA > 0 && <span className="text-[10px] text-slate-500 font-normal"> / mois</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{plan.tagline}</p>

                      <div className="mt-4 space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Jusqu'à <strong>{plan.maxUsers} utilisateurs</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Stockage <strong>{(plan.maxStorageMB / 1024).toFixed(0)} Go</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{plan.features[1] || 'Factures certifiées illimitées'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      {isCurrent ? (
                        <div className="text-center py-1.5 bg-emerald-50 text-[#0F5132] font-bold text-[11px] rounded-lg">
                          Votre Formule Actuelle
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            subscriptionService.changeSubscriptionPlan(tenant.id, plan.id);
                            showToast(`Votre formule a été mise à jour avec succès vers ${plan.name} !`);
                          }}
                          className="w-full py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg cursor-pointer transition-colors text-center"
                        >
                          Passer à {plan.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historique des Factures de Souscription du Client */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900">Historique des Factures d'Abonnement SaaS</h4>
                <p className="text-slate-500 text-[11px]">Reçus et pièces justificatives de règlement</p>
              </div>
              <span className="text-[11px] text-slate-500">Paiements certifiés</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">N° Facture SaaS</th>
                    <th className="py-2.5 px-4">Date de Paiement</th>
                    <th className="py-2.5 px-4">Formule & Période</th>
                    <th className="py-2.5 px-4">Moyen de Paiement</th>
                    <th className="py-2.5 px-4 text-right">Montant TTC</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptionService.getOrdersForTenant(tenant.id).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        Aucune facture d'abonnement archivée pour cette entreprise.
                      </td>
                    </tr>
                  ) : (
                    subscriptionService.getOrdersForTenant(tenant.id).map(order => (
                      <tr key={order.orderId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{order.orderId}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {new Date(order.paidAt || order.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-[#0F5132]">{order.planId}</span>
                          <span className="text-slate-400 text-[10px] ml-1">({order.billingCycle})</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{order.paymentMethod}</td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900">
                          {formatMoney(order.amountTTC, order.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => PdfService.downloadSubscriptionInvoicePdf(order, tenant)}
                            className="px-2.5 py-1 text-[#0F5132] hover:bg-[#0F5132]/10 rounded font-semibold text-[11px] cursor-pointer flex items-center gap-1 mx-auto transition-colors"
                            title="Télécharger la facture officielle en PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Facture PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#0F5132]" />
                <span>Journal d'Audit Immuable (Piste d'Audit OHADA)</span>
              </h3>
              <p className="text-slate-500 text-[11px]">
                Enregistrement inaltérable de chaque événement pour conformité légale et commissariat aux comptes
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              IP Serveur Sécurisé
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 w-40">Horodatage</th>
                  <th className="py-2.5 px-4">Utilisateur & Rôle</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">Détails de l'Opération</th>
                  <th className="py-2.5 px-4 w-32 font-mono text-slate-400">Adresse IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2 px-4 font-sans font-medium text-slate-900">
                      <div>{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{log.userRole}</div>
                    </td>
                    <td className="py-2 px-4">
                      <span className="font-bold text-slate-800">{log.action}</span>
                    </td>
                    <td className="py-2 px-4 text-slate-600 font-sans">{log.module}</td>
                    <td className="py-2 px-4 font-sans text-slate-800">{log.details}</td>
                    <td className="py-2 px-4 text-slate-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Inviter Collaborateur */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Inviter un Collaborateur dans l'Entreprise"
        subtitle="Attribution de rôle selon les besoins opérationnels"
      >
        <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nom complet *</label>
            <input
              type="text"
              placeholder="Ex: Cheikh Tidiane Sy"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adresse Email professionnelle *</label>
            <input
              type="email"
              placeholder="Ex: c.sy@entreprise.sn"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          {api.isEnabled() && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mot de passe initial * (8 caractères min.)</label>
              <input
                type="password"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rôle Attribué (Permissions RBAC) *</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="COMMERCIAL_VENTES">Commercial & Facturation (Devis, Factures)</option>
              <option value="RESPONSABLE_FINANCIER">DAF / Expert-Comptable (Comptabilité, Trésorerie)</option>
              <option value="LOGISTIQUE_STOCKS">Responsable Stocks & Logistique</option>
              <option value="GESTIONNAIRE_RH">Gestionnaire RH & Paie</option>
              <option value="DIRECTEUR_GENERAL">Directeur Général (Accès intégral)</option>
              <option value="AUDITEUR_EXTERNE">Auditeur Externe / Commissaire aux Comptes (Lecture seule)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Envoyer l'Invitation
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Nouvel Établissement */}
      <Modal
        isOpen={newBranchModalOpen}
        onClose={() => setNewBranchModalOpen(false)}
        title="Ajouter une Succursale ou Agence"
        subtitle="Périmètre géographique rattaché à l'entreprise"
      >
        <form onSubmit={handleAddBranch} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nom de la succursale *</label>
            <input
              type="text"
              placeholder="Ex: Agence Portuaire, Dépôt Touba"
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ville *</label>
              <input
                type="text"
                placeholder="Ex: Dakar, Thiès, San Pedro"
                value={branchCity}
                onChange={e => setBranchCity(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={branchPhone}
                onChange={e => setBranchPhone(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              placeholder="Ex: Zone Industrielle, Route Principale"
              value={branchAddress}
              onChange={e => setBranchAddress(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setNewBranchModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Créer la Succursale
            </button>
          </div>
        </form>
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-[#0F5132] text-white text-xs font-semibold rounded-xl shadow-xl border border-emerald-600 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
