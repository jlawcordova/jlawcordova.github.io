// Object mode's Animation pane (spec D9.5, widened by the island level up
// spec). On a frame loop: a strip of its frames (w0, w1 …), with add,
// duplicate, delete and reorder, step back, play and step forward, and the
// loop it plays as. On a still layer: Animate this layer turns it into a
// loop. Below, the object's poses and variants (objects named after it). Play
// runs at the loop's CSS timing (pixel-art.css). It never starts by itself,
// so under reduced motion nothing moves until you press it.

import { addFrame, animateLayer, deleteFrame, duplicateFrame, move, setLoop, stillLayer } from '../../lib/pixel-art/edit.mjs';
import { LOOP_CYCLES as CYCLE, SITE_LOOPS } from '../../lib/pixel-art/motion.mjs';
import type { ObjectMode } from './object-mode';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;


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
      if (button.dataset.pose) return this.mode.lab.open('object', button.dataset.pose);
      const action = button.dataset.frame;
      if (action === 'play') return this.timer ? this.stop(true) : this.play();
      if (action === 'back' || action === 'forward') return this.mode.selectFrame(this.mode.frame + (action === 'back' ? -1 : 1));
      if (action === 'animate' || action === 'still') return this.animate(action === 'animate');
      if (action) this.act(action);
    });
    $('lab-loop').addEventListener('change', (e) => {
      const loop = (e.target as HTMLSelectElement).value;
      if (!this.loop || !this.editable) return;
      this.stop();
      this.mode.lab.edit((doc) => setLoop(doc, this.mode.layer, loop));
      this.mode.lab.announce(`Plays as ${loop}, ${SITE_LOOPS[loop].frames} frames`);
    });
  }

  /** The selected layer, if it's a still map on an object with layers of its own. */
  private get still() {
    const layer = this.mode.lab.doc?.layers?.[this.mode.layer];
    return this.editable && layer && 'map' in layer ? layer : null;
  }

  /** Turns the selected still layer into a loop, or the selected loop back into a still layer. */
  private animate(on: boolean) {
    const { lab } = this.mode;
    const layer = this.mode.layer;
    if (on ? !this.still : !this.loop || !this.editable) return;
    this.stop();
    const frame = this.mode.frame;
    lab.edit((doc) => (on ? animateLayer(doc, layer, 'ff') : stillLayer(doc, layer, frame)));
    this.mode.selectFrame(0, false);
    lab.announce(on ? 'Animated as ff, 4 frames, each a copy to paint' : `Still, keeping frame ${frame + 1}`);
  }

  /** Objects named after this one (mine-cart, mine-cart-tipped), the object itself included. */
  private poses(): string[] {
    const { lab } = this.mode;
    const names = Object.keys(lab.objects());
    const own = lab.name;
    const cut = own.lastIndexOf('-');
    const base = cut > 0 && names.includes(own.slice(0, cut)) ? own.slice(0, cut) : own;
    const family = names.filter((n) => n === base || n.startsWith(`${base}-`));
    return family.length > 1 ? family : [];
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
    const still = this.still;
    const part = $('lab-frames-part');
    const poses = this.poses();
    part.toggleAttribute('data-off', !loop && !still && poses.length === 0);
    $('lab-still-note').hidden = !still;
    $('lab-loop-field').hidden = !loop || !this.editable;
    for (const el of part.querySelectorAll<HTMLElement>('#lab-frames, .lab-frames__play')) el.hidden = !loop;
    const posesPart = $('lab-poses-part');
    posesPart.hidden = poses.length === 0;
    const list = $('lab-poses');
    if (list.dataset.names !== poses.join(' ') || list.dataset.own !== this.mode.lab.name) {
      list.dataset.names = poses.join(' ');
      list.dataset.own = this.mode.lab.name;
      list.replaceChildren(
        ...poses.map((name) => {
          const b = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn--ghost', textContent: name });
          b.dataset.pose = name;
          b.setAttribute('aria-pressed', String(name === this.mode.lab.name));
          return b;
        }),
      );
    }
    const actions = part.querySelectorAll<HTMLButtonElement>('.lab-actions [data-frame]');
    if (!loop) {
      this.stop();
      for (const b of actions) b.hidden = b.dataset.frame !== 'animate' || !still;
      $('lab-loop-note').textContent = '';
      return;
    }
    const site = SITE_LOOPS[loop.loop];
    const select = $<HTMLSelectElement>('lab-loop');
    if (site) select.value = loop.loop;
    $('lab-loop-note').textContent = !site
      ? `The site's CSS doesn't play ${loop.loop}. Choose ff, wf or hf.`
      : loop.frames.length > site.frames
        ? `The site plays ${site.frames} frames of ${loop.loop}; this loop has ${loop.frames.length}, so the last ${loop.frames.length - site.frames} never show.`
        : loop.frames.length < site.frames
          ? `The site plays ${site.frames} frames of ${loop.loop}; this loop has ${loop.frames.length}, so it blinks off for the rest.`
          : 'Frame 0 is the rest frame, what reduced motion shows.';
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
    for (const b of actions) b.hidden = !this.editable || b.dataset.frame === 'animate';
  }
}
