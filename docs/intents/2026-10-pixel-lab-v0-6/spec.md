# Spec: The site takes Pixel Lab v0.6.0's output (from intent.md 2026-10-21)
Status: proposed. On 2026-10-21 the owner asked for the spec, the plan and the migration to be finished up to one final PR, which they review as a whole. The Areas of concern below were resolved with the spec's recommendations for that review (marked "Taken"), and the owner can overturn any of them there.

This spec turns the accepted [intent](intent.md) into requirements and a design. Its source of truth for Pixel Lab is the lab repo at the `v0.6.0` tag: `docs/intents/2026-10-rust-engine/spec.md` (D13, R4, R11–R20, Areas of concern 6–8), `docs/site-contract.md` and `docs/document-format.md`. Where this spec says "the contract", it means `docs/site-contract.md` at that tag.

**Rehearsed before writing.** Everything below was tried on a scratch copy of `main` (`git archive HEAD`) with the released `pixellab-darwin-arm64` program, downloaded from the v0.6.0 release and checked against its `SHA256SUMS`. The real checkout was not touched. What it showed:
- `pixellab document migrate --site .` converts the site's document (234 files written, 15 notes kept, 233 `.mjs` files removed), and `pixellab document migrate --document art/explainer-library.pixellab` converts the explainer library (103 written, 102 removed). Both refuse to write unless the SVGs come out byte-identical.
- The clouds sit at the paths PR #34's visual-gate report names (`closeup-sky` 20–22, `hero-island` 135.0–135.2, `range-sprite` 7.3.0), and `cbob` is layer 1 of the `character` object.
- After the swap below, `check --site .` reports no problems and no canonical-form warnings. The only warnings are the 15 `off_grid` ones on the hero island's ore and stone belts, which are in today's art.
- `scene sort` on each `thumb-*` scene writes nothing: they're already in depth order. PR #142 fixed them after PR #30's re-check was written.
- `art build` writes the six SVGs and the 13 thumbnails in under a second. Every thumbnail is pixel-identical to the committed PNG once decoded, though the bytes differ. The hero island's SVG grows from 519 KB to 526 KB and the Range sprite's from 151 KB to 154 KB, both under their budgets.
- The compiled `range-sprite.svg` plays the hop under `@media (prefers-reduced-motion:no-preference)` through `[data-play~="hop"]`, as the contract says.

## Requirements

### The art's document

- **R1. Format 2.** `src/assets/pixel-art/jlawcordova.pixellab/` is migrated in place with `pixellab document migrate --site .`. After this change it holds `manifest.json` (`"format": 2`), `palette.json`, `objects/*.json` and `scenes/*.json`, and no `.mjs` files.
- **R2. Clouds are ambient loops.** Each item that has `pcloud` today loses its class and gains an ambient loop with the same drift. The loop moves 12 px right over half its duration, then steps back:

  | Scene, item | Today | Ambient loop |
  |---|---|---|
  | `closeup-sky` 20, `hero-island` 135.0, `range-sprite` 7.3.0 | `pcloud pc0` | 16000 ms, offset 0 |
  | `closeup-sky` 21, `hero-island` 135.1 | `pcloud pc1` | 20000 ms, offset 7000 |
  | `closeup-sky` 22, `hero-island` 135.2 | `pcloud pc2` | 13000 ms, offset 3000 |

- **R3. The bob is an ambient loop, and the hop is an action.** Layer 1 of `character`, which every outfit inherits, loses `cbob`. It gains:
  - an ambient loop of 1000 ms that is 1 px up from 500 ms;
  - an action, `hop`, of 480 ms with today's `chop` steps (D2).

  The layer's class becomes `character`, a document class the contract passes through, so page code and browser checks can find the character without generated names.
- **R4. Thumbnails come from the build.** Each `thumb-<key>` scene declares `"image": { "file": "<key>.png", "scale": 5 }`. The manifest's `publish.images` points at `static/public/thumbnails/`. `pixellab art build` writes the 13 PNGs there, pixel-identical to today's, at the same URLs (`/public/thumbnails/<key>.png`).
- **R5. Depth order.** `scene sort` is run on every `thumb-*` scene after migrating, as PR #30's re-check suggested. The PR records its result, which the rehearsal says is no change.
- **R6. The art looks and moves the same.** On the home page, the hero island and the Range show the same pixels before and after this change:
  - at rest;
  - across the clouds', the bob's and the frame loops' cycles;
  - through one hop;
  - under reduced motion.

  The thumbnails, the footer's tiles and the achievement icons and frames don't change either. D7 says how this is proved.

### The page

- **R7. The stylesheet stops animating the art.** `src/styles/pixel-art.css` loses the `wf`, `ff`, `hf`, `pcloud`, `cbob` and `chop` keyframes and rules, and their reduced-motion lines. It keeps:
  - `.pixel-art, .pixel-art * { shape-rendering: crispEdges }`, which the Range console's hand-drawn inline SVGs still need;
  - `img.pixel-art { image-rendering: pixelated }`;
  - the HTML wrappers' `floaty` and its reduced-motion rule.
- **R8. A plays the hop through the contract.** The Range's A button sets `data-play="hop"` on the current class's `g[data-class]` group, after removing it and reading layout so a press mid-hop starts it over. It clears the attribute when `animationend` fires with `animationName` `range-sprite--hop`. Under reduced motion A stays hidden and does nothing, as today. Nothing else about the Range changes: the setting stays put, the class stays, and nothing is announced.
- **R9. Nothing else on the page changes.** That covers the entrances (`Hero.astro`, `Range.astro`, `src/lib/play-entrance.ts`, which read `.enter` groups and their `data-*` attributes), the SVGs' inlining by string replace, and the footer's CSS backgrounds. Post URLs, `/blog/pageN/`, `/atom.xml` and the thumbnails' URLs don't change.

### The program, locally and in CI

- **R10. One pinned program.** `scripts/pixellab.mjs` (Node built-ins only) pins Pixel Lab to `v0.6.0`. It holds the SHA-256 of `pixellab-darwin-arm64.tar.gz` and `pixellab-linux-x64.tar.gz` from that release's `SHA256SUMS`. It:
  - picks the asset for the platform: macOS on arm64 or Linux on x64. On any other platform it stops with a message naming the two it supports.
  - downloads the asset and the release's `SHA256SUMS` over HTTPS from `github.com/jlawcordova/jlawcordova-lab/releases/download/v0.6.0/`;
  - refuses unless the tarball's hash matches both the pinned hash and its line in `SHA256SUMS`, and deletes what it downloaded when it refuses;
  - extracts the one executable into `.pixellab-bin/v0.6.0/pixellab` with the system `tar`;
  - skips all of that when that file is already there and `--version` reports `pixellab 0.6.0`;
  - then runs the program with the arguments it was given and exits with the program's exit code.

  It never uses a lab checkout, never installs anything outside the repo, and never touches `/Applications` or Claude's MCP configuration.
- **R11. `npm run dev`, `npm run build` and `npm test` build the art first.** Each runs `pixellab art build --site .` through R10 before its main step:
  - `dev` runs it before `astro dev`;
  - `build` runs it before `astro check` and `astro build`;
  - `test` runs it before `node --test`, because some suites read the compiled SVGs.

  A fresh clone needs only `npm install` and network access the first time. Over-budget results are printed as warnings and never fail (lab R4). Validation problems stop the build.
- **R12. CI uses the same path.** `.github/workflows/deploy.yml` gets a step, "Build the pixel art", that runs `npm run art` after `npm ci`. On `ubuntu-latest`, that downloads and verifies `pixellab-linux-x64` and builds the art before `npm test` and before `withastro/action` runs `npm run build`. A failed download or a hash mismatch fails the job.
- **R13. Outputs aren't committed.** `.gitignore` adds `.pixellab-bin/`, `src/assets/pixel-art/*.svg` and `static/public/thumbnails/*.png`. The six SVGs and 13 PNGs are removed from the index with `git rm --cached`. They stay in history, which is fine because they're public already.
- **R14. No `pixellab` package.** `pixellab` leaves `devDependencies` and `package-lock.json`, and nothing in the repo imports `pixellab/*` or runs `node_modules/pixellab`.

### The explainer library

- **R15. Format 2.** `art/explainer-library.pixellab/` is migrated with `pixellab document migrate --document art/explainer-library.pixellab`. Its art doesn't change. Its outfits keep the `cbob` class: the library publishes no SVG, so the class is only its marker for "the idle bob" (explainer library spec R5).
- **R16. The export runs on the program.** `scripts/export-explainer-library.mjs` runs the program from R10 instead of `node_modules/pixellab/cli/bin/pixellab.mjs`, with the same commands: `object list --json`, `scene list --json`, `object render <name> --frame <f> --scale <n> --out <file>` and `art preview scenes/<name> --scale <n> --out <file>`. It writes the same files as today.
- **R17. Its test reads the program's JSON.** `scripts/explainer-library.test.mjs` keeps its test names and what each checks, using only the program's JSON output and the document's JSON files:

  | Test | Reads |
  |---|---|
  | R6: loads and validates | `check --json`: `ok` and no `problems` |
  | R6: canonical form | `check --json`: no warning with "isn't in canonical form" (the program's own canonical check replaces `serialize`) |
  | R2: the site's palette | the two `palette.json` files: equal `world` and `outfit` |
  | R1, R8: publishes nothing | `manifest.json` and `scene list --json`: no `publish` and no `output` |
  | R4: every asset exists | `object list --json` |
  | R5: loops | `object show <name> --json`: each layer's `loop`, and `class` `cbob` |
  | R3: outfits extend character | `object show --json`: `extends`, `character` and each key's `tier` |
  | R7: contact sheets | `scene items <sheet> --json` |
  | R8: export | `exportLibrary` as today |

### Tests and checks in the site

- **R18. The art tests leave**, as the lab's R20 sorts them. These are removed:
  - `pixel-art-island`, `pixel-art-motion`, `pixel-art-roundtrip`, `pixel-art-sources`, `range-art` and `range-classes`;
  - from `achievement-icons`, the tests that read the document or the compiled sheets: "an icon object exists for every sheet entry", "every icon is a 16×16 sprite", "no icon uses ink", "the sheet scene places the icons in SHEET_ORDER", "the compiled sheet stays within 6 KB gzip", "each frame is a 20×20 sprite…" and "the frame sheet places the frames in FRAMES order";
  - from `blog-thumbnails`, the viewBox and staleness tests, along with `scripts/blog-thumbnails.mjs` and `npm run thumbnails`.
- **R19. The site's own tests stay.** These keep running unchanged:
  - `achievement-icons`'s tests of `src/lib/achievement-icons.mjs` and of the skill's icon list;
  - `island-entrance` and `range-change` (except its hop test), which read the compiled SVGs that R11 builds first.

  These are rewritten:
  - `blog-thumbnails.test.mjs` keeps "every post has exactly one thumbnail, and its featured image is that thumbnail". It reads the mapping from the posts' front matter (`featured-image: /public/thumbnails/<key>.png`) and from each `thumb-<key>` scene's `image.file`, since the script's `THUMBNAILS` list goes. It also checks that every `thumb-*` scene has an `image` and is used by one post.
  - `range-change.test.mjs`'s "A's hop" checks that every `data-class` group of the compiled sprite holds one element with the `character` class. It also checks that `character`'s layer 1 has a `hop` action that moves only up and down, in whole pixels, starts and ends at rest and rises at least 5 px. Lastly, it checks that `Range.astro` plays it with `data-play` and clears it on `range-sprite--hop`.
- **R20. The dependency check.** `pixel-first-look.test.mjs`'s R9 test expects `devDependencies` to be exactly `@astrojs/check` and `typescript`. It also checks that `scripts/pixellab.mjs` pins a release tag (`vX.Y.Z`) and a 64-hex SHA-256 for each of the two assets.
- **R21. The program's script is tested offline.** `scripts/pixellab.test.mjs` covers:
  - the platform mapping;
  - refusing a tarball whose hash matches neither the pin nor `SHA256SUMS`, or only one of them, with the files removed;
  - skipping the download when the executable is already there.

  It uses a local fake fetch and a tiny fake tarball, so `node --test` uses no network.
- **R22. Browser checks follow the hop.** `scripts/e2e/range.e2e.mjs`'s "A makes only the character hop" samples `g[data-class] .character` instead of `.cbob`. It waits for `data-play` to clear, not `.is-hopping`. Its assertions don't change.

### Docs, skills and the agent

- **R23. Docs.**
  - `CLAUDE.md`: Commands, Verifying, Conventions and Architecture describe:
    - JSON sources and the pinned program (`npm run art`, `npm run pixellab -- …`);
    - over budget as a warning;
    - no `npm run thumbnails`: thumbnails come from `art build`;
    - uncommitted outputs, and the explainer library on the program.
  - `README.md`'s project layout and deploy notes say the same.
  - `docs/design-system/README.md` and `components/AchievementRow/README.md` are updated where they mention `.mjs` sources or `pixel-art.css`'s animation.
- **R24. Skills and the agent.** The `pixel-art`, `pixel-art-motion`, `design-scene` and `achievement-icon` skills and `.claude/agents/pixel-artist.md` describe:
  - JSON sources (`objects/<name>.json`, `scenes/<name>.json`, `palette.json`) and canonical form (`check` warns);
  - the program through `npm run pixellab -- …` in a worktree, and the MCP tools with `doc_save` proposals in the owner's checkout, as today;
  - ambient loops and actions edited with `scene ambient`, `scene action`, `object ambient` and `object action`, in place of CSS classes for drifts, bobs and one-shot moves;
  - thumbnails declared with a scene's `image`;
  - no committed SVGs or PNGs: review with `art preview` and the dev server.

  `verify-change` and `write-plan` are checked for stale mentions and fixed only where they name the old commands.

## Design

### D1. Order of the swap, with the program's commands

All in a worktree, with `npm run pixellab -- …` (R10), never over MCP: `document migrate` isn't offered there, and the MCP server works on the owner's checkout.

```sh
npm run pixellab -- document migrate
npm run pixellab -- document migrate --document art/explainer-library.pixellab
# clouds: for each (scene, item, duration, offset) in R2
npm run pixellab -- scene set <scene> <item> --class ''
npm run pixellab -- scene ambient <scene> <item> --duration <d> --offset <o> \
  --keys '[{"t":0,"move":[0,0]},{"t":<d/2>,"move":[12,0]}]'
# bob and hop on the character's layer 1
npm run pixellab -- object ambient character 1 --duration 1000 \
  --keys '[{"t":0,"move":[0,0]},{"t":500,"move":[0,-1]}]'
npm run pixellab -- object action character 1 hop --duration 480 --keys '<D2>'
npm run pixellab -- scene sort thumb-<key>   # each of the 13
```

The program has no command for a layer's class, a scene's `image` or the manifest's `publish`. Those three are hand edits to the JSON, made in canonical form. `check` proves the form afterwards (it warns otherwise). The edits:
- `objects/character.json` layer 1: `"class": "cbob"` becomes `"class": "character"`.
- each `scenes/thumb-<key>.json`: `"image": { "file": "<key>.png", "scale": 5 },` before `viewBox`, on one line as canonical form wants.
- `manifest.json`: `"images": "../../../../static/public/thumbnails"` in `publish`, after `dir`.

### D2. The hop's keys

`chop` is 480 ms of `step-end` keyframes at elevenths: 0, −2, −4, −5, −6, −6, −5, −4, −2, 0, −1, then 0. An action's keys step a pixel at a time between keys, so each jump is a hold key 1 ms before the jump's time (rounded up to a whole ms), followed by the new value. That's the pattern the lab's ambient tests use. Every jump lands within 1 ms of today's, and the lab's tolerance is 4 ms:

```json
[{"t":0,"move":[0,0]},{"t":43,"move":[0,0]},{"t":44,"move":[0,-2]},{"t":87,"move":[0,-2]},
 {"t":88,"move":[0,-4]},{"t":130,"move":[0,-4]},{"t":131,"move":[0,-5]},{"t":174,"move":[0,-5]},
 {"t":175,"move":[0,-6]},{"t":261,"move":[0,-6]},{"t":262,"move":[0,-5]},{"t":305,"move":[0,-5]},
 {"t":306,"move":[0,-4]},{"t":349,"move":[0,-4]},{"t":350,"move":[0,-2]},{"t":392,"move":[0,-2]},
 {"t":393,"move":[0,0]},{"t":436,"move":[0,0]},{"t":437,"move":[0,-1]}]
```

The action holds −1 until 480 ms, then returns to rest, which is `chop`'s final 0.

### D3. `scripts/pixellab.mjs`

```js
export const VERSION = 'v0.6.0';
export const ASSETS = {
  'darwin-arm64': { file: 'pixellab-darwin-arm64.tar.gz', sha256: '16aed59a…71ab' },
  'linux-x64':    { file: 'pixellab-linux-x64.tar.gz',    sha256: '14635529…1fd5' },
};
export async function ensureProgram({ root, fetch, platform, arch }) → path
// CLI: node scripts/pixellab.mjs <args…>  → ensureProgram, then spawn with stdio inherited
```

- `ensureProgram` takes its fetch and platform as parameters so R21 can test it offline. The default is the global `fetch`, which follows GitHub's redirect to its asset host.
- It downloads into `.pixellab-bin/tmp-<random>/`, verifies, extracts, renames into place, and removes the temp folder, so an interrupted run leaves nothing half-installed.
- The full hashes come from the release's `SHA256SUMS`:
  - darwin-arm64: `16aed59af6bfa5336db3a10f85aa59a001267604ef8cbf969bce3ba7ece571ab`
  - linux-x64: `146355298b3741f7b67e69820103991ac39000545962ef2d8aaee201bcc23fd5`

The `package.json` scripts:

```json
"dev": "npm run art && astro dev",
"build": "npm run art && astro check && astro build",
"test": "npm run art && node --test \"scripts/*.test.mjs\"",
"art": "node scripts/pixellab.mjs art build --site .",
"pixellab": "node scripts/pixellab.mjs --site .",
"explainer-export": "node scripts/export-explainer-library.mjs"
```

`thumbnails` goes. The rehearsal showed that `--site .` before the group works, and that `--document <path>` wins over `--site`, so `npm run pixellab -- check --document art/explainer-library.pixellab` reaches the explainer library.

### D4. The Range's A button (R8)

```ts
// A: only the character hops (R6), with the art's hop action (the site contract's data-play).
$('.range__a').addEventListener('click', () => {
  const group = art.querySelector(`g[data-class="${index}"]`);
  if (!group || motion.matches) return;
  group.removeAttribute('data-play');
  group.getBoundingClientRect();
  group.setAttribute('data-play', 'hop');
});
art.addEventListener('animationend', (e) => {
  if ((e as AnimationEvent).animationName === 'range-sprite--hop') (e.target as Element).closest('[data-play]')?.removeAttribute('data-play');
});
```

`animationend` bubbles from the character's element to the `<svg>`. One listener on `art` clears whichever group played. Ambient loops and frame loops are `infinite`, so they never fire it. The Motion library's entrances are Web Animations, which don't fire `animationend` either. The name check keeps the listener honest anyway.

### D5. CI (R12)

```yaml
      - name: Install dependencies
        run: npm ci
      # Downloads the pinned pixellab-linux-x64 (checked against SHA256SUMS)
      # and compiles the SVGs and thumbnails, which aren't committed.
      - name: Build the pixel art
        run: npm run art
      - name: Test
        run: npm test
```

`npm test` and `withastro/action`'s `npm run build` run `npm run art` again. That takes under a second once the program is in `.pixellab-bin/`, and the same job keeps the folder between steps. No cache is added, so every run downloads about 2 MB once.

### D6. Files

| File | Change |
|---|---|
| `src/assets/pixel-art/jlawcordova.pixellab/**` | `.mjs` → `.json` (R1), swap (R2, R3), images (R4) |
| `src/assets/pixel-art/*.svg`, `static/public/thumbnails/*.png` | untracked, gitignored (R13) |
| `art/explainer-library.pixellab/**` | `.mjs` → `.json` (R15) |
| `src/styles/pixel-art.css` | keyframes out (R7) |
| `src/components/home/Range.astro`, `HeroIsland.astro` | A on `data-play` (R8); HeroIsland's comment no longer says pixel-art.css animates the art |
| `scripts/pixellab.mjs`, `scripts/pixellab.test.mjs` | new (R10, R21) |
| `scripts/export-explainer-library.mjs`, `scripts/explainer-library.test.mjs` | on the program (R16, R17) |
| `scripts/blog-thumbnails.mjs` | removed (R18) |
| `scripts/blog-thumbnails.test.mjs`, `range-change.test.mjs`, `achievement-icons.test.mjs`, `pixel-first-look.test.mjs` | R18–R20 |
| `scripts/pixel-art-{island,motion,roundtrip,sources}.test.mjs`, `range-art.test.mjs`, `range-classes.test.mjs` | removed (R18) |
| `scripts/e2e/range.e2e.mjs` | R22 |
| `package.json`, `package-lock.json`, `.gitignore`, `.github/workflows/deploy.yml` | R10–R14 |
| `CLAUDE.md`, `README.md`, `docs/design-system/…`, `.claude/skills/*`, `.claude/agents/pixel-artist.md` | R23, R24 |

### D7. Proof that it looks and moves the same (R6)

1. **Frame comparison.** A scratch Playwright script, kept in the scratchpad and not committed, serves two builds side by side: `main` before the change and the branch after it. On each page, it waits for the entrances to finish. It then pauses every CSS animation through `document.getAnimations()`, sets each to the same `currentTime`, and screenshots the hero island and the Range stage. The pages must match pixel for pixel:
   - at 1440 and 390 px wide;
   - at 24 times across each cycle (the 16, 20 and 13 s clouds, the 1 s bob and the frame loops);
   - every 40 ms through one hop, with the old page given `is-hopping` and the new one `data-play="hop"`;
   - under `reducedMotion: 'reduce'`.

   Its report, a count of frames compared and matched, goes in the PR.
2. **Screenshots.** The home page's hero and Range, before and after, at 1440 and 390 px. Each is shown at rest, mid-hop and under reduced motion. They're attached to the PR, along with the 13 thumbnails' pixel comparison (decoded RGBA, as in the rehearsal) and a check that there's no horizontal scroll at either width.
3. **The usual checks** from CLAUDE.md: `npm run build`, `npm test`, `npm run e2e`, `npm run art` (lossless, with any over-budget lines as warnings) and `check` with no new warnings.

## Areas of concern

1. **`npm test` and the network.** CLAUDE.md says `npm test` uses "Node built-ins, no network". With R11, a first run on a fresh clone downloads the program (about 2 MB). Every later run is offline. The tests themselves (R21) never touch the network. I recommend rewording CLAUDE.md to "no network once the program is in `.pixellab-bin/`". The alternative is to leave `npm test` alone and make every SVG-reading suite skip without the SVGs, but CLAUDE.md forbids skipping tests. **Taken:** CLAUDE.md is reworded.
2. **Pinning the hashes as well as checking `SHA256SUMS`.** The owner asked for a check against `SHA256SUMS`. That file comes from the same release as the tarball, so on its own it catches a corrupt download, not a replaced one. R10 also pins both hashes in the repo, so a changed release asset fails the build. The cost is that bumping the version means editing the hashes too, which R20's test keeps honest. **Taken:** both checks.
3. **What stops being checked.** R18 drops the tests the lab's R20 drops, and the same split for `achievement-icons` and `blog-thumbnails`, which the lab's spec names but this site splits. The site keeps its own tests: the icons' metadata, the entrance schedules, the Range change, and the posts ↔ thumbnails mapping. Rules such as "each Range floor is three ground rows", "the trucks keep to the road" and "the icon sheet follows `SHEET_ORDER`" are no longer checked by `npm test`. Art changes are reviewed as proposals in the app, as the lab's spec accepted.
4. **A class for the character (R3).** The swap removes `cbob`. Without a document class, the browser check and the hop test would have to find the character through generated names, which the contract says can change. R3 gives the layer the class `character` instead. That's the one change to the art's classes beyond the swap.
5. **The owner's Pixel Lab app and MCP server.** The MCP server and the app on the owner's checkout must be v0.6.0 before this merges and is pulled. A v0.5.0 one can't open a format-2 document, and v0.6.0 can't open format 1. This change installs nothing (intent constraints). Proposals made before format 2 are retired by v0.6.0 itself (lab R25). **Taken:** the PR asks the owner to update the app before merging. The plan checks for open proposals with `proposal list` before migrating, and stops if there are any.
6. **Platforms.** The release has programs for macOS on Apple silicon and Linux on x64 only. An Intel Mac or Windows clone can't run `npm run dev`, `build` or `test`. R10 says so in its error. That's the owner's Mac and CI today.
7. **CI depends on GitHub Releases.** If the asset download fails, the build fails, and the daily rebuild and the accomplishments dispatch can't deploy until it works again. A cache of `.pixellab-bin/` keyed on the version would soften this. It's left out because the download is small. **Taken:** no cache. It can be added later if a download ever fails.
8. **Generated names (lab concern 6).** Nothing in the site references `mv-…` or `range-sprite--a…`. Page code uses only `data-pixellab`, `data-class`, `data-enter`, the `character` class, `data-play` and `range-sprite--hop`, all in the contract.

## Open questions

From the intent, both answered by the owner on 2026-10-21 and carried into the requirements:
- `npm run dev` fetches the pinned release, verified and skipped when present, and builds the art before `astro dev` (R10, R11).
- The explainer library is part of this change (R15–R17).

Areas of concern 1, 2, 5 and 7 were resolved with the spec's recommendations, for the owner's review of the final PR.
