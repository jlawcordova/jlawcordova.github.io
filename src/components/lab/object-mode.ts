// Object mode (spec D9.5, R17): painting an object's pixels. The stage shows
// the object's map at a whole zoom over a checkerboard, with its bounds, its
// anchor and, for an outfit, a gutter marking the rows it overrides. Pencil,
// Eraser, Fill and Picker work with the pointer (a stroke is one undo step)
// and from the keyboard at the pixel cursor. Every change goes through
// edit.mjs, so the source stays canonical. The Palette, Layers and Frames
// panels are in their own modules.

import { CAPS, composite, layerMaps, paintedSize, renderObject, resolve, usedColors, type Resolved } from '../../lib/pixel-art/engine.mjs';
import { colorAt, floodFill, mapAt, overriddenRows, paint, resize } from '../../lib/pixel-art/edit.mjs';
import { tilePixels } from '../../lib/pixel-art/iso.mjs';
import { FramesPanel } from './frames-panel';
import type { Lab } from './lab';
import { LayersPanel } from './layers-panel';
import { PalettePanel } from './palette-panel';
import type { Stage } from './stage';

export type PaintTool = 'pencil' | 'eraser' | 'fill' | 'picker';
export type ObjectZoom = 4 | 8 | 12 | 16 | 'fit';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The pixels on a line from one pixel to another, so a fast stroke leaves no gaps. */
function line([x0, y0]: number[], [x1, y1]: number[]): [number, number][] {
  const out: [number, number][] = [];
  const [dx, dy] = [Math.abs(x1 - x0), -Math.abs(y1 - y0)];
  const [sx, sy] = [x0 < x1 ? 1 : -1, y0 < y1 ? 1 : -1];
  let err = dx + dy;
  for (let [x, y] = [x0, y0]; ; ) {
    out.push([x, y]);
    if (x === x1 && y === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) [err, x] = [err + dy, x + sx];
    if (e2 <= dx) [err, y] = [err + dx, y + sy];
  }
}

/** The outline of a tile centered on (0, 0), for the Preview. */
const TILE_OUTLINE = (() => {
  const inside = new Set(tilePixels(0, 0));
  return [...inside].filter((p) => {
    const [x, y] = p.split(',').map(Number);
    return [`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`].some((n) => !inside.has(n));
  });
})();

const TOOL_NAMES: Record<PaintTool, string> = { pencil: 'Pencil', eraser: 'Eraser', fill: 'Fill', picker: 'Picker' };

export class ObjectMode {
  readonly lab: Lab;
  readonly stage: Stage;
  readonly palette: PalettePanel;
  readonly layers: LayersPanel;
  readonly frames: FramesPanel;
  tool: PaintTool = 'pencil';
  zoom: ObjectZoom = 'fit';
  scale = 1;
  /** The layer being painted, and the frame shown on every frame loop. */
  layer = 0;
  frame = 0;
  color = 'ink';
  cursor: [number, number] = [0, 0];
  hover: [number, number] | null = null;
  pixelGrid = false;
  onion = false;
  /** Layers hidden in the editor only; never exported. */
  readonly hidden = new Set<number>();
  private readonly canvas = $<HTMLCanvasElement>('lab-canvas');
  private readonly gutter = $<HTMLCanvasElement>('lab-gutter');
  private readonly base = document.createElement('canvas');
  /** Where a block's first tile center lands in its pixels, set by pixelsAt(). */
  private blockOrigin: [number, number] = [0, 0];
  private stroke: { id: number; last: [number, number]; count: number; color: string | null } | null = null;
  private strokes = 0;
  private opened = '';

  constructor(lab: Lab, stage: Stage) {
    this.lab = lab;
    this.stage = stage;
    this.palette = new PalettePanel(this);
    this.layers = new LayersPanel(this);
    this.frames = new FramesPanel(this);
    lab.on(() => this.render());
    new ResizeObserver(() => this.active && this.zoom === 'fit' && this.draw()).observe(stage.frame);
    stage.frame.addEventListener('focus', () => this.active && this.draw());
    stage.frame.addEventListener('blur', () => this.active && this.draw());
    this.setUpToolbar();
    this.setUpStage();
  }

  get active() {
    return this.lab.kind === 'object';
  }

  /** The open object with `extends` applied, or null if it can't be resolved. */
  get resolved(): Resolved | null {
    // Kept until the sources change, which every edit does.
    if (this.resolvedFor !== this.lab.sources) {
      this.resolvedFor = this.lab.sources;
      try {
        this.resolvedCache = resolve(this.lab.sources, this.lab.name);
      } catch {
        this.resolvedCache = null;
      }
    }
    return this.resolvedCache;
  }
  private resolvedFor: unknown = null;
  private resolvedCache: Resolved | null = null;

  get isBlock() {
    return this.lab.doc?.kind === 'block';
  }

  /** Why painting is off for the open object, or null when it's on. */
  get paintBlocked(): string | null {
    if (this.isBlock) return 'A block is drawn from its size and faces. Change them in the Object panel.';
    const r = this.resolved;
    if (!r) return 'Fix the problems first.';
    const layer = r.layers[this.layer];
    if (this.lab.doc.extends && layer && 'frames' in layer) return `This layer is a frame loop of ${this.lab.doc.extends}, which an outfit can't override.`;
    return null;
  }

  // ------------------------------------------------------------- actions

  setTool(tool: PaintTool) {
    this.tool = tool;
    this.lab.notify('view');
    this.lab.announce(`${TOOL_NAMES[tool]} tool`);
  }

  setZoom(zoom: ObjectZoom) {
    this.zoom = zoom;
    this.lab.notify('view');
    this.lab.announce(zoom === 'fit' ? `Zoom to fit, ${this.scale}×` : `Zoom ${zoom}×`);
  }

  setColor(color: string) {
    this.color = color;
    if (this.tool === 'eraser' || this.tool === 'picker') this.tool = 'pencil';
    this.lab.notify('view');
    this.lab.announce(`${color} chosen`);
  }

  selectLayer(index: number, announce = true) {
    const r = this.resolved;
    if (!r) return;
    this.layer = Math.max(0, Math.min(r.layers.length - 1, index));
    this.lab.endGroup();
    this.lab.notify('view');
    if (announce) this.lab.announce(`${this.layers.label(this.layer)} selected`);
  }

  selectFrame(index: number, announce = true) {
    const r = this.resolved;
    const layer = r?.layers[this.layer];
    if (!layer || !('frames' in layer)) return;
    const count = layer.frames.length;
    this.frame = ((index % count) + count) % count;
    this.lab.notify('view');
    if (announce) this.lab.announce(`Frame ${layer.prefix}${this.frame}, ${this.frame + 1} of ${count}`);
  }

  /** The number of frames on the selected layer, 1 for a plain map. */
  get frameCount() {
    const layer = this.resolved?.layers[this.layer];
    return layer ? layerMaps(layer).length : 1;
  }

  moveCursor(dx: number, dy: number) {
    const r = this.resolved;
    if (!r) return;
    this.cursor = [Math.max(0, Math.min(r.width - 1, this.cursor[0] + dx)), Math.max(0, Math.min(r.height - 1, this.cursor[1] + dy))];
    this.lab.notify('view');
    this.revealCursor();
    const color = colorAt(r, this, ...this.cursor);
    this.lab.announce(`x ${this.cursor[0]}, y ${this.cursor[1]}: ${color ?? 'empty'}`);
  }

  /** Sets pixels to the current color, or clears them; `group` merges a stroke into one undo step. */
  private paintPixels(pixels: [number, number][], color: string | null, group: string | null) {
    let count = 0;
    this.lab.edit((doc) => (count = paint(this.lab.sources, this.lab.name, doc, this, pixels, color)), group);
    return count;
  }

  /** Applies the current tool at a pixel, as one step, and says what it did. */
  applyAt(x: number, y: number) {
    const blocked = this.paintBlocked;
    if (blocked) return this.lab.announce(blocked);
    const r = this.resolved!;
    if (this.tool === 'picker') {
      const color = colorAt(r, this, x, y);
      if (!color) return this.lab.announce(`x ${x}, y ${y} is empty`);
      this.color = color;
      this.lab.notify('view');
      return this.lab.announce(`Picked ${color}`);
    }
    const color = this.tool === 'eraser' ? null : this.color;
    if (color && !this.palette.allowed(color)) return this.lab.announce(this.palette.whyNot(color));
    const pixels = this.tool === 'fill' ? floodFill(mapAt(r.layers[this.layer], this.frame), x, y) : ([[x, y]] as [number, number][]);
    const count = this.paintPixels(pixels, color, null);
    this.lab.announce(this.said(count, color));
  }

  private said(count: number, color: string | null) {
    const pixels = `${count} pixel${count === 1 ? '' : 's'}`;
    if (count === 0) return 'Nothing changed';
    if (color === null) return `Erased ${pixels}`;
    return `${this.tool === 'fill' ? 'Filled' : 'Painted'} ${pixels} ${color}`;
  }

  /** Escape during a stroke: the stroke is undone, as if it never happened. */
  cancelStroke() {
    if (!this.stroke) return false;
    this.stroke = null;
    if (this.lab.cancelGroup()) this.lab.announce('Stroke cancelled');
    return true;
  }

  /** Shows a pixel: the problems list's way to point at a row and column. */
  goTo(layer: number | null, frame: number | null, x: number | null, y: number | null) {
    if (layer !== null) this.selectLayer(layer, false);
    if (frame !== null) this.selectFrame(frame, false);
    if (x !== null || y !== null) this.cursor = [x ?? 0, y ?? this.cursor[1]];
    this.lab.notify('view');
    this.stage.frame.focus();
    this.revealCursor();
  }

  // --------------------------------------------------------------- stage

  private toPixel(clientX: number, clientY: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [Math.floor((clientX - rect.left) / this.scale), Math.floor((clientY - rect.top) / this.scale)];
  }

  private inside([x, y]: number[]) {
    const r = this.resolved;
    return Boolean(r && x >= 0 && y >= 0 && x < r.width && y < r.height);
  }

  private setUpStage() {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      this.stage.frame.focus({ preventScroll: true });
      const px = this.toPixel(e.clientX, e.clientY);
      if (!this.inside(px)) return;
      this.cursor = px;
      if (this.tool === 'fill' || this.tool === 'picker') return this.applyAt(...px);
      const blocked = this.paintBlocked;
      if (blocked) return this.lab.announce(blocked);
      const color = this.tool === 'eraser' ? null : this.color;
      if (color && !this.palette.allowed(color)) return this.lab.announce(this.palette.whyNot(color));
      this.stroke = { id: ++this.strokes, last: px, count: 0, color };
      this.lab.endGroup();
      this.stroke.count += this.paintPixels([px], color, `stroke-${this.stroke.id}`);
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const px = this.toPixel(e.clientX, e.clientY);
      this.hover = this.inside(px) ? px : null;
      const stroke = this.stroke;
      if (stroke && (px[0] !== stroke.last[0] || px[1] !== stroke.last[1])) {
        stroke.count += this.paintPixels(line(stroke.last, px), stroke.color, `stroke-${stroke.id}`);
        stroke.last = px;
      } else this.draw();
      this.renderStatus();
    });
    const end = () => {
      const stroke = this.stroke;
      if (!stroke) return;
      this.stroke = null;
      this.lab.endGroup();
      this.lab.announce(this.said(stroke.count, stroke.color));
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => {
      if (!this.active || this.stroke) return;
      this.hover = null;
      this.draw();
      this.renderStatus();
    });
  }

  private setUpToolbar() {
    document.querySelector('.lab-toolbar')!.addEventListener('click', (e) => {
      if (!this.active) return;
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;
      const { paint: tool, ozoom, action } = button.dataset;
      if (tool) this.setTool(tool as PaintTool);
      if (ozoom) this.setZoom(ozoom === 'fit' ? 'fit' : (Number(ozoom) as 4 | 8 | 12 | 16));
      if (action === 'pixel-grid') {
        this.pixelGrid = !this.pixelGrid;
        this.lab.notify('view');
        this.lab.announce(`Pixel grid ${this.pixelGrid ? 'on' : 'off'}${this.pixelGrid && this.scale < 8 ? ', from 8×' : ''}`);
      }
      if (action === 'onion') {
        this.onion = !this.onion;
        this.lab.notify('view');
        this.lab.announce(`Onion skin ${this.onion ? 'on' : 'off'}`);
      }
    });
  }

  /** The largest whole zoom at which the object fits the frame. */
  private fitZoom(w: number, h: number) {
    const frame = this.stage.frame;
    const style = getComputedStyle(frame);
    const width = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 12;
    const height = frame.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return Math.max(1, Math.min(32, Math.floor(Math.min(width / w, height / h))));
  }

  private revealCursor() {
    const frame = this.stage.frame;
    const left = this.canvas.offsetLeft + this.cursor[0] * this.scale;
    const top = this.canvas.offsetTop + this.cursor[1] * this.scale;
    if (left < frame.scrollLeft || left > frame.scrollLeft + frame.clientWidth - this.scale) frame.scrollLeft = left - frame.clientWidth / 2;
    if (top < frame.scrollTop || top > frame.scrollTop + frame.clientHeight - this.scale) frame.scrollTop = top - frame.clientHeight / 2;
  }

  /**
   * The object's pixels at the shown frame, "x,y" → hex, from its map
   * coordinates. A block is drawn by the engine and moved so its silhouette
   * starts at (0, 0).
   */
  pixelsAt(frame: number, only?: number): Map<string, string> {
    const r = this.resolved;
    const out = new Map<string, string>();
    if (!r) return out;
    const hex = (name: string) => this.lab.sources.colors.get(name)?.hex ?? '#000000';
    if (r.block) {
      const pixels = composite(renderObject(this.lab.sources, this.lab.name));
      let [minX, minY] = [Infinity, Infinity];
      for (const p of pixels.keys()) {
        const [x, y] = p.split(',').map(Number);
        [minX, minY] = [Math.min(minX, x), Math.min(minY, y)];
      }
      for (const [p, color] of pixels) {
        const [x, y] = p.split(',').map(Number);
        out.set(`${x - minX},${y - minY}`, hex(color));
      }
      this.blockOrigin = [-minX, -minY];
      return out;
    }
    r.layers.forEach((layer, i) => {
      if ((only !== undefined && i !== only) || (only === undefined && this.hidden.has(i))) return;
      mapAt(layer, frame).forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] !== '.' && r.keys[row[x]]) out.set(`${x},${y}`, hex(r.keys[row[x]]));
      });
    });
    return out;
  }

  private paintImage(ctx: CanvasRenderingContext2D, pixels: Map<string, string>, w: number, h: number, alpha = 255) {
    const image = ctx.createImageData(w, h);
    for (const [p, hex] of pixels) {
      const [x, y] = p.split(',').map(Number);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      image.data.set([...rgb(hex), alpha], (y * w + x) * 4);
    }
    return image;
  }

  draw() {
    if (!this.active) return;
    const r = this.resolved;
    const sheet = this.canvas.parentElement!;
    sheet.classList.remove('isogrid');
    sheet.classList.add('lab-checker');
    if (!r) return;
    const [w, h] = [r.width, r.height];
    const z = (this.scale = this.zoom === 'fit' ? this.fitZoom(w, h) : this.zoom);
    sheet.style.backgroundSize = `${2 * z}px ${2 * z}px`;
    sheet.style.backgroundPosition = '0 0';
    if (this.canvas.width !== w * z || this.canvas.height !== h * z) {
      this.canvas.width = w * z;
      this.canvas.height = h * z;
      this.canvas.style.width = `${w * z}px`;
      this.canvas.style.height = `${h * z}px`;
    }
    // The object at 1×, with the previous frame under it as an onion skin.
    this.base.width = w;
    this.base.height = h;
    const bctx = this.base.getContext('2d')!;
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w * z, h * z);
    if (this.onion && this.frame > 0 && this.frameCount > 1) {
      bctx.putImageData(this.paintImage(bctx, this.pixelsAt(this.frame - 1, this.layer), w, h, 77), 0, 0);
      ctx.drawImage(this.base, 0, 0, w * z, h * z);
    }
    bctx.putImageData(this.paintImage(bctx, this.pixelsAt(this.frame), w, h), 0, 0);
    ctx.drawImage(this.base, 0, 0, w * z, h * z);

    const ink = css('--color-ink');
    if (this.pixelGrid && z >= 8) {
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.15;
      for (let x = 1; x < w; x++) ctx.fillRect(x * z, 0, 1, h * z);
      for (let y = 1; y < h; y++) ctx.fillRect(0, y * z, w * z, 1);
      ctx.globalAlpha = 1;
    }
    // The bounds, dashed, and the anchor's crosshair.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(0.5, 0.5, w * z - 1, h * z - 1);
    ctx.setLineDash([]);
    if (!r.block) {
      const [ax, ay] = r.anchor;
      const [cx, cy] = [(ax + 0.5) * z, (ay + 0.5) * z];
      const arm = Math.max(4, z);
      ctx.strokeStyle = css('--color-accent');
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy + 0.5);
      ctx.lineTo(cx + arm, cy + 0.5);
      ctx.moveTo(cx + 0.5, cy - arm);
      ctx.lineTo(cx + 0.5, cy + arm);
      ctx.stroke();
    }
    const at = this.hover ?? (document.activeElement === this.stage.frame ? this.cursor : null);
    if (at) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(at[0] * z + 1, at[1] * z + 1, z - 2, z - 2);
    }
    this.drawGutter(h, z);
    $('lab-empty').hidden = true;
  }

  /** For an object that extends another: a mark beside each row it overrides on this layer. */
  private drawGutter(h: number, z: number) {
    const rows = this.lab.doc?.extends ? overriddenRows(this.lab.doc)[this.layer] ?? [] : null;
    this.gutter.hidden = rows === null;
    if (rows === null) return;
    this.gutter.width = 6;
    this.gutter.height = h * z;
    this.gutter.style.height = `${h * z}px`;
    const ctx = this.gutter.getContext('2d')!;
    ctx.clearRect(0, 0, 6, h * z);
    ctx.fillStyle = css('--color-accent');
    for (const y of rows) ctx.fillRect(0, y * z, 6, z);
  }

  /** The object standing on one tile, at 1× and 2× (spec D9.5's Preview). */
  private drawPreview() {
    const r = this.resolved;
    const pixels = this.pixelsAt(this.frame);
    // Pixels relative to the anchor (a block's first tile center), which
    // stands on the tile's center.
    const shift = r?.block ? this.blockOrigin : (r?.anchor ?? [0, 0]);
    const points = [...pixels.keys()].map((p) => p.split(',').map(Number)).map(([x, y]) => [x - shift[0], y - shift[1]]);
    const outline = TILE_OUTLINE.map((p) => p.split(',').map(Number));
    const all = [...points, ...outline];
    const minX = Math.min(...all.map(([x]) => x)) - 2;
    const minY = Math.min(...all.map(([, y]) => y)) - 2;
    const w = Math.max(...all.map(([x]) => x)) - minX + 3;
    const h = Math.max(...all.map(([, y]) => y)) - minY + 3;
    const grid = css('--color-ink');
    const colors = [...pixels.values()];
    for (const [id, scale] of [['lab-preview-1', 1], ['lab-preview-2', 2]] as const) {
      const canvas = $<HTMLCanvasElement>(id);
      canvas.width = w;
      canvas.height = h;
      // Height follows the width, so a big legacy map shrinks to the column.
      canvas.style.width = `${w * scale}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = grid;
      for (const [x, y] of outline) ctx.fillRect(x - minX, y - minY, 1, 1);
      ctx.globalAlpha = 1;
      points.forEach(([x, y], i) => {
        ctx.fillStyle = colors[i];
        ctx.fillRect(x - minX, y - minY, 1, 1);
      });
    }
  }

  // -------------------------------------------------------------- render

  private renderStatus() {
    const at = this.hover ?? this.cursor;
    $('lab-status-position').textContent = `x ${at[0]} · y ${at[1]}`;
    const layer = this.resolved?.layers[this.layer];
    $('lab-status-pixel').textContent = `${this.layers.label(this.layer)}${layer && 'frames' in layer ? ` · ${layer.prefix}${this.frame}` : ''}`;
    $('lab-status-zoom').textContent = `${this.scale}×`;
  }

  /** The Object panel: name, kind, size against its caps, and the fields that change them. */
  private renderObjectPanel() {
    const { lab } = this;
    const doc = lab.doc;
    const r = this.resolved;
    const legacy = Boolean(r?.legacy);
    const facts: [string, string][] = [
      ['Name', lab.name],
      ['Kind', `${doc.kind}${legacy ? ', legacy' : ''}`],
    ];
    if (doc.extends) facts.push(['Extends', doc.extends]);
    if (r) {
      facts.push(['Size', `${r.width} × ${r.height}${legacy ? ' (legacy, no cap)' : ` (max ${CAPS.size} × ${CAPS.size})`}`]);
      if (r.character) {
        const [fw, fh] = paintedSize(r);
        facts.push(['Figure', `${fw} × ${fh} (max ${CAPS.characterWidth} × ${CAPS.characterHeight})`]);
      }
      const colors = usedColors(lab.sources, r).length;
      facts.push(['Colors', `${colors}${legacy ? '' : ` of ${CAPS.colors}`}`]);
    }
    if (doc.extends) {
      const rows = overriddenRows(doc);
      const text = Object.entries(rows).map(([layer, list]) => `layer ${Number(layer) + 1}: rows ${list.join(', ')}`).join('; ');
      facts.push(['Overrides', text || 'None yet']);
    }
    $('lab-object-facts').replaceChildren(
      ...facts.flatMap(([term, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.textContent = value;
        return [dt, dd];
      }),
    );
    const fields = $('lab-object-fields');
    const sig = `${lab.key}|${doc.kind}|${Boolean(doc.extends)}`;
    if (fields.dataset.sig !== sig) {
      fields.dataset.sig = sig;
      fields.replaceChildren(...this.objectFields(doc));
    }
    for (const input of fields.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]')) {
      if (document.activeElement !== input) input.value = String(this.fieldValue(input.dataset.field!) ?? '');
    }
    $('lab-object-note').textContent = doc.extends
      ? `Rows painted here override ${doc.extends}'s rows. A row painted back to match is dropped.`
      : this.isBlock
        ? 'Light comes from the island side: the top is the light shade, the left the mid, the right the shadow.'
        : '';
  }

  private fieldValue(field: string): string | number | undefined {
    const doc = this.lab.doc;
    const r = this.resolved;
    const values: Record<string, string | number | undefined> = {
      'anchor-x': r?.anchor[0],
      'anchor-y': r?.anchor[1],
      width: r?.width,
      height: r?.height,
      'size-0': doc.size?.[0],
      'size-1': doc.size?.[1],
      'size-2': doc.size?.[2],
    };
    if (field.startsWith('face-')) return doc.faces?.[field.slice(5)] ?? '';
    return values[field];
  }

  /** Number fields with − and +, and the block's face colors. */
  private objectFields(doc: any): HTMLElement[] {
    const number = (field: string, label: string, name: string, min: number, max: number) => {
      const wrap = document.createElement('div');
      wrap.className = 'lab-number';
      const id = `lab-o-${field}`;
      const lbl = Object.assign(document.createElement('label'), { htmlFor: id, textContent: label });
      const input = Object.assign(document.createElement('input'), { type: 'number', id, min: String(min), max: String(max), step: '1' });
      input.dataset.field = field;
      input.inputMode = 'numeric';
      const step = (delta: number, text: string, aria: string) => {
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'lab-step', textContent: text });
        b.setAttribute('aria-label', aria);
        b.addEventListener('click', () => this.setField(field, Number(this.fieldValue(field)) + delta, min, max));
        return b;
      };
      input.addEventListener('change', () => this.setField(field, Number(input.value), min, max));
      wrap.append(lbl, step(-1, '−', `Decrease ${name}`), input, step(1, '+', `Increase ${name}`));
      return wrap;
    };
    const legacy = doc.legacy === true;
    const cap = legacy ? 512 : CAPS.size;
    if (doc.kind === 'block') {
      const faces = ['top', 'left', 'right', 'edge'].map((face) => {
        const wrap = document.createElement('div');
        wrap.className = 'lab-field';
        const id = `lab-o-face-${face}`;
        const select = Object.assign(document.createElement('select'), { id });
        select.dataset.field = `face-${face}`;
        select.append(new Option(face === 'top' ? '(pick one)' : 'none', ''), ...Object.keys(this.lab.data.palette.world).map((n) => new Option(n, n)));
        select.addEventListener('change', () => this.setFace(face, select.value));
        wrap.append(Object.assign(document.createElement('label'), { htmlFor: id, textContent: `${face[0].toUpperCase()}${face.slice(1)} face` }), select);
        return wrap;
      });
      return [number('size-0', 'Wide', 'tiles wide', 1, 4), number('size-1', 'Deep', 'tiles deep', 1, 4), number('size-2', 'Levels', 'levels', 0, 4), ...faces];
    }
    const out = [number('anchor-x', 'Anchor x', 'anchor x', 0, cap - 1), number('anchor-y', 'Anchor y', 'anchor y', 0, cap - 1)];
    if (!doc.extends) out.push(number('width', 'Width', 'width', 1, cap), number('height', 'Height', 'height', 1, cap));
    return out;
  }

  private setField(field: string, value: number, min: number, max: number) {
    if (!Number.isInteger(value) || value < min || value > max) {
      this.lab.announce(`Use a whole number from ${min} to ${max}`);
      return this.lab.notify('view');
    }
    const r = this.resolved;
    this.lab.edit((doc) => {
      if (field === 'anchor-x' || field === 'anchor-y') {
        const anchor = [...(r?.anchor ?? [0, 0])];
        anchor[field === 'anchor-x' ? 0 : 1] = value;
        // Keep the canonical key order: kind, legacy, extends, anchor, keys…
        const { kind, legacy, extends: ext, anchor: _old, ...rest } = doc;
        for (const key of Object.keys(doc)) delete doc[key];
        Object.assign(doc, { kind, ...(legacy ? { legacy } : {}), ...(ext ? { extends: ext } : {}), anchor, ...rest });
      } else if (field === 'width' || field === 'height') {
        resize(doc, field === 'width' ? value : (r?.width ?? 1), field === 'height' ? value : (r?.height ?? 1));
      } else if (field.startsWith('size-')) {
        doc.size[Number(field.slice(5))] = value;
        // A flat block has no side faces.
        if (doc.size[2] === 0) {
          delete doc.faces.left;
          delete doc.faces.right;
        } else {
          doc.faces = { top: doc.faces.top, left: doc.faces.left ?? 'soil-2', right: doc.faces.right ?? 'soil-3', ...(doc.faces.edge ? { edge: doc.faces.edge } : {}) };
        }
      }
    });
    const res = this.resolved;
    if (res) this.cursor = [Math.min(this.cursor[0], res.width - 1), Math.min(this.cursor[1], res.height - 1)];
    this.lab.announce(`${field.replace('-', ' ')} set to ${value}`);
  }

  private setFace(face: string, color: string) {
    this.lab.edit((doc) => {
      const faces = { ...doc.faces };
      if (color) faces[face] = color;
      else delete faces[face];
      doc.faces = Object.fromEntries(['top', 'left', 'right', 'edge'].filter((f) => f in faces).map((f) => [f, faces[f]]));
    });
    this.lab.announce(color ? `${face} face set to ${color}` : `${face} face removed`);
  }

  render() {
    if (!this.active) {
      this.frames.stop();
      return;
    }
    const { lab } = this;
    if (this.opened !== lab.key) {
      // A newly opened object starts on its first layer and frame.
      this.opened = lab.key;
      this.layer = 0;
      this.frame = 0;
      this.hidden.clear();
      this.cursor = [0, 0];
      this.frames.stop();
      this.stage.frame.scrollTo(0, 0);
    }
    const r = this.resolved;
    if (r) {
      this.layer = Math.min(this.layer, Math.max(0, r.layers.length - 1));
      this.cursor = [Math.min(this.cursor[0], r.width - 1), Math.min(this.cursor[1], r.height - 1)];
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('.lab-toolbar [data-paint]')) {
      button.setAttribute('aria-pressed', String(button.dataset.paint === this.tool));
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('.lab-toolbar [data-ozoom]')) {
      button.setAttribute('aria-pressed', String(button.dataset.ozoom === String(this.zoom)));
    }
    document.querySelector('.lab-toolbar [data-action="pixel-grid"]')!.setAttribute('aria-pressed', String(this.pixelGrid));
    document.querySelector('.lab-toolbar [data-action="onion"]')!.setAttribute('aria-pressed', String(this.onion));
    this.stage.frame.dataset.tool = this.tool;
    this.draw();
    this.palette.render();
    this.layers.render();
    this.frames.render();
    this.renderObjectPanel();
    this.drawPreview();
    this.renderStatus();
  }
}
