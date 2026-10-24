# Cost model

Part of the `pixel-art` skill ([SKILL.md](SKILL.md)). Read it before you add texture, frames or placements to the hero island or the Range, or when `art sizes` runs over a budget.

- **A run costs about 14.7 B.** In the optimized SVG, each horizontal run of one color is one rect (`M x y h w v h h-w z`). Rows with the same x and width merge into one taller rect. So vertical strokes, posts and streaks are cheap; 2:1 and diagonal lines cost a run per row.
- **An isolated texture pixel on a base costs about 30 B raw and 6 B gzip.** That's its own rect plus the base run it splits.
- **Loop frames are full copies.** Their texture doesn't split the base, but it's paid once per frame per placement.
- **Multiply by placements:**
  - cubes: 132 (80 `block`, 24 `block-road`, 12 `block-right`, 6 `block-river`, 5 `block-left`, and the mining and rail cubes), hidden faces included;
  - `path`: 15, `track`: 9, `track-mine`: 3, `level-crossing`: 1;
  - `river`: 6 tiles × 5 frames;
  - `pine` and `tree-small`: 8 each;
  - `island-shadow`: 24;
  - `truck-open`: 4 placements plus its poses, `ore`: 22 and `stone`: 11;
  - each `enter` group compiles on its own, so runs don't merge across groups;
  - every pose of a moving item is drawn once, in its own group.
- **New detail gzips at about 4.2:1.** The land sample measured +15.3 KB raw and +3.7 KB gzip.
- **Measure in the first iteration,** with `npm run pixellab -- art sizes hero-island` (or `range-sprite`). It prints raw and gzip bytes per object and per color, against `HEAD`. Report your objects' bytes against the plan's estimate. If they run far over it, trim: fewer, deliberate clusters; horizontal adjacency; texture kept out of loop frames.
