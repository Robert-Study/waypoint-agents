// v4 B3: Claude and Codex run from dsh's main chat (the CLI bridge provider), so their own tabs start
// off. They stay registered (session history) and Settings can switch them back on.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, test, done, SRC } from './harness.mjs';

function load(stored) {
  const store = new Map(stored ? [['WAYPOINT_TABS_V1', JSON.stringify(stored)]] : []);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const CC = { h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, setTimeout, clearTimeout, localStorage });
  for (const f of ['tokens.js', 'api.js', 'settings.js', 'app.js']) {
    try { vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f }); } catch (e) { if (f !== 'app.js') throw e; }
  }
  return CC;
}

test('Claude and Codex pages stay registered but start off', () => {
  const CC = load();
  const ids = (CC.PAGES || []).map((p) => p.id);
  assert.ok(ids.includes('cc-claude') && ids.includes('cc-codex'), 'pages must stay registered: ' + ids);
  assert.equal(CC.settings.isOn('cc-claude'), false);
  assert.equal(CC.settings.isOn('cc-codex'), false);
  // dsh v2: they needed the retired 8751 engine, so they have no sidebar row and no Settings switch; ids still open.
  const e = CC.settings.entries().filter((x) => x.id === 'cc-claude' || x.id === 'cc-codex');
  assert.equal(e.length, 0);
  assert.ok(CC.PAGES.filter((x) => x.id === 'cc-claude' || x.id === 'cc-codex').every((x) => x.sidebar === false && x.def === false));
});

test('other tabs keep their default on', () => {
  const CC = load();
  assert.equal(CC.settings.isOn('cc-plan'), true);
  assert.equal(CC.settings.isOn('cc-settings'), true);
});

test('Settings can switch Claude back on and the choice persists', () => {
  const CC = load({ 'cc-claude': true });
  assert.equal(CC.settings.isOn('cc-claude'), true);
  assert.equal(CC.settings.isOn('cc-codex'), false);
  CC.settings.set('cc-codex', true);
  assert.equal(CC.settings.isOn('cc-codex'), true);
});

done('v4_main_screen');
