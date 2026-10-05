// The PreToolUse hook that keeps agents from updating main
// (.claude/hooks/block-main-merge.sh) blocks every push whose destination is
// main, and only those: a later word "main" elsewhere in a command, such as
// in a PR body, doesn't count. Runs the hook with bash, jq and git; no network
// (the gh pr merge path is not exercised here).

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const HOOK = join(ROOT, '.claude/hooks/block-main-merge.sh');

/** Runs the hook on a Bash tool call and returns its exit code. */
const run = (command, cwd = ROOT) =>
  spawnSync('bash', [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }),
    encoding: 'utf8',
  }).status;

describe('push guard (block-main-merge.sh)', () => {
  let repo;
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });

  before(() => {
    // A local "origin" and a clone whose branches track it, so a bare push
    // has a real push destination without any network.
    const dir = mkdtempSync(join(tmpdir(), 'push-guard-'));
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(dir, 'origin.git')]);
    repo = join(dir, 'work');
    execFileSync('git', ['init', '-q', '-b', 'main', repo]);
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'start');
    git('remote', 'add', 'origin', join(dir, 'origin.git'));
    git('push', '-q', '-u', 'origin', 'main');
    git('switch', '-q', '-c', 'tracks-main', '--track', 'origin/main');
    git('switch', '-q', '-c', 'no-upstream');
  });
  after(() => rmSync(join(repo, '..'), { recursive: true, force: true }));

  it('blocks a push that names main as its destination', () => {
    for (const command of [
      'git push origin main',
      'git push -u origin main',
      'git push origin HEAD:main',
      'git push origin +feat/x:refs/heads/main',
      'git push origin "main"',
      'git -C /tmp/x push origin main',
      'npm test && git push origin main',
      'git push --all origin',
    ]) {
      assert.equal(run(command), 2, command);
    }
  });

  it('blocks a bare push from a branch whose push destination is main', () => {
    git('switch', '-q', 'tracks-main');
    assert.equal(run('git push', repo), 2, 'git push in the repo');
    assert.equal(run(`git -C ${repo} push -q`), 2, 'git -C <repo> push');
    assert.equal(run(`cd ${repo} && git push`), 2, 'cd <repo> && git push');
    git('switch', '-q', 'no-upstream');
    assert.equal(run('git push', repo), 0, 'a branch with no upstream');
  });

  it('allows a push elsewhere, even when "main" appears later in the command', () => {
    for (const command of [
      'git push -q origin feat/range-isometric 2>&1 | grep -v "^remote"; gh pr create --body "The main session gathered them"',
      'git push -u origin fix/range-console-320',
      'git push origin feat/main-menu',
      'git push origin domain',
      'echo "git push origin main"',
      'git commit -m "merge main" && git push origin feat/x',
      'git log --oneline origin/main',
    ]) {
      assert.equal(run(command), 0, command);
    }
  });
});
