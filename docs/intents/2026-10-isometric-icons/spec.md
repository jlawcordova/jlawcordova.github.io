# Spec: Accomplishment icons in the island and Range style (from intent.md 2026-10-05)
Status: approved by the owner, 2026-10-05.

Implements [`intent.md`](intent.md). Where they disagree, the intent wins and this spec gets fixed. The change is art only. Each icon object is redrawn in place, and the code, pages, styles and the icon list stay as they are.

## Requirements

Each requirement traces to the [intent](intent.md)'s Problem, Proposed outcome or Constraints.

- **R1. Every icon is redrawn.** All 16 choosable icons in `ICONS` (`src/lib/achievement-icons.mjs`) are redrawn, not adjusted, and so are the fallback `star` and the `lock` mark (C2). That makes 18 `icon-<id>` objects. *(Outcome: every icon redrawn)*
- **R2. Isometric view.** Each icon is drawn on the same 2:1 grid as the island and the Range (screen x = u − v, y = (u + v)/2 − z), seen from the same angle, so its top and two side faces show. A thin or flat object (a key, a book, a speech bubble) is turned onto that grid too, so it reads as lying or standing in the world, not facing the viewer. *(Outcome: isometric view)*
- **R3. No outlines.** No icon uses `ink`, as on the island and the Range. Faces are set apart by shade only, following the "Island and Range look" rules in the `pixel-art` skill: top lightest, left face mid, right face darkest; where an outline pixel goes, it takes the darker shade of the face it borders. *(Outcome: no outlines)*
- **R4. Richer detail.** Each icon's main material shows at least three shades of its ramp across its faces, plus texture or a highlight where the object has one (a glint on metal, grain on wood, a page edge on the book). Today's icons mostly use one or two shades per material. *(Outcome: richer detail)*
- **R5. No platform.** An icon is a single object that stands on its own: no tile, block, grass or ground shadow under it. *(Outcome: no platform)*
- **R6. Same set, same meanings.** The ids, the meanings, `ICONS`, `SHEET_ORDER`, `FALLBACK_ICON`, `LOCK_ICON` and `/achievement-icons.json` don't change. Each icon still pictures the same thing (a rocket stays a rocket), so existing records keep their icon and the choices Claude suggests don't change. *(Constraint: same icons, same meanings)*
- **R7. Recognisable at a glance.** Each icon reads as its kind of work at 48px (its size on the page, 3×) and at 16px (1×), on the done row's `--color-surface` and dimmed in a locked row. The owner's review of the previews decides (C3). *(Outcome: recognisable)*
- **R8. The fallback and locked states still work.** An unknown or missing icon shows the new `star`. A locked row shows its icon dimmed (`opacity: 0.4; filter: grayscale(1)`, unchanged) with the new `lock` over its upper-right corner, and both the dimmed icon and the lock stay legible there. *(Outcome: fallback and locked states)*
- **R9. The art rules hold.** World palette only (no outfit or legacy colors), at most 12 colors per icon (aim for 6–8), light from the island's side, a 16×16 map with the anchor at `[8, 15]`, compiled by `npm run art` with every file `lossless` and none `OVER BUDGET`. No engine change and no new color. *(Constraint: art rules)*
- **R10. Weight.** The compiled `achievement-icons.svg` stays within its 6 KB gzip budget (gamified accomplishments spec C2), which keeps the home page within the redesign spec's budgets. Today it is 15.7 KB raw and 3.7 KB gzip. *(Constraint: home page weight budget)*
- **R11. Decorative and public-safe.** The icons stay `aria-hidden` inline SVG with no text, and carry no names, logos, brands, lettering or likenesses. The layout is untouched, so it stays readable at 390px with no horizontal scroll. *(Constraint: decorative, public-safe)*
- **R12. The skills match the new look.** The `achievement-icon` skill, the `pixel-art` skill and the `pixel-artist` agent describe icons in this look, so the owner's next icon is drawn the same way without re-deriving it. *(Affected systems: the skill for creating icons)*
- **R13. Only the icons.** The island, the Range, the accomplishment rows, their CSS and components, the icon list and the engine are out of scope. *(Constraint: out of scope)*

## Design

### What is there today

- **18 objects**, `src/assets/pixel-art/source/objects/icon-<id>.mjs`: 16×16 sprites, one layer, anchor `[8, 15]`, world colors, front-on, outlined in `ink`. `icon-lock` is a 7×8 padlock in the cell's upper-right corner (columns 9–15, rows 0–7).
- **The sheet,** `scenes/achievement-icons.mjs`, places them in `SHEET_ORDER` on a 16px grid, each in a `data-icon` group, and compiles to `achievement-icons.svg`. `AchievementIcons.astro` inlines it once per page, and each row crops its cell at 48×48 with `<use>`.
- **A locked row** draws its icon dimmed and grayscale, and a second 48×48 crop of the `lock` cell offset `-6px` up and right (`src/styles/accomplishments.css`).

None of that plumbing changes. Only the 18 maps (and their `keys`) are rewritten.

### Canvas and view

- **The cell stays 16×16, shown at 48px.** That is 3×, the same pixel size as the Range on the home page (103 px drawn at 309 px), so an icon's pixels match the character's beside it in the world. `CELL`, the sheet's `viewBox` and the rows' crop are unchanged. The owner decided to keep 16×16 (C1).
- **Footprint.** An isometric object on 16 px is small: a cube that fills the cell is 16 wide, 8 deep on top and about 8 tall on its sides. Each icon uses as much of the 16×16 as its shape allows, with its lowest point on row 15 near column 8 so the anchor still sits under it, and at least one transparent column on each side so it doesn't touch its neighbour in the sheet.
- **Light and faces.** As on the island: the top is the lit shade (shade 1 or 2 of the material's ramp), the left face the mid shade, the right face the dark shade. A face holds 2–3 shades at most. Texture is the next shade lighter on a top or darker on a side.
- **Silhouette without an outline.** The outline pixels of today's icons become the darker shade of the face they border. Where a lit edge is close to the row's background, it gets a lighter rim (the skill's grass-rim rule, applied to `--color-surface`). The silhouette must still read when the locked filter turns it gray at 40% opacity.

### The icons

Each keeps its subject from the [gamified accomplishments spec D5](../2026-10-gamified-accomplishments/spec.md#d5-the-icons-this-repo). The `pixel-artist` agent picks the exact pose in previews; this table is the starting brief.

| Id | Subject | Isometric treatment |
| --- | --- | --- |
| `star` | gold star (fallback) | a thick gold star, lit top and two shaded edge faces |
| `lock` | padlock (locked mark) | a gold box body built like the clouds, with a squared steel shackle that has its own thickness, in the cell's upper-right corner (C2) |
| `sprout` | a sprout | two leaves on a stem in a small clump of soil, no ground tile |
| `hammer` | a hammer | wood handle and a steel head box, lying at an angle |
| `rocket` | a rocket | upright body with fins and a flame, its round body shaded left to right |
| `bug` | a beetle | a domed shell seen from above-left, with legs |
| `shield` | a shield | standing on the grid's left-face plane, rim and boss shaded, as the knight's |
| `key` | a key | lying flat on the grid, bow and bit with a thin edge face |
| `wrench` | a wrench | lying flat on the grid, with a thin edge face |
| `book` | a closed book | a box: cover on top, pages on one side, spine on the other |
| `magnifier` | a magnifying glass | lens ring and handle at an angle, a glint on the glass |
| `flask` | a lab flask | glass body with liquid, the liquid's surface as a lit ellipse |
| `apple` | an apple | round fruit with a leaf, shaded as a sphere lit from the upper left |
| `heart` | a heart | a thick heart block with a lit top edge |
| `signpost` | a signpost | a post with boards pointing along the grid's two axes |
| `chest` | a chest | a box with a lid, bands and a clasp, the most "cube" of the set |
| `trophy` | a cup trophy | a cup with handles on a stepped base |
| `speech` | a speech bubble | a thick bubble block with a tail, standing on the left-face plane |

### Process

- The icons are drawn by the `pixel-artist` agent, following the `pixel-art` and `achievement-icon` skills, as the Range was.
- **A sample first.** The plan has the agent draw a small sample (for example `chest`, `rocket` and `key`: a box, a round upright and a flat object) and pauses for the owner's review before drawing the rest, so the look is settled once (C3).
- Each icon is checked with `npm run art -- --check icon-<id>` and previewed with `--preview icon-<id>`. The review image is the whole `achievement-icons` sheet at 1× and 4×, before and after, plus a 3× crop on the row background in the done and locked states.

### Skills and agent (R12)

- **`.claude/skills/achievement-icon/SKILL.md`,** "What an icon is": replace "a flat 16×16 sprite, front-on, not isometric" and "outline it in `ink`" with the new rules (isometric on the 2:1 grid, no `ink`, no platform, at least three shades per material, the footprint and rim rules above), and describe `lock` without its "solid ink outline". It points to "Island and Range look" in the `pixel-art` skill for shading.
- **`.claude/skills/pixel-art/SKILL.md`:** "Island and Range look" drops "Achievement icons keep their own outlined style" and says the look covers the icons too. The agent may add a short "Isometric icons" part, like "Isometric characters", from what it learns in the first review.
- **`.claude/agents/pixel-artist.md`:** the no-`ink` rule covers the achievement icons, and "Only the achievement icons keep their outlines" goes. Its hand-off for icons is the review images listed in Process.
- **`docs/intents/2026-10-gamified-accomplishments/spec.md` D5:** a one-line dated note that the icons are now isometric and unoutlined, pointing here. D5's "flat (front-on) … not isometric" is not rewritten.

### Files touched

- **Art:** the 18 `objects/icon-*.mjs`. `achievement-icons.svg` is regenerated by `npm run art`, never hand-edited. The sheet scene is unchanged unless `npm test` asks for it to be re-saved in canonical form.
- **Docs and agents:** the two skills, the agent and the D5 note above.
- **Tests:** `scripts/achievement-icons.test.mjs` gains one check (below).
- **Not touched:** `src/lib/achievement-icons.mjs`, `AchievementIcons.astro`, `AccomplishmentRow.astro`, `accomplishments.css`, the engine, the palette, the island and the Range.

### Checks

- **Kept as they are:** every test in `scripts/achievement-icons.test.mjs` (ids, the 16 published ids, one object per sheet entry, 16×16 world-color sprites within 12 colors, the sheet's order, the 6 KB gzip budget, the fallback, the catalog, the skill's table), and the icon crop and painted-pixel checks in `scripts/e2e/accomplishments.e2e.mjs`.
- **Added:** a test that no `icon-*` object maps a key to `ink` (R3).
- **Not testable, reviewed by the owner:** isometric view, detail, no platform and recognisability (R2, R4, R5, R7), through the previews.

### Proof for the PR

- Before and after previews of the `achievement-icons` sheet at 1× and 4×.
- Screenshots of the home section and `/accomplishments/` built with the rich fixture, at 1440px and 390px, with no horizontal scroll, showing done rows, a locked row and the fallback star.
- The tails of `npm run art` (every file `lossless`, none `OVER BUDGET`), `npm test` (`# fail 0`), `npm run build` (0 errors, 0 warnings, 0 hints, `[build] Complete!`) and `npm run e2e` (`# fail 0`), plus the sheet's gzip size against its 6 KB budget.

## Areas of concern

- **C1. Detail versus a 16×16 cell. Resolved: keep 16×16.** An isometric object has less room than a front-on one, because its top takes part of the height. The owner decided to keep the cell at 16×16, shown at 3×, which matches the Range's pixel size and changes no code. A 24×24 cell at 2× was the alternative: more pixels, but finer than the Range's beside it, and a change to `CELL`, the sheet's viewBox and the size test. Detail is fitted to 16×16, and the sample review checks that each icon still reads.
- **C2. The lock and the star (the intent's open question). Resolved: both are redrawn.** The owner decided both get the new look. The star is shown as a row's icon, so a flat outlined star next to isometric ones would stand out as the old style. The lock sits over a dimmed gray icon, so its gold and steel shades contrast without an outline, and an outlined lock would be the one `ink` object left. The lock keeps its place (upper-right of its cell), so the CSS offset still works. *(Update, 2026-10-05, from the owner's round 1 review: the lock grew to about 10×12, columns 6–15 and rows 0–11, so its box and shackle read as solid blocks. It covers about the upper-right third of the icon under it, which the owner accepted.)*
- **C3. Art quality is subjective.** An icon can meet every rule and still not read at 48px. As for the Range and the first icons (gamified spec C6), the previews decide, and the plan pauses after the sample icons for the owner's review.
- **C4. Weight.** Three shades and texture cost bytes: each extra run is about 15 B raw. The sheet has 2.3 KB gzip of headroom under its 6 KB budget, which should hold for 18 small icons. If it doesn't, the fallback in gamified spec C2 (inline only the icons a page uses) is a code change, so the plan stops and the owner decides before taking it.
- **C5. The intent said 15 icons, the set has 16. Resolved: the intent is fixed.** `ICONS` has 16 choices (plus `star` and `lock`, 18 objects), and a test pins the 16 published ids. The owner confirmed the 15 was a miscount, and the intent now says 16, in its own commit.

## Open questions

- **From the intent: should the locked padlock and the fallback star get the same treatment?** Answered by the owner: yes, both are redrawn (R1, C2).
- **Q1. Is a 16×16 cell enough?** Answered by the owner: keep 16×16 (C1).

No open questions remain. C3 and C4 are for the plan and the sample review.
