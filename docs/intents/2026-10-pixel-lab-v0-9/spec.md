# Spec: Pixel Lab v0.9.0, and the build-ups in the document (from intent.md 2026-10-27)
Status: approved. The owner set the goal of carrying intent, spec and plan through to a finished build, and reviews the final PR (2026-10-27). Each Area of concern below is taken with its recommendation.

## Summary

The site pins Pixel Lab v0.9.0, and with the pin alone every published SVG and thumbnail stays byte for byte the same. Then `scene entrance set --timing` gives `hero-island` the site's `TIMING` and `range-sprite` its `RANGE_TIMING`. The published files still don't change, since v0.9.0 writes the same SVG with or without an entrance (its spec R6), so the site goes on playing the build-up with its own code.

From here on there are two copies of the build-up: the site's `src/lib/island-entrance.mjs`, which visitors see, and the document's entrances, played by Pixel Lab's engine. Until the follow-up moves the entrance into the SVG, they can drift. A new test fails when the document's timing or schedule differ from the site's, and the lab's `scripts/entrance-parity.mjs` shows any drift between the site's logic and the engine's port.

## Requirements

### The pin

- **R1. The pin is v0.9.0.** `scripts/pixellab.mjs` sets `VERSION` to `v0.9.0`, with both tarballs' SHA-256 from the release's `SHA256SUMS`.
- **R2. The pin alone changes no output.** With R1 and nothing else, `npm run art` writes the same bytes for every SVG and thumbnail as v0.8.0, every file `lossless`, and `npm run pixellab -- check` shows no problems and the same warnings.
- **R3. CI runs the Linux program.** The `linux-x64` program needs a glibc the site's CI runner has. When the program won't run, the install error gives the program's own reason, such as the loader's "GLIBC_2.39 not found", rather than only saying the version didn't match.

### The entrances

- **R4. The hero island's entrance is the site's `TIMING`.** It's set with `npm run pixellab -- scene entrance set hero-island --timing '<TIMING as JSON>'`, the object as it is in `island-entrance.mjs`. Since a field left out keeps the site's `TIMING`, the canonical form is `"entrance": {}`.
- **R5. The Range's entrance is the site's `RANGE_TIMING`,** set the same way on `range-sprite`.
- **R6. The published files don't change.** After R4 and R5, `npm run art` writes the same bytes as before them, and `check` shows no new problems or warnings.
- **R7. A test keeps the copies together.** `npm test` runs a test that reads `scene entrance show --json` for both scenes, and fails unless:
  - the scene's timing is the site's (`TIMING` or `RANGE_TIMING`), with times in whole ms;
  - every piece's delay, duration and move, and the time everything has settled by, are what the site's `schedule()` gives for the same pieces, read as `pieceOf()` reads them.
- **R8. The drift is measured.** The lab's `scripts/entrance-parity.mjs`, at the v0.9.0 tag, is run against this branch. Its output is compared with the lab's committed fixture, and the result is reported in the PR.

### Docs and proof

- **R9. The docs follow.** `CLAUDE.md`, `README.md`, the `pixel-art` skill and the `pixel-art-motion` skill say:
  - Pixel Lab must be v0.9.0 or later to open the document;
  - the two scenes hold their entrances, and Pixel Lab plays them;
  - the site still plays its own copy until the follow-up;
  - a new pick from the entrance lab goes into `TIMING` (or `RANGE_TIMING`) and into the scene with `scene entrance set --timing`, and R7's test fails if only one changes.
- **R10. Every check passes.** `npm run build` and `npm test` pass, with every file `lossless` from `npm run art`, and `npm run e2e` shows `# fail 0`.
- **R11. A recording shows it.** The PR carries a Playwright recording of the built home page, where the hero island builds itself up and the Range rebuilds its setting on a class change, as visitors see them.

## Design

### D1. Order of work

Pin, prove R2, then set the entrances and prove R6. The commits keep the two steps apart, so a reviewer sees each one leave the outputs unchanged. The proof hashes every file in `src/assets/pixel-art/*.svg` and `static/public/thumbnails/*.png` before and after each step, and compares `check`'s output line by line.

### D2. The glibc floor (R3)

The `linux-x64` program in v0.9.0 references glibc symbol versions up to `GLIBC_2.39`, the same as v0.8.0's (measured with `strings` on both programs). That is Ubuntu 24.04's glibc. So the program runs on 24.04 and on 26.04, but not on 22.04 (2.35). The deploy workflow's `build` job is `runs-on: ubuntu-latest`, which is 24.04 or newer, so it stays as it is. Pinning the job to an older image would break it.

The release could raise that floor one day. To make the failure plain if it does, `ensureProgram` adds the first line of the program's `--version` error to its "doesn't report pixellab …" message. With an old glibc, the dynamic loader writes `version 'GLIBC_2.39' not found`.

### D3. The timing (R4, R5)

`--timing` takes the site's `Timing` object in seconds and stores whole ms. The JSON comes from importing `island-entrance.mjs` (`JSON.stringify(TIMING)`), never retyped. The Range's settings are seven `data-class` groups, and the site plays the current one's `.enter` groups. Pixel Lab's `entrance show` lists the first setting's pieces, three floor rows and five objects. The lab's parity script reads the same setting. Every setting plays the same timing over its three rows and its objects (five each, four in setting 1), and the site's `schedule()` settles each one by 1.44 s.

### D4. The test (R7)

`scripts/entrance-timing.test.mjs` calls `pixellab(['scene', 'entrance', 'show', <scene>, '--site', '.', '--json'])` through the pin script, as the explainer and category tests do. It maps each listed piece to `{ enter: role, col, row, x, y }`, with `Number()` of each field, so a missing one is `NaN` as in `pieceOf()`. It then compares the pieces with `schedule()` and `settledBy()` to within 1 µs. It also checks that it catches drift: with the hero's `lag` set to 450 ms in the document, it fails with "the document has 1770 ms, the site 1820 ms".

## Areas of concern

1. **The two copies can drift.** The site keeps its own copy of the entrance logic (`island-entrance.mjs`, played by `play-entrance.ts`). The lab's spec settled that moving the entrance into the SVG is a follow-up (its Areas of concern 4). Until then, drift can come two ways:
   - **The timing.** Someone changes `TIMING` from the entrance lab and not the scene, or the other way round. R7's test fails on the next `npm test`. Recommended: the skill tells whoever ships a lab pick to paste it in both places.
   - **The logic.** The site's schedule changes and the engine's port doesn't. The lab's `scripts/entrance-parity.mjs` shows this. Run against this branch, the site's logic and both timings match the lab's fixture, and so do all eleven Range cases. The 31 hero cases differ only because the hero island has gained one piece, the Ask bot's character, since the fixture was made from site `d31dbba`: 220 pieces against 219. Its timings, its moves per kind and its settle time of 2.32 s are the same. R7's test schedules the current 220 pieces through the engine and matches the site. Recommended: the lab regenerates its fixture from this site's `main`, as a lab change.
2. **The owner's Pixel Lab must be v0.9.0.** Earlier releases reject `entrance`, so once this merges, the owner's app must be v0.9.0 or later to open the document. Recommended: say so in the PR and the docs (R9).
3. **The owner's checkout.** The owner's main checkout may have its own unsaved or uncommitted edits to `hero-island.json`. This change adds one line to the end of that file, `"entrance": {}`, so a merge is a one-line conflict at most. Recommended: flag it in the PR.
4. **The Linux program and CI (D2).** The only way to prove the program runs in CI is a CI run. Recommended: the PR's own run of the deploy workflow's `build` job, which runs `npm run art` and `npm test` on `ubuntu-latest`, is the proof, read from its log.

## Open questions

None.
