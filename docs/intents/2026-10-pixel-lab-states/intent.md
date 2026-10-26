# Intent: The site's art in Pixel Lab states
Author: J. Law. Cordova (site owner). Status: accepted.

Depends on Pixel Lab's object states change in the lab repo (`jlawcordova-lab`, `docs/intents/2026-10-object-states/`), merged on 2026-10-24 and released as v0.8.0. That change's spec leaves the site's side to this repo (its Areas of concern 1 and 2).

## Problem

Pixel Lab v0.8.0 adds object states, in the owner's words:

> named runs of a sprite's frames plus one move of the whole sprite, that loop, hold, or hand over with `then`. A page switches them with `data-state`, and a scene's motion keys can change an item's state.

The site can't use them yet. It pins an older Pixel Lab, and the releases before v0.8.0 reject a document that has states. Its art still animates the old ways: the Range character bobs with a layer ambient loop and hops with a layer action, and the hero island's moving parts change their look by posing as other objects. The crane hook, for one, swaps between `crane-hook`, `crane-hook-drop` and `crane-hook-low`. Those pose objects are states in all but name, and the island's crossing signals alone need 34 keys to flash their lamps.

## Proposed outcome

In the owner's words, the change has two parts, in order:

1. **Pin the release.** The site moves to Pixel Lab v0.8.0, with the program checked against the release's published hashes. The art comes out the same: every SVG lossless, no new problems or warnings, and every published SVG byte-identical to before. That last check is why the pin goes alone first, since the engine promises byte-identical output for documents without states.
2. **Convert the art to states,** with Pixel Lab's commands on a branch, never by hand:
   - The character's bob becomes an `idle` state and its hop a one-shot `hop` state that hands back to `idle`. The Range's A button keeps working as it does today, and that is checked in the built page.
   - Each pose family on the hero island becomes one object with states: the crane hook (drop, low), the crane jib, the mine cart, the crossing gates, the open truck, and the crossing signals, whose alternating lamps become one looping `flash` state.
   - The island looks the same at every moment of its loop. The conversion refuses otherwise.
   - The pose objects are deleted only once nothing else uses them.
   - The island's byte size is reported before and after.

**Visitors see no difference.** The home page's island and the Range play exactly as they do today.

## Affected users and systems

- Home page visitors: the hero island and the Range, only in that nothing they see may change.
- The owner, editing the document in Pixel Lab, which must be on the same release to open it once it has states.
- Agents editing the art through the `pixellab` MCP tools, the CLI, and the pixel-art skills.
- The pinned program and its checks: `npm run art`, `npm test`, `npm run build`, the e2e checks and the deploy workflow.

## Constraints

- Use the released program, downloaded from the release and checked against its `SHA256SUMS`, never a build from the lab checkout.
- Pin first, on its own, and prove the outputs byte-identical before any art changes.
- Convert with the CLI, in this checkout or a worktree, not in the owner's open Pixel Lab document, and never by hand.
- The Range's A button keeps hopping the character through the page code it has today.
- No new npm dependencies.
- Follow the site's change workflow, and verify with `CLAUDE.md`'s checks, including the browser checks.
- The repository is public: no secrets or private data in the docs or the commits.
- The owner reviews only the final PR.
- Out of scope:
  - Moving the page to `data-state`. `data-play` keeps working, and a switch is a later change of its own.
  - New states, or any change to how the art looks or moves.
  - The explainer library, which has no ambient loops, actions or poses to convert.

## Open questions

None. The owner settled the order, the commands and the checks in the request.
