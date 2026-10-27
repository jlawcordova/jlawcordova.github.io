// Tests of scripts/pixellab.mjs, the pinned Pixel Lab program (Pixel Lab
// v0.6.0 spec R10, R21). Offline: a fake fetch serves a tiny fake tarball.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { ASSETS, RELEASE, VERSION, assetFor, ensureProgram, listedHash, programPath } from './pixellab.mjs';

const temps = [];
after(() => Promise.all(temps.map((dir) => rm(dir, { recursive: true, force: true }))));
const temp = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pixellab-test-'));
  temps.push(dir);
  return dir;
};

/** A tarball holding one `pixellab` script (by default one that reports this version), and its SHA-256. */
async function fakeTarball(script = `#!/bin/sh\necho "pixellab ${VERSION.slice(1)}"\n`) {
  const dir = await temp();
  await writeFile(join(dir, 'pixellab'), script);
  await chmod(join(dir, 'pixellab'), 0o755);
  const file = join(dir, 'fake.tar.gz');
  assert.equal(spawnSync('tar', ['-czf', file, '-C', dir, 'pixellab']).status, 0);
  const bytes = await readFile(file);
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** A fetch that serves `files` by name under the release URL, and records what was asked for. */
function fakeFetch(files) {
  const asked = [];
  const fetch = async (url) => {
    asked.push(url);
    const name = String(url).slice(RELEASE.length + 1);
    if (!(name in files)) return new Response('missing', { status: 404 });
    return new Response(files[name]);
  };
  return { fetch, asked };
}

const check = (path) => existsSync(path) && spawnSync(path, ['--version'], { encoding: 'utf8' }).stdout.trim() === `pixellab ${VERSION.slice(1)}`;
const quiet = () => {};

describe('the pinned Pixel Lab program', () => {
  it('R10: pins a release tag and a SHA-256 for each of the two programs', () => {
    assert.match(VERSION, /^v\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(ASSETS).sort(), ['darwin-arm64', 'linux-x64']);
    for (const { file, sha256 } of Object.values(ASSETS)) {
      assert.match(file, /^pixellab-(darwin-arm64|linux-x64)\.tar\.gz$/);
      assert.match(sha256, /^[0-9a-f]{64}$/);
    }
  });

  it('R10: picks the tarball for macOS on arm64 and Linux on x64, and names both for anything else', () => {
    assert.equal(assetFor('darwin', 'arm64').file, 'pixellab-darwin-arm64.tar.gz');
    assert.equal(assetFor('linux', 'x64').file, 'pixellab-linux-x64.tar.gz');
    assert.throws(() => assetFor('darwin', 'x64'), /macOS on Apple silicon and Linux on x64 only, not darwin-x64/);
    assert.throws(() => assetFor('win32', 'x64'), /not win32-x64/);
  });

  it('reads a hash from SHA256SUMS by file name', () => {
    const sums = `${'a'.repeat(64)}  pixellab-darwin-arm64.tar.gz\n${'b'.repeat(64)}  pixellab-linux-x64.tar.gz\n`;
    assert.equal(listedHash(sums, 'pixellab-linux-x64.tar.gz'), 'b'.repeat(64));
    assert.equal(listedHash(sums, 'PixelLab.dmg'), undefined);
  });

  it('R10: installs the program when the tarball matches the pin and SHA256SUMS', async () => {
    const root = await temp();
    const { bytes, sha256 } = await fakeTarball();
    const assets = { 'linux-x64': { file: 'pixellab-linux-x64.tar.gz', sha256 } };
    const { fetch } = fakeFetch({ 'pixellab-linux-x64.tar.gz': bytes, SHA256SUMS: `${sha256}  pixellab-linux-x64.tar.gz\n` });
    const path = await ensureProgram({ root, fetch, platform: 'linux', arch: 'x64', assets, check, log: quiet });
    assert.equal(path, programPath(root));
    assert.ok(check(path));
    assert.deepEqual(await readdir(join(root, '.pixellab-bin')), [VERSION], 'no temp folder is left');
  });

  for (const [what, pin, listed] of [
    ['matches neither', '0'.repeat(64), '1'.repeat(64)],
    ['matches SHA256SUMS but not the pin', '0'.repeat(64), null],
    ['matches the pin but not SHA256SUMS', null, '1'.repeat(64)],
  ]) {
    it(`R10: refuses a tarball that ${what}, and leaves nothing installed`, async () => {
      const root = await temp();
      const { bytes, sha256 } = await fakeTarball();
      const assets = { 'linux-x64': { file: 'pixellab-linux-x64.tar.gz', sha256: pin ?? sha256 } };
      const { fetch } = fakeFetch({ 'pixellab-linux-x64.tar.gz': bytes, SHA256SUMS: `${listed ?? sha256}  pixellab-linux-x64.tar.gz\n` });
      await assert.rejects(ensureProgram({ root, fetch, platform: 'linux', arch: 'x64', assets, check, log: quiet }), /doesn't match.*Nothing was installed/);
      assert.ok(!existsSync(programPath(root)));
      assert.deepEqual(await readdir(join(root, '.pixellab-bin')), [], 'the download is removed');
    });
  }

  it("says why when the extracted program won't run, as on a Linux with an older glibc", async () => {
    const root = await temp();
    const loader = "pixellab: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.39' not found (required by pixellab)";
    const { bytes, sha256 } = await fakeTarball(`#!/bin/sh\ncat >&2 <<'EOF'\n${loader}\nEOF\nexit 1\n`);
    const assets = { 'linux-x64': { file: 'pixellab-linux-x64.tar.gz', sha256 } };
    const { fetch } = fakeFetch({ 'pixellab-linux-x64.tar.gz': bytes, SHA256SUMS: `${sha256}  pixellab-linux-x64.tar.gz\n` });
    await assert.rejects(ensureProgram({ root, fetch, platform: 'linux', arch: 'x64', assets, check, log: quiet }), /doesn't report pixellab .*GLIBC_2\.39' not found/);
    assert.ok(!existsSync(programPath(root)));
  });

  it('R10: skips the download when the program is already there', async () => {
    const root = await temp();
    await mkdir(join(root, '.pixellab-bin', VERSION), { recursive: true });
    await writeFile(programPath(root), `#!/bin/sh\necho "pixellab ${VERSION.slice(1)}"\n`);
    await chmod(programPath(root), 0o755);
    const { fetch, asked } = fakeFetch({});
    assert.equal(await ensureProgram({ root, fetch, platform: 'linux', arch: 'x64', check, log: quiet }), programPath(root));
    assert.deepEqual(asked, []);
  });

  it('R10: a failed download is an error, not an install', async () => {
    const root = await temp();
    const { fetch } = fakeFetch({});
    await assert.rejects(ensureProgram({ root, fetch, platform: 'linux', arch: 'x64', check, log: quiet }), /HTTP 404/);
    assert.ok(!existsSync(programPath(root)));
  });
});
