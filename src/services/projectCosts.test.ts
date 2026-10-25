import test from 'node:test';
import assert from 'node:assert/strict';
import { addExpense, addTask, budgetLevel, removeExpense, removeTask, toggleTask } from './projectCosts.ts';
import type { Project } from '../types/index.ts';

const base = (): Project => ({
  id: 'p1', tenantId: 't', code: 'PRJ-1', title: 'Hangar', category: 'BTP_CONSTRUCTION', manager: 'Omar',
  budgetAllocated: 1000, actualCost: 100, invoicedAmount: 0, progressPercent: 0, startDate: '2026-01-01', endDate: '2026-12-31',
  status: 'PLANIFIE', tasks: [],
});

test('tâches : ajout, avancement et livraison automatique', () => {
  let p = addTask(base(), { title: 'Terrassement', assignedTo: '', dueDate: '2026-02-01', budget: 300 });
  p = addTask(p, { title: 'Fondations', assignedTo: 'Awa', dueDate: '2026-03-01' });
  assert.equal(p.tasks.length, 2);
  assert.equal(p.tasks[0].assignedTo, 'Omar');
  p = toggleTask(p, p.tasks[0].id);
  assert.equal(p.progressPercent, 50);
  assert.equal(p.status, 'EN_COURS');
  p = toggleTask(p, p.tasks[1].id);
  assert.equal(p.progressPercent, 100);
  assert.equal(p.status, 'LIVRE');
});

test('dépenses : cumul sur le projet et sur la tâche, suppression', () => {
  let p = addTask(base(), { title: 'Terrassement', assignedTo: 'Omar', dueDate: '2026-02-01' });
  const tid = p.tasks[0].id;
  p = addExpense(p, { date: '2026-01-10', label: 'Location pelleteuse', amount: 250.5, taskId: tid });
  p = addExpense(p, { date: '2026-01-11', label: 'Carburant', amount: 49.5 });
  assert.equal(p.actualCost, 400);
  assert.equal(p.tasks[0].cost, 250.5);
  assert.equal(p.status, 'EN_COURS');
  p = removeExpense(p, p.expenses![0].id);
  assert.equal(p.actualCost, 350.5);
  p = removeTask(p, tid);
  assert.equal(p.expenses![0].taskId, undefined);
  assert.equal(p.actualCost, 350.5);
  assert.throws(() => addExpense(p, { date: '2026-01-01', label: 'x', amount: 0 }));
  assert.throws(() => addExpense(p, { date: '2026-01-01', label: ' ', amount: 5 }));
});

test('alerte budget', () => {
  assert.equal(budgetLevel({ budgetAllocated: 1000, actualCost: 500 }), 'OK');
  assert.equal(budgetLevel({ budgetAllocated: 1000, actualCost: 800 }), 'ATTENTION');
  assert.equal(budgetLevel({ budgetAllocated: 1000, actualCost: 1001 }), 'DEPASSE');
  assert.equal(budgetLevel({ budgetAllocated: 0, actualCost: 0 }), 'OK');
});
