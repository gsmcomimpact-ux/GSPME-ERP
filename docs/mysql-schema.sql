-- GSPME SaaS - schéma MySQL / MariaDB (utilisable dans phpMyAdmin > Importer)
-- Le serveur crée ces tables automatiquement au démarrage ; ce fichier sert à les créer à la main
-- ou à les inspecter. Créez d'abord la base dans cPanel > "MySQL Databases", puis sélectionnez-la
-- dans phpMyAdmin avant d'importer.

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

CREATE TABLE IF NOT EXISTS records (
  tenant_id VARCHAR(64) NOT NULL,
  collection VARCHAR(48) NOT NULL,
  id VARCHAR(100) NOT NULL,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, collection, id),
  CONSTRAINT fk_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
