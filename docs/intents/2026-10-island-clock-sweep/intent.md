# Intent: The island builds in a clock sweep, and the tools to tune it stay
Author: J. Law. Cordova (site owner). Status: draft; built in the same PR, accepted when the owner merges it.

## Problem
The hero island's build-up was tuned in one prototype round: rows float up left to right, then the objects follow. The owner wanted to see other staggers before settling on one. A second prototype offered many, and the owner chose a different look.

That prototype was throwaway. Next time the owner wants to try a stagger, someone has to build the tools again, and an agent asked to animate the island or other pixel art has no guide to how it's done here.

One tile also breaks the river: the grass tile behind the office, so the river's row isn't water all the way across.

## Proposed outcome
- **The island builds with the owner's choice.** From the prototype, in the owner's settings: the ground comes in a clock sweep, the objects follow after the ground from front to back, and every piece pops into place. The ground's stagger spans 0.5s, the objects' 0.6s, starting 0.08s before the ground has landed, and each piece takes 0.5s with an overshoot of 2.
- **The prototyping tools are saved,** so the owner can try stagger options again and hand over a choice.
- **A skill for animating the island and other pixel art,** so future agents can prototype and ship this kind of motion.
- **The grass tile behind the office becomes water,** so the whole row is water.

## Affected users and systems
Visitors landing on the home page. The hero island art and its pipeline, the hero's entrance motion, the owner's prototyping tools, and the guidance agents follow for pixel art.

## Constraints
- **The site's motion rules still hold:** nothing animates under reduced motion, and the island shows in full without JavaScript.
- **The site's art rules still hold:** the art is edited only in its sources, uses the world palette, and stays inline SVG within its weight budget with lossless output.
- **The tools are for the owner and agents,** not visitors.
- No new dependencies.

## Open questions
- Should the Range settings, which build themselves "as on the hero island", change to match?
