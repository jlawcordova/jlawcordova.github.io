#!/usr/bin/env bash
# PreToolUse hook: agents may merge pull requests into feature branches
# (feat/**), never into main. Merging to main deploys the site, so the owner
# does it by hand. Exit 2 blocks the tool call and shows the message to Claude.
input=$(cat)
tool=$(jq -r '.tool_name' <<<"$input")

if [[ "$tool" == "Bash" ]]; then
  cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
  # A direct push to main deploys too.
  if [[ "$cmd" =~ git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]+([^[:space:]]*:)?(refs/heads/)?main([[:space:]]|$) ]]; then
    echo "Blocked: only the owner updates main. Push to a feature or topic branch instead." >&2
    exit 2
  fi
  [[ "$cmd" =~ gh[[:space:]]+pr[[:space:]]+merge ]] || exit 0
  # A pull request number after "merge", or the current branch's PR when none.
  pr=$(grep -oE 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]]+#?[0-9]+' <<<"$cmd" | grep -oE '[0-9]+$')
  base=$(gh pr view ${pr:+"$pr"} --json baseRefName -q .baseRefName 2>/dev/null)
elif [[ "$tool" == *merge_pull_request ]]; then
  owner=$(jq -r '.tool_input.owner' <<<"$input")
  repo=$(jq -r '.tool_input.repo' <<<"$input")
  pr=$(jq -r '.tool_input.pullNumber' <<<"$input")
  base=$(gh api "repos/$owner/$repo/pulls/$pr" -q .base.ref 2>/dev/null)
else
  exit 0
fi

if [[ "$base" != feat/* ]]; then
  echo "Blocked: agents never merge pull requests into main or any branch outside feat/** (base: ${base:-unknown})." >&2
  exit 2
fi
exit 0
