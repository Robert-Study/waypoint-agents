// execute_tab.test.mjs - R1: the Create tab is now labelled Execute; id cc-create is unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, test, done, SRC } from './harness.mjs';

function load(files) {
  const CC = { h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}

test('app tab list has Execute with id cc-create and no Create tab', () => {
  const CC = load(['tokens.js', 'api.js', 'settings.js', 'page_agents.js', 'app.js']);
  const t = CC.PAGES.find((p) => p.label === 'Execute');
  assert.ok(t, 'Execute tab present');
  assert.equal(t.id, 'cc-create');
  assert.ok(!CC.PAGES.some((p) => p.label === 'Create'));
});

test('screens.mjs TABS contains Execute, not Create', () => {
  const s = fs.readFileSync(path.join(SRC, '..', 'tools', 'screens.mjs'), 'utf8');
  const m = s.match(/const TABS = \[([^\]]*)\]/);
  assert.ok(m && m[1].includes("'Execute'") && !m[1].includes("'Create'"));
});

done('execute_tab');
