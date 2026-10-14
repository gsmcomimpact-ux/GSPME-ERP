/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Gestionnaire de Persistance & Isolation Multi-Entreprises (Modules A à P)
 */

import {
  Tenant,
  User,
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
  CustomerInteraction,
  SalesOrder,
  DeliveryNote,
  SalesRep,
  PosSession,
  PosReceipt,
  Project,
  FixedAsset,
  StoredDocument,
  AiInsight,
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_WAREHOUSES,
  INITIAL_INVOICES,
  INITIAL_PURCHASES,
  INITIAL_TREASURY_ACCOUNTS,
  INITIAL_TREASURY_TRANSACTIONS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_EMPLOYEES,
  INITIAL_PAYSLIPS,
  INITIAL_AUDIT_LOGS,
  INITIAL_OPPORTUNITIES,
  INITIAL_INTERACTIONS,
  INITIAL_SALES_ORDERS,
  INITIAL_DELIVERY_NOTES,
  INITIAL_SALES_REPS,
  INITIAL_POS_SESSIONS,
  INITIAL_POS_RECEIPTS,
  INITIAL_PROJECTS,
  INITIAL_FIXED_ASSETS,
  INITIAL_DOCUMENTS,
  INITIAL_AI_INSIGHTS,
} from '../data/initialData';
import { api, type SyncSnapshot } from './api';

const STORAGE_KEYS = {
  TENANTS: 'gspme_tenants_v2',
  ACTIVE_TENANT_ID: 'gspme_active_tenant_id_v2',
  ACTIVE_USER_ID: 'gspme_active_user_id_v2',
  CUSTOMERS: 'gspme_customers_v2',
  SUPPLIERS: 'gspme_suppliers_v2',
  PRODUCTS: 'gspme_products_v2',
  WAREHOUSES: 'gspme_warehouses_v2',
  INVOICES: 'gspme_invoices_v2',
  PURCHASES: 'gspme_purchases_v2',
  TREASURY_ACCOUNTS: 'gspme_treasury_accounts_v2',
  TREASURY_TRANSACTIONS: 'gspme_treasury_tx_v2',
  JOURNAL_ENTRIES: 'gspme_journal_entries_v2',
  EMPLOYEES: 'gspme_employees_v2',
  PAYSLIPS: 'gspme_payslips_v2',
  AUDIT_LOGS: 'gspme_audit_logs_v2',
  USERS: 'gspme_users_v2',
  OPPORTUNITIES: 'gspme_opportunities_v2',
  INTERACTIONS: 'gspme_interactions_v2',
  SALES_ORDERS: 'gspme_sales_orders_v2',
  DELIVERY_NOTES: 'gspme_delivery_notes_v2',
  SALES_REPS: 'gspme_sales_reps_v2',
  POS_SESSIONS: 'gspme_pos_sessions_v2',
  POS_RECEIPTS: 'gspme_pos_receipts_v2',
  PROJECTS: 'gspme_projects_v2',
  FIXED_ASSETS: 'gspme_fixed_assets_v2',
  DOCUMENTS: 'gspme_documents_v2',
  AI_INSIGHTS: 'gspme_ai_insights_v2',
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (api.isEnabled()) {
      api.schedulePush(key.replace(/^gspme_/, '').replace(/_v2$/, ''), () => getFromStorage(key, null));
    }
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export class SaaSStorageService {
  private listeners: (() => void)[] = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // Multi-Tenant
  public getTenants(): Tenant[] {
    return getFromStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
  }

  public getActiveTenant(): Tenant {
    const tenants = this.getTenants();
    const activeId = getFromStorage(STORAGE_KEYS.ACTIVE_TENANT_ID, 'tenant-sn-1');
    return tenants.find(t => t.id === activeId) || tenants[0];
  }

  public setActiveTenantId(tenantId: string): void {
    saveToStorage(STORAGE_KEYS.ACTIVE_TENANT_ID, tenantId);
    this.logAudit('CONNEXION', 'SYSTEME', `Changement vers l'entreprise ${tenantId}`);
    this.notify();
  }

  public updateActiveTenant(updates: Partial<Tenant>): void {
    const active = this.getActiveTenant();
    const tenants = this.getTenants().map(t => (t.id === active.id ? { ...t, ...updates } : t));
    saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    this.logAudit('MODIFICATION', 'SYSTEME', `Mise à jour des paramètres de l'entreprise`);
    this.notify();
  }

  public createTenant(newTenant: Tenant): void {
    const tenants = [...this.getTenants(), newTenant];
    saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    this.setActiveTenantId(newTenant.id);
    this.logAudit('CREATION', 'SYSTEME', `Création nouvelle entreprise ${newTenant.name}`);
    this.notify();
  }

  public addTenant(newTenant: Tenant): void {
    this.createTenant(newTenant);
  }

  public updateTenantById(id: string, updates: Partial<Tenant>): Tenant | undefined {
    const tenants = this.getTenants().map(t => (t.id === id ? { ...t, ...updates } : t));
    saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    this.notify();
    return tenants.find(t => t.id === id);
  }

  // Users & Roles
  public getUsers(): User[] {
    return getFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getActiveUser(): User {
    const users = this.getUsers();
    const activeId = getFromStorage(STORAGE_KEYS.ACTIVE_USER_ID, 'user-1');
    return users.find(u => u.id === activeId) || users[0];
  }

  public setActiveUserId(userId: string): void {
    saveToStorage(STORAGE_KEYS.ACTIVE_USER_ID, userId);
    this.notify();
  }

  public addUser(user: User): void {
    const users = [...this.getUsers(), user];
    saveToStorage(STORAGE_KEYS.USERS, users);
    this.logAudit('CREATION', 'SYSTEME', `Ajout utilisateur ${user.name}`);
    this.notify();
  }

  public setActiveBranchId(branchId: string): void {
    this.updateActiveTenant({ currentBranchId: branchId });
  }

  // MODULE B — CRM: Opportunities & Interactions
  public getOpportunities(tenantId?: string): Opportunity[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.OPPORTUNITIES, INITIAL_OPPORTUNITIES);
    return all.filter(o => o.tenantId === targetId);
  }

  public addOpportunity(opp: Opportunity): void {
    const all = getFromStorage(STORAGE_KEYS.OPPORTUNITIES, INITIAL_OPPORTUNITIES);
    saveToStorage(STORAGE_KEYS.OPPORTUNITIES, [opp, ...all]);
    this.logAudit('CREATION', 'VENTES', `Nouvelle opportunité commerciale : ${opp.title}`);
    this.notify();
  }

  public updateOpportunityStage(id: string, stage: Opportunity['stage']): void {
    const all = getFromStorage(STORAGE_KEYS.OPPORTUNITIES, INITIAL_OPPORTUNITIES);
    const updated = all.map(o => (o.id === id ? { ...o, stage } : o));
    saveToStorage(STORAGE_KEYS.OPPORTUNITIES, updated);
    this.notify();
  }

  public getInteractions(customerId: string): CustomerInteraction[] {
    const all = getFromStorage(STORAGE_KEYS.INTERACTIONS, INITIAL_INTERACTIONS);
    return all.filter(i => i.customerId === customerId);
  }

  public addInteraction(interaction: CustomerInteraction): void {
    const all = getFromStorage(STORAGE_KEYS.INTERACTIONS, INITIAL_INTERACTIONS);
    saveToStorage(STORAGE_KEYS.INTERACTIONS, [interaction, ...all]);
    this.notify();
  }

  // MODULE C — Commercial Orders & Delivery Notes
  public getSalesOrders(tenantId?: string): SalesOrder[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.SALES_ORDERS, INITIAL_SALES_ORDERS);
    return all.filter(o => o.tenantId === targetId);
  }

  public addSalesOrder(order: SalesOrder): void {
    const all = getFromStorage(STORAGE_KEYS.SALES_ORDERS, INITIAL_SALES_ORDERS);
    saveToStorage(STORAGE_KEYS.SALES_ORDERS, [order, ...all]);
    this.logAudit('CREATION', 'VENTES', `Création commande client ${order.number}`);
    this.notify();
  }

  public getDeliveryNotes(tenantId?: string): DeliveryNote[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.DELIVERY_NOTES, INITIAL_DELIVERY_NOTES);
    return all.filter(d => d.tenantId === targetId);
  }

  public addDeliveryNote(note: DeliveryNote): void {
    const all = getFromStorage(STORAGE_KEYS.DELIVERY_NOTES, INITIAL_DELIVERY_NOTES);
    saveToStorage(STORAGE_KEYS.DELIVERY_NOTES, [note, ...all]);
    this.logAudit('CREATION', 'VENTES', `Émission bon de livraison ${note.number}`);
    this.notify();
  }

  public getSalesReps(tenantId?: string): SalesRep[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.SALES_REPS, INITIAL_SALES_REPS);
    return all.filter(r => r.tenantId === targetId);
  }

  // MODULE F — POS Caisse
  public getPosSessions(tenantId?: string): PosSession[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.POS_SESSIONS, INITIAL_POS_SESSIONS);
    return all.filter(s => s.tenantId === targetId);
  }

  public addPosSession(session: PosSession): void {
    const all = getFromStorage(STORAGE_KEYS.POS_SESSIONS, INITIAL_POS_SESSIONS);
    saveToStorage(STORAGE_KEYS.POS_SESSIONS, [session, ...all]);
    this.logAudit('CREATION', 'POS', `Ouverture session caisse par ${session.cashierName}`);
    this.notify();
  }

  public closePosSession(sessionId: string, actualClosing: number): void {
    const all = getFromStorage(STORAGE_KEYS.POS_SESSIONS, INITIAL_POS_SESSIONS);
    const updated = all.map(s => {
      if (s.id === sessionId) {
        const diff = actualClosing - (s.openingCashAmount + s.totalSales);
        return {
          ...s,
          closingTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          actualClosingCashAmount: actualClosing,
          cashDifference: diff,
          status: 'CLOTUREE' as const,
        };
      }
      return s;
    });
    saveToStorage(STORAGE_KEYS.POS_SESSIONS, updated);
    this.logAudit('CLOTURE', 'POS', `Clôture session de caisse ${sessionId}`);
    this.notify();
  }

  public getPosReceipts(sessionId: string): PosReceipt[] {
    const all = getFromStorage(STORAGE_KEYS.POS_RECEIPTS, INITIAL_POS_RECEIPTS);
    return all.filter(r => r.sessionId === sessionId);
  }

  public addPosReceipt(receipt: PosReceipt): void {
    const all = getFromStorage(STORAGE_KEYS.POS_RECEIPTS, INITIAL_POS_RECEIPTS);
    saveToStorage(STORAGE_KEYS.POS_RECEIPTS, [receipt, ...all]);

    // Update current session totals
    const sessions = getFromStorage(STORAGE_KEYS.POS_SESSIONS, INITIAL_POS_SESSIONS);
    const updatedSessions = sessions.map(s => {
      if (s.id === receipt.sessionId) {
        return {
          ...s,
          totalSales: s.totalSales + receipt.total,
          transactionsCount: s.transactionsCount + 1,
        };
      }
      return s;
    });
    saveToStorage(STORAGE_KEYS.POS_SESSIONS, updatedSessions);
    this.notify();
  }

  // MODULE K — Projects
  public getProjects(tenantId?: string): Project[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    return all.filter(p => p.tenantId === targetId);
  }

  public addProject(project: Project): void {
    const all = getFromStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    saveToStorage(STORAGE_KEYS.PROJECTS, [project, ...all]);
    this.logAudit('CREATION', 'PROJETS', `Création projet ${project.title}`);
    this.notify();
  }

  public updateProjectProgress(projectId: string, progress: number): void {
    const all = getFromStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    const updated = all.map(p => (p.id === projectId ? { ...p, progressPercent: progress } : p));
    saveToStorage(STORAGE_KEYS.PROJECTS, updated);
    this.notify();
  }

  // MODULE L — Fixed Assets
  public getFixedAssets(tenantId?: string): FixedAsset[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.FIXED_ASSETS, INITIAL_FIXED_ASSETS);
    return all.filter(a => a.tenantId === targetId);
  }

  public addFixedAsset(asset: FixedAsset): void {
    const all = getFromStorage(STORAGE_KEYS.FIXED_ASSETS, INITIAL_FIXED_ASSETS);
    saveToStorage(STORAGE_KEYS.FIXED_ASSETS, [asset, ...all]);
    this.logAudit('CREATION', 'IMMOBILISATIONS', `Immobilisation acquise : ${asset.name}`);
    this.notify();
  }

  // MODULE M — Documents & GED
  public getDocuments(tenantId?: string): StoredDocument[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    return all.filter(d => d.tenantId === targetId);
  }

  public addDocument(doc: StoredDocument): void {
    const all = getFromStorage(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    saveToStorage(STORAGE_KEYS.DOCUMENTS, [doc, ...all]);
    this.logAudit('CREATION', 'DOCUMENTS', `Archivage document : ${doc.title}`);
    this.notify();
  }

  // MODULE O — AI Insights
  public getAiInsights(): AiInsight[] {
    return getFromStorage(STORAGE_KEYS.AI_INSIGHTS, INITIAL_AI_INSIGHTS);
  }

  public addAiInsight(insight: AiInsight): void {
    const all = getFromStorage(STORAGE_KEYS.AI_INSIGHTS, INITIAL_AI_INSIGHTS);
    saveToStorage(STORAGE_KEYS.AI_INSIGHTS, [insight, ...all]);
    this.notify();
  }

  // Core entities
  public getCustomers(tenantId?: string): Customer[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    return all.filter(c => c.tenantId === targetId);
  }

  public addCustomer(customer: Customer): void {
    const all = getFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    saveToStorage(STORAGE_KEYS.CUSTOMERS, [customer, ...all]);
    this.logAudit('CREATION', 'VENTES', `Création client ${customer.name}`);
    this.notify();
  }

  public getSuppliers(tenantId?: string): Supplier[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    return all.filter(s => s.tenantId === targetId);
  }

  public addSupplier(supplier: Supplier): void {
    const all = getFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    saveToStorage(STORAGE_KEYS.SUPPLIERS, [supplier, ...all]);
    this.logAudit('CREATION', 'ACHATS', `Création fournisseur ${supplier.name}`);
    this.notify();
  }

  public getProducts(tenantId?: string): Product[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return all.filter(p => p.tenantId === targetId);
  }

  public addProduct(product: Product): void {
    const all = getFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    saveToStorage(STORAGE_KEYS.PRODUCTS, [product, ...all]);
    this.logAudit('CREATION', 'STOCKS', `Article catalogue ${product.name}`);
    this.notify();
  }

  public updateProductStock(productId: string, qtyDelta: number, warehouseId: string): void {
    const all = getFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const updated = all.map(p => {
      if (p.id === productId) {
        const currentWhQty = p.warehouseStock[warehouseId] || 0;
        const newWhQty = Math.max(0, currentWhQty + qtyDelta);
        return {
          ...p,
          currentStock: Math.max(0, p.currentStock + qtyDelta),
          warehouseStock: {
            ...p.warehouseStock,
            [warehouseId]: newWhQty,
          },
        };
      }
      return p;
    });
    saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
    this.notify();
  }

  public getWarehouses(tenantId?: string): Warehouse[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.WAREHOUSES, INITIAL_WAREHOUSES);
    return all.filter(w => w.tenantId === targetId);
  }

  public getInvoices(tenantId?: string): Invoice[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    return all.filter(inv => inv.tenantId === targetId);
  }

  public addInvoice(invoice: Invoice): void {
    const all = getFromStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    saveToStorage(STORAGE_KEYS.INVOICES, [invoice, ...all]);
    this.logAudit('CREATION', 'VENTES', `Facture/devis ${invoice.number}`);
    this.notify();
  }

  public updateInvoice(id: string, updates: Partial<Invoice>): void {
    const all = getFromStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    const updated = all.map(inv => (inv.id === id ? { ...inv, ...updates } : inv));
    saveToStorage(STORAGE_KEYS.INVOICES, updated);
    this.notify();
  }

  public getPurchases(tenantId?: string): PurchaseInvoice[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
    return all.filter(p => p.tenantId === targetId);
  }

  public addPurchase(pur: PurchaseInvoice): void {
    const all = getFromStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
    saveToStorage(STORAGE_KEYS.PURCHASES, [pur, ...all]);
    this.logAudit('CREATION', 'ACHATS', `Facture achat ${pur.number}`);
    this.notify();
  }

  public getTreasuryAccounts(tenantId?: string): TreasuryAccount[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.TREASURY_ACCOUNTS, INITIAL_TREASURY_ACCOUNTS);
    return all.filter(t => t.tenantId === targetId);
  }

  public addTreasuryAccount(acc: TreasuryAccount): void {
    const all = getFromStorage(STORAGE_KEYS.TREASURY_ACCOUNTS, INITIAL_TREASURY_ACCOUNTS);
    saveToStorage(STORAGE_KEYS.TREASURY_ACCOUNTS, [...all, acc]);
    this.logAudit('CREATION', 'TRESORERIE', `Compte ${acc.name}`);
    this.notify();
  }

  public getTreasuryTransactions(tenantId?: string): TreasuryTransaction[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.TREASURY_TRANSACTIONS, INITIAL_TREASURY_TRANSACTIONS);
    return all.filter(tx => tx.tenantId === targetId);
  }

  public addTreasuryTransaction(tx: TreasuryTransaction): void {
    const all = getFromStorage(STORAGE_KEYS.TREASURY_TRANSACTIONS, INITIAL_TREASURY_TRANSACTIONS);
    saveToStorage(STORAGE_KEYS.TREASURY_TRANSACTIONS, [tx, ...all]);

    const accounts = getFromStorage(STORAGE_KEYS.TREASURY_ACCOUNTS, INITIAL_TREASURY_ACCOUNTS);
    const updatedAccounts = accounts.map(a => {
      if (a.id === tx.accountId) {
        const delta = tx.type === 'ENCAISSEMENT' ? tx.amount : -tx.amount;
        return { ...a, balance: a.balance + delta };
      }
      return a;
    });
    saveToStorage(STORAGE_KEYS.TREASURY_ACCOUNTS, updatedAccounts);
    this.logAudit('CREATION', 'TRESORERIE', `Mouvement ${tx.type} ${tx.amount}`);
    this.notify();
  }

  public getJournalEntries(tenantId?: string): JournalEntry[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.JOURNAL_ENTRIES, INITIAL_JOURNAL_ENTRIES);
    return all.filter(e => e.tenantId === targetId);
  }

  public addJournalEntry(entry: JournalEntry): void {
    const all = getFromStorage(STORAGE_KEYS.JOURNAL_ENTRIES, INITIAL_JOURNAL_ENTRIES);
    saveToStorage(STORAGE_KEYS.JOURNAL_ENTRIES, [entry, ...all]);
    this.logAudit('VALIDATION', 'COMPTABILITE', `Écriture OHADA ${entry.journalCode} (${entry.pieceNumber})`);
    this.notify();
  }

  public getEmployees(tenantId?: string): Employee[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    return all.filter(emp => emp.tenantId === targetId);
  }

  public addEmployee(emp: Employee): void {
    const all = getFromStorage(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    saveToStorage(STORAGE_KEYS.EMPLOYEES, [emp, ...all]);
    this.logAudit('CREATION', 'PAIE', `Salarié ${emp.firstName} ${emp.lastName}`);
    this.notify();
  }

  public getPayslips(tenantId?: string): Payslip[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.PAYSLIPS, INITIAL_PAYSLIPS);
    return all.filter(p => p.tenantId === targetId);
  }

  public addPayslip(slip: Payslip): void {
    const all = getFromStorage(STORAGE_KEYS.PAYSLIPS, INITIAL_PAYSLIPS);
    saveToStorage(STORAGE_KEYS.PAYSLIPS, [slip, ...all]);
    this.logAudit('VALIDATION', 'PAIE', `Bulletin ${slip.employeeName} (${slip.period})`);
    this.notify();
  }

  public getAuditLogs(tenantId?: string): AuditLog[] {
    const targetId = tenantId || this.getActiveTenant().id;
    const all = getFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    return all.filter(l => l.tenantId === targetId);
  }

  public addAuditLog(log: AuditLog): void {
    const all = getFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, [log, ...all].slice(0, 300));
    this.notify();
  }

  public logAudit(action: AuditLog['action'], module: AuditLog['module'], details: string): void {
    const user = this.getActiveUser();
    const tenant = this.getActiveTenant();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      tenantId: tenant.id,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      module,
      details,
      ipAddress: '154.124.78.10',
    };
    const all = getFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...all].slice(0, 300));
  }

  /** Remplace le cache local par l'instantané du tenant renvoyé par le serveur (sans écho vers l'API). */
  public hydrateFromServer(snapshot: SyncSnapshot): void {
    this.clearLocal();
    const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
    put(STORAGE_KEYS.TENANTS, snapshot.tenants);
    put(STORAGE_KEYS.USERS, snapshot.users);
    put(STORAGE_KEYS.ACTIVE_TENANT_ID, snapshot.activeTenantId);
    put(STORAGE_KEYS.ACTIVE_USER_ID, snapshot.activeUserId);
    for (const [name, rows] of Object.entries(snapshot.collections)) {
      const key = `gspme_${name}_v2`;
      if (Object.values(STORAGE_KEYS).includes(key)) put(key, rows);
    }
    this.notify();
  }

  /** Vide le cache local (déconnexion). */
  public clearLocal(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }

  public async refreshFromServer(): Promise<void> {
    this.hydrateFromServer(await api.fetchSnapshot());
  }

  public resetData(): void {
    if (api.isEnabled()) {
      console.warn('Réinitialisation désactivée en mode connecté (données serveur).');
      return;
    }
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.notify();
  }
}

export const storage = new SaaSStorageService();
