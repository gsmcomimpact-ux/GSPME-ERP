/**
 * GSPME SaaS - Crée (ou réinitialise le mot de passe de) un compte Super Admin.
 * Usage : node create-admin.js email@exemple.com "MotDePasse8+" ["Nom affiché"]
 * (dev : npx tsx server/create-admin.ts email mot_de_passe)
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { initDb, one, pool, run } from './db.ts';
import { hashPassword } from './auth.ts';

const ALL_MODULES = [
  'dashboard', 'crm', 'sales', 'purchases', 'inventory', 'pos', 'accounting', 'treasury',
  'tax', 'payroll', 'projects', 'assets', 'documents', 'bi', 'ai', 'admin',
];

async function main() {
  const [emailArg, password, name = 'Super Admin GSPME'] = process.argv.slice(2);
  const email = (emailArg || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length < 8) {
    console.error('Usage : create-admin <email> <mot_de_passe (8 caractères min.)> [nom]');
    process.exit(2);
  }
  await initDb();

  const existing = await one<{ id: string; role: string }>('SELECT id, role FROM users WHERE email = ?', [email]);
  if (existing) {
    if (existing.role !== 'SUPER_ADMIN_SAAS') {
      console.error(`${email} existe déjà comme compte entreprise : utilisez un autre email.`);
      process.exit(1);
    }
    await run('UPDATE users SET password_hash = ?, active = 1 WHERE id = ?', [hashPassword(password), existing.id]);
    console.log(`Mot de passe du super-admin ${email} réinitialisé.`);
    return;
  }

  const tenantId = 'tenant-platform';
  if (!(await one('SELECT id FROM tenants WHERE id = ?', [tenantId]))) {
    await run('INSERT INTO tenants (id, data) VALUES (?, ?)', [tenantId, JSON.stringify({
      id: tenantId, name: 'GSPME Plateforme', legalForm: 'SAS', countryCode: 'SN', taxNumber: '',
      tradeRegisterNumber: '', address: '', city: 'Dakar', phone: '', email, currency: 'XOF',
      capitalSocial: 0, subscriptionPlan: 'ENTERPRISE', subscriptionStatus: 'ACTIVE',
      maxUsers: 100, maxStorageMB: 102400, activeModules: ALL_MODULES, currentBranchId: 'branch-platform',
      branches: [{ id: 'branch-platform', tenantId, name: 'Siège', city: 'Dakar', address: '', phone: '', isHeadquarters: true }],
    })]);
  }
  await run('INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)',
    [`user-${randomUUID()}`, tenantId, name, email, hashPassword(password), 'SUPER_ADMIN_SAAS']);
  console.log(`Super-admin créé : ${email}`);
}

main()
  .catch(err => { console.error('Échec :', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
