---
name: write-plan
description: Write plan.md, the implementation plan for an approved spec, before any code is written, in the AI-native SDLC (intent.md → spec.md → plan.md → code and tests → PR). Use when a change under docs/intents/ has an approved spec.md and someone asks to plan, start building or implement it. Also use to update plan.md when implementation departs from it.
---
# Write a plan

`plan.md` is the written plan for making the change: the files that change, the order of the work, the risks, and the proof that it works. It is written and approved before any code. Review later checks the diff against it.

Template and steps follow Stage 3 (Build) of Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).

## Steps

1. **Work read-only until the plan is approved.** Use Claude Code's plan mode where it's available. Otherwise read the codebase without editing anything.
2. **Read `intent.md` and `spec.md`** in the change's directory, plus `CLAUDE.md`. The spec must be approved. If it isn't, say so and stop.
3. **Draft the plan with the template below.** Name the files that change, the order of the work, and the tests and checks that prove it. Write each step in Order of work as one commit, and group them into as few PRs as the change allows (see "How many PRs").
4. **Interrogate the plan.** What could the change break? Which step is most risky? What other options were considered and not chosen, and why?
5. **Iterate until someone who has never seen the conversation could implement the change from the plan alone.**
6. **Commit the approved plan as `plan.md`** next to `spec.md`, once the owner has approved it.
7. **Implement against the plan,** one commit per step in Order of work, in order. With a solid plan, implementation is often a single pass.
8. **When the implementation departs from the plan, update `plan.md` in the same commit.** The PR's diff and the committed plan should always match.

## How many PRs

Default to **one PR per change**, with each step in Order of work as a commit inside it. Commits keep the steps reviewable one at a time (reviewers can read the PR commit by commit) without a PR, a verification and a merge for each step.

Split into more than one PR only when a step can't wait for the rest, and say why in the plan. Valid reasons:

- **Independently shippable value:** an early part is useful on its own, or must be live before the rest can be tested.
- **A risky or hard-to-reverse step** (a migration, a data change, a deletion) that should be merged and watched before building on it.
- **An external dependency:** a step waits on something outside the PR, such as another team's or service's change, a secret or setting configured elsewhere, a third-party release or approval. Put the work that depends on it in its own PR, so the rest isn't blocked, and name the dependency in the plan.
- **Too large to review in one sitting,** where the parts are separable.

Keep the count as low as the reasons allow: two or three PRs, each holding several commits, not one PR per step. Every merge to `main` deploys the site, so keep the site deployable after each PR. When there is more than one PR, number them in Order of work and group the steps under each, for example `PR 1: steps 1–3`.

### Feature branch

A large change with several PRs, where the owner wants to review the result once, can use a feature branch instead. Say so in the plan, under Order of work:

- The slice PRs target `feat/<slug>`, branched from `main`. Merging there deploys nothing, so the site only has to build at each slice, not be worth shipping.
- Each slice PR still gets the independent verifier (`CLAUDE.md` step 5). An agent may merge it into `feat/<slug>` once the report is PASS and CI is green.
- One final PR takes `feat/<slug>` to `main`. It gets its own verifier run against the whole spec, and only the owner merges it. Agents never merge into `main` (`.claude/hooks/block-main-merge.sh`).
- When `main` moves, merge it into `feat/<slug>` before the next slice starts.

## Template

```markdown
# Plan: <name of the change> (from intent.md <YYYY-MM-DD>)

## Files that change
<Each file, marked (new) or (deleted) where it applies.>

## Order of work
<One commit per step. One PR unless "How many PRs" gives a reason to split; then group the steps by PR.>
1. <First step.>
2. <Next step.>

## Risks
<What could break, the riskiest step, and how each risk is handled.>

## Proof
<The checks that show it works, written so they can be run: npm test and npm run build output, specific tests, screenshots at 1440px and 390px against the spec or mock, budgets.>
```

## Example

```markdown
# Plan: pixel-art outfit for security work (from intent.md 2026-10-01)

## Files that change
src/assets/pixel-art/source/scenes/range-sprite.mjs, src/assets/pixel-art/range-sprite.svg,
src/data/home.ts, src/styles/range.css

## Order of work
One PR, three commits:
1. Add the sixth outfit object, place it in a new group in the sprite scene, and run npm run art.
2. Add the class to rangeClasses.
3. Add its data-current rule and check the pager at 390px.

## Risks
The sprite file grows. It must stay within 100 KB raw and 25 KB gzip, or the art
script fails.

## Proof
npm run art reports lossless and within budget, npm test and npm run build pass,
and the carousel cycles through all six classes in a screenshot at 1440px and 390px.
```
