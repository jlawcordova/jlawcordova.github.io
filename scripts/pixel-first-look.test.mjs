// Guards for the pixel-first look (pixel-first look spec R1, R2, R3, R9): no
// rounded corners, no shadows and one backdrop blur anywhere the site's styles
// are written, no retired token left in use, border-thick in both token files,
// and motion as the only new dependency, pinned exactly. Reads files only.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(join(ROOT, path), 'utf8');

/** Every file under a folder whose name ends with one of the extensions. */
async function filesIn(dir, extensions) {
  const out = [];
  for (const entry of await readdir(join(ROOT, dir), { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(relative(ROOT, join(entry.parentPath, entry.name)));
    }
  }
  return out.sort();
}

/** The files where styles are written: stylesheets, components and the design system's previews. */
const styledFiles = async () => [
  ...(await filesIn('src', ['.css', '.astro'])),
  ...(await filesIn('docs/design-system/components', ['.html'])),
];

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/** Each value of a CSS property in a file, with its line number. */
function valuesOf(text, property) {
  const found = [];
  const pattern = new RegExp(`(?:^|[;{\\s"'])${property}\\s*:\\s*([^;}"']+)`, 'g');
  for (const match of stripComments(text).matchAll(pattern)) {
    found.push({ value: match[1].trim(), line: text.slice(0, match.index).split('\n').length });
  }
  return found;
}

/** Splits a box-shadow list on the commas that aren't inside parentheses. */
function shadows(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

/** A spread-only ring (offsets and blur all zero), like the focus halo. */
function isRing(shadow) {
  const lengths = shadow.replace(/\binset\b/, '').trim().split(/\s+/).filter((t) => /^-?\d*\.?\d+(px|em|rem)?$/.test(t));
  return lengths.length >= 4 && lengths.slice(0, 3).every((t) => parseFloat(t) === 0);
}

describe('pixel-first look', () => {
  it('R1: every border-radius is 0 or a radius token, and every radius token is 0', async () => {
    const bad = [];
    for (const file of await styledFiles()) {
      for (const { value, line } of valuesOf(await read(file), 'border-radius')) {
        if (!/^(0|var\(--radius-[a-z]+\))$/.test(value)) bad.push(`${file}:${line} border-radius: ${value}`);
      }
    }
    assert.deepEqual(bad, []);

    const css = await read('src/styles/variables.css');
    const tokens = [...css.matchAll(/--(radius-[a-z]+)\s*:\s*([^;]+);/g)];
    assert.ok(tokens.length > 0, 'variables.css defines the radius tokens');
    for (const [, name, value] of tokens) assert.equal(value.trim(), '0', `--${name} is 0`);
  });

  it('R2: no box-shadow has an offset or a blur; only spread-only rings are left', async () => {
    const bad = [];
    for (const file of await styledFiles()) {
      for (const { value, line } of valuesOf(await read(file), 'box-shadow')) {
        if (value === 'none') continue;
        for (const shadow of shadows(value)) {
          if (!isRing(shadow)) bad.push(`${file}:${line} box-shadow: ${shadow}`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('R2: the nav bar has the only backdrop blur', async () => {
    const found = [];
    for (const file of await styledFiles()) {
      const text = stripComments(await read(file));
      // A declaration, not the `(backdrop-filter: …)` test inside @supports.
      for (const match of text.matchAll(/(?:^|[;{\s"'])(?:-webkit-)?backdrop-filter\s*:/g)) {
        const before = text.slice(0, match.index);
        const selector = before.slice(before.lastIndexOf('}') + 1, before.lastIndexOf('{')).trim();
        found.push(`${file} ${selector}`);
      }
    }
    assert.deepEqual([...new Set(found)], ['src/styles/navigation.css .site-nav']);
  });

  it('R2: no retired token is used', async () => {
    const retired = ['shadow-pixel', 'shadow-pixel-pressed', 'shadow-pixel-accent', 'shadow-nav'];
    const files = [...(await styledFiles()), ...(await filesIn('src', ['.ts', '.mjs'])), 'docs/design-system/tokens.json'];
    const bad = [];
    for (const file of files) {
      const text = await read(file);
      for (const name of retired) if (new RegExp(`\\b${name}\\b(?!-)`).test(text)) bad.push(`${file}: ${name}`);
    }
    assert.deepEqual(bad, []);
  });

  it('R4, R10: UI motion is smooth; only the pixel art steps', async () => {
    // Stepped easing read as lag on the deployed site (spec amendment, 2026-10-05).
    const stepped = ['src/styles/pixel-art.css', 'src/styles/lab.css'];
    const bad = [];
    for (const file of [...(await styledFiles()), ...(await filesIn('src', ['.ts']))]) {
      if (stepped.includes(file) || file.startsWith('src/components/lab/')) continue;
      const text = stripComments(await read(file));
      if (/\bsteps\(|step-(?:start|end)\b/.test(text)) bad.push(file);
    }
    assert.deepEqual(bad, []);
  });

  it('the isometric grid draws whole lines through each cell, at the pixel art\'s 2:1 slope', async () => {
    // A stop at the gradient's start (`color 1px, transparent 1px`) only paints
    // a sliver in each cell's corner; the canvas's grid is a full lattice.
    const css = stripComments(await read('src/styles/layout.css'));
    const rule = (css.match(/\.isogrid\s*\{([^}]*)\}/)?.[1] ?? '').replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');
    const line = 'transparent calc(50% - 0.5px), var(--color-grid) calc(50% - 0.5px), var(--color-grid) calc(50% + 0.5px), transparent calc(50% + 0.5px)';
    for (const angle of ['26.565deg', '-26.565deg']) {
      assert.ok(rule.includes(`linear-gradient(${angle}, ${line})`), `a ${angle} line through the middle of each cell`);
    }
    assert.match(rule, /background-size:\s*32px 16px/);
  });

  it('R3: border-thick is in both token files, with the same value', async () => {
    const tokens = JSON.parse(await read('docs/design-system/tokens.json'));
    const thick = tokens.border?.tokens?.find((t) => t.name === 'border-thick');
    assert.ok(thick, 'tokens.json has border-thick');
    const css = await read('src/styles/variables.css');
    const match = css.match(/--border-thick\s*:\s*([^;]+);/);
    assert.ok(match, 'variables.css has --border-thick');
    assert.equal(match[1].trim(), thick.value);
  });

  it('R9: motion is the only new dependency, pinned exactly', async () => {
    const pkg = JSON.parse(await read('package.json'));
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['@astrojs/prism', 'astro', 'motion']);
    assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ['@astrojs/check', 'typescript']);
    assert.match(pkg.dependencies.motion, /^\d+\.\d+\.\d+$/, 'motion has an exact version');

    const lock = JSON.parse(await read('package-lock.json'));
    const installed = Object.keys(lock.packages);
    for (const name of ['react', 'react-dom']) {
      assert.ok(!installed.includes(`node_modules/${name}`), `${name} isn't installed`);
    }
  });

  it('isRing tells a ring from a shadow', () => {
    assert.equal(isRing('0 0 0 5px var(--color-page)'), true);
    assert.equal(isRing('4px 4px 0 var(--color-ink)'), false);
    assert.equal(isRing('0 8px 24px rgba(46, 36, 24, 0.08)'), false);
    assert.deepEqual(shadows('0 0 0 1px rgb(0, 0, 0), 2px 2px 0 red'), ['0 0 0 1px rgb(0, 0, 0)', '2px 2px 0 red']);
  });
});
