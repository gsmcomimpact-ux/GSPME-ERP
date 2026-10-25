import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, localAnswer } from './assistantEngine.ts';

const tenant: any = { name: 'Boutique Awa', legalForm: 'SARL', city: 'Dakar', countryCode: 'SN', currency: 'XOF' };
const fmt = (n: number) => `${n} F`;
const empty: any = { tenant, invoices: [], products: [], treasuryAccounts: [], customers: [], projects: [] };

test('sans données : aucune valeur inventée', () => {
  const a = localAnswer('trésorerie ?', empty, fmt);
  assert.match(a, /pas encore de données/);
  assert.doesNotMatch(a, /CSE SA|6 850 000/);
});

test('réponses calculées sur les données réelles', () => {
  const d: any = {
    ...empty,
    invoices: [{ id: 'i', number: 'F-1', type: 'FACTURE_VENTE', status: 'VALIDEE', customerName: 'ACME', subtotalHT: 1000, totalTTC: 1180, paidAmount: 180, remainingAmount: 1000, dueDate: '2020-01-01' }],
    treasuryAccounts: [{ name: 'Caisse', balance: 500 }],
    products: [{ name: 'Ciment', currentStock: 2, stockMinAlert: 5 }],
  };
  assert.match(localAnswer('où en est ma trésorerie', d, fmt), /500 F/);
  assert.match(localAnswer('factures impayées', d, fmt), /F-1 – ACME : 1000 F/);
  assert.match(localAnswer('rédige une lettre de relance', d, fmt), /F-1/);
  assert.match(localAnswer('risque de rupture de stock', d, fmt), /Ciment : 2 en stock/);
  assert.match(localAnswer('blabla', d, fmt), /trésorerie/);
  const ctx = buildContext(d, fmt);
  assert.match(ctx, /Boutique Awa/);
  assert.match(ctx, /F-1 ACME 1000 F/);
});
