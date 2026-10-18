// The "Achievement unlocked!" toast on the home page (achievements redesign
// spec R11–R16). The card is server-rendered with `hidden` inside a status
// region, so without JavaScript it never shows. The first time the list comes
// into view in a session, it rises in, names the newest earned achievement, and
// leaves after 5 seconds unless the pointer or focus is on it. Its close button
// and Escape close it sooner. Under reduced motion it appears and leaves
// without moving.
import { easeOut, inView, play } from './motion';

const KEY = 'achievement-toast';
/** After the list comes into view: the rows' rise (0.4 s, staggered) has landed. */
const SHOW_AFTER_MS = 660;
const STAYS_MS = 5000;

const seen = () => {
  try {
    return sessionStorage.getItem(KEY) === 'shown';
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    sessionStorage.setItem(KEY, 'shown');
  } catch {
    // Storage is blocked: the toast may show again on the next visit to the page.
  }
};

export function achievementToast(section: HTMLElement) {
  const card = section.querySelector<HTMLElement>('.achievement-toast__card');
  const list = section.querySelector('.achievement-list');
  if (!card || !list || seen()) return;
  const heading = section.querySelector<HTMLElement>('#achievements-title');

  let open = false;
  let timer: number | undefined;
  const wait = () => {
    clearTimeout(timer);
    timer = window.setTimeout(close, STAYS_MS);
  };
  const held = () => card.matches(':hover') || card.contains(document.activeElement);

  function close() {
    if (!open) return;
    open = false;
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    // Focus never drops to the page when the card it's in goes away.
    if (card!.contains(document.activeElement)) heading?.focus();
    const hide = () => {
      card!.hidden = true;
      card!.style.opacity = '';
      card!.style.transform = '';
    };
    const leaving = play(card!, { opacity: [1, 0], y: [0, 8] }, { duration: 0.25, ease: easeOut });
    if (leaving) leaving.then(hide);
    else hide();
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') close();
  }

  function show() {
    open = true;
    remember();
    card!.hidden = false;
    play(card!, { opacity: [0, 1], y: [16, 0] }, { duration: 0.3, ease: easeOut });
    const icon = card!.querySelector('.achievement__icon');
    if (icon) play(icon, { y: [0, -8, 0] }, { duration: 0.3, delay: 0.24, ease: easeOut });
    document.addEventListener('keydown', onKey);
    wait();
  }

  card.querySelector('.achievement-toast__close')?.addEventListener('click', close);
  card.addEventListener('pointerenter', () => clearTimeout(timer));
  card.addEventListener('focusin', () => clearTimeout(timer));
  card.addEventListener('pointerleave', () => open && !held() && wait());
  card.addEventListener('focusout', (event) => {
    if (open && !card.contains(event.relatedTarget as Node | null) && !card.matches(':hover')) wait();
  });

  inView(
    list,
    () => {
      window.setTimeout(show, SHOW_AFTER_MS);
    },
    { amount: 0.3 },
  );
}
