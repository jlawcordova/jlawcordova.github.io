# Intent: The island stands on the hero's bottom edge, and sweeps in slower
Author: J. Law. Cordova (site owner). Status: draft; built in the same PR, accepted when the owner merges it.

## Problem
The hero island floats in the middle of the band beside the copy, with empty hero background under it, so it reads as a sticker rather than a place. Its build-up, picked in the [island sweep drop](../2026-10-island-sweep-drop/intent.md), also goes by too quickly to take in.

## Proposed outcome
- **The island sits at the bottom of the hero,** low enough that the band's bottom edge cuts off its lowest block.
- **The island builds with the owner's new pick from the entrance lab:**

  > groundSpan: 1, lag: 0.5, duration: 0.35, objectDuration: 0.3, objectPeak: 0.5

  The ground sweeps in from left to right more slowly, and each piece takes a little longer to land.
- **The entrance lab shows the island as the hero does,** clipped at the stage's bottom edge, so the owner judges each build-up in the island's real position.

## Affected users and systems
Visitors landing on the home page. The hero's layout, the hero island's entrance motion, and the entrance lab.

## Constraints
- **The site's motion rules still hold:** nothing animates under reduced motion, and the island shows in full without JavaScript.
- **The Range settings keep their own build-up.**
- No horizontal scroll at any width. No new dependencies, and no change to the art.

## Open questions
None.
