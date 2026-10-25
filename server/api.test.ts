// Nécessite une base MySQL/MariaDB de test (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME ou DATABASE_URL).
// ATTENTION : les tables sont vidées au démarrage des tests.
process.env.GSPME_NO_LISTEN = '1';
process.env.DISABLE_RATE_LIMIT = '1';
process.env.DB_NAME ||= 'gspme_test';

import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import http from 'node:http';
import { createHmac } from 'node:crypto';

// Faux serveur Chariow (API de checkout) pour tester le paiement sans réseau
const chariowCalls: { auth?: string; body: any }[] = [];
let chariowMode: 'ok' | 'unauthorized' = 'ok';
const fakeChariow = http.createServer((req, res) => {
  let data = '';
  req.on('data', c => (data += c));
  req.on('end', () => {
    const body = data ? JSON.parse(data) : {};
    chariowCalls.push({ auth: req.headers.authorization, body });
    res.setHeader('Content-Type', 'application/json');
    if (chariowMode === 'unauthorized') { res.statusCode = 401; res.end(JSON.stringify({ message: 'Unauthorized' })); return; }
    res.end(JSON.stringify({ data: { step: 'payment', purchase: { id: `sal_${chariowCalls.length}` }, payment: { checkout_url: `https://pay.example/checkout/${chariowCalls.length}` } } }));
  });
});
await new Promise<void>(r => fakeChariow.listen(0, '127.0.0.1', r));
process.env.CHARIOW_API_URL = `http://127.0.0.1:${(fakeChariow.address() as AddressInfo).port}/v1`;
process.env.CHARIOW_API_KEY = 'sk_test_key';
process.env.CHARIOW_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.APP_URL = 'https://gspme.example';
const PRODUCTS: Record<string, string> = {
  ESSENTIEL_MENSUEL: 'prd_ess_m', ESSENTIEL_ANNUEL: 'prd_ess_a', BUSINESS_MENSUEL: 'prd_biz_m', BUSINESS_ANNUEL: 'prd_biz_a', PREMIUM_MENSUEL: 'prd_pre_m', PREMIUM_ANNUEL: 'prd_pre_a',
};
for (const [k, v] of Object.entries(PRODUCTS)) process.env[`CHARIOW_PRODUCT_${k}`] = v;

const { app, ready } = await import('./index.ts');
const { run } = await import('./db.ts');
await ready;
await run('SET FOREIGN_KEY_CHECKS = 0');
for (const t of ['webhook_events', 'payments', 'inquiries', 'files', 'records', 'users', 'tenants']) await run(`TRUNCATE TABLE ${t}`);
await run('SET FOREIGN_KEY_CHECKS = 1');
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
test.after(async () => {
  server.close();
  fakeChariow.close();
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


// ------------------------------------------------------------------ Paiement des abonnements (Chariow)
const SECRET = 'whsec_test_secret';
let deliverySeq = 0;
const webhook = async (payload: object, opts: { signature?: string; deliveryId?: string; secret?: string } = {}) => {
  const raw = JSON.stringify(payload).replace(/\//g, '\\/'); // Chariow échappe les « / »
  const signature = opts.signature ?? 'sha256=' + createHmac('sha256', opts.secret ?? SECRET).update(raw).digest('hex');
  const res = await fetch(base + '/webhooks/chariow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chariow-signature': signature, 'x-pulse-delivery-id': opts.deliveryId ?? `dlv-${++deliverySeq}` },
    body: raw,
  });
  return { status: res.status };
};
const saleEvent = (event: string, c: { paymentId: string; saleId: string; productId: string; amount: number; currency?: string }) => ({
  event,
  sale: { id: c.saleId, status: 'completed', amount: { value: c.amount, currency: c.currency || 'XOF' }, custom_metadata: { payment_id: c.paymentId } },
  product: { id: c.productId },
  customer: { email: 'x@test.sn' },
});
const registerCI = async (n: string) => {
  const r = await call('POST', '/auth/register', { companyName: `Pay ${n}`, name: `Awa Diop ${n}`, email: `${n}@pay.sn`, password: 'motdepasse1', countryCode: 'CI', phone: '+225 07 12 34 56 78' });
  const me = (await call('GET', '/auth/me', undefined, r.body.token)).body;
  return { token: r.body.token as string, tid: me.tenant.id as string };
};
const tenantOf = async (token: string) => (await call('GET', '/auth/me', undefined, token)).body.tenant;
const startPay = async (token: string, plan: string, cycle: string, phone?: string) => {
  const r = await call('POST', '/billing/checkout', { plan, cycle, phone }, token);
  const { all: q } = await import('./db.ts');
  const row = r.status === 201 ? (await q<any>('SELECT * FROM payments WHERE id = ?', [r.body.paymentId]))[0] : undefined;
  return { r, row };
};

test('paiement : démarrage du checkout Chariow (contrôles et requête envoyée)', async () => {
  const { token } = await registerCI('co1');
  assert.equal((await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'MENSUEL' })).status, 401);
  assert.equal((await call('POST', '/billing/checkout', { plan: 'STARTER', cycle: 'MENSUEL' }, token)).status, 400);
  assert.equal((await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'TRIMESTRIEL' }, token)).status, 400);
  assert.equal((await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'MENSUEL', phone: '12' }, token)).status, 400);

  const before = chariowCalls.length;
  const { r, row } = await startPay(token, 'BUSINESS', 'MENSUEL', '+225 07 12 34 56 78');
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.checkoutUrl, /^https:\/\/pay\.example\/checkout\//);
  assert.equal(chariowCalls.length, before + 1);
  const sent = chariowCalls[chariowCalls.length - 1];
  assert.equal(sent.auth, 'Bearer sk_test_key');
  assert.equal(sent.body.product_id, 'prd_biz_m');
  assert.equal(sent.body.email, 'co1@pay.sn');
  assert.deepEqual(sent.body.phone, { number: '0712345678', country_code: 'CI' }); // indicatif retiré
  assert.equal(sent.body.custom_metadata.payment_id, r.body.paymentId);
  assert.equal(sent.body.custom_metadata.plan, 'BUSINESS');
  assert.match(sent.body.redirect_url, /^https:\/\/gspme\.example\/\?paiement=retour/);
  assert.equal(row.amount, 7500);
  assert.equal(row.status, 'PENDING');
  assert.equal(row.chariow_sale_id, `sal_${chariowCalls.length}`);

  // historique de l'entreprise
  const hist = (await call('GET', '/billing/payments', undefined, token)).body.payments;
  assert.equal(hist.length, 1);

  // un utilisateur non-dirigeant ne peut pas payer
  await call('POST', '/users', { name: 'Compta', email: 'compta@co1.sn', password: 'motdepasse1', role: 'RESPONSABLE_FINANCIER' }, token);
  const cTok = (await call('POST', '/auth/login', { email: 'compta@co1.sn', password: 'motdepasse1' })).body.token;
  assert.equal((await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'MENSUEL' }, cTok)).status, 403);
});

test('paiement : erreurs Chariow et paiement non configuré', async () => {
  const { token } = await registerCI('co2');
  chariowMode = 'unauthorized';
  const bad = await call('POST', '/billing/checkout', { plan: 'PREMIUM', cycle: 'ANNUEL' }, token);
  chariowMode = 'ok';
  assert.equal(bad.status, 502);
  const { all: q } = await import('./db.ts');
  assert.equal((await q<any>("SELECT status FROM payments WHERE user_email = 'co2@pay.sn'"))[0].status, 'FAILED');

  const saved = process.env.CHARIOW_PRODUCT_PREMIUM_MENSUEL;
  delete process.env.CHARIOW_PRODUCT_PREMIUM_MENSUEL;
  assert.equal((await call('POST', '/billing/checkout', { plan: 'PREMIUM', cycle: 'MENSUEL' }, token)).status, 503);
  process.env.CHARIOW_PRODUCT_PREMIUM_MENSUEL = saved;
  const savedKey = process.env.CHARIOW_API_KEY;
  delete process.env.CHARIOW_API_KEY;
  assert.equal((await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'MENSUEL' }, token)).status, 503);
  assert.equal((await (await fetch(base + '/health')).json()).billing, false);
  process.env.CHARIOW_API_KEY = savedKey;
  assert.equal((await (await fetch(base + '/health')).json()).billing, true);
});

test('paiement : lien direct Chariow en repli (API absente ou en erreur)', async () => {
  const { token } = await registerCI('co3');
  process.env.CHARIOW_LINK_BUSINESS_MENSUEL = 'https://boutique.example/prd_direct';
  // 1) API en erreur 401 -> repli sur le lien direct
  chariowMode = 'unauthorized';
  let r = await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'MENSUEL' }, token);
  chariowMode = 'ok';
  assert.equal(r.status, 201);
  assert.equal(r.body.checkoutUrl, 'https://boutique.example/prd_direct');
  assert.equal(r.body.manual, true);
  // 2) pas de clé API du tout -> le lien direct reste utilisable
  const savedKey = process.env.CHARIOW_API_KEY;
  delete process.env.CHARIOW_API_KEY;
  r = await call('POST', '/billing/checkout', { plan: 'BUSINESS', cycle: 'MENSUEL' }, token);
  assert.equal(r.status, 201);
  const health = await (await fetch(base + '/health')).json();
  assert.equal(health.billing, true);
  assert.equal(health.billingMode, 'liens');
  assert.deepEqual(health.billingMissing, ['CHARIOW_API_KEY']);
  // 3) formule sans lien ni clé -> refus clair
  assert.equal((await call('POST', '/billing/checkout', { plan: 'PREMIUM', cycle: 'MENSUEL' }, token)).status, 503);
  process.env.CHARIOW_API_KEY = savedKey;
  delete process.env.CHARIOW_LINK_BUSINESS_MENSUEL;
});

test('webhook : signature obligatoire, activation, doublon et renouvellement', async () => {
  const { token } = await registerCI('wh1');
  const { r, row } = await startPay(token, 'BUSINESS', 'MENSUEL');
  const ev = saleEvent('successful.sale', { paymentId: r.body.paymentId, saleId: row.chariow_sale_id, productId: 'prd_biz_m', amount: 7500 });

  assert.equal((await webhook(ev, { signature: 'sha256=' + '0'.repeat(64) })).status, 401);
  assert.equal((await webhook(ev, { secret: 'whsec_autre' })).status, 401);
  assert.equal((await webhook(ev, { signature: '' })).status, 401);
  assert.equal((await tenantOf(token)).subscriptionPlan, 'STARTER', 'rien n\'est activé sans signature valide');

  assert.equal((await webhook(ev, { deliveryId: 'dlv-activation' })).status, 200);
  let t = await tenantOf(token);
  assert.equal(t.subscriptionPlan, 'BUSINESS');
  assert.equal(t.subscriptionStatus, 'ACTIVE');
  assert.equal(t.maxUsers, 15);
  assert.equal(t.monthlySubscriptionAmount, 7500);
  const firstExpiry = new Date(t.subscriptionExpiresAt);
  const days = (firstExpiry.getTime() - Date.now()) / 86_400_000;
  assert.ok(days > 27 && days < 32, `échéance dans ~1 mois (${days.toFixed(1)} j)`);
  assert.equal((await q1(r.body.paymentId)).status, 'PAID');

  // même livraison rejouée, puis même vente avec une nouvelle livraison : aucune prolongation
  assert.equal((await webhook(ev, { deliveryId: 'dlv-activation' })).status, 200);
  assert.equal((await webhook(ev)).status, 200);
  assert.equal((await tenantOf(token)).subscriptionExpiresAt, t.subscriptionExpiresAt);

  // renouvellement de la même formule : prolongation à partir de l'échéance
  const p2 = await startPay(token, 'BUSINESS', 'MENSUEL');
  await webhook(saleEvent('successful.sale', { paymentId: p2.r.body.paymentId, saleId: p2.row.chariow_sale_id, productId: 'prd_biz_m', amount: 7500 }));
  t = await tenantOf(token);
  const secondExpiry = new Date(t.subscriptionExpiresAt);
  const gap = (secondExpiry.getTime() - firstExpiry.getTime()) / 86_400_000;
  assert.ok(gap > 27 && gap < 32, `+1 mois cumulé (${gap.toFixed(1)} j)`);

  // changement de formule : la nouvelle période repart d'aujourd'hui
  const p3 = await startPay(token, 'PREMIUM', 'ANNUEL');
  await webhook(saleEvent('successful.sale', { paymentId: p3.r.body.paymentId, saleId: p3.row.chariow_sale_id, productId: 'prd_pre_a', amount: 100000 }));
  t = await tenantOf(token);
  assert.equal(t.subscriptionPlan, 'PREMIUM');
  assert.equal(t.billingCycle, 'ANNUEL');
  assert.equal(t.maxUsers, 50);
  assert.equal(t.monthlySubscriptionAmount, Math.round(100000 / 12));
  const yearDays = (new Date(t.subscriptionExpiresAt).getTime() - Date.now()) / 86_400_000;
  assert.ok(yearDays > 360 && yearDays < 370);
});

async function q1(id: string) {
  const { all: q } = await import('./db.ts');
  return (await q<any>('SELECT * FROM payments WHERE id = ?', [id]))[0];
}

test('webhook : montant ou produit inattendu, vente inconnue, échec et abandon', async () => {
  const { token } = await registerCI('wh2');
  const a = await startPay(token, 'ESSENTIEL', 'MENSUEL');
  // montant falsifié (paiement partiel / mauvais produit)
  await webhook(saleEvent('successful.sale', { paymentId: a.r.body.paymentId, saleId: a.row.chariow_sale_id, productId: 'prd_ess_m', amount: 100 }));
  assert.equal((await q1(a.r.body.paymentId)).status, 'REVIEW');
  assert.match((await q1(a.r.body.paymentId)).note, /montant inattendu/);
  assert.equal((await tenantOf(token)).subscriptionPlan, 'STARTER');

  const b = await startPay(token, 'ESSENTIEL', 'ANNUEL');
  await webhook(saleEvent('successful.sale', { paymentId: b.r.body.paymentId, saleId: b.row.chariow_sale_id, productId: 'prd_pre_a', amount: 50000 }));
  assert.match((await q1(b.r.body.paymentId)).note, /produit inattendu/);

  const c = await startPay(token, 'BUSINESS', 'MENSUEL');
  await webhook(saleEvent('successful.sale', { paymentId: c.r.body.paymentId, saleId: c.row.chariow_sale_id, productId: 'prd_biz_m', amount: 7500, currency: 'EUR' }));
  assert.match((await q1(c.r.body.paymentId)).note, /devise/);

  // vente d'un autre produit de la boutique : ignorée sans erreur
  assert.equal((await webhook(saleEvent('successful.sale', { paymentId: 'pay-inconnu', saleId: 'sal_autre', productId: 'prd_livre', amount: 9000 }))).status, 200);
  assert.equal((await tenantOf(token)).subscriptionPlan, 'STARTER');

  const d = await startPay(token, 'PREMIUM', 'MENSUEL');
  await webhook(saleEvent('failed.sale', { paymentId: d.r.body.paymentId, saleId: d.row.chariow_sale_id, productId: 'prd_pre_m', amount: 10000 }));
  assert.equal((await q1(d.r.body.paymentId)).status, 'FAILED');
  const e = await startPay(token, 'PREMIUM', 'MENSUEL');
  await webhook(saleEvent('abandoned.sale', { paymentId: e.r.body.paymentId, saleId: e.row.chariow_sale_id, productId: 'prd_pre_m', amount: 10000 }));
  assert.equal((await q1(e.r.body.paymentId)).status, 'ABANDONED');

  // un paiement « échoué » puis finalement réglé reste activable
  await webhook(saleEvent('successful.sale', { paymentId: d.r.body.paymentId, saleId: d.row.chariow_sale_id, productId: 'prd_pre_m', amount: 10000 }));
  assert.equal((await tenantOf(token)).subscriptionPlan, 'PREMIUM');
});

test('échéances : retard de paiement, période de grâce, fin d\'essai', async () => {
  const { runExpiry, GRACE_DAYS } = await import('./billing.ts');
  const { run: sql } = await import('./db.ts');
  const { token, tid } = await registerCI('ex1');
  const p = await startPay(token, 'ESSENTIEL', 'MENSUEL');
  await webhook(saleEvent('successful.sale', { paymentId: p.r.body.paymentId, saleId: p.row.chariow_sale_id, productId: 'prd_ess_m', amount: 5000 }));
  const setExpiry = async (daysAgo: number) => {
    const t = await tenantOf(token);
    const iso = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    await sql('UPDATE tenants SET data = ? WHERE id = ?', [JSON.stringify({ ...t, subscriptionExpiresAt: iso }), tid]);
  };

  await runExpiry();
  assert.equal((await tenantOf(token)).subscriptionStatus, 'ACTIVE', 'abonnement en cours : inchangé');
  await setExpiry(1);
  await runExpiry();
  let t = await tenantOf(token);
  assert.equal(t.subscriptionStatus, 'PAST_DUE');
  assert.equal(t.subscriptionPlan, 'ESSENTIEL');
  assert.equal((await call('GET', '/sync', undefined, token)).status, 200, 'toujours connecté pendant la grâce');
  await setExpiry(GRACE_DAYS + 1);
  await runExpiry();
  t = await tenantOf(token);
  assert.equal(t.subscriptionPlan, 'STARTER');
  assert.equal(t.subscriptionStatus, 'ACTIVE');
  assert.equal(t.maxUsers, 2);
  assert.equal(t.subscriptionExpiresAt, undefined);

  // fin d'essai gratuit
  const trial = await registerCI('ex2');
  const tt = await tenantOf(trial.token);
  assert.equal(tt.subscriptionStatus, 'TRIAL');
  await sql('UPDATE tenants SET data = ? WHERE id = ?', [JSON.stringify({ ...tt, subscriptionExpiresAt: new Date(Date.now() - 86_400_000).toISOString() }), trial.tid]);
  await runExpiry();
  assert.equal((await tenantOf(trial.token)).subscriptionStatus, 'ACTIVE');
  assert.equal((await tenantOf(trial.token)).subscriptionPlan, 'STARTER');
});

test('paiements : liste globale réservée au super-admin', async () => {
  const sa = (await call('POST', '/auth/login', { email: 'sa@gspme.sn', password: 'motdepasse1' })).body.token;
  const owner = (await registerCI('ad1')).token;
  assert.equal((await call('GET', '/admin/payments', undefined, owner)).status, 403);
  const list = (await call('GET', '/admin/payments', undefined, sa)).body.payments;
  assert.ok(list.length > 3);
  assert.ok(list.every((p: any) => p.tenantName && p.status));
});

// ------------------------------------------------------------------ Archivage de fichiers (GED)
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const upload = async (token: string, name: string, body: Buffer | string, level = 'PUBLIC_ENTREPRISE') => {
  const res = await fetch(base + '/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'x-file-name': encodeURIComponent(name), 'x-security-level': level },
    body: body as any,
  });
  return { status: res.status, body: (await res.json()) as any };
};
const getFile = async (token: string | undefined, id: string, query = '') => {
  const res = await fetch(`${base}/files/${id}${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
};

test('GED : dépôt, empreinte, téléchargement et en-têtes de sécurité', async () => {
  const { token } = await registerCI('ged1');
  const up = await upload(token, 'Contrat client é.pdf', PDF);
  assert.equal(up.status, 201);
  assert.equal(up.body.size, PDF.length);
  assert.equal(up.body.mime, 'application/pdf');
  const { createHash } = await import('node:crypto');
  assert.equal(up.body.sha256, createHash('sha256').update(PDF).digest('hex'));

  const dl = await getFile(token, up.body.id);
  assert.equal(dl.status, 200);
  assert.deepEqual(dl.buf, PDF);
  assert.match(dl.headers.get('content-disposition') || '', /^attachment; filename\*=UTF-8''Contrat%20client%20%C3%A9\.pdf/);
  assert.equal(dl.headers.get('x-content-type-options'), 'nosniff');
  assert.match(dl.headers.get('content-security-policy') || '', /sandbox/);
  const inline = await getFile(token, up.body.id, '?inline=1');
  assert.match(inline.headers.get('content-disposition') || '', /^inline/);

  assert.equal((await getFile(undefined, up.body.id)).status, 401);
  assert.equal((await getFile(token, 'file-inexistant')).status, 404);
  const usage = (await call('GET', '/files-usage', undefined, token)).body;
  assert.equal(usage.usedBytes, PDF.length);
  assert.equal(usage.count, 1);
});

test('GED : types et contenus refusés', async () => {
  const { token } = await registerCI('ged2');
  assert.equal((await upload(token, 'virus.exe', Buffer.from('MZ....'))).status, 400);
  assert.equal((await upload(token, 'page.html', Buffer.from('<script>alert(1)</script>'))).status, 400);
  assert.equal((await upload(token, 'logo.svg', Buffer.from('<svg onload=alert(1)/>'))).status, 400);
  assert.equal((await upload(token, 'faux.pdf', Buffer.from('MZ ceci est un exécutable'))).status, 400); // extension ≠ contenu
  assert.equal((await upload(token, 'binaire.txt', Buffer.from([0x68, 0x00, 0x69]))).status, 400);
  assert.equal((await upload(token, 'vide.pdf', Buffer.alloc(0))).status, 400);
  assert.equal((await upload(token, 'photo.png', PNG)).status, 201);
  assert.equal((await upload(token, 'notes.txt', 'Compte rendu de réunion')).status, 201);
  // trop gros : 8 Mo + 1
  const big = Buffer.concat([PDF, Buffer.alloc(8 * 1024 * 1024)]);
  assert.equal((await upload(token, 'enorme.pdf', big)).status, 413);
  assert.equal((await upload(token, 'x.pdf', PDF, 'NIVEAU_INCONNU')).status, 400);
});

test('GED : isolation entre entreprises et niveaux de confidentialité par rôle', async () => {
  const a = await registerCI('ged3a');
  const b = await registerCI('ged3b');
  const secret = await upload(a.token, 'salaires.pdf', PDF, 'DIRECTION_SEULEMENT');
  const daf = await upload(a.token, 'bilan.pdf', PDF, 'CONFIDENTIEL_DAF');
  const pub = await upload(a.token, 'reglement.pdf', PDF, 'PUBLIC_ENTREPRISE');
  assert.equal(secret.status, 201);

  // une autre entreprise ne voit rien
  assert.equal((await getFile(b.token, pub.body.id)).status, 404);
  assert.equal((await call('DELETE', `/files/${pub.body.id}`, undefined, b.token)).status, 404);

  // collaborateurs de l'entreprise A
  const mk = async (email: string, role: string) => {
    await call('POST', '/users', { name: role, email, password: 'motdepasse1', role }, a.token);
    return (await call('POST', '/auth/login', { email, password: 'motdepasse1' })).body.token as string;
  };
  const commercial = await mk('com@ged3a.sn', 'COMMERCIAL_VENTES');
  const financier = await mk('daf@ged3a.sn', 'RESPONSABLE_FINANCIER');
  const auditeur = await mk('aud@ged3a.sn', 'AUDITEUR_EXTERNE');

  assert.equal((await getFile(commercial, pub.body.id)).status, 200);
  assert.equal((await getFile(commercial, daf.body.id)).status, 403);
  assert.equal((await getFile(commercial, secret.body.id)).status, 403);
  assert.equal((await getFile(financier, daf.body.id)).status, 200);
  assert.equal((await getFile(financier, secret.body.id)).status, 403);
  assert.equal((await getFile(auditeur, daf.body.id)).status, 200);
  assert.equal((await getFile(auditeur, secret.body.id)).status, 403);
  assert.equal((await getFile(a.token, secret.body.id)).status, 200);

  // dépôt : pas au-dessus de son niveau ; auditeur en lecture seule
  assert.equal((await upload(commercial, 'x.pdf', PDF, 'DIRECTION_SEULEMENT')).status, 403);
  assert.equal((await upload(commercial, 'ok.pdf', PDF)).status, 201);
  assert.equal((await upload(auditeur, 'x.pdf', PDF)).status, 403);
  assert.equal((await call('DELETE', `/files/${pub.body.id}`, undefined, auditeur)).status, 403);

  // suppression : l'auteur ou la direction seulement
  assert.equal((await call('DELETE', `/files/${pub.body.id}`, undefined, commercial)).status, 403, 'un collaborateur ne supprime pas le dépôt de la direction');
  const mine = await upload(commercial, 'mien.pdf', PDF);
  assert.equal((await call('DELETE', `/files/${mine.body.id}`, undefined, commercial)).status, 200);
  assert.equal((await getFile(commercial, mine.body.id)).status, 404);
  assert.equal((await call('DELETE', `/files/${pub.body.id}`, undefined, a.token)).status, 200);
});

test('GED : quota de stockage de la formule', async () => {
  const { token, tid } = await registerCI('ged4');
  const { run: sql } = await import('./db.ts');
  const t = await tenantOf(token);
  // quota artificiel de ~1 Mo
  await sql('UPDATE tenants SET data = ? WHERE id = ?', [JSON.stringify({ ...t, maxStorageMB: 1 }), tid]);
  const half = Buffer.concat([PDF, Buffer.alloc(600 * 1024)]);
  assert.equal((await upload(token, 'a.pdf', half)).status, 201);
  const refused = await upload(token, 'b.pdf', half);
  assert.equal(refused.status, 413);
  assert.match(refused.body.error, /stockage|Espace/i);
  const usage = (await call('GET', '/files-usage', undefined, token)).body;
  assert.equal(usage.quotaBytes, 1024 * 1024);
  assert.ok(usage.usedBytes > 600 * 1024);
});
