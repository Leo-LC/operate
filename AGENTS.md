# AGENTS.md

## Project

Nexus Hub — an internal operations system. A Next.js 14 App Router app.

Modules: reviews, accounting, payments, scheduling, attendance, animals, contacts,
documents, wiki, brand, admin, reports, treasury, finance, customer insights,
challenges, and a Loyverse sandbox.

Do not over-engineer, add multi-tenant support, or expand scope without being asked.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run test` — vitest
- `npx tsc --noEmit` — typecheck

## Architecture

- `src/app/(dashboard)/<module>/` — route group per feature (pages). The `(dashboard)`
  is a Next.js route group: parentheses group routes without adding a URL segment.
- `src/app/api/<module>/` — route handlers per feature
- `src/modules/<module>/` — feature code, colocated: `components/`, `lib/`, `types.ts`,
  `config.ts`
- `src/components/ui/` — shared primitives (button, card, pill, drawer, …)
- `src/components/` — app-level components (shell, command palette, theme toggle)
- `src/lib/` — cross-cutting helpers (auth, supabase, theme, utils)
- `src/core/` — cross-cutting logic (permissions)
- `supabase/migrations/` — SQL migrations (run via `npx supabase`)

Conventions:

- Reuse existing primitives from `src/components/ui` — extend them rather than shipping
  parallel versions.
- Use `cn()` from `src/lib/utils.ts` for className merging.
- Tests are colocated as `*.test.ts` next to the code they test, run via vitest.
- Keep Supabase service-role access server-side only (`src/lib/supabase-server.ts`);
  never expose the service-role key to the browser.
- Server components by default; add `"use client"` only when interactivity requires it.
- Keep module logic in `src/modules/<name>/`; pages and API routes stay thin.
- Design tokens live in `src/app/globals.css` (mapped to Tailwind classes in
  `tailwind.config.ts`) — check those before writing styles.

## Scoped instructions

Subdirectories may contain their own `AGENTS.md` with rules specific to that area. Read
any such file in the directory you are working in before starting, in addition to this
one. Prefer keeping these files short and pointing at the source of truth rather than
duplicating it.
