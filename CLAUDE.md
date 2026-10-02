# CLAUDE.md

This is J. Law. Cordova's personal site and blog, built with Astro and deployed to GitHub Pages. See `README.md` for how to develop and deploy it.

## Never publish sensitive or identifying data

This repository is **public**, and everything committed to it ends up on GitHub and in the deployed site. A deleted file or a reverted commit stays in the git history, so it can't be taken back. Never commit sensitive data or data that identifies anyone.

This covers every place content is published:
- file contents
- commit messages
- branch names
- PR titles and descriptions
- code comments
- images and their metadata
- generated files

Never commit:

- **Other people's identities.** This means colleagues', clients' or stakeholders' names, emails, handles, photos or anything else that identifies them.
- **Client and employer confidential information.** This means client names, project codenames, internal systems, incidents, decisions, estimates, pricing, contracts and internal processes.
- **Personal data.** This means personally identifiable information about anyone, such as addresses, phone numbers, ID numbers and payment details.
- **Secrets.** This means API keys, tokens, passwords, connection strings, private keys and `.env` files.
- **Raw source material** that contains any of the above, such as pasted internal documents, meeting notes, screenshots and exports.

When content is based on private material (for example, profile or work-history updates), commit only a sanitized summary. Describe work by its kind ("an enterprise client platform", "a payment-sensitive browser extension"), not by who it was for or who was involved. `docs/references/profile.md` is the public-safe source for facts about roles and skills.

The same rule applies to accomplishment records written to the AT Protocol repo (for example with the accomplishments MCP tools). They're public as soon as they're written, and the site publishes them at the next build.

If you're unsure whether something is safe to publish, leave it out and ask before committing. If sensitive data has already been committed, stop and tell the user rather than trying to cover it up with another commit.

## Docs

Each planned change gets its own directory under `docs/intents/`, named `YYYY-MM-<slug>`. `YYYY-MM` is the month the intent was created, and `<slug>` is a short kebab-case name, for example `docs/intents/2026-10-redesign/`. Everything about that change lives in its directory:

- `intent.md`: what the change is and why, its scope, constraints, acceptance criteria and open decisions. Write it first.
- `spec.md`: turns the intent into buildable detail.
- `plan.md`: orders the spec into pull requests and tasks with checks.
- Anything else the change needs, such as notes or diagrams, sits next to them. Don't create top-level `docs/specs/` or `docs/plans/` folders.

Link between documents in the same change with sibling paths (`spec.md`), to another change with `../YYYY-MM-<slug>/intent.md`, and to references with `../../references/<file>.md`. When you move or rename a doc, update every link and path mention to it, including comments in code.

`docs/references/` holds public-safe reference material shared across changes, such as `profile.md`. It isn't tied to one intent.

### Intent format

Write every `intent.md` in the same shape as the existing ones. Use `docs/intents/2026-10-redesign/intent.md` as the model.

1. **Title:** `# Intent: <what changes>`, for example `# Intent: Isometric pixel-art engine`.
2. **Metadata table**, two columns with an empty header row (`| | |`). Always include **Status** (`Draft` until it's accepted), **Owner** and **Created** (`YYYY-MM-DD`). Add the rows that apply: **Builds on** (links to other changes), **Design source**, **Content source**, and **Specification** and **Plan** once `spec.md` and `plan.md` exist.
3. **`## Intent`:** what the change is, in a paragraph or two. If it draws on more than one source, such as a mock and a reference doc, say which wins when they disagree.
4. **`## Why`:** the reasons, as bullets.
5. **`## Scope`**, with **`### In scope`** as a numbered list and **`### Out of scope`** as bullets. Be explicit about what's left out.
6. **Topic sections, if needed,** such as `## Brand spec` or `## Page spec: home`, for detail the scope relies on.
7. **`## Constraints`:** the rules any solution must follow, such as stack, dependencies, budgets, accessibility and the public-safety rules above.
8. **`## Acceptance criteria`:** a `- [ ]` checklist. Each item must be checkable by someone else, with no "looks good".
9. **`## Decisions`:** a table of open questions, `| # | Question | Default if not decided |`. Every question gets a default so work isn't blocked. When a question is settled, record the answer in its row.
10. **`## Sequencing`, if needed:** what this depends on or must happen before or after.
11. **`## References`:** links to the sources, docs and files the intent draws on.

An intent says *what* and *why*. Leave the *how* (files, tokens, components, code) to `spec.md`. If the spec and the intent disagree, the intent wins and the spec gets fixed. If the plan and the spec disagree, the spec wins. Write `spec.md` and `plan.md` in the shape of the redesign's, and link each back to its intent.
