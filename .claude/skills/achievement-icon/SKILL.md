---
name: achievement-icon
description: Add or change an achievement icon, the 16×16 pixel-art picture that sits beside an accomplishment on the site. Use whenever someone asks for a new achievement icon, wants to redraw one, or when an accomplishment needs a kind of icon the set doesn't have. Builds on the pixel-art skill and works headless.
---
# Achievement icon

Each accomplishment on the home page and the full-list page has an icon, chosen from a fixed set by the kind of thing that was done (shipped, fixed, mentored). The set is the list in `src/lib/achievement-icons.mjs`. An accomplishment names an icon by its id in its `icon` field. Design: `docs/intents/2026-10-gamified-accomplishments/spec.md` (D5, D6).

This skill covers what's specific to icons. Everything about drawing (the palette, light, previews, canonical files, never editing an output SVG by hand) is in the `pixel-art` skill, and its rules apply in full.

## What an icon is

- **A flat 16×16 sprite,** front-on, not isometric. It's one object, `src/assets/pixel-art/source/objects/icon-<id>.mjs`, with a single layer and the anchor at `[8, 15]`.
- **World colors only,** at most 12 (aim for 6–8), no legacy colors. Outline it in `ink`. Light comes from the upper left: the lit side uses shade 1, the right and lower side shade 3 or 4, as on the island.
- **Generic and public-safe.** No names, logos, brands or likenesses. A picture of a kind of work, such as a rocket for "shipped", never of a person or a client.
- **Named for the kind of work,** not the discipline and not a specific accomplishment. The set stays small and reusable: add a new icon only when the kind of work isn't covered by any existing meaning. Check the table below first.
- **Two icons are special** and aren't offered as choices: `star` (the fallback, shown for a missing or unknown icon) and `lock` (an 8×10 padlock in the lower-right of its cell, drawn over the icon of an accomplishment that isn't done yet).

## The set

The `meaning` is what Claude reads, through `/achievement-icons.json`, to pick an icon for an accomplishment. Keep it to a few words that start with a verb in the past tense.

<!-- icons:start -->
| Id | Meaning |
| --- | --- |
| `sprout` | started something, or a first |
| `hammer` | built something |
| `rocket` | shipped or launched |
| `bug` | fixed a bug or a problem |
| `shield` | secured or protected |
| `door` | opened access or a way in |
| `bolt` | sped up or automated something |
| `book` | wrote or documented |
| `magnifier` | investigated or analysed |
| `flask` | experimented or prototyped |
| `grad-cap` | mentored or taught others |
| `heart` | helped, or went the extra mile |
| `compass` | planned, led or set direction |
| `box` | organised or stored (data, assets) |
| `trophy` | reached a milestone |
| `speech` | shared or presented |
<!-- icons:end -->

The set is the 16 icons above, and a test fails if this table disagrees with `achievement-icons.mjs`.

## Steps

1. **Pick the id and meaning.** Lowercase kebab-case, at most 64 characters. Check it isn't already covered.
2. **Start a file:** `npm run art -- --new object icon-<id> --size 16x16`, then set the anchor to `[8, 15]`.
3. **Draw it,** whole rows of 16 characters, 16 rows, using `keys` from the world palette. `.` is transparent.
4. **Check it:** `npm run art -- --check icon-<id>` must pass.
5. **Look at it:** `npm run art -- --preview icon-<id>` and open the PNG. Judge it at 1× and 4×: it's drawn at about 48px on the site, so it must read at a glance. The picture, not the text, decides.
6. **List it:** add `{ id, meaning }` to `ICONS` in `src/lib/achievement-icons.mjs`, and a row to the table above.
7. **Place it in the sheet:** add an item to `src/assets/pixel-art/source/scenes/achievement-icons.mjs`, in the same position as in `SHEET_ORDER` (`star`, `lock`, then `ICONS` in order). Group `{ 'data-icon': '<id>' }`, at `px: [index × 16 + 8, 15]`, and widen the `viewBox` to `[0, 0, 16 × count, 16]`. Re-save the scene in canonical form if `npm test` says it isn't.
8. **Compile and test:** `npm run art`, then `npm test` (it checks the list, the objects, the sheet order, the caps and the 6 KB gzip budget for the sheet).
9. **Open a PR** with the 1× and 4× previews attached. Merging deploys `/achievement-icons.json`, which the `accomplishments` skill reads. Tell the owner if the lexicon's `icon` `knownValues` in `jlawcordova-atproto` needs the new id.

## Pitfalls

- A row that isn't exactly 16 characters, or fewer or more than 16 rows, fails `--check` with the row and column.
- The sheet's order is the order in `SHEET_ORDER`. Placing an icon out of order draws the wrong picture on the page, and a test catches it.
- Don't edit `achievement-icons.svg` by hand. It's compiled by `npm run art`.
- Removing or renaming an icon breaks records that name it: they show the fallback star until they're edited. Add a new id instead, unless the owner says otherwise.
