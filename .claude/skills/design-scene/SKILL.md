---
name: design-scene
description: Design a pixel-art scene for this site, the hero island and the Range's settings included, keeping the work visible so the owner can see and approve every step. Use whenever the owner asks to design, prototype, extend or rearrange a scene or the island, or to plan the objects one needs. Scenes are arranged here from the owner's art studio's objects with the `pixpocket` CLI; new objects are drawn in the studio repo. Builds on the pixel-art skill, and runs in the main session.
---
# Design a scene

The owner judges art by looking at it. When they ask for a scene or the island, keep the work visible from the first step: review images of every stage, and the site running so the island can be judged where it lives. How the art is changed and checked is the `pixel-art` skill; this skill is how the work is run and shown.

A scene on this site is arranged from objects that the owner's art studio (`jlawcordova-vlog`) draws. So a design has two parts: **which objects**, most of which the studio already has, and **where they stand**, which is this document's scene.

## 1. Where the work shows

- **Review images.** `npm run pixpocket -- preview scene:<name> --scale 3 --out .art-preview/<name>@3x.png` after each step, and `render` for a window (`--view x,y,w,h`), a moment (`--time`), a Range class (`--show`) or the dark theme (`--theme dark`). Send the owner the image, not a description of it.
- **Pixpocket's app.** If the owner has Pixpocket, `pixpocket app` opens the document in their browser, where they can look and edit by hand. What they save is the new baseline: diff the working tree before your next edit, and keep their changes. If this session has Pixpocket's MCP server (`pixpocket serve --mcp`), your edits land in the document they have open as you make them.
- **The site.** From the main checkout, start the dev server with the Browser pane's `preview_start` and `{ name: "dev" }` (`.claude/launch.json`, port 4321); it reuses a running server. From a worktree, give it its own port (4322 and up) with an entry in the main checkout's `.claude/launch.json` that runs `npm run dev -- --port <port>` with `--prefix <worktree>`. Never start a second server for the same checkout. After `npm run art`, the home page shows the new SVGs on its next reload.
- **Without Pixpocket** nothing here can be changed (the `pixel-art` skill, The program). Say so before planning anything.

## 2. Start from what the studio has

1. **List the objects.** The studio's `README.md` and its art style (`studio/studio.pixpocket/art-style.md`) describe the libraries (Office, Agents, Cast, Range, Effects and more). In a studio checkout, `pixpocket object list` and its contact sheets show them. Here, `npm run pixpocket -- object list` shows what the document already has.
2. **Propose the scene as a list:** each area, the objects in it, the people and robots with what each is doing (one state each), and anything the studio doesn't have yet. Give a rough byte estimate for the hero or the Range (about 5 KB a frame for a figure; `check <scene> --sizes` for what's there).
3. **New objects are studio work.** Draw them in the studio repo with its skills (`pixel-art-style` first, then `art-library` or `art-generators`, and `art-review` for the owner's verdicts), one piece at a time, before the scene needs them. If this session has no studio checkout, hand the owner the list and stop there.

Pause for the owner at the reviews the plan names (for example the object list, then the layout, then the page), or when blocked.

## 3. Build it in this session, one area at a time

Arrange the scene yourself, in this session, so what each area settled stays in front of you for the next, and the owner's feedback lands where the work was done.

- **Save the before image first.**
- **One area at a time** (the floor and walls, then one room, then the people). After each: `npm run pixpocket -- check <scene>`, a review image, and the owner's look where the plan names one.
- **On the hero island every piece is its own `enter` group** with its role and foot, in the scene layer for its area. In a Range setting, pieces go in the class's `data-class` group, with one `character` (the `pixel-art` skill, Arranging a scene).
- **Bring in studio objects with the export** (`python3 scripts/export-site-art.py <this checkout>` in the studio checkout), then `npm run art`.
- **To try variants,** copy the document to a scratch folder outside the repo and point the commands at it with `--document <copy>`. Copy only the winner back.
- **Feedback:** apply only what was asked, then re-run the checks and images for what it affects. Don't redo settled areas.
- **Keep the context light:** look at renders at the scale the question needs. If a long run gets to where earlier decisions slip, write what's settled into the change's `notes.md` and suggest a fresh session from it, rather than splitting the work across agents.
- **The `pixel-artist` agent** is for a fresh-eyes critique before the owner reviews, where not sharing this session's context is the point. It doesn't edit; weigh what it finds yourself.

## 4. Review the scene

- For the hero island and the Range, the owner reviews twice: the review images, and the home page at http://localhost:<port>/, where the build-up and the states run. Screenshot the home page at 1440px and 390px wide, in light and dark, and confirm there's no horizontal scroll.
- A changed island changes its build-up: check `scene entrance show <scene>` and the settle time `scripts/entrance-svg.test.mjs` pins. Entrances and states follow the `pixel-art-motion` skill.
- The Ask bubble sits over the founder in the `.ask-character` group. If he moves, check the bubble on the page and run `npm run e2e -- scripts/e2e/ask.e2e.mjs`.

## 5. Before the PR

- The `pixel-art` skill's checks pass: `npm run pixpocket -- check` shows no problems and no new warnings, `npm run art` reports every file `lossless` (an over-budget line is a warning to report), and `npm test` shows `# fail 0`.
- The sources, the SVGs and `published.json` are in the commit together. Scratch scenes and copies are gone.
- Leave the dev server running and say how to stop it: `preview_stop`, or `npx astro dev stop` from the checkout.
