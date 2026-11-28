---
name: Operate
description: Internal multi-branch operations system for Capybara Coffee — dense, honest, restrained
colors:
  canvas: "#f7f6f2"
  panel: "#ffffff"
  panel-2: "#f4f2ec"
  line: "#e2ded4"
  line-strong: "#c9c2b4"
  control-line: "#7d8a82"
  fg-1: "#191d1b"
  fg-2: "#454f49"
  fg-3: "#5f6b64"
  fg-4: "#67726b"
  accent: "#2c6f4c"
  accent-text: "#24624a"
  accent-soft: "#e9f2ec"
  positive: "#1f6b45"
  positive-soft: "#eaf4ee"
  negative: "#a63b30"
  negative-soft: "#fbebe8"
  warn: "#8a5a17"
  warn-soft: "#fbf3e4"
  series-primary: "#2c6f4c"
  series-neutral: "#55605a"
  series-track: "#e9e6df"
  focus: "#2c6f4c"
typography:
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  value:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 550
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  note:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  numeric:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  panel: "10px"
  control: "8px"
  element: "6px"
spacing:
  panel-pad-x: "18px"
  panel-pad-y: "16px"
  section-gap: "24px"
  control-h: "30px"
components:
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg-1}"
    rounded: "{rounded.panel}"
    padding: "16px 18px"
  kpi-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg-1}"
    rounded: "{rounded.panel}"
    padding: "16px 18px"
  pill-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    rounded: "999px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.control}"
---

# Design System: Operate

## Overview

**Creative North Star: "The clean ledger"** — an operations system that reads like a well-kept
accounting book: calm surfaces, tabular numbers, nothing decorative competing with real data.

Operate is a working tool used every day by café staff and the owner, so the system is dense,
scannable and restrained. The canvas is a warm off-white by day and a graphite field by night;
panels are quiet with 1px boundaries and almost no shadow. One muted emerald accent does the
pointing (active states, primary actions, the primary chart series); a small orange family is
available as a user accent choice and serves warning contexts only when semantic. Every other
color on screen means something — a star rating, an error, a caution — or it is neutral.

Light and dark are two deliberate environments, not an automatic inversion: warm paper versus
graphite, both avoiding extreme glare. Hierarchy, spacing and component behavior are identical
across both.

**Key Characteristics:**

- Compact module headers: a small breadcrumb (`Reviews / Stats`), a compact module title, and
  real sibling routes rendered as pill links on one row. No giant headings, no hero.
- Labelled filter rows (label column + control) instead of floating unlabeled inputs.
- KPI anatomy: short label → prominent value → concise comparison or note. No decorative icons.
- One accent family; semantic status colors (positive/negative/warn) are independent of it.
- Data reads at 13px body with tabular numerals in tables and comparisons.
- Panels are flat at rest; borders carry boundaries; shadows are near-subliminal.

## Colors

A warm neutral field with a single muted emerald accent; status colors exist only where data
means good, bad, or caution. No blue/purple decorative use, no gradients, no glow.

### Primary
- **Muted Emerald** `--ui-accent` (#2c6f4c light; #2f7a52 dark): active pills, primary buttons,
  focus rings, the primary chart series. Selected controls and actions only — rarely a surface.
- **Emerald Text** `--ui-accent-text` (#24624a / #7fc7a1): accent-colored text on soft surfaces.

### Secondary (accent alternative — user choice)
- **Warm Amber Accent** `--ui-accent` under `[data-accent="orange"]` (#b45309 light; #c2410c dark):
  identical roles as the emerald, chosen by the user in Preferences (+ accent-text/soft/focus/series
  variants). This is an accent family, not a status color.

### Tertiary (semantic status — never themed)
- **Positive** `--ui-positive` (#1f6b45 / #7fc7a1 + soft `#eaf4ee` / `#16251c`): improvements, good
  statuses, 5★/4★ ratings.
- **Negative** `--ui-negative` (#a63b30 / #f0938a + soft `#fbebe8` / `#2a1513`): real declines,
  errors, 1★/2★ ratings.
- **Caution** `--ui-warn` (#8a5a17 / #e3b06a + soft `#fbf3e4` / `#2a2114`): warning callouts,
  3★ ratings.

### Neutral
- **Warm Canvas** `--ui-canvas` (#f7f6f2): page background (light).
- **Graphite Field** `--ui-canvas` dark (#16181a): page background (dark).
- **Panel / Panel-2** `--ui-panel`, `--ui-panel-2` (#ffffff/#f4f2ec light; #1d2022/#24282a dark):
  card surface; panel-2 for inset/expanded rows.
- **Text ramp** `--ui-fg-1…4` (#191d1b→#67726b light; #eef1ef→#7f8a85 dark): primary values →
  secondary labels → captions → quiet hints.
- **Boundaries** `--ui-line` (#e2ded4 / #2e3335) and `--ui-line-strong`: 1px borders; 
  `--ui-control-line` for control outlines.
- **Series** `--ui-series-neutral` (#55605a / #aab5af): contrasting series in charts (e.g. the
  rating line against review bars) — shapes and neutrality contrast, not loud color.
- **Legacy scale untouched.** The old `--accent` (#2563eb) / `--canvas` / `--surface` / `--fg` /
  `--line` variables keep their values outside migrated modules (scoped per-route bridges). Do
  not repoint them globally.

### Named Rules
**The Meaning Rule.** Color only appears where it means something: accent = selection/action,
emerald/positive = good, amber = caution, red = real negative. Chart series that are just
categories use the neutral series. Nothing is colored for decoration.

**The Quiet Accent Rule.** The accent covers ≤10% of any screen and never fills whole panels;
outcomes get a quiet accent edge or a tone on the number, not a painted card.

## Typography

**Body Font:** Inter, via `--font-sans` (system-ui fallback)
**Numeric Font:** JetBrains Mono, via `--font-mono` (`font-variant-numeric: tabular-nums`)

**Character:** a neutral workhorse sans kept small and dense for data, with monospaced tabular
figures wherever numbers are compared or aligned. Page titles are 20px — the largest text on any
screen — so hierarchy comes from weight and position, not size jumps.

### Hierarchy
- **Page title** (600, 20px `--ui-text-page`): compact module title in the header row.
- **Value** (bulk, 30px `--ui-text-value`, 22px on phones): KPI numbers.
- **Title/panel label** (500–600, 13–14px): panel titles, list headers.
- **Body** (400, 13px `--ui-text-body`): table cells, content.
- **Label** (500, 12px `--ui-text-note`): filter labels, KPI labels.
- **Caption** (400, 11.5–12.5px): hints, notes, comparisons.
- **Numeric** (mono, tabular): deltas, money, ratings in tables.

### Named Rules
**The Readable Label Rule.** Every control and data group carries a visible label ("Boutique",
"Période", "Statut"); meaning must not require hover. Tiny uppercase eyebrows are not repeated
as a default pattern.

## Layout

A single content column inside the retained app shell (sidebar + topbar). Within a module:

1. Header row: breadcrumb + compact title + pill tabs (real sibling routes) in one band.
2. Filter toolbar: labelled rows (`.ui-filter-rows`, ~62px label column), actions right
   (`.ui-toolbar-actions`).
3. Primary region: KPI grid beside the main chart or the main table
   (`.ui-kpi-grid`: 2-up on phones with an odd last card full-width, 2-up tablets, auto-fit
   ≥180px from 1024px).
4. Secondary region: supporting tables/panels; wide tables live in `.ui-table-scroll` —
   they scroll inside their own bordered region while the page never scrolls horizontally.
5. Sections separated by `--ui-section-gap` (24px); panel interiors group related data at
   8–12px and separate unrelated at ≥16px.

Screen work in step with the workspace: mobile (≤768px) compacts headers and KPIs (2×2 kept),
stacks view pills into a scrollable strip with a scroll hint, and pins the leading table band;
desktop gives charts and tables full readable width. Text is never shrunk to fit.

## Elevation & Depth

Flat-by-default with tonal separation. Panels sit on the canvas by surface value and a 1px
border; a resting shadow (`--ui-shadow: 0 1px 2px rgba(25,29,27,.05)`) is near-subliminal and
only the tooltips/portals lift (`--ui-shadow-raised`). Nested cards within cards are avoided —
an inset uses `--ui-panel-2` background, not a box inside a box.

### Shadow Vocabulary
- **Resting** (`0 1px 2px rgba(25,29,27,.05)` light / `0 1px 2px rgba(0,0,0,.35)` dark): all
  panels at rest; barely perceptible.
- **Raised** (`0 10px 24px -14px rgba(25,29,27,.35)` light; `0 12px 28px -16px …` dark):
  tooltips, date-picker popovers, modals — content floating above the work, nothing else.

### Named Rules
**The Border Rule.** Boundaries are `--ui-line` 1px borders; shadows are not a layout device.

## Shapes

Panels and KPI cards use a soft 10px radius (`--ui-radius`); controls, inputs and buttons 8px
(`--ui-radius-md`); tooltips/callouts/banners 6px (`--ui-radius-sm`). Pills are fully rounded.
Edges align across the panel grid; repeated silhouettes (KPI row, bar rows, table bands) keep
equal heights so rows scan as one shape. Icons are neutral by default; no decorative icon badges.

## Components

Shared opt-in primitives live in `src/components/ui/` and the `ui-*` classes in
`src/app/globals.css`; each module maps them through its scoped token bridge.

### Buttons
- **Shape:** 8px radius, 30px control height (`--ui-control-h`).
- **Primary:** accent fill (`--ui-accent`) with white text; hover `--accent-hover`, active
  `--accent-active`. Destructive uses `--ui-negative` (+ `--bad-hover` on press).
- **Secondary/quiet:** panel background + `--ui-control-line` border; hover rows `--ui-row-hover`.
- **Focus:** visible `--ui-focus` ring; focus is never removed.

### Pill navigation (the module tabs)
- Real sibling routes as pill links (`.ui-pillnav*`): inactive pills are quiet (transparent on
  `--ui-fg-2`-leaning text, subtle border); the **active pill** uses the solid accent fill
  (`--ui-accent` + accent-fg text, 600 weight) — the accepted shipped treatment, clear but
  restrained at pill size. Color is never the only signal: the active pill's fill differs and
  hidden modules keep an eye-off marker.
- Horizontally scrollable on phones with edge fades and an "↔ scroll" hint when it overflows.

### Chips (filter pills)
- Same pill vocabulary for filters (period, branch, view toggles): `aria-pressed` /
  `role=tab` semantics; selected = accent-soft/accent-text; unselected quiet.

### Cards / Containers
- **Panel** (`.ui-panel*`): 10px radius, `--ui-panel` surface, `--ui-line` border, resting
  shadow; head (`--ui-panel-title` 14px/600 + sub) / body / foot rhythm at 18/16px padding.
- **KPI card** (`.ui-kpi`): label (12px) → value (30px, tone-tinted only when signed meaning
  exists) → unit → note/comparison; `.ui-kpi-delta` mono figures with a colored arrow only.
- **Table:** header row on `--ui-panel-2`, body 13px, rows `--ui-line`-separated, hover
  `--ui-row-hover`; 30px+ comfortable row height; first column sticks on phones inside
  `.ui-table-scroll`; sort headers are buttons with `aria-sort`.

### Inputs / Fields
- Flat `--ui-panel` fill, 1px `--ui-control-line` border, 8px radius; focus ring `--ui-focus`.
- Filter groups render as labelled rows: label column (`Période`, `Boutique`…) + wrapping
  controls (`.ui-filter-row`), never floating placeholder-only fields.
- Errors: inline negative text + `--ui-negative-soft` banner surfaces when a panel-level
  message is needed; disabled = quiet fg-3 with reduced opacity.

### Navigation
- Sidebar/topbar belong to the retained global shell (`.app-shell` bridge; active sidebar item
  follows the user's accent). Module navigation is in-page pills as above.
- Breadcrumbs (`.ui-breadcrumb`) are real routes only; no invented "Home" levels; separators
  render only when both segments exist.

### Status surfaces (signature)
- **Etat pill/status row:** positive (emerald), caution (amber `--ui-warn`), negative (red),
  neutral "No data" — honest and independent of the accent.
- **Callouts:** `--ui-warn-soft` / `--ui-negative-soft` surfaces at 6px radius for caution/error
  with plain text; error banners keep the last good data visible with a Retry.

## Do's and Don'ts

### Do:
- **Do** render real sibling routes as pill links in a single header row with a breadcrumb.
- **Do** use tabular numerals (mono) for any figure that is compared or summed.
- **Do** keep exact signed values with `−฿` (never parentheses, never unsigned red).
- **Do** fetch series colors from the palette (`--ui-series-*` / semantic tokens), never ad-hoc hex.
- **Do** show honest empty states ("No data" ≠ "OK"); label what a filter actually covers.
- **Do** scope visual change per module (bridge classes) and keep shared primitives opt-in.
- **Do** let tables scroll inside their own region; the page never scrolls horizontally.

### Don't:
- **Don't** invent content to imitate a mockup: no fake revenue, no fictitious activity widgets.
- **Don't** color every chart series differently; one accent + neutral contrast by shape.
- **Don't** use gradients, glows, glass effects, or loud blue/purple decoration.
- **Don't** put icon badges on KPI cards or repeat tiny-uppercase label styles as a pattern.
- **Don't** nest cards inside cards; use `--ui-panel-2` insets instead.
- **Don't** repoint legacy global tokens (`--accent`, `--surface`, `--fg`, `--line`) globally —
  bridges are per-module and the collapse is a separate later decision.
- **Don't** change calculations, permissions, API contracts or copy claims in a visual pass.
- **Don't** let color alone encode state or meaning (active tab, status, ratings keep text/shape).
