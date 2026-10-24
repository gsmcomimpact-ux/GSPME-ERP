/**
 * GSPME SaaS - API REST multi-tenant (Express + MySQL)
 * Lancement : npm run server   |   Production : npm run build && npm start
 */
import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { APP_DIR, all, initDb, one, run, transaction } from './db.ts';
import { adminListPayments, listPayments, runExpiry, startCheckout, webhookHandler } from './billing.ts';
import { isBillingEnabled } from './chariow.ts';
import {
  type AuthedRequest,
  hashPassword,
  rateLimit,
  requireAuth,
  signToken,
  verifyPassword,
  verifyToken,
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
  'dashboard', 'crm', 'contacts', 'sales', 'purchases', 'inventory', 'pos', 'accounting', 'treasury',
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
  'monthlySubscriptionAmount', 'maxUsers', 'maxStorageMB', 'activeModules', 'requestedPlan',
];

type Row = Record<string, unknown>;
type UserRow = {
  id: string; tenant_id: string; name: string; email: string; password_hash: string;
  role: string; active: number; last_login: string | null;
};

/** État de la base de données : le serveur démarre même si elle est injoignable, et le dit dans /api/health. */
let dbReady = false;
let dbErrorCode = '';
const dbErrorOf = (err: unknown) => String((err as { code?: string }).code || (err as Error).message || 'ERREUR').slice(0, 60);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// Tant que la base n'est pas prête, toute l'API répond 503 (sauf /api/health) : Chariow réessaiera ses webhooks
app.use('/api', (req, res, next) => {
  if (dbReady || req.path === '/health') return next();
  res.status(503).json({ error: 'Base de données indisponible : réessayez dans un instant.' });
});

// Webhook Chariow : corps BRUT (la signature porte sur les octets exacts), donc avant express.json()
app.post('/api/webhooks/chariow', express.raw({ type: '*/*', limit: '1mb' }), webhookHandler);
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
const getTenant = async (id: string): Promise<Row | null> => {
  const r = await one<{ data: string }>('SELECT data FROM tenants WHERE id = ?', [id]);
  return r ? JSON.parse(r.data) : null;
};
const getUser = (id: string) => one<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
const emailTaken = async (email: string) => !!(await one('SELECT 1 AS x FROM users WHERE email = ?', [email]));

/** Un tenant dont l'abonnement est résilié/suspendu n'accède plus à l'application (sauf super-admin). */
const isSuspended = async (u: UserRow): Promise<boolean> => {
  if (u.role === 'SUPER_ADMIN_SAAS') return false;
  const t = await getTenant(u.tenant_id);
  return !!t && t.subscriptionStatus === 'CANCELLED';
};
const SUSPENDED_MSG = 'Abonnement suspendu : contactez le support GSPME.';

// ---------------------------------------------------------------- Santé
app.get('/api/health', (_req, res) => {
  res.json({
    status: dbReady ? 'ok' : 'degraded',
    service: 'gspme-saas',
    db: dbReady,
    ...(dbReady ? {} : { dbError: dbErrorCode || 'INITIALISATION' }), // code technique seulement (aucun mot de passe ni hôte)
    billing: isBillingEnabled(),
    time: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------- Auth
const authLimiter = rateLimit(20, 15 * 60 * 1000);

app.post('/api/auth/register', authLimiter, asyncH(async (req, res) => {
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
  if (await emailTaken(email)) {
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
    requestedPlan: ['ESSENTIEL', 'BUSINESS', 'PREMIUM'].includes(b.requestedPlan) ? b.requestedPlan : undefined,
    currentBranchId: branchId,
    branches: [{ id: branchId, tenantId, name: `Siège ${city}`, city, address: str(b.address, 500), phone: str(b.phone, 50), isHeadquarters: true }],
  };
  const userId = `user-${randomUUID()}`;
  try {
    await transaction(async conn => {
      await run('INSERT INTO tenants (id, data) VALUES (?, ?)', [tenantId, JSON.stringify(tenant)], conn);
      await run(
        'INSERT INTO users (id, tenant_id, name, email, password_hash, role, last_login) VALUES (?,?,?,?,?,?,?)',
        [userId, tenantId, name, email, hashPassword(password), 'DIRECTEUR_GENERAL', now()], conn
      );
    });
  } catch (err) {
    // Inscription simultanée avec le même email : la contrainte UNIQUE tranche.
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'Un compte existe déjà avec cet email' }); return; }
    throw err;
  }
  const token = signToken({ id: userId, tenantId, role: 'DIRECTEUR_GENERAL' });
  res.status(201).json({ token });
}));

// Hachage factice pour égaliser le temps de réponse si l'email est inconnu
const DUMMY_HASH = hashPassword('gspme-dummy-password');

app.post('/api/auth/login', authLimiter, asyncH(async (req, res) => {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await one<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
  const ok = verifyPassword(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok || !user.active) { res.status(401).json({ error: 'Identifiants invalides' }); return; }
  if (await isSuspended(user)) { res.status(403).json({ error: SUSPENDED_MSG }); return; }
  await run('UPDATE users SET last_login = ? WHERE id = ?', [now(), user.id]);
  res.json({ token: signToken({ id: user.id, tenantId: user.tenant_id, role: user.role }) });
}));

app.get('/api/auth/me', requireAuth, asyncH(async (req, res) => {
  const { auth } = req as AuthedRequest;
  const user = await getUser(auth.sub);
  if (!user || !user.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (await isSuspended(user)) { res.status(403).json({ error: SUSPENDED_MSG }); return; }
  res.json({ user: toUser(user), tenant: await getTenant(user.tenant_id) });
}));

// ---------------------------------------------------------------- Synchronisation
/** Instantané complet des données du tenant de l'utilisateur connecté. */
app.get('/api/sync', requireAuth, asyncH(async (req, res) => {
  const { auth } = req as AuthedRequest;
  const me = await getUser(auth.sub);
  if (!me || !me.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (await isSuspended(me)) { res.status(403).json({ error: SUSPENDED_MSG }); return; }

  const sa = me.role === 'SUPER_ADMIN_SAAS';
  const tenantRows = sa
    ? await all<{ data: string }>('SELECT data FROM tenants')
    : await all<{ data: string }>('SELECT data FROM tenants WHERE id = ?', [me.tenant_id]);
  const userRows = sa
    ? await all<UserRow>('SELECT * FROM users')
    : await all<UserRow>('SELECT * FROM users WHERE tenant_id = ?', [me.tenant_id]);

  const collections: Record<string, unknown[]> = {};
  for (const name of COLLECTIONS) collections[name] = [];
  const recs = await all<{ collection: string; data: string }>(
    'SELECT collection, data FROM records WHERE tenant_id = ?', [me.tenant_id]
  );
  for (const r of recs) collections[r.collection]?.push(JSON.parse(r.data));

  res.json({
    activeTenantId: me.tenant_id,
    activeUserId: me.id,
    tenants: tenantRows.map(r => JSON.parse(r.data)),
    users: userRows.map(toUser),
    collections,
  });
}));

/** Remplace le contenu d'une collection pour le tenant connecté (écriture depuis le front). */
app.put('/api/collections/:name', requireAuth, asyncH(async (req, res) => {
  const { auth } = req as AuthedRequest;
  const name = req.params.name as string;
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length > 50000) { res.status(400).json({ error: 'Champ rows invalide' }); return; }

  const user = await getUser(auth.sub);
  if (!user || !user.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (await isSuspended(user)) { res.status(403).json({ error: SUSPENDED_MSG }); return; }
  if (user.role === 'AUDITEUR_EXTERNE') { res.status(403).json({ error: 'Accès en lecture seule' }); return; }
  const sa = user.role === 'SUPER_ADMIN_SAAS';
  const tid = user.tenant_id;

  if (name === 'tenants') {
    // Chaque tenant ne modifie que son propre profil, hors champs d'abonnement.
    for (const raw of rows as Row[]) {
      if (!raw || typeof raw.id !== 'string') continue;
      if (raw.id !== tid) continue; // le super-admin gère les autres entreprises via PATCH /api/admin/tenants/:id
      const current = await getTenant(raw.id);
      if (!current) continue;
      const next: Row = { ...current, ...raw, id: raw.id };
      for (const f of BILLING_FIELDS) next[f] = current[f]; // l'abonnement ne se modifie que par le super-admin
      await run('UPDATE tenants SET data = ? WHERE id = ?', [JSON.stringify(next), raw.id]);
    }
    res.json({ ok: true }); return;
  }

  if (name === 'users') {
    // Profils uniquement ; les comptes se créent via POST /api/users (mot de passe requis).
    if (user.role !== 'DIRECTEUR_GENERAL' && !sa) { res.status(403).json({ error: 'Réservé à la direction' }); return; }
    for (const raw of rows as Row[]) {
      const target = typeof raw?.id === 'string'
        ? await getUser(raw.id) : undefined;
      if (!target || target.tenant_id !== tid) continue;
      const role = typeof raw.role === 'string' && ROLES.includes(raw.role) && (sa || raw.role !== 'SUPER_ADMIN_SAAS')
        ? raw.role : target.role;
      await run('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?',
        [str(raw.name) || target.name, role, raw.active === false ? 0 : 1, target.id]);
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

  await transaction(async conn => {
    const ids = new Set(clean.map(r => r.id as string));
    const existing = await all<{ id: string }>(
      'SELECT id FROM records WHERE tenant_id = ? AND collection = ?', [tid, name], conn
    );
    for (const e of existing) {
      if (!ids.has(e.id)) await run('DELETE FROM records WHERE tenant_id = ? AND collection = ? AND id = ?', [tid, name, e.id], conn);
    }
    for (const r of clean) {
      await run(
        `INSERT INTO records (tenant_id, collection, id, data) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [tid, name, r.id as string, JSON.stringify(r)], conn
      );
    }
  });
  res.json({ ok: true, count: clean.length });
}));

// ---------------------------------------------------------------- Utilisateurs
app.post('/api/users', requireAuth, asyncH(async (req, res) => {
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
  if (await emailTaken(email)) { res.status(409).json({ error: 'Email déjà utilisé' }); return; }

  const tenant = await getTenant(auth.tid);
  const count = Number((await one<{ n: number }>('SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND active = 1', [auth.tid]))!.n);
  if (tenant && typeof tenant.maxUsers === 'number' && count >= tenant.maxUsers) {
    res.status(402).json({ error: "Limite d'utilisateurs du plan atteinte" }); return;
  }
  const id = `user-${randomUUID()}`;
  await run('INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)',
    [id, auth.tid, name, email, hashPassword(password), role]);
  res.status(201).json({ user: toUser((await getUser(id))!) });
}));

// ---------------------------------------------------------------- Contact public & administration plateforme
const contactLimiter = rateLimit(10, 15 * 60 * 1000);
const INQUIRY_STATUSES = ['NOUVEAU', 'EN_COURS', 'TRAITE'];

/** Formulaire de contact de la page d'accueil (public, limité par IP). */
app.post('/api/contact', contactLimiter, asyncH(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  const message = str(b.message, 4000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: 'Nom, email valide et message requis' }); return;
  }
  const id = `INQ-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const inquiry = {
    id, name, email, phone: str(b.phone, 50), company: str(b.company), subject: str(b.subject) || 'Demande de contact',
    country: COUNTRIES.includes(b.country) ? b.country : 'SN', message, createdAt, status: 'NOUVEAU',
  };
  await run('INSERT INTO inquiries (id, data, status) VALUES (?,?,?)', [id, JSON.stringify(inquiry), 'NOUVEAU']);
  res.status(201).json({ ok: true });
}));

async function superGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const payload = header.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
    const user = payload ? await getUser(payload.sub) : undefined;
    if (!user || !user.active || user.role !== 'SUPER_ADMIN_SAAS') {
      res.status(403).json({ error: 'Réservé aux administrateurs de la plateforme' }); return;
    }
    next();
  } catch (err) { next(err); }
}

app.patch('/api/admin/tenants/:id', superGuard, asyncH(async (req, res) => {
  const id = req.params.id as string;
  const current = await getTenant(id);
  if (!current) { res.status(404).json({ error: 'Entreprise introuvable' }); return; }
  const b = req.body || {};
  const next: Row = { ...current };
  const PLANS = ['STARTER', 'ESSENTIEL', 'BUSINESS', 'PREMIUM', 'ENTERPRISE'];
  const STATUSES = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED'];
  if (b.subscriptionPlan !== undefined) {
    if (!PLANS.includes(b.subscriptionPlan)) { res.status(400).json({ error: 'Formule invalide' }); return; }
    next.subscriptionPlan = b.subscriptionPlan;
  }
  if (b.subscriptionStatus !== undefined) {
    if (!STATUSES.includes(b.subscriptionStatus)) { res.status(400).json({ error: 'Statut invalide' }); return; }
    if (id === 'tenant-platform' && b.subscriptionStatus === 'CANCELLED') {
      res.status(400).json({ error: "L'espace plateforme ne peut pas être suspendu" }); return;
    }
    next.subscriptionStatus = b.subscriptionStatus;
  }
  for (const f of ['maxUsers', 'maxStorageMB', 'monthlySubscriptionAmount'] as const) {
    if (b[f] !== undefined) {
      const n = Number(b[f]);
      if (!Number.isFinite(n) || n < 0) { res.status(400).json({ error: `Valeur invalide : ${f}` }); return; }
      next[f] = Math.round(n);
    }
  }
  if (b.billingCycle !== undefined) {
    if (!['MENSUEL', 'ANNUEL'].includes(b.billingCycle)) { res.status(400).json({ error: 'Cycle invalide' }); return; }
    next.billingCycle = b.billingCycle;
  }
  if (Array.isArray(b.activeModules)) next.activeModules = b.activeModules.filter((m: unknown) => ALL_MODULES.includes(m as string));
  if (typeof b.subscriptionExpiresAt === 'string') next.subscriptionExpiresAt = b.subscriptionExpiresAt.slice(0, 40);
  await run('UPDATE tenants SET data = ? WHERE id = ?', [JSON.stringify(next), id]);
  res.json({ tenant: next });
}));

app.get('/api/admin/inquiries', superGuard, asyncH(async (_req, res) => {
  const rows = await all<{ data: string; status: string }>('SELECT data, status FROM inquiries ORDER BY created_at DESC LIMIT 500');
  res.json({ inquiries: rows.map(r => ({ ...JSON.parse(r.data), status: r.status })) });
}));

app.patch('/api/admin/inquiries/:id', superGuard, asyncH(async (req, res) => {
  const status = req.body?.status;
  if (!INQUIRY_STATUSES.includes(status)) { res.status(400).json({ error: 'Statut invalide' }); return; }
  const r = await run('UPDATE inquiries SET status = ? WHERE id = ?', [status, req.params.id as string]);
  if (!r.affectedRows) { res.status(404).json({ error: 'Demande introuvable' }); return; }
  res.json({ ok: true });
}));

// ---------------------------------------------------------------- Paiement des abonnements (Chariow)
const billingLimiter = rateLimit(15, 15 * 60 * 1000);
app.post('/api/billing/checkout', billingLimiter, requireAuth, asyncH(startCheckout));
app.get('/api/billing/payments', requireAuth, asyncH(listPayments));
app.get('/api/admin/payments', superGuard, asyncH(adminListPayments));

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
async function seedSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!email || password.length < 8) return;
  if (await emailTaken(email)) return;
  const tenantId = 'tenant-platform';
  if (!(await getTenant(tenantId))) {
    await run('INSERT INTO tenants (id, data) VALUES (?, ?)', [tenantId, JSON.stringify({
      id: tenantId, name: 'GSPME Plateforme', legalForm: 'SAS', countryCode: 'SN', taxNumber: '',
      tradeRegisterNumber: '', address: '', city: 'Dakar', phone: '', email, currency: 'XOF',
      capitalSocial: 0, subscriptionPlan: 'ENTERPRISE', subscriptionStatus: 'ACTIVE',
      maxUsers: 100, maxStorageMB: 102400, activeModules: ALL_MODULES, currentBranchId: 'branch-platform',
      branches: [{ id: 'branch-platform', tenantId, name: 'Siège', city: 'Dakar', address: '', phone: '', isHeadquarters: true }],
    })]);
  }
  await run('INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)',
    [`user-${randomUUID()}`, tenantId, 'Super Admin GSPME', email, hashPassword(password), 'SUPER_ADMIN_SAAS']);
  console.log(`Super-admin créé : ${email}`);
}

/** Tests : prête quand les tables existent. En production le démarrage passe par bootDb(). */
export const ready: Promise<void> =
  process.env.GSPME_NO_LISTEN === '1' ? initDb().then(() => { dbReady = true; }) : Promise.resolve();
export { app };

/** Initialise la base ; en cas d'échec on réessaie toutes les 10 s sans arrêter le serveur. */
async function bootDb(): Promise<void> {
  try {
    await initDb();
    await seedSuperAdmin();
    await runExpiry();
    dbReady = true;
    dbErrorCode = '';
    console.log('Base de données connectée.');
  } catch (err) {
    dbErrorCode = dbErrorOf(err);
    console.error(`Base de données indisponible (${dbErrorCode}) : ${(err as Error).message}. Nouvelle tentative dans 10 s.`);
    setTimeout(bootDb, 10_000).unref();
  }
}

if (process.env.GSPME_NO_LISTEN !== '1') {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => console.log(`GSPME SaaS API sur http://localhost:${port}`));
  setInterval(() => { if (dbReady) runExpiry().catch(err => console.error('Échéances :', err.message)); }, 6 * 3600_000).unref();
  void bootDb();
}
