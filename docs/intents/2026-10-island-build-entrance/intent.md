# Intent: The hero island builds itself as it comes in
Author: J. Law. Cordova (site owner). Status: draft.

## Problem
When the home page loads, the hero island rises in as one piece. It's the first thing a visitor sees beside the headline, and the entrance doesn't show off that the island is built from blocks and objects.

A prototype that brought the pieces in one at a time felt right, but it showed a second problem: most of the ground is flat tiles. They look fine at rest, but as they float up on their own they look paper-thin.

## Proposed outcome
The island assembles itself when the page loads:

- **The blocks float up from below,** one row at a time, sweeping left to right.
- **Each piece overshoots slightly and settles** into place, rather than stopping dead.
- **The objects come in after the ground,** starting a few moments before the last of the blocks have landed. They also sweep left to right, one object at a time, not grouped by kind.
- **The stagger is unhurried,** a little slower than the first prototype's.
- **The tiles become blocks,** so every piece has depth while it floats up.

## Affected users and systems
Visitors landing on the home page. The hero island art and its pipeline, and the hero's entrance motion.

## Constraints
- **The site's motion rules still hold:** nothing animates under reduced motion, and the island shows in full without JavaScript.
- **The site's art rules still hold:** the art is edited only in its sources, uses the world palette and the light direction, and stays inline SVG within its weight budget with lossless output.
- No new dependencies.

## Open questions
- Should the island look exactly as it does today once it has settled?
- Should the clouds and the trucks join the entrance, or simply be there when it finishes?
