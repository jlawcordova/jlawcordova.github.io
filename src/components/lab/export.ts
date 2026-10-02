// The Export dialog (spec D9.6, R19): the open document's canonical source
// from serialize(), the repo path it belongs at, Copy source and Download
// .mjs. Nothing is sent over the network. While the document has problems,
// the dialog lists them instead, and both export buttons are off, so every
// exported file compiles.

import { serialize } from '../../lib/pixel-art/serialize.mjs';
import type { Lab } from './lab';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function setUpExport(lab: Lab) {
  const dialog = $<HTMLDialogElement>('lab-export-dialog');
  const source = $<HTMLTextAreaElement>('lab-export-source');
  const copy = $<HTMLButtonElement>('lab-copy');
  const download = $<HTMLButtonElement>('lab-download');
  const status = $('lab-export-status');
  let text = '';
  // The rest of the page is inert while the dialog is open, so the dialog
  // says what happened itself.
  const say = (message: string) => {
    status.textContent = message;
    lab.announce(message);
  };

  $('lab-export').addEventListener('click', () => {
    const problems = lab.problems;
    text = problems.length ? '' : serialize(lab.doc);
    $('lab-export-path').textContent = `src/assets/pixel-art/source/scenes/${lab.name}.mjs`;
    $('lab-export-problems').hidden = problems.length === 0;
    $('lab-export-problem-list').replaceChildren(
      ...problems.map((problem) => {
        const li = document.createElement('li');
        li.textContent = problem;
        return li;
      }),
    );
    source.value = text;
    status.textContent = '';
    source.parentElement!.hidden = problems.length > 0;
    copy.disabled = problems.length > 0;
    download.disabled = problems.length > 0;
    dialog.showModal();
  });

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      say(`Copied the source of ${lab.name}.`);
    } catch {
      source.select();
      say("Couldn't copy. The source is selected; copy it with your keyboard.");
    }
  });

  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lab.name}.mjs`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    say(`Downloaded ${lab.name}.mjs.`);
  });

  $('lab-export-close').addEventListener('click', () => dialog.close());
}
