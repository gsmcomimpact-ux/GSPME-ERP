import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAlerts, monthlySeries, openTasks } from './dashboardInsights.ts';

test('nouveau compte : aucune donnée affichée', () => {
  assert.deepEqual(monthlySeries([], []), []);
  assert.deepEqual(buildAlerts({ invoices: [], products: [], salesOrders: [], projects: [] }, String), []);
  assert.deepEqual(openTasks([]), []);
});

test('évolution mensuelle réelle, hors brouillons et annulées', () => {
  const inv = (date: string, ht: number, status = 'VALIDEE') => ({ id: date + ht, type: 'FACTURE_VENTE', status, date, subtotalHT: ht }) as any;
  const s = monthlySeries([inv('2026-09-10', 1000), inv('2026-09-20', 500), inv('2026-10-02', 200), inv('2026-10-03', 999, 'BROUILLON'), inv('2026-10-04', 999, 'ANNULEE')],
    [{ date: '2026-10-05', totalHT: 120 } as any], 3, new Date('2026-10-25'));
  assert.equal(s.length, 3);
  assert.equal(s[1].sales, 1500);
  assert.equal(s[2].sales, 200);
  assert.equal(s[2].costs, 120);
  assert.equal(s[0].sales, 0);
});

test('alertes : échus, stock, commandes, budget ; tâches en retard', () => {
  const a = buildAlerts({
    invoices: [{ id: '1', number: 'F1', type: 'FACTURE_VENTE', status: 'VALIDEE', remainingAmount: 500, dueDate: '2026-01-01', customerName: 'ACME' }, { id: '2', number: 'F2', type: 'FACTURE_VENTE', status: 'PAYEE', remainingAmount: 0, dueDate: '2026-01-01', customerName: 'X' }] as any,
    products: [{ id: 'p', name: 'Ciment', stockMinAlert: 10, currentStock: 3 }, { id: 'q', name: 'Sable', stockMinAlert: 0, currentStock: 0 }] as any,
    salesOrders: [{ id: 'o', number: 'CMD-1', status: 'CONFIRMEE', customerName: 'ACME' }, { id: 'o2', number: 'CMD-2', status: 'LIVREE' }] as any,
    projects: [{ id: 'pr', title: 'Hangar', budgetAllocated: 100, actualCost: 150, tasks: [] }] as any,
  }, String, '2026-10-25');
  assert.deepEqual(a.map(x => x.module).sort(), ['inventory', 'projects', 'sales', 'sales']);
  const t = openTasks([{ id: 'pr', title: 'Hangar', tasks: [{ id: 't1', title: 'Fondations', completed: false, dueDate: '2026-10-20' }, { id: 't2', title: 'Murs', completed: false, dueDate: '2027-01-01' }, { id: 't3', title: 'Fait', completed: true, dueDate: '2026-10-01' }] }] as any, '2026-10-25');
  assert.equal(t.length, 1);
  assert.equal(t[0].late, true);
});
