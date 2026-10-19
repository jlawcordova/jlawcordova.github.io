---
name: design-scene
description: Design a pixel-art scene for this site, the hero island included, with Pixel Lab open on the work and the site running, so the owner can see, edit and approve every object and scene as it lands. Use whenever the owner asks to design, prototype, extend or level up a scene or the island, or to make the art assets for one. Builds on the pixel-art skill, uses the pixellab MCP tools and CLI, and runs the pixel-artist agent.
---
# Design a scene

The owner judges art by looking at it. When they ask for a scene or the island, keep the work visible from the first step: every object and scene you make is in the document the owner has open in **Pixel Lab** (the Mac app), and the site runs so the island can be judged where it lives. The art itself follows the `pixel-art` skill (the design language, formats and checks); this skill is how the work is run and shown.

## 1. Where the work shows

- **Pixel Lab** opens the site's document, `src/assets/pixel-art/jlawcordova.pixellab`, from the owner's checkout. If the app is installed (`ls "$HOME/Applications/Pixel Lab.app"`) and not running, open it with `open -a "Pixel Lab"`; if it isn't installed, say so once and hand over review PNGs instead. A source saved in the working tree is in the app at once (the app reloads a clean doc when its file changes), so the owner can open any object or scene you made from the sidebar, look at it on the stage, and edit it by hand.
- **Over MCP** (`mcp__pixellab__*`, when the server is registered), your saves are **proposals**: the owner sees them ghosted on the stage in the Agent window and approves or rejects each. Never apply, reject or force one yourself. The MCP server runs on the owner's checkout, not a worktree.
- **From a worktree,** the CLI writes the working tree directly (`npm run pixellab -- …`); the owner opens the worktree's document in Pixel Lab (File › Open Document…, or `PIXELLAB_DOC`) to see it, or you hand over PNGs.
- **The site:** from the main checkout, start the dev server with the Browser pane's `preview_start` and `{ name: "dev" }` (`.claude/launch.json`, port 4321); it reuses a running server. From a worktree, give it its own port (4322 and up; check `lsof -i :<port>` and the main checkout's `.claude/launch.json`) and add an entry to the **main checkout's** `.claude/launch.json` that runs `npm run dev -- --port <port>` with `--prefix <worktree>`. Never start the server with Bash, and never a second one for the same checkout. After `npm run art`, the home page shows the new SVGs on its next reload.

## 2. Hand over what to look at

In every report, give the owner, as a list:

- the name of each object and scene you made or changed (they open them in Pixel Lab from the sidebar; a double-click on a thumbnail opens an object);
- a review PNG of each: `npm run pixellab -- art preview <name> --scale 3 --out .art-preview/<name>@3x.png` (an object on its tile, a scene at its viewBox), attached or linked;
- for proposals over MCP, the proposal's id (`doc_save` returns it) and what it changes.

To show several new objects side by side, add a preview-only scene with no `output` (a review board, such as `scenes/<slug>-objects.mjs`) that places them on a few tiles, and name it. Remove it before the PR unless the spec keeps it.

## 3. Make the art: one subagent at a time

Run the work as a dynamic workflow of `pixel-artist` subagents (`.claude/agents/pixel-artist.md`):

- **One subagent per approved object,** started only after the previous one has reported. Never two at once. Small objects (a tile, a prop of a few pixels, a simple part) may share a run, at most 3 per run, so each still gets full attention. Large ones always get their own.
- **The scene gets its own subagent,** after every object it needs is in.
- **Brief each one fully:** the change's folder (`docs/intents/<YYYY-MM-slug>/`), the one object or scene it owns and what it's for, its size, frames and placement from the spec or the approved object list, the objects already made that it must match, whether it works over MCP (proposals) or in a worktree with the CLI, and these rules: don't start a server, don't commit, and change only what it owns.
- **When one reports,** check its work yourself: `npm run pixellab -- check <name>`, a look at its preview PNGs, and the source in the document. Then send the owner the names and the previews, and start the next one.
- **Feedback goes back to the subagent that made the piece** (SendMessage), so it keeps its context. A source the owner saved from Pixel Lab is the new baseline.

Pause for the owner only at the reviews the plan names (for example, the object list, then the objects, then the scene) or when blocked.

## 4. Review the scene

- For the hero island, the owner reviews the scene twice: in Pixel Lab (the stage, with the timeline for the motion), and on the home page at http://localhost:<port>/, where the entrance and loops run. Screenshot the home page at 1440px and 390px wide.
- For a sequence (pieces that travel and hand things on), build it as the scene's `motion`: Pixel Lab's timeline plays and scrubs it, and `scene render --time <ms>` renders any moment headless. Entrances and frame loops follow the `pixel-art-motion` skill.

## 5. Before the PR

- The `pixel-art` skill's checklist passes: `npm run art` reports every file `lossless` and none `OVER BUDGET`, and `npm test` shows `# fail 0`.
- Review boards and scratch scenes are gone unless the spec keeps them.
- Leave the dev server running and say how to stop it: `preview_stop`, or `npx astro dev stop` from the checkout.
