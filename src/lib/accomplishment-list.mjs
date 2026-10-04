// @ts-check
// The accomplishments' pure logic (gamified accomplishments spec D3, D4): it
// splits the fetched items into done and locked, says what a row shows, and
// which rows the home page shows. Plain .mjs so the Node tests can import it;
// src/lib/accomplishments.ts feeds it src/data/accomplishments.json and
// re-exports it for the pages.

import { iconFor } from './achievement-icons.mjs';

/**
 * What every accomplishment has.
 * @typedef {object} AccomplishmentBase
 * @property {string} rkey
 * @property {string} title The plain headline, shown when the row is opened.
 * @property {string} description The full description.
 * @property {string[]} tags
 * @property {string[]} links http(s) URLs only.
 * @property {string} createdAt ISO timestamp the record was written.
 * @property {string} [funTitle] The playful name that leads the row.
 * @property {string} [shortDescription] The five-to-seven-word summary.
 * @property {string} [icon] An icon id from achievement-icons.mjs; unknown ones fall back.
 */

/**
 * An accomplishment that is done: it has the month (or range) it was done in.
 * @typedef {AccomplishmentBase & { done: true, startDate: string, endDate?: string }} DoneAccomplishment
 * startDate and endDate are YYYY-MM.
 */

/**
 * A locked accomplishment: not done yet, so it has no dates (R9).
 * @typedef {AccomplishmentBase & { done: false }} LockedAccomplishment
 */

/** @typedef {DoneAccomplishment | LockedAccomplishment} Accomplishment */

/**
 * @typedef {object} Accomplishments
 * @property {'ok' | 'unavailable'} status "unavailable" when the build couldn't reach the AT Protocol repo.
 * @property {DoneAccomplishment[]} done Newest first.
 * @property {LockedAccomplishment[]} locked Newest first.
 */

/**
 * What a row shows (R1, R4, R13, R17).
 * @typedef {object} Row
 * @property {string} lead The fun title, or the plain title for an old record.
 * @property {string} [short] The short description, when there is one.
 * @property {string} icon The icon id to draw: the record's when known, else the fallback.
 */

/**
 * What the home section shows (R5, R6, R8).
 * @typedef {object} HomeSelection
 * @property {boolean} visible False when the data is unavailable or empty: the section doesn't render.
 * @property {DoneAccomplishment[]} done The three newest done accomplishments.
 * @property {LockedAccomplishment} [locked] The newest locked one, if any.
 * @property {boolean} showMore True when something isn't on the home page.
 */

/** How many done accomplishments the home page shows (R5). */
export const HOME_DONE_COUNT = 3;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** @param {unknown} value @returns {value is string} */
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** @param {unknown} value */
export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * One item of the file, or null when it can't be shown. The fetch script
 * already checks and sorts the items; this guards against a hand-edited file
 * (such as a fixture) and an item from before `done` existed.
 * @param {any} raw
 * @returns {Accomplishment | null}
 */
function toAccomplishment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!nonEmptyString(raw.rkey) || !nonEmptyString(raw.title) || !nonEmptyString(raw.description)) return null;
  /** @type {AccomplishmentBase} */
  const base = {
    rkey: raw.rkey,
    title: raw.title,
    description: raw.description,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(nonEmptyString) : [],
    // The fetch script filters links too; this guards against a hand-edited file.
    links: Array.isArray(raw.links) ? raw.links.filter(isHttpUrl) : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
  };
  if (nonEmptyString(raw.funTitle)) base.funTitle = raw.funTitle;
  if (nonEmptyString(raw.shortDescription)) base.shortDescription = raw.shortDescription;
  if (nonEmptyString(raw.icon)) base.icon = raw.icon;

  if (raw.done === false) return { ...base, done: false };
  if (typeof raw.startDate !== 'string' || !MONTH.test(raw.startDate)) return null;
  /** @type {DoneAccomplishment} */
  const done = { ...base, done: true, startDate: raw.startDate };
  if (typeof raw.endDate === 'string' && MONTH.test(raw.endDate)) done.endDate = raw.endDate;
  return done;
}

/**
 * Splits the contents of src/data/accomplishments.json into done and locked,
 * keeping the file's order (newest first, as the fetch script sorts it).
 * @param {unknown} data
 * @returns {Accomplishments}
 */
export function readAccomplishments(data) {
  const raw = /** @type {{ status?: unknown, items?: unknown }} */ (data ?? {});
  if (raw.status !== 'ok' || !Array.isArray(raw.items)) return { status: 'unavailable', done: [], locked: [] };
  /** @type {Accomplishments} */
  const result = { status: 'ok', done: [], locked: [] };
  for (const item of raw.items.map(toAccomplishment)) {
    if (item?.done === true) result.done.push(item);
    else if (item?.done === false) result.locked.push(item);
  }
  return result;
}

/**
 * What a row shows: the fun title leads, or the plain title when there is
 * none; the short description, if any; and the icon to draw.
 * @param {Accomplishment} item
 * @returns {Row}
 */
export function rowFor(item) {
  /** @type {Row} */
  const row = { lead: item.funTitle ?? item.title, icon: iconFor(item.icon) };
  if (item.shortDescription !== undefined) row.short = item.shortDescription;
  return row;
}

/**
 * The home section: the three newest done accomplishments, then the newest
 * locked one, and whether a "Show more" link is needed for the rest.
 * @param {Accomplishments} accomplishments
 * @returns {HomeSelection}
 */
export function homeSelection({ status, done, locked }) {
  const visible = status === 'ok' && done.length + locked.length > 0;
  if (!visible) return { visible, done: [], showMore: false };
  /** @type {HomeSelection} */
  const selection = {
    visible,
    done: done.slice(0, HOME_DONE_COUNT),
    showMore: done.length > HOME_DONE_COUNT || locked.length > 1,
  };
  if (locked.length > 0) selection.locked = locked[0];
  return selection;
}

/** "2026-09" → "Sep 2026". @param {string} month */
function formatMonth(month) {
  const [year, m] = month.split('-');
  return `${MONTHS[Number(m) - 1]} ${year}`;
}

/**
 * "Sep 2026", or "Mar 2025 – Sep 2026" when the end month differs. For done
 * accomplishments only: a locked one has no date.
 * @param {Pick<DoneAccomplishment, 'startDate' | 'endDate'>} item
 */
export function formatDateRange({ startDate, endDate }) {
  const start = formatMonth(startDate);
  return endDate && endDate !== startDate ? `${start} – ${formatMonth(endDate)}` : start;
}

/** Short link text: the host, without "www.". @param {string} url */
export function linkLabel(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}
