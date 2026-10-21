/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Application Principale SaaS ERP pour PME Africaines (Modules Complets A à P)
 */

import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
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
import { RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

export default function App() {
  // Navigation & UI State (La page d'accueil par défaut est le Site Public & Tarifs)
  const [viewMode, setViewMode] = useState<'ERP' | 'PUBLIC_SITE'>('PUBLIC_SITE');
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

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

  const handleSelectTenant = (id: string) => {
    storage.setActiveTenantId(id);
    reloadData();
  };

  const handleSelectBranch = (branchId: string) => {
    storage.setActiveBranchId(branchId);
    reloadData();
  };

  const handleSelectUserRole = (role: Role) => {
    const updated = { ...currentUser, role };
    setCurrentUser(updated);
  };

  const handleResetData = () => {
    if (confirm('Voulez-vous réinitialiser toutes les données de test à leur état initial ?')) {
      storage.resetData();
      reloadData();
    }
  };

  // VUE 1 : SITE PUBLIC COMMERCIAL & MONÉTISATION (MODULE Q)
  if (viewMode === 'PUBLIC_SITE') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937]">
        <LandingPage
          onSelectPlanToSubscribe={(planId, cycle) => {
            setCheckoutPlanId(planId);
            setCheckoutCycle(cycle);
            setCheckoutModalOpen(true);
          }}
          onEnterDemoApp={() => setViewMode('ERP')}
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
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Subheader Status Strip */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 bg-white py-2 px-3.5 rounded-lg border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800">GSPME SaaS ERP Connecté</span>
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
              <button
                onClick={handleResetData}
                title="Restaurer les données démo par défaut"
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser démo</span>
              </button>
            </div>
          </div>

          {/* Module Switcher (Modules A à P) */}
          {activeModule === 'dashboard' && (
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

          {activeModule === 'crm' && (
            <CrmModule
              tenant={tenant}
              customers={customers}
              opportunities={opportunities}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'contacts' && (
            <ContactsModule
              tenant={tenant}
              customers={customers}
              suppliers={suppliers}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'sales' && (
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

          {activeModule === 'purchases' && (
            <PurchasesModule
              tenant={tenant}
              purchases={purchases}
              suppliers={suppliers}
              treasuryAccounts={treasuryAccounts}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'inventory' && (
            <InventoryModule
              tenant={tenant}
              products={products}
              warehouses={warehouses}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'pos' && (
            <PosModule
              tenant={tenant}
              products={products}
              posSessions={posSessions}
              userRole={currentUser.role}
            />
          )}

          {activeModule === 'treasury' && (
            <TreasuryModule
              tenant={tenant}
              treasuryAccounts={treasuryAccounts}
              treasuryTransactions={treasuryTransactions}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'accounting' && (
            <AccountingModule
              tenant={tenant}
              journalEntries={journalEntries}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'payroll' && (
            <PayrollModule
              tenant={tenant}
              employees={employees}
              payslips={payslips}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'projects' && (
            <ProjectsModule
              tenant={tenant}
              projects={projects}
              customers={customers}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'assets' && (
            <FixedAssetsModule
              tenant={tenant}
              fixedAssets={fixedAssets}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'documents' && (
            <DocumentsModule
              tenant={tenant}
              documents={documents}
              userRole={currentUser.role}
              searchFilter={globalSearch}
            />
          )}

          {activeModule === 'bi' && (
            <BiReportsModule
              tenant={tenant}
              invoices={invoices}
              products={products}
              treasuryAccounts={treasuryAccounts}
              customers={customers}
              userRole={currentUser.role}
            />
          )}

          {activeModule === 'ai' && (
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

          {activeModule === 'tax' && (
            <TaxModule
              tenant={tenant}
              invoices={invoices}
              purchases={purchases}
              userRole={currentUser.role}
            />
          )}

          {activeModule === 'admin' && (
            <AdminModule
              tenant={tenant}
              users={users}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onSelectTenant={handleSelectTenant}
            />
          )}

          {activeModule === 'tests' && (
            <QualityTestsModule tenant={tenant} />
          )}

          {activeModule === 'saas' && (
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
