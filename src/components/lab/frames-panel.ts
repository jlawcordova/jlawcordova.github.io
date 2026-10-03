// The Frames panel (spec D9.5): shown when the selected layer is a frame
// loop. A strip of its frames (w0, w1 …), with add, duplicate, delete and
// reorder, and step back, play and step forward. Play runs at the loop's CSS
// timing (pixel-art.css). It never starts by itself, so under reduced motion
// nothing moves until you press it.

import { addFrame, deleteFrame, duplicateFrame, move } from '../../lib/pixel-art/edit.mjs';
import type { ObjectMode } from './object-mode';

const $ = (id: string) => document.getElementById(id)!;

/** Each loop's full cycle in ms, from pixel-art.css; other loops step every 200ms. */
const CYCLE: Record<string, number> = { wf: 1000, ff: 600, hf: 3000 };

export class FramesPanel {
  private readonly mode: ObjectMode;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(mode: ObjectMode) {
    this.mode = mode;
    const part = $('lab-frames-part');
    part.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.index !== undefined) return this.mode.selectFrame(Number(button.dataset.index));
      const action = button.dataset.frame;
      if (action === 'play') return this.timer ? this.stop(true) : this.play();
      if (action === 'back' || action === 'forward') return this.mode.selectFrame(this.mode.frame + (action === 'back' ? -1 : 1));
      if (action) this.act(action);
    });
  }

  /** The selected layer, if it's a frame loop. */
  private get loop() {
    const layer = this.mode.resolved?.layers[this.mode.layer];
    return layer && 'frames' in layer ? layer : null;
  }

  private get editable() {
    const doc = this.mode.lab.doc;
    return doc?.kind === 'sprite' && !doc.extends;
  }

  private play() {
    const loop = this.loop;
    if (!loop) return;
    const step = (CYCLE[loop.loop] ?? 200 * loop.frames.length) / loop.frames.length;
    this.timer = setInterval(() => this.mode.selectFrame(this.mode.frame + 1, false), step);
    this.mode.lab.announce(`Playing ${loop.loop}, ${Math.round(step)} ms a frame`);
    this.render();
  }

  stop(announce = false) {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    if (announce) this.mode.lab.announce(`Paused on frame ${this.mode.frame + 1}`);
    this.render();
  }

  private act(action: string) {
    const { lab } = this.mode;
    const loop = this.loop;
    if (!loop || !this.editable) return;
    const layer = this.mode.layer;
    const index = this.mode.frame;
    if (action === 'delete' && loop.frames.length === 1) return lab.announce('A loop keeps at least one frame');
    this.stop();
    let next = index;
    lab.edit((doc) => {
      const frames = doc.layers[layer].frames;
      if (action === 'add') next = addFrame(doc, layer, index);
      if (action === 'duplicate') next = duplicateFrame(doc, layer, index);
      if (action === 'delete') next = deleteFrame(doc, layer, index);
      if (action === 'earlier') next = move(frames, index, -1);
      if (action === 'later') next = move(frames, index, 1);
    });
    this.mode.selectFrame(next, false);
    const name = `${loop.prefix}${index}`;
    const said: Record<string, string> = {
      add: `Added a blank frame, ${loop.prefix}${next}`,
      duplicate: `${name} duplicated as ${loop.prefix}${next}`,
      delete: `${name} deleted`,
      earlier: next === index ? `${name} is already first` : `${name} moved to ${loop.prefix}${next}`,
      later: next === index ? `${name} is already last` : `${name} moved to ${loop.prefix}${next}`,
    };
    lab.announce(said[action]);
  }

  render() {
    const loop = this.loop;
    const part = $('lab-frames-part');
    part.toggleAttribute('data-off', !loop);
    if (!loop) return this.stop();
    const strip = $('lab-frames');
    if (strip.childElementCount !== loop.frames.length || strip.dataset.prefix !== loop.prefix) {
      strip.dataset.prefix = loop.prefix;
      strip.replaceChildren(
        ...loop.frames.map((_, i) => {
          const b = Object.assign(document.createElement('button'), { type: 'button', className: 'lab-frame', textContent: `${loop.prefix}${i}` });
          b.dataset.index = String(i);
          b.setAttribute('aria-label', `Frame ${loop.prefix}${i}`);
          return b;
        }),
      );
    }
    strip.querySelectorAll<HTMLButtonElement>('[data-index]').forEach((b, i) => b.setAttribute('aria-pressed', String(i === this.mode.frame)));
    const play = part.querySelector<HTMLButtonElement>('[data-frame="play"]')!;
    play.textContent = this.timer ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(Boolean(this.timer)));
    for (const b of part.querySelectorAll<HTMLButtonElement>('.lab-actions [data-frame]')) b.hidden = !this.editable;
  }
}
