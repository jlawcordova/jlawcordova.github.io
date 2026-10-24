# Spec: The site's art in Pixel Lab categories (from intent.md 2026-10-24)
Status: approved, with every Area of concern's recommendation accepted as written. The release is v0.7.0.

This spec turns the [intent](intent.md) into requirements and a design. Its source of truth for Pixel Lab is the lab repo's `main` at the object libraries merge (`jlawcordova-lab` PR #57), until that is released:
- `docs/intents/2026-10-object-libraries/spec.md`: R1–R3 (categories), R10–R16 and R25 (libraries), and Appendices A and B (the categories).
- `docs/libraries.md`, `docs/document-format.md` and `docs/site-contract.md`.
- `docs/intents/2026-10-autosave/spec.md` R16: agents' edits apply, and there are no proposals. The release brings this too (Areas of concern 2).

**Rehearsed before writing.** I tried everything below on a scratch copy of `main` (`git archive origin/main`), using the pinned v0.6.0 program and a build of the lab's `main` (`0.6.0-116-g07b42df`). The real checkout was not touched. The rehearsal showed:
- **The outputs.** `art build` with the lab's `main` writes the same 6 SVGs and 13 thumbnails as v0.6.0, byte for byte.
- **Categories on the site's document.** Applying Appendix A (one `object category` call per row) leaves `check` with no problems, gives every one of the 204 objects a category, and keeps all 6 SVGs byte-identical.
- **Categories on the explainer library.** Applying Appendix B leaves no problems and gives every one of the 101 objects a category.
- **v0.6.0 refuses categories.** On a copy with one category, its `check` reports `objects/pine.json: unknown property 'category'`, and `art build` writes nothing ("1 problem; nothing written").
- **The library export.** `library export` on the categorized explainer writes a 101-object `explainer.pixellib` (512 KB). Importing it into a new document, or into a copy of the site's document, passes `check`. The site's copy keeps every SVG byte-identical. That import renames `block-office` to `block-office-2`, reports the `character` swap, and finds no differing or missing colors. The lab's acceptance stage `site-categories` runs this whole sequence.
- **New warnings.** The newer program adds "pixels outside its viewBox" warnings to scenes that crop on purpose (R3).

## Requirements

### The program

- **R1. The pin moves to the first release with categories.** `scripts/pixellab.mjs` pins that release, with both tarballs' SHA-256 taken from its `SHA256SUMS`. This spec calls it v0.7.0; the version is whatever the owner tags (Areas of concern 1). Everything else about the pin stays as Pixel Lab v0.6.0's spec R10 has it: the download, both checks against the hashes, `.pixellab-bin/<version>/`, and the platforms. Comments that cite the v0.6.0 spec as history (for example "left with Pixel Lab v0.6.0 (spec R18)") stay as they are.
- **R2. The outputs don't change.** After the bump, `npm run art` writes the same 6 SVGs and 13 thumbnails, byte for byte, and every file is still `lossless` and within its budget.
- **R3. The new warnings are known, not fixed.**
  - The newer `check` warns when a fixed `viewBox` cuts off painted pixels. That covers 11 scenes in the site's document:
    - the seven `closeup-*` scenes;
    - `range-sprite`;
    - `thumb-caching`, `thumb-cloud-resume` and `thumb-jwt`.
  - It also covers `sheet-consolidated` in the explainer library.
  - These scenes crop on purpose (a close-up is a window on the island), so none is changed.
  - The PR lists them as the new warnings baseline, so CLAUDE.md's "no new warnings" is measured against it.

### Categories

- **R4. The site's document is categorized.** Every object in `src/assets/pixel-art/jlawcordova.pixellab/` gets its category from Appendix A of the lab's spec. That's 204 objects under eight outermost categories: Terrain, Nature, Buildings, Transport, Industry, Roles, Achievements and Thumbnails. No object is left without one.
- **R5. The explainer library is categorized.** Every object in `art/explainer-library.pixellab/` gets its category from Appendix B. That's 101 objects under seven outermost categories: Kitchen, Office, Cloud, AI, Glue, People and Animals. No object is left without one.
- **R6. Categories change nothing else.** After R4 and R5:
  - `check` shows no problems and no warnings beyond R3's.
  - Every source is in canonical form.
  - `npm run art` writes the same bytes as after R2.
  - `npm run explainer-export` writes the same PNGs as before.
- **R7. New objects get a category.**
  - A test fails when an object in either document has no category.
  - The pixel-art skill and the `pixel-artist` agent say to set one when an object is made. They pick an existing category where one fits.
  - `achievement-icon` puts a new icon under Achievements › Icons (Areas of concern 5).

### The explainer library as an object library

- **R8. The explainer library exports as a `.pixellib`.** One command writes `explainer.pixellib` from `art/explainer-library.pixellab`, with every object and its category, ready for another document to import. It goes into the git-ignored `.explainer-export/` and isn't committed (Areas of concern 4).

### Agents and docs

- **R9. The docs describe how edits land in the release.**
  - The release has no proposals: an edit over the MCP changes the document as it's made. While Pixel Lab has the document open, the owner sees each edit on the stage, and it saves itself. Every change is a version with its author, which the owner can take back in Pixel Lab's Versions panel (`history_undo` for an agent).
  - With the app open, a CLI edit in the owner's checkout goes through the app, so it no longer leaves the owner looking at a stale copy.
  - Update everything that describes `doc_save` proposals, approving and rejecting, `proposal_list` and `proposal_render`, or the "don't use the CLI in the owner's checkout" reason:
    - `CLAUDE.md`
    - the `pixel-art`, `pixel-art-motion`, `design-scene` and `achievement-icon` skills
    - the `pixel-artist` agent
    - `README.md`
  - The rules that stay:
    - Agents never publish, commit or push unless told.
    - They report what they changed.
    - They never `--force` past problems.
- **R10. The docs describe categories and libraries.** The pixel-art skill and the README say that:
  - objects have categories, which Pixel Lab's Library shows as tabs;
  - `object_category` sets them, and `object_list --category` filters by them;
  - the explainer library exports as an object library (R8);
  - palette files exist, but this change adds no colors.

  The skill links the lab's `docs/libraries.md` at the pinned tag.

### Checks

- **R11. Everything else still passes:**
  - `npm test`, including the explainer library's test, which reads the program's JSON;
  - `npm run build`;
  - the e2e checks;
  - the deploy workflow.

  Post URLs, `/blog/pageN/`, `/atom.xml` and the thumbnails' URLs don't change.

## Design

### D1. Order of work
1. The owner tags the lab release (Areas of concern 1).
2. **The pin bump.** R1–R3 land in one commit. Its proof is a byte comparison of `npm run art`'s outputs before and after.
3. **The categories.** R4–R6 run in a worktree with the CLI, since the MCP server is bound to the owner's checkout. There are 45 calls for Appendix A and 16 for Appendix B, one per row:
   ```sh
   npm run pixellab -- object category pine tree tree-small tree-shade --to "Nature/Trees"
   npm run pixellab -- object category cat cat-black … --to "Animals/Cats" --document art/explainer-library.pixellab
   ```
   The calls are generated from the appendix tables, as the lab's `scripts/acceptance/site-categories.mjs` does, and run once. They aren't kept as a script: the result is in the JSON.
4. The test and the export (R7, R8).
5. The docs (R9, R10).

The pin must land before, or in the same PR as, the first category. A categorized document fails v0.6.0's check and build.

### D2. The pin
- `VERSION` becomes the new tag.
- `ASSETS` gets the new `pixellab-darwin-arm64.tar.gz` and `pixellab-linux-x64.tar.gz` hashes from the release's `SHA256SUMS`.
- The installed check expects `pixellab <version>` from `--version`.
- `scripts/pixellab.test.mjs` still passes with its fake tarball. It doesn't depend on the version, apart from the pinned values it reads.
- An existing `.pixellab-bin/v0.6.0/` is left in place. The new version gets its own folder.

### D3. The categories' test (R7)
- **Explainer library:** `scripts/explainer-library.test.mjs` already reads `object list --json` on the library. It gains a test, "every asset has a category", that checks each row has a non-empty `category`.
- **Site's document:** a new `scripts/pixel-art-categories.test.mjs` does the same through `npm run pixellab -- object list --json`. It uses Node built-ins only, like the other art tests.
- **No exact match:** neither test checks the categories against the appendices. The owner may move an object later, and the lab's spec doesn't bind the site's future art.

### D4. The library export (R8)
- `scripts/export-explainer-library.mjs` (`npm run explainer-export`) also runs:
  ```sh
  library export .explainer-export/explainer.pixellib --replace --document art/explainer-library.pixellab
  ```
- It writes the library next to the PNGs it already writes, and prints the object count.
- No new npm script and no committed copy.

### D5. The docs (R9, R10)
- **The pixel-art skill's "Pixel Lab: the MCP and the CLI" section.** The flow becomes: look → edit over the MCP → `check` → report what changed. The edits are already in the document, so `npm run art` and `npm test` can run straight after.
  - Replaced: the "proposal" table rows and the paragraph on why the CLI isn't used in the owner's checkout.
  - New paragraph, on taking changes back: `doc_undo` for the agent's last step, `history_undo` for a version, and the owner's Versions panel.
  - New paragraph, on categories: `object_category`, the eight outermost categories, and the rule from R7.
- **CLAUDE.md's Pixel Lab line, the `pixel-artist` agent, and the other three skills** match the skill, in fewer words.
- **README.md's Pixel Lab paragraphs** name the release and say the Library shows the categories.
- **Unchanged:**
  - The design system and the content: their "proposal" mentions are about other things.
  - `docs/references/profile.md`.

## Areas of concern

1. **The release isn't tagged yet, and it brings more than categories.**
   - Tagging is the owner's (a `v<major>.<minor>.<patch>` tag on the lab's `main`). This spec says v0.7.0.
   - The release also carries everything merged since v0.6.0:
     - autosave and versions, with no proposals (concern 2);
     - scenes without a fixed size, which brings R3's warnings;
     - the floating Library and the Agent chat in the app;
     - object libraries.
   - The rehearsal shows none of them changes the site's output.
   - The owner's Pixel Lab app should move to the same release at the same time (the lab's `scripts/install.sh`).
   - The site checkout has an uncommitted scene (`meadow`) and an edited `hero-island.json`, made in the app. Committing them is the owner's call, kept apart from this change.
   - **Recommendation:** tag the release from the lab's current `main`, then bump the pin to it.
2. **The owner's approval gate moves.**
   - Today the site's agents can only propose: nothing reaches the sources until the owner approves in Pixel Lab.
   - With the release, an agent's MCP edit in the owner's checkout writes the sources as it goes. The owner then reviews in Pixel Lab, where each change is a version by its author, and in `git diff` before committing.
   - The site's rule against applying or forcing a proposal has nothing left to apply to.
   - **Recommendation:** accept it, as the lab's autosave spec decided (R16). Keep the rules that still protect the owner: agents report every change, never commit, push or publish unless told, and never `--force` past problems.
3. **New `check` warnings (R3).**
   - Fixing them with `scene frame --fit` would change what the close-ups, the Range sprite and three thumbnails publish, which this change mustn't do.
   - **Recommendation:** accept them as the new baseline and list them in the PR. A later change can fix a scene's `viewBox` on purpose if one ever needs it.
4. **Where the explainer library lives (the intent's open question).**
   - **(a) On demand:** written by `npm run explainer-export` into the git-ignored `.explainer-export/`. It's never stale, there's no second copy of 101 objects in the history, and it takes one command to make.
   - **(b) Committed:** `art/explainer.pixellib`, kept in step by a test that re-exports it and compares. Another repo could fetch it without running the program, but every edit to the explainer means re-exporting and committing a 512 KB copy.
   - **Recommendation: (a).** Nothing needs the library in the repo today, and (b) can be added later without changing (a).
5. **A rule for future art (R7).**
   - Requiring a category on every object adds a step to making one.
   - **Recommendation:** keep the rule. Without it, the next objects land in Others and the Library drifts back to a long list. The test only checks that a category is there, never which one.
6. **The categories themselves.**
   - Appendices A and B were approved in the lab's PR #57. This spec applies them as written.
   - **Recommendation:** any change to a row goes in this PR's review, before the plan, so the plan's commands come from one agreed table.

## Open questions

- **The intent's question:** where the explainer library lives. Carried to Areas of concern 4, with a recommendation.
- **New questions:** Areas of concern 1, 2 and 5. Each has a recommendation for the owner.
