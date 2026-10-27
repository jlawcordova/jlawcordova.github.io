# CLAUDE.md

J. Law. Cordova's personal site and blog: Astro 7, TypeScript and plain CSS, deployed to GitHub Pages on every merge to `main`. `README.md` has the project layout and deploy details.

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:4321; builds the art first)
- Build: `npm run build` (runs `npm run art` and `astro check`, then builds to `dist/`)
- Test: `npm test` (builds the art first, then Node built-ins; no network once Pixel Lab's program is in `.pixellab-bin/`)
- Browser checks: `npm run e2e` (serves the built `dist/` and runs `scripts/e2e/` with the environment's Playwright; run `npm run build` first). One suite: `npm run e2e -- scripts/e2e/accomplishments.e2e.mjs`. That suite builds the four accomplishments fixtures into `.e2e-output/accomplishments/` itself and restores `src/data/accomplishments.json` afterwards, so don't run `npm test` alongside it.
- Pixel art: `npm run art` (Pixel Lab's `pixellab art build`: compiles the scenes in the document `src/assets/pixel-art/jlawcordova.pixellab/` to `src/assets/pixel-art/*.svg`, and the thumbnail scenes to PNGs). The engine, compiler and CLI are one program, Pixel Lab's `pixellab` release, pinned with its SHA-256 in `scripts/pixellab.mjs`, which downloads it into the git-ignored `.pixellab-bin/` on first use and checks it against the release's `SHA256SUMS`; it isn't an npm package. `npm run pixellab -- <group> <verb> …` runs any command on this checkout (`--site .` is in the script, so it works in a worktree): `check <name>` validates one object or scene, `art preview <name> --scale N --out <png>` writes a review PNG, `art sizes <scene>` shows where a scene's bytes go against `HEAD`, `object new <name>` and `scene new <name>` write starter sources, `scene place`, `object paint`, … edit, and `scene ambient`, `scene action`, `object ambient`, `object action` and `object state …` set the loops, actions and states the SVGs play by themselves. The `pixel-art` skill has the details. To draw or detail art, use the `pixel-art` skill and its reference files in the main session; the `pixel-artist` agent (`.claude/agents/pixel-artist.md`) is only for a fresh-eyes critique of art, or art apart from the session's own work. Accomplishment icons (`icon-<id>` objects and the `achievement-icons` sheet) are added with the `achievement-icon` skill.
- Pixel Lab (the owner's Mac editor for the art, from `~/Projects/jlawcordova-lab`) opens the document and publishes it (v0.9.0 or later, since the document has entrances); the web lab at `/lab/pixel-art/` is gone. Agents use its `pixellab` MCP tools (`mcp__pixellab__*`: `scene_render` and `object_render` return the PNG, `scene_place`, `object_paint`, `check`, …) or the CLI above. In the owner's checkout, change art over the MCP: since Pixel Lab v0.7.0 each edit applies to the document as it's made (no proposals), the owner sees it in the app and its Versions panel, and `doc_undo` or `history_undo` takes back yours. Report every change, and never commit, push or publish unless told. Don't write sources there by hand. Run `npm run art` and the tests straight after. Every object has a category (Pixel Lab's Library shows them as tabs): set one when you make an object (`object_category`), in an existing category where one fits; a test fails without. In a worktree, use the CLI (the MCP server runs on the owner's checkout). The `pixel-art` skill's Pixel Lab section has the details. To design a scene or the island, use the `design-scene` skill.
- Blog thumbnails: each post's `thumb-<key>` scene declares `"image": { "file": "<key>.png", "scale": 5 }`, and `npm run art` renders it to `static/public/thumbnails/<key>.png` (1200×630, git-ignored). Each post's `featured-image` is `/public/thumbnails/<key>.png`; `scripts/blog-thumbnails.test.mjs` checks the posts and scenes agree. To draw one, use the `pixel-art` skill on its scene.
- Blog diagrams: `npm run diagrams` (renders `scripts/diagrams/diagrams.mjs` to the PNGs the posts embed, with the environment's Playwright and the site's fonts; `-- <file part>` for some). Never hand-edit those PNGs.
- Entrance lab: `npm run dev`, then http://localhost:4321/lab/island-entrance/ (unlisted). It replays the hero island's build-up with any order, move and timing (R replays), and copies the changes to `TIMING`. A shipped pick goes into `TIMING` (or `RANGE_TIMING`) and into the scene with `npm run pixellab -- scene entrance set <scene> --timing '<json>'`; `scripts/entrance-timing.test.mjs` fails until they match, since the site plays its own copy until the entrance moves into the SVG. To animate pixel art (build-ups, loops), use the `pixel-art-motion` skill.
- Design system previews: `npm run dev`, then http://localhost:4321/design-system/ (unlisted).
- Explainer library: `art/explainer-library.pixellab/` is a separate Pixel Lab document of assets for videos and infographics (the site never reads it). Edit it with `npm run pixellab -- <group> <verb> … --document art/explainer-library.pixellab` (`--document` wins over the script's `--site .`) (the `pixellab` MCP server is bound to the site's document), and export it with `npm run explainer-export` (PNGs and `explainer.pixellib`, its object library, into the git-ignored `.explainer-export/`). Its spec lists every asset; `scripts/explainer-library.test.mjs` keeps them in step.
- Ask bot: `npm run e2e -- scripts/e2e/ask.e2e.mjs` builds the site with and without `PUBLIC_ASK_ENDPOINT` into `.e2e-output/ask/` and stubs the Worker (`ASK_SCREENSHOTS=<dir>` also saves the behaviour screenshots). The Worker that holds the key and the limits is the separate private repo `jlawcordova/jlawcordova-ask`; this repo never holds its key. Unset, `PUBLIC_ASK_ENDPOINT` leaves the home page without the bubble.
- Accomplishments: `npm run fetch-accomplishments` (overwrites `src/data/accomplishments.json`; never commit the result)
- Fixture accomplishments: `cp scripts/fixtures/accomplishments.json src/data/accomplishments.json` (or `-two-done`, `-unavailable`, `-locked-only`), build, then `git checkout src/data/accomplishments.json`. The rich fixture fills the home section and `/achievements/` (three pages and the locked list).

## Verifying your work

- Build: `npm run build` must end with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`
- Test: `npm test` must show `# fail 0`. Never skip or delete a failing test.
- Pixel art: after changing a source, `npm run art` must report every file `lossless` (over a budget is a warning: report it), and `npm run pixellab -- check` must show no problems and no new warnings.
- Browser checks: `npm run e2e` must show `# fail 0`. "NOT RUN" (exit code 2, no Playwright) means not verified, never passed.
- UI: screenshot each changed page at 1440px and 390px wide, and confirm there's no horizontal scroll.

Run these before reporting any task complete, and paste the output. If a test fails, fix the code, not the test.

## Conventions

- No new dependencies, runtime or dev, without asking. No CSS or UI framework.
- Colors, fonts, radii and spacing come from the tokens in `src/styles/variables.css`. The import order in `global.css` is the cascade order.
- Copy, components and tokens follow the design system in `docs/design-system/`. Its README is the brand book. A token change edits `tokens.json` and `src/styles/variables.css` together.
- Edit pixel art only in `src/assets/pixel-art/jlawcordova.pixellab/**/*.json` (format 2: with the `pixellab` CLI, in Pixel Lab, or by hand in canonical form, which `check` warns about), then run `npm run art`. The compiled SVGs and thumbnails are git-ignored outputs: never commit or hand-edit them. Animate art in the document (frame loops, ambient loops, actions), not with page CSS; page code reaches into an SVG only through Pixel Lab's site contract (`data-pixellab`, the document's classes and `data-*`, `data-play`, `data-state` and `animationend`).
- New pixel art uses the world palette, the 32×16 tile, the light direction and the size caps (pixel-art engine spec R26–R28). Check it with `npm run pixellab -- art preview <name> --scale 3 --out .art-preview/<name>@3x.png`.
- Post URLs, `/blog/pageN/` and `/atom.xml` must never change.
- `src/data/accomplishments.json` stays the committed `"unavailable"` placeholder. CI overwrites it before each build.
- Keep the visible focus ring, 44px tap targets and `prefers-reduced-motion` support on anything interactive or animated.

## Architecture

The README's project layout table maps every folder. In short: routes in `src/pages/` (including `/achievements/`, paginated like `/blog/`, with redirect pages at the old `/accomplishments/` URLs), components in `src/components/` (home sections in `home/`; the achievement rows, home section, list page, framed icon, tally and icon sheets in `Accomplishment*.astro` and `Achievement*.astro`), one CSS file per area in `src/styles/`, the pixel art as a Pixel Lab document in `src/assets/pixel-art/jlawcordova.pixellab/` next to the git-ignored SVGs it compiles to (the engine is Pixel Lab's program, pinned in `scripts/pixellab.mjs`), the entrance lab at `src/pages/lab/island-entrance.astro` with `src/components/lab/EntranceLab.astro`, scripts with `node:test` tests in `scripts/`, browser checks in `scripts/e2e/`, `static/public/*` served at `/public/*`, and the design system (brand book, tokens, component guidelines and previews) in `docs/design-system/`, rendered at `/design-system/` by `src/pages/design-system.astro`.

## How changes flow

Planned work follows Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook). Each stage commits an artifact, and the next stage starts by reading it:

1. **`intent.md`:** what's wanted and why, in the owner's words. Use the `write-intent` skill. The owner accepts it by merging.
2. **`spec.md`:** requirements and design from the accepted intent, with areas of concern flagged. Use `write-spec`. The owner approves it by merging.
3. **`plan.md`:** files, order of work, workflow, risks and proof, written before any code. Use `write-plan`. Its workflow says who runs each step (the main session, in one context, unless a step has a reason for a subagent), which steps pause for the owner's review, and whether any independent review runs. Implement only against an approved plan, and update `plan.md` in the same commit when the work departs from it.
4. **Code and tests,** following the plan's workflow, then a PR that cites the plan and pastes the verification output. Run the steps back to back. Hand over to the owner only at a review the plan names, or when blocked (`write-plan`, "Workflow and reviews").
5. **Independent verification, when the plan calls for it:** a fresh session, given only "Use the `verify-change` skill on PR #<n>.", checks the PR against its intent, spec and plan and reports as a PR comment. It never pushes or commits. Fix its blocking findings before the PR merges. Without one in the plan, the implementer's checks in the PR are the verification. The owner can still ask for a run on any PR.

A small, self-contained fix can go straight to a PR.

Planned work runs on a main-session branch, `feat/<slug>`, where every slice PR merges, and reaches `main` in one final PR (`write-plan`, "Branches"). A one-slice change may go straight to `main`. Agents may merge slice PRs into `feat/<slug>` once their checks pass, after any review the plan names for them. Only the owner merges into `main`, because every merge there deploys; a hook in `.claude/settings.json` blocks agents from doing it.

Each change lives in `docs/intents/YYYY-MM-<slug>/` (the month its intent was created), holding its `intent.md`, `spec.md`, `plan.md` and any notes. Don't create top-level `docs/specs/` or `docs/plans/` folders.
- Link within a change by sibling path (`spec.md`), and to another change with `../YYYY-MM-<slug>/intent.md`.
- `docs/references/` holds shared public-safe material, such as `profile.md`.
- When a doc moves, update every mention of it, including code comments.

If documents disagree, the intent wins over the spec and the spec over the plan. Fix the lower one. `2026-10-redesign` and `2026-10-pixel-art-engine` predate these templates; don't rewrite them to match.

## Things Claude gets wrong

When Claude makes the same mistake twice, add the correction here.

- Prism puts `token <name>` classes on spans inside code blocks, such as `token range` for C#'s `..`. A bare page class with the same name (`.range`) styles code too. Scope section rules, for example `section.range`.
- `git rm` stages the deletion at once. Check `git diff --cached` before committing so it isn't swept into an unrelated commit.
- Astro 7's default Markdown processor ignores `markdown.rehypePlugins` unless `@astrojs/markdown-remark` is installed, which counts as a new dependency.
- After building with fixture accomplishments, restore the placeholder with `git checkout src/data/accomplishments.json` before committing.

## Never publish sensitive or identifying data

This repository is **public**. Everything committed ends up on GitHub and in the deployed site, and deleted files and reverted commits stay in the history, so nothing can be taken back. This covers file contents, commit messages, branch names, PR titles and descriptions, code comments, images and their metadata, and generated files.

Never commit:

- **Other people's identities.** This means colleagues', clients' or stakeholders' names, emails, handles, photos or anything else that identifies them.
- **Client and employer confidential information.** This means client names, project codenames, internal systems, incidents, decisions, estimates, pricing, contracts and internal processes.
- **Personal data.** This means personally identifiable information about anyone, such as addresses, phone numbers, ID numbers and payment details.
- **Secrets.** This means API keys, tokens, passwords, connection strings, private keys and `.env` files.
- **Raw source material** that contains any of the above, such as pasted internal documents, meeting notes, screenshots and exports.

When content is based on private material, such as profile or work-history updates, commit only a sanitized summary. Describe work by its kind ("an enterprise client platform", "a payment-sensitive browser extension"), not by who it was for or who was involved. `docs/references/profile.md` is the public-safe source for facts about roles and skills. The same rules apply to accomplishment records written to the AT Protocol repo: they're public as soon as they're written, and the site publishes them at the next build.

If you're unsure whether something is safe to publish, leave it out and ask before committing. If sensitive data has already been committed, stop and tell the user rather than trying to cover it up with another commit.
