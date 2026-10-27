# Plan: Pixel Lab v0.9.0, and the build-ups in the document (from intent.md 2026-10-27)

Implements [spec.md](spec.md) R1–R11, with every Area of concern taken with its recommendation. The release is Pixel Lab v0.9.0, tagged on the lab's `8f995e1` (PR #72). The owner asked for the intent, spec, plan and build to be carried through to one final PR, which they review (2026-10-27).

## Files that change
- `docs/intents/2026-10-pixel-lab-v0-9/` (new): `intent.md`, `spec.md`, `plan.md`, and `recordings/` with the PR's Playwright recordings (R11).
- `scripts/pixellab.mjs`: `VERSION` and both `ASSETS` hashes move to v0.9.0 (R1). The install error carries the program's own reason (R3).
- `scripts/pixellab.test.mjs`: a test of that reason, with a fake program that fails as an old glibc does (R3).
- `src/assets/pixel-art/jlawcordova.pixellab/scenes/hero-island.json` and `range-sprite.json`: an `entrance`, written by the CLI (R4, R5).
- `scripts/entrance-timing.test.mjs` (new): R7.
- `src/lib/island-entrance.mjs`: the comments above `TIMING` and `RANGE_TIMING` say the scenes hold the same numbers (R9).
- `CLAUDE.md`, `README.md`, `.claude/skills/pixel-art/SKILL.md` and `.claude/skills/pixel-art-motion/SKILL.md`: R9. The links to the lab's docs at the pinned tag move to v0.9.0.

Not changed: `.github/workflows/deploy.yml` (spec D2), `src/lib/play-entrance.ts`, `src/components/`, `scripts/e2e/`, the explainer library.

## Order of work
One slice, straight to a PR into `main` from `feat/pixel-lab-v0-9`, in a worktree (`.claude/worktrees/pixel-lab-v0-9`), since the owner's checkout has edits of its own. The main session does every step in one sitting, with one commit per step.

```
main ── feat/pixel-lab-v0-9 (steps 1–6, one commit each) ── PR (owner merges) ──▶ main
```

1. **The intent, spec and plan.**
2. **The pin (R1, R2).**
   - Hash every SVG and thumbnail with v0.8.0, and save `check`'s full output.
   - Copy the two tarball lines from the release's `SHA256SUMS` into `ASSETS`, and set `VERSION`.
   - Run `npm run art`, and diff the hashes and `check`'s output against v0.8.0's.
3. **The install error (R3).** Add the program's reason to the error, and a test of it. Measure the glibc floor of both releases' Linux programs.
4. **The entrances (R4–R7).**
   - Run `scene entrance set` on both scenes, with `--timing` from `JSON.stringify` of the site's objects.
   - Run `npm run art`, and diff the hashes and `check` again.
   - Add `entrance-timing.test.mjs`. Prove it catches drift, by changing the hero's `lag` in the document and then restoring it.
5. **The drift report (R8).** Run the lab's `scripts/entrance-parity.mjs` from the v0.9.0 tag against this worktree, with `--out` in the scratchpad, and diff it with the lab's committed fixture.
6. **The docs (R9).**
7. **Verify and record (R10, R11).**
   - Run `npm run build`, `npm test` and `npm run e2e`.
   - Record the built home page with Playwright's video: the hero's build-up, then the Range rebuilding over two class changes. Convert the video to GIFs with `ffmpeg` and commit them in `recordings/`.
   - Open the PR, and read the CI run's log for the Linux program (spec Areas of concern 4).

## Workflow and reviews
- The main session runs every step. No subagents, since the art change is two CLI commands.
- The only owner review is the final PR. No `verify-change` run: the outputs are byte-identical and the new test guards the one thing that could go wrong.
- The owner merges into `main`.

## Risks
- **The `linux-x64` program won't run in CI.** Spec D2 measures its glibc floor at 2.39, which `ubuntu-latest` meets. The PR's CI run is the proof. If it fails, R3's message names the cause.
- **The owner's Pixel Lab is older than v0.9.0.** It would refuse the document. This is flagged in the PR.
- **The owner's checkout has edits to `hero-island.json`.** The merge is a one-line conflict at most. This is flagged in the PR.
- **The recordings make the repo heavier.** Keep each GIF small: short, at a reduced width and frame rate.

## Proof
- The v0.8.0 and v0.9.0 hashes of all 20 published files, identical after step 2 and again after step 4.
- `check`: no problems and the same 26 warnings, after each step.
- `npm test`, `npm run build` and `npm run e2e` output, pasted in the PR.
- `entrance-timing.test.mjs` fails when the document drifts, and passes when it's restored.
- The parity report (spec Areas of concern 1).
- The recordings, and the CI run.

## As built
