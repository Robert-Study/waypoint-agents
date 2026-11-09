// autonomous.test.mjs - S1/S2: Sprints is now Autonomous (page id cc-sprints kept), the Automation
// tasks hide choice applies from page load, and the Autonomous run controls' pure helpers
// (model ticks from /api/models with the current pools as fallback, usage strip with Codex and
// Claude only, priority rows with drag / Ctrl+Arrow / Undo / Redo) behave.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

// A tiny DOM + storage, enough for <style> injection.
function makeDom(store = {}) {
  const nodes = new Map();
  const head = {
    children: [],
    appendChild(el) { this.children.push(el); el.parentNode = this; if (el.id) nodes.set(el.id, el); return el; },
    removeChild(el) { this.children = this.children.filter((c) => c !== el); nodes.delete(el.id); el.parentNode = null; }
  };
  const document = {
    head,
    createElement(tag) { const el = { tagName: tag.toUpperCase(), textContent: '', id: '' }; return el; },
    getElementById(id) { return nodes.get(id) || null; }
  };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };
  return { document, localStorage, store, head };
}

function load(files, dom, extra = {}) {
  const CC = Object.assign({ h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) }, extra);
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, isNaN,
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
const eq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);  // values cross the vm realm
const PAGE_FILES = ['tokens.js', 'api.js', 'autonomous_controls.js', 'page_sprints.js', 'app.js'];

// ---------------------------------------------------------------- S1: name and page id

test('the Sprints tab is named Autonomous and keeps page id cc-sprints', () => {
  const CC = load(PAGE_FILES, makeDom());
  const page = CC.PAGES.find((p) => p.id === 'cc-sprints');
  assert.ok(page, 'cc-sprints page id kept');
  assert.equal(page.label, 'Autonomous');
  assert.ok(!CC.PAGES.some((p) => p.label === 'Sprints'));
  const rec = recorder();
  CC.apply(rec.ctx);
  // dsh v2 (8 Nov 2026): no sidebar row; the old id opens the Waypoint tab (its ops strip has the sprints).
  assert.ok(!rec.registers.some((r) => r.spec.name === 'sidebar.panellist' && r.spec.id === 'cc-sprints'));
  assert.ok(rec.registers.some((r) => r.spec.name === 'main' && r.spec.key === 'cc-sprints'));
  assert.equal(page.sidebar, false);
});

test('the page header says Autonomous, never Sprints', () => {
  const CC = load(PAGE_FILES, makeDom());
  CC.useEngine = (p) => ({ data: p.startsWith('/api/sprints/timeline') ? { sprints: [], pools: [], next_up: [], recently_finished: [] } : null, error: null });
  const tree = render(h(CC.SprintsPage, {}));
  const bars = findAll(tree, (n) => typeof n.props.className === 'string' && n.props.className.split(' ').includes('cc-ph'));
  assert.equal(bars.length, 1, 'one header bar');
  assert.match(textOf(bars[0]), /^Autonomous/);
  assert.doesNotMatch(textOf(tree), /\bSprints\b/);
  const src = fs.readFileSync(path.join(SRC, 'page_sprints.js'), 'utf8');
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /'Sprints'|"Sprints"|Sprints need/);
});

// ---------------------------------------------------------------- S1: Automation tasks from load

test('a saved hide choice hides Automation tasks at apply(), before More is opened', () => {
  const dom = makeDom({ DSH_CC_HIDE_AUTOMATION_TASKS: '1' });
  const CC = load(PAGE_FILES, dom);
  CC.apply(recorder().ctx);
  const el = dom.document.getElementById('cc-hide-automation');
  assert.ok(el, 'hide rule injected at page load');
  assert.match(el.textContent, /\[aria-label="Automation tasks"\]/);
  assert.match(el.textContent, /_panelRow/);
  assert.match(el.textContent, /display:none/);
  assert.doesNotMatch(el.textContent, /!important/);
});

test('no hide rule when the owner has not hidden it', () => {
  const dom = makeDom();
  const CC = load(PAGE_FILES, dom);
  CC.apply(recorder().ctx);
  assert.equal(dom.document.getElementById('cc-hide-automation'), null);
  dom.store.DSH_CC_HIDE_AUTOMATION_TASKS = '0';
  CC.sprintsSidebar.sync();
  assert.equal(dom.document.getElementById('cc-hide-automation'), null);
});

test('the More row hides and shows, keeping the rule and dsh pin in step', () => {
  const dom = makeDom();
  const CC = load(PAGE_FILES, dom);
  const calls = [];
  const row = (pinned) => render(h(CC.sprintsSidebar.Row, {
    entries: [{ id: 'schedules', label: 'Automation tasks', pinned }],
    onPinnedChange: (id, p) => calls.push([id, p]), onDismiss() {}
  }));
  let tree = row(true);
  assert.match(textOf(tree), /Hide Automation tasks/);
  tree.props.onClick();
  eq(calls.at(-1), ['schedules', false]);
  assert.equal(dom.store.DSH_CC_HIDE_AUTOMATION_TASKS, '1');
  assert.ok(dom.document.getElementById('cc-hide-automation'));
  // After a reload dsh shows it pinned again, but the saved choice still counts as hidden.
  tree = row(true);
  assert.match(textOf(tree), /Show Automation tasks/);
  tree.props.onClick();
  eq(calls.at(-1), ['schedules', true]);
  assert.equal(dom.store.DSH_CC_HIDE_AUTOMATION_TASKS, '0');
  assert.equal(dom.document.getElementById('cc-hide-automation'), null);
});

// ---------------------------------------------------------------- S2: model ticks

test('ticks come from /api/models (enabled only) and fall back to the current pools', () => {
  const CC = load(['autonomous_controls.js']);
  const A = CC.autonomous;
  const reg = { models: [
    { id: 'claude-opus-5.5', label: 'Claude Opus 5.5', route: 'claude_code', enabled: true },
    { id: 'off', label: 'Off', route: 'claude_code', enabled: false },
    { id: 'gpt-6-codex', label: 'GPT 6 Codex', route: 'codex', enabled: true },
    { id: 'groq', label: 'Groq LPU', route: null, kind: 'chat', enabled: true },
    { id: 'agy-flash', label: 'AG Flash 3.8', route: 'antigravity_manual', kind: 'manual', enabled: true },
    { id: 'subagent:antigravity/gemini-4-argon-high', label: 'AG Argon', route: 'antigravity', kind: 'subagent', enabled: true },
    { id: 'chat:openai-codex/gpt-6.1-sol', label: 'GPT 6.1 Sol (Codex OAuth)', provider: 'openai-codex', route: null, enabled: true }
  ] };
  const got = A.modelsFrom(reg, null);
  assert.equal(got.source, 'registry');
  // Switched-off rows stay listed, greyed (off) and never runnable.
  eq(got.models.map((m) => m.id), ['claude-opus-5.5', 'off', 'gpt-6-codex', 'groq', 'agy-flash',
    'subagent:antigravity/gemini-4-argon-high', 'chat:openai-codex/gpt-6.1-sol']);
  const byId = Object.fromEntries(got.models.map((m) => [m.id, m]));
  assert.equal(byId['claude-opus-5.5'].runnable, true);
  assert.equal(byId.off.off, true); assert.equal(byId.off.runnable, false);
  assert.equal(byId['gpt-6-codex'].runnable, true);    // Codex is a run route (no switch helper loaded here)
  const withSwitches = load(['toggles.js', 'autonomous_controls.js']).autonomous.modelsFrom(reg, null).models;
  assert.equal(withSwitches.find((m) => m.id === 'gpt-6-codex').runnable, false);  // off until switched on
  assert.equal(byId.groq.runnable, false);
  assert.equal(byId['agy-flash'].runnable, true);
  // The registry's Antigravity route is offered as the manual agentic-coder route.
  const argon = byId['subagent:antigravity/gemini-4-argon-high'];
  assert.equal(argon.route, 'antigravity_manual'); assert.equal(argon.kind, 'manual'); assert.equal(argon.runnable, true);
  assert.match(byId['chat:openai-codex/gpt-6.1-sol'].note, /^Codex/);
  const groups = A.groupModels(got.models).map((g) => g.id);
  eq(groups, ['runs', 'manual', 'other']);
  const fb = A.modelsFrom(null, null);
  assert.equal(fb.source, 'fallback');
  const routes = new Set(fb.models.map((m) => m.route));
  for (const r of ['claude_code', 'chatgpt_web', 'freebuff', 'gemini_app', 'antigravity_manual']) assert.ok(routes.has(r), r);
  assert.ok(fb.models.some((m) => m.id === 'agent:codex' && m.route === 'codex'));
});

test('max-use toggles follow the selected pools', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  const models = A.modelsFrom(null, null).models;
  const s = { models: ['claude-sonnet-5.5'], sequence: [[{ project: 'p1', model: 'gpt-6-sol' }]] };
  eq(A.selectedPools(s, models), ['claude_code', 'chatgpt_web']);
  eq(A.toggleModel(s, 'claude-sonnet-5.5').models, []);
});

test('usage strip shows Codex and Claude only', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  const strip = A.usageStrip([
    { pool: 'antigravity_week', remaining_percent: 0, status: 'FRESH' },
    { pool: 'codex_5h', remaining_percent: 99, status: 'FRESH', resets_at: '2026-11-04T17:19:12Z' },
    { pool: 'claude_5h', remaining_percent: 17, status: 'FRESH' },
    { pool: 'chat_web', status: 'UNKNOWN' }
  ]);
  eq(strip.map((r) => r.pool), ['claude_5h', 'claude_week', 'codex_5h', 'codex_week']);
  assert.equal(strip[0].remaining_percent, 17);
  assert.equal(strip[1].status, 'UNKNOWN');
});

// ---------------------------------------------------------------- S2: project sequence

test('priority rows: add, move between rows, new rows, model per project', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  let seq = A.addProject([], 'a');
  seq = A.addProject(seq, 'b');
  seq = A.addProject(seq, 'a');               // already placed: no-op
  eq(seq.map((r) => r.map((i) => i.project)), [['a'], ['b']]);
  seq = A.moveTo(seq, 'b', 0);                 // drag b into row 1: a and b start together
  eq(seq.map((r) => r.map((i) => i.project)), [['a', 'b']]);
  seq = A.moveTo(seq, 'a', 1);                 // past the end: a new last row
  eq(seq.map((r) => r.map((i) => i.project)), [['b'], ['a']]);
  seq = A.moveTo(seq, 'a', -1);                // a new first row
  eq(seq.map((r) => r.map((i) => i.project)), [['a'], ['b']]);
  seq = A.setModel(seq, 'b', 'claude-opus-5.5');
  assert.equal(seq[1][0].model, 'claude-opus-5.5');
  seq = A.removeProject(seq, 'a');
  eq(seq, [[{ project: 'b', model: 'claude-opus-5.5' }]]);
});

test('Ctrl+Arrow nudges a project between and within rows', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  const ids = (s) => s.map((r) => r.map((i) => i.project));
  let seq = [[{ project: 'a' }, { project: 'b' }], [{ project: 'c' }]];
  seq = A.nudge(seq, 'b', 'ArrowDown');
  eq(ids(seq), [['a'], ['c', 'b']]);
  seq = A.nudge(seq, 'b', 'ArrowLeft');
  eq(ids(seq), [['a'], ['b', 'c']]);
  seq = A.nudge(seq, 'a', 'ArrowDown');        // a leaves its row: rows close up
  eq(ids(seq), [['b', 'c', 'a']]);
  seq = A.nudge(seq, 'c', 'ArrowUp');          // top row, not alone: a new first row
  eq(ids(seq), [['c'], ['b', 'a']]);
  eq(ids(A.nudge(seq, 'c', 'ArrowUp')), ids(seq));   // alone at the top: stays
  seq = A.nudge(seq, 'a', 'ArrowDown');        // bottom row, not alone: a new last row
  eq(ids(seq), [['c'], ['b'], ['a']]);
});

test('Undo and Redo walk the sequence history', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  let hst = A.history([]);
  hst = A.commit(hst, [[{ project: 'a' }]]);
  hst = A.commit(hst, [[{ project: 'a' }, { project: 'b' }]]);
  assert.equal(A.commit(hst, hst.present), hst);   // no-op change adds nothing
  hst = A.undo(hst);
  eq(hst.present, [[{ project: 'a' }]]);
  hst = A.undo(A.undo(hst));
  eq(hst.present, []);
  hst = A.redo(hst);
  eq(hst.present, [[{ project: 'a' }]]);
  hst = A.commit(hst, [[{ project: 'z' }]]);
  assert.equal(hst.future.length, 0);
});

// ---------------------------------------------------------------- S2: page wiring

test('the page renders run controls, sequence, adders, Copy Prompt and Run', () => {
  const CC = load(PAGE_FILES, makeDom());
  const now = Date.now();
  CC.useEngine = (p) => {
    if (p.startsWith('/api/sprints/timeline')) {
      return { data: { pools: [{ id: 'claude_code', usage: [] }, { id: 'codex', usage: [] }], next_up: ['s1'], recently_finished: [],
        sprints: [{ id: 's1', pool: 'claude_code', pool_label: 'Claude Code', state: 'planned', editable: true, anchor: true, aligned: true,
          start_at: new Date(now + 3600e3).toISOString(), end_at: new Date(now + 5 * 3600e3).toISOString(), summary: 'The Claude Code sprint starts soon.' }] }, error: null };
    }
    if (p === '/api/autonomous') {
      return { data: { settings: { models: ['claude-sonnet-5.5'], sequence: [[{ project: 'p1', model: null }]] }, runs: [], models_source: 'fallback',
        models: [], usage: [{ pool: 'claude_5h', remaining_percent: 40, status: 'FRESH' }, { pool: 'antigravity_week', remaining_percent: 0, status: 'FRESH' }] }, error: null };
    }
    if (p === '/api/models') return { data: null, error: Object.assign(new Error('not_found'), { status: 404 }) };
    if (p === '/api/projects') return { data: { projects: [{ id: 'p1', title: 'Harness' }, { id: 'p2', title: 'Breathe' }] }, error: null };
    return { data: null, error: null };
  };
  const tree = render(h(CC.SprintsPage, {}));
  const text = textOf(tree);
  for (const word of ['Models', 'Claude Opus 5.5', 'Effort', 'Codex', 'Punch clock', 'Auto-wake on reset', 'Power off when done',
    'Project sequence', 'Row 1', 'Harness', 'Add sprint', 'Copy prompt', 'Run',
    'AG Flash 3.8', 'Claude 5 h']) assert.ok(text.includes(word), 'missing ' + word);
  // One "Add sprint" menu replaces the four adder buttons; its items add each kind.
  const menu = findAll(tree, (n) => n.type === 'div' && n.props.role === 'menu' && n.props['aria-label'] === 'Add sprint')[0];
  assert.ok(menu, 'Add sprint menu');
  const trigger = findAll(tree, (n) => n.type === 'button' && textOf(n) === 'Add sprint')[0];
  assert.ok(trigger && /\bcc-b\b/.test(trigger.props.className) && !/cc-b-(quiet|primary)/.test(trigger.props.className), 'a default button');
  assert.equal(trigger.props['aria-haspopup'], 'menu');
  const items = findAll(menu, (n) => n.props.role === 'menuitem');
  assert.deepEqual(items.map(textOf), ['Claude', 'Codex', 'Dual', 'Auto dual']);
  assert.equal(findAll(tree, (n) => n.type === 'button' && /^\+ /.test(textOf(n))).length, 0, 'no separate adder buttons');
  const sent = [];
  CC.api.post = (p, b) => { sent.push([p, b]); return new Promise(() => {}); };
  items[1].props.onClick({});
  eq(sent[0], ['/api/autonomous/sprint', { kind: 'codex' }]);
  assert.ok(!text.includes('Antigravity week') && !text.includes('antigravity_week'), 'usage strip is Codex and Claude only');
  const sliders = findAll(tree, (n) => n.type === 'input' && n.props.type === 'range');
  assert.equal(sliders.length, 2, 'Claude and Codex effort sliders');
  const blocks = findAll(tree, (n) => n.props && n.props['data-sprint'] === 's1');
  assert.equal(blocks.length, 1);
  for (const k of ['onPointerDown', 'onPointerMove', 'onPointerUp']) assert.equal(typeof blocks[0].props[k], 'function', k);
  const run = findAll(tree, (n) => n.type === 'button' && textOf(n) === 'Run')[0];
  assert.equal(run.props.disabled, false);
  const selects = findAll(tree, (n) => n.type === 'select');
  assert.ok(selects.length >= 2 && selects.every((s) => /cc-au-input|cc-sp-input/.test(s.props.className)));
});

test('dragging a block moves it by the share of the axis and posts the new start', () => {
  const CC = load(PAGE_FILES, makeDom());
  const H = CC.sprintsHelpers;
  const now = Date.UTC(2026, 10, 4, 12, 0);
  const ax = H.axis(now, 24);                       // 27 h across the track
  const start = now + 3600e3;
  const moved = H.dragStart(start, 100, 1000, ax, now);  // a tenth of the track = 2.7 h
  assert.equal(moved, H.snap(start + 0.1 * ax.span));
  assert.ok(H.dragStart(start, -100000, 1000, ax, now) >= now);  // never into the past
  assert.ok(H.movable({ editable: true, state: 'planned' }) && !H.movable({ editable: true, state: 'active' }));
  eq(H.visibleRows([]).map((r) => r.id), ['claude_code', 'codex']);
  eq(H.visibleRows([{ pool: 'freebuff' }]).map((r) => r.id), ['claude_code', 'codex', 'freebuff']);
});

// ---------------------------------------------------------------- redesign: header, layout, flags

function engineFor(over = {}) {
  return (p) => {
    if (p.startsWith('/api/sprints/timeline')) return { data: { sprints: [], pools: [], next_up: [], recently_finished: [] }, error: null };
    if (p === '/api/autonomous') {
      return { data: Object.assign({ settings: { models: [], sequence: [[{ project: 'p1', model: null }]] }, runs: [], models_source: 'fallback', models: [],
        usage: [{ pool: 'claude_5h', remaining_percent: 30, status: 'FRESH' }] }, over), error: null };
    }
    if (p === '/api/projects') return { data: { projects: [{ id: 'p1', title: 'Harness' }] }, error: null };
    return { data: null, error: null };
  };
}
const cls = (c) => (n) => typeof n.props.className === 'string' && n.props.className.split(/\s+/).includes(c);

test('header: state meta, compact usage meters, Copy prompt default and Run the one primary', () => {
  const CC = load(PAGE_FILES, makeDom());
  CC.useEngine = engineFor();
  const tree = render(h(CC.SprintsPage, {}));
  const bar = findAll(tree, cls('cc-ph'))[0];
  assert.match(textOf(findAll(bar, cls('cc-ph-meta'))[0]), /^Idle/);
  assert.equal(findAll(bar, (n) => n.props['aria-label'] === 'Usage').length, 1, 'usage meters in the header');
  assert.match(textOf(bar), /Claude 5 h/);
  const primaries = findAll(tree, cls('cc-b-primary'));
  assert.equal(primaries.length, 1, 'one primary button');
  assert.equal(textOf(primaries[0]), 'Run');
  const copy = findAll(bar, (n) => n.type === 'button' && textOf(n) === 'Copy prompt')[0];
  assert.ok(cls('cc-b')(copy) && !cls('cc-b-primary')(copy));
  const running = load(PAGE_FILES, makeDom());
  running.useEngine = engineFor({ runs: [{ id: 'r1', project_id: 'p1', project_title: 'Harness', row: 0, status: 'running' }, { id: 'r2', project_id: 'p2', row: 0, status: 'running' }] });
  const rt = render(h(running.SprintsPage, {}));
  assert.match(textOf(findAll(rt, cls('cc-ph-meta'))[0]), /^Running 2/);
  assert.equal(findAll(rt, cls('cc-b-primary')).length, 0, 'Stop replaces Run while running');
});

test('a sequence row is not red until a Run attempt; Run with nothing to run says why and never posts', () => {
  const posts = [];
  const CC = load(PAGE_FILES, makeDom());
  CC.useEngine = engineFor();
  CC.api.post = (p, b) => { posts.push(p); return new Promise(() => {}); };
  const tree = render(h(CC.SprintsPage, {}));
  const seq = findAll(tree, (n) => n.props['aria-label'] === 'Priority rows')[0];
  assert.ok(!cls('cc-tried')(seq), 'no red flags before a Run attempt');
  const sel = findAll(tree, (n) => n.type === 'select' && /Model for/.test(n.props['aria-label'] || ''))[0];
  assert.equal(sel.props['aria-invalid'], undefined);
  const run = findAll(tree, (n) => n.type === 'button' && textOf(n) === 'Run')[0];
  run.props.onClick();
  assert.ok(!posts.includes('/api/autonomous/run'), 'nothing can run: no post');
  const A = load(['autonomous_controls.js']);
  const t2 = render(h(A.AutonomousControls.Sequence, { sequence: [[{ project: 'p1', model: null }]], projects: [{ id: 'p1', title: 'Harness' }],
    models: [], ticked: 0, tried: true, onChange() {}, focusLater() {} }));
  assert.ok(cls('cc-tried')(findAll(t2, (n) => n.props['aria-label'] === 'Priority rows')[0]));
  assert.equal(findAll(t2, (n) => n.type === 'select' && /Model for/.test(n.props['aria-label'] || ''))[0].props['aria-invalid'], 'true');
  assert.match(A.autonomous.style, /\.cc-au-seq\.cc-tried \.cc-au-item\.cc-need \.cc-au-input\{border-color:var\(--cc-error\)/);
  assert.doesNotMatch(A.autonomous.style, /(^|')\.cc-root \.cc-au-item\.cc-need/m, 'no unconditional red border');
});

test('layout: two columns from 1200 px, one below; flat sections, no boxed panels', () => {
  const src = fs.readFileSync(path.join(SRC, 'page_sprints.js'), 'utf8');
  assert.match(src, /@media \(min-width:1200px\)\{\.cc-root \.cc-sp-main\{grid-template-columns:minmax\(300px,380px\) minmax\(0,1fr\)/);
  const A = load(['autonomous_controls.js']).autonomous;
  assert.doesNotMatch(A.style, /\.cc-au-panel\{[^}]*border:/);
  assert.doesNotMatch(src, /\.cc-sp-tl\{[^}]*border-radius/);
  const CC = load(PAGE_FILES, makeDom());
  CC.useEngine = engineFor();
  const tree = render(h(CC.SprintsPage, {}));
  const titles = findAll(tree, cls('cc-sec-t')).map(textOf);
  for (const t of ['Models', 'Effort', 'Spend', 'Timing', 'Project sequence', 'Timeline', 'Recent runs']) assert.ok(titles.includes(t), t);
  // Timing is switches, Spend is a segmented control
  const timing = findAll(tree, (n) => n.type === 'section' && n.props['aria-label'] === 'Timing')[0];
  assert.equal(findAll(timing, (n) => n.props.role === 'switch').length, 4);
  const spend = findAll(tree, (n) => n.type === 'section' && n.props['aria-label'] === 'Spend')[0];
  assert.deepEqual(findAll(spend, (n) => n.type === 'button').map(textOf), ['Frugal', 'Balanced', 'Push', 'Max']);
});

// Retired ids are mapped by Core itself (engine/cc_engine/retired_ids.py); the plugin keeps no filter of its own.
test('ChatGPT Web is a manual route (Copy Prompt only), never unattended', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  const got = A.enabledModels([{ id: 'gpt-6-sol', label: 'GPT 6 Sol (ChatGPT Web)', route: 'chatgpt_web', kind: 'manual', enabled: true }]);
  assert.equal(got[0].runnable, true);
  assert.ok(A.MANUAL_ROUTES.includes('chatgpt_web') && !A.AUTOMATED_ROUTES.includes('chatgpt_web'));
  eq(A.groupModels(got).map((g) => g.id), ['manual']);
  assert.ok(A.FALLBACK_MODELS.some((m) => m.id === 'gpt-6-sol' && m.route === 'chatgpt_web' && m.kind === 'manual'));
});

test('no personal names, paths or old brand in the Autonomous files', () => {
  for (const f of ['autonomous_controls.js', 'page_sprints.js']) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.deepEqual(personalHits(src), [], f);
    assert.doesNotMatch(src, /C:\\Users|Control Centre|control-centre|@rob\//, f);
  }
});

done('autonomous');
