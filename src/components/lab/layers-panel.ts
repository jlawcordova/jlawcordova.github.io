// The Layers panel (spec D9.5): the object's layers, bottom to top. Each row
// selects the layer painting goes to, and has a visibility toggle (editor
// only, never exported), Raise, Lower, Duplicate and Delete. An object that
// extends another takes its layers from it, so it only shows them.

import { addLayer, deleteLayer, duplicateLayer, move } from '../../lib/pixel-art/edit.mjs';
import type { ObjectMode } from './object-mode';

const $ = (id: string) => document.getElementById(id)!;

export class LayersPanel {
  private readonly mode: ObjectMode;

  constructor(mode: ObjectMode) {
    this.mode = mode;
    $('lab-layers').addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button[data-layer-action]');
      if (!button) return;
      this.act(button.dataset.layerAction!, Number(button.dataset.index));
    });
    document.querySelector('[data-layer="add"]')!.addEventListener('click', () => this.act('add', this.mode.layer));
  }

  /** "Layer 2 · cbob" or "Layer 3 · loop wf, 5 frames". */
  label(index: number) {
    const layer = this.mode.resolved?.layers[index];
    if (!layer) return `Layer ${index + 1}`;
    if ('frames' in layer) return `Layer ${index + 1} · loop ${layer.loop}, ${layer.frames.length} frame${layer.frames.length === 1 ? '' : 's'}`;
    return `Layer ${index + 1}${layer.class ? ` · ${layer.class}` : ''}`;
  }

  /** Whether the layers can change: an object with its own layers, not a block or an outfit. */
  private get editable() {
    const doc = this.mode.lab.doc;
    return doc?.kind === 'sprite' && !doc.extends;
  }

  private act(action: string, index: number) {
    const { lab } = this.mode;
    const name = this.label(index);
    if (action === 'select') return this.mode.selectLayer(index);
    if (action === 'visible') {
      if (this.mode.hidden.has(index)) this.mode.hidden.delete(index);
      else this.mode.hidden.add(index);
      lab.notify('view');
      return lab.announce(`${name} ${this.mode.hidden.has(index) ? 'hidden' : 'shown'} in the editor`);
    }
    if (!this.editable) return;
    if (action === 'delete' && lab.doc.layers.length === 1) return lab.announce(`${name} is the only layer, so it stays`);
    let next = index;
    lab.edit((doc) => {
      if (action === 'add') next = addLayer(doc);
      if (action === 'raise') next = move(doc.layers, index, 1);
      if (action === 'lower') next = move(doc.layers, index, -1);
      if (action === 'duplicate') next = duplicateLayer(doc, index);
      if (action === 'delete') next = deleteLayer(doc, index);
    });
    // Visibility follows the layers it was set on only while nothing moves.
    this.mode.hidden.clear();
    this.mode.selectLayer(next, false);
    const said: Record<string, string> = {
      add: `Added ${this.label(next)}`,
      raise: next === index ? `${name} is already the top layer` : `${name} raised to layer ${next + 1}`,
      lower: next === index ? `${name} is already the bottom layer` : `${name} lowered to layer ${next + 1}`,
      duplicate: `${name} duplicated as layer ${next + 1}`,
      delete: `${name} deleted`,
    };
    lab.announce(said[action]);
  }

  render() {
    const r = this.mode.resolved;
    const editable = this.editable;
    const list = $('lab-layers');
    const layers = r?.layers ?? [];
    const button = (text: string, action: string, index: number, aria: string, extra: Record<string, string> = {}) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: text });
      b.className = action === 'select' ? 'lab-layer__name' : 'lab-step';
      b.dataset.layerAction = action;
      b.dataset.index = String(index);
      b.setAttribute('aria-label', aria);
      for (const [k, v] of Object.entries(extra)) b.setAttribute(k, v);
      return b;
    };
    list.replaceChildren(
      ...layers.map((_, i) => {
        const li = document.createElement('li');
        li.className = 'lab-layer';
        const name = this.label(i);
        const visible = !this.mode.hidden.has(i);
        li.append(
          button(name, 'select', i, name, { 'aria-pressed': String(i === this.mode.layer) }),
          button(visible ? '◉' : '○', 'visible', i, `Show ${name.replace(/ · .*/, '')}`, { 'aria-pressed': String(visible) }),
        );
        if (editable) {
          const label = name.replace(/ · .*/, '');
          const actions = Object.assign(document.createElement('div'), { className: 'lab-layer__actions' });
          actions.append(
            button('↑', 'raise', i, `Raise ${label}`),
            button('↓', 'lower', i, `Lower ${label}`),
            button('⧉', 'duplicate', i, `Duplicate ${label}`),
            button('✕', 'delete', i, `Delete ${label}`),
          );
          li.append(actions);
        }
        return li;
      }),
    );
    (document.querySelector('[data-layer="add"]') as HTMLElement).hidden = !editable;
    // data-off, not hidden: the mode switch sets hidden on every data-for part.
    list.closest<HTMLElement>('.lab-panel__part')!.toggleAttribute('data-off', this.mode.isBlock);
  }
}
