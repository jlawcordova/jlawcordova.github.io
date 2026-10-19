# Plan: The island stands on the hero's bottom edge, and sweeps in slower (from intent.md 2026-10-20)

## Files that change

- **Layout:**
  - `src/styles/hero.css`: the bottom padding as `--hero-pad-bottom`, the art column at the bottom of its row, the island's move down, and its size on phones.
  - `src/pages/lab/island-entrance.astro`: the stage clipped at its bottom edge.
- **Motion:** `src/lib/island-entrance.mjs`: the owner's `TIMING`, and the header comment.
- **Tests:**
  - `scripts/island-entrance.test.mjs`: the island's R3–R7 numbers and the pick.
  - `scripts/e2e/shell.e2e.mjs`: the settle comment's number.
- **Docs:**
  - `docs/design-system/README.md`, `.claude/skills/pixel-art-motion/SKILL.md` and the comment in `src/components/home/Hero.astro`.
  - Notes in the sweep drop spec and the level up spec's R19.
  - This change's `intent.md`, `spec.md` and `plan.md`.

## Order of work

One slice, run by the main session, straight to a PR into `main`:

```
main ◀── PR (ready; owner merges) ── feat/island-edge-sweep
           commits: intent, spec and plan; the build
```

The position was prototyped first in the worktree `.claude/worktrees/island-bottom`, with its own dev server on port 4322, and the owner tuned the timing in that worktree's entrance lab. The build commit carries both.

1. **The position.** Move the island down with a transform to cut through its lowest block, keeping the hero's height, and clip the lab's stage the same way. On phones, make the island 135% of its column, centred, and bring it up under the buttons.
2. **The pick.** Set `TIMING` to the owner's line, and update the island's schedule tests.
3. **Docs and checks.** Update the design system's Motion section, the skill, the comments and the older specs' notes. Run every check, screenshot, and open the PR with the output.

## Workflow and reviews

The main session runs all three steps on `feat/island-edge-sweep`, then opens the PR. There are no owner reviews before the PR: the owner saw the position and picked the timing on the running prototype. There is no independent review: the schedule is pure and tested, the e2e checks cover the end states, and the layout is checked by screenshot. The owner merges.

## Risks

- **The cut misses the block at some width.** The move is a share of the SVG's own height, so it scales with the art. Screenshots at 1440px and 390px check it.
- **The hero changing height.** The move is a transform, so layout is as on `main`. The screenshots measure the hero's height.
- **Horizontal scroll from the moved island.** The hero clips with `overflow: hidden`, and the screenshots measure `scrollWidth` against the viewport.
- **A piece left out of place.** The e2e end-state checks require every island group to end opaque and untransformed. The longer build-up stays well inside their wait.

## Proof

- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm test` and `npm run e2e`: `# fail 0`.
- `npm run art`: every file `lossless` (the art is unchanged).
- Screenshots of the home page and the lab at 1440px and 390px, with no horizontal scroll, and the hero 734px tall at 1440px.
