-- GSPME SaaS - schéma MySQL / MariaDB complet (généré depuis le code du serveur)
-- Utilisable dans phpMyAdmin > Importer. Le serveur crée ces tables automatiquement au démarrage :
-- ce fichier sert à les créer à la main, à les inspecter ou à documenter la base.
-- 1) Créez la base dans cPanel > "MySQL Databases"  2) sélectionnez-la dans phpMyAdmin  3) importez ce fichier.
--
-- Tables : meta (secret de session) · tenants (entreprises clientes) · users (comptes, mots de passe hachés)
--          inquiries (demandes de contact du site) · payments (paiements d'abonnement Chariow)
--          webhook_events (anti-doublon des webhooks) · records (données métier par entreprise)

CREATE TABLE IF NOT EXISTS meta (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  data LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
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
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS inquiries (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  data LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NOUVEAU',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
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
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS webhook_events (
  delivery_id VARCHAR(100) NOT NULL PRIMARY KEY,
  event VARCHAR(50) NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS records (
  tenant_id VARCHAR(64) NOT NULL,
  collection VARCHAR(48) NOT NULL,
  id VARCHAR(100) NOT NULL,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, collection, id),
  CONSTRAINT fk_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
