# AGENTS.md — reports

## Keep "How it's calculated" in sync with the code

The Daily Profit report's **"How it's calculated"** tab (`DailyProfitView.tsx`) renders
`DAILY_PROFIT_METHODOLOGY` from `daily-profit/methodology.ts`, which `daily-profit/server.ts`
also uses to build the actual numbers. These three files are one contract:

- `daily-profit/methodology.ts` — the displayed formula, revenue/expense/excluded field
  lists, rules, and the `version` string.
- `daily-profit/engine.ts` — the actual math (economic profit, day spreading, service charge).
- `daily-profit/server.ts` — maps sheet payload columns into `SourceDailyEntry` using the
  field lists in `methodology.ts`.

If you change how profit is calculated (new fields, different weighting, new cost line),
update **all of the above together** and bump the `version` string. The page must never
describe a calculation that differs from `engine.ts`.

Rules to keep accurate:

- `revenueFields` / `expenseFields` / `excludedFields` drive both the displayed lists AND
  the sums in `server.ts` — they must be the real sheet column names.
- Monthly manual values (`salaries_amount`, rent/electricity/water/other fixed) are spread
  evenly across all calendar days of the month.
- Service charge per day = that day's revenue × the shop's rate × employee count.
- A shop/month without manual entry is counted as zero and triggers a coverage warning.
- Tests live in `daily-profit/engine.test.ts` and `daily-profit/isolation.test.ts`.
