# Brand Theme Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Capybara Coffee brand palette and fonts to the Operate app on an isolated branch, with a per-org theme switcher (preset palettes) accessible at Admin → Appearance.

**Architecture:** CSS custom properties in `globals.css` are the single source of truth for all colors. The default `:root` block becomes the brand (capybara) palette; additional `[data-theme="forest"]` blocks restore the original green scheme. The `data-theme` attribute is set on `<html>` server-side in `layout.tsx` from an `app_settings` DB row. Fonts are loaded via `next/font/local` from files already in `/public/brand/fonts/`.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Supabase (via `getSupabaseServerClient`), `next/font/local`, shadcn/ui, `next-themes` (dark mode — unchanged)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/app/layout.tsx` | Load brand fonts; set `data-theme` on `<html>` |
| Modify | `src/app/globals.css` | Brand color vars in `:root`; forest vars under `[data-theme="forest"]` |
| Modify | `tailwind.config.ts` | Point `fontFamily` at new CSS variables |
| Create | `src/lib/theme-config.ts` | `AppTheme` type + `THEMES` constant (client-safe) |
| Create | `src/lib/theme.ts` | `getOrgTheme()` + `setOrgTheme()` server functions — imports from theme-config |
| Modify | `src/app/dashboard/admin/layout.tsx` | *(no change — auth guard is fine as-is)* |
| Modify | `src/modules/admin/components/AdminTabNav.tsx` | Add Appearance tab |
| Create | `src/app/dashboard/admin/appearance/page.tsx` | Server page — reads current theme, renders client |
| Create | `src/modules/admin/components/AppearanceClient.tsx` | Theme card grid, PATCH on select |
| Create | `src/app/api/admin/appearance/route.ts` | GET/PATCH for org theme in Supabase |

---

## Task 1 — Create the branch

**Files:** none (git only)

- [ ] **Step 1: Create and switch to the feature branch**

```bash
git checkout -b feature/brand-theme-revamp
```

Expected: `Switched to a new branch 'feature/brand-theme-revamp'`

- [ ] **Step 2: Confirm clean state**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

## Task 2 — DB migration: `app_settings` table

**Files:**
- Supabase SQL (run via Supabase dashboard or CLI)

The theme is stored in an `app_settings` table, same pattern as `hr_settings`. Run this migration in the Supabase SQL editor (or via `supabase migration`):

- [ ] **Step 1: Run the migration**

```sql
create table if not exists app_settings (
  organization_id uuid primary key,
  theme text not null default 'capybara',
  updated_at timestamptz not null default now()
);

-- Seed the default row for the org
insert into app_settings (organization_id, theme)
values ('a1b2c3d4-0000-0000-0000-000000000001', 'capybara')
on conflict (organization_id) do nothing;
```

- [ ] **Step 2: Verify in Supabase**

In the Supabase Table Editor, confirm `app_settings` exists and has one row with `theme = 'capybara'`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add app_settings table for org theme"
```

(If using Supabase CLI migrations, commit the migration file instead.)

---

## Task 3 — `src/lib/theme-config.ts` + `src/lib/theme.ts`

**Files:**
- Create: `src/lib/theme-config.ts` (client-safe constants)
- Create: `src/lib/theme.ts` (server-only functions)

`THEMES` and `AppTheme` are split into `theme-config.ts` so client components can import them without pulling in server-only Supabase code.

- [ ] **Step 1: Create `src/lib/theme-config.ts`**

```ts
export type AppTheme = "capybara" | "forest";

export const THEMES: { id: AppTheme; label: string; description: string }[] = [
  {
    id: "capybara",
    label: "Capybara Coffee",
    description: "Brand palette — cream, espresso, amber & sage",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Original green theme",
  },
];
```

- [ ] **Step 2: Create `src/lib/theme.ts`**

```ts
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { type AppTheme } from "@/lib/theme-config";

export type { AppTheme } from "@/lib/theme-config";

export async function getOrgTheme(): Promise<AppTheme> {
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select("theme")
      .eq("organization_id", DEFAULT_ORG_ID)
      .single();
    const theme = data?.theme;
    if (theme === "capybara" || theme === "forest") return theme;
    return "capybara";
  } catch {
    return "capybara";
  }
}

export async function setOrgTheme(theme: AppTheme): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase
    .from("app_settings")
    .upsert(
      { organization_id: DEFAULT_ORG_ID, theme, updated_at: new Date().toISOString() },
      { onConflict: "organization_id" },
    );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme-config.ts src/lib/theme.ts
git commit -m "feat: add theme helpers getOrgTheme / setOrgTheme"
```

---

## Task 4 — Appearance API route

**Files:**
- Create: `src/app/api/admin/appearance/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgTheme, setOrgTheme, type AppTheme } from "@/lib/theme";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const theme = await getOrgTheme();
  return Response.json({ theme });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { theme?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { theme } = body;
  if (theme !== "capybara" && theme !== "forest") {
    return Response.json({ error: "Invalid theme" }, { status: 400 });
  }

  await setOrgTheme(theme as AppTheme);
  return Response.json({ theme });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/appearance/route.ts
git commit -m "feat: add /api/admin/appearance GET+PATCH route"
```

---

## Task 5 — Update `layout.tsx`: fonts + `data-theme`

**Files:**
- Modify: `src/app/layout.tsx`

The font paths below are relative to `src/app/layout.tsx`. Variable fonts are used where available (one file covers all weights).

- [ ] **Step 1: Replace the entire file content**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { DM_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getOrgTheme } from "@/lib/theme";

const sans = localFont({
  src: "../../public/brand/fonts/satoshi/Fonts/WEB/fonts/Satoshi-Variable.woff2",
  variable: "--font-sans",
  weight: "300 900",
  display: "swap",
});

const serif = localFont({
  src: "../../public/brand/fonts/cabinet_grotesk/Fonts/WEB/fonts/CabinetGrotesk-Variable.woff2",
  variable: "--font-serif",
  weight: "100 900",
  display: "swap",
});

const decorative = localFont({
  src: "../../public/brand/fonts/the_next_southerland/Next Southerland Serif.otf",
  variable: "--font-decorative",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Operate",
  description: "Internal operations platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgTheme = await getOrgTheme();

  return (
    <html
      lang="en"
      data-theme={orgTheme}
      className={cn("font-sans", sans.variable, serif.variable, decorative.variable, mono.variable)}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

Note: `sans` is now Satoshi (body), `serif` is Cabinet Grotesk (headings/display). This is intentional — `font-sans` and `font-serif` are Tailwind utility class names and we map brand fonts to them to avoid changing every class throughout the codebase.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: load brand fonts via next/font/local, set data-theme server-side"
```

---

## Task 6 — Update `tailwind.config.ts`: add `--font-decorative`

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add `decorative` to the fontFamily config**

In `tailwind.config.ts`, update the `fontFamily` block inside `theme.extend`:

```ts
fontFamily: {
  sans: ["var(--font-sans)", "system-ui", "sans-serif"],
  serif: ["var(--font-serif)", "Georgia", "serif"],
  decorative: ["var(--font-decorative)", "Georgia", "serif"],
  mono: ["var(--font-mono)", "ui-monospace", "monospace"],
},
```

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: add font-decorative to tailwind config"
```

---

## Task 7 — Rewrite `globals.css`: brand palette + `[data-theme]` blocks

**Files:**
- Modify: `src/app/globals.css`

This is the core visual change. Replace the `:root` and `.dark` blocks with brand colors, and add `[data-theme="forest"]` blocks to preserve the original green scheme.

- [ ] **Step 1: Replace the `:root` and `.dark` color blocks**

Replace everything between `@layer base {` and the end of `.dark { ... }` (keeping everything after the dark block intact). The new content:

```css
@layer base {
  *, *::before, *::after {
    transition-property: color, background-color, border-color, fill, stroke;
    transition-duration: 150ms;
    transition-timing-function: ease;
  }

  /* ═══════════════════════════════════════════
     CAPYBARA COFFEE — default brand theme (light)
  ═══════════════════════════════════════════ */
  :root {
    --background: #F7F2E9;
    --foreground: #2F2823;
    --card: #FDFAF4;
    --card-foreground: #2F2823;
    --popover: #FEFCF8;
    --popover-foreground: #2F2823;

    --primary: #B9854E;
    --primary-foreground: #FFFFFF;

    --secondary: #EDE5D5;
    --secondary-foreground: #4A3B32;
    --muted: #EDE5D5;
    --muted-foreground: #7A6A5A;

    --accent: #EDE5D5;
    --accent-foreground: #2F2823;

    --destructive: oklch(0.55 0.18 25);
    --border: rgba(185, 133, 78, 0.18);
    --input: rgba(185, 133, 78, 0.12);
    --ring: #B9854E;

    --chart-1: #7C9A4D;
    --chart-2: #B9854E;
    --chart-3: oklch(0.58 0.14 220);
    --chart-4: oklch(0.62 0.14 310);
    --chart-5: oklch(0.55 0.15 25);

    --success: #7C9A4D;
    --amber: #B9854E;

    --radius: 0.6rem;

    --sidebar: #2F2823;
    --sidebar-foreground: #EDE5D5;
    --sidebar-primary: #D4A574;
    --sidebar-primary-foreground: #2F2823;
    --sidebar-accent: #3D3028;
    --sidebar-accent-foreground: #F7F2E9;
    --sidebar-border: rgba(255, 255, 255, 0.06);
    --sidebar-ring: #D4A574;
  }

  /* Capybara dark — warm slate */
  .dark {
    --background: #252220;
    --foreground: #EDE5D5;
    --card: #2E2A26;
    --card-foreground: #EDE5D5;
    --popover: #2A2520;
    --popover-foreground: #EDE5D5;

    --primary: #D4A574;
    --primary-foreground: #1A1410;

    --secondary: #332D28;
    --secondary-foreground: #C4B8A8;
    --muted: #332D28;
    --muted-foreground: #8A8078;

    --accent: #3A3028;
    --accent-foreground: #EDE5D5;

    --destructive: oklch(0.62 0.17 25);
    --border: rgba(255, 255, 255, 0.07);
    --input: rgba(255, 255, 255, 0.06);
    --ring: #D4A574;

    --chart-1: #7C9A4D;
    --chart-2: #D4A574;
    --chart-3: oklch(0.62 0.14 220);
    --chart-4: oklch(0.65 0.14 310);
    --chart-5: oklch(0.60 0.15 25);

    --success: #7C9A4D;
    --amber: #D4A574;

    --sidebar: #1E1C1A;
    --sidebar-foreground: #D8D0C4;
    --sidebar-primary: #D4A574;
    --sidebar-primary-foreground: #1A1410;
    --sidebar-accent: #2C2824;
    --sidebar-accent-foreground: #F0E8D8;
    --sidebar-border: rgba(255, 255, 255, 0.05);
    --sidebar-ring: #D4A574;
  }

  /* ═══════════════════════════════════════════
     FOREST — original green theme (light)
  ═══════════════════════════════════════════ */
  [data-theme="forest"] {
    --background: oklch(0.972 0.010 85);
    --foreground: oklch(0.13 0.015 60);
    --card: oklch(0.993 0.005 80);
    --card-foreground: oklch(0.13 0.015 60);
    --popover: oklch(0.997 0.003 80);
    --popover-foreground: oklch(0.13 0.015 60);
    --primary: oklch(0.36 0.13 145);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.94 0.008 80);
    --secondary-foreground: oklch(0.22 0.012 60);
    --muted: oklch(0.935 0.007 80);
    --muted-foreground: oklch(0.50 0.012 60);
    --accent: oklch(0.93 0.045 80);
    --accent-foreground: oklch(0.18 0.04 60);
    --destructive: oklch(0.55 0.18 25);
    --border: oklch(0.875 0.008 80 / 0.8);
    --input: oklch(0.92 0.006 80 / 0.9);
    --ring: oklch(0.50 0.13 145);
    --chart-1: oklch(0.68 0.13 145);
    --chart-2: oklch(0.72 0.13 75);
    --chart-3: oklch(0.58 0.14 220);
    --chart-4: oklch(0.62 0.14 310);
    --chart-5: oklch(0.55 0.15 25);
    --success: oklch(0.60 0.16 145);
    --amber: oklch(0.78 0.14 75);
    --sidebar: oklch(0.155 0.042 145);
    --sidebar-foreground: oklch(0.87 0.025 145);
    --sidebar-primary: oklch(0.68 0.13 145);
    --sidebar-primary-foreground: oklch(0.12 0 0);
    --sidebar-accent: oklch(0.24 0.055 145);
    --sidebar-accent-foreground: oklch(0.95 0.015 145);
    --sidebar-border: oklch(0.28 0.04 145 / 0.5);
    --sidebar-ring: oklch(0.68 0.12 145);
  }

  /* Forest dark */
  [data-theme="forest"].dark {
    --background: oklch(0.13 0.018 145);
    --foreground: oklch(0.94 0.010 80);
    --card: oklch(0.165 0.022 145);
    --card-foreground: oklch(0.94 0.010 80);
    --popover: oklch(0.155 0.02 145);
    --popover-foreground: oklch(0.94 0.010 80);
    --primary: oklch(0.70 0.13 145);
    --primary-foreground: oklch(0.10 0 0);
    --secondary: oklch(0.21 0.025 145);
    --secondary-foreground: oklch(0.92 0.008 80);
    --muted: oklch(0.20 0.022 145);
    --muted-foreground: oklch(0.62 0.012 80);
    --accent: oklch(0.25 0.035 145);
    --accent-foreground: oklch(0.94 0.010 80);
    --destructive: oklch(0.62 0.17 25);
    --border: oklch(0.27 0.025 145 / 0.85);
    --input: oklch(0.26 0.022 145 / 0.9);
    --ring: oklch(0.65 0.10 145);
    --success: oklch(0.72 0.16 145);
    --amber: oklch(0.78 0.14 75);
    --chart-1: oklch(0.70 0.13 145);
    --chart-2: oklch(0.72 0.13 75);
    --chart-3: oklch(0.62 0.14 220);
    --chart-4: oklch(0.65 0.14 310);
    --chart-5: oklch(0.60 0.15 25);
    --sidebar: oklch(0.10 0.028 145);
    --sidebar-foreground: oklch(0.84 0.025 145);
    --sidebar-primary: oklch(0.65 0.13 145);
    --sidebar-primary-foreground: oklch(0.10 0 0);
    --sidebar-accent: oklch(0.18 0.045 145);
    --sidebar-accent-foreground: oklch(0.92 0.015 145);
    --sidebar-border: oklch(0.22 0.035 145 / 0.5);
    --sidebar-ring: oklch(0.65 0.12 145);
  }

  .theme {
    --font-sans: var(--font-sans);
  }

  * {
    border-color: var(--border);
    outline-color: var(--ring);
  }

  body {
    background-color: transparent;
    color: var(--foreground);
    font-size: 14px;
    line-height: 1.6;
  }

  .font-mono, [data-numeric] {
    font-family: var(--font-mono, ui-monospace, monospace);
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  html {
    font-family: var(--font-sans), system-ui, sans-serif;
    scroll-behavior: smooth;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(185, 133, 78, 0.25);
    border-radius: 3px;
  }
  .dark ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
  }
  [data-theme="forest"] ::-webkit-scrollbar-thumb {
    background: oklch(0.7 0.008 80 / 0.5);
  }
  [data-theme="forest"].dark ::-webkit-scrollbar-thumb {
    background: oklch(0.35 0.015 145 / 0.6);
  }

  input[type="date"]::-webkit-calendar-picker-indicator {
    opacity: 0.5;
    cursor: pointer;
  }
  .dark input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.5;
  }
}
```

- [ ] **Step 2: Start the dev server and visually verify the light mode**

```bash
npm run dev
```

Open http://localhost:3000 — the login page should show cream background, espresso text, amber button. The sidebar should be espresso-colored, not green.

- [ ] **Step 3: Toggle dark mode — verify warm slate, not green**

Use the theme toggle in the header. Background should be `#252220` (dark warm brown-gray), not green-tinted.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: apply Capybara Coffee brand palette; add forest theme block"
```

---

## Task 8 — Apply Next Southerland Serif in selective spots

**Files:**
- Modify: `src/app/page.tsx` (login/landing page heading)

The decorative serif is for large, standalone moments only — the login page heading is the primary candidate.

- [ ] **Step 1: Identify the main heading on the login page**

Open `src/app/page.tsx`. Find the main product name or hero heading (the large "Operate" or welcome text).

- [ ] **Step 2: Add `font-decorative` to just that element**

Replace the heading element's font class. Example — if it currently reads:

```tsx
<h1 className="font-serif text-4xl font-bold">Operate</h1>
```

Change to:

```tsx
<h1 className="font-decorative text-4xl">Operate</h1>
```

Only apply `font-decorative` to the single hero headline. Do not apply it to any other elements. If the login page has no large standalone headline (just a logo/wordmark), skip this task.

- [ ] **Step 3: Check visually**

Reload http://localhost:3000 — the login page headline should render in Next Southerland Serif. Body text and nav remain Satoshi.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: apply Next Southerland Serif to login page hero"
```

---

## Task 9 — Admin Appearance page

**Files:**
- Create: `src/app/dashboard/admin/appearance/page.tsx`
- Create: `src/modules/admin/components/AppearanceClient.tsx`

### 9a — Client component

- [ ] **Step 1: Create `src/modules/admin/components/AppearanceClient.tsx`**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { THEMES, type AppTheme } from "@/lib/theme-config";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

interface AppearanceClientProps {
  currentTheme: AppTheme;
}

const THEME_PREVIEWS: Record<AppTheme, { bg: string; sidebar: string; accent: string; text: string }> = {
  capybara: { bg: "#F7F2E9", sidebar: "#2F2823", accent: "#B9854E", text: "#2F2823" },
  forest:   { bg: "#f5f0e8", sidebar: "#1e3520", accent: "#2d5a2d", text: "#1a2e1a" },
};

export function AppearanceClient({ currentTheme }: AppearanceClientProps) {
  const [active, setActive] = useState<AppTheme>(currentTheme);
  const [saving, setSaving] = useState(false);

  async function handleSelect(theme: AppTheme) {
    if (theme === active) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to save theme");
        return;
      }
      setActive(theme);
      toast.success("Theme updated — reload to apply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a color theme for your organization. Changes apply for all users after they reload.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((theme) => {
          const preview = THEME_PREVIEWS[theme.id];
          const isActive = active === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => void handleSelect(theme.id)}
              disabled={saving}
              className={[
                "group relative rounded-xl border-2 p-4 text-left transition-all",
                isActive
                  ? "border-primary shadow-md"
                  : "border-border hover:border-primary/50",
              ].join(" ")}
            >
              {/* Mini preview */}
              <div
                className="mb-3 h-24 w-full overflow-hidden rounded-lg"
                style={{ background: preview.bg }}
              >
                <div className="flex h-full">
                  <div
                    className="h-full w-10 flex-shrink-0"
                    style={{ background: preview.sidebar }}
                  />
                  <div className="flex-1 p-2 space-y-1.5">
                    <div
                      className="h-2 w-3/4 rounded-full opacity-30"
                      style={{ background: preview.text }}
                    />
                    <div
                      className="h-2 w-1/2 rounded-full opacity-20"
                      style={{ background: preview.text }}
                    />
                    <div
                      className="mt-2 h-5 w-16 rounded"
                      style={{ background: preview.accent }}
                    />
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                </div>
                {isActive && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="h-3 w-3" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        More themes coming soon. Custom branding will be available in a future update.
      </p>
    </div>
  );
}
```

### 9b — Server page

- [ ] **Step 2: Create `src/app/dashboard/admin/appearance/page.tsx`**

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrgTheme } from "@/lib/theme";
import { AppearanceClient } from "@/modules/admin/components/AppearanceClient";

export default async function AdminAppearancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const theme = await getOrgTheme();

  return <AppearanceClient currentTheme={theme} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/appearance/page.tsx src/modules/admin/components/AppearanceClient.tsx
git commit -m "feat: add Admin > Appearance page with theme card picker"
```

---

## Task 10 — Add Appearance tab to AdminTabNav

**Files:**
- Modify: `src/modules/admin/components/AdminTabNav.tsx`

- [ ] **Step 1: Add the Appearance tab to the TABS array**

In `AdminTabNav.tsx`, update the `TABS` constant:

```ts
const TABS = [
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Employees", href: "/dashboard/admin/employees" },
  { label: "Locations", href: "/dashboard/admin/locations" },
  { label: "Audit Logs", href: "/dashboard/admin/audit-logs" },
  { label: "HR Settings", href: "/dashboard/admin/hr-settings" },
  { label: "Appearance", href: "/dashboard/admin/appearance" },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/admin/components/AdminTabNav.tsx
git commit -m "feat: add Appearance tab to admin nav"
```

---

## Task 11 — End-to-end verification

- [ ] **Step 1: Ensure dev server is running**

```bash
npm run dev
```

- [ ] **Step 2: Light mode brand check**

Open http://localhost:3000. Confirm:
- Background is cream (`#F7F2E9`)
- Login page uses Satoshi for body text
- Any large headline uses Cabinet Grotesk (or Next Southerland Serif if applied in Task 8)
- Buttons are amber, not green

- [ ] **Step 3: Sign in and check dashboard**

Confirm:
- Sidebar is espresso (`#2F2823`), not forest green
- Active nav item highlight is amber/gold, not green
- All module pages (Reviews, Scheduling, Animals, etc.) render without errors

- [ ] **Step 4: Dark mode**

Toggle dark mode. Confirm:
- Background is `#252220` (warm slate, not green-tinted)
- Text is cream-white
- Amber accents remain visible

- [ ] **Step 5: Theme switcher**

Go to Admin → Appearance. Confirm:
- Page loads with two theme cards (Capybara Coffee active, Forest)
- Click Forest → toast says "Theme updated — reload to apply"
- Reload page — app switches to green scheme
- Go back to Appearance, click Capybara Coffee → reload → brand palette returns

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: brand theme revamp complete — ready for review"
```

---

## After verification

If the theme looks good and you want to merge:

```bash
git checkout main
git merge feature/brand-theme-revamp
```

If you want to discard:

```bash
git checkout main
git branch -D feature/brand-theme-revamp
```
