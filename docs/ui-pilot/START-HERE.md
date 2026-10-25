# Start the Operate UI pilot

This folder contains the implementation instructions, approved visual reference and design contract. The app has not been redesigned yet. The next action is for OpenCode on your computer to implement the Reviews Stats screen.

## 1. Put these files in your repository

Extract `operate-ui-pilot-repo-files.zip` into your local Operate repository root. It creates `docs/ui-pilot/` in the correct place. If you can read this file there, this step is done. Keep existing root files such as AGENTS.md unchanged.

The GitHub integration rejected writes (403), so these files have not been published to GitHub. OpenCode will create or reuse the local implementation branch, and you can commit/push the finished pilot through your normal setup later.

## 2. Open OpenCode and select your coding model

Run `opencode` from this repository. Use its model picker to select your configured NVIDIA GLM-5.3 if available. Run `opencode models --refresh` in a terminal if the list needs refreshing. Model availability and a working connection must be verified locally; never share API keys. GLM-5.3 is text-only: the detailed written design contract is supplied, but final screenshot comparison needs vision/browser support.

## 3. Paste this one instruction

```text
Read docs/ui-pilot/SETUP.md, then complete its skill/tool setup.
Read AGENTS.md and applicable scoped instructions, then read
docs/ui-pilot/IMPLEMENTATION-PROMPT.md and DESIGN-CONTRACT.md.
Implement the full Reviews Stats UI pilot on a dedicated ui/reviews-stats-pilot branch (reuse it if present).
Continue through browser checks and REVIEW-PROMPT.md, fixing findings.
Follow the approved design, preserve real data and permissions, and
report any blocked checks honestly. Do not deploy, push, merge or
start the global redesign. Give me the local URL so I can try it.
```

## 4. Try the result

Use the local URL OpenCode gives you, log in normally, and open `/reviews/stats`. Check desktop and phone layouts, light/dark mode, filters, sorting and expanding a branch. Send the screenshots, OpenCode's validation report, and your feedback back to ChatGPT for design review. Do not share credentials.

Only after you approve the working result do we extract the proven tokens/components and rebuild the global foundations. No site-wide CSS rewrite is needed to start.
