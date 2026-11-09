// live2_fixes.test.mjs - wave 4 fixes from the LIVE2 end-to-end run:
// 1. a code node shows its kind, never a model; the inspector's Planned line follows what dispatch
//    will use (node pins, then the active run's ladder/effort), not the generic Pick for me hint;
// 2. a short sprint block on the Autonomous timeline keeps its pool label and a state fill;
// 3. Create's project "..." menu archives the project (confirm on second click, 404 tolerated).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, loadCC, render, findAll, hasClass, textOf, test, done, SRC } from './harness.mjs';

const flush = () => new Promise((r) => setTimeout(r, 0));

// ---------------------------------------------------------------- 1a. board label
function flow(nodes) {
  const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  const real = CC.useCamera;
  CC.useCamera = (b, key, o) => Object.assign({}, real(b, key, o), { k: 1 });
  return render(CC.h(CC.FlowView, { board: { nodes, edges: [] }, filter: 'all', onSelect() {} }));
}
test('a code node shows its kind on the board, never a model', () => {
  const t = flow([{ id: 'n1', title: 'Write the seed file', deps: [], status: 'done', kind: 'code', model: 'haiku' },
    { id: 'n2', title: 'Write result', deps: [], status: 'running', kind: 'worker', model: 'haiku' }]);
  const metas = findAll(t, hasClass('cc-t-meta')).map(textOf);
  const m1 = metas.find((m) => m.indexOf('n1') === 0), m2 = metas.find((m) => m.indexOf('n2') === 0);
  assert.ok(m1 && m2, metas.join(' | '));
  assert.doesNotMatch(m1, /haiku/);
  assert.match(m1, /Code/);
  assert.match(m2, /haiku/, 'a worker keeps its model');
});

// ---------------------------------------------------------------- 1b. inspector planned line
const MODELS = { models: [
  { id: 'subagent:claude/haiku-5.5', label: 'Claude Haiku 5.5', route: 'claude_code', enabled: true },
  { id: 'claude-opus', label: 'Claude Opus 5.5', route: 'claude_code', enabled: true },
  { id: 'deepseek-chat', label: 'DeepSeek V4.1 Flash', route: 'freebuff', enabled: true }] };
const PICK = { model: 'claude-opus', effort: 'high', why: 'Hard task.' };
function inspector(opts) {
  const o = Object.assign({ node: {}, runs: [] }, opts || {});
  const node = Object.assign({ id: 'n2', title: 'Write result.txt', goal: 'g', status: 'running', display_status: 'running',
    deps: ['n1'], kind: 'worker', check: { type: 'text_present' }, recommended: null, claim: null }, o.node);
  const engine = (p) => {
    if (!p) return { data: null };
    if (p.indexOf('/api/node/history') === 0) return { data: { history: [] } };
    if (p.indexOf('/api/node') === 0) return { data: { node } };
    if (p.indexOf('/api/pick') === 0) return { data: PICK };
    if (p.indexOf('/api/models') === 0) return { data: MODELS };
    if (p.indexOf('/api/runs') === 0) return { data: { runs: o.runs } };
    return { data: null, error: new Error('HTTP 404') };
  };
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], { useEngine: engine,
    api: { post() { return Promise.resolve({}); } }, copyText: () => Promise.resolve(), openUrl() {} });
  return render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'n2', revision: 1, toast() {}, onClose() {} }));
}
const RUN = (settings, extra) => Object.assign({ id: 'run-1', project_id: 'p', status: 'running', settings }, extra || {});
const LIVE2 = { preset: 'frugal', pools: ['claude_code'], advanced: { model_ladder: { claude_code: ['haiku'] } }, efforts: { claude_code: 'low' } };
const recRow = (t) => findAll(t, hasClass('cc-send-rec'));
const note = (row) => textOf(findAll(row, hasClass('cc-send-note'))[0]);

test('active run: Planned names the run ladder model and effort, not the Pick for me hint', () => {
  const t = inspector({ runs: [RUN(LIVE2)] });
  const rec = recRow(t);
  assert.equal(rec.length, 1);
  assert.equal(textOf(findAll(rec[0], hasClass('cc-send-n'))[0]), 'Claude Code');
  assert.match(note(rec[0]), /^Haiku 5\.5 · low$/);
  assert.doesNotMatch(textOf(t), /Opus|Pick for me/);
});

test('a node pin wins over the run ladder; preset-only runs use the preset first model and effort', () => {
  const pinned = inspector({ node: { model: 'claude-opus', effort: 'high', pool: 'claude_code' }, runs: [RUN(LIVE2)] });
  assert.match(note(recRow(pinned)[0]), /^Opus 5\.5 · high$/);
  const preset = inspector({ runs: [RUN({ preset: 'frugal', pools: ['claude_code'] })] });
  assert.match(note(recRow(preset)[0]), /Haiku 5\.5 · low$/);
  const balanced = inspector({ runs: [RUN({ preset: 'balanced', pools: ['claude_code'], advanced: { effort: 'high' } })] });
  assert.match(note(recRow(balanced)[0]), /· sonnet · high$|Sonnet · high$/i);
  const fb = inspector({ node: { pool: 'freebuff' }, runs: [RUN({ preset: 'frugal', pools: ['claude_code', 'freebuff'] })] });
  assert.equal(textOf(findAll(recRow(fb)[0], hasClass('cc-send-n'))[0]), 'Freebuff');
  assert.match(note(recRow(fb)[0]), /DeepSeek V4\.1 Flash · low$/);
});

test('finished or other-project runs do not count; the Pick for me hint stays then', () => {
  const old = inspector({ node: { status: 'not_started', display_status: 'ready' },
    runs: [RUN(LIVE2, { status: 'done' }), RUN(LIVE2, { project_id: 'other' })] });
  assert.equal(findAll(old, hasClass('cc-pick')).length, 1);
  assert.match(textOf(findAll(old, hasClass('cc-pick'))[0]), /^Pick for me · Opus 5\.5$/);
});

test('a code node: no model is planned, one quiet line says it runs its script', () => {
  const t = inspector({ node: { id: 'n1', kind: 'code', model: 'haiku', status: 'done' }, runs: [RUN(LIVE2)] });
  assert.equal(recRow(t).length, 0);
  assert.equal(findAll(t, hasClass('cc-pick')).length, 0);
  assert.doesNotMatch(textOf(t), /haiku|Haiku|Opus|Planned/);
  assert.match(textOf(findAll(t, hasClass('cc-send-h'))[0]), /script/);
});

// ---------------------------------------------------------------- 2. sprint block label + fill
function sprintsCC() {
  const CC = { h, React: makeReact() };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, isNaN,
    setTimeout, clearTimeout });
  for (const f of ['tokens.js', 'autonomous_controls.js', 'page_sprints.js']) {
    vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  }
  return CC;
}
test('a short planned sprint block keeps its pool label beside it; wide blocks keep their text', () => {
  const CC = sprintsCC();
  const S = CC.sprintsHelpers;
  assert.equal(typeof S.Track, 'function', 'Track exposed for tests');
  const now = Date.parse('2026-11-04T23:00:00Z');
  const ax = S.axis(now, 24);
  const short = { id: 's1', state: 'planned', pool: 'claude_code', pool_label: 'Claude Code', editable: true, summary: 'Claude Code sprint',
    start_at: '2026-11-05T04:40:00Z', end_at: '2026-11-05T05:40:00Z', anchor: true };
  const wide = Object.assign({}, short, { id: 's2', start_at: '2026-11-05T10:00:00Z', end_at: '2026-11-05T16:00:00Z' });
  const gone = Object.assign({}, short, { id: 's3', state: 'cancelled', start_at: '2026-11-05T18:00:00Z', end_at: '2026-11-05T19:00:00Z' });
  const noop = () => {};
  const t = render(h(S.Track, { ax, now, hours: 24, width: 600, pool: {}, sprints: [short, wide, gone],
    onDragStart: noop, onDragMove: noop, onDragEnd: noop, onDragCancel: noop, wasDrag: () => false, onOpen: noop }));
  const tags = findAll(t, hasClass('cc-sp-tag'));
  assert.equal(tags.length, 1, 'one tag, for the short live block only');
  assert.match(textOf(tags[0]), /^Claude Code 04:40$|^Claude Code$/);
  assert.equal(tags[0].props['aria-hidden'], 'true');
  const blocks = findAll(t, hasClass('cc-sp-block'));
  const wideEl = blocks.find((b) => b.props['data-sprint'] === 's2');
  assert.ok(textOf(wideEl).length > 0, 'wide block keeps its own text');
  const src = fs.readFileSync(path.join(SRC, 'page_sprints.js'), 'utf8');
  assert.match(src, /\.cc-sp-block\.cc-planned\{[^}]*background:/, 'planned blocks are filled, not an empty outline');
  assert.doesNotMatch(src, /!important|gradient/);
});

// ---------------------------------------------------------------- 3. archive in the project menu
function stateful() {
  const st = []; let i = 0;
  const R = makeReact();
  R.useState = (init) => { const k = i++; if (!(k in st)) st[k] = typeof init === 'function' ? init() : init;
    return [st[k], (v) => { st[k] = typeof v === 'function' ? v(st[k]) : v; }]; };
  return { R, reset() { i = 0; } };
}
function archiveMenu(reply) {
  const calls = [], toasts = [], archived = [];
  const s = stateful();
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], {
    useEngine: () => ({ data: null }),
    api: { post(p, b) { calls.push([p, b]); return reply(); } } });
  CC.React = s.R;
  const draw = () => { s.reset(); return render(CC.h(CC.createHelpers.ProjectMenu, { project: 'live2', toast: (x) => toasts.push(x),
    onArchived: (id) => archived.push(id) })); };
  return { draw, calls, toasts, archived };
}
const archiveBtn = (t) => findAll(t, (n) => n.type === 'button').find((b) => /archive/i.test(textOf(b)));

const ok = archiveMenu(() => Promise.resolve({ ok: true }));
let t1 = ok.draw();
const menu = findAll(t1, (n) => n.type === 'details' && hasClass('cc-more')(n));
const firstLabel = textOf(archiveBtn(t1));
archiveBtn(t1).props.onClick();
const callsAfterOne = ok.calls.length;
t1 = ok.draw();
const armedLabel = textOf(archiveBtn(t1));
archiveBtn(t1).props.onClick();
await flush(); await flush();

const missing = archiveMenu(() => Promise.reject(Object.assign(new Error('HTTP 404'), { status: 404 })));
let t2 = missing.draw(); archiveBtn(t2).props.onClick(); t2 = missing.draw(); archiveBtn(t2).props.onClick();
await flush(); await flush();

test('Archive project sits in the project "..." menu and confirms on the second click', () => {
  assert.equal(menu.length, 1, 'one overflow menu');
  assert.equal(textOf(findAll(menu[0], (n) => n.type === 'summary')[0]), '…');
  assert.equal(firstLabel, 'Archive project');
  assert.equal(callsAfterOne, 0, 'first click only arms');
  assert.equal(armedLabel, 'Confirm archive');
  assert.deepEqual(JSON.parse(JSON.stringify(ok.calls)), [['/api/project/archive', { project: 'live2' }]]);
  assert.deepEqual(ok.archived, ['live2']);
  assert.deepEqual(ok.toasts, ['Project archived']);
});

test('a 404 (engine not restarted yet) gives one quiet toast and archives nothing', () => {
  assert.equal(missing.calls.length, 1);
  assert.deepEqual(missing.archived, []);
  assert.equal(missing.toasts.length, 1);
  assert.match(missing.toasts[0], /restart/i);
  assert.doesNotMatch(missing.toasts[0], /404|HTTP|error/i);
});

done('live2_fixes');
