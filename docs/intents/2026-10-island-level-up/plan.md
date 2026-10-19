# Plan: Island level up (from intent.md 2026-10-18)

Written at the end, as the owner asked: the work ran as a series of owner reviews (the object list, the objects, the composed island twice, the animation twice), so this records the run and the last steps to the PR. The [spec](spec.md) holds the requirements; [art-brief.md](art-brief.md) holds every object's decisions.

## Files that change

- **Docs:** `docs/intents/2026-10-island-level-up/` (new): `intent.md`, `spec.md`, `plan.md`, `objects.md`, `art-brief.md`, `samples/`.
- **Skills and agents:** `.claude/skills/design-scene/SKILL.md` (new); `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/pixel-art-motion/SKILL.md`, `.claude/agents/pixel-artist.md`, `CLAUDE.md`.
- **Engine:** `src/lib/pixel-art/motion.mjs` (new); `engine.mjs`, `svg.mjs`, `serialize.mjs`, `edit.mjs`; `scripts/optimize-pixel-art.mjs` (the island's budget, `--sizes` with motion).
- **Lab:** `src/components/lab/animation-panel.ts` (new); `frames-panel.ts`, `lab.ts`, `scene-mode.ts`, `stage.ts`, `Inspector.astro`, `LabBar.astro`; `src/pages/lab/pixel-art.astro`; `src/layouts/BaseLayout.astro`; `src/styles/lab.css`.
- **Art:** about 40 new objects in `src/assets/pixel-art/source/objects/` (objects.md and the spec's Library list); `waterfall-face.mjs` and `crane-hook.mjs` redrawn; `block-yard*.mjs` (deleted); `scenes/hero-island.mjs`, the seven `scenes/closeup-*.mjs`; `src/assets/pixel-art/hero-island.svg`.
- **Site:** `src/styles/hero.css`, `src/styles/pixel-art.css`.
- **Tests:** `scripts/pixel-art-motion.test.mjs` (new); `scripts/pixel-art-island.test.mjs`, `scripts/island-entrance.test.mjs`, `scripts/pixel-art-cli.test.mjs`, `scripts/e2e/editor.e2e.mjs`.

## Order of work

One slice on `feat/island-level-up`, run by the main session with one `pixel-artist` subagent at a time, then one PR to `main` that the owner merges.

1. Intent and the list of new objects, reviewed by the owner.
2. The lab's `?object=`/`?scene=` links and the `design-scene` skill.
3. Scene motion in the engine and the lab's Animation pane (Scene mode), with tests; the editor JS budget to 36 KB.
4. The lab fills the screen without the nav and footer.
5. Object mode's Animation pane, with tests.
6. The objects, one subagent run at a time (small ones up to 3 a run), each committed after a look at its samples: runs 1–15 in art-brief.md's table, plus `conveyor-low`.
7. The scene's layout, then the owner's layout review: the small train, the processing line on the middle island, the crane on the rail section, grass rail ground (the container, flatcar, block-rail, locomotive, boxcar, rail tunnel and overpass redrawn, then the scene re-laid).
8. The crane's poses (hook ropes, then jib turns), then the motion loop.
9. The owner's animation review: the timber overpass, slanted truck poses, the reversed ore belt, the longer waterfall, then the scene's layout and motion again (the container's round trip on the train). The island's budget raised to 750 KB raw and 150 KB gzip.
10. Retire `block-yard` and the review boards.
11. Re-frame the close-up scenes on the new island (scene subagent).
12. Re-pin the island, entrance and `--sizes` tests to the spec; drop `idrive` from `pixel-art.css`; update the skills and docs.
13. Run every check, take the screenshots, and open the PR.

## Workflow and reviews

- **Main session:** the engine, the lab, the hero CSS, the tests, the docs, every commit and the PR.
- **Subagents:** the `pixel-artist` agent drew each object, resumed with the owner's feedback so it kept its context, and one ran the scene from layout to motion and the close-ups. Only one ran at a time, except the owner-approved tunnel roof fix alongside run 6.
- **Owner reviews (done):** the object list; each object's samples and lab link as it landed; the composed island; the re-laid island; the animation; the re-worked animation. The owner approved the animation and asked for this PR.
- **Independent review:** none planned. The owner reviewed every visible step, and the checks below are pasted into the PR. The owner can ask for `verify-change` on the PR.

## Risks

- **Re-pinned tests.** The island tests pinned today's layout pixel by pixel. Re-pinning them could weaken them, so each keeps its intent (the spec's Tests line) and pins the new values exactly where the old test did.
- **Size.** The island tripled. It's within the raised budget with room to spare; `--sizes hero-island` shows where the bytes go.
- **Motion and entrance together.** The entrance animates the `enter` groups; the motion animates `mv-` groups inside them. The motion e2e checks the entrance still ends in place.
- **Phone size.** The island draws below 1× on a phone. The owner chose "whole island, smaller".

## Proof

- `npm run build` ends with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`.
- `npm test` shows `# fail 0`.
- `npm run art` reports every file `lossless` and none `OVER BUDGET`; `npm run art -- --sizes hero-island` is within 750 KB raw and 150 KB gzip.
- `npm run e2e` shows `# fail 0`.
- Screenshots of the home page at 1440 px and 390 px with no horizontal scroll, and of the lab at 1440 px; the motion strips in `samples/`.
