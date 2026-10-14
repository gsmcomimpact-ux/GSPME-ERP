/**
 * GSPME SaaS - API REST multi-tenant (Express + SQLite)
 * Lancement : npm run server   |   Production : npm run build && npm start
 */
import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { APP_DIR, db, transaction } from './db.ts';
import {
  type AuthedRequest,
  hashPassword,
  rateLimit,
  requireAuth,
  signToken,
  verifyPassword,
} from './auth.ts';

const ROLES = [
  'DIRECTEUR_GENERAL', 'RESPONSABLE_FINANCIER', 'COMMERCIAL_VENTES', 'LOGISTIQUE_STOCKS',
  'GESTIONNAIRE_RH', 'CHEF_DE_PROJET', 'CAISSIER_VENDEUR', 'AUDITEUR_EXTERNE', 'SUPER_ADMIN_SAAS',
];
const COUNTRIES = ['SN', 'CI', 'CM', 'ML', 'BJ', 'GN', 'NE', 'BF', 'TG'];
const LEGAL_FORMS = ['SARL', 'SAS', 'SA', 'SUARL', 'GIE', 'ENTREPRISE_INDIVIDUELLE'];
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BJ: 'XOF', NE: 'XOF', BF: 'XOF', TG: 'XOF', CM: 'XAF', GN: 'GNF',
};
const ALL_MODULES = [
  'dashboard', 'crm', 'sales', 'purchases', 'inventory', 'pos', 'accounting', 'treasury',
  'tax', 'payroll', 'projects', 'assets', 'documents', 'bi', 'ai', 'admin',
];
/** Collections métier synchronisées (noms = clés de stockage du front). */
const COLLECTIONS = new Set([
  'customers', 'suppliers', 'products', 'warehouses', 'invoices', 'purchases',
  'treasury_accounts', 'treasury_tx', 'journal_entries', 'employees', 'payslips', 'audit_logs',
  'opportunities', 'interactions', 'sales_orders', 'delivery_notes', 'sales_reps',
  'pos_sessions', 'pos_receipts', 'projects', 'fixed_assets', 'documents', 'ai_insights',
]);
/** Champs d'abonnement : modifiables uniquement par l'administrateur de la plateforme. */
const BILLING_FIELDS = [
  'subscriptionPlan', 'subscriptionStatus', 'billingCycle', 'subscriptionExpiresAt',
  'monthlySubscriptionAmount', 'maxUsers', 'maxStorageMB', 'activeModules',
];

type Row = Record<string, unknown>;
type UserRow = {
  id: string; tenant_id: string; name: string; email: string; password_hash: string;
  role: string; active: number; last_login: string | null;
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

const asyncH =
  (fn: (req: Request, res: Response) => Promise<void> | void) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

const str = (v: unknown, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isSuper = (a: AuthedRequest['auth']) => a.role === 'SUPER_ADMIN_SAAS';
const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const toUser = (u: UserRow) => ({
  id: u.id, tenantId: u.tenant_id, name: u.name, email: u.email, role: u.role,
  active: !!u.active, lastLogin: u.last_login || '',
});
const getTenant = (id: string): Row | null => {
  const r = db.prepare('SELECT data FROM tenants WHERE id = ?').get(id) as { data: string } | undefined;
  return r ? JSON.parse(r.data) : null;
};

// ---------------------------------------------------------------- Santé
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gspme-saas', time: new Date().toISOString() });
});

// ---------------------------------------------------------------- Auth
const authLimiter = rateLimit(20, 15 * 60 * 1000);

app.post('/api/auth/register', authLimiter, asyncH((req, res) => {
  const b = req.body || {};
  const companyName = str(b.companyName);
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const countryCode = COUNTRIES.includes(b.countryCode) ? b.countryCode : 'SN';
  const legalForm = LEGAL_FORMS.includes(b.legalForm) ? b.legalForm : 'SARL';

  if (!companyName || !name) { res.status(400).json({ error: "Nom de l'entreprise et du dirigeant requis" }); return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { res.status(400).json({ error: 'Email invalide' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Mot de passe : 8 caractères minimum' }); return; }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    res.status(409).json({ error: 'Un compte existe déjà avec cet email' }); return;
  }

  const tenantId = `tenant-${randomUUID()}`;
  const branchId = `branch-${randomUUID()}`;
  const city = str(b.city, 100) || 'Dakar';
  const trialEnd = new Date(Date.now() + 14 * 86400_000).toISOString().substring(0, 10);
  const tenant = {
    id: tenantId, name: companyName, tradeName: str(b.tradeName) || companyName, legalForm, countryCode,
    taxNumber: str(b.taxNumber, 100), tradeRegisterNumber: str(b.tradeRegisterNumber, 100),
    address: str(b.address, 500), city, phone: str(b.phone, 50), email,
    currency: CURRENCY_BY_COUNTRY[countryCode], capitalSocial: 0,
    subscriptionPlan: 'STARTER', subscriptionStatus: 'TRIAL', billingCycle: 'MENSUEL',
    subscriptionExpiresAt: trialEnd, monthlySubscriptionAmount: 0, maxUsers: 5, maxStorageMB: 2048,
    activeModules: ALL_MODULES,
    currentBranchId: branchId,
    branches: [{ id: branchId, tenantId, name: `Siège ${city}`, city, address: str(b.address, 500), phone: str(b.phone, 50), isHeadquarters: true }],
  };
  const userId = `user-${randomUUID()}`;
  transaction(() => {
    db.prepare('INSERT INTO tenants (id, data) VALUES (?, ?)').run(tenantId, JSON.stringify(tenant));
    db.prepare(
      'INSERT INTO users (id, tenant_id, name, email, password_hash, role, last_login) VALUES (?,?,?,?,?,?,?)'
    ).run(userId, tenantId, name, email, hashPassword(password), 'DIRECTEUR_GENERAL', now());
  });
  const token = signToken({ id: userId, tenantId, role: 'DIRECTEUR_GENERAL' });
  res.status(201).json({ token });
}));

// Hachage factice pour égaliser le temps de réponse si l'email est inconnu
const DUMMY_HASH = hashPassword('gspme-dummy-password');

app.post('/api/auth/login', authLimiter, asyncH((req, res) => {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  const ok = verifyPassword(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok || !user.active) { res.status(401).json({ error: 'Identifiants invalides' }); return; }
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now(), user.id);
  res.json({ token: signToken({ id: user.id, tenantId: user.tenant_id, role: user.role }) });
}));

app.get('/api/auth/me', requireAuth, (req, res) => {
  const { auth } = req as AuthedRequest;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.sub) as UserRow | undefined;
  if (!user || !user.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  res.json({ user: toUser(user), tenant: getTenant(user.tenant_id) });
});

// ---------------------------------------------------------------- Synchronisation
/** Instantané complet des données du tenant de l'utilisateur connecté. */
app.get('/api/sync', requireAuth, (req, res) => {
  const { auth } = req as AuthedRequest;
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.sub) as UserRow | undefined;
  if (!me || !me.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }

  const sa = me.role === 'SUPER_ADMIN_SAAS';
  const tenantRows = (sa
    ? db.prepare('SELECT data FROM tenants').all()
    : db.prepare('SELECT data FROM tenants WHERE id = ?').all(me.tenant_id)) as { data: string }[];
  const userRows = (sa
    ? db.prepare('SELECT * FROM users').all()
    : db.prepare('SELECT * FROM users WHERE tenant_id = ?').all(me.tenant_id)) as UserRow[];

  const collections: Record<string, unknown[]> = {};
  for (const name of COLLECTIONS) collections[name] = [];
  const recs = db
    .prepare('SELECT collection, data FROM records WHERE tenant_id = ?')
    .all(me.tenant_id) as { collection: string; data: string }[];
  for (const r of recs) collections[r.collection]?.push(JSON.parse(r.data));

  res.json({
    activeTenantId: me.tenant_id,
    activeUserId: me.id,
    tenants: tenantRows.map(r => JSON.parse(r.data)),
    users: userRows.map(toUser),
    collections,
  });
});

/** Remplace le contenu d'une collection pour le tenant connecté (écriture depuis le front). */
app.put('/api/collections/:name', requireAuth, asyncH((req, res) => {
  const { auth } = req as AuthedRequest;
  const name = req.params.name as string;
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length > 50000) { res.status(400).json({ error: 'Champ rows invalide' }); return; }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.sub) as UserRow | undefined;
  if (!user || !user.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (user.role === 'AUDITEUR_EXTERNE') { res.status(403).json({ error: 'Accès en lecture seule' }); return; }
  const sa = user.role === 'SUPER_ADMIN_SAAS';
  const tid = user.tenant_id;

  if (name === 'tenants') {
    // Chaque tenant ne modifie que son propre profil, hors champs d'abonnement.
    for (const raw of rows as Row[]) {
      if (!raw || typeof raw.id !== 'string') continue;
      if (!sa && raw.id !== tid) continue;
      const current = getTenant(raw.id);
      if (!current) continue;
      const next: Row = { ...current, ...raw, id: raw.id };
      if (!sa) for (const f of BILLING_FIELDS) next[f] = current[f];
      db.prepare('UPDATE tenants SET data = ? WHERE id = ?').run(JSON.stringify(next), raw.id);
    }
    res.json({ ok: true }); return;
  }

  if (name === 'users') {
    // Profils uniquement ; les comptes se créent via POST /api/users (mot de passe requis).
    if (user.role !== 'DIRECTEUR_GENERAL' && !sa) { res.status(403).json({ error: 'Réservé à la direction' }); return; }
    for (const raw of rows as Row[]) {
      const target = typeof raw?.id === 'string'
        ? (db.prepare('SELECT * FROM users WHERE id = ?').get(raw.id) as UserRow | undefined) : undefined;
      if (!target || (!sa && target.tenant_id !== tid)) continue;
      const role = typeof raw.role === 'string' && ROLES.includes(raw.role) && (sa || raw.role !== 'SUPER_ADMIN_SAAS')
        ? raw.role : target.role;
      db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?')
        .run(str(raw.name) || target.name, role, raw.active === false ? 0 : 1, target.id);
    }
    res.json({ ok: true }); return;
  }

  if (!COLLECTIONS.has(name)) { res.status(404).json({ error: 'Collection inconnue' }); return; }

  const clean: Row[] = [];
  for (const raw of rows as Row[]) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) {
      res.status(400).json({ error: 'Chaque enregistrement doit avoir un id' }); return;
    }
    if ('tenantId' in raw && raw.tenantId !== tid) {
      res.status(403).json({ error: 'Enregistrement hors de votre entreprise' }); return;
    }
    clean.push(raw);
  }

  transaction(() => {
    const ids = new Set(clean.map(r => r.id as string));
    const existing = db.prepare('SELECT id FROM records WHERE tenant_id = ? AND collection = ?')
      .all(tid, name) as { id: string }[];
    const del = db.prepare('DELETE FROM records WHERE tenant_id = ? AND collection = ? AND id = ?');
    for (const e of existing) if (!ids.has(e.id)) del.run(tid, name, e.id);
    const upsert = db.prepare(
      `INSERT INTO records (tenant_id, collection, id, data, updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT (tenant_id, collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    );
    for (const r of clean) upsert.run(tid, name, r.id as string, JSON.stringify(r), now());
  });
  res.json({ ok: true, count: clean.length });
}));

// ---------------------------------------------------------------- Utilisateurs
app.post('/api/users', requireAuth, asyncH((req, res) => {
  const { auth } = req as AuthedRequest;
  if (auth.role !== 'DIRECTEUR_GENERAL' && auth.role !== 'SUPER_ADMIN_SAAS') {
    res.status(403).json({ error: 'Réservé à la direction' }); return;
  }
  const b = req.body || {};
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const role = ROLES.includes(b.role) && (auth.role === 'SUPER_ADMIN_SAAS' || b.role !== 'SUPER_ADMIN_SAAS')
    ? b.role : 'COMMERCIAL_VENTES';
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { res.status(400).json({ error: 'Nom et email valides requis' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Mot de passe : 8 caractères minimum' }); return; }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) { res.status(409).json({ error: 'Email déjà utilisé' }); return; }

  const tenant = getTenant(auth.tid);
  const count = (db.prepare('SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND active = 1').get(auth.tid) as { n: number }).n;
  if (tenant && typeof tenant.maxUsers === 'number' && count >= tenant.maxUsers) {
    res.status(402).json({ error: "Limite d'utilisateurs du plan atteinte" }); return;
  }
  const id = `user-${randomUUID()}`;
  db.prepare('INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(id, auth.tid, name, email, hashPassword(password), role);
  res.status(201).json({ user: toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow) });
}));

// ---------------------------------------------------------------- Front statique (production)
const dist = path.resolve(APP_DIR, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', (_req, res) => { res.status(404).json({ error: 'Route inconnue' }); });
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ---------------------------------------------------------------- Amorçage super-admin
function seedSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!email || password.length < 8) return;
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return;
  const tenantId = 'tenant-platform';
  if (!getTenant(tenantId)) {
    db.prepare('INSERT INTO tenants (id, data) VALUES (?, ?)').run(tenantId, JSON.stringify({
      id: tenantId, name: 'GSPME Plateforme', legalForm: 'SAS', countryCode: 'SN', taxNumber: '',
      tradeRegisterNumber: '', address: '', city: 'Dakar', phone: '', email, currency: 'XOF',
      capitalSocial: 0, subscriptionPlan: 'ENTERPRISE', subscriptionStatus: 'ACTIVE',
      maxUsers: 100, maxStorageMB: 102400, activeModules: ALL_MODULES, currentBranchId: 'branch-platform',
      branches: [{ id: 'branch-platform', tenantId, name: 'Siège', city: 'Dakar', address: '', phone: '', isHeadquarters: true }],
    }));
  }
  db.prepare('INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(`user-${randomUUID()}`, tenantId, 'Super Admin GSPME', email, hashPassword(password), 'SUPER_ADMIN_SAAS');
  console.log(`Super-admin créé : ${email}`);
}

export { app };
if (process.env.GSPME_NO_LISTEN !== '1') {
  seedSuperAdmin();
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => console.log(`GSPME SaaS API sur http://localhost:${port}`));
}
