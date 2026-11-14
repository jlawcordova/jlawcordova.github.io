---
name: achievement-icon
description: Add or change an achievement icon, the 16×16 pixel-art picture that sits beside an accomplishment on the site. Use whenever someone asks for a new achievement icon, wants to redraw one, or when an accomplishment needs a kind of icon the set doesn't have. The icons and their frames are the site's own sprites, drawn in the site's Pixpocket document with the `pixpocket` CLI. Builds on the pixel-art skill, and works headless.
---
# Achievement icon

Each accomplishment on the home page and the full achievements list has an icon, chosen from a fixed set by the kind of thing that was done (shipped, fixed, mentored). The set is the list in `src/lib/achievement-icons.mjs`. An accomplishment names an icon by its id in its `icon` field. On the page, each icon sits in a frame colored by its kind of work. Design: `docs/intents/2026-10-gamified-accomplishments/spec.md` (D5, D6), `docs/intents/2026-10-isometric-icons/spec.md` (the look) and, for the frames, `docs/intents/2026-10-achievements-redesign/spec.md` (R8–R10).

The icons and frames are the site's own objects, not copies from the studio, so they're drawn here. This skill covers what's specific to them. The program, the checks, publishing and what gets committed are in the `pixel-art` skill, and its rules apply in full: without Pixpocket an icon can't be added.

## What an icon is

- **A 16×16 isometric sprite:** one solid object on a 2:1 grid, lit from the upper left, with no outline and no platform, tile or shadow under it. It's one object, `src/assets/pixel-art/jlawcordova.pixpocket/objects/icon-<id>.json`, with a single layer, the anchor at `[8, 15]` and the category Achievements › Icons. Columns 0 and 15 stay transparent so neighbours in the sheet don't touch, and its lowest pixels sit on row 15. The chest (`icon-chest`), the star (`icon-star`) and the lock (`icon-lock`) are the references.
- **Built from boxes.** A box shows a lit top, a mid left face and a dark right face, with crisp edges between them and 2–3 shades a face at most. A flat shape (a star, a key, a heart) lies on the grid and is extruded straight down by one constant height, so every edge facing the viewer gets the same band. Upright on a face plane a shape shears and one side comes out twice as thick, which the owner rejected.
- **World colors only,** 4–8 an icon, and **no `ink`**, not even as a dot. The lit top is the ramp's shade 2 with a shade 1 rim along its lit edge, the left face shade 3 and the right face shade 4 (the chest: `wood-2`, `wood-3`, `wood-4`). The main material shows at least three shades. Where an outline pixel would go, use the darker shade of the face it borders. Metal in the set is the `path` ramp, so keep a new icon's metal the same.
- **It sits on a near-cream row** (`--color-surface`), so a lighter rim vanishes there and a `cream` glint reads as a hole. The lit edge is the material's shade 1.
- **Generic and public-safe.** No names, logos, brands or likenesses. A picture of a kind of work, such as a rocket for "shipped", never of a person or a client.
- **Named for the kind of work,** not the discipline and not a specific accomplishment. The set stays small and reusable: add a new icon only when the kind of work isn't covered by any existing meaning. Check the table below first.
- **Two icons are special** and aren't offered as choices: `star` (the fallback, shown for a missing or unknown icon) and `lock` (a block-built gold padlock, about 10×12, in the upper-right corner of its cell at columns 6–15 and rows 0–11, drawn in full color over the icon of an accomplishment that isn't done yet; the row dims that icon with `opacity: 0.4; filter: grayscale(1)`, so the lock must read against a gray, faded icon).

## The set

The `meaning` is what Claude reads, through `/achievement-icons.json`, to pick an icon for an accomplishment. Keep it to a few words that start with a verb in the past tense.

The `frame` is the frame the icon sits in on the page, from `FRAMES` in `achievement-icons.mjs`: `make` (started, built, shipped, tried), `fix` (fixed, secured, opened, tuned), `think` (wrote, investigated, planned, organised), `people` (taught, helped, shared) or `milestone`. `plain` is kept for the fallback star and locked rows. The frames are the 20×20 `frame-*` objects in the `achievement-frames` sheet; a new icon picks an existing frame, and doesn't need new frame art.

<!-- icons:start -->
| Id | Meaning | Frame |
| --- | --- | --- |
| `sprout` | started something, or a first | `make` |
| `hammer` | built something | `make` |
| `rocket` | shipped or launched | `make` |
| `bug` | fixed a bug or a problem | `fix` |
| `shield` | secured or protected | `fix` |
| `key` | opened access or a way in | `fix` |
| `wrench` | tuned, sped up or automated something | `fix` |
| `book` | wrote or documented | `think` |
| `magnifier` | investigated or analysed | `think` |
| `flask` | experimented or prototyped | `make` |
| `apple` | mentored or taught others | `people` |
| `heart` | helped, or went the extra mile | `people` |
| `signpost` | planned, led or set direction | `think` |
| `chest` | organised or stored (data, assets) | `think` |
| `trophy` | reached a milestone | `milestone` |
| `speech` | shared or presented | `people` |
<!-- icons:end -->

The set is the 16 icons above, and a test fails if this table disagrees with `achievement-icons.mjs`, frames included.

## Steps

1. **Pick the id and meaning.** Lowercase kebab-case, at most 64 characters. Check it isn't already covered.
2. **Start a file:** `npm run pixpocket -- new object icon-<id> --width 16 --height 16` makes a 16×16 sprite anchored at `[8, 15]`. Put it under Achievements › Icons straight away: `npm run pixpocket -- object category icon-<id> --to "Achievements/Icons"` (`npm test` fails on an object without a category).
3. **Draw it,** 16 rows of 16 characters, with `keys` from the world palette (`npm run pixpocket -- palette get` lists it). `.` is transparent. Write the whole map with `npm run pixpocket -- object map set icon-<id> <16 rows> --keys '{"t": "gold-1", …}'`, and touch it up with `object paint icon-<id> <col,row …> --color <name>` and `object erase`. Remove the starter's one key, `ink`, which icons never use.
4. **Check it:** `npm run pixpocket -- check icon-<id>` must pass, with no warning.
5. **Look at it:** `npm run pixpocket -- preview object:icon-<id> --scale 3 --out .art-preview/icon-<id>@3x.png` (and again at `--scale 1`), and `render object:icon-<id> --scale 8 --out …` for a transparent close look. Open the PNGs. Judge it at 3× (its 48px size on the site) and at 1×, and also dimmed as a locked row shows it (grayscale at 40% opacity on `--color-surface`), since the lock is drawn over its upper-right third: the shape must still read by its left half. The preview's card color is darker than the row, and makes gold look faint. The picture, not the text, decides.
6. **List it:** add `{ id, meaning, frame }` at the end of `ICONS` in `src/lib/achievement-icons.mjs`, and a row to the table above. Check it reads on its frame's fill: `npm run pixpocket -- preview scene:achievement-frames --scale 3 --out .art-preview/achievement-frames@3x.png` shows the fills.
7. **Place it in the sheet,** in the same position as in `SHEET_ORDER` (`star`, `lock`, then `ICONS` in order). For an icon at the end: `npm run pixpocket -- scene place achievement-icons icon-<id> --px <index × 16 + 8>,15 --new-group '{"data-icon": "<id>"}'`, then widen the box with `npm run pixpocket -- scene frame achievement-icons --box 0,0,<16 × count>,16`. `--dry-run` shows each diff first. An icon anywhere else is a hand edit of `scenes/achievement-icons.json`, in canonical form, moving every later icon 16 px right.
8. **Publish and test:** `npm run art`, then `npm test` (it checks the list, its frames and this table). Look at the sheet with `npm run pixpocket -- preview scene:achievement-icons --scale 4 --out .art-preview/achievement-icons@4x.png`: its order is checked by eye, not by a test. `npm run pixpocket -- check achievement-icons --sizes` shows its bytes (about 13 KB raw and 3 KB gzip today).
9. **Open a PR** with the 1× and 4× previews attached, and with `achievement-icons.svg` and `published.json` committed beside the sources. Merging deploys `/achievement-icons.json`, which the `accomplishments` skill reads. Tell the owner if the lexicon's `icon` `knownValues` in `jlawcordova-atproto` needs the new id.

## Pitfalls

- A row that isn't exactly 16 characters, or fewer or more than 16 rows, fails `check` with the row and column.
- The sheet's order is the order in `SHEET_ORDER`: the page cuts each icon's cell out by its index. An icon placed out of order draws the wrong picture, and no test catches it.
- Don't edit `achievement-icons.svg` by hand. `npm run art` publishes it, and it's committed with the source.
- Removing or renaming an icon breaks records that name it: they show the fallback star until they're edited. Add a new id instead, unless the owner says otherwise.
