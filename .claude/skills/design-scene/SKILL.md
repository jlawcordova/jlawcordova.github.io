---
name: design-scene
description: Design a pixel-art scene for this site, the hero island included, with Pixel Lab open on the work and the site running, so the owner can see, edit and approve every object and scene as it lands. Use whenever the owner asks to design, prototype, extend or level up a scene or the island, or to make the art assets for one. Builds on the pixel-art skill, uses the pixellab MCP tools and CLI, and runs the pixel-artist agent.
---
# Design a scene

The owner judges art by looking at it. When they ask for a scene or the island, have Pixel Lab and the site running from the first step, and hand them every object and scene you make, so they can open it, look, and edit it by hand. The art itself follows the `pixel-art` skill (the design language, formats, the Pixel Lab tools and checks); this skill is how the work is run and shown.

## 1. Open Pixel Lab and run the site

**Pixel Lab** is where the owner looks, edits by hand and approves proposals. It reads the sources from the main checkout's working tree and reloads them as they change, so work shows up in it as it lands.

- Find the tools as the `pixel-art` skill's Pixel Lab section says, and call `site_info`: the MCP edits the checkout it names. Working in a worktree, use the CLI with `--site <worktree>`, and tell the owner Pixel Lab shows the main checkout, not the worktree, until they point its Settings (⌘,) at the worktree.
- If the app is installed (`ls "$HOME/Applications/Pixel Lab.app"`), open it with `open -a "Pixel Lab"`. If it isn't, say so once and rely on the web lab below.

**The site** is still needed for the home page, where the entrance and loops run, and for the web lab's links and Animation pane:

- **From the main checkout,** start the dev server with the Browser pane's `preview_start` and `{ name: "dev" }` (`.claude/launch.json`, port 4321). It reuses a server that's already running.
- **From a worktree,** give it its own port (4322 and up; check `lsof -i :<port>` and the main checkout's `.claude/launch.json` for ports other sessions hold) and add an entry to the **main checkout's** `.claude/launch.json` that runs `npm run dev -- --port <port>` with `--prefix <worktree>`. `preview_start` reads the main checkout's file.
- **Never start the server with Bash,** and never a second one for the same checkout.
- Open http://localhost:<port>/lab/pixel-art/ in the Browser pane and confirm it loads.

## 2. Hand over what to open

In every report, give the owner one entry per object or scene, as a list: its name to open in Pixel Lab (the sidebar lists the scenes, then the Library of objects), and its web lab link. Name any proposal waiting in Pixel Lab's Agent window by its id and doc.

The web lab loads every source under `src/assets/pixel-art/source/` from the working tree, and a link can open one document:

- an object: `http://localhost:<port>/lab/pixel-art/?object=<name>`
- a scene: `http://localhost:<port>/lab/pixel-art/?scene=<name>`

An unknown name opens the lab's default scene, so check the name. Open the one under review in the Browser pane too, and show the owner a `scene_render` or `object_render` of it. Before you hand a link over, confirm the server serves your version: `curl -s http://localhost:<port>/lab/pixel-art/ | grep -c '<marker>'`, with a name, row or key only your version has, prints more than 0.

To show several new objects side by side, add a preview-only scene with no `output` (a review board, such as `scenes/<slug>-objects.mjs`) that places them on a few tiles, and link it. The CLI builds one quickly: `scene new <slug>-objects`, then `scene place <slug>-objects <object> --at col,row,0` for each (it writes the board without an `output`). Remove it before the PR unless the spec keeps it.

## 3. Make the art: one subagent at a time

Run the work as a dynamic workflow of `pixel-artist` subagents (`.claude/agents/pixel-artist.md`):

- **One subagent per approved object,** started only after the previous one has reported. Never two at once. Small objects (a tile, a prop of a few pixels, a simple part) may share a run, at most 3 per run, so each still gets full attention. Large ones always get their own.
- **The scene gets its own subagent,** after every object it needs is in.
- **Brief each one fully,** naming items by their `id`, or by object and placement, rather than by `scene_items` path, since paths shift as earlier runs add groups. Include the change's folder (`docs/intents/<YYYY-MM-slug>/`), the one object or scene it owns and what it's for, its size, frames and placement from the spec or the approved object list, the objects already made that it must match, the lab URL from step 1, whether its edits land in the working tree (the default) or as Pixel Lab proposals for the owner to approve, the `--site` path when it works in a worktree, and these rules: don't start a server, don't commit, never apply a proposal, and change only what it owns.
- **When one reports,** check its work yourself: `check <name>` and a `scene_render` or `object_render` through Pixel Lab, `npm run art -- --check <name>`, a look at its preview PNGs, and the lab link serving it. Then send the owner the names to open and the link, the render, and any proposal ids, and start the next one.
- **Feedback goes back to the subagent that made the piece** (SendMessage), so it keeps its context. The owner's hand edits in Pixel Lab are saved to the working tree, which is the new baseline; so is a source exported from the web lab once it's saved at its path.
- **Small fixes you can make yourself** between subagents (a nudge, paint order, a pixel the owner pointed at) go through the CLI's commands (`scene_move`, `scene_raise`, `object_paint`), or through the MCP as a proposal when the owner wants to approve it in Pixel Lab.

Pause for the owner only at the reviews the plan names (for example, the object list, then the objects, then the scene) or when blocked.

## 4. Review the scene

- For the hero island, the owner reviews the scene twice: in Pixel Lab or the web lab (`hero-island`, `?scene=hero-island`) and on the home page at http://localhost:<port>/, where the entrance and loops run. Screenshot the home page at 1440px and 390px wide.
- For a sequence (pieces that travel and hand things on), build it as the scene's `motion`. Check moments of it with `scene_render --time <ms>`. Pixel Lab's timeline plays and scrubs it (⌥⌘P), and the web lab's Animation pane also re-keys it by hand, so give the owner both. Entrances and frame loops follow the `pixel-art-motion` skill.

## 5. Before the PR

- The `pixel-art` skill's checklist passes: `npm run art` reports every file `lossless` and none `OVER BUDGET`, and `npm test` shows `# fail 0`.
- Review boards and scratch scenes are gone unless the spec keeps them.
- No proposal for this change is waiting in Pixel Lab (`proposal_list`): each is approved and in the working tree, or the owner rejected it.
- Leave the dev server running and say how to stop it: `preview_stop`, or `npx astro dev stop` from the checkout.
