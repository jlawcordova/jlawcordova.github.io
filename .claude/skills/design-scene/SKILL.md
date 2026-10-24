---
name: design-scene
description: Design a pixel-art scene for this site, the hero island included, with Pixel Lab open on the work and the site running, so the owner can see, edit and approve every object and scene as it lands. Use whenever the owner asks to design, prototype, extend or level up a scene or the island, or to make the art assets for one. Builds on the pixel-art skill, uses the pixellab MCP tools and CLI, and makes the art in the main session.
---
# Design a scene

The owner judges art by looking at it. When they ask for a scene or the island, keep the work visible from the first step: every object and scene you make is in the document the owner has open in **Pixel Lab** (the Mac app), and the site runs so the island can be judged where it lives. The art itself follows the `pixel-art` skill (the design language, formats and checks); this skill is how the work is run and shown.

## 1. Where the work shows

- **Pixel Lab** opens the site's document, `src/assets/pixel-art/jlawcordova.pixellab`, from the owner's checkout. If the app is installed (`ls "$HOME/Applications/Pixel Lab.app"`) and not running, open it with `open -a "Pixel Lab"`; if it isn't installed, say so once and hand over review PNGs instead.
- **Over MCP** (`mcp__pixellab__*`), the way art changes in the owner's checkout: make the change with the MCP's tools. Each edit applies to the document as it's made and saves itself (there are no proposals since Pixel Lab v0.7.0). With Pixel Lab open, the owner watches it land on the stage, can open it from the sidebar and edit it by hand, and finds every change as a version in the Versions panel. `doc_undo` and `history_undo` take back an edit or a version of yours (the `pixel-art` skill, Pixel Lab). Don't write sources in the owner's checkout by hand. The MCP server runs on the owner's checkout, not a worktree.
- **From a worktree,** the CLI writes the working tree directly (`npm run pixellab -- …`); the owner opens the worktree's document in Pixel Lab (File › Open Document…, or `PIXELLAB_DOC`) to see it, or you hand over PNGs.
- **The site:** from the main checkout, start the dev server with the Browser pane's `preview_start` and `{ name: "dev" }` (`.claude/launch.json`, port 4321); it reuses a running server. From a worktree, give it its own port (4322 and up; check `lsof -i :<port>` and the main checkout's `.claude/launch.json`) and add an entry to the **main checkout's** `.claude/launch.json` that runs `npm run dev -- --port <port>` with `--prefix <worktree>`. Never start the server with Bash, and never a second one for the same checkout. After `npm run art`, the home page shows the new SVGs on its next reload.

## 2. Hand over what to look at

In every report, give the owner, as a list:

- the name of each object and scene you made or changed (they open them in Pixel Lab from the sidebar; a double-click on a thumbnail opens an object);
- a review image of each: `art_preview` over the MCP (an object on its tile, a scene at its viewBox);
- what changed in each, and each new object's category.

To show several new objects side by side, add a preview-only scene with no `output` (a review board, such as `scenes/<slug>-objects.json`) that places them on a few tiles, and name it. Remove it before the PR unless the spec keeps it.

## 3. Make the art: in this session, one piece at a time

Make every approved object, then the scene, yourself, in this session, with the `pixel-art` skill and its reference files. One context keeps what each object settled (its colors per face, its texture, how it meets the ground) in front of you for the next one, and the owner's feedback lands where the work was done. Handing each piece to a subagent lost that at every hand-off (Anthropic's article on [when to fold subagents into the main agent loop](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop)).

- **One object at a time,** in the order of the approved list. Small objects (a tile, a prop of a few pixels, a simple part) may go together, at most 3 at once, so each still gets full attention. The scene comes last, once every object it needs is in.
- **Before each one,** open the skill's reference files it needs (`rules.md` for anything on the island or the Range, `blocks.md` for a block, `cost.md` for its bytes), save the before images, and look at the objects already made that it must match.
- **After each one,** `check` each doc and `art_preview` it, run `npm run art` and `npm test`, and send the owner the names and the images to review in Pixel Lab (§2). Go on to the next once the owner is happy with it.
  - An edit the MCP can't express: ask the owner before writing it (the `pixel-art` skill, Pixel Lab).
- **Feedback** is applied here, as the skill's `review.md` (Feedback rounds) says. A source the owner saved from Pixel Lab is the new baseline.
- **Keep the context light:** look at renders at the scale the question needs, and save only the review images. If a long run gets to where earlier decisions slip, write what's settled (each object's colors per face and texture) into the change's `notes.md`, and suggest the owner continue in a fresh session from it, rather than splitting the work across agents.
- **The `pixel-artist` agent** (`.claude/agents/pixel-artist.md`) is for a fresh-eyes critique of a piece before the owner reviews it, where not sharing this session's context is the point. It doesn't edit; weigh what it finds yourself.

Pause for the owner only at the reviews the plan names (for example, the object list, then the objects, then the scene) or when blocked.

## 4. Review the scene

- For the hero island, the owner reviews the scene twice: in Pixel Lab (the stage, with the timeline for the motion), and on the home page at http://localhost:<port>/, where the entrance and loops run. Screenshot the home page at 1440px and 390px wide.
- For a sequence (pieces that travel and hand things on), build it as the scene's `motion`: Pixel Lab's timeline plays and scrubs it, and `scene render --time <ms>` renders any moment headless. Entrances and frame loops follow the `pixel-art-motion` skill.

## 5. Before the PR

- The `pixel-art` skill's checklist passes: `npm run art` reports every file `lossless` (an over-budget line is a warning to report), `npm run pixellab -- check` shows no new warnings, and `npm test` shows `# fail 0`.
- Review boards and scratch scenes are gone unless the spec keeps them.
- Leave the dev server running and say how to stop it: `preview_stop`, or `npx astro dev stop` from the checkout.
