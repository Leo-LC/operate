# Plan — Intégration Loyverse multi-comptes

> Rédigé le 2026-08-23 par un agent précédent (session opencode
> `ses_fd2063a67ffecX4GEJY6qP81sH`), reconstitué depuis la base de sessions.
> Document de référence pour la construction du module Loyverse.

## Contraintes validées

- ❌ **Aucune écriture** dans `daily_entries` / `location_entries` — logique préparée mais désactivée
- ✅ Tout s'affiche dans un **nouveau module `src/modules/loyverse/`** (sandbox intact, rétrogradé)
- ✅ Dashboard global = **landing de l'app après login**, owner-only avant release
- ✅ Cron quotidien + bouton sync manuel (« je me connecte, je synchronise, j'ai tout à l'instant T »)
- ⚠️ Respecter `reports/AGENTS.md` et `challenges/AGENTS.md` quand on touchera à leurs données

---

## Phase 0 — Fondations

| # | Tâche | Fichiers | Détails |
|---|---|---|---|
| 0.1 | Support multi-comptes | `src/lib/loyverse/accounts.ts` (nouveau), `client.ts` | Parse `LOYVERSE_ACCOUNTS` JSON → `Account[] {key, label, token}` ; fallback legacy `LOYVERSE_ACCESS_TOKEN` ; `loyverseFetch(account, path)` prend le compte en paramètre |
| 0.2 | Fix timezone UTC+7 | `aggregate-receipts.ts` | Bornes de journée en `Asia/Bangkok` au lieu d'UTC (les tickets du soir partent aujourd'hui dans le mauvais jour) |
| 0.3 | Cache items/catégories | nouveau `lib/catalog-cache.ts` | TTL in-memory par compte (pattern customer-insights) — évite re-pull ~2500 items à chaque clic |
| 0.4 | Tests agrégateur | `aggregate-receipts.test.ts` | Refunds négatifs, cancelled ignorés, VAT signé, buckets, snacks_sold, timezone |

## Phase 1 — Module + moteur de sync

| # | Tâche | Détails |
|---|---|---|
| 1.1 | Squelette module | `src/modules/loyverse/{types.ts, config.ts, lib/, components/}` — agrégateur migré/importé depuis le sandbox |
| 1.2 | Migration SQL | `loyverse_daily_snapshots` (account_key, location_id, date, buckets vente, buckets paiement, vat_7, surcharge, ticket_count, revenue_total, snacks_sold, avg_ticket, unmapped counters) + `loyverse_sync_runs` (status, duration, errors, triggered_by) |
| 1.3 | Moteur de sync | Pull parallèle plafonné (~3 comptes concurrents) de J et J-1 par compte/store → agrégation → upsert snapshots ; idempotent |
| 1.4 | API routes | `/api/loyverse/sync` (POST, owner, retourne résumé du run), `/api/loyverse/dashboard` (GET snapshots agrégés), `/api/loyverse/status` |
| 1.5 | Cron nocturne | `vercel.json` + `/api/cron/loyverse-sync` (Bearer `CRON_SECRET`) : finalise J-1, backfill si trou |

## Phase 2 — Dashboard global (landing app)

| # | Tâche | Détails |
|---|---|---|
| 2.1 | Landing après login | `src/app/(dashboard)/page.tsx` : si owner → render dashboard Loyverse ; autres rôles → comportement actuel préservé. La visibilité shop des users reste prise en compte dès maintenant (structure prête pour le scope par location) |
| 2.2 | KPIs agrégés société | CA du jour TTC/HT, nb tickets, panier moyen, delta vs J-7 — cartes style reports réutilisées (`src/modules/reports/components`) |
| 2.3 | Cartes par shop | Grid : CA du jour, tickets, panier moyen, statut sync + timestamp dernier run par compte ; état dégradé visible si un compte échoue |
| 2.4 | Breakdowns | Buckets vente (drinks/ticket/snack/goodies), mix paiements (cash/scan/card), top catégories du jour |
| 2.5 | Bouton « Synchroniser » | `POST /api/loyverse/sync` → spinner + refresh des données, dernier sync affiché ; erreurs par compte remontées inline |
| 2.6 | Drilldown jour/boutique | Sélecteur de date + détail par shop (snapshots historiques depuis le cron), navigation vers les vues preview |

## Phase 3 — Vues consommateurs (preview dans le module)

| # | Tâche | Détails |
|---|---|---|
| 3.1 | Onglet Accounting | `ProposedDailyEntry` par shop/jour en lecture seule, côte à côte avec les valeurs importées des Google Sheets → contrôle visuel avant release |
| 3.2 | Onglet Challenges | `entry_count`, `snacks_sold`, panier moyen **exact** (tickets réels vs estimations manquées) vs seuils `challenges/constants.ts` — progression mid-month. ⚠️ Formule revenue de `challenges/AGENTS.md` respectée en affichage (VAT-inclus, jamais + vat_7) |
| 3.3 | Panneau unmapped | Line items / payment types non mappés triés par fréquence → boucle de raffinement du mapping avant release |

## Phase 4 — Préparation release (code livré, désactivé)

| # | Tâche | Détails |
|---|---|---|
| 4.1 | Write-back préparé | `src/modules/loyverse/lib/write-back.ts` : upsert `daily_entries` + `location_entries`, idempotent, appelable uniquement si `LOYVERSE_WRITE_ENABLED=true` (défaut false) — aucun chemin UI ne l'invoque au départ |
| 4.2 | Rollout boutiques | Ajout progressif des 9 comptes dans `LOYVERSE_ACCOUNTS` (un redéploiement chacun), validation visuelle shop par shop via l'onglet Accounting avant passage au suivant |
| 4.3 | Activation future | Quand les 9 shops sont propres : flag on → diff final → remplacement des imports Sheets ; accès étendu aux boss/collaborateur/managers via `ModuleKey` loyverse + scope location |

---

### Notes pour le dispatch aux agents

- **Ordre strict** : 0.x → 1.x → 2.x. Phases 3 et 4 parallélisables entre elles une fois 1.2/1.3 mergés.
- **Tests obligatoires** : agrégateur (0.4), moteur de sync idempotent (1.3), parsing `LOYVERSE_ACCOUNTS` (0.1).
- **Garde-fous transverses** : tout token reste server-side (`loyverseFetch` jamais importé côté client) ; vérifier `npx tsc --noEmit` + `npm run lint` + `npm run test` à chaque tâche.
- **Ne pas toucher** : `daily_entries`, `location_entries`, modules reports/challenges/accounting (lecture éventuelle seulement en Phase 3.1).
