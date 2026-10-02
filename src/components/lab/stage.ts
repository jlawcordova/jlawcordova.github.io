// The stage (spec D9.4): renders the open scene with the engine into an
// ImageData at 1×, then draws it onto the canvas at an integer zoom with no
// smoothing, and draws the overlays on top: the tile grid, the tile under
// the pointer or cursor, and the selected item's outline.

import { bounds, composite, loadSources, renderObject, renderScene, type Sources } from '../../lib/pixel-art/engine.mjs';
import { pxToTile, tilePixels, tileToPx } from '../../lib/pixel-art/iso.mjs';
import { samePath, type Lab, type Path } from './lab';

interface Art {
  /** "x,y" → color name, relative to the placement point. */
  pixels: Map<string, string>;
  box: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

/** An item that shows on the stage, with its placement point. */
export interface Placed {
  path: Path;
  item: any;
  x: number;
  y: number;
  art: Art;
}

/** The outline of a tile centered on (0, 0): the pixels with a neighbour outside it. */
const TILE_OUTLINE = (() => {
  const inside = new Set(tilePixels(0, 0));
  return [...inside]
    .map((p) => p.split(',').map(Number))
    .filter(([x, y]) => [`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`].some((n) => !inside.has(n)));
})();

/** Where an item's placement point is, in scene pixels. */
export function placementPoint(item: any, origin: number[]): [number, number] {
  return item.at?.tile ? tileToPx(item.at.tile, origin) : [item.at?.px?.[0] ?? 0, item.at?.px?.[1] ?? 0];
}

const isVariant = (item: any) => item && 'group' in item && 'data-class' in (item.group ?? {});

/**
 * The scene as the stage shows it. A run of sibling data-class groups is a
 * set of variants that the site shows one at a time (the Range outfits), so
 * only one shows: the one holding the selected item, or else the first.
 * Returns the trimmed items, and every item that shows, in paint order.
 */
export function visibleItems(items: any[], selected: Path | null, prefix: Path = []) {
  const kept: any[] = [];
  const leaves: { path: Path; item: any }[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const holder = run.find((i) => selected && selected.length > prefix.length && selected[prefix.length] === i);
    const shown = holder ?? run[0];
    const sub = visibleItems(items[shown].items ?? [], selected, [...prefix, shown]);
    kept.push({ ...items[shown], items: sub.kept });
    leaves.push(...sub.leaves);
    run = [];
  };
  items.forEach((item, i) => {
    if (isVariant(item)) return run.push(i);
    flush();
    if (item && 'group' in item) {
      const sub = visibleItems(item.items ?? [], selected, [...prefix, i]);
      kept.push({ ...item, items: sub.kept });
      leaves.push(...sub.leaves);
    } else {
      kept.push(item);
      leaves.push({ path: [...prefix, i], item });
    }
  });
  flush();
  return { kept, leaves };
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class Stage {
  readonly frame: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private readonly sheet: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base = document.createElement('canvas');
  private readonly lab: Lab;
  private readonly art = new Map<string, Art>();
  private baseKey = '';
  /** Every item that shows, in paint order. */
  placed: Placed[] = [];
  /** The tile and pixel under the pointer, if it's over the stage. */
  hover: { tile: [number, number, number]; px: [number, number] } | null = null;
  scale = 1;

  constructor(lab: Lab) {
    this.lab = lab;
    this.frame = document.getElementById('lab-stage')!;
    this.sheet = this.frame.querySelector('.lab-stage__sheet')!;
    this.canvas = document.getElementById('lab-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    lab.on(() => this.render());
    new ResizeObserver(() => this.lab.zoom === 'fit' && this.draw()).observe(this.frame);
    this.frame.addEventListener('focus', () => this.draw());
    this.frame.addEventListener('blur', () => this.draw());
  }

  get origin(): number[] {
    return this.lab.doc?.origin ?? [0, 0];
  }

  get viewBox(): number[] {
    return this.lab.doc.viewBox;
  }

  /** An object drawn on its own, with its anchor at (0, 0). Objects don't change in Scene mode. */
  objectArt(sources: Sources, name: string): Art {
    let art = this.art.get(name);
    if (!art) {
      let pixels = new Map<string, string>();
      try {
        pixels = composite(renderObject(sources, name));
      } catch {
        // A missing object shows as nothing; the problems list names it.
      }
      art = { pixels, box: bounds(pixels.keys()) };
      this.art.set(name, art);
    }
    return art;
  }

  /** Re-renders the scene if it changed, then redraws. */
  render() {
    const { lab } = this;
    if (!lab.doc) return;
    const { kept, leaves } = visibleItems(lab.doc.items ?? [], lab.selected);
    const view = { ...lab.doc, items: kept };
    const key = JSON.stringify(view);
    if (key !== this.baseKey) {
      this.baseKey = key;
      this.paintBase(view);
      this.placed = leaves.map(({ path, item }) => {
        const [x, y] = placementPoint(item, this.origin);
        return { path, item, x, y, art: this.objectArt(lab.sources, item.object) };
      });
    }
    this.draw();
  }

  /** The engine's render of the scene, at 1×, on the offscreen canvas. */
  private paintBase(view: any) {
    const [vx, vy, w, h] = view.viewBox;
    this.base.width = w;
    this.base.height = h;
    const ctx = this.base.getContext('2d')!;
    const image = ctx.createImageData(w, h);
    try {
      const { palette, objects } = this.lab.data;
      const sources = loadSources({ palette, objects, scenes: { [this.lab.name]: view } });
      for (const [p, color] of composite(renderScene(sources, this.lab.name).root)) {
        const comma = p.indexOf(',');
        const x = Number(p.slice(0, comma)) - vx;
        const y = Number(p.slice(comma + 1)) - vy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const hex = sources.colors.get(color)?.hex ?? '#000000';
        const i = (y * w + x) * 4;
        image.data[i] = parseInt(hex.slice(1, 3), 16);
        image.data[i + 1] = parseInt(hex.slice(3, 5), 16);
        image.data[i + 2] = parseInt(hex.slice(5, 7), 16);
        image.data[i + 3] = 255;
      }
    } catch {
      // An invalid draft draws what it can; the problems count says why.
    }
    ctx.putImageData(image, 0, 0);
  }

  /** The largest whole zoom at which the scene fits the frame. */
  fitZoom() {
    const [, , w, h] = this.viewBox;
    const style = getComputedStyle(this.frame);
    const width = this.frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = this.frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return Math.max(1, Math.min(8, Math.floor(Math.min(width / w, height / h))));
  }

  /** Draws the rendered scene at the current zoom, then the overlays. */
  draw() {
    const { lab, ctx } = this;
    if (!lab.doc) return;
    const [vx, vy, w, h] = this.viewBox;
    const z = (this.scale = lab.zoom === 'fit' ? this.fitZoom() : lab.zoom);
    if (this.canvas.width !== w * z || this.canvas.height !== h * z) {
      this.canvas.width = w * z;
      this.canvas.height = h * z;
      this.canvas.style.width = `${w * z}px`;
      this.canvas.style.height = `${h * z}px`;
    }
    // The faint .isogrid behind the canvas, scaled and lined up with the tiles.
    const [ox, oy] = this.origin;
    this.sheet.style.backgroundSize = `${32 * z}px ${16 * z}px`;
    this.sheet.style.backgroundPosition = `${(ox - vx) * z}px ${(oy - vy) * z}px`;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.base, 0, 0, w * z, h * z);

    const ink = css('--color-ink');
    if (lab.grid) {
      ctx.globalAlpha = 0.25;
      for (const [cx, cy] of this.tilesInView()) this.outline(cx, cy, ink);
      ctx.globalAlpha = 1;
    }
    const tile = this.hover?.tile ?? (document.activeElement === this.frame ? lab.cursor : null);
    if (tile) {
      ctx.globalAlpha = 0.5;
      this.outline(...tileToPx(tile, this.origin), ink);
      ctx.globalAlpha = 1;
    }
    const box = this.selectedBox();
    if (box) {
      ctx.strokeStyle = css('--color-accent');
      ctx.lineWidth = 1;
      ctx.strokeRect((box.minX - vx) * z - 0.5, (box.minY - vy) * z - 0.5, (box.maxX - box.minX + 1) * z + 1, (box.maxY - box.minY + 1) * z + 1);
    }
    document.getElementById('lab-empty')!.hidden = (lab.doc.items ?? []).length > 0;
  }

  /** Draws a tile's outline at the current zoom. */
  private outline(cx: number, cy: number, color: string) {
    const [vx, vy] = this.viewBox;
    const z = this.scale;
    this.ctx.fillStyle = color;
    for (const [dx, dy] of TILE_OUTLINE) this.ctx.fillRect((cx + dx - vx) * z, (cy + dy - vy) * z, z, z);
  }

  /** The centers of every level-0 tile that touches the view. */
  private *tilesInView(): Generator<[number, number]> {
    const [vx, vy, w, h] = this.viewBox;
    const corners = [[vx, vy], [vx + w, vy], [vx, vy + h], [vx + w, vy + h]].map((p) => pxToTile(p, 0, this.origin));
    const cols = corners.map(([c]) => c);
    const rows = corners.map(([, r]) => r);
    for (let col = Math.min(...cols) - 1; col <= Math.max(...cols) + 1; col++) {
      for (let row = Math.min(...rows) - 1; row <= Math.max(...rows) + 1; row++) {
        const [cx, cy] = tileToPx([col, row, 0], this.origin);
        if (cx + 16 >= vx && cx - 16 <= vx + w && cy + 8 >= vy && cy - 8 <= vy + h) yield [cx, cy];
      }
    }
  }

  /** The selected item's bounding box in scene pixels, if it shows. */
  selectedBox() {
    const placed = this.placed.find((p) => samePath(p.path, this.lab.selected));
    const box = placed?.art.box;
    if (!placed || !box) return null;
    return { minX: box.minX + placed.x, minY: box.minY + placed.y, maxX: box.maxX + placed.x, maxY: box.maxY + placed.y };
  }

  /** The scene pixel under a pointer position. */
  toScene(clientX: number, clientY: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const [vx, vy] = this.viewBox;
    return [Math.floor((clientX - rect.left) / this.scale) + vx, Math.floor((clientY - rect.top) / this.scale) + vy];
  }

  /** The level-0 tile under a scene pixel. */
  tileAt(px: number[], level = 0): [number, number, number] {
    return pxToTile(px, level, this.origin);
  }

  /** The front-most item that paints the pixel, if any. */
  hitTest([x, y]: number[]): Path | null {
    for (let i = this.placed.length - 1; i >= 0; i--) {
      const p = this.placed[i];
      if (p.art.pixels.has(`${x - p.x},${y - p.y}`)) return p.path;
    }
    return null;
  }

  /** Scrolls the stage frame so the scene pixel shows. */
  reveal(x: number, y: number) {
    const [vx, vy] = this.viewBox;
    const left = this.canvas.offsetLeft + (x - vx) * this.scale;
    const top = this.canvas.offsetTop + (y - vy) * this.scale;
    const { frame } = this;
    if (left < frame.scrollLeft || left > frame.scrollLeft + frame.clientWidth - this.scale) frame.scrollLeft = left - frame.clientWidth / 2;
    if (top < frame.scrollTop || top > frame.scrollTop + frame.clientHeight - this.scale) frame.scrollTop = top - frame.clientHeight / 2;
  }
}
