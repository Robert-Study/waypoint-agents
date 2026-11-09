// shell_polish.test.mjs [U8] - the shell's shared base: radii 6/8/8 (release design pass; v4 F1 was 8/10/12), shape and spacing variables,
// overlay scrim, quiet scrollbars and one keyboard focus ring in both themes; the Settings page's
// own rules actually reach it; the Cloud | Local line carries a tone; the command bar has a
// placeholder and key hints only when a request is ready.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

function load(files) {
  const CC = { h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, RegExp, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
const ALL = ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'topbar.js', 'command_bar.js', 'brand.js', 'app.js'];

test('radii: 6 controls, 8 panels, 8 fields; the older pane name keeps working', () => {
  const T = load(['tokens.js']).tokens;
  assert.equal(T.radius.control, 6);
  assert.equal(T.radius.panel, 8);
  assert.equal(T.radius.pane, 8);
  assert.equal(T.radius.field, 8);
});

test('shape, spacing and shell colours are CSS variables in both themes', () => {
  const CC = load(['tokens.js']);
  const lines = CC.css.split('\n');
  for (const v of ['--cc-r-control:6px', '--cc-r-panel:8px', '--cc-r-field:8px', '--cc-space-1:4px', '--cc-space-5:24px']) {
    assert.ok(lines[0].includes(v), v);
  }
  const dark = lines.find((l) => l.startsWith('@media (prefers-color-scheme: dark)'));
  for (const k of ['scrim', 'thumb', 'focus', 'wash']) {
    assert.ok(lines[0].includes('--cc-' + k + ':' + CC.tokens.color.light[k]), 'light ' + k);
    assert.ok(dark.includes('--cc-' + k + ':' + CC.tokens.color.dark[k]), 'dark ' + k);
  }
});

test('one zero-specificity focus ring and thin scrollbars; no glow', () => {
  const css = load(['tokens.js']).css;
  assert.match(css, /:where\(\.cc-root\) :where\([^)]*button[^)]*\):focus-visible\{outline:2px solid var\(--cc-focus\)/);
  assert.match(css, /scrollbar-width:thin/);
  assert.match(css, /scrollbar-color:var\(--cc-thumb\) transparent/);
  assert.match(css, /svg\[data-cc-brand="mark"\]\{color:/);
  assert.doesNotMatch(css, /blur\s*\(|!\s*important|gradient\s*\(/);
});

test('Settings page rules match its own root element (cc-root and cc-set on one node)', () => {
  const CC = load(ALL);
  assert.match(CC.settings.pageCss, /\.cc-root\.cc-set\{/);
  assert.doesNotMatch(CC.settings.pageCss, /\.cc-root \.cc-set\{/);
  const tree = render(CC.h(CC.SettingsPage, {}));
  const rows = findAll(tree, (n) => typeof n.props.className === 'string' && n.props.className.includes('cc-set-row'));
  assert.ok(rows.length >= 9);  // dsh v2: 5 Waypoint tabs + 4 dsh rows
  assert.ok(rows.every((r) => typeof r.props.onClick === 'function'), 'the whole row toggles');
});

test('top bar line carries a tone: calm, accent for a merge, error for a clash', () => {
  const CC = load(ALL);
  const T = CC.topbar.tone;
  assert.equal(T(null), null);
  assert.equal(T({ mode: 'Cloud', repos: [] }), 'calm');
  assert.equal(T({ mode: 'Cloud', repos: [{ name: 'a', state: 'diverged' }] }), 'accent');
  assert.equal(T({ mode: 'Cloud', repos: [{ name: 'a', state: 'diverged', conflict: true }] }), 'error');
  assert.equal(T({ mode: 'Cloud', repos: [{ name: 'a', state: 'dirty', behind: 1 }], last: { skipped: [{ name: 'a' }] } }), 'neutral');
});

test('top bar remembers the last status, so a tab switch shows the mode at once', async () => {
  const CC = load(ALL);
  CC.api.post = () => Promise.resolve({ mode: 'Local', repos: [] });
  await CC.topbar.load(() => {});
  const React = CC.React;
  let seen;
  const real = React.useState;
  React.useState = (init) => { if (seen === undefined) seen = init; return real(init); };
  try { render(CC.h(CC.TopBar, {})); } finally { React.useState = real; }
  assert.equal(seen && seen.mode, 'Local');
});

test('command bar: a placeholder, and kbd hints only when a request is ready', () => {
  const CC = load(ALL);
  const P = CC.commandBar.Panel;
  const ready = render(CC.h(P, { text: 'open brain', result: { ok: true, preview: 'Open Brain' }, onText() {} }));
  const input = findAll(ready, (n) => n.type === 'input')[0];
  assert.ok(input.props.placeholder && input.props.placeholder.length <= 40, 'short placeholder');
  assert.equal(findAll(ready, (n) => n.type === 'kbd').length, 2);
  const empty = render(CC.h(P, { text: '', result: null, onText() {} }));
  assert.equal(findAll(empty, (n) => n.type === 'kbd').length, 0);
  assert.ok(!/Recommended/.test(textOf(ready)));
});

done('shell_polish');
