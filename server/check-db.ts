/**
 * GSPME SaaS - Diagnostic de la connexion MySQL (à lancer dans le Terminal cPanel : node check-db.js)
 * Affiche les variables reçues (mot de passe masqué) et le message exact de MySQL.
 */
import 'dotenv/config';
import { dbConfigHint, envClean, pool } from './db.ts';

async function main() {
  console.log('Variables reçues par l\'application :');
  for (const k of ['DB_HOST', 'DB_PORT', 'DB_SOCKET', 'DB_USER', 'DB_NAME', 'DATABASE_URL']) {
    const v = envClean(k);
    console.log(`  ${k.padEnd(13)} = ${v ? (k === 'DATABASE_URL' ? '(défini)' : JSON.stringify(v)) : '(absent)'}`);
  }
  const pwd = envClean('DB_PASSWORD');
  console.log(`  DB_PASSWORD   = ${pwd ? `défini, ${pwd.length} caractères, commence par « ${pwd[0]} » et finit par « ${pwd[pwd.length - 1]} »` : '(ABSENT)'}`);
  console.log('Résumé :', dbConfigHint());
  try {
    const [rows] = await pool.query('SELECT CURRENT_USER() AS utilisateur, DATABASE() AS base, VERSION() AS version');
    console.log('\n✔ Connexion réussie :', (rows as unknown[])[0]);
  } catch (err) {
    const e = err as { code?: string; message: string };
    console.log(`\n✘ Échec : ${e.code || ''} — ${e.message}`);
    if (e.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log("→ MySQL refuse ce couple utilisateur / mot de passe. Vérifiez que l'utilisateur indiqué ci-dessus est bien celui créé dans cPanel,");
      console.log("  qu'il est associé à la base (tous les privilèges), et que le mot de passe est exact. « using password: NO » = la variable DB_PASSWORD n'est pas reçue.");
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
void main();
