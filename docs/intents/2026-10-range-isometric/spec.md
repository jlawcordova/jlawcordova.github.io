# Spec: Isometric Range (from intent.md 2026-10-05)
Status: approved.

## Requirements

Each requirement traces to the [intent](intent.md)'s Problem and Proposed outcome.

- **R1. The platform is built from the island's blocks.** The Range's land is a scene made of the library blocks the hero island uses (`tile`, `block`, `block-left`, `block-right`, and the island's `island-shadow`), laid on the 32×16 grid. `range-island` is deleted, and so is its legacy color set. *(Outcome: land from the same blocks)*
- **R2. The platform keeps its job.** It is a grass platform with soil sides that the character stands on, and it keeps a tree and flowers like today's. All of it is redrawn in the island's look (grass tufts, a grass band over soil, no outline). *(Outcome: one world)*
- **R3. All seven characters are redrawn isometric.** Front-end, Back-end, UX Design, Cloud & DevOps, Data Engineering, Security & Governance and Project Management are each redrawn, not adjusted. A character is built the way the island's clouds are: short-sided stacked cubes, lit top, mid left face, dark right face, with no outline and no `ink`. Each reads as the same person in different gear, and as a figure standing on the platform's grid, not a flat front-on sprite. The owner decided: no outlines. *(Outcome: isometric characters)*
- **R3a. The figure cap grows to fit.** The 24×32 cap on a character's painted figure (and the 12-color cap on one object, if a figure needs more) is raised in the engine to whatever the redrawn figures and props need, in the same slice that needs it, with its engine test updated to the new number. It is not raised for anything else. *(Decided by the owner)*
- **R4. The classes stay recognizable.** Each class keeps its character, costume cue and prop from [Range class characters](../2026-10-sixth-range-class/spec.md): a mage, a developer with a laptop, a painter, an engineer in a hard hat, an alchemist, a knight, and a person in a suit. A prop too big to hold is its own object placed beside the figure. *(Constraint)*
- **R5. Same engine, same tools.** All of it is `.mjs` sources compiled by `npm run art`, checked with `--check`, `--preview` and `--sizes`. No new engine features, no new colors and no new dependency. The world and outfit palettes are unchanged. The engine's size limits (R8 and the character cap in R3a) may be raised, and only those. *(Constraint: same engine)*
- **R6. The carousel works as today.** `range-sprite` still has one `data-class` group per class, numbered in `rangeClasses` order, each placing one outfit object that extends `character`. `range.css`, `Range.astro`, `home.ts`, the nameplate colors and the pager are not edited, unless R8 needs a sprite size change. *(Constraint)*
- **R7. Same footprint.** The sprite's `viewBox` stays `[-51, -9, 103, 72]`, so the stage and its 309px render width don't change. If the new platform can't fit, the plan says so and the owner decides before the box changes. *(Constraint: layout)*
- **R8. Weight is measured, and the engine cap may rise.** `range-sprite.svg` is at most the engine's cap for an SVG other than the island, 100 KB raw and 25 KB gzip, unless the art needs more. Today it is about 29 KB raw and 6 KB gzip. If it needs more, the cap for this scene is raised in the engine with its test, and the plan reports the new size against the home page budget (redesign spec §12). The owner decided that raising it is fine. See C3. *(Constraint: no heavier art)*
- **R9. Accessibility, motion and safety are unchanged.** The art stays decorative inline SVG with no script, link or text. Only the current class shows, and without JavaScript class 0 shows. The art adds no animation. The art carries no names, lettering or likenesses. *(Constraint)*
- **R10. The art agent and skill match.** The `pixel-art` skill and the `pixel-artist` agent describe how to draw in this look, including isometric characters and a Range platform, so the next character is drawn the same way without re-deriving it. The Range is drawn by the `pixel-artist` agent following them. *(Approach, from the owner)*
- **R11. Only the Range.** The change covers the Range section's art: the platform, the seven characters and their props. The hero island, the console and controls, copy, the other pixel art and the editor are not changed beyond what removing `range-island` forces (R12). *(Out of scope, from the owner)*
- **R12. The proof changes with the promise.** Tests that pin the legacy `range-island` or the current characters are updated or repointed in the same commit that changes the art they check, never skipped or deleted (see Checks). *(Constraint)*
- **R13. Independent verification** on every PR, as in `CLAUDE.md`. *(Constraint)*

## Design

### What is there today

- **`scenes/range-sprite.mjs`** is `range-island` at `px [-49, -1]` plus seven `data-class` groups, each placing one `outfit-*` at `px [-24, -6]`. The viewBox is `[-51, -9, 103, 72]`.
- **`range-island`** is the last legacy object: a 99×62 map in 21 legacy colors, with an `ink` outline, a tree and flowers. It is the platform's ground, sides and shadow in one image.
- **`character`** is a 32×32 front-on sprite (skin, shirt, trousers) with an `ink` outline, and the seven `outfit-*` objects extend it with `rows` overrides. Figures are about 14×23 px, under the 24×32 cap.
- **The island** is built of blocks: `tile` for flat tops, `block-left`, `block-right` and `block` for the cliffs, and clouds as stacked cubes. The `pixel-art` skill's "Hero island look" is its recipe.

### Platform

Rebuild the platform inside `range-sprite.mjs` from the island's blocks, the way `hero-island.mjs` lays its land:

- A square platform on the tile grid, sized to fit R7. At 32 px a tile, three tiles a side is 96 px wide, which fits the 103 px box and matches `range-island`'s 99 px. The plan confirms this with a preview.
- `tile` for the interior, `block-right` on the right cliff, `block-left` on the left cliff and `block` at the front corner, so the joints are hidden by the edge pieces, not by shading tricks.
- `island-shadow` pieces under the front edges, as the island has.
- The tree uses the library `tree` object, placed by `tile`. Flowers are required: a few small flower objects (a new library object, in world colors, two or three color variants made with `extends`) scattered on the grass, as today's platform has. They are placed by `px` where needed so they don't line up on the grid, and they stay in the island's no-outline look.
- Characters stand at the platform's center tile and are placed by `tile`, so they sit on the grid like everything else.

Because `range-island` goes, the `data-class` groups must still paint after the platform and the tree's back half, and in front of anything behind them. The platform itself is not a `data-class` item.

### Characters

The character is rebuilt on the same pattern as the island's clouds (see "Shapes" in the skill): stacked cubes, each with a lit `skin` or fabric top, a mid left face and a dark right face. A figure is a head cube, a body block and short legs, about 14 to 20 px wide on the 2:1 grid, with the face and hair as texture on the cube's left face (the visible front, lit from the left). The `pixel-artist` agent picks the exact proportions in previews, within these limits:

- **Same structure.** `character` is redrawn in isometric form, and each `outfit-*` still `extends: 'character'` with its own keys and `rows`. Outfit colors stay in the outfit palette tier and are used only in objects that extend `character` (engine R26).
- **No outline.** No `ink`, as on the island. Faces are set apart by shade: top lightest, left mid, right darkest. Where a figure's light shade matches the grass, it gets a lighter rim on the lit side.
- **Caps.** A figure fits the cap as raised by R3a (24×32 px today), and an object uses at most 12 colors (aim for 6 to 8), unless R3a raises that too.
- **Props.** A held prop (staff, laptop, brush, sword, shield) is drawn in the same isometric look on the figure. A prop too big to hold (the server rack, easel, flask rack and the like) is its own `prop-<name>` object, placed by `tile` next to the figure, and painted inside that class's `data-class` group so it shows and hides with it.
- **Recognizable at 1×.** A class must still read at the stage's 309px width, which is 3×, and at 1×.

The classes and their cues are the table in [Range class characters](../2026-10-sixth-range-class/spec.md#classes-and-characters), where the owner's later changes (Back-end as a developer with a laptop, Data Engineering as a medieval alchemist) win over the first table.

### Agent and skill (R10)

- **`.claude/skills/pixel-art/SKILL.md`:**
  - "Hero island look" becomes the look for the island and the Range, with a new "Isometric characters" part that records R3's rules once decided in review (proportions, face layout, how an outfit changes the head, torso and legs, how a prop is placed).
  - "The art that's already on the site" describes the Range as a block platform plus isometric characters, and drops its `range-island` and legacy text.
  - The pitfalls and the pre-PR list drop the legacy-import notes that no longer apply.
- **`.claude/agents/pixel-artist.md`:**
  - Its look section points to the updated skill, and its "Test pins" section gains the Range's pins: the class order, one outfit per group, the outfit-and-character non-legacy checks and the `range-sprite` viewBox and size checks.
  - It gains a Range hand-off: the review images are the Range scene at 1× and 3× for each of the seven classes, and the lab scene to open is `range-sprite`.
  - Its hero-island-only wording ("no `ink` on hero-island objects", the island's byte caps) is widened to say the island and the Range objects.
- The agent drafts these changes from what it learns while drawing, as in the [hero island detail](../2026-10-hero-island-detail/pixel-artist-agent.md) change. The owner reviews them before the next stage.

### Files touched

- **Art:** `scenes/range-sprite.mjs`, `objects/character.mjs`, the seven `objects/outfit-*.mjs`, new `prop-*` objects only where a prop is too big to hold, and `objects/range-island.mjs` (deleted). The compiled `range-sprite.svg` is regenerated, never hand-edited.
- **Docs and agents:** the `pixel-art` skill, the `pixel-artist` agent, and `docs/intents/2026-10-redesign/spec.md` if it describes the Range art as legacy (a one-line note, not a rewrite).
- **Tests and the editor's comments:** see Checks.
- **Engine, only for R3a and R8:** the character and size caps in `src/lib/pixel-art/engine.mjs` and the engine tests that assert them. Nothing else in the engine changes.
- **Not touched:** `Range.astro`, `range.css`, `home.ts`, `pixel-art.css`, the island scene and objects, the palette, and the rest of the engine.

### Checks

- **Kept as they are:** the class order and group tests in `scripts/range-classes.test.mjs`, the roundtrip test that each group places one outfit extending `character`, and the engine tests for characters and outfits.
- **Changed because the caps rise:** the engine tests that pin the 24×32 character cap and the size caps (engine spec R27), and the skill's size-cap text.
- **Changed because they point at `range-island`:** the `pixel-art-cli` tests that use it as their legacy sample (its `99×62 · 21 colors (legacy, no cap)` line, the "cannot be loaded" cases and the `--check` of the whole scene), and the editor e2e that opens it. They move to a legacy object the test builds itself in its temporary copy, so the engine's legacy tier stays covered.
- **Changed because the scene changes:** the `range-sprite` scene line (`8 items · 9 objects`) in `pixel-art-cli.test.mjs`, and the roundtrip fixture `scripts/fixtures/pixel-art/range-sprite.src.svg`, which pins the old pixels. Its R10 round trip was already retired by the previous Range change, so the fixture is deleted with `range-island`.
- **Added:** a check that `range-sprite` places no legacy object, that its viewBox is `[-51, -9, 103, 72]`, that the compiled SVG is within R8, and that the platform uses only the island's block objects.
- **Not changed:** a comment in `src/components/lab/lab.ts` names `range-island` as the largest map. The comment is updated, and the limit it describes is not.

### Proof for every PR

- Before and after previews of the Range scene at 1× and 4×, for all seven classes.
- Screenshots of the home page's Range section at 1440px and 390px, with no horizontal scroll, for at least the first and the last class.
- The tails of `npm run art` (every file `lossless`, none `OVER BUDGET`), `npm test` (`# fail 0`), `npm run build` (0 errors, 0 warnings, 0 hints, `[build] Complete!`) and `npm run e2e` (`# fail 0`), plus `npm run art -- --sizes range-sprite`.

## Areas of concern

- **C1. Outlines. Resolved: no outlines.** [Range class characters](../2026-10-sixth-range-class/intent.md) and the skill keep the Range sprite and its outfits outlined in `ink`, while R3 here drops the outline to match the island's clouds. The intent asks for the clouds' look, and the island forbids `ink`, so this spec follows the intent. The owner confirmed that the Range characters lose their outline. At 1× a figure with no outline has less contrast on the grass, so the shade steps and the lighter rim in Design carry that, and the agent checks it in previews.
- **C2. Figure size versus detail. Resolved: the cap grows (R3a).** An isometric figure built from cubes has less room for a face and a prop than a front-on sprite. The owner allowed the figure budget to grow as far as is needed, so detail isn't traded away. The plan still reviews one class first (the knight or the mage) before drawing all seven, so a problem shows up once.
- **C3. Weight.** Textured blocks cost more bytes than one flat map. The engine's cap (100 KB raw, 25 KB gzip) is far above today's sprite (about 29 KB raw, 6 KB gzip), but the Range ships on the home page, whose budget is in the redesign spec §12. The owner decided that the engine and gzip limits may be raised if needed (R8). The plan measures the sprite against the home page budget with `--sizes` after the platform slice and reports the final numbers.
- **C4. Legacy goes away. Resolved: separate change.** Deleting `range-island` leaves no legacy object in the site. Retiring the legacy palette, `scripts/import-pixel-art.mjs` and the engine's legacy tier is its own intent, [Retire legacy pixel art](../2026-10-retire-legacy-art/intent.md). This spec leaves them alone (R11), and the engine tests cover the tier through a test-built object until that change lands.
- **C5. Agent and skill edits shape the art. Confirmed by the owner.** R10 has the agent update its own rules while it draws. The rules are only trustworthy after the owner reviews the first class, so the skill's "Isometric characters" part is written after that review, not before, and the plan names that pause.

## Open questions

- **From the intent: does "the land" mean the platform each character stands on, and does the redo cover all seven characters?** Answered by the owner: yes to both (R1, R3).
- **Q1. A dark rim for contrast?** Answered by the owner: no outlines (C1, R3).
- **Q2. Which scenery stays on the platform?** Answered by the owner: the tree and the flowers, both required (R2, Design).
- **Q3. Is the engine's size cap enough for the Range?** Answered by the owner: it can be raised if needed (R8, R3a).
- **Q4. How is the legacy tier retired?** Out of this change. Carried to [Retire legacy pixel art](../2026-10-retire-legacy-art/intent.md).
