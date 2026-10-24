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

## Si `ER_ACCESS_DENIED_ERROR` persiste
Depuis cette version, `/api/health` affiche une ligne `dbHint` qui montre **ce que l'application reçoit réellement** (valeurs masquées) :
`DB_USER=défini … utilisateur utilisé : yet***m · mot de passe : oui (12 caractères)`.

| Ce que dit `dbHint` | Cause | Solution |
|---|---|---|
| `DB_USER=ABSENT` / « utilisateur utilisé : root » / « mot de passe : NON » | Les variables **n'arrivent pas** à l'application (non enregistrées, ou pas de *Restart*) | Dans *Setup Node.js App*, ajoutez les variables puis **Save**, puis *Restart*. Ou utilisez un fichier `.env` (voir plus bas) |
| Utilisateur et mot de passe « définis » mais l'erreur reste | MySQL refuse bien ce couple | Mot de passe inexact (le longueur affichée doit correspondre à la vôtre), ou **utilisateur non associé à la base** : *MySQL Databases* → « Ajouter un utilisateur à une base de données » → tous les privilèges |
| Longueur du mot de passe ≠ celle que vous avez choisie | Un caractère spécial a été déformé | Choisissez un mot de passe en lettres et chiffres uniquement |

**Alternative fiable : un fichier `.env`.** Créez dans le dossier de l'application (`~/gspme/.env`) un fichier contenant, une valeur par ligne et sans guillemets :
```
DB_HOST=localhost
DB_NAME=monid_nombase
DB_USER=monid_utilisateur
DB_PASSWORD=MotDePasseLettresEtChiffres
```
Le serveur le lit au démarrage (puis *Restart*). Protégez-le (permissions 600). Si `localhost` échoue, essayez `DB_HOST=127.0.0.1`.
Les variables saisies dans l'interface sont, elles, invisibles depuis le Terminal cPanel : `node check-db.js` ne montre donc que le contenu du `.env` et des variables du shell.

## Pièges de saisie dans cPanel
- Un **espace invisible** à la fin d'une valeur (copier-coller) : le serveur les retire désormais automatiquement, y compris les guillemets autour.
- Un mot de passe contenant `& $ # " ' \ espace` peut être déformé par l'interface : utilisez des **lettres et chiffres** (14 caractères ou plus).
- **Ne partagez jamais** un mot de passe ou une clé dans un message : en cas de fuite, changez-le immédiatement.

## Vérifications rapides
1. *Setup Node.js App* : statut **Running**, version **20**, startup file **`server.js`**.
2. Onglet des **variables d'environnement** : `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` renseignés **sans espace ni guillemets**.
3. *Run NPM Install* exécuté (installe `mysql2`).
4. Les fichiers `server.js`, `package.json` et `dist/` sont **directement** dans le dossier de l'application (pas dans un sous-dossier du ZIP).
5. Après chaque modification des variables : **Restart**.

En attendant, le bouton « Accéder à l'ERP (Démo) » fonctionne sans serveur (données fictives, non enregistrées).
