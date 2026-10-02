// `npm run e2e`: the browser checks (pixel-art engine spec D17). Serves the
// existing dist/ with `astro preview` on a free port, runs scripts/e2e/*.e2e.mjs
// with `node --test` (so the output ends in `# fail 0` like `npm test`), then
// stops the server. It doesn't build: run `npm run build` first.
//
// Exit codes: the test run's own code; 1 if dist/ is missing or the server
// doesn't start; 2 if Playwright isn't available, so the checks never pass
// silently. A NOT RUN result means not verified.
//
// Usage: npm run e2e [-- <test file or glob>...]

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const START_TIMEOUT_MS = 30_000;

async function main() {
  if (!(await loadPlaywright())) {
    console.error('Playwright not found: browser checks NOT RUN');
    return 2;
  }
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.error('Run npm run build first');
    return 1;
  }

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  // --ignore-lock keeps the server in the foreground, owned by this process,
  // even where Astro would background it for an AI agent, and leaves any
  // preview server you already have running alone.
  const server = spawn(
    join(ROOT, 'node_modules', '.bin', 'astro'),
    ['preview', '--ignore-lock', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let serverLog = '';
  server.stdout.on('data', (chunk) => (serverLog += chunk));
  server.stderr.on('data', (chunk) => (serverLog += chunk));

  try {
    if (!(await waitForServer(baseUrl, server))) {
      console.error(`astro preview didn't answer on ${baseUrl}/ within ${START_TIMEOUT_MS / 1000}s:\n${serverLog}`);
      return 1;
    }
    const patterns = process.argv.length > 2 ? process.argv.slice(2) : ['scripts/e2e/*.e2e.mjs'];
    const tests = spawn(process.execPath, ['--test', ...patterns], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, E2E_BASE_URL: baseUrl },
    });
    const [code, signal] = await new Promise((done) => tests.on('exit', (...args) => done(args)));
    return signal ? 1 : code;
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = new Promise((done) => server.on('exit', done));
      server.kill();
      await exited;
    }
  }
}

/** A port nothing is listening on, from the OS. */
function freePort() {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.on('error', fail);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (probe.address());
      probe.close(() => done(port));
    });
  });
}

/** Polls `/` until it answers 200. False on timeout, or if the server exits. */
async function waitForServer(baseUrl, server) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.status === 200) return true;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  return false;
}

process.exitCode = await main().catch((err) => {
  console.error(`e2e: ${err.stack ?? err.message}`);
  return 1;
});
