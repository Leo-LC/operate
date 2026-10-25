# Independent pilot review

Review the branch against `docs/ui-pilot/IMPLEMENTATION-PROMPT.md`, DESIGN-CONTRACT.md, the approved reference, repository AGENTS instructions and installed web-design-guidelines / React performance skills. Inspect the actual diff and running screen. Do not accept the implementer's claims without evidence. Review first without editing; return prioritized findings with file/line references and concrete fixes.

Check:
1. Information organization and readability, not only colors: compact title/pills, real breadcrumb, 2×2 KPIs + dominant chart, branch table + star distribution. Is the result recognizably the approved direction? Inspect both modes and 390/768/1024/1440 widths. If you cannot see images/browser, state visual review is blocked.
2. Data correctness and retained features: four KPIs, periods, branches, null/zero cases, comparisons, dual axes/units, sorting, expansion and distributions. No invented values, invented dates or changed business logic.
3. Keyboard/touch accessibility, contrast, focus, table semantics, aria-sort/expanded, filter labels, clipped values, loading and error announcements.
4. Request races, stable branch options, no misleading stale filter results, empty/error/retry/sync behavior. Sync and visibility mutation tests must use isolation; do not mutate production data.
5. No global style leakage, unchanged default shared variants, unchanged sibling routes, unchanged role visibility and server guards. Compatible with React18/Next14 and both existing company themes.
6. No extra fetch per card, live imports during screen loading, bundle bloat, unnecessary client boundaries, decorative dependencies, blanket memoization or new test/build suppressions.
7. Independent test/type/lint/build results and comparable before/after performance evidence. Existing build ignores some errors: inspect standalone checks. Mark untested criteria pending.

Return: blockers, important fixes, optional refinements and a pass/pending/fail matrix. A polished screenshot with incorrect data is a failure. Do not approve global rollout; that is the user's decision after trying the pilot.
