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

## Accès et rôles
- **Page d'accueil** : bouton *Connexion* (email + mot de passe) ou *Créer mon entreprise* (essai 14 jours).
  Une fois connecté, le menu utilisateur (en haut à droite) propose *Se déconnecter*.
- **Super Admin plateforme** : compte `SUPER_ADMIN_SAAS` créé au démarrage via `SUPER_ADMIN_EMAIL` /
  `SUPER_ADMIN_PASSWORD`, ou avec `npm run create-admin -- email motdepasse` (sur l'hébergeur :
  `node create-admin.js email motdepasse` dans `~/gspme`, aussi pour réinitialiser un mot de passe).
  Lui seul voit l'entrée *Super Admin SaaS* : entreprises clientes (formule, suspension/réactivation),
  demandes de contact reçues depuis le site public, offres et revenus.
- Une entreprise suspendue ne peut plus se connecter ni synchroniser (message « Abonnement suspendu »).

## Paiement des abonnements (Chariow)
Paiement en ligne des formules Essentiel / Business / Premium (mensuel ou annuel) via Chariow, activation automatique par
webhook signé, bandeau de renouvellement, suivi des paiements pour le Super Admin. Configuration : `docs/PAIEMENT-CHARIOW.md`.

## Formules et modules
Chaque formule débloque des modules (`shared/plans.ts`, source unique) : les autres restent visibles avec un cadenas dans le menu
et affichent un écran de mise à niveau. Le tableau de bord, les Paramètres/abonnement, les Clients & Fournisseurs et les outils
plateforme restent toujours accessibles. Pendant l'essai (14 jours) tous les modules sont ouverts. Le verrouillage s'applique à l'interface ; les
limites d'utilisateurs sont, elles, contrôlées par le serveur.

## Exports
- **Comptabilité → Bilan & Compte de Résultat** : export **PDF** et **Excel (CSV)** du bilan SYSCOHADA (actif / passif,
  équilibre vérifié) et du compte de résultat ; la balance et le livre-journal s'exportent en CSV depuis leurs onglets.
- **Paramètres → Offre SaaS & Quotas → Exporter toutes mes données (ZIP)** : un CSV par domaine (clients, fournisseurs,
  articles, factures, trésorerie, paie, écritures, balance, bilan…) + `donnees-completes.json` (réversibilité).
- **Clients & Fournisseurs** : export CSV de la liste affichée.
Les CSV utilisent `;` et l'UTF-8 avec BOM (ouverture directe dans Excel) ; chaque export est tracé dans le journal d'audit.
Les états sont calculés à partir des écritures **validées** ; ils ne remplacent pas des états certifiés.

Dépannage de l'hébergement : `docs/DEPANNAGE.md`.

## Sécurité
Isolation stricte par tenant (le `tenantId` vient du jeton, jamais du client), champs d'abonnement
modifiables uniquement par `SUPER_ADMIN_SAAS`, `AUDITEUR_EXTERNE` en lecture seule.

## Tests
`npm run test:unit` (exports CSV/ZIP, bilan) ; `npm run test:api` (exige une base MySQL/MariaDB de test via `DB_*` ; **les tables sont vidées**).

## Déploiement sur iFastNet (cPanel « Setup Node.js App », Node ≤ 20)
1. cPanel → *MySQL Databases* : créez une base, un utilisateur, et associez-les avec *Tous les privilèges*.
2. En local : `npm install && npm run build:deploy` → dossier `deploy/` (`server.js`, `dist/`, `package.json`).
3. cPanel → *Setup Node.js App* → *Create Application* : Node 20, Production, Application Root `gspme`,
   Application URL = la **racine** du domaine ou d'un sous-domaine, Startup File `server.js`.
4. Envoyez le contenu de `deploy/` dans `~/gspme`, puis *Run NPM Install* (installe `mysql2`).
5. Variables d'environnement : `DB_HOST` (`localhost`), `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
   `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
6. *Restart*. Les tables sont créées automatiquement (ou importez `docs/mysql-schema.sql` dans phpMyAdmin).
