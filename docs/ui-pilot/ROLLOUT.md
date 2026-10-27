# UI rollout — foundation, accent preference, module order

Status: **Phase 0 complete; Wave 1 §1 and §2 implemented and verified.** Phase 0 (shared
foundation + browser-local accent preference) is committed at `ac88b15` on
`ui/reviews-stats-pilot`. The Reviews Stats pilot remains accepted at `e6e59c3`.
**Wave 1 §1** migrated the Reviews siblings (`/reviews/inbox`, `/reviews/templates`,
`/reviews/locations`, plus the `/reviews` and `/reviews/rules` redirects) and is
**awaiting user acceptance**. **Wave 1 §2** migrated `/customer-insights` and added the
requested Inbox filter disclosure; it is also **awaiting user acceptance**. No other module
has been migrated. All commits are local: not pushed, merged, deployed or migrated.

Source of truth for the accepted look: `DESIGN-CONTRACT.md`, `REPORT.md`,
`FOUNDATION-CANDIDATES.md` and the screenshots in `docs/ui-pilot/screenshots/`.
Phase 0 evidence: `docs/ui-pilot/phase0/` (16 accent × theme × viewport captures,
preference-modal captures, untouched-route captures, `capture-report.json`).
Wave 1 evidence: `docs/ui-pilot/wave1/` (`before/`, `quick/`, `states/`, `after/`,
`filters/`, `ci-before/`, `ci-after/` and their JSON reports).

## Principles

1. **Additive first.** New tokens and primitives are introduced without changing any
   existing default. A module only changes when its own files are edited.
2. **No silent restyle.** Do not repoint `--accent`, `--canvas`, `--surface`, `--fg` or
   `--line` globally. Those legacy tokens keep their current values until every consumer
   has been migrated and the change is accepted separately.
3. **Parity for the accepted screen.** After extraction, `/reviews/stats` must be
   pixel-identical at 390/768/1024/1440 px in light and dark.
4. **Semantic colors are not theme colors.** Success, warning and error keep their own
   values and never derive from the user's accent choice.
5. **One module, one explicit diff.** Every migration includes before/after screenshots,
   the interaction checks that module needs, and a user acceptance step.
6. **No database migration and no new dependency** for this phase.

## Phase 0 result (completed)

The four open design decisions were resolved by the user:

1. **Green is the default accent** for both company themes (`capybara` and `forest`).
2. The accent choice lives in the existing user area as a **Preferences** dialog opened
   from the sidebar user footer. It offers **Company default**, **Green** and **Orange**.
   No new permanent toolbar control and no new route.
3. **Orange is allowed with either company theme**, including `forest`.
4. The accent applies to **selected controls, primary actions and the primary chart
   series**. Success/warning/error colors stay semantic and independent; multi-series
   charts keep distinguishable non-accent colors.

### What shipped

| Area | File | Result |
| --- | --- | --- |
| Tokens | `src/app/globals.css` | Additive `--ui-*` layer for light/dark: surfaces, text, accent, semantic status, series, shape, spacing and type. Legacy `--accent/--canvas/--surface/--fg/--line` untouched. |
| Accent families | `src/app/globals.css` | Green is the default. `[data-accent="orange"]` overrides only `--ui-accent*` / `--ui-focus` / `--ui-series-primary`, with separate dark values. |
| Primitives | `src/components/ui/panel.tsx`, `src/components/ui/kpi-stat.tsx` | `Panel`/`PanelHead`/`PanelBody`/`PanelFoot` and `KpiStat`; opt-in, used by Reviews Stats. |
| Pill nav | `src/components/ui/module-tabs.tsx` | `variant="pills"` now uses the shared `ui-pillnav*` classes. Still opt-in; only Reviews uses it today. |
| Accent state | `src/lib/accent.ts` (+ test) | `normalizeAccent`, `readAccent`, `applyAccent`, `writeAccent`, pre-paint init script. |
| Accent UI | `src/components/accent-preference.tsx` | `AccentSync` and the Preferences control. |
| Pre-paint | `src/app/layout.tsx` | Inline script applies the stored accent before first paint. `<html>` already has `suppressHydrationWarning`. |
| Entry point | `src/components/dashboard-shell.tsx` | Sidebar user footer opens Preferences. Direction users keep their password entry point inside the dialog. |
| First consumer | `src/app/(dashboard)/reviews/stats/reviews-stats.css` and `src/modules/reviews/components/stats/*` | Stats consumes `--ui-*` and the shared primitives; `--rs-*` and the duplicate panel/KPI/pill rules are gone. |

### Accent precedence and storage

1. `localStorage["operate.accent"]` = `green` or `orange` (explicit user choice).
2. Company default = **green** for both company themes. The company theme itself remains
   `app_settings.theme`, owner-controlled on `/admin/appearance`.
3. Fallback = green. Invalid or missing values never throw.

**Limitation:** the accent is stored in this browser only. It is not written to the
database, is not synced between devices or browsers, and never changes another person's
screen. Cross-tab changes sync through the `storage` event. "Company default" removes the
key. Light/dark remains `localStorage["operate.theme"]` and is orthogonal to the accent.

### Phase 0 acceptance gate — passed

| Gate | Result |
| --- | --- |
| Stats parity with `e6e59c3` at 390/768/1024/1440, light + dark | Pass. Pixel diff **16–18 px** per capture (0.001–0.002%), consistent with the live timestamp. |
| Green default with no stored preference | Pass. No `data-accent`; `--ui-accent` is `#2c6f4c` light / `#2f7a52` dark. |
| Orange changes only accent tokens | Pass. Positive/negative/warn values are identical in green and orange for each mode. |
| Reset to company default | Pass. `operate.accent` is removed and `data-accent` disappears. |
| Persistence after reload | Pass. Orange survives a reload; default stays default. |
| No flash / hydration regression | Pass. Pre-paint script plus `suppressHydrationWarning`; the only console warning is the pre-existing `DashboardShell` theme-toggle mismatch. |
| Contrast | Pass for text, selected controls, focus and chart elements in all four mode combinations (values in `REPORT.md`). |
| Untouched routes | Pass. `/accounting`, `/scheduling/annual`, `/admin/appearance` are **pixel-identical** in green vs orange; legacy tokens unchanged. |
| Tests / typecheck / lint / build | `npm run test` 251/251; `npx tsc --noEmit` clean; lint unchanged at 20 errors / 3 warnings, all pre-existing; `npm run build` exit 0. |

### Not in Phase 0

- A company-level accent setting in `app_settings` (would need a migration).
- Per-user server sync of the accent.
- Repointing the legacy `--accent` / `--canvas` / `--surface` / `--fg` / `--line` scale.
- Migrating any other module.

## Wave 1 §1 result — Reviews siblings (verified)

| Area | File | Result |
| --- | --- | --- |
| Route CSS + token bridge | `src/app/(dashboard)/reviews/reviews.css` | `.revs` scope; legacy token names remapped to `--ui-*` **inside Reviews only**, so shared primitives adopt the palette without a global restyle. |
| Layout | `src/app/(dashboard)/reviews/layout.tsx` | `.revs` wrapper + route CSS import. |
| Header | `src/modules/reviews/components/ReviewsTabNav.tsx`, `src/app/globals.css` | One breadcrumb + compact title + pill nav for every route; shared `ui-module-*` header classes promoted and used by Stats with parity. |
| Inbox | `src/components/dashboard-client.tsx`, `review-card.tsx`, `dashboard-filters.tsx`, `all-none-toggle.tsx`, `ReviewsControlsBar.tsx` | Summary bar, filter rail, list controls, semantic star tones, grouped limit, bulk actions. |
| Config screens | `src/components/config-client.tsx` | Templates and Locations on `Panel` anatomy, chips, selectable rows, modals and inline loading/empty/error states. |
| Sync / bulk | `src/components/sync-button.tsx`, `BulkReplyPanel.tsx` | Shared classes and an opaque modal surface. |
| Shared button | `src/components/ui/button.tsx` | Hover/active from `--accent-hover` / `--accent-active` / `--bad-hover`; legacy defaults preserved for other modules. |
| Stats parity | `src/app/(dashboard)/reviews/stats/reviews-stats.css` | Duplicated header rules removed; 92 px (0.005%) diff, timestamp only. |

Additive shared tokens: `--accent-hover`, `--accent-active`, `--bad-hover`,
`--ui-radius-md`, `--ui-positive-soft`.

### Wave 1 §1 gate

| Gate | Result |
| --- | --- |
| Before/after captures at real widths, light + dark, both accents | Pass. `docs/ui-pilot/wave1/` — 48 after captures (4 routes × 1440/768/390 × light/dark × green/orange). |
| Key interactions | Pass. Inbox filters/sort/shuffle/limit/All-None, sync loading + error, template add/delete/rules, locations loading/empty/error/selection/confirm, redirects: **31/31 + 18/18** checks. |
| No horizontal overflow at 390 px | Pass. 48/48 combinations. |
| No API/permission/data-contract change | Pass. Only presentation files changed; no route handler, RPC or permission touched. |
| Tests / typecheck / lint / build | `npm run test` 251/251; `npx tsc --noEmit` clean; ESLint clean on changed files (repo baseline 20 errors / 3 warnings, pre-existing); `npm run build` exit 0. |
| Console | 0 page errors; known locations 503 (token not configured) and the pre-existing `DashboardShell` theme-toggle hydration warning only. |
| Acceptance | **Pending** — user review required before Wave 1 §2. |

Known limits for this step: locations data was mocked (the local `/api/locations` returns
503 without a Google token), sync was mocked for the error path, only the preview owner
account was available, and physical touch devices were not used.

### Wave 1 §1 follow-up — Inbox filter disclosure

Requested after the §1 review: on mobile the filter rail took the whole first screen.

| Area | File | Result |
| --- | --- | --- |
| Filter rail | `src/modules/reviews/components/ReviewsFilterPanel.tsx` (new) | Extracted from `dashboard-client.tsx`. Below 900 px the rail collapses behind a `Show`/`Hide` disclosure (`aria-expanded` + `aria-controls`); at ≥900 px the toggle is hidden and the rail is always open. |
| Active summary | same file | Collapsed state shows text chips (`All locations`, `3★`, warn tone when nothing is selected). Chips hide while expanded. Hidden controls are not focusable. |
| Wiring + CSS | `src/components/dashboard-client.tsx`, `src/app/(dashboard)/reviews/reviews.css` | Panel mounted in the same grid slot; no change to filter state, sort, limit, bulk actions or sync. |

Gate: **32/32** checks (`docs/ui-pilot/wave1/filters/filters-report.json`) — collapsed by
default, expanded on tap, keyboard operable, chips track the real filter state, rating
filter still applies, desktop unchanged, no page errors. Refreshed Reviews matrix: 48/48
captures, 0 overflow.

## Wave 1 §2 result — Customer Insights (verified)

| Area | File | Result |
| --- | --- | --- |
| Route CSS + token bridge | `src/app/(dashboard)/customer-insights/customer-insights.css` (new) | `.ci` scope maps legacy token names to `--ui-*` **inside this module only**; layout, bar lists, channel list, banners, states and the portalled date-picker bridge live here. |
| Page composition | `src/modules/customer-insights/components/CustomerInsightsClient.tsx` | Compact title + Refresh; two-row filter toolbar (period/from/to, then shop pills); KPI beside the weekly trend; shops + countries; channels; unmatched disclosure last. |
| Shops / countries | `HorizontalBarChart.tsx` | Recharts bars replaced with labelled CSS rows; shop rows are keyboard-operable filter buttons, unmatched labels are plain rows. |
| Channels | `ChannelBarChart.tsx` | One accent bar per row with label / count / share, two columns at ≥1024 px, stacked rows on phones. The per-channel rainbow palette is gone. |
| Weekly trend | `WeeklyBarChart.tsx` (new; `WeeklyLineChart.tsx` deleted) | Green bars on `--ui-series-primary`, tooltip, hidden data table for assistive tech. |
| Unmatched | `UnmatchedReviewPanel.tsx` | `<details>` disclosure, collapsed by default, value-count badge, three columns at ≥768 px. |
| Route | `src/app/(dashboard)/customer-insights/page.tsx` | Imports the route CSS. |
| Shared date picker | `src/components/ui/date-input.tsx`, `src/components/ui/filters/SingleDatePicker.tsx` | **Additive** optional `popoverClassName`; existing callers render unchanged. |

Scope labels (period and shop) are derived from the response `meta.filtered`, so a slow
refresh cannot mislabel data that is still on screen.

### Wave 1 §2 gate

| Gate | Result |
| --- | --- |
| Before/after captures at real widths, light + dark, both accents | Pass. `wave1/ci-before/` (9) → `wave1/ci-after/` (9 + 5 states + 3 date-picker). |
| Key interactions | Pass. Period presets, custom dates, shop pills, shop bar click + keyboard, refresh, unmatched disclosure: **39/39** checks (`ci-states-report.json`). |
| States | Pass. Loading (skeletons, blank KPI, no unconfigured flash), empty, API error, unconfigured, fetch failure. |
| No horizontal overflow | Pass. 1440/768/390, light/dark, green/orange — 9/9, 0 overflow, 0 page errors. |
| Accent bridge | Pass. Green `#2c6f4c` and orange `#b45309` drive bars, active pills and the portalled calendar. |
| No API/permission/data-contract change | Pass. No route handler, aggregation, normalizer or guard touched. |
| Tests / typecheck / lint / build | `npm run test` 251/251; `npx tsc --noEmit` clean; ESLint clean on changed files (repo baseline 20 errors / 3 warnings, pre-existing); `npm run build` exit 0. |
| Acceptance | **Pending** — user review required before the next module. |

Known limits for this step: the local API is unconfigured (no Google org token), so every
populated state was verified against a Playwright-mocked response; only the preview owner
account exists locally; loading/error/empty were simulated at the network boundary; physical
touch devices were not used.

## Current state (verified in the repo)

- 55 dashboard routes under `src/app/(dashboard)/`.
- Company theme: `app_settings.theme` → `getOrgTheme()` → `<html data-theme="capybara|forest">`.
  `forest` overrides `--company-accent`; `capybara` keeps the default accent.
- Light/dark: `next-themes`, `attribute="class"`, `storageKey="operate.theme"`, system
  mode disabled. The server renders `class="… dark"` with `suppressHydrationWarning`.
- Shared primitives already in use: `page-header` (14 files), `stat` (10), `card` (20),
  `module-tabs` (8), `pill` (9 modules), `pill-button` (6), `modal` (9),
  `view-toggle` (4), `drawer`, `filter-trigger`.
- Phase 0 promoted the pilot's semantic values into an opt-in `--ui-*` layer in
  `src/app/globals.css`; `/reviews/stats` is the first consumer. The route still owns its
  layout, table and chart CSS. `ModuleTabs variant="pills"` and the `ShopMultiSelect`
  class hooks remain opt-in.
- Wave 1 §1 made the whole Reviews module a consumer through the scoped `.revs` bridge in
  `src/app/(dashboard)/reviews/reviews.css`. Wave 1 §2 did the same for
  `/customer-insights` through `.ci` in
  `src/app/(dashboard)/customer-insights/customer-insights.css`. Outside those two scopes,
  legacy tokens and every other module are unchanged.
- Accent preference: `localStorage["operate.accent"]` = `green` | `orange`; absent means
  the company default (green). Browser-local only, no database field. Light/dark remains
  `localStorage["operate.theme"]`.

## Phase 0 — foundation extraction (no module migration)

### 0.1 Token layer

Add a semantic `--ui-*` layer to `src/app/globals.css` for both light and dark. Nothing
consumes it yet, so this step cannot change the running app.

Map the pilot values rather than inventing a new scale:

| Pilot token | Foundation token | Rule |
| --- | --- | --- |
| `--rs-canvas` | `--ui-canvas` | Warm light field / graphite dark field |
| `--rs-panel`, `--rs-panel-2` | `--ui-panel`, `--ui-panel-2` | Card, inset, expanded row |
| `--rs-border`, `--rs-border-strong`, `--rs-control-border` | `--ui-line`, `--ui-line-strong`, `--ui-control-line` | 1 px boundaries and control outlines |
| `--rs-fg` … `--rs-fg-4` | `--ui-fg-1` … `--ui-fg-4` | Primary → quiet text |
| `--rs-row-hover` | `--ui-row-hover` | Table hover/open |
| `--rs-accent*` | `--ui-accent*` | Accent family, see 0.2 |
| `--rs-positive`, `--rs-negative*`, `--rs-warn*` | `--ui-positive`, `--ui-negative*`, `--ui-warn*` | Fixed semantic colors |
| `--rs-bar`, `--rs-bar-track`, `--rs-neutral-mark` | `--ui-series-primary`, `--ui-series-track`, `--ui-series-neutral` | Chart/bar series |
| `--rs-radius*`, `--rs-shadow*` | `--ui-radius*`, `--ui-shadow*` | Shape |
| `--rs-veil`, `--rs-skeleton`, `--rs-focus` | `--ui-veil`, `--ui-skeleton`, `--ui-focus` | Loading/focus |

The existing `--canvas/--surface/--fg/--line/--good/--bad` scale stays untouched. The two
scales coexist only during migration; a final cleanup collapses the legacy scale after the
last consumer moves and the user accepts it. Document that as a follow-up, not part of
Phase 0.

### 0.2 Accent families

Two families, each with light and dark values: **green** (the accepted pilot emerald) and
**orange** (warm amber/bronze, compatible with the capybara palette). Each family defines:

`--ui-accent`, `--ui-accent-fg`, `--ui-accent-text`, `--ui-accent-soft`,
`--ui-focus`, `--ui-series-primary`.

Applied by `data-accent` on `<html>`. Green is the default token set, so an explicit
green choice needs no override rule; only orange has one:

```
[data-accent="orange"] { … }
[data-accent="orange"].dark { … }
```

No attribute → company default (0.3). The green family is copied from the pilot, not
re-invented, so the accepted screen does not move. Orange contrast is measured in
`REPORT.md`; all text, control, focus and chart pairs pass AA / 3:1 in both modes.

### 0.3 Company default vs user override

Precedence, highest first:

1. **User accent** — `localStorage["operate.accent"]` = `green` | `orange`.
2. **Company default** — derived from the existing `data-theme` (capybara/forest). For
   this phase both map to **green**, which keeps the accepted Stats appearance. The
   mapping lives in one function so a future company-level choice does not touch
   components.
3. **Code fallback** — green.

Rules:

- The user override is per browser, not per account. It never writes to the database and
  never changes another person's screen.
- Light/dark stays in `operate.theme` and is orthogonal. Any accent works in both modes.
- The company theme (`app_settings.theme`) remains owner-controlled on
  `/admin/appearance`; it is **not** where a personal accent is stored.
- "Use company default" removes the `operate.accent` key.
- Invalid or missing values fall back to the company default; never throw.
- Cross-tab changes sync through the `storage` event.
- A tiny pre-hydration script in `src/app/layout.tsx` applies the stored accent before
  paint to avoid a flash. `suppressHydrationWarning` is already present on `<html>`.
- The accent control is a three-option choice (Company default / Green / Orange) in the
  **Preferences** dialog opened from the sidebar user footer. No new route, no new
  permanent toolbar control and no owner-only gate. Direction users keep their password
  entry point inside the same dialog.

**Not in this phase:** a company-level accent setting in `app_settings` (would need a
migration), per-user server sync, or repointing the legacy `--accent` for every module.

### 0.4 Primitives

Promote from `FOUNDATION-CANDIDATES.md`, one at a time, keeping current defaults intact:

1. `Panel` (head/body/foot rhythm) and `KpiStat` (label → value → comparison → note).
2. `PillNav` behavior already exists as `ModuleTabs variant="pills"`; generalize the class
   prefix and keep `underline` the default.
3. `PillButton` variant and the `ShopMultiSelect` class hooks (already opt-in).
4. Sortable table pieces: `aria-sort` header button, tabular cells, sticky first column,
   row expansion. Column widths stay module-local.
5. `DistributionBars`, `Callout`, `RefreshVeil`, `ErrorBanner`, `StatusBar`, scroll hint.
   The last three only if a second module actually needs them.
6. Shared `Comparison` type from `stats-view.ts` (presentation only; keep the existing
   thresholds until a second module proves they generalize).

Each primitive ships with a colocated test where the logic is testable. No primitive may
change an existing consumer's markup or classes by default.

### 0.5 Phase 0 acceptance gate

- `/reviews/stats` screenshots match `e6e59c3` at 390/768/1024/1440, light + dark.
- Green is the default with no stored preference; orange changes only accent tokens.
- Switching accent leaves `--ui-positive`, `--ui-negative`, `--ui-warn` unchanged.
- Reset to company default works; invalid stored values fall back safely; no flash.
- No hydration error introduced; the existing `DashboardShell` warning is pre-existing.
- `npm run test`, `npx tsc --noEmit`, `npm run lint` (no new findings), `npm run build`.
- No route outside `reviews/stats` changes appearance in this phase.

Only after this gate passes does module migration start.

## Module migration order

Status legend: **pending** = not started; **implemented** = code changed, checks not
complete; **verified** = automated/manual checks pass; **accepted** = user accepted the
module's result.

Phase 0 is complete, Wave 0 remains accepted, and **Wave 1 §1 and §2 are implemented +
verified** (awaiting acceptance). No further module starts until they are reviewed.

Order is by risk: read-only first, then editable tables, then custom interactions, then
CRUD, then owner-only configuration, then non-standard surfaces. Each wave must be
accepted before the next starts, so a token or primitive problem is caught on a small
surface.

### Wave 0 — accepted baseline

| Order | Surface | Shared patterns | Risk | Status |
| --- | --- | --- | --- | --- |
| 0 | `reviews/stats` | Page header, pill nav, KPI, chart, sortable table, filters | Proven | **accepted** (`e6e59c3`) |

### Wave 1 — finish Reviews, then low-risk read-only dashboards

| Order | Surface (routes) | Shared patterns today | Risk | Status |
| --- | --- | --- | --- | --- |
| 1 | `reviews` siblings: `/reviews`, `/reviews/inbox`, `/reviews/templates`, `/reviews/rules`, `/reviews/locations` | Module tabs, filters, pill, tables, modals | Medium — inbox actions, but same domain as the pilot | **verified** (awaiting acceptance) |
| 2 | `/customer-insights` | Page header, stat, filters, card | Low — one read-only client | **verified** (awaiting acceptance) |
| 3 | `/treasury` | Page header, filters, kbd | Low — single read-only screen | pending |
| 4 | `/direction` | Module tabs, stat, pill button, card | Low–medium — role-specific read-only reporting | pending |
| 5 | `/reports` | Page header, stat, card, module tabs, modal | Medium — dense tables, export/modal flows | pending |
| 6 | `/payments` | Page header, stat, view toggle, filters | Medium — one large client, status changes | pending |

Why first: these screens are mostly read-only, already use the shared primitives, and
give fast feedback on the token layer without touching scheduling or payroll data.

### Wave 2 — finance, accounting and sales tables

| Order | Surface (routes) | Shared patterns today | Risk | Status |
| --- | --- | --- | --- | --- |
| 7 | `/accounting` | Page header, stat, view toggle, modal, pill, filters | High — daily entry, ledger, sheet import | pending |
| 8 | `/finance`, `/finance/recurring-costs`, `/finance/shop-settings` | Page header, card, pill button, modal, filters | Medium — settings writes | pending |
| 9 | `/loyverse`, `/loyverse-preview`, `/loyverse-export`, `/loyverse-sandbox`, `/shift-sales` | Module tabs, stat, card, pill button, modal, checkbox | High — 3.6k lines, analytics + sync + sandbox | pending |

Why here: the visual patterns are close to Wave 1, but these screens write financial data.
They need the token layer to be stable before their tables and modals are restyled.

### Wave 3 — time and scheduling

| Order | Surface (routes) | Shared patterns today | Risk | Status |
| --- | --- | --- | --- | --- |
| 10 | `/attendance` | Page header, filters | Medium — one 989-line client, date logic | pending |
| 11 | `/scheduling`, `/scheduling/week`, `/scheduling/annual`, `/scheduling/time-off`, `/scheduling/settings`, `/scheduling/import`, `/scheduling/[id]` | Module tabs, card, drawer, filter trigger, filters | Very high — grids, drag/drop, import, per-person detail | pending |

Why late: custom interaction surfaces are where a token-only change most easily breaks
layout or pointer behavior. Migrate the calendar last and verify with real interactions,
not only screenshots.

### Wave 4 — CRUD lists and directories

| Order | Surface (routes) | Shared patterns today | Risk | Status |
| --- | --- | --- | --- | --- |
| 12 | `/animals` | Page header, modal, pill, view toggle, date input | Medium — create/edit modal | pending |
| 13 | `/documents` | Page header, modal, pill, date input, filters | Medium — upload/metadata forms | pending |
| 14 | `/directory` (contacts module) | Module tabs, pill | Low–medium — shared list, supplier/shop tabs | pending |

### Wave 5 — engagement and administration

| Order | Surface (routes) | Shared patterns today | Risk | Status |
| --- | --- | --- | --- | --- |
| 15 | `/challenges` and its 5 sub-routes | Module tabs, card, filters, modal | Medium — mostly read-only, many tabs | pending |
| 16 | `/admin` and its 9 sub-routes; `/employees` (thin wrapper around `EmployeesListClient`) | Module tabs, card, pill button, modal, date input, filters | Very high — owner-only configuration, users, locations, automations | pending |

Why last among standard screens: admin mistakes have the highest consequence, and the
owner-only pages are the least exercised by staff. Migrate after the patterns are proven
on user-facing surfaces.

### Wave 6 — non-standard surfaces (decide per surface)

| Surface | Why separate | Proposed treatment | Status |
| --- | --- | --- | --- |
| `/wiki`, `/wiki/thai-taxes`, `/wiki/thai-taxes/[slug]` | Rich-text content and article layout, no shared primitives | Token-only wrapper if it reads naturally; do not force dashboard panels | pending |
| `/brand` | Embedded, scoped static HTML guideline document | Likely **exempt**; it is a document, not app UI | pending |
| `/home`, `/overview` | Shell landing/redirect surfaces, few shared components | Align typography/spacing only if they are real screens | pending |

## Per-module acceptance gate

A module moves to **implemented** only when its own files opt in explicitly (wrapper,
primitive swap or token replacement). It moves to **verified** when:

- Before/after screenshots exist at the widths the module actually uses, light + dark.
- The module's key interactions pass (filters, sorting, modals, forms, empty/error states).
- No API route, permission, calculation or data contract changed.
- `npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` stay clean
  relative to the known baseline.
- No page-level horizontal overflow at 390 px.

It moves to **accepted** only after the user reviews the result. Do not batch acceptance
across waves.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Two neutral token scales drift | One mapping table, no new values without a pilot source; schedule the legacy-scale cleanup after the last module |
| Accent used for status | Keep `--ui-positive/negative/warn` independent; add a test that switching accent does not change them |
| Accent flash on load | Pre-hydration script; verify with cache-disabled reloads in both modes |
| Stats appearance drifts during extraction | Pixel parity is a hard gate; keep `--rs-*` until parity is proven, then remove in the same module diff |
| A primitive quietly changes other modules | Default variants and markup stay unchanged; only opt-in props/variants are added |
| Scheduling/admin regressions | Migrate them last, with interaction checks and real data |

## Decisions resolved for Phase 0

1. **Green is the default accent** for both company themes; orange is opt-in.
2. The accent control lives in the existing user area: the sidebar user footer opens a
   **Preferences** dialog. No new permanent toolbar control.
3. **Orange is allowed with either company theme**, including `forest`.
4. The accent tints selected controls, primary actions and the **primary** chart series.
   Semantic status and multi-series colors stay independent.

Phase 0 is complete. Wave 1 §1 and §2 are implemented and verified but **not yet
accepted**. Do not start the next module until both results have been reviewed and
accepted.
