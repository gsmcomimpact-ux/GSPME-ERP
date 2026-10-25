# Base de données GSPME (MySQL / MariaDB)

Schéma complet : `docs/mysql-schema.sql` (importable dans phpMyAdmin). Le serveur crée les tables tout seul au démarrage.
Variables de connexion : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (ou `DATABASE_URL`).

## Les 8 tables

| Table | Contenu | Clé |
|---|---|---|
| `tenants` | Une ligne par **entreprise cliente** : toute sa fiche en JSON (nom, pays, formule, statut, échéance, quotas, modules actifs) | `id` |
| `users` | **Comptes** de connexion : nom, email (unique), mot de passe **haché** (scrypt), rôle, actif, dernière connexion | `id` · `tenant_id` → `tenants` |
| `records` | **Toutes les données métier** de chaque entreprise (clients, factures, stocks, paie, écritures…), une ligne par enregistrement, en JSON | `(tenant_id, collection, id)` |
| `payments` | **Paiements d'abonnement** Chariow : formule, cycle, montant, statut (`PENDING`, `PAID`, `FAILED`, `ABANDONED`, `REVIEW`), identifiant de vente Chariow | `id` · `chariow_sale_id` unique |
| `files` | **Fichiers archivés** de la GED (contenu binaire `LONGBLOB`, nom, type, taille, empreinte SHA-256, niveau de confidentialité, déposant). 8 Mo max par fichier, quota par formule | `id` · `tenant_id` |
| `webhook_events` | Identifiants des livraisons Chariow déjà traitées (anti-doublon) | `delivery_id` |
| `inquiries` | **Demandes de contact** reçues depuis le site (JSON) et leur statut (`NOUVEAU`, `EN_COURS`, `TRAITE`) | `id` |
| `meta` | Paramètres internes (secret de signature des sessions si `JWT_SECRET` n'est pas défini) | `key` |

Les collections de `records` : `customers`, `suppliers`, `products`, `warehouses`, `invoices`, `purchases`, `treasury_accounts`,
`treasury_tx`, `journal_entries`, `employees`, `payslips`, `audit_logs`, `opportunities`, `interactions`, `sales_orders`,
`delivery_notes`, `sales_reps`, `pos_sessions`, `pos_receipts`, `projects`, `fixed_assets`, `documents`, `ai_insights`.

**Isolation :** chaque ligne de `records` porte le `tenant_id` de son entreprise ; le serveur le déduit du jeton de connexion, jamais du navigateur.

## Requêtes utiles (phpMyAdmin → onglet SQL)

```sql
-- Entreprises, formule et statut
SELECT id,
       JSON_UNQUOTE(JSON_EXTRACT(data,'$.name'))               AS entreprise,
       JSON_UNQUOTE(JSON_EXTRACT(data,'$.subscriptionPlan'))   AS formule,
       JSON_UNQUOTE(JSON_EXTRACT(data,'$.subscriptionStatus')) AS statut,
       JSON_UNQUOTE(JSON_EXTRACT(data,'$.subscriptionExpiresAt')) AS echeance,
       created_at
FROM tenants ORDER BY created_at DESC;

-- Encaissements par statut
SELECT status, COUNT(*) AS nombre, SUM(amount) AS total_fcfa FROM payments GROUP BY status;

-- Paiements à vérifier (montant ou produit inattendu)
SELECT id, tenant_id, plan, cycle, amount, note, created_at FROM payments WHERE status = 'REVIEW';

-- Chiffre d'affaires encaissé depuis le 1er novembre 2026
SELECT SUM(amount) AS total_fcfa FROM payments WHERE status = 'PAID' AND paid_at >= '2026-11-01';

-- Nombre d'utilisateurs actifs par entreprise
SELECT tenant_id, COUNT(*) AS utilisateurs FROM users WHERE active = 1 GROUP BY tenant_id;

-- Volume de données par entreprise et par domaine
SELECT tenant_id, collection, COUNT(*) AS lignes FROM records GROUP BY tenant_id, collection;

-- Demandes de contact non traitées
SELECT JSON_UNQUOTE(JSON_EXTRACT(data,'$.name')) AS nom, JSON_UNQUOTE(JSON_EXTRACT(data,'$.email')) AS email, created_at
FROM inquiries WHERE status = 'NOUVEAU' ORDER BY created_at DESC;
```

## Bonnes pratiques
- **Sauvegarde** : exportez la base (phpMyAdmin → Exporter, ou la sauvegarde cPanel) au moins une fois par semaine.
- **Ne modifiez pas les montants ni les statuts de `payments` à la main** ; pour changer une formule ou suspendre une entreprise, utilisez la console Super Admin.
- Les mots de passe ne sont **jamais** stockés en clair (`password_hash`). Pour réinitialiser un compte Super Admin : `node create-admin.js email nouveau_mot_de_passe`.
