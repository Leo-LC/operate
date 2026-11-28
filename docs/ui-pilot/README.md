# Operate UI pilot: handoff

Prepared 25 October 2026 after inspecting Leo-LC/operate at `483282690757c3854d9dc0399171e9369aedf5e8`. Re-check the local checkout before work. This package contains implementation instructions, not an implemented redesign. Application source remains unchanged. Start with `START-HERE.md`.

## Why Reviews → Stats

`/reviews/stats` is a focused pilot with three main components (about 600 lines total), four real KPIs, branch/period filters, a combo chart, sorting, expandable branch trends and existing tests for metric logic. It reads the aggregated `/api/reviews/stats` response via `reviews_cache_stats`, so the ordinary screen does not need live GBP imports.

Finance currently redirects to recurring costs rather than offering the analysis screen shown in the approved mockup. Reports/Direction introduce more financial logic; the employee list includes sensitive records and editing workflows. Reviews Stats exercises the design patterns with less risk. It validates a representative screen, not every workflow in the app.

## Setup

1. Copy this folder's contents into `docs/ui-pilot/` in your local Operate repository. Keep the approved image there. Do not overwrite the existing root AGENTS.md.
2. Install the focused upstream skills below, from the repository root. The current skills CLI requires Node 22.20+; this is a tooling requirement, not permission to change the app's runtime or dependencies. Inspect installed changes and record the generated skill lockfile. These commands use current upstream versions, not audited frozen versions.

```bash
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a opencode
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a opencode
npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns -a opencode
npx skills add anthropics/skills --skill frontend-design -a opencode
npx skills add anthropics/skills --skill webapp-testing -a opencode
npx skills list
```

| Skill / rule source | Purpose | Important constraint |
| --- | --- | --- |
| vercel-react-best-practices | Fetching, bundle size, render performance and sensible React code | Apply only rules compatible with Next14/React18; no automatic framework upgrade |
| web-design-guidelines | Accessibility, forms, focus, readable UI and interaction review | Review the changed pilot files and fetch its linked current guideline source |
| vercel-composition-patterns | Maintainable component APIs and explicit variants | Skip its React19 section; do not build a large component framework |
| frontend-design | Visual hierarchy, spacing, typography and polished frontend implementation | Follow the approved contract exactly; no new palette, font, hero or creative direction |
| webapp-testing | Real browser checks, screenshots and regressions | Requires a working Playwright/browser setup; a skill alone does not supply tools or authentication |
| Existing AGENTS.md + DESIGN-CONTRACT.md | Project conventions, approved appearance, tokens, CSS scope and clean-code boundaries | Explicit project requirements override generic creative guidance |

These five skills plus the project contract are the starting set. Avoid installing overlapping generic clean-code/UX packs. Use frontend-design to implement and critique the approved direction, not to invent another aesthetic. Database/security/performance specialist skills can be added for later backend work; they are not permission to broaden this UI pilot.

## Models

My coding choice among the currently listed NVIDIA free endpoints is **Z.ai GLM-5.3**, API model id `z-ai/glm-5.3`. It supports reasoning/tool use and text input, not screenshots. This is a task-specific recommendation, not a measured ranking of all models. Endpoint availability and your account quota still need a real request test.

For screenshot critique, a currently listed multimodal option is **NVIDIA Nemotron 3.5 Super VL**, API id `nvidia/nemotron-3.5-super-vl-120b-a12b` (early access). Use only if your OpenCode provider configuration supports image input and tool calling correctly. Verify an image can actually be read; do not assume a text answer proves it saw the screenshot. A browser agent can also inspect the page when properly configured.

I cannot see your machine's OpenCode connection. Run:

```bash
opencode models --refresh
```

Select the exact configured provider/model identifier corresponding to the API id; the provider prefix is configuration-dependent. Do not blindly assume `nvidia/` is its prefix. Ask the selected model to read AGENTS.md with a tool and summarize one concrete repo convention before starting. A listed model is not proof of working credentials or unlimited free usage. Never paste auth.json or API keys into chat.

## Launch

In OpenCode, select the coding model and paste:

> Read `docs/ui-pilot/IMPLEMENTATION-PROMPT.md` and `docs/ui-pilot/DESIGN-CONTRACT.md`. Implement the complete scoped Reviews Stats pilot now, following the existing AGENTS.md and installed relevant skills. Use `docs/ui-pilot/approved-reference.png` only if your model supports images. Continue through implementation, checks and honest reporting of any blocked validation. Do not deploy or start the global rollout.

Use **one implementer, then an independent reviewer** with REVIEW-PROMPT.md. The reviewer should have vision/browser support for visual sign-off. They need not be simultaneous editing agents; one small module does not benefit from competing edits. If using the same model, start a fresh review context with the diff and requirements.

## Success and rollout

Success means correct real data and permissions, readable responsive light/dark layouts, no sibling-route regressions, passing relevant checks, real browser screenshots, and evidence that requests/bundle size have not regressed. Missing credentials or browser access must be reported as pending verification.

After you use and approve the pilot: extract its proven semantic tokens into globals/Tailwind; formalize typography, spacing, density, panels and interactive states; migrate the shared shell; then migrate modules incrementally with regression checks. Avoid a blanket CSS rewrite before the pilot teaches us what works.

## Primary sources checked

- https://build.nvidia.com/z-ai/glm-5-3
- https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b
- https://opencode.ai/docs/cli/
- https://opencode.ai/docs/skills/
- https://github.com/vercel-labs/skills
- https://github.com/vercel-labs/agent-skills
- https://github.com/anthropics/skills/tree/main/skills/webapp-testing
