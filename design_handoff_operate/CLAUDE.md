# CLAUDE.md — Operate hi-fi redesign handoff

You are about to redesign Léo's existing Operate app (Capybara Coffee Thailand's internal
ops tool, used by 1–2 directors only) to match a finished hi-fi prototype that lives in
this folder under `prototype/`. This file tells you how to do that without screwing it up.

## Step 1 — Orient

Read these in order. **Do not skip ahead.**

1. `README.md` — the human-readable handoff brief
2. `DESIGN_SYSTEM.md` — every design token, type rule, component, and interaction
3. `MODULES.md` — module-by-module spec (13 modules)
4. `SCREENSHOTS.md` + `screenshots/` — 26 module captures (light + dark) plus 6
   interaction-state captures. Look at these alongside the matching prototype file.
5. The existing Operate codebase you've been pointed at — get a feel for its framework,
   component library, state management, and routing before you touch anything

Then read `prototype/tokens.css`, `prototype/components.jsx`, `prototype/shell.jsx`, and
one example module (`prototype/modules/accounting.jsx`) so you have a working mental model
of how the prototype is organised.

## Step 2 — Understand the contract

- The prototype is a **design reference**, not production code. It uses inline styles,
  `window.*` globals, and Babel-in-the-browser because it was authored to be editable in
  a design tool. **Do not copy that pattern into the real app.**
- The IA (information architecture), layouts, palette, type, density, and a handful of
  module-specific interaction decisions are **locked**. Don't redesign them. If something
  feels wrong, raise it with Léo — don't quietly change it.
- Light + dark warm modes are both required. Theme toggle is top-right of the topbar,
  persists to `localStorage` under key `operate.theme`.
- Desktop-first, 1440px+. **No mobile or tablet layouts.** No auth changes. No
  multi-tenant. No animation beyond what's in `tokens.css` (`--dur: 150ms`,
  `--dur-2: 240ms`, `--ease: cubic-bezier(0.22, 0.61, 0.36, 1)`).

## Step 3 — Set up the foundation

Before touching any module, do this in the existing codebase:

1. **Port the design tokens** from `prototype/tokens.css` into the codebase's existing
   theme system. Token names should survive 1:1 — `--bronze`, `--sand`, `--ink`,
   `--good`/`--warn`/`--bad`/`--info`, `--good-soft`/…, `--line`, `--surface`,
   `--surface-2`, `--row-hover`, `--row-active`, `--bg`, `--bg-2`, `--fg`, `--fg-2`,
   `--fg-3`, `--fg-4`, `--fg-mute`, plus the spacing scale `--s-1`…`--s-9`, the radius
   scale `--r-sm`/`--r-md`/`--r-lg`/`--r-pill`, and the motion tokens.
2. **Set up both themes.** The dark warm palette is defined under `[data-theme="dark"]`
   in `tokens.css`. Wire it to whatever theming primitive your codebase uses.
3. **Bring in the fonts.** Self-host Satoshi (Fontshare) and JetBrains Mono (Google Fonts)
   as `.woff2`. The Next Southerland Serif + Script `.ttf` files in `prototype/fonts/`
   are paid faces licensed by Léo — use them directly, don't substitute.
4. **Build the shared components.** Match the API surface in `prototype/components.jsx`:
   `Button` (variants: primary, secondary, ghost, danger, quiet; sizes sm/md/lg),
   `Pill` (tones: neutral, bronze, good, warn, bad, info, outline; sizes sm/md;
   optional `dot`/`icon`), `Card`, `Stat`, `Toggle`, `Segmented`, `Tabs`, `Avatar`,
   `Drawer`, `SearchInput`, `Kbd`, `Sparkline`, `MiniBar`, `PageHeader`, `Field`,
   `Input`, `Textarea`, table primitives, `Tooltip`, `Empty`. **Don't ship parallel
   versions of components the codebase already has — update the existing ones instead.**
5. **Build the shell.** Sidebar nav (13 items, listed in `shell.jsx` as `NAV_ITEMS`),
   topbar with search trigger / `?` button / notifications / theme toggle, user footer
   in sidebar. Wire ⌘K (command palette), `?` (shortcuts overlay), `g`+letter (jump-to
   navigation), `T` (toggle theme). The sidebar shows just the "Operate" wordmark —
   no Capybara mark — because this is an internal tool. The user footer shows Léo
   with avatar + role.

Surface the foundation to Léo before building modules. Get sign-off on the components +
shell first. **Don't move on until that's approved.**

## Step 4 — Build modules in this order

For each module: read the matching section in `MODULES.md`, read the matching
`prototype/modules/<name>.jsx`, then implement using the real codebase's components and
data layer. **Always ship one module at a time** and wait for Léo's review.

1. **Accounting** — most complex; nail the table + drawer pattern here so other modules
   can reuse it
2. **Payments** — second most complex; reuses the table pattern
3. **Reports** — Operations + Treasury tabs; introduces chart components
4. **Overview** — pulls together stats / lists / the greeting
5. **Scheduling** — week grid + list view
6. **Attendance** — heatmap
7. **Documents** — list with filters
8. **Animals** — grid + list
9. **Contacts** — list with side-panel add form
10. **Reviews** — list + detail with reply composer
11. **Wiki** — sidebar TOC + article reader
12. **Brand** — read-only reference (palette, type, voice)
13. **Admin** — General / Members / Integrations / Audit tabs

After each module, run a self-check against the matching `prototype/modules/<name>.jsx`:
spacing, colour usage, font usage, hover/focus states, segmented toggles wired, drawers
opening, tabs switching, theme working under both light and dark.

## Step 5 — Preserve the locked interaction details

These were approved during design review. **Do not "improve" them without explicit
sign-off from Léo.**

- **Accounting · smart table.** Sparkline column headers with `mousemove` tooltips
  showing `dN: ฿amount`. Daily rows with mono tabular numerals. Weekly subtotal rows
  (`Week N · subtotal`) in `--bg-2` between week groups. Month total row at the bottom
  in `--bronze-soft`. Hovering a row reveals a "copy row as CSV" action in the rightmost
  cell. Clicking a row opens the day drawer.
- **Accounting · day drawer.** Right-side, ~560px wide, with grouped sections
  Sales / Payments / Expenses / HR / Treasury. Each section is collapsible (default open).
  `j`/`k` (or arrow keys) move the drawer to next/prev day. `Esc` closes.
- **Accounting · Focus Day.** A segmented control toggle in the page header switches
  to this view. Horizontal day strip up top, "Net for {day}" hero with breakdown bars
  on the left, "By shop" stacked-bar list on the right.
- **Payments · refined table.** Summary band of 4 stat cards (Total / Drafts / Paid /
  Due in). Rows grouped by status (Drafts → Confirmed → Paid) with a header strip per
  group. Bulk "Confirm N drafts" button in the page header, primary variant, disabled
  when no drafts.
- **Payments · two-pane detail.** Segmented toggle to switch from table to this view.
  List left (compact rows with avatar + amount + status pill), full breakdown right
  (header with avatar + role + status, comp stack with base/tips/bonus/deduction lines,
  "Why deduction?" expander, attendance pull as 14 small squares, recent payments list,
  action bar with Confirm/Edit/Slip PDF/Void).
- **Reports.** Two tabs, Operations and Treasury. Operations: 4 KPI cards each with
  sparkline + delta pill, then revenue-by-shop bar chart (this-year overlay on last-year
  baseline) + revenue mix donut, then top performers leaderboard + customer signal
  histogram. Treasury: 12-month projected cash curve with dashed danger line at ฿800k
  and red dots on months below it, then "What's eating the lean months" (cost
  breakdown bars) + "Recommended actions" (4 actions with impact deltas).
- **Theme toggle.** Top-right of the topbar. Light = sand; dark = ink-brown. Persists
  to localStorage. `T` keyboard shortcut also toggles.
- **⌘K palette.** Searches NAV_ITEMS + employees + shops + recent documents. Arrow keys
  move selection, Enter activates, Esc closes.
- **`?` overlay.** Modal showing all keyboard shortcuts, grouped by section.
- **`g`+letter nav.** `g`+`o` → Overview, `g`+`c` → Accounting, `g`+`p` → Payments, etc.
  Full mapping in `shell.jsx` under `NAV_ITEMS`.

## Step 6 — Things to deliberately avoid

These are the AI-slop tropes Léo explicitly called out. Don't do them:

- ❌ Gradient backgrounds
- ❌ Rounded-corner-with-left-border accent cards
- ❌ Emoji as iconography (use the Lucide icons from `icons.jsx`)
- ❌ Hand-drawn SVG illustrations (placeholders for missing photography are flat
  espresso blocks — that's intentional)
- ❌ Overused font families (Inter, Roboto, Arial, Fraunces, system stack)
- ❌ Heavy drop shadows on type or cards
- ❌ Universal 16–24px "soft" radius — cards are 14px max, inputs 10px, pills are
  full pill or nothing
- ❌ Mobile responsive breakpoints below 1280px — desktop-first only
- ❌ Animation beyond 240ms ease-out — no bounces, no springs

## Step 7 — Voice + copy

If you write any user-facing copy (empty states, error messages, confirmations), follow
the brand voice rules: specific not vague, warm not gushing, knowledgeable not academic,
inviting not pushy. British/Commonwealth spelling. Em-dashes liberally with spaces — like
this. No emoji. Numerals over words for quantities/durations/prices ("30 minutes",
"400 THB"). Curly quotes “like this”.

Operate's existing copy is already in this voice — match it. Don't rewrite Léo's strings
unless he asks.

## Quick sanity checks before each module review

- [ ] Both light + dark themes work; nothing hardcoded
- [ ] All numbers use the mono tabular font (`var(--font-mono)` + tabular-nums)
- [ ] Currency uses `thb()` helper (or your codebase's equivalent — `฿1,234`)
- [ ] Hover/focus/active states exist on every interactive element
- [ ] No console errors, no missing icons, no font-fallback flashes
- [ ] Keyboard shortcuts still work inside the module (⌘K, `?`, `g`+letter)
- [ ] Drawer/modal behaviour is consistent (scrim blur, Esc closes, focus trap)
- [ ] No mobile breakpoints below 1280px
- [ ] Empty/loading/error states designed (use `Empty` primitive as the shape)
