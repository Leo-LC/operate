# Handoff — Operate hi-fi redesign

This bundle is a **design reference**, not production code. The HTML/JSX inside `prototype/`
is a clickable prototype showing every module of the new Operate hi-fi at the intended look,
feel, and behaviour. Your job: recreate this in the existing Operate codebase using its
established framework, component primitives, and patterns. **Do not lift the JSX files
wholesale** — they use inline styles + `window.*` globals because they were authored to run
under Babel-in-the-browser; that pattern is wrong for a real app.

---

## Fidelity

**High-fidelity.** Colours, type, spacing, radii, density, and interaction details are all
final. Match them pixel-close. Where the prototype shows a placeholder (e.g. animal photos
are espresso-coloured blocks because real photography wasn't bundled), keep the placeholder
treatment in code so the next person knows imagery is still pending.

---

## What's in this bundle

```
design_handoff_operate/
├── README.md               ← you are here · how to translate this into the real app
├── CLAUDE.md               ← the same brief, formatted for a Claude Code agent
├── DESIGN_SYSTEM.md        ← tokens, type, components, interactions in one place
├── MODULES.md              ← module-by-module spec (13 modules)
├── SCREENSHOTS.md          ← catalog of the 32 PNG captures
├── screenshots/            ← every module · light + dark · plus 6 interaction shots
└── prototype/              ← the working hi-fi reference
    ├── index.html          ← entry · loads everything via Babel
    ├── tokens.css          ← design tokens · the source of truth for colours/type/space
    ├── components.jsx      ← Button, Pill, Card, Stat, Drawer, Tabs, Table primitives, …
    ├── icons.jsx           ← Lucide-style icon set, used everywhere
    ├── shell.jsx           ← sidebar, topbar, theme toggle, ⌘K palette, ? overlay
    ├── data.jsx            ← sample data (shops, employees, animals, accounting, …)
    ├── modules/*.jsx       ← one file per module (Overview, Accounting, Payments, …)
    └── fonts/              ← Next Southerland Serif + Script (paid · already licensed by Léo)
```

To run the prototype locally: serve the `prototype/` folder over any static server
(`python -m http.server`, `npx serve`, etc.) and open `index.html`. The hash in the URL
selects the module (`#accounting`, `#payments`, …).

---

## How to read each design artefact

| If you want to know… | Read this |
|---|---|
| What colour an element is | `prototype/tokens.css` — every value is a CSS variable |
| The exact layout of a module | the matching file in `prototype/modules/` |
| What primitives exist | `prototype/components.jsx` (Button, Pill, Card, etc.) |
| How navigation works | `prototype/shell.jsx` — sidebar + hash routing + ⌘K + `?` |
| What sample data is realistic | `prototype/data.jsx` — shops, employees, animal names |
| What the brand system is | the `DESIGN_SYSTEM.md` file in this folder |
| What each module's behaviour is | the `MODULES.md` file in this folder |

---

## What "translate to the real app" means

You'll be working inside Léo's existing Operate codebase, which already has a warm/beige
visual vocabulary, an auth layer, real data fetching, and presumably a component library.
The expectation is:

1. **Adopt the design tokens.** Copy the palette and spacing scale from `tokens.css` into
   the codebase's existing theme system (or create one if none exists). Light + dark warm
   themes are both required. Persist user choice to localStorage.

2. **Match — don't duplicate — components.** If the codebase already has a `Button`,
   update it to the variants/sizes shown in `components.jsx`. Don't ship a parallel set.
   Same for `Pill`, `Card`, `Stat`, `Tabs`, `Segmented`, `Drawer`, `Avatar`, `SearchInput`,
   `Sparkline`, table primitives.

3. **Rebuild modules with the real schema.** The prototype's `data.jsx` is fake.
   Wire each module up to the existing API/queries. The IA and layout are locked —
   see `MODULES.md` for the contract per module.

4. **Preserve the locked interaction details.** These are non-negotiable and were
   approved during design review:
   - Accounting default = smart table with sparkline column headers + weekly subtotal rows.
     Click a day row → right-side drawer with Sales / Payments / Expenses / HR / Treasury
     sections. Segmented toggle swaps to Focus Day view. `j`/`k` keys move between days
     when the drawer is open. `Esc` closes.
   - Payments default = refined table with summary band (4 stat cards) + grouped status
     pills + bulk "Confirm N drafts" CTA. Segmented toggle swaps to two-pane detail
     (list left, breakdown right with comp stack + attendance pull + "Why deduction?"
     explainer).
   - Reports = two tabs: Operations (KPI hero cards with sparklines + revenue-by-shop
     bars + revenue-mix donut) and Treasury (12-month cash curve with danger zone +
     "What's eating the lean months" + recommended actions).
   - All other modules follow the wireframes 1:1 — see `MODULES.md`.

5. **Surprise interactions to keep.** Sparkline tooltips on Accounting headers, copy-row-
   as-CSV on Accounting hover, `⌘K` command palette, `?` shortcut overlay, `g`+letter
   nav. All are wired in the prototype — see `shell.jsx` and `modules/accounting.jsx`.

6. **What's out of scope.** Mobile/tablet layouts. Authentication. Multi-tenant. Animation
   beyond the standard 150ms / 240ms ease transitions defined in tokens. Léo only.

---

## Asset licences + caveats

- **Next Southerland Serif / Script** (in `prototype/fonts/`) are paid faces, licensed by
  Léo. They're used for the editorial accents (Wiki article titles, animal names, the
  greeting on Overview, the script tagline). Use the same files in production; don't
  swap in Google Fonts substitutes.
- **Satoshi** is loaded via Fontshare CDN in the prototype. Self-host the `.woff2` files
  in production for performance + offline behaviour.
- **JetBrains Mono** is loaded via Google Fonts in the prototype. Self-host for production.
- **Icons** in the prototype are inline SVGs in `icons.jsx`. In production, use the real
  `lucide-react` (or framework equivalent) package — every icon name in `icons.jsx`
  matches a real Lucide name.
- **The Capybara mark** is not bundled here; pull it from the existing brand assets the
  app already has. It does **not** appear in Operate's sidebar — internal tool, wordmark
  only ("Operate").

---

## Suggested implementation order

The brief asks for module-by-module delivery. Recommended sequence:

1. **Foundation** — tokens + theme toggle + base components (Button, Pill, Card, Stat,
   Drawer, Tabs, Segmented, Avatar, SearchInput, Sparkline, table primitives)
2. **App shell** — sidebar nav, topbar, ⌘K palette, `?` overlay, `g`+letter nav,
   theme persistence
3. **Accounting** — most complex; nail the table + drawer pattern first
4. **Payments** — second most complex; reuses table/drawer patterns
5. **Reports** — charts (sparkline, bar, donut, line)
6. **Overview** — greeting hero pulls everything together
7. **Scheduling** + **Attendance** — grid/heatmap patterns
8. **Documents** + **Contacts** + **Animals** — list + detail patterns
9. **Reviews** — list + detail with reply composer
10. **Wiki** — sidebar + article reader
11. **Brand** + **Admin** — settings-style modules

After each module, run it past Léo before moving on.
