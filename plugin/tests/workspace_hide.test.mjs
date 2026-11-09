// workspace_hide.test.mjs - E2: dsh's workspace chooser and Workspaces list are hidden (the Settings
// 'Workspaces' switch brings them back) and new sessions start in the Drive workspace.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

function makeDom(store = {}) {
  const nodes = new Map();
  const head = {
    children: [],
    appendChild(el) { this.children.push(el); el.parentNode = this; if (el.id) nodes.set(el.id, el); return el; },
    removeChild(el) { this.children = this.children.filter((c) => c !== el); nodes.delete(el.id); el.parentNode = null; }
  };
  const document = { head, createElement: (t) => ({ tagName: t.toUpperCase(), textContent: '', id: '' }), getElementById: (id) => nodes.get(id) || null };
  const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  return { document, localStorage, store };
}
// Effects run straight away so the picker's one-shot switch is observable.
const React = () => Object.assign(makeReact(), { useEffect: (fn) => { fn(); }, Component: class { constructor(p) { this.props = p; } } });
const FILES = ['tokens.js', 'api.js', 'settings.js', 'workspace_hide.js', 'app.js'];
function load(dom) {
  const CC = { h, React: React() };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise,
    document: dom && dom.document, localStorage: dom && dom.localStorage, setTimeout, clearTimeout });
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
// Neutral fixtures: the home folder is configured (localStorage WAYPOINT_HOME_WORKSPACE), never hard-coded.
const HOME = 'D:\\Notes';
const DRIVE = { workspaceId: 'w-drive', path: 'd:/notes/', title: 'Notes' };
const OTHER = { workspaceId: 'w-cc', path: 'D:\\work\\other-repo', title: 'Other repo' };
const homeDom = () => makeDom({ WAYPOINT_HOME_WORKSPACE: HOME });
function dshCtx(items) {
  const rec = { registers: [], disposed: 0 };
  const workspaces = { list: { getSnapshot: () => ({ items, state: 'idle' }), subscribe: () => () => {} } };
  rec.ctx = {
    layout: { selectPanel() {} },
    get: (name) => (name === 'workspaces' ? workspaces : undefined),
    slots: {
      inject(key, cb) { const d = cb(); return () => { if (typeof d === 'function') d(); }; },
      register(spec, comp) { const r = { spec, comp, live: true }; rec.registers.push(r); return () => { r.live = false; rec.disposed++; }; }
    }
  };
  rec.hero = () => rec.registers.filter((r) => r.spec.name === 'conversation.hero.workspace' && r.live);
  return rec;
}

test('by default the hero workspace chooser is replaced through its public single slot', () => {
  const dom = makeDom();
  const CC = load(dom);
  const rec = dshCtx([OTHER, DRIVE]);
  CC.apply(rec.ctx);
  const hero = rec.hero();
  assert.equal(hero.length, 1);
  assert.ok(hero[0].spec.priority < 0, 'lower priority number wins the single seat');
  const el = dom.document.getElementById(CC.workspaceHide.styleId);
  assert.ok(el, 'scoped rule injected');
  assert.match(el.textContent, /data-row-key\^="workspace:"/);
  assert.match(el.textContent, /aria-label="Choose workspace"/);
  assert.match(el.textContent, /aria-label="Add workspace"/);
  assert.ok(!/!important/.test(el.textContent));
});

test('a new blank session is moved into the Drive workspace once', () => {
  const CC = load(homeDom());
  const rec = dshCtx([OTHER, DRIVE]);
  CC.apply(rec.ctx);
  const Picker = rec.hero()[0].comp;
  const picks = [];
  const out = render(CC.h(Picker, { open: false, selectedId: 'w-cc', onPick: (id) => picks.push(id), onClose() {} }));
  assert.equal(out, null, 'renders nothing');
  assert.deepEqual(picks, ['w-drive']);
  render(CC.h(Picker, { open: false, selectedId: undefined, onPick: (id) => picks.push(id), onClose() {} }));
  assert.deepEqual(picks, ['w-drive', 'w-drive'], 'no workspace yet -> Drive');
  render(CC.h(Picker, { open: false, selectedId: 'w-drive', onPick: (id) => picks.push(id), onClose() {} }));
  assert.equal(picks.length, 2, 'already in Drive -> nothing');
});

test('an environment Waypoint chose on purpose is left alone', () => {
  const CC = load(homeDom());
  const rec = dshCtx([OTHER, DRIVE]);
  CC.apply(rec.ctx);
  CC.workspaceHide.expect('w-cc');
  const picks = [];
  render(CC.h(rec.hero()[0].comp, { open: false, selectedId: 'w-cc', onPick: (id) => picks.push(id), onClose() {} }));
  assert.deepEqual(picks, []);
});

test('if the chooser is opened anyway it closes at once', () => {
  const CC = load(homeDom());
  const rec = dshCtx([DRIVE]);
  CC.apply(rec.ctx);
  let closed = 0;
  render(CC.h(rec.hero()[0].comp, { open: true, selectedId: 'w-drive', onPick() {}, onClose: () => { closed++; } }));
  assert.equal(closed, 1);
});

test('no Drive workspace or no workspace service: nothing picked, nothing thrown', () => {
  const CC = load(homeDom());
  const rec = dshCtx([OTHER]);
  CC.apply(rec.ctx);
  const picks = [];
  assert.doesNotThrow(() => render(CC.h(rec.hero()[0].comp, { open: false, selectedId: 'w-cc', onPick: (id) => picks.push(id), onClose() {} })));
  assert.deepEqual(picks, []);
  const CC2 = load(homeDom());
  const bare = dshCtx([]);
  delete bare.ctx.get;
  CC2.apply(bare.ctx);
  assert.doesNotThrow(() => render(CC2.h(bare.hero()[0].comp, { open: false, selectedId: 'x', onPick() {}, onClose() {} })));
});

test("the Settings 'Workspaces' switch restores dsh's chooser and list, and can hide them again", () => {
  const dom = makeDom();
  const CC = load(dom);
  const rec = dshCtx([DRIVE]);
  CC.apply(rec.ctx);
  CC.settings.set('workspaces', true);
  assert.equal(rec.hero().length, 0, 'replacement removed');
  assert.equal(dom.document.getElementById(CC.workspaceHide.styleId), null, 'rule removed');
  CC.settings.set('workspaces', false);
  assert.equal(rec.hero().length, 1);
  assert.ok(dom.document.getElementById(CC.workspaceHide.styleId));
});

test('a saved choice to show workspaces holds from page load', () => {
  const dom = makeDom();
  const CC0 = load(dom);
  CC0.settings.set('workspaces', true);
  const CC = load(dom);
  const rec = dshCtx([DRIVE]);
  CC.apply(rec.ctx);
  assert.equal(rec.hero().length, 0);
  assert.equal(dom.document.getElementById(CC.workspaceHide.styleId), null);
});

test('throwing slots: apply warns once per problem and carries on', () => {
  const CC = load(homeDom());
  const warns = [];
  const o = console.warn; console.warn = (...a) => warns.push(a.join(' '));
  try {
    assert.doesNotThrow(() => CC.workspaceHide.apply({ slots: { inject() { throw new Error('no seat'); }, register() {} } }));
  } finally { console.warn = o; }
  assert.ok(warns.length >= 1 && warns.every((w) => w.startsWith('[waypoint] ')));
});

test('no home folder configured: new sessions are left where dsh puts them', () => {
  const CC = load(makeDom());
  const rec = dshCtx([OTHER, DRIVE]);
  CC.apply(rec.ctx);
  const picks = [];
  render(CC.h(rec.hero()[0].comp, { open: false, selectedId: 'w-cc', onPick: (id) => picks.push(id), onClose() {} }));
  assert.deepEqual(picks, []);
  assert.equal(CC.workspaceHide.homePath(), '');
});

test('the home folder can come from Core (/health home_workspace) when nothing local is set', () => {
  const CC = load(makeDom());
  CC.core = { state: 'ok', home: HOME };
  assert.equal(CC.workspaceHide.homePath(), HOME);
});

test('the source hard-codes no personal path and names no owner', () => {
  const src = fs.readFileSync(path.join(SRC, 'workspace_hide.js'), 'utf8');
  assert.deepEqual(personalHits(src), []);
});

done('workspace_hide');
