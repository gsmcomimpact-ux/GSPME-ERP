# GSPME — SaaS ERP pour PME africaines

Front React (Vite) + API multi-tenant Express/SQLite.

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
- `server/db.ts` — SQLite : `tenants`, `users` (scrypt), `records` (documents cloisonnés par `tenant_id` + collection).
- `server/auth.ts` — JWT HS256, limiteur de tentatives.
- `server/index.ts` — routes : `POST /api/auth/register|login`, `GET /api/auth/me`, `GET /api/sync`,
  `PUT /api/collections/:name`, `POST /api/users`.
- `src/services/api.ts` + `AuthGate` — connexion, hydratation du cache local, écriture différée vers l'API.

## Sécurité
Isolation stricte par tenant (le `tenantId` vient du jeton, jamais du client), champs d'abonnement
modifiables uniquement par `SUPER_ADMIN_SAAS`, `AUDITEUR_EXTERNE` en lecture seule.

## Tests
`npm run test:api`

## Déploiement sur iFastNet (cPanel « Setup Node.js App », Node ≤ 20)
1. En local : `npm install && npm run build:deploy` → dossier `deploy/` (`server.js`, `dist/`, `package.json`).
2. cPanel → *Setup Node.js App* → *Create Application* : Node 20, mode Production,
   Application Root `gspme`, Application URL = la **racine** du domaine ou d'un sous-domaine
   (le front utilise des chemins absolus `/api` et `/assets`), Startup File `server.js`.
3. Envoyez le contenu de `deploy/` dans `~/gspme`, puis *Run NPM Install* (installe `better-sqlite3`).
4. Variables d'environnement dans l'interface : `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
5. *Restart*. La base SQLite est créée dans `~/gspme/data/` (à sauvegarder régulièrement).
