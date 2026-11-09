// autonomous_review2.test.mjs - Waypoint v3 wave 6: the second review's items for the Autonomous tab
// (docs/ui_review_2.md, surface autonomous) plus routes that are down (GET /api/agents connections,
// model health). Run: node plugin/tests/autonomous_review2.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

function load(files, payload) {
  const CC = { h, React: makeReact() };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, isNaN, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  if (payload && CC.toggles) CC.toggles.apply(payload);
  return CC;
}
const OFF_CODEX = { enabled: { claude_code: true, codex: false, 'agent:codex': false, gemini_app: true, freebuff: true } };
const ON_CODEX = { enabled: { claude_code: true, codex: true, 'agent:codex': true, gemini_app: true, freebuff: true } };
const visibleText = (t) => Array.isArray(t) ? t.map(visibleText).join('') : t == null ? '' : typeof t !== 'object' ? String(t)
  : t.props.hidden === true ? '' : (t.props.children || []).map(visibleText).join('');
const SETTINGS = { preset: 'balanced', models: [], efforts: { claude: 'medium', codex: 'medium' }, max_use: {}, sequence: [] };

// The live rows (GET /api/models and GET /api/agents, 4 Nov 23:40).
const REGISTRY = [
  { id: 'subagent:claude/opus-5.5', label: 'Claude Opus 5.5 · Claude Code CLI', route: 'claude_code', kind: 'subagent', enabled: true, health: null },
  { id: 'agent:claude_code', label: 'Claude Code', route: 'claude_code', kind: 'agent', enabled: true, health: null },
  { id: 'subagent:gemini/gemini-4-argon', label: 'Gemini 4 Argon', route: 'gemini_app', kind: 'subagent', enabled: true, health: null },
  { id: 'agent:gemini_app', label: 'Gemini App', route: 'gemini_app', kind: 'agent', enabled: true, health: null },
  { id: 'chat:freebuff/deepseek/deepseek-v4-flash', label: 'DeepSeek V4.1 Flash', route: 'freebuff', kind: 'chat', enabled: true,
    health: { ok: false, reason: 'HTTP 502: Session expired or model changed — retry immediately.', stale: false } },
  { id: 'agent:freebuff', label: 'Freebuff', route: 'freebuff', kind: 'agent', enabled: true, health: null },
  { id: 'agent:codex', label: 'Codex', provider: 'openai-codex', kind: 'agent', enabled: true }
];
const CONNECTIONS = [
  { id: 'claude_code', state: 'ready', line: 'Ready', enabled: true },
  { id: 'codex', state: 'ready', line: 'Ready', enabled: true },
  { id: 'gemini_app', state: 'bridge_down', line: 'Bridge not answering (HTTP 502)', ok: false, enabled: true },
  { id: 'freebuff', state: 'ready', line: 'Ready', enabled: true }
];
const SOL = 'subagent:gemini/gemini-4-argon';
const FLASH = 'chat:freebuff/deepseek/deepseek-v4-flash';
function ticks(tree) {
  return findAll(tree, (n) => n.type === 'label' && /\bcc-au-row\b/.test(n.props.className || '')).map((n) => {
    const spans = findAll(n, (x) => x.type === 'span');
    return { node: n, label: textOf(spans[0]), hint: spans[1] ? textOf(spans[1]) : null,
      input: findAll(n, (x) => x.type === 'input')[0] };
  });
}

// ---- extra: a route that is down is greyed with its reason and never runnable ----------------
test('a model whose route is down (connections state) or whose health failed is greyed, says why, and is not runnable', () => {
  const CC = load(['toggles.js', 'autonomous_controls.js'], ON_CODEX);
  const A = CC.autonomous;
  const got = A.modelsFrom({ models: REGISTRY }, null, CONNECTIONS).models;
  const by = Object.fromEntries(got.map((m) => [m.id, m]));
  assert.equal(by[SOL].runnable, false);
  assert.equal(by[SOL].off, false, 'down is not the same as switched off');
  assert.equal(by[SOL].down, 'Bridge not answering (HTTP 502)');
  assert.equal(by['agent:gemini_app'].runnable, false);
  assert.equal(by[FLASH].runnable, false);
  assert.match(by[FLASH].down, /HTTP 502/);
  assert.ok(by[FLASH].down.length <= 40, 'one short line');
  assert.equal(by['agent:freebuff'].runnable, true, 'the route itself is ready');
  assert.equal(by['subagent:claude/opus-5.5'].runnable, true);
  // never ticked, never a pool, never kept in saved settings
  const s = { models: [], sequence: [[{ project: 'p1', model: SOL }]] };
  assert.deepEqual(A.toggleModel(s, SOL, got).models, []);
  assert.deepEqual(Array.from(A.selectedPools({ models: [SOL], sequence: s.sequence }, got)), []);
  const S = load(['toggles.js', 'autonomous_controls.js', 'page_sprints.js'], ON_CODEX).sprintsHelpers;
  const pruned = S.prune({ models: [SOL, 'subagent:claude/opus-5.5'], max_use: {}, sequence: s.sequence }, got);
  assert.deepEqual(Array.from(pruned.models), ['subagent:claude/opus-5.5']);
  assert.equal(pruned.sequence[0][0].model, null);
  // rendered: greyed, disabled, reason as the hint, full reason in the tooltip
  const tree = render(h(CC.AutonomousControls.RunControls, { settings: Object.assign({}, SETTINGS, { models: [SOL] }), models: got, source: 'registry', onChange() {} }));
  const sol = ticks(tree).find((t) => t.label === 'Gemini 4 Argon');
  assert.ok(sol, 'Gemini 4 Argon listed');
  assert.equal(sol.input.props.disabled, true);
  assert.equal(sol.input.props.checked, false, 'a saved tick on a down model is not shown as ticked');
  assert.match(sol.node.props.className, /cc-greyed/);
  assert.equal(sol.hint, 'Bridge not answering (HTTP 502)');
  const flash = ticks(tree).find((t) => t.label === 'DeepSeek V4.1 Flash');
  assert.match(flash.node.props.title, /Session expired/);
  // the Sequence select offers it only as a disabled option
  const seq = render(h(CC.AutonomousControls.Sequence, { sequence: s.sequence, projects: [{ id: 'p1', title: 'Harness' }], models: got, ticked: 0,
    onChange() {}, focusLater() {} }));
  const opt = findAll(seq, (n) => n.type === 'option' && n.props.value === SOL)[0];
  assert.ok(opt && opt.props.disabled === true);
  const sel = findAll(seq, (n) => n.type === 'select' && /Model for/.test(n.props['aria-label']))[0];
  assert.equal(sel.props.value, '', 'never silently keeps a down model');
  // without connections (engine older) nothing is invented
  const plain = A.modelsFrom({ models: REGISTRY.slice(0, 4) }, null).models;
  assert.ok(plain.every((m) => !m.down));
});

// ---- line 21: no "Ticked models" while nothing is ticked -------------------------------------
test('a sequence row shows an empty "Model" and is flagged while nothing is ticked; "Ticked models" only once something is', () => {
  const CC = load(['toggles.js', 'autonomous_controls.js'], ON_CODEX);
  const models = CC.autonomous.modelsFrom({ models: REGISTRY }, null, CONNECTIONS).models;
  const seqOf = (ticked) => render(h(CC.AutonomousControls.Sequence, { sequence: [[{ project: 'p1', model: null }]],
    projects: [{ id: 'p1', title: 'Harness' }], models, ticked, onChange() {}, focusLater() {} }));
  const none = seqOf(0);
  const first = (t) => findAll(t, (n) => n.type === 'select' && /Model for/.test(n.props['aria-label']))[0].props.children[0];
  assert.equal(textOf(first(none)), 'Model');
  assert.doesNotMatch(textOf(none), /Ticked models/);
  const item = findAll(none, (n) => n.props && n.props['data-project'] === 'p1')[0];
  assert.match(item.props.className, /\bcc-need\b/);
  const some = seqOf(1);
  assert.equal(textOf(first(some)), 'Ticked models');
  assert.doesNotMatch(findAll(some, (n) => n.props && n.props['data-project'] === 'p1')[0].props.className, /\bcc-need\b/);
});

// ---- line 22: no "Claude Code / Claude Code" rows ----------------------------------------------
test('route-level rows never repeat the route as model and hint: "Any model" beside the route\'s models', () => {
  const CC = load(['toggles.js', 'autonomous_controls.js'], ON_CODEX);
  const models = CC.autonomous.modelsFrom({ models: REGISTRY }, null, []).models;
  const tree = render(h(CC.AutonomousControls.RunControls, { settings: SETTINGS, models, source: 'registry', onChange() {} }));
  const rows = ticks(tree);
  assert.ok(rows.length >= 6);
  for (const r of rows) assert.notEqual(r.label, r.hint, 'repeated: ' + r.label);
  assert.ok(rows.some((r) => r.label === 'Any model' && r.hint === 'Claude Code'));
  assert.ok(rows.some((r) => r.label === 'Codex' && !r.hint), 'a route with one row keeps its name');
});

// ---- line 23: Codex off leaves the meters and the Timeline row out ----------------------------
test('Codex off: no Codex meters, no Codex Timeline row, the effort row folds into "1 off"', () => {
  const CC = load(['toggles.js', 'autonomous_controls.js', 'page_sprints.js'], OFF_CODEX);
  const rows = [{ pool: 'claude_5h', remaining_percent: 83, status: 'FRESH' }, { pool: 'codex_5h', remaining_percent: 100, status: 'STALE' },
    { pool: 'codex_week', remaining_percent: 13, status: 'STALE' }];
  assert.doesNotMatch(textOf(render(h(CC.AutonomousControls.UsageStrip, { rows }))), /Codex/);
  assert.deepEqual(Array.from(CC.sprintsHelpers.visibleRows([{ pool: 'codex' }]), (r) => r.id), ['claude_code']);
  const models = CC.autonomous.modelsFrom({ models: REGISTRY }, null, CONNECTIONS).models;
  const tree = render(h(CC.AutonomousControls.RunControls, { settings: SETTINGS, models, source: 'registry', onChange() {} }));
  const effort = findAll(tree, (n) => n.type === 'section' && n.props['aria-label'] === 'Effort')[0];
  assert.doesNotMatch(visibleText(effort), /Codex/);
  const fold = findAll(effort, (n) => n.type === 'button' && textOf(n) === '1 off')[0];
  assert.ok(fold && fold.props['aria-expanded'] === false && typeof fold.props.onClick === 'function');
  assert.match(textOf(effort), /Codex/, 'still there, greyed, behind the fold');
  const on = load(['toggles.js', 'autonomous_controls.js', 'page_sprints.js'], ON_CODEX);
  assert.match(textOf(render(h(on.AutonomousControls.UsageStrip, { rows }))), /Codex/);
  assert.deepEqual(Array.from(on.sprintsHelpers.visibleRows([]), (r) => r.id), ['claude_code', 'codex']);
});

// ---- line 24: Recently finished, one line per event ---------------------------------------------
test('Recent runs is a table, one row per event: project, route, state, planned, ran; plan time in the tooltip', () => {
  const S = load(['autonomous_controls.js', 'page_sprints.js']).sprintsHelpers;
  const s = { id: 's1', project_id: 'live2', project_title: 'Live2 throwaway', pool: 'claude_code', pool_label: 'Claude Code', state: 'cancelled',
    start_at: new Date(2026, 10, 5, 2, 0).toISOString(), end_at: new Date(2026, 10, 5, 3, 0).toISOString(),
    summary: 'The Claude Code sprint for Live2 throwaway planned for 02:00 was cancelled.' };
  const v = S.finishedLine(s);
  assert.equal(v.text, 'Live2 throwaway · Claude Code · cancelled');
  assert.match(v.title, /Planned 02:00/);
  const opened = [];
  const tree = render(h(S.List, { title: 'Recent runs', items: [s], onOpen(x) { opened.push(x.id); }, empty: '' }));
  assert.equal(findAll(tree, (n) => n.type === 'table').length, 1);
  assert.deepEqual(findAll(tree, (n) => n.type === 'th').map(textOf), ['Project', 'Route', 'State', 'Planned', 'Ran']);
  const tr = findAll(tree, (n) => n.type === 'tr' && n.props['data-sprint'] === 's1')[0];
  assert.deepEqual(findAll(tr, (n) => n.type === 'td').map(textOf), ['Live2 throwaway', 'Claude Code', 'Cancelled', '02:00–03:00', '–']);
  assert.match(tr.props.title, /Planned 02:00/);
  const open = findAll(tr, (n) => n.type === 'button')[0];
  assert.equal(open.props.title, 'Live2 throwaway · Claude Code · cancelled');
  open.props.onClick({ currentTarget: null });
  assert.deepEqual(opened, ['s1']);
  assert.doesNotMatch(textOf(tree), /was cancelled/);
});

// ---- line 25: no unlabelled dashed square on the track ------------------------------------------
test('cancelled sprints leave no empty placeholder on the timeline track', () => {
  const S = load(['autonomous_controls.js', 'page_sprints.js']).sprintsHelpers;
  const now = Date.now();
  const ax = S.axis(now, 24);
  const gone = { id: 'g1', state: 'cancelled', pool: 'claude_code', pool_label: 'Claude Code', editable: false,
    start_at: new Date(now + 3600e3).toISOString(), end_at: new Date(now + 7200e3).toISOString(), summary: 'cancelled' };
  const noop = () => {};
  const t = render(h(S.Track, { ax, now, hours: 24, width: 600, pool: {}, sprints: [gone],
    onDragStart: noop, onDragMove: noop, onDragEnd: noop, onDragCancel: noop, wasDrag: () => false, onOpen: noop }));
  assert.equal(findAll(t, (n) => n.props && n.props['data-sprint'] === 'g1').length, 0);
});

// ---- line 26: Copy prompt, Undo/Redo only with history, no Timing hints -------------------------
test('"Copy prompt" in sentence case, Undo and Redo hidden until there is history, Timing has no right-hand hints', () => {
  const src = fs.readFileSync(path.join(SRC, 'page_sprints.js'), 'utf8');
  assert.match(src, /'Copy prompt'/);
  assert.doesNotMatch(src, /'Copy Prompt'/);
  const CC = load(['toggles.js', 'autonomous_controls.js'], ON_CODEX);
  const models = CC.autonomous.modelsFrom({ models: REGISTRY }, null, CONNECTIONS).models;
  const seq = (canUndo, canRedo) => render(h(CC.AutonomousControls.Sequence, { sequence: [[{ project: 'p1', model: null }]],
    projects: [{ id: 'p1', title: 'Harness' }], models, ticked: 1, canUndo, canRedo, onChange() {}, focusLater() {} }));
  const names = (t) => findAll(t, (n) => n.type === 'button').map(textOf);
  assert.ok(!names(seq(false, false)).includes('Undo') && !names(seq(false, false)).includes('Redo'));
  assert.ok(names(seq(true, false)).includes('Undo'));
  const tree = render(h(CC.AutonomousControls.RunControls, { settings: SETTINGS, models, source: 'registry', onChange() {} }));
  const timing = findAll(tree, (n) => n.type === 'section' && n.props['aria-label'] === 'Timing')[0];
  assert.equal(findAll(timing, (n) => n.props && /\bcc-au-m\b/.test(n.props.className || '')).length, 0);
  assert.doesNotMatch(textOf(timing), /sprints gate the pools|10 min to cancel|reset \+ 1 min/);
});

done('autonomous_review2');
