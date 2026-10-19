# Spec: the art moves to Pixel Lab (from intent.md 2026-10-19)
Status: draft (reviewed with its intent, plan and code in one PR, at the owner's request).

Depends on the lab repo's `2026-10-pixellab-document` change: its spec defines the `.pixellab` document, the manifest and the `pixellab` package this site installs.

## Requirements

- **R1. The art is a document.** `src/assets/pixel-art/source/` becomes `src/assets/pixel-art/jlawcordova.pixellab/`: the same `palette.mjs`, `objects/` and `scenes/`, plus a `manifest.json` that names the publish folder (`..`, so the SVGs land where they are today), the two budget exceptions (hero island 750 KB / 150 KB gzip, Range sprite 200 KB / 50 KB), the preview colors and the night page color that the engine used to read from `variables.css`.
- **R2. Pixel Lab is a development dependency.** `package.json` gets `"pixellab": "github:jlawcordova/jlawcordova-lab#<commit>"` under `devDependencies` (the owner allowed this one). `npm run art` becomes `pixellab art build --site .`, so the one command every skill names still compiles and writes the SVGs. No other dependency is added.
- **R3. The engine, the compiler and the previews leave.** `src/lib/pixel-art/`, `scripts/optimize-pixel-art.mjs` and `scripts/pixel-art-preview.mjs` are deleted. Their tests (`pixel-art-engine.test.mjs`, `optimize-pixel-art.test.mjs`, `pixel-art-cli.test.mjs`) go with them to the lab.
- **R4. The web lab retires.** `src/pages/lab/pixel-art.astro`, every file under `src/components/lab/` except `EntranceLab.astro`, `src/styles/lab.css` and `scripts/e2e/editor.e2e.mjs` are deleted. `/lab/island-entrance/` and `/design-system/` stay.
- **R5. The committed SVGs don't change.** After `npm run art` on this branch, `git status` shows no change under `src/assets/pixel-art/*.svg`.
- **R6. The art's tests keep running.** The tests of this site's art (the island, the Range, the icons, the entrance, the motion, the first look, the round trip's canonical-form and staleness checks) import the engine from `pixellab/engine`, `pixellab/compile`, … and read the document, and pass unchanged in what they assert. The round trip's R12 (`npm run art reads no .src.svg`) and the skill-examples test are kept, pointed at the new paths.
- **R7. Build and deploy are unchanged in what they need.** `npm run build` passes; the deploy workflow needs no new step (CI's `npm ci` installs the git dependency, which only tests use).
- **R8. Skills, agent and docs follow.** The `pixel-art`, `design-scene`, `pixel-art-motion` and `achievement-icon` skills, the `pixel-artist` agent, `CLAUDE.md` and the README name the document, `npm run art` and the `pixellab art check | preview | sizes`, `object new`, `scene new` commands instead of `npm run art -- --check | --preview | --sizes | --new`, and drop the web lab (the design-scene skill's "lab links" become Pixel Lab's `scene_render`/`object_render` images and the owner's Pixel Lab window). The pixel-art engine spec is not rewritten; a note at its top points here.

## Design

- **The document.** `git mv src/assets/pixel-art/source src/assets/pixel-art/jlawcordova.pixellab`, then `manifest.json`:

  ```json
  {
    "format": 1,
    "name": "jlawcordova",
    "publish": {
      "dir": "..",
      "budgets": {
        "hero-island.svg": { "raw": 768000, "gzip": 153600 },
        "range-sprite.svg": { "raw": 204800, "gzip": 51200 }
      }
    },
    "preview": { "card": "#E9DCC6", "grid": "rgba(90, 62, 43, 0.06)" },
    "theme": { "darkPage": "#1C1712" }
  }
  ```

  The preview and theme values are today's `--color-card`, `--color-grid` and dark `--color-page`; the palette test that keeps brand colors in step with `variables.css` stays, and a new one keeps these three manifest values in step too.
- **Scripts.** `"art": "pixellab art build --site ."` (the lab resolves the site to its document). `"test"` unchanged. The e2e runner keeps working; it just has one suite fewer.
- **Tests that stay** (imports repointed; `SOURCE_DIR` → the document; `readSources` → `loadDocument` from `pixellab/document`, `compileScene(sources, name, budgets)` from `pixellab/compile`): `achievement-icons`, `island-entrance`, `pixel-art-motion`, `pixel-art-island`, `range-art`, `range-change`, `range-classes`, `pixel-first-look`, `pixel-art-roundtrip`.
- **Tests that go:** `pixel-art-engine.test.mjs`, `optimize-pixel-art.test.mjs`, `pixel-art-cli.test.mjs` (the lab has them).
- **Docs.** README: the project-layout rows for the engine, the optimizer, the previews, the web lab and the sources; the "Pixel art" section's command list and "The lab" paragraph. `CLAUDE.md`: the Pixel art and Pixel-art lab command lines, the convention "Edit pixel art only in …", the `pixel-art` skill reference. The skills: the `source/…` paths, the `npm run art -- …` commands, the editor sections. The engine spec gets a two-line note under its title.

## Areas of concern

- **A git dependency on a public repo.** `npm ci` in CI clones `jlawcordova-lab` at the pinned commit; it needs git (present on `ubuntu-latest`) and adds a few seconds. The dependency is dev-only and never reaches the deployed site. The pin is a commit on the lab's feature branch until the lab releases; bumping it to the release tag is a follow-up PR.
- **The site's working tree has uncommitted skill edits from another session** (`docs/pixel-lab-skills`), on the same skill files this change edits. The owner will see conflicts when both land; this PR is cut from `main`.
- **The pixel-art engine spec names paths that no longer exist** (`src/lib/pixel-art/`, `npm run art -- --check`). It's a record and isn't rewritten (CLAUDE.md); the note at its top says where things went.

## Open questions

- From the intent: which tests move. Answered above (R3, R6).
