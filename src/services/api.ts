/**
 * GSPME - Client de l'API SaaS (authentification JWT + synchronisation multi-tenant)
 * Sans serveur joignable, l'application reste en mode démo (localStorage uniquement).
 */
import type { SupportInquiry, User } from '../types';

const TOKEN_KEY = 'gspme_auth_token';
const SYNCED_KEYS = new Set([
  'tenants', 'users', 'customers', 'suppliers', 'products', 'warehouses', 'invoices', 'purchases',
  'treasury_accounts', 'treasury_tx', 'journal_entries', 'employees', 'payslips', 'audit_logs',
  'opportunities', 'interactions', 'sales_orders', 'delivery_notes', 'sales_reps', 'pos_sessions',
  'pos_receipts', 'projects', 'fixed_assets', 'documents',
]);

export interface Payment {
  id: string;
  tenantId: string;
  plan: string;
  cycle: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'ABANDONED' | 'REVIEW';
  note: string;
  createdAt: string;
  paidAt: string | null;
}

export interface UploadedFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  securityLevel: string;
}

export interface SyncSnapshot {
  activeTenantId: string;
  activeUserId: string;
  tenants: unknown[];
  users: User[];
  collections: Record<string, unknown[]>;
}

export interface RegisterInput {
  companyName: string;
  name: string;
  email: string;
  password: string;
  countryCode?: string;
  legalForm?: string;
  city?: string;
  phone?: string;
  requestedPlan?: string;
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

class ApiClient {
  private token: string | null = readToken();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private onUnauthorized: (() => void) | null = null;

  /** Vrai quand une session serveur est active : les écritures sont alors répercutées. */
  public isEnabled(): boolean {
    return !!this.token;
  }

  public setUnauthorizedHandler(fn: () => void) {
    this.onUnauthorized = fn;
  }

  private setToken(token: string | null) {
    this.token = token;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* stockage indisponible */
    }
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && this.token && !url.startsWith('/auth/')) {
        this.logout();
        this.onUnauthorized?.();
      }
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    return data as T;
  }

  /** Le paiement en ligne (Chariow) est-il configuré sur le serveur ? */
  public async isBillingEnabled(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      return !!(await res.json())?.billing;
    } catch {
      return false;
    }
  }

  /** Démarre un paiement d'abonnement : renvoie l'URL de la page de paiement Chariow. */
  public startCheckout(input: { plan: string; cycle: string; phone?: string }) {
    return this.request<{ checkoutUrl: string; paymentId: string }>('POST', '/billing/checkout', input);
  }

  public async listPayments(): Promise<Payment[]> {
    return (await this.request<{ payments: Payment[] }>('GET', '/billing/payments')).payments;
  }

  public async adminPayments(): Promise<(Payment & { tenantName: string; email: string })[]> {
    return (await this.request<{ payments: (Payment & { tenantName: string; email: string })[] }>('GET', '/admin/payments')).payments;
  }

  /** État du serveur : joignable ? base de données connectée ? (sinon : mode démo local) */
  public async serverStatus(): Promise<{ reachable: boolean; db: boolean; dbError?: string; dbHint?: string }> {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data?.service !== 'gspme-saas') return { reachable: false, db: false };
      return { reachable: true, db: data.db !== false, dbError: data.dbError, dbHint: data.dbHint };
    } catch {
      return { reachable: false, db: false };
    }
  }

  /** Le serveur SaaS répond-il et sa base est-elle prête ? */
  public async isServerAvailable(): Promise<boolean> {
    const s = await this.serverStatus();
    return s.reachable && s.db;
  }

  public async login(email: string, password: string): Promise<void> {
    const { token } = await this.request<{ token: string }>('POST', '/auth/login', { email, password });
    this.setToken(token);
  }

  public async register(input: RegisterInput): Promise<void> {
    const { token } = await this.request<{ token: string }>('POST', '/auth/register', input);
    this.setToken(token);
  }

  public logout() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.setToken(null);
  }

  public fetchSnapshot(): Promise<SyncSnapshot> {
    return this.request<SyncSnapshot>('GET', '/sync');
  }

  public createUser(input: { name: string; email: string; password: string; role: string }) {
    return this.request<{ user: User }>('POST', '/users', input);
  }

  /** Gestion d'une entreprise cliente par le super-admin (formule, statut, limites). */
  public patchTenant(id: string, changes: Record<string, unknown>) {
    return this.request<{ tenant: unknown }>('PATCH', `/admin/tenants/${encodeURIComponent(id)}`, changes);
  }

  /** Formulaire de contact public (aucune session requise). */
  public submitContact(input: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('POST', '/contact', input);
  }

  /** Boîte de réception des demandes (super-admin). */
  public async listInquiries(): Promise<SupportInquiry[]> {
    return (await this.request<{ inquiries: SupportInquiry[] }>('GET', '/admin/inquiries')).inquiries;
  }

  public setInquiryStatus(id: string, status: SupportInquiry['status']) {
    return this.request<{ ok: boolean }>('PATCH', `/admin/inquiries/${encodeURIComponent(id)}`, { status });
  }

  // ---- Archivage de fichiers (GED)
  private async fileRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`/api${path}`, { ...init, headers: { ...(init.headers || {}), ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) } });
    if (!res.ok) {
      if (res.status === 401 && this.token) { this.logout(); this.onUnauthorized?.(); }
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
    }
    return res;
  }

  public async uploadFile(file: File, securityLevel: string): Promise<UploadedFile> {
    const res = await this.fileRequest('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'x-file-name': encodeURIComponent(file.name), 'x-security-level': securityLevel },
      body: file,
    });
    return res.json();
  }

  public async downloadFile(id: string, inline = false): Promise<Blob> {
    return (await this.fileRequest(`/files/${encodeURIComponent(id)}${inline ? '?inline=1' : ''}`)).blob();
  }

  public async deleteFile(id: string): Promise<void> {
    await this.fileRequest(`/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  public async filesUsage(): Promise<{ usedBytes: number; quotaBytes: number; count: number; maxFileBytes: number }> {
    return (await this.fileRequest('/files-usage')).json();
  }

  /** Répercute une collection locale vers le serveur (regroupe les écritures rapprochées). */
  public schedulePush(collection: string, read: () => unknown) {
    if (!this.token || !SYNCED_KEYS.has(collection)) return;
    clearTimeout(this.timers.get(collection));
    this.timers.set(
      collection,
      setTimeout(() => {
        this.timers.delete(collection);
        const rows = read();
        if (!Array.isArray(rows)) return;
        this.request('PUT', `/collections/${collection}`, { rows }).catch(err => {
          // Lecture seule (auditeur) : rien à synchroniser, ce n'est pas une erreur
          if (!/lecture seule/i.test(err.message)) console.error(`Synchronisation "${collection}" échouée :`, err.message);
        });
      }, 400)
    );
  }
}

export const api = new ApiClient();
