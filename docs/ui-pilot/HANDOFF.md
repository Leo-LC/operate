# Handoff — Reviews Stats pilot + Phase 0 foundations

## Phase 0 checkpoint — shared foundations + accent preference

Checkpoint: the **latest commit on `ui/reviews-stats-pilot`** (Phase 0), parent `0d264e6`.
Branch: **`ui/reviews-stats-pilot`**. Local commit; **not pushed, merged, deployed or
migrated**. The exact SHA is the tip of the branch (`git log --oneline -1`).

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

**Next task:** review the Phase 0 commit. If accepted, start **Wave 1** of `ROLLOUT.md`
(Reviews siblings, then the low-risk read-only dashboards) one surface at a time.

In scope for Phase 0 (completed):

- Extract the proven semantic tokens and primitives from the pilot, additively.
- Add a localStorage-backed green/orange accent override that composes with light/dark and
  the existing company themes.
- Keep `reviews/stats` visually identical to the accepted checkpoint.
- Keep success/warning/error colors independent of the accent.

Out of scope until separately requested:

- Migrating another module (Wave 1+).
- Changing global defaults so existing modules restyle silently.
- Database migrations, new dependencies, multi-tenant work or feature changes.
- Push, merge, deploy.

## Reading order for the next session

1. `docs/ui-pilot/HANDOFF.md` (this file)
2. `docs/ui-pilot/ROLLOUT.md` — module order, status, accent design, acceptance gates
3. `docs/ui-pilot/REPORT.md` — evidence, pre-existing issues, pending checks
4. `docs/ui-pilot/FOUNDATION-CANDIDATES.md` — token/primitive shortlist and open questions
5. `docs/ui-pilot/DESIGN-CONTRACT.md` — accepted visual rules
