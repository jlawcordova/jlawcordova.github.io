# Intent: The site takes Pixel Lab v0.6.0's output
Author: J. Law. Cordova (site owner). Status: accepted.

Depends on Pixel Lab's Rust engine change in the lab repo (`jlawcordova-lab`, `docs/intents/2026-10-rust-engine/`), released as [v0.6.0](https://github.com/jlawcordova/jlawcordova-lab/releases/tag/v0.6.0). That change's spec, D13 ("What the site's change does"), lists what this one must do.

## Problem

In the owner's words:

> Pixel Lab v0.6.0 is released: the engine and CLI are now one Rust program, documents are format 2 (JSON sources), and compiled SVGs are self-contained. This site depends on that change and needs its own change to take it.

Today the site pins Pixel Lab v0.5.0 as an npm package. Its tests and its blog-thumbnail script import the engine's JavaScript modules, its stylesheet animates the art (the clouds' drift, the Range character's bob and hop, the frame loops), and it commits the SVGs and thumbnails the engine compiles. v0.6.0 drops all of that: there's no JavaScript engine to import, the program only opens format-2 documents, and each SVG plays its own animation. Until the site takes the change, it's stuck on v0.5.0, and the owner's Pixel Lab app and agents can't edit its art with the current release.

## Proposed outcome

The site takes only Pixel Lab's output, as D13 describes. In the owner's list:

1. The art's document is migrated to format 2 with the program's own migration.
2. The clouds' drift and the character's bob become ambient loops, and the hop becomes an action, made with the program's commands. The swap the lab rehearsed for its visual check (PR #34's report) is the one to use.
3. The blog thumbnails are rendered by the program's build, from the thumbnail scenes, instead of the site's own script.
4. The site's stylesheet stops animating the art. What it does for `img.pixel-art` and the HTML wrappers stays.
5. The Range's A button plays the hop through the SVG's documented contract (`data-play`, cleared when the animation ends).
6. The site stops depending on the `pixellab` package. The art tests that the lab's spec moves out of the site (its R20), the Range classes test and the thumbnails script go. The compiled SVGs and thumbnails stop being committed.
7. CI downloads the pinned `pixellab-linux-x64` release, checks it against `SHA256SUMS`, and builds the art before the site. `npm run dev` does the same: it fetches the pinned release into a gitignored folder, verified against `SHA256SUMS` and skipped when it's already there, and runs `pixellab art build --site .` before `astro dev` (owner, 2026-10-21).
8. The first-look dependency check, the pixel-art skills and the `pixel-artist` agent describe JSON sources and the CLI.
9. The explainer library comes too (owner, 2026-10-21). `art/explainer-library.pixellab` is migrated with `pixellab document migrate --document art/explainer-library.pixellab`. Its export runs on the downloaded program (`object list`, `object render --frame --scale --out` and `art preview scenes/<name>`). Its test reads the program's JSON output (`check --json` for validation and canonical form, `object show --json` and `object list --json` for what it used to resolve), so nothing in the site imports `pixellab/*` and the devDependency can go.

After migrating, the thumbnail scenes are put in depth order with `scene sort`, as PR #30's verify-change re-check suggested.

**The visitor sees no difference.** The hero island, the Range and its hop look and move as they do today, under reduced motion too. Screenshots at 1440px and 390px wide show it.

## Affected users and systems

- Home page visitors: the hero island, the Range and its A button.
- Blog readers: the posts' thumbnails, which must stay the same.
- The owner, editing the art in the Pixel Lab app, which must be on v0.6.0 to open the migrated document.
- Agents editing the art, through the `pixellab` MCP tools, the CLI, the skills and the `pixel-artist` agent.
- `npm test`, `npm run build`, `npm run dev`, the e2e checks and the deploy workflow.

## Constraints

- Use the released program, downloaded from the v0.6.0 release and checked against its `SHA256SUMS`, never a build from the lab checkout.
- Install nothing into `/Applications`, and don't run `claude mcp add`.
- The visual result matches today's site: the hero island, the Range and its hop, with and without reduced motion.
- No new npm dependencies (CLAUDE.md). The pinned program is the one new external piece, as the lab's spec intends.
- Post URLs, `/blog/pageN/` and `/atom.xml` never change, and neither do the thumbnails' URLs.
- The repository is public: no secrets or private data in the workflow, the docs or the commits.
- The owner reviews the intent, the spec and the plan before the next stage starts.
- Out of scope: changing the art itself, moving the island's and the Range's entrances into the art (a lab follow-up), and an editing UI for ambient loops and actions.

## Open questions

None. The owner answered both on 2026-10-21: `npm run dev` fetches and builds like CI (outcome 7), and the explainer library is part of this change (outcome 9).
