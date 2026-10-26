// The Ask panel (ask bot spec, "The character, bubble and glide" and "The
// panel"), loaded by ask-loader.ts on the first press. The character jumps,
// glides to the bottom left and the panel opens beside it; closing glides it
// back. The logic is in ask-state.mjs; this file wires it to the page.
import avatarSvg from '../assets/pixel-art/ask-avatar.svg?raw';
import panelCss from '../styles/ask-panel.css?inline';
import { TIMEOUT_MS, canAsk, isShowing, message, next, question, readReply, remember, type Reply } from './ask-state.mjs';
import { easeOut, play, reduced } from './motion';

/** The avatar's size on the panel: CSS pixels per art pixel. */
const SCALE = 3;
/** The avatar's viewBox (src/assets/pixel-art/jlawcordova.pixellab/scenes/ask-avatar.json): the foot is at 0, 0. */
const VIEW = { x: -7, y: -29, width: 19, height: 31 };
const GLIDE = { duration: 0.5, ease: easeOut };

interface Panel {
  open(): void;
}

let panel: Panel | undefined;

/** Opens the panel, building it on the first call. */
export function open(root: HTMLElement, bubble: HTMLButtonElement) {
  panel ??= build(root, bubble);
  panel.open();
}

function build(root: HTMLElement, bubble: HTMLButtonElement): Panel {
  const endpoint = root.dataset.endpoint ?? '';
  const contact = root.dataset.contact ?? '';
  const island = document.querySelector<SVGSVGElement>('.hero-island')!;
  const figure = island.querySelector<SVGGElement>('.ask-character')!;
  const foot = figure.closest<SVGGElement>('.enter')!;

  const template = root.querySelector<HTMLTemplateElement>('.ask-template')!;
  const parts = template.content.cloneNode(true) as DocumentFragment;
  const avatar = parts.querySelector<HTMLElement>('.ask-avatar')!;
  const dialog = parts.querySelector<HTMLElement>('.ask-panel')!;
  avatar.innerHTML = avatarSvg.replace('<svg ', '<svg class="pixel-art" ');
  // The panel's styles come with this chunk, not with the home page (spec, "Loading and budgets").
  const style = document.createElement('style');
  style.textContent = panelCss;
  parts.prepend(style);
  // In the body, out of the hero's clipping and the island's transforms.
  document.body.append(parts);

  const log = dialog.querySelector<HTMLOListElement>('.ask-panel__log')!;
  const form = dialog.querySelector<HTMLFormElement>('.ask-panel__form')!;
  const input = dialog.querySelector<HTMLInputElement>('.ask-panel__input')!;
  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('.ask-chip, .ask-panel__submit')];

  let state = 'idle';
  let history: { q: string; a: string }[] = [];
  let resetTimer = 0;

  /** Where the island's character stands on screen, and the island's scale. */
  const onIsland = () => {
    const vb = island.viewBox.baseVal;
    const art = island.getBoundingClientRect();
    const s = art.width / vb.width;
    return {
      x: art.left + (Number(foot.dataset.x) - vb.x) * s,
      y: art.top + (Number(foot.dataset.y) - vb.y) * s,
      s,
    };
  };
  const inView = ({ y, s }: { y: number; s: number }) => y > 0 && y + VIEW.y * s < innerHeight;

  /** The avatar's place on the panel's top-left edge: its shoes on the border. */
  const placeAvatar = () => {
    const box = dialog.getBoundingClientRect();
    avatar.style.left = `${box.left + 16}px`;
    avatar.style.top = `${box.top - 3 + VIEW.y * SCALE}px`;
  };
  const avatarFoot = () => {
    const box = avatar.getBoundingClientRect();
    return { x: box.left - VIEW.x * SCALE, y: box.top - VIEW.y * SCALE };
  };
  /** A move from the avatar's place on the panel to the island's character. */
  const toIsland = () => {
    const from = avatarFoot();
    const to = onIsland();
    return { x: to.x - from.x, y: to.y - from.y, scale: to.s / SCALE, shown: inView(to) };
  };

  /** The character's jump (its hop state), played through data-play; nothing under reduced motion. */
  const jump = () =>
    new Promise<void>((resolve) => {
      if (reduced()) return resolve();
      const name = `${island.dataset.pixellab}--hop`;
      const done = () => {
        clearTimeout(timer);
        figure.removeEventListener('animationend', end);
        figure.removeAttribute('data-play');
        resolve();
      };
      const end = (e: AnimationEvent) => e.animationName === name && done();
      const timer = setTimeout(done, 800);
      figure.addEventListener('animationend', end);
      figure.setAttribute('data-play', 'hop');
    });

  const setBusy = () => {
    for (const button of buttons) button.disabled = !canAsk(state);
    dialog.setAttribute('aria-busy', String(state === 'waiting'));
  };

  const add = (kind: 'you' | 'bot', text: string) => {
    const item = document.createElement('li');
    item.className = `ask-msg ask-msg--${kind}`;
    item.append(text);
    log.append(item);
    log.scrollTop = log.scrollHeight;
    return item;
  };

  const say = (reply: Reply, shown: string) => {
    const said = message(shown, reply);
    if (!said) return;
    const item = add('bot', said.text);
    for (const source of reply.sources ?? []) {
      const link = document.createElement('a');
      link.href = source.path;
      link.textContent = `Source: ${source.title}`;
      item.append(' ', link);
    }
    if (said.contact && contact) {
      const link = document.createElement('a');
      link.href = contact;
      link.textContent = 'Get in touch';
      item.append(' ', link);
    }
    log.scrollTop = log.scrollHeight;
  };

  const ask = async (text: string) => {
    const q = question(text);
    if (!q || !canAsk(state)) return;
    state = next(state, { type: 'ask' });
    add('you', q);
    input.value = '';
    const waiting = add('bot', '');
    waiting.classList.add('ask-msg--waiting');
    waiting.setAttribute('aria-label', 'Thinking');
    waiting.innerHTML = '<span></span><span></span><span></span>';
    setBusy();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let reply: Reply;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
        signal: controller.signal,
      });
      reply = readReply(response.status, await response.json().catch(() => null));
    } catch {
      reply = { status: 'failed' };
    } finally {
      clearTimeout(timer);
    }

    waiting.remove();
    // A reply after the panel closed still goes in the conversation, for when it opens again.
    const shown = next('waiting', reply.status === 'failed' ? { type: 'fail' } : { type: 'reply', status: reply.status });
    if (state === 'waiting') state = shown;
    if (reply.answer) history = remember(history, q, reply.answer);
    say(reply, shown);
    setBusy();
    clearTimeout(resetTimer);
    // A limit lifts by itself at its reset time, if that's today.
    const wait = reply.resetAt ? Date.parse(reply.resetAt) - Date.now() : NaN;
    if (wait > 0 && wait < 864e5) {
      resetTimer = window.setTimeout(() => {
        state = next(state, { type: 'reset' });
        setBusy();
      }, wait);
    }
  };

  const close = async () => {
    if (state === 'idle' || state === 'closing') return;
    state = next(state, { type: 'close' });
    const back = toIsland();
    dialog.hidden = true;
    bubble.style.visibility = '';
    bubble.focus({ preventScroll: true });
    const glide = back.shown
      ? play(avatar, { x: [0, back.x], y: [0, back.y], scale: [1, back.scale] }, GLIDE)
      : play(avatar, { opacity: [1, 0] }, { duration: 0.2 });
    if (glide && back.shown) play(bubble, { opacity: [0, 1] }, { duration: 0.2, delay: GLIDE.duration });
    await glide?.finished;
    avatar.hidden = true;
    avatar.style.transform = '';
    avatar.style.opacity = '';
    figure.style.visibility = '';
    state = next(state, { type: 'closed' });
  };

  const openPanel = async () => {
    if (state !== 'idle') {
      input.focus();
      return;
    }
    state = next(state, { type: 'open' });
    await jump();
    dialog.hidden = false;
    avatar.hidden = false;
    placeAvatar();
    const from = toIsland();
    figure.style.visibility = 'hidden';
    bubble.style.visibility = 'hidden';
    state = next(state, { type: 'opened' });
    setBusy();
    input.focus({ preventScroll: true });
    if (from.shown) {
      play(avatar, { x: [from.x, 0], y: [from.y, 0], scale: [from.scale, 1] }, GLIDE);
    } else {
      play(avatar, { opacity: [0, 1] }, { duration: 0.2 });
    }
    play(dialog, { opacity: [0, 1], y: [16, 0] }, { duration: 0.3, ease: easeOut });
  };

  // The panel and the avatar follow the window, and the phone's keyboard.
  const follow = () => {
    const keyboard = visualViewport ? Math.max(0, innerHeight - visualViewport.height - visualViewport.offsetTop) : 0;
    dialog.style.setProperty('--ask-keyboard', `${keyboard}px`);
    if (!dialog.hidden) placeAvatar();
  };
  addEventListener('resize', follow);
  visualViewport?.addEventListener('resize', follow);
  // The panel grows up as the conversation does, and the character stays on its edge.
  new ResizeObserver(() => !dialog.hidden && placeAvatar()).observe(dialog);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });
  for (const chip of dialog.querySelectorAll<HTMLButtonElement>('.ask-chip')) {
    chip.addEventListener('click', () => {
      // The chips are disabled while the answer comes, so focus waits in the box.
      input.focus();
      ask(chip.textContent ?? '');
    });
  }
  dialog.querySelector('.ask-panel__close')!.addEventListener('click', close);
  // Escape closes the panel from anywhere: it's non-modal, so focus may be on the page behind it.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isShowing(state)) close();
  });

  return { open: openPanel };
}
