# jlawcordova.com

Personal site and blog of J. Law. Cordova, built with [Astro](https://astro.build) and TypeScript, with plain CSS. It's deployed to GitHub Pages by GitHub Actions.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # publish the art (where Pixpocket is installed), then the dev server at http://localhost:4321
npm run build    # publish the art, type-check (astro check) and build to dist/
npm run preview  # serve the built site
npm run fetch-accomplishments  # refresh src/data/accomplishments.json from AT Protocol
npm run art      # publish the pixel-art document to its SVGs with Pixpocket; without it, check the committed SVGs match the document (see Pixel art below)
npm run diagrams    # render the blog's diagrams (scripts/diagrams/) to the PNGs the posts embed, with the environment's Playwright
npm test         # npm run art, then the scripts' tests (Node built-ins; no network)
npm run pixpocket -- <command>  # any Pixpocket command on this checkout, such as check or preview
npm run e2e      # browser checks against the built dist/ (run npm run build first)
npm run e2e -- scripts/e2e/accomplishments.e2e.mjs  # one suite only
ASK_SCREENSHOTS=docs/intents/2026-10-ask-bot/snapshots npm run e2e -- scripts/e2e/ask.e2e.mjs  # the Ask checks, saving the behaviour screenshots
```

## Project layout

| Path | What it is |
| --- | --- |
| `src/content/posts/` | Blog posts in Markdown. The filename sets the date and URL slug: `YYYY-MM-DD-slug.md`. |
| `src/content.config.ts` | Frontmatter schema for posts. |
| `src/pages/` | Routes: home, `/blog/` (paginated as `/blog/page2/`, ...), posts, `/achievements/` (every accomplishment as an achievement, 12 earned a page as `/achievements/page2/`, ..., with the locked ones on page 1; the old `/accomplishments/` pages redirect there), `/atom.xml`, 404, and the unlisted `/design-system/`. |
| `src/layouts/`, `src/components/` | Page shell, navigation, footer, and shared pieces. |
| `src/components/Accomplishment*.astro`, `Achievement*.astro` | Accomplishments as achievement rows: `AccomplishmentRow` (one row, a `<details>` when done, plain and locked when not), `Accomplishments` (the home section: three newest done, the newest locked, "View all", and the "Achievement unlocked!" toast), `AccomplishmentsPage` (one page of `/achievements/`), `AchievementIcon` (an icon in its frame), `AchievementTally` (the earned and locked totals) and `AchievementIcons` (the icon and frame sheets, inlined once per page, plus the tooltip's Escape script). Styles in `src/styles/accomplishments.css`; the toast's script in `src/lib/achievement-toast.ts`. |
| `src/styles/` | Plain CSS. `global.css` imports the rest in order; `variables.css` holds the design tokens. |
| `src/components/home/Ask.astro`, `src/lib/ask-loader.ts`, `src/lib/ask.ts`, `src/lib/ask-state.mjs`, `src/styles/ask.css`, `src/styles/ask-panel.css` | Ask J. Law, the bot that answers questions about the owner ([ask bot spec](docs/intents/2026-10-ask-bot/spec.md)): the bubble over the island's character and the panel's shell, the small loader that places the bubble and loads the panel on first use, the panel (requests, rendering, focus, the jump and the glide), its pure state machine and copy in plain `.mjs` so `npm test` can import it, and their styles (`ask-panel.css` loads with the panel, not the page). See Ask below. |
| `src/lib/ask-knowledge.mjs`, `src/pages/ask-knowledge.json.ts` | The bot's knowledge, published at `/ask-knowledge.json`: built only from the sources `ALLOWLIST` names (the home copy and Range classes in `src/data/home.ts`, four sections of `docs/references/profile.md`, each post's opening, the earned achievements), sorted by path. `scripts/ask-knowledge.test.mjs` checks the allowlist, its 150 KB cap and the never-published patterns. |
| `src/data/accomplishments.json` | Accomplishments for the home page and `/achievements/`. The committed copy is an empty `"unavailable"` placeholder; CI overwrites it before every build. |
| `src/lib/accomplishment-list.mjs`, `src/lib/accomplishments.ts` | The accomplishments' logic (done and locked, what a row shows, the home selection, dates), in plain `.mjs` so `npm test` can import it; `accomplishments.ts` feeds it the data file. |
| `src/lib/paginate.mjs`, `src/lib/pagination.ts` | `paginate(items, perPage)` and page paths, shared by `/blog/` and `/achievements/`. |
| `src/lib/motion.ts` | The one importer of Motion: `reduced()`, stepped `px(n)` easing, `play()` and `reveal()`, a scroll entrance that never leaves content hidden. Islands import it; the nav loads it lazily. |
| `src/lib/achievement-icons.mjs` | The achievement icons (ids, meanings and frames) and the frame kinds. `src/pages/achievement-icons.json.ts` publishes them at `/achievement-icons.json` for the accomplishments skill. |
| `scripts/fetch-accomplishments.mjs` | Reads the public `com.jlawcordova.profile.accomplishment` records from the AT Protocol repo of `jlawcordova.com` and writes the file above. Any failure writes the placeholder and exits 0, so the build never breaks on the data. |
| `src/data/home.ts` | The Range carousel's classes. Entry *i* matches the setting `data-class="i"` in the sprite. |
| `src/assets/pixel-art/` | Pixel art inlined on the pages. The `.svg` files are published by `npm run art` (Pixpocket) and committed, with `published.json` recording the document they were made from; each plays its own animation and reduced motion. Never edit them by hand. |
| `src/assets/pixel-art/jlawcordova.pixpocket/` | The art's Pixpocket document, a folder in format 3: `manifest.json` (the publish folder, the two budgets, the preview and night colors), `palette.json` (the studio's named colors), `objects/*.json`, `scenes/*.json` (objects placed on the grid and kept in depth order, back to front by where each stands; each scene with an `output` is one SVG) and `studio-import.json` (the objects copied from the owner's art studio, which are never edited here). |
| `src/pages/design-system.astro`, `src/styles/design-system.css` | The design system previews at `/design-system/`, unlisted and `noindex`: each component's `preview.html` rendered with the site's CSS. `design-system.css` (DecisionBrief and Register) loads on that page only. |
| `scripts/fixtures/accomplishments*.json` | Invented accomplishments in the shape `npm run fetch-accomplishments` writes, for tests and local builds: `accomplishments.json` (30 done over three pages, 3 locked, every icon, an unknown icon and an old record without the gamified fields), `accomplishments-two-done.json`, `accomplishments-unavailable.json` and `accomplishments-locked-only.json` (locked records only, so `/achievements/` has no earned count). To build with one, copy it over `src/data/accomplishments.json`, then restore the placeholder with `git checkout src/data/accomplishments.json`. `accomplishments.e2e.mjs` builds all four by itself. |
| `scripts/e2e/` | Browser checks, run by `npm run e2e` with the environment's own Playwright (it's not a dependency). It serves `dist/` with `astro preview` and runs `*.e2e.mjs` with `node --test`. Without Playwright it prints "browser checks NOT RUN" and exits 2. Screenshots go to the git-ignored `.e2e-output/`. `accomplishments.e2e.mjs` needs four datasets, so it builds each accomplishments fixture into `.e2e-output/accomplishments/<variant>/` itself (restoring `src/data/accomplishments.json` straight after) and serves those builds. `ask.e2e.mjs` likewise builds the site with and without `PUBLIC_ASK_ENDPOINT` into `.e2e-output/ask/` and answers the Worker's address with Playwright's `page.route`. |
| `src/site.ts` | Site title, description, author links, posts per page. |
| `docs/intents/YYYY-MM-<slug>/` | One directory per planned change, holding its `intent.md`, `spec.md` and `plan.md`. |
| `.claude/skills/` | Project skills: `write-intent`, `write-spec`, `write-plan` and `verify-change` (an independent, report-only check of a PR) for the AI-native SDLC (see `CLAUDE.md`), `pixel-art` for changing and checking the art, `design-scene` for designing a scene with the owner looking on, `pixel-art-motion` for animating it, and `achievement-icon` for the accomplishment icons. `.claude/agents/pixel-artist.md` is a subagent for a fresh-eyes critique of art, or art apart from a session's own work; the main session works with the `pixel-art` skill. |
| `docs/references/` | Public-safe reference material shared across changes, such as `profile.md`. |
| `docs/design-system/` | The design system and its source of truth: the brand book (`README.md`), `tokens.json`, and each component's guidelines and `preview.html`. `scripts/design-system.test.mjs` keeps the tokens in step with `variables.css`. |
| `scripts/pixpocket.mjs` | Finds Pixpocket on this machine and runs it on this checkout (`npm run art`, `npm run pixpocket -- …`): `$PIXPOCKET`, `pixpocket` on the PATH, or a build in a checkout beside this one (`../pixpocket/target/release/pixpocket`). Nothing is downloaded. Without the program, `npm run art` passes only when `published.json` still matches the document. `scripts/pixpocket.test.mjs` checks the record and that the SVGs are exactly the scenes' outputs. |
| `scripts/diagrams/` | The blog's diagrams in the design system's diagram style: `kit.mjs` (the drawing helpers and a sequence-diagram layout), `diagrams.mjs` (one entry per PNG a post embeds) and `render.mjs` (`npm run diagrams`, which renders them at 2× with the site's fonts using the environment's Playwright). |
| `art/explainer-library.pixellab/` | An archive: the old explainer asset library, a Pixel Lab document on the old 32×16 grid, which Pixpocket can't draw. The owner's art studio has taken its place, and nothing reads or checks it. |
| `static/` | Copied to the site root as-is. `static/public/*` is served at `/public/*` (images, favicons, resume). |

## Writing a post

Create `src/content/posts/YYYY-MM-DD-my-post.md`:

```md
---
title: My Post
tags: space separated tags
categories: architecture
featured-image: /public/thumbnails/my-post.png
featured-image-alt: short description of the image
description: One-line summary shown on the blog page and in link previews.
---

Post body in Markdown. Fenced code blocks (```ts) are syntax highlighted.
```

The post is published at `/<categories>/<YYYY>/<MM>/<DD>/<slug>/`, the same scheme as the old Jekyll site, so existing links keep working.

The featured image is a pixel-art thumbnail, a 1200×630 PNG in `static/public/thumbnails/`. The thirteen there are committed as Pixel Lab v0.10.0 published them, and their old-grid scenes are gone (git history has them). A new one is a new scene on the 44×22 grid, drawn with studio objects, with `"image": { "file": "my-post.png", "scale": … }` and the manifest's `publish.images` naming that folder; `npm run art` then writes it. `scripts/blog-thumbnails.test.mjs` checks every post has one. Draw a diagram as an entry in `scripts/diagrams/diagrams.mjs` and run `npm run diagrams`.

## Pixel art

The site's art is published from its Pixpocket document, `src/assets/pixel-art/jlawcordova.pixpocket/`, by Pixpocket (formerly Pixel Lab; the private repo `pixpocket/pixpocket`): the engine, compiler and CLI in one program, `pixpocket`. Its releases are private, so nothing downloads it and CI doesn't have it. **The SVGs and `published.json` are committed**, and `scripts/pixpocket.mjs` finds the program on machines that have it. The `pixel-art` skill (`.claude/skills/pixel-art/SKILL.md`) is the full guide, and Pixpocket's `docs/` (`cli.md`, `document-format.md`, `site-contract.md`, `pixel-art.md`) are the references. The changes under `docs/intents/2026-10-pixel-*` and `2026-10-island-*` are the history, from when the tool was Pixel Lab and the grid 32×16.

- **Scenes** (`scenes/<name>.json`): `hero-island` (a floating island of meadow with a small start-up on it: a studio deck, a coffee bar and a meeting rug, five people and three robot agents, three of them walking loops, and J. Law standing in the meadow), `range-sprite` (seven settings, one per Range class in a `data-class` group: a 3×3 platform with its floor, props and one person), `ask-avatar` (the founder alone, for the Ask panel), `achievement-icons`, `achievement-frames`, `footer-grass` and `footer-dirt`. Objects stand on the 44×22 isometric grid (`"at": { "tile": [col, row, level] }`, with 22-pixel levels) or at pixel points, and draw back to front by where each stands. Each scene with an `output` is one SVG.
- **Objects from the studio.** The island, the Range and the avatar are drawn with objects from the owner's art studio, the private repo `jlawcordova/jlawcordova-vlog` (its Office, Agents, Cast, Range and Effects libraries, drawn by generators). The studio's `python3 scripts/export-site-art.py <this checkout>` copies in the palette and every object the scenes place, each trimmed to the states the scenes play, and lists them in `studio-import.json`. Never edit a copy here: change the studio and export again. People and robots are Pixpocket figures (parts, poses, states and what they hold).
- **The site's own objects** are the achievement icons and frames (`icon-*`, `frame-*`, 16×16 and 20×20 sprites) and `footer-grass` and `footer-dirt`. Every object has a category, which a test checks.
- **Rules:** sprites are at most 128×128 in 16 colors, from the studio's palette (at most 64 world colors), lit from the upper left. `hero-island.svg` and `range-sprite.svg` have budgets in the manifest (1,000,000 B raw and 153,600 gzip; 400,000 and 70,000). A figure costs about 5 KB a frame, which is why states are trimmed.
- **The page** reaches into an SVG only through Pixpocket's site contract: `data-pixpocket`, the document's classes and `data-*` attributes, `data-play` with `animationend`, and `data-state`. The hero plays its build-up with `data-play="enter"` on load, the Range plays `enter` on each class change and the person's `jump` state on A, and the Ask bot plays `jump` on the island's `.ask-character`. Each build-up's timing lives only in its scene's `entrance`.

```sh
npm run art                                               # publish: validate, compile and write every SVG, and published.json
npm run pixpocket -- check [name]                         # validate everything, or one object or scene and what it uses
npm run pixpocket -- preview scene:<name> --scale 3 --out .art-preview/<name>@3x.png   # a review PNG (git-ignored folder); object:<name> for an object
npm run pixpocket -- check <scene> --sizes                # bytes per object and color
npm run pixpocket -- check --ruler [name]                 # each sprite's jags, by the 2:1 ruler
npm run pixpocket -- scene items <scene>                  # a scene's items in depth order, with their paths
npm run pixpocket -- scene place <scene> <object> --at col,row   # also scene set, move, remove
npm run pixpocket -- scene entrance show <scene>          # a build-up's timing and settle time; scene entrance set tunes it
npm run pixpocket -- help                                 # every command (Pixpocket's docs/cli.md)
```

The loop is edit → `npm run art` → commit the sources with the SVGs and `published.json`. Without Pixpocket the art can't be changed: `npm run art` then only checks that the committed SVGs were published from the document as it is. Agents use the CLI above, or Pixpocket's MCP server (`pixpocket serve --mcp`) when the session has one. The owner looks and edits in Pixpocket's browser app (`pixpocket app`). Sources are kept in one canonical JSON form, and `check` warns about any that isn't in it.

## Ask

Ask J. Law is the home page's bot ([intent](docs/intents/2026-10-ask-bot/intent.md), [spec](docs/intents/2026-10-ask-bot/spec.md), [plan](docs/intents/2026-10-ask-bot/plan.md)). The site holds no key and no secret: it's static, and the questions go to a small Cloudflare Worker in its own private repository, `jlawcordova/jlawcordova-ask`, which applies the limits, calls the AI service and answers only from `/ask-knowledge.json`.

- **The endpoint:** the public build variable `PUBLIC_ASK_ENDPOINT` names the Worker's `/ask` URL. The deploy workflow sets it from the repository's Actions variable `ASK_ENDPOINT`, for deploys only. Unset, as on pull requests, in local dev and before the Worker is deployed, the home page has no bubble and loads no Ask script, and the rest of the site is unchanged.
- **To try it locally:** run the Worker with `npx wrangler dev` in `jlawcordova-ask`, then `PUBLIC_ASK_ENDPOINT=http://localhost:8787/ask npm run dev`.
- **The off switch** is `ASK_ENABLED=false` in the Worker's settings; the panel then shows its resting state, with no site deploy.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which checks that the committed SVGs were published from the art's document as it is (`npm run art`; CI doesn't have Pixpocket), runs `npm test`, fetches the accomplishments, builds the site (with `PUBLIC_ASK_ENDPOINT` from the Actions variable `ASK_ENDPOINT`, see Ask above), and deploys it to GitHub Pages. Pull requests are tested and built but not deployed. The workflow also deploys `main` when the accomplishments MCP server sends a `repository_dispatch` of type `atproto-updated` (after an add or delete), and daily at 03:17 UTC to catch a missed dispatch. The repository's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source).

## License

Site design originally based on [Poole](https://github.com/poole/poole) by @mdo; see [LICENSE.md](LICENSE.md).
