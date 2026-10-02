// The pixel-art lab's state, undo and redo, and start-up (spec D9). The page
// embeds every source as JSON. The lab keeps one open document, a scene or
// an object, plus a workspace of the documents edited so far (their drafts),
// so a scene shows the objects as they've been painted. Rendering and
// validation always go through the shared engine (R18).

import { loadSources, validate, type Sources } from '../../lib/pixel-art/engine.mjs';
import { pxToTile } from '../../lib/pixel-art/iso.mjs';
import { serialize } from '../../lib/pixel-art/serialize.mjs';
import { setUpDialogs, setUpProblems } from './dialogs';
import { ago, draftKeys, readDraft, removeDraft, storageWorks, writeDraft } from './drafts';
import { setUpExport } from './export';
import { setUpKeyboard } from './keyboard';
import { ObjectMode } from './object-mode';
import { SceneMode } from './scene-mode';
import { Stage } from './stage';

export interface LabData {
  palette: any;
  objects: Record<string, any>;
  scenes: Record<string, any>;
  siteVersion: Record<string, string>;
}

export type Kind = 'scene' | 'object';
/** An item's place in the scene: its index in `items`, then in each group's `items`. */
export type Path = number[];
export type Tool = 'select' | 'place' | 'pan';
export type Zoom = 1 | 2 | 3 | 4 | 'fit';

interface Snapshot {
  doc: string;
  selected: Path | null;
}

/** A document edited in this browser: a draft of a site document, or a new one. */
interface Entry {
  doc: any;
  /** The site version it started from, or 'new'. */
  version: string;
  saved: number;
}

/** Undo keeps at most this many steps (spec D9.7). */
const UNDO_LIMIT = 200;
/** The version stored with a document the site doesn't have. */
export const NEW = 'new';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A draft's view can be at most this wide or tall, a few times the largest committed scene. */
const MAX_VIEW = 2048;
/** A draft's map can be at most this wide or tall; island-base, the largest, is 193×128. */
const MAX_MAP = 512;

const isRecord = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const wholes = (v: unknown, n: number) => Array.isArray(v) && v.length === n && v.every((x) => Number.isInteger(x));
const strings = (v: unknown) => isRecord(v) && Object.values(v).every((x) => typeof x === 'string');
const isMap = (v: unknown) => Array.isArray(v) && v.length > 0 && v.length <= MAX_MAP && v.every((row) => typeof row === 'string' && row.length <= MAX_MAP);
const isLayer = (v: unknown) =>
  isRecord(v) &&
  ('frames' in v
    ? typeof v.loop === 'string' && typeof v.prefix === 'string' && Array.isArray(v.frames) && v.frames.length > 0 && v.frames.length <= 64 && v.frames.every(isMap)
    : isMap(v.map) && (v.class === undefined || typeof v.class === 'string'));

/** An item the lab can draw and edit: a placement, or a group of them. */
function usableItem(item: unknown): boolean {
  if (!isRecord(item)) return false;
  if ('group' in item) return strings(item.group) && Array.isArray(item.items) && item.items.every(usableItem);
  const at = item.at;
  if (item.class !== undefined && typeof item.class !== 'string') return false;
  return typeof item.object === 'string' && isRecord(at) && (wholes(at.tile, 3) || wholes(at.px, 2));
}

/**
 * Whether a stored draft has the shape of a scene, so it can be serialized,
 * drawn and edited. Unknown objects and the like are fine: they show up as
 * problems, which Export lists.
 */
export function usableScene(doc: unknown): boolean {
  // A `kind` would make serialize() treat the draft as an object.
  if (!isRecord(doc) || 'kind' in doc) return false;
  if (!wholes(doc.viewBox, 4)) return false;
  const [, , w, h] = doc.viewBox;
  if (w <= 0 || h <= 0 || w > MAX_VIEW || h > MAX_VIEW) return false;
  if ('origin' in doc && !wholes(doc.origin, 2)) return false;
  if ('output' in doc && typeof doc.output !== 'string') return false;
  return Array.isArray(doc.items) && doc.items.every(usableItem);
}

/** Whether a stored draft has the shape of an object, so it can be serialized, drawn and painted. */
export function usableObject(doc: unknown): boolean {
  if (!isRecord(doc)) return false;
  if (doc.kind === 'block') {
    const surface = doc.surface;
    const surfaceOk = surface === undefined || (isRecord(surface) && strings(surface.keys) && isLayer(surface));
    return wholes(doc.size, 3) && doc.size.every((n: number) => n >= 0 && n <= 8) && strings(doc.faces) && surfaceOk;
  }
  if (doc.kind !== 'sprite') return false;
  if ('keys' in doc && !strings(doc.keys)) return false;
  if ('anchor' in doc && !wholes(doc.anchor, 2)) return false;
  if ('legacy' in doc && doc.legacy !== true) return false;
  if ('extends' in doc) return typeof doc.extends === 'string' && !('layers' in doc) && (doc.rows === undefined || (isRecord(doc.rows) && Object.values(doc.rows).every(strings)));
  return Array.isArray(doc.layers) && doc.layers.length > 0 && doc.layers.length <= 64 && doc.layers.every(isLayer);
}

export const samePath = (a: Path | null, b: Path | null) => a !== null && b !== null && a.length === b.length && a.every((n, i) => n === b[i]);

/** `serialize`, or null if the document can't be serialized. */
function text(doc: unknown) {
  try {
    return serialize(doc);
  } catch {
    return null;
  }
}

export class Lab {
  readonly data: LabData;
  readonly storage = storageWorks();
  kind: Kind = 'scene';
  name = '';
  doc: any = null;
  sources!: Sources;
  problems: string[] = [];
  /** Every edited or new document, by `kind:name`. */
  readonly workspace = new Map<string, Entry>();
  /** Goes up whenever an object changes, so scenes and thumbnails redraw it. */
  objectRevision = 0;
  lastScene: string | null = null;
  lastObject: string | null = null;

  // Scene mode
  selected: Path | null = null;
  cursor: [number, number, number] = [0, 0, 0];
  tool: Tool = 'select';
  zoom: Zoom = 'fit';
  grid = false;
  /** The Library's current object, which Place and Enter put down. */
  current: string | null = null;

  /** Set when the open draft started from an older site version (A6). */
  stale = false;

  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private lastGroup: string | null = null;
  private listeners: ((what: 'doc' | 'view') => void)[] = [];
  private announcer: HTMLElement | null = null;

  constructor(data: LabData) {
    this.data = data;
    this.loadWorkspace();
  }

  get key() {
    return `${this.kind}:${this.name}`;
  }

  siteDocOf(kind: Kind, name: string) {
    return (kind === 'scene' ? this.data.scenes : this.data.objects)[name];
  }

  get siteDoc() {
    return this.siteDocOf(this.kind, this.name);
  }

  /** The open document's draft, if it has one. */
  get entry() {
    return this.workspace.get(this.key);
  }

  /** Whether the open document is new: not on the site. */
  get isNew() {
    return this.siteDoc === undefined;
  }

  /** Every object as the lab shows it: the site's, then the drafts over them. */
  objects(): Record<string, any> {
    return this.docs('object');
  }

  scenes(): Record<string, any> {
    return this.docs('scene');
  }

  private docs(kind: Kind) {
    const out = { ...(kind === 'scene' ? this.data.scenes : this.data.objects) };
    for (const [key, entry] of this.workspace) if (key.startsWith(`${kind}:`)) out[key.slice(kind.length + 1)] = entry.doc;
    if (this.kind === kind && this.doc) out[this.name] = this.doc;
    return out;
  }

  /** Names of the documents of a kind that exist only as drafts. */
  newNames(kind: Kind) {
    return [...this.workspace.entries()].filter(([key, e]) => key.startsWith(`${kind}:`) && e.version === NEW).map(([key]) => key.slice(kind.length + 1));
  }

  /** Whether a name is taken by any object or scene, on the site or in drafts. */
  nameTaken(name: string) {
    return Object.hasOwn(this.objects(), name) || Object.hasOwn(this.scenes(), name);
  }

  /**
   * Reads every stored draft. A draft the lab can't use (edited by hand, or
   * from a broken build) is dropped, so every document always opens.
   */
  private loadWorkspace() {
    if (!this.storage) return;
    for (const key of draftKeys()) {
      const [kind, name] = [key.slice(0, key.indexOf(':')) as Kind, key.slice(key.indexOf(':') + 1)];
      const stored = readDraft(key);
      const site = this.siteDocOf(kind, name);
      const usable = stored && (kind === 'scene' ? usableScene(stored.doc) : usableObject(stored.doc));
      const draftText = usable ? text(stored.doc) : null;
      const isNew = site === undefined;
      if (!stored || draftText === null || (isNew && stored.version !== NEW) || (!isNew && draftText === text(site))) {
        removeDraft(key);
        continue;
      }
      this.workspace.set(key, { doc: stored.doc, version: stored.version, saved: stored.saved });
    }
  }

  on(listener: (what: 'doc' | 'view') => void) {
    this.listeners.push(listener);
  }

  /** Re-renders everything: 'doc' when the document changed, 'view' for the rest. */
  notify(what: 'doc' | 'view') {
    for (const listener of this.listeners) listener(what);
  }

  setAnnouncer(el: HTMLElement) {
    this.announcer = el;
  }

  /** Says something in the status bar's polite live region. */
  announce(message: string) {
    if (!this.announcer) return;
    // Clearing first makes a repeated message speak again.
    this.announcer.textContent = '';
    requestAnimationFrame(() => this.announcer && (this.announcer.textContent = message));
  }

  /** Opens a scene or an object: its draft if there is one, else the site's version. */
  open(kind: Kind, name: string) {
    const entry = this.workspace.get(`${kind}:${name}`);
    const site = this.siteDocOf(kind, name);
    if (!entry && site === undefined) return;
    this.kind = kind;
    this.name = name;
    this.doc = copy(entry ? entry.doc : site);
    this.stale = Boolean(entry && entry.version !== NEW && entry.version !== this.data.siteVersion[this.key]);
    this.selected = null;
    this.undoStack = [];
    this.redoStack = [];
    this.lastGroup = null;
    if (kind === 'scene') {
      this.lastScene = name;
      // The stage cursor starts on the tile at the middle of the view.
      const [x, y, w, h] = this.doc.viewBox;
      this.cursor = pxToTile([Math.floor(x + w / 2), Math.floor(y + h / 2)], 0, this.doc.origin ?? [0, 0]);
    } else this.lastObject = name;
    this.refresh();
    this.notify('doc');
  }

  /** Adds a new document as a draft and opens it. */
  create(kind: Kind, name: string, doc: any) {
    const entry = { doc: copy(doc), version: NEW, saved: Date.now() };
    this.workspace.set(`${kind}:${name}`, entry);
    if (this.storage) writeDraft(`${kind}:${name}`, entry);
    if (kind === 'object') this.objectRevision++;
    this.open(kind, name);
  }

  /**
   * Changes the document as one undo step. Edits that share a `group` (one
   * drag, one stroke, or one held key) after each other make a single step.
   */
  edit(fn: (doc: any) => void, group: string | null = null) {
    const before = this.snapshot();
    fn(this.doc);
    if (JSON.stringify(this.doc) === before.doc) return;
    if (group === null || group !== this.lastGroup) {
      this.undoStack.push(before);
      if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    }
    this.lastGroup = group;
    this.redoStack = [];
    this.changed();
  }

  /** Puts the document back as it was before the current group: Escape during a stroke. */
  cancelGroup() {
    const group = this.lastGroup;
    this.lastGroup = null;
    if (group === null) return false;
    const snap = this.undoStack.pop();
    if (!snap) return false;
    this.doc = JSON.parse(snap.doc);
    this.selected = snap.selected;
    this.changed();
    return true;
  }

  /** Ends a group, so the next edit is a new undo step. */
  endGroup() {
    this.lastGroup = null;
  }

  undo() {
    this.step(this.undoStack, this.redoStack, 'Undid', 'Nothing to undo');
  }

  redo() {
    this.step(this.redoStack, this.undoStack, 'Redid', 'Nothing to redo');
  }

  private step(from: Snapshot[], to: Snapshot[], verb: string, empty: string) {
    const snap = from.pop();
    if (!snap) return this.announce(empty);
    to.push(this.snapshot());
    this.doc = JSON.parse(snap.doc);
    this.selected = snap.selected;
    this.lastGroup = null;
    this.changed();
    this.announce(`${verb} the last change`);
  }

  private snapshot(): Snapshot {
    return { doc: JSON.stringify(this.doc), selected: this.selected && [...this.selected] };
  }

  /** Saves the draft, reloads the sources and problems, and re-renders. */
  private changed() {
    this.save();
    if (this.kind === 'object') this.objectRevision++;
    this.refresh();
    this.notify('doc');
  }

  private refresh() {
    this.sources = loadSources({ palette: this.data.palette, objects: this.objects(), scenes: this.scenes() });
    const file = `${this.kind}s/${this.name}.mjs: `;
    this.problems = validate(this.sources)
      .filter((p) => p.startsWith(file))
      .map((p) => p.slice(file.length));
  }

  /** Saves the open document as a draft, or drops the draft once it matches the site. */
  private save() {
    if (!this.isNew && serialize(this.doc) === serialize(this.siteDoc)) {
      this.workspace.delete(this.key);
      removeDraft(this.key);
      this.stale = false;
      return;
    }
    const version = this.entry?.version ?? this.data.siteVersion[this.key] ?? NEW;
    const entry = { doc: copy(this.doc), version, saved: Date.now() };
    this.workspace.set(this.key, entry);
    if (this.storage) writeDraft(this.key, entry);
  }

  /** "Keep draft": the draft now counts as based on today's site version. */
  keepDraft() {
    const entry = this.entry;
    this.stale = false;
    if (entry) {
      entry.version = this.data.siteVersion[this.key];
      if (this.storage) writeDraft(this.key, entry);
    }
    this.notify('view');
  }

  /** Back to the site's version, as one undo step. */
  loadSite() {
    this.stale = false;
    this.selected = null;
    this.edit((doc) => {
      for (const key of Object.keys(doc)) delete doc[key];
      Object.assign(doc, copy(this.siteDoc));
    });
    this.notify('doc');
  }

  /** Deletes a new document's draft, then opens the last scene. */
  discard() {
    const name = this.name;
    this.workspace.delete(this.key);
    removeDraft(this.key);
    if (this.kind === 'object') this.objectRevision++;
    const scene = this.lastScene && this.lastScene !== name ? this.lastScene : Object.keys(this.data.scenes)[0];
    this.doc = null;
    this.open('scene', scene);
    this.announce(`Discarded ${name}`);
  }

  set(changes: Partial<Pick<Lab, 'tool' | 'zoom' | 'grid' | 'current' | 'selected' | 'cursor'>>) {
    Object.assign(this, changes);
    this.notify('view');
  }

  draftText(now = Date.now()) {
    if (!this.storage) return "Drafts off: this browser isn't saving them";
    const entry = this.entry;
    if (!entry) return 'Site version';
    return `${entry.version === NEW ? 'New, not on the site' : 'Draft'}, ${ago(entry.saved, now)}`;
  }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** The lab bar: the document picker, draft status, Reset or Discard, and the stale-draft banner. */
function setUpLabBar(lab: Lab, openNew: (kind: Kind) => void) {
  const picker = $<HTMLSelectElement>('lab-doc');
  const draft = $('lab-draft');
  const draftText = $('lab-draft-text');
  const reset = $<HTMLButtonElement>('lab-reset');
  const banner = $('lab-banner');
  picker.addEventListener('change', () => {
    const [kind, name] = picker.value.split(':');
    if (kind === 'new') {
      picker.value = lab.key;
      return openNew(name as Kind);
    }
    lab.open(kind as Kind, name);
  });
  reset.addEventListener('click', () => {
    if (lab.isNew) return lab.discard();
    lab.loadSite();
    lab.announce(`Reset ${lab.name} to the site version`);
  });
  $('lab-keep').addEventListener('click', () => {
    lab.keepDraft();
    lab.announce('Kept the draft');
    $('lab-stage').focus();
  });
  $('lab-load-site').addEventListener('click', () => {
    lab.loadSite();
    lab.announce(`Loaded the site version of ${lab.name}`);
    $('lab-stage').focus();
  });

  /** New drafts go at the end of their kind's group. */
  const fillPicker = () => {
    for (const kind of ['scene', 'object'] as const) {
      const group = picker.querySelector<HTMLOptGroupElement>(`optgroup[data-kind="${kind}"]`)!;
      group.querySelectorAll('[data-new]').forEach((o) => o.remove());
      for (const name of lab.newNames(kind)) {
        const option = new Option(`${kind === 'scene' ? 'Scene' : 'Object'} · ${name} (new)`, `${kind}:${name}`);
        option.dataset.new = '';
        group.append(option);
      }
    }
  };
  let shown = '';
  const render = () => {
    const names = `${lab.newNames('scene')}|${lab.newNames('object')}`;
    if (names !== shown) fillPicker();
    shown = names;
    picker.value = lab.key;
    draftText.textContent = lab.draftText();
    draft.dataset.state = !lab.storage ? 'off' : lab.entry ? 'draft' : 'site';
    reset.hidden = !lab.entry;
    reset.textContent = lab.isNew ? 'Discard draft' : 'Reset to site version';
    banner.hidden = !lab.stale;
    $('lab-banner-text').textContent = lab.stale ? `This draft started from an older version of ${lab.name} on the site.` : '';
  };
  lab.on(render);
  setInterval(() => (draftText.textContent = lab.draftText()), 30000);
}

/** The mode switch: Scene opens the last scene; Object opens the selected or chosen object. */
function setUpModes(lab: Lab, scene: SceneMode) {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.lab-toolbar [data-mode]');
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode as Kind;
      if (mode === lab.kind) return;
      if (mode === 'scene') lab.open('scene', lab.lastScene ?? Object.keys(lab.data.scenes)[0]);
      else lab.open('object', scene.selectedItem?.object ?? lab.current ?? lab.lastObject ?? Object.keys(lab.data.objects)[0]);
      lab.announce(`${mode === 'scene' ? 'Scene' : 'Object'} mode, ${lab.name}`);
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('.lab-toolbar [data-action="undo"], .lab-toolbar [data-action="redo"]')) {
    button.addEventListener('click', () => (button.dataset.action === 'undo' ? lab.undo() : lab.redo()));
  }
  lab.on(() => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.mode === lab.kind));
    // Each mode's own controls show only in that mode.
    for (const el of document.querySelectorAll<HTMLElement>('[data-for]')) el.hidden = el.dataset.for !== lab.kind;
    document.querySelector('.lab')!.setAttribute('data-mode', lab.kind);
    $('lab-stage').setAttribute('aria-label', lab.kind === 'scene' ? 'Scene stage' : 'Object stage');
    $('lab-tab-items').textContent = lab.kind === 'scene' ? 'Items' : 'Palette';
  });
}

/**
 * Below 960px, the Library and the two Inspector columns become tabs (spec
 * D9.3). Above it, they're columns, and the tab roles come off.
 */
function setUpTabs() {
  const narrow = matchMedia('(max-width: 959.98px)');
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.lab__tabs [role="tab"]')];
  const panels = tabs.map((tab) => $(tab.getAttribute('aria-controls')!));
  let current = 0;
  const show = (index: number, focus = false) => {
    current = index;
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (narrow.matches) {
        panels[i].setAttribute('role', 'tabpanel');
        panels[i].setAttribute('aria-labelledby', tab.id);
        panels[i].hidden = !on;
      } else {
        panels[i].removeAttribute('role');
        panels[i].removeAttribute('aria-labelledby');
        panels[i].hidden = false;
      }
    });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => show(i));
    tab.addEventListener('keydown', (e) => {
      const keys: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      show((keys[e.key] + tabs.length) % tabs.length, true);
    });
  });
  narrow.addEventListener('change', () => show(current));
  show(0);
}

export function start() {
  const app = document.querySelector<HTMLElement>('.lab__app');
  const json = document.getElementById('lab-data');
  if (!app || !json) return;
  const data: LabData = JSON.parse(json.textContent ?? '{}');
  const lab = new Lab(data);
  lab.setAnnouncer($('lab-announce'));
  app.hidden = false;

  const openNew = setUpDialogs(lab);
  setUpLabBar(lab, openNew);
  setUpTabs();
  const stage = new Stage(lab);
  const scene = new SceneMode(lab, stage);
  const object = new ObjectMode(lab, stage);
  setUpModes(lab, scene);
  setUpProblems(lab, scene, object);
  setUpKeyboard(lab, stage, scene, object);
  setUpExport(lab);

  const [kind, name] = $<HTMLSelectElement>('lab-doc').value.split(':') as [Kind, string];
  lab.open(kind, name);
}
