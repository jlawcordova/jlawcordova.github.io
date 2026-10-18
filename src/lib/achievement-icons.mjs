// @ts-check
// The achievement icons (gamified accomplishments spec D5). An accomplishment
// names one of these in its `icon` field. The list is the single source for
// the sheet's order, for /achievement-icons.json (which the accomplishments
// skill reads to pick an icon), and for the checks in
// scripts/achievement-icons.test.mjs.
//
// Adding an icon: .claude/skills/achievement-icon/SKILL.md.

/** Shown for an accomplishment whose icon is missing or unknown. Not offered as a choice. */
export const FALLBACK_ICON = 'star';

/**
 * Drawn over the icon of an accomplishment that isn't done yet: a small padlock
 * in the upper-right corner of its cell. Not offered as a choice.
 */
export const LOCK_ICON = 'lock';

/**
 * The frames an icon sits in on the page (achievements redesign spec R8–R10),
 * in the order of achievement-frames.svg. Each is the object `frame-<kind>`.
 * `plain` is for the fallback star and every locked row; the others say what
 * kind of work an icon stands for.
 */
export const FRAMES = /** @type {const} */ (['plain', 'make', 'fix', 'think', 'people', 'milestone']);

/** @typedef {typeof FRAMES[number]} Frame */

/** The frame for the fallback, an unknown icon and a locked row. */
export const PLAIN_FRAME = 'plain';

/** Pixels per frame cell in achievement-frames.svg: the 16px icon, a 1px bevel and a 1px edge each side. */
export const FRAME_CELL = 20;

/**
 * The icons an accomplishment can choose, by the kind of thing that was done.
 * The id is the object `icon-<id>` and the value stored in the record; the
 * frame is the one it sits in on the page.
 * @type {readonly { id: string, meaning: string, frame: Frame }[]}
 */
export const ICONS = [
  { id: 'sprout', meaning: 'started something, or a first', frame: 'make' },
  { id: 'hammer', meaning: 'built something', frame: 'make' },
  { id: 'rocket', meaning: 'shipped or launched', frame: 'make' },
  { id: 'bug', meaning: 'fixed a bug or a problem', frame: 'fix' },
  { id: 'shield', meaning: 'secured or protected', frame: 'fix' },
  { id: 'key', meaning: 'opened access or a way in', frame: 'fix' },
  { id: 'wrench', meaning: 'tuned, sped up or automated something', frame: 'fix' },
  { id: 'book', meaning: 'wrote or documented', frame: 'think' },
  { id: 'magnifier', meaning: 'investigated or analysed', frame: 'think' },
  { id: 'flask', meaning: 'experimented or prototyped', frame: 'make' },
  { id: 'apple', meaning: 'mentored or taught others', frame: 'people' },
  { id: 'heart', meaning: 'helped, or went the extra mile', frame: 'people' },
  { id: 'signpost', meaning: 'planned, led or set direction', frame: 'think' },
  { id: 'chest', meaning: 'organised or stored (data, assets)', frame: 'think' },
  { id: 'trophy', meaning: 'reached a milestone', frame: 'milestone' },
  { id: 'speech', meaning: 'shared or presented', frame: 'people' },
];

/** The order of the icons in achievements-icons.svg: fallback, lock, then the choices. */
export const SHEET_ORDER = [FALLBACK_ICON, LOCK_ICON, ...ICONS.map((icon) => icon.id)];

/** Pixels per icon cell in the sheet. */
export const CELL = 16;

/** The icon to draw for a record's `icon` field: itself when known, else the fallback. */
export function iconFor(/** @type {unknown} */ id) {
  return typeof id === 'string' && ICONS.some((icon) => icon.id === id) ? id : FALLBACK_ICON;
}

/** The frame an icon sits in: its own for a known icon, else the plain one. */
export function frameFor(/** @type {unknown} */ id) {
  return ICONS.find((icon) => icon.id === id)?.frame ?? PLAIN_FRAME;
}

/** What /achievement-icons.json holds. */
export function iconCatalog() {
  return { icons: ICONS.map(({ id, meaning }) => ({ id, meaning })), fallback: FALLBACK_ICON };
}
