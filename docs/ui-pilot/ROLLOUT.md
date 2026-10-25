# UI rollout — foundation, accent preference, module order

Status: **planning only.** The Reviews Stats pilot is accepted at `e6e59c3`; no foundation
has been extracted and no other module has been migrated.

Source of truth for the accepted look: `DESIGN-CONTRACT.md`, `REPORT.md`,
`FOUNDATION-CANDIDATES.md` and the screenshots in `docs/ui-pilot/screenshots/`.

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

## Current state (verified in the repo)

- 55 dashboard routes under `src/app/(dashboard)/`.
- Company theme: `app_settings.theme` → `getOrgTheme()` → `<html data-theme="capybara|forest">`.
  `forest` overrides `--company-accent`; `capybara` keeps the default accent.
- Light/dark: `next-themes`, `attribute="class"`, `storageKey="operate.theme"`, system
  mode disabled. The server renders `class="… dark"` with `suppressHydrationWarning`.
- Shared primitives already in use: `page-header` (14 files), `stat` (10), `card` (20),
  `module-tabs` (8), `pill` (9 modules), `pill-button` (6), `modal` (9),
  `view-toggle` (4), `drawer`, `filter-trigger`.
- The pilot's `--rs-*` tokens and `.revstats` layout are route-local. `ModuleTabs
  variant="pills"` and the `ShopMultiSelect` class hooks are the only shared changes.
- No accent preference storage exists today.

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
| `--rs-bar`, `--rs-bar-track`, `--rs-neutral-mark` | `--ui-series-1`, `--ui-series-track`, `--ui-series-neutral` | Chart/bar series |
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
`--ui-accent-line`, `--ui-focus`.

Applied by an attribute on `<html>`:

```
[data-accent="green"]  { … }
[data-accent="orange"] { … }
[data-accent="green"].dark  { … }
[data-accent="orange"].dark { … }
```

No attribute → company default (0.3). The green family is copied from the pilot, not
re-invented, so the accepted screen does not move. Orange is a candidate until its
contrast is measured; do not ship it if any text/control pair fails AA in either mode.

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
- The accent control is a small two-swatch choice plus "Company default", placed beside
  the existing theme toggle (and optionally as command-palette commands). No new route,
  no owner-only gate. Exact placement is a Phase 0 decision with the user.

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
| 1 | `reviews` siblings: `/reviews`, `/reviews/inbox`, `/reviews/templates`, `/reviews/rules`, `/reviews/locations` | Module tabs, filters, pill, tables, modals | Medium — inbox actions, but same domain as the pilot | pending |
| 2 | `/customer-insights` | Page header, stat, filters, card | Low — one read-only client | pending |
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

## Open decisions for the user

1. Confirm **green as the default accent** for both company themes (preserves the accepted
   Stats screen), with orange as an opt-in. Alternative: capybara defaults to orange.
2. Where the accent control lives: beside the theme toggle, in a user menu, or only in the
   command palette.
3. Whether a user may pick orange while the company theme is `forest` (proposed: yes).
4. Whether the accent also tints chart series or only interactive chrome (proposed:
   chrome + single-series accents; semantic and multi-series colors stay independent).

Do not start Phase 0 or any module until these are answered.
