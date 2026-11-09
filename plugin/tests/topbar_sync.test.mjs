// topbar_sync.test.mjs - S3: the quiet Cloud | Local bar on every Waypoint page, its one line about
// what updated by itself, and the 'Update local files' button only when a merge is needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

function load(files, extra = {}) {
  const CC = Object.assign({ h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) }, extra);
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
const FILES = ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'topbar.js', 'app.js'];
const repo = (name, state, extra = {}) => Object.assign({ name, path: 'C:/x/' + name, state, ahead: 0, behind: 0, dirty: false }, extra);
const status = (over = {}) => Object.assign({ mode: 'Local', repos: [repo('proj', 'up_to_date')], needs_merge: false, last: null }, over);
const buttons = (tree) => findAll(tree, (n) => n.type === 'button');
const byText = (tree, t) => buttons(tree).filter((b) => textOf(b) === t);

test('summary: nothing to do reads as one calm line', () => {
  const CC = load(FILES);
  assert.equal(CC.topbar.summary(status()), 'Local files are up to date');
  assert.equal(CC.topbar.summary(null), '');
});

test('summary: what updated by itself, by name, in one line', () => {
  const CC = load(FILES);
  const at = new Date(2026, 10, 4, 9, 5).toISOString();
  const s = status({ last: { at, kind: 'open', updated: [{ name: 'proj', commits: 2 }], skipped: [], needs_merge: [] } });
  const line = CC.topbar.summary(s);
  assert.match(line, /^Updated proj from GitHub at 09:05$/);
  const two = status({ last: { at, updated: [{ name: 'a' }, { name: 'b' }], skipped: [] } });
  assert.match(CC.topbar.summary(two), /^Updated a and b from GitHub/);
  const many = status({ last: { at, updated: [{ name: 'a' }, { name: 'b' }, { name: 'c' }], skipped: [] } });
  assert.match(CC.topbar.summary(many), /^Updated 3 repos from GitHub/);
  assert.ok(!CC.topbar.summary(many).includes('\n'));
});

test('summary: merge needed, conflict and skipped dirty repos', () => {
  const CC = load(FILES);
  const merge = status({ repos: [repo('proj', 'diverged', { ahead: 1, behind: 1 })], needs_merge: true });
  assert.equal(CC.topbar.needsMerge(merge), true);
  assert.match(CC.topbar.summary(merge), /proj changed in the cloud and here/);
  const clash = status({ repos: [repo('proj', 'diverged', { conflict: { files: ['a.txt'], question: 'q1' } })], needs_merge: true });
  assert.match(CC.topbar.summary(clash), /proj needs you/);
  const dirty = status({ repos: [repo('proj', 'dirty', { behind: 1, dirty: true })],
    last: { at: new Date().toISOString(), updated: [], skipped: [{ name: 'proj', reason: 'has local edits' }] } });
  assert.match(CC.topbar.summary(dirty), /proj has local edits/);
  assert.equal(CC.topbar.needsMerge(dirty), false);
});

test('view: two-way Cloud | Local control with the current mode checked', () => {
  const CC = load(FILES);
  const tree = render(CC.h(CC.topbar.View, { status: status({ mode: 'Cloud' }), onMode() {}, onPull() {} }));
  const group = findAll(tree, (n) => n.props.role === 'radiogroup');
  assert.equal(group.length, 1);
  const radios = findAll(tree, (n) => n.props.role === 'radio');
  assert.deepEqual(radios.map(textOf), ['Cloud', 'Local']);
  assert.deepEqual(radios.map((r) => r.props['aria-checked']), [true, false]);
  assert.equal(byText(tree, 'Update local files').length, 0, 'no button without a merge');
  assert.match(textOf(tree), /Local files are up to date/);
});

test('view: clicking the other mode asks for it; the checked one does nothing', () => {
  const CC = load(FILES);
  const asked = [];
  const tree = render(CC.h(CC.topbar.View, { status: status(), onMode: (m) => asked.push(m), onPull() {} }));
  const radios = findAll(tree, (n) => n.props.role === 'radio');
  radios[0].props.onClick();
  radios[1].props.onClick();
  assert.deepEqual(asked, ['Cloud']);
});

test("view: one clear 'Update local files' button only when a merge is needed", () => {
  const CC = load(FILES);
  let pulled = 0;
  const s = status({ repos: [repo('proj', 'diverged', { ahead: 1, behind: 2 })], needs_merge: true });
  const tree = render(CC.h(CC.topbar.View, { status: s, onMode() {}, onPull: () => { pulled++; } }));
  const btn = byText(tree, 'Update local files');
  assert.equal(btn.length, 1);
  btn[0].props.onClick();
  assert.equal(pulled, 1);
  const busy = render(CC.h(CC.topbar.View, { status: s, busy: true, onMode() {}, onPull() {} }));
  assert.equal(byText(busy, 'Update local files')[0].props.disabled, true);
});

test('view: engine down -> control shown but nothing checked, no line, no button', () => {
  const CC = load(FILES);
  const tree = render(CC.h(CC.topbar.View, { status: null, onMode() {}, onPull() {} }));
  const radios = findAll(tree, (n) => n.props.role === 'radio');
  assert.deepEqual(radios.map((r) => r.props['aria-checked']), [false, false]);
  assert.ok(radios.every((r) => r.props.disabled));
  assert.equal(byText(tree, 'Update local files').length, 0);
  assert.equal(textOf(tree), 'CloudLocal');
});

test('no separate bar: every page sits in one plain frame, and every page header carries the status', () => {
  const CC = load(FILES);
  const rec = { registers: [] };
  CC.apply({ layout: { selectPanel() {} }, slots: { inject(k, cb) { cb(); return () => {}; }, register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; } } });
  for (const page of CC.PAGES) {
    const el = rec.registers.find((r) => r.spec.name === 'main' && r.spec.key === page.id).comp({});
    const frame = el.props.children[0].type(); // PageBody
    assert.equal(frame.props['data-cc-frame'], page.id);
    assert.equal(frame.props.children.length, 1, page.id + ': the page alone, no bar row');
    assert.notEqual(frame.props.children[0].type, CC.HeaderStatus);
  }
  const head = CC.ui.PageHeader({ title: 'Plan' });
  assert.equal(head.props.children.filter(Boolean).slice(-1)[0].type, CC.HeaderStatus, 'status at the right end of the header');
  assert.equal(CC.TopBar, CC.HeaderStatus, 'the old name still resolves');
});

test('sync chip: the mode alone when calm; a dot only when something waits', () => {
  const CC = load(FILES);
  const calm = render(CC.h(CC.topbar.Chip, { status: status({ mode: 'Cloud' }) }));
  assert.equal(textOf(calm), 'Cloud');
  assert.equal(findAll(calm, (n) => n.props.className === 'cc-hs-dot').length, 0);
  const merge = render(CC.h(CC.topbar.Chip, { status: status({ repos: [repo('proj', 'diverged')], needs_merge: true }) }));
  const dot = findAll(merge, (n) => n.props.className === 'cc-hs-dot');
  assert.equal(dot.length, 1);
  assert.equal(dot[0].props['data-tone'], 'accent');
  const failed = render(CC.h(CC.topbar.Chip, { status: status(), note: 'Could not reach Waypoint Core' }));
  assert.equal(findAll(failed, (n) => n.props.className === 'cc-hs-dot')[0].props['data-tone'], 'error');
  let opened = 0;
  render(CC.h(CC.topbar.Chip, { status: status(), onToggle: () => { opened++; } })).props.onClick();
  assert.equal(opened, 1);
});

test('Core chip: quiet error words, and a popover that says how to start Core (no paths)', () => {
  const CC = load(FILES);
  assert.equal(textOf(render(CC.h(CC.topbar.CoreChip, { core: { state: 'down' } }))), 'Waypoint server offline');
  assert.equal(textOf(render(CC.h(CC.topbar.CoreChip, { core: { state: 'mismatch', api: 2 } }))), 'Core API 2, needs 1');
  const help = textOf(render(CC.h(CC.topbar.CorePanel, { core: { state: 'down' } })));
  assert.match(help, /waypoint start/);
  assert.doesNotMatch(help, /[A-Z]:\\|\/Users\//);
  assert.deepEqual(personalHits(help), []);
});

test('header status: Core down shows only the Core chip; Core ok with a status shows only the sync chip', () => {
  const CC = load(FILES);
  CC.useCore = () => ({ state: 'down' });
  let t = render(CC.h(CC.HeaderStatus, {}));
  assert.equal(findAll(t, (n) => n.props['data-cc'] === 'core-chip').length, 1);
  assert.equal(findAll(t, (n) => n.props['data-cc'] === 'sync-chip').length, 0);
  CC.useCore = () => ({ state: 'ok', api: 1 });
  t = render(CC.h(CC.HeaderStatus, {}));
  assert.equal(findAll(t, (n) => n.props['data-cc'] === 'core-chip').length, 0);
  const chip = findAll(t, (n) => n.props['data-cc'] === 'sync-chip');
  assert.equal(chip.length, 1, 'the chip is on every page, even before a status arrives');
  assert.equal(textOf(chip[0]), 'Local', 'unknown mode reads Local, never a placeholder');
});

test('sync chip reads the same on every page: a status without a mode shows the last mode seen', async () => {
  const CC = load(FILES);
  CC.api.post = () => Promise.resolve(status({ mode: 'Cloud' }));
  await CC.topbar.load(() => {});
  assert.equal(CC.topbar.modeOf({ repos: [] }), 'Cloud');
  assert.equal(CC.topbar.modeOf(null), 'Cloud');
  assert.equal(textOf(render(CC.h(CC.topbar.Chip, { status: { repos: [] } }))), 'Cloud');
  assert.ok(!/'Sync'\);/.test(fs.readFileSync(path.join(SRC, 'topbar.js'), 'utf8')), 'no "Sync" placeholder label');
});

test('container: first mount runs the on-open fast-forward once, later mounts only read status', async () => {
  const calls = [];
  const CC = load(FILES);
  CC.api.get = (p) => { calls.push('GET ' + p); return Promise.resolve(status()); };
  CC.api.post = (p, b) => { calls.push('POST ' + p); return Promise.resolve(status()); };
  CC.topbar.load(() => {});
  CC.topbar.load(() => {});
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(calls, ['POST /api/sync/open', 'GET /api/sync/status']);
});

test('container: engine down is tolerated (no throw, status stays empty)', async () => {
  const CC = load(FILES);
  CC.api.post = () => Promise.reject(Object.assign(new Error('down'), { status: 0 }));
  CC.api.get = () => Promise.reject(new Error('down'));
  const got = [];
  CC.topbar.load((s) => got.push(s));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(got, [null]);
});

done('topbar_sync');
