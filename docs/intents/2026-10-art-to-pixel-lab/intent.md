# Intent: the art moves to Pixel Lab
Author: J. Law Cordova (owner) · 2026-10-19 · Status: proposed (the owner asked for PRs that complete the change up to the build, so this intent, its spec, its plan and the code are reviewed and accepted together by merging)

Depends on the Pixel Lab change of the same date in the lab repo (`jlawcordova-lab`, `docs/intents/2026-10-pixellab-document/intent.md`): Pixel Lab becomes the home of the pixel-art engine and compiler, and the art lives in a `.pixellab` document.

## Problem

In the owner's words:

> Should the npm in the original site make sense to be moved into this lab and MCP instead? So that workspace and build live here. The site is dependent on the lab, but the lab can be stand-alone and usable in other sites if needed.

Today this repo holds the pixel-art engine, the compiler behind `npm run art`, the PNG previews, the art's sources and a browser editor for them (the web lab at `/lab/pixel-art/`). Pixel Lab, the owner's Mac editor, imports the engine from this checkout at run time and writes approved changes straight into its working tree, so it can't work without this checkout, and this repo carries an editor the owner no longer uses day to day.

## Proposed outcome

- **The art is a Pixel Lab document.** The sources under `src/assets/pixel-art/source/` become a `.pixellab` document kept in this repo, next to the SVGs it compiles to, so the art's source and its output stay versioned together and a PR shows both.
- **The engine and the compiler leave.** Validation, compiling, the lossless and budget checks, previews, size reports and starters are Pixel Lab's. The site depends on Pixel Lab for them; nothing in this repo reimplements them.
- **The web lab retires.** The `/lab/pixel-art/` page, its components and its stylesheet go. The entrance lab at `/lab/island-entrance/`, which replays the island's build-up from the compiled SVG, stays.
- **The site keeps working exactly as it does.** The committed SVGs are byte-identical, the home page and the achievements pages don't change, and deploying needs nothing new.
- **The art's rules still hold and are still checked.** The tests that pin the island, the Range, the icons and the motion keep running; the committed SVGs are still checked against their sources.
- **Skills and docs follow.** The `pixel-art`, `design-scene`, `pixel-art-motion` and `achievement-icon` skills, the `pixel-artist` agent, `CLAUDE.md` and the README describe the document and Pixel Lab's commands instead of `npm run art` and the web lab.

## Affected users and systems

- Agents working on the art in this repo, through the skills and the pixel-artist agent.
- The owner, publishing from Pixel Lab into this checkout.
- `npm test` and the deploy workflow.
- The home page, the achievements pages and the entrance lab, which must not change.

## Constraints

- The web lab is retired, not kept (owner, 2026-10-19).
- The site may depend on Pixel Lab (owner, 2026-10-19); no other new dependency.
- The committed SVGs don't change by a byte in this change.
- Post URLs, `/blog/pageN/` and `/atom.xml` never change; the unlisted page that goes away was never linked.
- Nothing secret or personal in the repo; the art is public already.
- Out of scope: any change to the art itself, to the island's entrance, or to how the home page inlines the SVGs.

## Open questions

- Which of the art tests belong to the engine (and go with it to Pixel Lab) and which to this site's art (and stay)? For the spec.
