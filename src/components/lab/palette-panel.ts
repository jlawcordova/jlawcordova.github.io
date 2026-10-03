// The Palette panel (spec D9.5): the world palette laid out as its design
// language, a row per material from highlight to shadow, then ink, cream
// and the skin tones. Outfit colors show for objects that extend character,
// and legacy colors, collapsed, for legacy objects. The usage meter counts
// the object's colors against the 12-color cap (R27), turns to the warning
// style past the 6–8 target, and at 12 turns off every swatch not in use.

import { CAPS, usedColors } from '../../lib/pixel-art/engine.mjs';
import type { ObjectMode } from './object-mode';

const $ = (id: string) => document.getElementById(id)!;

/** The world palette's rows: each 4-shade material ramp, then the rest. */
function worldRows(world: Record<string, string>): { title: string; names: string[] }[] {
  const ramps = new Map<string, string[]>();
  for (const name of Object.keys(world)) {
    const m = /^(.+)-\d$/.exec(name);
    const ramp = m ? m[1] : '';
    ramps.set(ramp, [...(ramps.get(ramp) ?? []), name]);
  }
  const rows: { title: string; names: string[] }[] = [];
  const rest: string[] = [];
  for (const [ramp, names] of ramps) {
    if (ramp && names.length === 4) rows.push({ title: ramp, names });
    else rest.push(...names);
  }
  return [...rows, { title: 'ink, cream, skin', names: rest }];
}

export class PalettePanel {
  private readonly mode: ObjectMode;
  private built = '';

  constructor(mode: ObjectMode) {
    this.mode = mode;
    $('lab-palette').addEventListener('click', (e) => {
      const swatch = (e.target as Element).closest<HTMLButtonElement>('[data-color]');
      if (!swatch) return;
      const color = swatch.dataset.color!;
      if (!this.allowed(color)) return this.mode.lab.announce(this.whyNot(color));
      this.mode.setColor(color);
    });
  }

  private get flags() {
    const r = this.mode.resolved;
    return { legacy: Boolean(r?.legacy), character: Boolean(r?.character) };
  }

  /** The hex values the object paints, kept until the sources change. */
  private used() {
    const sources = this.mode.lab.sources;
    if (this.usedFor !== sources) {
      this.usedFor = sources;
      const r = this.mode.resolved;
      this.usedCache = new Set(r ? usedColors(sources, r) : []);
    }
    return this.usedCache;
  }
  private usedFor: unknown = null;
  private usedCache = new Set<string>();

  /** Whether the object may paint a color: its tier, then the 12-color cap. */
  allowed(color: string) {
    const { legacy, character } = this.flags;
    const entry = this.mode.lab.sources.colors.get(color);
    if (!entry) return false;
    if (legacy) return true;
    if (entry.tier === 'legacy' || (entry.tier === 'outfit' && !character)) return false;
    const used = this.used();
    return used.has(entry.hex) || used.size < CAPS.colors;
  }

  whyNot(color: string) {
    const tier = this.mode.lab.sources.colors.get(color)?.tier;
    if (tier === 'legacy') return `${color} is a legacy color; only imported art may use it`;
    if (tier === 'outfit') return `${color} is an outfit color; only objects that extend character may use it`;
    return `This object already uses ${CAPS.colors} colors. Pick one it uses, or free one up first.`;
  }

  private swatch(name: string, hex: string) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lab-swatch';
    b.dataset.color = name;
    b.style.setProperty('--swatch', hex);
    b.setAttribute('aria-label', `${name}, ${hex}`);
    b.title = `${name}, ${hex}`;
    return b;
  }

  private group(title: string, rows: { title: string; names: string[] }[], collapsed = false): HTMLElement[] {
    const palette = this.mode.lab.data.palette;
    const all: Record<string, string> = { ...palette.world, ...palette.outfit, ...palette.legacy };
    const body = rows.map(({ title: label, names }) => {
      const row = document.createElement('div');
      row.className = 'lab-swatches';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', label);
      row.append(...names.map((n) => this.swatch(n, all[n])));
      return row;
    });
    if (!collapsed) {
      // h3: the Palette's own heading is the panel's h2.
      const h = Object.assign(document.createElement('h3'), { className: 'label lab-palette__group', textContent: title });
      return [h, ...body];
    }
    const details = document.createElement('details');
    details.className = 'lab-palette__legacy';
    details.append(Object.assign(document.createElement('summary'), { className: 'label', textContent: title }), ...body);
    return [details];
  }

  /** Rebuilds the swatches when the object's tiers change, then marks the current and the off ones. */
  render() {
    const { legacy, character } = this.flags;
    const palette = this.mode.lab.data.palette;
    const sig = `${legacy}|${character}`;
    const host = $('lab-palette');
    if (sig !== this.built) {
      this.built = sig;
      const parts = this.group('World', worldRows(palette.world));
      if (character) parts.push(...this.group('Outfit', [{ title: 'outfit', names: Object.keys(palette.outfit) }]));
      if (legacy) {
        const names = Object.keys(palette.legacy);
        const rows = Array.from({ length: Math.ceil(names.length / 8) }, (_, i) => ({ title: `legacy ${i + 1}`, names: names.slice(i * 8, i * 8 + 8) }));
        parts.push(...this.group('Legacy', rows, true));
      }
      host.replaceChildren(...parts);
    }
    const blocked = this.mode.isBlock;
    for (const swatch of host.querySelectorAll<HTMLButtonElement>('[data-color]')) {
      const name = swatch.dataset.color!;
      swatch.setAttribute('aria-pressed', String(name === this.mode.color));
      swatch.setAttribute('aria-disabled', String(blocked || !this.allowed(name)));
    }
    const meter = $('lab-meter');
    const count = this.used().size;
    meter.textContent = blocked ? 'A block takes its colors from its faces, in the Object panel.' : legacy ? `Colors used: ${count} (legacy, no cap)` : `Colors used: ${count} of ${CAPS.colors}`;
    meter.classList.toggle('is-warning', !legacy && !blocked && count >= 9);
  }
}
