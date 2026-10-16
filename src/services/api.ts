/**
 * GSPME - Client de l'API SaaS (authentification JWT + synchronisation multi-tenant)
 * Sans serveur joignable, l'application reste en mode démo (localStorage uniquement).
 */
import type { User } from '../types';

const TOKEN_KEY = 'gspme_auth_token';
const SYNCED_KEYS = new Set([
  'tenants', 'users', 'customers', 'suppliers', 'products', 'warehouses', 'invoices', 'purchases',
  'treasury_accounts', 'treasury_tx', 'journal_entries', 'employees', 'payslips', 'audit_logs',
  'opportunities', 'interactions', 'sales_orders', 'delivery_notes', 'sales_reps', 'pos_sessions',
  'pos_receipts', 'projects', 'fixed_assets', 'documents', 'ai_insights',
]);

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

  /** Le serveur SaaS répond-il ? (sinon : mode démo local) */
  public async isServerAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      return res.ok && data?.service === 'gspme-saas';
    } catch {
      return false;
    }
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
        this.request('PUT', `/collections/${collection}`, { rows }).catch(err =>
          console.error(`Synchronisation "${collection}" échouée :`, err.message)
        );
      }, 400)
    );
  }
}

export const api = new ApiClient();
