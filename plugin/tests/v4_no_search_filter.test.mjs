// v4 S2: dsh's native sidebar search and filter buttons are hidden on every page, not only Waypoint pages.
// They live in the session browser's section header; the session rows (the owner's chats) must stay.
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
const css = () => load(['tokens.js', 'api.js', 'settings.js', 'workspace_hide.js']).workspaceHide.css();

test('the session browser header (search + filter) is hidden on every page, unscoped', () => {
  const c = css();
  const rule = '[class*="_root"]:has(> [class*="_sectionHeader"]):has([class*="_listArea"]) > [class*="_sectionHeader"]{display:none;}';
  assert.ok(c.includes(rule), 'missing unscoped header rule');
  const i = c.indexOf(rule);
  assert.ok(!/body:has\([^)]*\)\s*$/.test(c.slice(Math.max(0, i - 60), i)), 'rule must not be scoped to Waypoint pages');
});

test('chat rows are not hidden outside Waypoint pages', () => {
  const c = css();
  assert.ok(!/(^|\})\[class\*="_root"\]:has\(> \[class\*="_sectionHeader"\]\):has\(\[class\*="_listArea"\]\)\{display:none;\}/.test(c),
    'the whole browser must only hide on Waypoint pages');
});

done('v4_no_search_filter');
