// shell_core.test.mjs - the Waypoint Core link and API pin (api.js): one GET /health, API 1 needed
// (an answer without `api` counts as 1), a quiet 10 s retry while down that stops once ok.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, textOf, test, done, SRC } from './harness.mjs';

// A fake fetch and timer queue so the retry loop is observable without waiting.
function load(answers) {
  const calls = [];
  const timers = [];
  const logs = [];
  const quiet = { log: (...a) => logs.push(a), warn: (...a) => logs.push(a), error: (...a) => logs.push(a), info: (...a) => logs.push(a) };
  const fetch = (url) => {
    calls.push(url);
    const a = answers.length > 1 ? answers.shift() : answers[0];
    if (a === 'down') return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(a), text: () => Promise.resolve(JSON.stringify(a)) });
  };
  const CC = { h, React: makeReact() };
  const ctx = vm.createContext({ CC, console: quiet, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, isFinite, fetch,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {} });
  for (const f of ['tokens.js', 'ui.js', 'api.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return { CC, calls, timers, logs };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('the plugin pins Core API 1 and starts in a checking state (no request at load)', () => {
  const { CC, calls } = load([{ ok: true }]);
  assert.equal(CC.CORE_API, 1);
  assert.equal(CC.core.state, 'checking');
  assert.equal(calls.length, 0);
});

test('a health answer without `api` counts as API 1: ok, with the version', async () => {
  const { CC, calls, timers } = load([{ ok: true, service: 'cc-engine', version: '0.9.0' }]);
  CC.coreStart();
  CC.coreStart();
  await tick(); await tick();
  assert.deepEqual(calls, ['http://127.0.0.1:8751/health'], 'one GET /health');
  assert.equal(CC.core.state, 'ok');
  assert.equal(CC.core.api, 1);
  assert.equal(CC.core.version, '0.9.0');
  assert.equal(timers.length, 0, 'no retry once ok');
});

test('api 1 with api_version reads as ok and keeps the API version for About', async () => {
  const { CC } = load([{ ok: true, api: 1, api_version: '1.0', version: '1.2.0' }]);
  await CC.coreCheck();
  assert.equal(CC.core.state, 'ok');
  assert.equal(CC.core.apiVersion, '1.0');
});

test('another API is a mismatch', async () => {
  const { CC } = load([{ ok: true, api: 2, api_version: '2.0' }]);
  await CC.coreCheck();
  assert.equal(CC.core.state, 'mismatch');
  assert.equal(CC.core.api, 2);
});

test('down: retries quietly every 10 s and stops once Core answers', async () => {
  const { CC, calls, timers, logs } = load(['down', 'down', { ok: true, api: 1 }]);
  const seen = [];
  CC.coreSubscribe((c) => seen.push(c.state));
  await CC.coreCheck();
  assert.equal(CC.core.state, 'down');
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 10000);
  timers.shift().fn(); await tick(); await tick(); await tick();
  assert.equal(CC.core.state, 'down');
  assert.equal(timers.length, 1, 'still down: one more retry queued');
  timers.shift().fn(); await tick(); await tick(); await tick();
  assert.equal(CC.core.state, 'ok');
  assert.equal(timers.length, 0, 'ok: the retry loop stops');
  assert.equal(calls.length, 3);
  assert.deepEqual(seen, ['down', 'ok'], 'listeners hear only real changes');
  assert.deepEqual(logs, [], 'no console noise');
});

test('a request that gets no answer marks a live link down and starts the retry', async () => {
  const { CC, timers } = load([{ ok: true, api: 1 }, 'down']);
  await CC.coreCheck();
  assert.equal(CC.core.state, 'ok');
  await CC.api.get('/api/board').then(() => assert.fail('should reject'), () => {});
  assert.equal(CC.core.state, 'down');
  assert.equal(timers.length, 1);
});

test('useCore returns the current link; CoreEmpty says what to do', () => {
  const { CC } = load([{ ok: true }]);
  assert.equal(CC.useCore().state, 'checking');
  CC.core = { state: 'down' };
  assert.equal(CC.ui.coreProblem(), true);
  assert.match(textOf(render(CC.ui.CoreEmpty())), /^The Waypoint server is not running/);
  assert.match(textOf(render(CC.ui.CoreEmpty())), /INSTALL.md/);
  assert.match(textOf(render(CC.ui.CoreEmpty({ core: { state: 'mismatch', api: 3 } }))), /API 3/);
  assert.equal(CC.ui.coreProblem({ state: 'ok' }), false);
});

done('shell_core');
