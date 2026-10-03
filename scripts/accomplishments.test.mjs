// Checks for the accomplishments data layer (src/lib/accomplishment-list.mjs)
// and its fixtures (gamified accomplishments spec D3, D4; R1, R4–R9, R13, R17).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  HOME_DONE_COUNT,
  formatDateRange,
  homeSelection,
  readAccomplishments,
  rowFor,
} from '../src/lib/accomplishment-list.mjs';
import { FALLBACK_ICON, ICONS } from '../src/lib/achievement-icons.mjs';
import { paginate } from '../src/lib/paginate.mjs';
import { compareItems, toItem } from './fetch-accomplishments.mjs';

const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const PLACEHOLDER = new URL('../src/data/accomplishments.json', import.meta.url);

let n = 0;
const doneItem = (extra = {}) => ({
  rkey: `d${++n}`,
  title: `Done ${n}`,
  description: 'd',
  done: true,
  startDate: '2026-09',
  tags: [],
  links: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});
const lockedItem = (extra = {}) => ({
  rkey: `l${++n}`,
  title: `Goal ${n}`,
  description: 'd',
  done: false,
  tags: [],
  links: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});
const ok = (items) => readAccomplishments({ status: 'ok', fetchedAt: '2026-10-03T00:00:00.000Z', items });

describe('readAccomplishments', () => {
  it('R8: the unavailable placeholder, or a malformed file, reads as unavailable', async () => {
    const placeholder = JSON.parse(await readFile(PLACEHOLDER, 'utf8'));
    for (const data of [placeholder, null, {}, { status: 'ok' }, { status: 'ok', items: {} }]) {
      assert.deepEqual(readAccomplishments(data), { status: 'unavailable', done: [], locked: [] });
    }
  });

  it('R7, R9: splits done and locked, keeping the file order', () => {
    const items = [doneItem(), doneItem(), lockedItem(), lockedItem()];
    const { status, done, locked } = ok(items);
    assert.equal(status, 'ok');
    assert.deepEqual(done.map((i) => i.rkey), [items[0].rkey, items[1].rkey]);
    assert.deepEqual(locked.map((i) => i.rkey), [items[2].rkey, items[3].rkey]);
  });

  it('R17: an item without done or the gamified fields is a done accomplishment', () => {
    const { rkey, title, description, startDate } = doneItem();
    const [item] = ok([{ rkey, title, description, startDate }]).done;
    assert.equal(item.done, true);
    assert.deepEqual(item.tags, []);
    assert.deepEqual(item.links, []);
    for (const key of ['funTitle', 'shortDescription', 'icon']) assert.ok(!(key in item), key);
  });

  it('R9: a locked item has no dates, even in a hand-edited file', () => {
    const [item] = ok([lockedItem({ startDate: '2026-09', endDate: '2026-10' })]).locked;
    assert.ok(!('startDate' in item) && !('endDate' in item));
  });

  it('drops items that cannot be shown, and links that are not http(s)', () => {
    const { done, locked } = ok([
      doneItem({ startDate: undefined }),
      doneItem({ startDate: '2026-13' }),
      doneItem({ title: ' ' }),
      null,
      doneItem({ links: ['javascript:alert(1)', 'https://example.com/a'] }),
    ]);
    assert.equal(locked.length, 0);
    assert.equal(done.length, 1);
    assert.deepEqual(done[0].links, ['https://example.com/a']);
  });
});

describe('rowFor', () => {
  it('R1, R4: the fun title leads, with the short description and the icon', () => {
    const row = rowFor(ok([doneItem({ funTitle: 'Lift Off', shortDescription: 'Shipped the new app', icon: 'rocket' })]).done[0]);
    assert.deepEqual(row, { lead: 'Lift Off', short: 'Shipped the new app', icon: 'rocket' });
  });

  it('R17: an old record leads with the plain title, has no short line, and shows the star', () => {
    const row = rowFor(ok([doneItem({ title: 'Plain title' })]).done[0]);
    assert.deepEqual(row, { lead: 'Plain title', icon: FALLBACK_ICON });
    assert.ok(!('short' in row));
  });

  it('R13: an unknown icon falls back to the star', () => {
    assert.equal(rowFor(ok([doneItem({ icon: 'dragon' })]).done[0]).icon, FALLBACK_ICON);
  });

  it('R9: a locked row uses its own icon (the lock is drawn over it by the row)', () => {
    assert.equal(rowFor(ok([lockedItem({ icon: 'trophy' })]).locked[0]).icon, 'trophy');
  });
});

describe('homeSelection', () => {
  it('R5, R6: three newest done, the newest locked, and Show more when more exist', () => {
    const done = [doneItem(), doneItem(), doneItem(), doneItem()];
    const locked = [lockedItem(), lockedItem()];
    const home = homeSelection(ok([...done, ...locked]));
    assert.equal(home.visible, true);
    assert.equal(HOME_DONE_COUNT, 3);
    assert.deepEqual(home.done.map((i) => i.rkey), done.slice(0, 3).map((i) => i.rkey));
    assert.equal(home.locked?.rkey, locked[0].rkey);
    assert.equal(home.showMore, true);
  });

  it('R6: no Show more when everything fits on the home page', () => {
    const home = homeSelection(ok([doneItem(), doneItem(), doneItem(), lockedItem()]));
    assert.equal(home.done.length, 3);
    assert.ok(home.locked);
    assert.equal(home.showMore, false);
  });

  it('R6: a fourth done item, or a second locked one, needs Show more', () => {
    assert.equal(homeSelection(ok([doneItem(), doneItem(), doneItem(), doneItem()])).showMore, true);
    assert.equal(homeSelection(ok([doneItem(), lockedItem(), lockedItem()])).showMore, true);
  });

  it('R8: no locked accomplishment, no locked row', () => {
    const home = homeSelection(ok([doneItem(), doneItem()]));
    assert.equal(home.locked, undefined);
    assert.equal(home.done.length, 2);
    assert.equal(home.showMore, false);
  });

  it('R8: unavailable or empty data hides the section', () => {
    assert.deepEqual(homeSelection(readAccomplishments({ status: 'unavailable', items: [] })), {
      visible: false,
      done: [],
      showMore: false,
    });
    assert.equal(homeSelection(ok([])).visible, false);
  });
});

describe('formatDateRange', () => {
  it('R1: a month, or a range when the end month differs', () => {
    assert.equal(formatDateRange({ startDate: '2026-09' }), 'Sep 2026');
    assert.equal(formatDateRange({ startDate: '2026-09', endDate: '2026-09' }), 'Sep 2026');
    assert.equal(formatDateRange({ startDate: '2025-03', endDate: '2026-09' }), 'Mar 2025 – Sep 2026');
  });
});

describe('fixtures (scripts/fixtures/accomplishments*.json)', () => {
  const words = (s) => s.trim().split(/\s+/).length;

  for (const name of ['accomplishments.json', 'accomplishments-two-done.json']) {
    it(`${name} is what the fetch script writes: valid items, sorted newest first`, async () => {
      const data = await fixture(name);
      assert.equal(data.status, 'ok');
      assert.ok(!Number.isNaN(Date.parse(data.fetchedAt)));
      for (const item of data.items) {
        const { rkey, ...value } = item;
        assert.deepEqual(toItem({ uri: `at://did:plc:fixture/x/${rkey}`, value }), item, rkey);
      }
      assert.deepEqual([...data.items].sort(compareItems), data.items);
      assert.equal(new Set(data.items.map((i) => i.rkey)).size, data.items.length);
    });
  }

  it('R7: the rich fixture has 30 done over three pages and 3 locked', async () => {
    const { done, locked } = readAccomplishments(await fixture('accomplishments.json'));
    assert.equal(done.length, 30);
    assert.equal(locked.length, 3);
    assert.equal(paginate(done, 12).length, 3);
    assert.equal(new Set(locked.map((i) => i.createdAt)).size, 3);
    assert.ok(new Set(done.map((i) => i.startDate.slice(0, 7))).size >= 12, 'spans many months');
    assert.ok(done.some((i) => i.endDate && i.endDate !== i.startDate), 'has a date range');
    assert.ok(done.some((i) => i.tags.length > 0) && done.some((i) => i.links.length > 0));
  });

  it('R12, R13, R17: the rich fixture uses every icon, one unknown icon and one old-style record', async () => {
    const { done, locked } = readAccomplishments(await fixture('accomplishments.json'));
    const used = new Set(done.map((i) => i.icon));
    for (const { id } of ICONS) assert.ok(used.has(id), id);
    const known = new Set(ICONS.map((i) => i.id));
    assert.equal(done.filter((i) => i.icon !== undefined && !known.has(i.icon)).length, 1);
    const old = done.filter((i) => !('funTitle' in i) && !('shortDescription' in i) && !('icon' in i));
    assert.equal(old.length, 1);
    assert.ok(locked.every((i) => known.has(i.icon ?? '')));
  });

  it('R4, R18: fun titles are one to three words and short descriptions five to seven', async () => {
    const { items } = await fixture('accomplishments.json');
    for (const item of items.filter((i) => i.funTitle)) {
      assert.ok(words(item.funTitle) >= 1 && words(item.funTitle) <= 3, item.funTitle);
      assert.ok(words(item.shortDescription) >= 5 && words(item.shortDescription) <= 7, item.shortDescription);
    }
  });

  it('R5, R8: the two-done fixture has no locked row and no Show more', async () => {
    const home = homeSelection(readAccomplishments(await fixture('accomplishments-two-done.json')));
    assert.equal(home.done.length, 2);
    assert.equal(home.locked, undefined);
    assert.equal(home.showMore, false);
  });

  it('R8: the unavailable fixture is the committed placeholder', async () => {
    assert.deepEqual(await fixture('accomplishments-unavailable.json'), JSON.parse(await readFile(PLACEHOLDER, 'utf8')));
  });

  it('R21: fixture links point only at reserved example domains', async () => {
    const { items } = await fixture('accomplishments.json');
    for (const link of items.flatMap((i) => i.links)) assert.match(new URL(link).hostname, /^example\.(com|org)$/, link);
  });
});
