# Intent: Retire legacy pixel art
Author: J. Law. Cordova (site owner). Status: draft.

## Problem

The pixel-art engine still carries a "legacy" tier: a frozen set of 81 colors, a way to import existing SVG art as legacy objects, and exemptions from the size and color caps for that art. It existed so the original redesign art could be brought in unchanged. The [island migration](../2026-10-island-migration/intent.md) removed the island's legacy art, and the [isometric Range](../2026-10-range-isometric/intent.md) removes the last legacy object, the Range's platform. After that, nothing on the site uses the legacy tier, but it still sits in the engine, the palette, the tools, the tests and the docs. It is a second way to make art that the rules say never to use, and it makes the engine and the skill harder to read.

## Proposed outcome

Legacy is gone. There is one palette tier system for new art with no frozen legacy colors, no import path for legacy art, and no cap exemptions. The engine, the tools, the tests, the pixel-art skill and the `pixel-artist` agent describe one way to make art. Nothing the site shows changes.

## Affected users and systems

- **The owner and agents:** the engine, the palette, the import tool, the lab, the tests, the `pixel-art` skill and the `pixel-artist` agent lose their legacy parts.
- **Home page visitors:** no change. The compiled art is identical before and after.

## Constraints

- **Starts after the isometric Range lands.** Nothing may still use legacy art when this begins.
- **Nothing visible changes.** Every compiled SVG is the same as before, byte for byte where nothing else changed.
- **Old documents stay as history.** Earlier intents and specs that mention legacy are not rewritten.
- **The usual rules hold:** no new dependency, accessibility and public-safety rules, and an independent verifier on every PR.
- **Out of scope:** new colors, new objects, and any change to how current art looks.

## Open questions

None yet.
