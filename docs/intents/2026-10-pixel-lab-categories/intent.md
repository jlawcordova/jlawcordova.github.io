# Intent: The site's art in Pixel Lab categories
Author: J. Law. Cordova (site owner). Status: draft.

Depends on Pixel Lab's object libraries change in the lab repo (`jlawcordova-lab`, `docs/intents/2026-10-object-libraries/`), merged on 2026-10-24 and not released yet. That change's spec gives a category for every object in both of the site's documents (Appendices A and B), and leaves applying them to this repo (its Areas of concern 1).

## Problem

In the owner's words:

> In the site, there are two Pixel Lab files. Have they been already migrated to this categorization and palettes?

They haven't. Pixel Lab can now sort a document's objects into categories, which show as tabs and headings in its Library, and can share objects and colors between documents as object libraries and palette files. The site's two documents are the site's art (204 objects) and the explainer library (101 objects). Neither has a category yet, so in Pixel Lab each one opens as a single long list.

The site can't take categories yet. It pins Pixel Lab v0.6.0, and v0.6.0 refuses an object that has a category. A document with even one category fails its check, and nothing builds.

## Proposed outcome

- The site moves to the first Pixel Lab release that has categories.
- Every object in both documents has the category the lab's spec recommends. That spec was approved when the lab change merged. In Pixel Lab, both documents open with their Library in tabs, and no object is left in Others.
- The explainer library becomes something another document can import as an object library, as the lab's spec intends (its R25). It stays the document where the explainer art is drawn.
- **Visitors see no difference.** Every published SVG and thumbnail is the same as before.

## Affected users and systems

- The owner, editing both documents in Pixel Lab, which must be on the same release.
- Agents editing the art through the `pixellab` MCP tools, the CLI, the pixel-art skills and the `pixel-artist` agent.
- The pinned program and its checks: `npm run art`, `npm test` (including the explainer library's test), `npm run dev`, the e2e checks and the deploy workflow.
- Home page visitors and blog readers, only in that nothing they see may change.

## Constraints

- Use the released program, downloaded from the release and checked against its `SHA256SUMS`, never a build from the lab checkout. The release is the owner's to tag.
- Categories never change the art: the published SVGs and thumbnails stay byte-identical.
- No new npm dependencies.
- The repository is public: no secrets or private data in the docs or the commits.
- The owner reviews the intent and the spec before the next stage starts.
- Out of scope:
  - Changing the art itself, or recategorizing beyond the lab spec's appendices.
  - Importing the explainer library into the site's document, or the other way round.
  - Adding colors to either palette.

## Open questions

- Should the site's repo keep an exported copy of the explainer library next to the document, or export it only when one is needed? The lab's spec leaves this to the site.
