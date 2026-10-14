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
