import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { optimizeSvg, verifyLossless } from './optimize-pixel-art.mjs';

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">${body}</svg>`;
const rect = (x, y, w = 1, h = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"></rect>`;

/** Deterministic pseudo-random generator, so the fuzz fixture never changes. */
function lcg(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

describe('optimize-pixel-art', () => {
  it('merges a horizontal run of pixels into one path', () => {
    const out = optimizeSvg(svg(`<g fill="#111111">${rect(0, 0)}${rect(1, 0)}${rect(2, 0)}</g>`));
    assert.equal(out, svg('<path fill="#111111" d="M0 0h3v1h-3z"/>'));
  });

  it('merges identical runs in consecutive rows into a taller rectangle', () => {
    const out = optimizeSvg(svg(`<g fill="#111111">${rect(0, 0, 2)}${rect(0, 1)}${rect(1, 1)}</g>`));
    assert.equal(out, svg('<path fill="#111111" d="M0 0h2v2h-2z"/>'));
  });

  it('handles negative coordinates and overlapping rects', () => {
    const out = optimizeSvg(svg(`<g fill="#111111">${rect(-3, -2, 2)}${rect(-2, -2, 3)}</g>`));
    assert.equal(out, svg('<path fill="#111111" d="M-3 -2h4v1h-4z"/>'));
  });

  it('keeps class, data-class and element order', () => {
    const out = optimizeSvg(
      svg(
        `<g fill="#222222">${rect(0, 0)}</g>` +
          `<g class="pcloud pc0"><g fill="#333333">${rect(1, 1)}</g></g>` +
          `<g data-class="2"><g fill="#444444">${rect(2, 2)}</g><g fill="#222222">${rect(3, 3)}</g></g>`,
      ),
    );
    assert.equal(
      out,
      svg(
        '<path fill="#222222" d="M0 0h1v1h-1z"/>' +
          '<g class="pcloud pc0"><path fill="#333333" d="M1 1h1v1h-1z"/></g>' +
          '<g data-class="2"><path fill="#444444" d="M2 2h1v1h-1z"/><path fill="#222222" d="M3 3h1v1h-1z"/></g>',
      ),
    );
  });

  it('handles a class group wrapping several fill groups, nested two deep', () => {
    const out = optimizeSvg(svg(`<g class="wf w0"><g class="cbob"><g fill="#555555">${rect(0, 0)}${rect(0, 1)}</g></g></g>`));
    assert.equal(out, svg('<g class="wf w0"><g class="cbob"><path fill="#555555" d="M0 0h1v2h-1z"/></g></g>'));
  });

  it('leaves non-rect content untouched', () => {
    const body =
      '<polygon points="0,0 1,1 0,1" fill="#666666"></polygon>' +
      `<g fill="#777777">${rect(0, 0)}<circle cx="1" cy="1" r="1"></circle></g>` +
      '<g fill="#888888"></g>';
    assert.equal(optimizeSvg(svg(body)), svg(body));
  });

  it('keeps extra attributes of a fill group on the path', () => {
    const out = optimizeSvg(svg(`<g fill="#999999" opacity="0.5">${rect(0, 0)}</g>`));
    assert.equal(out, svg('<path fill="#999999" opacity="0.5" d="M0 0h1v1h-1z"/>'));
  });

  it('is lossless on a large random fixture', () => {
    const rand = lcg(42);
    let body = '';
    for (let g = 0; g < 6; g++) {
      body += `<g fill="#00000${g}">`;
      for (let i = 0; i < 400; i++) body += rect(Math.floor(rand() * 40) - 20, Math.floor(rand() * 30) - 10, 1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 2));
      body += '</g>';
    }
    const source = svg(`<g class="hf h0">${body}</g>`);
    assert.doesNotThrow(() => verifyLossless(source, optimizeSvg(source)));
  });

  it('fails when a group gains or loses a pixel', () => {
    const source = svg(`<g fill="#111111">${rect(0, 0, 3)}</g><g fill="#222222">${rect(0, 1)}</g>`);
    const output = optimizeSvg(source);
    assert.throws(() => verifyLossless(source, output.replace('h3v1h-3z', 'h2v1h-2z')), /#111111/);
    assert.throws(() => verifyLossless(source, output.replace('M0 1h1', 'M1 1h1')), /#222222/);
  });

  it('fails when the structure or z-order changes', () => {
    const source = svg(`<g class="a"><g fill="#111111">${rect(0, 0)}</g></g><g fill="#222222">${rect(1, 1)}</g>`);
    const output = optimizeSvg(source);
    assert.throws(() => verifyLossless(source, output.replace('class="a"', 'class="b"')));
    const swapped = svg('<g class="a"><path fill="#222222" d="M1 1h1v1h-1z"/></g><path fill="#111111" d="M0 0h1v1h-1z"/>');
    assert.throws(() => verifyLossless(source, swapped));
  });

  it('rejects markup it does not understand', () => {
    assert.throws(() => optimizeSvg(svg('<!-- note --><g fill="#111111">' + rect(0, 0) + '</g>')), /unsupported/i);
    assert.throws(() => optimizeSvg(svg(`<g fill="#111111"><rect x="0.5" y="0" width="1" height="1"></rect></g>`)), /whole-number/i);
  });
});
