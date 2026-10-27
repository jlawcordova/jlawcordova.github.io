# Intent: Pixel Lab v0.9.0, and the build-ups in the document
Author: J. Law. Cordova (site owner). Status: accepted.

Follows Pixel Lab's video export change in the lab repo (`jlawcordova-lab`, `docs/intents/2026-10-video-export/`), released as v0.9.0 on 2026-10-27. That change's spec leaves the site's side to this repo (its Areas of concern 4 and 5).

## Problem

Pixel Lab v0.9.0 moves the site's build-up schedule into its engine. A scene can now hold an `entrance`, the timing the site's hero island and Range play when they build themselves block by block, and Pixel Lab previews, renders and exports videos of it. The site can't use that yet:

- It pins v0.8.0, which rejects a scene with an `entrance` as an unknown property.
- The hero island's and the Range's timing live only in the site's code (`TIMING` and `RANGE_TIMING` in `src/lib/island-entrance.mjs`), so Pixel Lab plays neither scene the way a visitor sees it.

The lab's spec settled the order: the site pins the release first, then gives the two scenes their timing with `scene entrance set --timing`, as a site art change.

## Proposed outcome

In the owner's words, two steps, in order:

1. **Bump the pixellab pin to v0.9.0.** The program is checked against the release's published hashes, and the art comes out the same.
2. **Give the hero island and the Range their entrance timing** with `scene entrance set --timing`, pasting the site's own `TIMING` and `RANGE_TIMING`.

**Visitors see no difference.** v0.9.0 publishes the same SVG with or without an entrance, and the site keeps playing its build-up with its own code.

The site keeps its own copy of the entrance logic. The follow-up moves the entrance into the SVG, and until then the two copies can drift. The lab's `scripts/entrance-parity.mjs` shows the drift.

## Affected users and systems

- Home page visitors: the hero island and the Range, only in that nothing they see may change.
- The owner, editing the document in Pixel Lab, which must be v0.9.0 or later to open it once it has entrances.
- Agents editing the art through the `pixellab` MCP tools, the CLI and the pixel-art skills, and anyone tuning a build-up in the entrance lab.
- The pinned program and its checks: `npm run art`, `npm test`, `npm run build`, the e2e checks and the deploy workflow.

## Constraints

- Use the released program, downloaded from the release and checked against its `SHA256SUMS`, never a build from the lab checkout.
- The release's Linux program is built on `ubuntu-latest` (26.04), so the site's CI could hit glibc errors on an older Ubuntu. Check what it needs, and make sure CI runs it.
- Set the timing with the CLI in a worktree, not in the owner's open Pixel Lab document, and never by hand.
- No new npm dependencies. No change to what the home page shows or how it moves.
- Follow the site's change workflow, and verify with `CLAUDE.md`'s checks, including the browser checks.
- The repository is public: no secrets or private data in the docs or the commits.
- The owner reviews only the final PR, which carries a Playwright recording as proof that it passes.
- Out of scope:
  - Moving the build-up into the SVG and retiring the site's `island-entrance.mjs`, its player and its entrance lab. That's the follow-up.
  - Any new timing. The scenes get exactly what the site plays today.
  - Videos, sequences and scene transitions, which are for videos and not for the site.

## Open questions

None. The owner settled the order and the command in the request.
