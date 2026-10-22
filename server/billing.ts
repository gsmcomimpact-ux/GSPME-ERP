/**
 * GSPME SaaS - Facturation des abonnements via Chariow.
 *  - POST /api/billing/checkout  : démarre un paiement et renvoie l'URL de paiement Chariow
 *  - GET  /api/billing/payments  : historique des paiements de l'entreprise
 *  - POST /api/webhooks/chariow  : confirmation signée (Pulse « successful.sale ») → activation de la formule
 *  - runExpiry()                 : passage en retard de paiement puis retour à la formule gratuite
 */
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { all, one, run, transaction } from './db.ts';
import type { AuthedRequest } from './auth.ts';
import {
  ChariowError, chariowConfig, createCheckout, isBillingEnabled, productIdFor, verifySignature,
} from './chariow.ts';
import { PLAN_CATALOG, addPeriod, isCycle, isPaidPlan, priceOf, type Cycle, type PaidPlanId } from '../shared/plans.ts';

type Row = Record<string, unknown>;
type PaymentRow = {
  id: string; tenant_id: string; user_email: string; plan: string; cycle: string; amount: number; currency: string;
  status: string; chariow_sale_id: string | null; note: string | null; created_at: string; paid_at: string | null;
};
type UserRow = { id: string; tenant_id: string; name: string; email: string; role: string; active: number };

/** Jours de grâce après l'échéance avant le retour à la formule gratuite. */
export const GRACE_DAYS = 5;
const DIAL_CODES: Record<string, string> = { SN: '221', CI: '225', CM: '237', ML: '223', BJ: '229', BF: '226', NE: '227', TG: '228', GN: '224' };

const getTenant = async (id: string): Promise<Row | null> => {
  const r = await one<{ data: string }>('SELECT data FROM tenants WHERE id = ?', [id]);
  return r ? JSON.parse(r.data) : null;
};
const saveTenant = (id: string, data: Row, q?: Parameters<typeof run>[2]) =>
  run('UPDATE tenants SET data = ? WHERE id = ?', [JSON.stringify(data), id], q);

const toPublic = (p: PaymentRow) => ({
  id: p.id, tenantId: p.tenant_id, plan: p.plan, cycle: p.cycle, amount: p.amount, currency: p.currency,
  status: p.status, note: p.note || '', createdAt: p.created_at, paidAt: p.paid_at,
});

// --------------------------------------------------------------------------- Démarrage d'un paiement

export async function startCheckout(req: Request, res: Response) {
  const { auth } = req as AuthedRequest;
  const user = await one<UserRow>('SELECT * FROM users WHERE id = ?', [auth.sub]);
  if (!user || !user.active) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (user.role !== 'DIRECTEUR_GENERAL') { res.status(403).json({ error: 'Seule la direction peut souscrire un abonnement' }); return; }
  if (!isBillingEnabled()) { res.status(503).json({ error: "Le paiement en ligne n'est pas encore activé sur cette plateforme." }); return; }

  const plan = req.body?.plan;
  const cycle = req.body?.cycle;
  if (!isPaidPlan(plan) || !isCycle(cycle)) { res.status(400).json({ error: 'Formule ou cycle invalide' }); return; }
  const productId = productIdFor(plan, cycle);
  if (!productId) { res.status(503).json({ error: `Paiement non configuré pour la formule ${PLAN_CATALOG[plan].name} (${cycle.toLowerCase()}).` }); return; }

  const tenant = await getTenant(user.tenant_id);
  if (!tenant) { res.status(404).json({ error: 'Entreprise introuvable' }); return; }
  const country = String(tenant.countryCode || 'SN');
  let digits = String(req.body?.phone ?? tenant.phone ?? '').replace(/\D/g, '').replace(/^00/, '');
  const dial = DIAL_CODES[country];
  if (dial && digits.startsWith(dial) && digits.length > dial.length + 5) digits = digits.slice(dial.length);
  if (digits.length < 6 || digits.length > 15) { res.status(400).json({ error: 'Numéro de téléphone valide requis pour le paiement' }); return; }

  const amount = priceOf(plan, cycle);
  const paymentId = `pay-${randomUUID()}`;
  await run('INSERT INTO payments (id, tenant_id, user_email, plan, cycle, amount, currency) VALUES (?,?,?,?,?,?,?)',
    [paymentId, user.tenant_id, user.email, plan, cycle, amount, 'XOF']);

  const [first, ...rest] = user.name.trim().split(/\s+/);
  const { appUrl } = chariowConfig();
  const origin = appUrl || `${req.protocol}://${req.get('host')}`;
  try {
    const result = await createCheckout({
      productId, email: user.email, firstName: first || 'Client', lastName: rest.join(' ') || first || 'GSPME',
      phoneNumber: digits, countryCode: country,
      redirectUrl: `${origin}/?paiement=retour&ref=${encodeURIComponent(paymentId)}`,
      metadata: { payment_id: paymentId, tenant_id: user.tenant_id, plan, cycle },
      customerIp: req.ip,
    });
    if (result.step !== 'payment' || !result.checkoutUrl) {
      throw new ChariowError('Le paiement n\'a pas pu démarrer (réponse inattendue).', 502);
    }
    await run('UPDATE payments SET chariow_sale_id = ? WHERE id = ?', [result.saleId, paymentId]);
    res.status(201).json({ checkoutUrl: result.checkoutUrl, paymentId });
  } catch (err) {
    const e = err as ChariowError;
    await run("UPDATE payments SET status = 'FAILED', note = ? WHERE id = ?", [String(e.message).slice(0, 250), paymentId]);
    res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 502).json({ error: e.message, fields: e.fields });
  }
}

export async function listPayments(req: Request, res: Response) {
  const { auth } = req as AuthedRequest;
  const rows = await all<PaymentRow>('SELECT * FROM payments WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50', [auth.tid]);
  res.json({ payments: rows.map(toPublic) });
}

export async function adminListPayments(_req: Request, res: Response) {
  const rows = await all<PaymentRow>('SELECT * FROM payments ORDER BY created_at DESC LIMIT 300');
  const tenants = await all<{ id: string; data: string }>('SELECT id, data FROM tenants');
  const names = new Map(tenants.map(t => [t.id, String(JSON.parse(t.data).name || t.id)]));
  res.json({ payments: rows.map(p => ({ ...toPublic(p), tenantName: names.get(p.tenant_id) || p.tenant_id, email: p.user_email })) });
}

// --------------------------------------------------------------------------- Webhook Chariow (Pulse)

interface SalePayload {
  event?: string;
  sale?: { id?: string; status?: string; amount?: { value?: number; currency?: string }; custom_metadata?: Record<string, string> | null };
  product?: { id?: string };
}

/** Applique un paiement confirmé : active la formule et prolonge l'échéance. */
export async function applyPaidSubscription(payment: PaymentRow, now: Date = new Date()): Promise<void> {
  const plan = payment.plan as PaidPlanId;
  const cycle = payment.cycle as Cycle;
  const spec = PLAN_CATALOG[plan];
  const tenant = await getTenant(payment.tenant_id);
  if (!tenant) return;
  // Même formule encore valide : on prolonge à partir de l'échéance ; sinon la période démarre aujourd'hui.
  const current = typeof tenant.subscriptionExpiresAt === 'string' ? new Date(tenant.subscriptionExpiresAt) : null;
  const stillValid = current && !Number.isNaN(current.getTime()) && current > now && tenant.subscriptionPlan === plan && tenant.subscriptionStatus === 'ACTIVE';
  const expires = addPeriod(stillValid ? (current as Date) : now, cycle);
  await saveTenant(payment.tenant_id, {
    ...tenant,
    subscriptionPlan: plan,
    subscriptionStatus: 'ACTIVE',
    billingCycle: cycle,
    subscriptionExpiresAt: expires.toISOString(),
    monthlySubscriptionAmount: cycle === 'ANNUEL' ? Math.round(spec.annualPriceFCFA / 12) : spec.monthlyPriceFCFA,
    maxUsers: spec.maxUsers,
    maxStorageMB: spec.maxStorageMB,
    activeModules: spec.allowedModules,
    requestedPlan: undefined,
  });
}

async function findPayment(saleId?: string, metaId?: string): Promise<PaymentRow | undefined> {
  if (saleId) {
    const bySale = await one<PaymentRow>('SELECT * FROM payments WHERE chariow_sale_id = ?', [saleId]);
    if (bySale) return bySale;
  }
  return metaId ? one<PaymentRow>('SELECT * FROM payments WHERE id = ?', [metaId]) : undefined;
}

async function handleSale(payload: SalePayload): Promise<string> {
  const sale = payload.sale || {};
  const payment = await findPayment(sale.id, sale.custom_metadata?.payment_id);
  if (!payment) return 'ignored: vente inconnue';

  if (payload.event === 'failed.sale' || payload.event === 'abandoned.sale') {
    await run("UPDATE payments SET status = ?, chariow_sale_id = COALESCE(chariow_sale_id, ?) WHERE id = ? AND status = 'PENDING'",
      [payload.event === 'failed.sale' ? 'FAILED' : 'ABANDONED', sale.id || null, payment.id]);
    return 'recorded';
  }
  if (payment.status === 'PAID') return 'ignored: déjà payé';

  // Contrôles d'intégrité : produit et montant doivent correspondre à ce que le serveur a demandé.
  const expectedProduct = productIdFor(payment.plan as PaidPlanId, payment.cycle as Cycle);
  let anomaly = '';
  if (!expectedProduct || payload.product?.id !== expectedProduct) anomaly = 'produit inattendu';
  else if (Number(sale.amount?.value) !== payment.amount) anomaly = `montant inattendu (${sale.amount?.value} au lieu de ${payment.amount})`;
  else if ((sale.amount?.currency || 'XOF') !== payment.currency) anomaly = `devise inattendue (${sale.amount?.currency})`;
  else if (sale.status && sale.status !== 'completed') anomaly = `statut de vente « ${sale.status} »`;
  if (anomaly) {
    await run("UPDATE payments SET status = 'REVIEW', note = ?, chariow_sale_id = COALESCE(chariow_sale_id, ?) WHERE id = ? AND status <> 'PAID'",
      [`À vérifier : ${anomaly}`.slice(0, 250), sale.id || null, payment.id]);
    return `review: ${anomaly}`;
  }

  // Passage atomique à PAYÉ : une seule livraison peut activer l'abonnement
  const activated = await transaction(async conn => {
    const r = await run("UPDATE payments SET status = 'PAID', paid_at = CURRENT_TIMESTAMP, note = NULL, chariow_sale_id = COALESCE(chariow_sale_id, ?) WHERE id = ? AND status <> 'PAID'",
      [sale.id || null, payment.id], conn);
    return r.affectedRows > 0;
  });
  if (!activated) return 'ignored: déjà payé';
  await applyPaidSubscription(payment);
  return 'activated';
}

/** À monter AVANT express.json() avec express.raw() : la signature porte sur les octets bruts. */
export async function webhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const { webhookSecret } = chariowConfig();
    if (!verifySignature(raw, req.header('x-chariow-signature'), webhookSecret)) {
      res.status(401).send('Invalid signature'); return;
    }
    let payload: SalePayload;
    try { payload = JSON.parse(raw.toString('utf8')); } catch { res.status(400).send('Invalid JSON'); return; }

    const deliveryId = req.header('x-pulse-delivery-id') || `body-${raw.length}-${randomUUID()}`;
    const inserted = await run('INSERT IGNORE INTO webhook_events (delivery_id, event) VALUES (?, ?)', [deliveryId.slice(0, 100), String(payload.event || '').slice(0, 50)]);
    if (inserted.affectedRows === 0) { res.status(200).send('OK (doublon)'); return; }

    const outcome = payload.event?.endsWith('.sale') ? await handleSale(payload) : 'ignored: événement non géré';
    console.log(`[chariow] ${payload.event} ${payload.sale?.id || ''} → ${outcome}`);
    res.status(200).send('OK');
  } catch (err) { next(err); }
}

// --------------------------------------------------------------------------- Échéances

/** Essai / abonnement échu → « retard de paiement » ; après la période de grâce → formule gratuite. */
export async function runExpiry(now: Date = new Date()): Promise<number> {
  const rows = await all<{ id: string; data: string }>('SELECT id, data FROM tenants');
  let changed = 0;
  const free = PLAN_CATALOG.STARTER;
  const downgrade = (t: Row): Row => ({
    ...t, subscriptionPlan: 'STARTER', subscriptionStatus: 'ACTIVE', billingCycle: 'MENSUEL', subscriptionExpiresAt: undefined,
    monthlySubscriptionAmount: 0, maxUsers: free.maxUsers, maxStorageMB: free.maxStorageMB, activeModules: free.allowedModules,
  });
  for (const r of rows) {
    if (r.id === 'tenant-platform') continue;
    const t = JSON.parse(r.data) as Row;
    const exp = typeof t.subscriptionExpiresAt === 'string' ? new Date(t.subscriptionExpiresAt) : null;
    if (!exp || Number.isNaN(exp.getTime()) || exp > now) continue;
    const paid = isPaidPlan(t.subscriptionPlan);
    let next: Row | null = null;
    if (t.subscriptionStatus === 'TRIAL') next = downgrade(t);
    else if (paid && t.subscriptionStatus === 'ACTIVE') next = { ...t, subscriptionStatus: 'PAST_DUE' };
    else if (paid && t.subscriptionStatus === 'PAST_DUE' && exp.getTime() + GRACE_DAYS * 86_400_000 < now.getTime()) next = downgrade(t);
    if (next) { await saveTenant(r.id, next); changed++; }
  }
  return changed;
}
