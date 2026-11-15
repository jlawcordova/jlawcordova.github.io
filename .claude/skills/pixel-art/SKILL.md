---
name: pixel-art
description: Change, arrange or review this site's pixel art (the hero island, the Range's seven settings, the Ask avatar, the achievement icons and frames, the footer) in its Pixpocket document, published to committed SVGs by `npm run art`. Use whenever someone asks to place, move, swap or remove objects in a scene, to check or review the art, to bring in an object from the owner's art studio, to watch an SVG's bytes, or to add art to the site. Drawing or changing a studio object happens in the studio repo, with its skills. Works headless, through the `pixpocket` CLI.
---
# Pixel art

The site's pixel art is text. **Objects** and **scenes** (objects placed on the grid, drawn back to front by where each stands) live in the site's Pixpocket document, `src/assets/pixel-art/jlawcordova.pixpocket/` (a folder in format 3: `manifest.json`, `palette.json`, `objects/<name>.json`, `scenes/<name>.json` and `studio-import.json`). `npm run art` (Pixpocket's `publish`) compiles each scene with an `output` to an optimized, self-contained SVG in `src/assets/pixel-art/`, and records the document it published in `published.json` beside them. **The SVGs and `published.json` are committed** with the sources.

Pixpocket (formerly Pixel Lab; the private repo `pixpocket/pixpocket`) is the engine, the compiler and the CLI in one program. Its docs are the references: `docs/cli.md` (every command), `docs/document-format.md` (the files), `docs/site-contract.md` (what a page may rely on in an SVG) and `docs/pixel-art.md` (how art is drawn, and the 2:1 ruler). The changes under `docs/intents/2026-10-*` are history from when the tool was Pixel Lab and the grid 32×16: read them for why the page works as it does, never for how the art is drawn now.

## The program

`scripts/pixpocket.mjs` finds the program as `$PIXPOCKET`, `pixpocket` on the PATH, or a build in a checkout beside this one (`../pixpocket/target/release/pixpocket`, from `cargo build --release` there). Nothing downloads it, and CI doesn't have it.

- `npm run art` with the program publishes and writes `published.json`. Without it, it only checks that the committed SVGs were published from the document as it is, and fails if the document has changed since.
- `npm run pixpocket -- <command>` runs any command on this checkout (the script adds `--site .`, so it works in a worktree).
- **Without Pixpocket you can't change the art.** Say so and stop. Never hand-edit an SVG or `published.json`.
- Agents use the CLI. If the session has Pixpocket's MCP server (`pixpocket serve --mcp`) its tools are the same commands, and its edits apply as they're made. The owner looks and edits in Pixpocket's browser app (`pixpocket app`).

## What's in the document

| Scene | What it is |
| --- | --- |
| `hero-island` | The home page's hero: a start-up office on a floating chunk of earth, its crust showing, with room to breathe. The office is one continuous floor against two walls, never broken up by grass: a developer and an agent (the classic `robot`) type at the desks, a blue agent runs the coffee bar, someone paces the meeting rug on the phone, someone pets the cat in the lounge, an agent walks its rounds down the aisle, and someone fetches a coffee: five people and three agents, the three walkers on closed 12-tile walks (scene motion, a 26.4 s loop). The garden is only the island's rim, where J. Law stands on the doorstep in a group with class `ask-character` (the Ask bubble sits over him). Every piece is a group with `class="enter"` and a `data-enter` role (`shadow`, `ground`, `object` or `sky`), which the entrance builds up. Its scene layers (Underside, Floor and garden, Walls, Desks, Coffee bar, …) only organise it. |
| `range-sprite` | The Range's seven settings, one per class in the order of `src/data/home.ts`, each in a `data-class="0"`…`"6"` group: a 3×3 platform with its floor, its props and one person, who carries `class="character"`. The page shows one group at a time. The shadow sits outside the groups. |
| `ask-avatar` | The founder alone (`staff-founder`, class `character`), for the Ask panel. Its `viewBox` is `[-12, -42, 24, 47]`: the foot at 0, 0 and room over the head for the jump. |
| `achievement-icons`, `achievement-frames` | The icon and frame sheets, placed by pixel, one `data-icon` or `data-frame` group each (the `achievement-icon` skill). |
| `footer-grass`, `footer-dirt` | The footer's two tiles. |

**Where the objects come from.** Almost every object is a copy from the owner's art studio, the private repo `jlawcordova/jlawcordova-vlog` (its Office, Agents, Cast, Range and Effects libraries, drawn by Python generators in `studio/generators/`). `studio-import.json` lists the copies. The site's own objects are only the achievement icons and frames (`icon-*`, `frame-*`) and `footer-grass` and `footer-dirt`.

People and robots are Pixpocket **figures**: parts, poses, states, headings, and sockets whose `holds` a scene can swap per item (hair, a hat, a mug in the `grip`). `npm run pixpocket -- object show <name>` lists what one has, and `npm run pixpocket -- guide figures` explains them.

## The grid and the rules

- **Grid.** A tile is 44×22 pixels, 2:1, and a level is 22 pixels high, so a one-tile block is a 44×44 cube. An item stands on a tile (`"at": { "tile": [col, row, level] }`) or at a pixel point (`"at": { "px": [x, y] }`, with an optional `level` for depth).
- **Caps.** A sprite is at most 128×128 in 16 colors. The palette is the studio's (at most 64 world colors), copied in by the export: never add a color here.
- **Light** comes from the upper left: tops light, left faces mid, right faces in shadow. No outlines.
- **The 2:1 ruler.** `npm run pixpocket -- check --ruler [name]` counts each sprite's jags, and `check` warns `jagged` past 24 a frame. A warning on a studio copy is the studio's to fix.
- **Categories.** Every object has one, and `npm test` fails without. The copies arrive with theirs. The site's own are `Achievements/Icons`, `Achievements/Frames` and `Terrain/Footer`.
- **Public-safe art.** The repo is public: art is generic, with no names, lettering, logos or likenesses.

## Working rules

- **Change only the scenes and objects the task names,** and only the document's scenes and the site's own objects. Never edit an object listed in `studio-import.json`.
- **Look before you change.** Save a before image of each scene you'll touch before the first edit.
- **No engine or test changes** unless the task says so. If the engine can't express what's needed, stop and report what's missing. Never edit a test to make it pass.
- **Don't commit, push or deploy unless told.** `npm run art` is part of the work: it writes the SVGs the commit needs.
- **Don't `--force` an edit past a problem,** and don't take back the owner's versions (`history undo`, `history restore`).

## Arranging a scene

```sh
npm run pixpocket -- scene show <scene>                    # its settings, size, objects and motion
npm run pixpocket -- scene items <scene>                   # every item in depth order, with its path (--object, --near narrow it)
npm run pixpocket -- scene place <scene> <object> --at col,row            # on top of what stands on that tile
npm run pixpocket -- scene place hero-island <object> --at col,row --new-group '{"class": "enter", "data-enter": "object"}' --foot --layer <layer>
npm run pixpocket -- scene set <scene> <item> --state <state>             # also --heading, --holds grip=held-mug, --level, --depth front|back|auto
npm run pixpocket -- scene move <scene> <item> --by col,row               # or --nudge x,y
npm run pixpocket -- scene remove <scene> <item>
npm run pixpocket -- scene frame <scene>                   # the published box; --box x,y,w,h fixes it
```

- **Every edit takes `--dry-run`,** which prints the diff and writes nothing.
- **Depth order.** What draws in front comes from where each item stands, and every edit sorts the scene, so the file reads back to front. An edit can change paths: use the path it returns, or list the items again. To change what draws in front, give the item a `level` or the `depth` override (`scene set --depth front|back|auto`). Never reorder lines: the next edit sorts them back, and `check` warns `out_of_order` (`scene sort` fixes a file).
- **On the hero island, every piece is in an `enter` group,** or the build-up leaves it out. A new object goes in its own group with `--new-group` and `--foot` as above, which sets the group's `data-x` and `data-y` to its foot. A new floor tile is a `ground` group with `data-col` and `data-row` too: copy how a neighbour is written. In a Range setting, place into the class's group with `--group <path>` and the same `--new-group`.
- **Page hooks to keep:** the `ask-character` group and its founder on the island, one `class="character"` person in each Range group, the seven `data-class` groups in the order of `src/data/home.ts`, and the avatar's `viewBox`. The page and the studio's export both read them.
- **Hand edits** are allowed in canonical JSON, and `check` warns about a file that isn't in it. Prefer the commands.

## Studio objects

To place a studio object the document doesn't have yet, or after a studio object changed:

1. Name the object in the scene. A hand edit of the scene's JSON is the way when the document doesn't have the object yet, since `scene place` needs it there.
2. In the studio checkout, run `python3 scripts/export-site-art.py <this checkout>` (`--dry-run` first). It copies the palette and every object the scenes place, with what each extends and holds. It flattens each figure and trims every sprite to the states the scenes play: the state an item starts in, the states its motion keys switch to, what follows those (`then`), and `jump` for a `character` or anything in the `ask-character` group. It removes the copies nothing places any more and rewrites `studio-import.json`.
3. `npm run pixpocket -- check`, then `npm run art`, and look at the scene.

A state the export trimmed away isn't in the copy. To play another state, set it on the item (`scene set --state`) and export again.

**To draw a new object or change one,** work in the studio repo (`jlawcordova-vlog`) with its skills, in its `.claude/skills/`: `pixel-art-style` (the house look; read it first), `art-library` (adding to a library), `art-generators` (drawing with code), `scene-motion` (animation) and `art-review` (showing the owner and logging verdicts). Then export. The Range's settings are laid out by the studio's `studio/generators/range/scene.py`, so a change to a setting's layout belongs there too. If this session has no studio checkout, say what the studio needs and stop.

**The site's own objects** are drawn here: the icons and frames with the `achievement-icon` skill, and the footer tiles as plain sprites (`object show`, `object paint`, `object map set`).

## Looking at the art

```sh
npm run pixpocket -- preview scene:<name> --scale 3 --out .art-preview/<name>@3x.png    # on the card color; object:<name> for an object
npm run pixpocket -- render scene:<name> --scale 3 --out .art-preview/<name>.png         # transparent; --time <ms>, --theme dark
npm run pixpocket -- render scene:range-sprite --show 7.0 --scale 3 --out .art-preview/range-2.png   # another class: any item path in its group
npm run pixpocket -- render object:<name> --state <state> --time <ms> --scale 6 --out .art-preview/<name>.png   # a figure also takes --heading, --pose, --holds
```

- `.art-preview/` is git-ignored. Look at every image you save, at 1× and at 3× or more.
- A preview or render of `range-sprite` draws only the first class unless `--show` names an item path in another group (`scene items range-sprite` lists them; the groups are `5` to `11`).
- On the page, the island and the Range are judged where they live: `npm run dev`, then the home page at 1440px and 390px wide, with no horizontal scroll, in light and dark.

## Bytes and budgets

The SVGs are inlined in the page, so their size is page weight. The manifest's `publish.budgets` hold `hero-island.svg` to 1,000,000 B raw and 153,600 B gzip (it's about 908 KB and 142 KB) and `range-sprite.svg` to 400,000 and 70,000 (about 340 KB and 63 KB). Over a budget is a warning from `npm run art`, never a failure: report it with what you'd cut.

- `npm run pixpocket -- check <scene> --sizes` lists the bytes each object and each color adds.
- **Every frame of every state a sprite has is in the SVG,** once per placement. A figure costs about 5 KB a frame, which is why the export trims states. Give people and robots one state each, and measure before adding a person, a state or a long loop.
- Each `enter` group compiles on its own, so more groups cost more.

## Before you report

- `npm run pixpocket -- check` shows no problems and no new warnings (no `out_of_order`, no file out of canonical form).
- `npm run art` reports every file `lossless`, and any over-budget warning is in your report. The SVGs and `published.json` it wrote go in the commit with the sources.
- `npm test` shows `# fail 0`. `scripts/pixpocket.test.mjs` checks the record matches the document, that the SVGs are exactly the scenes' outputs, and that the copies are recorded; `scripts/pixel-art-categories.test.mjs` checks the categories; `scripts/entrance-svg.test.mjs` pins the settle times (2308 ms for the hero, 1440 ms for the Range).
- You looked at the before and after images, and at the page at 1440px and 390px when the hero, the Range or the avatar changed.
- The report lists each scene and object you changed, the image paths, the sizes before and after for the hero or the Range, and anything the studio still needs.
- If you changed how art moves, the `pixel-art-motion` skill's checks pass. If you changed how art is made (commands, rules, where things live), this skill is updated in the same PR.

## Pitfalls

- A path from before an edit can point at another item after it.
- A piece on the island outside an `enter` group shows from the start instead of building up.
- A studio copy edited here is overwritten by the next export.
- `npm run art` without the program passes only while the document is unchanged. A changed document and no program means the work isn't done.
- The thirteen blog thumbnails in `static/public/thumbnails/` are committed PNGs from Pixel Lab v0.10.0, with no scenes. A new one is a new scene on the 44×22 grid with `"image": { "file": "<key>.png", "scale": … }`, and the manifest's `publish.images` naming that folder.
- `art/explainer-library.pixellab/` is an old-grid archive. Nothing reads it, and Pixpocket can't draw it.
