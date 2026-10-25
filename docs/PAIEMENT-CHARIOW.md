# Paiement des abonnements avec Chariow

Chariow encaisse (Wave, Orange Money, MTN, Moov, carte selon le pays) ; GSPME active ensuite la formule.
**Ce n'est pas un prélèvement récurrent** : chaque paiement prolonge l'abonnement d'1 mois ou 12 mois, et le client
doit repayer à l'échéance (rappel par bandeau dans l'application, 5 jours de grâce, puis retour à la formule Gratuit).

## 1. Dans Chariow
1. Créez **6 produits de type « Licence »** (le type Licence est le seul qui autorise de racheter le même produit) :

   | Produit | Prix (devise de la boutique : **XOF**) | Variable d'environnement |
   |---|---|---|
   | Essentiel mensuel | 5 000 | `CHARIOW_PRODUCT_ESSENTIEL_MENSUEL` |
   | Essentiel annuel | 50 000 | `CHARIOW_PRODUCT_ESSENTIEL_ANNUEL` |
   | Business mensuel | 7 500 | `CHARIOW_PRODUCT_BUSINESS_MENSUEL` |
   | Business annuel | 75 000 | `CHARIOW_PRODUCT_BUSINESS_ANNUEL` |
   | Premium mensuel | 10 000 | `CHARIOW_PRODUCT_PREMIUM_MENSUEL` |
   | Premium annuel | 100 000 | `CHARIOW_PRODUCT_PREMIUM_ANNUEL` |

   Les produits doivent être **publiés**, à prix unique (pas « prix libre »). Le montant doit être **exactement** celui du
   tableau, dans la devise XOF : un montant différent est refusé (paiement marqué « À vérifier », formule non activée).
   Relevez l'identifiant de chaque produit (`prd_…`).
2. **Clé API** : Paramètres → Clés API → créez une clé `sk_live_…` (droits sur les produits, ventes et checkout).
3. **Pulse (webhook)** : Automatisation → Pulses → Ajouter :
   - URL : `https://VOTRE-DOMAINE/api/webhooks/chariow` (HTTPS obligatoire) ;
   - événements : `successful.sale`, `failed.sale`, `abandoned.sale` ;
   - produits : les 6 ci-dessus ;
   - copiez le **secret de signature** `whsec_…` (Vue d'ensemble du Pulse).

## 2. Sur l'hébergeur (variables d'environnement)
`APP_URL` (adresse publique, sans `/` final), `CHARIOW_API_KEY`, `CHARIOW_WEBHOOK_SECRET` et les 6 `CHARIOW_PRODUCT_*`.
Redémarrez l'application. `https://VOTRE-DOMAINE/api/health` doit afficher `"billing": true`.

## 3. Test
Utilisez « Send test pulse » dans Chariow pour vérifier que l'URL répond (le test n'active aucun abonnement : sa vente est inconnue).
Puis faites un vrai paiement du plus petit produit avec une entreprise de test.

## Sécurité et fiabilité
- La clé API ne quitte jamais le serveur ; le secret `whsec_…` vérifie la signature HMAC-SHA256 du corps brut de chaque webhook.
- Chaque livraison n'est traitée qu'une fois (identifiant `x-pulse-delivery-id`) ; une vente n'active l'abonnement qu'une fois.
- Le serveur vérifie produit, montant et devise avant d'activer. Les anomalies sont visibles par le Super Admin (statut « À vérifier »).
- Si votre serveur est injoignable pendant 5 tentatives, Chariow **désactive le Pulse** : réactivez-le dans Chariow (onglet Livraisons → Rejouer).
- Un remboursement fait dans Chariow ne retire pas automatiquement la formule : le Super Admin peut la modifier ou suspendre l'entreprise.

## Dépannage : « le lien de paiement ne marche pas »

1. Ouvrez `https://VOTRE-SITE/api/health` : le champ `billingMode` indique `api`, `liens` ou `inactif`, et `billingMissing` liste les variables manquantes (`CHARIOW_API_KEY`, `CHARIOW_WEBHOOK_SECRET`).
2. Pour l'API : définissez `CHARIOW_API_KEY`, `CHARIOW_WEBHOOK_SECRET`, `APP_URL` et les 6 variables `CHARIOW_PRODUCT_<FORMULE>_<CYCLE>` (identifiants `prd_…`, produits **publiés** de type Licence), puis **Restart**.
3. **Solution de repli — lien direct** : pour chaque formule, définissez `CHARIOW_LINK_<FORMULE>_<CYCLE>` avec l'adresse (https) de la page du produit dans votre boutique, par ex. `CHARIOW_LINK_BUSINESS_MENSUEL=https://eflaptzj.mychariow.co/...`. Le bouton « Payer » ouvre alors cette page quand l'API n'est pas configurée ou renvoie une erreur. Dans ce mode l'activation n'est pas automatique : elle se confirme depuis Super Admin SaaS après vérification du paiement dans Chariow.

### Liens intégrés par défaut
Les 6 pages de paiement de la boutique `eflaptzj.mychariow.co` sont intégrées au code (pages publiques, sans secret) : le bouton « Payer » fonctionne donc même sans variable. Les variables `CHARIOW_LINK_*` et `CHARIOW_PRODUCT_*` les remplacent si elles sont définies. **Attention :** « Business mensuel » et « Business annuel » pointent aujourd'hui vers le même produit (`prd_cbq1etzr`) ; créez/indiquez le bon produit annuel puis définissez `CHARIOW_LINK_BUSINESS_ANNUEL` et `CHARIOW_PRODUCT_BUSINESS_ANNUEL`.
