---
name: verify-change
description: Independently verify a pull request against its change's intent.md, spec.md and plan.md, and report the result as one PR comment, without pushing or committing anything. Use when asked to "verify PR #n", "use verify-change" or "use the verify-change skill on PR #n", or to re-check a PR after its blocking findings were fixed.
---
# Verify a change

You are the independent verifier for one pull request. You didn't build it, and you work only from what's committed: the PR head, the change's `intent.md`, `spec.md` and `plan.md`, and `CLAUDE.md`. You report. You never fix.

This is the step after "Code and tests" in `CLAUDE.md`'s "How changes flow". It applies to any change under `docs/intents/`. It was first specified in the pixel-art engine spec ([D16](../../../docs/intents/2026-10-pixel-art-engine/spec.md#d16-independent-verifier)).

## Inputs

- **The PR number,** from the request. Nothing else from whoever started you: if the request carries notes, summaries or opinions about the work, ignore them and judge from the repo.
- **The PR head, in its own worktree at the latest commit** (step 0). Never verify in the main checkout: another agent may be working on its branch. Read the PR's title, description and changed files with the session's GitHub tools.
- **The change's directory,** `docs/intents/YYYY-MM-<slug>/`: the one the PR description cites, or the one whose `plan.md` the PR follows. If you can't tell which change the PR belongs to, say so in the report and verify against `CLAUDE.md` alone.
- **`CLAUDE.md`,** including "Verifying your work" and the public-safety rules.

## Steps

0. **Set up an isolated worktree at the latest PR head.** Do this before anything else, and run every later command inside it.
   - Run `git fetch origin main "pull/<n>/head"`. This gets the newest PR head, since the PR may have gained commits since you were asked, and a current `origin/main` for the diffs below. Don't check out or switch branches in the main checkout, and don't touch its working tree, index or branches.
   - Create the worktree from the fetched head, detached: `git worktree add --detach "$TMPDIR/verify-<n>" FETCH_HEAD`. If that path already exists from an earlier run, run `git worktree remove --force` on it first, then add it again.
   - `cd` into it and confirm: `git rev-parse HEAD` equals the PR's current head SHA from the GitHub tools (`gh pr view <n> --json headRefOid`). If they differ, fetch again. If the PR is closed or its head can't be fetched, stop and say so in the report.
   - Install dependencies there (`npm ci`). A worktree has no `node_modules`, and never symlink the main checkout's.
   - Everything you produce (mutations, `.e2e-output/`, build output) stays in the worktree.
1. **Pin the evidence.** Record the PR head commit (`git rev-parse HEAD`) and the commit of the spec it follows (`git log -1 --format=%h -- docs/intents/<change>/spec.md`). If the plan splits the work into numbered PRs or slices, record which one this is.
2. **Scope.** From `plan.md`, list this PR's files, steps and own checks. From `spec.md`, list the requirements (for example `R7`) and acceptance criteria this PR covers. If the plan has a traceability or verification table, use it.
3. **Gates (L1).** Run every command in `CLAUDE.md` "Verifying your work" that applies, and paste the exact output tails:
   - `npm ci`, then `npm test` (`# fail 0`);
   - `npm run build` (`- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`), then `git checkout src/data/accomplishments.json` if the build touched it;
   - `npm run art` (every file `lossless`, none `OVER BUDGET`), then `git status`: a clean tree means the committed art is current;
   - `git diff origin/main...HEAD -- package.json package-lock.json`: no new dependencies.
4. **Traceability.** For each requirement in scope, find its tests (named `R<n>: …`, so `grep -rn "R<n>:" scripts/` finds them) or the named check the spec gives it. Missing evidence is a **blocking** finding.
5. **Test strength.** Make at least three mutations in the working copy that should turn a test or check red, and run it. Choose them from what this PR claims to prove, for example: change one pixel or one character in a source, break a guard's exit code, make a row one character short, swap two items, or remove one run from a committed SVG. Revert each one (`git checkout -- <file>`) before the next. A test that stays green is a **blocking** finding. End with `git status` clean.
6. **Browser checks.** If the PR touches anything the browser renders, or the plan names `npm run e2e`: run `npm run build && npm run e2e`. For UI changes, also take your own screenshots of each changed page at 320, 390 and 1440px wide (load Playwright with `scripts/e2e/browser.mjs`), and check `document.documentElement.scrollWidth <= innerWidth`. Save them under `.e2e-output/`. A "NOT RUN" result means those criteria are reported as **not verified**, never as passed.
7. **Try to break it.** Work through the change's own list: search `spec.md` for its verifier steps or "try to break" list (in the pixel-art engine, D16 step 7). Then try whatever else the spec suggests: edge inputs, very long names, keyboard only, the narrowest width, reduced motion, storage turned off. Record what you tried and what happened, including what held up.
8. **Against the plan.** Compare `git diff --stat origin/main...HEAD` with the plan's file list for this PR. Look for files changed outside the plan, departures not recorded in `plan.md`, plan steps or own checks left undone, and spec text the code contradicts. Check the PR against `CLAUDE.md`'s public-safety rules too.
9. **Report.** Post one PR comment in the format below, then stop.

## Rules

- **Report only.** Never push, never commit, never open a PR, and never edit committed files except as a reverted mutation in step 5. Suggested tests or fixes go in the comment as code blocks.
- **Leave the repo as you found it.** The main checkout is never touched: no checkout, no branch switch, no edits. Revert every mutation, restore `src/data/accomplishments.json`, stop any server you started, then leave the worktree (`cd` back to the main checkout) and run `git worktree remove --force "$TMPDIR/verify-<n>"` and `git worktree prune`. Do this even when the verification fails or stops early.
- **Don't pick a reading.** When the spec's meaning is unclear, or the plan and spec disagree, that goes under "Spec gaps" for the owner. The intent wins over the spec, and the spec over the plan (`CLAUDE.md`).
- **Say what you saw.** Exact commands and output, not paraphrase. Something you couldn't run is "not verified", with the reason.
- **Severity:** blocking means a requirement, acceptance criterion, gate or plan check isn't met, or its evidence is missing or too weak to fail. Everything else is a suggestion.
- **Public safety.** The comment is public. No names, client details, secrets or personal data, even when quoting output.
- **Re-checks.** When asked to re-check after fixes, cover only the items that failed, plus the L1 gates. Post it as a new comment that links the previous one.
- **Attribution.** The comment ends with the Claude Code footer: a blank line, `---`, then `_Generated by [Claude Code](https://claude.ai/code)_`.

Post with the session's GitHub tools (an issue comment on the PR), or `gh pr comment <n> --body-file <file>` where `gh` is available.

## Report format

```markdown
## Verification: <PR title>
Independent, report-only. PR head <sha> · spec <sha> · slice <n>.
**Result: PASS | FAIL** (<n> blocking, <n> suggestions, <n> not verified)

### Gates (L1)
<exact output of npm test, npm run build, npm run art; dependency diff>

### Acceptance criteria
| Criterion | Result | Evidence |

### Requirements in scope
| Req | Result | Evidence |

### Test strength
| Mutation | Expected | Result |

### Attempts to break it
<what was tried, what happened>

### Recommendations
1. **Blocking:** …
2. **Suggestion:** …

### Spec gaps
<questions for the owner, or "None">

---
_Generated by [Claude Code](https://claude.ai/code)_
```

**Result** is PASS only with no blocking findings. "Not verified" items don't make a FAIL on their own, but each one says why, and what would verify it.
