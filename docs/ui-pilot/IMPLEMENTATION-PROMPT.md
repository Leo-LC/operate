# Operate: implement the Reviews Stats design pilot

You are implementing a production-quality UI pilot in the existing Operate repository. Execute the work, inspect the running result, and iterate until the acceptance criteria pass. Do not stop at a plan or an attractive static mockup.

Read `AGENTS.md` and every applicable scoped instruction first. Read `docs/ui-pilot/README.md`, `docs/ui-pilot/DESIGN-CONTRACT.md`, and the approved reference `docs/ui-pilot/approved-reference.png`. If image input is unavailable, use the written design contract; explicitly report that visual comparison needs a vision-capable reviewer. Use the installed skills when relevant. The approved design and repository conventions take precedence over generic creative suggestions. Do not invent a new aesthetic.

## Objective and boundary

Rework **Reviews → Stats**, route `/reviews/stats`, into a readable, polished dashboard in light and dark mode. This is the first real implementation of an approved visual direction. The Finance reference provides layout and styling, not Finance features or data. Keep real Reviews data and interactions.

Work on the dedicated branch `ui/reviews-stats-pilot` (reuse it if already checked out); inspect git status first and preserve existing changes. Do not deploy, merge, push, or migrate a database. Keep the current dependency versions: Next.js 14, React 18, Tailwind 3, Recharts 3. Do not follow React 19 / Next 15+ APIs from generic skills. Do not add a UI kit, chart library, font, state framework, or broad dependency upgrade.

Primary implementation files:
- `src/modules/reviews/components/stats/ReviewsStatsClient.tsx`
- `src/modules/reviews/components/stats/ReviewsStatsTrend.tsx`
- `src/modules/reviews/components/stats/ReviewsStatsTable.tsx`

Read, and normally preserve:
- `src/modules/reviews/lib/stats.ts` and its tests (metric contract)
- `src/app/api/reviews/stats/route.ts` (existing stats endpoint/RPC)
- `src/app/(dashboard)/reviews/stats/page.tsx` (authentication and visibility guard)
- `src/app/(dashboard)/reviews/layout.tsx`
- `src/modules/reviews/components/ReviewsTabNav.tsx`
- `src/components/ui/{stat,card,module-tabs,pill-button}.tsx` and filters
- `src/app/globals.css`, `tailwind.config.ts`, and current theme providers

Keep backend/API/RPC contracts, business logic, permissions, sync behavior, and existing routes intact. Ordinary Stats viewing must continue reading the aggregated stats endpoint, not trigger live imports. Do not redesign the sidebar or global shell in this pilot. Do not touch Finance, Reports, Direction or Employees.

## Work sequence

1. Establish a baseline: current screenshots, route behavior, requests and response shape, existing test/type/lint/build results. Distinguish pre-existing failures from regressions. Never print secrets. If authenticated local testing is unavailable, report the exact blocker; do not bypass auth or add a production mock mode.
2. Briefly outline the component/layout changes and implement them. Keep scope tight. Reuse existing primitives; where inline styles prevent the approved design, add a small explicit opt-in variant with unchanged defaults. Prefer module-local composition and styles. Avoid duplicate universal components or a new design-system abstraction.
3. Add scoped semantic CSS variables for pilot surfaces, text, borders, accent, positive/warning/error and spacing. Reuse existing tokens when they fit. Document candidate tokens for later extraction; do not rewrite global defaults or use broad selectors to force the whole app into the pilot aesthetic. Respect the existing `.dark` mechanism and both company themes. No flash or hydration mismatch.
4. Implement the exact information hierarchy in DESIGN-CONTRACT.md. Keep the existing global topbar and theme toggle. For pill module navigation, permit only minimal changes to ReviewsTabNav / Reviews layout, gated to `/reviews/stats`; keep other Reviews routes' presentation and all role/eye-toggle behavior unchanged. If a shared ModuleTabs variant is needed, preserve its existing default. Use real navigation links with active-page semantics; do not create a second decorative tab bar.
5. Handle loading, background refresh, errors, empty results and long labels deliberately. Use AbortController or an equally robust cancellation strategy to prevent obsolete filter responses winning. Keep filter options stable so selecting a branch does not remove other options. Solve that locally without changing endpoint contracts; do not fetch the full dataset on every selection. Explain any unavoidable limitation. Never show stale data as if it belongs to newly selected filters: preserve the previous filter label while showing a loading overlay, or replace with a correctly labelled loading state. A failed sync must be visible and keep current data. A retry must preserve filter selection. Use actual endpoint results; no invented trends, timestamps, totals or placeholder finance data.
6. Verify in browser, fix issues and perform the independent review prompt. Do not declare completion based only on compilation.

## Data and behavior that must survive

- Existing 7d / 30d / 90d / 12m presets, default 30d, branch multiselect, and empty selection meaning all shops.
- Current GBP location keys and shop titles. Keep role-dependent Reviews navigation and persisted Stats visibility; do not change access policy.
- Four KPIs: review count, average rating, public reply rate, and 1–3 star share. Use current/prior windows and existing null/zero handling. Label rating `/5`, percentages as percentages, and any percentage-point difference as `pp`. An improvement in low-star share is a decrease. Do not invent a reply-rate comparison unavailable in the API.
- Overall trend and per-shop expandable trends. Count and average rating have different units: preserve two clearly labelled axes, rating scale 1–5, an unambiguous legend and null ratings for empty buckets. Do not aggregate ratings by averaging branch averages. Keep bucket granularity from existing logic.
- Per-shop sorting, all existing useful columns, review distribution and expand/collapse. Use explicit keyboard-accessible controls, `aria-sort` and `aria-expanded` as applicable. Do not replace numeric comparison with avatar cards.
- Explicit Sync now POST and subsequent stats refresh. Never run production sync or change tab visibility automatically during testing. Mock mutation responses in isolated tests if needed; preserve the real handlers.

## Performance and maintainability

No additional API call per KPI/chart/card; derive the star-distribution panel from the same response. Avoid request waterfalls, duplicate requests, excessive client boundaries and loading all expanded charts up front. Add memoization only for a measured/obvious costly calculation. Preserve useful content during refresh where labels stay honest. Do not add artificial animation delays, heavy backdrop filters or gratuitous motion. Respect reduced motion.

Use readable typed components, named domain concepts and `cn()` per repository conventions. Keep server-only credentials on the server. No `any`, lint suppressions or new build-error bypasses to make checks pass. Existing next.config build bypasses mean a successful build is not a substitute for standalone typecheck/lint. Keep changes understandable and reversible.

## Acceptance criteria

- Approved hierarchy and restrained emerald/neutral palette; no blue/purple accent, rainbow widgets, giant title or big subtitle. Light mode is equally designed, not a simple inversion.
- Desktop has 2×2 KPI cards left and dominant chart right, then wide branch table left and compact star distribution right. Mobile stacks in a sensible order. No horizontal page overflow at 390, 768, 1024 and 1440 CSS pixels; a clearly contained table scroller is acceptable. Test long branch titles.
- Text and meaningful controls meet WCAG AA contrast (4.5:1 normal text, 3:1 large text / UI boundaries as applicable); readable secondary text, visible focus, labelled controls, keyboard operation and touch-friendly targets. Status is never conveyed by color alone.
- Correct figures under all presets, all branches and a subset, including no current reviews, no prior baseline, null ratings, slow responses and errors. Rapid filter switching cannot overwrite current results with old results. Shared navigation/permissions remain intact.
- Capture real rendered screenshots at desktop and mobile in both modes, plus a tablet check. Inspect them yourself if vision is available, otherwise request a vision review and mark it pending. Do not alter screenshots or use generated images as evidence of implementation.
- Run `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` with appropriate local environment. Add meaningful focused tests for changed behavior (e.g. filter races or error retry), not assertions that merely mirror markup. Report every failure and blocker accurately.
- Compare before/after network requests and route bundle size using the same setup. Record a repeatable cold/warm load sample if browser access permits; do not claim speed improvements without comparable measurements. No regression or added heavy dependency without clear evidence and justification.
- Smoke-check Reviews Inbox/Templates/Locations for visual leakage and role-dependent nav behavior. Use existing test accounts or isolated fixtures; never weaken auth.

## Deliverables

Working pilot code on the branch; screenshots; a concise change/validation report with exact commands, results, blockers and changed files; and `docs/ui-pilot/FOUNDATION-CANDIDATES.md` recording the local tokens/primitives worth extracting later. Identify what is deliberately pilot-local. Separate functional correctness, visual review and performance evidence. If any acceptance criterion cannot be verified, mark it pending, not passed.

Finish this pilot. Do not begin the site-wide rollout. The user will judge the real screen before global tokens, CSS rules, navigation and remaining modules are rebuilt.
