# AGENTS.md — challenges

## Keep the methodology page in sync with the code

`/challenges/methodology` (`src/app/(dashboard)/challenges/methodology/page.tsx`)
documents every metric: DB tables, formulas, thresholds, bonuses, and gating. It must
always match what `overview-data.ts` actually computes — never document a formula the code
doesn't run.

Source of truth for numbers:

- `constants.ts` — every threshold and bonus (merch tiers, snacks 0.45, panier 190,
  opex 9.5%, review volume 4%, review min count 10, revenue thresholds per shop).
- `overview-data.ts` — the real computation (reads `daily_entries`, `location_entries`,
  `reviews_cache`, `location_gbp_ratings`, `locations`).
- `settings.ts` — revenue threshold overrides editable on the Overview page.

When you change a metric: update `constants.ts` first, then the methodology page, then any
hardcoded display strings (watch `labels.ts`, `spotlight.ts` — `MERCH_TIER_THRESHOLDS`
duplicates the merch tiers; prefer `constants.ts`).

Rules to keep accurate:

- Revenue = `sales_drinks_net + sales_ticket_net + sales_snack_net + sales_goodies_net +
  sales_card_surcharge`. The `sales_*_net` fields are already VAT-inclusive — do **not**
  add `vat_7`.
- Merch % (`sales_goodies_net / revenue`) is the only metric NOT gated by the sales target.
  Snacks, Spend per visit, Running costs, Review count and Review rating are only awarded
  when the shop clears its sales target.
- `entry_count` / `snacks_sold` come from manual `location_entries` in three periods per
  month (1–10, 11–20, 21–end), combined.
- Review rating target = `MIN(4.5, ROUND(currentGBPRating + 0.1, 1))`, needs ≥ 10 reviews
  in the month, using the monthly average star rating vs the live Google rating snapshot.
- Location IDs: `daily_entries.location_id` (UUID) ↔ GBP path via `locations.external_id`;
  fall back to the UUID when no mapping exists.
