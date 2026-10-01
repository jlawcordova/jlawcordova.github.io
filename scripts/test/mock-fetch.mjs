// Loaded with `node --import` by the tests: replaces fetch with canned
// responses from the MOCK_FETCH env var, so no test touches the network.
//   MOCK_FETCH = { "down": true }                       → every fetch rejects
//   MOCK_FETCH = { "routes": { "<url prefix>": [<response>, ...] } }
// Each response is { "status"?: number, "body": any }. Repeated calls to the
// same prefix take the next response (the last one repeats).

const scenario = JSON.parse(process.env.MOCK_FETCH ?? '{}');
const calls = new Map();

globalThis.fetch = async (input) => {
  const url = String(input);
  if (scenario.down) throw new TypeError('fetch failed');
  const prefix = Object.keys(scenario.routes ?? {}).find((p) => url.startsWith(p));
  if (!prefix) return new Response('not found', { status: 404 });
  const n = calls.get(prefix) ?? 0;
  calls.set(prefix, n + 1);
  const responses = scenario.routes[prefix];
  const { status = 200, body } = responses[Math.min(n, responses.length - 1)];
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};
