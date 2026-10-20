// Drawing helpers for the blog's diagrams (scripts/diagrams/diagrams.mjs), in
// the design system's diagram style (docs/design-system/README.md,
// Iconography): boxes in color-surface with a color-border edge, flows in
// color-ink, one path in color-accent, Sora for names and Silkscreen for short
// uppercase labels. Square corners, no shadows. Every helper returns SVG.

/** The light theme's tokens (src/styles/variables.css), as opaque colors on color-page. */
export const T = {
  page: '#F4EDE0',
  card: '#E9DCC6',
  surface: '#F9F5EC',
  ink: '#2E2418',
  muted: '#5C4B39',
  earth: '#5A3E2B',
  border: '#D2C6B8', // color-border-strong over color-page
  lifeline: '#B9A994',
  accent: '#3F6B45',
  accentTint: '#E3E6D3',
  gold: '#D8B66A',
};

export const FONT = "Sora, 'Segoe UI', system-ui, sans-serif";
export const PIXEL = "Silkscreen, ui-monospace, monospace";
export const CODE = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

export const esc = (/** @type {string} */ s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** A rough width of Sora text, for sizing boxes before the browser lays it out. */
export const textWidth = (/** @type {string} */ s, size = 13, weight = 400) => s.length * size * (weight >= 600 ? 0.62 : 0.58);

export function text(x, y, s, { size = 13, weight = 400, fill = T.ink, anchor = 'start', font = FONT, upper = false } = {}) {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${upper ? ' letter-spacing="0.5"' : ''}>${esc(upper ? s.toUpperCase() : s)}</text>`;
}

/** A Silkscreen label, uppercase, for a node's kind or a section's name. */
export const label = (x, y, s, opts = {}) => text(x, y, s, { size: 10, font: PIXEL, fill: T.muted, upper: true, ...opts });

export function rect(x, y, w, h, { fill = T.surface, stroke = T.border, width = 1.5, dash = '' } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

/**
 * A node: a box with its kind in Silkscreen over its name in Sora (one line
 * per "\n"), centered on (cx, top y).
 */
export function node(cx, y, name, kind, { w, h, accent = false, fill = T.surface } = {}) {
  const lines = name.split('\n');
  const width = w ?? Math.max(112, Math.ceil(Math.max(...lines.map((l) => textWidth(l, 13, 600))) + 28));
  const height = h ?? (kind ? 50 : 38) + (lines.length - 1) * 17;
  const x = cx - width / 2;
  const stroke = accent ? T.accent : T.border;
  const first = kind ? y + 37 : y + height / 2 + 5 - ((lines.length - 1) * 17) / 2;
  return {
    svg: [
      rect(x, y, width, height, { fill, stroke, width: accent ? 2 : 1.5 }),
      kind ? label(cx, y + 18, kind, { anchor: 'middle', fill: accent ? T.accent : T.muted }) : '',
      ...lines.map((l, i) => text(cx, first + i * 17, l, { size: 13, weight: 600, anchor: 'middle' })),
    ].join(''),
    x, y, w: width, h: height, cx, cy: y + height / 2,
  };
}

/** An arrowhead at (x, y) pointing along (dx, dy). */
export function head(x, y, dx, dy, fill) {
  const len = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / len, dy / len];
  const [px, py] = [-uy, ux];
  const back = 9;
  const half = 4.5;
  const pts = [[x, y], [x - ux * back + px * half, y - uy * back + py * half], [x - ux * back - px * half, y - uy * back - py * half]];
  return `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}"/>`;
}

/**
 * A flow along points [[x, y], …], with an arrowhead at the end (and the start if both).
 */
export function flow(points, { accent = false, dashed = false, both = false, color } = {}) {
  const c = color ?? (accent ? T.accent : T.ink);
  const w = accent ? 2.25 : 1.5;
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [a, b] = [points.at(-2), points.at(-1)];
  // Stop the line short of the tip so the head stays sharp.
  const out = [`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"${dashed ? ' stroke-dasharray="5 4"' : ''} stroke-linejoin="miter"/>`, head(b[0], b[1], b[0] - a[0], b[1] - a[1], c)];
  if (both) out.push(head(points[0][0], points[0][1], points[0][0] - points[1][0], points[0][1] - points[1][1], c));
  return out.join('');
}

/**
 * A chip in a card-colored box: a Silkscreen label (three words at most), or
 * with `prose`, a Sora name for a longer section title.
 */
export function chip(x, y, s, { anchor = 'start', accent = false, prose = false } = {}) {
  const w = Math.ceil(prose ? textWidth(s, 13, 600) + 24 : s.length * 8.2 + 16);
  const h = prose ? 26 : 20;
  const left = anchor === 'middle' ? x - w / 2 : x;
  const fill = accent ? T.accent : T.ink;
  const box = rect(left, y, w, h, { fill: accent ? T.accentTint : T.card, stroke: accent ? T.accent : T.border, width: 1 });
  return box + (prose
    ? text(left + w / 2, y + 17.5, s, { size: 13, weight: 600, anchor: 'middle', fill })
    : label(left + w / 2, y + 14, s, { anchor: 'middle', fill }));
}

/** Wraps parts in an <svg> of the given size, on color-page. */
export function svg(width, height, parts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rect(0, 0, width, height, { fill: T.page, stroke: 'none', width: 0 })}${parts.join('')}</svg>`;
}

/**
 * A sequence diagram.
 * @param {{ id: string, name: string, kind: string }[]} participants
 * @param {Array<
 *   { from: string, to: string, text: string, back?: boolean, accent?: boolean } |
 *   { self: string, text: string, accent?: boolean } |
 *   { section: string } |
 *   { group: string, from: string, to: string, items: any[] }
 * >} steps
 * @param {{ gap?: number, pad?: number }} [opts]
 */
export function sequence(participants, steps, { gap = 190, pad = 40 } = {}) {
  const heads = [];
  const col = new Map();
  let x = pad + 60;
  participants.forEach((p, i) => {
    if (i) x += p.gap ?? gap;
    col.set(p.id, x);
  });
  const width = x + 60 + pad + (participants.at(-1).extra ?? 0);
  const top = 24;
  for (const p of participants) heads.push(node(col.get(p.id), top, p.name, p.kind, { w: p.w }));
  const body = [];
  let y = top + 50 + 28;
  const depth = (/** @type {any[]} */ items, level) => {
    for (const s of items) {
      if ('section' in s) {
        y += 6;
        body.push(`<line x1="${pad - 16}" y1="${y + 13}" x2="${width - pad + 16}" y2="${y + 13}" stroke="${T.border}" stroke-width="1.5"/>`);
        body.push(chip(width / 2, y, s.section, { anchor: 'middle', prose: true }));
        y += 50;
      } else if ('group' in s) {
        const x1 = col.get(s.from) - 34 - (s.padLeft ?? 0);
        const x2 = col.get(s.to) + 34 + (s.padRight ?? 0);
        const start = y - 6;
        y += 32;
        depth(s.items, level + 1);
        y -= 8;
        body.unshift(rect(x1, start, x2 - x1, y - start, { fill: 'none', stroke: T.border, width: 1.5 }));
        body.push(chip(x1, start, s.group));
        y += 18;
      } else if ('self' in s) {
        const cx = col.get(s.self);
        body.push(text(cx + 12, y, s.text, { fill: s.accent ? T.accent : T.ink, weight: s.accent ? 600 : 400 }));
        body.push(flow([[cx, y + 8], [cx + 34, y + 8], [cx + 34, y + 22], [cx + 2, y + 22]], { accent: s.accent }));
        y += 44;
      } else {
        const [a, b] = [col.get(s.from), col.get(s.to)];
        const dir = Math.sign(b - a);
        const tx = dir > 0 ? a + 12 : b + 12;
        body.push(text(tx, y, s.text, { fill: s.accent ? T.accent : T.ink, weight: s.accent ? 600 : 400 }));
        body.push(flow([[a, y + 9], [b - dir * 2, y + 9]], { accent: s.accent, dashed: s.back }));
        y += 40;
      }
    }
  };
  depth(steps, 0);
  const height = y + 12;
  const lifelines = participants.map((p) => `<line x1="${col.get(p.id)}" y1="${top + 50}" x2="${col.get(p.id)}" y2="${height - 16}" stroke="${T.lifeline}" stroke-width="1.25" stroke-dasharray="4 4"/>`);
  return svg(width, height, [...lifelines, ...body, ...heads.map((h) => h.svg)]);
}

/**
 * A boxes-and-flows diagram, laid out by hand.
 * - nodes: { id, x, y (center), name, kind, w?, accent? }
 * - frames: { x, y, w, h, label } drawn first, with a Silkscreen chip on their top edge
 * - edges: { from, to, out?: 'l'|'r'|'t'|'b', in?: 'l'|'r'|'t'|'b', via?: [[x, y]], straight?, text?, at?: [x, y], accent?, dashed? }
 *   An edge leaves `from` on side `out` (default r) and enters `to` on side `in`
 *   (default l), through the `via` points; with none, it bends once halfway across.
 * - extra: more SVG drawn last, as strings or shapes with `svg` (an actor or a
 *   use case with an `id` can be an edge's end)
 */
export function graph(width, height, { nodes = [], frames = [], edges = [], extra = [] }) {
  const drawn = new Map(nodes.map((n) => {
    const { h } = node(n.x, 0, n.name, n.kind, { w: n.w });
    return [n.id, node(n.x, n.y - h / 2, n.name, n.kind, { w: n.w, accent: n.accent })];
  }));
  const boxes = new Map([...drawn, ...extra.filter((e) => e.id).map((e) => [e.id, e])]);
  const side = (n, s) => ({ l: [n.x, n.cy], r: [n.x + n.w, n.cy], t: [n.cx, n.y], b: [n.cx, n.y + n.h] })[s];
  const parts = frames.map((f) => rect(f.x, f.y, f.w, f.h, { fill: 'none', stroke: T.border, width: 1.5 }) + (f.label ? chip(f.x, f.y - 10, f.label) : ''));
  for (const e of edges) {
    const a = boxes.get(e.from);
    const b = boxes.get(e.to);
    const start = side(a, e.out ?? 'r');
    const end = side(b, e.in ?? 'l');
    let pts = [start, ...(e.via ?? []), end];
    if (!e.via && !e.straight && start[0] !== end[0] && start[1] !== end[1]) {
      const mid = Math.round((start[0] + end[0]) / 2);
      pts = [start, [mid, start[1]], [mid, end[1]], end];
    }
    parts.push(flow(pts, { accent: e.accent, dashed: e.dashed }));
    if (e.text) {
      const [tx, ty] = e.at ?? [(pts.at(-2)[0] + end[0]) / 2, end[1] - 8];
      const w = textWidth(e.text, 12) + 10;
      parts.push(rect(tx - w / 2, ty - 13, w, 18, { fill: T.page, stroke: 'none', width: 0 }));
      parts.push(text(tx, ty, e.text, { size: 12, anchor: 'middle', fill: e.accent ? T.accent : T.muted, weight: e.accent ? 600 : 400 }));
    }
  }
  parts.push(...[...drawn.values()].map((n) => n.svg), ...extra.map((e) => e.svg ?? e));
  return svg(width, height, parts);
}

/**
 * A UML actor drawn in pixel steps (square, no curves), feet at (cx, y + 54),
 * with its name below. Returns { svg, x, y, w, h, cx, cy } like a node.
 */
export function actor(cx, y, name) {
  const px = (x, yy, w, h) => `<rect x="${cx + x}" y="${y + yy}" width="${w}" height="${h}" fill="${T.ink}"/>`;
  const body = [
    // head: a square ring
    px(-7, 0, 14, 3), px(-7, 11, 14, 3), px(-7, 0, 3, 14), px(4, 0, 3, 14),
    // torso and arms
    px(-1.5, 14, 3, 20), px(-14, 20, 28, 3),
    // legs in 3-px steps
    px(-4.5, 34, 4.5, 6), px(-7.5, 39, 4.5, 6), px(-10.5, 44, 4.5, 6), px(-13.5, 49, 4.5, 5),
    px(0, 34, 4.5, 6), px(3, 39, 4.5, 6), px(6, 44, 4.5, 6), px(9, 49, 4.5, 5),
  ];
  return {
    svg: body.join('') + text(cx, y + 76, name, { size: 13, weight: 600, anchor: 'middle' }),
    x: cx - 16, y, w: 32, h: 84, cx, cy: y + 26,
  };
}

/** A table: its name over its attributes and their types, like a class box. */
export function table(x, y, name, rows, { w = 200 } = {}) {
  const h = 50 + rows.length * 26 + 8;
  return [
    rect(x, y, w, h),
    label(x + 14, y + 18, 'table'),
    text(x + 14, y + 37, name, { size: 14, weight: 600 }),
    `<line x1="${x}" y1="${y + 50}" x2="${x + w}" y2="${y + 50}" stroke="${T.border}" stroke-width="1.5"/>`,
    ...rows.map(([attr, type], i) => text(x + 14, y + 72 + i * 26, attr, { size: 13 }) + text(x + w - 14, y + 72 + i * 26, type, { size: 12, font: CODE, fill: T.muted, anchor: 'end' })),
  ].join('');
}

/** A UML use case: a box with stepped pixel corners, the pixel art's only curve. */
export function usecase(cx, cy, name, { w } = {}) {
  const width = w ?? Math.ceil(textWidth(name, 13, 600) + 44);
  const h = 40;
  const [x, y] = [cx - width / 2, cy - h / 2];
  const s = 4;
  const d = [
    [x + 3 * s, y], [x + width - 3 * s, y], [x + width - 3 * s, y + s], [x + width - s, y + s], [x + width - s, y + 3 * s], [x + width, y + 3 * s],
    [x + width, y + h - 3 * s], [x + width - s, y + h - 3 * s], [x + width - s, y + h - s], [x + width - 3 * s, y + h - s], [x + width - 3 * s, y + h],
    [x + 3 * s, y + h], [x + 3 * s, y + h - s], [x + s, y + h - s], [x + s, y + h - 3 * s], [x, y + h - 3 * s],
    [x, y + 3 * s], [x + s, y + 3 * s], [x + s, y + s], [x + 3 * s, y + s],
  ];
  return {
    svg: `<polygon points="${d.map((p) => p.join(',')).join(' ')}" fill="${T.surface}" stroke="${T.border}" stroke-width="1.5"/>` + text(cx, cy + 5, name, { size: 13, weight: 600, anchor: 'middle' }),
    x, y, w: width, h, cx, cy,
  };
}

/** A UML package: a folder tab with its name over a frame. */
export function pack(x, y, w, h, name, { title } = {}) {
  const tw = Math.ceil(textWidth(name, 13, 600) + 24);
  return rect(x, y, tw, 24, { fill: T.card, stroke: T.border, width: 1.5 }) + text(x + tw / 2, y + 17, name, { size: 13, weight: 600, anchor: 'middle' })
    + rect(x, y + 24, w, h - 24, { fill: 'none', stroke: T.border, width: 1.5 })
    + (title ? text(x + w / 2, y + 24 + (h - 24) / 2 + 5, title, { size: 15, weight: 600, anchor: 'middle' }) : '');
}
