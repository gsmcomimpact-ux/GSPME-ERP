# Assistant IA conversationnel

Le module « Assistant IA GSPME » dialogue en langage courant, garde l'historique de la conversation et s'appuie sur les données réelles de l'entreprise connectée.

## Deux modes
| Mode | Condition | Fonctionnement |
|---|---|---|
| **IA générative** | variable `ANTHROPIC_API_KEY` définie sur le serveur | Chaque question part vers `/api/assistant` (serveur) avec l'historique (12 derniers messages) et une synthèse chiffrée de l'entreprise ; la clé n'est jamais visible dans le navigateur |
| **Analyse intégrée** | pas de clé, ou service indisponible | Réponses calculées par l'application (trésorerie, impayés, stocks, projets, alertes, lettre de relance) — aucune donnée inventée |

## Activer l'IA générative (cPanel → Setup Node.js App → variables)
- `ANTHROPIC_API_KEY` : clé créée sur console.anthropic.com (à ne jamais partager dans un message ou un fichier).
- `ASSISTANT_MODEL` (facultatif) : modèle utilisé, `claude-haiku-5-5` par défaut (économique) ; `claude-sonnet-5-5` pour des analyses plus poussées.
- Puis **Restart**. `/api/health` affiche `"assistant": true`.

Coût : facturé par Anthropic à l'usage. Le serveur limite à 30 questions / 5 min par adresse, 2 000 caractères par message et 900 tokens de réponse.
