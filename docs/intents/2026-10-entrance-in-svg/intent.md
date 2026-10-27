# Intent: Pixel Lab v0.10.0, and the build-ups from the SVG
Author: J. Law. Cordova (site owner). Status: accepted.

Follows Pixel Lab's entrance-in-SVG change in the lab repo (`jlawcordova-lab`, `docs/intents/2026-10-entrance-in-svg/`), released as v0.10.0 on 2026-10-27. That change's spec leaves the site's side to this repo (its Areas of concern 4), and it is the follow-up the site's v0.9.0 change named (`../2026-10-pixel-lab-v0-9/intent.md`).

## Problem

The hero island and each Range setting build themselves up block by block, and the site has two copies of how they do it:

- the scenes' entrances in the document, which Pixel Lab previews, renders and exports;
- the site's own schedule and player, with the entrance lab to tune them, which is what visitors see.

A test keeps the two copies' timing equal, but every change to a build-up still means changing both, and the site ships code of its own to play art that Pixel Lab already knows how to play. Pixel Lab v0.10.0 writes a scene's entrance into its published SVG, so a page can play it without code of its own. The site pins v0.9.0, so it can't use that yet.

## Proposed outcome

In the owner's words:

1. **Pin Pixel Lab v0.10.0,** checked against the release's published hashes, once its release has finished publishing. Check what glibc its Linux program needs, as the v0.9.0 change did.
2. **Rebuild the art.** Only the hero island and the Range's sprite change. Every other published file stays byte for byte the same, and the sizes stay within their budgets.
3. **The hero island builds up from its SVG,** on load and without script. The copy keeps its own stagger.
4. **Each Range setting builds up from the SVG** on every class change, and the first one still waits for the stage to come into view. The A button's hop never cuts a running build-up short.
5. **Retire the site's copy:** its schedule, its player, the entrance lab and their tests, plus anything only they used. The timing lives only in the document, and Pixel Lab must be v0.10.0 or later to open it.
6. **Prove it in the browser:** every piece ends at rest and fully shown, nothing runs under reduced motion, the Range rebuilds on a class change and still hops on A. The PR carries recordings of the hero build-up and a Range class change.

Visitors should see the same build-ups as today.

## Affected users and systems

- Home page visitors: the hero island, the Ask bot's bubble beside it, and the Range.
- The owner, who tunes a build-up in Pixel Lab from now on, since the entrance lab goes. Their Pixel Lab must be v0.10.0 or later.
- Agents editing the art through the `pixellab` CLI and MCP tools, and the pixel-art skills.
- The pinned program and its checks: `npm run art`, `npm test`, `npm run build`, the e2e checks and the deploy workflow.

## Constraints

- Use the released program, downloaded from the release and checked against its `SHA256SUMS`, never a build from the lab checkout. Wait for the release workflow to publish it.
- Work in a worktree from `origin/main`. The owner's main checkout has uncommitted edits of its own (`hero-island.json`, `meadow.json`, `.claude/launch.json`), which nothing here may touch. Run the `pixellab` CLI with an explicit `--document` on the worktree's document.
- Keep the dark theme's shadow color on the hero island.
- No new npm dependencies. Keep reduced-motion support.
- Follow the site's change workflow, and verify with `CLAUDE.md`'s checks, including the browser checks. The PR pastes `npm run build`, `npm test`, `npm run e2e` and `pixellab check`.
- One PR into `main`, from one slice, unless the plan says otherwise. The owner reviews only that PR.
- The repository is public: no secrets or private data in the docs or the commits.
- Out of scope:
  - Any new timing or look for the build-ups.
  - Removing the Motion library, which the rest of the site still uses.
  - The art's other loops, states and actions, beyond how the A button's hop shares the Range with the build-up.

## Open questions

None. The owner settled the steps and the rules in the request.
