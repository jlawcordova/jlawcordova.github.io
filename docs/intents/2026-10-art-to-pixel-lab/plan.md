# Plan: the art moves to Pixel Lab (from intent.md 2026-10-19)

## Files that change

- **Document:** `src/assets/pixel-art/source/` → `src/assets/pixel-art/jlawcordova.pixellab/` (moved), `src/assets/pixel-art/jlawcordova.pixellab/manifest.json` (new).
- **Dependency and scripts:** `package.json` (devDependency `pixellab`, the `art` script), `package-lock.json`.
- **Deleted:** `src/lib/pixel-art/` (7 files), `scripts/optimize-pixel-art.mjs`, `scripts/pixel-art-preview.mjs`, `scripts/pixel-art-engine.test.mjs`, `scripts/optimize-pixel-art.test.mjs`, `scripts/pixel-art-cli.test.mjs`, `src/pages/lab/pixel-art.astro`, `src/components/lab/*` except `EntranceLab.astro` (16 files), `src/styles/lab.css`, `scripts/e2e/editor.e2e.mjs`.
- **Tests repointed:** `scripts/achievement-icons.test.mjs`, `island-entrance.test.mjs`, `pixel-art-motion.test.mjs`, `pixel-art-island.test.mjs`, `range-art.test.mjs`, `range-change.test.mjs`, `range-classes.test.mjs`, `pixel-first-look.test.mjs`, `pixel-art-roundtrip.test.mjs` (plus a manifest-in-step test).
- **Docs and skills:** `README.md`, `CLAUDE.md`, `.claude/skills/pixel-art/SKILL.md`, `.claude/skills/design-scene/SKILL.md`, `.claude/skills/pixel-art-motion/SKILL.md`, `.claude/skills/achievement-icon/SKILL.md`, `.claude/skills/verify-change/SKILL.md`, `.claude/skills/write-plan/SKILL.md`, `.claude/agents/pixel-artist.md`, `docs/intents/2026-10-pixel-art-engine/spec.md` (a note under the title only).
- **This change:** `docs/intents/2026-10-art-to-pixel-lab/{intent,spec,plan}.md` (new).

## Order of work

One slice, on `feat/art-to-pixel-lab`, straight to a PR into `main`: one runner (the main session) in one sitting, and the owner asked for one PR per repo. It depends on the lab's `feat/pixellab-document` branch existing on GitHub (the dependency is pinned to a commit on it). One commit per step:

1. The change record: intent, spec and plan.
2. **The document and the dependency (R1, R2):** `git mv` the sources to `jlawcordova.pixellab/`, write `manifest.json`, add the `pixellab` devDependency pinned to the lab commit, `npm install` for the lock file, `"art": "pixellab art build --site ."`.
3. **Remove what moved (R3, R4):** the engine, compiler, previews, their three tests, the web lab and its e2e suite.
4. **Repoint the art tests (R6):** imports from `pixellab/*`, the document path, `loadDocument` and `compileScene` with the manifest's budgets; a test that the manifest's preview and theme colors match `variables.css`.
5. **Docs and skills (R8):** README, `CLAUDE.md`, the six skills, the agent, the engine spec's note.
6. Verification run (Proof) and the PR.

## Workflow and reviews

The main session runs every step in order on `feat/art-to-pixel-lab` in its own worktree (cut from `main`; the main checkout is on another branch with uncommitted work and isn't touched), pushes with `git push -u origin feat/art-to-pixel-lab` and opens the PR into `main` citing this plan. Owner review: the PR; the owner merges (every merge deploys, though this one changes no deployed byte). Independent review: none planned; `npm test`, the byte-identity check and `npm run build` are the verification.

## Risks

- **The SVGs change.** R5 is checked by running `npm run art` and `git status` on the branch; a diff means a port bug in the lab, fixed there first.
- **CI can't install the git dependency.** `npm ci` clones a public repo over HTTPS; no token needed. If GitHub's rate limit or a network blip fails it, re-run. Tested locally with a fresh `npm ci`.
- **Conflicts with the other session's skill edits** (`docs/pixel-lab-skills`, uncommitted in the main checkout). Noted for the owner in the PR; whichever lands second rebases.
- **A skill's example stops compiling.** The roundtrip test's skill-examples check stays and runs against the document.

## Proof

- `npm test` shows `# fail 0` (nine art suites and the rest).
- `npm run art` reports every output `lossless`, none `OVER BUDGET`, and `git status` shows no `.svg` change (R5).
- `npm run build` ends with `0 errors`, `0 warnings`, `0 hints` and `[build] Complete!`; `/lab/pixel-art/` is no longer in `dist/`, `/lab/island-entrance/` and `/design-system/` are.
- A fresh `rm -rf node_modules && npm ci` installs the `pixellab` dependency and `npm test` passes after it.
- The screenshot rule doesn't apply: no page that stays changes.
