# GSPME — SaaS ERP pour PME africaines

Front React (Vite) + API multi-tenant Express/MySQL.

## Démarrage
```bash
npm install
cp .env.example .env
npm run server      # API sur :3001
npm run dev         # front sur :3000 (proxy /api -> :3001)
```
Production : `npm run build && npm start` (l'API sert aussi `dist/`).
Sans serveur joignable, le front reste en mode démo (localStorage).

## Architecture
- `server/db.ts` — MySQL/MariaDB : `tenants`, `users` (scrypt), `records` (documents cloisonnés par `tenant_id` + collection). Schéma : `docs/mysql-schema.sql` (tables aussi créées au démarrage).
- `server/auth.ts` — JWT HS256, limiteur de tentatives.
- `server/index.ts` — routes : `POST /api/auth/register|login`, `GET /api/auth/me`, `GET /api/sync`,
  `PUT /api/collections/:name`, `POST /api/users`.
- `src/services/api.ts` + `AuthGate` — connexion, hydratation du cache local, écriture différée vers l'API.

## Sécurité
Isolation stricte par tenant (le `tenantId` vient du jeton, jamais du client), champs d'abonnement
modifiables uniquement par `SUPER_ADMIN_SAAS`, `AUDITEUR_EXTERNE` en lecture seule.

## Tests
`npm run test:api` (exige une base MySQL/MariaDB de test via `DB_*` ; **les tables sont vidées**).

## Déploiement sur iFastNet (cPanel « Setup Node.js App », Node ≤ 20)
1. cPanel → *MySQL Databases* : créez une base, un utilisateur, et associez-les avec *Tous les privilèges*.
2. En local : `npm install && npm run build:deploy` → dossier `deploy/` (`server.js`, `dist/`, `package.json`).
3. cPanel → *Setup Node.js App* → *Create Application* : Node 20, Production, Application Root `gspme`,
   Application URL = la **racine** du domaine ou d'un sous-domaine, Startup File `server.js`.
4. Envoyez le contenu de `deploy/` dans `~/gspme`, puis *Run NPM Install* (installe `mysql2`).
5. Variables d'environnement : `DB_HOST` (`localhost`), `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
   `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
6. *Restart*. Les tables sont créées automatiquement (ou importez `docs/mysql-schema.sql` dans phpMyAdmin).
