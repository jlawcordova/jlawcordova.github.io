# jlawcordova.com

Personal site and blog of J. Law. Cordova, built with [Astro](https://astro.build) and TypeScript, with plain CSS. It's deployed to GitHub Pages by GitHub Actions.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # dev server at http://localhost:4321
npm run build    # type-check (astro check) and build to dist/
npm run preview  # serve the built site
```

## Project layout

| Path | What it is |
| --- | --- |
| `src/content/posts/` | Blog posts in Markdown. The filename sets the date and URL slug: `YYYY-MM-DD-slug.md`. |
| `src/content.config.ts` | Frontmatter schema for posts. |
| `src/pages/` | Routes: home, `/blog/` (paginated as `/blog/page2/`, ...), posts, `/atom.xml`, 404. |
| `src/layouts/`, `src/components/` | Page shell, navigation, footer, and shared pieces. |
| `src/styles/` | Plain CSS. `global.css` imports the rest in order; `variables.css` holds the design tokens. |
| `src/site.ts` | Site title, description, author links, posts per page. |
| `static/` | Copied to the site root as-is. `static/public/*` is served at `/public/*` (images, favicons, resume). |

## Writing a post

Create `src/content/posts/YYYY-MM-DD-my-post.md`:

```md
---
title: My Post
tags: space separated tags
categories: architecture
featured-image: /public/YYYY-MM-DD/featured.png
featured-image-alt: short description of the image
description: One-line summary shown on the blog page and in link previews.
---

Post body in Markdown. Fenced code blocks (```ts) are syntax highlighted.
```

The post is published at `/<categories>/<YYYY>/<MM>/<DD>/<slug>/`, the same scheme as the old Jekyll site, so existing links keep working.

## Deploy

Pushing to `master` runs `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages. Pull requests are built but not deployed. The repository's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source).

## License

Site design originally based on [Poole](https://github.com/poole/poole) by @mdo; see [LICENSE.md](LICENSE.md).
