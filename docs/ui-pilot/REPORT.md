# Reviews Stats UI pilot — validation report

Branch: `ui/reviews-stats-pilot`. The pilot is committed at **`e6e59c3`**; **Phase 0**
(shared foundations + accent preference) is committed at **`ac88b15`**; **Wave 1 §1**
(Reviews siblings) is committed at **`e998f99`**; **Wave 1 §2** (Customer Insights +
Inbox filter disclosure) is committed at **`be6f556`**; **Wave 1 §3** is committed as
**`7393230`** (`/reports`) and **`e5c0e9a`** (`/direction`); the post-review visual-system
revision described below is the current branch tip.
Scope: `/reviews/stats` pilot, the Phase 0 foundation/accent work, the Reviews sibling
routes, `/customer-insights`, the Inbox filter rail, `/reports` and `/direction`.
**No other module was migrated.** No deploy, push, merge or DB migration. Local URLs:
**http://localhost:3000/customer-insights**, **http://localhost:3000/reports**,
**http://localhost:3000/direction** (preview login, `NEXT_PUBLIC_PREVIEW_MODE=true`).

The dev server is running. Sign in with the existing preview password from `.env.local`;
the password is not recorded here.

## Final status

Pilot and Phase 0 are complete on this branch. Both pilot refinements — rating precision
and mobile KPI density — remain validated. Phase 0 extracted the accepted Stats values
into an opt-in `--ui-*` foundation, added `Panel`/`KpiStat`, and shipped a browser-local
green/orange accent preference. `/reviews/stats` is visually unchanged (pixel parity
below). **Wave 1 §1** migrated the Reviews siblings (`/reviews/inbox`,
`/reviews/templates`, `/reviews/locations`, plus the two redirect routes) onto the same
foundation, with a scoped token bridge so no other module restyled. **Wave 1 §2** migrated
`/customer-insights` onto the same foundation and collapsed the Inbox filter rail on
mobile. **Wave 1 §3** migrated `/reports` and `/direction` as one group (they share three
report endpoints and three view components), promoting only the genuinely shared layout
utilities to `globals.css`. A post-review revision then realigned both module headers with
the Reviews Stats breadcrumb/pill system, harmonized the period/shop selectors, and fixed
the future-month presentation in Revenue comparison (display only — calculations untouched).
All three are **implemented and verified locally, awaiting user acceptance**. They are not
pushed, merged or deployed. Live Customer Insights data, runtime staff access, real Google
sync, a real organization `forest` switch and physical touch devices remain pending
(details below).

## Wave 1 §3 — Reports + Direction

Status: **verified** (automated + visual checks pass) → awaiting **accepted**.
Commits: `7393230` (`/reports`), `e5c0e9a` (`/direction`).
Scope: `/reports` and `/direction` only. The two routes were migrated as one group because
they share `/api/reports/accounting`, `/api/reports/daily-profit`,
`/api/reports/revenue-comparison` and the `DailyProfitView`, `OperationsView` and
`RevenueComparisonView` components. `/treasury` (cash-count, reserve, bank-account writes)
and `/payments` (payment status writes) were deliberately deferred: both write finance
data and get their own migration and review.

### What changed

| Area | File | Change |
| --- | --- | --- |
| Shared utilities | `src/app/globals.css` | `.ui-kpi-grid`, `.ui-kpi-delta`, `.ui-table-scroll`, `.ui-toolbar` / `.ui-toolbar-spacer`, `.ui-bar-row` / `.ui-bar-head`. Global rather than per-route because the shared report views are rendered by two routes. |
| KPI primitive | `src/components/ui/kpi-stat.tsx` | Additive `tone="positive" \| "negative"`. Existing callers unchanged. |
| Reports bridge | `src/app/(dashboard)/reports/reports.css` (new) | `.rep` scoped token bridge; the four tab panels, filters, bar lists and states. |
| Reports views | `src/modules/reports/components/ReportsClient.tsx`, `DailyProfitView.tsx`, `RevenueComparisonView.tsx` | KPI rows on `KpiStat` + `.ui-kpi-grid`; wide tables on `.ui-table-scroll`; ranked lists on `.ui-bar-row` (share column drops below 768 px so labels stop truncating); both edges of the mobile tab bar fade; “réel/estimé” badge moves next to the shop name. |
| Direction bridge | `src/app/(dashboard)/direction/direction.css` (new) | `.dir` scope + `.dir-shell`, `.dir-stack`, `.dir-panel`, `.dir-panel-title`, `.dir-equation*`, `.dir-source`, `.dir-loading`, `.dir-empty`, `.dir-kpi-outcome`. |
| Direction shell | `src/modules/direction/components/DirectionClient.tsx`, `src/app/(dashboard)/direction/page.tsx` | Module header (`ui-module-header`): breadcrumb, compact `Direction` title and pill tabs. `.dir-shell` holds two `.dir` siblings (header + tabs, then the non-Loyverse panels). The embedded **Loyverse** tab is a plain sibling outside `.dir`. |
| Direction dashboard | `DirectionExecutiveDashboard.tsx` | The `Ventes − Dépenses = Résultat` equation becomes `.dir-equation`: a 3-cell grid on desktop, a stacked ledger on phones. `.dir-equation-value` sets its own line-height (the inherited 16.25 px Card value made the figures overflow and collide with the label above). |
| Direction panels | `DirectionOverview.tsx`, `DirectionComparaison.tsx`, `DirectionEndOfMonth.tsx`, `DirectionOperations.tsx` | KPI rows on the shared grid; toolbars and table scroll shared; the local `KpiCard` duplicate removed in favour of `KpiStat`; previous-year bars use `--ui-series-neutral` instead of `#f59e0b`; categorical `--info` / `--purple` / `--bronze` map to `--ui-series-neutral` / `--ui-warn` / `--ui-accent` inside the bridge. |
| Direction source banner | `DirectionSourceBanner.tsx` | Owner-only “Sources & synchronisation” block becomes a collapsed `<details>` disclosure. |
| Sign fix | `DirectionEndOfMonth.tsx` | New local `signedMoney()`: `formatMoney()` renders absolute values, so a negative “Reste en coffre” was displayed unsigned next to a red tone. |

### Design decisions

1. **Scoped bridges, no global repoint.** `.rep` and `.dir` remap legacy token names to
   `--ui-*` inside their own scope only. `--accent`, `--surface`, `--fg` and `--line` keep
   their values everywhere else.
2. **Shared utilities go in `globals.css`.** `DailyProfitView`, `OperationsView` and
   `RevenueComparisonView` are consumed by both routes; their classes cannot live in either
   route's stylesheet.
3. **Loyverse stays outside the Direction bridge.** It belongs to a module that has not been
   migrated. Verified: inside the Loyverse tab `--accent` is still `#2563eb` and there are
   0 migrated (`ui-*`) classes.
4. **Layout follows each workflow.** `/reports` keeps four dense tabs (daily P&L,
   operations, revenue comparison, by shop) with tables and ranked lists. `/direction`
   gets one header, pill tabs, a date-first dashboard whose equation reads top-down on
   phones, and month steppers for the two monthly panels.
5. **Semantic colour only where it means something.** Signed results carry `tone`; series
   colours come from the palette instead of ad-hoc hex values. The one KPI that carries an
   outcome (“Reste en coffre”) keeps a quiet accent left edge rather than a full accent fill.
6. **No calculation, API or permission change.** The only behavioural deltas are display
   fixes: equation figures no longer overflow their card, and a negative remainder keeps
   its sign.

### Verification matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Before/after at real widths, light + dark, both accents | Pass | `wave1b/before/` (10) → `wave1b/after/` (33) |
| Post-review visual-system revision | Pass | `wave1b/after2/` (35) + 24/24 interaction checks; see “Revision” below |
| No horizontal overflow | Pass | 1440/768/390 — 0 document-level overflow; wide tables scroll inside `.ui-table-scroll` with shadows only when needed |
| Reports interactions | Pass | 4 tabs, date range, shop filter, sort, breakdown disclosure |
| Direction interactions | Pass | 7 tabs, source disclosure, date shift, expense breakdown, shop filter, eye-toggle POST (`{"tab_key":"dashboard","visible":…}`), comparaison edit/cancel/year shift, end-of-month expand |
| States | Pass | Reports: loading, empty, API error. Direction: loading skeleton (5 placeholders), empty, API error |
| Accent bridge | Pass | Active tabs, KPIs and series use `#2c6f4c` (green) / orange inside `.rep` / `.dir`; Loyverse and every other module unchanged |
| Reports suite | **15/15** | Playwright, `wave1b/` |
| Direction suite | **20/20** | Playwright, `wave1b/` |
| Tests / typecheck / lint / build | Pass | `npm run test` 251/251; `npx tsc --noEmit` clean; ESLint 0 errors on changed files (repo baseline 20 errors / 3 warnings, pre-existing); `npm run build` exit 0 |

### Evidence

`docs/ui-pilot/wave1b/before/` and `docs/ui-pilot/wave1b/after/`:

- Reports — daily 1440/768/390 light-green, 1440/390 dark-orange; revenue 1440/390;
  operations 1440/390; by shop 1440 light-green + 390 dark-orange; plus
  `reports-error-daily-1440-light.png` and `reports-empty-operations-1440-light.png`.
- Direction — dashboard 1440/768/390 light-green, 1440/390 dark-orange; overview 1440/390
  light-green + 1440 dark-orange; comparaison 1440/390 light-green + 390 dark-orange;
  end of month 1440/390 light-green + 1440 dark-orange; details 1440/390; daily 1440;
  loyverse 1440; plus `direction-empty-overview-1440-light.png` and
  `direction-error-dashboard-1440-light.png`.

All captures are **real local Supabase data** (HTTP 200, no page errors besides the known
`DashboardShell` theme-toggle hydration warning), not fixtures.

### Revision — alignment with the accepted visual system

Status: **implemented and verified locally**; §3 still awaiting acceptance. Trigger: the
first pass adopted the tokens but not the organization (flat `PageHeader`, underline tabs,
toolbars that did not read like Reviews Stats). This revision applies the accepted reading
order to both modules.

| Area | File | Change |
| --- | --- | --- |
| Tab primitive | `src/components/ui/module-tabs.tsx` | Additive `variant="pills"` on `ControlledTabs`, reusing the same `.ui-pillnav*` markup as `ModuleTabs`. Underline remains the default. |
| Shared filter rows | `src/app/globals.css` | `.ui-filter-rows` / `.ui-filter-row` / `.ui-filter-label` / `.ui-filter-control` (62 px label column, wrapping control), `.ui-toolbar-actions`, `.ui-note`. `.ui-pillnav-link` now accepts `<button>` (`font-family: inherit`, `cursor: pointer`). |
| Reports header | `ReportsClient.tsx` | Breadcrumb `Reports / <tab>`, compact `ui-module-title` and the four real tabs as shared pills in `ui-module-header-row`. `PageHeader` removed. |
| Direction header | `DirectionClient.tsx` | Breadcrumb `Direction / <tab>`, compact `Direction` title and the seven tabs as pills, eye toggles kept. The owner “Sources & synchronisation” disclosure moved to the end of the panel. |
| Selectors | `ReportsClient.tsx`, `DailyProfitView.tsx`, `RevenueComparisonView.tsx`, `DirectionExecutiveDashboard.tsx`, `DirectionOverview.tsx`, `DirectionComparaison.tsx`, `DirectionEndOfMonth.tsx` | Every panel now uses the Reviews pattern: a label column (`Période`, `Boutiques`) plus a control row, actions on the right. Screen-specific behaviour is unchanged (day range, multi-shop, year stepper + month). |
| Hierarchy | Reports + Direction panels | Filters → KPIs → primary chart/table → secondary panels. The `By Shop` filter no longer stretches vertically (`.ui-filter-rows` is wrapped in `.ui-toolbar`; as a direct child of the column page it was growing). The duplicated “Octobre 2026” label in End of month was removed. |

#### Revenue comparison — future and partial months

**Findings (code inspected before any change).** `monthly_revenue_by_location` aggregates
the `daily_entries` rows that exist. A month that has not started has no rows, so it is
`0`; `deltas(0, prev > 0)` then yields `deltaPct = -100`. The API has no “today” awareness.
The focus month is compared with the **full** prior-year month, and the YTD sums the
selected months (a partial current month against full prior-year months). This is the
existing financial logic and it was **not changed**; no API, SQL or calculation was touched.

**Presentation only.** Future months now read `—` (KPI, monthly row, by-shop row, and the
chart bar is omitted) with an “à venir” pill instead of `฿0 / −100 %`. The running month is
tagged “en cours”, and a `.ui-note` states that it is compared with a full prior-year month;
when the focus is a future month it also states that the YTD adds only the months entered
while N−1 is complete. Deltas are only shown when a real prior value exists.

**Business decision to confirm.** Whether the current month should be compared to the same
number of days of the prior month (like-for-like) is a finance decision. The logic is
preserved and the limitation is now stated in the UI; changing it would require an API
change and a methodology update.

#### Parity and gates

| Check | Result | Evidence |
| --- | --- | --- |
| Same period/shop before → after (this revision) | Pass | `wave1b/after/` vs `wave1b/after2/`: ฿5,562,549 / ฿66,369,758 / ฿67,424,161 identical. Nov/Dec change only from `฿0 / ▼100.0 %` to `— / à venir`. |
| Interaction checks | **24/24** | Reports: 4 pills, labels, shop filter change/restore, KPI = monthly row = shop total, current/future tags, no −100 %, note. Direction: 7 pills, labels, day shift + reload, source disclosure, eye toggle POST, overview shop filter and 5 KPIs. |
| No horizontal overflow | Pass | 1440 / 768 / 390 |
| Tests / typecheck / lint / build | Pass | `npm run test` 251/251; `npx tsc --noEmit` clean; ESLint repo baseline 20 errors / 3 warnings, all pre-existing (0 new); `npm run build` exit 0 |
| Captures | **35** | `wave1b/after2/`: Reports 4 tabs × 1440-light / 1440-dark / 768-light / 390-light + 2 future-month; Direction 4 tabs × the same 4 + 1 future-month |

All `after2` captures use real local Supabase data. The only console warning is the known
`DashboardShell` theme-toggle hydration mismatch in dark mode.

### Known limits

- **Single role account.** Only the preview owner exists locally; role-specific rendering
  (staff view of `/direction`) was not exercised.
- **Loading/error/empty** were simulated at the network boundary.
- **`/api/locations` returns 503 locally** without a Google token; location lists come from
  the report payloads.
- **`/api/direction/tabs` returns all `false` locally**, so the owner sees every tab plus
  the eye toggles. The eye toggle still flips the server value and its label; the dimmed
  state only applies to the `direction` (boss) role — pre-existing behaviour, not changed
  here. The test intercepts that POST, so no visibility state was persisted.
- **Production data** was not used; verification ran against the local database.
- **Physical touch devices** were not used; responsive checks are Playwright emulation.

## Wave 1 §2 — Customer Insights

Status: **verified** (automated + visual checks pass) → awaiting **accepted**.
Scope: `/customer-insights` only, plus the requested Inbox filter disclosure under
`/reviews/inbox`.

### What changed

| Area | File | Change |
| --- | --- | --- |
| Route CSS | `src/app/(dashboard)/customer-insights/customer-insights.css` (new, 724 lines) | `.ci` scope plus a token bridge mapping the legacy names to `--ui-*` **inside this module only**. Layout, bar lists, channel list, banners, states, unmatched disclosure and the portalled date-picker bridge. |
| Page composition | `src/modules/customer-insights/components/CustomerInsightsClient.tsx` | Compact title + Refresh; two-row filter toolbar; KPI beside the weekly trend; shops + countries; channels; unmatched disclosure last. Scope labels come from the response `meta.filtered`. |
| Shops / countries | `HorizontalBarChart.tsx` | Recharts bars replaced with labelled CSS rows; shop rows are keyboard-operable filter buttons; unmatched labels stay plain rows. |
| Channels | `ChannelBarChart.tsx` | One accent bar per row with label / count / share; two columns at ≥1024 px; stacked rows on phones. Per-channel rainbow palette removed. |
| Weekly trend | `WeeklyBarChart.tsx` (new; `WeeklyLineChart.tsx` deleted) | Green bars on `--ui-series-primary`, tooltip, hidden data table for assistive tech. |
| Unmatched | `UnmatchedReviewPanel.tsx` | `<details>` disclosure, collapsed by default, value-count badge, three columns at ≥768 px. |
| Route | `src/app/(dashboard)/customer-insights/page.tsx` | Imports the route CSS. |
| Shared date picker | `src/components/ui/date-input.tsx`, `src/components/ui/filters/SingleDatePicker.tsx` | **Additive** optional `popoverClassName`; existing callers unchanged. |
| Inbox filters | `src/modules/reviews/components/ReviewsFilterPanel.tsx` (new), `src/components/dashboard-client.tsx`, `src/app/(dashboard)/reviews/reviews.css` | Below 900 px the filter rail collapses behind a `Show`/`Hide` disclosure; active filters stay visible as text chips. |

### Design decisions

- **Same bridge pattern as Reviews.** `.ci` remaps the legacy token names the shared
  primitives consume, so `Button`, `PillButton`, `DateInput` and the panel classes adopt
  the palette without a global restyle. The only shared edit is opt-in.
- **Organised for how the screen is read.** Scope (KPI) → volume over time (weekly bars) →
  where (shops, countries) → how they found us (channels) → maintenance data (unmatched).
- **One accent, length carries magnitude.** Every bar uses the primary series token. The
  rainbow channel colours and the blue line chart are gone; semantic colours are not
  reused for decoration.
- **No invented metrics.** Only the existing payload is displayed — totals, by shop, by
  channel, by week, top countries, unmatched buckets.
- **Honest states.** Loading shows skeletons with a blank KPI; unconfigured, empty, API
  error and fetch failure each replace the analytics region instead of rendering empty
  charts underneath. Initial load no longer flashes the unconfigured banner.
- **Scope labels follow the data on screen.** Period and shop labels derive from
  `meta.filtered`, not from the filter the user just clicked.
- **Filters stay reachable at every width.** Shops are pills *and* clickable bars; the
  period is a native `select`; dates use the shared picker with a module-scoped popover.
- **Mobile Inbox.** The filter rail was the first full screen on a phone. It now collapses
  by default below 900 px with a text summary of the active filters, and stays fully open
  on desktop.

### Filter-truth follow-up

The earlier Phangan / Last 30 days capture (1,284 total, 2025 chart dates) was traced to
the **capture fixture**, not the page: the script returned one static 2025 payload for
every request. A dedicated suite now drives the page against a **filter-aware** mock built
with the same bucket rules as `lib/aggregate.ts`, and asserts the UI against the response
the page actually received.

Verified: request params (`from`/`to`/`shop`), KPI total, scope label, weekly table and
chart labels, countries and channels panels, shop-panel visibility, empty state, and a slow
first response followed by a rapid shop change (the `requestId` guard keeps the newest
response). **56/56 checks** (`wave1/ci-after/ci-filter-truth-report.json`).

Real mismatches fixed (calculation and API semantics untouched):

- Footers now state what they count — `N classified responses` for countries/channels
  (unmatched values are excluded) and named-shop counts for the shops panel — with correct
  singular forms.
- The empty panel names the range the sheet actually covers when `meta.dateRange` exists.
- The previous response dims while a refresh is in flight (`data-refreshing`), so stale
  numbers are visibly stale rather than silently mislabelled.

Layout: below 768 px the shop pills collapse to one accessible disclosure (matching
Reviews Stats); on desktop the KPI card stretches to the weekly chart's height and anchors
the source-range note to its bottom. No new metrics.

### Verification matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Before/after at real widths, light + dark, both accents | Pass | `wave1/ci-before/` (9) → `wave1/ci-after/` (9 matrix + 5 states + 3 date-picker) |
| No horizontal overflow | Pass | 1440/768/390 × light/dark × green/orange — 9/9, 0 overflow, 0 page errors |
| Period presets and custom dates | Pass | Preset sends `from`/`to`; custom picker sets `custom` and sends only the changed bound |
| Shop filtering | Pass | Pill click and shop-bar click/Enter both request `shop=<name>`; shop panel hides and countries widen when filtered |
| Accent bridge | Pass | Active pill, bars and portalled calendar use `#2c6f4c` (green) / `#b45309` (orange) |
| States | Pass | Loading skeletons + blank KPI, empty, API error, unconfigured, fetch failure |
| Unmatched disclosure | Pass | Closed by default, opens on click, three sections |
| Mobile layout | Pass | Filters reachable, shop pills collapse to one disclosure, channel names untruncated, header row hidden, no overflow |
| Customer Insights suite | **40/40** | `wave1/ci-after/ci-states-report.json` |
| Customer Insights filter-truth suite | **56/56** | `wave1/ci-after/ci-filter-truth-report.json` |
| Inbox filter disclosure | **32/32** | `wave1/filters/filters-report.json` |
| Reviews matrix (re-run) | 48/48, 0 overflow | `wave1/after/after-report.json` |
| Tests / typecheck / lint / build | Pass | `npm run test` 251/251; `npx tsc --noEmit` clean; ESLint clean on changed files; `npm run build` exit 0 |

### Known limits

- The local `/api/customer-insights/summary` returns `configured: false` because no Google
  org token is linked. Every populated state was verified against a Playwright-mocked
  response; filtering was verified against a **filter-aware** mock that mirrors
  `lib/aggregate.ts`. **Real Google/spreadsheet data and latency remain unverified** and
  must be checked before this module is accepted.
- The page is owner-only; only the preview owner account exists locally.
- Loading, error and empty states were simulated at the network boundary.
- Physical touch devices were not used; responsive checks are Playwright emulation.


## Wave 1 §1 — Reviews siblings

Status: **verified** (automated + visual checks pass) → awaiting **accepted**.
Scope: `/reviews` (redirects to `/reviews/inbox`), `/reviews/inbox`, `/reviews/templates`,
`/reviews/rules` (owner-only redirect to `/reviews/templates`) and `/reviews/locations`.
`/reviews/stats` stays at Phase 0 parity; it was not redesigned in this step.

### What changed

| Area | File | Change |
| --- | --- | --- |
| Route CSS | `src/app/(dashboard)/reviews/reviews.css` (new, 921 lines) | `.revs` scope plus a token bridge that maps the legacy names (`--surface`, `--fg*`, `--line*`, `--accent`, `--good/--warn/--bad`, `--r-*`, `--shadow-*`, `--border`, `--muted`, `--primary`) to `--ui-*` **only inside Reviews**. Module styles for header, summary, filter rail, review cards, controls, templates, locations, modals and empty states. |
| Layout | `src/app/(dashboard)/reviews/layout.tsx` | Wraps the module in `.revs` and imports the route CSS. |
| Shared header | `src/modules/reviews/components/ReviewsTabNav.tsx` | One breadcrumb + compact title + pill nav for every Reviews route; the Stats-only variant is gone. |
| Shared header CSS | `src/app/globals.css` | Promotes `ui-module-header`, `ui-breadcrumb*`, `ui-module-header-row`, `ui-module-title`; Stats uses them with pixel parity. |
| Inbox | `src/components/dashboard-client.tsx` | Summary bar (unreplied + per-star counts), filter rail panel, list controls beside the list, grouped limit control, empty/loading/error states. |
| Review card | `src/components/review-card.tsx` | Semantic star tones (5★/4★ positive, 3★ warn, 2★/1★ negative) independent of the accent; card anatomy aligned to the contract. |
| Filters | `src/components/dashboard-filters.tsx`, `src/components/all-none-toggle.tsx` | Group/option classes, pressed states, All/None toggle with `aria-pressed`. |
| Controls | `src/modules/reviews/components/ReviewsControlsBar.tsx` | Count, sort/shuffle, limit and bulk actions in one bar; bulk actions wrap below the list header on narrow widths. |
| Templates | `src/components/config-client.tsx` | `Panel` anatomy, category chips, star filter, message rows, add/delete modals on the shared surfaces. |
| Locations | `src/components/config-client.tsx` | `Panel` anatomy, selectable rows with a selected mark, missing-GBP warning, loading/empty/error states with icon + copy. |
| Sync / bulk | `src/components/sync-button.tsx`, `src/modules/reviews/components/BulkReplyPanel.tsx` | Sync picker and bulk modal use the shared classes and opaque modal surface. |
| Shared button | `src/components/ui/button.tsx` | Hover/active colours read `--accent-hover`, `--accent-active`, `--bad-hover`; defaults keep the legacy blue/red, so other modules are unchanged. |
| Stats parity | `src/app/(dashboard)/reviews/stats/reviews-stats.css` | Duplicated header rules removed; layout and values untouched. |

New backward-compatible tokens: `--accent-hover`, `--accent-active`, `--bad-hover`,
`--ui-radius-md`, `--ui-positive-soft`.

### Design decisions

- **Scoped bridge, not a global restyle.** Shared primitives (`Panel`, `Button`, `Pill`,
  `ModuleTabs`, inputs) inherit the new palette inside `.revs` because the bridge remaps
  the legacy names they consume. Nothing outside Reviews changes.
- **One header for the module.** Breadcrumb (`Reviews / <route>`), compact `Reviews`
  title and the pill nav render on every route; Stats keeps the accepted look.
- **Task-shaped inbox.** Summary → filter rail → list controls → review list. Bulk actions
  sit with the list they affect; the sync action stays in the summary bar.
- **Semantic stars.** Star colour mirrors the Stats distribution (positive / warn /
  negative), so switching accent never changes what a rating means.
- **Panel-first config screens.** Templates and Locations share the same `Panel` anatomy
  and inline states; no bespoke page shells.
- **Responsive.** Inbox collapses from two columns to one at 900 px; filter options become
  a two-column grid at ≤900 px; summary stacks at ≤520 px. Verified at 390/768/1440.

### Verification matrix

| Check | Result | Evidence |
| --- | --- | --- |
| All Reviews routes render breadcrumb + title + pill nav | Pass | 48/48 captures have the breadcrumb; `wave1/after/after-report.json` |
| No page-level horizontal overflow | Pass | 48/48 combinations (4 routes × 3 viewports × 2 themes × 2 accents) |
| Accent + theme resolve correctly | Pass | `--ui-accent` `#2c6f4c`/`#2f7a52` green, `#b45309`/`#c2410c` orange; panel `#ffffff`/`#1d2022` |
| Stats parity with Phase 0 | Pass | 92 differing pixels (0.005%) in the timestamp area only |
| Inbox filters, sort, shuffle, limit, All/None | Pass | `wave1/states/states-report.json` |
| Sync loading and error | Pass | Loading label + error toast; `states2-report.json` |
| Templates add/delete theme + rating rules | Pass | `wave1/states/templates-*.png` |
| Locations loading / empty / error / selection / confirm | Pass | `wave1/states/locations-*.png`; `states2-report.json` |
| Empty inbox | Pass | `wave1/states/inbox-empty-light.png` |
| Focus outline on filter controls | Pass | 2 px `--ui-focus` ring measured |
| Redirects (`/reviews`, `/reviews/rules`) | Pass | Resolve to inbox / templates |
| No page errors | Pass | 0 `pageerror`; console only the known locations 503 and the pre-existing `DashboardShell` theme-toggle hydration warning |

### Commands

| Command | Result |
| --- | --- |
| `npm run test` | **251 passed / 38 files** (unchanged from Phase 0) |
| `npx tsc --noEmit` | **Clean**, exit 0 |
| `npx eslint` on changed files | **Clean** (repo baseline remains 20 errors / 3 warnings, all pre-existing) |
| `npm run build` | Exit 0 |
| Playwright capture matrix | 48/48 routes × viewports × themes × accents; 0 overflow |
| Playwright interaction/state suite | **31/31 + 18/18** checks |

### Evidence

`docs/ui-pilot/wave1/`

- `before/` — 19 captures of the pre-migration routes.
- `quick/` — 10 iteration captures (light/dark, green/orange, 3 viewports).
- `states/` — 19 state captures + `states-report.json` (31 checks) and
  `states2-report.json` (18 checks: sync error, locations loading/empty/error in
  light-green and dark-orange).
- `after/` — 48 captures (inbox/templates/locations/stats × 1440/768/390 × light/dark ×
  green/orange) + `after-report.json`.

### Wave 1 §1 pending

1. **Locations data** — `/api/locations` returns 503 in this environment (Google token not
   configured). The populated list, selection and confirmation were verified against
   mocked route responses, not real Business Profile data.
2. **Real Google sync** — the sync POST is mocked in the error/loading checks.
3. **Staff role** — only the preview owner account was available; the owner-only
   `/reviews/rules` redirect and visibility code are unchanged.
4. **Real `forest` organization switch** — not performed; `forest` remains verified
   through the theme contract.
5. **Physical touch devices** — Playwright emulation only.
6. **User acceptance** — the module is ready to review; do not start Wave 1 §2 first.

## Phase 0 — shared foundations and accent preference

Phase 0 is additive: it introduces an opt-in semantic layer and primitives, makes
`/reviews/stats` the first consumer, and adds a browser-local accent choice. It does not
repoint the legacy global tokens or restyle another module.

### What changed

| Area | File | Change |
| --- | --- | --- |
| Tokens | `src/app/globals.css` | Additive `--ui-*` light/dark layer (surfaces, text, accent, semantic status, series, shape, spacing, type) and `.ui-panel*`, `.ui-kpi*`, `.ui-pillnav*`, `.ui-accent-option*`. Legacy `--accent/--canvas/--surface/--fg/--line` untouched. |
| Accent override | `src/app/globals.css` | Green is the default. `[data-accent="orange"]` and `[data-accent="orange"].dark` override only the accent, focus and primary-series tokens. |
| Accent state | `src/lib/accent.ts`, `src/lib/accent.test.ts` | Normalize/read/apply/write helpers, storage key, event name and pre-paint script. |
| Accent UI | `src/components/accent-preference.tsx` | `AccentSync` (cross-tab + storage event) and the Preferences control. |
| Pre-paint | `src/app/layout.tsx` | Inline script applies the stored accent before first paint. `<html>` already has `suppressHydrationWarning`. |
| Entry point | `src/components/dashboard-shell.tsx` | Sidebar user footer opens Preferences; direction users keep their password entry point inside the dialog. |
| Primitives | `src/components/ui/panel.tsx`, `src/components/ui/kpi-stat.tsx` | Shared panel anatomy and KPI anatomy. |
| Pill nav | `src/components/ui/module-tabs.tsx` | `variant="pills"` now uses `ui-pillnav*`; still opt-in. |
| First consumer | `src/app/(dashboard)/reviews/stats/reviews-stats.css`, `src/modules/reviews/components/stats/ReviewsStats{Client,Trend,Table,Distribution}.tsx` | Stats consumes `--ui-*` and the primitives. `--rs-*` and the duplicated panel/KPI/pill rules were removed. |

### Accent behavior

- Precedence: `localStorage["operate.accent"]` (`green`/`orange`) → company default
  (green for both `capybara` and `forest`) → green fallback.
- "Company default" removes the key and `data-accent`; orange sets
  `data-accent="orange"`; green may be explicit but needs no override rule.
- Cross-tab sync uses the `storage` event. Invalid values fall back safely.
- Light/dark remains `localStorage["operate.theme"]`; the company theme remains
  `app_settings.theme` on `/admin/appearance`.
- **Limitation:** the accent is browser-local. There is no database field, no server sync
  and no effect on another person's screen. No DB migration was made.

### Verification matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Stats parity with `e6e59c3` | **Pass.** 16–18 differing pixels per capture (0.001–0.002%) at 1440/1024/768/390 × light/dark; consistent with the live timestamp. | `docs/ui-pilot/phase0/`, `diff-*.png` |
| Layout metrics unchanged | **Pass.** KPI heights, top/bottom panel heights, 24 px section gap and distribution height identical in green and orange. | `phase0/capture-report.json` |
| No page overflow | **Pass.** `scrollWidth === clientWidth` in all 16 combinations. | `phase0/capture-report.json` |
| Green is the default | **Pass.** No `data-accent`; `--ui-accent` `#2c6f4c` light / `#2f7a52` dark. | `phase0/capture-report.json` |
| Orange changes only accent tokens | **Pass.** `--ui-positive`, `--ui-negative`, `--ui-warn` and `--ui-warn-soft` are identical in green and orange for each mode. | `phase0/capture-report.json` |
| Orange persistence | **Pass.** Selecting Orange sets `operate.accent=orange` and `data-accent="orange"`; it survives reload. | Playwright preference run |
| Reset to company default | **Pass.** Company default removes the key/attribute and returns to green, including after reload. | Playwright preference run |
| Theme toggle | **Pass.** Light ↔ dark works with either accent; `operate.theme` updates. | Playwright preference run |
| Preferences UI | **Pass.** Three options, visible selected state, keyboard arrow selection, Escape closes, mobile layout fits 390 px. | `phase0/preferences-*.png` |
| Focus ring | **Pass.** Real keyboard focus gives a 2 px solid `--ui-focus` ring on the option label; the clipped native input ring is suppressed. | Focus probe |
| Untouched routes | **Pass.** `/accounting`, `/scheduling/annual`, `/admin/appearance` are **0 diff pixels** green vs orange; legacy `--accent` remains `#2563eb` and the legacy neutral scale is unchanged. | `phase0/untouched/` |
| No new console errors | **Pass.** No page errors; only the pre-existing `DashboardShell` theme-toggle hydration warning. | `phase0/capture-report.json` |

### Contrast (WCAG)

Text/control pairs use 4.5:1; focus rings and graphical series use 3:1.

| Mode | Pair | Ratio | Requirement |
| --- | --- | --- | --- |
| Green light | Accent text `#24624a` on soft `#e9f2ec` | 6.29 | 4.5 |
| Green light | White on accent `#2c6f4c` | 6.03 | 4.5 |
| Green light | Focus `#2c6f4c` on canvas `#f7f6f2` | 5.57 | 3 |
| Green light | Bar `#2c6f4c` on panel `#ffffff` | 6.03 | 3 |
| Green dark | Accent text `#7fc7a1` on soft `#1c2b23` | 7.46 | 4.5 |
| Green dark | White on accent `#2f7a52` | 5.22 | 4.5 |
| Green dark | Focus `#7fc7a1` on canvas `#16181a` | 8.97 | 3 |
| Green dark | Bar `#3f9268` on panel `#1d2022` | 4.31 | 3 |
| Orange light | Accent text `#9a3412` on soft `#fdf0e7` | 6.54 | 4.5 |
| Orange light | White on accent `#b45309` | 5.02 | 4.5 |
| Orange light | Focus `#b45309` on canvas `#f7f6f2` | 4.64 | 3 |
| Orange light | Bar `#c2410c` on panel `#ffffff` | 5.18 | 3 |
| Orange dark | Accent text `#fdba74` on soft `#2a1a12` | 9.92 | 4.5 |
| Orange dark | White on accent `#c2410c` | 5.18 | 4.5 |
| Orange dark | Focus `#fdba74` on canvas `#16181a` | 10.56 | 3 |
| Orange dark | Bar `#fb923c` on panel `#1d2022` | 7.24 | 3 |

Semantic status also passes in both modes: warning `5.36` light / `8.06` dark and
negative `5.52` light / `7.61` dark on their soft surfaces.

### Phase 0 commands

| Command | Result |
| --- | --- |
| `npm run test` | **251 passed / 38 files** (was 248 / 37; +3 accent tests) |
| `npx tsc --noEmit` | **Clean**, exit 0 |
| `npm run lint` | 20 errors / 3 warnings, all pre-existing; **0 findings in Phase 0 files** |
| `npm run build` | Exit 0 |

### Phase 0 limitations / pending

1. **Browser-local accent only** — no DB field, server sync, device sync or cross-user
   effect. This is deliberate; a company-level accent would need a migration.
2. **Staff-role runtime** — only the preview owner account was available. Role and
   visibility code is unchanged.
3. **Real `forest` organization switch** — `forest` was verified through computed styles
   and the existing theme contract, not by changing a real organization's setting.
4. **Physical touch devices** — Playwright emulation only.
5. **Full WCAG AA sweep** — sampled/calculated contrast and keyboard checks, not a
   complete audit.

## What changed (pilot checkpoint, `e6e59c3`)

| Area | File | Change |
| --- | --- | --- |
| Page | `src/app/(dashboard)/reviews/stats/page.tsx` | Imports the route-scoped pilot CSS. Auth/visibility guard untouched. |
| Header | `src/modules/reviews/components/ReviewsTabNav.tsx` | Stats-only breadcrumb, compact title and pill nav. Other Reviews routes keep the underline nav. |
| Orchestrator | `src/modules/reviews/components/stats/ReviewsStatsClient.tsx` | Filters, 2×2 KPIs, refresh/error/empty/sync states, AbortController, honest labels. |
| Chart | `src/modules/reviews/components/stats/ReviewsStatsTrend.tsx` | Dual-axis volume/rating chart, legend, tooltip, hidden data table, expandable branch trend. |
| Table | `src/modules/reviews/components/stats/ReviewsStatsTable.tsx` | Sortable columns (incl. derived 1–3★ share), row expansion, rating mix, short deltas, sticky branch column, mobile scroll hint. |
| Branch filter | `src/modules/reviews/components/stats/ReviewsBranchFilter.tsx` | Desktop pill row; compact disclosure below 1280px (“All branches” / “3 selected”). |
| Distribution | `src/modules/reviews/components/stats/ReviewsStatsDistribution.tsx` | 5★→1★ panel derived from the same response; compact, no implementation foot. |
| Helpers | `src/modules/reviews/lib/stats-view.ts` (+ `.test.ts`) | Formatting/comparison helpers (`text` + `detail` + optional precision `note`) and 25 focused tests. |
| Styles | `src/app/(dashboard)/reviews/stats/reviews-stats.css` | All `--rs-*` tokens and `.revstats` rules, including the phone-only KPI density block. No global CSS edits. |
| Shared UI | `src/components/ui/module-tabs.tsx` | Opt-in `variant="pills"`; default `underline` unchanged. |
| Shared UI | `src/components/ui/filters/ShopMultiSelect.tsx` | Optional `className` / `pillClassName`; defaults unchanged. |
| Docs | `docs/ui-pilot/FOUNDATION-CANDIDATES.md` | Token/primitive inventory for a later extraction. |

No API route, RPC, metric contract, permission, sync handler or dependency was changed.

## Refinement round 2 (display only)

The follow-up pass addressed six visual issues without touching data, calculations,
permissions or features. The stats response is the same; only labels, precision and
layout changed.

| Fix | What changed |
| --- | --- |
| Section rhythm | 24 px gaps between the header, toolbar, top region and lower panels; KPI cards stretch to the chart height with content top-aligned, removing the empty block under the desktop KPIs. |
| Table noise | Cells show a short comparison (`0.4%`, `0.02`, `0.7 pp`, `+280 · was 6`) with the arrow as the only coloured element. “vs previous 30 days” appears once in the table header; the full sentence is in each cell’s tooltip, screen-reader text and the expanded-row summary. |
| Compact filter | Below 1280 px the eight branch pills collapse to one disclosure (“All branches” / “N selected”), with Escape, outside-click and Done to close. Desktop keeps the full pill row. |
| Less commentary | Removed “Derived from the same stats response…”, the chart sub-line and repeated date/filter summaries; chart legend is “Reviews” / “Avg rating /5”; status bar is `Updated HH:MM` / `Sync fetches new reviews`. |
| Precision | Ratings render with two decimals (`4.78`, `4.81`); the rounding explanation for the `0.02` delta is handled in round 3. Count deltas switch to an absolute form when the prior window is under 20 reviews or the change exceeds 300% (`+280 · was 6`), and sub-0.05% changes show the count instead of `0.0%`. |
| Mobile comparison | Branch names are sticky while the table scrolls sideways; deltas are `nowrap`; the compact rating distribution moves above the table below 1280 px. |

## Refinement round 3 (final display refinements)

Two display issues remained after round 2. Both were fixed without changing the
stats API, aggregation, permissions or filters.

### Rating precision

The raw values were inspected before changing anything:

| Value | Raw | Displayed |
| --- | --- | --- |
| Current overall average | `4.783589743589744` | `4.78` |
| Previous overall average | `4.80638516992791` | `4.81` |
| Raw difference | `-0.022795426338166003` | `0.02` decrease |

The delta is calculated from the unrounded averages and rounded to two decimals,
so `4.78` vs `4.81` can still honestly read `0.02`. The delta was **not** forced
to `0.03`. Instead:

- The KPI hint reads `Previous: 4.81 · delta before rounding`.
- The KPI comparison carries a tooltip and screen-reader note:
  `delta calculated before rounding: 4.7836 vs 4.8064`.
- Table comparison cells carry the same note in their tooltip/screen-reader text
  (for example Karon: `4.9545 vs 5.0000`).
- The table caption states that ratings show two decimals and comparisons use
  unrounded averages.

`Comparison.note` is optional, so non-rating comparisons keep their existing
short text and detail unchanged. The note is omitted when the 4-decimal values
are equal.

### Mobile KPI density

Below 768 px only, the KPI cards use 13 px/14 px padding, a 10 px card gap, a
12 px grid gap, 4 px between value and comparison, a 28 px value and 11.5 px
notes. The 2×2 grid, every label, the `/5` unit and all comparison text remain
intact. Desktop and tablet rules are untouched.

Measured at 390 px (scroll reset): the KPI grid is **329 px** tall (was
**370.875 px**), each card is **159 px**, and the chart now starts about **42 px**
earlier at y=694. There is no horizontal page overflow in either theme.

## Verification matrix

| Criterion | Result | Evidence |
| --- | --- | --- |
| 2×2 KPIs + dominant chart, table + distribution | Pass | Screenshots at 1440/1024/768/390, light + dark |
| Balanced upper section + 24 px section gaps | Pass | KPI and chart both 353 px tall at 1440; 24 px before the table at every width |
| Compact deltas with one comparison label | Pass | Interaction suite: short cell text, period once in the table sub, full sentence in tooltip/SR text |
| Consistent precision (2-decimal ratings, absolute Karon delta) | Pass | `4.78` / `4.81`; the `0.02` delta is computed before rounding with the exact inputs in the tooltip/SR note; Karon `+280 · was 6` with “previously 6” in the tooltip |
| Mobile KPI density below 768 px | Pass | KPI grid 329 px (was 370.875 px), cards 159 px, chart starts ~42 px earlier; 2×2 layout and all labels intact at 390 px |
| Presets 7d/30d/90d/12m, default 30d | Pass | Interaction suite |
| Branch multiselect, empty = all, stable options | Pass | Interaction suite; options merge instead of shrink |
| Compact branch filter below 1280 px | Pass | Trigger shows “All branches” / “3 selected”; 1024 and 390 use it, 1280 keeps pills |
| Four KPIs, `/5`, `%`, `pp`, low-star direction | Pass | Interaction suite + helper tests |
| Dual axes, 1–5 rating scale, null gaps | Pass | Chart assertions, no `connectNulls` |
| Sorting, `aria-sort`, expansion, `aria-expanded` | Pass | Interaction suite |
| AbortController race protection | Pass | Rapid filter switch check |
| Error/retry, sync success/failure, empty state | Pass | Interaction suite (sync POST mocked in isolation) |
| No horizontal page overflow at 390/768/1024/1440 | Pass | `scrollWidth === clientWidth` at every width, both themes |
| Sticky branch column + non-wrapping deltas | Pass | Sticky `left` position measured; branch column stays at x=13 while the table scrolls 240 px |
| Distribution before table below 1280 px | Pass | Measured order at 390/768/1024/1279; beside the table at 1280+ |
| Sibling routes and default nav unchanged | Pass | Inbox/Templates/Locations smoke checks |
| Role/visibility behavior unchanged | Pass (code) / pending (runtime staff) | Guard and role logic untouched; only owner account available |
| Contrast, focus, keyboard, labelled controls | Pass (sampled) | Keyboard sorting/focus and active-hidden nav contrast measured; full automated AA sweep not run |
| Both company themes | Pass (computed styles) / pending (real org switch) | `capybara` and `forest` resolve the same pilot palette |
| Reduced motion | Pass (code) | No non-essential animation; spinner and transitions disabled under `prefers-reduced-motion` (not emulated at runtime) |
| No extra fetch per card, one stats request | Pass | 1 request per load in production measurements |
| Real data, no invented values | Pass | Real cache data: 975 reviews, 4.78 avg, 67% replied, 6% low-star, 8 branches |
| Global rollout | **Not started** | Deliberate; user decides after trying the screen |

## Commands and results (pilot checkpoint, `e6e59c3`)

| Command | Result |
| --- | --- |
| `npm run test` | **248 passed / 37 files** (baseline 223 / 36; +25 pilot helper tests) |
| `npx tsc --noEmit` | **Clean**, exit 0 |
| `npm run lint` | 20 errors / 3 warnings, all in pre-existing files (`api/me/password`, `ui/stat`, `AnimalsListClient`, `DirectionOverview`, `LoyverseDashboard`, `DailyProfitView`, `ReportsClient`). **0 findings in changed files.** |
| `npm run build` | Exit 0. `/reviews/stats` **9.6 kB / 217 kB** first load (baseline 8.73 kB / 216 kB). |
| Playwright interaction suite | **103/103 checks passed** (4 viewports, both themes, compact filter, sticky column, precision) |
| Nav/theme checks | **12/12 passed** |
| Overflow capture | 8/8 viewport × theme combinations pass; no page errors |

`next.config.mjs` ignores TS/ESLint build errors, so the standalone checks above are the
authoritative result.

### Performance (production build, local, 3 runs)

| Metric | Baseline | Pilot |
| --- | --- | --- |
| Stats requests per load | 1 | 1 |
| Stats payload (encoded) | 5,221 B | 5,221 B |
| Warm stats API | 311–324 ms | 315–362 ms |
| Warm DOMContentLoaded | 313–318 ms | 317–437 ms |
| Script bytes (encoded) | 290,627 | 291,593 (+966 B, +0.33%) |
| CSS files | 3 | 4 (route CSS, 3,772 B transfer) |
| Resources | 58 | 58 |

Local warm-cache sample only; not a benchmark. No dependency added.

## Screenshots (real render, real data)

`docs/ui-pilot/screenshots/`

- `desktop-1440-light.png`, `desktop-1440-dark.png`
- `desktop-1440-light-expanded.png`, `desktop-1440-dark-expanded.png`
- `laptop-1024-light.png`, `laptop-1024-dark.png`
- `tablet-768-light.png`, `tablet-768-dark.png`
- `mobile-390-light.png`, `mobile-390-dark.png`
- `mobile-390-light-filter.png` (compact branch disclosure open)
- `mobile-390-light-table-scroll.png` (sticky branch column while scrolling)
- `capture-report.json` (measured heights, gaps, order, overflow, console errors)
- `interaction-results.json` (103/103 checks; console output is the pre-existing
  `DashboardShell` theme-toggle hydration warning plus the two deliberately
  simulated 500 responses)

## Known pre-existing issues (not caused by the pilot)

- Hydration warning in `DashboardShell` theme toggle
  (`Switch to dark mode (T)` vs `Switch to light mode (T)`).
- The lint errors listed above.
- The real DB currently has `reviews_tab_visibility.stats = false`, so the owner sees
  "Show Stats to everyone". The pilot preserves that state; the active hidden Stats tab
  keeps full contrast and the eye-off control carries the hidden signal.

## Pending / not verified

1. **Live Customer Insights data** — the local API is unconfigured (no Google org token),
   so populated screens were verified against mocks (including a filter-aware mock for
   filtering). Only the unconfigured state ran against the live API. **Real Google
   spreadsheet data, its date coverage and fetch latency remain pending.**
2. **Staff-role runtime** — only the preview owner account is available. Role and
   visibility code is unchanged in the diff; runtime check with a staff account is pending.
3. **Real Google sync** — the sync POST was mocked in isolated tests. No production sync
   or live provider call was run.
4. **Real organization theme switch** — `forest` was verified through computed styles,
   not by switching a real organization's theme in the database.
5. **Physical mobile/touch device** — tested via Playwright emulation only.
6. **User acceptance of the visual direction** — Wave 1 §1 and §2 are ready to judge, but
   the global token/nav rollout is intentionally not approved.

## What moved to the foundation, and what stayed pilot-local

Moved in Phase 0: semantic surface/text/accent/status/series/shape/spacing/type tokens;
the panel and KPI anatomy; the pill-nav class prefix. They live in `globals.css` and
`src/components/ui/` and remain opt-in.

Stayed pilot-local: the `.revstats` layout, the 2×2 KPI grid, the 40/60 and 70/30 splits,
the 680 px table scroller, the compact branch disclosure breakpoint, the distribution
order and star semantics, and the Reviews-specific `1–3★` copy.
`FOUNDATION-CANDIDATES.md` remains the shortlist for future primitives; several items are
still intentionally un-promoted.
