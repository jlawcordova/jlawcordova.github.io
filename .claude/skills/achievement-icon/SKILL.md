---
name: achievement-icon
description: Add or change an achievement icon, the 16×16 pixel-art picture that sits beside an accomplishment on the site. Use whenever someone asks for a new achievement icon, wants to redraw one, or when an accomplishment needs a kind of icon the set doesn't have. Builds on the pixel-art skill and works headless.
---
# Achievement icon

Each accomplishment on the home page and the full achievements list has an icon, chosen from a fixed set by the kind of thing that was done (shipped, fixed, mentored). The set is the list in `src/lib/achievement-icons.mjs`. An accomplishment names an icon by its id in its `icon` field. On the page, each icon sits in a frame colored by its kind of work. Design: `docs/intents/2026-10-gamified-accomplishments/spec.md` (D5, D6) and, for the frames, `docs/intents/2026-10-achievements-redesign/spec.md` (R8–R10).

This skill covers what's specific to icons. Everything about drawing (the palette, light, previews, canonical files, never editing an output SVG by hand) is in the `pixel-art` skill, and its rules apply in full.

## What an icon is

- **A 16×16 isometric sprite** in the [island and Range look](../pixel-art/SKILL.md#island-and-range-look): one solid object on the same 2:1 grid as the island, seen from the same angle, with no outline and no platform under it. It's one object, `src/assets/pixel-art/jlawcordova.pixellab/objects/icon-<id>.mjs`, with a single layer and the anchor at `[8, 15]`. The `pixel-art` skill's [Isometric icons](../pixel-art/SKILL.md#isometric-icons) part is the recipe; the chest, star and lock are the references.
- **World colors only,** at most 12 (aim for 6–8), and **no `ink`**, not even as a dot. Faces are set apart by shade: top lightest, left face mid, right face darkest, as on the island. The main material shows at least three shades of its ramp. Where today's outline pixel would go, use the darker shade of the face it borders.
- **Generic and public-safe.** No names, logos, brands or likenesses. A picture of a kind of work, such as a rocket for "shipped", never of a person or a client.
- **Named for the kind of work,** not the discipline and not a specific accomplishment. The set stays small and reusable: add a new icon only when the kind of work isn't covered by any existing meaning. Check the table below first.
- **Two icons are special** and aren't offered as choices: `star` (the fallback, shown for a missing or unknown icon) and `lock` (a block-built gold padlock, about 10×12, in the upper-right corner of its cell at columns 6–15 and rows 0–11, drawn in full color over the icon of an accomplishment that isn't done yet; the row dims that icon with `opacity: 0.4; filter: grayscale(1)`, so the lock must read against a gray, faded icon).

## The set

The `meaning` is what Claude reads, through `/achievement-icons.json`, to pick an icon for an accomplishment. Keep it to a few words that start with a verb in the past tense.

The `frame` is the frame the icon sits in on the page, from `FRAMES` in `achievement-icons.mjs`: `make` (started, built, shipped, tried), `fix` (fixed, secured, opened, tuned), `think` (wrote, investigated, planned, organised), `people` (taught, helped, shared) or `milestone`. `plain` is kept for the fallback star and locked rows. The frames are drawn in `src/assets/pixel-art/achievement-frames.svg`; a new icon picks an existing frame, and doesn't need new frame art.

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
2. **Start a file:** `npm run pixellab -- object new icon-<id> --size 16x16`, then set the anchor to `[8, 15]`.
3. **Draw it,** whole rows of 16 characters, 16 rows, using `keys` from the world palette. `.` is transparent.
4. **Check it:** `npm run pixellab -- check icon-<id>` must pass.
5. **Look at it:** `npm run pixellab -- art preview icon-<id> --scale 3 --out .art-preview/icon-<id>@3x.png` (and again at `--scale 1`) and open the PNGs. Judge it at 3× (its 48px size on the site) and at 1×, and also dimmed as a locked row shows it (grayscale at 40% opacity on the row's `--color-surface`), since the lock is drawn over that. It must read at a glance. The picture, not the text, decides.
6. **List it:** add `{ id, meaning, frame }` to `ICONS` in `src/lib/achievement-icons.mjs`, and a row to the table above. Check it reads on its frame's fill: `npm run pixellab -- art preview achievement-frames --scale 3 --out .art-preview/achievement-frames@3x.png` shows the fills.
7. **Place it in the sheet:** add an item to `src/assets/pixel-art/jlawcordova.pixellab/scenes/achievement-icons.mjs`, in the same position as in `SHEET_ORDER` (`star`, `lock`, then `ICONS` in order). Group `{ 'data-icon': '<id>' }`, at `px: [index × 16 + 8, 15]`, and widen the `viewBox` to `[0, 0, 16 × count, 16]`. Re-save the scene in canonical form if `npm test` says it isn't.
8. **Compile and test:** `npm run art`, then `npm test` (it checks the list, the objects, the sheet order, the caps and the 6 KB gzip budget for the sheet).
9. **Open a PR** with the 1× and 4× previews attached. Merging deploys `/achievement-icons.json`, which the `accomplishments` skill reads. Tell the owner if the lexicon's `icon` `knownValues` in `jlawcordova-atproto` needs the new id.

## Pitfalls

- A row that isn't exactly 16 characters, or fewer or more than 16 rows, fails `--check` with the row and column.
- The sheet's order is the order in `SHEET_ORDER`. Placing an icon out of order draws the wrong picture on the page, and a test catches it.
- Don't edit `achievement-icons.svg` by hand. It's compiled by `npm run art`.
- Removing or renaming an icon breaks records that name it: they show the fallback star until they're edited. Add a new id instead, unless the owner says otherwise.
