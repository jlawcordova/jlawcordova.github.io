# Intent: Isometric Range
Author: J. Law. Cordova (site owner). Status: done, 2026-10-05: built on `feat/range-isometric` in [#100](https://github.com/jlawcordova/jlawcordova.github.io/pull/100) (platform), [#101](https://github.com/jlawcordova/jlawcordova.github.io/pull/101) (base and knight), [#102](https://github.com/jlawcordova/jlawcordova.github.io/pull/102) (the other six classes) and [#105](https://github.com/jlawcordova/jlawcordova.github.io/pull/105) (the Back-end laptop, from the owner's review), and shipped to `main` in [#103](https://github.com/jlawcordova/jlawcordova.github.io/pull/103). Follow-up: [#104](https://github.com/jlawcordova/jlawcordova.github.io/pull/104) (the console's labels at 320px). Checked on the live site the same day: the home page serves the committed `range-sprite.svg` with seven `data-class` groups, no script, link or text, and no `ink`, and there's no horizontal scroll at 1440px, 390px or 320px, where the console's labels stay inside the shell. Before building it was accepted.

## Problem

The Range carousel doesn't look like it belongs to the hero island. The island is built from library objects, and its land uses the shared blocks. The Range's land doesn't use those blocks, so the two read as different worlds. The characters have the same problem: they're drawn flat and front-on, while the island's pieces, such as the clouds, are isometric. Beside the island they look like they come from another set.

## Proposed outcome

- **The Range's land is built from the same blocks as the hero island.** The same engine and the same blocks, not a look-alike.
- **The characters are redone to be isometric,** in the same style as the clouds on the island. Redrawing them from scratch is fine, and preferred over adjusting the current ones.
- **The Range and the island read as one world.**

## Affected users and systems

- **Home page visitors:** the Range carousel, its land and all its characters look different.
- **Pixel-art sources and the compiled art:** the Range scene, its land and the characters, and their outfits and props.

## Constraints

- **Same engine, same blocks.** The Range land uses the blocks the hero island uses, not its own.
- **Isometric, like the clouds.** The characters follow the same isometric look as the island's clouds.
- **The classes stay recognizable.** Each class still reads as its own character with its costume and prop, as in [Range class characters](../2026-10-sixth-range-class/intent.md).
- **The carousel works as today.** Copy, nameplates, pager and motion behavior don't change.
- **The engine's rules still hold,** including the size and color caps, the world palette, accessibility, public safety and deterministic output.
- **Out of scope:** the hero island itself, the palette (no new colors), and the copy of each class.

## Open questions

None open. Decided with the owner: "the land" is the platform each character stands on, and the redo covers all seven characters.
