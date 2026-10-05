# Intent: Accomplishment icons in the island and Range style
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem
The accomplishment icons are flat, front-on pictures with ink outlines. The hero island and the Range characters have since moved to an isometric view with shaded faces and more detail. Next to them, the icons look like they belong to an older, different site, so the accomplishments list doesn't match the rest of the pixel-art world.

## Proposed outcome
Every accomplishment icon is redrawn to look like it belongs with the island and the Range characters:

- **Isometric view,** the same angle as the island and the Range.
- **No outlines.** Faces are separated by shading, as on the island.
- **Richer detail,** with more shading depth than today's flat icons.
- **No platform.** Each icon is a single object that stands on its own, not on a tile or block.

The set stays the same: the same 15 icons with the same meanings. Each one is still recognisable at a glance as the kind of work it stands for, and the fallback and locked states still work with the new look.

## Affected users and systems
Visitors reading the accomplishments on the home page and the full list. The owner, who adds new icons in the same style later. The icon pixel art, its sheet and the skill for creating icons.

## Constraints
- **Same icons, same meanings.** Existing accomplishments keep the icon they already name, and the choices Claude suggests don't change.
- **The site's art rules still hold:** the world palette, the light direction, the engine's size caps, inline SVG within the home page weight budget, and output that stays lossless.
- **Icons stay decorative.** Text carries the meaning, and the layout stays readable at 390px with no horizontal scroll.
- **Generic and public-safe,** as today: no names, logos, brands or likenesses.
- **Out of scope:** adding or removing icons, changing what they mean, and changing the island or the Range.

## Open questions
Should the locked padlock and the fallback star get the same treatment, or stay as they are?
