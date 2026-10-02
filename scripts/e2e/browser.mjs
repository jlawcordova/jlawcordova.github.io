// Finds the environment's Playwright and launches Chromium for the browser
// checks in scripts/e2e/. Playwright is never a dependency of this repo: it's
// the project's own install if there is one, else the global one (npm root -g).
// ESM ignores NODE_PATH, so the global install is imported by file URL.
// Only Playwright's long-stable core API is used (pixel-art engine spec A10).
//
// E2E_PLAYWRIGHT_ROOT replaces the global root, so tests can point it at an
// empty directory to check the NOT RUN path.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The Playwright module, or null if there isn't one. */
export async function loadPlaywright() {
  try {
    return normalize(await import('playwright'));
  } catch {
    // Not installed in the project; try the global root.
  }
  const root = globalRoot();
  if (!root) return null;
  const entry = join(root, 'playwright', 'index.js');
  if (!existsSync(entry)) return null;
  try {
    return normalize(await import(pathToFileURL(entry).href));
  } catch {
    return null;
  }
}

function globalRoot() {
  if (process.env.E2E_PLAYWRIGHT_ROOT !== undefined) return process.env.E2E_PLAYWRIGHT_ROOT;
  try {
    return execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** The CommonJS entry comes through as a default export. */
function normalize(mod) {
  const pw = mod?.chromium ? mod : mod?.default;
  return pw?.chromium ? pw : null;
}

/**
 * Launches headless Chromium. When PLAYWRIGHT_BROWSERS_PATH holds a `chromium`
 * executable (as cloud sessions provide), that one is used, so a global
 * Playwright whose own browser build differs still runs.
 */
export async function launch(playwright) {
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const executable = dir ? join(dir, 'chromium') : '';
  return playwright.chromium.launch(executable && existsSync(executable) ? { executablePath: executable } : {});
}
