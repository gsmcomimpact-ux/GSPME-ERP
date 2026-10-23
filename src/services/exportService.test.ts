import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildZip, crc32, objectsToRows, slugify, toCsv } from './exportService.ts';
import { balanceToRows, computeStatements, journalToRows, statementsToRows } from './financialStatements.ts';
import type { JournalEntry } from '../types';

const entry = (id: string, date: string, lines: [string, string, number, number][]): JournalEntry => ({
  id, tenantId: 't', journalCode: 'OD', date, pieceNumber: id, description: `Pièce ${id}`, validated: true,
  lines: lines.map(([accountCode, accountName, debit, credit], i) => ({ id: `${id}-${i}`, accountCode, accountName, debit, credit, reference: id, description: '' })),
});

// Capital 1 000 000 en banque ; achat marchandises 300 000 payé ; vente 500 000 encaissée + TVA 90 000 due ; immo 400 000 à crédit
const ENTRIES: JournalEntry[] = [
  entry('E1', '2026-01-02', [['5211', 'Banques locales', 1_000_000, 0], ['101', 'Capital social', 0, 1_000_000]]),
  entry('E2', '2026-01-10', [['601', 'Achats de marchandises', 300_000, 0], ['5211', 'Banques locales', 0, 300_000]]),
  entry('E3', '2026-02-01', [['5211', 'Banques locales', 590_000, 0], ['701', 'Ventes de marchandises', 0, 500_000], ['4431', 'TVA facturée', 0, 90_000]]),
  entry('E4', '2026-02-15', [['241', 'Matériel et outillage', 400_000, 0], ['4011', 'Fournisseurs', 0, 400_000]]),
  entry('E5', '2026-03-01', [['2841', 'Amortissement matériel', 0, 40_000], ['681', 'Dotations aux amortissements', 40_000, 0]]),
];

test('CSV : séparateur, guillemets, BOM et virgule décimale', () => {
  const csv = toCsv([['a;b', 'dit "oui"', 12.5], ['x', null, true]], { decimalComma: true });
  assert.ok(csv.startsWith('﻿'));
  assert.equal(csv, '﻿"a;b";"dit ""oui""";12,5\r\nx;;Oui\r\n');
  assert.equal(toCsv([[1.5]]), '﻿1.5\r\n');
});

test('CSV : neutralise les formules Excel mais garde les nombres négatifs', () => {
  assert.equal(toCsv([['=CMD()', '-12.5', '@x']]), "﻿'=CMD();-12.5;'@x\r\n");
});

test('objectsToRows : ordre des colonnes et objets imbriqués', () => {
  const rows = objectsToRows([{ id: 1, items: [{ a: 1 }], name: 'x' }], ['id', 'name']);
  assert.deepEqual(rows[0], ['id', 'name', 'items']);
  assert.deepEqual(rows[1], [1, 'x', '[{"a":1}]']);
});

test('slugify', () => assert.equal(slugify('Société Test SARL — 2026'), 'societe-test-sarl-2026'));

test('ZIP : structure valide (CRC, noms UTF-8, contenu) et relisible par unzip', async () => {
  const files = [
    { name: 'clients.csv', content: toCsv([['Nom'], ['Awa Diop']]) },
    { name: 'données/léger.txt', content: 'é'.repeat(5000) },
    { name: 'vide.txt', content: '' },
  ];
  const zip = buildZip(files, new Date(2026, 9, 21, 12, 30, 10));
  // fin d'archive
  const eocd = zip.length - 22;
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(dv.getUint32(eocd, true), 0x06054b50);
  assert.equal(dv.getUint16(eocd + 10, true), 3);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const path = `/tmp/claude-0/export-test-${process.pid}.zip`;
  fs.writeFileSync(path, zip);
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync('python3', ['-I', '-c', `
import zipfile,sys
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
print(sorted(z.namelist())); print(z.read('clients.csv').decode('utf-8-sig').strip().replace('\\r\\n','|'))
`, path]).toString();
  assert.match(out, /clients\.csv/);
  assert.match(out, /données\/léger\.txt/);
  assert.match(out, /Nom\|Awa Diop/);
  fs.unlinkSync(path);
});

test('États financiers : bilan équilibré, résultat et amortissements', () => {
  const s = computeStatements(ENTRIES, '2026-03-31');
  assert.equal(s.produits.total, 500_000);
  assert.equal(s.charges.total, 340_000);
  assert.equal(s.resultat, 160_000);
  assert.equal(s.ecart, 0, 'actif = passif');
  assert.equal(s.totalActif, s.totalPassif);
  // immobilisation nette = 400 000 − 40 000
  assert.equal(s.actif[0].total, 360_000);
  assert.equal(s.actif[3].total, 1_290_000); // 1 000 000 − 300 000 + 590 000
  assert.equal(s.passif[0].total, 1_000_000);
  assert.equal(s.passif[2].total, 490_000); // fournisseur 400 000 + TVA 90 000
});

test('États financiers : écritures non validées ignorées, balance totalisée', () => {
  const brouillon: JournalEntry = { ...entry('E9', '2026-04-01', [['601', 'Achats', 50_000, 0], ['5211', 'Banque', 0, 50_000]]), validated: false };
  const s = computeStatements([...ENTRIES, brouillon]);
  assert.equal(s.charges.total, 340_000);
  const rows = balanceToRows(s.balance);
  const total = rows[rows.length - 1];
  assert.equal(total[3], total[4], 'total débit = total crédit');
  assert.equal(total[5], total[6], 'total soldes débiteurs = créditeurs');
});

test('CSV bilan et journal', () => {
  const s = computeStatements(ENTRIES, '2026-03-31');
  const csv = toCsv(statementsToRows(s, 'Ma Société', 'XOF'), { decimalComma: true });
  assert.match(csv, /TOTAL ACTIF;;1650000/);
  assert.match(csv, /RÉSULTAT NET DE L'EXERCICE;;160000/);
  assert.equal(journalToRows(ENTRIES).length, 1 + 2 + 2 + 3 + 2 + 2);
});
