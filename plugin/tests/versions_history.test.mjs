// versions_history.test.mjs - V4: one picker row per family with a vN chip, the History panel
// (earlier versions + Skipped ideas from /api/history), archived boards read-only, skipped/carried glyphs.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const PROJECTS = [
  { id: 'waypoint-v5', title: 'Waypoint', family: 'waypoint', family_title: 'Waypoint', version: 5, versions: 5 },
  { id: 'solo', title: 'Solo project', family: null, family_title: null, version: null, versions: 0 }
];
const HISTORY = {
  family: { id: 'waypoint', title: 'Waypoint' }, current: 'waypoint-v5',
  versions: [
    { project: 'harness', title: 'Harness', version: 1, archived: true, status: 'active', counts: { done: 12, open: 0, skipped: 1, carried: 2 } },
    { project: 'waypoint-v4', title: 'Waypoint v4', version: 4, archived: true, status: 'active', counts: { done: 30, open: 3, skipped: 2, carried: 0 } },
    { project: 'waypoint-v5', title: 'Waypoint v5', version: 5, archived: false, status: 'active', counts: { done: 1, open: 9, skipped: 0, carried: 0 } }
  ],
  skipped: [{ project: 'waypoint-v3', version: 3, id: 'U7', title: 'Voice control', goal: 'Drive the board by voice.', reason: 'superseded by the Claude mod', at: '2026-11-05T10:00:00Z' }]
};
const ARCH_BOARD = { project: { id: 'harness', title: 'Harness', archived: true, family: 'waypoint', version: 1 }, revision: 3, counts: { done: 1, total: 2 },
  nodes: [{ id: 'A', title: 'Done thing', status: 'done', deps: [] }, { id: 'B', title: 'Dropped idea', status: 'skipped', deps: [] }], edges: [] };
const LIVE_BOARD = { project: { id: 'waypoint-v5', title: 'Waypoint', family: 'waypoint', version: 5 }, revision: 9, counts: { done: 1, total: 2 }, nodes: [], edges: [] };

const asked = [];
const engine = (path) => {
  if (!path) return { data: null };
  asked.push(path);
  if (path.indexOf('/api/projects') === 0) return { data: { projects: PROJECTS } };
  if (path.indexOf('/api/history') === 0) return { data: HISTORY };
  if (path.indexOf('/api/board?project=harness') === 0) return { data: ARCH_BOARD };
  if (path.indexOf('/api/board') === 0) return { data: LIVE_BOARD };
  if (path.indexOf('/api/node?') === 0) return { data: { node: { id: 'A', title: 'Done thing', status: 'done', goal: 'g', check: {} } } };
  return { data: null };
};
const FILES = ['tokens.js', 'ui.js', 'check_counts.js', 'layout_flow.js', 'layout_star.js', 'waves.js', 'view_flow.js', 'view_star.js',
  'view_waves.js', 'inputs.js', 'page_create.js'];
// Kit More menus open on click; this stand-in draws them open so their items can be asserted
// (the kit Menu itself is covered by ui_kit.test.mjs and execute_plan_kit.test.mjs).
const openMenus = (CC) => { CC.ui.Menu = (p) => CC.h('div', { className: 'cc-mn ' + (p.className || '') }, (p.items || []).filter((i) => i && !i.sep)
  .map((i) => CC.h('button', { key: i.label, type: 'button', className: 'cc-mn-i', disabled: !!i.disabled, onClick: i.onClick }, i.label))); return CC; };
const mk = () => openMenus(loadCC(FILES, { useEngine: engine, unpackBoard: (b) => b, api: { get() {}, post() { return Promise.resolve({}); } } }));
const btn = (label) => (n) => n.type === 'button' && textOf(n) === label;

test('family row: current version title with a vN chip; no chip without a family', () => {
  const CC = mk();
  const tree = render(CC.h(CC.CreatePage, {}));
  const chips = findAll(tree, hasClass('cc-vchip'));
  assert.equal(chips.length, 1);
  assert.equal(textOf(chips[0]), 'v5');
  const opts = findAll(tree, (n) => n.type === 'option').map(textOf);
  assert.deepEqual(opts, ['Waypoint', 'Solo project']);
  assert.equal(findAll(tree, btn('History')).length, 1, 'History shows when versions > 1');
});

test('one entry per family even if the list carries several versions', () => {
  const CC = mk();
  const rows = CC.createHelpers.familyRows([
    { id: 'a-v1', family: 'a', version: 1, archived: true }, { id: 'a-v2', family: 'a', version: 2 }, { id: 'b', family: null }]);
  assert.deepEqual(rows.map((r) => r.id), ['a-v2', 'b']);
});

test('no History control or chip for projects without a family or with one version', () => {
  const CC = openMenus(loadCC(FILES, { useEngine: (p) => p && p.indexOf('/api/projects') === 0
    ? { data: { projects: [PROJECTS[1], { id: 'one', title: 'One', family: 'one', version: null, versions: 1 }] } } : { data: null },
  unpackBoard: (b) => b, api: { get() {}, post() { return Promise.resolve({}); } } }));
  const tree = render(CC.h(CC.CreatePage, {}));
  assert.equal(findAll(tree, btn('History')).length, 0);
  assert.equal(findAll(tree, hasClass('cc-vchip')).length, 0);
});

test('History panel: earlier versions oldest first with counts, then Skipped ideas', () => {
  const CC = mk();
  asked.length = 0;
  const tree = render(CC.h(CC.createHelpers.VersionHistory, { family: 'waypoint', project: 'waypoint-v5', onClose() {}, onOpen() {} }));
  assert.ok(asked.indexOf('/api/history?family=waypoint') >= 0, asked.join());
  const rows = findAll(tree, hasClass('cc-vh-row'));
  assert.deepEqual(rows.map((r) => r.props['data-project']), ['harness', 'waypoint-v4'], 'current version not listed, oldest first');
  assert.match(textOf(rows[0]), /v1.*Harness.*12 done · 0 open · 1 skipped/);
  assert.match(textOf(rows[1]), /v4.*Waypoint v4.*30 done · 3 open · 2 skipped/);
  const sk = findAll(tree, hasClass('cc-vh-sk'));
  assert.equal(sk.length, 1);
  assert.equal(sk[0].type, 'details');
  const t = textOf(sk[0]);
  assert.match(t, /Voice control/);
  assert.match(t, /v3/);
  assert.match(t, /superseded by the Claude mod/);
  assert.match(t, /Drive the board by voice/, 'goal sits inside the expandable details');
});

test('choosing a version calls onOpen with that project', () => {
  const CC = mk();
  let opened = null;
  const tree = render(CC.h(CC.createHelpers.VersionHistory, { family: 'waypoint', onClose() {}, onOpen: (id, v) => { opened = [id, v]; } }));
  findAll(tree, hasClass('cc-vh-row'))[1].props.onClick();
  assert.deepEqual(opened, ['waypoint-v4', 4]);
});

test('archived board: banner, Run disabled, no archive menu, History still reachable', () => {
  const CC = mk();
  CC.pendingProject = 'harness';
  const tree = render(CC.h(CC.CreatePage, {}));
  const banner = findAll(tree, hasClass('cc-bn'));
  assert.equal(banner.length, 1);
  assert.match(textOf(banner[0]), /Archived v1, read-only/);
  assert.equal(findAll(tree, btn('Run'))[0].props.disabled, true);
  assert.equal(findAll(tree, hasClass('cc-proj-more')).length, 0);
  assert.equal(findAll(tree, btn('History')).length, 1);
  assert.equal(textOf(findAll(tree, hasClass('cc-vchip'))[0]), 'v1');
});

test('live board is not read-only', () => {
  const CC = mk();
  const tree = render(CC.h(CC.CreatePage, {}));
  assert.equal(findAll(tree, hasClass('cc-bn')).length, 0);
  assert.notEqual(findAll(tree, btn('Run'))[0].props.disabled, true);
});

test('Inspector readOnly hides send routes, Mark done / Reopen and Release', () => {
  const CC = mk();
  const I = CC.createHelpers.Inspector;
  const ro = render(CC.h(I, { project: 'harness', id: 'A', revision: 3, toast() {}, onClose() {}, readOnly: true }));
  assert.equal(findAll(ro, hasClass('cc-send')).length, 0);
  assert.equal(findAll(ro, (n) => n.type === 'button' && /Mark done|Reopen/.test(textOf(n))).length, 0);
  assert.match(textOf(ro), /read-only/);
  const rw = render(CC.h(I, { project: 'waypoint-v5', id: 'A', revision: 3, toast() {}, onClose() {} }));
  assert.equal(findAll(rw, hasClass('cc-send')).length, 1);
  assert.equal(findAll(rw, (n) => n.type === 'button' && /Reopen/.test(textOf(n))).length, 1);
});

test('skipped and carried have glyphs and a muted colour', () => {
  const CC = mk();
  assert.equal(CC.statusGlyph('skipped'), '⊘');
  assert.equal(CC.statusGlyph('carried'), '↷');
  assert.equal(CC.statusOf({ status: 'skipped' }), 'skipped');
  assert.equal(CC.statusLabel('carried'), 'Carried');
  for (const [s, g] of [['skipped', '⊘'], ['carried', '↷']]) {
    const txt = findAll(render(CC.h(CC.StatusDot, { status: s })), (n) => n.type === 'text');
    assert.equal(txt.length, 1);
    assert.equal(textOf(txt[0]), g);
    assert.equal(txt[0].props.className, 'cc-glyph-text');
  }
  assert.match(CC.css, /\.cc-glyph-text\{fill:var\(--cc-neutral\)/);
  assert.equal(CC.createHelpers.displayStatus({ status: 'carried' }), 'carried');
});

test('no raw colours in the page stylesheet', () => {
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(mk().createHelpers.STYLE));
});

done('versions_history');
