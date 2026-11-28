# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal staff of Capybara Coffee, a multi-branch coffee business in Thailand (shops
include Ekkamai, Silom, Samui, Phangan, Karon, Chiang Mai). Roles reached through one
shared app:

- **Owner** — full access; configuration surfaces (`/admin`, finance settings, module
  visibility eye-toggles), all write flows. The local preview account is owner-only.
- **Admin / staff** — role-scoped access; modules are guarded server-side per role, and
  shop visibility is scoped (e.g. `user_location_access` on Payments). Admin/staff
  rendering was implemented but not runtime-verified locally (no second account).

## Product Purpose

Operate is the internal operations system for running the company day to day: reviews
(inbox, templates, locations, stats), customer insights, accounting, payments/payroll,
treasury, finance, reports/direction dashboards, scheduling, attendance, employees,
animals, contacts/directory, documents, challenges, wiki, brand and admin — plus a
Loyverse POS integration family and sandbox. Success is: staff complete real operational
tasks (record daily revenue, pay employees, schedule shifts, sync reviews, track cash)
with accurate, honest numbers.

## Positioning

A single in-house system where every module's permission, calculation and data contract is
owned by the business itself — not a generic SaaS. The accepted visual system (compact
headers, pill tabs, restrained green/orange accents, honest empty states) is deliberately
uniform across all modules, migrated additively per module.

## Operating Context

- Language: interface copy in **French** (labels like `Boutique`, `Période`,
  `Recherche`); currency **THB (฿)**; negative amounts print an explicit `−฿`.
- Data: local/production **Supabase** database; Google Business Profile reviews via sync;
  spreadsheet-backed Customer Insights (`/api/customer-insights/summary`); Loyverse POS.
- Light/dark is browser-local (`operate.theme`); a **green/orange accent preference** is
  browser-local (`operate.accent`, company default green); the company theme
  (`capybara` | `forest`) stays `app_settings.theme`, owner-controlled on
  `/admin/appearance`. Semantic status colors are identical in both accents.
- Preview login (local only) uses `NEXT_PUBLIC_PREVIEW_MODE` and `PREVIEW_AUTH_PASSWORD`;
  secrets live in `.env.local` and are never printed or committed.

## Capabilities and Constraints

- Single-tenant; no multi-tenant support. 55 dashboard routes under
  `src/app/(dashboard)/`.
- UI rollout status: **full perimeter migrated and verified** on branch
  `ui/reviews-stats-pilot` — Phase 0 foundation + Reviews Stats pilot accepted, Reviews
  siblings, Customer Insights, Reports + Direction, Directory, Animals, Documents,
  Challenges accepted; Treasury, Payments, Loyverse family, Accounting, Finance,
  Attendance, Scheduling, Admin + Employees, Home, Wiki, the global shell and all
  redirects verified, awaiting the owner's final review. `/brand` is exempt (self-scoped
  static document).
- The legacy token scale (`--accent`, `--canvas`, `--surface`, `--fg`, `--line`) is
  repointed per module through scoped bridges (`.revs`, `.ci`, `.rep`, `.dir`, `.trs`,
  `.pay`, `.lov`, `.sch`, `.adm`, …) plus the global `.app-shell` bridge; **collapsing the
  bridges into `--ui-*` is a deliberately deferred follow-up**, not part of current work.
- Known pre-existing limits (not regressions): the `DashboardShell` theme-toggle hydration
  warning; `/api/locations` 503 locally (no Google token); two Treasury cash-counter
  quirks (selection drop after incremental commit; `/direction` selection double-click);
  last-response-wins refreshes where no sequence guard exists (documented).
- Verification boundaries that stand until re-verified: owner-only account (admin/staff
  runtime not exercised), local Supabase data only, Playwright emulation instead of
  physical touch devices, mocked write paths (all test writes intercepted at the network
  boundary), no production or real Google data.
- Open business decision: the annual equivalent-period revenue comparison
  (`docs/ui-pilot/revenue-equivalent-period-proposal.md`) — same-days comparison requires
  estimation and is not implemented; missing data is never counted as zero.
- Operational note: after `npm run build`, restart `npm run dev` (build overwrites the
  dev `.next`).

## Brand Commitments

- Product name: **Operate** (Capybara Coffee internal tools). Company themes
  `capybara` and `forest` exist; both default to the green accent.
- The accepted Reviews Stats screen (`e6e59c3`) and the docs/ui-pilot contract
  (`DESIGN-CONTRACT.md`, `approved-reference.png`) are the binding visual references.
  Earlier explorations and the rejected hybrid are anti-references.

## Evidence on Hand

- Accepted design contract and rollout record: `docs/ui-pilot/DESIGN-CONTRACT.md`,
  `ROLLOUT.md`, `HANDOFF.md`, `REPORT.md`, `FOUNDATION-CANDIDATES.md`.
- Approved reference screenshot: `docs/ui-pilot/approved-reference.png`; per-wave
  before/after capture sets and JSON gate reports under `docs/ui-pilot/`.
- Real local Supabase data for Reviews (975 reviews, avg 4.78, 8 branches) and reports;
  thin or fixture-labelled data for treasury/payments/challenges.

## Product Principles

1. **Honesty beats polish.** Empty/null values get honest labels; "no data" is not "OK";
   an explicit sync is never confused with cached stats; no invented metrics.
2. **One task per surface.** Dense but scannable: hierarchy is filters → KPIs → primary
   data → secondary panels; most labels readable without hover.
3. **Color encodes meaning.** One restrained accent (green/orange user choice); semantic
   status colors are independent of the accent and never decorative.
4. **Additive, scoped, reversible.** Shared changes are opt-in; visual change lands
   per module through scoped bridges; the owner verifies module by module.
5. **Preserve the contract.** Business logic, calculations, permissions, API contracts
   and data are untouchable in visual work; test writes are always intercepted.

## Accessibility & Inclusion

- Color must never be the only carrier of meaning (active pills keep contrast + shape;
  hidden states carry text/icon signals; semantic star tones stay fixed).
- Keyboard operability: sort buttons with `aria-sort`, disclosures with
  `aria-expanded`/`aria-controls`, focus rings visible (`--ui-focus`), mobile scroll
  hints for overflowing tables. Contrast sampled at AA (4.5:1 text / 3:1 control).
- Reduced motion respected (non-essential animation disabled).
- No page-level horizontal overflow at any width (390/768/1440); tables scroll inside
  their own labelled region.
