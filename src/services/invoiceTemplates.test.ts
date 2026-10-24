import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { INITIAL_TENANTS } from '../data/initialData.ts';
import { INVOICE_TEMPLATES, fileNameFor, renderInvoicePdf, sampleInvoice } from './invoiceTemplates.ts';
import { amountInWords, numberToFrench } from './amountInWords.ts';
import type { Invoice, InvoiceTemplateId } from '../types';

const tenant = { ...INITIAL_TENANTS[0] };

async function textOf(inv: Invoice, id: InvoiceTemplateId, t = tenant): Promise<{ text: string; pages: number; bytes: Buffer }> {
  const doc = await renderInvoicePdf(inv, t, { templateId: id });
  const bytes = Buffer.from(doc.output('arraybuffer'));
  const path = `/tmp/claude-0/tpl-${process.pid}-${id}-${inv.type}-${inv.items.length}.pdf`;
  fs.writeFileSync(path, bytes);
  const text = execFileSync('pdftotext', ['-layout', path, '-']).toString();
  fs.unlinkSync(path);
  return { text, pages: doc.getNumberOfPages(), bytes };
}

test('5 modèles disponibles', () => {
  assert.deepEqual(INVOICE_TEMPLATES.map(t => t.id), ['CLASSIQUE', 'MODERNE', 'MINIMALISTE', 'ELEGANT', 'CORPORATE']);
  assert.equal(new Set(INVOICE_TEMPLATES.map(t => t.accent)).size, 5);
});

test('chaque modèle produit un PDF valide avec les mentions essentielles (facture)', async () => {
  const inv = sampleInvoice(tenant, 'FACTURE_VENTE');
  const sizes = new Set<number>();
  for (const t of INVOICE_TEMPLATES) {
    const { text, pages, bytes } = await textOf(inv, t.id);
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `${t.id} : PDF`);
    assert.equal(pages, 1, `${t.id} : une page`);
    for (const must of ['FAC-2026-0042', 'Société Exemple SARL', 'NINEA 123 456 789', 'TVA 18 %', '595.900', 'Cinq cent quatre-vingt-quinze mille neuf cents francs CFA', '395.900']) {
      assert.ok(text.includes(must), `${t.id} : « ${must} » absent`);
    }
    assert.ok(/Sénégal BTP/i.test(text), `${t.id} : nom de l'entreprise`);
    assert.ok(/Reste à régler/i.test(text), `${t.id} : reste à régler`);
    sizes.add(bytes.length);
  }
  assert.ok(sizes.size >= 4, 'les modèles produisent des documents différents');
});

test('devis : libellés propres, deux zones de signature, pas de reste à régler', async () => {
  const quote = sampleInvoice(tenant, 'DEVIS_PROFORMA');
  for (const t of INVOICE_TEMPLATES) {
    const { text } = await textOf(quote, t.id);
    assert.ok(/DEVIS|Devis/.test(text), `${t.id} : titre devis`);
    assert.ok(text.includes('DEV-2026-0012'), `${t.id} : numéro`);
    assert.ok(/Bon pour accord/.test(text), `${t.id} : bon pour accord`);
    assert.ok(/Valable jusqu'au|Devis valable jusqu'au/.test(text), `${t.id} : validité`);
    assert.ok(!/Reste à régler/.test(text), `${t.id} : pas de reste à régler sur un devis`);
  }
  assert.equal(fileNameFor(quote), 'DEVIS_DEV-2026-0012.pdf');
});

test('avoir et bon de commande', async () => {
  const credit = { ...sampleInvoice(tenant, 'FACTURE_VENTE'), type: 'AVOIR_CLIENT' as const, number: 'AV-2026-0003' };
  const { text } = await textOf(credit, 'MODERNE');
  assert.ok(/AVOIR/.test(text) && /TOTAL AVOIR TTC/.test(text));
  assert.ok(!/Reste à régler/.test(text));
  const order = { ...sampleInvoice(tenant, 'DEVIS_PROFORMA'), type: 'BON_COMMANDE' as const, number: 'BC-1' };
  assert.ok(/BON DE COMMANDE|Bon de commande/.test((await textOf(order, 'CLASSIQUE')).text));
});

test('pagination : facture de 60 lignes répartie sur plusieurs pages avec en-têtes répétés', async () => {
  const inv = sampleInvoice(tenant, 'FACTURE_VENTE');
  const base = inv.items[0];
  inv.items = Array.from({ length: 60 }, (_, i) => ({ ...base, id: String(i), description: `Ligne ${i + 1} ${'très longue désignation '.repeat(4)}`, quantity: 1, unitPriceHT: 1000, totalHT: 1000, totalVAT: 180, totalTTC: 1180 }));
  inv.subtotalHT = 60_000; inv.totalVAT = 10_800; inv.totalTTC = 70_800; inv.paidAmount = 0; inv.remainingAmount = 70_800;
  for (const id of ['CLASSIQUE', 'MINIMALISTE', 'CORPORATE'] as const) {
    const { text, pages } = await textOf(inv, id);
    assert.ok(pages >= 3, `${id} : ${pages} pages`);
    assert.ok(text.includes('Ligne 1 ') && text.includes('Ligne 60 '), `${id} : première et dernière ligne présentes`);
    assert.ok((text.match(/suite\)/g) || []).length >= pages - 1, `${id} : en-tête de continuation`);
    assert.ok(new RegExp(`${pages}\\s*/\\s*${pages}`).test(text), `${id} : numérotation`);
    assert.ok(text.includes('70.800'), `${id} : total TTC`);
  }
});

test('TVA ventilée par taux', async () => {
  const inv = sampleInvoice(tenant, 'FACTURE_VENTE');
  inv.items = [
    { id: '1', description: 'Produit taxé', quantity: 1, unitPriceHT: 100_000, vatRate: 18, totalHT: 100_000, totalVAT: 18_000, totalTTC: 118_000 },
    { id: '2', description: 'Produit à taux réduit', quantity: 1, unitPriceHT: 50_000, vatRate: 10, totalHT: 50_000, totalVAT: 5_000, totalTTC: 55_000 },
  ];
  inv.subtotalHT = 150_000; inv.totalVAT = 23_000; inv.totalTTC = 173_000; inv.paidAmount = 0; inv.remainingAmount = 173_000;
  const { text } = await textOf(inv, 'ELEGANT');
  assert.ok(text.includes('TVA 18 %') && text.includes('TVA 10 %'));
  assert.ok(text.includes('18.000') && text.includes('5.000'));
});

test('logo : intégré en PNG, formats non gérés ignorés sans erreur, nom très long ajusté', async () => {
  // PNG 1×1 transparent
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const inv = sampleInvoice(tenant, 'FACTURE_VENTE');
  const withLogo = await textOf(inv, 'CORPORATE', { ...tenant, logoUrl: png });
  const without = await textOf(inv, 'CORPORATE', { ...tenant, logoUrl: undefined });
  assert.ok(withLogo.bytes.length > without.bytes.length, 'le logo est embarqué');
  const svg = await textOf(inv, 'CLASSIQUE', { ...tenant, logoUrl: 'data:image/svg+xml;base64,PHN2Zy8+' });
  assert.ok(svg.text.includes('FAC-2026-0042'));
  const long = await textOf(inv, 'CLASSIQUE', { ...tenant, name: 'Société Anonyme Internationale de Distribution et de Négoce de Matériaux de Construction' });
  assert.ok(long.text.includes('FAC-2026-0042'));
});

test('montant en lettres', () => {
  assert.equal(numberToFrench(1_250_000), 'un million deux cent cinquante mille');
  assert.equal(numberToFrench(80_000), 'quatre-vingt mille');
  assert.equal(numberToFrench(80_000_000), 'quatre-vingts millions');
  assert.equal(numberToFrench(999_999_999), 'neuf cent quatre-vingt-dix-neuf millions neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf');
  assert.equal(amountInWords(7500, 'XOF'), 'Sept mille cinq cents francs CFA');
  assert.equal(amountInWords(1, 'XOF'), 'Un franc CFA');
  assert.equal(amountInWords(0, 'XAF'), 'Zéro franc CFA');
  assert.equal(amountInWords(2, 'XOF'), 'Deux francs CFA');
});
