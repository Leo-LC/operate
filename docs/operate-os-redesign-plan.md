# Operate — Company Operating System Redesign — Full Plan

> Persisted for session continuity. Update this file as phases complete.
> Branch: `design/operate-os-v1`
> Stack: Next.js 14 / Tailwind / shadcn / Lucide / Recharts
> Goal: dark-first, dense, precise internal OS (not SaaS template). Preserve routes/permissions/API/Supabase.

## Source Instructions (verbatim consolidated)

### Primary Design Goal
Redesign Operate so it feels like serious, purpose-built internal company operating system.
Closer to: professional finance/trading/admin/back-office, dense operational apps.
NOT: generic SaaS template, shadcn demo, AI dashboard, Claude-built app, startup landing, trendy consumer.
Feel: dark, precise, calm, compact, dense when useful, professional, slightly technical, premium without luxurious, modern without fashionable, structured, highly usable. "Company operating system" not "modern SaaS dashboard".

### Visual Reference (screenshots in `/Users/leolecee/Desktop/CapybaraCoffee/dashboard screenshots`)
- almost-black canvas, slightly lighter sidebar, subtle borders, minimal shadows, compact typography, small UI text, high density, clean left nav, monochrome base + blue active/action + green/red semantic + colorful charts, low-radius cards, flat, subtle separation, no exaggerated spacing/large headings/gradients/glass/oversized pills/huge rounded cards/excessive iconography.
- Structural principle overrides screenshots when conflicting; screenshots drive proportions/density.

### Core Design Philosophy
Move away from `page → card → card → controls inside cards` → Prefer `page → sections → data → actions → controls`.
Cards only for independent units: KPI, account, branch summary, chart, alert, employee summary, discrete object. Not for grouping headings/forms/tables/filters.
Use spacing/typography/borders/dividers/bg tone before cards.

### Design System
Encode rules into CSS variables, shared UI components, layout primitives, Tailwind, shadcn (customize deeply, don't remove). Reuse `src/components/ui`, `cn()` from `src/lib/utils.ts`.

### Color System (neutral dark base, not Capybara-branded)
Canvas #08090B, Sidebar #111216, Primary surface #0D0F12, Elevated #121419, Secondary #16181D, Border #22252B, Strong #2C3037, Text #F4F4F5 / #A1A1AA / #71717A / #52525B, Action blue #2563EB, success/warn/danger green/amber/red, info blue. Base almost monochrome; color = selection/action/state/trend/meaning/chart.

### Company Theming
Distinguish core UI tokens vs branding tokens (logo/name/accent/favicon). Don't hard-code Capybara colors into base system.

### Typography
Neutral grotesk Geist (confirmed). Compact: Page 24-28, Section 16-18, Panel 14-16, Body 13-14, Table 12-13, Meta 11-12. Hierarchy via weight/muted/spacing not size. Tabular numerals for finance/KPI/tables. Mono selectively.

### Spacing/Density
Reduce whitespace. Rhythm 4/8/12/16/20/24/32. Content padding 16-24 not 32-48. Compact tables, scanability.

### Radius
small 4, default 6, large 8, modal 10, pill 999 only for true pills.

### Shadows
Almost none; surface contrast + borders. Shadows only floating menus/popovers/drawers/dialogs.

### Sidebar
Keep left nav, redesign: compact serious dark 210-230px (spec 220), collapsed 64px, icons 15-16px, small labels, low padding, blue active, muted inactive, minimal separators, compact user area.

### Page Header
Compact: Title + small context only if useful, actions right, filters/tabs below. No auto subtitle/empty space.

### Metrics/KPI
Compact aligned subtle: small label, large value, small delta, green/red careful, minimal icons.

### Data-heavy dashboards (reports/sales/accounting/treasury/attendance/finance)
Dense: KPI row then large charts/tables. Dark charts, thin grids, restrained axes, saturated series only.

### Tables
First-class, finance-grade: compact rows, clear alignment, subtle separators, muted secondary, hover/selected, right-aligned numerics tabular, small chips.

### List/Management (employees/animals/documents/contacts etc)
Notion-like: manipulable, lightweight, inline edit/status, row actions, reorder, compact filters/sorting/tabs/search. Not giant modals per edit.

### Executive/Boss reporting
Same system but reduced density: 3-6 metrics, clear trends, simple charts, obvious hierarchy.

### Buttons/Inputs/Filters/Status/Chips/Icons/Charts/Mobile/Light/Motion/A11y
Buttons compact blue primary / dark border secondary / ghost tertiary 32-36h. Inputs subtle borders, compact 32-36. Filters adjacent to content (dropdown/search/date/status/segmented). Chips small semantic only. Icons 14-16 Lucide, not decorative. Charts colorful but restrained palette blue/green/orange/yellow/pink/purple on dark. Mobile bottom nav when appropriate, preserve identity. Light mode functional but dark priority. Motion 100-180ms only menus/rows/drawers/dialogs. Maintain contrast/keyboard/focus/semantic HTML.

### Explicitly Avoid
Gradients, glass, blur panels, giant rounded cards, rounded-xl everywhere, huge headings/heroes/illustrations/avatars, icon in everything, excessive shadows/glows/animation, pastel SaaS/purple AI, excessive whitespace, nested cards, cards as spacing, marketing copy/"Welcome back" filler, fake stats, decorative badges/meaningless charts.

### Implementation Strategy — Phases
1 Audit (done — see below)
2 Design tokens
3 Core primitives
4 Application shell
5 Representative pages (Reports, Animals, Recurring Costs, Home — confirmed)
6 Systematic migration (after review)

### Component Architecture
Create small strong primitives: AppPage, PageHeader, PageActions, Section, SectionHeader, Metric, MetricRow, DataPanel, DataTable, StatusBadge, FilterBar, Toolbar, EmptyState, InlineActions — not abstraction for its own sake.

### CSS/Tailwind Rules
Reduce arbitrary class strings; prefer CSS variables, shared variants. Extract repeated bg/border/radius/padding/typo.

### Quality Bar
Ask: still stock shadcn? too many cards/rounded/whitespace/large type/soft borders/large controls/over-iconed? hierarchy clear? dense but calm? finance-software feel? color purposeful? scannable?

### First-Pass Deliverable
Summary old problems, new tokens, components changed, pages redesigned, screenshots, UX improvements, functional risks, inconsistencies, next pages, branch/commits. Must build without errors.

---

## Phase 1 Audit Findings (READ-ONLY)

### Current Tokens — `src/app/globals.css:38`
Warm Capybara: --sand #f8f6f3, --wheat #ece9e3, --paper #fff, --ink #2b231b → --ink-5 #b6a994, --bronze #b0875a/soft #e6d4ba, --good #16a34a, --warn #d97706, --bad #dc2626, --line rgba(43,35,27,0.10), --bg var(--sand), --surface var(--card). Dark warm #1f1a14/#2a241c. Not near-black mono.
Spacing --s-1:4 … --s-9:80, radius --r-sm 6/md10/lg14/xl20/pill999, --sidebar-w 232, --topbar-h 60, --t-14 html, eyebrow 11 0.08 500, shadows --shadow-2 0 6 24 -10.
Forest theme preserved [data-theme=forest].
Tailwind `tailwind.config.ts:14` maps sand/ink/bronze.

### Primitives — `src/components/ui/*`
- button.tsx: cva primary bronze fill, secondary surface+line, ghost, danger bad-soft, sizes sm h-28 / default 34 / lg 40, icon variants
- card.tsx: flex col bg surface border line rounded lg p-24, header pb-16 title 15 500, footer border-t bg-2
- badge.tsx: h-5 rounded-4xl default/secondary/destructive/outline
- pill.tsx: tone neutral/bronze/good/warn/bad/info, h-22/18 pill
- stat.tsx: label 11 upper fg-4, value 24 600 mono, delta 12 600 + icon 36 pill 16%
- page-header.tsx: flex wrap gap-16 pb-24, h1 clamp 22-28 500 + subtitle 13 fg-3 + eyebrow
- tabs.tsx: default bg-muted rounded-lg, line variant; triggers h calc 100-1
- responsive-table.tsx: overflow-x-auto -mx-3 border line rounded lg min-width 560
- modal/drawer/sheet: var(--surface) border line rounded lg shadow-drawer, backdrop var(--overlay) blur
- dropdown-menu, checkbox, avatar, label, progress, empty, kbd, pill-button, sparkline, date-input, user-avatar, sonner as audited

### Shell — `src/components/dashboard-shell.tsx:19`
6 nav groups Performance/People/Finance/Compliance/Knowledge/System, icons 16 stroke 1.5, active var(--surface)+border line + bronze icon, sidebar var(--surface-2) border line, search h-34 min 260 bg surface, topbar 60h bg var(--bg)

### Representative Pages (pre-redesign)
- Reports ReportsClient: ShopSelector, Sparkline 64x28, KpiCard border-lg surface, SectionHeader bronze-soft, MetricBar 4h, BarListRow grid 18/1fr/96/56, OperationsView KPI grid 2/3/5
- Animals AnimalsListClient: shop PillButton filter, summary cards grid auto-fit 140, table sortable 13px, VaccinationUrgency pills
- Treasury TreasuryClient: Section border-lg, top summary grid 4, formula bar bg surface-2, cash/bank/reserve forms inline
- Home HomeClient + ViewerDashboard: ShopSummaryCard, trend cards

### Decisions Confirmed 2026-09-03
- Font: Geist (not Inter) + JetBrains Mono retained for tabular
- Representative pages: Reports, Animals, Recurring Costs, Home
- Dark-first default, light functional secondary
- Branch design/operate-os-v1
- Save plan here, update as we go, survive session switches

---

## Implementation Plan (Build Phases)

### Phase 2 — Design Tokens
- [ ] globals.css: replace :root/.dark with neutral dark spec; define --canvas/--sidebar/--surface/--surface-raised/--surface-2/--line/--line-strong/--fg tiers/--accent #2563EB; radius 4/6/8/10; spacing 4-32; sidebar 220/topbar 48; light :root as neutral light (gray) not warm; keep [data-theme=capybara|forest] as compat shim only overriding --accent
- [ ] tailwind.config.ts: remap colors to new vars, remove sand/wheat/bronze, keep shadcn aliases aliasing new tokens
- [ ] src/app/layout.tsx: swap Satoshi/Cabinet/Display/Script → Geist + JetBrains Mono; keep variables; set <html class="dark"> default? (next-themes dark)
- [ ] Verify: no hardcoded Capybara colors remain in tokens

### Phase 3 — Core Primitives (`src/components/ui/*` + new `src/components/ui/app-page.tsx` etc)
- [ ] Button: primary blue, secondary dark+border, ghost, danger red, sizes 28/32/40, radius 6
- [ ] Input/Select/Textarea/DateInput: h-32, rounded 4, border #22252B, bg #0D0F12, text 13, focus ring accent
- [ ] Badge/Pill → StatusBadge unified small semantic pill 18h 11px dot
- [ ] Card → DataPanel (low radius flat, no shadow) — deprecate Card as default spacer
- [ ] Tabs → line variant + FilterBar segmented 28h compact
- [ ] Table/ResponsiveTable → dense 36h rows, hover #16181D, tabular right numerics
- [ ] Dialog/Sheet/Dropdown/Drawer → #121419, border #2C3037, radius 10, minimal shadow
- [ ] New primitives: AppPage, Section, SectionHeader, Metric, MetricRow, Toolbar, EmptyState

### Phase 4 — Application Shell
- [ ] dashboard-shell.tsx: near-black canvas, #111216 sidebar 220px, 16px icons, muted inactive #71717A, active blue bg/text, compact group labels 10px, topbar 48, search h-32, user area compact
- [ ] dashboard.css: collapsed states, mobile drawer/bottom nav, density tweaks

### Phase 5 — Representative Pages
- [ ] Reports: flatten cards → sections, compact KPI row, dark charts thin grids, BarList dividers
- [ ] Animals: dense table, compact filters, species summary compact, urgency pills
- [ ] Recurring Costs (Finance): sections not cards, compact inputs, inline edit
- [ ] Home: executive density 3-6 metrics plain language, minimal chrome

### Phase 6 — Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` success
- [ ] `npm run test` if applicable
- [ ] Manual check Reports/Animals/Recurring/Home @ 1280 & 768 dark+light
- [ ] Git commits per milestone, summary + next pages suggestion

## Progress Log
- 2026-09-03: Branch created, this plan persisted at docs/operate-os-redesign-plan.md
- 2026-09-03: Phase 2 starting — tokens

