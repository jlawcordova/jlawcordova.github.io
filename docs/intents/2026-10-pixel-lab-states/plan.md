# Plan: The site's art in Pixel Lab states (from intent.md 2026-10-24)

Implements [spec.md](spec.md) R1–R12, with every Area of concern taken with its recommendation. The release is Pixel Lab v0.8.0, tagged on the lab's object states merge (`6107710`, PR #64). The owner asked for the intent, spec, plan and build to be carried through to one final PR, which they review (2026-10-24).

## Files that change
- `docs/intents/2026-10-pixel-lab-states/` (new): `intent.md`, `spec.md`, `plan.md`.
- `scripts/pixellab.mjs`: `VERSION` and both `ASSETS` hashes move to v0.8.0 (R1).
- `src/assets/pixel-art/jlawcordova.pixellab/objects/character.json`: `start` and `states`, and the ambient loop and action taken off layer 1 (R3).
- `src/assets/pixel-art/jlawcordova.pixellab/objects/`, written by the CLI:
  - the six bases get states: `crane-hook`, `crossing-signal`, `crane-jib`, `mine-cart`, `crossing-gate`, `truck-open` (R5);
  - objects that extended a base are written out whole: `crossing-signal-left`, `crossing-signal-right`, `truck-open-tipped` and `truck-open-green`;
  - pose objects nothing uses any more are deleted (R7).
- `src/assets/pixel-art/jlawcordova.pixellab/scenes/hero-island.json`: pose keys become state keys, and the signals' runs fold into `flash` (R5, R6).
- `scripts/range-change.test.mjs`: "A's hop" reads the `hop` state (R10).
- `.claude/skills/pixel-art/cost.md`: the trucks' frames are drawn per placement (R11).
- `CLAUDE.md`, `README.md`, `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/pixel-art/rules.md` and `.claude/skills/pixel-art-motion/SKILL.md`: states (R11).

Not changed: `src/components/home/Range.astro`, `src/styles/`, `scripts/e2e/range.e2e.mjs`, the explainer library.

## Order of work
One slice, straight to a PR into `main`. The main session does every step in one sitting on this session's branch, `claude/gallant-curie-wa7i88`, so there's no main-session branch. The session's instructions name that branch, in place of `feat/pixel-lab-states`. Part 1 has to be proved before Part 2 starts, but the two are one runner's work in one sitting, and the commits keep them apart for review.

```
main ── claude/gallant-curie-wa7i88 (steps 1–6, one commit each; step 4 one per family, with step 5 in it) ── PR (owner merges) ──▶ main
```

1. **The intent, spec and plan.**
2. **The pin (R1, R2).**
   - Wait for `https://github.com/jlawcordova/jlawcordova-lab/releases/download/v0.8.0/SHA256SUMS` to download (spec Areas of concern 1).
   - Copy the `pixellab-darwin-arm64.tar.gz` and `pixellab-linux-x64.tar.gz` lines into `ASSETS`, and set `VERSION`.
   - Run `npm run art`, then `cmp` every SVG and thumbnail against the v0.7.0 copies saved before (in the scratchpad's `base-v070/`). Then run `npm run pixellab -- check`, and compare the warnings with the saved v0.7.0 list.
   - Save the "before" renders and sizes for D5: `art sizes hero-island`, `art sizes range-sprite`, and the `scene render` PNGs.
3. **The character (R3, R4, R10).**
   - Run `npm run pixellab -- object states make character`, then `object state run character hop` to read what it plays.
   - Rewrite "A's hop" in `range-change.test.mjs`.
   - Run `npm run art`, `check` and `npm test`.
4. **The island (R5, R6).** One commit per family, in this order: `crane-hook`, `crossing-signal --fold --as flash`, `crane-jib`, `mine-cart`, `crossing-gate`, `truck-open`. For each:
   - run it with `--dry-run`, then for real;
   - run `npm run art` and `check`;
   - commit with the command's summary in the message.

   A refusal stops that family only, and goes in the PR (spec Areas of concern 3).
5. **The deletions (R7).**
   - Confirm each remaining pose object is unused: `grep` the document's scenes and objects, `src/`, `scripts/` and `.claude/`.
   - Run each base again with `--delete-unused --dry-run`, then for real, all in one commit.
   - **As built:** `from-poses` refuses a base that already has states, so a delete-only second pass can't run. The usage check ran on step 4's first, unpushed commits, kept as a local backup ref. Then the branch went back to step 3's commit, and step 4 ran again with `--delete-unused` on each family: the same six commands, a `--dry-run` each, and one commit per family holding its deletions. The tree matches the first pass, less the 10 deleted pose objects.
6. **The docs (R11).**
7. **The proof (R8, R9, R12):**
   - the "after" renders and their comparison;
   - `art sizes` after;
   - `npm test`, `npm run build` and `npm run e2e`;
   - screenshots at 1440 and 390 px.

   The results go in the PR body. There's no commit for this step, unless a fix comes out of it. A fix gets its own commit, and this plan is updated in the same commit.

## Workflow and reviews

| Step | Who | Where | Then |
|---|---|---|---|
| 1–6 | main session | this checkout, branch `claude/gallant-curie-wa7i88` | commit after each step; push |
| 7 | main session | the same checkout | open the PR into `main` with the results |

- **CLI only.** Every art change goes through `npm run pixellab -- …`, run by the released program in this checkout. Nothing goes through the MCP server, which is bound to the owner's checkout, and no source is edited by hand. The owner's open Pixel Lab document isn't touched.
- **Merge rules.** There's no slice to merge. Only the owner merges the PR into `main`. If `main` moves, merge it into the branch before step 7, then rebuild the art and rerun the checks.
- **Owner reviews.** Only the final PR, as the owner asked. The PR lists the Areas of concern taken, any refused family, and that the Pixel Lab app must be v0.8.0 or later before the owner edits the document again.
- **Independent review.** None. Each `from-poses` refuses unless every render matches at every 100 ms. The pin step is checked byte for byte, and the browser check covers the hop. The owner can still ask for a `verify-change` run.

## Risks
- **The release is late.** The work can't start until step 2's download works. The intent, spec and plan are committed first, so nothing waits on them.
- **The pin changes output (step 2).** The engine promises it won't. If `cmp` finds any difference, stop and report it, rather than going on to Part 2.
- **A conversion refuses or the merged sprite is too big (step 4, the riskiest).** The command's own check is the gate. It's never forced. The rest of the families still convert.
- **The hop breaks in a browser (step 3).** String tests can't show it, so `npm run e2e`'s "A makes only the character hop" is the gate, on the built page. If it fails, compare `object state run character hop` with the old action's keys before changing anything.
- **Over-eager deletion (step 5).** `--delete-unused` only deletes what no scene uses. Step 5 also greps the rest of the repo first. `truck-open-tipped` is kept while `truck-open-tipped-green` extends it.
- **Fixture accomplishments.** The accomplishments browser suite swaps `src/data/accomplishments.json` and restores it. Check `git status` before each commit.

## Proof
- Step 2: `cmp` of 6 SVGs and 13 PNGs against v0.7.0, with no difference. `check` shows `no problems` and the same 26 warnings.
- `npm run art` after each step: every file `lossless`, and no over-budget warning.
- `npm run pixellab -- check` after each step: no problems, and no warning outside the baseline.
- The render comparison: `hero-island` at 56 times and `range-sprite` at 4, identical before and after Part 2. Also the hop, at 12 times, and the close-ups and `thumb-elk` at 6 times each (spec D5, as built).
- `art sizes hero-island` and `art sizes range-sprite`, before and after.
- `npm test`: `# fail 0`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run e2e`: `# fail 0`, with the Range hop check among them. If it can't run, the PR says NOT RUN, never that it passed.
- Screenshots of the home page at 1440 and 390 px, the hero and the Range, with no horizontal scroll.
