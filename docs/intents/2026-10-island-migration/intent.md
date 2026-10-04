# Intent: Island migration
Author: J. Law. Cordova (site owner). Status: done, 2026-10-04: built in slice PRs [#65](https://github.com/jlawcordova/jlawcordova.github.io/pull/65) to [#69](https://github.com/jlawcordova/jlawcordova.github.io/pull/69) on `feat/island-migration`, and merged to `main` in [#71](https://github.com/jlawcordova/jlawcordova.github.io/pull/71). Checked on the live site the same day: the island is built from library objects, every fill is a world color with no `c-<hex>` key, the animated groups (`wf`, `ff`, `hf`, `itruck`, `pcloud`) are all there, there's no script, link or text in the SVG, there's no horizontal scroll at 1440px or 390px, and under reduced motion nothing animates and `it2` is hidden.

## Problem

The hero island on the home page is two big legacy pixel maps. `island-base` (193×128, 33 colors) is the island itself, and `island-front` (109×98, 20 colors) is the trees, crane, fence and roof drawn in front of the trucks. Both are exempt from the engine's size and color caps. Its trees, houses, road and water can't be edited, moved or reused as pieces, and its colors are 81 legacy shades, many of them near-duplicates of the world palette. A new piece placed beside it can differ slightly in shade. This was split out of the [pixel-art follow-ups](../2026-10-pixel-art-follow-ups/intent.md) so the island ships as its own change.

## Proposed outcome

- **The island is made of pieces.** The hero island is a scene built from library objects (blocks, water, trees, buildings and its animated pieces), each within the design-language caps. `island-base` and `island-front` are gone.
- **No legacy colors on the island.** Every legacy color is swapped for the approved world color from the editor's palette. Shades may change, and that is fine.
- **A redesign is allowed.** The island does not have to stay pixel-identical. It can be redrawn where library objects make it simpler.

## Affected users and systems

- **Home page visitors:** the hero island may look slightly different.
- **Pixel-art sources and the compiled `hero-island.svg`:** the island scene is rebuilt from objects.
- **Tests and the skill:** the checks that require the island to be pixel-identical are replaced, and the `pixel-art` skill drops its island section.

## Constraints

- **Animation and layout stay.** The classes `pixel-art.css` animates (`wf`, `ff`, `hf`, `itruck`, `pcloud`) stay on the art, and the trucks stay on the same road line. No CSS change is needed.
- **No exceptions to the caps.** Pieces that are too big are split into stacked objects, for example the crane. Nothing gets a size or color exemption.
- **No heavier art.** The island is no larger than today's island SVG. The engine's budgets and rules still hold, including accessibility, public safety, deterministic output and an independent verifier on every PR.
- **One piece at a time.** Slices can be merged into one PR where they are small, such as pieces that change nothing visible. Each PR has before and after previews and screenshots at 1440px and 390px.
- **The old fixture stays** until the final clean-up slice.
- **Out of scope:** the Range platform and character, the palette itself (no new colors), the editor's file opening and draft differences, and palette swaps.

## Open questions

None open. Decided with the owner: the island is redrawn freely, shade changes don't matter, the crane is split, file size is fine, and the legacy colors can be removed wherever the world palette already has the color.
