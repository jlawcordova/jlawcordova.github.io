// The keyboard (spec D9.7), for Scene and Object mode. Stage shortcuts work
// only while the stage has focus, so they never get in the way of typing in
// a field. The toolbar is one tab stop, with arrow keys moving inside it (a
// roving tabindex).

import type { Lab } from './lab';
import type { ObjectMode, PaintTool } from './object-mode';
import type { SceneMode } from './scene-mode';
import type { Stage } from './stage';

/**
 * Arrow keys as steps: [columns, rows] for tiles (Right and Left change the
 * column, Down and Up the row), and [x, y] for pixels.
 */
const ARROWS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

/** The toolbar's roving tabindex, over the buttons the current mode shows. */
function setUpToolbar(lab: Lab) {
  const bar = document.querySelector<HTMLElement>('.lab-toolbar')!;
  const all = [...bar.querySelectorAll<HTMLButtonElement>('button')];
  const shown = () => all.filter((b) => !b.hidden && !b.closest('[hidden]'));
  const stop = (target: HTMLButtonElement) => all.forEach((b) => (b.tabIndex = b === target ? 0 : -1));
  for (const b of all) b.addEventListener('focus', () => stop(b));
  bar.addEventListener('keydown', (e) => {
    const buttons = shown();
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: buttons.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    buttons[(moves[e.key] + buttons.length) % buttons.length].focus();
  });
  // When a mode change hides the tab stop, the first shown button takes it.
  lab.on(() => {
    const buttons = shown();
    if (!buttons.some((b) => b.tabIndex === 0)) stop(buttons[0]);
  });
  stop(all[0]);
}

/** Object mode's keys (spec D9.7). Returns whether the key was used. */
function objectKey(e: KeyboardEvent, lab: Lab, object: ObjectMode): boolean {
  const key = e.key;
  if (key in ARROWS) {
    const [dx, dy] = ARROWS[key];
    const step = e.shiftKey ? 8 : 1;
    object.moveCursor(dx * step, dy * step);
    return true;
  }
  switch (key) {
    case ' ':
    case 'Enter':
      object.applyAt(...object.cursor);
      return true;
    case 'PageUp':
    case 'PageDown':
      if (object.frameCount < 2) lab.announce('This layer has no frames');
      else object.selectFrame(object.frame + (key === 'PageUp' ? -1 : 1));
      return true;
    case '[':
    case ']':
      object.selectLayer(object.layer + (key === ']' ? 1 : -1));
      return true;
    case 'Delete':
    case 'Backspace': {
      const tool = object.tool;
      object.tool = 'eraser';
      object.applyAt(...object.cursor);
      object.tool = tool;
      return true;
    }
    case 'Escape':
      return object.cancelStroke();
  }
  const tools: Record<string, PaintTool> = { b: 'pencil', e: 'eraser', g: 'fill', i: 'picker' };
  const lower = key.toLowerCase();
  if (lower in tools && !e.shiftKey) {
    object.setTool(tools[lower]);
    return true;
  }
  if (/^[0-4]$/.test(key)) {
    object.setZoom(key === '0' ? 'fit' : ((Number(key) * 4) as 4 | 8 | 12 | 16));
    return true;
  }
  return false;
}

export function setUpKeyboard(lab: Lab, stage: Stage, scene: SceneMode, object: ObjectMode) {
  setUpToolbar(lab);
  const frame = stage.frame;
  let holds = 0;

  frame.addEventListener('keydown', (e) => {
    // Escape during a pointer stroke takes the stroke back. It's checked
    // before endGroup() below closes the stroke's undo group.
    if (lab.kind === 'object' && e.key === 'Escape' && object.cancelStroke()) {
      e.preventDefault();
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key;
    // A held key repeats. Its first press and every repeat share a group, so
    // the whole hold is one undo step; the next press starts a new one.
    if (!e.repeat) {
      lab.endGroup();
      holds++;
    }
    const group = `key-${key}-${holds}`;

    if (mod && key.toLowerCase() === 'z') {
      e.preventDefault();
      return e.shiftKey ? lab.redo() : lab.undo();
    }
    if (mod && key.toLowerCase() === 'y') {
      e.preventDefault();
      return lab.redo();
    }
    if (mod || e.altKey) return;
    if (lab.kind === 'object') {
      if (objectKey(e, lab, object)) e.preventDefault();
      return;
    }

    if (key in ARROWS) {
      e.preventDefault();
      if (scene.spaceHeld) {
        // Space + arrows pans, like Space + drag.
        const [dx, dy] = ARROWS[key];
        frame.scrollLeft += dx * 32;
        frame.scrollTop += dy * 32;
        return;
      }
      if (e.shiftKey) {
        const [dx, dy] = ARROWS[key];
        if (lab.selected) scene.nudgeSelected(dx, dy, group);
        return;
      }
      const [dc, dr] = ARROWS[key];
      return lab.selected ? scene.moveSelected(dc, dr, 0, group) : scene.moveCursor(dc, dr, 0);
    }
    switch (key) {
      case ' ':
        e.preventDefault();
        if (!scene.spaceHeld) {
          scene.spaceHeld = true;
          scene.render();
        }
        return;
      case 'Enter':
        e.preventDefault();
        return scene.placeCurrentAtCursor();
      case 'PageUp':
      case 'PageDown': {
        e.preventDefault();
        const dl = key === 'PageUp' ? 1 : -1;
        return lab.selected ? scene.moveSelected(0, 0, dl, group) : scene.moveCursor(0, 0, dl);
      }
      case '[':
      case ']':
        e.preventDefault();
        return scene.reorderSelected(key === ']' ? 1 : -1);
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        return scene.removeSelected();
      case 'Escape':
        if (lab.selected) {
          e.preventDefault();
          scene.select(null);
        }
        return;
    }
    const tools: Record<string, Lab['tool']> = { v: 'select', a: 'place', h: 'pan' };
    const lower = key.toLowerCase();
    if (lower in tools && !e.shiftKey) {
      e.preventDefault();
      return scene.setTool(tools[lower]);
    }
    if (/^[0-4]$/.test(key)) {
      e.preventDefault();
      return scene.setZoom(key === '0' ? 'fit' : (Number(key) as 1 | 2 | 3 | 4));
    }
  });

  const release = () => {
    if (!scene.spaceHeld) return;
    scene.spaceHeld = false;
    scene.render();
  };
  frame.addEventListener('keyup', (e) => e.key === ' ' && release());
  frame.addEventListener('blur', release);
}
