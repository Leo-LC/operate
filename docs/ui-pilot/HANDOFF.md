# Handoff — Reviews Stats pilot, Phase 0 foundations, Wave 1 §1 + §2

## Wave 1 §2 checkpoint — Customer Insights (+ Inbox filter disclosure)

Checkpoint: the **latest commit on `ui/reviews-stats-pilot`** (Wave 1 §2), parent
`e998f99` (Wave 1 §1). Branch: **`ui/reviews-stats-pilot`**. Local commit; **not pushed,
merged, deployed or migrated**. The exact SHA is the tip of the branch
(`git log -1 --oneline`).

Scope: `/customer-insights` only, plus one Inbox usability change that was requested on
the §1 result (`/reviews/inbox` filter rail). **No other module was migrated.**

### What shipped

| Area | File | Change |
| --- | --- | --- |
| Route CSS + bridge | `src/app/(dashboard)/customer-insights/customer-insights.css` (new) | `.ci` scoped token bridge (same pattern as `.revs`), layout, bar lists, channel list, banners, empty/loading states, unmatched disclosure, portalled date-picker bridge (`.ci-dp`). |
| Page composition | `src/modules/customer-insights/components/CustomerInsightsClient.tsx` | Compact title + Refresh, two-row filter toolbar, KPI beside the weekly trend, shops/countries panels, channels panel, unmatched disclosure last. Scope labels derive from the response `meta.filtered`. |
| Shops / countries | `src/modules/customer-insights/components/HorizontalBarChart.tsx` | Recharts bars replaced with labelled CSS bar rows; shops are keyboard-operable filter buttons, unmatched labels stay plain rows. |
| Channels | `src/modules/customer-insights/components/ChannelBarChart.tsx` | One accent bar per row with label/count/share, two columns on desktop, stacked on mobile. The per-channel rainbow palette is gone. |
| Weekly trend | `src/modules/customer-insights/components/WeeklyBarChart.tsx` (new; `WeeklyLineChart.tsx` deleted) | Green weekly bars on the shared accent, tooltip, hidden data table for screen readers. |
| Unmatched | `src/modules/customer-insights/components/UnmatchedReviewPanel.tsx` | `<details>` disclosure, collapsed by default, value count badge, three columns at ≥768 px. |
| Route | `src/app/(dashboard)/customer-insights/page.tsx` | Imports the route CSS. |
| Shared date picker | `src/components/ui/date-input.tsx`, `src/components/ui/filters/SingleDatePicker.tsx` | Additive optional `popoverClassName` so a portalled calendar can carry module tokens. Existing callers are unchanged. |
| Inbox filters | `src/modules/reviews/components/ReviewsFilterPanel.tsx` (new), `src/components/dashboard-client.tsx`, `src/app/(dashboard)/reviews/reviews.css` | Below 900 px the filter rail collapses behind a `Show`/`Hide` disclosure. Active filters stay visible as text chips while collapsed. |

### Decisions

1. **Scoped bridge, additive shared change.** `.ci` remaps legacy token names to `--ui-*`
   inside Customer Insights only. The only shared edit is the optional
   `popoverClassName` on the date picker — opt-in, so every other caller renders exactly
   as before.
2. **Honest data.** No invented metric. The existing payload (total submissions, by shop,
   by channel, by week, top countries, unmatched buckets) is presented in the order a
   reader actually uses it: scope → volume over time → where → how they found us.
3. **One accent, length carries magnitude.** Shops, countries, channels and weeks all use
   the primary series token. Semantic colours are not reused for decoration.
4. **Labels come from the response.** Period and shop scope are derived from
   `meta.filtered`, so a slow refresh can never relabel data that is still on screen.
5. **States replace the region, not sit next to it.** Loading shows skeletons; unconfigured,
   empty and error show a banner or a single honest empty panel, and the analytics region
   is not rendered underneath. Initial load no longer flashes the unconfigured banner.
6. **Filters stay reachable.** Shops are pills plus clickable bars; the period is a native
   `select`; dates use the shared picker. Below 900 px the toolbar stacks into two rows.

### Verification

| Check | Result |
| --- | --- |
| `npm run test` | **251 passed / 38 files** |
| `npx tsc --noEmit` | **Clean** |
| ESLint on changed files | **Clean** (repo baseline 20 errors / 3 warnings, pre-existing) |
| `npm run build` | Exit 0 |
| Customer Insights capture matrix | 9/9 (1440/768/390 × light/dark × green/orange + unconfigured); **0 overflow**, 0 page errors |
| Customer Insights interaction/state suite | **39/39** (`wave1/ci-after/ci-states-report.json`) |
| Reviews capture matrix (re-run) | 48/48, **0 overflow**, only the known `/api/locations` 503 |
| Inbox filter disclosure suite | **32/32** (`wave1/filters/filters-report.json`) |

### Evidence

- `docs/ui-pilot/wave1/ci-before/` — 9 captures of the pre-migration screen.
- `docs/ui-pilot/wave1/ci-after/` — 9 matrix captures, 5 state captures, 3 date-picker
  captures, `capture-report.json`, `ci-states-report.json`.
- `docs/ui-pilot/wave1/filters/` — desktop, collapsed, expanded and active-filter captures
  in light-green and dark-orange, plus `filters-report.json`.
- `docs/ui-pilot/wave1/after/` — refreshed 48-capture Reviews matrix.

### Inbox usability points for personal review

These are the behaviours worth checking by hand on `/reviews/inbox`:

1. **Collapsed by default below 900 px.** The rail becomes one row: `Filters` + `Show`.
   The list starts higher, so the first review is visible without scrolling past filters.
2. **Active filters stay readable when collapsed.** The chips read e.g. `All locations` /
   `3★`. A filter with nothing selected reads `No ratings` / `No locations` in the warn
   tone. The chips disappear when the panel is expanded, because the controls themselves
   are visible then.
3. **Collapsed controls are not focusable.** Tab order skips the hidden selects, so
   keyboard users are not dropped into invisible controls.
4. **`Show` / `Hide` is a real disclosure button** (`aria-expanded`, `aria-controls`), works
   with Enter/Space, and remembers nothing across reloads — it always starts collapsed.
5. **Desktop is unchanged.** At ≥900 px the toggle is hidden and the full rail is shown.
6. **Nothing else moved.** Sort, shuffle, limit, bulk actions and sync keep their §1
   positions and behaviour.

### Pending

1. **Customer Insights data cannot load locally.** There is no Google org token, so
   `/api/customer-insights/summary` returns `configured: false`. Visual and interaction
   verification used a Playwright-mocked response with a realistic payload
   (1,284 submissions, 8 shops, 8 channels, 10 countries, 12 weeks, unmatched buckets) plus
   one **real** unconfigured-state capture. The unconfigured screen is the only state that
   ran against the live API.
2. **Owner-only page.** The route guard redirects non-owners to `/home`; only the preview
   owner account was available, so staff visibility was not exercised.
3. **No live Google fetch, no real spreadsheet latency.** Loading, error and empty states
   were simulated at the network boundary.
4. **Physical touch devices** — Playwright emulation only.
5. **User acceptance** — §1 and §2 both await review. Do not start the next module.

## Wave 1 §1 checkpoint — Reviews siblings

Checkpoint: the **latest commit on `ui/reviews-stats-pilot`** (Wave 1 §1), parent
`ac88b15` (Phase 0). Branch: **`ui/reviews-stats-pilot`**. Local commit; **not pushed,
merged, deployed or migrated**. The exact SHA is the tip of the branch
(`git log -1 --oneline`).

Scope: `/reviews` and `/reviews/rules` redirects, `/reviews/inbox`,
`/reviews/templates`, `/reviews/locations`. `/reviews/stats` stays at Phase 0 parity.
**No other module was migrated.** Status: **implemented + verified, awaiting acceptance.**

### Wave 1 §1 decisions

1. **Scoped token bridge.** `src/app/(dashboard)/reviews/reviews.css` remaps the legacy
   token names (`--surface`, `--fg*`, `--line*`, `--accent`, `--good/--warn/--bad`,
   `--r-*`, `--shadow-*`, `--border`, `--muted`, `--primary`) to `--ui-*` inside `.revs`
   only. Shared primitives adopt the palette; nothing outside Reviews changes.
2. **One module header.** Breadcrumb + compact `Reviews` title + pill nav on every route.
   The `ui-module-header`, `ui-breadcrumb*`, `ui-module-header-row` and `ui-module-title`
   classes now live in `globals.css`; Stats uses them with pixel parity.
3. **Semantic stars.** 5★/4★ positive, 3★ warn, 2★/1★ negative — independent of accent,
   matching the Stats distribution.
4. **Task-shaped inbox.** Summary bar → filter rail → list controls → review list; bulk
   actions sit with the list; sync stays in the summary bar.
5. **Panel-first config screens.** Templates and Locations share `Panel` anatomy and
   inline loading/empty/error states.
6. **Additive shared tokens.** `--accent-hover`, `--accent-active`, `--bad-hover`,
   `--ui-radius-md`, `--ui-positive-soft`; `Button` uses them while legacy defaults stay
   blue/red for other modules.

### Wave 1 §1 files

| Area | File |
| --- | --- |
| Route CSS + bridge | `src/app/(dashboard)/reviews/reviews.css` (new) |
| Layout | `src/app/(dashboard)/reviews/layout.tsx` |
| Header | `src/modules/reviews/components/ReviewsTabNav.tsx`, `src/app/globals.css` |
| Inbox | `src/components/dashboard-client.tsx`, `src/components/review-card.tsx`, `src/components/dashboard-filters.tsx`, `src/components/all-none-toggle.tsx`, `src/modules/reviews/components/ReviewsControlsBar.tsx` |
| Config screens | `src/components/config-client.tsx` |
| Sync / bulk | `src/components/sync-button.tsx`, `src/modules/reviews/components/BulkReplyPanel.tsx` |
| Shared button | `src/components/ui/button.tsx` |
| Stats parity | `src/app/(dashboard)/reviews/stats/reviews-stats.css` |
| Evidence | `docs/ui-pilot/wave1/` — `before/` (19), `quick/` (10), `states/` (19 + 2 JSON), `after/` (48 + report) |

### Wave 1 §1 verification

| Check | Result |
| --- | --- |
| `npm run test` | **251 passed / 38 files** |
| `npx tsc --noEmit` | **Clean**, exit 0 |
| ESLint on changed files | **Clean** (repo baseline 20 errors / 3 warnings, pre-existing) |
| `npm run build` | Exit 0 |
| Capture matrix | 48/48 (inbox/templates/locations/stats × 1440/768/390 × light/dark × green/orange); **0 overflow**, 0 page errors |
| Stats parity | 92 px / 0.005% (timestamp only) |
| Interaction + state suite | **31/31** (`states-report.json`) + **18/18** (`states2-report.json`) |
| Console | Only the known `/api/locations` 503 and the pre-existing `DashboardShell` theme-toggle hydration warning |

### Wave 1 §1 pending

1. **Locations data** — `/api/locations` returns 503 locally (no Google token). Populated
   rows, selection and confirmation were verified with mocked responses.
2. **Real Google sync** — mocked in the loading/error checks.
3. **Staff role** — only the preview owner account was available.
4. **Real `forest` organization switch** — not performed.
5. **Physical touch devices** — Playwright emulation only.
6. **User acceptance** — do not start Wave 1 §2 before this is reviewed.

## Phase 0 checkpoint — shared foundations + accent preference

Checkpoint: **`ac88b15`** (Phase 0), parent `0d264e6`. Branch:
**`ui/reviews-stats-pilot`**. Local commit; **not pushed, merged, deployed or migrated**.
The Wave 1 §1 commit sits on top of it (see the section above).

Scope: shared semantic tokens, `Panel`/`KpiStat`, the opt-in pill nav, and a
browser-local green/orange accent preference. `/reviews/stats` is the first consumer.
**No other module was migrated.**

### Decisions resolved

1. **Green is the default accent** for both company themes (`capybara` and `forest`).
2. The accent choice lives in the existing user area: the sidebar user footer opens a
   **Preferences** dialog with **Company default / Green / Orange**. No new permanent
   toolbar control and no new route.
3. **Orange is allowed with either company theme**, including `forest`.
4. The accent applies to **selected controls, primary actions and the primary chart
   series**. Success/warning/error stay semantic and independent; multi-series charts
   keep distinguishable non-accent colors.

### Phase 0 files

| Area | File |
| --- | --- |
| Tokens + primitives CSS | `src/app/globals.css` (additive `--ui-*`, `.ui-panel*`, `.ui-kpi*`, `.ui-pillnav*`, `.ui-accent-option*`) |
| Accent state + test | `src/lib/accent.ts`, `src/lib/accent.test.ts` |
| Accent UI | `src/components/accent-preference.tsx` |
| Pre-paint | `src/app/layout.tsx` |
| Entry point | `src/components/dashboard-shell.tsx` |
| Providers | `src/components/providers.tsx` |
| Panel primitive | `src/components/ui/panel.tsx` |
| KPI primitive | `src/components/ui/kpi-stat.tsx` |
| Pill nav | `src/components/ui/module-tabs.tsx` |
| First consumer | `src/app/(dashboard)/reviews/stats/reviews-stats.css`, `src/modules/reviews/components/stats/ReviewsStats{Client,Trend,Table,Distribution}.tsx` |
| Evidence | `docs/ui-pilot/phase0/` — 16 Stats captures, 5 Preferences captures, 6 untouched-route captures, `capture-report.json`, `untouched/untouched-report.json` |

### Accent behavior

- Precedence: explicit `localStorage["operate.accent"]` (`green`/`orange`) → company
  default (green for both themes) → green fallback.
- "Company default" removes the key and the `data-accent` attribute.
- Cross-tab changes sync through the `storage` event; the pre-paint script in
  `layout.tsx` applies the stored choice before first paint.
- Light/dark remains `localStorage["operate.theme"]`; the company theme remains
  `app_settings.theme` on `/admin/appearance`.
- **Limitation:** the accent is browser-local. It is not stored in the database, not
  synced across devices/browsers, and never changes another person's screen. No DB
  migration was made.

### Phase 0 verification

| Check | Result |
| --- | --- |
| `npm run test` | **251 passed / 38 files** (was 248 / 37; +3 accent tests) |
| `npx tsc --noEmit` | **Clean**, exit 0 |
| `npm run lint` | 20 errors / 3 warnings, all in pre-existing files; **0 findings in Phase 0 files** |
| `npm run build` | Exit 0 |
| Stats parity vs `e6e59c3` | 390/768/1024/1440 × light/dark: **16–18 px diff** per capture (0.001–0.002%), consistent with the live timestamp |
| Accent persistence | Orange survives reload; Company default removes storage and reverts to green |
| Theme toggle | Light ↔ dark works with either accent |
| Semantic independence | `--ui-positive`, `--ui-negative`, `--ui-warn` identical in green and orange for each mode |
| Contrast | Text, selected controls, focus and chart elements pass AA / 3:1 in all four combinations |
| Untouched routes | `/accounting`, `/scheduling/annual`, `/admin/appearance`: **0 diff pixels** green vs orange; legacy tokens unchanged |
| Overflow | `scrollWidth === clientWidth` at all 16 Stats combinations |
| Console | No new page errors; only the pre-existing `DashboardShell` theme-toggle hydration warning |

### Phase 0 limitations / pending

1. The accent is browser-local only (no server sync, no DB field).
2. Staff-role runtime was not exercised; only the preview owner account is available.
   Role/visibility code is unchanged.
3. A real organization `forest` theme switch was not performed; `forest` was verified
   through computed styles and the existing theme contract.
4. Physical touch devices were not used; verification is Playwright emulation.
5. A full automated WCAG AA sweep was not run; contrast was sampled/calculated and
   keyboard focus was checked on the accent control and Stats controls.
6. The dev server was restarted after the production build; use `npm run dev` for the
   local URL.

**Next task:** review and accept the Phase 0 commit. Only then start Wave 1 of
`ROLLOUT.md`. Do not migrate another module, push, merge, deploy or migrate a database
without a new instruction.

## Baseline checkpoint — Reviews Stats pilot

Checkpoint: **`e6e59c3`** — `Reviews Stats UI pilot: accepted visual baseline`
Parent: `4832826` (Loyverse per-typed-price breakdown)
Scope of this checkpoint: `/reviews/stats` only. Local commit; **not pushed, merged, deployed or migrated.**

The visual direction is accepted as the baseline for the UI rollout. Phase 0 has now
extracted its foundations; see the section above. `docs/ui-pilot/ROLLOUT.md` defines the
module order and acceptance gates.

> `REPORT.md`'s old line "working tree, **not committed**" described the state before the
> baseline checkpoint; `e6e59c3` is the committed record.

## Accepted decisions

1. The current Reviews Stats screen is the visual baseline: compact title + pill module
   nav, 2×2 KPI block beside a dominant dual-axis trend chart, sortable branch table,
   rating distribution, one pill filter row.
2. Restraint over decoration: no icon badges, no explanatory hero, no second global tab
   bar, no duplicated filter summaries. One comparison label per table, full sentence in
   tooltip/SR text.
3. Honest numbers: ratings use two decimals from unrounded values (`4.78` vs `4.81`, delta
   `0.02` with a precision note); tiny baselines or extreme changes switch to absolute
   counts (`+280 · was 6`).
4. Phone density: below 768 px the KPI block compacts (13/14 px padding, 10 px gap,
   28 px value) while keeping the 2×2 layout and every label.
5. Shared UI changes stay opt-in: `ModuleTabs variant="pills"` and optional
   `ShopMultiSelect` class hooks; default variants are unchanged.
6. At the baseline checkpoint nothing was promoted to global defaults; the `--rs-*`
   tokens and `.revstats` rules were route-local. Phase 0 later promoted the semantic
   values and primitives (see the Phase 0 section above).
7. Real data and existing contracts are preserved: no API route, RPC, metric,
   permission, sync handler or dependency changed.
8. Next phase is additive foundation extraction plus an optional green/orange user accent
   preference — not a global restyle. See `ROLLOUT.md`.

## Accepted files

Committed in `e6e59c3` (35 files):

| Area | File |
| --- | --- |
| Page | `src/app/(dashboard)/reviews/stats/page.tsx` |
| Route CSS | `src/app/(dashboard)/reviews/stats/reviews-stats.css` |
| Header/nav | `src/modules/reviews/components/ReviewsTabNav.tsx` |
| Orchestrator | `src/modules/reviews/components/stats/ReviewsStatsClient.tsx` |
| Chart | `src/modules/reviews/components/stats/ReviewsStatsTrend.tsx` |
| Table | `src/modules/reviews/components/stats/ReviewsStatsTable.tsx` |
| Branch filter | `src/modules/reviews/components/stats/ReviewsBranchFilter.tsx` |
| Distribution | `src/modules/reviews/components/stats/ReviewsStatsDistribution.tsx` |
| Helpers + tests | `src/modules/reviews/lib/stats-view.ts`, `stats-view.test.ts` |
| Shared UI (opt-in) | `src/components/ui/module-tabs.tsx`, `src/components/ui/filters/ShopMultiSelect.tsx` |
| Evidence | `docs/ui-pilot/` — contract, report, candidates, screenshots, capture JSON |

## Verification (checkpoint state)

| Command | Result |
| --- | --- |
| `npm run test` | 248 passed / 37 files (baseline 223 / 36; +25 helper tests) |
| `npx tsc --noEmit` | Clean, exit 0 |
| `npm run lint` | 20 errors / 3 warnings, all pre-existing; 0 findings in changed files |
| `npm run build` | Exit 0; `/reviews/stats` 9.6 kB / 217 kB first load |
| Playwright interaction | 103/103 checks (4 widths, light/dark, filters, sorting, sticky column, precision) |
| Nav/theme checks | 12/12 |
| Overflow capture | 8/8 width × theme combinations; no page overflow |
| Screenshots | 390/768/1024/1440, light + dark, plus filter, table-scroll and expanded states |

Full detail, including the pre-existing failures and performance sample, is in
`REPORT.md`.

## Outstanding checks

These were not verified at the checkpoint and must be covered before or during the
rollout:

1. **Staff-role runtime** — only the preview owner account was available. Role/visibility
   code is unchanged, but a staff session was not exercised.
2. **Real Google review sync** — the sync POST was mocked. No live provider call.
3. **Real organization theme switch** — `forest` was verified through computed styles, not
   by switching a real organization's `app_settings.theme`.
4. **Physical touch devices** — Playwright emulation only; no real phone/tablet.
5. **Full automated WCAG AA sweep** — focus, keyboard and sampled contrast passed; no
   complete audit.
6. **Permanent visual regression tooling** — the pilot used a temporary Playwright setup
   outside the repo.

## Local startup and sign-in (no secrets in this repo)

1. `npm install`
2. `.env.local` must already contain the existing keys (values are not recorded here):
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_PREVIEW_MODE`, `PREVIEW_AUTH_PASSWORD`, and for Google sign-in
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `ALLOWED_GOOGLE_EMAILS` (or
   `ALLOWED_GOOGLE_DOMAIN`). Never print or commit these values.
3. `npm run dev`
4. Open `http://localhost:3000`, sign in through the existing login card. In preview mode
   the password is the local `PREVIEW_AUTH_PASSWORD`; read it from `.env.local` if needed.
   Google sign-in requires the allow-listed account.
5. Stats screen: `http://localhost:3000/reviews/stats`.

Preview login is for local verification only. Do not bypass auth, add a production mock
mode or expose the service-role key to the browser.

## Unrelated working-tree changes to preserve

Do not stage, revert or delete these unless the user explicitly asks:

- Deleted: `docs/operate-os-redesign-plan.md`
- Deleted: `docs/superpowers/plans/2026-05-14-brand-theme-revamp.md`
- Deleted: `docs/superpowers/plans/2026-05-21-wiki-thai-taxes-redesign.md`
- Deleted: `docs/superpowers/plans/2026-08-23-loyverse-integration.md`
- Deleted: `docs/superpowers/specs/2026-05-14-brand-theme-revamp-design.md`
- Deleted: `docs/superpowers/specs/2026-05-21-wiki-thai-taxes-redesign.md`
- Untracked: `.agents/`
- Untracked: `operate-ui-pilot-repo-files.zip`
- Untracked: `skills-lock.json`

The pilot commit and the Phase 0 commit must stay separate from those changes. Do not
amend `e6e59c3`; add new commits.

## Next task and boundaries

**Next task:** review the **Wave 1 §1** result (Reviews siblings). If accepted, start
**Wave 1 §2** (`/customer-insights`) of `ROLLOUT.md`, one surface at a time.

In scope for Wave 1 §1 (completed):

- Migrate `/reviews/inbox`, `/reviews/templates`, `/reviews/locations` and the two
  redirect routes onto the Phase 0 foundation.
- Keep `/reviews/stats` at pixel parity.
- Keep the accent scoped to Reviews and leave every other module untouched.
- Preserve all data, permissions and API contracts.

Out of scope until separately requested:

- Migrating another module (Wave 1 §2+).
- Changing global defaults so existing modules restyle silently.
- Database migrations, new dependencies, multi-tenant work or feature changes.
- Push, merge, deploy.

## Reading order for the next session

1. `docs/ui-pilot/HANDOFF.md` (this file)
2. `docs/ui-pilot/ROLLOUT.md` — module order, status, accent design, acceptance gates
3. `docs/ui-pilot/REPORT.md` — evidence, pre-existing issues, pending checks
4. `docs/ui-pilot/FOUNDATION-CANDIDATES.md` — token/primitive shortlist and open questions
5. `docs/ui-pilot/DESIGN-CONTRACT.md` — accepted visual rules
