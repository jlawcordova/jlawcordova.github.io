# Plan: Explainer asset library (from intent.md 2026-10-21)

## Files that change
- `art/explainer-library.pixellab/` (new): `manifest.json`, `palette.mjs`, `objects/*.mjs` (every object in the spec's Asset list, plus `character`), `scenes/sheet-*.mjs`.
- `scripts/explainer-library.test.mjs` (new), `scripts/export-explainer-library.mjs` (new).
- `package.json` (the `explainer-export` script), `.gitignore` (`.explainer-export/`).
- `README.md` (the layout row and the command), `CLAUDE.md` (the command), `.claude/skills/pixel-art/SKILL.md` (a short section on the second document).
- `docs/intents/2026-10-explainer-library/` (new): `intent.md`, `spec.md`, `plan.md`.

## Order of work
One slice on `feat/explainer-library`, straight to one PR into `main`: the owner asked for one PR at the end, and the batches run one after another, so there's nothing to parallelize or merge in between. Each step is one commit.

1. The document, the chef and the waiter (the approved prototypes), and the intent, spec and plan.
2. Batch 1: kitchen and office floors, cubicle walls (3, 12, 13); starts `sheet-kitchen` and `sheet-office`.
3. Batch 2: stove, sink, fridge (4, 5, 23).
4. Batch 3: tables, chairs, plates, recipe book (6, 7, 24, 25).
5. Batch 4: the pass, the ticket rail (21, 22).
6. Batch 5: office staff (16).
7. Batch 6: desks, computer, laptop (9, 10, 17).
8. Batch 7: plants, water dispenser, whiteboard (11, 14, 44).
9. Batch 8: charts, giant light bulb (19, 20).
10. Batch 9: cats (18).
11. Batch 10: server machines, router, database (8, 26, 27); starts `sheet-cloud`.
12. Batch 11: wires, arrows and packets (15, 41); starts `sheet-glue`.
13. Batch 12: firewall, vault, globe (28, 30, 32).
14. Batch 13: cloud platform, monitoring wall (29, 31).
15. Batch 14: robot agents (33); starts `sheet-ai`.
16. Batch 15: tokens, bookshelf, toolbox, filing cabinet (34, 35, 36, 40).
17. Batch 16: plug and hub, sandbox, balance scale (37, 38, 39).
18. Batch 17: bubbles, signs and markers (42, 43).
19. The test, the export script and its npm script, and the docs (README, CLAUDE.md, the pixel-art skill).

Batch sizes follow complexity: characters and big machines get one or two assets, furniture and props three, simple flat pieces four.

## Workflow and reviews
| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 1 | main session | the worktree `.claude/worktrees/explainer-library` | commit |
| 2–18 | one `pixel-artist` subagent per batch, never two at once | the same worktree, with the CLI and `--document art/explainer-library.pixellab` | the main session looks at the previews, asks the subagent (resumed) for fixes if needed, runs `check`, commits |
| 19 | main session | the worktree | run every check, open the PR |

- Subagents edit only their batch's objects and their sheet scene, never commit, and write review PNGs to `.art-preview/explainer/` (git-ignored). Only the contact sheets are committed, to `samples/`, in step 19.
- Owner reviews: the chef and the waiter were approved before this plan. The rest is reviewed in the final PR, as the owner asked, with the contact sheets attached.
- Independent review: none. The art is checked by the engine and the new test, and nothing on the site changes.

## Risks
- **A color the palette lacks** (a true gray or white). The subagent uses the spec's materials; if an asset can't read without one, it's reported in the PR rather than added.
- **The engine can't express something** (a loop or size). The subagent stops and reports; the asset is drawn within the limit or flagged.
- **Context and time:** 17 batches. Each runs in a fresh subagent with a self-contained brief, so the main session only reviews and commits.
- **The site's tests:** they read only the site's document, so the new document can't break them; the new test covers it.

## Proof
- `npx pixellab --document art/explainer-library.pixellab check` reports no problems.
- `npm test` shows `# fail 0`, including `explainer-library.test.mjs`.
- `npm run build` ends with 0 errors, 0 warnings, 0 hints (nothing on the site changes; this confirms it).
- `npm run explainer-export` writes the PNGs; the five contact sheets are attached to the PR.

## Departures
- Batch 13 added `cloud-platform-shadow` (the floating cloud's dithered ground shadow, like the site's `island-shadow`); the spec's row 29 lists it.
- Batch 14: an outfit can't carry a loop layer, and only outfits may use the `silver` ramp, so the robots keep the idle bob with the antenna drawn lit instead of an `hf` blink; the spec's row 33 and Areas of concern say so.
- Batches 5 and 15 each took one round of fixes from the main session's review (the developer's hoodie, height and mug; the tokens' glyph, which read as a first-aid cross).
- Merging `main` brought Pixel Lab v0.5.0, which draws scenes in depth order instead of list order. The sheets were migrated: `level: 1` on items placed on furniture, footprints on the multi-tile sprites and on `desk`/`chair-turned`, and one `scene sort`. Against the v0.3.0 renders, kitchen and glue are identical, and office, cloud and ai differ by 3, 2 and 3 pixels at 1× (a cactus pot under the keyboard's tip, a wire end over the router's foot, three wire joint caps now drawn whole). The samples are re-rendered with v0.5.0.
