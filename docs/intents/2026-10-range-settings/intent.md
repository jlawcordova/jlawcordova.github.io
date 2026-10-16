# Intent: Each Range character in its own setting
Author: J. Law. Cordova (site owner). Status: built on `feat/range-settings` in [#114](https://github.com/jlawcordova/jlawcordova.github.io/pull/114)–[#120](https://github.com/jlawcordova/jlawcordova.github.io/pull/120); accepted when the owner merges [#113](https://github.com/jlawcordova/jlawcordova.github.io/pull/113). The owner asked for the intent, spec and plan to be written together, and the work to start on them, so they're reviewed in the change's final PR rather than merged one by one.

## Problem
Every Range character stands on the same grass platform, so the scene says nothing about the discipline beside it: the alchemist, the knight and the person in a suit all stand in the same field. And when the carousel changes class, the new character just slides in from the side. The hero island now builds itself from its blocks as the page loads, and the Range doesn't share that feel.

A prototype put the Data Engineering alchemist in a lab, with a brick floor, a bookcase, an alembic and a cauldron, and built it up block by block on each switch. The owner liked it, and liked the brick floor in particular.

## Proposed outcome
- **The Range characters stagger in as well.** When the class changes, the new character's setting builds itself the way the hero island does: the blocks float up, then the objects and the character arrive.
- **Each character is in a different setting that fits its theme,** made from new blocks. For example, the alchemist is in a lab.
- **The alchemist's lab is the sample** the other six follow, with the brick floor the owner picked.

## Affected users and systems
Home page visitors, the Range carousel and its motion, the Range's pixel art and its pipeline, and the pixel-art skill and agent that draw it.

## Constraints
- **The site's motion rules still hold:** nothing animates under reduced motion, and the Range shows its first class in full without JavaScript.
- **The site's art rules still hold:** the art is edited only in its sources, uses the world palette and the light direction, stays within the engine's caps, has no outlines, and stays inline SVG.
- **The characters stay as they are.** The settings change, not the outfits.
- **The carousel still works as it does today:** the copy, nameplates, controls and keyboard behavior.
- **Each character's setting is made and reviewed on its own,** one at a time, and the owner approves each one before the next starts.
- **The settings stay generic and public-safe:** no names, lettering, logos or likenesses.
- No new dependencies.
- **Out of scope:** the hero island, the characters' outfits, and the Range copy.

## Open questions
- What setting fits each of the other six characters? The spec can propose them, and the owner decides at each one's review.
- Does the carousel need to advance more slowly, now that each class builds itself in?
