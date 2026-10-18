// The Animation pane (island level up spec): plays, pauses and scrubs the
// open scene, with its frame loops and its motion (motion.mjs), and edits the
// selected item's track: its keys' times, moves, show and pose. Play never
// starts by itself, so under reduced motion nothing moves until you press it.

import { filledKeys, stateAt } from '../../lib/pixel-art/motion.mjs';
import { itemAt } from './scene-mode';
import type { Lab } from './lab';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
/** A new scene's loop, in ms. */
const NEW_DURATION = 4000;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export class AnimationPanel {
  private readonly lab: Lab;
  private frame = 0;
  private started = 0;

  constructor(lab: Lab) {
    this.lab = lab;
    const panel = $('lab-anim');
    panel.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      const action = button?.dataset.anim;
      if (action === 'play') this.toggle();
      if (action === 'start') this.seek(0);
      if (action === 'track') this.track();
      if (action === 'untrack') this.untrack();
      if (action === 'key') this.addKey();
      if (button?.dataset.goto) this.seek(Number(button.dataset.goto));
      if (button?.dataset.remove) this.editKey(Number(button.dataset.remove), null);
    });
    $<HTMLInputElement>('lab-time').addEventListener('input', (e) => this.seek(Number((e.target as HTMLInputElement).value)));
    $<HTMLInputElement>('lab-duration').addEventListener('change', (e) => this.setDuration(e.target as HTMLInputElement));
    $('lab-keys').addEventListener('change', (e) => this.changeKey(e.target as HTMLInputElement | HTMLSelectElement));
    lab.on(() => this.render());
  }

  get duration(): number {
    return this.lab.doc?.motion?.duration ?? NEW_DURATION;
  }

  /** The selected item, and its track's index if it has one. */
  private selection() {
    const item = itemAt(this.lab.doc, this.lab.selected);
    const tracks = this.lab.doc?.motion?.tracks ?? [];
    const index = item?.id === undefined ? -1 : tracks.findIndex((t: any) => t.item === item.id);
    return { item, index, track: index < 0 ? null : tracks[index] };
  }

  seek(time: number) {
    if (this.lab.playing) this.started = performance.now() - time;
    this.lab.set({ time: Math.max(0, Math.min(Math.round(time), this.duration - 1)) });
  }

  toggle() {
    if (this.lab.playing) return this.stop();
    if (this.lab.kind !== 'scene') return;
    this.started = performance.now() - this.lab.time;
    this.lab.set({ playing: true });
    const tick = (now: number) => {
      if (!this.lab.playing || this.lab.kind !== 'scene') return this.stop();
      // 20 steps a second: every loop and pixel step lands, and the stage keeps up.
      const time = Math.floor(((now - this.started) % this.duration) / 50) * 50;
      if (time !== this.lab.time) this.lab.set({ time });
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    this.lab.announce('Playing');
  }

  stop() {
    cancelAnimationFrame(this.frame);
    if (!this.lab.playing) return;
    this.lab.set({ playing: false });
    this.lab.announce(`Paused at ${seconds(this.lab.time)}`);
  }

  private setDuration(input: HTMLInputElement) {
    const ms = Math.round(Number(input.value) * 1000);
    const last = Math.max(0, ...(this.lab.doc.motion?.tracks ?? []).flatMap((t: any) => t.keys.map((k: any) => k.t)));
    if (!Number.isFinite(ms) || ms < 100 || ms <= last) {
      this.lab.announce(`The loop must be at least 0.1 s and longer than its last key, ${seconds(last)}`);
      return this.render();
    }
    this.lab.edit((doc) => {
      doc.motion = { duration: ms, tracks: doc.motion?.tracks ?? [] };
    });
    this.seek(Math.min(this.lab.time, ms - 1));
    this.lab.announce(`Loop set to ${seconds(ms)}`);
  }

  /** Gives the selected item an id, if it has none, and a track with one key at 0. */
  private track() {
    const { item } = this.selection();
    const path = this.lab.selected;
    if (!item || !path) return;
    let id = item.id;
    if (id === undefined) {
      const taken = new Set<string>();
      const walk = (items: any[]) => items.forEach((i) => ('group' in i ? walk(i.items) : i.id && taken.add(i.id)));
      walk(this.lab.doc.items);
      for (let n = 1; ; n++) if (!taken.has((id = n === 1 ? item.object : `${item.object}-${n}`))) break;
    }
    this.lab.edit((doc) => {
      const target = itemAt(doc, path);
      const { object, class: cls, at } = target;
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, { object, id, ...(cls === undefined ? {} : { class: cls }), at });
      doc.motion ??= { duration: NEW_DURATION, tracks: [] };
      doc.motion.tracks.push({ item: id, keys: [{ t: 0 }] });
    });
    this.lab.announce(`${item.object} is animated as ${id}`);
  }

  private untrack() {
    const { item, index } = this.selection();
    if (index < 0) return;
    this.lab.edit((doc) => {
      doc.motion.tracks.splice(index, 1);
      if (doc.motion.tracks.length === 0) delete doc.motion;
    });
    this.lab.announce(`${item.object} is no longer animated`);
  }

  /** A key at the current time, holding where the item is then. */
  private addKey() {
    const { item, index, track } = this.selection();
    const t = this.lab.time;
    if (!track) return;
    if (track.keys.some((k: any) => k.t === t)) return this.lab.announce(`There's already a key at ${seconds(t)}`);
    const { move, show, pose } = stateAt(track, item.object, this.duration, t);
    this.lab.edit((doc) => {
      const keys = doc.motion.tracks[index].keys;
      keys.splice(keys.filter((k: any) => k.t < t).length, 0, { t, move, show, ...(pose === item.object ? {} : { pose }) });
    });
    this.lab.announce(`Key added at ${seconds(t)}`);
  }

  /** Replaces key `k` with `next`, or removes it when `next` is null, keeping the keys in time order. */
  private editKey(k: number, next: any | null) {
    const { index } = this.selection();
    if (index < 0) return;
    this.lab.edit((doc) => {
      const keys = doc.motion.tracks[index].keys;
      keys.splice(k, 1);
      if (next) keys.splice(keys.filter((key: any) => key.t < next.t).length, 0, next);
    });
    this.lab.announce(next ? 'Key changed' : 'Key removed');
  }

  private changeKey(input: HTMLInputElement | HTMLSelectElement) {
    const { item, track } = this.selection();
    const k = Number(input.dataset.key);
    if (!track || !Number.isInteger(k)) return;
    const key = { ...track.keys[k] };
    const field = input.dataset.keyField;
    if (field === 't') {
      const t = Math.round(Number(input.value) * 1000);
      const clash = track.keys.some((other: any, i: number) => i !== k && other.t === t);
      if (k === 0 || !Number.isFinite(t) || t <= 0 || t >= this.duration || clash) {
        this.lab.announce('A key needs its own time, after 0 s and inside the loop');
        return this.render();
      }
      key.t = t;
    } else if (field === 'x' || field === 'y') {
      const value = Number(input.value);
      if (!Number.isInteger(value)) {
        this.lab.announce('Use a whole number');
        return this.render();
      }
      const move = [...(key.move ?? filledKeys(track, item.object)[k].move)];
      move[field === 'x' ? 0 : 1] = value;
      key.move = move;
    } else if (field === 'show') key.show = (input as HTMLInputElement).checked;
    else if (field === 'pose') {
      if (input.value === item.object && k === 0) delete key.pose;
      else key.pose = input.value;
    }
    this.editKey(k, key);
  }

  render() {
    const { lab } = this;
    if (lab.kind !== 'scene' || !lab.doc) return;
    const time = $<HTMLInputElement>('lab-time');
    time.max = String(this.duration - 1);
    time.value = String(lab.time);
    $('lab-time-out').textContent = seconds(lab.time);
    const duration = $<HTMLInputElement>('lab-duration');
    if (document.activeElement !== duration) duration.value = String(this.duration / 1000);
    const play = document.querySelector<HTMLButtonElement>('[data-anim="play"]')!;
    play.textContent = lab.playing ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(lab.playing));

    const { item, track } = this.selection();
    $('lab-track-none').hidden = Boolean(item);
    $('lab-track').hidden = !item;
    for (const button of document.querySelectorAll<HTMLButtonElement>('#lab-track [data-anim]')) {
      button.hidden = button.dataset.anim === 'track' ? Boolean(track) : !track;
    }
    const list = $('lab-keys');
    // Leave the list alone while one of its fields is being edited.
    if (list.contains(document.activeElement) && document.activeElement?.tagName !== 'BUTTON') return;
    if (!track) return list.replaceChildren();
    const filled = filledKeys(track, item.object);
    const poses = [item.object, ...Object.keys(lab.objects()).filter((name) => name !== item.object)];
    list.replaceChildren(
      ...filled.map((key, k) => {
        const li = document.createElement('li');
        li.className = 'lab-keys__key';
        li.classList.toggle('is-current', key.t <= lab.time && (filled[k + 1]?.t ?? Infinity) > lab.time);
        const n = k + 1;
        const field = (name: string, label: string, el: HTMLInputElement | HTMLSelectElement) => {
          const wrap = document.createElement('label');
          wrap.className = 'lab-keys__field';
          wrap.append(label, el);
          el.dataset.key = String(k);
          el.dataset.keyField = name;
          el.setAttribute('aria-label', `${label} of key ${n}`);
          return wrap;
        };
        const number = (value: number, step: string, disabled = false) =>
          Object.assign(document.createElement('input'), { type: 'number', value: String(value), step, disabled });
        const show = Object.assign(document.createElement('input'), { type: 'checkbox', checked: key.show });
        const pose = document.createElement('select');
        pose.append(...poses.map((name) => new Option(name, name, false, name === key.pose)));
        const goto = Object.assign(document.createElement('button'), { type: 'button', className: 'lab-step', textContent: '→' });
        goto.dataset.goto = String(key.t);
        goto.setAttribute('aria-label', `Go to key ${n}, ${seconds(key.t)}`);
        li.append(
          field('t', 'Time (s)', number(key.t / 1000, '0.1', k === 0)),
          field('x', 'X', number(key.move[0], '1')),
          field('y', 'Y', number(key.move[1], '1')),
          field('show', 'Shown', show),
          field('pose', 'Pose', pose),
          goto,
        );
        if (k > 0) {
          const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'lab-step', textContent: '×' });
          remove.dataset.remove = String(k);
          remove.setAttribute('aria-label', `Remove key ${n}`);
          li.append(remove);
        }
        return li;
      }),
    );
  }
}
