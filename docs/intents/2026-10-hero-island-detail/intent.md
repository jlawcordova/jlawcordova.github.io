# Intent: Hero island detail
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem

The [island migration](../2026-10-island-migration/intent.md) rebuilt the hero island from library objects, but the objects are plain. The land blocks are flat colored faces, the clouds are flat cartoon puffs that don't match the isometric world below them, the house is a plain box with a roof, and the crane's two red slabs don't read as anything. Next to a detailed isometric tile set, the island looks like a first pass.

The look I'm aiming for is the second step of a public isometric-tiles pixel-art tutorial. In that step, the blocks get texture without becoming busy:

- **The grass block** has blade texture on the top and a darker band where the grass meets the dirt. Its sides are dirt with a few speckles.
- **The dirt block** has a mottled top and speckled sides.
- **No outlines.** Each face is set apart by its shade (light top, mid left, dark right), not by a dark line.
- **The cloud** is a chunky isometric shape, like stacked blocks, with lit tops and shaded sides.

## Proposed outcome

- **More detail on every island object.** The objects get texture and shading in the style of that second step, either by adding to the current objects or by redrawing them:
  - the land and grass blocks;
  - the clouds, which become isometric;
  - the house;
  - the crane and what it's building;
  - the trees;
  - the water and waterfall;
  - the smaller props, such as the bridge, fence, flag and hearth;
  - the trucks.
- **No outlines on the island.** Faces are separated by shading, as in the reference. The island may look different from the Range sprite and the achievement icons, which keep their outlines.
- **Cardboard boxes at the crane.** The two red slabs become boxes that clearly read as cardboard boxes, so the construction site fits the shipping metaphor of the trucks.
- **Made with a skill that is strict about the palette.** The objects are made through a skill that keeps to the existing world palette and won't use any color outside it.

## Affected users and systems

- **Home page visitors:** the hero island looks more detailed.
- **Pixel-art objects and the hero island scene:** most objects on the island are redrawn or detailed.
- **The `pixel-art` skill:** it guides this work and holds it to the world palette.
- **Anything else that uses these library objects,** if any, would change with them.

## Constraints

- **World palette only.** No new colors. Detail comes from the shades the world palette already has.
- **Same island.** It stays the same scene, with the same layout, road, river and animation. The clouds still drift, the trucks still drive, and reduced motion still stops them.
- **The engine's rules still hold:** the 32×16 tile, the light direction, the size caps, accessibility, public safety and deterministic output.
- **The island may get heavier.** Its SVG can grow past today's size and past the engine's 100 KB budget if the detail needs it, up to a hard ceiling of 500 KB.
- **Every visible change is reviewed,** with before and after previews and screenshots at 1440px and 390px, and an independent verifier on every PR.
- **The reference stays out of the repo.** It's described here in words. Its images and palette aren't copied.
- **Out of scope:** new colors or a change to the palette, the Range platform and characters, the achievement icons, and the hero copy.

## Open questions

None open. Decided with the owner: the trucks are detailed and lose their outlines too, the island's file size may grow past the engine's budget, up to a hard ceiling of 500 KB, and the island may differ from the outlined Range sprite and achievement icons.
