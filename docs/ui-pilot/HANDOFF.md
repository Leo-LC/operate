# Handoff — Operate UI/UX redesign: full perimeter migrated

## Final pass — 29 October 2026 (v5 — Impeccable critique → audit → targeted polish)

Context capture (Impeccable init + document, grounded in the docs/ui-pilot contract and
the accepted Reviews Stats system): **PRODUCT.md** and **DESIGN.md** (+ `.impeccable/design.json`
sidecar) written at the repo root. The product is recorded as **Operate** (Capybara Coffee
internal operations) — correcting the previous "Nexus Hub" working-context label. DESIGN.md
documents the incumbent accepted system; the active-pill description was corrected to the
shipped solid-accent fill.

Critique (dual-agent: design review + detector/browser evidence) over the closure-pass
modules (direction, employees, customer-insights, accounting, payments, treasury,
scheduling, loyverse): **26/40**, 1×P0 + 3×P1 + 1×P2 verified in source before fixing.
Snapshot: `.impeccable/critique/2026-10-29T03-56-56Z__closure-pass-affected-modules.md`.
Audit evidence: detector 126 findings → 88 real (all advisory, mostly off-ramp font sizes in
legacy/detector-flagged files), 38 false positives; browser: 0 page errors, 0 horizontal
overflow across 10 routes × 1440/390 × light/dark.

**Polish implemented (presentation only — no calculation, API, permission or data change;**
every in-page write path untouched, no test writes performed):

1. **[P0] Accounting focus day** (`AccountingFocusDay.tsx`): recorded-zero no longer reads
   as no-data (`thb(0)` → `฿0`; "—" stays only for no entry), and the status pill is now
   honest: Positive (net > 0) / Negative (net < 0) / **neutral "Zero"** at exactly 0 — the
   previous green "Positive" under a "—" is gone (verified live at 1440, `final-polish/`).
   The active day chip text uses `--accent-fg` instead of a hard-coded warm-white literal.
2. **Scheduling shift-kind colors** (`lib/colors.ts`): defaults restrained to the system
   palette (`#2c6f4c` opening, `#55605a` daytime, `#b45309` closing, `#5f6b64` off,
   `#67726b` unscheduled; invalid → `#a63b30`) — the saturated blue is gone. Stored user
   palettes in `scheduling_global_settings.palette` are unaffected; Settings editing intact.
3. **Scheduling legend** (`ShiftKindLegend.tsx`, new): Opening/Daytime/Closing/OFF swatch row
   on the annual and weekly grids (print-hidden), so cell colors are never the only carrier.
4. **Scheduling nav honesty** (`SchedulingTabNav.tsx`): the redundant section tag now shows
   only real tab labels; the plan list/import/detail routes no longer display a wrong "Annual".
5. **Payments copy** (`PaymentsClient.tsx`): "Employees 0 people with records" now says
   "with generated payments"; the payroll KPI hint explains live rows vs generated records;
   the row chip and its caption are unified to English "Live · not generated" (was
   "Temps réel · non généré" inside an English module).
6. **Treasury aggregate honesty** (`TreasuryClient.tsx`): with nothing recorded, the three
   summary cards show "—" + "No data recorded" instead of "฿0" (same rule as the closure's
   free-cash fix).
7. **Loyverse states** (`LoyverseDashboard.tsx`): loading shows a labelled
   `role="status"` "Loading Loyverse data…" above the skeletons (no more wordless pulse);
   an empty result renders an honest "No Loyverse data for this period." panel (was a blank
   body). `ShiftsPreview.tsx` column-key row 9px → 10px.

**Verification:** `final-polish/polish-verification.json` — 25/25 checks (every changed
surface renders the intended state: accounting ฿0/Zero, treasury No data ×3, payments
wording + chips, scheduling legend/tag/no saturated defaults, loyverse labelled
loading/resolved/never-blank, shift-sales key row), 0 page errors, no page-level overflow
at 390 on all 8 routes; gates: 251/251 tests, `tsc` clean, ESLint 0 new findings (the one
`fmtDelta` unused-var error in `LoyverseDashboard` is pre-existing on HEAD), `npm run build`
exit 0; dev server restarted after the build (documented op note). Screens +
`polish-verification.json` in `docs/ui-pilot/final-polish/`.

**Bounded follow-up (same day, v5b — no new workstream).** (1) Scheduling Annual/Weekly cell
text is now theme- and contrast-driven: in dark mode the kind hue lightens toward the minimum
step reaching **≥4.5:1 measured against the composite the tint actually renders over** the
dark card (`paletteToStyles(palette, dark)` + unit test; light behavior byte-identical,
palette overrides and Settings editing untouched — the same clamp applies to stored hues in
dark only). (2) Treasury Free-cash KPI and the formula figures print `—` and "No data
recorded"/"No data" when no source is recorded (no computed zero reads as a known amount).
(3) Weekly gets the same compact shop disclosure (≤768px), `.ui-table-scroll .sch-scroll`
wrapper and `TableScrollAffordance` as Annual; last column verified reachable at 390
(scrollLeft == max, right edge in viewport). (4) Recapture with **rendered theme/accent
assertions** (`final-polish/final-verification.json`, 66/66): every capture verifies
`<html class>` dark/light and `data-accent` explicitly (the earlier "light"-named captures
had rendered dark), Treasury free cash `—`/hints ×4/formula dashes ×5, Annual+Weekly min
rendered cell contrast ≥4.58 (dark) / ≥5.0 (light), Employees closure proof (one Add, one
Export docs CSV, one "Create employee", cancel without write) and Customer Insights closure
proof (breadcrumb current-page segment; scope line **"All shops · All time"** derived from
the mocked read, KPI **431** = fixture value) in true light and dark. Gates: 252/252 tests
(+1 contrast unit test), `tsc` clean, ESLint clean on the six changed files, build exit 0;
**local commits only — writes intercepted, nothing pushed, merged, deployed or migrated in this step.**

**Not done on purpose (still documented as backlog):** Employees/Animals list
restructuring; Loyverse shop-panel ergonomics; legacy-token collapse (excluded by
instruction); the off-ramp font-size tail beyond the flagged worst spots; Direction's
unused `DirectionTrends.tsx` component (dead code, zero references — reported, deletion
left to the owner); admin/staff runtime, production data, physical devices still
unverified. Local commits only — **nothing pushed, merged, deployed or migrated.**

## Final handoff — 29 October 2026 (v4 — closure pass)

**Last commits:** `5b82998`…`6fda18d` (see v3) then the closure pass:
`2b4a3e7` (Employees single action zone + contrast token), `b6bea39` (CI breadcrumb +
honest scope line + view-aware breadcrumbs + compact ≤768px), `30aa064` (scheduling
scroll affordance), `1befea1` (honest no-data statuses), `6a51ce1` (Loyverse bucket
bars), `66acb0a`+`6fda18d` (evidence). Local only.

**Constat → correction → preuve** (all reproduced before fixing):

1. **Direction hydration** — localStorage read in a state initializer (SSR defaults ≠
   browser-stored visibility → eye-icon mismatch → client-render fallback). Fixed: same
   defaults both sides, localStorage read after mount; shell theme-title mismatch fixed
   the same way. Proof: reproduction harness shows zero hydration errors across direct
   loads, cross-module navigation, stored dark/orange, light-after-dark.
2. **Employees duplicate actions** — the legacy flex-end action block survived between
   the shared header and the toolbar (2× Export/Add, also with the form open). Fixed:
   one toolbar; form submit relabelled "Create employee" (no duplicate labels). Proof:
   closure-report checks + captures closed/open.
3. **CI scope labels** — mismatch came from an incoherent fixture; fixtures now scope-
   consistent (All time → filtered nulls → "All shops · All time"); separator renders
   only when both parts exist; scope keeps deriving from the response meta (requestId
   guard covers slow refreshes).
4. **Breadcrumbs/views** — CI breadcrumb added; Accounting/Payments/Employees carry the
   active view; compact shop filter engages at ≤768px inclusive.
5. **Scheduling** — conditional scroll hints + pinned Date/Staff on Annual/Weekly
   (verified initial + last-column reachable at 768; drag/edit untouched).
6. **Honest statuses** — Accounting focus day no longer shows "Positive" on a "—"
   amount (JS null ≥ 0 quirk); Treasury shows "No data" (neutral) when nothing is
   recorded instead of "OK".
7. **Loyverse** — bucket bars on the shared accent, readable labels/values; light
   `--ui-fg-4` contrast fixed 3.83 → 4.63 (canvas) / 4.59 (panel), AA 4.5 met.
8. **Reviews Stats parity** — re-verified against `e6e59c3` served from a worktree on
   the same database: identical KPIs, chart weeks and anatomy; every pixel difference
   traces to documented post-baseline content evolutions (meta delta line, 1–3★
   call-out, sidebar items) — see `closure/stats-parity-report.json`.

**Still not verified:** admin/staff rendering (owner-only account), production data,
physical touch devices. **Backlog (documented, not blocking):** Employees/Animals list
restructuring, Loyverse shop-panel ergonomics, legacy-token collapse after acceptance.

## Final handoff — 28 October 2026 (v3 — full mission)

**Last code commit:** the shell bridge (`861c684`) plus the posts-acceptance stages on
`ui/reviews-stats-pilot`. Sequence of this mission's commits:

- **`337e51a`** — Payments + Treasury polish: neutral compact avatars (opt-in `UserAvatar
  neutral`), narrower pinned mobile band, stale-response sequence guard (verified with
  reverse-order responses), cash-counter desktop layout recomposed task-first (input
  beside its history panel).
- **`b6cfbb5`** — Loyverse family (`.lov` bridge shared by `/loyverse`, `/shift-sales`,
  `/loyverse-export`, `/loyverse-sandbox`; module tabs → shared pills).
- **`72b0565` + `738b6ef`** — `/scheduling` (`.sch` bridge + shared header in the layout;
  seven routes; list toolbar harmonised).
- **`9325968`** — `/admin` + `/employees` (`.adm` bridge; AdminTabNav → shared header
  with pills; EmployeesListClient shared header).
- **`0de04ee`** — `/home` (`.home` bridge) + `/wiki` (token-only `.wiki` wrapper).
- **`861c684`** — global shell (`.app-shell` bridge on the dashboard shell root; sidebar
  active items follow the user's accent) + CSS import-path fixes caught by the build.

Earlier in the mission: Animals pills (`22806e0`), Documents (`6f49091`), Challenges
(`02cb921`), Treasury (`ef57b79`), Payments (`666f971`).

**Everything is local — not pushed, merged, deployed or migrated.**

**Modules**

| Surface | Status |
| --- | --- |
| Phase 0 / reviews.stats + Reviews siblings + customer-insights + reports/direction + directory/animals + documents/challenges | **accepted** |
| `/treasury`, `/payments` | **verified — awaiting acceptance** |
| accounting, finance (+2 sub-routes), loyverse family + shift-sales, attendance, scheduling (+sub-routes), admin + employees, home, wiki | **verified — awaiting acceptance** |
| `/brand` | **exempt** (self-scoped static document — untouched) |
| Redirects (`/overview`, `/finance`, `/loyverse-preview`, `/challenges`) | **verified** (destinations confirmed) |
| Global shell (sidebar, topbar, palette, preferences) | **verified — awaiting acceptance** |

**Cross-cutting sweep:** 20 routes × desktop/mobile × light/dark × green/orange —
**80/80 captures OK**, 0 per-route overflow, no page errors in fresh navigation
(`docs/ui-pilot/final-sweep/`). Gates at every checkpoint: 251/251 tests, `tsc` clean,
ESLint clean on changed files (only documented pre-existing findings), `npm run build`
exit 0. Bundle sizes unchanged or in line with pre-migration (first load 101–320 kB;
the heaviest are the Recharts surfaces `/direction` (320 kB), `/loyverse` (245 kB),
`/customer-insights` (241 kB)). No new fetch-per-card or waterfalls; no new dependency.

**Preservation guarantee:** no calculation, formula, ranking, currency, rounding, date
rule, permission, API contract or business transition changed. All test writes were
intercepted at the network boundary (or answered with contract-shaped mocks) — no real
record was modified during verification. The annual equivalent-period comparison remains
a separate business task (proposal and displayed limits untouched). The pre-existing
`/direction` selection quirk in the Treasury counter (double-click to reselect) and the
last-response-wins pattern (fixed on Payments by a presentation-level sequence guard) are
documented in REPORT.md.

**Known limits (whole mission)**

- Only the preview **owner** account exists locally; admin/staff rendering of any module
  is **NOT verified** (API guards verified by unauthenticated 401/403 probes only).
- Verification ran against the **local Supabase database**, not production; where the
  local data is empty or thin (treasury, payments, challenges fixtures), populated states
  came from **clearly labelled fixture payloads** compared before/after with the
  pre-migration code (identical totals).
- Real Google/spreadsheet data and `/api/locations` (503 locally, no token) remain
  unverified — same as all previous waves.
- Physical touch devices — Playwright emulation only.
- The legacy token names still resolve via per-route bridges + the global shell bridge;
  the final cleanup collapsing them into `--ui-*` is deliberately NOT done here — the
  full-perimeter review must be accepted first.

**Validations still awaited**

1. **Owner's final review** of the whole migrated perimeter (treat module by module —
   verified ≠ accepted).
2. **Annual equivalent-period comparison — business decision** (see
   `revenue-equivalent-period-proposal.md`; fixed shop group, missing ≠ zero).
3. Optional: production data, a second role account, physical touch devices.

**Next:** the owner's review, then (on acceptance) the legacy-token cleanup follow-up.
Stop here — no further module work is pending.

## Previous handoff — 28 October 2026 (v2)

**Last code commit:** **`02cb921`** (`Challenges: migrate to the shared UI foundation`)
on `ui/reviews-stats-pilot`. This session's commits, in order:

- **`22806e0`** — Animals: the Animals/Vaccines switch becomes the shared pill nav.
- **`6f49091`** — Documents: migrate to the shared UI foundation (Wave 4 §13).
- **`02cb921`** — Challenges: migrate to the shared UI foundation (Wave 5 §15).
- **`ef57b79`** — Treasury: migrate to the shared UI foundation (Wave 1 deferred).
- **`666f971`** — Payments: migrate to the shared UI foundation (Wave 1 deferred).

Everything is local — **not pushed, merged, deployed or migrated**.

**Working tree:** clean for every tracked source and documentation file. The only remaining
changes are unrelated and deliberately left unstaged (unchanged from the previous handoff):

- deleted (pre-existing, not by this work): `docs/operate-os-redesign-plan.md` and the five
  `docs/superpowers/{plans,specs}/…` files;
- untracked artifacts: `.agents/`, `docs/ui-pilot/wave1/ci-after.zip`,
  `docs/ui-pilot/wave1b/fixes.zip`, `docs/ui-pilot/wave4.zip`,
  `operate-ui-pilot-repo-files.zip`, `skills-lock.json`.

Do not restore, delete or commit those without the owner's instruction.

**Modules completed**

| Wave | Surface | Status |
| --- | --- | --- |
| Phase 0 / Wave 0 | foundation, accent preference, `reviews/stats` | **accepted** |
| Wave 1 §1 | Reviews siblings | **accepted** |
| Wave 1 §2 | `/customer-insights` + Inbox filter disclosure | **accepted** |
| Wave 1 §3 | `/reports`, `/direction` + visual reprise | **accepted** |
| Wave 4 (reduced) | `/directory`, `/animals` (+ pill fix `22806e0`) | **accepted** |
| Wave 4 §13 | `/documents` (`6f49091`) | **accepted** |
| Wave 5 §15 | `/challenges`, 5 sub-routes (`02cb921`) | **accepted** |
| Wave 1 deferred | `/treasury` (`ef57b79`) | **verified — awaiting acceptance** |
| Wave 1 deferred | `/payments` (`666f971`) | **verified — awaiting acceptance** |

All modules above are accepted with their documented verification limits intact
(owner-only preview account, local Supabase data instead of production, Playwright
emulation instead of physical touch devices, mocked write paths). **`/treasury` is
verified, awaiting the owner's visual review.** What remains is sensitive by nature —
`/payments` next, then accounting, finance, Loyverse, attendance, scheduling, admin —
to be treated **one module at a time**.

**Validations still awaited**

1. **User acceptance of `/treasury` (`ef57b79`) and `/payments` (`666f971`).** Evidence:
   `docs/ui-pilot/wave6/` (before 16 / after 17 captures + report 51/51) and
   `docs/ui-pilot/wave7/` (before 12 / after 15 + report 43/43). Limits: admin/staff
   rendering NOT verified (owner-only account; API guards verified by 401/403 probes);
   real local data is thin — populated states come from labelled fixtures compared
   before/after. Kept finish point: the **desktop layout of the Treasury cash counter**.
2. **Annual equivalent-period comparison — business decision.** Not implemented. It must use
   a **fixed group of shops covered over the whole period in both years**, and a missing
   source row is **absent, never zero**. See `revenue-equivalent-period-proposal.md`.
3. Optional: production data, a second role account and physical touch devices (see limits).

**Known limits (this session's additions)**

- Only the preview **owner** account exists locally; non-owner rendering of the three
  surfaces was not exercised (Challenges hides Labo/Methodology for non-owners by code,
  unchanged).
- Documents has **no file upload**: the module tracks metadata + a Drive link; "upload"
  coverage means the add/edit form (validation, cancel, error) and the CSV export.
  All API writes were **intercepted** in the interaction suite — no real document row was
  created, changed or deleted; the success path was verified against a synthetic row
  (fake id, clearly labelled).
- Challenges checks ran against real local Supabase data for reads, but **every
  `/api/challenges*` write (PUT/POST/PATCH/DELETE) was intercepted** — no override, entry
  or setting was persisted. Methodology accuracy was spot-checked on the rendered page
  (`0.45`, `190 ฿`, `9.5%`, `4%`, min 10 reviews); the methodology page and all metric
  sources are byte-identical (`constants.ts`, `overview-data.ts`, `spotlight.ts` untouched).
- Physical touch devices: Playwright emulation only.
- The local dev server must be restarted after each `npm run build` (the production build
  overwrites the dev `.next` and hydration dies with 404 chunks). Operational note, not a
  module limit.

**Next:** accounting, finance, Loyverse, attendance, scheduling and admin, each
individually. `/wiki`, `/brand`, `/home` and `/overview` are non-standard surfaces with
their own decision (`/brand` likely exempt, `/overview` is a pure redirect). The global
shell (sidebar/topbar/preferences) and the legacy-token cleanup are separate, later
decisions. No rule or permission change in any of this.

## Previous handoff — 28 October 2026 (Wave 4 checkpoint)

**Last code commit:** **`97544e9`** (`Animals: pack the species cards on tablet/desktop`)
on `ui/reviews-stats-pilot`. Module commits: **`c0ccb6f`** (`/directory`), **`88938fc`**
(`/animals`), plus the KPI-packing polish **`97544e9`**; documentation **`7d25723`**. This
handoff file is the **sole change in the final documentation commit** on top of `97544e9`.
Everything is local — **not pushed, merged, deployed or migrated**.

**Working tree:** clean for every tracked source and documentation file. The only remaining
changes are unrelated and deliberately left unstaged:

- deleted (pre-existing, not by this work): `docs/operate-os-redesign-plan.md` and the five
  `docs/superpowers/{plans,specs}/…` files;
- untracked artifacts: `.agents/`, `docs/ui-pilot/wave1/ci-after.zip`,
  `docs/ui-pilot/wave1b/fixes.zip`, `docs/ui-pilot/wave4.zip`,
  `operate-ui-pilot-repo-files.zip`, `skills-lock.json`.

Do not restore, delete or commit those without the owner's instruction.

**Modules completed**

| Wave | Surface | Status |
| --- | --- | --- |
| Phase 0 / Wave 0 | foundation, accent preference, `reviews/stats` | **accepted** |
| Wave 1 §1 | Reviews siblings | **accepted** |
| Wave 1 §2 | `/customer-insights` + Inbox filter disclosure | **accepted** |
| Wave 1 §3 | `/reports`, `/direction` + visual reprise | **accepted** |
| Wave 4 (reduced) | `/directory` (contacts), `/animals` | **verified — awaiting acceptance** |

**Validations still awaited**

1. **User acceptance of `/directory` + `/animals`.** Evidence:
   `docs/ui-pilot/wave4/before|after/` (19 + 19); 25/25 interaction checks; 251/251 tests;
   `tsc` clean; build exit 0.
2. **Annual equivalent-period comparison — business decision.** Not implemented. It must use
   a **fixed group of shops covered over the whole period in both years**, and a missing
   source row is **absent, never zero**. See `revenue-equivalent-period-proposal.md`.
3. Optional: production data, a second role account and physical touch devices (see limits).

**Known limits**

- Only the preview **owner** account exists locally; non-owner rendering of `/direction`,
  `/directory` and `/animals` was not exercised.
- Verification ran against the **local Supabase database**, not production. `/api/locations`
  returns 503 without a Google token; `/api/direction/tabs` returns all `false` locally.
- **No physical touch devices**; responsive checks are Playwright emulation.
- Directory: the search is client-side and only one contact exists locally; it never filters
  shops (unchanged).
- Animals: the full list (108 rows) loads without pagination; CSV/PDF links were verified
  present, not downloaded.
- **Prior-year revenue is monthly and partial** (2025 has no daily rows, 2–4 shops/month).
  The current cumulative therefore is not like-for-like; the proposal documents the limits.

**Recommended next group:** **`/documents` + `/challenges`**, in that order — the remaining
non-financial, non-employee surfaces in the rollout. `/documents` needs upload/metadata form
checks; `/challenges` is mostly read-only but spans five routes. Keep `/admin`, `/employees`,
`/attendance`, `/scheduling`, `/treasury`, `/payments`, `/accounting`, `/finance`,
`/loyverse*` and `/shift-sales` out of this group. `/wiki` and `/brand` remain non-standard
(`/brand` likely exempt).

## Wave 4 checkpoint — Directory + Animals

Checkpoint: **`c0ccb6f`** (`/directory`), **`88938fc`** (`/animals`) and **`97544e9`**
(KPI packing polish) on `ui/reviews-stats-pilot`. Local commits; not pushed, merged,
deployed or migrated.

Scope: `/directory` (shops + contacts) and `/animals`, the next non-financial,
non-employee modules. Financial workflows and employee records were excluded.

| Area | File | Change |
| --- | --- | --- |
| Directory bridge | `src/app/(dashboard)/directory/directory.css` (new) | `.directory` scoped token bridge; module rhythm; sticky-first-column tables with a conditional scroll hint; forms stack on phones. |
| Directory shell | `DirectoryClient.tsx`, `page.tsx` | Breadcrumb `Directory / Shops|Contacts`, compact title, two real tabs as shared pills with counts. Search only on Contacts; labelled `Recherche`/`Type`; actions right. |
| Directory tables | `ShopTable.tsx`, `ContactsClient.tsx`, `SupplierDossier.tsx` | `.ui-table-scroll`; expanded `colspan` panels stay static; supplier order log scrolls. Owner write flows and deep links unchanged. |
| Animals bridge | `src/app/(dashboard)/animals/animals.css` (new) | `.animals` scoped token bridge; KPI rhythm; mobile tables; responsive form/detail/vaccine rows. |
| Animals shell | `AnimalsListClient.tsx`, `page.tsx` | Breadcrumb, compact title + Animals/Vaccines switch, labelled `Boutique`, CSV/PDF/Add right. Species counts on `KpiStat`; sortable table with `aria-sort`, sticky name + conditional hint. |
| Animals modal | `AnimalModal.tsx`, `components/ui/modal.tsx` | Additive `Modal className` applied to the portalled popup; the animal dialog keeps the green/orange accent. Grids stack on phones. |

Decisions:

1. **Task-adapted organisation.** Directory shows the search only where it applies; Animals
   keeps the list primary and moves the species counts to a compact KPI row.
2. **Scoped bridges only.** `.directory` / `.animals`; no global repoint. The shared
   `.ui-filter-label` alignment fix is the only cross-module change.
3. **Permissions/data preserved.** `canWrite`, module guards, create/edit/delete, exports,
   deep links and vaccine history are unchanged.
4. **No invented metrics.** Every KPI is an existing count; empty/unknown stays explicit.

Gate: **25/25** interaction checks; 1440/768/390, light/dark, green/orange; no page-level
overflow (the pre-migration Animals 390 overflow is fixed); 251/251 tests; `tsc` clean;
only pre-existing ESLint findings; build exit 0. Evidence: `docs/ui-pilot/wave4/before|after/`
(19 + 19).

Pending:

1. **User acceptance** for `/directory` + `/animals`; stop after this group.
2. Next group recommended: `/documents` + `/challenges`. `/admin`, `/employees`,
   `/attendance`, `/scheduling` and financial workflows stay excluded.


## Wave 1 §3 checkpoint — Reports + Direction

Checkpoint: **`e5c0e9a`** (Direction) on `ui/reviews-stats-pilot`, parent **`7393230`**
(Reports), whose parent is `31cb2fd` (§2 verification). Branch:
**`ui/reviews-stats-pilot`**. Local commits; **not pushed, merged, deployed or migrated**.

Scope: `/reports` and `/direction` — one group of two related reporting surfaces that share
`/api/reports/accounting`, `/api/reports/daily-profit`, `/api/reports/revenue-comparison`
and the `DailyProfitView` / `OperationsView` / `RevenueComparisonView` components.
`/treasury` (cash-count, reserve and bank-account writes) and `/payments` (payment status
writes) were **deliberately excluded** from the group: both write finance data and need
their own migration and review.

### What shipped

| Area | File | Change |
| --- | --- | --- |
| Shared utilities | `src/app/globals.css` | `.ui-kpi-grid` (2-up on phones with the odd last card full width, 2-up on tablets, auto-fit ≥180 px from 1024 px; value drops to 22 px below 480 px), `.ui-kpi-delta` (`data-dir`), `.ui-table-scroll` (scroll + edge shadows only when there is content to scroll), `.ui-toolbar` / `.ui-toolbar-spacer`, `.ui-bar-row` / `.ui-bar-head`. Added globally because the shared report views are consumed by two routes. |
| KPI primitive | `src/components/ui/kpi-stat.tsx` | Additive `tone="positive" \| "negative"`; existing callers unchanged. |
| Reports bridge | `src/app/(dashboard)/reports/reports.css` (new) | `.rep` scoped token bridge (same pattern as `.revs` / `.ci`). |
| Reports views | `ReportsClient.tsx`, `DailyProfitView.tsx`, `RevenueComparisonView.tsx` | `KpiStat` + `.ui-kpi-grid`, `.ui-table-scroll`, `.ui-bar-row` (share column drops on phones so labels stop truncating); the four tabs are shared pills that wrap on phones. |
| Direction bridge | `src/app/(dashboard)/direction/direction.css` (new) | `.dir` scope, `.dir-shell`, `.dir-stack`, `.dir-panel` / `.dir-panel-title`, `.dir-equation*`, `.dir-source`, `.dir-loading` / `.dir-empty`. |
| Direction shell | `DirectionClient.tsx`, `direction/page.tsx` | Shared module header (breadcrumb + compact `Direction` title + seven pill tabs with eye toggles), panel area. The embedded **Loyverse** tab renders outside `.dir` so the un-migrated module keeps legacy tokens (verified: `--accent` still `#2563eb`, 0 migrated classes). |
| Direction panels | `DirectionExecutiveDashboard.tsx`, `DirectionOverview.tsx`, `DirectionComparaison.tsx`, `DirectionEndOfMonth.tsx`, `DirectionOperations.tsx`, `DirectionSourceBanner.tsx` | Equation card rebuilt as `.dir-equation` (grid on desktop, stacked ledger on phones) with its own figure line-height; KPI rows on the shared grid; toolbars and table scroll shared; the local `KpiCard` duplicate deleted; owner-only source banner collapsed into `<details>`; previous-year bars use the neutral series instead of `#f59e0b`. |

### Decisions

1. **One bridge per module, no global repoint.** `.rep` and `.dir` remap legacy token names
   to `--ui-*` inside their own scope only. `--accent`, `--surface`, `--fg` and `--line`
   are untouched everywhere else.
2. **Shared utilities live in `globals.css`, not in a bridge.** `DailyProfitView`,
   `OperationsView` and `RevenueComparisonView` are rendered by both `/reports` and
   `/direction`, so their classes cannot belong to either route's CSS.
3. **Loyverse stays outside the bridge.** The embedded tab belongs to another, not-yet-
   migrated module. `.dir-shell` holds two `.dir` siblings (header + tabs, then the
   non-Loyverse panels); Loyverse is a plain sibling with legacy tokens.
4. **Layout follows the workflow.** Reports keeps four dense tabs with tables and ranked
   lists. Direction gets one header, pill tabs, a date-first dashboard whose equation
   reads top-down on phones, and month steppers for the two monthly panels.
5. **Semantic colour only where it means something.** Signed results (profit/loss,
   “Reste en coffre”) carry `tone`; categorical series map to `--ui-series-neutral` /
   `--ui-warn` / `--ui-accent` instead of ad-hoc hex values.
6. **No calculation, API or permission change.** Two display fixes only: the equation
   figures no longer overflow their card, and a negative “Reste en coffre” keeps its minus
   sign (`formatMoney()` renders absolute values, which contradicted the red tone).

### Verification

| Check | Result |
| --- | --- |
| `npm run test` | 251/251 (38 files) |
| `npx tsc --noEmit` | Clean, exit 0 |
| ESLint on changed files | 0 errors; only the pre-existing 16 unused-vars and 3 `react-hooks/exhaustive-deps` warnings in `DirectionOverview.tsx` |
| `npm run build` | Exit 0 |
| Reports Playwright suite | **15/15** (4 tabs, date range, shop filter, sort, breakdown, loading, empty, error) |
| Direction Playwright suite | **20/20** (7 tabs, source disclosure, date shift, expense breakdown, shop filter, eye-toggle POST, comparaison edit/cancel/year shift, end-of-month expand, loading skeleton, empty, error, Loyverse isolation) |
| Post-review revision suite | **24/24** (headers/breadcrumbs/pills/labels, shop filter change/restore, KPI = row = total, future-month dashes, no −100 %, day shift, source disclosure, eye toggle, overview KPIs) |
| Overflow | 0 document-level overflow at 1440/768/390; tables scroll inside `.ui-table-scroll` |
| Data | **Real local Supabase data**, HTTP 200 on both routes; no page errors besides the known `DashboardShell` theme-toggle hydration warning |

### Evidence

`docs/ui-pilot/wave1b/before/` (10 captures) and `docs/ui-pilot/wave1b/after/`
(33 captures): 1440/768/390, light/dark, green/orange, plus
`reports-error-daily-1440-light.png`, `reports-empty-operations-1440-light.png`,
`direction-error-dashboard-1440-light.png`, `direction-empty-overview-1440-light.png`.

### Post-review revision — visual system alignment

The first pass used the tokens but not the Reviews organization. This revision:

- adds `ControlledTabs variant="pills"` (same `.ui-pillnav*` markup as `ModuleTabs`) and
  shared `.ui-filter-rows` / `.ui-filter-row` / `.ui-filter-label` / `.ui-filter-control`,
  `.ui-toolbar-actions`, `.ui-note` to `globals.css`;
- gives both modules a breadcrumb + compact title + real tabs in `ui-module-header-row`;
- applies the Reviews labelled selector pattern on every panel (period, range, month,
  multi-shop), preserving each screen's own behaviour;
- moves the owner source disclosure to the end of the Direction panel and removes the
  duplicated End-of-month month label;
- fixes the **Revenue comparison** presentation only: future months read `—` with an
  “à venir” pill instead of `฿0 / −100 %`; the running month is tagged “en cours”; the note
  names the exact cumulative range on both sides (Jan–focus month, not a full prior year)
  and states prior-year coverage (`4/8 shops`, `2 with all 10 months`). No calculation, API
  or SQL changed.

### Review fixes and equivalent-period proposal

- **Mobile Direction tabs**: thin scrollbar + edge fades + “↔ Faites défiler les onglets”.
  Verified at 390 px that the last pill and its eye toggle are fully reachable.
- **Mobile Reports tables**: sticky first column (date, shop, month, item), thin scrollbar,
  and a “↔ Défilez horizontalement” caption only on tables that actually overflow
  (`TableScrollAffordance`, `resize`/mutation observation).
- **Negative results**: explicit `−฿` (Pattaya: `−฿142,132`); no calculation change.
- **Equivalent-period proposal**: `docs/ui-pilot/revenue-equivalent-period-proposal.md`.
  Findings: no 2025 daily data; 2025 is monthly and covers 2–4 shops; last complete day
  **26 Oct 2026**, last complete month **Sep 2026**. Proposal: Jan–Sep comparison with
  “all shops” vs “comparable shops” totals, plus an additive API field. **Not implemented;
  awaiting the business decision.** A same-days comparison is impossible without estimating
  2025 daily revenue.

Evidence: `docs/ui-pilot/wave1b/after2/` (35 captures) and `wave1b/fixes/` (10 targeted
captures). Interaction suite **25/25**. Parity for the same period/shop before → after:
`฿5,562,549 / ฿66,369,758 / ฿67,424,161` unchanged; only Nov/Dec change from
`฿0 / ▼100.0 %` to `— / à venir`.

### Pending

1. **Accepted** for §1, §2 and §3 (visual reprise included). The next group
   (`/directory` + `/animals`) was then implemented and is **verified, awaiting
   acceptance** — see the final handoff at the top.
2. **Business decision — equivalent-period comparison.** Choose between the cumulative
   complete period (recommended) and an estimated same-days comparison; see
   `revenue-equivalent-period-proposal.md`. The comparable scope must be a **fixed group of
   shops covered over the whole period in both years**, and missing data must never be
   counted as zero. Do not change the calculation before the decision.
2. **Real-data verification** of Reviews and Customer Insights (Google token still absent
   locally); §3 itself ran on real local data but not on production data.
3. **Single role account.** Only the preview owner exists locally, so staff-facing
   rendering of `/direction` (role-specific tabs) and `/reports` was not exercised.
4. **`/api/locations` 503 locally** (no Google token); location lists come from the report
   payloads.
5. **`/api/direction/tabs` returns all `false` locally**, so the owner sees every tab
   plus the eye toggles. The eye toggle still flips the server value and its label; the
   dimmed state only applies to `direction` (boss) — pre-existing. The test intercepts
   that POST; nothing was persisted.
6. **Physical touch devices** — Playwright emulation only.

## Wave 1 §2 checkpoint — Customer Insights (+ Inbox filter disclosure)

Checkpoint: the **latest commit on `ui/reviews-stats-pilot`** (Wave 1 §2 follow-up), parent
`be6f556` (Wave 1 §2). Branch: **`ui/reviews-stats-pilot`**. Local commit; **not pushed,
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
| Customer Insights interaction/state suite | **40/40** (`wave1/ci-after/ci-states-report.json`) |
| Customer Insights filter-truth suite | **56/56** (`wave1/ci-after/ci-filter-truth-report.json`) |
| Reviews capture matrix (re-run) | 48/48, **0 overflow**, only the known `/api/locations` 503 |
| Inbox filter disclosure suite | **32/32** (`wave1/filters/filters-report.json`) |

### Evidence

- `docs/ui-pilot/wave1/ci-before/` — 9 captures of the pre-migration screen.
- `docs/ui-pilot/wave1/ci-after/` — 9 matrix captures, 5 state captures, 3 date-picker
  captures, `capture-report.json`, `ci-states-report.json`.
- `docs/ui-pilot/wave1/ci-after/` — filter-truth evidence: `ci-filter-truth-report.json`
  (56 checks), plus filtered-period, filtered-shop, empty-shop, mobile-trigger and
  mobile-panel captures.
- `docs/ui-pilot/wave1/filters/` — desktop, collapsed, expanded and active-filter captures
  in light-green and dark-orange, plus `filters-report.json`.
- `docs/ui-pilot/wave1/after/` — refreshed 48-capture Reviews matrix.

### Filter-truth follow-up

The Phangan / Last 30 days capture that looked wrong (1,284 total, 2025 weeks) was a
**fixture artefact**, not a filtering bug: the capture script returned one static 2025
payload for every request. A new suite (`ci-filter-truth.mjs`) drives the page against a
**filter-aware** mock built with the same bucket rules as `lib/aggregate.ts` (unmatched
values collapse to `Other / Review`, channels list form choices only, synthetic rows in
2026). It compares the UI with the response the page actually received.

Confirmed working: request `from`/`to`/`shop` params, KPI total and scope label, weekly
table and chart labels, countries and channels panels, shop-panel hiding, and a slow first
response followed by a rapid shop change (the `requestId` guard keeps the newest response).

Three real mismatches found and fixed (no calculation or API change):

1. **Panel footers implied the full total.** Countries and channels now say
   `N classified responses` because unmatched values are excluded from those lists; the
   shops panel counts only named shops (`N responses · X shops`), excluding
   `Other / Review`. Singular forms are handled (`1 classified response · 1 country`).
2. **Empty state did not explain the period.** When `meta.dateRange` is known, the empty
   panel now names the range the sheet actually covers.
3. **No cue during a refresh.** `.ci-region[data-refreshing="true"]` dims the previous
   response while a new one is in flight, so the screen never looks frozen or silently
   mislabelled.

Layout (same scope, no new metrics):

- **Mobile shop selector.** Below 768 px the pill row collapses to one disclosure
  (`All shops` / `Phangan`) that opens the same pills, mirroring the Reviews Stats branch
  control. `aria-expanded`/`aria-controls`, outside-click and Escape-to-trigger focus are
  implemented; both paths write through the same `onChange`.
- **Desktop rebalance.** The KPI card now stretches to the weekly chart's height and the
  source-range note anchors to the card bottom, so the left column reads as one block
  instead of a short card over empty space.

The capture fixture was also moved to 2026 so the matrix no longer reproduces the
misleading 2025 labels.

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

1. **Real Google data is still unverified.** There is no Google org token, so
   `/api/customer-insights/summary` returns `configured: false` locally. Filtering was
   verified against a filter-aware Playwright mock that mirrors `lib/aggregate.ts`, and the
   matrix uses a realistic 2026 payload; the unconfigured screen is the only state that ran
   against the live API. **Live Google/spreadsheet verification remains pending.**
2. **Owner-only page.** The route guard redirects non-owners to `/home`; only the preview
   owner account was available, so staff visibility was not exercised.
3. **No live Google fetch, no real spreadsheet latency.** Loading, error and empty states
   were simulated at the network boundary.
4. **Physical touch devices** — Playwright emulation only.
5. **User acceptance** — §1 and §2 awaited review at this checkpoint. §3 was then
   requested and is recorded above.

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

**Next task:** review the **Wave 1 §3** result (`/reports` `7393230`, `/direction`
`e5c0e9a`). If accepted, pick the next group from `ROLLOUT.md`; `/treasury` and
`/payments` stay out until they get their own migration and review because they write
finance data.

In scope for Wave 1 §3 (completed):

- Migrate `/reports` and `/direction` onto the Phase 0 foundation with scoped `.rep` /
  `.dir` bridges.
- Keep the embedded Loyverse tab outside the Direction bridge.
- Promote only the genuinely shared layout pieces to `globals.css`.
- Preserve all data, calculations, permissions and API contracts.

Out of scope until separately requested:

- Migrating another module (Wave 1 §3+).
- Changing global defaults so existing modules restyle silently.
- Database migrations, new dependencies, multi-tenant work or feature changes.
- Push, merge, deploy.

## Reading order for the next session

1. `docs/ui-pilot/HANDOFF.md` (this file)
2. `docs/ui-pilot/ROLLOUT.md` — module order, status, accent design, acceptance gates
3. `docs/ui-pilot/REPORT.md` — evidence, pre-existing issues, pending checks
4. `docs/ui-pilot/FOUNDATION-CANDIDATES.md` — token/primitive shortlist and open questions
5. `docs/ui-pilot/DESIGN-CONTRACT.md` — accepted visual rules
