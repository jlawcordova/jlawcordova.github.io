# Plan: Retire legacy pixel art (from intent.md 2026-10-05)

Status: draft, with the intent and [`spec.md`](spec.md) in [#99](https://github.com/jlawcordova/jlawcordova.github.io/pull/99). The owner approves all three by merging it (spec C1).

## Files that change

- **Engine and tools:** `src/assets/pixel-art/source/palette.mjs`, `src/lib/pixel-art/engine.mjs`, `src/lib/pixel-art/serialize.mjs`, `src/lib/pixel-art/starter.mjs`, `scripts/optimize-pixel-art.mjs`, `scripts/import-pixel-art.mjs` (deleted).
- **Node tests:** `scripts/pixel-art-engine.test.mjs`, `scripts/pixel-art-cli.test.mjs`, `scripts/pixel-art-island.test.mjs`, `scripts/range-art.test.mjs`, `scripts/range-classes.test.mjs`, `scripts/achievement-icons.test.mjs`.
- **Lab:** `src/components/lab/Library.astro`, `lab.ts`, `object-mode.ts`, `palette-panel.ts`, `dialogs.ts`, `src/styles/lab.css`, and `scripts/e2e/editor.e2e.mjs`.
- **Docs:** `README.md`, `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/achievement-icon/SKILL.md`, `.claude/agents/pixel-artist.md`, and this change's `intent.md`, `spec.md` and `plan.md`.
- **Not touched:** every art source under `src/assets/pixel-art/source/objects/` and `scenes/`, every compiled `src/assets/pixel-art/*.svg`, and every earlier change under `docs/intents/`.

## Order of work

One slice, straight to `main` on PR #99's branch, `docs/intent-retire-legacy`: the main session does it in one sitting, and the intent PR already exists, so there is no `feat/retire-legacy-art` branch (spec C1).

```
main ── docs/intent-retire-legacy (PR #99: intent, spec, plan, code) ── owner merges ──▶ main
```

1. **Spec and plan.** Commit `spec.md` and `plan.md` next to the intent.
2. **Engine, palette and tools.** Remove the legacy tier from `palette.mjs`, `engine.mjs`, `serialize.mjs` and `starter.mjs`. Update both `starterExtends` callers (`optimize-pixel-art.mjs` and `lab/dialogs.ts`, so `astro check` passes), fix the optimizer's tier comment, and delete `import-pixel-art.mjs`. Update the node tests in the same commit, so `npm test` passes at every commit. That covers the rewrites, the removals and the two new tests in spec "Tests". Run `npm run art` and confirm no SVG changes.
3. **Lab.** Remove the legacy parts from `Library.astro`, `lab.ts`, `object-mode.ts`, `palette-panel.ts` and `lab.css`, and drop `palette.legacy` from the e2e swatch helper.
4. **Docs.** Update the README, the two skills and the agent (spec "Docs").
5. **Verification record.** Run the proof below, take the lab screenshots, set the plan's status to built, and paste the output into the PR.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 1–5 | Main session | `docs/intent-retire-legacy` | Push, update the PR body, mark #99 ready |
| Verify | Fresh session, `verify-change` on #99 | Read-only | Comments on #99; blocking findings are fixed on the branch |
| Merge | Owner | GitHub | Merges #99 to `main` (an agent can't) |

- **Owner reviews:** none during the work. Nothing visible changes, so no look needs the owner's eye. The owner reviews the whole PR before merging.
- **Independent review:** `verify-change` on #99 once it's ready, as the intent asks for on every PR (spec C4). It runs after this plan's last step, from a fresh session.
- **Stop and report** if `npm run art` would rewrite any SVG, or if any art source turns out to use legacy (R1, R10).

## Risks

- **Step 2 is the riskiest.** It changes the engine shared by `npm run art`, the lab and every test. A missed `legacy` reference would show up as a type error in `astro check` (`resolved.legacy` no longer exists on `Resolved`) or as a failing test. Both run before the PR is ready.
- **Compiled art drifts.** The engine's render path doesn't read tiers, so the SVGs shouldn't change. `npm run art` plus an empty `git diff -- '*.svg'` proves it (R10).
- **Lost coverage.** The removed tests guarded legacy rules that no longer exist. The new repo-wide test keeps the one guarantee that still matters, no legacy anywhere, and the caps tests now run on every object.
- **Lab regressions.** The palette panel's grouping and meter change. The editor e2e suite covers the meter (`Colors used: N of 12`, the warning at 9, the cap at 12) and the swatches.

## Proof

- `npm run art`: every file `lossless`, none `OVER BUDGET`; `git diff --stat -- 'src/assets/pixel-art/*.svg'` is empty.
- `npm test`: `# fail 0`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run e2e`: `# fail 0` (or "NOT RUN", reported as not verified).
- `git grep -n -i legacy -- . ':!docs/intents'`: no matches, or only history notes.
- Screenshots of `/lab/pixel-art/` with an object open, at 1440px and 390px, showing the Library and Palette panels and no horizontal scroll.
