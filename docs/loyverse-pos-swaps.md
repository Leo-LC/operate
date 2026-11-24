# Historique des swaps de POS Loyverse

Source de vérité : `loyverse_daily_snapshots` — pour chaque shop, la bascule
= dernier jour avec ventes de l'ancien store_id → premier jour avec ventes du
nouveau. Les lignes à zéro du nouveau store apparaissent avant la bascule
(la sync tourne dès la création du store) : ne pas se fier à la première ligne.

Requête de référence (exclut les journées sans ventes réelles) :

```sql
select account_key, store_id, min(date) as first_sale, max(date) as last_sale
from loyverse_daily_snapshots
where revenue_total > 0 or receipt_count > 0
group by account_key, store_id
order by account_key, first_sale;
```

Limites : l'historique en base commence au 2026-07-27 (début de la sync) ;
avant cette date, aucun swap n'est observable.

## Swaps

| Shop     | Ancien store_id                      | Nouveau store_id                     | Bascule   |
| -------- | ------------------------------------ | ------------------------------------ | --------- |
| Pattaya  | `5b36d7b8-…`                         | `4d7f0f90-…`                         | 2026-10-11 |
| Silom    | `ff1994ea-…`                         | `10448de6-…`                         | 2026-10-12 |
| Chiangmai| `9cec70ef-…`                         | `c3537e81-…`                         | 2026-10-31 |
| Phangan  | `4d12e209-…`                         | `22667ee1-…`                         | 2026-11-18 |
| Samui    | `c5fdd307-…`                         | `32aa8ff3-…`                         | 2026-11-21 |

Pas de swap : Ekkamai (`75994b2c`), Karon (`eadac5fb`), Laguna (`17b18698`).
Note Karon : données de ventes à partir du 2026-09-05 seulement.

Conséquences d'un swap (d'où plusieurs correctifs de fin nov. 2026) :

- Les types de paiement sont **recréés** avec de nouveaux ids → les shifts
  antérieurs référencent des ids inconnus de `/payment_types`. Table
  `LEGACY_PAYMENT_TYPE_BUCKETS` dans
  `src/modules/loyverse-sandbox/mapping-config.ts` (+ repli snapshot dans
  `accounting-copy.ts`).
- Les deux store_id coexistent quelques jours dans les snapshots.
- Le mapping store → location passe par `locations.loyverse_store_id` /
  `loyverse_account_key` (`src/modules/loyverse/lib/store-mapping.ts`) ;
  après un swap, mettre à jour `loyverse_store_id` de la location.

À faire après chaque futur swap : ajouter la ligne ici, résoudre les
nouveaux ids de paiement (confronter montants shifts ↔ snapshots) et
étendre `LEGACY_PAYMENT_TYPE_BUCKETS`.
