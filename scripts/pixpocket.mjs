// Pixpocket, the program that publishes the site's pixel art (formerly Pixel
// Lab): finds it on this machine and runs it on this checkout.
//
//   node scripts/pixpocket.mjs publish         # what npm run art does
//   npm run pixpocket -- check                 # any command, on this checkout
//
// Pixpocket's releases are private, so nothing is downloaded and CI doesn't
// have the program. The site takes only its output: `publish` writes the SVGs
// to src/assets/pixel-art/, and they're committed, with published.json beside
// them recording the document they were made from. Without the program,
// `publish` passes when that record still matches the document (so CI builds
// from the committed SVGs) and fails when the document has changed since.
//
// The program is, in order: $PIXPOCKET, `pixpocket` on the PATH, or a build in
// a checkout beside this one (../pixpocket/target/release/pixpocket).

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
/** The site's document, from the checkout's root. */
export const DOCUMENT = 'src/assets/pixel-art/jlawcordova.pixpocket';
/** What `publish` was last run on, from the checkout's root. */
export const RECORD = 'src/assets/pixel-art/published.json';

/** What a program at `path` calls itself (`pixpocket 0.26.0`), or undefined when it isn't Pixpocket. */
export function versionOf(/** @type {string} */ path) {
  const run = spawnSync(path, ['--version'], { encoding: 'utf8' });
  const said = run.status === 0 ? run.stdout.trim() : '';
  return /^pixpocket \S+$/.test(said) ? said : undefined;
}

/**
 * The program's path, or undefined when this machine doesn't have it.
 * `env` and `root` are parameters so the tests can point it elsewhere.
 * @param {{ env?: Record<string, string | undefined>, root?: string }} [options]
 */
export function findProgram({ env = process.env, root = ROOT } = {}) {
  const candidates = [env.PIXPOCKET, 'pixpocket', join(root, '../pixpocket/target/release/pixpocket')];
  return candidates.find((path) => path && versionOf(path));
}

/** Every file of a folder, as paths from it, sorted. */
async function filesIn(/** @type {string} */ dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split('\\').join('/'))
    .sort();
}

/** One hash over the document's sources: every file's path and bytes, in path order. */
export async function documentHash(root = ROOT) {
  const dir = join(root, DOCUMENT);
  const hash = createHash('sha256');
  for (const file of await filesIn(dir)) {
    if (file.startsWith('.')) continue;
    hash.update(`${file}\0`);
    hash.update(await readFile(join(dir, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** The record `publish` left, or undefined. */
export async function readRecord(root = ROOT) {
  const path = join(root, RECORD);
  return existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : undefined;
}

/** The program's output for one command, for scripts and tests that read its JSON; undefined without the program. */
export function pixpocket(/** @type {string[]} */ args) {
  const path = findProgram();
  if (!path) return undefined;
  const run = spawnSync(path, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  return { status: run.status ?? 1, stdout: run.stdout, stderr: run.stderr };
}

/** `publish`: compile the document's scenes, and record what they were made from. */
async function publish(/** @type {string | undefined} */ path) {
  const sources = await documentHash();
  if (!path) {
    const record = await readRecord();
    if (record?.sources === sources) {
      console.log('pixpocket: not installed here; the committed SVGs were published from this document, so they stand');
      return 0;
    }
    console.error(
      `pixpocket: the document (${DOCUMENT}) has changed since the committed SVGs were published, and Pixpocket isn't installed here to publish it again. ` +
        'Run `npm run art` where it is (set PIXPOCKET to the program) and commit what it writes.',
    );
    return 1;
  }
  const run = spawnSync(path, ['publish', '--site', ROOT], { stdio: 'inherit' });
  if (run.status !== 0) return run.status ?? 1;
  await writeFile(join(ROOT, RECORD), `${JSON.stringify({ sources, program: versionOf(path) }, null, 2)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const path = findProgram();
  if (args[0] === 'publish' && args.length === 1) {
    process.exit(await publish(path));
  }
  if (!path) {
    console.error('pixpocket: not installed here. Set PIXPOCKET to the program, put it on the PATH, or build it in ../pixpocket (cargo build --release).');
    process.exit(1);
  }
  const child = spawn(path, [...args, '--site', ROOT], { stdio: 'inherit' });
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}
