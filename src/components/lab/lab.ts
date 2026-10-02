// The pixel-art lab's state, undo and redo, and start-up (spec D9). The page
// embeds every source as JSON; the lab keeps one open document, a copy of a
// scene, and re-renders the regions whenever it changes. Rendering and
// validation always go through the shared engine (R18).

import { loadSources, validate, type Sources } from '../../lib/pixel-art/engine.mjs';
import { pxToTile } from '../../lib/pixel-art/iso.mjs';
import { serialize } from '../../lib/pixel-art/serialize.mjs';
import { ago, readDraft, removeDraft, storageWorks, writeDraft } from './drafts';
import { setUpExport } from './export';
import { setUpKeyboard } from './keyboard';
import { SceneMode } from './scene-mode';
import { Stage } from './stage';

export interface LabData {
  palette: unknown;
  objects: Record<string, any>;
  scenes: Record<string, any>;
  siteVersion: Record<string, string>;
}

/** An item's place in the scene: its index in `items`, then in each group's `items`. */
export type Path = number[];
export type Tool = 'select' | 'place' | 'pan';
export type Zoom = 1 | 2 | 3 | 4 | 'fit';

interface Snapshot {
  doc: string;
  selected: Path | null;
}

/** Undo keeps at most this many steps (spec D9.7). */
const UNDO_LIMIT = 200;

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const samePath = (a: Path | null, b: Path | null) => a !== null && b !== null && a.length === b.length && a.every((n, i) => n === b[i]);

export class Lab {
  readonly data: LabData;
  readonly storage = storageWorks();
  name = '';
  doc: any = null;
  sources!: Sources;
  problems: string[] = [];
  selected: Path | null = null;
  cursor: [number, number, number] = [0, 0, 0];
  tool: Tool = 'select';
  zoom: Zoom = 'fit';
  grid = false;
  /** The Library's current object, which Place and Enter put down. */
  current: string | null = null;
  /** The draft's site version, or null when the open document is the site's. */
  draftVersion: string | null = null;
  draftSaved = 0;
  /** Set when the open draft started from an older site version (A6). */
  stale = false;

  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private lastGroup: string | null = null;
  private listeners: ((what: 'doc' | 'view') => void)[] = [];
  private announcer: HTMLElement | null = null;

  constructor(data: LabData) {
    this.data = data;
  }

  get key() {
    return `scene:${this.name}`;
  }

  get siteDoc() {
    return this.data.scenes[this.name];
  }

  /** Runs on every change: 'doc' when the document changed, 'view' for the rest. */
  on(listener: (what: 'doc' | 'view') => void) {
    this.listeners.push(listener);
  }

  notify(what: 'doc' | 'view') {
    for (const listener of this.listeners) listener(what);
  }

  setAnnouncer(el: HTMLElement) {
    this.announcer = el;
  }

  /** Says something in the status bar's polite live region. */
  announce(text: string) {
    if (!this.announcer) return;
    // Clearing first makes a repeated message speak again.
    this.announcer.textContent = '';
    requestAnimationFrame(() => this.announcer && (this.announcer.textContent = text));
  }

  /** Opens a scene: its draft if there is one, else the site's version. */
  open(name: string) {
    this.name = name;
    this.selected = null;
    this.undoStack = [];
    this.redoStack = [];
    this.lastGroup = null;
    const draft = this.storage ? readDraft(this.key) : null;
    if (draft && serialize(draft.doc) !== serialize(this.siteDoc)) {
      this.doc = copy(draft.doc);
      this.draftVersion = draft.version;
      this.draftSaved = draft.saved;
      this.stale = draft.version !== this.data.siteVersion[this.key];
    } else {
      if (draft) removeDraft(this.key);
      this.doc = copy(this.siteDoc);
      this.draftVersion = null;
      this.stale = false;
    }
    // The stage cursor starts on the tile at the middle of the view.
    const [x, y, w, h] = this.doc.viewBox;
    this.cursor = pxToTile([Math.floor(x + w / 2), Math.floor(y + h / 2)], 0, this.doc.origin ?? [0, 0]);
    this.refresh();
    this.notify('doc');
  }

  /**
   * Changes the document as one undo step. Edits that share a `group` (one
   * drag, or one held key) after each other make a single step.
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

  /** Reloads the sources and problems, saves the draft, and re-renders. */
  private changed() {
    this.refresh();
    this.save();
    this.notify('doc');
  }

  private refresh() {
    const { palette, objects, scenes } = this.data;
    this.sources = loadSources({ palette, objects, scenes: { ...scenes, [this.name]: this.doc } });
    const file = `scenes/${this.name}.mjs: `;
    this.problems = validate(this.sources)
      .filter((p) => p.startsWith(file))
      .map((p) => p.slice(file.length));
  }

  /** Saves the open document as a draft, or drops the draft once it matches the site. */
  private save() {
    if (serialize(this.doc) === serialize(this.siteDoc)) {
      removeDraft(this.key);
      this.draftVersion = null;
      this.stale = false;
      return;
    }
    this.draftVersion ??= this.data.siteVersion[this.key];
    this.draftSaved = Date.now();
    if (this.storage) writeDraft(this.key, { version: this.draftVersion, saved: this.draftSaved, doc: this.doc });
  }

  /** "Keep draft": the draft now counts as based on today's site version. */
  keepDraft() {
    this.stale = false;
    this.draftVersion = this.data.siteVersion[this.key];
    this.save();
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

  set(changes: Partial<Pick<Lab, 'tool' | 'zoom' | 'grid' | 'current' | 'selected' | 'cursor'>>) {
    Object.assign(this, changes);
    this.notify('view');
  }

  draftText(now = Date.now()) {
    if (!this.storage) return "Drafts off: this browser isn't saving them";
    if (this.draftVersion === null) return 'Site version';
    return `Draft, ${ago(this.draftSaved, now)}`;
  }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** The lab bar: picker, draft status, reset, and the stale-draft banner. */
function setUpLabBar(lab: Lab) {
  const picker = $<HTMLSelectElement>('lab-doc');
  const draft = $('lab-draft');
  const draftText = $('lab-draft-text');
  const reset = $<HTMLButtonElement>('lab-reset');
  const banner = $('lab-banner');
  picker.addEventListener('change', () => lab.open(picker.value.replace(/^scene:/, '')));
  reset.addEventListener('click', () => {
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
  const render = () => {
    picker.value = lab.key;
    draftText.textContent = lab.draftText();
    draft.dataset.state = !lab.storage ? 'off' : lab.draftVersion === null ? 'site' : 'draft';
    reset.hidden = lab.draftVersion === null;
    banner.hidden = !lab.stale;
    $('lab-banner-text').textContent = lab.stale ? `This draft started from an older version of ${lab.name} on the site.` : '';
  };
  lab.on(render);
  setInterval(() => (draftText.textContent = lab.draftText()), 30000);
}

/**
 * Below 960px, Library, Items and Inspector become tabs (spec D9.3). Above
 * it, they're columns, and the tab roles come off.
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
        panels[i].setAttribute('aria-labelledby', panels[i].dataset.title ?? '');
        panels[i].hidden = false;
      }
    });
    if (focus) tabs[index].focus();
  };
  panels.forEach((panel) => (panel.dataset.title = panel.getAttribute('aria-labelledby') ?? ''));
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

  setUpLabBar(lab);
  setUpTabs();
  const stage = new Stage(lab);
  const scene = new SceneMode(lab, stage);
  setUpKeyboard(lab, stage, scene);
  setUpExport(lab);

  const first = $<HTMLSelectElement>('lab-doc').value.replace(/^scene:/, '');
  lab.open(first);
}
