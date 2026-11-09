// flat_picker.test.mjs - P3: dsh's composer model seat replaced through the public
// `conversation.input.model` slot by one flat table (name, Elo, context, usage), no provider names
// or headings, every option visible on open, "Pick for me" first, disabled models greyed.
import assert from 'node:assert/strict';
import { loadCC, makeReact, render, findAll, textOf, test, done } from './harness.mjs';

class Component { constructor(props) { this.props = props; this.state = {}; } }
const fresh = (extra) => loadCC(['tokens.js', 'model_badges.js', 'flat_picker.js', 'app.js'],
  Object.assign({ React: Object.assign(makeReact(), { Component }) }, extra || {}));

const GROUPS = [
  { id: 'freebuff', name: '1. Freebuff ($0 Unmetered Pool)', models: [
    { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4.1 Flash' }] },
  { id: 'google', name: '4. Google AI Studio Pool ($0 API Keys)', models: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash',
      reasoning: { defaultEffort: 'medium', efforts: [{ id: 'low', name: 'Low' }, { id: 'medium', name: 'Medium' }, { id: 'high', name: 'High' }] } }] },
  { id: 'groq', name: '5. Groq LPU ($0 Sub-Second)', models: [
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B' }] },
  { id: 'github-copilot', name: '3. GitHub Copilot Student ($0 Included)', models: [
    { id: 'kimi-k3', name: 'Kimi K3' }, { id: 'gpt-6-luna', name: 'GPT-6 Luna' }] }
];
const ROWS = [
  { id: 'chat:freebuff/deepseek/deepseek-v4-flash', dsh: { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' },
    elo: 1350, context_window: 131072, usage: null, enabled: true, health: { ok: true, reason: null, stale: false } },
  { id: 'chat:google/gemini-3.8-flash', dsh: { provider: 'google', model: 'gemini-3.8-flash' },
    elo: 1420, context_window: 1000000, usage: null, enabled: true, health: null },
  { id: 'chat:groq/qwen/qwen3.8-27b', dsh: { provider: 'groq', model: 'qwen/qwen3.8-27b' },
    elo: null, context_window: null, usage: { remaining_percent: 40, status: 'FRESH', pool: 'groq' }, enabled: false },
  { id: 'chat:github-copilot/kimi-k3', dsh: { provider: 'github-copilot', model: 'kimi-k3' },
    elo: 1500, context_window: 262144, enabled: true,
    health: { ok: false, reason: 'HTTP 400: model_not_supported', stale: false } }
];
const PROVIDER_WORDS = ['Freebuff', 'Google', 'Groq', 'Copilot', 'AI Studio', 'Pool', '$0', 'freebuff', 'github-copilot'];

test('rows are one flat list: strongest first, unknown Elo last, failed models left out', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const rows = CC.flatPicker.buildRows(GROUPS, { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' });
  const names = [...rows].map((r) => r.name);
  assert.deepEqual(names, ['Gemini 3.8 Flash', 'DeepSeek V4.1 Flash', 'GPT-6 Luna', 'Qwen 3.8 27B']);
  assert.ok(!names.includes('Kimi K3'));
  const cur = rows.find((r) => r.selected);
  assert.equal(cur.name, 'DeepSeek V4.1 Flash');
  const off = rows.find((r) => r.name === 'Qwen 3.8 27B');
  assert.equal(off.disabled, true);
});

test('a failed model that is the current selection stays visible, greyed, with its reason', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const rows = CC.flatPicker.buildRows(GROUPS, { provider: 'github-copilot', model: 'kimi-k3' });
  const kimi = rows.find((r) => r.name === 'Kimi K3');
  assert.ok(kimi && kimi.selected && kimi.disabled);
  assert.match(kimi.note, /model_not_supported/);
});

test('cells: ~Elo, context, usage; unknown is n/a; free routes say Free', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const rows = CC.flatPicker.buildRows(GROUPS, null);
  const g = rows.find((r) => r.name === 'Gemini 3.8 Flash');
  assert.deepEqual([g.elo, g.ctx, g.usage], ['~1420', '1M', 'Free']);
  const q = rows.find((r) => r.name === 'Qwen 3.8 27B');
  assert.deepEqual([q.elo, q.ctx, q.usage], ['n/a', 'n/a', '40%']);
  const l = rows.find((r) => r.name === 'GPT-6 Luna'); // engine knows nothing about it
  assert.deepEqual([l.elo, l.ctx, l.usage], ['n/a', 'n/a', 'n/a']);
});

test('the open table shows every option with a header row and no provider names or headings', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const rows = CC.flatPicker.buildRows(GROUPS, { provider: 'google', model: 'gemini-3.8-flash' });
  const tree = render(CC.h(CC.FlatModelTable, { rows: rows, onPick: () => {}, onPickForMe: () => {}, efforts: [], highlight: 0 }));
  const text = textOf(tree);
  for (const w of ['Model', 'Elo', 'Context', 'Usage', 'Pick for me']) assert.ok(text.includes(w), w);
  for (const w of PROVIDER_WORDS) assert.ok(!text.includes(w), 'provider text leaked: ' + w);
  const opts = findAll(tree, (n) => n.props && n.props.role === 'option');
  assert.equal(opts.length, rows.length + 1); // + Pick for me
  const off = opts.find((n) => textOf(n).startsWith('Qwen'));
  assert.equal(off.props['aria-disabled'], true);
  assert.equal(typeof off.props.onClick, 'undefined');
  const sel = opts.find((n) => n.props['aria-selected'] === true);
  assert.ok(textOf(sel).startsWith('Gemini'));
});

test('clicking a row selects the dsh provider/model pair with its default effort', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const picks = [];
  const rows = CC.flatPicker.buildRows(GROUPS, null);
  const tree = render(CC.h(CC.FlatModelTable, { rows: rows, onPick: (r) => picks.push(r), onPickForMe: () => {}, efforts: [] }));
  const opt = findAll(tree, (n) => n.props && n.props.role === 'option' && textOf(n).startsWith('Gemini'))[0];
  opt.props.onClick();
  assert.equal(picks.length, 1);
  assert.deepEqual({ ...CC.flatPicker.selectionFor(picks[0]) },
    { provider: 'google', model: 'gemini-3.8-flash', reasoningEffort: 'medium' });
  const ds = rows.find((r) => r.name === 'DeepSeek V4.1 Flash');
  assert.deepEqual({ ...CC.flatPicker.selectionFor(ds) }, { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' });
});

test('effort chips appear for the current model and keep its id', () => {
  const CC = fresh();
  const efforts = CC.flatPicker.effortsFor(GROUPS, { provider: 'google', model: 'gemini-3.8-flash', reasoningEffort: 'high' });
  assert.deepEqual([...efforts].map((e) => [e.id, e.selected]), [['low', false], ['medium', false], ['high', true]]);
  assert.deepEqual([...CC.flatPicker.effortsFor(GROUPS, { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' })], []);
});

test('Pick for me maps the engine choice onto the catalog', () => {
  const CC = fresh();
  const sel = CC.flatPicker.fromPick(GROUPS, { model: 'chat:google/gemini-3.8-flash', effort: 'high',
    dsh: { provider: 'google', model: 'gemini-3.8-flash' } });
  assert.deepEqual({ ...sel }, { provider: 'google', model: 'gemini-3.8-flash', reasoningEffort: 'high' });
  const sel2 = CC.flatPicker.fromPick(GROUPS, { dsh: { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' }, effort: 'medium' });
  assert.deepEqual({ ...sel2 }, { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' });
  assert.equal(CC.flatPicker.fromPick(GROUPS, { dsh: { provider: 'x', model: 'y' } }), null);
  assert.equal(CC.flatPicker.fromPick(GROUPS, null), null);
});

test('the seat renders a compact trigger with the current name only', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const store = { subscribe: () => () => {}, getSnapshot: () => ({ current: { provider: 'google', model: 'gemini-3.8-flash' },
    groups: GROUPS, status: 'ready', pending: null, error: null }) };
  const tree = render(CC.h(CC.FlatModelSelect, { available: true, directory: store, load: () => {}, select: () => Promise.resolve() }));
  const btn = findAll(tree, (n) => n.type === 'button')[0];
  assert.ok(btn);
  assert.ok(textOf(btn).includes('Gemini 3.8 Flash'));
  for (const w of PROVIDER_WORDS) assert.ok(!textOf(tree).includes(w), w);
});

test('apply waits for modelDirectories and registers the seat below dsh\'s own entry', () => {
  const CC = fresh();
  const rec = { deps: null, injects: [], registers: [] };
  const scope = {
    modelDirectories: { directoryFor: (sid) => ({ store: { sid }, load: () => Promise.resolve(), select: () => Promise.resolve({ ok: true }) }) },
    sessions: { subagentAddress: () => undefined },
    slots: {
      inject(key, cb) { rec.injects.push(key); cb(); return () => {}; },
      register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
    }
  };
  const ctx = { slots: scope.slots, inject(deps, cb) { rec.deps = deps; cb(scope); return () => {}; } };
  CC.applyFlatPicker(ctx);
  assert.ok(rec.deps.includes('modelDirectories') && rec.deps.includes('slots'));
  const reg = rec.registers.find((r) => r.spec.name === 'conversation.input.model');
  assert.ok(reg, 'seat registered');
  assert.ok(reg.spec.priority < 0);
  assert.equal(reg.comp, CC.FlatModelSelect);
  const face = reg.spec.inject('s1');
  assert.equal(face.available, true);
  assert.equal(face.directory.sid, 's1');
  assert.equal(typeof face.select, 'function');
});

test('model badges apply also applies the flat picker', () => {
  const CC = fresh();
  let called = 0;
  CC.applyFlatPicker = () => { called++; };
  const ctx = { slots: { inject(k, cb) { cb(); return () => {}; }, register() { return () => {}; } } };
  CC.applyModelBadges(ctx);
  assert.equal(called, 1);
});

test('no ctx.inject, no service or a throwing slot: dsh keeps its picker, nothing throws', () => {
  for (const ctx of [undefined, null, {}, { inject: null },
    { inject() { throw new Error('no such service'); } },
    { inject(d, cb) { cb({ slots: { inject() { throw new Error('unknown slot'); } } }); } }]) {
    const CC = fresh();
    const orig = console.warn; const warns = []; console.warn = (...a) => warns.push(a.join(' '));
    try { assert.doesNotThrow(() => CC.applyFlatPicker(ctx)); } finally { console.warn = orig; }
    assert.ok(warns.length <= 1, warns.join('\n'));
  }
});

test('off switch: localStorage DSH_CC_FLAT_PICKER=0 leaves dsh\'s picker alone', () => {
  const CC = fresh({ flatPickerOff: () => true });
  let injected = 0;
  CC.applyFlatPicker({ inject() { injected++; } });
  assert.equal(injected, 0);
});

done('flat_picker');
