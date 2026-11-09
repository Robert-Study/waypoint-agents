// shell_wave6.test.mjs - Waypoint v3 wave 6, shell surface items of docs/ui_review_2.md (lines 53-57)
// and the screens.mjs mode-menu finder.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, test, done, SRC } from './harness.mjs';

function load(files, extra = {}) {
  const CC = Object.assign({ h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) }, extra);
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
const FILES = ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'topbar.js', 'workspace_hide.js', 'command_bar.js', 'app.js'];
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

// line 53
test('53: the whole dsh session browser hides on Waypoint routes, blank sessions leave the list', () => {
  const css = load(FILES).workspaceHide.waypointCss;
  // A Waypoint page is on screen when its frame (app.js, data-cc-frame) is; there is no top bar any more.
  assert.match(css, /body:has\(\[data-cc-frame\]\) \[class\*="_root"\]:has\(> \[class\*="_sectionHeader"\]\):has\(\[class\*="_listArea"\]\)\{display:none;\}/);
  assert.match(css, /\[data-row-key\^="session:"\]\[draggable="false"\]:not\(\[class\*="_archived"\]\)\{display:none;\}/);
  // only where draggable rows exist, so a view without dragging keeps its rows
  assert.match(css, /\[class\*="_listArea"\]:has\(\[data-row-key\^="session:"\]\[draggable="true"\]\)/);
});

// line 54
test('54: dsh menu item descriptions are held to one line with an ellipsis', () => {
  const src = read('tokens.js');
  assert.match(src, /\[role="menu"\] \[class\*="_itemDesc"\]\{[^}]*white-space:nowrap;[^}]*text-overflow:ellipsis;/);
  assert.ok(!/!important/.test(src));
});

// line 55
test('55: one left-aligned 960px content rule covers Settings, Todo, Plan, Interview and Agents', () => {
  const src = read('tokens.js');
  assert.match(src, /const CONTENT_MAX = 960;/);
  for (const c of ['.cc-set-body', '.cc-td-col', '.cc-pl-col', '.cc-iv-wrap', '.cc-ap-sec']) assert.ok(src.includes(c), c);
  assert.match(src, /max-width:var\(--cc-content-max\);margin-left:0;margin-right:auto;/);
  // Settings now uses the kit's page column (CC.ui.Page col: max-width var(--cc-content-max), left-aligned).
  assert.match(read('settings.js'), /U\.Page\(\{[^}]*col: true/);
  assert.match(read('ui.js'), /\.cc-pb-col\{max-width:var\(--cc-content-max\);\}/);
});

// line 56
test('56: the flat picker opens with nothing highlighted and re-anchors above its trigger', () => {
  const CC = load(['tokens.js', 'model_badges.js', 'flat_picker.js'].filter((f) => fs.existsSync(path.join(SRC, f))));
  const rows = [{ key: 'a', name: 'A', model: 'a', elo: '1', ctx: '1', usage: 'Free', selected: true }];
  const tree = render(h(CC.FlatModelTable, { rows, highlight: -1, efforts: [] }));
  const lit = findAll(tree, (n) => n.props && /cc-fp-hi/.test(n.props.className || ''));
  assert.equal(lit.length, 0);
  const src = read('flat_picker.js');
  assert.match(src, /hiS\[1\]\(-1\)/);
  assert.ok(!/hiS\[1\]\(Math\.max\(0, rows\.findIndex/.test(src), 'open still highlights the current row');
  assert.match(src, /var dy = m\.bottom - \(t\.top - 6\), dx = m\.right - t\.right;/);
});

// line 57
test('57: the sidebar footer label is hidden in every state (the avatar stays)', () => {
  const CC = load(FILES);
  assert.equal(CC.settings.footerCss, 'button[class*="_trigger"][aria-haspopup="menu"]:has(> [class*="_avatar"]) > [class*="_label"]{display:none;}');
  assert.ok(CC.settings.orderCss().includes(CC.settings.footerCss));
});

// extra: screens.mjs mode-menu
test('screens.mjs finds the mode seat by class or title before the text test, and starts a new session if absent', () => {
  const src = fs.readFileSync(path.join(SRC, '..', 'tools', 'screens.mjs'), 'utf8');
  const i = src.indexOf('const modeButton');
  const def = src.slice(i, src.indexOf('\n\n', i));
  assert.ok(def.indexOf('_seat') > 0 && def.indexOf('_seat') < def.indexOf('Choose the agent preset'));
  assert.ok(def.indexOf('Choose the agent preset') < def.indexOf('\\\\bmode\\\\b'));
  assert.match(src, /await openChat\(true\);\s*await waitFor\(modeButton, 8000\);/);
});

done();
