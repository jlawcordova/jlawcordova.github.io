# Intent: Isometric Range
Author: J. Law. Cordova (site owner). Status: accepted.

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
