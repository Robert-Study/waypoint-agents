// tab_running.test.mjs - CC.RunningTab: what runs now, usage per pool with floors, providers, sprints (dsh-v2 t-running).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCC, render, textOf, findAll, hasClass } from './harness.mjs';

const NOW = Date.parse('2026-11-08T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

function load(reply) {
  const calls = [];
  const CC = loadCC(['tokens.js', 'ui.js', 'wpc_client.js', 'tab_running.js'], {
    fetch: (url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      const r = reply ? reply(body) : { payload: {}, isError: false };
      if (r === 'down') return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(r)) });
    }
  });
  return { CC, calls, I: CC.runningTabInternals };
}

function ops() {
  return {
    running: [{ project: 'demo-project', node: 'n-build', by: 'Alex', since: iso(NOW - 5 * 60e3) }],
    pools: [
      { pool: 'vendor_a_5h', provider: 'vendor-a', remaining_percent: 80, resets_at: iso(NOW + 2.5 * 3600e3), observed_at: iso(NOW - 60e3), floor: 20 },
      { pool: 'vendor_a_week', provider: 'vendor-a', remaining_percent: 40, resets_at: iso(NOW + 6 * 86400e3), observed_at: iso(NOW - 60e3), floor: null },
      { pool: 'shared_day', provider: null, remaining_percent: 55, resets_at: null, observed_at: null, floor: null }
    ],
    providers: [
      { id: 'vendor-a', label: 'Vendor A CLI', enabled: true, pool: 'vendor_a_5h', state: 'up', reason: null },
      { id: 'vendor-b', label: 'Vendor B CLI', enabled: true, pool: 'vendor_b_5h', state: 'down', reason: 'login expired' },
      { id: 'vendor-c', label: 'Vendor C CLI', enabled: false, pool: 'vendor_c_5h', state: 'disabled', reason: null }
    ],
    sprints: [{ id: 's1', project: 'demo-project', mode: 'balanced', start: '2026-11-09T02:00:00Z', next: true, overnight: true, last_result: null }],
    usage_refreshing: false
  };
}

function tab(CC, q) {
  CC.useWpc = () => Object.assign({ data: null, error: null, loading: false, reload() {} }, q);
  return render(CC.h(CC.RunningTab, { pageId: 'running' }));
}

test('running: floor validation accepts 0-100 or empty and refuses the rest', () => {
  const { I } = load();
  assert.deepEqual(JSON.parse(JSON.stringify(I.parseFloor('25'))), { ok: true, value: 25 });
  assert.deepEqual(JSON.parse(JSON.stringify(I.parseFloor(' 0 '))), { ok: true, value: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(I.parseFloor('100'))), { ok: true, value: 100 });
  assert.deepEqual(JSON.parse(JSON.stringify(I.parseFloor(''))), { ok: true, value: null });
  assert.deepEqual(JSON.parse(JSON.stringify(I.parseFloor('  '))), { ok: true, value: null });
  for (const bad of ['-1', '101', 'abc', '5%x', 'NaN', 'Infinity', '1e9']) {
    const r = I.parseFloor(bad);
    assert.equal(r.ok, false, bad);
    assert.match(r.error, /0 to 100/);
  }
});

test('running: floor_set input carries the pool and the number, and null to clear', () => {
  const { I } = load();
  assert.deepEqual(JSON.parse(JSON.stringify(I.floorInput('vendor_a_5h', '30'))), { ok: true, input: { pool: 'vendor_a_5h', min_percent: 30 } });
  assert.deepEqual(JSON.parse(JSON.stringify(I.floorInput('vendor_a_5h', ''))), { ok: true, input: { pool: 'vendor_a_5h', min_percent: null } });
  assert.equal(I.floorInput('vendor_a_5h', '150').ok, false);
});

test('running: saving a floor calls floor_set, refreshes ops_read and reports; a bad value never calls', async () => {
  const { CC, calls, I } = load((b) => ({ payload: { pool: b.input.pool, min_percent: b.input.min_percent }, isError: false }));
  const heard = [];
  CC.wpc.listen((tools) => heard.push(tools.join(',')));
  assert.match(await I.saveFloor('vendor_a_5h', '30'), /set to 30%/);
  assert.match(await I.saveFloor('vendor_a_5h', ''), /cleared/);
  assert.match(await I.saveFloor('vendor_a_5h', '-4'), /0 to 100/);
  assert.deepEqual(calls.map((c) => [c.tool, c.input.pool, c.input.min_percent]),
    [['floor_set', 'vendor_a_5h', 30], ['floor_set', 'vendor_a_5h', null]]);
  assert.deepEqual(heard, ['ops_read', 'ops_read']);
});

test('running: toggle_set input flips the provider and refreshes ops_read; a refusal is reported', async () => {
  let refuse = false;
  const { CC, calls, I } = load((b) => refuse ? { payload: { error: 'rev_conflict', message: 'Changed elsewhere.' }, isError: true }
    : { payload: { id: b.input.id, enabled: b.input.enabled }, isError: false });
  assert.deepEqual(JSON.parse(JSON.stringify(I.toggleInput({ id: 'vendor-a', enabled: true }))), { id: 'vendor-a', enabled: false });
  assert.deepEqual(JSON.parse(JSON.stringify(I.toggleInput({ id: 'vendor-c', enabled: false }))), { id: 'vendor-c', enabled: true });
  const heard = [];
  CC.wpc.listen((tools) => heard.push(tools.join(',')));
  assert.match(await I.runToggle({ id: 'vendor-c', label: 'Vendor C CLI', enabled: false }), /Vendor C CLI switched on/);
  refuse = true;
  assert.match(await I.runToggle({ id: 'vendor-a', label: 'Vendor A CLI', enabled: true }), /Changed elsewhere/);
  assert.deepEqual(calls.map((c) => [c.tool, c.input.id, c.input.enabled]), [['toggle_set', 'vendor-c', true], ['toggle_set', 'vendor-a', false]]);
  assert.deepEqual(heard, ['ops_read']);
});

test('running: pace colour is green on pace, amber over, red far over or at the floor, none when unknown', () => {
  const { I } = load();
  const win = 5 * 3600e3;
  const p = (rem, leftMs, floor) => ({ pool: 'x_5h', remaining_percent: rem, floor, resets_at: iso(NOW + leftMs) });
  const onPace = I.paceOf(p(90, win * 0.5, 0), NOW);
  assert.equal(onPace.hue, 135); assert.equal(onPace.tone, 'ok');
  const slight = I.paceOf(p(42, win * 0.5, 0), NOW);
  assert.ok(slight.hue > 0 && slight.hue < 135); assert.equal(slight.tone, 'warn'); assert.match(slight.word, /over pace/);
  const far = I.paceOf(p(10, win * 0.9, 0), NOW);
  assert.equal(far.hue, 0); assert.equal(far.tone, 'low'); assert.match(far.word, /far over/);
  const atFloor = I.paceOf(p(20, win * 0.5, 20), NOW);
  assert.equal(atFloor.hue, 0); assert.match(atFloor.word, /floor/);
  // A higher floor leaves less to spend, so the same reading is further over pace.
  assert.ok(I.paceOf(p(60, win * 0.5, 40), NOW).hue < I.paceOf(p(60, win * 0.5, 0), NOW).hue);
  assert.equal(I.paceOf({ pool: 'x_5h', remaining_percent: 50, resets_at: null }, NOW), null);
  assert.equal(I.paceOf({ pool: 'x_misc', remaining_percent: 50, resets_at: iso(NOW + 1000) }, NOW), null);
  assert.equal(I.paceOf(p(50, -1000, 0), NOW).stale, true);
  assert.equal(I.poolWindow('a_week'), 7 * 86400e3);
  assert.equal(I.poolWindow('b_day'), 86400e3);
});

test('running: pools group under their provider, the rest under Other pools; nothing names a vendor', () => {
  const { I } = load();
  const g = I.groupPools(ops());
  assert.deepEqual(JSON.parse(JSON.stringify(g.map((x) => [x.label, x.pools.map((p) => p.pool).join(',')]))),
    [['Vendor A CLI', 'vendor_a_5h,vendor_a_week'], ['Other pools', 'shared_day']]);
  assert.equal(I.poolShort('vendor_a_5h'), 'a 5h');
});

test('running: the tab shows what runs, usage meters with floors, providers with toggles and sprints', () => {
  const { CC, I } = load();
  I.now = () => NOW;
  const tree = tab(CC, { data: ops() });
  const text = textOf(tree);
  assert.match(text, /demo-project/); assert.match(text, /n-build/); assert.match(text, /Alex/); assert.match(text, /5m ago/);
  assert.equal(findAll(tree, hasClass('cc-mt')).length, 3);
  const floors = findAll(tree, (n) => n.type === 'input' && n.props['data-floor']);
  assert.deepEqual(JSON.parse(JSON.stringify(floors.map((n) => [n.props['data-floor'], n.props.value]))), [['vendor_a_5h', '20'], ['vendor_a_week', ''], ['shared_day', '']]);
  const sw = findAll(tree, (n) => n.props.role === 'switch');
  assert.deepEqual(sw.map((n) => [n.props['data-id'], n.props['aria-checked']]), [['vendor-a', 'true'], ['vendor-b', 'true'], ['vendor-c', 'false']]);
  assert.ok(findAll(tree, (n) => n.props.title && /login expired/.test(n.props.title)).length >= 1);
  assert.match(text, /Fail/); assert.match(text, /Off/);
  assert.match(text, /next/); assert.match(text, /overnight/); assert.match(text, /balanced/);
  const paced = findAll(tree, hasClass('cc-rt-paced'));
  assert.ok(paced.length >= 1 && /--cc-rt-h/.test(JSON.stringify(paced[0].props.style)));
});

test('running: empty lists show calm empty states', () => {
  const { CC } = load();
  const text = textOf(tab(CC, { data: { running: [], pools: [], providers: [], sprints: [] } }));
  assert.match(text, /Nothing is running/);
  assert.match(text, /No usage readings/);
  assert.match(text, /No providers/);
  assert.match(text, /No sprints/);
  // A payload with missing lists is the same as empty lists.
  assert.match(textOf(tab(CC, { data: {} })), /Nothing is running/);
});

test('running: server down with no data shows the problem; with old data shows a banner and keeps the data', () => {
  const { CC } = load();
  const down = { code: 'server_down', message: 'The Waypoint server is not running.' };
  assert.match(textOf(tab(CC, { error: down })), /server is not running/);
  assert.match(textOf(tab(CC, { loading: true })), /Loading/);
  const stale = tab(CC, { data: ops(), error: down });
  assert.equal(findAll(stale, hasClass('cc-bn')).length, 1);
  assert.match(textOf(stale), /demo-project/);
});

test('running: the tab is exported and reads ops_read every 20 seconds', () => {
  const { CC } = load();
  let seen = null;
  CC.useWpc = (tool, input, opts) => { seen = [tool, opts && opts.every]; return { data: null, error: null, loading: true, reload() {} }; };
  render(CC.h(CC.RunningTab, { pageId: 'running' }));
  assert.deepEqual(seen, ['ops_read', 20000]);
});
