// Pixel Lab's program, pinned (Pixel Lab v0.6.0 spec R10): downloads the
// release's pixellab executable for this platform into .pixellab-bin/<version>/,
// checks the tarball against the hash pinned here and the release's SHA256SUMS,
// then runs it with the arguments given.
//
//   node scripts/pixellab.mjs art build --site .   # what npm run art does
//   npm run pixellab -- check                      # any command, on this checkout
//
// The download happens once; later runs find the executable and go straight to
// it. Nothing is installed outside the repo.

import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION = 'v0.7.0';
export const RELEASE = `https://github.com/jlawcordova/jlawcordova-lab/releases/download/${VERSION}`;

/** The release's tarballs, by `${platform}-${arch}`, with their SHA-256 from its SHA256SUMS. */
export const ASSETS = {
  'darwin-arm64': {
    file: 'pixellab-darwin-arm64.tar.gz',
    sha256: '16956eee72375cb76b6407826eb11886da1a29b4e399e5be49de56b7ebaea3a0',
  },
  'linux-x64': {
    file: 'pixellab-linux-x64.tar.gz',
    sha256: 'fe124e880b52e2dfb08135d33c711f1d5eaffedb8155d519700eb4e9f254d877',
  },
};

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** The tarball for a platform, or an error naming the two the release has. */
export function assetFor(platform = process.platform, arch = process.arch, assets = ASSETS) {
  const asset = assets[`${platform}-${arch}`];
  if (!asset) {
    throw new Error(`Pixel Lab ${VERSION} has programs for macOS on Apple silicon and Linux on x64 only, not ${platform}-${arch}`);
  }
  return asset;
}

/** Where the executable lives in a checkout. */
export const programPath = (root = ROOT) => join(root, '.pixellab-bin', VERSION, 'pixellab');

/** Whether the file at `path` is this version's program. */
function isProgram(path) {
  if (!existsSync(path)) return false;
  const run = spawnSync(path, ['--version'], { encoding: 'utf8' });
  return run.status === 0 && run.stdout.trim() === `pixellab ${VERSION.slice(1)}`;
}

/** The hash SHA256SUMS lists for `file`, if any. */
export function listedHash(sums, file) {
  for (const line of sums.split('\n')) {
    const [hash, name] = line.trim().split(/\s+\*?/);
    if (name === file) return hash;
  }
  return undefined;
}

/**
 * The path of this version's program, downloading and checking it first when
 * it isn't there yet. `fetch`, `platform`, `arch`, `assets` and `check` are parameters
 * so the tests can run it offline.
 * @param {{ root?: string, fetch?: typeof globalThis.fetch, platform?: string, arch?: string, assets?: typeof ASSETS, check?: (path: string) => boolean, log?: (line: string) => void }} [options]
 */
export async function ensureProgram({ root = ROOT, fetch = globalThis.fetch, platform, arch, assets = ASSETS, check = isProgram, log = (line) => console.error(line) } = {}) {
  const path = programPath(root);
  if (check(path)) return path;

  const { file, sha256 } = assetFor(platform, arch, assets);
  const dir = join(root, '.pixellab-bin');
  const tmp = join(dir, `tmp-${randomBytes(6).toString('hex')}`);
  await mkdir(tmp, { recursive: true });
  try {
    log(`pixellab: downloading ${file} (${VERSION})`);
    const get = async (name) => {
      const res = await fetch(`${RELEASE}/${name}`);
      if (!res.ok) throw new Error(`pixellab: ${name}: HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    };
    const tarball = await get(file);
    const sums = (await get('SHA256SUMS')).toString('utf8');
    const actual = createHash('sha256').update(tarball).digest('hex');
    const listed = listedHash(sums, file);
    if (actual !== sha256 || actual !== listed) {
      throw new Error(
        `pixellab: ${file} doesn't match (sha256 ${actual}; pinned ${sha256}; SHA256SUMS ${listed ?? 'has no line for it'}). Nothing was installed.`,
      );
    }
    const archive = join(tmp, file);
    await writeFile(archive, tarball);
    const tar = spawnSync('tar', ['-xzf', archive, '-C', tmp, 'pixellab'], { encoding: 'utf8' });
    if (tar.status !== 0) throw new Error(`pixellab: couldn't extract ${file}: ${tar.stderr.trim()}`);
    await mkdir(join(dir, VERSION), { recursive: true });
    await rename(join(tmp, 'pixellab'), path);
    if (!check(path)) {
      await rm(path, { force: true });
      throw new Error(`pixellab: the extracted program doesn't report pixellab ${VERSION.slice(1)}`);
    }
    log(`pixellab: installed ${VERSION} in ${join('.pixellab-bin', VERSION)}`);
    return path;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/** The program's stdout for one command, for scripts and tests that read its JSON. */
export async function pixellab(/** @type {string[]} */ args) {
  const path = await ensureProgram();
  const run = spawnSync(path, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  return { status: run.status ?? 1, stdout: run.stdout, stderr: run.stderr };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let path;
  try {
    path = await ensureProgram();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  const child = spawn(path, process.argv.slice(2), { stdio: 'inherit' });
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}
