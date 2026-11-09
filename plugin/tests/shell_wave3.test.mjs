// shell_wave3.test.mjs - Waypoint v3 wave 3, shell surface review items (docs/ui_review.md 70-76).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

function load(files, extra = {}) {
  const CC = Object.assign({ h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) }, extra);
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
const FILES = ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'topbar.js', 'workspace_hide.js', 'command_bar.js', 'app.js'];
const repo = (name, state, extra = {}) => Object.assign({ name, path: 'C:/x/' + name, state, ahead: 0, behind: 0, dirty: false }, extra);
const status = (over = {}) => Object.assign({ mode: 'Local', repos: [repo('proj', 'up_to_date')], needs_merge: false, last: null }, over);
const buttons = (tree) => findAll(tree, (n) => n.type === 'button');

// line 72: sync status (now the header's sync chip and its popover)
const repoList = (tree) => findAll(tree, (n) => n.props.role === 'list' && n.props['aria-label'] === 'Repos waiting');
test('sync: a repo with local edits reads "Sync paused · <repo> has local edits"; the chip shows a dot', () => {
  const CC = load(FILES);
  const s = status({ repos: [repo('repo-one', 'dirty', { behind: 2, dirty: true })], last: { skipped: [{ name: 'repo-one' }] } });
  assert.equal(CC.topbar.summary(s), 'Sync paused · repo-one has local edits');
  assert.equal(CC.topbar.tone(s), 'neutral');
  assert.equal(CC.topbar.waits(s), true);
  const tree = render(h(CC.topbar.View, { status: s, onMode() {}, onPull() {} }));
  assert.ok(!/waited/.test(textOf(tree)));
  assert.equal(repoList(tree).length, 1, 'the popover lists the waiting repos');
  const chip = render(h(CC.topbar.Chip, { status: s }));
  assert.equal(findAll(chip, (n) => n.props.className === 'cc-hs-dot').length, 1);
});

test('sync: nothing waiting -> no repo list and no dot', () => {
  const CC = load(FILES);
  const tree = render(h(CC.topbar.View, { status: status(), onMode() {}, onPull() {} }));
  assert.equal(repoList(tree).length, 0);
  assert.equal(CC.topbar.waits(status()), false);
});

test('sync: the popover lists each waiting repo with its path', () => {
  const CC = load(FILES);
  const s = status({ repos: [repo('a', 'dirty', { behind: 1, dirty: true }), repo('b', 'up_to_date')], last: { skipped: [{ name: 'a' }] } });
  const tree = render(h(CC.topbar.View, { status: s, onMode() {}, onPull() {} }));
  const t = textOf(tree);
  assert.ok(t.includes('C:/x/a'), t);
  assert.ok(!t.includes('C:/x/b'), t);
});

// line 74: Settings group label
test('settings: the dsh group is labelled "Chat app"', () => {
  const CC = load(FILES);
  const tree = render(h(CC.SettingsPage, {}));
  const t = textOf(tree);
  assert.ok(t.includes('Chat app'), t);
  // The product name "Waypoint for dsh" appears in About; the group labels themselves never say dsh.
  const heads = findAll(tree, (n) => n.props.className === 'cc-sec-t').map(textOf);
  assert.ok(heads.includes('Chat app'), heads.join(','));
  assert.ok(!heads.some((x) => /\bdsh\b/.test(x)), heads.join(','));
  const pages = findAll(tree, (n) => n.props['data-section'] === 'settings-dsh')[0];
  assert.ok(!/\bdsh\b/.test(textOf(pages)), textOf(pages));
});

// line 70: Waypoint tabs before dsh's rows in the sidebar
test('settings: the sidebar rule orders Waypoint rows first and dsh rows after Settings', () => {
  const CC = load(FILES);
  const css = CC.settings.orderCss();
  assert.match(css, /_panelList[^{]*\{[^}]*display:flex[^}]*flex-direction:column/);
  assert.match(css, /aria-label="Plugins"\][^{]*\{[^}]*order:/);
  assert.match(css, /aria-label="Automation tasks"\][^{]*\{[^}]*order:/);
});

// line 71: no floating search/filter header over an empty session list on Waypoint routes
test('workspace_hide: on Waypoint routes the session-list header is hidden', () => {
  const CC = load(FILES);
  const css = CC.workspaceHide.css();
  assert.ok(CC.workspaceHide.waypointCss, 'waypoint route rule exists');
  assert.match(CC.workspaceHide.waypointCss, /display:none/);
});

// line 76: access chip on blank sessions
test('workspace_hide: "Workspace Write" chip reads "Can edit"', () => {
  const CC = load(FILES);
  assert.equal(CC.workspaceHide.chipLabel('Workspace Write'), 'Can edit');
  assert.equal(CC.workspaceHide.chipLabel('Read only'), null);
});

// line 73: command bar centred on the content pane, with top actions under an empty input
test('command bar: empty query lists up to 5 actions', () => {
  const CC = load(FILES);
  const items = CC.commandBar.emptyList ? CC.commandBar.emptyList() : null;
  assert.ok(Array.isArray(items) && items.length > 0 && items.length <= 5, String(items && items.length));
});

test('command bar: "todo" alone asks for the text instead of "Not understood"; empty panel lists suggestions', () => {
  const CC = load(FILES);
  assert.equal(CC.commandBar.parse('todo ').reason, 'Type the todo');
  const tree = render(h(CC.commandBar.Panel, { text: '', result: null, onText() {}, onCancel() {}, left: 280 }));
  const opts = findAll(tree, (n) => n.props && n.props.role === 'option');
  assert.ok(opts.length >= 1 && opts.length <= 5);
  const back = findAll(tree, (n) => n.props && n.props['data-cc'] === 'command-bar')[0];
  assert.equal(back.props.style.paddingLeft, 296);
  const typed = render(h(CC.commandBar.Panel, { text: 'open plan', result: { ok: true, preview: 'Open Plan' }, onText() {}, onCancel() {} }));
  assert.equal(findAll(typed, (n) => n.props && n.props.role === 'option').length, 0);
});

// line 75: dark New Session button
test('tokens: in dark, dsh New Session is an outline with a transparent fill', () => {
  const CC = load(FILES);
  assert.match(CC.css, /prefers-color-scheme: dark\)\{html:not\(\[data-theme="light"\]\) button\[class\*="_newSession"\]\{background:transparent;border:1px solid/);
  assert.ok(!/!important/.test(CC.css));
});

done('shell_wave3');
