// Fetches accomplishment records from the public AT Protocol repo of
// jlawcordova.com and writes them to src/data/accomplishments.json for the
// home page. Node built-ins only. On any failure it writes an "unavailable"
// file and exits 0, so a PDS outage never fails the site build.
//
// Usage: node scripts/fetch-accomplishments.mjs
// Env:   ATPROTO_HANDLE (default jlawcordova.com)
//        ACCOMPLISHMENTS_OUTPUT (default src/data/accomplishments.json)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NSID = 'com.jlawcordova.profile.accomplishment';
const HANDLE = process.env.ATPROTO_HANDLE || 'jlawcordova.com';
// Any PDS or AppView can resolve a handle; this one is public and unauthenticated.
const HANDLE_RESOLVER = 'https://public.api.bsky.app';
const PAGE_LIMIT = 100;
const MAX_PAGES = 20;
const TIMEOUT_MS = 10_000;

const OUTPUT = process.env.ACCOMPLISHMENTS_OUTPUT
  ? resolve(process.env.ACCOMPLISHMENTS_OUTPUT)
  : fileURLToPath(new URL('../src/data/accomplishments.json', import.meta.url));

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

async function getJson(url) {
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET ${new URL(url).host}${new URL(url).pathname} returned ${res.status}`);
  return res.json();
}

/** Handle → DID → PDS endpoint, the same way the MCP server resolves it. */
async function resolveIdentity(handle) {
  const { did } = await getJson(
    `${HANDLE_RESOLVER}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
  );
  if (typeof did !== 'string' || !/^did:(plc|web):[A-Za-z0-9._:%-]+$/.test(did)) {
    throw new Error('handle did not resolve to a DID');
  }

  const docUrl = did.startsWith('did:plc:')
    ? `https://plc.directory/${did}`
    : `https://${decodeURIComponent(did.slice('did:web:'.length))}/.well-known/did.json`;
  const doc = await getJson(docUrl);
  const service = (Array.isArray(doc.service) ? doc.service : []).find(
    (s) => s?.id === '#atproto_pds' || s?.type === 'AtprotoPersonalDataServer',
  );
  const endpoint = service?.serviceEndpoint;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    throw new Error('DID document has no https #atproto_pds endpoint');
  }
  return { did, pds: endpoint.replace(/\/+$/, '') };
}

async function listAllRecords({ did, pds }) {
  const records = [];
  let cursor;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ repo: did, collection: NSID, limit: String(PAGE_LIMIT) });
    if (cursor) params.set('cursor', cursor);
    const body = await getJson(`${pds}/xrpc/com.atproto.repo.listRecords?${params}`);
    if (!Array.isArray(body.records)) throw new Error('listRecords returned no records array');
    records.push(...body.records);
    cursor = typeof body.cursor === 'string' && body.cursor ? body.cursor : undefined;
    if (!cursor || body.records.length === 0) break;
  }
  return records;
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** @param {unknown} value @returns {value is string} */
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Minimal check: required fields are non-empty strings, dates are YYYY-MM with
 * endDate not before startDate, and only http(s) links survive. Every other
 * field is dropped. Returns null for a record that fails.
 *
 * Gamified accomplishments (spec D3): `done` is true when absent. A locked
 * record (`done: false`) has no dates, and one that has any is rejected, as
 * the AT Protocol side rejects it. A `done` that is present but not a boolean
 * is malformed (the lexicon types it boolean), so the record is rejected
 * rather than guessed into a claim or a goal. `funTitle`, `shortDescription`
 * and `icon` are copied, trimmed, only when they are non-empty strings; the
 * site falls back to the plain title and the star without them (R17).
 */
export function toItem(record) {
  const value = record?.value;
  const rkey = typeof record?.uri === 'string' ? record.uri.split('/').pop() : undefined;
  if (!value || typeof value !== 'object' || !nonEmptyString(rkey)) return null;
  const { title, description, startDate, endDate, createdAt } = value;
  if (!nonEmptyString(title) || !nonEmptyString(description) || !nonEmptyString(createdAt)) return null;
  if (value.done !== undefined && typeof value.done !== 'boolean') return null;
  const done = value.done !== false;

  if (done) {
    if (typeof startDate !== 'string' || !MONTH.test(startDate)) return null;
    if (endDate !== undefined && (typeof endDate !== 'string' || !MONTH.test(endDate) || endDate < startDate)) {
      return null;
    }
  } else if (startDate !== undefined || endDate !== undefined) {
    return null;
  }

  /** @param {unknown} v */
  const optional = (v) => (nonEmptyString(v) ? v.trim() : undefined);
  const entries = {
    rkey,
    title: title.trim(),
    description: description.trim(),
    done,
    startDate: done ? startDate : undefined,
    endDate: done ? endDate : undefined,
    funTitle: optional(value.funTitle),
    shortDescription: optional(value.shortDescription),
    icon: optional(value.icon),
    tags: Array.isArray(value.tags) ? value.tags.filter(nonEmptyString).map((t) => t.trim()) : [],
    links: Array.isArray(value.links) ? value.links.filter(isHttpUrl) : [],
    createdAt,
  };
  // Leave absent fields out rather than writing them as undefined.
  return Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined));
}

/**
 * Newest first. Done items come first, by endDate ?? startDate descending,
 * then createdAt descending. Locked items follow, by createdAt descending.
 */
export function compareItems(a, b) {
  const aLocked = a.done === false;
  const bLocked = b.done === false;
  if (aLocked !== bLocked) return aLocked ? 1 : -1;
  if (!aLocked) {
    const byMonth = (b.endDate ?? b.startDate).localeCompare(a.endDate ?? a.startDate);
    if (byMonth !== 0) return byMonth;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

async function write(data) {
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const fetchedAt = new Date().toISOString();
  try {
    const identity = await resolveIdentity(HANDLE);
    const records = await listAllRecords(identity);
    const items = records.map(toItem).filter(Boolean).sort(compareItems);
    const skipped = records.length - items.length;
    // createdAt stays on every item: locked items sort by it, and it dates
    // a locked accomplishment for the stale check (spec R10).
    await write({ status: 'ok', fetchedAt, items });
    console.log(
      `fetch-accomplishments: wrote ${items.length} item(s)` + (skipped ? `, skipped ${skipped} invalid` : ''),
    );
  } catch (error) {
    await write({ status: 'unavailable', fetchedAt, items: [] });
    console.warn(`fetch-accomplishments: warning: records unavailable (${error?.message ?? error}); wrote empty fallback`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
