// wpc_client.test.mjs - CC.wpc: one client for every Waypoint tab (dsh-v2 t-kit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCC, render, textOf } from './harness.mjs';

function client(reply) {
  const calls = [];
  const CC = loadCC(['tokens.js', 'ui.js', 'wpc_client.js'], {
    fetch: (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/api/wpc/features')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ tools: ['board_read'], addons: { preferences: false } }) });
      const r = reply(JSON.parse(init.body));
      if (r === 'down') return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve({ ok: r.status === 200, status: r.status, text: () => Promise.resolve(JSON.stringify(r.body)) });
    }
  });
  return { CC, calls };
}
const ok = (payload) => ({ status: 200, body: { payload, isError: false } });

test('read posts the tool to the plugin server and returns the payload', async () => {
  const { CC, calls } = client(() => ok({ projects: [1] }));
  assert.equal(CC.wpc.base, 'http://127.0.0.1:8762');
  assert.deepEqual(await CC.wpc.read('board_read', { project: 'p' }), { projects: [1] });
  assert.equal(calls[0].url, 'http://127.0.0.1:8762/api/wpc/call');
  assert.deepEqual(JSON.parse(calls[0].init.body), { tool: 'board_read', input: { project: 'p' } });
});

test('a tool refusal, an HTTP error and a dead server each throw a coded error', async () => {
  let r = { status: 200, body: { payload: { error: 'rev_conflict', message: 'stale' }, isError: true } };
  const { CC } = client(() => r);
  await assert.rejects(CC.wpc.read('todo_tick', {}), (e) => e.code === 'rev_conflict' && e.message === 'stale');
  r = { status: 403, body: { error: 'forbidden', detail: 'only the dsh page' } };
  await assert.rejects(CC.wpc.read('board_read', {}), (e) => e.code === 'forbidden');
  r = 'down';
  await assert.rejects(CC.wpc.read('board_read', {}), (e) => e.code === 'server_down');
});

test('act tells watching tabs to read again, only for the named tools', async () => {
  const { CC } = client(() => ok({ ok: true }));
  const heard = [];
  const off = CC.wpc.listen((tools) => heard.push(tools));
  await CC.wpc.act('todo_tick', { id: 't' }, ['board_read']);
  await CC.wpc.act('floor_set', { pool: 'x', min_percent: 5 });
  off();
  await CC.wpc.act('floor_set', {});
  assert.deepEqual(JSON.parse(JSON.stringify(heard)), [['board_read'], ['floor_set']]);
});

test('features is fetched once and cached; a failure is retried next time', async () => {
  const { CC, calls } = client(() => ok({}));
  const a = await CC.wpc.features();
  await CC.wpc.features();
  assert.equal(a.addons.preferences, false);
  assert.equal(calls.filter((c) => c.url.endsWith('/features')).length, 1);
});

test('useWpc starts loading; WpcProblem explains a dead server and an off add-on', () => {
  const { CC } = client(() => ok({}));
  assert.deepEqual(Object.keys(CC.useWpc('board_read', {})).sort(), ['data', 'error', 'loading', 'reload']);
  assert.equal(CC.useWpc('board_read', {}).loading, true);
  assert.match(textOf(render(CC.h(CC.WpcProblem, { error: { code: 'server_down' } }))), /server is not running.*wpc_http/);
  assert.match(textOf(render(CC.h(CC.WpcProblem, { error: { code: 'addon_off' } }))), /add-on is off/);
});

test('useWpc keeps one request at a time per watch', () => {
  const src = fs.readFileSync(new URL('../src/wpc_client.js', import.meta.url), 'utf8');
  assert.match(src, /if \(busy\) \{ again = true; return; \}/);
});
