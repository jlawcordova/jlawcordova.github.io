// Tests for the browser-check runner's guards (scripts/e2e/run.mjs). No
// browser and no network: each test copies the runner into a temp directory,
// so the project's own node_modules can't supply Playwright, and points
// E2E_PLAYWRIGHT_ROOT at a directory it controls.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const E2E_DIR = fileURLToPath(new URL('./e2e/', import.meta.url));
const temps = [];

after(() => Promise.all(temps.map((dir) => rm(dir, { recursive: true, force: true }))));

/** A temp checkout with scripts/e2e/{browser,run}.mjs and no dist/. */
async function tempCheckout() {
  const root = await mkdtemp(join(tmpdir(), 'e2e-runner-'));
  temps.push(root);
  await mkdir(join(root, 'scripts', 'e2e'), { recursive: true });
  for (const file of ['browser.mjs', 'run.mjs']) await copyFile(join(E2E_DIR, file), join(root, 'scripts', 'e2e', file));
  await mkdir(join(root, 'global'));
  return root;
}

function runE2e(root) {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'e2e', 'run.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, E2E_PLAYWRIGHT_ROOT: join(root, 'global') },
    timeout: 30_000,
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

describe('e2e runner', () => {
  it('R35: exits 2 with "browser checks NOT RUN" when Playwright is missing', async () => {
    const root = await tempCheckout();
    const { status, output } = runE2e(root);
    assert.equal(status, 2, output);
    assert.match(output, /Playwright not found: browser checks NOT RUN/);
  });

  it('R35: exits 1 and asks for a build when dist/ is missing', async () => {
    const root = await tempCheckout();
    // A stand-in global Playwright: found, but never launched.
    await mkdir(join(root, 'global', 'playwright'));
    await writeFile(join(root, 'global', 'playwright', 'index.js'), 'module.exports = { chromium: {} };\n');
    const { status, output } = runE2e(root);
    assert.equal(status, 1, output);
    assert.match(output, /Run npm run build first/);
    assert.doesNotMatch(output, /NOT RUN/);
  });
});
