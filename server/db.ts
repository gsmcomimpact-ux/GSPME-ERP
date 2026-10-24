/**
 * GSPME SaaS - Couche de persistance MySQL / MariaDB (multi-tenant)
 * - tenants  : une ligne par entreprise cliente (profil JSON)
 * - users    : comptes avec mot de passe haché (scrypt), rattachés à un tenant
 * - records  : documents métier (factures, produits...) cloisonnés par (tenant_id, collection)
 *
 * Configuration : DATABASE_URL (mysql://user:pass@host:3306/base) ou DB_HOST / DB_PORT /
 * DB_USER / DB_PASSWORD / DB_NAME. Les tables sont créées au démarrage si absentes.
 */
import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from 'mysql2/promise';
import { randomBytes } from 'node:crypto';

/** Dossier de l'application (le bundle CJS expose __dirname ; en dev tsx on retombe sur le cwd). */
export const APP_DIR = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

export type SqlParams = (string | number | null)[];
type Queryable = Pick<Pool, 'query'> | Pick<PoolConnection, 'query'>;

/** Lit une variable d'environnement en retirant espaces et guillemets parasites (copier-coller dans cPanel). */
export function envClean(name: string): string {
  return (process.env[name] || '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

function createPool(): Pool {
  const common = { waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4', dateStrings: true } as const;
  if (envClean('DATABASE_URL')) return mysql.createPool({ uri: envClean('DATABASE_URL'), ...common });
  return mysql.createPool({
    host: envClean('DB_HOST') || 'localhost',
    port: Number(envClean('DB_PORT')) || 3306,
    user: envClean('DB_USER') || 'root',
    password: envClean('DB_PASSWORD'),
    database: envClean('DB_NAME') || 'gspme',
    ...common,
  });
}

export const pool = createPool();

export async function all<T = Record<string, unknown>>(sql: string, params: SqlParams = [], q: Queryable = pool): Promise<T[]> {
  const [rows] = await q.query(sql, params);
  return rows as T[];
}
export async function one<T = Record<string, unknown>>(sql: string, params: SqlParams = [], q: Queryable = pool): Promise<T | undefined> {
  return (await all<T>(sql, params, q))[0];
}
export async function run(sql: string, params: SqlParams = [], q: Queryable = pool): Promise<ResultSetHeader> {
  const [res] = await q.query(sql, params);
  return res as ResultSetHeader;
}

export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (
     \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
     \`value\` TEXT NOT NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS tenants (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     data LONGTEXT NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS users (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     tenant_id VARCHAR(64) NOT NULL,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     role VARCHAR(50) NOT NULL,
     active TINYINT(1) NOT NULL DEFAULT 1,
     last_login VARCHAR(30) NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uk_users_email (email),
     KEY idx_users_tenant (tenant_id),
     CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS inquiries (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     data LONGTEXT NOT NULL,
     status VARCHAR(20) NOT NULL DEFAULT 'NOUVEAU',
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS payments (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     tenant_id VARCHAR(64) NOT NULL,
     user_email VARCHAR(255) NOT NULL,
     plan VARCHAR(20) NOT NULL,
     cycle VARCHAR(10) NOT NULL,
     amount INT NOT NULL,
     currency VARCHAR(8) NOT NULL DEFAULT 'XOF',
     status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
     chariow_sale_id VARCHAR(64) NULL,
     note VARCHAR(255) NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     paid_at TIMESTAMP NULL,
     UNIQUE KEY uk_payments_sale (chariow_sale_id),
     KEY idx_payments_tenant (tenant_id),
     CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
     delivery_id VARCHAR(100) NOT NULL PRIMARY KEY,
     event VARCHAR(50) NOT NULL,
     received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS records (
     tenant_id VARCHAR(64) NOT NULL,
     collection VARCHAR(48) NOT NULL,
     id VARCHAR(100) NOT NULL,
     data LONGTEXT NOT NULL,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (tenant_id, collection, id),
     CONSTRAINT fk_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

let jwtSecret = (process.env.JWT_SECRET || '').trim();

/** Crée les tables si besoin et charge le secret JWT (variable d'environnement, sinon généré et conservé en base). */
export async function initDb(): Promise<void> {
  for (const stmt of SCHEMA) await run(stmt);
  if (jwtSecret) return;
  const row = await one<{ value: string }>('SELECT `value` FROM meta WHERE `key` = ?', ['jwt_secret']);
  if (row) { jwtSecret = row.value; return; }
  const secret = randomBytes(48).toString('hex');
  await run('INSERT IGNORE INTO meta (`key`, `value`) VALUES (?, ?)', ['jwt_secret', secret]);
  jwtSecret = (await one<{ value: string }>('SELECT `value` FROM meta WHERE `key` = ?', ['jwt_secret']))!.value;
}

export function getJwtSecret(): string {
  if (!jwtSecret) throw new Error('Base de données non initialisée');
  return jwtSecret;
}
