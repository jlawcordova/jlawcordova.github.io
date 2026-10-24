# Plan: The site's art in Pixel Lab categories (from intent.md 2026-10-24)

Implements [spec.md](spec.md) R1–R11, with every Area of concern's recommendation accepted. The release is Pixel Lab v0.7.0, tagged on the lab's object libraries merge (`a26e050`, PR #57).

## Files that change
- `scripts/pixellab.mjs`: `VERSION` and `ASSETS` move to v0.7.0 (R1).
- `scripts/pixellab.test.mjs`: the fake program reports the pinned version, not a literal `0.6.0` (R1, D2).
- `src/assets/pixel-art/jlawcordova.pixellab/objects/*.json`: a `category` on all 204 objects (R4).
- `art/explainer-library.pixellab/objects/*.json`: a `category` on all 101 objects (R5).
- `scripts/pixel-art-categories.test.mjs` (new): every object in the site's document has a category (R7, D3).
- `scripts/explainer-library.test.mjs`: "every asset has a category" (R7, D3).
- `scripts/export-explainer-library.mjs`: also writes `.explainer-export/explainer.pixellib` (R8, D4).
- `CLAUDE.md`, `README.md`, `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/pixel-art-motion/SKILL.md`, `.claude/skills/design-scene/SKILL.md`, `.claude/skills/achievement-icon/SKILL.md`, `.claude/agents/pixel-artist.md`: edits apply directly, with no proposals; categories and libraries (R9, R10, D5).
- `docs/intents/2026-10-pixel-lab-categories/intent.md`, `spec.md`: status set to accepted and approved.

## Order of work
One slice, straight to a PR into `main`. The main session does every step in one sitting in its worktree (`feat/pixel-lab-categories`), so there's no main-session branch. The pin and the categories must land together anyway: a categorized document fails v0.6.0's check.

1. **This plan,** with the intent and spec statuses.
2. **The pin bump (R1–R3).** Change `VERSION` and both hashes from the release's `SHA256SUMS`, and have the test's fake program report the pinned version. Run `npm run art` and compare the 6 SVGs and 13 thumbnails byte for byte with the v0.6.0 copies saved before the bump. List the new `check` warnings and confirm they are R3's 11 + 1 scenes.
3. **The categories (R4–R6).** A throwaway script (in the scratchpad, not committed) reads Appendices A and B from the lab's spec at `v0.7.0` and runs one `npm run pixellab -- object category … --to "<path>"` per row, on each document. Then: `object list --json` shows no object without a category, `check` shows no problems and only R3's warnings, `npm run art` is byte-identical again, and `npm run explainer-export` writes the same PNGs as before.
4. **The tests and the export (R7, R8).** Add the two category tests and the library export, and run `npm test` and `npm run explainer-export`.
5. **The docs (R9, R10),** as D5 lays them out.
6. **Verification:** the checks in Proof, pasted into the PR.

## Workflow and reviews
The main session runs all steps in order, one commit each, in the worktree `.claude/worktrees/pixel-lab-categories-impl`. It uses the CLI, not the MCP, since the MCP server runs on the owner's checkout (spec D1.3). The owner's uncommitted `meadow` scene and `hero-island.json` edit in the main checkout are left alone.

Owner reviews: none before the PR. The owner set the goal of carrying the change through to a PR, and the spec's tables decide every category. The owner reviews and merges the PR into `main`.

Independent review: none. The byte comparisons and the tests check the change, and nothing here is hard to reverse.

## Risks
- **The outputs change with the new program.** This is the riskiest step, the pin bump. The rehearsal showed byte-identical output from the lab's `main`. Step 2 compares the bytes again with the released program. If any file differs, stop and report it.
- **The appendices drift from the documents.** An object added since the rehearsal (for example the explainer's office desks, chair and cats from PR #144) might not be in a table. Step 3 lists any object left without a category. If there is one, stop and report it, rather than inventing a category.
- **The owner's checkout.** It still has v0.6.0 in `.pixellab-bin/` and an app that may be older. After merge, the first `npm run` downloads v0.7.0, and the owner updates the app (spec Areas of concern 1).
- **The docs overstate the new flow.** The MCP server's own instructions (v0.7.0) are the source for how edits land, so the docs follow them: edits apply as made, `doc_undo` and `history_undo` take them back.

## Proof
- `npm run art`: every file `lossless`, and `cmp` of each SVG and thumbnail against the v0.6.0 copies shows no difference, after step 2 and again after step 3.
- `npm run pixellab -- check` and the same with `--document art/explainer-library.pixellab`: no problems; the warnings are only R3's.
- `npm run pixellab -- object list --json` on each document: 204 and 101 objects, none without a category.
- `npm run explainer-export`: the PNG count and bytes match the export before step 3, and it writes `explainer.pixellib` with 101 objects.
- `npm test`: `# fail 0`.
- `npm run build`: `0 errors`, `0 warnings`, `0 hints`, `[build] Complete!`.
- `npm run e2e`: `# fail 0`, or reported as NOT RUN if Playwright is missing.
- No UI changes, so no screenshots: the published SVGs are byte-identical.
