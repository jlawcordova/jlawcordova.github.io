# Intent: Pixel-art engine follow-ups
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem

The [pixel-art engine change](../2026-10-pixel-art-engine/intent.md) is built to be safe: the art on the home page stays pixel-identical while its source moves into the engine. To keep that promise, its [spec](../2026-10-pixel-art-engine/spec.md) left several things for later. Once the engine and the editor ship, these gaps remain:

- **Two palettes side by side.** New art uses the 32 world colors, but the hero island and the five Range outfits keep their 81 legacy colors, many of them near-duplicates. A new piece placed next to old art can differ slightly in shade. The legacy tier, and its exemption from the design-language caps, stays in the engine for as long as any art uses it (engine spec A8, Q3).
- **The hero island is two big maps.** It came into the engine as two legacy pixel maps, both exempt from the size and color caps. `island-base` (193×128, 33 colors) is the island itself. `island-front` (109×98, 20 colors) is the trees, crane, fence and roof drawn in front of the trucks. Its trees, houses, road and water can't be edited, moved or reused as pieces (engine spec A2).
- **The editor can't open a file.** It only loads what's deployed on the site, plus drafts saved in the same browser. A file exported on one device and not yet committed can't be reopened anywhere else. Opening a `.mjs` file safely means reading it as data, never running it (engine spec Q2).
- **Out-of-date drafts are all or nothing.** When a draft falls behind the site, the only choices are to keep it or replace it, without seeing what differs (engine spec A6).
- **No palette swaps.** The engine can't export a palette-swapped version of existing art, such as the mock's accent alternates (wine, clay, olive). It was set aside as "not now" (engine intent decision #7).

## Proposed outcome

- **One palette.** Every piece of art uses only world and outfit colors. The legacy tier is empty and removed, along with its exemptions. The island and the outfits still read as the same world, and each change of shade is deliberate and reviewed.
- **The island is made of pieces.** It's a scene built from library objects (blocks, water, trees, buildings and its animated pieces), each within the design-language caps. `island-base` and `island-front` are gone.
- **Files open in the editor.** You can open a source file from your device. The editor reads it as data and accepts only the canonical format. It never runs the file.
- **Drafts show what changed.** When a draft has fallen behind, the editor shows which rows, items or settings differ before you choose.
- **A decision on palette swaps:** either a small, defined palette-swap feature, or a recorded "no".

## Affected users and systems

- **Home page visitors:** the hero island and the Range outfits may change slightly in shade.
- **The owner:** opening files and seeing draft differences in the editor.
- **Pixel-art sources, palette and engine:** legacy colors and exemptions removed, and the island scene rebuilt from objects.
- **The editor page:** file opening and the draft diff.
- **Skills:** the `pixel-art` skill drops its legacy-color rules, and `verify-change` checks each PR as before.

## Constraints

- **Starts after the engine change,** which is now done. All seven of its slices are merged (PRs #29 to #36), and its skills and verification levels are in use.
- **The engine's rules still hold:**
  - the design language (32×16 tile, palette tiers, caps, light direction);
  - no new dependencies;
  - deterministic output;
  - budgets: each SVG ≤ 100 KB raw and ≤ 25 KB gzip, and the home page within its budget;
  - accessibility;
  - public safety;
  - an independent verifier on every PR.
- **Visible changes go one piece at a time.** Each color migration or island split is its own reviewed step, with before and after previews and screenshots at 1440px and 390px. No big-bang change.
- **The island may be redrawn** where library objects make it simpler, but it must still read as the same place.
- **No heavier art.** The island built from objects is no larger than today's island SVG.
- **Opening a file never runs code.** No `import()`, `eval` or `Function` on file contents. A file that isn't in the canonical format is rejected with a clear error.
- **Out of scope:** the sixth Range class (its own [intent](../2026-10-sixth-range-class/intent.md)), painting tuned for phones (engine spec A4), saving from the editor to GitHub, and raster favicons or the OG image.

## Open questions

Decided with the owner: the sixth Range class ships on its own, ahead of this work; the migration starts with the island; the island may be redrawn where library objects make it simpler.

1. **The legacy tier:** delete it entirely once it's empty, or keep it as an empty tier so future imported art has somewhere to land?
2. **Draft differences:** show them only, or also allow merging them row by row?
3. **Palette swaps:** still wanted? If so, swap the whole world palette, or only the accent colors?
4. **Outfit migration:** after the island, do the five outfits go one at a time, and which first?
