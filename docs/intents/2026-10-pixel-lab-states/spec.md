# Spec: The site's art in Pixel Lab states (from intent.md 2026-10-24)
Status: approved. The owner set the goal of carrying intent, spec and plan through to a finished build, and reviews the final PR (2026-10-24). Each Area of concern below is taken with its recommendation.

This spec turns the [intent](intent.md) into requirements and a design. For Pixel Lab, it relies on the lab repo at the `v0.8.0` tag (`6107710`, the object states merge, PR #64):
- `docs/document-format.md`, "States": the `start` and `states` keys, a placed item's `state`, and a motion key's `state`.
- `docs/site-contract.md`, "States" and "Actions": `data-state`, `data-play`, and the `animationend` event `<scene>--<state>`.
- `docs/cli.md`: `object states make`, `object states from-poses`, `object state run` and `art sizes`.
- `docs/intents/2026-10-object-states/spec.md`:
  - R8, an object's ambient loop and actions as states;
  - R9, `data-play` and the event keep working for a one-shot state;
  - R37–R40, pose families as states, with the renders checked at every 100 ms;
  - D8, the merge;
  - Areas of concern 1 and 2: the site pins this release first, and converts its own art.
- `scripts/acceptance/poses.txt`: the lab's acceptance run of `from-poses` on a copy of this site's island (crane hook, and the crossing signals with `--fold --as flash --delete-unused`), as the art stood on 2026-10-24.

**What's in the document today** (counted on `main` at `d31dbba`):
- **Layer ambient loops and actions:** only `character` has them, on layer 1, its `character` layer. That's the 1 s bob and the 480 ms `hop`. Its layer 0 is empty. The seven `outfit-*` objects extend `character` and replace rows of layer 1 only.
- **Pose keys:** only `hero-island` has them, 59 in all, on 8 tracks. They fall into six families:

  | Base | Items | Pose keys | Pose objects |
  |---|---|---|---|
  | `crossing-signal` | `signal-far`, `signal-near` | 34 | `crossing-signal-left`, `crossing-signal-right` (both extend the base) |
  | `crane-hook` | `hook` | 11 | `crane-hook-drop`, `crane-hook-low` |
  | `crane-jib` | `jib` | 4 | `crane-jib-back`, `crane-jib-side` |
  | `mine-cart` | `cart` | 4 | `mine-cart-tipped` |
  | `crossing-gate` | `gate-far`, `gate-near` | 4 | `crossing-gate-down-far`, `crossing-gate-down` |
  | `truck-open` | `truck-tip` | 2 | `truck-open-tipped` (extends the base, and is extended by `truck-open-tipped-green`) |

- **Other placements:** the bases are also placed in the close-ups and `thumb-elk`, without poses. `truck-open-green` extends `truck-open` and is placed nowhere.
- **Other references:** no scene but `hero-island` places a pose object. No page code, test or script names one either. Only skill and doc prose does.
- **The explainer library** has no ambient loops, actions or poses, so nothing in it changes.
- **The pin** is v0.7.0 (`scripts/pixellab.mjs`), not v0.6.0: the categories change moved it on 2026-10-24. v0.7.0 rejects `states` as an unknown property, as v0.6.0 does (the lab spec's Areas of concern 1).
- **Today's `check`:** `ok · 233 files, no problems` and 26 warnings. That's the 11 "pixels outside its viewBox" warnings the categories change listed for this document (its R3), plus 15 `off_grid` motion warnings on the island's belts, carts and hoppers. This is the baseline for "no new warnings".

## Requirements

### Part 1: the pin

- **R1. The pin moves to v0.8.0.**
  - `scripts/pixellab.mjs` sets `VERSION` to `'v0.8.0'`.
  - Both `ASSETS` hashes are taken from the release's `SHA256SUMS`: the lines for `pixellab-darwin-arm64.tar.gz` and `pixellab-linux-x64.tar.gz`.
  - Everything else about the pin stays as it is (Pixel Lab v0.6.0's spec, R10): the download, the two hash checks, `.pixellab-bin/<version>/`, and the two platforms.
- **R2. The pin alone changes no output.** With only R1 applied:
  - `npm run art` writes the same 6 SVGs and 13 thumbnails as v0.7.0, byte for byte;
  - every file is `lossless`;
  - `npm run pixellab -- check` shows no problems, and no warning beyond the 26 in today's baseline.

  R2 is proved and committed before any art changes.

### Part 2: the art as states

- **R3. The character's bob and hop become states.**
  - `npm run pixellab -- object states make character` makes the layer ambient loop the start state, `idle`, a 1000 ms loop with the same move.
  - The same command makes the `hop` action a one-shot `hop` state, 480 ms with the same keys, that hands over to `idle` (the lab spec's R8).
  - Layer 1 keeps its `character` class, and the outfits keep their rows.
- **R4. The Range's A button works unchanged.**
  - `Range.astro` still sets `data-play="hop"` on the class's group, and clears it on `animationend` with `animationName` `range-sprite--hop`. The lab spec's R9 and the site contract's States, rule 6, promise this for a one-shot state.
  - The browser check "A makes only the character hop" (`scripts/e2e/range.e2e.mjs`) passes on the built page, unchanged.
  - The check also confirms that `data-play` is cleared, which shows the event fired.
- **R5. Each hero-island pose family becomes one object with states.**
  - `npm run pixellab -- object states from-poses <base>` runs once per family in R5's table, in this order: `crane-hook`, `crossing-signal --fold --as flash`, `crane-jib`, `mine-cart`, `crossing-gate`, `truck-open`.
  - Each run checks every scene that shows the family at every 100 ms of its loop, and either side of each key, and refuses if any pixel differs (the lab spec's R38).
  - A refusal is never forced or worked around. It stops the work and is reported (Areas of concern 3).
- **R6. The signals flash as one looping state.**
  - `--fold --as flash` replaces each signal's alternating run of pose keys with one key into a looping `flash` state.
  - After it, `signal-far` and `signal-near` have 3 keys each, `rest`, `flash` and `rest`, where today they have 17 pose keys each. That matches the lab's acceptance run.
- **R7. Pose objects are deleted only when nothing uses them.**
  - After all six families are converted, the remaining pose objects are confirmed unused:
    - no scene places or poses them;
    - no object extends them;
    - no page code, script or test names them.
  - Then each family's `from-poses <base>` runs with `--delete-unused`, which deletes them in the same version as the conversion, under R5's render check. (As built: the command refuses a base that already has states, so a second, delete-only pass isn't possible. The usage check ran on a first, unpushed conversion of all six, and each family was then converted again with `--delete-unused`. The result is the same files, less the deletions.)
  - `truck-open-tipped` is kept if `truck-open-tipped-green` still extends it. (As built: the conversion writes `truck-open-tipped-green` out whole, so nothing extends `truck-open-tipped` any more, and it's deleted.) `truck-open-green` and `truck-open-tipped-green` are library objects, not poses, so they stay, written out whole with the same renders.
- **R8. The art stays the same.**
  - The commands' render checks are the guarantee. On top of them, the plan compares `scene render` PNGs of `hero-island` and `range-sprite` before and after Part 2 at the same set of times.
  - `npm run art`: every file `lossless`.
  - `check`: no problems, and no warnings beyond the baseline.
  - The published SVG bytes of `hero-island.svg` and `range-sprite.svg` may change: R2's byte-identical promise covers documents without states only.
- **R9. The island's size is reported.** `npm run pixellab -- art sizes hero-island` before Part 2 (after R2) and after it, and the PR shows both totals and each converted family's line. `range-sprite.svg`'s total is reported too.

### Tests and docs

- **R10. The hop test follows the hop.**
  - `scripts/range-change.test.mjs` ("A's hop") reads the hop from `character`'s `hop` state, not from a layer action.
  - It keeps the checks it makes today:
    - one character per class;
    - the sprite plays `hop` through `data-play`;
    - the move is up and down by whole pixels, starts at rest, rises at least 5 px and lands;
    - `Range.astro` sets and clears it.
  - It adds that the state plays once and hands over to `idle`.
  - This isn't a test changed to pass. The requirement it checks is the same (Range pop spec, R6), and only where the hop lives has moved.
- **R11. The docs describe states where they described the old ways.**
  - Update every place that says the character's bob is a layer ambient loop and its hop a layer action, or that the island's moving parts pose as other objects. That's the `pixel-art` skill and its `rules.md`, the `pixel-art-motion` skill, `CLAUDE.md`'s Pixel Lab lines and `README.md`.
  - Each says:
    - which objects have states;
    - that `data-play` plays a one-shot state;
    - that `object state …` and `scene key set --state` edit states;
    - that Pixel Lab must be v0.8.0 or later to open the document.
  - Links to the lab's docs point at the `v0.8.0` tag.
  - Docs of earlier changes under `docs/intents/` stay as they are, as history.
- **R12. Everything else still passes:**
  - `npm test`;
  - `npm run build`, with `0 errors`, `0 warnings`, `0 hints`;
  - `npm run e2e`, with `# fail 0`;
  - the deploy workflow.

  Post URLs, `/blog/pageN/`, `/atom.xml` and the thumbnails' URLs don't change.

## Design

### D1. Order of work
1. Wait for the release's assets. The `v0.8.0` tag exists, and the work starts once `SHA256SUMS` downloads.
2. **The pin (R1, R2)** in one commit. Its proof is a `cmp` of every SVG and PNG against copies saved from v0.7.0.
3. **The character (R3, R4, R10)** in one commit: the command, then the test.
4. **The island (R5–R7)** in one commit per family, so each diff is one family. The deletions go in one commit at the end.
5. **The docs (R11).**
6. **The proof (R8, R9, R12),** pasted into the PR.

### D2. The pin
- The same edit the categories change made: `VERSION`, and the two hashes, copied from `SHA256SUMS` (download it, then `grep` both lines).
- `scripts/pixellab.test.mjs` reads `VERSION`, so it needs no change.
- The first `npm run art` downloads the program into `.pixellab-bin/v0.8.0/` and checks it against both hashes. A mismatch stops the work.

### D3. The character (R3, R4)
- `object states make character` writes `start: "idle"` and `states: { idle, hop }` after `layers`, and takes `ambient` and `actions` off layer 1. The lab spec's R8 lists what it refuses, and the character passes all of it: offset 0, moves on one layer only, and layer 0 empty.
- The outfits `extend` `character`, so they get its states. An extending sprite can't have states of its own.
- In `range-sprite.svg`, each of the seven placements plays `idle` from the start. Each also has a `[data-play~="hop"]` rule that plays `hop`, then hands over to `idle`, and fires `range-sprite--hop`.
- `Range.astro` and `src/styles/` don't change. The browser check samples the drawn box of `.character`, which moves with the whole sprite, so it reads the hop as before.
- No `data-state` is added to the page (out of scope). `AccomplishmentRow.astro` already uses a `data-state` attribute on its `<li>`. That's no clash: the engine's rules match `[data-state]` inside a `data-pixellab` SVG, and no achievement art has states.

### D4. The island (R5–R7)
- **One family at a time.** Run each family with `--dry-run` first, which reports the states, the keys it rewrites and the render check without writing. Then run it for real and commit. Running in R5's order keeps each diff to one family.
- **Families with `extends`.** `crossing-signal-left` and `-right` extend `crossing-signal`, and `truck-open-tipped` and `truck-open-green` extend `truck-open`. The command writes objects that extended the base out whole, so they keep their drawing (`docs/cli.md`).
- **State names.** These come from the command (D8): `rest` for the base's own drawing, and each pose named without the base's prefix (`drop`, `low`, `back`, `side`, `tipped`, `down`, `down-far`). The folded signal state is `flash`. `left` and `right` stay as states, since `flash` plays their frames.
- **Close-ups and thumbnails.** These place the bases without keys, so they start in `rest`, which is the base's own drawing. The command renders every scene that shows the family, these included.
- **Deletion (R7).** As built:
  1. All six families are converted without `--delete-unused`, and not pushed.
  2. A `grep` of the document's scenes and objects, `src/` and `scripts/` shows that nothing names any pose object.
  3. The branch goes back to the character commit, and each family runs again with `--delete-unused`: first `--dry-run`, then for real.

  Each family's deletions go in that family's commit.

### D5. The proof (R8, R9)
- **Sizes.** Save `art sizes hero-island` and `art sizes range-sprite` after the pin (step 2) and again after step 4.
- **Renders.** After the pin, render `hero-island` with `scene render hero-island --time <t> --out …` at every 500 ms from 0 to 27,500, offset by 50 ms so no sample sits on a key. Render `range-sprite` at 0, 250, 500 and 750 ms. Repeat after Part 2, and compare the PNGs byte for byte. The hop is compared with `object render character`: `--play hop@<t>` on the pin commit, and `--state hop --time <t>` after, at 12 times through it. This compares the opaque pixels in the viewBox's coordinates, since `scene render --play` takes actions only. The close-ups and `thumb-elk`, which place the bases, are rendered at 6 times each against a worktree of the character commit. That's a sample on top of the commands' own 100 ms check.
- **The page.** `npm run e2e` runs the hop check in Chromium on the built page. Screenshots of the home page's hero and Range at 1440 and 390 px, with no horizontal scroll.

## Areas of concern

1. **The release's assets aren't published yet.**
   - On 2026-10-24 the `v0.8.0` tag exists, but its `SHA256SUMS` returns 404 while the release workflow builds.
   - Nothing is pinned to a hash that isn't published, and nothing is built from the lab checkout (intent, Constraints).
   - **Recommendation:** wait, and re-check the download until it's there.
2. **The owner's Pixel Lab app must move to v0.8.0.** Once the document has states, a v0.7.0 app or MCP server rejects it (`unknown property 'states'`).
   - **Recommendation:** the PR says so. The owner updates the app (the lab's `scripts/install.sh`) before or right after merging. Nothing is installed for them.
3. **A conversion could refuse.**
   - `from-poses` refuses when:
     - a render differs;
     - the merged sprite passes 64 px or 12 colors;
     - a pose is a frame loop or has an ambient loop or actions;
     - the base already has states, or extends another.
   - The lab's acceptance run covered only the crane hook and the signals. The jib, cart, gates and truck haven't been run.
   - **Recommendation:** a refusal on any family stops that family. The others still convert. The PR reports the refusal with the command's reason and leaves that family as poses. That's a change to the lab, not something to force here. Nothing is edited by hand to get around it.
4. **`range-change.test.mjs` asserts the old format** (R10). CLAUDE.md says to fix the code, not the test.
   - Here the code change is the requirement: the hop's home moves from a layer action to a state, by the owner's request. The test keeps every behavior it checks and reads them from the new place.
   - **Recommendation:** rewrite the test's source lookup as R10 says, and say so in the PR.
5. **Published bytes change in Part 2.**
   - Only Part 1 promises byte-identical SVGs. Part 2 changes `hero-island.svg` and `range-sprite.svg`, with pixel-identical renders.
   - The lab spec expects a merged family to be smaller (D8), and `art sizes` shows it (R9).
   - **Recommendation:** accept a change in either direction within the engine's budgets, and report it. If either file goes over budget, stop and report it.
6. **New warnings after Part 2.**
   - `check` warns about a sprite with both states and layer ambient loops or actions. `states make` takes those off, so none is expected.
   - The island's `off_grid` warnings name track indexes. `--fold` shortens the signal tracks, but tracks aren't removed, so the indexes and the count shouldn't change.
   - **Recommendation:** any warning outside the 26-warning baseline is a finding, reported in the PR.

## Open questions

- **The intent's questions:** none.
- **New:** none. Areas of concern 1–6 are taken with their recommendations, as the owner's goal for this session asks.
