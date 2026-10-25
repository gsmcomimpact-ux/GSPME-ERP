/**
 * GSPME SaaS - Client Chariow (paiement des abonnements) : création de checkout + vérification des webhooks (Pulses).
 * Docs : https://chariow.dev/fr/guides/checkout · /fr/guides/pulses · /fr/guides/pulse-security
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { type Cycle, type PaidPlanId } from '../shared/plans.ts';

export const chariowConfig = () => ({
  apiUrl: (process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1').trim().replace(/\/+$/, ''),
  apiKey: (process.env.CHARIOW_API_KEY || '').trim(),
  webhookSecret: (process.env.CHARIOW_WEBHOOK_SECRET || '').trim(),
  appUrl: (process.env.APP_URL || '').trim().replace(/\/+$/, ''),
});

/** Pages de paiement Chariow de la boutique GSPME (publiques) : valeurs par défaut, surchargeables par variables d'environnement. */
const STORE_URL = 'https://eflaptzj.mychariow.co';
const DEFAULTS: Record<string, string> = {
  ESSENTIEL_MENSUEL: 'prd_7x83esog',
  ESSENTIEL_ANNUEL: 'prd_ikzmqpx3',
  BUSINESS_MENSUEL: 'prd_37f4qhkp',
  BUSINESS_ANNUEL: 'prd_cbq1etzr',
  PREMIUM_MENSUEL: 'prd_n51v447e',
  PREMIUM_ANNUEL: 'prd_snzlt3f6',
};

const defaultProduct = (k: string): string => (process.env.CHARIOW_NO_DEFAULTS ? '' : DEFAULTS[k] || '');

/** Identifiant Chariow (prd_…) du produit « Licence » correspondant à une formule et un cycle. */
export const productIdFor = (plan: PaidPlanId, cycle: Cycle): string =>
  (process.env[`CHARIOW_PRODUCT_${plan}_${cycle}`] || '').trim() || defaultProduct(`${plan}_${cycle}`);

/** Lien de paiement direct (page produit Chariow) : solution de repli si l'API de checkout n'est pas configurée ou en panne. */
export const linkFor = (plan: PaidPlanId, cycle: Cycle): string => {
  const v = (process.env[`CHARIOW_LINK_${plan}_${cycle}`] || '').trim().replace(/^["']|["']$/g, '');
  if (/^https:\/\//i.test(v)) return v;
  const id = defaultProduct(`${plan}_${cycle}`);
  return id ? `${STORE_URL}/${id}/checkout` : '';
};
export const hasAnyLink = (): boolean =>
  (['ESSENTIEL', 'BUSINESS', 'PREMIUM'] as PaidPlanId[]).some(p => (['MENSUEL', 'ANNUEL'] as Cycle[]).some(c => !!linkFor(p, c)));

export const isBillingEnabled = (): boolean => {
  const c = chariowConfig();
  return !!(c.apiKey && c.webhookSecret);
};

export class ChariowError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string[]>) {
    super(message);
  }
}

export interface CheckoutInput {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
  redirectUrl?: string;
  metadata: Record<string, string>;
  customerIp?: string;
}

export interface CheckoutResult {
  step: 'payment' | 'completed' | 'already_purchased' | string;
  saleId: string | null;
  checkoutUrl: string | null;
}

/** Crée une vente Chariow et renvoie l'URL de paiement hébergée. */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const { apiUrl, apiKey } = chariowConfig();
  const body: Record<string, unknown> = {
    product_id: input.productId,
    email: input.email,
    first_name: input.firstName.slice(0, 50),
    last_name: input.lastName.slice(0, 50),
    phone: { number: input.phoneNumber, country_code: input.countryCode },
    custom_metadata: input.metadata,
  };
  if (input.redirectUrl) body.redirect_url = input.redirectUrl;
  if (input.customerIp) body.customer_ip = input.customerIp;

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ChariowError('Le service de paiement est injoignable, réessayez dans un instant.', 503);
  }
  const json = (await res.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
    data?: { step?: string; purchase?: { id?: string } | null; payment?: { checkout_url?: string | null } };
  };
  if (!res.ok) {
    const friendly =
      res.status === 401 ? 'Configuration du paiement invalide (clé API).'
      : res.status === 404 ? 'Produit de paiement introuvable ou non publié.'
      : res.status === 429 ? 'Trop de tentatives, réessayez dans un instant.'
      : json.message || 'Le paiement n\'a pas pu démarrer.';
    throw new ChariowError(friendly, res.status === 422 || res.status === 400 ? 400 : 502, json.errors);
  }
  return {
    step: json.data?.step || '',
    saleId: json.data?.purchase?.id || null,
    checkoutUrl: json.data?.payment?.checkout_url || null,
  };
}

/** Vérifie `x-chariow-signature` = « sha256= » + HMAC-SHA256(corps brut, secret du Pulse), en temps constant. */
export function verifySignature(rawBody: Buffer, received: string | undefined, secret: string): boolean {
  if (!secret || !received) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
