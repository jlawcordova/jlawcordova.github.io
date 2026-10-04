# Plan: Island migration (from intent.md 2026-10-03)

Plans [`spec.md`](spec.md) (R1–R12, slices 1–8). The work runs on a feature branch (`write-plan`, "Feature branch"): five slice PRs merge into `feat/island-migration`, and one final PR takes it to `main`. The owner reviews the whole island once, in that final PR, and only the owner merges it. Nothing deploys until then.

## Files that change

- `src/assets/pixel-art/source/objects/`
  - `flag.mjs`, `hearth.mjs`, `cloud-a.mjs`, `cloud-b.mjs`, `cloud-c.mjs`, `truck.mjs`, `truck-green.mjs`: world keys, no `legacy: true`.
  - `path.mjs` (new): the flat road tile (spec, Target scene).
  - `island-shadow.mjs` (new): the dithered shadow, `path-1` and `path-2`.
  - `waterfall-face.mjs` (new): the falling face at the front-right edge, `wf` frames.
  - `bridge.mjs`, `house.mjs`, `fence.mjs`, `crane-mast.mjs`, `crane-jib.mjs` (new), plus a roof piece if the house can't carry it, and `tree-small.mjs` (new) only if a second tree size is needed.
  - `island-front.mjs` (deleted in step 7), `island-base.mjs` and `waterfall.mjs` (deleted in steps 8 and 4).
- `src/assets/pixel-art/source/scenes/hero-island.mjs` and the generated `src/assets/pixel-art/hero-island.svg`. `library-demo.mjs` and its SVG, when a new object is added to the demo (R11).
- `scripts/pixel-art-roundtrip.test.mjs`: the island's R11 identity tests become structural tests (step 1); the "animated pieces" test drops `waterfall` (step 4) and `island-base` (step 8).
- `scripts/pixel-art-island.test.mjs` (new): the structural tests for R1–R6 and R10 (step 1), tightened as each slice lands.
- `scripts/pixel-art-engine.test.mjs`: the `library-demo` object list (R11).
- `scripts/e2e/art.e2e.mjs`: the island's fixture case is removed (step 1).
- `scripts/e2e/editor.e2e.mjs`: it uses `waterfall` for its frame tests and `island-base` as "the largest map". The frame tests move to `waterfall-face` (step 4) and the largest-map cases move to `range-island`, the largest legacy map left (step 8).
- `src/components/lab/lab.ts`: the comment naming `island-base` as the largest map (step 8). No code change.
- `scripts/fixtures/pixel-art/hero-island.src.svg` (deleted in step 8).
- `.claude/skills/pixel-art/SKILL.md` and `README.md`: the island's legacy section and mentions (step 8).

Not touched: `pixel-art.css`, `HeroIsland.astro`, `hero.css`, `palette.mjs`, the engine.

## Order of work

One commit per slice, in the spec's order. Each PR targets `feat/island-migration`, which is branched from `main` once this plan is merged.

**PR A: slices 1–2 (identity tests replaced, no visible change and small shade changes)**

1. **Free swaps and clouds; the proof changes (R9).** `flag` and `hearth` to world keys, with a test that each paints the same pixels as before. The three clouds to world colors (`cream`, `path-2`, as in the Colors table). In the same commit, replace the island's R11 identity tests and the `art.e2e.mjs` fixture case with `pixel-art-island.test.mjs`: viewBox (R3), the animated groups and their classes (R4), paint order of trucks against front pieces and road (R5), raw and gzip size against 83,485 / 18,299 bytes (R6), no `legacy`/`c-<hex>` on migrated objects (R2, as an allow-list that shrinks to empty by step 8), and no script, link, text or external reference (R10). Keep the R11 test that the fixture's two static layers don't overlap, since the fixture stays until step 8.
2. **Trucks.** `truck` and `truck-green` to world colors; `truck-green` keeps `extends: 'truck'`. Measure and record the three green-truck distances in the Colors table (spec says "to be measured in the slice").

**PR B: slice 3 (the biggest pixel move)**

3. **Ground and shadow.** The 36 positions (`block [1,1,1]` on the front edges, `tile` elsewhere) and `island-shadow`. Remove those pixels from `island-base` in the same commit. If the size test fails, switch interior tiles to `[2, 2, 0]` blocks (spec C6) and record it here.

**PR C: slices 4–5**

4. **River and waterfall.** `water` tiles along the river, the new `waterfall-face` with `wf w0`…`w4`; `waterfall.mjs` is deleted. Move the editor e2e frame tests to `waterfall-face`, and drop `waterfall` from the "animated pieces" test.
5. **Road and bridge.** `path` tiles on the same road line as today (the trucks' `idrive` offsets don't change, C5), and `bridge`.

**PR D: slices 6–7**

6. **House.**
7. **Front pieces.** Trees, `fence`, `crane-mast` + `crane-jib` (each within 64×64), roof pieces. All listed after the trucks (R5). `island-front.mjs` is empty and deleted.

**PR E: slice 8**

8. **Clean-up.** `island-base` is empty and deleted, with the fixture, the remaining R11 island tests and the R2 allow-list. The editor e2e's largest-map cases move to `range-island`, the `lab.ts` comment is updated, and the skill's island section and the README mentions go (R11).

**Final PR: `feat/island-migration` → `main`.** Opened by the agents after PR E merges, with the whole-island before and after (1× and 4× previews, home at 1440px and 390px), the final size against R6, and links to every slice PR and its verifier report. Verified once more against the whole spec. The owner reviews R3 here and merges, which deploys.

### Workflow for each slice PR

1. An implementer agent, in its own worktree from the tip of `feat/island-migration`, builds the PR's slices one commit each, runs every gate in Proof, pushes the previews and screenshots to `art-previews/pr-<n>`, ticks Progress below, and opens the PR against `feat/island-migration`. It records in the PR description anything left on purpose to a later slice, so the verifier doesn't flag it.
2. A fresh verifier agent gets only "Use the verify-change skill on PR #<n>."
3. Blocking findings go to an implementer, then a new verifier runs. This repeats until a report is PASS.
4. With PASS and green CI, an agent merges the PR into `feat/island-migration` (the hook in `.claude/settings.json` allows only `feat/*` bases). If `main` has moved, it merges `main` into the feature branch before the next PR starts.

The PRs run one after another: every slice edits `hero-island.mjs` and removes pixels from `island-base`, so they can't be built in parallel.

## Risks

- **Slice 3 is the riskiest.** It moves a third of the island's pixels and is where size (R6) is most likely to break, because 36 tiles each carry their own runs. Handled by the size test from step 1 and the `[2, 2, 0]` fallback.
- **Painting twice.** A slice that adds an object but leaves its pixels in `island-base` paints both. Each slice removes the pixels it replaces in the same commit (R8), and the 4× preview shows doubled edges.
- **The trucks leave the road.** The road is redrawn in step 5 but `idrive` is fixed in CSS. The road stays on the same line, and the screenshots show both trucks on it with motion and with reduced motion.
- **Paint order.** Front pieces must follow the trucks in `items` (R5). The structural test checks the order of the groups in the compiled SVG.
- **The editor's browser tests lose their fixtures** in steps 4 and 8 (see Files). They move in the same commit. CI doesn't run e2e, so the implementer and the verifier run it locally; "NOT RUN" is not a pass.
- **No review until the end.** The owner sees the redesign only in the final PR. A rejected look then means reworking slices on the feature branch, which is the owner's accepted trade-off.
- **Alternatives not chosen.** One PR per slice (eight verifier loops for small slices) and a single PR (too large to verify in one pass, and slice 3 should be checked before building on it).

## Proof

Each slice PR pastes:

- `npm test`: `# fail 0`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`; then `git checkout src/data/accomplishments.json`.
- `npm run art`: every file `lossless`, none `OVER BUDGET`, and `git status` clean afterwards. Each new object also passes `npm run art -- --check <name>` within 64×64 and 12 colors.
- `npm run build && npm run e2e`: `# fail 0` (needs local Playwright).
- `hero-island.svg` raw and gzip bytes, before and after.
- `npm run art -- --preview hero-island` at 1× and 4×, before and after, and the home page at 1440px and 390px with no horizontal scroll.

The final PR adds the whole-island before and after, and a verifier report against R1–R12.

### Progress

- [ ] PR A: slices 1–2
- [ ] PR B: slice 3
- [ ] PR C: slices 4–5
- [ ] PR D: slices 6–7
- [ ] PR E: slice 8
- [ ] Final PR to `main`
