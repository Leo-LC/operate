# Design System — Operate

The canonical source is `prototype/tokens.css`. Everything in this doc must agree with that
file; if there's a discrepancy, the CSS wins.

---

## 1 · Colour

### Light warm (default)

| Token | Hex | Role |
|---|---|---|
| `--sand` (`--bg`) | `#f4ede0` | Page background |
| `--sand-2` (`--bg-2`) | `#efe6d4` | Inset surfaces, table headers, hover ghosts |
| `--wheat` | `#ebe2cf` | Tertiary surface |
| `--paper` / `--paper-2` (`--surface-2`) | `#faf6ed` / `#f7f2e6` | Sidebar, drawer footers |
| `--card` (`--surface`) | `#ffffff` | Cards, tables, drawer body |
| `--ink` (`--fg`) | `#2b231b` | Primary text |
| `--ink-2` (`--fg-2`) | `#4a3f33` | Secondary text |
| `--ink-3` (`--fg-3`) | `#6b5d4b` | Tertiary text |
| `--ink-4` (`--fg-4`) | `#8a7d6a` | Muted labels, eyebrows |
| `--ink-5` (`--fg-mute`) | `#b6a994` | Disabled |
| `--bronze` | `#b0875a` | Brand accent (primary buttons, active states, focus) |
| `--bronze-2` | `#9a7448` | Bronze pressed |
| `--bronze-soft` | `#e6d4ba` | Bronze background tint |
| `--good` | `#6f8b5b` | Positive status |
| `--warn` | `#c69748` | Warning status |
| `--bad` | `#b85a4a` | Negative status |
| `--info` | `#6a8cb8` | Informational status |
| `--*-soft` | … | Status background tints |
| `--line` | `rgba(43,35,27,0.10)` | Default hairline |
| `--line-2` | `rgba(43,35,27,0.06)` | Inner / table-row hairline |
| `--line-strong` | `rgba(43,35,27,0.18)` | Input + button borders |
| `--focus-ring` | `rgba(176,135,90,0.42)` | Focus outline |

### Dark warm

Set `data-theme="dark"` on `<html>`. All semantic tokens flip:

- `--sand` → `#1f1a14` (deep ink-brown)
- `--card` / `--surface` → `#2a241c`
- `--paper-2` / `--surface-2` → `#322b22`
- `--ink` (`--fg`) → `#f0e7d5` (cream)
- `--bronze` → `#d4a973` (warmer)
- `--*-soft` colours desaturated for dark

Persist user choice to `localStorage.operate.theme` ∈ `{light, dark}`.

### Pairing rules

- Body text is always `--fg`/`--fg-2`/`--fg-3` on `--bg`/`--surface`/`--surface-2`.
- `--bronze` is the brand accent — primary buttons, focus rings, active nav indicator,
  hover icon tint. Never use it as a large fill.
- Status tones (`--good`/`--warn`/`--bad`/`--info`) appear only on small surfaces —
  pills, dots, mini-bars, status borders. Never as page backgrounds.
- Forbidden: gradients, mesh, abstract decorative shapes, neon, pure black.

---

## 2 · Typography

| Family | Token | Usage |
|---|---|---|
| **Satoshi** (300/400/500/700) | `--font-sans` | UI, body, nav, table cells, labels |
| **Next Southerland Serif** (400-600, italic-capable) | `--font-display` | Section headlines, animal names, wiki article titles, the Overview greeting |
| **Next Southerland Script** (400) | `--font-script` | Handwritten accents only — the under-greeting line, occasional pull quotes |
| **JetBrains Mono** (400/500/600) | `--font-mono` | All numbers, currency, timestamps, kbd hints, codes |

### Size + weight

Sizes are spelled out in pixels in `tokens.css` (`--t-12` through `--t-40`). Component
defaults:

- Page title (h1): `28px / 500 / -0.01em tracking`, default `--font-sans`.
  **Overview greeting only:** uses `--font-display` italic at `40px / 400`.
- Section title: `15px / 500`, `--fg-2`.
- Card title: `14px / 500`.
- Card eyebrow (`.eyebrow`): `11px / 500 / 0.08em tracking / uppercase`, `--fg-4`.
- Body: `14px / 1.5 / 400`.
- Caption / hint: `12px–11px / 400`, `--fg-3` or `--fg-4`.
- Numbers in tables and stats: always `--font-mono` with `font-variant-numeric: tabular-nums`.

### Display + script usage

- The **display serif** appears sparingly: Overview greeting, animal names on cards
  and list rows, Wiki article H1, the Brand module's type spec, the pull-quote in
  Reviews detail, the "one line to remember" inside Wiki.
- The **script font** appears even more sparingly: only the under-greeting line on
  Overview (and any future tagline use). Never for body. Never below 18px.
- Everything else is Satoshi. **Resist sprinkling display/script into ordinary UI.**

---

## 3 · Spacing + layout

- 8-px grid. Tokens `--s-1` (4) · `--s-2` (8) · `--s-3` (12) · `--s-4` (16) ·
  `--s-5` (24) · `--s-6` (32) · `--s-7` (40) · `--s-8` (56) · `--s-9` (80).
- Sidebar width: 232px (`--sidebar-w`).
- Topbar height: 60px (`--topbar-h`).
- Page content max width: 1280px (`--content-max`). Module padding: `24px 32px 40px`,
  centred.
- Card padding: `--s-5` (24px) standard, `--s-4` (16px) for compact.
- Card body padding: `0` when the card contains a table or list (`padding="0"`);
  the table header gets its own padding row.

---

## 4 · Radii

- `--r-sm` (6px) — input + button corners
- `--r-md` (10px) — small chips, segmented active state, inline buttons
- `--r-lg` (14px) — cards, modals, drawers
- `--r-pill` (999px) — pills + avatars only

Avoid universal 16–24px "soft" radius — it reads template-y.

---

## 5 · Borders + shadows

- Default border: `1px solid var(--line)` — hairline, very subtle.
- Stronger border (inputs, focused cards): `1px solid var(--line-strong)`.
- Inner table-row separator: `1px solid var(--line-2)`.
- `--shadow-1`: `0 1px 2px rgba(43,35,27,0.04)` — barely visible, used on segmented
  active item only.
- `--shadow-2`: `0 6px 24px -10px rgba(43,35,27,0.18)` — modals and command palette.
- `--shadow-drawer`: `-18px 0 48px -20px rgba(43,35,27,0.28)` — right-side drawer.
- **No shadow on cards at rest.** They sit on the cream background and rely on
  the white-on-cream contrast.

---

## 6 · Motion

- `--dur` (150ms) — quick UI feedback (hover, button bg, row highlight).
- `--dur-2` (240ms) — drawers, page transitions, anything spatial.
- `--ease`: `cubic-bezier(0.22, 0.61, 0.36, 1)` — calm ease-out.

Specific patterns:
- Modules fade in (`opFade` keyframe in `shell.jsx`): `opacity 0 → 1` + `translateY(2px → 0)` over 240ms.
- Drawer slides in over 240ms with the scrim opacity-fading in parallel.
- Toggles, segmented, tabs all animate over 150ms.

**No bounces, no springs, no celebratory animations.** The brand is calm.

---

## 7 · Iconography

Lucide style, 1.5px stroke, rounded line-caps. In production use `lucide-react` (or the
framework equivalent) — every icon used in `icons.jsx` matches a real Lucide name.

Default size 18px; sidebar 16px; pill icons 12px; large hero icons 28px. Icons inherit
`color: currentColor`.

**No filled icons. No duotone. No emoji.** Status meaning is carried by both icon + colour
+ label, never colour alone.

---

## 8 · Component primitives

All defined in `prototype/components.jsx`. API summary:

### Button
- Props: `variant` (`primary` / `secondary` / `ghost` / `danger` / `quiet`),
  `size` (`sm` / `md` / `lg`), `icon` (left), `iconRight`, `disabled`, `full`,
  `onClick`, `children`.
- Heights: 28 / 34 / 40.
- Primary = bronze fill, cream text. Secondary = surface fill with hairline border.

### Pill
- Props: `tone` (`neutral` / `bronze` / `good` / `warn` / `bad` / `info` / `outline`),
  `size` (`sm` / `md`), `dot` (boolean), `icon`, `children`.
- Always sentence case (except the status group headers in Payments which are uppercase
  for emphasis — that's the one exception).

### Card
- Props: `padding` (CSS string, default `var(--s-5)`), `interactive`, `onClick`.
- White surface, 1px hairline border, 14px radius. Use `padding="0"` for cards that
  contain a table or grouped header.

### Stat
- Props: `label`, `value`, `prefix`, `suffix`, `delta`, `deltaTone`, `spark`, `hint`,
  `size`.
- Stat cards appear in 4-up grids above tables (Payments, Reviews, Attendance, etc.)
  and individually on Overview.

### Drawer
- Right-side by default (`side="right"`). 520–560px wide. Esc-to-close + scrim click
  to close. Animates over `--dur-2`. Manages keyboard focus.

### Tabs / Segmented
- Tabs: underline accent, count badges optional. Used on Reports and Admin.
- Segmented: pill-style switcher with active item raised. Used for view toggles
  (Accounting smart/focus, Payments table/detail, Animals grid/list, etc.).

### SearchInput / Input / Textarea / Field
- Standard form primitives with focus ring (`--focus-ring`). Border becomes `--bronze`
  on focus.

### Table primitives (`Table`, `TableHead`, `TableRow`)
- Use display-grid with `gridTemplateColumns`. Header row in `--bg-2`, body rows
  separated by `--line-2`. Mono tabular numerals for numeric columns. Row hover =
  `--row-hover`. Selected/active row = `--row-active` with optional left bronze
  indicator (used in Reviews + Payments detail list).

### Sparkline / MiniBar
- Inline SVG, no library. Sparkline supports `filled` (adds 15% alpha area fill)
  and `hover` (terminal dot). Default 64×18.

### Avatar
- Initials in a deterministic palette of `--bronze` / `--good` / `--info` / `--warn` /
  `--bad`. Size in px (20, 22, 28, 32, 40).

### Kbd
- Small monospace keycap, used inline (`⌘K`, `esc`, `j`, `k`, `?`) and inside the
  command palette / shortcuts overlay.

---

## 9 · Currency + numbers

- All money uses `thb(n)` from `components.jsx` → `฿1,234`. Negative numbers render as
  `-฿1,234`. Use `thb(n, { compact: true })` for values ≥1000 to abbreviate (`฿42k`,
  `฿1.2M`).
- Percentages use `fmtPct(n)` → `+8.4%` or `-2.1%`.
- Always wrap numeric cells in `.mono.tabular` (or your framework's equivalent) so
  digits line up across rows.

---

## 10 · Empty / loading / error states

- Empty: use the `Empty` primitive — centered icon + title + body + optional action.
  Icon defaults to `sparkle`; pick something relevant per surface.
- Loading: prefer skeleton placeholders matching the row/card shape, with subtle
  `--line-2` shimmer, over centered spinners.
- Error: a small `--bad-soft` band at the top of the affected surface with the error
  message in `--bad`. Don't replace the whole module with an error page unless the
  module can't render at all.
