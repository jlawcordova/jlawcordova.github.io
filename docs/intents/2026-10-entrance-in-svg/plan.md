# Plan: Pixel Lab v0.10.0, and the build-ups from the SVG (from intent.md 2026-10-27)

Implements [spec.md](spec.md) R1–R17, with every Area of concern taken with its recommendation. The release is Pixel Lab v0.10.0, tagged on the lab's `75ced32` (PR #75). The owner asked for the intent, spec, plan and build to be carried through to one PR into `main`, which they review (2026-10-27).

## Files that change
- `docs/intents/2026-10-entrance-in-svg/` (new): `intent.md`, `spec.md`, `plan.md`, and `recordings/` with the PR's Playwright recordings (R17).
- `scripts/pixellab.mjs`: `VERSION`, both `ASSETS` hashes, and the glibc comment (R1, R2).
- `src/components/home/HeroIsland.astro`: `data-play="enter"` on the `<svg>` (R5).
- `src/components/home/Hero.astro`: the island's part of the script goes (R6).
- `src/lib/ask-loader.ts`: the bubble waits on the piece's subtree (R7).
- `src/components/home/Range.astro`: `build()`, A and the hop's end through the token helpers (R8–R10).
- `src/styles/hero.css`: the `.hero-island .enter` origin rule goes (R12).
- Deleted (R11): `src/lib/island-entrance.mjs`, `src/lib/play-entrance.ts`, `src/components/lab/EntranceLab.astro`, `src/pages/lab/island-entrance.astro`, `scripts/island-entrance.test.mjs`, `scripts/entrance-timing.test.mjs`.
- `scripts/pixel-first-look.test.mjs`: the `src/components/lab/` exception goes (D5).
- `scripts/entrance-svg.test.mjs` (new): R14.
- `scripts/e2e/shell.e2e.mjs`, `range.e2e.mjs`, `theme.e2e.mjs`, `motion.e2e.mjs`, `ask.e2e.mjs`: R15.
- `scripts/range-change.test.mjs`: its check of A's handler reads the token list (Departures 1).
- `CLAUDE.md`, `README.md`, `docs/design-system/README.md`, `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/pixel-art-motion/SKILL.md`: R13. The links to the lab's docs at the pinned tag move to v0.10.0.

Not changed: the document's sources (its entrances came with the v0.9.0 change), `.github/workflows/deploy.yml`, `src/lib/motion.ts`, the explainer library.

## Order of work
One slice, straight to a PR into `main`, run by the main session in one sitting. This cloud session runs in a fresh clone of `origin/main` with nothing of the owner's in it, which stands in for the worktree, and it pushes to its assigned branch, `claude/fervent-volta-m5zjsy`. Every `pixellab` command takes `--document src/assets/pixel-art/jlawcordova.pixellab` explicitly.

```
main ── claude/fervent-volta-m5zjsy (steps 1–7, one commit each) ── PR (owner merges) ──▶ main
```

1. **The intent, spec and plan.**
2. **The pin (R1–R4).**
   - Hash every SVG and thumbnail with v0.9.0, and save `art build`'s and `check`'s output.
   - Wait until the release's `SHA256SUMS` downloads. Copy its two tarball lines into `ASSETS`, and set `VERSION`.
   - Run `npm run art`, diff the hashes and `check`, and measure the Linux program's glibc floor.
3. **The hero (R5–R7, R12).** `HeroIsland.astro`, `Hero.astro`, `ask-loader.ts`, `hero.css`.
4. **The Range (R8–R10).**
5. **Retire the site's copy (R11), and the SVG test (R14).** Delete the files, take out the lint exception, add `entrance-svg.test.mjs`.
6. **The browser checks (R15).**
7. **The docs (R13).**
8. **Verify and record (R16, R17).**
   - `npm run build`, `npm test`, `npm run e2e`, `pixellab check`; screenshots of the home page at 1440px and 390px with no horizontal scroll.
   - Record the hero and a Range class change, convert to GIFs and commit them in `recordings/`.
   - Open the PR, and read the CI run.

## Workflow and reviews
- The main session runs every step. No subagents: the change is a few page scripts, deletions and tests that all read the same SVGs.
- The only owner review is the final PR. No `verify-change` run: the e2e checks exercise what visitors see, and the outputs that change are the two scenes' SVGs, which the PR reports.
- The owner merges into `main`.

## Risks
- **The release isn't published yet.** Step 2 waits for the release's `SHA256SUMS`; nothing pins an unpublished program or a build from the lab checkout.
- **The CSS build-up looks different from Motion's.** The lab's browser test checks the CSS against the engine in three browsers, and the engine's port against the site's schedule (its parity fixture, regenerated from the site's `main`). The recordings show it.
- **The hop and the build-up clash on `data-play`** (the riskiest step). R9's e2e test presses A mid-build and checks the build-up's animations aren't restarted or ended.
- **The Ask bubble never shows** if it waits on an endless loop. D3 waits only on finite animations; `ask.e2e.mjs` checks the bubble appears.
- **CI can't see the browser.** `entrance-svg.test.mjs` runs in CI's `npm test` and fails if the SVGs lose their entrance or the hero loses its attribute.
- **The recordings make the repo heavier.** Keep each GIF short, at 640 px and 15 fps.

## Proof
- The v0.9.0 and v0.10.0 hashes of all 20 published files: the 18 that should match do, and the two that change are within budget.
- `check`: no problems and the same warnings as v0.9.0.
- `npm run build`, `npm test` and `npm run e2e` output, pasted in the PR.
- Screenshots at 1440px and 390px, and the two recordings.

## As built
- **The release (step 2).** The v0.10.0 tag was pushed at 13:33 UTC on 2026-10-27, and its release published `SHA256SUMS` with all four assets at 13:57; until then the download was a 404, and nothing was pinned. Both tarball lines came from that file, and `ensureProgram` checked the download against the pin and the file.
- **The glibc floor (step 2).** The highest symbol version in v0.10.0's `linux-x64` program is `GLIBC_2.39`, the same as v0.9.0's.
- **The art (step 2).** Of the 20 published files, the 18 other than the two scenes hashed the same as v0.9.0's, every one `lossless`. `hero-island.svg` went from 531.8 KB / 102.2 KB gzip to 546.6 KB / 103.2 KB (+14.8 KB / +1.0 KB; budget 750 KB / 150 KB), and `range-sprite.svg` from 151.0 KB / 30.0 KB to 155.3 KB / 30.3 KB (+4.3 KB / +0.3 KB; budget 200 KB / 50 KB). `check` showed no problems and the same 26 warnings, line for line.
- **The SVGs.** Every `data-enter` group (220 on the hero, 55 across the Range's seven settings) holds one wrapper with its inline delay, and the play rules have the form `[data-pixellab="hero-island"] [data-play~="enter"] .…, [data-pixellab="hero-island"][data-play~="enter"] .…` inside `@media (prefers-reduced-motion:no-preference)`. `entrance show range-sprite` lists only the first setting's 8 pieces, so the SVG test compares those with `data-class="0"`.

## Departures
1. **`range-change.test.mjs` changed.** It matched the old A handler's text (`setAttribute('data-play', 'hop')`). It now matches `replay(group, 'hop')` and `drop(group, 'hop')`: the same behaviour, through the token list. It rode with the browser checks' commit.
2. **The Ask suite gained a test.** Nothing checked that the bubble waits for the character, and D3 changes how it waits, so `ask.e2e.mjs` now checks the bubble shows after the character's 1370 ms landing, with the character in place, and at once under reduced motion.
3. **Polling without JavaScript.** Playwright's `waitForFunction` can't poll in a page with JavaScript off, so the shell suite's `heroAtRest` polls from Node, as `motion.e2e.mjs` does.
4. **A mutation check.** With the old A handler put back (it set `data-play="hop"`, dropping `enter`), the new mid-build test and the hop test both fail; with the new one they pass.

