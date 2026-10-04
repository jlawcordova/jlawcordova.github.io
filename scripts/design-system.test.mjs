// The design system in docs/design-system/ can't drift from the site (design
// system copy spec R3, R4a): every component has guidelines and a preview,
// token names are unique, and every token with a custom property of the same
// name in src/styles/variables.css has the same value. Node built-ins only.

import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DS = join(ROOT, 'docs/design-system');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const exists = (path) => stat(path).then(() => true, () => false);

/** Each custom property's first value outside @media blocks: { name: value }. */
export const cssProperties = (css) => {
  const outside = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const props = {};
  for (const [, name, value] of outside.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!(name in props)) props[name] = value.trim();
  }
  return props;
};

/** A value compared without case or whitespace. */
export const normalize = (value) => String(value).toLowerCase().replace(/\s+/g, '');

/** Every token in tokens.json's list families, with its family. */
export const tokenList = (tokens) =>
  ['color', 'radius', 'spacing', 'shadow', 'layout'].flatMap((family) =>
    (tokens[family]?.tokens ?? []).map((token) => ({ family, ...token })),
  );

describe('design system', () => {
  it('R4a: every component has both a README and a preview', async () => {
    const dir = join(DS, 'components');
    const names = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    assert.ok(names.length >= 12, `at least 12 components, found ${names.length}`);
    for (const name of names) {
      assert.ok(await exists(join(dir, name, 'README.md')), `${name} has README.md`);
      assert.ok(await exists(join(dir, name, 'preview.html')), `${name} has preview.html`);
    }
  });

  it('tokens.json parses and every token name is unique', async () => {
    const tokens = JSON.parse(await read('docs/design-system/tokens.json'));
    const names = tokenList(tokens).map((t) => t.name);
    const repeated = names.filter((name, i) => names.indexOf(name) !== i);
    assert.deepEqual(repeated, []);
  });

  it('R3: tokens match the custom properties in variables.css', async () => {
    const tokens = tokenList(JSON.parse(await read('docs/design-system/tokens.json')));
    const css = cssProperties(await read('src/styles/variables.css'));
    let compared = 0;
    for (const { name, value } of tokens) {
      const property = css[name];
      if (property === undefined || property.includes('var(')) continue;
      assert.equal(normalize(value), normalize(property), `${name}: tokens.json has ${value}, variables.css has ${property}`);
      compared++;
    }
    assert.ok(compared >= 25, `compared ${compared} tokens, expected at least 25`);
  });

  it('cssProperties skips values set inside @media', () => {
    const css = ':root { --gutter: 24px; }\n@media (max-width: 480px) { :root { --gutter: 16px; } }';
    assert.deepEqual(cssProperties(css), { gutter: '24px' });
  });
});
