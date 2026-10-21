/**
 * GSPME - Export complet des données d'une entreprise (réversibilité) : archive ZIP de CSV + JSON.
 */
import { Tenant } from '../types';
import { storage } from './storage';
import { api } from './api';
import { computeStatements, balanceToRows, journalToRows, statementsToRows } from './financialStatements';
import { buildZip, downloadBlob, objectsToRows, slugify, toCsv, type CsvValue } from './exportService';

export interface ExportSummary {
  files: number;
  records: number;
}

/** Collections exportées en CSV (une feuille par fichier), avec l'ordre de colonnes privilégié. */
function collections(tenantId: string): { file: string; label: string; rows: object[]; order: string[] }[] {
  return [
    { file: 'clients.csv', label: 'Clients', rows: storage.getCustomers(tenantId), order: ['id', 'name', 'companyName', 'type', 'category', 'email', 'phone', 'city', 'taxNumber', 'creditLimit', 'outstandingBalance', 'createdAt'] },
    { file: 'fournisseurs.csv', label: 'Fournisseurs', rows: storage.getSuppliers(tenantId), order: ['id', 'name', 'category', 'email', 'phone', 'city', 'taxNumber', 'paymentTermsDays', 'balancePayable', 'ratingScore'] },
    { file: 'articles.csv', label: 'Articles', rows: storage.getProducts(tenantId), order: ['id', 'sku', 'name', 'category', 'unit', 'purchasePriceHT', 'sellingPriceHT', 'vatRate', 'currentStock', 'stockMinAlert'] },
    { file: 'entrepots.csv', label: 'Entrepôts', rows: storage.getWarehouses(tenantId), order: [] },
    { file: 'factures-ventes.csv', label: 'Factures de vente', rows: storage.getInvoices(tenantId), order: ['id', 'number', 'type', 'date', 'dueDate', 'customerName', 'status', 'subtotalHT', 'totalVAT', 'totalTTC', 'remainingAmount'] },
    { file: 'factures-achats.csv', label: "Factures d'achat", rows: storage.getPurchases(tenantId), order: ['id', 'number', 'date', 'dueDate', 'supplierName', 'status', 'totalHT', 'totalVAT', 'totalTTC', 'paidAmount'] },
    { file: 'commandes-clients.csv', label: 'Commandes clients', rows: storage.getSalesOrders(tenantId), order: [] },
    { file: 'opportunites.csv', label: 'Opportunités', rows: storage.getOpportunities(tenantId), order: [] },
    { file: 'comptes-tresorerie.csv', label: 'Comptes de trésorerie', rows: storage.getTreasuryAccounts(tenantId), order: [] },
    { file: 'mouvements-tresorerie.csv', label: 'Mouvements de trésorerie', rows: storage.getTreasuryTransactions(tenantId), order: [] },
    { file: 'salaries.csv', label: 'Salariés', rows: storage.getEmployees(tenantId), order: [] },
    { file: 'bulletins-paie.csv', label: 'Bulletins de paie', rows: storage.getPayslips(tenantId), order: [] },
    { file: 'projets.csv', label: 'Projets', rows: storage.getProjects(tenantId), order: [] },
    { file: 'immobilisations.csv', label: 'Immobilisations', rows: storage.getFixedAssets(tenantId), order: [] },
    { file: 'documents.csv', label: 'Documents (métadonnées)', rows: storage.getDocuments(tenantId).map(d => (d.downloadUrl?.startsWith('data:') ? { ...d, downloadUrl: '(contenu intégré — voir le JSON)' } : d)), order: [] },
    { file: 'journal-audit.csv', label: "Piste d'audit", rows: storage.getAuditLogs(tenantId), order: [] },
  ];
}

export async function exportAllData(tenant: Tenant): Promise<ExportSummary> {
  // En session serveur, repartir des données les plus récentes de l'entreprise
  if (api.isEnabled()) {
    try {
      await storage.refreshFromServer();
    } catch {
      /* hors ligne : on exporte le cache local */
    }
  }
  const tenantId = tenant.id;
  const entries = storage.getJournalEntries(tenantId);
  const statements = computeStatements(entries);
  const files: { name: string; content: string }[] = [];
  let records = 0;

  for (const c of collections(tenantId)) {
    records += c.rows.length;
    files.push({ name: `csv/${c.file}`, content: toCsv(objectsToRows(c.rows as Record<string, unknown>[], c.order)) });
  }
  records += entries.length;
  files.push(
    { name: 'csv/ecritures-comptables.csv', content: toCsv(journalToRows(entries), { decimalComma: true }) },
    { name: 'csv/balance-generale.csv', content: toCsv(balanceToRows(statements.balance), { decimalComma: true }) },
    { name: 'csv/bilan-compte-resultat.csv', content: toCsv(statementsToRows(statements, tenant.name, tenant.currency), { decimalComma: true }) }
  );

  const json = {
    exportedAt: new Date().toISOString(),
    source: 'GSPME-ERP',
    tenant,
    data: { ...Object.fromEntries(collections(tenantId).map(c => [c.file.replace('.csv', ''), c.rows])), documents: storage.getDocuments(tenantId) },
    journal: entries,
  };
  files.push({ name: 'donnees-completes.json', content: JSON.stringify(json, null, 2) });
  const readme: CsvValue[] = [
    `Export GSPME-ERP — ${tenant.name}`,
    `Date : ${new Date().toLocaleString('fr-FR')}`,
    '',
    'csv/  : un fichier par domaine (séparateur « ; », encodage UTF-8, ouvrable dans Excel).',
    'donnees-completes.json : toutes les données, au format machine, pour migration ou sauvegarde.',
    '',
    'Les montants sont exprimés dans la devise de l\'entreprise : ' + tenant.currency + '.',
  ];
  files.push({ name: 'LISEZMOI.txt', content: readme.join('\r\n') });

  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(buildZip(files), `gspme-export-${slugify(tenant.name)}-${date}.zip`, 'application/zip');
  storage.logAudit('EXPORT', 'SYSTEME', `Export complet des données (${files.length} fichiers, ${records} enregistrements)`);
  return { files: files.length, records };
}
