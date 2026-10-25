# Reviews Stats UI pilot — validation report

Branch: `ui/reviews-stats-pilot` (working tree, **not committed**)
Scope: `/reviews/stats` only. No deploy, push, merge or DB migration.
Local URL: **http://localhost:3000/reviews/stats** (preview login, `NEXT_PUBLIC_PREVIEW_MODE=true`).

The dev server is running. Sign in with the existing preview password from `.env.local`;
the password is not recorded here.

## Final status

Pilot complete on this branch. Both requested final refinements — rating precision and
mobile KPI density — are implemented and validated, with no new blockers. The visual
direction is accepted for the pilot; the site-wide rollout has **not** started. Changes
remain uncommitted. Runtime staff access, real Google sync and a real organization
`forest` theme switch remain pending (details below).

## What changed

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

## Commands and results

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

## Deliberately pilot-local

`--rs-*` tokens, the `.revstats` layout, the 2×2 KPI grid, the 680 px table scroller and
the emerald bar / neutral line pairing. Nothing is promoted to `globals.css`. See
`FOUNDATION-CANDIDATES.md` for the extraction shortlist and open questions.
