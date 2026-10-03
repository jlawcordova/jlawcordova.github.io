# Spec: Range class characters (from intent.md 2026-10-03)
Status: approved.

## Requirements

Traced to the [intent](intent.md). Each is checkable.

- **R1. Seven classes.** `rangeClasses` in `src/data/home.ts` has seven entries, in the order in [Design](#classes-and-characters). The carousel shows class N of 7. *(Outcome)*
- **R2. Each class is a character.** Every class has an outfit object that extends `character`, with one costume cue and one prop, in the shared pose and silhouette. The Security & Governance knight is kept as it is. *(Outcome; constraint: still professional)*
- **R3. The base character is off legacy colors.** `objects/character.mjs` no longer has `legacy: true` or any `c-<hex>` key. It uses world colors only, with its body, pose and proportions unchanged. Any shade change is to the nearest world shade and is shown in before and after previews. *(Constraint; outcome)*
- **R3b. The character cap is raised.** The engine's `CAPS` for a character's painted figure go from 16×24 to 24×32 (width × height), in `src/lib/pixel-art/engine.mjs`, its error message and tests, engine spec R27 (as an update note) and the `pixel-art` skill, in one step before any outfit. The body stays about the same size, and no other cap (map 64×64, 12 colors, 16 outfit colors) changes. *(Constraint: props fit)*
- **R3a. New art follows the engine.** Each redrawn or new outfit uses only world and outfit colors (no `c-<hex>` legacy keys), has at most 12 colors, and paints a figure of at most 24×32, props included. New outfit colors are added to the palette in a reviewed commit, keeping the outfit tier at 16 colors or fewer. `npm run art` reports every file `lossless` and none `OVER BUDGET`. *(Constraint)*
- **R3c. Big props are scene objects.** A prop that doesn't fit the figure cap is a separate library object (`kind: 'sprite'`, within the 64×64 map and 12-color caps, world and outfit colors only) placed in the class's `data-class` group next to the outfit, and it sits on the platform without leaving the sprite's `viewBox`. It shows only with its class. *(Outcome; constraint: big props)*
- **R4. The sprite has seven variants.** `src/assets/pixel-art/range-sprite.svg` has `<g data-class="0">` to `<g data-class="6">`, one per class in order. *(Outcome)*
- **R5. Only the current outfit shows.** `range.css` shows `data-class="N"` when `data-current="N"`, for N = 0 to 6, and never two at once. *(Outcome)*
- **R6. Pager and nameplate follow the data.** Seven dots, the class's own nameplate shadow color, "class N of 7", and the sprite's `aria-label` all come from `rangeClasses`. *(Outcome, constraint: accessibility)*
- **R7. Behavior unchanged.** Arrows wrap both ways, auto-advance, pause, hover and focus pause and reduced motion work as before. *(Constraint)*
- **R8. Fits at 390px.** Seven dots, the nameplate and the controls fit with no horizontal scroll, and tap targets stay at 44px. The longest name doesn't shift the layout when the carousel advances. *(Constraint)*
- **R9. Professional.** Nameplates are plain job names. No stats, levels or rarity styling. The Range heading and paragraph are unchanged. *(Constraint)*
- **R10. Public-safe copy.** Class names trace to the profile's disciplines. *(Constraint)*
- **R11. Budgets hold.** The range sprite is ≤ 100 KB raw and ≤ 25 KB gzip, and the home page stays within the redesign spec's §12 budgets. *(Constraint)*
- **R12. Data and art can't drift.** A test checks that `rangeClasses.length` equals the number of `data-class` groups in the compiled sprite. *(Constraint)*
- **R13. Earlier documents say so.** The redesign intent's decision #7 and the redesign spec's §7.3 get a note, and §7.3's `rangeClasses` block is updated. *(Outcome)*
- **R14. Each class is its own reviewed step,** with before and after previews and screenshots at 1440px and 390px, and an independent verifier on each PR. *(Constraint)*

## Design

### Classes and characters

The order follows the profile's disciplines, with the knight and the suit last, and keeps the carousel's first class as Front-end. Variant index = position.

| # | Class (nameplate) | Character | Costume cue and prop | Outfit object |
| --- | --- | --- | --- | --- |
| 0 | Front-end | Mage | A pointed hat and robe, a staff with a small glowing tip | `outfit-front-end` (redrawn) |
| 1 | Back-end | Hacker | A hoodie with the hood down, a laptop under one arm | `outfit-back-end` (new) |
| 2 | UX Design | Painter | A beret and smock, a palette and brush | `outfit-ux-design` (redrawn) |
| 3 | Cloud & DevOps | Engineer | A hard hat and vest, a wrench | `outfit-cloud-devops` (redrawn) |
| 4 | Data Engineering | Alchemist | A cap and apron, a flask | `outfit-data-engineering` (redrawn) |
| 5 | Security & Governance | Knight | Armor and helmet, as built | `outfit-security-governance` (kept) |
| 6 | Project Management | Person in a suit | A jacket and tie, a clipboard | `outfit-project-management` (redrawn) |

Each outfit overrides the character's rows like `outfit-security-governance` does (`extends: 'character'`, `keys`, `rows`). The knight is the reference for how much detail a character gets: one silhouette cue, one prop.

### Palette: `src/assets/pixel-art/source/palette.mjs`

The outfit tier has 4 of 16 colors (`silver-1` to `silver-4`, used by the knight). The new outfits need up to 12 more, added in one reviewed commit before the art:

- **Reuse the world ramps** wherever they fit: `gold` for the hard hat, `wood` for the staff and clipboard, `roof` red for the beret and tie, `water` teal for the alchemist's apron and flask, `ink` for outlines.
- **Add outfit colors** only for what the world lacks: a violet for the mage's robe, a slate or charcoal for the hoodie and the suit, and a smock tone for the painter. The exact values are chosen when the art is drawn, as 2–3 shades per new color, and stay within 12 new entries.
- Brand entries and their `variables.css` test are untouched.

### Art: `src/assets/pixel-art/source/`

- Redraw the five outfits in place (same object names), and add `objects/outfit-back-end.mjs`.
- `scenes/range-sprite.mjs`: seven groups, `data-class` `'0'` to `'6'`, each with the outfit `{ object: '<outfit>', at: { px: [-24, -6] } }`, in the order above, plus any prop objects for that class.
- **Held or beside?** A prop is held (part of the outfit, within 24×32) when it's small: a staff, a brush, a wrench, a clipboard, a flask. It's a separate object when it's large or would crowd the figure: a house, a server rack, an easel, a cauldron or a desk. The first `data-class` group's items paint in order, so a prop behind the character is listed before the outfit and one in front is listed after.
- **Prop objects** are named `prop-<name>` (for example `prop-easel`) in `source/objects/`, so they're easy to tell from outfits and other library pieces. Place them on the platform's `px` coordinates, not tiles, since the platform is imported art without a tile grid. The `outfit-preview` scene may show them with their outfit for review.
- **Room:** the platform (`range-island`) is 103×72 pixels in the `viewBox` and the character stands near its center. The platform isn't enlarged in this change (intent), so a prop must fit beside the character on the platform, and the plan measures free space before any prop is drawn (C6).
- `scenes/outfit-preview.mjs` lists the outfits for previews: update it to the new set.
- **`objects/character.mjs`:** drop `legacy: true` and re-key its six colors to the palette. The base uses `ink`, `c-3b2a20`, `c-e9b98a`, `c-a0524a`, `c-3b2f26` and `c-4a3a2c`. `c-e9b98a` and `c-a0524a` are the same values as `skin-1` and `skin-2`, and `ink` is already world. The three browns map to the nearest world shades (`soil-4` for `c-3b2a20` and `c-3b2f26`, `wood-4` for `c-4a3a2c`), the nearest shades, to be confirmed in the before and after previews. The map and its layers (including the `cbob` layer) don't change.
- All outfits extend `character`, so once it is migrated every outfit's keys use world and outfit colors only. The `--new object --extends character` CLI re-keys legacy colors (its R38 test), so check that its test still passes against the migrated base.
- **The Range platform (`range-island`) stays legacy.** It sits under the character in the same scene, so the sprite still contains legacy colors, and the legacy tier stays until the follow-ups intent migrates the platform. This change doesn't touch it.

### Data: `src/data/home.ts`

```ts
export const rangeClasses = [
  { name: 'Front-end', shadow: '<mage main color>' },
  { name: 'Back-end', shadow: '<hoodie main color>' },
  { name: 'UX Design', shadow: '<smock main color>' },
  { name: 'Cloud & DevOps', shadow: '#D8B66A' },
  { name: 'Data Engineering', shadow: '#5F8C7E' },
  { name: 'Security & Governance', shadow: '#858F99' },
  { name: 'Project Management', shadow: '<suit main color>' },
] as const;
```

Each `shadow` is the outfit's main color, as in the mock. `#D8B66A` (`gold-2`), `#5F8C7E` (`water-3`) and `#858F99` (`silver-3`) are taken from the planned ramps. The others are filled in when their outfit is drawn. Shadows are decorative, so they have no contrast requirement, but each must read against the light stage.

### Styles: `src/styles/range.css`

Extend the "show only the current outfit" selector list to `data-current="0"` through `"6"`. The pager, nameplate and controls need no CSS change. The dots take 7 × 10px + 6 × 8px = 118px, which fits beside the 44px pause button at 390px. The nameplate wrapping is C3.

### Component: `src/components/home/Range.astro`

No change expected. The dots, "class N of M" and the script's `count` already come from `rangeClasses.length`.

### Checks

- `scripts/e2e/art.e2e.mjs` compares each `data-class` variant to a fixture (R10 of the engine spec). That comparison is retired for the Range sprite (C1). The fixture file stays where engine tests use it as input.
- Add the drift test from R12 beside the existing art tests.
- `npm run art`, `npm test`, `npm run build` and `npm run e2e`, as in `CLAUDE.md`.
- Previews with `npm run art -- --preview <name>` for each outfit, and screenshots of all seven classes at 1440px and 390px.

### Delivery order

One PR per step, each with its previews and screenshots: (0) the engine's character cap, raised to 24×32 with its tests, the engine spec note and the skill, (1) palette colors and the base character's migration, with before and after previews of the character (it changes every class, so it goes first and alone), (2) the `data-class` plumbing for seven variants, the CSS and the drift test, with the knight in place, (3) one PR per redrawn or new outfit, (4) the documents' notes. The carousel never shows an unfinished class: a class goes live in its own PR, and the old outfit stays until its replacement merges.

### Documents

- Redesign intent, decision #7: add "Update, 2026-10: the classes were redrawn as characters and are now seven, including Security & Governance and Back-end (Range class characters intent)." Don't rewrite the decision.
- Redesign spec §7.3: update the `rangeClasses` block and add the same note. The redesign documents predate the templates, so only these two notes change.
- `pixel-art` skill: update any mention of the five outfits and the outfit palette's contents.
- Follow-ups intent: already updated, since this change replaces its outfit migration.

## Areas of concern

**C1. The "pixel-identical" check ends for the Range sprite. Decided.** The engine promised the Range sprite would render identically to `scripts/fixtures/pixel-art/range-sprite.src.svg` (engine spec R10, and the e2e check named for it). Redrawing the outfits and the base character changes the art on purpose, so that comparison can't pass. *Owner's decision:* retire the comparison for the Range sprite and replace it with per-class previews, screenshots and the verifier. The fixture file stays only where engine tests use it as input. The plan removes the Range sprite's entry from the e2e comparison list and says so in its PR.

**C2. The base character moves off legacy colors. Decided.** `character` was imported legacy art that every outfit extends. *Owner's decision:* it migrates in this change (R3). It costs little: three of its six colors already have exact world equivalents (`ink`, `skin-1`, `skin-2`), and the other three are dark browns within a few shades of `soil-4` and `wood-4`. Because it changes every class at once, it ships first and alone, with before and after previews. The Range platform under the character stays legacy (see Design), so the legacy tier remains until the follow-ups intent.

**C3. The nameplate may wrap at 390px.** At 18px Silkscreen, "Security & Governance" (21 characters) is longer than "Project Management" (18), the longest today. I haven't measured it. If it wraps, the nameplate grows to two lines and shifts the sprite as the carousel advances.
*Decision for the owner:* measure it in the first PR. If it wraps, either reduce the nameplate font at narrow widths for all classes, give the nameplate a fixed two-line height on mobile, or shorten the name. I recommend the first.

**C4. Detail budget per character: the cap is raised.** The 16×24 cap includes props, and the body already fills about 12 of the 16 columns, so a staff, laptop, brush or flask would only fit as a silhouette. *Owner's decision:* raise the figure so props fit (R3b). I propose **24×32**: it gives about 6 pixels each side and 8 rows of height beyond today's figure, for a staff, a held laptop or a raised flask, while the body stays its present size. That keeps the character smaller than one 32-pixel tile wide, so it still sits correctly beside the island and trucks. Hat and staff tips are the tallest parts.
*Risks to check in the step-0 PR:* (a) the sprite's `viewBox` `[-51, -9, 103, 72]` may clip a taller figure, and moving it shifts every class by a few pixels, so measure first; (b) the `character` map is 32 wide, so props may need map rows that today are empty; (c) at 3× display scale, 24 pixels is about 72px wide, which fits the 309px stage. The owner reviews each outfit's preview and can ask for a simpler prop.

**C6. Room on the platform for scene props.** Large props need floor space on the Range platform, which this change doesn't enlarge, and a prop beside the character competes with the nameplate-sized stage for attention. Props placed outside the platform would float.
*Decision for the owner:* each class's preview shows where its prop goes. If a prop doesn't fit the platform, it becomes a smaller version or a held prop. A larger platform is a follow-up. I recommend choosing props that stand on one side of the character, at most one large prop per class.

**C5. Seven classes slow the cycle.** At 2200ms per class, a full cycle goes from 11 seconds to 15.4 seconds. The carousel pauses on hover and focus and the visitor can pause it, so I don't propose a change.

## Open questions

Answered from the intent:

1. **The order of the seven classes:** as in the table above, with Front-end first.
2. **The back-end class name:** "Back-end", pairing with "Front-end".
3. **Props and colors:** as in the table. The colors are fixed when each outfit is drawn.
4. **Nameplate shadow colors:** each outfit's main color. Three are known (`#D8B66A`, `#5F8C7E`, `#858F99`) and four are set with their outfits.
5. **Timing:** keep 2200ms (C5).
6. **Nameplate fit at 390px:** measured in the first PR (C3).

New:

7. **The new figure cap:** 24×32, as proposed in C4. The owner can change the number before the plan.
8. **C1 and C2** are decided, and **C4** is decided in principle (above). **C3** is measured in the first outfit PR, and **C5** needs no change.
