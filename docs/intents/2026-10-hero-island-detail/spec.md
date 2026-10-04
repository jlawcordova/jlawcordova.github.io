# Spec: Hero island detail (from intent.md 2026-10-04)
Status: approved. Amended 2026-10-04 with the owner while planning: three edge blocks instead of `block-corner`, block painting in the lab, 16-column side maps, the accepted art picks and the full list of tests that change.

This spec turns the [intent](intent.md) into requirements and a design. The look was set by a sample before this spec was written: a subagent detailed the land, and the owner reviewed it, edited `block` by hand in the lab, and approved it. The owner then answered a questionnaire for each object. The sample, those answers and the owner's budget decision are recorded here.

## Requirements

Traced to the intent's Problem, Proposed outcome and Constraints. Each is checkable.

- **R1. Every island object is detailed in the sample's style.** Each object the hero island places gets texture and shading in the [look](#the-look) below, as set out per object in [Objects](#objects). The owner reviews each one, with before and after previews. *(Outcome: more detail on every island object)*
- **R2. No outlines on the island.** No object the hero island places uses `ink`. Faces are told apart by shade: top lightest, left mid, right darkest. The Range sprite, its outfits and the achievement icons keep their outlines. *(Outcome: no outlines)*
- **R3. World palette only.** Every island object uses only world colors. No color is added to, changed in or removed from the palette. *(Constraint: world palette only)*
- **R4. Cardboard boxes at the crane.** The crane lifts one cardboard box, and a small stack of cardboard boxes stands on the ground beside it. Both clearly read as cardboard boxes. *(Outcome: cardboard boxes)*
- **R5. The clouds are isometric,** built from stacked blocks. *(Outcome: the clouds become isometric)*
- **R6. Blocks can texture their sides.** The engine's block kind accepts a texture on its left and right faces as well as its top. The land uses it, and `block` is a block, not a sprite. The lab paints a block's top surface and its side textures, so the owner can edit the land by hand. *(Owner's decisions on the sample and while planning, 2026-10-04)*
- **R7. The cliffs show no joints.** On both front cliffs, no line shows where one block meets the next at 4×, and no in-between color is used to hide it. The island's front corner still reads as a corner. *(Owner's decisions on the sample, 2026-10-04)*
- **R8. Same island.** The viewBox, the grid, the road line and the layout stay. The groups the CSS animates (`wf w0`…`w4`, `ff f0`…`f3`, `hf h0`…`h5`, `itruck it1` and `it2`, and `pcloud pc0`…`pc2`) are all still there. `pixel-art.css` is not edited, frame 0 is still the reduced-motion frame, and `it2` is still hidden under reduced motion. The paint order of the trucks and front pieces is kept. Objects may grow or shift a few pixels where a redraw needs it, and the owner reviews it. *(Constraint: same island)*
- **R9. The engine's rules still hold:** the 32×16 tile, the light direction, the 64×64 and 12-color caps, accessibility, public safety and deterministic output. *(Constraint)*
- **R10. New size limits.** `hero-island.svg` is at most 500 KB raw (the owner's hard ceiling) and 125 KB gzip. Every other SVG keeps the engine's 100 KB raw and 25 KB gzip. The home page budget rises as in [Budgets](#budgets). *(Constraint: the island may get heavier; the owner's decision to raise the gzip budgets, 2026-10-04)*
- **R11. A palette-strict pixel artist.** The art is made with a `pixel-artist` subagent that uses the engine and keeps to the world palette. Every run hands back sources the lab can open, review images, a running lab with the work loaded, and a report. It takes change requests and the owner's lab exports. Several can run in parallel, one per object group, and the owner is pinged once, when all of them are done ([Workflow](#workflow)). *(Outcome: made with a skill that is strict about the palette; the owner's request, 2026-10-04)*
- **R12. Every visible change is reviewed,** with before and after previews (and a close-up where texture matters), screenshots of the home page at 1440px and 390px with no horizontal scroll, and an independent verifier on every PR. *(Constraint)*
- **R13. The reference stays out of the repo.** It's described in words. Its images and palette aren't copied. The samples in this folder are this site's own art. *(Constraint)*
- **R14. The island is still decorative and safe.** `HeroIsland.astro` inlines the SVG with the same classes, and the SVG carries no script, link, text or external reference. *(Constraint: accessibility, public safety)*

## Design

### The sample

The samples are in [`samples/`](samples/):

| | Before | After |
| --- | --- | --- |
| Land close-up (4×) | [before-land-closeup.png](samples/before-land-closeup.png) | [after-land-closeup.png](samples/after-land-closeup.png) |
| Island (3×) | [before-hero-island.png](samples/before-hero-island.png) | [after-hero-island.png](samples/after-hero-island.png) |
| `tile` | [before-tile.png](samples/before-tile.png) | [after-tile.png](samples/after-tile.png) |
| `block` | [before-block.png](samples/before-block.png) | [after-block.png](samples/after-block.png) |

- [`tile-sample.mjs`](samples/tile-sample.mjs) is the approved `tile`.
- [`block-sample.mjs`](samples/block-sample.mjs) is the owner's lab edit of `block`. It's a 30×32 sprite, because the engine couldn't texture a block's sides. The first slice remakes it as a block with side textures (R6) and keeps every pixel of it, except where hiding the joints needs a change (R7).

Neither source is in `src/` on this branch. The site still shows today's island until the first slice.

The sample's after-island preview still shows the joints. The owner removed the in-between brown from the front edge, then chose to hide the joints, which the first slice does (R7).

### The look

This is the style recipe from the sample. It goes into the `pixel-art` skill as a "Hero island look" section, and the `pixel-artist` agent follows it.

- **Shade order.** Each material uses its own ramp. The lit top is shade 2. The left face is the mid shade and the right face the dark one (for soil, `soil-2` and `soil-3`). Texture is the next shade lighter on tops, or darker on sides, from the same ramp. A face holds 2–3 shades at most.
- **Density.** About 4 small clusters per 32×16 top. For grass, that's tufts of two 1-pixel blade strokes, 2–3 pixels tall, slightly leaning, sometimes mirrored. About 6 speckles per side face, mixing 1×1 and 2×2 squares. No 2×1 dashes, which read as scratches. Texture stays at least 2 pixels from face edges, so repeats don't draw grid lines.
- **Transitions.** Where materials meet (grass over dirt, roof over wall), the upper material hangs a 3–4 pixel band down the side faces, following the top edge. Its last row is the ramp's darker shade, and a few 1-pixel drips break up its lower edge. Bands stay in the upper material's own ramp: the grass band is grass greens, not teal (the owner's decision).
- **Edges.** No outlines (R2). Where repeated objects meet, there's no joint line (R7).
- **Scale.** Texture fades to grain at 1× and reads as material at 2–3×. Both are checked.
- **Cost.** Each isolated texture pixel costs about 30 bytes raw, multiplied by the number of placements. Few, deliberate clusters are preferred.

### Objects

The owner's answers to the questionnaire, object by object. All colors are world colors. The agent proposes the exact pixels, and the owner reviews them in the lab.

| Object | What changes | Colors |
| --- | --- | --- |
| `tile` | As the sample: grass tufts on a plain top. | `grass-2` top, `grass-1` tufts |
| `block` | As the owner's sample, rebuilt as a block with side textures: the tile's tufts on top, a grass band and dirt speckles on the sides, no joints (R6, R7). | Top as `tile`; left band `grass-3` with a `grass-4` last row; right band `grass-4`; left dirt `soil-2` with `soil-3` speckles; right dirt `soil-3` with `soil-4` speckles |
| `block-left`, `block-right`, `block-road` | The edge pieces in [Hidden joints](#hidden-joints). | As `block`; `block-road` adds `path-3` and `path-4` |
| `path` (road) | A mottled dirt top, like the tutorial's dirt block: soft lighter and darker patches. | `path-2` top, `path-1` and `path-3` patches |
| `river` | Calm water with light ripple lines, like the tutorial's water tile. The `wf` loop and its five frames stay; the ripples are drawn in them. | `water-2` top, `water-1` ripples |
| `waterfall-face`, `flag` | Falling streaks down the face and foam where the water lands. `flag` (the `ff` streaks) keeps its loop. | `water-2` and `water-3`, `water-1` streaks, `cream` foam |
| `cloud-a`, `-b`, `-c` | Stacked-block clouds: a few cubes of different sizes per cloud, with lit tops and shaded sides. About today's sizes, with the same `pcloud` classes. | `cream` tops, `path-2` left, `path-3` right (see C4) |
| `house` | Redrawn as a shipping office on the same footprint: a small depot with a wide loading door and an awning. No lettering or logos. | Walls in the `path` ramp, roof and awning in `roof`, door in `wood` |
| `crane-mast`, `crane-jib` | A detailed tower crane: lattice mast and jib, a cab, a counterweight, and a cable and hook. Still two stacked objects. | `gold` ramp, `wood-4` cable and counterweight |
| `hearth` → `crane-box` | The red slab on the hook becomes one cardboard box with tape and flaps. It keeps the `hf` loop's six frames (the load swaying). | Cardboard `wood-1` top, `wood-2` left, `wood-3` right; tape `path-1` |
| `shed` → `boxes` | The red slab on the ground becomes a small stack of cardboard boxes. | As `crane-box` |
| `pine` | Stacked tiers like the tutorial's pine: three pyramids, smaller toward the top, with needle texture and a lit left side. | `grass-2` to `grass-4`, `wood-3` trunk |
| `tree-small` | Leaf clusters with a lit side and a shaded side. | `grass-1` to `grass-4`, `wood-3` trunk |
| `tree-shade` | A soft ground shade, no change in shape. | `grass-3` |
| `bridge`, `bridge-rail` | Planks with small gaps and rail posts. | `wood-1` to `wood-3` |
| `fence` | Wood grain on the two posts. | `wood-1` to `wood-3` |
| `truck`, `truck-green` | Same size and colors: a shaded cab and box, windows, and wheels with hubs. `truck-green` still extends `truck`. | Today's body colors; `water-1` windows; `wood-4` tyres |
| `island-shadow` | No change. | `path-2` |

The plan holds the pixel artist's proposal for each object (size, layers, details, colors and byte cost). The owner accepted these choices from it on 2026-10-04:

- the river's ripples drift diagonally with the flow;
- the cloud cubes have short sides, so they read as puffs, not stone;
- the tree trunks are two-tone (`wood-3` with a `wood-4` shaded column);
- the office's loading door is on the right wall, facing the road, and it has a small roof vent;
- the crane's lattice is see-through, and its cab has a `water-1` window;
- the truck wheels have `path-2` hubs.

Two objects are renamed (the owner's decision), because the old names say what they were in the legacy art, not what they are: `hearth` becomes `crane-box` and `shed` becomes `boxes`. The CSS classes don't change. `flag` keeps its name. It's the waterfall's streaks, which the [island migration spec](../2026-10-island-migration/spec.md) records.

### Block side textures

The block kind gains side textures (R6):

- **Format.** Today a block's `surface` is one tile's top map (32×16), repeated on every top tile. A block gains an optional `sides` property: `{ keys, left, right }`. `left` and `right` are each one face-local map, one tile wide and one level high, repeated along the face and up every level.
- **Face-local rows.** Row 0 of a side map is the first pixel row below the top's edge, in each column. So the engine shears the map onto the face, and a band that follows the top edge is just the map's first rows.
- **Width.** Each map is 16 columns by 16 rows, one per pixel of the tile's 16-pixel period along a face. A 1×1 block's faces are 15 columns wide, so they show columns 0–14, and column 15 shows only where a longer face repeats the map.
- **Order.** The engine draws the faces, then the side textures, then the top surface, then `edge` over everything.
- **Rules.** Side textures are refused on a flat block, as `left` and `right` faces are today. Their colors count toward the 12-color cap, and the tests check world colors only. The serializer round-trips them in canonical form.
- **The lab.** It paints a block's top surface (clipped to each tile's diamond) and its side textures (each face pixel maps back to its side map's column and row), and exports them. Its palette is on for blocks.

R28's lighting check still applies to the faces. The R13 and island tests that read `block.size` and `block.faces` keep working, because `block` is a block again.

### Hidden joints

Where two cubes touch on a cliff, each cube shows one column that belongs to its other face, and that column draws a line down the cliff. Planning measured it with the engine's geometry: on the left cliff (row 5) each cube shows its right map's column 0, and on the right cliff (column 5) its left map's column 14. One `block` can't hide both, because column 14 would need the left face's material on one cliff and the right face's on the other. So the edges use three pieces, each differing from `block` by one recolored column, with no in-between color:

| Object | Placed at | Its one change from `block` |
| --- | --- | --- |
| `block` | `[5, 5]`, the true front corner (and the library demo) | none: a true cube |
| `block-left` | `[0..4, 5]`, the left cliff | right column 0 takes the left face's material (the `grass-3` band with a `grass-4` last row, then `soil-2`) |
| `block-right` | `[5, 0..4]`, the right cliff | left column 14 takes the right face's material (the `grass-4` band, then `soil-3`) |
| `block-road` | `[2, 5]`, where the road meets the edge | `block-left` with a dirt band under the road (`path-3`, with a `path-4` last row) instead of grass |

The first slice proves this on the `closeup-land` scene before any other object starts.

### Budgets

The owner raised the size budgets on 2026-10-04 and approved these numbers (C1):

| Measure | Today | New |
| --- | --- | --- |
| `hero-island.svg` raw | 83,485 B (island test) and 100 KB (engine) | **500 KB** (the owner's ceiling) |
| `hero-island.svg` gzip | 18,299 B (island test) and 25 KB (engine) | **125 KB** |
| Other SVGs | 100 KB raw, 25 KB gzip | unchanged |
| Home HTML, including the inline art, gzip | 40 KB | **150 KB** |
| Home total first-party, gzip | 50 KB | **160 KB** |
| Lighthouse performance, mobile | ≥ 95 | ≥ 95, unchanged |

- **How it's enforced.** `npm run art` gets a per-output budget: `hero-island.svg` uses the new island limits, and every other output keeps the engine's. The island test's R6 checks the new limits instead of today's size.
- **Where it's recorded.** The redesign spec's §12 gets a dated note pointing here, as earlier changes did with that spec.
- **Where it stands now.** Today the home page is about 27.9 KB gzip, measured with the sample land in place.

### The `pixel-artist` agent

[`pixel-artist-agent.md`](pixel-artist-agent.md) is the draft of `.claude/agents/pixel-artist.md`, an Opus subagent for this engine. The subagent that drew the sample wrote it from how it worked, and the owner added the lab hand-off.

**Every run gives the owner:**
1. the sources;
2. before, after and close-up images in `samples/`;
3. a running lab at /lab/pixel-art/ with the work loaded, for hand edits;
4. a report: colors per face, check output and sizes.

**Change requests.** When resumed with feedback or a lab export, it treats that as the new baseline and changes only what was asked.

**Where things live.** The style recipe moves into the `pixel-art` skill, the single source for it, and the agent file points there. `CLAUDE.md`'s pixel-art line names the agent.

### Tooling

From the subagent's notes, to make each review round fast and comparable:

- **Close-up scenes.** Preview-only scenes, with no output, committed so every round renders the same view: `closeup-land` (the front corner and both cliffs), `closeup-road-end`, `closeup-water`, `closeup-crane`, `closeup-office` (with both trucks), `closeup-front-trees` and `closeup-sky`.
- **Bigger previews.** `--preview <name> --scale N` for scales above 4.
- **A size report.** `npm run art -- --sizes <scene>` prints raw and gzip bytes per object and per color, compared with `HEAD`.
- **A small fix.** `--preview` no longer crashes with EPIPE when its output is piped into `head`.

### Tests that change

The island's tests pin today's look. Each one below is replaced in the slice that changes what it pins, never skipped, as the [island migration](../2026-10-island-migration/spec.md) did (its R9):

| Test (`scripts/pixel-art-island.test.mjs`) | Becomes |
| --- | --- |
| R6: no heavier than today | Within the R10 limits |
| R7: flag and hearth paint the same pixels as before | `flag` and `crane-box` keep their loops and frame counts, in world colors |
| R7: the clouds and trucks use the colors the Colors table names | World colors only; `truck-green` still extends `truck` |
| R3: the front blocks have no outline | No island object uses `ink` (R2), and `block` has no `edge` |
| R3: the front pieces and trees are pinned | Re-pinned to the reviewed positions, still on the grass |
| R1, R3: the ground is 36 library objects | `block` at `[5, 5]`, `block-left`, `block-right` and `block-road` on the edges |
| R1, R3: the river is `water`'s frames minus two rows | A flat `water-2` tile with five `wf` frames, in world colors |
| R1, R2, R3: the house (an ink pixel at its edge) | The same spot painted in a world color |
| R1, R3: the crane (ink at the ends of the mast's top row and the jib's anchor row) | The jib's anchor row lines up with the mast's top row |
| The names lists (`IN_FRONT_OF_TRUCKS`, the road-line list, the feet list, R5's hearth check) | The new names, `crane-box` and `boxes` |

Two tests outside the island file change too:
- `scripts/pixel-art-roundtrip.test.mjs` names the `hearth` loop (`hf`, 6 frames), which becomes `crane-box`.
- Its R32 check counts the skill's code examples. The `sides` format joins the existing block example, so the count stays.

New tests:
- the engine validates, renders and round-trips `sides`;
- the lab paints a block's top and sides and exports them (editor e2e);
- R7's joints, as pixel checks on the `closeup-land` scene: no joint column on either cliff;
- the per-output budget.

### Workflow

The work runs in three stages. The land goes first, alone. Then the other objects are drawn at the same time by parallel agents, and the owner is pinged once, when every agent is done.

**Stage 0. Set-up (main session, no art).**
- The per-output budget, the preview and size tooling, the engine's `sides`, block painting in the lab, the close-up scenes, the skill's "Hero island look" and the agent file, on `feat/hero-island-detail`.
- **The agent's instructions are tuned first.** The pixel artist that proposed the objects revises the draft from what it learned, and the agent file is made from that revision. After each stage's review, the agent that did the work is asked for refinements again, and they're folded in before the next stage, so every run uses the latest instructions.
- Confirm that a dev server started in the background survives an agent's hand-back (C7).

**Stage 1. Land (one `pixel-artist` agent).**
- `tile`, `block`, `block-left`, `block-right`, `block-road` and `path`, with the hidden joints (R6, R7).
- This stage proves the recipe and the joints, so it runs alone. The owner reviews it in the lab, and its PR merges into the feature branch before Stage 2 starts. Every later agent starts from the merged land.

**Stage 2. Everything else (parallel `pixel-artist` agents).** One agent per object group, all started at once from the main session:

| Agent | Objects |
| --- | --- |
| Water | `river`, `waterfall-face`, `flag` |
| Clouds | `cloud-a`, `cloud-b`, `cloud-c` |
| Trees | `pine`, `tree-small`, `tree-shade` |
| Office | `house` |
| Crane | `crane-mast`, `crane-jib`, `crane-box`, `boxes` |
| Bridge | `bridge`, `bridge-rail`, `fence` |
| Trucks | `truck`, `truck-green` |

How they run without colliding:

- **Isolation.** Each agent works in its own git worktree (the Agent tool's `isolation: "worktree"`), based on the feature branch with the land merged. It changes only its own objects' sources. It never edits the scene, a test, the engine, or another group's objects.
- **Its own checks.** Each agent checks and previews its objects inside its worktree: `--check`, its objects' previews, its close-up, and the island preview with only its own change. It reports its objects' byte cost from the size report.
- **No lab of its own.** In parallel mode an agent doesn't start the lab; the coordinator hosts one (below). Its report says it ran in parallel mode.
- **Renames and position changes.** The renames (`hearth` → `crane-box`, `shed` → `boxes`) and any position change are proposals in the report. The main session applies them to the scene when it gathers the work, so only one place edits `hero-island.mjs`.

**Gather, then ping (main session).** When the last agent hands back:

1. Copy each group's sources from its worktree into one working tree on a review branch.
2. Apply the proposed renames and positions to the scene, and run `npm run art`, `npm test` and `npm run build` once on the whole island. Check the total against R10.
3. Render the combined before and after island, and copy every agent's images into `samples/`.
4. Start one lab with every object loaded.
5. Ping the owner once, with a push notification, linking the lab, the images and a one-line summary per agent. No notification goes out while agents are still running, unless one fails.

**Review and change requests.**
- The owner reviews everything in the one lab. Their feedback is sorted by object group, and each agent with changes is resumed by name (`SendMessage`), with its feedback or the owner's lab export as its new baseline. Resumed agents can run in parallel too.
- The gather step runs again, and the owner is pinged again when all the resumed agents are done.

**PRs.** Once the owner approves Stage 2, the plan decides how to split it into PRs on the feature branch (for example one per object group, each with its own previews and its replaced tests). The owner merges the feature branch into `main`.

## Areas of concern

- **C1. The budget numbers.** The redesign spec's §12 is a house standard, and this change raises it. The owner approved the numbers on 2026-10-04: 125 KB gzip for the island (the engine's 4:1 raw-to-gzip ratio applied to 500 KB), and 150 KB gzip HTML and 160 KB gzip in total for the home page. Lighthouse ≥ 95 on mobile stays, and may become the real limit. Resolved.
- **C2. Tests that pin today's look are replaced.**
  - **What's affected:** `CLAUDE.md` says never to skip or delete a failing test.
  - **What's proposed:** these tests pin the old look, so each is replaced by one that checks this spec, in the slice that changes the look, and the PR lists it. That's the migration's precedent (its R9).
  - **What the owner decides:** nothing, unless they disagree.
- **C3. Hidden joints.** The first design (`block` plus `block-corner`) couldn't hide the joints on both cliffs. Planning measured the geometry, and the owner chose the three edge pieces in [Hidden joints](#hidden-joints). If they still leave a line, the first slice stops and asks rather than bringing back an in-between color (R7).
- **C4. Cloud colors.**
  - **What's affected:** `path-1` (#E9DCC6) is almost the hero's background (`color-hero`, #EADFC8), so a cloud face in `path-1` would vanish.
  - **What's proposed:** the sides use `path-2` and `path-3`. `cream` tops are lighter than the background, so they still read.
- **C5. The island no longer matches the outlined art.** The Range sprite and the achievement icons keep their ink outlines. The owner accepted the difference (intent, Open questions).
- **C6. The engine and the lab change.** The intent says the engine's rules hold, and it doesn't ask for engine work. `sides` adds a capability and keeps every rule. The owner chose it while reviewing the sample, and chose block painting in the lab while planning, so the land can be edited by hand. The lab's JS stays within its 30 KB gzip budget. Nothing else in the engine changes, except the per-output budget and the tooling above.
- **C7. The lab hand-off may not outlive the agent.** A dev server the subagent starts in the background may stop when it hands back. Slice 0 checks this. If it stops, the main session runs the server and the agent only checks that its version is served.
- **C8. Parallel agents use a lot at once.** Seven Opus agents running together can reach the account's usage limit; the sample's agent was cut off by one. If an agent stops early, its worktree keeps its work, and the main session resumes it after the limit resets. The ping waits until every agent has finished or failed, and says which. The plan may run fewer agents at a time.
- **C9. Gathered work can conflict.** Each group touches only its own objects, so their sources don't overlap. The compiled SVG, the scene and the tests are only ever changed in the gather step. The byte budget is shared, so the gather step checks the total, and an agent whose objects cost far more than the others is asked to trim.
- **C10. Public safety.** The shipping office, the boxes and the trucks carry no lettering, logos or brand marks. The reference tutorial isn't named, linked or copied (R13).

## Open questions

The intent had none open. The ones this spec raised are decided with the owner (2026-10-04):

1. **Budgets:** 125 KB gzip for the island, and 150 KB HTML and 160 KB total gzip for the home page (C1).
2. **Renames:** `hearth` becomes `crane-box` and `shed` becomes `boxes`.
3. **Pine color:** the grass greens, like the grass band and the round trees, not the tutorial's teal.
