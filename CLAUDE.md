# CLAUDE.md

J. Law. Cordova's personal site and blog: Astro 7, TypeScript and plain CSS, deployed to GitHub Pages on every merge to `master`. `README.md` has the project layout and deploy details.

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:4321)
- Build: `npm run build` (runs `astro check`, then builds to `dist/`)
- Test: `npm test` (Node built-ins, no network)
- Browser checks: `npm run e2e` (serves the built `dist/` and runs `scripts/e2e/` with the environment's Playwright; run `npm run build` first)
- Pixel art: `npm run art` (compiles the scenes in `src/assets/pixel-art/source/` to `src/assets/pixel-art/*.svg`). `npm run art -- --check <name>` validates one object or scene, `--preview <name>` writes PNGs to `.art-preview/`, and `--new object|scene <name>` writes a starter source. The `pixel-art` skill has the details.
- Accomplishments: `npm run fetch-accomplishments` (overwrites `src/data/accomplishments.json`; never commit the result)

## Verifying your work

- Build: `npm run build` must end with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`
- Test: `npm test` must show `# fail 0`. Never skip or delete a failing test.
- Pixel art: after changing a source, `npm run art` must report every file `lossless` and none `OVER BUDGET`.
- Browser checks: `npm run e2e` must show `# fail 0`. "NOT RUN" (exit code 2, no Playwright) means not verified, never passed.
- UI: screenshot each changed page at 1440px and 390px wide, and confirm there's no horizontal scroll.

Run these before reporting any task complete, and paste the output. If a test fails, fix the code, not the test.

## Conventions

- No new dependencies, runtime or dev, without asking. No CSS or UI framework.
- Colors, fonts, radii and spacing come from the tokens in `src/styles/variables.css`. The import order in `global.css` is the cascade order.
- Edit pixel art only in `src/assets/pixel-art/source/**/*.mjs`, then run `npm run art`. Never hand-edit the generated SVGs.
- New pixel art uses the world palette, the 32×16 tile, the light direction and the size caps (pixel-art engine spec R26–R28). Check it with `npm run art -- --preview <name>`.
- Post URLs, `/blog/pageN/` and `/atom.xml` must never change.
- `src/data/accomplishments.json` stays the committed `"unavailable"` placeholder. CI overwrites it before each build.
- Keep the visible focus ring, 44px tap targets and `prefers-reduced-motion` support on anything interactive or animated.

## Architecture

The README's project layout table maps every folder. In short: routes in `src/pages/`, components in `src/components/` (home sections in `home/`), one CSS file per area in `src/styles/`, the pixel-art engine in `src/lib/pixel-art/` (plain `.mjs` with `// @ts-check`, shared by `npm run art`), scripts with `node:test` tests in `scripts/`, browser checks in `scripts/e2e/`, and `static/public/*` served at `/public/*`.

## How changes flow

Planned work follows Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook). Each stage commits an artifact, and the next stage starts by reading it:

1. **`intent.md`:** what's wanted and why, in the owner's words. Use the `write-intent` skill. The owner accepts it by merging.
2. **`spec.md`:** requirements and design from the accepted intent, with areas of concern flagged. Use `write-spec`. The owner approves it by merging.
3. **`plan.md`:** files, order of work, risks and proof, written before any code. Use `write-plan`. Implement only against an approved plan, and update `plan.md` in the same commit when the work departs from it.
4. **Code and tests,** then a PR that cites the plan and pastes the verification output.
5. **Independent verification:** a fresh session, given only "Use the `verify-change` skill on PR #<n>.", checks the PR against its intent, spec and plan and reports as a PR comment. It never pushes or commits. Fix its blocking findings before the owner merges.

A small, self-contained fix can go straight to a PR.

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
