import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_CATALOG, addPeriod, priceOf } from './plans.ts';
import { DEFAULT_PLANS } from '../src/services/subscriptionService.ts';

test('le catalogue serveur reste identique aux offres affichées dans l\'interface', () => {
  for (const ui of DEFAULT_PLANS) {
    const srv = PLAN_CATALOG[ui.id as keyof typeof PLAN_CATALOG];
    assert.ok(srv, `formule ${ui.id} absente du catalogue serveur`);
    assert.equal(srv.monthlyPriceFCFA, ui.monthlyPriceFCFA, `${ui.id} : prix mensuel`);
    assert.equal(srv.annualPriceFCFA, ui.annualPriceFCFA, `${ui.id} : prix annuel`);
    assert.equal(srv.maxUsers, ui.maxUsers, `${ui.id} : utilisateurs`);
    assert.equal(srv.maxStorageMB, ui.maxStorageMB, `${ui.id} : stockage`);
    assert.deepEqual(srv.allowedModules, ui.allowedModules, `${ui.id} : modules`);
  }
  assert.equal(DEFAULT_PLANS.length, Object.keys(PLAN_CATALOG).length);
});

test('prix et calcul des échéances', () => {
  assert.equal(priceOf('BUSINESS', 'MENSUEL'), 7500);
  assert.equal(priceOf('PREMIUM', 'ANNUEL'), 100000);
  assert.equal(addPeriod(new Date('2026-01-15T10:00:00Z'), 'MENSUEL').toISOString(), '2026-02-15T10:00:00.000Z');
  assert.equal(addPeriod(new Date('2026-01-31T10:00:00Z'), 'MENSUEL').toISOString(), '2026-02-28T10:00:00.000Z'); // fin de mois
  assert.equal(addPeriod(new Date('2024-02-29T00:00:00Z'), 'ANNUEL').toISOString(), '2025-02-28T00:00:00.000Z'); // bissextile
  assert.equal(addPeriod(new Date('2026-12-20T00:00:00Z'), 'MENSUEL').toISOString(), '2027-01-20T00:00:00.000Z');
});

import { ALWAYS_ALLOWED_MODULES, isModuleAllowed, minPlanForModule } from './plans.ts';

test('modules autorisés par formule', () => {
  const free = PLAN_CATALOG.STARTER.allowedModules;
  assert.equal(isModuleAllowed(free, 'sales'), true);
  assert.equal(isModuleAllowed(free, 'accounting'), false);
  assert.equal(isModuleAllowed(free, 'bi'), false);
  for (const m of ALWAYS_ALLOWED_MODULES) assert.equal(isModuleAllowed(free, m), true, `${m} toujours accessible`);
  assert.equal(isModuleAllowed(undefined, 'accounting'), true, 'pas de liste = pas de restriction');
  assert.equal(isModuleAllowed([], 'accounting'), true);
  assert.equal(minPlanForModule('inventory')?.id, 'ESSENTIEL');
  assert.equal(minPlanForModule('accounting')?.id, 'BUSINESS');
  assert.equal(minPlanForModule('ai')?.id, 'PREMIUM');
  assert.equal(minPlanForModule('sales')?.id, 'STARTER');
  assert.equal(minPlanForModule('inconnu'), null);
});
