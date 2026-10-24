# Review images, hand-offs and the report

Part of the `pixel-art` skill ([SKILL.md](SKILL.md)). Read it before you hand art to the owner: what to save, what to report, how feedback rounds go, and the habits that save time while you iterate.

## What every change hands back

1. **The change in the document,** over the MCP in the owner's checkout, with a category on every new object. In a worktree, sources in canonical JSON at their real paths under `src/assets/pixel-art/jlawcordova.pixellab/` (`check` warns about one that isn't).
   - They must pass `check <name>` in the MCP session (`npm run pixellab -- check <name>` in a worktree) and open in Pixel Lab.
   - Keep maps readable: one row per line, keys chosen by material (lowercase for a shade, uppercase for the darker one), and no unused keys.
2. **Review images** in the folder the task names (by default `docs/intents/<change>/samples/`):
   - `before-<name>.png` and `after-<name>.png` at @3x for every object and scene you touched, plus the scene that shows them (usually `hero-island`; for the Range, see [The Range](#the-range));
   - the group's close-up at @6x as `before-<x>-closeup.png` and `after-<x>-closeup.png`, where `<x>` is the close-up's name without `closeup-` (for example `before-land-closeup.png`) ([Close-ups](#close-ups));
   - for a new object, the before image is the object it replaces in those positions.
   - Make the before images before you change anything, and look at every image you save.
3. **The scenes and objects to open in Pixel Lab** ([Hand over for hand edits](#hand-over-for-hand-edits)).
4. **A short report:**
   - what changed per object and why;
   - the colors per face (top, left, right, and any band or texture shades);
   - how the texture is laid out and how you handled seams and joints;
   - the image paths;
   - which scenes and objects to open in Pixel Lab;
   - each doc you changed and what changed in it, and each new object's category;
   - any edit the MCP couldn't express, with exactly what it is and where it goes (ask before writing it: [SKILL.md](SKILL.md#pixel-lab-the-mcp-and-the-cli));
   - the tail of `npm run art` (every file `lossless`, and any over-budget warning) and of `npm run pixellab -- check` (no new warnings) and of `npm test` (`# fail 0`, or each failure listed by name, with its cause, and marked *expected* or *unexpected*), and `npm run build` when the task needs it;
   - your objects' raw and gzip bytes before and after, from `art sizes`;
   - the engine limits you hit;
   - choices the owner should weigh in on, with the alternatives you tried.

## Hand over for hand edits

**Pixel Lab first.** MCP edits show on its stage as they're made, and each is a version in its Versions panel, where the owner can take it back. Name each scene and object for the owner to open (its sidebar lists the scenes, then the Library of objects; double-click an object for Object mode). When the owner edits by hand there and saves, the file on disk changes: that's the new baseline ([Feedback rounds](#feedback-rounds)).

There's no server to start for the art: the sources at their real paths in the working tree are the hand-off. When the work is in a worktree, name the worktree's document path too (`<worktree>/src/assets/pixel-art/jlawcordova.pixellab`): File › Open Document… in Pixel Lab opens it.

## The Range

- **Review images:** the Range scene at @1x and @3x for each of the seven classes you touched (3× is its size on the page). `art preview range-sprite` and Pixel Lab draw only the first `data-class` group, so make each from a scratch copy of `range-sprite` that keeps the shadow and only that class's group, saved under another name with no `output`. To look at a class while you work, `scene_render range-sprite --show <path>` (any item path in its group) needs no copy. Add a close-up of the figure on one tile at @10x when proportions are under review.
- **A new setting** ([Range settings](SKILL.md#range-settings)): `<class>-before@1x/@3x` (the class as it was), `<class>-after@1x/@3x/@6x`, the floor set as `block-<setting>@6x`, and each prop at @6x, in the change's `samples/`. Report the setting's own bytes (floor and each prop) from `art sizes`, against about 22 KB raw and 5 KB gzip.
- **Pixel Lab:** open the scene `range-sprite` and the objects you touched (`character`, `outfit-<class>`, any `prop-<class>-*`). The stage shows group 0 only (`scene_render --show <path>` draws another class), so review other classes in Object mode or in the images.
- **Sizes:** `npm run pixellab -- art sizes range-sprite`.

## Achievement icons

- **Review images:** each icon you touched at @1x and @3x (3× is its 48px size on the page), the `achievement-icons` sheet at @4x, and a states image: the icon at 3× on the row background (`--color-surface`), and dimmed as a locked row shows it (grayscale at 40% opacity) with `icon-lock` drawn over its upper-right corner, offset 2 px up and right at 3×. `art preview` only paints the card color, so composite the states image in a scratch script.
- **Pixel Lab:** open the scene `achievement-icons` and the `icon-*` objects you touched.
- **Sizes:** `npm run pixellab -- art sizes achievement-icons`. Keep the sheet within about 6 KB gzip.
- **Rules:** every `icon-*` is a 16×16 world-color sprite within 12 colors with no `ink`, and the sheet places them in `SHEET_ORDER` (no test checks this since v0.6.0; `scripts/achievement-icons.test.mjs` checks the icon list and the skill's table). Don't touch the scene or the icon list; a new icon is added through the `achievement-icon` skill's steps.

## Close-ups

- **Previews:** `npm run pixellab -- art preview <name> --scale N --out .art-preview/<name>@Nx.png`. Use @3x for objects, the island and the Range, and @6x for close-ups. Also look at @1x, where texture should fade to grain.
- Check that an object you grew still fits its close-up's view, and report it if it doesn't. Use the committed preview-only close-up scenes. Don't build your own. Every close-up item matches an island item exactly (no test checks it since v0.6.0), so a rename or swap in `hero-island` has to reach every close-up that places the object (the land's blocks are also in `closeup-front-trees`), in the same commit ([Close-ups](SKILL.md#the-npm-run-art-path)).

| Group | Close-up |
| --- | --- |
| Land | `closeup-land` (front corner, both cliffs), `closeup-road-end` |
| Water | `closeup-water` |
| Clouds | `closeup-sky` |
| Trees | `closeup-front-trees` (and `closeup-crane` for the pine behind the mast) |
| Office | `closeup-office` |
| Crane | `closeup-crane` |
| Bridge | `closeup-office` (bridge and rail) |
| Mining, processing, rail | `closeup-road-end`, `closeup-crane` |

## Feedback rounds

When the owner gives feedback or has edited by hand:

- The working tree is the new baseline: the owner's Pixel Lab saves and every MCP edit land there directly. Diff it against your last version (`git diff`, or your copy) so you know exactly what the owner changed, and keep their edits.
- `history_list` shows the document's versions, yours and the owner's. One of yours the owner took back is undone in a later version: ask what to change rather than making it again.
- Small feedback (a pixel, a color, a nudge, what draws in front) is quickest as commands: `object_paint`, `object_erase`, `scene_move`, and for depth `scene_set --level` (a pixel item), `scene_set --depth front|back|auto` or `object_footprint`, through the MCP (the CLI in a worktree). There is no raise or lower, and reordering lines doesn't stick: every edit re-sorts the scene by where things stand, and can change paths, so list the items again after an edit ([Depth order](SKILL.md#depth-order)).
- Apply only the requested change, then re-run checks and previews for what it affects. Don't redo the before images, unrelated objects or settled decisions.
- If you built a source with a generator script, feed the owner's edits back into it, or edit the exported source directly. Never regenerate over their hand edits.
- Report what changed since the last round. Save new images as `after-<name>.png` (overwriting), or with a round suffix if the owner wants to compare rounds.

## Working efficiently

- **Look with renders, not files.** `scene_render` and `object_render` hand you the image directly, with each item's bounds, at any scale, frame or time, and include unsaved MCP edits. Use them for every look while you iterate, at the scale the question needs, and `art preview` only for the images you save.
- **See an edit before you write it.** CLI edits take `--dry-run` and print the diff. In the MCP session, edit, render and `check`, and `doc_undo` what doesn't work.
- **Find items by path, and re-list them.** `scene_items` lists every item with its path, id and placement point, which beats reading a long scene source. Paths shift when anything is added before them, so treat a path in a brief or a plan as a hint and find the item by its id or object and placement.
- **Try variants in a scratch workspace,** so the repo stays clean:
  - copy the document with `npm run pixellab -- document copy --to <scratch>/ws.pixellab`;
  - then run `npm run pixellab -- art preview <name> --scale 6 --out <scratch>/<name>@6x.png --document <scratch>/ws.pixellab` (and `check`, `object paint`, … with the same `--document`); `scene render <scene> --time <ms> --out <png> --document <scratch>/ws.pixellab` renders a motion or placement variant at any moment;
  - compare the variants side by side, on a tile and on the hero background, in one scratch scene, and copy only the winner into the repo. Crop renders with `sips -c <h> <w> --cropOffset <y> <x>`, which doesn't smooth.
- **Generate repetitive maps with a script** in the scratch folder: masks from the tile formula, band depth, drips, speckle lists, block variants. In the owner's checkout, send the result through the MCP: one `object_paint` call per color. In a worktree, write it with `object map set`, which is always canonical.
- **Don't overwrite another run's images.** Review-image folders can be shared: check before writing, and suffix your names (`after-hero-island-<object>.png`) when one's already there. `art preview` writes the one PNG `--out` names (there's no default folder); name each by object and scale.
- **In a worktree,** `npm run art` rewrites `hero-island.svg`, a git-ignored output. Never commit it.
- **Shell gotchas.** There's no PIL, so don't count on Python imaging. `sips -z` smooths when it upscales, so use `--scale` for review images. If a preview PNG comes out empty, re-run it without a pipe.
- **Look at a reference closely.** If the owner gives reference images, look at them. Note the band depth, stroke shapes and speckle sizes relative to the face, then translate them into the world palette.

## Before you report

- `check <name>` passes in the MCP session for each doc you changed (`npm run pixellab -- check <name>` in a worktree).
- In the owner's checkout, every change went through the MCP and is listed in your report, and you wrote no source there by hand. Every object you made has a category.
- `npm run art` reports every file `lossless` (any over-budget warning is in the report), and `npm run pixellab -- check` shows no new warnings.
- `npm test` shows `# fail 0`, or every failure is named, with its cause, and marked *expected* or *unexpected*. You didn't touch any test.
- `npm run build`, when the task needs it, ends with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`.
- You looked at the before, after and close-up images at @3x/@6x and at @1x.
- `history_list` shows a version of yours for every doc you touched (not in a worktree).
- Scratch workspaces and generators stay outside the repo. Only the review images go in.
