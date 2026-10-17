# Plan: The island builds in a clock sweep, and the tools to tune it stay (from intent.md 2026-10-17)

## Files that change

- **Art:**
  - `src/assets/pixel-art/source/scenes/hero-island.mjs`: 36 cube groups with place and foot, `data-y` on object groups, and water at `[0, 3]`.
  - `src/assets/pixel-art/source/scenes/closeup-office.mjs` and `closeup-front-trees.mjs`: water at `[0, 3]`.
  - `src/assets/pixel-art/hero-island.svg`: compiled by `npm run art`.
- **Motion:**
  - `src/lib/island-entrance.mjs`: `Timing`, the orders and moves, the owner's `TIMING`, `RANGE_TIMING` by name, and `settledBy`.
  - `src/lib/play-entrance.ts` (new): `pieceOf` and `playEntrance`.
  - `src/components/home/Hero.astro` and `Range.astro`: play through `playEntrance`.
  - `src/styles/hero.css`: the pop's origin on `.hero-island .enter`.
- **Lab:**
  - `src/pages/lab/island-entrance.astro` (new) and `src/components/lab/EntranceLab.astro` (new).
- **Tests:**
  - `scripts/island-entrance.test.mjs`, `scripts/pixel-art-island.test.mjs` and `scripts/pixel-art-cli.test.mjs`.
  - `scripts/e2e/editor.e2e.mjs`: the lab is unlisted.
  - `scripts/e2e/shell.e2e.mjs`: the settle comment's number.
- **Docs:**
  - `.claude/skills/pixel-art-motion/SKILL.md` (new) and `.claude/skills/pixel-art/SKILL.md`.
  - `.claude/agents/pixel-artist.md`, `docs/design-system/README.md`, `CLAUDE.md` and `README.md`.
  - This change's `intent.md`, `spec.md` and `plan.md`.

## Order of work

One slice, run by the main session in one sitting, straight to a PR into `main`, as the owner asked ("build my choice until PR is ready"):

```
main ◀── PR (ready; owner merges) ── feat/island-clock-sweep
           commits: intent, spec, plan, steps 1–3
```

`npm test` passes after each step. The art and the schedule are one step, because the schedule's tests read the compiled island: new groups with the old schedule, or the reverse, fail them.

1. **Art and schedule.**
   - With a scratch script, split each row group into cube groups with `data-col`, `data-row`, `data-x` and `data-y`.
   - Add `data-y` to every object group, using the same foot rules as `data-x`.
   - Turn `[0, 3]` into `block-river` with `river`, in the island and its two close-ups, and run `npm run art`.
   - Generalize `island-entrance.mjs`, and add `play-entrance.ts`.
   - Move the hero and the Range onto `playEntrance`, and add the pop origin to `hero.css`.
   - Update the island's ground, group and loop-count tests and the `--sizes` pins.
   - Rewrite the island's schedule tests for R1–R5, add the every-option test, and keep the Range's.
2. **The entrance lab.** Add the page and its controls, ported from the prototype onto the shared schedule and player, and list the lab as unlisted in `editor.e2e.mjs`.
3. **Skill and docs.**
   - Write the pixel-art-motion skill, and point the pixel-art skill, `CLAUDE.md` and the README to it.
   - Update the design system's Motion section, the agent's pins, the e2e settle comment, and the older spec's status note.
   - Run every check, screenshot, and open the PR with the output.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 1–3 | Main session | `feat/island-clock-sweep` | Next step, with no pause |
| After 3 | Owner | The PR, ready for review | Owner reviews and merges into `main` |

**Who runs it.** The main session runs every step. The art change is one cube's material and a regrouping, with no drawing, so the `pixel-artist` agent isn't needed.

**Owner reviews.** None before the PR. The owner already chose the motion in the prototype. The spec's open decision (C2, the Range) is reviewed on the PR.

**Independent review.** None. The schedule is pure and tested option by option, the art is checked by its tests and previews, and the e2e suite checks the end states. The owner can ask for a `verify-change` run on the PR.

## Risks

- **The Range breaks.** The Range shares the schedule. `RANGE_TIMING` names its order, move and spans, a test pins them, and `range.e2e.mjs` checks every setting ends in place.
- **A pop leaves a piece scaled.** The e2e end-state checks require every group to end at opacity 1 with no transform. The lab resets every piece before a replay, since the prototype showed that a cancelled pop could stick.
- **The pop grows from the wrong point.** Without `transform-box: fill-box`, the scale would grow from the SVG's corner. The CSS sets it, and the browser check reads the computed `transform-box`.
- **The lab leaks.** It must stay unlisted. The editor e2e's unlisted test checks its robots meta, and that no other page mentions `/lab/`.
- **Bytes.** The island grows. `npm run art` fails above the budget, and `--sizes hero-island` goes in the PR.
- **Options not chosen:**
  - Nesting cube groups inside row groups, as the prototype did: it costs more bytes and breaks the "groups do not nest" rule. The Range still has row groups, and the `rows` order reads either.
  - Measuring boxes in the browser for object depth: it can't be tested in `node:test`, and it splits shades from their trees (spec C4).
  - Keeping the lab as a panel on the home page behind a flag: it would ship its code to every visitor.

## Proof

- `npm run art`: every file `lossless`, none `OVER BUDGET`, and `npm run art -- --sizes hero-island` in the PR.
- `npm test`: `# fail 0`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run e2e`: `# fail 0`. "NOT RUN" means not verified.
- Screenshots of the home page and the lab at 1440px and 390px, with no horizontal scroll, and one mid-entrance frame from the lab at ¼× speed.
