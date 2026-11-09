// create_review.test.mjs - U1 review items for the Create surface (Waypoint v3 wave 3):
// header never overlaps at 1024 and carries no usage strip; Flow cards keep >= 120 px and pan
// instead of compressing, take their width from the free canvas (160-240 px, review 2) with two full
// lines; edges share one bus per gap in --cc-line; the inspector folds switched-off routes into
// one "N off" row, always shows History, keeps Rules learned in the "..." menu and puts Pick for
// me in a route subtitle; Waves meta uses the UI font with tabular numbers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, hasClass, textOf, test, done, SRC } from './harness.mjs';

const N = (id, deps, extra) => Object.assign({ id, title: 'Task ' + id, deps: deps || [], status: 'not_started' }, extra || {});
const edgesOf = (nodes) => nodes.flatMap((n) => n.deps.map((d) => [d, n.id]));
const rule = (css, sel) => (css.split('\n').find((l) => l.indexOf(sel + '{') >= 0) || '');

test('header at 1024: title shrinks and ellipsizes, meta then counts drop, no usage strip', () => {
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], { useEngine: () => ({ data: null }) });
  const css = CC.createHelpers.STYLE;
  assert.match(rule(css, '.cc-root.cc-create .cc-ph-title'), /min-width:0/);
  const sel = rule(css, '.cc-root .cc-project');
  assert.match(sel, /min-width:0/);
  assert.match(sel, /text-overflow:ellipsis/);
  assert.match(css, /\.cc-root\.cc-create\{container-type:inline-size;\}/, 'the page is a size container');
  assert.match(css, /@container \(max-width:860px\)\{\.cc-root\.cc-create \.cc-sg-n,[^{]*\.cc-attn-l[^{]*\{display:none;\}/, 'segment counts and the needs-you words drop when narrow');
  assert.doesNotMatch(css, /cc-strip/, 'usage strip removed from Create');
});

// A 14-layer chain like the live build plan, titles longer than one line.
const chain = [];
for (let i = 0; i < 14; i++) chain.push(N('n' + i, i ? ['n' + (i - 1)] : [], { title: 'Decide the backtest window and the as-of date ' + i }));

test('inspector open at 1024 (about 400 px canvas): cards keep >= 120 px, legible, pan horizontally', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js']);
  const L = CC.layoutFlow(chain, edgesOf(chain), { fitWidth: 400, fitHeight: 670 });
  assert.ok(L.nodeW >= 120, 'card width ' + L.nodeW);
  assert.ok(L.labelChars >= 15, 'label budget ' + L.labelChars);
  assert.ok(12 * L.fitScale >= 11 - 1e-9, 'labels at ' + (12 * L.fitScale).toFixed(2) + ' px');
  assert.equal(L.panX, true);
});

test('1440 canvas with a short graph: card width comes from the free width (<= 240 px), two full lines', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js']);
  const few = chain.slice(0, 3);
  const L = CC.layoutFlow(few, edgesOf(few), { fitWidth: 1160, fitHeight: 800 });
  assert.equal(L.nodeW, 240, 'three columns in 1160 px use the 240 px cap');
  assert.equal(L.lines, 2);
  assert.equal(L.fitScale, 1);
  assert.equal(L.panX, false);
  const mid6 = CC.layoutFlow(chain.slice(0, 4), edgesOf(chain.slice(0, 4)), { fitWidth: 1160, fitHeight: 800 });
  assert.ok(mid6.nodeW > 160 && mid6.nodeW < 240, 'derived from the free width: ' + mid6.nodeW);
  // The view draws two whole lines before the ellipsis.
  const V = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  const real = V.layoutFlow;
  V.layoutFlow = (a, b) => real(a, b, { fitWidth: 1160, fitHeight: 800 });
  const t = render(V.h(V.FlowView, { board: { nodes: few, edges: edgesOf(few) }, filter: 'all', onSelect() {} }));
  for (const l of findAll(t, hasClass('cc-t-label'))) {
    const spans = findAll(l, (n) => n.type === 'tspan').map(textOf);
    assert.equal(spans.length, 2);
    assert.ok(!/…/.test(spans[0]), 'first line is whole: ' + spans[0]);
  }
});

test('edges merge into one bus per gap and draw in --cc-line', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js']);
  // Fan-out and fan-in across the same gap: A,B,C -> D,E,F (every pair).
  const nodes = [N('A'), N('B'), N('C'), N('D', ['A', 'B', 'C']), N('E', ['A', 'B', 'C']), N('F', ['A', 'B', 'C'])];
  const L = CC.layoutFlow(nodes, edgesOf(nodes), { fitWidth: 1100, fitHeight: 700 });
  const xs = new Set();
  for (const e of L.edges) {
    for (let i = 1; i < e.points.length; i++) if (e.points[i][0] === e.points[i - 1][0]) xs.add(e.points[i][0]);
  }
  assert.ok(xs.size <= 1, 'one vertical bus x in the gap, got ' + [...xs].join(', '));
  const css = fs.readFileSync(path.join(SRC, 'view_flow.js'), 'utf8');
  assert.match(css, /\.cc-edge:not\(\.cc-edge-sel\):not\(\.cc-edge-blocked\)\{stroke:var\(--cc-line\);\}/);
});

// Inspector with a stateful useState so the "N off" row can open.
function inspector(opts) {
  const o = Object.assign({ history: [], rules: [], pick: null }, opts || {});
  const node = { id: 'B', title: 'Build it', goal: 'Build the thing.', status: 'not_started', display_status: 'ready', deps: [], check: { type: 'command', run: 'exit 0' } };
  const engine = (path) => {
    if (!path) return { data: null };
    if (path.indexOf('/api/node/history') === 0) return { data: { history: o.history } };
    if (path.indexOf('/api/node') === 0) return { data: { node } };
    if (path.indexOf('/api/constraints') === 0) return { data: { constraints: o.rules } };
    if (path.indexOf('/api/pick') === 0) return o.pick ? { data: o.pick } : { data: null, error: new Error('HTTP 404') };
    if (path.indexOf('/api/models') === 0) return { data: { models: [{ id: 'claude-sonnet', label: 'Claude Sonnet', route: 'claude_code', enabled: true }] } };
    return { data: null, error: new Error('HTTP 404') };
  };
  const states = []; let i = 0;
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], { useEngine: engine, api: { get() { return Promise.resolve({}); }, post() { return Promise.resolve({}); } }, copyText() {}, openUrl() {} });
  const baseState = CC.React.useState;
  CC.React.useState = (init) => { const k = i++; if (!(k in states)) states[k] = typeof init === 'function' ? init() : init; return [states[k], (v) => { states[k] = typeof v === 'function' ? v(states[k]) : v; }]; };
  void baseState;
  CC.isEnabled = (id) => !['codex', 'antigravity'].includes(id);
  const draw = () => { i = 0; return render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 1, toast() {}, onClose() {} })); };
  return { draw };
}
const names = (t) => findAll(t, hasClass('cc-send-n')).map(textOf);

test('switched-off routes fold into one quiet "N off" row that expands on click', () => {
  const s = inspector();
  const t = s.draw();
  assert.ok(!names(t).includes('Codex') && !names(t).includes('Antigravity'));
  const tog = findAll(t, hasClass('cc-off-toggle'))[0];
  assert.equal(textOf(tog), '2 off');
  assert.doesNotMatch(textOf(t), /Off in Agents/);
  tog.props.onClick();
  const open = s.draw();
  const offRows = findAll(open, hasClass('cc-off'));
  assert.deepEqual(offRows.map((r) => textOf(findAll(r, hasClass('cc-send-n'))[0])), ['Codex', 'Antigravity']);
  const last = findAll(open, hasClass('cc-send-row')).slice(-2).map((r) => textOf(findAll(r, hasClass('cc-send-n'))[0]));
  assert.deepEqual(last, ['Codex', 'Antigravity'], 'off rows trail the list');
});

test('History always renders under the buttons; Rules learned folds under History; Pick for me in a route subtitle', () => {
  const t = inspector({ rules: [{ line: 'Handlers live in handlers/' }], pick: { model: 'claude-sonnet', effort: 'high', why: 'Fits.' } }).draw();
  const side = findAll(t, (n) => n.type === 'aside')[0];
  const kids = side.props.children.filter(Boolean);
  const last = kids[kids.length - 1];
  assert.equal(textOf(findAll(last, hasClass('cc-sub-h'))[0]), 'History');
  assert.match(textOf(last), /No history yet/);
  // Review 2 (kit menus hold plain items): Rules learned is a collapsed section after History.
  const body = findAll(t, hasClass('cc-side-b'))[0].props.children.filter((c) => c && typeof c === 'object');
  const iHist = body.findIndex((c) => findAll(c, hasClass('cc-sub-h')).some((x) => textOf(x) === 'History'));
  const iRules = body.findIndex((c) => hasClass('cc-rules')(c));
  assert.ok(iHist >= 0 && iRules === iHist + 1, 'rules right after History: ' + iHist + ',' + iRules);
  assert.equal(body[iRules].type, 'details', 'collapsed');
  assert.ok(!body[iRules].props.open);
  assert.equal(findAll(t, hasClass('cc-rules')).length, 1, 'and nowhere else');
  const pick = findAll(t, hasClass('cc-pick'));
  assert.equal(pick.length, 1);
  assert.ok(hasClass('cc-send-note')(pick[0]), 'pick is a route subtitle');
  assert.match(textOf(pick[0]), /^Pick for me · Sonnet$/);
  assert.equal(findAll(t, hasClass('cc-send-h')).length, 0, 'no separate pick line above the list');
});

test('Waves meta line uses the UI font with tabular numbers, not cc-num', () => {
  const CC = loadCC(['tokens.js', 'waves.js', 'view_waves.js']);
  const nodes = [N('A', [], { status: 'done' }), N('B', ['A'])];
  const t = render(CC.h(CC.WavesView, { board: { nodes }, filter: 'all', onSelect() {} }));
  const meta = findAll(t, (n) => /\bof \d+ done\b/.test(textOf(n)) && n.type === 'span' && hasClass('cc-meta')(n));
  assert.ok(meta.length >= 1);
  for (const m of meta) {
    assert.ok(!hasClass('cc-num')(m));
    assert.equal(m.props.style.fontVariantNumeric, 'tabular-nums');
  }
});

done('create_review');
