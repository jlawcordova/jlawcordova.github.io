# Plan: The art moves to Pixel Lab's depth order (from intent.md 2026-10-21)
Status: approved (the owner approved ahead of review; reviewed once, in the final PR).

## Files that change

- `package.json`, `package-lock.json`: the `pixellab` pin, `#v0.3.0` → `#v0.5.0` (D1).
- `src/assets/pixel-art/jlawcordova.pixellab/scenes/hero-island.mjs`: the depth data (D3), then sorted.
- `src/assets/pixel-art/jlawcordova.pixellab/objects/mine-cart.mjs`, `objects/container.mjs`: a `footprint` each (D3).
- `src/assets/pixel-art/jlawcordova.pixellab/scenes/closeup-*.mjs` (all seven): the island's levels and overrides, in the island's order (D5).
- `src/assets/pixel-art/jlawcordova.pixellab/scenes/range-sprite.mjs`: `depth: 'back'` on its four shared shadow pieces (D3); with it the sort moves nothing and the SVG is unchanged.
- `src/assets/pixel-art/hero-island.svg`, `range-sprite.svg`: republished by `npm run art`.
- `scripts/pixel-art-island.test.mjs`: the two pinned sequences, the new depth-order test, comments (D6). `scripts/range-art.test.mjs`: comments.
- `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/pixel-art-motion/SKILL.md`, `.claude/agents/pixel-artist.md`, `README.md`, `docs/intents/2026-10-pixel-art-engine/spec.md` (a one-line pointer): D7.
- `docs/intents/2026-10-pixel-lab-depth-order/` (new): `intent.md`, `spec.md`, `plan.md`, and `samples/` with the before/after renders the PR shows.

## Order of work

One slice, run by the main session in one sitting on `feat/pixel-lab-depth-order` (a worktree cut from `origin/main`), and one PR from it into `main`, which the owner merges. There is no separate main-session branch: the owner asked for one PR reviewed once.

```
main ── feat/pixel-lab-depth-order ── PR (owner merges) ──▶ main
```

1. **Intent, spec and plan.**
2. **The pin.** `npm install --save-dev "pixellab@github:jlawcordova/jlawcordova-lab#v0.5.0"`; confirm `npm run pixellab -- scene sort --help` and that `npm run pixellab -- help` has no `scene raise`. Commit `package.json` and `package-lock.json` together. The committed SVGs are stale against the new engine until step 3, so `npm test` passes again from step 3.
3. **The depth data, one sort, the close-ups, the SVGs and the tests,** in one commit, because the close-up test and the stale-SVG test tie them together:
   1. `npm run pixellab -- object footprint mine-cart --to 2,1` and `object footprint container --to 2,2`.
   2. Add the `level` and `depth` keys of D3 to the unsorted `hero-island.mjs` in one pass, moving no line (a script that writes the file with `pixellab/serialize`), then give each close-up item its island item's level and its group's override the same way (D5).
   3. `npm run pixellab -- scene sort --all`, once.
   4. Put each close-up in the island's order (the same kind of script) and confirm `scene sort --all --dry-run` changes nothing and `check` has no `out_of_order` or `copies`.
   5. `npm run art`.
   6. Tests: the two pinned sequences, the depth-order test, the comments (D6).
4. **Samples.** The before (v0.3.0) and after previews of every scene the new engine changes at 3×, and crops of the pairs that mattered, in `samples/`.
5. **Docs.** The skills, the agent, the README and the engine spec's pointer (D7).
6. **Verification and As built.** The checks in Proof, the entrance lab, screenshots; any departure recorded under As built in the same commit as the change it explains. Then the PR, whose body cites this plan, pastes the verification output and lists the decisions for review.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 1–6 | the main session | `feat/pixel-lab-depth-order`, in its worktree | the next step, without a pause |
| PR | the main session opens it | into `main` | the owner reviews and merges |

- Owner reviews: none before the final PR. The owner approved the intent, spec and plan ahead of review; the decisions that were theirs are listed in the PR with the alternative and a before/after render or number.
- Pixel Lab: in this worktree the CLI writes the sources (the MCP server runs on the owner's checkout and isn't used). No proposal is made, applied, rejected or forced.
- Independent review: none. The output is shown to be pixel-identical to v0.3.0, at rest for every scene and over the island's whole loop, by a comparison against v0.3.0's own renders, and the tests and checks run in the PR. A `verify-change` run wouldn't add evidence the comparison doesn't.
- Stop only if blocked: the tag is missing, or something can't be made to look right with levels, footprints, overrides or (last) grouping the crane. Then report with renders.

## Risks

- **The sort takes pieces that only meet mid-loop out of order** (the riskiest step, D4). Handled by adding all the data before the one sort, and checked by comparing against v0.3.0 at every 250 ms and every 50 ms of the loop.
- **A level fixes one pair and breaks another** (a rider raised over things in front of its carrier). Each value in D3 was chosen by measuring every pair out of the old order over the loop; the comparison catches any slip.
- **The close-ups drift from the island.** Handled by giving them the island's data and order (D5), with the test unchanged.
- **Hand-added fields aren't canonical.** They're written with the engine's serializer, and the sources test checks the canonical format.
- **Size.** Moving pieces stay grouped, so there are no copies; the SVGs should keep their size. `npm run art` checks the budgets.
- **The entrance changes.** The shipped orders read data, not the index; a piece-by-piece schedule comparison and the entrance lab check it.
- **Docs promise something the engine doesn't do.** Each statement in the skills is checked against the lab's spec and `docs/cli.md` at `v0.5.0`.

## Proof

- `npm run pixellab -- scene sort --help` prints the command; `npm run pixellab -- help | grep raise` finds only `object layer move`'s wording.
- `npm run pixellab -- check`: no problems, no `out_of_order`, no `copies` (the 15 `off_grid` warnings remain, as before).
- `npm run pixellab -- scene sort --all --dry-run`: nothing would change.
- The comparison against v0.3.0 (its CLI from `git archive v0.3.0` of the lab, on the document at `origin/main`): every scene's preview identical except the two 2 px close-up fixes (D5); `hero-island` identical at every 250 ms and every 50 ms of its loop.
- The schedule comparison (D8): no piece moves with `TIMING` or `RANGE_TIMING`; the `random` count recorded.
- `npm run art`: every file lossless, none `OVER BUDGET`; `npm run pixellab -- art sizes hero-island` pasted.
- `npm test`: `# fail 0`. `npm run build`: 0 errors, 0 warnings, 0 hints, `[build] Complete!`. `npm run e2e`: `# fail 0` (or "NOT RUN", reported as not verified).
- The home page at 1440px and 390px, with no horizontal scroll; the entrance lab with the `random` order.

## As built

- **The Range's shadow (step 6).** The one sort moved `range-sprite`'s four shared `island-shadow` pieces from the top of the list to after the class groups (no pixel changed, all seven classes checked). They got `depth: 'back'` with `scene set`, as the island's shadow has, so they draw first again and `range-sprite.svg` is byte-identical to the v0.3.0 output. Added to spec D3.
- **Docs beyond depth order (step 5).** The bump also brings v0.4.0's commands: placing into groups, `scene group set`, `data-x`/`data-y` kept in step, and motion keys with `show` and `pose` over the MCP. The `pixel-art` skill's Items line had to be rewritten for depth order anyway, so the skill's "What the MCP can't express" list, its app section, the `pixel-art-motion` skill's Scene motion bullet, the agent's matching line and the `achievement-icon` skill's reason for a hand edit now say what v0.5.0 does. Listed in the PR's decisions.
