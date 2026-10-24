/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Application Principale SaaS ERP pour PME Africaines (Modules Complets A à P)
 */

import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { api } from './services/api';
import { LoginModal } from './components/auth/LoginModal';
import { SubscriptionBanner } from './components/layout/SubscriptionBanner';
import { UpgradeNotice } from './components/layout/UpgradeNotice';
import { isModuleAllowed } from '../shared/plans';
import {
  Tenant,
  User,
  Role,
  Customer,
  Supplier,
  Product,
  Warehouse,
  Invoice,
  PurchaseInvoice,
  TreasuryAccount,
  TreasuryTransaction,
  JournalEntry,
  Employee,
  Payslip,
  AuditLog,
  Opportunity,
  SalesOrder,
  DeliveryNote,
  PosSession,
  Project,
  FixedAsset,
  StoredDocument,
  AiInsight,
} from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { CrmModule } from './components/crm/CrmModule';
import { SalesModule } from './components/sales/SalesModule';
import { PurchasesModule } from './components/purchases/PurchasesModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { ContactsModule } from './components/contacts/ContactsModule';
import { PosModule } from './components/pos/PosModule';
import { TreasuryModule } from './components/treasury/TreasuryModule';
import { AccountingModule } from './components/accounting/AccountingModule';
import { PayrollModule } from './components/payroll/PayrollModule';
import { ProjectsModule } from './components/projects/ProjectsModule';
import { FixedAssetsModule } from './components/assets/FixedAssetsModule';
import { DocumentsModule } from './components/documents/DocumentsModule';
import { BiReportsModule } from './components/bi/BiReportsModule';
import { AiAssistantModule } from './components/ai/AiAssistantModule';
import { TaxModule } from './components/tax/TaxModule';
import { QualityTestsModule } from './components/testing/QualityTestsModule';
import { AdminModule } from './components/admin/AdminModule';
import { SaasAdminModule } from './components/saas/SaasAdminModule';
import { LandingPage } from './components/public/LandingPage';
import { OnboardingCheckoutModal } from './components/public/OnboardingCheckoutModal';
import { SubscriptionPlanId, BillingCycle } from './types';
import { NewTenantModal } from './components/common/NewTenantModal';
import { QuickCreateModal } from './components/common/QuickCreateModal';
import { Loader2, RotateCcw, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';

const MODULE_LABELS: Record<string, string> = {
  crm: 'Clients & CRM', sales: 'Ventes & Facturation', pos: 'Caisse & Point de Vente', purchases: 'Achats & Fournisseurs',
  inventory: 'Stocks & Entrepôts', accounting: 'Comptabilité SYSCOHADA', treasury: 'Trésorerie & Caisses', tax: 'Fiscalité & Taxes',
  payroll: 'Paie & Ressources Humaines', assets: 'Immobilisations', projects: 'Gestion de Projets', documents: 'Documents & GED',
  bi: 'Rapports & Analytics', ai: 'Assistant IA GSPME',
};

export default function App() {
  // Navigation & UI State (La page d'accueil par défaut est le Site Public & Tarifs)
  const [viewMode, setViewMode] = useState<'ERP' | 'PUBLIC_SITE'>('PUBLIC_SITE');
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Session serveur (connexion email / mot de passe) — sinon mode démo local
  const [serverMode, setServerMode] = useState(api.isEnabled());
  const [serverAvailable, setServerAvailable] = useState(true);
  const [serverIssue, setServerIssue] = useState('');
  const [booting, setBooting] = useState(api.isEnabled());
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [loginNotice, setLoginNotice] = useState('');
  const [adminTab, setAdminTab] = useState<'societe' | 'utilisateurs' | 'abonnements' | 'audit'>('societe');
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlanId | undefined>();

  // Modals
  const [newTenantModalOpen, setNewTenantModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<SubscriptionPlanId>('ESSENTIEL');
  const [checkoutCycle, setCheckoutCycle] = useState<BillingCycle>('MENSUEL');
  const [quickCreateType, setQuickCreateType] = useState<
    'INVOICE' | 'CUSTOMER' | 'TRANSACTION' | 'PRODUCT' | null
  >(null);

  // Reactive Data State
  const [tenant, setTenant] = useState<Tenant>(storage.getActiveTenant());
  const [tenants, setTenants] = useState<Tenant[]>(storage.getTenants());
  const [currentUser, setCurrentUser] = useState<User>(storage.getActiveUser());
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [warehouses, setWarehouses] = useState<Warehouse[]>(storage.getWarehouses());
  const [invoices, setInvoices] = useState<Invoice[]>(storage.getInvoices());
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(storage.getPurchases());
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(
    storage.getTreasuryAccounts()
  );
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(
    storage.getTreasuryTransactions()
  );
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(
    storage.getJournalEntries()
  );
  const [employees, setEmployees] = useState<Employee[]>(storage.getEmployees());
  const [payslips, setPayslips] = useState<Payslip[]>(storage.getPayslips());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(storage.getAuditLogs());
  const [opportunities, setOpportunities] = useState<Opportunity[]>(storage.getOpportunities());
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(storage.getSalesOrders());
  const [posSessions, setPosSessions] = useState<PosSession[]>(storage.getPosSessions());
  const [projects, setProjects] = useState<Project[]>(storage.getProjects());
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(storage.getFixedAssets());
  const [documents, setDocuments] = useState<StoredDocument[]>(storage.getDocuments());
  const [aiInsights, setAiInsights] = useState<AiInsight[]>(storage.getAiInsights());

  const reloadData = () => {
    const currentTenant = storage.getActiveTenant();
    setTenant(currentTenant);
    setTenants(storage.getTenants());
    setCurrentUser(storage.getActiveUser());
    setUsers(storage.getUsers());
    setCustomers(storage.getCustomers(currentTenant.id));
    setSuppliers(storage.getSuppliers(currentTenant.id));
    setProducts(storage.getProducts(currentTenant.id));
    setWarehouses(storage.getWarehouses(currentTenant.id));
    setInvoices(storage.getInvoices(currentTenant.id));
    setPurchases(storage.getPurchases(currentTenant.id));
    setTreasuryAccounts(storage.getTreasuryAccounts(currentTenant.id));
    setTreasuryTransactions(storage.getTreasuryTransactions(currentTenant.id));
    setJournalEntries(storage.getJournalEntries(currentTenant.id));
    setEmployees(storage.getEmployees(currentTenant.id));
    setPayslips(storage.getPayslips(currentTenant.id));
    setAuditLogs(storage.getAuditLogs(currentTenant.id));
    setOpportunities(storage.getOpportunities(currentTenant.id));
    setSalesOrders(storage.getSalesOrders(currentTenant.id));
    setPosSessions(storage.getPosSessions(currentTenant.id));
    setProjects(storage.getProjects(currentTenant.id));
    setFixedAssets(storage.getFixedAssets(currentTenant.id));
    setDocuments(storage.getDocuments(currentTenant.id));
    setAiInsights(storage.getAiInsights());
  };

  useEffect(() => {
    const unsubscribe = storage.subscribe(reloadData);
    return () => unsubscribe();
  }, []);

  // Démarrage : détecte le serveur et rouvre une session existante
  useEffect(() => {
    api.setUnauthorizedHandler(() => closeSession('Votre session a expiré, veuillez vous reconnecter.'));
    (async () => {
      const status = await api.serverStatus();
      const available = status.reachable && status.db;
      setServerAvailable(available);
      setServerIssue(status.reachable && !status.db ? `base de données non connectée (${status.dbError || 'erreur'})` : '');
      if (available && api.isEnabled()) {
        try {
          const snapshot = await api.fetchSnapshot();
          storage.hydrateFromServer(snapshot);
          const me = snapshot.users.find(u => u.id === snapshot.activeUserId);
          setServerMode(true);
          if (me?.role === 'SUPER_ADMIN_SAAS') setActiveModule('saas');
          else if (new URLSearchParams(window.location.search).get('paiement') === 'retour') {
            // Retour depuis la page de paiement Chariow : on ouvre l'onglet Abonnement
            setAdminTab('abonnements');
            setActiveModule('admin');
          }
          setViewMode('ERP');
        } catch (err) {
          const message = (err as Error).message;
          closeSession(/suspendu/i.test(message) ? message : '');
        }
      } else if (!available && api.isEnabled()) {
        // Serveur injoignable : on garde la session mais on reste sur la page d'accueil
        setServerMode(false);
      }
      setBooting(false);
    })();
  }, []);

  /** Ferme la session serveur, vide le cache local et retourne à la page d'accueil. */
  function closeSession(notice = '') {
    api.logout();
    storage.logoutReset();
    setServerMode(false);
    setActiveModule('dashboard');
    setViewMode('PUBLIC_SITE');
    if (notice) {
      setLoginNotice(notice);
      setLoginMode('login');
      setLoginOpen(true);
    }
  }

  const openLogin = (mode: 'login' | 'register' = 'login') => {
    setPendingPlan(undefined);
    setLoginNotice('');
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handleAuthenticated = (role: string) => {
    setServerMode(true);
    setLoginOpen(false);
    setGlobalSearch('');
    setActiveModule(role === 'SUPER_ADMIN_SAAS' ? 'saas' : 'dashboard');
    setViewMode('ERP');
  };

  const handleSelectTenant = (id: string) => {
    if (serverMode) {
      alert("En mode connecté, chaque entreprise accède uniquement à son propre espace.");
      return;
    }
    storage.setActiveTenantId(id);
    reloadData();
  };

  const handleSelectBranch = (branchId: string) => {
    storage.setActiveBranchId(branchId);
    reloadData();
  };

  const handleSelectUserRole = (role: Role) => {
    if (serverMode) return; // en mode connecté, le rôle est imposé par le serveur
    const updated = { ...currentUser, role };
    setCurrentUser(updated);
  };

  const handleResetData = () => {
    if (confirm('Voulez-vous réinitialiser toutes les données de test à leur état initial ?')) {
      storage.resetData();
      reloadData();
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
      </div>
    );
  }

  // VUE 1 : SITE PUBLIC COMMERCIAL & MONÉTISATION (MODULE Q)
  if (viewMode === 'PUBLIC_SITE') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937]">
        <LandingPage
          onSelectPlanToSubscribe={(planId, cycle) => {
            if (serverAvailable && !serverMode) {
              // Avec le serveur : création d'un vrai compte (essai 14 jours), formule activée ensuite
              setPendingPlan(planId);
              setLoginNotice(`Formule « ${planId} » choisie : créez votre compte pour démarrer votre essai.`);
              setLoginMode('register');
              setLoginOpen(true);
              return;
            }
            setCheckoutPlanId(planId);
            setCheckoutCycle(cycle);
            setCheckoutModalOpen(true);
          }}
          onEnterDemoApp={() => {
            if (serverMode) closeSession();
            setViewMode('ERP');
          }}
          onOpenLogin={() => openLogin('login')}
          session={serverMode ? { name: currentUser.name, role: currentUser.role } : null}
          onEnterApp={() => setViewMode('ERP')}
          onLogout={() => closeSession()}
        />

        <LoginModal
          key={`${loginMode}-${loginOpen}`}
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onAuthenticated={handleAuthenticated}
          serverAvailable={serverAvailable}
          serverIssue={serverIssue}
          initialMode={loginMode}
          notice={loginNotice}
          requestedPlan={pendingPlan}
        />

        <OnboardingCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          initialPlanId={checkoutPlanId}
          initialCycle={checkoutCycle}
          onSuccessProvisioned={(newT) => {
            handleSelectTenant(newT.id);
            setViewMode('ERP');
            setActiveModule('dashboard');
          }}
        />
      </div>
    );
  }

  // Les modules hors formule sont remplacés par un écran de mise à niveau
  const moduleAllowed = isModuleAllowed(tenant.activeModules, activeModule);

  // VUE 2 : APPLICATION ERP GSPME COMPLÈTE
  return (
    <div className="flex h-screen bg-[#FAF9F6] text-[#1F2937] overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={mod => {
          setActiveModule(mod);
          setGlobalSearch('');
        }}
        tenant={tenant}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenPublicSite={() => setViewMode('PUBLIC_SITE')}
        userRole={currentUser.role}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          tenant={tenant}
          tenants={tenants}
          onSelectTenant={handleSelectTenant}
          onSelectBranch={handleSelectBranch}
          currentUser={currentUser}
          onSelectUserRole={handleSelectUserRole}
          onOpenQuickCreate={type => setQuickCreateType(type)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onOpenNewTenantModal={() => setNewTenantModalOpen(true)}
          onOpenPublicSite={() => setViewMode('PUBLIC_SITE')}
          onNavigate={setActiveModule}
          serverMode={serverMode}
          onLogout={() => closeSession()}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Subheader Status Strip */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 bg-white py-2 px-3.5 rounded-lg border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800">
                {serverMode ? 'GSPME SaaS ERP Connecté' : 'GSPME ERP — Mode démonstration'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Espace : <strong>{tenant.name}</strong> ({tenant.countryCode})
              </span>
              <span aria-hidden="true">·</span>
              <span>Établissement : {tenant.branches.find(b => b.id === tenant.currentBranchId)?.name || 'Siège'}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('PUBLIC_SITE')}
                title="Consulter le site public, les tarifs et la FAQ"
                className="text-[11px] font-bold text-[#0F5132] hover:text-[#0c4028] bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200/80 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>← Site Public & Tarifs</span>
              </button>
              <span className="text-[11px] text-[#0F5132] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Norme SYSCOHADA Révisé</span>
              </span>
              {!serverMode && (
              <button
                onClick={handleResetData}
                title="Restaurer les données démo par défaut"
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser démo</span>
              </button>
              )}
            </div>
          </div>

          {serverMode && currentUser.role === 'DIRECTEUR_GENERAL' && (
            <SubscriptionBanner
              tenant={tenant}
              onManage={() => {
                setAdminTab('abonnements');
                setActiveModule('admin');
              }}
            />
          )}

          {!moduleAllowed && (
            <UpgradeNotice
              moduleId={activeModule}
              moduleLabel={MODULE_LABELS[activeModule] || activeModule}
              canUpgrade={currentUser.role === 'DIRECTEUR_GENERAL' || !serverMode}
              onUpgrade={() => {
                setAdminTab('abonnements');
                setActiveModule('admin');
              }}
              onBack={() => setActiveModule('dashboard')}
            />
          )}

          {/* Module Switcher (Modules A à P) */}
          {moduleAllowed && activeModule === 'dashboard' && (
            <ExecutiveDashboard
              tenant={tenant}
              invoices={invoices}
              purchases={purchases}
              products={products}
              treasuryAccounts={treasuryAccounts}
              customers={customers}
              salesOrders={salesOrders}
              onNavigate={mod => setActiveModule(mod)}
              onOpenQuickCreate={type => setQuickCreateType(type)}
            />
          )}

          {moduleAllowed && activeModule === 'crm' && (
            <CrmModule
              tenant={tenant}
              customers={customers}
              opportunities={opportunities}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'contacts' && (
            <ContactsModule
              tenant={tenant}
              customers={customers}
              suppliers={suppliers}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'sales' && (
            <SalesModule
              tenant={tenant}
              invoices={invoices}
              customers={customers}
              products={products}
              treasuryAccounts={treasuryAccounts}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'purchases' && (
            <PurchasesModule
              tenant={tenant}
              purchases={purchases}
              suppliers={suppliers}
              treasuryAccounts={treasuryAccounts}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'inventory' && (
            <InventoryModule
              tenant={tenant}
              products={products}
              warehouses={warehouses}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'pos' && (
            <PosModule
              tenant={tenant}
              products={products}
              posSessions={posSessions}
              userRole={currentUser.role}
            />
          )}

          {moduleAllowed && activeModule === 'treasury' && (
            <TreasuryModule
              tenant={tenant}
              treasuryAccounts={treasuryAccounts}
              treasuryTransactions={treasuryTransactions}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'accounting' && (
            <AccountingModule
              tenant={tenant}
              journalEntries={journalEntries}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'payroll' && (
            <PayrollModule
              tenant={tenant}
              employees={employees}
              payslips={payslips}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'projects' && (
            <ProjectsModule
              tenant={tenant}
              projects={projects}
              customers={customers}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'assets' && (
            <FixedAssetsModule
              tenant={tenant}
              fixedAssets={fixedAssets}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'documents' && (
            <DocumentsModule
              tenant={tenant}
              documents={documents}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {moduleAllowed && activeModule === 'bi' && (
            <BiReportsModule
              tenant={tenant}
              invoices={invoices}
              products={products}
              treasuryAccounts={treasuryAccounts}
              customers={customers}
              userRole={currentUser.role}
            />
          )}

          {moduleAllowed && activeModule === 'ai' && (
            <AiAssistantModule
              tenant={tenant}
              invoices={invoices}
              products={products}
              treasuryAccounts={treasuryAccounts}
              customers={customers}
              aiInsights={aiInsights}
              userRole={currentUser.role}
            />
          )}

          {moduleAllowed && activeModule === 'tax' && (
            <TaxModule
              tenant={tenant}
              invoices={invoices}
              purchases={purchases}
              userRole={currentUser.role}
            />
          )}

          {moduleAllowed && activeModule === 'admin' && (
            <AdminModule
              key={adminTab}
              initialTab={adminTab}
              tenant={tenant}
              users={users}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onSelectTenant={handleSelectTenant}
            />
          )}

          {moduleAllowed && activeModule === 'tests' && (
            <QualityTestsModule tenant={tenant} />
          )}

          {moduleAllowed && activeModule === 'saas' && currentUser.role !== 'SUPER_ADMIN_SAAS' && (
            <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">Accès réservé</h2>
              <p className="text-xs text-slate-500">Cet espace est réservé aux administrateurs de la plateforme GSPME.</p>
              <button
                onClick={() => setActiveModule('dashboard')}
                className="px-3 py-2 bg-[#0F5132] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Retour au tableau de bord
              </button>
            </div>
          )}

          {moduleAllowed && activeModule === 'saas' && currentUser.role === 'SUPER_ADMIN_SAAS' && (
            <SaasAdminModule
              tenants={tenants}
              onSelectTenant={handleSelectTenant}
              onOpenPublicSite={() => setViewMode('PUBLIC_SITE')}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewTenantModal
        isOpen={newTenantModalOpen}
        onClose={() => setNewTenantModalOpen(false)}
        onTenantCreated={newT => {
          handleSelectTenant(newT.id);
        }}
      />

      <QuickCreateModal
        isOpen={!!quickCreateType}
        type={quickCreateType}
        onClose={() => setQuickCreateType(null)}
        tenant={tenant}
        treasuryAccounts={treasuryAccounts}
        onNavigateToInvoiceCreate={() => {
          setActiveModule('sales');
        }}
      />

      <OnboardingCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        initialPlanId={checkoutPlanId}
        initialCycle={checkoutCycle}
        onSuccessProvisioned={(newT) => {
          handleSelectTenant(newT.id);
          setActiveModule('dashboard');
        }}
      />
    </div>
  );
}
