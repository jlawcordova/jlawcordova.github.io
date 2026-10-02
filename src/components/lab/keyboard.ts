// The keyboard (spec D9.7). Stage shortcuts work only while the stage has
// focus, so they never get in the way of typing in a field. The toolbar is
// one tab stop, with arrow keys moving inside it (a roving tabindex).

import type { Lab } from './lab';
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

function setUpToolbar() {
  const bar = document.querySelector<HTMLElement>('.lab-toolbar')!;
  const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button')];
  let current = 0;
  const focus = (index: number) => {
    current = (index + buttons.length) % buttons.length;
    buttons.forEach((b, i) => (b.tabIndex = i === current ? 0 : -1));
    buttons[current].focus();
  };
  buttons.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('focus', () => {
      current = i;
      buttons.forEach((other, j) => (other.tabIndex = j === i ? 0 : -1));
    });
  });
  bar.addEventListener('keydown', (e) => {
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: buttons.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    focus(moves[e.key]);
  });
}

export function setUpKeyboard(lab: Lab, stage: Stage, scene: SceneMode) {
  setUpToolbar();
  const frame = stage.frame;
  let holds = 0;

  frame.addEventListener('keydown', (e) => {
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
