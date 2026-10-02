// Tests for the browser-check runner's guards (scripts/e2e/run.mjs). No
// browser and no network: each test copies the runner into a temp directory,
// so the project's own node_modules can't supply Playwright, and points
// E2E_PLAYWRIGHT_ROOT at a directory it controls.

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

/** A stand-in global Playwright: found, but never launched. */
async function fakePlaywright(root, exports = '{ chromium: {} }') {
  await mkdir(join(root, 'global', 'playwright'));
  await writeFile(join(root, 'global', 'playwright', 'index.js'), `module.exports = ${exports};\n`);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Polls until `check()` is true, for up to `ms`. */
async function waitFor(check, ms = 20_000) {
  for (const deadline = Date.now() + ms; Date.now() < deadline; await sleep(100)) if (await check()) return true;
  return false;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

  it('R35: exits 2 with "browser checks NOT RUN" when the global module isn\'t Playwright', async () => {
    const root = await tempCheckout();
    await fakePlaywright(root, '{}');
    const { status, output } = runE2e(root);
    assert.equal(status, 2, output);
    assert.match(output, /Playwright not found: browser checks NOT RUN/);
  });

  it('R35: exits 1 and asks for a build when dist/ is missing', async () => {
    const root = await tempCheckout();
    await fakePlaywright(root);
    const { status, output } = runE2e(root);
    assert.equal(status, 1, output);
    assert.match(output, /Run npm run build first/);
    assert.doesNotMatch(output, /NOT RUN/);
  });

  // It also proves the checks run under a parent `node --test` (as here), which
  // used to make them skip every file and exit 0.
  it('R35: runs the checks under node --test, and stops the server and tests when interrupted', async () => {
    const root = await tempCheckout();
    await fakePlaywright(root);
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist', 'index.html'), 'ok\n');
    // A stand-in `astro preview` that answers 200 and records its pid.
    const astro = join(root, 'node_modules', '.bin', 'astro');
    await mkdir(join(root, 'node_modules', '.bin'), { recursive: true });
    await writeFile(
      astro,
      [
        '#!/usr/bin/env node',
        "const port = Number(process.argv[process.argv.indexOf('--port') + 1]);",
        "require('node:fs').writeFileSync(require('node:path').join(__dirname, '../../server.pid'), String(process.pid));",
        "require('node:http').createServer((req, res) => res.end('ok')).listen(port, '127.0.0.1');",
        '',
      ].join('\n'),
    );
    await chmod(astro, 0o755);
    // A browser check that records its pid, then waits to be stopped.
    await writeFile(
      join(root, 'scripts', 'e2e', 'wait.e2e.mjs'),
      [
        "import { writeFileSync } from 'node:fs';",
        "import { test } from 'node:test';",
        "test('waits', () => { writeFileSync(new URL('../../tests.pid', import.meta.url), String(process.pid)); return new Promise((done) => setTimeout(done, 30_000)); });",
        '',
      ].join('\n'),
    );

    const runner = spawn(process.execPath, [join(root, 'scripts', 'e2e', 'run.mjs')], {
      cwd: root,
      env: { ...process.env, E2E_PLAYWRIGHT_ROOT: join(root, 'global') },
      stdio: 'ignore',
    });
    const exited = new Promise((done) => runner.on('exit', (code, signal) => done({ code, signal })));
    try {
      assert.ok(await waitFor(() => existsSync(join(root, 'tests.pid'))), 'the browser checks never started');
      const serverPid = Number(await readFile(join(root, 'server.pid'), 'utf8'));
      const testsPid = Number(await readFile(join(root, 'tests.pid'), 'utf8'));
      assert.ok(alive(serverPid) && alive(testsPid));

      runner.kill('SIGTERM');
      assert.deepEqual(await exited, { code: 143, signal: null });
      assert.ok(await waitFor(() => !alive(serverPid), 5_000), 'the preview server was left running');
      assert.ok(await waitFor(() => !alive(testsPid), 5_000), 'the browser checks were left running');
    } finally {
      runner.kill('SIGKILL');
    }
  });
});
