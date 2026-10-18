// The design system in docs/design-system/ can't drift from the site (design
// system copy spec R3, R4a): every component has guidelines and a preview,
// token names are unique, every token with a custom property of the same
// name in src/styles/variables.css has the same value, and every syntax-*
// color is one that src/styles/syntax.css uses. Each dark value matches the
// dark theme block, and text pairs stay AA in both themes (dark mode spec R6,
// R11). Node built-ins only.

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

/** The custom properties set in the rule whose selector is exactly `selector`. */
export const blockProperties = (css, selector) => {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = clean.indexOf(`${selector} {`);
  if (start === -1) return {};
  const body = clean.slice(start, clean.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
};

/** The WCAG contrast ratio of two opaque #RRGGBB colors. */
export const contrast = (a, b) => {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** A value compared without case or whitespace. */
export const normalize = (value) => String(value).toLowerCase().replace(/\s+/g, '');

/** Every token in tokens.json's list families, with its family. */
export const tokenList = (tokens) =>
  ['color', 'radius', 'border', 'spacing', 'shadow', 'layout'].flatMap((family) =>
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

  it('R3: every syntax-* token is a color syntax.css uses', async () => {
    // syntax.css sets the code colors as literals, not custom properties.
    const tokens = tokenList(JSON.parse(await read('docs/design-system/tokens.json'))).filter((t) => t.name.startsWith('syntax-'));
    const css = normalize(await read('src/styles/syntax.css'));
    assert.ok(tokens.length >= 11, `found ${tokens.length} syntax tokens`);
    for (const { name, value } of tokens) {
      assert.ok(css.includes(normalize(value)), `${name}: ${value} isn't in syntax.css`);
    }
  });

  it('dark mode R11: every dark value matches the [data-theme="dark"] block, and only those change', async () => {
    const tokens = tokenList(JSON.parse(await read('docs/design-system/tokens.json')));
    const dark = blockProperties(await read('src/styles/variables.css'), '[data-theme="dark"]');
    const withDark = tokens.filter((t) => t.dark !== undefined);
    assert.ok(withDark.length >= 10, `found ${withDark.length} tokens with a dark value`);
    for (const { name, dark: value } of withDark) {
      assert.equal(normalize(value), normalize(dark[name] ?? 'missing'), `${name}: tokens.json has ${value}, the dark block has ${dark[name]}`);
    }
    assert.deepEqual(Object.keys(dark).sort(), withDark.map((t) => t.name).sort(), 'the dark block sets exactly the tokens with a dark value');
  });

  it('dark mode R6: text pairs stay AA in both themes', async () => {
    const css = await read('src/styles/variables.css');
    const themes = { light: cssProperties(css), dark: { ...cssProperties(css), ...blockProperties(css, '[data-theme="dark"]') } };
    const pairs = [
      ['color-ink', 'color-page'], ['color-ink', 'color-hero'], ['color-ink', 'color-card'],
      ['color-ink-muted', 'color-page'], ['color-ink-muted', 'color-hero'], ['color-ink-muted', 'color-card'],
      ['color-accent', 'color-page'], ['color-accent', 'color-hero'], ['color-accent', 'color-card'],
      ['color-accent-hover', 'color-page'], ['color-on-accent', 'color-accent'], ['color-on-accent', 'color-accent-hover'],
      ['color-on-code', 'color-code'],
    ];
    for (const [theme, props] of Object.entries(themes)) {
      for (const [text, ground] of pairs) {
        const ratio = contrast(props[text], props[ground]);
        assert.ok(ratio >= 4.5, `${theme}: ${text} on ${ground} is ${ratio.toFixed(2)}:1`);
      }
    }
  });

  it('contrast measures WCAG ratios', () => {
    assert.equal(contrast('#000000', '#FFFFFF').toFixed(1), '21.0');
    assert.equal(contrast('#777777', '#777777').toFixed(1), '1.0');
  });

  it('cssProperties skips values set inside @media', () => {
    const css = ':root { --gutter: 24px; }\n@media (max-width: 480px) { :root { --gutter: 16px; } }';
    assert.deepEqual(cssProperties(css), { gutter: '24px' });
  });
});
