// Scene mode (spec D9.4): the Library, the Items list, the Selected and
// Scene panels, and the stage's pointer tools (Select, Place, Pan). Each
// edit is one undo step, and each is announced. keyboard.ts calls the same
// methods, so every pointer action has a keyboard path (R21).

import { loadSources, type Sources } from '../../lib/pixel-art/engine.mjs';
import { pxToTile, tileToPx } from '../../lib/pixel-art/iso.mjs';
import { samePath, type Lab, type Path } from './lab';
import { placementPoint, type Stage } from './stage';

const CLASS_LIST = /^[a-z][a-z0-9-]*(?: [a-z][a-z0-9-]*)*$/;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ------------------------------------------------------------ scene edits

/** The list that holds the item at `path`, and its index there. */
function parentOf(doc: any, path: Path): { list: any[]; index: number } {
  let list: any[] = doc.items;
  for (const i of path.slice(0, -1)) list = list[i].items;
  return { list, index: path[path.length - 1] };
}

export function itemAt(doc: any, path: Path | null): any {
  if (!path || path.length === 0) return null;
  const { list, index } = parentOf(doc, path);
  return list?.[index] ?? null;
}

/** Moves an item by whole tiles and levels, however it's placed. */
function moveByTiles(item: any, dc: number, dr: number, dl: number) {
  if (item.at.tile) {
    const [c, r, l] = item.at.tile;
    item.at.tile = [c + dc, r + dr, l + dl];
  } else {
    const [x, y] = item.at.px;
    item.at.px = [x + (dc - dr) * 16, y + (dc + dr) * 8 - dl * 16];
  }
}

/**
 * Where a new item goes in the scene's top-level list: back to front by
 * row + col, then level, among the items placed on tiles (spec D9.4).
 */
function insertIndex(items: any[], [col, row, level]: number[]) {
  const index = items.findIndex((other) => {
    const tile = other?.at?.tile;
    if (!tile) return false;
    const [c, r, l] = tile;
    return c + r > col + row || (c + r === col + row && l > level);
  });
  return index === -1 ? items.length : index;
}

/** "col 3 · row 4 · lvl 0" or "x 31 · y 6". */
export function where(item: any) {
  if (item?.at?.tile) {
    const [c, r, l] = item.at.tile;
    return `col ${c} · row ${r} · lvl ${l}`;
  }
  const [x, y] = item?.at?.px ?? [0, 0];
  return `x ${x} · y ${y}`;
}

/** "column 3, row 4, level 0" or "x 31, y 6", for announcements. */
function spoken(item: any) {
  if (item.at.tile) {
    const [c, r, l] = item.at.tile;
    return `column ${c}, row ${r}, level ${l}`;
  }
  return `x ${item.at.px[0]}, y ${item.at.px[1]}`;
}

const groupLabel = (group: Record<string, string>) =>
  Object.entries(group)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ') || 'group';

// -------------------------------------------------------------- scene mode

export class SceneMode {
  private readonly lab: Lab;
  private readonly stage: Stage;
  private readonly tree = $('lab-tree');
  private readonly collapsed = new Set<string>();
  private active: string | null = null;
  /** Held Space turns any pointer drag into a pan (spec D9.4). */
  spaceHeld = false;
  private drag: { id: number; kind: 'move' | 'pan'; start: [number, number]; client: [number, number]; scroll: [number, number]; at: any; moved: boolean } | null = null;
  private drags = 0;

  constructor(lab: Lab, stage: Stage) {
    this.lab = lab;
    this.stage = stage;
    lab.on(() => this.render());
    this.setUpToolbar();
    this.setUpLibrary();
    this.setUpTree();
    this.setUpInspector();
    this.setUpStage();
  }

  get selectedItem() {
    return itemAt(this.lab.doc, this.lab.selected);
  }

  // ----------------------------------------------------------- operations

  select(path: Path | null, announce = true) {
    this.lab.set({ selected: path });
    const item = this.selectedItem;
    if (item?.at?.tile) this.lab.cursor = [...item.at.tile] as [number, number, number];
    if (announce) this.lab.announce(item ? `${item.object} selected, ${spoken(item)}` : 'Nothing selected');
  }

  /** Places an object on a tile, as the newest item in back-to-front order. */
  place(name: string, tile: [number, number, number]) {
    const item = { object: name, at: { tile: [...tile] } };
    let path: Path = [];
    this.lab.edit((doc) => {
      const index = insertIndex(doc.items, tile);
      doc.items.splice(index, 0, item);
      path = [index];
    });
    this.lab.cursor = [...tile] as [number, number, number];
    this.lab.set({ selected: path });
    this.lab.announce(`${name} placed at ${spoken(item)}`);
  }

  placeCurrentAtCursor() {
    if (!this.lab.current) return this.lab.announce('Choose an object in the Library first');
    this.place(this.lab.current, this.lab.cursor);
  }

  /** Moves the selected item by tiles and levels; `group` merges a held key into one step. */
  moveSelected(dc: number, dr: number, dl: number, group: string | null = null) {
    const path = this.lab.selected;
    if (!this.selectedItem || !path) return;
    this.lab.edit((doc) => moveByTiles(itemAt(doc, path), dc, dr, dl), group);
    const item = this.selectedItem;
    if (item.at.tile) this.lab.cursor = [...item.at.tile] as [number, number, number];
    this.lab.announce(`${item.object} moved to ${spoken(item)}`);
  }

  /** Nudges the selected item by pixels. An item on a tile is then placed by pixel. */
  nudgeSelected(dx: number, dy: number, group: string | null = null) {
    const path = this.lab.selected;
    if (!this.selectedItem || !path) return;
    const origin = this.stage.origin;
    this.lab.edit((doc) => {
      const item = itemAt(doc, path);
      const [x, y] = placementPoint(item, origin);
      item.at = { px: [x + dx, y + dy] };
    }, group);
    const item = this.selectedItem;
    this.lab.announce(`${item.object} nudged to ${spoken(item)}`);
  }

  /** Sets one coordinate of the selected item. */
  setField(field: string, value: number) {
    const path = this.lab.selected;
    if (!this.selectedItem || !path || !Number.isInteger(value)) return;
    this.lab.edit((doc) => {
      const at = itemAt(doc, path).at;
      const fields: Record<string, [number[] | undefined, number]> = { col: [at.tile, 0], row: [at.tile, 1], level: [at.tile, 2], x: [at.px, 0], y: [at.px, 1] };
      const [list, i] = fields[field] ?? [undefined, 0];
      if (list) list[i] = value;
    });
    const item = this.selectedItem;
    this.lab.announce(`${item.object} moved to ${spoken(item)}`);
  }

  /** Snaps a pixel-placed item to the level-0 tile under its placement point. */
  snapSelected() {
    const path = this.lab.selected;
    const item = this.selectedItem;
    if (!item || !path) return;
    if (item.at.tile) return this.lab.announce(`${item.object} is already on a tile`);
    const tile = pxToTile(item.at.px, 0, this.stage.origin);
    this.lab.edit((doc) => (itemAt(doc, path).at = { tile }));
    this.lab.announce(`${item.object} snapped to ${spoken(this.selectedItem)}`);
  }

  /** Moves the selected item later (forward) or earlier (back) in paint order. */
  reorderSelected(delta: 1 | -1) {
    const path = this.lab.selected;
    const item = this.selectedItem;
    if (!item || !path) return;
    const { list, index } = parentOf(this.lab.doc, path);
    const target = index + delta;
    if (target < 0 || target >= list.length) return this.lab.announce(`${item.object} is already ${delta > 0 ? 'at the front' : 'at the back'}`);
    this.lab.edit((doc) => {
      const parent = parentOf(doc, path).list;
      [parent[index], parent[target]] = [parent[target], parent[index]];
    });
    this.lab.set({ selected: [...path.slice(0, -1), target] });
    this.lab.announce(`${item.object} ${delta > 0 ? 'raised' : 'lowered'} to ${target + 1} of ${list.length} in paint order`);
  }

  duplicateSelected() {
    const path = this.lab.selected;
    const item = this.selectedItem;
    if (!item || !path) return;
    const twin = JSON.parse(JSON.stringify(item));
    moveByTiles(twin, 1, 0, 0);
    const index = path[path.length - 1] + 1;
    this.lab.edit((doc) => parentOf(doc, path).list.splice(index, 0, twin));
    this.lab.set({ selected: [...path.slice(0, -1), index] });
    this.lab.announce(`${item.object} duplicated at ${spoken(twin)}`);
  }

  removeSelected() {
    const path = this.lab.selected;
    const item = this.selectedItem;
    if (!item || !path) return;
    this.lab.selected = null;
    this.lab.edit((doc) => parentOf(doc, path).list.splice(path[path.length - 1], 1));
    this.lab.announce(`${item.object} removed`);
  }

  /** Moves the stage cursor by tiles and levels. */
  moveCursor(dc: number, dr: number, dl: number) {
    const [c, r, l] = this.lab.cursor;
    this.lab.set({ cursor: [c + dc, r + dr, l + dl] });
    const [x, y] = tileToPx(this.lab.cursor, this.stage.origin);
    this.stage.reveal(x, y);
    this.lab.announce(`Cursor at column ${c + dc}, row ${r + dr}, level ${l + dl}`);
  }

  // ------------------------------------------------------------- toolbar

  private setUpToolbar() {
    const bar = document.querySelector<HTMLElement>('.lab-toolbar')!;
    bar.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;
      const { tool, zoom, action, mode } = button.dataset;
      if (mode === 'object') return this.lab.announce("Object mode isn't available yet");
      if (tool) this.setTool(tool as Lab['tool']);
      if (zoom) this.setZoom(zoom === 'fit' ? 'fit' : (Number(zoom) as 1 | 2 | 3 | 4));
      if (action === 'grid') {
        this.lab.set({ grid: !this.lab.grid });
        this.lab.announce(`Tile grid ${this.lab.grid ? 'on' : 'off'}`);
      }
      if (action === 'undo') this.lab.undo();
      if (action === 'redo') this.lab.redo();
    });
  }

  setTool(tool: Lab['tool']) {
    this.lab.set({ tool });
    this.lab.announce(`${tool[0].toUpperCase()}${tool.slice(1)} tool`);
  }

  setZoom(zoom: Lab['zoom']) {
    this.lab.set({ zoom });
    this.lab.announce(zoom === 'fit' ? `Zoom to fit, ${this.stage.scale}×` : `Zoom ${zoom}×`);
  }

  // ------------------------------------------------------------- library

  private setUpLibrary() {
    const { palette, objects } = this.lab.data;
    const sources = loadSources({ palette, objects });
    for (const thumb of document.querySelectorAll<HTMLButtonElement>('.lab-thumb')) {
      const name = thumb.dataset.object!;
      this.drawThumb(thumb.querySelector('canvas')!, name, sources);
      thumb.addEventListener('click', () => {
        this.lab.set({ current: name, tool: 'place' });
        this.lab.announce(`${name} chosen. Choose a tile on the stage to place it.`);
      });
      thumb.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        this.lab.set({ current: name });
        this.placeCurrentAtCursor();
      });
      thumb.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', name);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        this.lab.set({ current: name });
      });
    }
    const search = $<HTMLInputElement>('lab-search');
    const none = $('lab-search-none');
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      let shown = 0;
      for (const group of document.querySelectorAll<HTMLDetailsElement>('.lab-library__group')) {
        let inGroup = 0;
        for (const li of group.querySelectorAll<HTMLElement>('li[data-name]')) {
          const match = li.dataset.name!.includes(query);
          li.hidden = !match;
          if (match) inGroup++;
        }
        group.hidden = inGroup === 0;
        if (query && inGroup > 0) group.open = true;
        shown += inGroup;
      }
      none.hidden = shown > 0;
      none.textContent = shown > 0 ? '' : `No objects match '${search.value.trim()}'.`;
    });
  }

  /** A Library thumbnail: the object at 1×, scaled in whole steps to fit 48px, or down if it's bigger. */
  private drawThumb(canvas: HTMLCanvasElement, name: string, sources: Sources) {
    const art = this.stage.objectArt(sources, name);
    if (!art.box) return;
    const { minX, minY, maxX, maxY } = art.box;
    const [w, h] = [maxX - minX + 1, maxY - minY + 1];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(w, h);
    for (const [p, color] of art.pixels) {
      const [x, y] = p.split(',').map(Number);
      const hex = sources.colors.get(color)?.hex ?? '#000000';
      const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      image.data.set([...rgb, 255], ((y - minY) * w + (x - minX)) * 4);
    }
    ctx.putImageData(image, 0, 0);
    const largest = Math.max(w, h);
    const scale = largest <= 48 ? Math.floor(48 / largest) : 48 / largest;
    canvas.style.width = `${Math.round(w * scale)}px`;
    canvas.style.height = `${Math.round(h * scale)}px`;
  }

  // ---------------------------------------------------------- items list

  /** The Items list: front item at the top, groups as collapsible rows. */
  private rows(): { id: string; path: Path; level: number; item: any }[] {
    const out: { id: string; path: Path; level: number; item: any }[] = [];
    const walk = (items: any[], prefix: Path, level: number) => {
      for (let i = items.length - 1; i >= 0; i--) {
        const path = [...prefix, i];
        const id = `lab-item-${path.join('-')}`;
        out.push({ id, path, level, item: items[i] });
        if ('group' in items[i] && !this.collapsed.has(id)) walk(items[i].items ?? [], path, level + 1);
      }
    };
    walk(this.lab.doc?.items ?? [], [], 1);
    return out;
  }

  private setUpTree() {
    const { tree } = this;
    tree.addEventListener('click', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[role="treeitem"]');
      if (!row) return;
      this.activate(row.id, true);
    });
    tree.addEventListener('keydown', (e) => {
      const rows = this.rows();
      if (rows.length === 0) return;
      let index = Math.max(0, rows.findIndex((r) => r.id === this.active));
      const row = rows[index];
      const isGroup = 'group' in row.item;
      switch (e.key) {
        case 'ArrowDown':
          index = Math.min(rows.length - 1, index + 1);
          break;
        case 'ArrowUp':
          index = Math.max(0, index - 1);
          break;
        case 'Home':
          index = 0;
          break;
        case 'End':
          index = rows.length - 1;
          break;
        case 'ArrowRight':
          if (isGroup && this.collapsed.has(row.id)) this.toggle(row.id);
          else if (isGroup) index = Math.min(rows.length - 1, index + 1);
          break;
        case 'ArrowLeft':
          if (isGroup && !this.collapsed.has(row.id)) this.toggle(row.id);
          else if (row.path.length > 1) index = rows.findIndex((r) => samePath(r.path, row.path.slice(0, -1)));
          break;
        case 'Enter':
        case ' ':
          if (isGroup) this.toggle(row.id);
          break;
        default:
          return;
      }
      e.preventDefault();
      this.activate(this.rows()[index]?.id ?? row.id, false);
    });
  }

  private toggle(id: string) {
    if (this.collapsed.has(id)) this.collapsed.delete(id);
    else this.collapsed.add(id);
    this.renderTree();
  }

  /** Moves the list's focus to a row. Choosing an item selects it; a group row opens or closes. */
  private activate(id: string, clicked: boolean) {
    const row = this.rows().find((r) => r.id === id);
    if (!row) return;
    this.active = id;
    if ('group' in row.item) {
      if (clicked) this.toggle(id);
      this.renderTree();
      return;
    }
    if (!samePath(row.path, this.lab.selected)) this.select(row.path);
    else this.renderTree();
  }

  private renderTree() {
    const rows = this.rows();
    const { tree } = this;
    const selected = this.lab.selected;
    if (selected) this.active = `lab-item-${selected.join('-')}`;
    if (!rows.some((r) => r.id === this.active)) this.active = rows[0]?.id ?? null;
    tree.replaceChildren(
      ...rows.map(({ id, path, level, item }) => {
        const el = document.createElement('div');
        el.id = id;
        el.setAttribute('role', 'treeitem');
        el.setAttribute('aria-level', String(level));
        el.className = 'lab-tree__row';
        el.style.setProperty('--depth', String(level - 1));
        const name = document.createElement('span');
        name.className = 'lab-tree__name';
        const detail = document.createElement('span');
        detail.className = 'lab-tree__detail';
        if ('group' in item) {
          const open = !this.collapsed.has(id);
          el.setAttribute('aria-expanded', String(open));
          name.textContent = `${open ? '▾' : '▸'} ${groupLabel(item.group ?? {})}`;
          detail.textContent = `${(item.items ?? []).length} items`;
        } else {
          el.setAttribute('aria-selected', String(samePath(path, selected)));
          name.textContent = item.class ? `${item.object} (${item.class})` : item.object;
          detail.textContent = where(item);
        }
        el.classList.toggle('is-active', id === this.active);
        el.append(name, detail);
        return el;
      }),
    );
    if (this.active) tree.setAttribute('aria-activedescendant', this.active);
    else tree.removeAttribute('aria-activedescendant');
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'lab-panel__note';
      empty.textContent = 'Add an object from the Library.';
      tree.append(empty);
    }
    // Keep the active row in view inside the Items panel, without
    // scrolling the page.
    const row = document.getElementById(this.active ?? '');
    const panel = $('lab-items');
    if (row && panel.scrollHeight > panel.clientHeight) {
      const top = row.offsetTop;
      if (top < panel.scrollTop) panel.scrollTop = top;
      else if (top + row.offsetHeight > panel.scrollTop + panel.clientHeight) panel.scrollTop = top + row.offsetHeight - panel.clientHeight;
    }
  }

  // ----------------------------------------------------------- inspector

  private setUpInspector() {
    const panel = $('lab-selected');
    panel.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;
      const { field, step, item } = button.dataset;
      if (field && step) {
        const current = this.fieldValue(field);
        if (current !== null) this.setField(field, current + Number(step));
      }
      if (item === 'raise') this.reorderSelected(1);
      if (item === 'lower') this.reorderSelected(-1);
      if (item === 'snap') this.snapSelected();
      if (item === 'duplicate') this.duplicateSelected();
      if (item === 'remove') this.removeSelected();
    });
    for (const input of panel.querySelectorAll<HTMLInputElement>('input[type="number"]')) {
      input.addEventListener('change', () => {
        const value = Number(input.value);
        if (input.value.trim() === '' || !Number.isInteger(value)) {
          this.lab.announce('Use a whole number');
          return this.renderInspector();
        }
        this.setField(input.dataset.field!, value);
      });
    }
    const cls = $<HTMLInputElement>('lab-class');
    cls.addEventListener('change', () => {
      const path = this.lab.selected;
      if (!path) return;
      const value = cls.value.trim();
      if (value && !CLASS_LIST.test(value)) {
        this.lab.announce('A class is lowercase class names separated by single spaces');
        return this.renderInspector();
      }
      this.lab.edit((doc) => {
        const item = itemAt(doc, path);
        if (value) {
          // Keep the canonical key order: object, class, at.
          const { object, at } = item;
          for (const key of Object.keys(item)) delete item[key];
          Object.assign(item, { object, class: value, at });
        } else delete item.class;
      });
      this.lab.announce(value ? `Class set to ${value}` : 'Class removed');
    });
  }

  private fieldValue(field: string): number | null {
    const at = this.selectedItem?.at;
    if (!at) return null;
    const values: Record<string, number | undefined> = { col: at.tile?.[0], row: at.tile?.[1], level: at.tile?.[2], x: at.px?.[0], y: at.px?.[1] };
    return values[field] ?? null;
  }

  private renderInspector() {
    const item = this.selectedItem;
    $('lab-selected-none').hidden = Boolean(item);
    $('lab-selected').hidden = !item;
    $('lab-selected-title').textContent = item ? `Selected · ${item.object}` : 'Selected';
    if (item) {
      const onTile = Boolean(item.at?.tile);
      for (const fields of document.querySelectorAll<HTMLElement>('#lab-selected [data-placement]')) {
        fields.hidden = fields.dataset.placement !== (onTile ? 'tile' : 'px');
      }
      for (const input of document.querySelectorAll<HTMLInputElement>('#lab-selected input[type="number"]')) {
        const value = this.fieldValue(input.dataset.field!);
        if (document.activeElement !== input) input.value = value === null ? '' : String(value);
      }
      $('lab-placement-note').textContent = onTile ? 'Placed on a tile. Shift + arrows on the stage nudge it by pixels.' : 'Placed by pixel.';
      document.querySelector<HTMLElement>('[data-item="snap"]')!.hidden = onTile;
      const cls = $<HTMLInputElement>('lab-class');
      if (document.activeElement !== cls) cls.value = item.class ?? '';
    }
    const doc = this.lab.doc;
    const facts: [string, string][] = [
      ['Name', this.lab.name],
      ['Output', doc.output ?? 'Preview only'],
      ['viewBox', doc.viewBox.join(' ')],
      ['Origin', (doc.origin ?? [0, 0]).join(' ')],
    ];
    $('lab-scene-facts').replaceChildren(
      ...facts.flatMap(([term, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.textContent = value;
        return [dt, dd];
      }),
    );
  }

  // --------------------------------------------------------------- stage

  private setUpStage() {
    const { stage } = this;
    const canvas = stage.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      stage.frame.focus({ preventScroll: true });
      const px = stage.toScene(e.clientX, e.clientY);
      const pan = this.lab.tool === 'pan' || this.spaceHeld;
      const base = { id: ++this.drags, start: px, client: [e.clientX, e.clientY] as [number, number], scroll: [stage.frame.scrollLeft, stage.frame.scrollTop] as [number, number], moved: false };
      if (pan) {
        this.drag = { ...base, kind: 'pan', at: null };
      } else if (this.lab.tool === 'place') {
        const tile = stage.tileAt(px);
        if (this.lab.current) this.place(this.lab.current, tile);
        else this.lab.announce('Choose an object in the Library first');
        return;
      } else {
        const hit = stage.hitTest(px);
        if (!hit) {
          this.lab.cursor = stage.tileAt(px);
          this.select(null);
          return;
        }
        if (!samePath(hit, this.lab.selected)) this.select(hit);
        this.drag = { ...base, kind: 'move', at: JSON.parse(JSON.stringify(this.selectedItem.at)) };
      }
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const px = stage.toScene(e.clientX, e.clientY);
      stage.hover = { tile: stage.tileAt(px), px };
      const drag = this.drag;
      if (drag?.kind === 'pan') {
        stage.frame.scrollLeft = drag.scroll[0] - (e.clientX - drag.client[0]);
        stage.frame.scrollTop = drag.scroll[1] - (e.clientY - drag.client[1]);
      } else if (drag?.kind === 'move' && this.lab.selected) {
        const path = this.lab.selected;
        let at: any;
        if (drag.at.tile) {
          const level = drag.at.tile[2];
          const [c0, r0] = stage.tileAt(drag.start, level);
          const [c1, r1] = stage.tileAt(px, level);
          at = { tile: [drag.at.tile[0] + c1 - c0, drag.at.tile[1] + r1 - r0, level] };
        } else {
          at = { px: [drag.at.px[0] + px[0] - drag.start[0], drag.at.px[1] + px[1] - drag.start[1]] };
        }
        if (JSON.stringify(at) !== JSON.stringify(this.selectedItem.at)) {
          drag.moved = true;
          this.lab.edit((doc) => (itemAt(doc, path).at = at), `drag-${drag.id}`);
        }
      }
      stage.draw();
      this.renderStatus();
    });
    const end = () => {
      const drag = this.drag;
      this.drag = null;
      this.lab.endGroup();
      if (drag?.kind === 'move' && drag.moved && this.selectedItem) {
        this.lab.announce(`${this.selectedItem.object} moved to ${spoken(this.selectedItem)}`);
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => {
      if (this.drag) return;
      stage.hover = null;
      stage.draw();
      this.renderStatus();
    });
    // Dragging a Library thumbnail onto the stage places it on that tile.
    stage.frame.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const px = stage.toScene(e.clientX, e.clientY);
      stage.hover = { tile: stage.tileAt(px), px };
      stage.draw();
    });
    stage.frame.addEventListener('drop', (e) => {
      e.preventDefault();
      const name = e.dataTransfer?.getData('text/plain') || this.lab.current;
      if (!name || !this.lab.data.objects[name]) return;
      this.lab.current = name;
      this.place(name, stage.tileAt(stage.toScene(e.clientX, e.clientY)));
      stage.frame.focus({ preventScroll: true });
    });
  }

  // -------------------------------------------------------------- render

  private renderStatus() {
    const { stage, lab } = this;
    const [c, r, l] = stage.hover?.tile ?? lab.cursor;
    $('lab-status-position').textContent = `col ${c} · row ${r} · lvl ${l}`;
    $('lab-status-pixel').textContent = stage.hover ? `x ${stage.hover.px[0]} · y ${stage.hover.px[1]}` : '';
    $('lab-status-zoom').textContent = `${stage.scale}×`;
    $('lab-problem-count').textContent = String(lab.problems.length);
    $('lab-status-problems').classList.toggle('is-warning', lab.problems.length > 0);
  }

  render() {
    const { lab } = this;
    for (const button of document.querySelectorAll<HTMLButtonElement>('.lab-toolbar [data-tool]')) {
      button.setAttribute('aria-pressed', String(button.dataset.tool === lab.tool));
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('.lab-toolbar [data-zoom]')) {
      button.setAttribute('aria-pressed', String(button.dataset.zoom === String(lab.zoom)));
    }
    document.querySelector('.lab-toolbar [data-action="grid"]')!.setAttribute('aria-pressed', String(lab.grid));
    for (const thumb of document.querySelectorAll<HTMLButtonElement>('.lab-thumb')) {
      thumb.setAttribute('aria-pressed', String(thumb.dataset.object === lab.current));
    }
    this.stage.frame.dataset.tool = this.spaceHeld ? 'pan' : lab.tool;
    this.renderTree();
    this.renderInspector();
    this.renderStatus();
  }
}
