/**
 * GSPME - Catalogue des formules (source de vérité des prix et limites côté serveur).
 * Un test vérifie qu'il reste identique aux offres affichées dans l'interface.
 */
export type PaidPlanId = 'ESSENTIEL' | 'BUSINESS' | 'PREMIUM';
export type PlanId = 'STARTER' | PaidPlanId;
export type Cycle = 'MENSUEL' | 'ANNUEL';

export interface PlanSpec {
  id: PlanId;
  name: string;
  monthlyPriceFCFA: number;
  annualPriceFCFA: number;
  maxUsers: number;
  maxStorageMB: number;
  allowedModules: string[];
}

export const PLAN_CATALOG: Record<PlanId, PlanSpec> = {
  STARTER: {
    id: 'STARTER', name: 'Gratuit', monthlyPriceFCFA: 0, annualPriceFCFA: 0, maxUsers: 2, maxStorageMB: 5120,
    allowedModules: ['dashboard', 'crm', 'sales', 'pos', 'treasury'],
  },
  ESSENTIEL: {
    id: 'ESSENTIEL', name: 'Essentiel', monthlyPriceFCFA: 5000, annualPriceFCFA: 50000, maxUsers: 5, maxStorageMB: 10240,
    allowedModules: ['dashboard', 'crm', 'sales', 'purchases', 'inventory', 'pos', 'treasury'],
  },
  BUSINESS: {
    id: 'BUSINESS', name: 'Business', monthlyPriceFCFA: 7500, annualPriceFCFA: 75000, maxUsers: 15, maxStorageMB: 51200,
    allowedModules: ['dashboard', 'crm', 'sales', 'purchases', 'inventory', 'pos', 'treasury', 'accounting', 'tax', 'payroll', 'projects'],
  },
  PREMIUM: {
    id: 'PREMIUM', name: 'Premium', monthlyPriceFCFA: 10000, annualPriceFCFA: 100000, maxUsers: 50, maxStorageMB: 102400,
    allowedModules: ['dashboard', 'crm', 'sales', 'purchases', 'inventory', 'pos', 'treasury', 'accounting', 'tax', 'payroll', 'assets', 'projects', 'documents', 'bi', 'ai'],
  },
};

export const PAID_PLANS: PaidPlanId[] = ['ESSENTIEL', 'BUSINESS', 'PREMIUM'];
export const CYCLES: Cycle[] = ['MENSUEL', 'ANNUEL'];

export const isPaidPlan = (v: unknown): v is PaidPlanId => PAID_PLANS.includes(v as PaidPlanId);
export const isCycle = (v: unknown): v is Cycle => CYCLES.includes(v as Cycle);

export const priceOf = (plan: PaidPlanId, cycle: Cycle): number =>
  cycle === 'ANNUEL' ? PLAN_CATALOG[plan].annualPriceFCFA : PLAN_CATALOG[plan].monthlyPriceFCFA;

/** Nouvelle échéance : on ajoute 1 mois ou 12 mois à `from` (mois civils, jour conservé quand possible). */
export function addPeriod(from: Date, cycle: Cycle): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + (cycle === 'ANNUEL' ? 12 : 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
