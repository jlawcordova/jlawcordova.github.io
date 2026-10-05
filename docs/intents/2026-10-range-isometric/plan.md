# Plan: Isometric Range (from intent.md 2026-10-05)

Status: approved.

Plans [`spec.md`](spec.md) (R1–R13, approved in #98). The work runs on `feat/range-isometric`: PRs 1 to 3 merge into it and PR 4 takes it to `main`. The owner reviews the platform (after PR 1) and the first character (after PR 2) before the next stage starts.

## Files that change

- **PR 1, platform:**
  - `src/assets/pixel-art/source/scenes/range-sprite.mjs`: the block platform, the tree and the flowers replace `range-island`. Groups and outfit placements are untouched.
  - `src/assets/pixel-art/source/objects/flower.mjs` (new, plus `extends` color variants in the same file or `flower-b/c.mjs`): the required flowers, world colors, no `ink`. `library-demo.mjs` and its engine-test object list gain `flower` (it is generic).
  - `src/assets/pixel-art/source/objects/range-island.mjs` (deleted), `src/assets/pixel-art/range-sprite.svg` (regenerated).
  - `scripts/pixel-art-cli.test.mjs`: the cases that use `range-island` as the legacy sample move to a legacy object the test writes into its temporary copy; the `range-sprite` scene line (`8 items · 9 objects`) is updated.
  - `scripts/pixel-art-roundtrip.test.mjs`: drop the `range-sprite.src.svg` fixture assertion. `scripts/fixtures/pixel-art/range-sprite.src.svg` (deleted).
  - `scripts/e2e/editor.e2e.mjs`: the two cases that open `range-island` move to another large object. `src/components/lab/lab.ts`: comment only.
  - `scripts/range-art.test.mjs` (new): the platform uses only the island's block objects, no legacy object in `range-sprite`, viewBox is `[-51, -9, 103, 72]`, compiled SVG within the size limit.
  - `.claude/skills/pixel-art/SKILL.md`: "The art that's already on the site" describes the Range as a block platform (no `range-island`, no legacy text there).
- **PR 2, first character (the knight, Security & Governance):**
  - `objects/character.mjs` redrawn isometric (no outline, no `ink`); `objects/outfit-security-governance.mjs` redrawn on it; a `prop-*` object only if a prop is too big to hold.
  - `scenes/range-sprite.mjs`: the class-5 group (and its prop, if any). Its SVG is regenerated.
  - `src/lib/pixel-art/engine.mjs` and its tests: raise the character figure cap and, if the knight needs it, the color or SVG size cap (R3a, R8), to the knight's measured need, and nothing else.
  - As built: no cap was raised (the knight paints 22×27 in 8 colors). The base's anchor moved to its ground point (`[20, 29]`), so all seven placements in `range-sprite.mjs` changed from `px [-24, -6]` to `tile [1, 1, 0]` together, and `scenes/outfit-preview.mjs` places its outfits by `tile` too. Three tests pinned the old drawing and were repointed (R12): the `pixel-art-cli` R38 case breaks the base's `a` key (`soil-4`, since `ink` is gone), and the two editor e2e cases (R17 row override, R27 color meter) pick their sample from the current sources instead of pinning the old knight's 10 colors and unoverridden rows.
  - After the owner's review: `.claude/skills/pixel-art/SKILL.md` gets the "Isometric characters" part and the size-cap text; `.claude/agents/pixel-artist.md` gets the Range pins, the Range hand-off and widened island-only wording.
- **PR 3, the other six:** `objects/outfit-{front-end,back-end,ux-design,cloud-devops,data-engineering,project-management}.mjs`, new `prop-*` objects where a prop is too big to hold, `scenes/range-sprite.mjs` (prop placements), the regenerated SVG, `scripts/pixel-art-roundtrip.test.mjs` and `scripts/range-classes.test.mjs` only if a pin needs updating.
- **PR 4, final to `main`:** `docs/intents/2026-10-redesign/spec.md` (one-line note if it calls the Range art legacy), `plan.md` updated to what was built.

Not touched: `Range.astro`, `range.css`, `home.ts`, `pixel-art.css`, the island, the palette, the rest of the engine, the legacy palette and import tool (the [retire-legacy intent](../2026-10-retire-legacy-art/intent.md) owns those).

## Order of work

```
main ── feat/range-isometric ───────────────────────────── PR 4 (owner merges) ──▶ main
          ├─ PR 1  platform         ◀─ feat/range-isometric-platform
          │          ▲ owner review (previews + lab)
          ├─ PR 2  first character  ◀─ feat/range-isometric-knight
          │          ▲ owner review → then skill + agent rules
          └─ PR 3  six characters   ◀─ feat/range-isometric-characters
                     (six subagents in parallel worktrees, gathered into one branch)
```

0. **Plan.** Create `feat/range-isometric` from `main`; commit `plan.md` there.

**PR 1: platform (steps 1–3)**

1. **Flower and platform.** Add `flower`, lay the 3×3 block platform in `range-sprite.mjs` (`tile` interior, `block-right`, `block-left`, `block` corner, `island-shadow`), the `tree`, and the flowers; characters still stand at the center tile. Delete `range-island`. Run `npm run art`.
2. **Tests follow.** Repoint the legacy-sample tests, update the scene line, delete the fixture, add `range-art.test.mjs`, update the e2e cases and the `lab.ts` comment.
3. **Skill text for the platform.** Update the Range paragraph in `SKILL.md`.

**PR 2: first character (steps 4–6)**

4. **Redraw `character` and the knight.** Isometric, no outline; the old six outfits are not touched and will render wrongly on the base until PR 3 (they extend the shared `character`; this is on the feature branch only and the knight's group is the one under review).
5. **Raise caps only as the knight needs.** Engine caps and their tests, in the same commit as the figure that needs them.
6. **Rules from the review.** After approval, write "Isometric characters" into the skill and the Range pins and hand-off into the agent.

**PR 3: six characters (steps 7–8)**

7. **Six outfits in parallel.** Each subagent redraws one outfit (and its prop) on the approved base.
8. **Gather.** The main session copies their files onto `feat/range-isometric-characters`, adds the prop placements to the scene, runs everything and opens one PR.

**PR 4:** the main session opens `feat/range-isometric` → `main` with the whole proof pasted.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 0 | main session | `feat/range-isometric` | plan committed |
| 1–3 | `pixel-artist` agent draws 1; main session does 2–3 | `feat/range-isometric-platform` | PR 1 opened, **owner review** |
| 4–5 | `pixel-artist` agent, in the same slice's worktree | `feat/range-isometric-knight` | PR 2 opened, **owner review** |
| 6 | `pixel-artist` agent drafts, main session commits | same branch | PR 2 merged |
| 7 | six `pixel-artist` subagents, one per class, in parallel | one worktree each, `feat/range-isometric-<class>` | files handed to main session |
| 8 | main session | `feat/range-isometric-characters` | PR 3 merged |
| PR 4 | main session | `feat/range-isometric` | **owner merges** |

- **Merge rules.** The main session merges PRs 1–3 into `feat/range-isometric` once checks and CI pass and, for PRs 1 and 2, after the owner's go-ahead. It merges `main` into `feat/range-isometric` before each slice if `main` moved. Only the owner merges PR 4.
- **File ownership (step 7).** Each subagent edits only its own `outfit-<class>.mjs` and its own `prop-<class>-*.mjs`. Shared files (`character.mjs`, the scene, the engine, tests, skill, agent) belong to the main session. A subagent that needs one stops and reports, and the main session edits it. Prop placement in the scene is done by the main session from the subagents' reports.
- **Owner reviews.**
  1. **After PR 1:** Range previews at 1× and 4× and the home-page section at 1440px and 390px, and a running lab on `range-sprite`. Feedback goes back to the agent (resumed) and the same PR is updated.
  2. **After PR 2:** the knight on the platform at 1×, 3× and 4×, in the lab, and the engine-cap numbers. Approval fixes the base, the proportions and the face layout for the other six. Rules are only written into the skill and agent (step 6) after it.
  - No pause after PR 3. The owner reviews the six in PR 4.
- **Independent review.** A `verify-change` run on PR 4, because it changes engine caps that other work builds on and is the large final change. Blocking findings are fixed before the owner merges.
- **First character.** The knight, because its outfit already exists and has the most props (armor, shield, sword), so it tests the figure cap first. The owner can ask for the mage instead before step 4.

## Risks

- **Old outfits break on the new base (PR 2).** The six old outfits are `rows` overrides tuned to the old `character`, so they render wrongly on the redrawn one until PR 3. This is on the feature branch only. Their checks (`--check`, class order) still pass if the base keeps its 32-wide canvas, and the knight's group is the one reviewed. If `--check` fails for an outfit, stop and report rather than editing it.
- **Figures read poorly at 1× with no outline (C1, C2).** Handled by the first-character review and a lighter rim on the lit side. If a prop is unreadable, it is a separate `prop-*` object.
- **The size and character caps (R3a, R8).** Raised only to the measured need, with their engine tests updated in the same commit. The riskiest step is 5; if a raise would affect the island's checks, stop and report.
- **Home page weight (C3).** `npm run art -- --sizes range-sprite` after PR 1 and PR 3; the result is reported against the redesign spec §12 budget.
- **Tests that pin `range-island` (R12).** Repointed to a test-built legacy object, never skipped or deleted.
- **Parallel subagents drift in style.** All six read the approved skill section and the knight; the final review compares them side by side on `outfit-preview`.

## Proof

- `npm run art` reports every file `lossless` and none `OVER BUDGET`; `npm run art -- --check range-sprite` passes; `--sizes range-sprite` pasted in PRs 1 and 3.
- `npm test` shows `# fail 0`; `npm run build` ends with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`; `npm run e2e` shows `# fail 0`.
- Before and after previews at 1× and 4×, for all seven classes in PR 3 and PR 4.
- Screenshots of the Range section at 1440px and 390px with no horizontal scroll, for the first and last class (PR 4: all seven).
- `grep` shows no `legacy` object left in `range-sprite`, and `range-island` and `scripts/fixtures/pixel-art/range-sprite.src.svg` are gone.
- `verify-change` comment on PR 4 with no blocking findings.

## As built

- **PR 1 (#100), platform:** as planned.
- **PR 2 (#101), base and knight:** as planned, with the departures noted under "Files that change": no engine cap was raised, the base's anchor moved to its ground point so every outfit is placed by `tile [1, 1, 0]`, `outfit-preview` places by `tile` too, and three tests that pinned the old drawing were repointed (R12). The owner approved the knight and its five open choices as drawn (silver-3 helmet side, open helm, full-cube head, center tile, the 1× trade-off). Step 6 then wrote "Isometric characters" into the skill and the Range pins and hand-off into the agent.
- **PR 3 (#102), the other six:** six `pixel-artist` agents in parallel, one worktree each, editing only their own outfit. Every prop fits on its figure, so there are no `prop-*` objects and `range-sprite.mjs` is unchanged by this slice. No test needed changing. Five outfits are above the 6–8 color aim (10 to 11), and Data Engineering is at the 12-color cap. The owner accepted the color counts and approved the six when merging it.
- **PR 4:** `docs/intents/2026-10-redesign/spec.md` needs no note: it never calls the Range art legacy.
- **Weight:** `range-sprite.svg` went from about 29 KB raw and 6 KB gzip (legacy platform) to 29,774 B raw and 6,180 B gzip. The built home page is 28,774 B gzip of HTML, against the redesign spec §12 budget of 150 KB gzip.
- **Review images:** the six classes have before and after images at 1× and 3×, which is the stage's scale and what the agent's Range hand-off asks for, instead of the 1× and 4× in Proof. The knight also has 4×. The home-page screenshots cover all seven classes at 1440px and 390px.
- **README:** the `scripts/fixtures/pixel-art/` row was removed with the fixture it described (PR 1), since a deleted file's mentions go with it.
- **Independent verification on PR 4:** one blocking finding. Nothing pinned R3's "no `ink`" on the Range, so `scripts/range-art.test.mjs` gained an R3 test over every object the scene places (it fails if `character` paints `ink`), and its R1 test now requires `island-shadow` too. The `lab.ts` comment and the editor e2e's "largest map" now name `footer-dirt` (64×48), the largest committed object, instead of `house`.
