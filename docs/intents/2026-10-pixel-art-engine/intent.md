# Intent: Isometric pixel-art engine

| | |
| --- | --- |
| **Status** | Draft |
| **Owner** | J. Law. Cordova |
| **Created** | 2026-10-01 |
| **Builds on** | The redesign: its [intent](../2026-10-redesign/intent.md), its [spec](../2026-10-redesign/spec.md) §8 (pixel-art pipeline) and its [plan](../2026-10-redesign/plan.md) §8 (follow-ups) |
| **Design source** | [J. Law Portfolio canvas](https://claude.ai/artifact/JhKbkNZP9qGWHMaWE8USbR), artboard "Prototype B — isometric" (`project/Isometric.dc.html`) |

## Intent

Give the site a small, repo-local engine for **making new** isometric pixel art, not just shipping the art that already exists. New art is written as compact text sources: character maps, palettes, per-variant overrides, and a few isometric building blocks. The engine compiles them to the same optimized inline SVG that the redesign ships, so the components, CSS animation hooks and budgets stay as they are.

The redesign's pipeline ([redesign spec §8](../2026-10-redesign/spec.md#8-pixel-art-pipeline)) is a lossless **compressor**. It takes SVG already drawn on the design canvas, merges same-colored pixels into paths, and proves nothing moved. It can't draw anything. This intent adds the drawing side in front of it.

## Why

- **New art has no source in the repo.** After the redesign, the hero island and the Range sprite exist only as rendered rects, extracted once from the canvas. A new outfit, prop or scene means going back to the canvas and extracting again by hand.
- **The model already exists, outside the repo.** The mock's Range script builds the character from a 16×20 character map (`BASE`), a palette, and per-class row overrides for the headgear (its `CL` table). That's the right model, but it lives only in the canvas script. The repo gets the rendered output, so a sixth outfit can't be made from the repo.
- **The redesign's own follow-ups need it.** The plan defers a sixth Range class, **Security and governance**, because it needs new outfit art (redesign intent, decision #7). The profile lists that discipline among its strongest (`docs/references/profile.md`, Disciplines #6). Variants should be data, not hand-placed rects.
- **Consistency.** One projection, one palette system and one output format keep any new piece in the same world as the hero island, rather than each piece being drawn a bit differently.

## Scope

### In scope

1. **Sprite source format.** Character maps as rows of single-character keys, a named palette, and per-variant overrides (rows, palette entries or both), the same model as the mock's `BASE` and `CL`. Committed under `src/assets/pixel-art/source/`.
2. **Frames.** A way to declare frame loops: several maps or overrides for one element, emitted as the `class="<loop> <loop>N"` groups that `pixel-art.css` already animates (like `wf`, `ff`, `hf` and `cbob`). Keyframes stay hand-written CSS.
3. **Isometric building blocks.** A small set of primitives on the site's 2:1 grid (the `.isogrid` tile is 32×16, lines at ±26.57°): a block or box with top, left and right faces in a palette's light, mid and dark tones; a flat tile; and placing a sprite on a tile. Enough to build a small island or a prop, not a general 3D renderer.
4. **Compiler.** It renders sources to unit pixels and hands them to the existing optimizer, so the lossless check, row merging, class hooks and size report all come for free. It runs from `npm run art`.
5. **Round-trip proof.** Rebuild the five current Range variants from source and match the extracted `range-sprite.src.svg` pixel for pixel. This proves the engine before it makes anything new.
6. **Preview.** A dev-only way to see sources rendered at 1×–4× (an HTML page or Playwright screenshots) for review in PRs. Not shipped.
7. **First new asset.** The **Security and governance** outfit as a sixth sprite variant, made entirely with the engine. Adding it to the live Range carousel is a separate change (see [Decisions](#decisions) #5).

### Out of scope

- Rendering in the browser (canvas, WebGL or a runtime library). The art stays static, inline SVG with CSS-only animation, as the redesign decided.
- A visual editor or GUI. Sources are text, reviewed as diffs plus preview images.
- Re-drawing the hero island in the new format (see [Decisions](#decisions) #2).
- Raster output for favicons and the OG image. Those stay Playwright screenshots, as in redesign plan PR 4.
- Any change to how the redesign looks today.

## Constraints

- **Node built-ins only**, like the optimizer. No new dependencies, runtime or dev.
- **Deterministic and pixel-exact.** The same source always gives byte-identical output. Whole-number coordinates only, `shape-rendering: crispEdges`, no smoothing.
- **Same output contract.** Output files look like the redesign's optimized SVGs: a viewBox, `<path fill>` groups, `class` and `data-class` hooks, and z-order from source order. `HeroIsland.astro`, `Range.astro` and `pixel-art.css` need no changes to use them.
- **Budgets hold.** Each output file stays within spec §12 (≤ 100 KB raw, ≤ 25 KB gzip), and the home page total stays ≤ 50 KB gzip.
- **Palette from tokens.** Art colors come from a small named palette that includes the brand colors in `variables.css`. New colors are added deliberately, and any that sit behind text are contrast-checked.
- **Accessible by default.** Art is decorative (`aria-hidden`). Its text alternative lives in the component, as it does for the Range sprite. Every frame loop has a single static frame for reduced motion.
- **Public-safe.** The art is generic. No logos, names or likenesses of clients, employers or colleagues, per `CLAUDE.md`.
- **Test-first,** like the optimizer: `node:test` fixtures for the map parser, overrides, frames and each primitive.

## Acceptance criteria

- [ ] `npm run art` builds every source in `src/assets/pixel-art/source/` and passes the lossless check.
- [ ] The five Range variants rebuilt from source match the extracted sprite pixel for pixel in every fill group, with the same `data-class` and `cbob` structure.
- [ ] The Security and governance variant exists as source, compiles, stays within budget, and has a preview image in its PR.
- [ ] A small isometric prop or island built only from the primitives renders on the `.isogrid` without misaligned edges at 1×, 2× and 3×.
- [ ] Frame loops compile to groups that the existing `pixel-art.css` animates, and they show one static frame under `prefers-reduced-motion: reduce`.
- [ ] `npm test` and `npm run build` pass with no new warnings, and no dependency is added.
- [ ] The README documents the source format and `npm run art`.

## Decisions

Open items to settle before or during the spec. Record the answer here.

| # | Question | Default if not decided |
| --- | --- | --- |
| 1 | **Source format:** a JS module (`.mjs` exporting maps and palettes), JSON, or a custom text format? | A `.mjs` data module with string rows, the same shape as the mock's `BASE` and `CL`. It needs no parser and can hold comments. |
| 2 | Should the **hero island** move to engine sources? | No. Its extracted SVG stays its source. Re-drawing about 6,500 rects as primitives is a lot of work for no visible change. Revisit if the island ever needs editing. |
| 3 | Once the round trip passes, is the **Range sprite's source of truth** the engine source or the extracted SVG? | The engine source. The extracted SVG stays as a test fixture that pins the five original variants. |
| 4 | Should the canvas stay the place where new art is **explored**? | Yes, for exploration. The repo source is the master for anything that ships, and changes made on the canvas are carried over to the source by hand. |
| 5 | Does the **sixth Range class** go live with the engine? | No. The engine ships the variant, and a follow-up changes the carousel to six classes (copy, a sixth dot, a variant index of 0–5). It also updates the redesign's decision #7 and spec §7.3. |
| 6 | How far should **isometric primitives** go: blocks and tiles only, or also slopes, water and foliage? | Blocks, tiles and sprite placement only. Add more when a real asset needs them. |
| 7 | Should the engine also be able to **export a palette swap** of existing art, such as the mock's accent alternates (wine, clay, olive)? | Not now. The accent stays one token, and art colors stay fixed. |

## Sequencing

This depends on redesign PR 2, which adds `scripts/optimize-pixel-art.mjs`, the extracted sources and `pixel-art.css`. It should start after PR 2 merges and can run alongside redesign PRs 3 and 4. A `spec.md` and a `plan.md` follow this intent in this directory, as for the redesign.

## References

- Redesign pipeline: [redesign `spec.md` §8](../2026-10-redesign/spec.md#8-pixel-art-pipeline)
- Range sprite model in the mock: `project/Isometric.dc.html`, the `BASE`, `CL` and `pal` definitions in its component script
- Disciplines: [`docs/references/profile.md`](../../references/profile.md#disciplines)
- Follow-ups this unblocks: [redesign `plan.md` §8](../2026-10-redesign/plan.md#8-follow-ups-not-in-this-plan)
