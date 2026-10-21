// Nécessite une base MySQL/MariaDB de test (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME ou DATABASE_URL).
// ATTENTION : les tables sont vidées au démarrage des tests.
process.env.GSPME_NO_LISTEN = '1';
process.env.DB_NAME ||= 'gspme_test';

import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

const { app, ready } = await import('./index.ts');
const { run } = await import('./db.ts');
await ready;
await run('SET FOREIGN_KEY_CHECKS = 0');
for (const t of ['records', 'users', 'tenants']) await run(`TRUNCATE TABLE ${t}`);
await run('SET FOREIGN_KEY_CHECKS = 1');
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
test.after(async () => {
  server.close();
  const { pool } = await import('./db.ts');
  await pool.end();
});

const call = async (method: string, url: string, body?: unknown, token?: string) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as any };
};
const register = (n: string) =>
  call('POST', '/auth/register', { companyName: `Société ${n}`, name: `Dir ${n}`, email: `${n}@test.sn`, password: 'motdepasse1', countryCode: 'CI' });

test('inscription, login et /me', async () => {
  const r = await register('a');
  assert.equal(r.status, 201);
  assert.equal((await register('a')).status, 409);
  assert.equal((await call('POST', '/auth/login', { email: 'a@test.sn', password: 'faux' })).status, 401);
  const l = await call('POST', '/auth/login', { email: 'A@test.sn', password: 'motdepasse1' });
  assert.equal(l.status, 200);
  const me = await call('GET', '/auth/me', undefined, l.body.token);
  assert.equal(me.body.tenant.currency, 'XOF');
  assert.equal(me.body.user.role, 'DIRECTEUR_GENERAL');
  assert.equal((await call('GET', '/sync')).status, 401);
});

test('isolation entre tenants', async () => {
  const a = (await register('iso1')).body.token;
  const b = (await register('iso2')).body.token;
  const me = await call('GET', '/auth/me', undefined, a);
  const tid = me.body.tenant.id;

  const put = await call('PUT', '/collections/customers', { rows: [{ id: 'c1', tenantId: tid, name: 'Client 1' }] }, a);
  assert.equal(put.status, 200);

  // B ne voit rien et ne peut pas écrire dans le tenant de A
  const syncB = await call('GET', '/sync', undefined, b);
  assert.equal(syncB.body.collections.customers.length, 0);
  assert.equal(syncB.body.tenants.length, 1);
  const forged = await call('PUT', '/collections/customers', { rows: [{ id: 'x', tenantId: tid, name: 'Pirate' }] }, b);
  assert.equal(forged.status, 403);

  const syncA = await call('GET', '/sync', undefined, a);
  assert.deepEqual(syncA.body.collections.customers.map((c: any) => c.id), ['c1']);

  // remplacement : une collection vide supprime les lignes de A uniquement
  await call('PUT', '/collections/customers', { rows: [] }, a);
  assert.equal((await call('GET', '/sync', undefined, a)).body.collections.customers.length, 0);
});

test('champs d’abonnement protégés et collections inconnues', async () => {
  const a = (await register('bill')).body.token;
  const { tenant } = (await call('GET', '/auth/me', undefined, a)).body;
  await call('PUT', '/collections/tenants', { rows: [{ ...tenant, city: 'Abidjan', subscriptionPlan: 'PREMIUM', maxUsers: 999 }] }, a);
  const after = (await call('GET', '/auth/me', undefined, a)).body.tenant;
  assert.equal(after.city, 'Abidjan');
  assert.equal(after.subscriptionPlan, 'STARTER');
  assert.equal(after.maxUsers, 5);
  assert.equal((await call('PUT', '/collections/secrets', { rows: [] }, a)).status, 404);
});

test('création d’utilisateur et rôle lecture seule', async () => {
  const a = (await register('team')).body.token;
  const u = await call('POST', '/users', { name: 'Audit', email: 'audit@team.sn', password: 'motdepasse1', role: 'AUDITEUR_EXTERNE' }, a);
  assert.equal(u.status, 201);
  const esc = await call('POST', '/users', { name: 'X', email: 'x@team.sn', password: 'motdepasse1', role: 'SUPER_ADMIN_SAAS' }, a);
  assert.equal(esc.body.user.role, 'COMMERCIAL_VENTES'); // pas d'escalade vers super-admin
  const tok = (await call('POST', '/auth/login', { email: 'audit@team.sn', password: 'motdepasse1' })).body.token;
  assert.equal((await call('PUT', '/collections/products', { rows: [] }, tok)).status, 403);
  assert.equal((await call('POST', '/users', { name: 'Y', email: 'y@team.sn', password: 'motdepasse1' }, tok)).status, 403);
});

test('super-admin : accès réservé et suspension d’un tenant', async () => {
  const { run: sql } = await import('./db.ts');
  const { hashPassword } = await import('./auth.ts');
  await sql(
    "INSERT IGNORE INTO tenants (id, data) VALUES ('tenant-platform', '{\"id\":\"tenant-platform\",\"name\":\"GSPME\",\"subscriptionStatus\":\"ACTIVE\"}')"
  );
  await sql(
    "INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ('user-sa', 'tenant-platform', 'SA', 'sa@gspme.sn', ?, 'SUPER_ADMIN_SAAS')",
    [hashPassword('motdepasse1')]
  );
  const sa = (await call('POST', '/auth/login', { email: 'sa@gspme.sn', password: 'motdepasse1' })).body.token;
  const victim = (await register('susp')).body.token;
  const tid = (await call('GET', '/auth/me', undefined, victim)).body.tenant.id;

  // un dirigeant ne voit que son tenant ; le super-admin voit tout
  assert.equal((await call('GET', '/sync', undefined, victim)).body.tenants.length, 1);
  assert.ok((await call('GET', '/sync', undefined, sa)).body.tenants.length >= 2);

  // le super-admin suspend le tenant : plus de connexion ni de synchronisation
  const t = (await call('GET', '/auth/me', undefined, victim)).body.tenant;
  // le super-admin ne peut pas modifier un autre tenant via la synchro générique...
  await call('PUT', '/collections/tenants', { rows: [{ ...t, subscriptionStatus: 'CANCELLED' }] }, sa);
  assert.equal((await call('GET', '/auth/me', undefined, victim)).body.tenant.subscriptionStatus, 'TRIAL');
  // ...mais passe par l'API d'administration (réservée au super-admin)
  assert.equal((await call('PATCH', `/admin/tenants/${tid}`, { subscriptionStatus: 'CANCELLED' }, victim)).status, 403);
  assert.equal((await call('PATCH', `/admin/tenants/${tid}`, { subscriptionStatus: 'INCONNU' }, sa)).status, 400);
  assert.equal((await call('PATCH', `/admin/tenants/${tid}`, { subscriptionStatus: 'CANCELLED' }, sa)).status, 200);
  assert.equal((await call('POST', '/auth/login', { email: 'susp@test.sn', password: 'motdepasse1' })).status, 403);
  assert.equal((await call('GET', '/sync', undefined, victim)).status, 403);
  assert.equal(tid, t.id);
});

test('contact public et boîte de réception super-admin', async () => {
  const bad = await call('POST', '/contact', { name: 'X', email: 'pas-un-email', message: 'Bonjour' });
  assert.equal(bad.status, 400);
  const ok = await call('POST', '/contact', { name: 'Fatou', email: 'fatou@prospect.sn', message: 'Je veux une démo', company: 'Prospect SARL', country: 'CI' });
  assert.equal(ok.status, 201);

  const sa = (await call('POST', '/auth/login', { email: 'sa@gspme.sn', password: 'motdepasse1' })).body.token;
  const owner = (await register('inbox')).body.token;
  assert.equal((await call('GET', '/admin/inquiries')).status, 403);
  assert.equal((await call('GET', '/admin/inquiries', undefined, owner)).status, 403);

  const list = (await call('GET', '/admin/inquiries', undefined, sa)).body.inquiries;
  const mine = list.find((i: any) => i.email === 'fatou@prospect.sn');
  assert.ok(mine);
  assert.equal(mine.status, 'NOUVEAU');
  assert.equal((await call('PATCH', `/admin/inquiries/${mine.id}`, { status: 'TRAITE' }, owner)).status, 403);
  assert.equal((await call('PATCH', `/admin/inquiries/${mine.id}`, { status: 'N_IMPORTE_QUOI' }, sa)).status, 400);
  assert.equal((await call('PATCH', `/admin/inquiries/${mine.id}`, { status: 'TRAITE' }, sa)).status, 200);
  const after = (await call('GET', '/admin/inquiries', undefined, sa)).body.inquiries.find((i: any) => i.id === mine.id);
  assert.equal(after.status, 'TRAITE');
});

test('super-admin : changement de formule et réactivation', async () => {
  const sa = (await call('POST', '/auth/login', { email: 'sa@gspme.sn', password: 'motdepasse1' })).body.token;
  const owner = (await register('plan')).body.token;
  const tid = (await call('GET', '/auth/me', undefined, owner)).body.tenant.id;
  const r = await call('PATCH', `/admin/tenants/${tid}`, { subscriptionPlan: 'BUSINESS', subscriptionStatus: 'ACTIVE', maxUsers: 15, monthlySubscriptionAmount: 7500 }, sa);
  assert.equal(r.status, 200);
  const me = (await call('GET', '/auth/me', undefined, owner)).body.tenant;
  assert.equal(me.subscriptionPlan, 'BUSINESS');
  assert.equal(me.maxUsers, 15);
  assert.equal(me.city, 'Dakar');   // le reste de la fiche n'est pas écrasé
  assert.equal((await call('PATCH', '/admin/tenants/tenant-inconnu', { maxUsers: 3 }, sa)).status, 404);
  assert.equal((await call('PATCH', `/admin/tenants/${tid}`, { maxUsers: -4 }, sa)).status, 400);
});
