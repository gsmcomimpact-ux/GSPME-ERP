/**
 * Assistant de gestion : contexte chiffré construit à partir des données réelles de l'entreprise
 * et moteur de réponses intégré (sans IA générative, sans aucun chiffre inventé).
 */
import { Customer, Invoice, Product, Project, PurchaseInvoice, Tenant, TreasuryAccount } from '../types';
import { buildAlerts, openTasks } from './dashboardInsights';

export interface AssistantData {
  tenant: Tenant;
  invoices: Invoice[];
  purchases?: PurchaseInvoice[];
  products: Product[];
  treasuryAccounts: TreasuryAccount[];
  customers: Customer[];
  projects?: Project[];
}

type Fmt = (n: number) => string;
const today = () => new Date().toISOString().split('T')[0];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function facts(d: AssistantData) {
  const sales = d.invoices.filter(i => i.type === 'FACTURE_VENTE' && i.status !== 'ANNULEE' && i.status !== 'BROUILLON');
  const t = today();
  const unpaid = sales.filter(i => i.remainingAmount > 0);
  const overdue = unpaid.filter(i => i.dueDate && i.dueDate < t).sort((a, b) => b.remainingAmount - a.remainingAmount);
  return {
    sales,
    revenueHT: sales.reduce((n, i) => n + i.subtotalHT, 0),
    revenueTTC: sales.reduce((n, i) => n + i.totalTTC, 0),
    collected: sales.reduce((n, i) => n + i.paidAmount, 0),
    outstanding: unpaid.reduce((n, i) => n + i.remainingAmount, 0),
    unpaid,
    overdue,
    cash: d.treasuryAccounts.reduce((n, a) => n + a.balance, 0),
    purchasesHT: (d.purchases || []).reduce((n, p) => n + p.totalHT, 0),
    lowStock: d.products.filter(p => p.stockMinAlert > 0 && p.currentStock <= p.stockMinAlert),
  };
}

/** Synthèse chiffrée transmise à l'IA : uniquement des données de l'entreprise connectée. */
export function buildContext(d: AssistantData, fmt: Fmt): string {
  const f = facts(d);
  const L: string[] = [];
  L.push(`Entreprise : ${d.tenant.name} (${d.tenant.legalForm}, ${d.tenant.city}, pays ${d.tenant.countryCode}, devise ${d.tenant.currency}). Date du jour : ${today()}.`);
  L.push(`Ventes : ${f.sales.length} facture(s), CA HT ${fmt(f.revenueHT)}, TTC ${fmt(f.revenueTTC)}, encaissé ${fmt(f.collected)}, reste à encaisser ${fmt(f.outstanding)}.`);
  L.push(`Achats HT cumulés : ${fmt(f.purchasesHT)}.`);
  L.push(`Trésorerie totale : ${fmt(f.cash)}. Comptes : ${d.treasuryAccounts.map(a => `${a.name} ${fmt(a.balance)}`).join(' ; ') || 'aucun'}.`);
  L.push(`Factures échues impayées (${f.overdue.length}) : ${f.overdue.slice(0, 10).map(i => `${i.number} ${i.customerName} ${fmt(i.remainingAmount)} (échéance ${i.dueDate})`).join(' ; ') || 'aucune'}.`);
  L.push(`Clients : ${d.customers.length}. Produits : ${d.products.length}. Sous le seuil de stock (${f.lowStock.length}) : ${f.lowStock.slice(0, 10).map(p => `${p.name} ${p.currentStock}/${p.stockMinAlert}`).join(' ; ') || 'aucun'}.`);
  const pr = d.projects || [];
  L.push(`Projets (${pr.length}) : ${pr.slice(0, 10).map(p => `${p.title} budget ${fmt(p.budgetAllocated)} dépensé ${fmt(p.actualCost)} avancement ${p.progressPercent}%`).join(' ; ') || 'aucun'}.`);
  return L.join('\n').slice(0, 9000);
}

export const SUGGESTIONS = [
  'Quelle est la situation de ma trésorerie ?',
  'Quelles factures sont impayées ?',
  'Quels articles risquent la rupture de stock ?',
  'Où en sont mes projets et leurs budgets ?',
  'Donne-moi un résumé de mon activité',
];

/** Réponse du moteur intégré (utilisé sans clé IA ou en cas d'indisponibilité du service). */
export function localAnswer(question: string, d: AssistantData, fmt: Fmt): string {
  const q = norm(question);
  const f = facts(d);
  const nothing = d.invoices.length === 0 && d.treasuryAccounts.length === 0 && d.products.length === 0 && (d.projects || []).length === 0;
  if (nothing && !/aide|help|que sais|peux/.test(q)) {
    return `Je n'ai pas encore de données pour **${d.tenant.name}**. Créez une facture, un produit, un compte de trésorerie ou un projet : je pourrai alors analyser votre activité.`;
  }

  if (/relance|lettre|courrier|mise en demeure/.test(q)) {
    const top = f.overdue[0];
    if (!top) return 'Aucune facture échue impayée : il n\'y a rien à relancer pour le moment.';
    return `**Projet de lettre de relance**\n\n*Objet : relance amiable – facture ${top.number}*\n\nMadame, Monsieur,\n\nSauf erreur de notre part, la facture ${top.number} d'un montant restant dû de **${fmt(top.remainingAmount)}**, échue le ${top.dueDate}, n'a pas été réglée à ce jour.\n\nNous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais.\n\nCordialement,\n${d.tenant.name}\n\n(Client : ${top.customerName})`;
  }
  if (/tresor|solde|cash|liquid|banque|caisse/.test(q)) {
    if (!d.treasuryAccounts.length) return 'Aucun compte de trésorerie n\'est enregistré. Ajoutez vos banques, caisses ou comptes Mobile Money dans « Trésorerie & Caisses ».';
    return `**Trésorerie de ${d.tenant.name}**\n\n• Total : **${fmt(f.cash)}**\n${d.treasuryAccounts.map(a => `• ${a.name} : ${fmt(a.balance)}`).join('\n')}\n• Reste à encaisser sur vos clients : ${fmt(f.outstanding)}`;
  }
  if (/impay|creance|echu|retard|recouvr|client.*doit/.test(q)) {
    if (!f.unpaid.length) return 'Aucune créance client en attente : toutes vos factures validées sont soldées.';
    const lines = (f.overdue.length ? f.overdue : f.unpaid).slice(0, 8).map(i => `• ${i.number} – ${i.customerName} : ${fmt(i.remainingAmount)} (échéance ${i.dueDate || '—'})`);
    return `**Créances clients**\n\n• Reste à encaisser : **${fmt(f.outstanding)}** sur ${f.unpaid.length} facture(s)\n• Dont échues : **${f.overdue.length}**\n\n${lines.join('\n')}${f.overdue.length ? '\n\nDemandez-moi « rédige une lettre de relance » pour la plus importante.' : ''}`;
  }
  if (/stock|rupture|article|produit|inventaire/.test(q)) {
    if (!d.products.length) return 'Aucun produit n\'est enregistré dans « Stocks & Entrepôts ».';
    if (!f.lowStock.length) return `Aucun article sous son seuil d'alerte (${d.products.length} produit(s) suivis).`;
    return `**Articles sous le seuil d'alerte (${f.lowStock.length})**\n\n${f.lowStock.slice(0, 10).map(p => `• ${p.name} : ${p.currentStock} en stock (seuil ${p.stockMinAlert})`).join('\n')}`;
  }
  if (/projet|chantier|budget|tache/.test(q)) {
    const pr = d.projects || [];
    if (!pr.length) return 'Aucun projet n\'est enregistré. Créez-en un dans « Gestion de Projets », puis ajoutez ses tâches et ses dépenses.';
    const late = openTasks(pr).filter(t => t.late);
    return `**Projets (${pr.length})**\n\n${pr.slice(0, 8).map(p => `• ${p.title} : ${fmt(p.actualCost)} dépensés sur ${fmt(p.budgetAllocated)} (${p.budgetAllocated > 0 ? Math.round((p.actualCost / p.budgetAllocated) * 100) : 0} %) – avancement ${p.progressPercent} %`).join('\n')}${late.length ? `\n\n⚠ ${late.length} tâche(s) en retard : ${late.slice(0, 5).map(t => t.title).join(', ')}.` : ''}`;
  }
  if (/anomalie|alerte|risque|priorite|urgent/.test(q)) {
    const al = buildAlerts({ invoices: d.invoices, products: d.products, salesOrders: [], projects: d.projects }, fmt);
    if (!al.length) return 'Aucune alerte détectée sur vos données actuelles.';
    return `**Points d'attention (${al.length})**\n\n${al.slice(0, 8).map(a => `• ${a.title} : ${a.text}`).join('\n')}`;
  }
  if (/chiffre|vente|ca\b|facture|activite|resume|synthese|bilan|marge/.test(q)) {
    const margin = f.revenueHT > 0 && f.purchasesHT > 0 ? `\n• Marge brute indicative (ventes HT – achats HT) : ${fmt(f.revenueHT - f.purchasesHT)} (${(((f.revenueHT - f.purchasesHT) / f.revenueHT) * 100).toFixed(1)} %)` : '';
    return `**Synthèse d'activité**\n\n• Factures de vente : ${f.sales.length}\n• Chiffre d'affaires HT : **${fmt(f.revenueHT)}**\n• Encaissé : ${fmt(f.collected)} · Reste à encaisser : ${fmt(f.outstanding)}\n• Trésorerie : ${fmt(f.cash)}${margin}\n• Clients : ${d.customers.length} · Produits : ${d.products.length}`;
  }
  return `Je peux vous renseigner à partir de vos données réelles sur : la **trésorerie**, les **impayés** et relances, les **stocks**, les **projets et budgets**, les **alertes** et la **synthèse d'activité**.\n\nReformulez votre question avec l'un de ces thèmes.`;
}
