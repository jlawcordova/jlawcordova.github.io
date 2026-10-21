// Checks for the achievement icons (gamified accomplishments spec D5, R12–R14):
// the list, its frames, the published catalog and the skill's table agree. The
// checks of the art itself left with Pixel Lab v0.6.0 (spec R18).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { FALLBACK_ICON, FRAMES, ICONS, LOCK_ICON, PLAIN_FRAME, SHEET_ORDER, frameFor, iconCatalog, iconFor } from '../src/lib/achievement-icons.mjs';

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

test('R12: every icon id is kebab-case, unique and has a meaning', () => {
  const ids = SHEET_ORDER;
  assert.equal(new Set(ids).size, ids.length);
  for (const { id, meaning } of ICONS) {
    assert.match(id, KEBAB);
    assert.ok(meaning.trim().length > 0, `${id} has a meaning`);
  }
});

// The ids published with this PR. The lexicon's `knownValues` copies them, so
// they stay: new icons may be added through the skill, but none of these may go.
const PUBLISHED_IDS = [
  'sprout', 'hammer', 'rocket', 'bug', 'shield', 'key', 'wrench', 'book',
  'magnifier', 'flask', 'apple', 'heart', 'signpost', 'chest', 'trophy', 'speech',
];

test('R12: the 16 published icon ids stay', () => {
  assert.equal(PUBLISHED_IDS.length, 16);
  const ids = new Set(ICONS.map((icon) => icon.id));
  for (const id of PUBLISHED_IDS) assert.ok(ids.has(id), `${id} is still an icon`);
});

test('R13: an unknown or missing icon falls back to the star; the lock and fallback are not choices', () => {
  assert.equal(iconFor('rocket'), 'rocket');
  for (const value of ['nope', '', undefined, null, 3, LOCK_ICON, FALLBACK_ICON]) assert.equal(iconFor(value), FALLBACK_ICON);
  assert.ok(!ICONS.some((icon) => icon.id === LOCK_ICON || icon.id === FALLBACK_ICON));
});

test('R15: the published catalog lists the choices and the fallback', () => {
  const catalog = iconCatalog();
  assert.deepEqual(catalog.icons.map((icon) => icon.id), ICONS.map((icon) => icon.id));
  assert.equal(catalog.fallback, FALLBACK_ICON);
  // The frames are for the page only (achievements redesign spec, Data).
  assert.deepEqual(catalog.icons, ICONS.map(({ id, meaning }) => ({ id, meaning })));
});

// Achievements redesign spec R8–R10: every icon sits in a frame of its kind,
// drawn as pixel art in one sheet.
test('achievements redesign R10: every icon names a frame, and every frame but plain has an icon', () => {
  assert.deepEqual([...FRAMES], ['plain', 'make', 'fix', 'think', 'people', 'milestone']);
  for (const { id, frame } of ICONS) assert.ok(FRAMES.includes(frame) && frame !== PLAIN_FRAME, `${id} has a kind's frame`);
  for (const frame of FRAMES.filter((f) => f !== PLAIN_FRAME)) {
    assert.ok(ICONS.some((icon) => icon.frame === frame), `${frame} frames at least one icon`);
  }
});

test('achievements redesign R8: the fallback, an unknown icon and the lock take the plain frame', () => {
  assert.equal(frameFor('rocket'), 'make');
  assert.equal(frameFor('trophy'), 'milestone');
  for (const value of [FALLBACK_ICON, LOCK_ICON, 'dragon', '', undefined, null]) assert.equal(frameFor(value), PLAIN_FRAME);
});

test('R14: the achievement-icon skill lists exactly the icons in the set, with their frames', async () => {
  const skill = await readFile(new URL('../.claude/skills/achievement-icon/SKILL.md', import.meta.url), 'utf8');
  const table = skill.split('<!-- icons:start -->')[1]?.split('<!-- icons:end -->')[0] ?? '';
  const rows = [...table.matchAll(/^\| `([^`]+)` \| (.+) \| `([^`]+)` \|$/gm)].map((m) => ({ id: m[1], meaning: m[2], frame: m[3] }));
  assert.deepEqual(rows, ICONS.map(({ id, meaning, frame }) => ({ id, meaning, frame })));
});
