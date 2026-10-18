# Intent: The island sweeps in, and its objects drop onto it
Author: J. Law. Cordova (site owner). Status: draft; built in the same PR, accepted when the owner merges it.

## Problem
The clock-sweep build-up shipped, and then the owner kept trying options in the entrance lab and found a look they like better. The lab could only give the objects the ground's move with the ground's numbers, so the owner couldn't keep an overshoot on the ground while the objects dropped with only a small dip.

## Proposed outcome
- **The island builds with the owner's new pick from the lab:**

  > groundSpan: 0.25, cascade: 0.25, ground: "sweep", objects: "same", with: true, lag: 0.42, move: "float", objectMove: "drop", duration: 0.25, peak: 0.6, rise: 16, overshoot: 6, objectDuration: 0.25, objectPeak: 0.45, objectRise: 24, objectOvershoot: 1.5

  The ground sweeps in from left to right and floats up with a big overshoot. Each object drops onto the island a moment after the cube under it, with only a small dip.
- **The ground and the objects are each configurable in the lab,** in their own tab, with their own move and numbers.

## Affected users and systems
Visitors landing on the home page. The hero island's entrance motion, and the entrance lab.

## Constraints
- **The site's motion rules still hold:** nothing animates under reduced motion, and the island shows in full without JavaScript.
- **The Range settings keep their own build-up.**
- No new dependencies, and no change to the art.

## Open questions
None.
