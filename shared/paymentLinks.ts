import type { Cycle, PaidPlanId } from './plans.ts';

/** Pages de paiement Chariow de la boutique GSPME (publiques, sans secret). Le client est dirigé vers Chariow pour payer. */
export const CHARIOW_STORE_URL = 'https://eflaptzj.mychariow.co';

export const CHARIOW_PRODUCTS: Record<`${PaidPlanId}_${Cycle}`, string> = {
  ESSENTIEL_MENSUEL: 'prd_7x83esog',
  ESSENTIEL_ANNUEL: 'prd_ikzmqpx3',
  BUSINESS_MENSUEL: 'prd_37f4qhkp',
  BUSINESS_ANNUEL: 'prd_cbq1etzr',
  PREMIUM_MENSUEL: 'prd_n51v447e',
  PREMIUM_ANNUEL: 'prd_snzlt3f6',
};

export const checkoutLinkFor = (plan: PaidPlanId, cycle: Cycle): string =>
  `${CHARIOW_STORE_URL}/${CHARIOW_PRODUCTS[`${plan}_${cycle}`]}/checkout`;
