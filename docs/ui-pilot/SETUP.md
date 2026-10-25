# OpenCode setup for this pilot

Read the existing AGENTS instructions. Do not replace them. Check installed skills and avoid duplicating or overwriting existing custom skills. These are instruction packages, not app dependencies or ChatGPT plugins.

## Install five project-local skills

From the repository root, use the skills CLI, selecting OpenCode. The current CLI requires Node 22.20+; check the tooling runtime first. Do not change the app's runtime or dependency versions just to install skills. If setup is blocked, report the exact requirement and proceed only with capabilities actually available.

```bash
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a opencode
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a opencode
npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns -a opencode
npx skills add anthropics/skills --skill frontend-design -a opencode
npx skills add anthropics/skills --skill webapp-testing -a opencode
npx skills list
```

Inspect all generated changes. Preserve the skills lockfile and verify OpenCode can discover the installed skill files; restart its session if needed. Do not claim installation succeeded without checking. These commands fetch current upstream skills; review their instructions before applying them.

## How to apply them

- frontend-design: implement visual hierarchy, spacing, typography and responsive styling. The approved DESIGN-CONTRACT.md overrides creative exploration. Keep existing fonts and the restrained emerald/neutral palette. No landing-page hero, new brand, rainbow panels or decorative content.
- web-design-guidelines: review readability, navigation, keyboard/focus behavior, forms, contrast, empty/loading/error states and responsive interaction. Apply it to the actual changed files.
- vercel-react-best-practices: prevent fetch waterfalls, bundle growth and unnecessary rendering. Only apply APIs compatible with Next14/React18.
- vercel-composition-patterns: keep component APIs clear, use explicit opt-in variants and preserve defaults. Skip React19-only guidance. No speculative component framework.
- webapp-testing: verify the real running screen and capture screenshots. Confirm Playwright and an executable browser are available; use existing project tooling where possible. The skill does not itself grant browser access or authentication. Do not weaken auth or silently replace real data with mocks.

Use the existing root AGENTS.md for clean code and repo conventions, and the pilot contract for styling/tokens. No extra generic clean-code or UX pack is required for this pilot. No GitHub/Supabase MCP connection is needed to implement this frontend-only scope locally. A working local app environment and normal login are needed for full verification. Never print secrets.

## Model capability check

Before substantial work, prove the selected model can read AGENTS.md with a tool and make a concrete summary. For visual review, prove the reviewer can actually inspect an image or browser screenshot. If the implementation model is text-only, use the written contract and mark image-based validation pending until a capable reviewer checks it.

After setup, execute IMPLEMENTATION-PROMPT.md. A plan alone is not the deliverable.
