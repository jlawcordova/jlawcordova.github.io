# Intent: Isometric pixel-art engine

| | |
| --- | --- |
| **Status** | Accepted |
| **Owner** | J. Law. Cordova |
| **Created** | 2026-10-01 |
| **Amended** | 2026-10-02: decisions taken. The hero island moves into the engine, an editor page is added on the site, agent skills are added, and every PR gets an independent verification ([Decisions](#decisions)) |
| **Builds on** | The redesign: its [intent](../2026-10-redesign/intent.md), its [spec](../2026-10-redesign/spec.md) §8 (pixel-art pipeline) and its [plan](../2026-10-redesign/plan.md) §8 (follow-ups) |
| **Design source** | [J. Law Portfolio canvas](https://claude.ai/artifact/JhKbkNZP9qGWHMaWE8USbR), artboard "Prototype B — isometric" (`project/Isometric.dc.html`) |
| **Spec** | [`spec.md`](spec.md) |

## Intent

Give the site a small, repo-local engine for **making new** isometric pixel art, not just shipping the art that already exists. New art is written as compact text sources. **Objects** are reusable pieces, such as a block, a water tile, a tree or an outfit, each described by character maps, a palette and per-variant overrides. **Scenes** are layout files that place objects on the isometric grid. The engine compiles scenes to the same optimized inline SVG that the redesign ships, so the components, CSS animation hooks and budgets stay as they are.

The site also gets an **editor page**, a small app at an unlisted URL on jlawcordova.com. It's where new art is explored and designed: objects are dragged onto the grid, and pixels are painted to make or change an object. The editor uses the same engine as the build, and it hands back the source text for the repo.

The redesign's pipeline ([redesign spec §8](../2026-10-redesign/spec.md#8-pixel-art-pipeline)) is a lossless **compressor**. It takes SVG already drawn on the design canvas, merges same-colored pixels into paths, and proves nothing moved. It can't draw anything. This intent adds the drawing side in front of it, and a place to draw.

## Why

- **New art has no source in the repo.** After the redesign, the hero island and the Range sprite exist only as rendered rects, extracted once from the canvas. A new outfit, prop or scene means going back to the canvas and extracting again by hand.
- **The model already exists, outside the repo.** The mock's Range script builds the character from a 16×20 character map (`BASE`), a palette, and per-class row overrides for the headgear (its `CL` table). That's the right model, but it lives only in the canvas script. The repo gets the rendered output, so a sixth outfit can't be made from the repo.
- **The redesign's own follow-ups need it.** The plan defers a sixth Range class, **Security and governance**, because it needs new outfit art (redesign intent, decision #7). The profile lists that discipline among its strongest (`docs/references/profile.md`, Disciplines #6). Variants should be data, not hand-placed rects.
- **Designing needs a place to drag, drop and paint.** Writing character maps by hand works for small edits, but laying out a scene or drawing a new outfit is visual work. A page on the site is in reach from any device and draws with the same engine that builds the art.
- **Consistency.** One projection, one palette system and one output format keep every new piece in the same world as the hero island, rather than each piece being drawn a bit differently.

## Scope

### In scope

1. **Object source format.** Character maps as rows of single-character keys, a named palette, and per-variant overrides (rows, palette entries or both), the same model as the mock's `BASE` and `CL`. Every reusable piece is an object in its own file: a block, a tile, water, a tree, the character, and **each outfit as its own object**. Committed under `src/assets/pixel-art/source/`.
2. **Scene layout format.** A text file that says which objects go where on the isometric grid, and in what order. Each shipped SVG (the hero island, the Range sprite) is built from one scene.
3. **Extensible object library.** Adding a new kind of object, such as a new block, a water block or a tree, means adding an object source, not changing the engine. The first library covers what the hero island, the Range sprite and the new outfit need: blocks, flat tiles, water, trees and sprite placement.
4. **Frames.** A way to declare frame loops: several maps or overrides for one object, emitted as the `class="<loop> <loop>N"` groups that `pixel-art.css` already animates (like `wf`, `ff`, `hf` and `cbob`). Keyframes stay hand-written CSS.
5. **Compiler.** It renders scenes to unit pixels and hands them to the existing optimizer, so the lossless check, row merging, class hooks and size report all come for free. It runs from `npm run art`.
6. **Round-trip proof.** Rebuild the five current Range variants and the **hero island** from source, and match today's art pixel for pixel. This proves the engine before it makes anything new.
7. **Hero island in the engine.** The island's source of truth moves from the extracted SVG to engine sources, without any visible change. Its pieces can then be swapped for library objects over time.
8. **Editor page.** An unlisted page on the live site where the owner can:
   - drag objects from the library onto the isometric grid to build or change a scene;
   - paint pixels to make or change an object, including an outfit, with its palette and frames;
   - preview the result as the build would render it, at 1×–4×;
   - download or copy the source text, to commit to the repo.
9. **Preview for review.** Preview images of changed art in each PR (Playwright screenshots), so diffs to sources can be reviewed visually.
10. **First new asset.** The **Security and governance** outfit as a sixth outfit object, made with the engine. Adding it to the live Range carousel is a separate change (see [Decisions](#decisions) #5).
11. **Agent skills.** Skills in `.claude/skills/` so that any AI agent can use the engine and the editor without this conversation's context:
    - a skill for **making and changing pixel art**: objects, scenes, outfits, the design language, previews and the editor;
    - a skill for **verifying a change** independently against its intent and spec. It's reusable for later changes, not only this one.
12. **Verification levels.** Every PR is checked by the session that built it and then by an independent verifier session. Browser checks are committed as scripts.

### Out of scope

- Rendering the **site's art** in the browser (canvas, WebGL or a runtime library). The shipped art stays static, inline SVG with CSS-only animation, as the redesign decided. Only the editor page draws in the browser.
- Saving from the editor to GitHub, or any server side. The editor hands back text, and the owner commits it.
- Linking the editor from the site's navigation, or listing it in search engines.
- Any visible change to the hero island or the Range sprite.
- Palette swaps of existing art (see [Decisions](#decisions) #7).
- Raster output for favicons and the OG image. Those stay Playwright screenshots, as in redesign plan PR 4.
- Any change to how the redesign looks today.

## Constraints

- **No new dependencies**, runtime or dev. The compiler uses Node built-ins only, and the editor is plain TypeScript and CSS with no UI framework.
- **One engine.** The build and the editor use the same engine code, so what the editor previews is what `npm run art` builds.
- **Deterministic and pixel-exact.** The same source always gives byte-identical output. Whole-number coordinates only, `shape-rendering: crispEdges`, no smoothing.
- **Same output contract.** Output files look like the redesign's optimized SVGs: a viewBox, `<path fill>` groups, `class` and `data-class` hooks, and z-order from source order. `HeroIsland.astro`, `Range.astro` and `pixel-art.css` need no changes to use them.
- **Budgets hold.** Each output file stays within spec §12 (≤ 100 KB raw, ≤ 25 KB gzip), and the home page total stays ≤ 50 KB gzip. The editor's code and data load only on the editor page.
- **Palette from tokens.** Art colors come from a small named palette that includes the brand colors in `variables.css`. New colors are added deliberately, and any that sit behind text are contrast-checked.
- **Accessible by default.** Art is decorative (`aria-hidden`). Its text alternative lives in the component, as it does for the Range sprite. Every frame loop has a single static frame for reduced motion. The editor keeps the visible focus ring, 44px tap targets and `prefers-reduced-motion` support, and everything done by dragging can also be done with a keyboard or single taps.
- **Public-safe.** The art is generic. No logos, names or likenesses of clients, employers or colleagues, per `CLAUDE.md`. The editor page is public, even though it's unlisted, so it shows only what's already in the repo.
- **Test-first,** like the optimizer: `node:test` fixtures for the map parser, overrides, frames, scenes and each library object.
- **Independent verification.** A verifier that didn't build the change checks each PR against this intent and the spec. It only recommends: it posts its findings as a PR comment and never pushes.
- **Browser checks stay outside `npm test` and `package.json`.** They run with the Playwright that the environment provides, not a project dependency, so `npm test` stays Node built-ins with no network.

## Acceptance criteria

- [x] `npm run art` builds every scene in `src/assets/pixel-art/source/` and passes the lossless check.
- [x] The five Range variants rebuilt from source match the extracted sprite pixel for pixel in every fill group, with the same `data-class` and `cbob` structure.
- [x] The hero island rebuilt from source renders pixel for pixel the same as the extracted island, with the same animation groups.
- [x] Each Range outfit, including the new one, is its own object source.
- [x] Adding a new library object (a block, water or a tree) needs only a new source file, and a scene can place it.
- [x] The Security and governance outfit exists as source, compiles, stays within budget, and has a preview image in its PR.
- [x] A small isometric prop or island built only from library objects renders on the `.isogrid` without misaligned edges at 1×, 2× and 3×.
- [x] Frame loops compile to groups that the existing `pixel-art.css` animates, and they show one static frame under `prefers-reduced-motion: reduce`.
- [x] On the editor page, the owner can place, move and remove objects in a scene, paint an object's pixels, and download or copy the source. Committing that source and running `npm run art` gives the art the editor previewed.
- [x] The editor page works at 1440px and 390px with no horizontal page scroll, can be used without dragging, isn't linked from the site, and is marked `noindex`.
- [x] `npm test` and `npm run build` pass with no new warnings, and no dependency is added.
- [x] The README documents the source formats, the editor page and `npm run art`.
- [x] A fresh agent session given only the pixel-art skill can add a new library object that passes validation and looks right in its preview.
- [x] Every PR in this change has an independent verifier report as a PR comment, and every requirement in the spec traces to a test or a named check.

### Evidence

Checked on 2026-10-03, after all seven slices merged (PRs #29 to #36), plus the fix in #38.

| Criterion | Evidence |
| --- | --- |
| `npm run art`, lossless | `npm run art` on `master`: every file `lossless`, none `OVER BUDGET` |
| Range variants | `R10:` tests in `pixel-art-roundtrip.test.mjs`; `art.e2e.mjs` in the browser (#30) |
| Hero island | `R11:` tests; `art.e2e.mjs`; before and after screenshots (#31) |
| Each outfit is an object | Six `outfit-*.mjs` files that extend `character` (#30, #34) |
| A new library object is only a file | `block`, `tile`, `water`, `tree` (#33), and the skill eval's `pebble` (#36) |
| Security and governance outfit | `objects/outfit-security-governance.mjs`, with previews at 1×–4× in #34 |
| Library objects on the grid at 1×, 2× and 3× | The block tests (#33), and editor screenshots of `library-demo` with the tile grid, on the `previews/isogrid-alignment` branch. The `.isogrid` background itself draws only faint dots at each cell's corner, on every page, so the tile grid is the alignment check |
| Frame loops and reduced motion | Group class tests; `R5:` browser checks on `/` and the lab (#35, #36) |
| Editor: place, move, remove, paint, export, and the same art from `npm run art` | `R16:`, `R17:`, `R18:` and `R19:` browser checks; R18 compiles the exported sources with the real command and matches the canvas pixel for pixel (#35, #36) |
| Editor: 1440 and 390, no dragging, unlisted, `noindex` | `R15:`, `R21:` and `R22:` browser checks. Lighthouse accessibility 100 on mobile and desktop, and no axe-core violations in 20 editor states (#38) |
| Tests, build, no dependencies | `npm test` 148/148; `npm run build` 0 errors, warnings and hints; `package.json` unchanged |
| README | The "Pixel art" section and layout rows (#30 to #36) |
| Skill eval | A fresh, headless session added `pebble`; it validates within the caps in world colors, and the owner accepted it (#36) |
| A verifier report on every PR | Every slice (#29 to #36) has a report ending in PASS; #36's re-checks also cover the skill eval and, on `master`, the fix in #38. #38's own report found that its new heading check never opened the dialogs it named; #40 fixes the check. The docs-only PRs (#32, #37, #39) went straight to PR, as `CLAUDE.md` allows for small, self-contained changes. Traceability: each verifier report checks every requirement in scope against its `R<n>:` tests or a named check in D15 |

## Decisions

Decided by the owner on 2026-10-02.

| # | Question | Decision |
| --- | --- | --- |
| 1 | **Source format:** a JS module (`.mjs` exporting maps and palettes), JSON, or a custom text format? | **`.mjs`** data modules with string rows, the same shape as the mock's `BASE` and `CL`. They need no parser and can hold comments. Scenes use the same format. |
| 2 | Should the **hero island** move to engine sources? | **Yes.** It's rebuilt from engine sources pixel for pixel first, with no visible change. Its pieces can be swapped for library objects later. |
| 3 | Once the round trip passes, is the **source of truth** the engine source or the extracted SVG? | **The engine source,** for both the Range sprite and the hero island. The generated SVGs are build output. The extracted SVGs stay as test fixtures that pin today's art. |
| 4 | Where is new art **explored**? | **On an editor page on the site**, unlisted, at its own URL. It replaces the design canvas for new art. The repo source stays the master for anything that ships. |
| 5 | Does the **sixth Range class** go live with the engine? | **No** (default kept). The engine ships the outfit, and a follow-up changes the carousel to six classes (copy, a sixth dot, a variant index of 0–5). It also updates the redesign's decision #7 and spec §7.3. |
| 6 | How far does the **object library** go? | **It's open-ended.** New kinds of objects (blocks, water, trees and so on) are added as sources whenever an asset needs them. The first set covers the island, the sprite and the new outfit. |
| 7 | Should the engine **export palette swaps** of existing art, such as the mock's accent alternates (wine, clay, olive)? | **No, not now.** The accent stays one token, and art colors stay fixed. |
| 8 | Is the editor page **public**? | **Live but unlisted.** It's deployed, kept out of the nav and search engines, and loads its code only on its own page. |
| 9 | What can the editor do? | **Lay out scenes and paint pixels.** Both scenes and objects can be edited. |
| 10 | How does editor work get into the repo? | **Download or copy the source.** The owner commits it, or hands it to Claude. The page never writes to GitHub. |
| 11 | How are browser checks run? | **Scripts in the repo, run with the environment's own Playwright.** No `@playwright/test` dependency. They stay out of `npm test`. |
| 12 | What may the verifier do? | **Recommend only.** It reports as a PR comment and never pushes. The implementer makes the fixes. |
| 13 | Are agent skills in scope? | **Yes.** Skills for making pixel art and for verifying a change ship with this change. The pixel-art skill doesn't need the editor: an agent can write the sources and generate the output files on its own. |

## Sequencing

This depended on redesign PR 2, which added `scripts/optimize-pixel-art.mjs`, the extracted sources and `pixel-art.css`. The redesign has since shipped in full, so nothing blocks it. [`spec.md`](spec.md) and a `plan.md` follow this intent in this directory, as for the redesign.

## References

- Redesign pipeline: [redesign `spec.md` §8](../2026-10-redesign/spec.md#8-pixel-art-pipeline)
- Range sprite model in the mock: `project/Isometric.dc.html`, the `BASE`, `CL` and `pal` definitions in its component script
- Disciplines: [`docs/references/profile.md`](../../references/profile.md#disciplines)
- Follow-ups this unblocks: [redesign `plan.md` §8](../2026-10-redesign/plan.md#8-follow-ups-not-in-this-plan)
