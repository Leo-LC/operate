# Foundation candidates from the Reviews Stats pilot

Status: **inventory only — nothing here is a global default yet.**
Source: `src/app/(dashboard)/reviews/stats/reviews-stats.css` and the pilot
components on `ui/reviews-stats-pilot`. The tokens below are scoped under
`.revstats` / `.revstats-header` and are imported by the Stats page only.

Use this list to decide what is worth promoting after the real screen is
approved. Do not copy the whole file into `globals.css`.

## Candidate tokens

The pilot keeps one emerald accent family and a neutral surface/text ramp. The
dark values live under `.dark`, so both company themes (`capybara`, `forest`)
share the same pilot palette. The pilot deliberately does not consume
`--company-accent`.

### Surfaces and boundaries

| Pilot token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--rs-canvas` | `#f7f6f2` | `#16181a` | Warm off-white / graphite page field |
| `--rs-panel` | `#ffffff` | `#1d2022` | Card and panel surface |
| `--rs-panel-2` | `#f4f2ec` | `#24282a` | Expanded row / quiet inset |
| `--rs-border` | `#e2ded4` | `#2e3335` | Default 1px boundary |
| `--rs-border-strong` | `#c9c2b4` | `#414a4c` | Tooltip, loading pill |
| `--rs-control-border` | `#7d8a82` | `#66736c` | Pill and sync control outline |
| `--rs-row-hover` | `#f2f5f2` | `#222726` | Table row hover / open |
| `--rs-veil` | `rgba(255,255,255,.62)` | `rgba(29,32,34,.62)` | Refresh overlay |
| `--rs-skeleton` | `#ece9e2` | `#2a3033` | Loading blocks |

### Text

| Pilot token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--rs-fg` | `#191d1b` | `#eef1ef` | Primary values, titles |
| `--rs-fg-2` | `#454f49` | `#c3ccc7` | Secondary labels, nav links |
| `--rs-fg-3` | `#5f6b64` | `#9aa6a0` | Captions, axes, hints |
| `--rs-fg-4` | `#7a857e` | `#7f8a85` | Quiet separators, scroll hint |

### Accent and status

| Pilot token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--rs-accent` | `#2c6f4c` | `#2f7a52` | Active pill, focus outline, bars |
| `--rs-accent-text` | `#24624a` | `#7fc7a1` | Accent text on light surfaces |
| `--rs-accent-soft` | `#e9f2ec` | `#1c2b23` | Pressed/inactive accent fill |
| `--rs-positive` | `#1f6b45` | `#7fc7a1` | Improvement / increase |
| `--rs-negative` | `#a63b30` | `#f0938a` | Real decline / error |
| `--rs-negative-soft` | `#fbebe8` | `#2a1513` | Error banner background |
| `--rs-warn` | `#8a5a17` | `#e3b06a` | 3★ bar, caution callout dot |
| `--rs-warn-soft` | `#fbf3e4` | `#2a2114` | Caution callout background |
| `--rs-bar` | `#2c6f4c` | `#3f9268` | Review volume / distribution fill |
| `--rs-bar-track` | `#e9e6df` | `#2a3033` | Bar track |
| `--rs-neutral-mark` | `#55605a` | `#aab5af` | Average-rating line and dots |
| `--rs-focus` | `rgba(44,111,76,.42)` | `rgba(127,199,161,.45)` | 3px focus ring |

### Shape

| Pilot token | Value | Notes |
| --- | --- | --- |
| `--rs-radius` | `10px` | Panels and KPI cards |
| `--rs-radius-sm` | `6px` | Tooltips, callouts, banners |
| `--rs-shadow` | `0 1px 2px …` | Resting panel shadow |
| `--rs-shadow-2` | `0 10px 24px -14px …` | Tooltip elevation |

Before promotion, rename to the app's semantic convention and diff against the
existing `--bg`, `--panel`, `--fg`, `--line`, `--good`, `--bad` tokens. Several
values are close to existing tokens; prefer mapping over adding a parallel
scale. Keep the warm light canvas and the graphite dark surface as a deliberate
pair, not as an automatic inversion.

## Candidate primitives

| Pilot piece | Where | Promote? | Why |
| --- | --- | --- | --- |
| `ModuleTabs variant="pills"` | `src/components/ui/module-tabs.tsx` | Yes, after audit | Opt-in variant; default underline is untouched. Needs a generic class prefix instead of `rs-`. |
| Pill link + active/dimmed behavior | `.rs-pillnav-*` | Yes | Active tab keeps full contrast even when the tab is hidden from other roles; the eye-off control carries the dimmed state. |
| Pill filter button | `.rs-pill` on `PillButton` | Yes | One control style for period/branch filters; default `PillButton` stays unchanged. |
| `ShopMultiSelect` styling hooks | `src/components/ui/filters/ShopMultiSelect.tsx` | Yes, after audit | Optional `className` / `pillClassName` only; default filter styling and behavior are untouched. |
| Panel shell | `.rs-panel`, `.rs-panel-head`, `.rs-panel-body`, `.rs-panel-foot` | Yes | Repeats across dashboard modules; head/foot rhythm is the useful part. |
| KPI anatomy | `.rs-kpi`, `.rs-kpi-label/value/unit/note` | Yes | Label → value → comparison → explanation. No decorative icon required. |
| Comparison formatter | `src/modules/reviews/lib/stats-view.ts` | Yes, presentation only | `countComparison`, `ratingComparison`, `sharePointComparison` return a short `text` plus a full `detail`, direction and tone. Tiny baselines/extreme percentages switch to an absolute count (`+280 · was 6`); ratings use two decimals. Rating comparisons also carry an optional `note` with the unrounded inputs when independent rounding could make the delta look inconsistent. Consider a shared `Comparison` type. |
| Sortable table shell | `.rs-table*`, `aria-sort` header buttons | Yes | Keyboard-accessible sort buttons, tabular numbers, row expansion, sticky first column. Column widths and `min-width` stay module-local. |
| Compact multi-select disclosure | `ReviewsBranchFilter.tsx` + `.rs-branch-*` | Yes, after audit | Desktop pills collapse to one “All branches” / “N selected” control below 1280 px; Escape/outside-click/Done. Generalize the breakpoint and label rules. |
| Distribution bars | `.rs-dist*` | Maybe | Useful for any 1–5 or share breakdown; the 5★→1★ order and semantic star colors are Reviews-specific. |
| Caution callout | `.rs-callout` | Maybe | Reusable warning surface, but only if another module needs the same quiet amber treatment. |
| Refresh veil + skeleton | `.rs-veil`, `.rs-loading-pill`, `.rs-skeleton` | Yes | Preserves the last good result while naming the new scope; reduced-motion safe. |
| Error banner + Retry | `.rs-banner` | Yes | Inline, labelled, keeps cached data visible, preserves filters. |
| Status bar | `.rs-statusbar` | Maybe | The `Updated HH:MM` + sync hint pattern is useful for cached dashboards; keep the copy short. |
| Scroll affordances | `.rs-scroll-hint`, sticky first column | Maybe | Good mobile behavior; implement with a shared hook if promoted so the hint only appears when the region actually scrolls. |

## Deliberately pilot-local

- The 40/60 top split and 70/30 bottom split (`2fr/3fr`, `1fr/300px`). These
  depend on the Reviews content and should be re-evaluated per module.
- The 2×2 KPI grid. It is a layout decision for four KPIs, not a universal grid.
- The phone-only KPI compaction (`max-width: 767px`): 13 px/14 px card padding,
  10 px card gap, 28 px value and 11.5 px notes. Re-evaluate per module and
  breakpoint before promoting.
- `min-width: 680px` on the branch table and the decision to let only that
  region scroll horizontally. The column set is Reviews-specific.
- The `.revstats .sr-only { left: 0 }` guard. It works around absolutely
  positioned Tailwind `sr-only` boxes escaping the table scroller; do not
  globalize it without understanding every scroll container.
- The compact branch disclosure breakpoint (1280 px) and table hint. They fit
  this filter density; promote them only with a measured scroll-state hook.
- The emerald bar + neutral line pairing. It encodes Reviews volume vs rating;
  other modules may need different series semantics.
- The `1–3★` terminology, star colors and "lower is better" callout.
- The existing global shell, sidebar blue active state and grain overlay. The
  pilot intentionally leaves them unchanged.

## Open questions before a global pass

1. Token naming: map `--rs-*` onto the existing semantic tokens or introduce a
   new layer? Avoid a third parallel scale.
2. Theme coverage: verify `capybara` and `forest` with real theme switching, not
   only the default organization theme.
3. Active pill contrast: the pilot keeps the active tab at full opacity when it
   is dimmed for other roles. Confirm this is the desired visibility signal
   across modules that use the eye toggle.
4. Table density: the pilot now shows the comparison period once in the table
   header and keeps the full sentence in tooltips/SR text. Confirm this pattern
   for other dense tables before promoting it.
5. Extreme deltas: resolved in round 2 — a prior window under 20 reviews (or a
   change over 300%) switches to an absolute count (`+280 · was 6`). Decide
   whether that threshold should be shared across modules.
6. Screenshot/visual regression tooling: the pilot used a temporary Playwright
   setup outside the repo. A permanent visual check needs an owned fixture and
   a safe auth path.
