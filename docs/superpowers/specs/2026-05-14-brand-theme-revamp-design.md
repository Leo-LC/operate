# Brand Theme Revamp + Multi-Theme System — Design Spec

**Date:** 2026-05-14  
**Branch:** `feature/brand-theme-revamp` (new, isolated from main)

---

## Context

The Operate app currently uses a forest-green color scheme that doesn't reflect the Capybara Coffee brand identity. This revamp applies the official brand palette (cream, espresso, amber, sage) and brand fonts (Cabinet Grotesk, Satoshi) to the entire UI, while also introducing a per-organization theme system so the app can be sold to other businesses who will want their own look.

The work is done on a separate branch and run locally for evaluation. If it looks good, it gets merged; if not, the branch is discarded.

---

## What Changes

### 1. Fonts

| Role | Current | New |
|---|---|---|
| Body / UI | Plus Jakarta Sans | Satoshi |
| Headings / Display | Instrument Serif | Cabinet Grotesk |
| Monospace | DM Mono | DM Mono (unchanged) |

Both Cabinet Grotesk and Satoshi are already in `/public/brand/` — no new downloads needed. They need to be loaded via `next/font/local` in `layout.tsx` instead of the current Google Fonts imports.

### 2. Color Palette

**Light mode** maps brand tokens to Tailwind CSS variables in `globals.css`:

| Variable | Current | New (brand) |
|---|---|---|
| `--background` | oklch warm cream | `#F7F2E9` (Cream) |
| `--foreground` | oklch dark | `#2F2823` (Espresso) |
| `--card` | near-white | `#FDFAF4` |
| `--primary` | forest green | `#B9854E` (Amber) |
| `--primary-foreground` | off-white | `#FFFFFF` |
| `--accent` | warm amber | `#EDE5D5` (Cream Deep) |
| `--muted` | light warm | `#EDE5D5` |
| `--muted-foreground` | mid gray | `#4A3B32` (Espresso Mid) |
| `--border` | warm gray | `rgba(185,133,78,0.15)` |
| `--sidebar` | dark forest green | `#2F2823` (Espresso) |
| `--sidebar-foreground` | light green-tinted | `#EDE5D5` |
| `--sidebar-primary` | bright green | `#D4A574` (Amber Light) |
| `--sidebar-accent` | darker green | `#3d3028` |
| `--success` | green | `#7C9A4D` (Sage) |
| `--ring` | green focus | `#B9854E` |

**Dark mode** (Warm Slate — option C selected):

| Variable | Value |
|---|---|
| `--background` | `#252220` |
| `--card` | `#2e2a26` |
| `--sidebar` | `#1E1C1A` |
| `--foreground` | `#EDE5D5` |
| `--primary` | `#D4A574` (Amber Light, brighter on dark) |
| `--muted-foreground` | `#8a8078` |
| `--border` | `rgba(255,255,255,0.06)` |

### 3. Theme System — `data-theme` attribute

#### Architecture

Themes are defined as CSS blocks in `globals.css`:

```css
/* Default (brand) — same as :root */
[data-theme="capybara"] { ... }

/* Forest Green (original app theme) */
[data-theme="forest"] { ... }

/* Future themes */
[data-theme="ocean"] { ... }
```

Dark mode variants use a compound selector:
```css
[data-theme="forest"].dark { ... }
```

The `data-theme` attribute is set on `<html>` at render time by the root server layout, based on the organization's stored preference.

#### Data model

Add a `theme` column to the organizations/settings table:

```sql
ALTER TABLE organizations ADD COLUMN theme text NOT NULL DEFAULT 'capybara';
```

(If there's no `organizations` table yet, store it in the existing location/admin settings structure — check `src/modules/admin/` for the right table.)

#### Runtime application

In `src/app/layout.tsx`, read the org's theme server-side and set it:

```tsx
// Fetch org theme from DB (server component)
const orgTheme = await getOrgTheme(); // returns e.g. "capybara"

<html lang="en" data-theme={orgTheme} suppressHydrationWarning>
```

`next-themes` already handles the `.dark` class; `data-theme` works alongside it without conflict.

#### Preset palettes (Phase 1)

Two presets to start:
- `capybara` — brand palette (cream/espresso/amber/sage) — **new default**
- `forest` — current green theme (preserved exactly as-is)

#### Admin UI — Appearance page

New route: `/dashboard/admin/appearance`

- Added to the admin sidebar section (alongside Users, Locations, HR Settings, Audit Logs)
- Shows a card grid of palette previews (mini dashboard mockups, same style as the brainstorm visuals)
- One-click to activate — saves to DB, reloads page with new theme
- No custom color input in Phase 1

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/app/globals.css` | Replace `:root` color vars with brand palette; add `[data-theme="capybara"]` and `[data-theme="forest"]` blocks; add dark variant for each |
| `src/app/layout.tsx` | Swap font imports to Cabinet Grotesk + Satoshi via `next/font/local`; add `data-theme` to `<html>` |
| `tailwind.config.ts` | Update `fontFamily` to reference new font variables |
| `src/app/dashboard/admin/appearance/page.tsx` | New page — theme picker UI |
| `src/lib/theme.ts` | New — `getOrgTheme()` server function, `setOrgTheme()` server action |
| `src/modules/admin/` | Add Appearance link to admin nav |
| DB migration | Add `theme` column to org settings |

---

## What Does NOT Change

- Layout and navigation structure
- Icons (Lucide React, unchanged)
- Component API/behavior
- Dark mode toggle (still works, now applies warm-slate dark instead of green-dark)
- Any backend/API logic

---

## Verification

1. **Run locally on a new branch**: `git checkout -b feature/brand-theme-revamp && npm run dev`
2. **Light mode**: App shows cream background, espresso sidebar, amber primary buttons
3. **Dark mode**: Toggle to dark — warm slate backgrounds, amber accents visible
4. **Theme switcher**: Go to Admin → Appearance, switch to "Forest" — app goes back to green. Switch back to "Capybara" — brand palette returns
5. **Fonts**: Headings use Cabinet Grotesk, body text uses Satoshi
6. **No regressions**: All existing pages (reviews, scheduling, accounting, wiki) render correctly in both themes
