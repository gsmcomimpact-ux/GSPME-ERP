/** Indicateurs du tableau de bord calculés à partir des données réelles de l'entreprise (aucune valeur fictive). */
import { Invoice, Product, Project, PurchaseInvoice, SalesOrder } from '../types';

export interface MonthPoint { key: string; label: string; sales: number; costs: number }

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Chiffre d'affaires HT et achats HT par mois, sur les `months` derniers mois (jusqu'au mois d'activité le plus récent). */
export function monthlySeries(invoices: Invoice[], purchases: PurchaseInvoice[], months = 6, now = new Date()): MonthPoint[] {
  const sales = invoices.filter(i => i.type === 'FACTURE_VENTE' && i.status !== 'ANNULEE' && i.status !== 'BROUILLON');
  const dates = [...sales.map(i => i.date), ...purchases.map(p => p.date)].filter(d => d && !Number.isNaN(new Date(d).getTime())).sort();
  if (!dates.length) return [];
  const anchor = new Date(dates[dates.length - 1]);
  const end = anchor > now ? anchor : now;
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    points.push({ key: monthKey(d), label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), sales: 0, costs: 0 });
  }
  const idx = new Map(points.map(p => [p.key, p]));
  for (const i of sales) { const p = idx.get(i.date.slice(0, 7)); if (p) p.sales += i.subtotalHT; }
  for (const c of purchases) { const p = idx.get(c.date.slice(0, 7)); if (p) p.costs += c.totalHT; }
  return points.some(p => p.sales || p.costs) ? points : [];
}

export interface DashAlert {
  id: string;
  tone: 'amber' | 'rose' | 'blue';
  tag: string;
  title: string;
  text: string;
  module: string;
  action: string;
}

export function buildAlerts(
  data: { invoices: Invoice[]; products: Product[]; salesOrders: SalesOrder[]; projects?: Project[] },
  fmt: (n: number) => string,
  today = new Date().toISOString().split('T')[0],
): DashAlert[] {
  const out: DashAlert[] = [];
  for (const i of data.invoices) {
    if (i.type === 'FACTURE_VENTE' && (i.status === 'VALIDEE' || i.status === 'PARTIELLE') && i.remainingAmount > 0 && i.dueDate && i.dueDate < today) {
      out.push({ id: `inv-${i.id}`, tone: 'amber', tag: 'Échu', title: 'Relance client', text: `Facture ${i.number} de ${i.customerName} : ${fmt(i.remainingAmount)} impayés, échéance du ${i.dueDate}.`, module: 'sales', action: 'Voir les factures →' });
    }
  }
  for (const p of data.products) {
    if (p.stockMinAlert > 0 && p.currentStock <= p.stockMinAlert) {
      out.push({ id: `stk-${p.id}`, tone: 'rose', tag: 'Alerte', title: 'Seuil critique de stock', text: `${p.name} : ${p.currentStock} en stock (seuil de sécurité : ${p.stockMinAlert}).`, module: 'inventory', action: 'Réapprovisionner →' });
    }
  }
  for (const o of data.salesOrders) {
    if (o.status === 'CONFIRMEE') {
      out.push({ id: `ord-${o.id}`, tone: 'blue', tag: 'Logistique', title: 'Commande à livrer', text: `Commande ${o.number} de ${o.customerName} confirmée, prête pour le bon de livraison.`, module: 'sales', action: 'Préparer la livraison →' });
    }
  }
  for (const pr of data.projects || []) {
    if (pr.budgetAllocated > 0 && pr.actualCost > pr.budgetAllocated) {
      out.push({ id: `bud-${pr.id}`, tone: 'rose', tag: 'Budget', title: 'Budget projet dépassé', text: `${pr.title} : ${fmt(pr.actualCost)} dépensés pour un budget de ${fmt(pr.budgetAllocated)}.`, module: 'projects', action: 'Voir le projet →' });
    }
  }
  return out;
}

export interface DashTask { id: string; title: string; project: string; dueDate: string; late: boolean }

/** Tâches de projet non terminées, en retard ou à échéance dans les 7 jours. */
export function openTasks(projects: Project[], today = new Date().toISOString().split('T')[0]): DashTask[] {
  const limit = new Date(new Date(today).getTime() + 7 * 86400000).toISOString().split('T')[0];
  const out: DashTask[] = [];
  for (const p of projects) {
    for (const t of p.tasks) {
      if (!t.completed && t.dueDate && t.dueDate <= limit) out.push({ id: `${p.id}-${t.id}`, title: t.title, project: p.title, dueDate: t.dueDate, late: t.dueDate < today });
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
