---
name: design-scene
description: Design a pixel-art scene for this site, the hero island included, with the site running and lab links the owner can open. Use whenever the owner asks to design, prototype, extend or level up a scene or the island, or to make the art assets for one, so every object and scene made along the way can be viewed in the lab at /lab/pixel-art/ as it lands. Builds on the pixel-art skill and runs the pixel-artist agent.
---
# Design a scene

The owner judges art by looking at it. When they ask for a scene or the island, keep the site running from the first step and hand them a lab link for every object and scene you make, so they can open it, look, and edit it by hand. The art itself follows the `pixel-art` skill (the design language, formats and checks); this skill is how the work is run and shown.

## 1. Run the site

- **From the main checkout,** start the dev server with the Browser pane's `preview_start` and `{ name: "dev" }` (`.claude/launch.json`, port 4321). It reuses a server that's already running.
- **From a worktree,** give it its own port (4322 and up; check `lsof -i :<port>` and the main checkout's `.claude/launch.json` for ports other sessions hold) and add an entry to the **main checkout's** `.claude/launch.json` that runs `npm run dev -- --port <port>` with `--prefix <worktree>`. `preview_start` reads the main checkout's file.
- **Never start the server with Bash,** and never a second one for the same checkout.
- Open http://localhost:<port>/lab/pixel-art/ in the Browser pane and confirm it loads.

## 2. Hand over lab links

The lab loads every source under `src/assets/pixel-art/source/` from the working tree, and a link can open one document:

- an object: `http://localhost:<port>/lab/pixel-art/?object=<name>`
- a scene: `http://localhost:<port>/lab/pixel-art/?scene=<name>`

An unknown name opens the lab's default scene, so check the name. Give the owner one link per object or scene in every report, as a list. Open the one under review in the Browser pane too. Before you hand a link over, confirm the server serves your version: `curl -s http://localhost:<port>/lab/pixel-art/ | grep -c '<marker>'`, with a name, row or key only your version has, prints more than 0.

To show several new objects side by side, add a preview-only scene with no `output` (a review board, such as `scenes/<slug>-objects.mjs`) that places them on a few tiles, and link it. Remove it before the PR unless the spec keeps it.

## 3. Make the art: one subagent at a time

Run the work as a dynamic workflow of `pixel-artist` subagents (`.claude/agents/pixel-artist.md`):

- **One subagent per approved object,** started only after the previous one has reported. Never two at once. Small objects (a tile, a prop of a few pixels, a simple part) may share a run, at most 3 per run, so each still gets full attention. Large ones always get their own.
- **The scene gets its own subagent,** after every object it needs is in.
- **Brief each one fully:** the change's folder (`docs/intents/<YYYY-MM-slug>/`), the one object or scene it owns and what it's for, its size, frames and placement from the spec or the approved object list, the objects already made that it must match, the lab URL from step 1, and these rules: don't start a server, don't commit, and change only what it owns.
- **When one reports,** check its work yourself: `npm run art -- --check <name>`, a look at its preview PNGs, and the lab link serving it. Then send the owner the link and the preview, and start the next one.
- **Feedback goes back to the subagent that made the piece** (SendMessage), so it keeps its context. A source the owner exported from the lab is the new baseline.

Pause for the owner only at the reviews the plan names (for example, the object list, then the objects, then the scene) or when blocked.

## 4. Review the scene

- For the hero island, the owner reviews the scene twice: in the lab (`?scene=hero-island`) and on the home page at http://localhost:<port>/, where the entrance and loops run. Screenshot the home page at 1440px and 390px wide.
- For a sequence (pieces that travel and hand things on), build it as the scene's `motion` and give the owner the lab link: the Animation pane plays it, and they can scrub and re-key it by hand. Entrances and frame loops follow the `pixel-art-motion` skill.

## 5. Before the PR

- The `pixel-art` skill's checklist passes: `npm run art` reports every file `lossless` and none `OVER BUDGET`, and `npm test` shows `# fail 0`.
- Review boards and scratch scenes are gone unless the spec keeps them.
- Leave the dev server running and say how to stop it: `preview_stop`, or `npx astro dev stop` from the checkout.
