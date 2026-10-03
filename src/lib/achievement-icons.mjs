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
 * The icons an accomplishment can choose, by the kind of thing that was done.
 * The id is the object `icon-<id>` and the value stored in the record.
 * @type {readonly { id: string, meaning: string }[]}
 */
export const ICONS = [
  { id: 'sprout', meaning: 'started something, or a first' },
  { id: 'hammer', meaning: 'built something' },
  { id: 'rocket', meaning: 'shipped or launched' },
  { id: 'bug', meaning: 'fixed a bug or a problem' },
  { id: 'shield', meaning: 'secured or protected' },
  { id: 'key', meaning: 'opened access or a way in' },
  { id: 'wrench', meaning: 'tuned, sped up or automated something' },
  { id: 'book', meaning: 'wrote or documented' },
  { id: 'magnifier', meaning: 'investigated or analysed' },
  { id: 'flask', meaning: 'experimented or prototyped' },
  { id: 'apple', meaning: 'mentored or taught others' },
  { id: 'heart', meaning: 'helped, or went the extra mile' },
  { id: 'signpost', meaning: 'planned, led or set direction' },
  { id: 'chest', meaning: 'organised or stored (data, assets)' },
  { id: 'trophy', meaning: 'reached a milestone' },
  { id: 'speech', meaning: 'shared or presented' },
];

/** The order of the icons in achievements-icons.svg: fallback, lock, then the choices. */
export const SHEET_ORDER = [FALLBACK_ICON, LOCK_ICON, ...ICONS.map((icon) => icon.id)];

/** Pixels per icon cell in the sheet. */
export const CELL = 16;

/** The icon to draw for a record's `icon` field: itself when known, else the fallback. */
export function iconFor(/** @type {unknown} */ id) {
  return typeof id === 'string' && ICONS.some((icon) => icon.id === id) ? id : FALLBACK_ICON;
}

/** What /achievement-icons.json holds. */
export function iconCatalog() {
  return { icons: ICONS.map(({ id, meaning }) => ({ id, meaning })), fallback: FALLBACK_ICON };
}
