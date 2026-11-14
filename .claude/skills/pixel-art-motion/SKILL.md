---
name: pixel-art-motion
description: Animate this site's pixel art. Covers the build-up entrances of the hero island and the Range settings (each scene's `entrance`, its orders, moves and `enter` groups, played by the SVG through `data-play`), the states the SVGs play by themselves (the people's and robots' loops, the clouds' drift, the screens), the `jump` the page plays on the Range's character and the island's founder, and the island's CSS float. Use whenever someone asks to change how the island or a Range setting comes in, to try, tune or ship a stagger, to change what a person or an object on the island is doing, or to animate a new piece of the site's art. Builds on the pixel-art skill; animating a studio object itself happens in the studio repo.
---
# Pixel-art motion

The site's pixel art moves in three ways, and all of it lives in the document and plays from each published SVG's own `<style>` (Pixpocket's site contract, `docs/site-contract.md` in the Pixpocket repo):

- **Build-ups.** The hero island and each Range setting assemble themselves from their `enter` groups. The timing is each scene's `entrance`, Pixpocket compiles it into the scene's SVG, and the SVG plays it when the page puts `enter` in a `data-play` list. The site has no copy of the schedule.
- **States.** Every object with states plays the state its item starts in: the clouds' `drift`, the people and robots typing, pointing and laughing, the screens, the ping-pong game. The states are the studio's, and the scene picks one per item.
- **`jump`.** The page plays this one-shot state by name: on the Range's `character` when A is pressed, and on the island's `.ask-character` when the Ask panel opens.

Only the island's float is page CSS, on its HTML wrapper. Arranging the art is the `pixel-art` skill. This skill is about how it moves.

## Where things live

| What | Where |
| --- | --- |
| The timing: each scene's `entrance` (times in whole ms; a field left out keeps Pixpocket's default, so the hero's is `{}`) | `scenes/hero-island.json`, `scenes/range-sprite.json`; edit with `scene entrance set`, read with `scene entrance show` |
| The schedule (orders, moves, eases) and the CSS that plays it | Pixpocket's engine; its `docs/site-contract.md`, "The entrance", says what a page may rely on |
| Who asks for it | `src/components/home/HeroIsland.astro` (`data-play="enter"` on the inlined `<svg>`, so it plays on load without script) and `Range.astro` (`enter` in the current class group's `data-play`, on every class change) |
| The states an object has | the studio (`jlawcordova-vlog`), copied here trimmed to the ones the scenes play (`studio-import.json`) |
| The state an item plays | the item's `state` in the scene (`scene set <scene> <item> --state <state>`) |
| Playing `jump` | `Range.astro` (the class group's `data-play` list) and `src/lib/ask.ts` (`data-play` on `.ask-character`), each waiting for `animationend` with `<scene>--jump` |
| The float | `.floaty` in `src/styles/pixel-art.css`, on `.hero__float` in `Hero.astro` |
| The one door to Motion: `play()`, `reduced()`, `easeOut` | `src/lib/motion.ts` |
| Tests | `scripts/entrance-svg.test.mjs` (both SVGs carry their entrance, play it only with motion allowed, the hero asks for it, and each settles when it should; the parts that need the program skip without Pixpocket), `scripts/range-change.test.mjs` ("A's jump"), and the e2e checks in `shell.e2e.mjs`, `motion.e2e.mjs`, `range.e2e.mjs` and `ask.e2e.mjs` |
| The choices, and why | the design system's Motion section, the [entrance in SVG spec](../../../docs/intents/2026-10-entrance-in-svg/spec.md) (how the page plays it), the [island edge sweep spec](../../../docs/intents/2026-10-island-edge-sweep/spec.md) and the [Range settings spec](../../../docs/intents/2026-10-range-settings/spec.md) R4–R6 (the numbers, chosen on the old island) |

## Hard rules

- **Never hide the art.** The SVG ships with every piece in place, and a piece is hidden only while the build-up that reveals it runs. Without `enter` in a `data-play` around it the whole scene shows. Never hide a piece in page CSS or markup to animate it in later. The hero builds up even without JavaScript, since its attribute is in the HTML, and still ends at rest.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` the SVG plays nothing: the build-up's pieces show at rest, each item shows the first frame of the state it settles in, and no `animationend` fires, so page code that waits for one must not depend on it. `play()` does nothing either. A state an item starts in must read as a still picture on its first frame.
- **Animate in the document, not with page CSS.** Page code reaches into an SVG only through the site contract: `data-pixpocket`, the document's classes and `data-*`, `data-play`, `data-state` and `animationend`. It never selects the generated `<scene>--…` classes or keyframes.
- **Build-ups only through `data-play`.** The page asks for one by putting `enter` in the list, and replays it by taking `enter` out and putting it back once the browser has applied the removal. `data-play` is a list shared with `jump`: add and remove tokens. No event marks the end of a build-up: page code that waits for one waits on the finite animations under the piece (`getAnimations({ subtree: true })`), as the Ask bubble does.
- **Build-ups are a named exception** to the design system's 0.12–0.5s rhythm. When their numbers change, update the design system's Motion section in the same PR. Keep the Range's numbers its own, so an island change can't move the Range.
- **Never edit the compiled SVG,** and never edit a studio copy's states here (the `pixel-art` skill, Studio objects).
- **No new dependencies.** Motion is already there.

## Enter groups

Every item on the hero island, and every item inside a Range class group, sits in exactly one group with class `enter`. Groups don't nest. Each group is a piece of the entrance, and its data is what the schedule reads. The compiler moves each piece's drawing into a wrapper group, its only child, and plays the move on that; the piece keeps its element and attributes, so page code still finds it. The pieces in each `data-class` group are scheduled on their own.

| `data-enter` | Data | Hero island | Range setting |
| --- | --- | --- | --- |
| `shadow` | none | the shadow tiles, one group | none: the shadow sits outside the classes |
| `ground` | `data-col`, `data-row`, and the foot `data-x`, `data-y` | one group per floor tile, with the wall on it (130) | one group per floor tile (9) |
| `object` | the foot `data-x`, `data-y` | one group per thing on the floor (71) | one per prop, and one for the person |
| `sky` | the foot | the clouds | none |

**Adding a piece:** place it in its own `object` group with its foot, `scene place <scene> <object> --at col,row --new-group '{"class": "enter", "data-enter": "object"}' --foot` (the `pixel-art` skill, Arranging a scene). `scene group set` fixes an existing group's attributes. The schedule places the piece by its foot, so no page code changes. Check its delay with `scene entrance show`, and its bytes with `check <scene> --sizes`: each group compiles on its own.

Groups sit in the SVG in the scene's depth order. The orders read each group's data, not its place, except `random`, which seeds each piece by its index in the SVG.

## The schedule

`npm run pixpocket -- scene entrance show <scene>` lists the timing, each piece's delay and when the build-up has settled (`--json` for every field). The order of events:

1. The shadow fades in at `start`.
2. The ground starts at `start + groundDelay`. Each piece is spread over `groundSpan` by the ground order, plus up to `cascade` from left to right.
3. Objects start `objectLead` before the last ground piece lands, spread over `objectSpan` by the object order. With `with: true`, each object instead starts `lag` after the ground piece nearest its foot.
4. The clouds drift in as the objects begin.

Today the hero is `{}`: the ground sweeps in left to right and floats up, each object drops in with the tile under it, and it settles at 2308 ms. The Range has its own numbers: rows, then the props and the person left to right, settled at 1440 ms.

| Ground order (`--ground`) | Enters first |
| --- | --- |
| `rows`, `cols` | row by row, or column by column |
| `back-front`, `front-back` | by foot depth (screen y) |
| `sweep` | left to right by screen x |
| `center`, `edges` | rippling out from the middle, or in from the edges |
| `clock` | the screen angle about the ground's middle |
| `checker` | two waves, like a checkerboard |
| `random` | shuffled by `--seed`, the same on every replay |
| `together` | all at once |

Objects (`--objects`) take `ltr`, `same` (the ground's order), `back-front`, `front-back`, `random` or `together`, or ride in with their tile (`--with`).

| Move (`--move`, `--object-move`) | What it does | Uses |
| --- | --- | --- |
| `float` | rises `rise` art px, overshoots `overshoot`, settles | `rise`, `overshoot`, `peak` |
| `drop` | the same, from above | `rise`, `overshoot`, `peak` |
| `pop` | grows from its foot, from `popFrom` to `popPeak`, then settles to 1 | `popFrom`, `popPeak`, `peak` |
| `stepped` | a float that lands on whole art pixels (neither scene uses it) | `rise`, `overshoot`, `peak` |
| `fade` | opacity only | none |

With `--object-move same` the objects move exactly as the ground does. With a move of their own they take the `--object-…` numbers. `rise` and the offsets are in art pixels, the SVG's own units.

## Tuning a build-up

```sh
npm run pixpocket -- scene entrance show hero-island
npm run pixpocket -- scene entrance set hero-island --ground clock --object-move pop --duration 300 --dry-run
npm run pixpocket -- scene render hero-island --entrance 900 --scale 2 --out .art-preview/hero-900ms.png
npm run pixpocket -- render scene:hero-island --to .art-preview/hero-entrance.gif --entrance
```

- `scene entrance set` sets fields, with times in ms (`scene entrance set --help` lists them all). `--dry-run` prints the diff. `scene entrance clear` removes the entrance.
- `scene render <scene> --entrance <ms>` draws the scene that far into its build-up. `render scene:<name> --to <file> --entrance` exports it playing, for the owner to watch; so does Pixpocket's app (`pixpocket app`).
- Then `npm run art` and `npm run dev` play it on the page.
- The Range is `range-sprite`'s entrance: every setting plays the same timing over its own pieces.

## Shipping a choice

1. **Docs first.** A new look is a change of intent, so follow `CLAUDE.md` ("How changes flow"). Record the owner's settings in the spec, word for word.
2. **The numbers.** Set them with `scene entrance set`, and run `npm run art`.
3. **The tests.** If the settle time changes, update it in `scripts/entrance-svg.test.mjs`, which pins it so that a change is deliberate.
4. **The design system.** Update the Motion section's numbers for the build-up.
5. **Verify** (below), and paste the output into the PR.

## States and `jump`

- **What an item plays.** An item starts in its `state`, or its object's `start`. `npm run pixpocket -- object show <name>` lists the states the copy has. `scene set <scene> <item> --state <state>` picks one, and a figure also takes `--heading` and `--holds`.
- **The copies are trimmed.** The studio's export keeps only the states the scenes play (and `jump` for a `character` or anything in `.ask-character`). To play a state the copy doesn't have, set it on the item in the scene's JSON and run the export again (the `pixel-art` skill, Studio objects).
- **Frames cost bytes.** Every frame of every state a copy keeps is in the SVG, about 5 KB a frame for a figure. Give people and robots one state each, and check `check <scene> --sizes` against the budget.
- **A new state, or a change to one,** is drawn in the studio, with its `scene-motion` and `art-generators` skills. `npm run pixpocket -- guide states` and `guide figures` explain the format.
- **`jump`.** A one-shot state (five 100 ms frames, rising 8 px and back by whole pixels, then `idle`). The page adds `jump` to a `data-play` list and takes it out on `animationend` with `animationName` `<scene>--jump` (`range-sprite--jump`; the Ask panel reads the scene's name from `data-pixpocket`). Each Range class has exactly one `character`, and `range-change.test.mjs` checks its jump. Renaming the state, or the classes `character` and `ask-character`, breaks the page and the export.
- **`data-state`** on the `<svg>` or a group switches the items below it to a state by name. The site doesn't use it yet.
- **Scene motion** (a `motion` timeline that moves, shows and hides items on one loop) is in neither scene. If a scene needs it, `npm run pixpocket -- guide motion` and the studio's `scene-motion` skill say how; keep every moving piece alone in its own `enter` group, and watch `check` for `copies`.
- **The float.** The island's float (`floaty`) is the one loop in page CSS, on its HTML wrapper, so it and the SVG's own moves never set the same element's transform.
- **Looking at them.** `render scene:<name> --time <ms>` draws a scene with every state that far in, and `render object:<name> --state <state> --time <ms>` one object. `object state run <name> <state>` lists when its frame and move change and where it settles.

## Verifying

- `npm run pixpocket -- check` shows no new warnings (`entrance_play` means an object in a scene with an entrance has a state named `enter`).
- `npm test`: `entrance-svg.test.mjs` and "A's jump" in `range-change.test.mjs`.
- `npm run build`, then `npm run e2e`:
  - `shell.e2e.mjs` sees the island building right after load, waits for every piece to end fully visible in place, and checks it without JavaScript (it still builds up) and under reduced motion (nothing animates);
  - `motion.e2e.mjs` checks the pages with JavaScript off and with Motion blocked;
  - `range.e2e.mjs` does the same for each setting, and presses A mid-build;
  - `ask.e2e.mjs` checks the bubble waits for the character to land.
- **In the browser,** check end states with computed styles, not screenshots: read `getComputedStyle(wrapper).opacity` and `.transform` after the settle time, and `getAnimations({ subtree: true })` for what still runs. A hidden preview pane throttles its timeline.
- Screenshots at 1440px and 390px, with no horizontal scroll (`CLAUDE.md`).

## Pitfalls

- **Replaying needs the removal applied.** Taking `enter` out and putting it back in the same task does nothing: read the group's box in between (`getBoundingClientRect()`), as `Range.astro`'s `replay()` does. Taking it out mid-way puts every piece at rest at once, which is how a quick double press ends in place.
- **Don't clobber `data-play`.** Setting the attribute to one token drops the others: a jump that sets `data-play="jump"` on the class group would end a running build-up at once.
- **A hidden group replays on showing.** A token left on a hidden class group plays again when the group shows, so `Range.astro` clears the other classes' lists.
- **Order by the data, never `getBBox()`.** The schedule reads the feet in the groups' data, which stay put while states play.
- **Ties start together.** Every order is a score, so equal scores mean the same moment, and the last-scored piece always starts exactly `span` after the first.
- **The Range replays on every class change,** about every 3s, so its build-up has to stay quick. Don't give it the island's numbers without the owner's say.
