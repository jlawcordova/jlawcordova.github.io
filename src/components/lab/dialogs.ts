// The New scene and New object dialog, and the problems list (spec D9.6).
// New documents start from the same starters as `npm run art -- --new`
// (starter.mjs), and their names are checked as you type. The problems list
// opens from the status bar's count; choosing a problem goes to where it is.

import { isName, loadSources } from '../../lib/pixel-art/engine.mjs';
import { MAX_NAME, starterBlock, starterExtends, starterScene, starterSprite } from '../../lib/pixel-art/starter.mjs';
import type { Kind, Lab } from './lab';
import type { ObjectMode } from './object-mode';
import type { SceneMode } from './scene-mode';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Why a name can't be used, or null if it can. */
export function nameProblem(lab: Lab, name: string): string | null {
  if (!name) return 'Give it a name, like small-rock.';
  if (name.length > MAX_NAME) return `That's ${name.length} characters; the most is ${MAX_NAME}.`;
  if (!isName(name)) return 'Use lowercase letters and digits, with single hyphens between words, like small-rock.';
  if (lab.nameTaken(name)) return `There's already an object or scene called ${name}.`;
  return null;
}

/** Sets up the New dialog, and returns the function that opens it. */
export function setUpDialogs(lab: Lab): (kind: Kind) => void {
  const dialog = $<HTMLDialogElement>('lab-new-dialog');
  const form = $<HTMLFormElement>('lab-new-form');
  const name = $<HTMLInputElement>('lab-new-name');
  const help = $('lab-new-help');
  const extend = $<HTMLInputElement>('lab-new-extends');
  const width = $<HTMLInputElement>('lab-new-width');
  const height = $<HTMLInputElement>('lab-new-height');
  let kind: Kind = 'object';

  const objectKind = () => form.querySelector<HTMLInputElement>('input[name="lab-new-kind"]:checked')?.value ?? 'sprite';
  const sizeProblem = () => {
    if (kind !== 'object' || objectKind() !== 'sprite' || extend.checked) return null;
    const ok = (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 64;
    return ok(width.value) && ok(height.value) ? null : 'Width and height are whole numbers from 1 to 64.';
  };
  const check = () => {
    const problem = nameProblem(lab, name.value.trim()) ?? sizeProblem();
    help.textContent = problem ?? `It'll be saved at src/assets/pixel-art/source/${kind}s/${name.value.trim()}.mjs.`;
    name.setAttribute('aria-invalid', String(Boolean(nameProblem(lab, name.value.trim()))));
    help.classList.toggle('is-warning', Boolean(problem) && name.value !== '');
    return problem;
  };
  const sync = () => {
    const sprite = objectKind() === 'sprite';
    form.querySelector<HTMLElement>('.lab-new__sprite')!.hidden = kind !== 'object' || !sprite;
    width.disabled = height.disabled = extend.checked;
    check();
  };
  form.addEventListener('input', sync);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const problem = check();
    if (problem) {
      name.focus();
      return lab.announce(problem);
    }
    const id = name.value.trim();
    let doc;
    if (kind === 'scene') doc = starterScene();
    else if (objectKind() === 'block') doc = starterBlock();
    else if (extend.checked) doc = starterExtends(loadSources({ palette: lab.data.palette, objects: lab.objects() }), 'character');
    else doc = starterSprite(Number(width.value), Number(height.value));
    dialog.close();
    lab.create(kind, id, doc);
    lab.announce(`Created ${kind} ${id}. It's a draft until you export and commit it.`);
    $('lab-stage').focus();
  });
  $('lab-new-cancel').addEventListener('click', () => dialog.close());

  return (which: Kind) => {
    kind = which;
    $('lab-new-title').textContent = which === 'scene' ? 'New scene' : 'New object';
    for (const el of form.querySelectorAll<HTMLElement>('[data-new="object"]')) el.hidden = which !== 'object';
    form.reset();
    help.textContent = '';
    sync();
    help.textContent = '';
    dialog.showModal();
    name.focus();
  };
}

/** The status bar's problem count, and the list it opens. */
export function setUpProblems(lab: Lab, scene: SceneMode, object: ObjectMode) {
  const button = $<HTMLButtonElement>('lab-status-problems');
  const popover = $('lab-problems');
  const list = $('lab-problems-list');
  list.addEventListener('click', (e) => {
    const item = (e.target as Element).closest<HTMLButtonElement>('button[data-problem]');
    if (!item) return;
    const text = item.dataset.problem!;
    popover.hidePopover();
    const num = (re: RegExp) => {
      const m = re.exec(text);
      return m ? Number(m[1]) : null;
    };
    if (lab.kind === 'object') object.goTo(num(/layer (\d+)/), num(/frame (\d+)/), num(/column (\d+)/), num(/row (\d+)/));
    else {
      const path = /^items(\[\d+\](?:\.items\[\d+\])*)/.exec(text);
      const indexes = path ? [...path[1].matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])) : null;
      if (indexes) scene.select(indexes);
      $('lab-stage').focus();
    }
  });
  lab.on(() => {
    const count = lab.problems.length;
    $('lab-problem-count').textContent = String(count);
    button.setAttribute('aria-label', `${count} problem${count === 1 ? '' : 's'}`);
    button.classList.toggle('is-warning', count > 0);
    $('lab-problems-none').hidden = count > 0;
    list.replaceChildren(
      ...lab.problems.map((problem) => {
        const li = document.createElement('li');
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'lab-popover__item', textContent: problem });
        b.dataset.problem = problem;
        li.append(b);
        return li;
      }),
    );
  });
}
