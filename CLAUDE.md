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

- `docs/intents/`: intent documents that describe planned changes, for example `intent-redesign.md`.
- `docs/specs/`: specifications that turn an intent into buildable detail, for example `spec-redesign.md`.
- `docs/references/`: public-safe reference material that intents and site copy draw on.
