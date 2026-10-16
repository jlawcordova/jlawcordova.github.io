# Spec: Retire legacy pixel art (from intent.md 2026-10-05)
Status: draft. Written on 2026-10-16, at the owner's request, in the same PR as the intent ([#99](https://github.com/jlawcordova/jlawcordova.github.io/pull/99)) and the plan, so the owner accepts all three when they merge it.

Implements [`intent.md`](intent.md). Where they disagree, the intent wins and this spec gets fixed. The change takes the legacy tier out of the engine, the palette, the tools, the lab, the tests and the docs. No art source changes, and no compiled SVG changes.

## Requirements

Each requirement traces to the [intent](intent.md)'s Problem, Proposed outcome or Constraints.

- **R1. Nothing uses legacy before the change starts.** No object sets `legacy: true` and no source names a `c-<hex>` color. The isometric Range ([#103](https://github.com/jlawcordova/jlawcordova.github.io/pull/103)) removed the last one, the Range's platform. *(Constraint: starts after the isometric Range lands)*
- **R2. The palette has two tiers.** `palette.mjs` exports `world` and `outfit` only. The 81 frozen `c-<hex>` colors are gone, and a palette with any other tier, `legacy` included, is a validation error (`unknown tier 'legacy'`). *(Outcome: one palette tier system, no frozen legacy colors)*
- **R3. Objects have no legacy flag.** `legacy` is no longer an object property, so `legacy: true` is reported as `unknown property 'legacy'`. A resolved object has no `legacy` field, and the serializer never writes one. *(Outcome: no import path, no cap exemptions)*
- **R4. The caps and tiers apply to every object.** Every sprite and block is checked for the 64×64 size cap, the 12-color cap, the character figure cap and the outfit-tier rule, with no exemption. `--check` and the lab always show the cap (`… colors (of 12)`), never `legacy, no cap`. *(Outcome: no cap exemptions)*
- **R5. No import path.** `scripts/import-pixel-art.mjs` is deleted, along with its README row. *(Outcome: no import path for legacy art)*
- **R6. The starter extends without re-keying.** `--new object <name> --extends <base>` and the lab's New dialog write `{ kind: 'sprite', extends: <base>, keys: {}, rows: {} }`. A valid base can only paint colors its kind allows, so there is nothing to re-key, and `nearestColor` goes with the re-keying. *(Outcome: one way to make art)*
- **R7. The lab has no legacy parts.** The Library has no Legacy group, the Palette panel has no collapsed legacy swatches and no `legacy, no cap` meter, and the Object panel shows no `, legacy` kind and no 512-pixel size limit. `lab.css` loses the legacy-only rule. *(Affected systems: the lab)*
- **R8. The tests describe one way.** Tests that exercised legacy behavior (the exemptions, the legacy-color rejections, the legacy tier's shape, the legacy CLI fixture) are rewritten for the rule that replaces them or removed with the behavior. Per-scene "not legacy" checks give way to one repo-wide test that no source uses legacy. No other test changes. *(Affected systems: the tests)*
- **R9. The docs describe one way.** The README, the `pixel-art` skill, the `achievement-icon` skill and the `pixel-artist` agent no longer mention a legacy tier, legacy colors, `legacy: true` or the import script, except where a sentence is about history. *(Outcome: the skill and agent describe one way)*
- **R10. Nothing visible changes.** `npm run art` rewrites no compiled SVG: every file reports `lossless`, and `git diff` shows no change under `src/assets/pixel-art/*.svg`. The home page, `/accomplishments/` and the footer render the same. *(Constraint: nothing visible changes)*
- **R11. History stays.** Earlier intents, specs and plans under `docs/intents/` that mention legacy are not edited. *(Constraint: old documents stay as history)*
- **R12. The usual rules hold.** No new dependency, the lab keeps its focus ring and 44px targets, and nothing private is committed. *(Constraint: the usual rules)*

## Design

### What is there today

- **Palette** (`src/assets/pixel-art/source/palette.mjs`): three tiers, `world` (32), `outfit` (16) and `legacy` (81 `c-<hex>` colors, no cap). Its header comment describes all three.
- **Engine** (`src/lib/pixel-art/engine.mjs`): `TIERS` lists `legacy`. `validatePalette` requires it and skips its cap. `OBJECT_PROPS` allows `legacy`, which must be `true` if set. `validateResolved` skips every color and size check for a legacy object. Both validators reject a legacy color with "is a legacy color; only imported art may use it". `resolve` and `resolveBlock` return `legacy`, and `describeObject` prints `legacy, no cap` for it.
- **Serializer** (`serialize.mjs`) writes `legacy: true` second in an object's key order.
- **Starter** (`starter.mjs`): `starterExtends` re-keys any inherited color outside the new object's tiers to the nearest allowed one with `nearestColor`. Only a legacy base could ever trigger it.
- **Import** (`scripts/import-pixel-art.mjs`): turns an extracted SVG into legacy sources. Nothing calls it.
- **Optimizer** (`scripts/optimize-pixel-art.mjs`): a comment in `sceneSizes` names legacy as the losing tier when a hex has two names.
- **Lab** (`src/components/lab/`, `src/styles/lab.css`): a Legacy Library group, a legacy check in `usableObject`, legacy facts and a 512-pixel field cap in the Object panel, a collapsed legacy palette group and an uncapped meter in the Palette panel, and `.lab-palette__legacy`.

### The change

- **Palette.** Delete the `legacy` block, and rewrite the header comment for two tiers. Drop "uses exact legacy values wherever the island has a good one", which is provenance, not a rule.
- **Engine.** `TIERS = ['world', 'outfit']`. `validatePalette` says "must export an object with world and outfit", and its cap check loses the `legacy` exception. `OBJECT_PROPS` drops `legacy`, along with its "either true or left out" check. `validateResolved` runs its tier, size, figure and color checks for every sprite, and both validators lose the legacy-color line (a `c-<hex>` name is now just "not in the palette"). `Resolved` loses `legacy`. `describeObject` always prints `(of 12)`. The character-cap comment stops referring to "the legacy outfits' props": the shared canvas is wider than the figure so a held prop fits.
- **Serializer.** Drop the `legacy: true` line.
- **Starter.** `starterExtends(base)` returns `{ kind: 'sprite', extends: base, keys: {}, rows: {} }`. `nearestColor` is deleted. The two callers (`optimize-pixel-art.mjs`, `lab/dialogs.ts`) pass only the base.
- **Import.** Delete `scripts/import-pixel-art.mjs`.
- **Optimizer.** The comment says the first tier's name (world before outfit) wins.
- **Lab.** The Library has three groups (Blocks, Objects, Characters). `usableObject` drops its `legacy` line, so an old draft that still carries the flag loads and Export lists `unknown property 'legacy'`. The Object panel drops the legacy kind, size and color wording and always caps the fields at `CAPS.size`. The anchor edit keeps the canonical order `kind, extends, anchor, keys…`. The Palette panel's flags are `character` only, the World and Outfit groups are the only ones, `group()` loses its `collapsed` branch, `whyNot` loses its legacy line, and the meter always reads `Colors used: N of 12` with the warning from 9. `lab.css` drops `.lab-palette__legacy summary`.

### Tests

- **Rewritten.** In `pixel-art-engine.test.mjs`, the test palette loses its `legacy` tier. The legacy-color rejections for sprites, blocks and sides become "`c-6f8a55` is not in the palette". The two character-cap tests use non-legacy bases (the 24×33 case reports both the base and the outfit). The tier-cap and unique-name tests use two tiers, and a third tier is reported as unknown. The serializer and round-trip tests drop `legacy`. The starter test expects `keys: {}`. In `pixel-art-cli.test.mjs`, the `legacy-rock` fixture becomes an ordinary world-color object (`small-stone`), its `--check` line ends `(of 12)`, the preview-refusal test breaks it with a `c-<hex>` color ("is not in the palette"), and the `--extends character` test expects `keys: {}`.
- **Removed with the behavior.** "R27: legacy objects are exempt from the caps and the tiers", "R26: an outfit inherits the colors it uses, so a legacy base must be re-keyed", "R26: the legacy tier is the 81 extracted colors" and "R31: the world ramps come from the island: each is mostly exact legacy values" (see C2). The `.legacy === false` assertions in the engine, island, Range and icon tests, `range-art.test.mjs`'s "R5: nothing range-sprite places is legacy", and `range-classes.test.mjs`'s "Range characters off legacy colors" block go too. The new test below covers them all at once.
- **Added.** In `pixel-art-engine.test.mjs`: "the committed sources have no legacy tier, flag or color" (the palette's keys are exactly `world` and `outfit`, no object source has a `legacy` key, and no key, face or side names a `c-<hex>` color), and "an object with `legacy: true` is rejected as an unknown property".
- **Browser checks.** `scripts/e2e/editor.e2e.mjs`'s swatch-name helper drops `palette.legacy`. Its meter checks already expect `of 12`.

### Docs

- **README:** the import script's row loses the script (the preview script stays), and the Palette paragraph describes two tiers.
- **`pixel-art` skill:** the tier list loses its legacy bullet, the size-cap paragraph loses "Imported legacy objects are exempt", the extends note drops its re-keying clause, the hero island and Range lines stop saying they have no legacy art, the rules list loses the legacy and import lines, and the checklist line becomes "World colors only (outfit colors only in an outfit); within the caps; light from the island's side."
- **`achievement-icon` skill** and **`pixel-artist` agent:** drop "no legacy colors" and "never set `legacy: true`" (the engine now makes both impossible). The agent's test table drops the legacy checks this change removes.

### Files touched

Engine and tools: `palette.mjs`, `engine.mjs`, `serialize.mjs`, `starter.mjs`, `optimize-pixel-art.mjs`, `import-pixel-art.mjs` (deleted). Lab: `Library.astro`, `lab.ts`, `object-mode.ts`, `palette-panel.ts`, `dialogs.ts`, `lab.css`. Tests: `pixel-art-engine.test.mjs`, `pixel-art-cli.test.mjs`, `pixel-art-island.test.mjs`, `range-art.test.mjs`, `range-classes.test.mjs`, `achievement-icons.test.mjs`, `e2e/editor.e2e.mjs`. Docs: `README.md`, the two skills and the agent. No art source and no compiled SVG.

### Proof for the PR

- `npm run art` with every file `lossless` and none `OVER BUDGET`, and `git diff --stat` showing no `*.svg`.
- `npm test` (`# fail 0`), `npm run build` (0 errors, 0 warnings, 0 hints, `[build] Complete!`) and `npm run e2e` (`# fail 0`).
- `git grep -i legacy` outside `docs/intents/` returning nothing but history notes, if any.
- Screenshots of the lab's Palette panel and Library at 1440px and 390px, with no horizontal scroll. Its look changes only by losing legacy parts.

## Areas of concern

- **C1. Owner gates in one PR.** The playbook has the owner accept the intent, then approve the spec, then the plan, each by a merge. Here the owner asked for the whole lifecycle up to build on PR #99, so the intent, spec, plan and code land together and stay drafts until the owner merges. If the owner disagrees with the spec or plan, the code follows it in the same PR. The branch keeps its name, `docs/intent-retire-legacy`, because renaming it would close #99.
- **C2. The palette's provenance test goes.** "R31: the world ramps come from the island" compared the world ramps against the 81 legacy values. With those gone it can't run. Keeping a frozen copy in the test would keep a legacy tier in another place, against the intent. The ramps are committed and their own tests (four shades, light to dark, distinct values) stay, and the provenance is in git history and the [pixel-art engine spec](../2026-10-pixel-art-engine/spec.md).
- **C3. An old lab draft with `legacy: true`.** A draft the browser stored before this change would now show `unknown property 'legacy'` in Export instead of loading as legacy art. No committed object is legacy, so only a hand-made draft could hit it, and the message says what to remove.
- **C4. An independent verifier on every PR.** The intent asks for one. The owner's request stops at build, so the verifier (`verify-change` on #99, from a fresh session) runs after the PR is marked ready and before the owner merges.

## Open questions

The intent has none. None are new.
