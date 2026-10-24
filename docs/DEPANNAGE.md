# Dépannage : « Le serveur de connexion est injoignable »

Ce message s'affiche sur la page d'accueil quand le site n'obtient pas de réponse correcte de `/api/health`.
**Premier réflexe : ouvrez `https://VOTRE-DOMAINE/api/health` dans le navigateur.**

| Ce que vous voyez | Signification | Solution |
|---|---|---|
| `{"status":"ok","db":true,…}` | Tout va bien | Videz le cache du navigateur (Ctrl+F5) |
| `{"status":"degraded","db":false,"dbError":"…"}` | Le serveur tourne mais **la base de données** ne répond pas (voir codes ci-dessous). Le site affiche alors « sa base de données non connectée (code) ». Le serveur réessaie seul toutes les 10 secondes. | Corrigez les variables `DB_*` puis *Restart* |
| Page d'erreur 404, du texte HTML, ou « Cannot GET /api/health » | L'**application Node n'est pas celle qui répond** : le dossier `dist/` a été envoyé seul dans `public_html` (site statique), ou l'URL de l'application ne pointe pas sur le domaine | Créez l'application dans *Setup Node.js App* avec **Application URL = le domaine (chemin vide)** et **startup file = `server.js`** ; ne mettez pas `dist/` dans `public_html` |
| Erreur 503 / 500 / page blanche de l'hébergeur | L'application **n'est pas démarrée** ou a planté au lancement | *Setup Node.js App* → *Start/Restart*, puis lisez les logs de l'application |
| « Not Found » sur `/api/…` uniquement | Application installée dans un sous-dossier (`/app`) : le site utilise des chemins absolus | Mettez l'application à la racine du domaine ou d'un sous-domaine |

## Codes `dbError` fréquents

| Code | Cause probable |
|---|---|
| `ER_ACCESS_DENIED_ERROR` | Mauvais `DB_USER` ou `DB_PASSWORD`, ou l'utilisateur n'est pas associé à la base (cPanel → *MySQL Databases* → « Ajouter un utilisateur à la base », **tous les privilèges**) |
| `ER_BAD_DB_ERROR` | `DB_NAME` incorrect : sur cPanel le nom est préfixé (`identifiant_nombase`) |
| `ECONNREFUSED` / `ENOTFOUND` / `ETIMEDOUT` | `DB_HOST` incorrect (essayez `localhost`) ou serveur MySQL arrêté |
| `ER_DBACCESS_DENIED_ERROR` | L'utilisateur existe mais n'a pas les droits sur cette base |
| `PROTOCOL_CONNECTION_LOST` | Connexion coupée par l'hébergeur : *Restart* |

## Vérifications rapides
1. *Setup Node.js App* : statut **Running**, version **20**, startup file **`server.js`**.
2. Onglet des **variables d'environnement** : `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` renseignés **sans espace ni guillemets**.
3. *Run NPM Install* exécuté (installe `mysql2`).
4. Les fichiers `server.js`, `package.json` et `dist/` sont **directement** dans le dossier de l'application (pas dans un sous-dossier du ZIP).
5. Après chaque modification des variables : **Restart**.

En attendant, le bouton « Accéder à l'ERP (Démo) » fonctionne sans serveur (données fictives, non enregistrées).
