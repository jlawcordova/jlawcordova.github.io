# Spec: Each Range character in its own setting (from intent.md 2026-10-16)
Status: built on `feat/range-settings` in [#114](https://github.com/jlawcordova/jlawcordova.github.io/pull/114)–[#120](https://github.com/jlawcordova/jlawcordova.github.io/pull/120); approved when the owner merges [#113](https://github.com/jlawcordova/jlawcordova.github.io/pull/113). The owner approved C1–C3 at the first review. The owner asked for the intent, spec and plan to be written together and the work to start on them, so each stage is reviewed in the change's final PR.

The numbers and the lab below come from the prototype the owner reviewed on 2026-10-16: the alchemist in a brick-floored lab, building up block by block on each switch, with the auto-advance slowed to 3 seconds.

## Requirements

- **R1. Every class has its own setting.** Each of the seven `data-class` groups holds a 3×3 floor of one-level cubes and 2–4 props, with the character on the center tile as today. *(Outcome: each character in a different setting)*
- **R2. The settings are built from new blocks.** Each setting's floor is its own set of block objects, in its own material or pattern, so no two classes share a floor. The alchemist's lab uses the brick floor from the prototype. *(Outcome: made from new blocks; the owner picked the brick floor)*
- **R3. Each setting fits its character.** The settings in [Design, The seven settings](#the-seven-settings) are proposals. The owner approves or changes each one at its review. *(Open question: what fits the other six)*
- **R4. The setting builds itself when the class changes.** The floor's rows float up one at a time, left to right, starting with the row along the left cliff (row 2). Then the props and the character arrive left to right. Each piece rises from below, overshoots a little and settles, as on the hero island. *(Outcome: the characters stagger in as well)*
- **R5. Timing.** Rows are 0.08s apart. Each piece takes 0.5s, spending the first 55% rising 10 art pixels to 2 art pixels past its spot. The objects start 0.1s before the floor finishes and sweep over 0.3s. A setting has settled about 1.45s after the switch. *(The prototype's numbers)*
- **R6. The first setting builds when it comes into view.** The first time at least half of the stage is on screen, the current setting builds the same way. It doesn't build again on later scrolls.
- **R7. The carousel advances every 3 seconds,** up from 2.2, so each setting rests for longer than it takes to build. *(Open question: does the carousel need to advance more slowly)*
- **R8. The rest of the carousel stays as it is:**
  - the shared shadow under the platform stays put while the setting changes;
  - the old setting disappears at once;
  - the nameplate's pop, the A button's hop, the controls, the pause rules, keyboard behavior, copy and nameplates don't change;
  - the outfits don't change;
  - the old sideways slide of the sprite is replaced by the build.

  *(Constraints: the characters stay as they are; the carousel still works as it does today)*
- **R9. Motion never hides the Range.** With JavaScript off, or with the Motion chunk blocked, the first class's whole setting shows, fully opaque and in place. A piece's start state is set only by the call that animates it. Under `prefers-reduced-motion: reduce`, nothing builds and every piece is in place. This applies pixel-first look spec R11 and R12 to the Range's pieces. *(Constraint: the site's motion rules)*
- **R10. The art rules hold.**
  - Sources only, compiled by `npm run art`, canonical and lossless.
  - World palette only in floors and props; the outfit tier stays for objects that extend `character`.
  - No `ink` and no outlines; light from the island's side; the 32×16 tile.
  - The engine's caps: 64×64 a map, 12 colors an object.
  - Loops only from the ones the CSS already animates (`wf`, `ff`, `hf`).
  - The viewBox stays `[-51, -9, 103, 72]`, and every setting fits inside it.

  *(Constraint: the site's art rules)*
- **R11. Weight.** `range-sprite.svg` may grow to 200 KB raw and 50 KB gzip (C3). Each setting aims for at most 22 KB raw and 5 KB gzip, measured with `npm run art -- --sizes range-sprite`. The home page stays within its 150 KB gzip HTML budget, measured from `dist/`. *(Constraint: stays inline SVG)*
- **R12. One setting at a time, each approved.** The settings are drawn and reviewed one class at a time, and the owner approves each before the next starts. The plan's workflow says how. *(Constraint: each made and reviewed on its own)*
- **R13. Public-safe.** No names, lettering, logos or likenesses in any setting. Screens, boards and books show shapes and color, never text. *(Constraint)*
- **R14. The docs follow.** The design system's Motion section names the Range build-up and its numbers (C1). The pixel-art skill and the `pixel-artist` agent describe how a Range setting is built, so each new one follows the lab. *(CLAUDE.md: the design system and skill describe the site as it is)*
- **R15. Verified.** `npm run build`, `npm test`, `npm run art` and `npm run e2e` pass. Each class is screenshotted at 1440px and 390px, with no horizontal scroll. *(CLAUDE.md, Verifying your work)*

## Design

### The scene (R1, R4)

`range-sprite.mjs` keeps its four `island-shadow` pieces outside every group, shared by all classes. Each `data-class` group holds its whole setting in entrance groups, using the hero island's convention (`.claude/skills/pixel-art/SKILL.md`, Entrance groups):

```js
{
  group: { 'data-class': '4' },
  items: [
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '0' }, items: [/* cubes at [0,0], [1,0], [2,0] */] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '1' }, items: [/* [0,1], [1,1], [2,1] */] },
    { group: { class: 'enter', 'data-enter': 'ground', 'data-row': '2' }, items: [/* [0,2], [1,2], [2,2] */] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '16' }, items: [/* a prop */] },
    { group: { class: 'enter', 'data-enter': 'object', 'data-x': '0' }, items: [{ object: 'outfit-data-engineering', at: { tile: [1, 1, 0] } }] },
    // …one object group per prop, in paint order
  ],
}
```

- **Rows paint back to front.** Listing the cubes row by row, and by column within a row, still paints back to front: a cube at `[col, row]` covers only `[col + 1, row]` and `[col, row + 1]`, and both come after it (island build entrance spec, The ground).
- **Objects** come after the floor, one `object` group each, in paint order: back to front by `col + row`. Props behind the character are listed before it, and props in front after it.
- **`data-x` is the object's foot,** worked out as on the island:
  - for a tile-placed object, its tile center x, `(col − row) × 16`;
  - for a `px`-placed sprite, `at.px[0] − anchor[0] + width / 2`, rounded.
  - The character is at x 0.
  - Pieces that make one thing share one group, as the island's crane does.
- **The grass platform leaves the Range** once every class has its own setting. `tile`, `block`, `block-left`, `block-right`, `tree` and the flowers stay in the library (the island and `library-demo` use them), and a setting may reuse any library object, such as one of the island's clouds.

### Floor sets (R2, R10)

Each setting has three block objects, `block-<setting>`, `block-<setting>-left` and `block-<setting>-right`, following the island's cliff joint rules:

| Position | Object |
| --- | --- |
| Inland `[0,0]`, `[1,0]`, `[0,1]`, `[1,1]` and the front corner `[2,2]` | `block-<setting>` |
| Left cliff `[0,2]`, `[1,2]` | `block-<setting>-left`: its right column 0 copies its left column 14 |
| Right cliff `[2,0]`, `[2,1]` | `block-<setting>-right`: its left column 14 copies its right column 0 |

- **Faces.** The top is the lightest shade, the left face mid and the right face darkest (R28), with any courses or seams lining up across every joint.
- **Hidden faces may be plain.** An inland cube's sides only show while it floats up, and then only a row or two during the overshoot. To save bytes, a face that's hidden at rest may be plain, so a setting may add a `block-<setting>-corner` with full sides for `[2,2]` and give the inland cubes plain sides (the lab measured −2.7 KB this way). The settled setting must look the same either way.
- **The lab's set** is `block-lab`, `block-lab-left` and `block-lab-right`. The top is running-bond brick, `path-2` with `path-3` joints. The left face has `path-3` brick with `path-4` mortar courses, and the right face `path-4` with `soil-3` mortar.

### Props (R1, R10, R13)

- **Names.** Props are `prop-<class>-<name>` objects, the existing convention.
- **Where they go.** Two to four per setting, balanced left and right of the character. None may cover the figure, which spans about x −12 to +6 and y 0 to 24 in scene pixels, with its held prop on its left.
- **Headroom.** Tall props go at the back, where the top of the viewBox is y −9.
- **Loops.** A prop may use one of the existing loops (`wf` ×5, `ff` ×4, `hf` ×6), with frame 0 as its rest pose.

The lab's props are:
- a bookcase at `[1,0]`;
- an alembic bench at `[0,1]`;
- a cauldron at `[1,2]`, with a bubbling `wf` brew, under the alchemist's flask;
- a tome with a candle at `[2,1]`.

### The seven settings (R3)

These are proposals. Each one's review settles its theme, floor and props, and the agent may refine them. Every floor differs from the others, in world colors only.

| Class | Character | Setting | Floor | Props |
| --- | --- | --- | --- | --- |
| Front-end | Mage | A mage's study at the top of a tower | Patterned tiles with a gold inlay | A crystal ball on a pedestal; a lectern with an open spellbook; a star globe or candles |
| Back-end | Developer with a laptop | A server room | Raised-floor panels with vents | Two server racks with status lights; a cable tray or a desk with a mug |
| UX Design | Painter | An art studio | Floorboards with paint drips | An easel with a canvas; a table of paint pots; a stool |
| Cloud & DevOps | Engineer in a hard hat | A worksite under a cloud | Steel deck plates or packed gravel | A traffic cone; a toolbox; scaffolding; one of the island's clouds overhead |
| Data Engineering | Alchemist | A lab (built, from the prototype) | Brick | Bookcase, alembic bench, cauldron, tome with candle |
| Security & Governance | Knight | A castle rampart | Large flagstones | Crenellations along the back edges; a banner; a torch or weapon rack |
| Project Management | Person in a suit | An office | Carpet tiles or parquet | A desk; a board of blank sticky notes; a potted plant |

### While settings are being added

On the feature branch, the classes without their own setting yet keep the grass platform:
- **The shared grass.** The grass platform, its tree and its flowers sit in one shared group, `{ 'data-setting': 'grass' }`, with the same entrance groups.
- **Hiding it.** `range.css` hides that group for each class that has its own setting, with one selector per class (`.range[data-current="4"] .range__sprite g[data-setting="grass"]`).
- **Building it.** The build script includes the shared group's pieces while it shows.
- **Removing it.** The last step removes the group, its CSS rule and the script's clause. `main` never ships the mix.

### The build (R4–R9)

- **`src/lib/island-entrance.mjs`** keeps the schedule. `schedule(pieces, timing)` takes the timing as an optional second argument, defaulting to the island's `TIMING`, and an optional `sweep` sets the objects' span. `RANGE_TIMING` sits beside `TIMING` with R5's numbers:
  - `start: 0`, `rowGap: 0.08`, `duration: 0.5`;
  - `rise: 10`, `overshoot: 2`, `peak: 0.55`;
  - `objectLead: 0.1`, `sweep: 0.3`.

  The island's numbers don't change. The file keeps its name, and its header says it schedules both.
- **`Range.astro`'s script:**
  - **Build.** `build()` reads the current class's `.enter` groups (plus the shared grass group's while it shows), asks `schedule(…, RANGE_TIMING)` for their timing, and plays each with `play()` from `src/lib/motion.ts`. That's the island's float: `opacity [0, 1, 1]`, `y [10, −2, 0]`, times `[0, 0.55, 1]`, with `easeOut` then `SETTLE_EASE`.
  - **On each switch,** `show()` first completes any build still running, then starts the new one, so a quick double press never leaves a piece half-risen.
  - **First view.** An `IntersectionObserver` at a threshold of 0.5 builds the first setting once, then disconnects.
  - **The interval** is 3000 ms.
  - **Prototype extras dropped.** The prototype's `?range-interval=` parameter doesn't ship.
  - **Unchanged.** The nameplate pop and the A hop.
- **Units.** Motion sets `y` as a transform on each SVG group, in the SVG's own units. The sprite renders at 3×, so 10 art pixels is 30 CSS pixels, as on the island.
- **CSS.** `range.css` still shows one `data-class` group at a time. Under reduced motion, `play()` does nothing, so no CSS is needed.

### Weight (R11)

- **Measured.** Today `range-sprite.svg` is 29.9 KB raw and 6.2 KB gzip. With the shared grass and the lab it is 56.7 KB and 12.0 KB, and the lab alone is 21.1 KB and 4.6 KB.
- **Projected.** Seven settings at about 21 KB each, plus the outfits and shadow (about 20 KB), come to about 170 KB raw and 36 KB gzip.
- **The new cap.** `OUTPUT_BUDGETS` in `scripts/optimize-pixel-art.mjs` gives `range-sprite.svg` 200 KB raw and 50 KB gzip, as it does the hero island its own. The R8 test in `range-art.test.mjs` moves to the same numbers.
- **The home page** inlines the sprite. Its HTML is about 34 KB gzip today, so it lands near 70 KB gzip, within the 150 KB budget. The final PR measures it from `dist/`.

### Docs (R14)

- **Design system** (`docs/design-system/README.md`, Motion): the Range's build-up becomes the second named longer entrance, with its numbers, next to the island's (C1). The island's line "don't reuse them for other entrances" stays true, since the Range has its own numbers.
- **Pixel-art skill:**
  - "The art that's already on the site" describes the Range as seven settings: the shared shadow, each class's floor set, its props and its outfit, in entrance groups with their foot x;
  - a short "Range settings" part under Island and Range look gives the floor-set and prop rules above, so each new setting is drawn the same way;
  - the before-PR checklist asks for each touched class at 1× and 3×.
- **`pixel-artist` agent:** the Range test pins and the Range hand-off, which adds the floor set at 6× and the setting's `--sizes`.

### Tests

**Tests that change** (R12 of the isometric Range spec: the proof changes with the promise; none is skipped or deleted):
- **`range-art.test.mjs` R1.** "The platform is laid from the island blocks" becomes the rule for the settings:
  - outside the groups, the scene places only `island-shadow`;
  - each class group's floor is three `ground` groups, rows 0–2, of three one-level cubes each, at their own row;
  - every `object` group's `data-x` matches its objects' feet.

  Until the last step, the shared grass group is allowed, with the same rules.
- **`range-art.test.mjs` R8:** the budget moves to 200 KB raw and 50 KB gzip.
- **`range-classes.test.mjs` and `pixel-art-roundtrip.test.mjs` R2:** they read only the groups with `data-class`, and find each outfit by flattening the nested entrance groups.
- **`pixel-art-cli.test.mjs` R38:** the `--check scenes/range-sprite` line is re-pinned in each step that changes the scene.

**New tests:**
- **The schedule** (`scripts/island-entrance.test.mjs`):
  - `RANGE_TIMING` rows go left to right, 0.08s apart;
  - objects start 0.1s before the floor lands and sweep left to right over 0.3s;
  - a setting settles by 1.5s;
  - the island's numbers are unchanged.
- **Every class has its own setting** (last step): seven class groups, each with its own floor set, and no shared grass.
- **Settled pixels for the transition.** Moving the grass platform into its shared group, with its inland tiles as cubes, paints the same pixels for classes 0–3, 5 and 6 as before. This is checked once, in the groundwork step, like the island's R2 test. The prototype's preview was byte-identical.
- **e2e:**
  - `range.e2e.mjs`: after a switch, the current class's `.enter` groups end fully opaque with no transform, and only that class's groups show.
  - `motion.e2e.mjs`: adds `.range__sprite .enter` to the home page's list, so with JavaScript off, with Motion blocked and under reduced motion, every visible group shows at once.

## Areas of concern

- **C1. A second longer entrance.** The design system's rhythm is 0.12–0.5s durations and "never long sweeps", and the island's build-up is its one named exception. The Range's pieces take 0.5s, which is inside the rhythm, but a whole build runs about 1.45s and repeats on every switch. *Proposed:* the design system names it as a second exception with its own numbers. The owner confirms at the first review.
- **C2. A slower carousel.** At 3 seconds a full cycle takes 21s, up from 15.4s. The earlier class-characters intent asked whether 2.2s suited seven classes. *Proposed:* 3s, as in the prototype, so a setting rests for about 1.5s after it builds. The owner confirms at the first review; 2.5–3.5s all work with these numbers.
- **C3. A bigger sprite budget.** Every SVG but the island has a 100 KB raw and 25 KB gzip budget (redesign spec §8, §12). Seven brick-level settings need about 170 KB and 36 KB.
  - *Proposed:* `range-sprite.svg` gets its own 200 KB and 50 KB budget, as the island did. The isometric Range spec's R8 already let the owner raise it, and the home page stays within its budget.
  - *Alternatives:* cheaper floors, such as plain tops or a shared floor across some settings, which contradicts R2; or loading settings on demand, which breaks the inline-SVG rule.
  - The owner decides at the first review.
- **C4. The Range moves about half the time.** With a 1.45s build every 3s, the stage is building about half the time while the carousel runs. Hover, focus and the pause control already stop the auto-advance, and reduced motion stops everything. *Proposed:* accept it, as the owner did in the prototype.
- **C5. The grass platform leaves the Range.** The tests that pin it (`range-art.test.mjs` R1, the flowers and `tile`) are replaced by the settings' rules, not dropped. Its objects stay in the library.
- **C6. Hidden faces cost bytes,** as on the island. Plain hidden faces are allowed, so a setting can trade them for budget without changing the settled look.
- **C7. The old setting vanishes rather than leaving.** *Proposed:* it disappears at once, which keeps a switch quick and its code simple. Animating it out would double the motion per switch.
- **C8. One setting at a time is slower than in parallel.** The owner chose it so that each review can shape the next, and what a review teaches goes into the skill before the next setting starts.
- **C9. Public safety.** Screens, boards and books carry no lettering (R13). The sticky notes and a server's lights are color only.

## Open questions

- *What setting fits each of the other six?* Proposed in The seven settings (R3); the owner decides at each one's review.
- *Does the carousel need to advance more slowly?* Yes, every 3 seconds (R7, C2).
