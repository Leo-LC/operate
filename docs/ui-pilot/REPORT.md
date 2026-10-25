# Reviews Stats UI pilot — validation report

Branch: `ui/reviews-stats-pilot`. The pilot is committed at **`e6e59c3`**; **Phase 0**
(shared foundations + accent preference) is committed on top of `0d264e6`.
Scope: `/reviews/stats` pilot plus the Phase 0 foundation/accent work. **No other module
was migrated.** No deploy, push, merge or DB migration.
Local URL: **http://localhost:3000/reviews/stats** (preview login, `NEXT_PUBLIC_PREVIEW_MODE=true`).

The dev server is running. Sign in with the existing preview password from `.env.local`;
the password is not recorded here.

## Final status

Pilot and Phase 0 are complete on this branch. Both pilot refinements — rating precision
and mobile KPI density — remain validated. Phase 0 extracted the accepted Stats values
into an opt-in `--ui-*` foundation, added `Panel`/`KpiStat`, and shipped a browser-local
green/orange accent preference. `/reviews/stats` is visually unchanged (pixel parity
below), and no other module changed appearance. The site-wide rollout has **not** started.
Phase 0 is committed locally; it is not pushed, merged or deployed. Runtime staff access,
real Google sync, a real organization `forest` switch and physical touch devices remain
pending (details below).

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

1. **Staff-role runtime** — only the preview owner account is available. Role and
   visibility code is unchanged in the diff; runtime check with a staff account is pending.
2. **Real Google sync** — the sync POST was mocked in isolated tests. No production sync
   or live provider call was run.
3. **Real organization theme switch** — `forest` was verified through computed styles,
   not by switching a real organization's theme in the database.
4. **Physical mobile/touch device** — tested via Playwright emulation only.
5. **User acceptance of the visual direction** — the screen is ready to judge, but the
   global token/nav rollout is intentionally not approved.

## What moved to the foundation, and what stayed pilot-local

Moved in Phase 0: semantic surface/text/accent/status/series/shape/spacing/type tokens;
the panel and KPI anatomy; the pill-nav class prefix. They live in `globals.css` and
`src/components/ui/` and remain opt-in.

Stayed pilot-local: the `.revstats` layout, the 2×2 KPI grid, the 40/60 and 70/30 splits,
the 680 px table scroller, the compact branch disclosure breakpoint, the distribution
order and star semantics, and the Reviews-specific `1–3★` copy.
`FOUNDATION-CANDIDATES.md` remains the shortlist for future primitives; several items are
still intentionally un-promoted.
