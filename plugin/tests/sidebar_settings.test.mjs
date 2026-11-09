// sidebar_settings.test.mjs - S1: Settings page with a stored per-tab on/off map, tab order,
// dsh's More button hidden by a scoped rule, and the new pages registered with graceful fallback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

function makeDom(store = {}, opts = {}) {
  const nodes = new Map();
  const head = {
    children: [],
    appendChild(el) { this.children.push(el); el.parentNode = this; if (el.id) nodes.set(el.id, el); return el; },
    removeChild(el) { this.children = this.children.filter((c) => c !== el); nodes.delete(el.id); el.parentNode = null; }
  };
  const document = {
    head,
    createElement(tag) { return { tagName: tag.toUpperCase(), textContent: '', id: '' }; },
    getElementById(id) { return nodes.get(id) || null; }
  };
  const localStorage = opts.broken
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  return { document, localStorage, store };
}

const FILES = ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'app.js'];
function load(dom, files = FILES, extra = {}) {
  const CC = Object.assign({ h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) }, extra);
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise,
    document: dom && dom.document, localStorage: dom && dom.localStorage, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
function recorder() {
  const rec = { registers: [] };
  rec.ctx = { layout: { selectPanel() {} }, slots: {
    inject(key, cb) { cb(); return () => {}; },
    register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
  } };
  return rec;
}
const quiet = (fn) => { const o = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = o; } };
const ORDER = ['Approvals', 'Projects', 'Running', 'Brain', 'Learn', 'Settings'];  // Preferences shows only with its add-on

test('sidebar tabs run Approvals, Projects, Running, Brain, Learn, Settings (Agents is inside Settings)', () => {
  const CC = load(makeDom());
  const rec = recorder();
  CC.apply(rec.ctx);
  const side = rec.registers.filter((r) => r.spec.name === 'sidebar.panellist')
    .sort((a, b) => a.spec.order - b.spec.order).map((r) => r.spec.label());
  assert.deepEqual(side, ORDER);
  const orders = rec.registers.filter((r) => r.spec.name === 'sidebar.panellist').map((r) => r.spec.order);
  assert.equal(new Set(orders).size, orders.length, 'no ties');
});

test('new pages are registered: cc-todo, cc-claude, cc-codex, cc-settings; Models folds into Agents', () => {
  const CC = load(makeDom());
  const rec = recorder();
  CC.apply(rec.ctx);
  const main = rec.registers.filter((r) => r.spec.name === 'main').map((r) => r.spec.key);
  for (const id of ['cc-todo', 'cc-claude', 'cc-codex', 'cc-settings', 'cc-plan', 'cc-agents']) assert.ok(main.includes(id), id);
  const side = rec.registers.filter((r) => r.spec.name === 'sidebar.panellist').map((r) => r.spec.id);
  assert.ok(!side.includes('cc-models'), 'Models has no sidebar row');
  assert.ok(main.includes('cc-models'), 'cc-models stays resolvable');
  const todo = CC.PAGES.find((p) => p.id === 'cc-todo');
  assert.equal(todo.label, 'Todo');
  assert.equal(todo.component(), undefined); // page_todo.js absent here
});

test('a page whose component file is absent renders the calm fallback', () => {
  const CC = load(makeDom());
  const rec = recorder();
  CC.apply(rec.ctx);
  for (const id of ['cc-todo', 'cc-claude', 'cc-codex']) {
    const el = rec.registers.find((r) => r.spec.key === id).comp({});
    const tree = render(el.props.children[0]);
    assert.ok(textOf(tree).length > 0, id);
  }
});

test('the Settings page component is CC.SettingsPage', () => {
  const CC = load(makeDom());
  assert.equal(CC.PAGES.find((p) => p.id === 'cc-settings').component(), CC.SettingsPage);
  assert.equal(typeof CC.SettingsPage, 'function');
});

test('defaults: every tab on, dsh More and Workspaces off; changes persist in localStorage', () => {
  const dom = makeDom();
  const CC = load(dom);
  const S = CC.settings;
  for (const id of ['cc-todo', 'cc-plan', 'plugins', 'schedules']) assert.equal(S.isOn(id), true, id);
  assert.equal(S.isOn('more'), false);
  assert.equal(S.isOn('workspaces'), false);
  S.set('cc-plan', false);
  const saved = JSON.parse(dom.store[S.storageKey]);
  assert.equal(saved['cc-plan'], false);
  const again = load(dom);
  assert.equal(again.settings.isOn('cc-plan'), false);
});

test('Settings cannot switch itself off', () => {
  const CC = load(makeDom());
  CC.settings.set('cc-settings', false);
  assert.equal(CC.settings.isOn('cc-settings'), true);
});

test('blocked storage: no throw, defaults used', () => {
  const CC = load(makeDom({}, { broken: true }));
  assert.doesNotThrow(() => CC.settings.set('cc-brain', false));
  assert.doesNotThrow(() => CC.settings.isOn('cc-brain'));
  assert.equal(load(makeDom({}, { broken: true })).settings.isOn('cc-brain'), true);
});

test('no DOM or storage at all (dsh startup in the vm): apply stays silent', () => {
  const CC = load(null);
  const warns = [];
  const o = console.warn; console.warn = (...a) => warns.push(a.join(' '));
  try { CC.apply(recorder().ctx); } finally { console.warn = o; }
  assert.deepEqual(warns, []);
});

test('scoped rule hides the More button by default and each disabled tab by its sidebar label', () => {
  const dom = makeDom();
  const CC = load(dom);
  CC.apply(recorder().ctx);
  let el = dom.document.getElementById(CC.settings.styleId);
  assert.ok(el, 'rule injected at startup');
  assert.match(el.textContent, /_moreAnchor/);
  assert.match(el.textContent, /aria-haspopup="menu"/);
  assert.ok(!/aria-label="Projects"/.test(el.textContent));
  CC.settings.set('cc-projects', false);
  CC.settings.set('plugins', false);
  el = dom.document.getElementById(CC.settings.styleId);
  assert.match(el.textContent, /\[class\*="_panelRow"\]\[aria-label="Projects"\]/);
  assert.match(el.textContent, /aria-label="Plugins"/);
  assert.match(el.textContent, /aria-label="插件"/);
  assert.ok(!/!important/.test(el.textContent));
  CC.settings.set('more', true);
  CC.settings.set('cc-projects', true);
  CC.settings.set('plugins', true);
  CC.settings.set('cc-claude', true); // v4 B3: Claude and Codex tabs start off
  CC.settings.set('cc-codex', true);
  el = dom.document.getElementById(CC.settings.styleId);
  assert.ok(!el || el.textContent === '', 'nothing hidden -> no rule');
});

test("Automation tasks toggle also drives the Autonomous tab's saved choice", () => {
  const dom = makeDom({ DSH_CC_HIDE_AUTOMATION_TASKS: '1' });
  const CC = load(dom);
  assert.equal(CC.settings.isOn('schedules'), false, 'legacy hidden choice is honoured');
  CC.settings.set('schedules', true);
  assert.equal(dom.store.DSH_CC_HIDE_AUTOMATION_TASKS, '0');
  CC.settings.set('schedules', false);
  assert.equal(dom.store.DSH_CC_HIDE_AUTOMATION_TASKS, '1');
  const el = dom.document.getElementById(CC.settings.styleId);
  assert.match(el.textContent, /aria-label="Automation tasks"/);
});

test('Settings page: one switch per entry, nothing preselected beyond the saved state, no junk text', () => {
  const dom = makeDom();
  const CC = load(dom);
  CC.settings.set('cc-brain', false);
  const tree = render(CC.h(CC.SettingsPage, {}));
  const switches = findAll(tree, (n) => n.props.role === 'switch');
  const ids = switches.map((s) => s.props['data-id']);
  for (const id of ['cc-approvals', 'cc-projects', 'cc-running', 'cc-brain', 'cc-learn',
    'plugins', 'schedules', 'more', 'workspaces']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('cc-settings'));
  assert.ok(!ids.includes('cc-models'));
  const brain = switches.find((s) => s.props['data-id'] === 'cc-brain');
  assert.equal(brain.props['aria-checked'], 'false');
  assert.equal(switches.find((s) => s.props['data-id'] === 'cc-approvals').props['aria-checked'], 'true');
  const text = textOf(tree);
  assert.ok(!/Recommended|Meridian/.test(text), text);
  assert.ok(text.includes('Settings'));
  // tab rows follow the sidebar order
  const tabOrder = ids.filter((i) => i.startsWith('cc-'));
  assert.deepEqual(tabOrder, ['cc-approvals', 'cc-projects', 'cc-running', 'cc-brain', 'cc-learn']);
});

test('Settings switch click toggles and saves', () => {
  const dom = makeDom();
  const CC = load(dom);
  const tree = render(CC.h(CC.SettingsPage, {}));
  const sw = findAll(tree, (n) => n.props.role === 'switch' && n.props['data-id'] === 'cc-projects')[0];
  quiet(() => sw.props.onClick());
  assert.equal(CC.settings.isOn('cc-projects'), false);
});

test('Settings page: kit header, one 960 px column, flat sections Pages, Chat app, Waypoint, About; no primary button', () => {
  const dom = makeDom();
  const CC = load(dom, ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'app.js']);
  CC.version = '1.0.0';
  const tree = render(CC.h(CC.SettingsPage, {}));
  assert.equal(findAll(tree, (n) => n.props.className === 'cc-ph').length, 1, 'one header bar');
  assert.equal(textOf(findAll(tree, (n) => n.props.className === 'cc-ph-title')[0]), 'Settings');
  assert.equal(findAll(tree, (n) => n.props.className === 'cc-pb-col').length, 1, 'left-aligned content column');
  const heads = findAll(tree, (n) => n.props.className === 'cc-sec-t').map(textOf);
  assert.deepEqual(heads, ['Pages', 'Chat app', 'Waypoint', 'About']);
  assert.equal(findAll(tree, (n) => /cc-b-primary/.test(n.props.className || '')).length, 0);
  assert.equal(findAll(tree, (n) => /cc-set-list/.test(n.props.className || '')).length, 0, 'no boxed cards');
  const about = textOf(findAll(tree, (n) => n.props['data-section'] === 'settings-about')[0]);
  assert.match(about, /Waypoint for dshVersion 1\.0\.0/);
  assert.match(about, /Waypoint server/);
  assert.doesNotMatch(about, /Waypoint Core|Core API/);
  assert.doesNotMatch(textOf(tree), /Control Centre|github\.com/);
  assert.deepEqual(personalHits(textOf(tree)), []);
});

test('Settings rows: the switch leads the row, the hint is the meta on the right, one flip per click', () => {
  const dom = makeDom();
  const CC = load(dom);
  const tree = render(CC.h(CC.SettingsPage, {}));
  const rows = findAll(tree, (n) => /cc-set-row/.test(n.props.className || ''));
  assert.ok(rows.length >= 9);  // 5 Waypoint tabs + 4 dsh rows (Preferences shows only with its add-on)
  for (const r of rows) {
    const lead = r.props.children[0];
    assert.equal(lead.props.className, 'cc-r-lead', 'first child is the lead slot');
    assert.equal(findAll(lead, (n) => n.props.role === 'switch').length, 1, 'the switch sits in the lead');
    assert.equal(findAll(r, (n) => n.props.className === 'cc-r-trail').length, 0, 'nothing trails');
  }
  const ws = rows.find((r) => r.props['data-cc-row'] === 'workspaces');
  assert.equal(textOf(findAll(ws, (n) => n.props.className === 'cc-r-m')[0]), 'Folder chooser and list');
  // Clicking the switch stops at its wrapper, so the row's own click does not flip it back.
  const wrap = findAll(ws, (n) => n.props.className === 'cc-set-sw')[0];
  let stopped = 0;
  wrap.props.onClick({ stopPropagation: () => { stopped++; } });
  assert.equal(stopped, 1);
});

test('Settings About: without the Waypoint client the server reads as an error line, never a Core line', () => {
  const CC = load(makeDom(), ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'app.js']);
  const about = findAll(render(CC.h(CC.SettingsPage, {})), (n) => n.props['data-section'] === 'settings-about')[0];
  assert.match(textOf(about), /Waypoint serverNot running/);
  assert.doesNotMatch(textOf(about), /Core/);
  assert.equal(findAll(about, (n) => n.props.className === 'cc-set-err').length, 1);
});

done('sidebar_settings');
