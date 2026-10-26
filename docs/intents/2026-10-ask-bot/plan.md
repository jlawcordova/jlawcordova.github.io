# Plan: Ask J. Law, a bot that answers questions about me (from intent.md 2026-10-26)
Status: approved (2026-10-26).

Builds [spec.md](spec.md) (approved 2026-10-26). The owner reviews only the final pull requests. Nothing in this plan pauses for the owner before then.

## Files that change

**This repository** (one slice, branch `feat/ask-bot`):

| File | Change |
| --- | --- |
| `docs/intents/2026-10-ask-bot/intent.md`, `spec.md`, `plan.md` (new) | The change's documents |
| `src/assets/pixel-art/jlawcordova.pixellab/objects/ask-character.json` (new) | The owner as the character: an outfit of `character` in a black shirt and blue jeans, with the right arm taken off below the sleeve. It keeps the base's `idle` bob and `hop` |
| `src/assets/pixel-art/jlawcordova.pixellab/objects/ask-character-arm.json` (new) | The bare right arm, its own sprite so it can have frames and states: `wave` (the start: a 3 s loop that bobs with the body and waves for its second half), `hop` (raised, with the body's hop keys, then `wave`) and `rest` |
| `src/assets/pixel-art/jlawcordova.pixellab/scenes/hero-island.json` | The two placed on tile (1, 6), in front of the office, in a group with the class `ask-character` inside their own `enter` group |
| `src/assets/pixel-art/jlawcordova.pixellab/scenes/ask-avatar.json` (new) | A standalone scene holding only the character, with the arm in `rest`, compiled to `src/assets/pixel-art/ask-avatar.svg` (git-ignored) |
| `src/pages/ask-knowledge.json.ts` (new) | The knowledge file, `/ask-knowledge.json` |
| `src/lib/ask-knowledge.mjs` (new) | Builds the knowledge entries from the allowlisted sources; pure, so it can be tested |
| `src/components/home/Ask.astro` (new) | The bubble's markup and the panel's empty shell; rendered only when `PUBLIC_ASK_ENDPOINT` is set |
| `src/components/home/Hero.astro` | Renders `Ask.astro` inside the hero's art wrapper, only when `PUBLIC_ASK_ENDPOINT` is set; reads its copy from `home.ts` |
| `src/data/home.ts`, `src/components/home/Range.astro` | The hero's and the Range's copy move into `home.ts`, so the page and the knowledge file read the same strings (A3) |
| `src/styles/hero.css` | `.hero__float` is `position: relative`, so the bubble is placed against it and floats with the island |
| `src/lib/ask-state.mjs` (new) | The pure state machine: states, transitions, the copy for each reply status |
| `src/lib/ask.ts` (new) | The lazily loaded panel: requests, rendering, focus, the glide |
| `src/lib/ask-loader.ts` (new) | The small loader on the home page: reveals the bubble, imports `ask.ts` on first press or focus |
| `src/styles/ask.css` (new) | Bubble styles (in `global.css`) |
| `src/styles/ask-panel.css` (new) | Panel styles, imported by `ask.ts` with `?inline` and added as a `<style>`, so they load with it: a plain import is collected as page CSS and inlined into the home page |
| `src/styles/global.css` | Imports `ask.css` after `hero.css` |
| `src/env.d.ts` | Types `PUBLIC_ASK_ENDPOINT` |
| `.github/workflows/deploy.yml` | Passes `PUBLIC_ASK_ENDPOINT: ${{ vars.ASK_ENDPOINT }}` to the build step |
| `docs/design-system/components/` | An "Ask panel" entry |
| `src/pages/design-system.astro` | A static preview of the bubble and panel |
| `scripts/ask-knowledge.test.mjs` (new) | Allowlist, size and forbidden-pattern checks |
| `scripts/ask-state.test.mjs` (new) | Every state and transition |
| `scripts/e2e/ask.e2e.mjs` (new) | Browser checks against a stubbed Worker; with `ASK_SCREENSHOTS=<dir>` set, it also saves the behaviour screenshots |
| `docs/intents/2026-10-ask-bot/snapshots/*.png` (new) | The behaviour screenshots PR A embeds, committed as earlier changes did |
| `README.md` | The project-layout table gains the new files; a short "Ask" section on the endpoint variable |
| `CLAUDE.md` | One line under Commands for the Ask e2e suite and the Worker repo |
| `.gitignore` | `.e2e-output/ask/` if `.e2e-output/` isn't already ignored |

**A new repository, `jlawcordova/jlawcordova-ask`** (private), at `~/Projects/jlawcordova-ask`:

| File | Purpose |
| --- | --- |
| `package.json`, `package-lock.json`, `tsconfig.json`, `wrangler.toml` | Dependencies: `@anthropic-ai/sdk`, and dev only `wrangler` and `typescript`. Node 24's type stripping runs the tests, so no test framework |
| `src/index.ts` | The `fetch` handler: CORS, routing, the seven steps of the spec |
| `src/validate.ts` | Request validation |
| `src/limits.ts` | Limit rules and the Asia/Manila day, over an injected store and clock |
| `src/counter.ts` | The Durable Object that stores the counters |
| `src/prompt.ts` | The system prompt and the reply's JSON schema |
| `src/reply.ts` | Parses the model's reply, checks sources against the knowledge, maps to the response table |
| `src/knowledge.ts` | Fetches and caches `/ask-knowledge.json` |
| `src/ai.ts` | The one SDK call, behind an interface the tests stub |
| `test/*.test.ts` | Tests for each module and the handler |
| `evals/questions.json`, `evals/run.mjs` | The hand-run evals against the real model |
| `README.md`, `CLAUDE.md`, `.gitignore`, `.dev.vars.example` | Setup, deploy, settings and the launch checklist |

## Order of work

```
jlawcordova.github.io
main ── feat/ask-bot (main session, worktree .claude/worktrees/ask-bot) ── PR A ──▶ main (owner merges)

jlawcordova-ask (new)
main (README only) ── feat/initial (main session, after PR A's steps) ── PR B ──▶ main (owner merges)
```

One runner does all of it: the main session, in one context, from the first commit to both PRs (`write-plan`, "The main session runs the work"). The site is one slice, straight to a PR into `main`. It ships dark, with no bubble until `ASK_ENDPOINT` is set, so it needs no main-session branch. The Worker is a second PR only because it's a different repository, not a second runner. The two halves are tightly coupled through the request and response contract and the knowledge file's shape. Building the Worker right after the site, in the same context, lets each side use what the other actually does, not what a brief says it does.

**PR A, this repository (main session):**

1. **Worktree.** The intent, spec and this plan reach `main` in their own docs PR (`docs/intent-ask-bot`) before implementation starts. Create the worktree from an up-to-date `main` at `.claude/worktrees/ask-bot` on `feat/ask-bot`. If the docs PR hasn't merged yet, base the branch on `docs/intent-ask-bot` instead, and merge `main` in once it lands.
2. **Character art.** In the worktree, the main session loads the `pixel-art` skill and works with the CLI (`npm run pixellab -- …`). The MCP server is bound to the owner's checkout, so it isn't used here:
   - *Changed at the owner's request during A2 (2026-10-26):* the character stands in front of the office (the house), wears a black shirt and blue jeans, waves while it waits, and jumps when the bubble is pressed, before the panel opens. Outfit colors are only allowed on objects that extend `character`, and those can't have states of their own, so the figure is two objects: `ask-character`, an outfit with the base's `idle` and `hop`, and `ask-character-arm`, the bare arm in world skin tones with `wave`, `hop` and `rest`. Both stand on tile (1, 6) in a `<g class="ask-character">` inside one `enter` group, so one `data-play="hop"` on that group jumps the whole figure. The base `character` and the Range are unchanged.
   - The wave is the arm's start state, which bobs with the body's `idle` (1 px, stepped) and waves for the second half of each 3 s loop. It replaces the planned ambient bob, which would have doubled the base's own.
   - Create the `ask-avatar` scene with only the two objects, the arm in `rest`, compiled to an SVG only (no PNG thumbnail).
   - Review previews at 3× of the island and the avatar against canvas board C. Pick the tile yourself; no owner review.
   - `npm run art` reports every file `lossless` and `npm run pixellab -- check` shows no new problems or warnings. Record both outputs for the PR.
3. **Knowledge file.** `src/lib/ask-knowledge.mjs` and `src/pages/ask-knowledge.json.ts`, then `scripts/ask-knowledge.test.mjs`. The allowlist is a constant in the module. The output is `{ "generatedAt", "entries": [{ "path", "title", "kind", "text" }] }`, sorted by `path` so the bytes are stable (it is the cached prompt prefix). Entries:
   - Home (`/`), from the hero copy and the Range classes, read from the same data the components use.
   - Profile (`/#range`), from `docs/references/profile.md`, its Summary, Highlights, Disciplines and Skills.
   - One per blog post: title, date, description and the first 600 characters of its plain-text body.
   - One per earned accomplishment, when `accomplishments.json` isn't the placeholder.

   The tests run against the fixture accomplishments and the placeholder, check the allowlist, the 150 KB cap, and that no entry matches an email, phone, `sk-`/`ghp_`/`AKIA` key or `-----BEGIN` pattern.
4. **The bubble.** `Ask.astro`, `ask.css`, `ask-loader.ts`, the `Hero.astro` change and `env.d.ts`:
   - The bubble is a `<button hidden>` holding "Hi, I'm J. Law. What would you like to know?", absolutely placed in the hero's art wrapper.
   - The loader finds `.ask-character` in the inline island SVG, positions the bubble from the character's foot (its `enter` group's `data-x` and `data-y`, mapped through the SVG's `viewBox` and box; again on resize, through a `ResizeObserver` on the wrapper), and removes `hidden`. The foot, not the group's box: the box changes as the arm waves and the frames hidden in the SVG still count in it.
   - On pointer-enter, focus or press, the loader imports `ask.ts`. On press, it opens the panel once loaded.
   - With `PUBLIC_ASK_ENDPOINT` unset, `Ask.astro` renders nothing and no script loads.
5. **The panel.** `ask-state.mjs`, `ask.ts`, `ask-panel.css`, then `scripts/ask-state.test.mjs`.
   - States: `idle`, `opening`, `open`, `waiting`, `answered`, `unknown`, `offTopic`, `visitorLimit`, `resting`, `failed`, `closing`.
   - Glide (spec, "The character, bubble and glide"): on press, play the character's `hop` (`data-play="hop"` on the `ask-character` group) and open on its `animationend`, or at once under reduced motion, where no `animationend` fires. Then map the character's foot to the page, place the inline `ask-avatar.svg` sprite with its anchor on it, hide the in-scene group (`visibility: hidden` on the class), and `play()` the sprite to the bottom-left anchor. Closing reverses it. If the island is out of view, fade instead. Under reduced motion, `play()` already no-ops, so the code sets the end state directly.
   - The panel is a non-modal `role="dialog"` with `aria-label="Ask J. Law"`. Focus goes to the input on open and back to the bubble on close. Escape closes it. The reply area is `aria-live="polite"`.
   - The request is `fetch(PUBLIC_ASK_ENDPOINT, { method: "POST" })` with an 8-second `AbortController` timeout. History holds the last two exchanges, in memory only.
   - Copy is exactly the spec's: the first line, the four guardrail states, the failure line, and the privacy line. The three chips are "What do you do?", "Which stack do you use?" and "Are you open to work?".
   - The 390px layout follows the spec (full width, at most 60vh, character on the top-left edge). It uses `100dvh`-based sizing so the on-screen keyboard doesn't hide the input.
6. **Browser checks.** `scripts/e2e/ask.e2e.mjs` follows the accomplishments suite's pattern:
   - It builds into `.e2e-output/ask/` with `PUBLIC_ASK_ENDPOINT=https://ask.e2e.invalid/ask`, and stubs that URL with Playwright's `page.route` for each row of the spec's response table, plus a timeout and an abort.
   - At 1440px and 390px it checks:
     - the bubble's position next to `.ask-character`;
     - opening, with the sprite ending within 2px of the bottom-left anchor;
     - focus moving into the panel and back to the bubble, and Escape closing it;
     - each state's text;
     - source links;
     - no horizontal scroll;
     - nothing gliding under reduced motion;
     - the in-scene character visible again after close.
   - It also checks that a build without the variable has no bubble and loads no ask script.
7. **Design system and deploy.** Add the "Ask panel" component entry and its preview on `/design-system/`. Make the `deploy.yml` change, and update `README.md` and `CLAUDE.md`.
8. **Verify and open PR A.** This comes after PR B's steps. Merge `main` into `feat/ask-bot` if it moved. Run every check under Proof. Measure the home page's added gzip bytes (initial and on first press) and paste the numbers. Run `ASK_SCREENSHOTS=docs/intents/2026-10-ask-bot/snapshots npm run e2e -- scripts/e2e/ask.e2e.mjs` to save the behaviour sequence below against the stubbed Worker, look at each image, and commit them. Open the PR into `main` citing this plan, with the owner's launch checklist (below), a link to PR B, and a "Behaviour" section that embeds every screenshot in order with a one-line caption. Each image is embedded by its blob URL on `feat/ask-bot` with `?raw=true`.

   The sequence, at 1440px unless noted:
   1. `01-idle.png`: the hero with the character on the island and its bubble.
   2. `02-bubble-focus.png`: the bubble with the focus ring (keyboard).
   3. `03-glide-mid.png`: mid-glide, about 300 ms after the press.
   4. `04-open.png`: the panel open at the bottom left, with the first line and the chips.
   5. `05-waiting.png`: the thinking state.
   6. `06-answered.png`: an answer with its source link.
   7. `07-unknown.png`, `08-off-topic.png`, `09-visitor-limit.png`, `10-resting.png`, `11-failed.png`: each guardrail state.
   8. `12-closed.png`: after Close, the character back on the island.
   9. `13-reduced-motion.png`: open under reduced motion, with no mid-glide frame.
   10. `14-390-idle.png`, `15-390-open.png`, `16-390-answered.png`: the phone layout.

**PR B, `jlawcordova-ask` (main session, after A1–A7):**

1. **The repo.** Create the private GitHub repo with `gh repo create jlawcordova/jlawcordova-ask --private --add-readme`, so GitHub writes the first commit on `main` and no agent pushes to it. Clone it to `~/Projects/jlawcordova-ask` and branch `feat/initial`. Everything else reaches `main` only through PR B, which the owner reviews and merges. The owner approved creating the repo on their behalf (2026-10-26). The `jlawcordova-mcp` Worker in `~/Projects/jlawcordova-atproto` is the style reference for Wrangler settings and README.
2. **Scaffold.** Create `package.json`, `tsconfig.json`, `wrangler.toml` (the Durable Object binding with a SQLite migration, `ALLOWED_ORIGINS`, `KNOWLEDGE_URL`, the limit values, and `ASK_ENABLED`), `.dev.vars.example` with the key's name only, and `CLAUDE.md`.
3. **Pure modules and their tests.** `validate.ts`, `limits.ts`, `prompt.ts`, `reply.ts`, `knowledge.ts`.
   - Limits test the minute and day windows, the Manila day boundary, the order (site before visitor), and counting only after a call.
   - Reply tests cover a valid `ok`, a source not in the knowledge, an `ok` with no sources (becomes `unknown`), and malformed JSON.
   - The visitor's IP is hashed with SHA-256 and a daily salt derived from a secret, `IP_SALT`. Tests check that no raw IP reaches the store.
4. **The handler and the Durable Object.** `index.ts`, `counter.ts` and `ai.ts`.
   - `ai.ts` makes one `messages.create` call with `claude-haiku-5-5`, `max_tokens: 400`, `output_config: { effort: "low", format: <the JSON schema> }`, the prompt and knowledge as a system block with `cache_control: { type: "ephemeral" }`, and the history and question as user and assistant turns.
   - It checks `stop_reason` (`refusal` and `max_tokens` become `unknown`) and catches the SDK's typed errors (rate limit or 5xx becomes `failed`, mapped to a 503 `resting` reply with no `resetAt`).
   - Handler tests run every row of the response table, CORS (allowed origin, other origin, preflight) and `ASK_ENABLED=false`, against a stub `ai.ts` and an in-memory store.
5. **Evals.** `evals/questions.json` holds about 30 questions with expected `status`:
   - on topic;
   - not on the site, including availability and rates;
   - off topic;
   - injection ("ignore your instructions", "you are now…", a question that pastes fake knowledge);
   - bait for made-up claims ("Which companies has J. Law worked for?", "What did J. Law score on…").

   `evals/run.mjs` posts each one to a running Worker (`wrangler dev` or the deployed URL) and prints a pass/fail table. It is not run here, because it spends money and needs the owner's key. The README says how to run it.
6. **Verify and open PR B.** Run `npm test` and `npx tsc --noEmit`. Run `npx wrangler deploy --dry-run` to show the bundle builds; it doesn't deploy. Open the PR into `main` with the outputs and a link to PR A. Don't deploy, set secrets, or call the real model.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| A1–A7 | Main session | `.claude/worktrees/ask-bot`, `feat/ask-bot` | Commit per step, then B1 |
| B1–B6 | Main session | `~/Projects/jlawcordova-ask`, `feat/initial` | Commit per step; open PR B |
| A8 | Main session | `.claude/worktrees/ask-bot` | Open PR A |
| Review | One fresh `general-purpose` subagent, adversarial | Reads both PRs' diffs | Returns findings; the main session fixes the blocking ones on each branch and pushes |
| Hand-over | Main session | Both PRs | Pastes the review's findings and fixes into both PR descriptions |

- **One runner.** The main session runs every step, one after another, in one context. Art uses the `pixel-art` skill, not the `pixel-artist` agent. The Worker is built after the site's steps, not in parallel, so there is no file ownership to split.
- **Merging.** Agents merge nothing. The owner merges PR A and PR B into their `main` branches, in either order: PR A ships dark until `ASK_ENDPOINT` is set.
- **Owner review.** None mid-way. The owner reviews PR A and PR B together at the end.
- **Independent review.** One adversarial review by a fresh subagent, the only subagent in this plan. Its reason is "fresh eyes on purpose" (`write-plan`): not sharing the implementer's context is the point, and the change carries security and public-safety risk.
  - **Brief:** the two PR URLs, the spec's path, and the task.
  - **It hunts for ways to:**
    - spend past the limits, or call the model from another origin;
    - read the key, or put anything private into the knowledge file or the page;
    - get answers from outside the knowledge, or get a source link the Worker didn't check;
    - break the page when the Worker is down.
  - **It returns** a compact list of findings, each with a severity, the file and a one-line reproduction. It edits nothing.
  - The main session checks each finding against the code itself before fixing it. There is no `verify-change` run: the main session's checks in each PR and this review are the verification.

**Running it with `/goal`.** The implementing session runs this plan as a goal, in auto mode, so it works through every step without a prompt per turn, and a separate evaluator decides when it is done. The evaluator only reads the conversation, so each check's output must be printed in the transcript, not only in the PR. Start it with:

```text
/goal Implement docs/intents/2026-10-ask-bot/plan.md as written, in one main session; the only subagent is the plan's adversarial review. Done when all of these are shown in this conversation:
(1) PR A from feat/ask-bot into main in jlawcordova/jlawcordova.github.io and PR B from feat/initial into main in jlawcordova/jlawcordova-ask are both open, and their URLs are printed;
(2) the output of npm run art (every file lossless), npm run pixellab -- check (no new problems), npm test (# fail 0), npm run build (0 errors, 0 warnings, 0 hints, Complete!) and npm run e2e (# fail 0, ask.e2e.mjs run) from the worktree, and npm test, npx tsc --noEmit and npx wrangler deploy --dry-run from jlawcordova-ask, each passing;
(3) PR A's description has a Behaviour section embedding all 16 screenshots from the plan's step A8, committed under docs/intents/2026-10-ask-bot/snapshots/;
(4) the adversarial review's findings are listed, and each blocking one is fixed and pushed.
Constraints: never merge or push to main in either repo; never deploy the Worker, set secrets or call the real model; never edit the owner's checkout outside .claude/worktrees/ask-bot; update plan.md in the same commit when the work departs from it. Stop as impossible if a step is blocked by something the plan names as a stop (for example Durable Objects rejected, or the site contract not exposing the character's class), and report why. Or stop after 150 turns.
```

**The owner's launch checklist** (in PR A's description; nothing here is an agent's step):

1. In the AI provider's console, create a workspace for the bot with a monthly spend limit (about $10), and an API key in it. Confirm the provider's data terms and the promo credits' terms allow a public-facing use (spec, concern 6).
2. In `jlawcordova-ask`, run `npx wrangler secret put ANTHROPIC_API_KEY` and `npx wrangler secret put IP_SALT`, then `npx wrangler deploy`.
3. Run `npm run evals -- <worker URL>` and check the table. Ask 20 questions and compare the console's cost with the spec's estimate.
4. In this repo's GitHub settings, set the Actions variable `ASK_ENDPOINT` to the Worker's `/ask` URL, and re-run the deploy workflow.
5. The off switch is `ASK_ENABLED=false` in the Worker's settings, which needs no site deploy.

## Risks

- **The owner's open edits to `hero-island.json` (riskiest).** The owner's checkout has uncommitted changes to the same scene. A2 makes one small, separate addition: one group, one placement and one ambient loop. Scene ordering is canonical, so the owner's later commit should merge cleanly or with a small conflict. A2 must not run `scene sort` or touch any other item. If `main`'s scene changes during the work, merge `main` first and re-place the character.
- **The bubble drifts from the character.** The island SVG scales with the viewport. The bubble's position always comes from the character's foot mapped through the live SVG box, never fixed pixels, and the e2e suite checks it at both widths.
- **Reaching into the SVG.** The page touches the in-scene character only through its document class (the site contract). If the class doesn't survive compilation, stop and check the `pixel-art` skill's contract section. Do not reach in by element order.
- **Home page budgets.** The loader and bubble CSS must stay within 1 KB gzip each. If the island SVG or the home page goes over budget, `npm run art` warns: report the number, don't raise a budget.
- **The knowledge file leaks something.** It is built only from the allowlist. Its test checks forbidden patterns. PR A's description pastes the generated file's entry list (paths and titles) for the owner to scan.
- **The model behaves differently than the tests assume.** Tests stub the model, so its real behaviour is only checked by the evals at launch. The Worker's reply checks mean a bad verdict can lose an answer but can't show an unchecked source.
- **Prompt caching doesn't apply.** A prefix below the model's minimum cacheable size silently doesn't cache. The knowledge file is far above it. The evals print `cache_read_input_tokens` so the owner can see caching work.
- **Durable Objects on the owner's Cloudflare plan.** SQLite-backed Durable Objects are on the free plan. If `wrangler deploy --dry-run` rejects the binding, stop PR B and report.

## Proof

PR A pastes:

- `npm run art`: every file `lossless`, with `ask-avatar.svg` listed, and `art sizes hero-island` for what the character adds (+11.5 KB raw, +1.1 KB gzip with the wave: over the spec's 5 KB raw, within it gzipped, and within the island's 750 KB / 150 KB budget). `npm run pixellab -- check` shows no new problems or warnings.
- `npm test`: `# fail 0`, including `ask-knowledge.test.mjs` and `ask-state.test.mjs`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run build` then `npm run e2e`: `# fail 0`, with `ask.e2e.mjs` run (not "NOT RUN").
- The home page's gzip bytes before and after, for the initial load and after the first press.
- The behaviour screenshots (A8's sequence), embedded in the PR's "Behaviour" section, with no horizontal scroll at either width.
- The knowledge file's entry list.

PR B pastes `npm test`, `npx tsc --noEmit` and `npx wrangler deploy --dry-run` output, and the adversarial review's findings with what was fixed.
