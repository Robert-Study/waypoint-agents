// app_guard.test.mjs - the plugin never throws into dsh's shared startup.
// Covers app.js guards (slots inject/register, missing ctx, off switch), the page error boundary,
// and the built bundle's factory guard (top-level error -> no-op apply).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadCC, makeReact, h, render, findAll, textOf, test, done, SRC } from './harness.mjs';

class Component { constructor(props) { this.props = props; this.state = {}; } }
const React = () => Object.assign(makeReact(), { Component });
const IDS = ['cc-approvals', 'cc-projects', 'cc-running', 'cc-brain', 'cc-learn']; // hidden ids (main slot only): see MAIN_ONLY, cc-agents
const MAIN_ONLY = ['cc-waypoint', 'cc-todo', 'cc-plan', 'cc-create', 'cc-sprints', 'cc-claude', 'cc-codex'];

function captureWarns(fn) {
  const warns = [];
  const orig = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  try { fn(); } finally { console.warn = orig; }
  return warns;
}
function recorder() {
  const rec = { injects: [], registers: [] };
  rec.ctx = { layout: { selectPanel() {} }, slots: {
    inject(key, cb) { rec.injects.push(key); const r = cb(); assert.equal(typeof r, 'function'); return () => {}; },
    register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
  } };
  return rec;
}
const fresh = () => loadCC(['tokens.js', 'app.js'], { React: React() });

test('normal ctx: main + sidebar.panellist registered for every page', () => {
  const CC = fresh();
  const rec = recorder();
  const warns = captureWarns(() => CC.apply(rec.ctx));
  assert.deepEqual(warns, []);
  for (const id of IDS) {
    assert.ok(rec.registers.some((r) => r.spec.name === 'main' && r.spec.key === id), 'main ' + id);
    assert.ok(rec.registers.some((r) => r.spec.name === 'sidebar.panellist' && r.spec.id === id), 'panel ' + id);
  }
  for (const id of MAIN_ONLY) {  // dsh v2: 1.x ids open the tab that now does their job, no sidebar row
    assert.ok(rec.registers.some((r) => r.spec.name === 'main' && r.spec.key === id), 'main ' + id);
    assert.ok(!rec.registers.some((r) => r.spec.name === 'sidebar.panellist' && r.spec.id === id), 'no panel ' + id);
  }
  assert.deepEqual([...CC.inject], ['slots', 'layout', 'uiConversation', 'sidebarRightTabs']);
});

test('throwing ctx.slots.inject: apply does not throw, one [waypoint] warning per contribution', () => {
  const CC = fresh();
  const ctx = { slots: { inject() { throw new Error('unknown slot'); }, register() { return () => {}; } } };
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.apply(ctx)));
  assert.ok(warns.length >= IDS.length * 2);
  assert.ok(warns.every((w) => w.startsWith('[waypoint] ')), warns.join('\n'));
});

test('throwing ctx.slots.register inside inject callback: no throw, callback returns a disposer', () => {
  const CC = fresh();
  const ctx = { slots: {
    inject(key, cb) { const r = cb(); assert.equal(typeof r, 'function'); return () => {}; },
    register() { throw new Error('slot renamed'); }
  } };
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.apply(ctx)));
  assert.ok(warns.length >= IDS.length * 2);
});

test('missing ctx or ctx.slots: skips cleanly with one warning', () => {
  for (const ctx of [undefined, null, {}, { slots: {} }, { slots: { inject: 1, register: 2 } }]) {
    const CC = fresh();
    const warns = captureWarns(() => assert.doesNotThrow(() => CC.apply(ctx)));
    assert.equal(warns.length, 1);
    assert.match(warns[0], /^\[waypoint\] /);
  }
});

test('WAYPOINT_DISABLED off switch (window flag or localStorage): nothing registered, one warning', () => {
  for (const extra of [{ WAYPOINT_DISABLED: true }, { localStorage: { getItem: (k) => (k === 'WAYPOINT_DISABLED' ? '1' : null) } }]) {
    const rec = recorder();
    const flagCtx = vm.createContext(Object.assign({ CC: { h, React: React() }, console }, extra));
    vm.runInContext(fs.readFileSync(path.join(SRC, 'app.js'), 'utf8'), flagCtx);
    const warns = captureWarns(() => flagCtx.CC.apply(rec.ctx));
    assert.equal(rec.registers.length, 0);
    assert.equal(warns.length, 1);
    assert.match(warns[0], /^\[waypoint\] disabled by WAYPOINT_DISABLED/);
  }
});

test('compatibility: the older DSH_CC_DISABLED off switch still works', () => {
  // The flag is read from the vm global the src runs in.
  const rec = recorder();
  const flagCtx = vm.createContext({ CC: { h, React: React() }, console, DSH_CC_DISABLED: true });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'app.js'), 'utf8'), flagCtx);
  const warns = captureWarns(() => flagCtx.CC.apply(rec.ctx));
  assert.equal(rec.registers.length, 0);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /DSH_CC_DISABLED/);
});

test('page component renders inside an error boundary; failure shows a calm one-line data-cc-error note', () => {
  const CC = fresh();
  const rec = recorder();
  CC.apply(rec.ctx);
  const main = rec.registers.find((r) => r.spec.key === 'cc-create').comp;
  const el = main({});
  const B = CC.getBoundary();
  assert.equal(el.type, B, 'page root is the error boundary');
  const b = new B({ label: 'Execute', children: [] });
  assert.equal(b.state.failed, false);
  Object.assign(b.state, B.getDerivedStateFromError(new Error('boom')));
  const warns = captureWarns(() => b.componentDidCatch(new Error('boom')));
  assert.equal(warns.length, 1);
  const tree = render(b.render());
  const note = findAll(tree, (n) => n.props['data-cc-error'] !== undefined);
  assert.equal(note.length, 1);
  assert.equal(tree.props.className, 'cc-root');
  const text = textOf(note[0]);
  assert.match(text, /^Execute could not load just now/);
  assert.ok(!text.includes('\n') && text.length < 120);
});

test('page with no component yet renders the ready fallback through the boundary', () => {
  const CC = fresh();
  const rec = recorder();
  CC.apply(rec.ctx);
  const el = rec.registers.find((r) => r.spec.key === 'cc-learn').comp({});
  const body = el.props.children[0];
  const tree = render(body);
  assert.match(textOf(tree), /Learn/);
  assert.match(textOf(tree), /Waypoint · Loading/);
  assert.doesNotMatch(textOf(tree), /Control Centre/);
});

// Built bundle: the factory guard in tools/build.mjs.
const bundlePath = path.join(SRC, '..', 'lib', 'client.js');
function loadBundle(requireImpl) {
  let def = null;
  const sandbox = vm.createContext({ window: { __ModuleLoader__: { load(d) { def = d; } } }, console });
  vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), sandbox, { filename: bundlePath });
  assert.ok(def, 'bundle calls __ModuleLoader__.load');
  assert.equal(def.id, JSON.parse(fs.readFileSync(path.join(SRC, '..', 'package.json'), 'utf8')).name);
  return def.factory(requireImpl);
}

test('bundle: top-level error yields a no-op apply and one warning', () => {
  let exp;
  const warns = captureWarns(() => {
    exp = loadBundle(() => { throw new Error('react missing'); });
  });
  assert.equal(warns.length, 1);
  assert.match(warns[0], /^\[waypoint\] bundle failed to load/);
  assert.equal(typeof exp.apply, 'function');
  assert.doesNotThrow(() => exp.apply(recorder().ctx));
  assert.deepEqual([...exp.inject], []);
});

test('bundle: throwing ctx.slots.inject does not escape apply', () => {
  const exp = loadBundle((name) => { if (name === 'react') return React(); throw new Error('unexpected ' + name); });
  const ctx = { slots: { inject() { throw new Error('unknown slot'); }, register() {} } };
  const warns = captureWarns(() => assert.doesNotThrow(() => exp.apply(ctx)));
  assert.ok(warns.length >= 1 && warns.every((w) => w.startsWith('[waypoint] ')));
  const rec = recorder();
  exp.apply(rec.ctx);
  // Every page registers main + sidebar entry; brand and the Sprints menu row add a few more.
  assert.ok(rec.registers.length >= IDS.length * 2);
});

done('app_guard');
