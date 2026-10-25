# Handoff — Reviews Stats pilot checkpoint

Checkpoint: **`e6e59c3`** — `Reviews Stats UI pilot: accepted visual baseline`
Branch: **`ui/reviews-stats-pilot`**
Parent: `4832826` (Loyverse per-typed-price breakdown)
Scope of this checkpoint: `/reviews/stats` only. Local commit; **not pushed, merged, deployed or migrated.**

The visual direction is accepted as the baseline for the UI rollout. The rollout itself has
**not** started. `docs/ui-pilot/ROLLOUT.md` defines the next phase and module order.

> `REPORT.md` still contains the line "working tree, **not committed**". That sentence
> describes the state before this checkpoint; `e6e59c3` is the committed record.

## Accepted decisions

1. The current Reviews Stats screen is the visual baseline: compact title + pill module
   nav, 2×2 KPI block beside a dominant dual-axis trend chart, sortable branch table,
   rating distribution, one pill filter row.
2. Restraint over decoration: no icon badges, no explanatory hero, no second global tab
   bar, no duplicated filter summaries. One comparison label per table, full sentence in
   tooltip/SR text.
3. Honest numbers: ratings use two decimals from unrounded values (`4.78` vs `4.81`, delta
   `0.02` with a precision note); tiny baselines or extreme changes switch to absolute
   counts (`+280 · was 6`).
4. Phone density: below 768 px the KPI block compacts (13/14 px padding, 10 px gap,
   28 px value) while keeping the 2×2 layout and every label.
5. Shared UI changes stay opt-in: `ModuleTabs variant="pills"` and optional
   `ShopMultiSelect` class hooks; default variants are unchanged.
6. Nothing is promoted to global defaults. `--rs-*` tokens and `.revstats` rules are
   route-local and imported by the Stats page only.
7. Real data and existing contracts are preserved: no API route, RPC, metric,
   permission, sync handler or dependency changed.
8. Next phase is additive foundation extraction plus an optional green/orange user accent
   preference — not a global restyle. See `ROLLOUT.md`.

## Accepted files

Committed in `e6e59c3` (35 files):

| Area | File |
| --- | --- |
| Page | `src/app/(dashboard)/reviews/stats/page.tsx` |
| Route CSS | `src/app/(dashboard)/reviews/stats/reviews-stats.css` |
| Header/nav | `src/modules/reviews/components/ReviewsTabNav.tsx` |
| Orchestrator | `src/modules/reviews/components/stats/ReviewsStatsClient.tsx` |
| Chart | `src/modules/reviews/components/stats/ReviewsStatsTrend.tsx` |
| Table | `src/modules/reviews/components/stats/ReviewsStatsTable.tsx` |
| Branch filter | `src/modules/reviews/components/stats/ReviewsBranchFilter.tsx` |
| Distribution | `src/modules/reviews/components/stats/ReviewsStatsDistribution.tsx` |
| Helpers + tests | `src/modules/reviews/lib/stats-view.ts`, `stats-view.test.ts` |
| Shared UI (opt-in) | `src/components/ui/module-tabs.tsx`, `src/components/ui/filters/ShopMultiSelect.tsx` |
| Evidence | `docs/ui-pilot/` — contract, report, candidates, screenshots, capture JSON |

## Verification (checkpoint state)

| Command | Result |
| --- | --- |
| `npm run test` | 248 passed / 37 files (baseline 223 / 36; +25 helper tests) |
| `npx tsc --noEmit` | Clean, exit 0 |
| `npm run lint` | 20 errors / 3 warnings, all pre-existing; 0 findings in changed files |
| `npm run build` | Exit 0; `/reviews/stats` 9.6 kB / 217 kB first load |
| Playwright interaction | 103/103 checks (4 widths, light/dark, filters, sorting, sticky column, precision) |
| Nav/theme checks | 12/12 |
| Overflow capture | 8/8 width × theme combinations; no page overflow |
| Screenshots | 390/768/1024/1440, light + dark, plus filter, table-scroll and expanded states |

Full detail, including the pre-existing failures and performance sample, is in
`REPORT.md`.

## Outstanding checks

These were not verified at the checkpoint and must be covered before or during the
rollout:

1. **Staff-role runtime** — only the preview owner account was available. Role/visibility
   code is unchanged, but a staff session was not exercised.
2. **Real Google review sync** — the sync POST was mocked. No live provider call.
3. **Real organization theme switch** — `forest` was verified through computed styles, not
   by switching a real organization's `app_settings.theme`.
4. **Physical touch devices** — Playwright emulation only; no real phone/tablet.
5. **Full automated WCAG AA sweep** — focus, keyboard and sampled contrast passed; no
   complete audit.
6. **Permanent visual regression tooling** — the pilot used a temporary Playwright setup
   outside the repo.

## Local startup and sign-in (no secrets in this repo)

1. `npm install`
2. `.env.local` must already contain the existing keys (values are not recorded here):
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_PREVIEW_MODE`, `PREVIEW_AUTH_PASSWORD`, and for Google sign-in
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `ALLOWED_GOOGLE_EMAILS` (or
   `ALLOWED_GOOGLE_DOMAIN`). Never print or commit these values.
3. `npm run dev`
4. Open `http://localhost:3000`, sign in through the existing login card. In preview mode
   the password is the local `PREVIEW_AUTH_PASSWORD`; read it from `.env.local` if needed.
   Google sign-in requires the allow-listed account.
5. Stats screen: `http://localhost:3000/reviews/stats`.

Preview login is for local verification only. Do not bypass auth, add a production mock
mode or expose the service-role key to the browser.

## Unrelated working-tree changes to preserve

Do not stage, revert or delete these unless the user explicitly asks:

- Deleted: `docs/operate-os-redesign-plan.md`
- Deleted: `docs/superpowers/plans/2026-05-14-brand-theme-revamp.md`
- Deleted: `docs/superpowers/plans/2026-05-21-wiki-thai-taxes-redesign.md`
- Deleted: `docs/superpowers/plans/2026-08-23-loyverse-integration.md`
- Deleted: `docs/superpowers/specs/2026-05-14-brand-theme-revamp-design.md`
- Deleted: `docs/superpowers/specs/2026-05-21-wiki-thai-taxes-redesign.md`
- Untracked: `.agents/`
- Untracked: `operate-ui-pilot-repo-files.zip`
- Untracked: `skills-lock.json`

The pilot commit and this handoff commit must stay separate from those changes. Do not
amend `e6e59c3`; add new commits.

## Next task and boundaries

**Next task:** read `ROLLOUT.md` and implement its Phase 0 (foundation extraction plus the
optional accent preference) only after the user confirms the plan.

In scope:

- Extract the proven semantic tokens and primitives from the pilot, additively.
- Add a localStorage-backed green/orange accent override that composes with light/dark and
  the existing company themes.
- Keep `reviews/stats` visually identical to the accepted checkpoint.
- Keep success/warning/error colors independent of the accent.

Out of scope:

- Migrating another module (Phase 1+), unless separately requested.
- Changing global defaults so existing modules restyle silently.
- Database migrations, new dependencies, multi-tenant work or feature changes.
- Push, merge, deploy.

## Reading order for the next session

1. `docs/ui-pilot/HANDOFF.md` (this file)
2. `docs/ui-pilot/ROLLOUT.md` — module order, status, accent design, acceptance gates
3. `docs/ui-pilot/REPORT.md` — evidence, pre-existing issues, pending checks
4. `docs/ui-pilot/FOUNDATION-CANDIDATES.md` — token/primitive shortlist and open questions
5. `docs/ui-pilot/DESIGN-CONTRACT.md` — accepted visual rules
