import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { compareItems, toItem } from './fetch-accomplishments.mjs';

const SCRIPT = fileURLToPath(new URL('./fetch-accomplishments.mjs', import.meta.url));
const MOCK = fileURLToPath(new URL('./test/mock-fetch.mjs', import.meta.url));
const NSID = 'com.jlawcordova.profile.accomplishment';
const DID = 'did:plc:testtesttesttesttesttest';
const PDS = 'https://pds.example.com';

const RESOLVE = 'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle';
const PLC = `https://plc.directory/${DID}`;
const LIST = `${PDS}/xrpc/com.atproto.repo.listRecords`;

const identityRoutes = {
  [RESOLVE]: [{ body: { did: DID } }],
  [PLC]: [{ body: { id: DID, service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }] } }],
};

function record(rkey, value) {
  return {
    uri: `at://${DID}/${NSID}/${rkey}`,
    cid: 'bafytest',
    value: { $type: NSID, createdAt: '2026-10-01T00:00:00.000Z', ...value },
  };
}

let dir;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fetch-accomplishments-'));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** Runs the script with a mocked fetch; resolves even on a non-zero exit. */
async function run(name, scenario) {
  const output = join(dir, `${name}.json`);
  const result = await promisify(execFile)(process.execPath, ['--import', MOCK, SCRIPT], {
    env: { ...process.env, MOCK_FETCH: JSON.stringify(scenario), ACCOMPLISHMENTS_OUTPUT: output },
  }).then(
    (r) => ({ code: 0, ...r }),
    (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }),
  );
  return { ...result, data: JSON.parse(await readFile(output, 'utf8')) };
}

describe('fetch-accomplishments script', () => {
  it('P1: network down → status unavailable, a warning, exit 0', async () => {
    const { code, stderr, data } = await run('down', { down: true });
    assert.equal(code, 0);
    assert.match(stderr, /warning/);
    assert.equal(data.status, 'unavailable');
    assert.deepEqual(data.items, []);
    assert.ok(!Number.isNaN(Date.parse(data.fetchedAt)));
  });

  it('a 5xx from the PDS → status unavailable, exit 0', async () => {
    const { code, data } = await run('pds-error', { routes: { ...identityRoutes, [LIST]: [{ status: 502, body: {} }] } });
    assert.equal(code, 0);
    assert.equal(data.status, 'unavailable');
  });

  it('P2: empty collection → status ok, no items', async () => {
    const { code, data } = await run('empty', { routes: { ...identityRoutes, [LIST]: [{ body: { records: [] } }] } });
    assert.equal(code, 0);
    assert.equal(data.status, 'ok');
    assert.deepEqual(data.items, []);
  });

  it('P3: follows the cursor, drops non-http(s) links and invalid records, sorts newest first', async () => {
    const { code, data } = await run('records', {
      routes: {
        ...identityRoutes,
        [LIST]: [
          {
            body: {
              cursor: 'page2',
              records: [
                record('3aaaaaaaaaaa2', {
                  title: 'Older',
                  description: 'd',
                  startDate: '2025-03',
                  links: ['javascript:alert(1)', 'https://example.com/pr/1', 'data:text/html,x', 'ftp://example.com', '/relative'],
                  tags: ['TypeScript', ''],
                  extra: 'dropped',
                }),
                record('3aaaaaaaaaaa3', { title: 'Bad date', description: 'd', startDate: '2026-13' }),
              ],
            },
          },
          {
            body: {
              records: [
                record('3aaaaaaaaaaa4', { title: 'Newest', description: 'd', startDate: '2025-01', endDate: '2026-09' }),
                record('3aaaaaaaaaaa5', { title: 'Missing description', startDate: '2026-09' }),
              ],
            },
          },
        ],
      },
    });
    assert.equal(code, 0);
    assert.equal(data.status, 'ok');
    assert.deepEqual(
      data.items.map((i) => i.title),
      ['Newest', 'Older'],
    );
    const older = data.items[1];
    assert.deepEqual(older, {
      rkey: '3aaaaaaaaaaa2',
      title: 'Older',
      description: 'd',
      startDate: '2025-03',
      tags: ['TypeScript'],
      links: ['https://example.com/pr/1'],
    });
  });
});

describe('toItem', () => {
  it('rejects endDate before startDate and keeps an equal one', () => {
    assert.equal(toItem(record('r', { title: 't', description: 'd', startDate: '2026-05', endDate: '2026-04' })), null);
    assert.equal(toItem(record('r', { title: 't', description: 'd', startDate: '2026-05', endDate: '2026-05' })).endDate, '2026-05');
  });

  it('rejects blank required strings', () => {
    assert.equal(toItem(record('r', { title: '  ', description: 'd', startDate: '2026-05' })), null);
  });
});

describe('compareItems', () => {
  it('sorts by endDate ?? startDate, then createdAt, newest first', () => {
    const items = [
      { title: 'a', startDate: '2026-01', createdAt: '2026-01-01T00:00:00Z' },
      { title: 'b', startDate: '2025-01', endDate: '2026-02', createdAt: '2026-01-01T00:00:00Z' },
      { title: 'c', startDate: '2026-01', createdAt: '2026-03-01T00:00:00Z' },
    ];
    assert.deepEqual(items.sort(compareItems).map((i) => i.title), ['b', 'c', 'a']);
  });
});
