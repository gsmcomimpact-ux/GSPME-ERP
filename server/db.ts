/**
 * GSPME SaaS - Couche de persistance SQLite (multi-tenant)
 * - tenants  : une ligne par entreprise cliente (profil JSON)
 * - users    : comptes avec mot de passe haché (scrypt), rattachés à un tenant
 * - records  : documents métier (factures, produits...) cloisonnés par (tenant_id, collection)
 */
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'gspme.db');
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
  CREATE TABLE IF NOT EXISTS records (
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, collection, id)
  );
`);

/** Secret JWT : variable d'environnement, sinon généré une fois et conservé en base. */
export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('jwt_secret') as
    | { value: string }
    | undefined;
  if (row) return row.value;
  const secret = randomBytes(48).toString('hex');
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('jwt_secret', secret);
  return secret;
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
