# Plan: The hero island builds itself as it comes in (from intent.md 2026-10-16)

## Files that change

- **Art:**
  - `src/assets/pixel-art/source/scenes/hero-island.mjs`: cube ground in row order, and the entrance groups.
  - `src/assets/pixel-art/source/scenes/closeup-*.mjs`: all seven follow the island's ground.
  - `src/assets/pixel-art/hero-island.svg`: compiled by `npm run art`, never edited by hand.
- **Motion:**
  - `src/lib/island-entrance.mjs` (new): the schedule, as a pure function with the spec's R6 numbers.
  - `src/components/home/Hero.astro`: plays the schedule, and drops the whole-island rise.
- **Tests:**
  - `scripts/pixel-art-island.test.mjs`: the tests that change and the new art tests (spec, Tests).
  - `scripts/island-entrance.test.mjs` (new): the schedule.
  - `scripts/e2e/shell.e2e.mjs` and `scripts/e2e/motion.e2e.mjs`: the island's groups end in place, and show at once without JavaScript, with Motion blocked and under reduced motion.
- **Docs:**
  - `docs/design-system/README.md`: Motion, the island build-up exception (spec C1).
  - `.claude/skills/pixel-art/SKILL.md`: the hero island's cube ground, its entrance groups and the close-ups.
  - `.claude/agents/pixel-artist.md`: test pins and byte notes that name flat tiles.
  - `docs/intents/2026-10-island-build-entrance/*.md`: status lines.

## Order of work

One slice, run by the main session in one sitting, so there is no main-session branch. The owner asked for every stage to land in the one PR from `feat/island-build-entrance` into `main` ([#112](https://github.com/jlawcordova/jlawcordova.github.io/pull/112)), which stays a draft until the last step:

```
main ◀── PR #112 (draft → ready; owner merges) ── feat/island-build-entrance
           commits: intent, spec, plan, steps 1–5
```

Each step is one commit, and `npm test` passes after each.

1. **The ground becomes cubes, in row order.**
   - In `hero-island.mjs`, swap each inner `tile` for `block`, each inner `path` for `block-road` with `path` laid over it, and each inner `river` for `block-river` with `river` laid over it.
   - List the 36 positions row by row, keeping each top right after its cube.
   - Give the close-ups the same ground for the positions they show, in the same order.
   - Run `npm run art`.
   - Update the R1/R3 ground test, and add the settled-pixels test (R2): rebuild today's flat ground in a probe scene and compare composites.
   - Confirm with `--preview hero-island` that the PNGs are byte-identical to the ones from `HEAD`.
2. **Entrance groups.**
   - Wrap the scene's items in `enter` groups (`shadow`, six `ground` rows, `object` runs with `data-x`, `sky`), with a scratch script that computes each object's foot `x`. Keep the spec's exceptions: shades take their tree's `x`, and the crane's jib and box take the mast's.
   - Run `npm run art`.
   - Make the island test helpers flatten groups, leave the `enter` groups out of the R4 class-order test, and add the entrance-group tests.
3. **The schedule.** Add `src/lib/island-entrance.mjs` and `scripts/island-entrance.test.mjs`.
4. **Play it on the page.**
   - Wire the schedule into `Hero.astro`'s script, with `play()`, and remove the `.hero__art` rise.
   - Extend the hero e2e checks to the `enter` groups.
   - Screenshot at 1440px and 390px.
5. **Docs and status.**
   - Design system Motion exception, the pixel-art skill, and the pixel-artist agent's pins.
   - Set the status lines to built.
   - Paste the verification into the PR and mark it ready for review.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 1–5 | Main session | `feat/island-build-entrance`, pushed to PR #112 after each commit | Next step, with no pause |
| After 5 | Owner | PR #112, ready for review | Owner reviews and merges into `main` |

**Who runs it.** The main session runs every step. Step 1 restructures the scene's ground without drawing anything, and step 2 only wraps items in groups, so the `pixel-artist` agent isn't needed: no pixel changes at rest, and a test proves it.

**Owner reviews.** None before the PR is ready. The owner already tuned the motion by feel in the prototype, and the spec's open decisions (C1 timing exception, C2 settled look) are reviewed on the ready PR. If the owner overturns either, the PR goes back to draft and the change follows their answer.

**Independent review.** None. The art is proven pixel-identical at rest by a test, no shared engine or format changes, and the entrance is checked by unit and e2e tests. The owner can still ask for a `verify-change` run on #112.

## Risks

- **The riskiest step is step 1.** If a cube's hidden face shows at rest, R2 fails. The settled-pixels test and the byte-identical preview catch it. If they fail, stop and report which pixels differ, rather than changing the art's look.
- **Breaking the loops.** Wrapping loop groups (`wf`, `ff`, `hf`, `itruck`, `pcloud`) inside `enter` groups could break their CSS or their order. The R4 test still checks the loop classes in order, and `pixel-art.css` selects them by class alone.
- **Paint order around the trucks.** The R5 tests pin which pieces paint before and after the trucks. Objects keep their order, so these must pass unchanged.
- **Size.** The cubes' hidden faces and the groups grow the SVG. `npm run art` fails above 500 KB raw and 125 KB gzip, and `--sizes hero-island` goes in the PR.
- **Motion on SVG groups.** Motion's `y` on a `<g>` must land in SVG units and end with no leftover offset. The prototype confirmed this (10 → −2 → 0), and the e2e end-state check pins it.
- **Hiding content.** A start state set before Motion loads would hide the island if Motion fails. `play()` sets it in the same call that animates it, and the e2e Motion-blocked case pins that.
- **Options not chosen:**
  - Animating per diagonal (the first prototype): the owner chose rows, left to right.
  - Computing object positions in the browser with `getBBox()`: it would be blind to the crane's parts belonging together, and untestable in `node:test`.
  - Keeping flat tiles in the close-ups: it would break the close-ups' rule of showing only the island's items (spec C5).

## Proof

- `npm run art`: every file `lossless`, none `OVER BUDGET`. Paste `npm run art -- --sizes hero-island`.
- `npm test`: `# fail 0`, including the settled-pixels, entrance-group and schedule tests.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run e2e`: `# fail 0`. "NOT RUN" means not verified.
- Screenshots of the home page at 1440px and 390px, settled, with no horizontal scroll, plus one mid-entrance frame.
