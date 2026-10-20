# Intent: The art moves to Pixel Lab's depth order
Author: J. Law. Cordova (site owner). Status: accepted (the owner approved ahead of review; reviewed once, in the final PR).

Depends on the lab change `2026-10-depth-order` in `jlawcordova-lab`, released as Pixel Lab v0.5.0.

## Problem
Pixel Lab used to paint a scene's items in the order the file lists them, so the site's scenes were hand-ordered back to front, and raising or lowering an item was how an overlap got fixed. From v0.5.0 the engine draws each item by where it stands, every edit keeps the list in that order, and raising and lowering are gone. The site still pins v0.3.0, so it can't use the new engine, its art files aren't in the order the new engine expects, and the skills and agent that describe the art still teach the old model.

Moving the pin isn't enough on its own: the new engine draws some of the art differently straight away, because it works the order out from where things stand. Where the hand-tuned order was right and the computed one isn't, the art has to be told more about where things stand, or it will look wrong.

## Proposed outcome
- **The site runs on Pixel Lab v0.5.0,** and every Pixel Lab command the site's workflow uses is the new engine's.
- **The art looks as the owner approved it.** Wherever the computed order would change the art for the worse, the scene says more about where things stand (how high something is, how much ground it covers, or that it draws in front of or behind the rest) until it draws right. Any visible change that remains is shown to the owner with before and after pictures and a reason.
- **The art files are in depth order,** so the new engine's checks pass and the files read back to front.
- **The close-ups still show the island as the island shows it,** and the test that holds them to it keeps its strength.
- **The docs, skills and agent describe depth order,** not raising, lowering or listing back to front by hand.
- **One PR, reviewed once at the end,** with the decisions that were the owner's listed, each with what was chosen, the alternative and a before/after picture or number.

## Affected users and systems
Visitors to the home page (the hero island and the Range), the owner and agents who draw and arrange art, the art's sources and its published SVGs, the island's build-up, the close-up review scenes, the pixel-art skills and the pixel-artist agent, and the tests that read the art.

## Constraints
- **Use the current tools only:** the v0.5.0 release from the lab's tag, never a pinned commit, and every Pixel Lab command through this repo's CLI. Edit sources only through those commands, or by hand where the pixel-art skill allows it. Never hand-edit the generated SVGs.
- Prefer heights and the front/back override over regrouping pieces. Group the crane's parts only if nothing else looks right, because grouping changes how it enters.
- Keep every moving piece alone in its own entrance group, unless a copy is clearly worth it.
- Keep `hero-island.svg` within its budget. If it can't be, raise the budget by the least that works and say why.
- Don't weaken a test to make it pass.
- The site's usual checks all pass, and the art's rules (palette, grid, light, size caps) still hold.
- Out of scope: new art, changes to the lab repo, and changing how the island builds up beyond what the new order does to it.

## Open questions
None. Where a choice is the owner's, the spec takes the option the lab's spec and site notes favour, and the PR lists it for review.
