# Intent: Island level up
Author: J. Law. Cordova (site owner). Status: accepted, 2026-10-19: reviewed with the owner through the object list, the composed island and the animation, and built in this PR.

## Problem

The hero island is one small 6×6 island with a house, a road, a river, a crane and two trucks that drive past. It looks finished, but it doesn't tell the story the headline does. "I take software from estimate to production" is a pipeline: raw material comes in, gets worked, gets checked and ships. Today's island has the pieces of a worksite but nothing flows through it. The trucks drive by empty, the crane holds a box that never goes anywhere, and nothing arrives or leaves.

## Proposed outcome

A bigger island, as sketched on the "Bigger island" design canvas, where something visibly goes in at one end and ships out at the other.

- **Three joined sections.** Today's island stays in the middle, as it is. A mining section is added on its L–B side, and a rail section on its T–R side. The road runs straight through all three, from the L–B edge to the T–R edge.
- **The mining section** has a stone arch tunnel at its L–B edge, where the road goes in, a mining conveyor, and a mine-cart track with mine carts.
- **The rail section** has train tracks that come up out of an underground tunnel at its T–L side and run to its B–R side, a cargo train on them, and the road crossing the tracks on a bridge.
- **The ends finish as drawn.** The road disappears into the stone tunnel, the train comes up from underground, and the rail section runs off the hero's right edge instead of floating whole.
- **One production line runs through it, as a loop:**
  1. The conveyor runs, and filtered ore falls into the mine carts.
  2. The mine carts roll along their track and drop their ore onto open-top trucks. The trucks may need a redesign for this.
  3. A truck waits until 4 ores are in it, then drives up to the river bridge.
  4. After crossing the river bridge it pauses and drops its ore into a hopper.
  5. The hopper feeds a covered conveyor. One part of it has a green LED light that glows, as if it had processed and passed the ore. What comes out the other end is cardboard boxes.
  6. The boxes are conveyed into a container van.
  7. The crane picks up the container van, lifts it and places it on the train. The crane may move from where it is today, so it reaches both the train and the container van's loading area.
  8. The train drives out of the scene off the rail section's B–R edge.

  It never runs dry: the ore, the trucks, the container vans and the train keep coming, so the line repeats forever.
- **The island keeps its character.** Same pixel-art style, same palette, same house, river, waterfall, trees and clouds.
- **On a phone,** the whole island shows, smaller, to fit the width.

## Affected users and systems

- **Home page visitors:** the hero's art gets bigger and animated end to end.
- **The hero island scene and its objects:** new objects for the mining and rail sections and the production line, and changes to some of today's (the trucks, the crane's load).
- **The hero's layout and its entrance animation,** since the island is wider and runs off the edge.
- **The pixel-art skills and the lab,** which are how the art gets made and reviewed. Designing a scene or the island should come with the site running and a link to the lab, so I can see the scenes and objects as they're made.

## Constraints

- **The design language holds:** world palette only, the 32×16 tile, the light direction, the size caps, no outlines, the island and Range look.
- **The island stays within its file-size budget.**
- **Reduced motion still stops everything.** Keyboard, focus and the hero copy are unchanged.
- **Public-safe art:** no names, logos or real places.
- **I review before it's built:** first the list of new objects, then the objects, then the composed scene.
- **Out of scope:** the hero copy, the Range, the achievement icons and the footer art. No robotic arm and no three-lane layout (the canvas's first sticky note).

## Open questions

None open. Decided with the owner at the layout review: the train is small (a truck-sized engine and one-tile cars and containers), the hopper, processor and container stand on the middle island, the crane stands on the rail section, and the rail section is grass. Decided earlier: the drawing is the idea, not the canvas's three-lane sticky note; the ends finish as drawn; the train leaves off the B–R edge; the crane may move to reach both the train and the container van; and a phone shows the whole island, smaller.
