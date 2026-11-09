// loop_cues.test.mjs - W9 calm cues: node kind glyphs, dashed edges without crosses, quiet return lines,
// and the Rules learned list.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const N = (id, deps, extra) => Object.assign({ id, title: 'Task ' + id, deps: deps || [], status: 'not_started' }, extra || {});
const nodes = [
  N('S', [], { kind: 'splitter', crosses: {} }),
  N('W', ['S'], { kind: 'worker', crosses: { S: 'the shard list' } }),
  N('C', ['W'], { kind: 'code', crosses: {} }),
  N('G', ['C'], { kind: 'gate', crosses: { C: 'merged file' } })
];
const edges = [['S', 'W'], ['W', 'C'], ['C', 'G']];

function flow(props) {
  const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  return render(CC.h(CC.FlowView, Object.assign({ board: { nodes, edges }, selected: null, onSelect() {} }, props || {})));
}
const nodeG = (t, id) => findAll(t, (n) => n.type === 'g' && n.props['data-id'] === id)[0];

test('code nodes carry a square glyph; splitter and gate a small glyph; worker none', () => {
  const t = flow();
  const code = nodeG(t, 'C');
  assert.equal(code.props['data-kind'], 'code');
  assert.ok(findAll(code, (n) => n.type === 'rect' && hasClass('cc-kind-code')(n)).length === 1, 'square');
  const sq = findAll(code, hasClass('cc-kind-code'))[0];
  assert.equal(sq.props.width, sq.props.height);
  assert.ok(findAll(nodeG(t, 'S'), hasClass('cc-kind-splitter')).length === 1);
  assert.ok(findAll(nodeG(t, 'G'), hasClass('cc-kind-gate')).length === 1);
  assert.equal(findAll(nodeG(t, 'W'), (n) => /cc-kind-/.test(n.props.className || '') && n.type !== 'g').length, 0);
});

test('no kind on a node draws no glyph (older boards)', () => {
  const t = flow({ board: { nodes: [N('A'), N('B', ['A'])], edges: [['A', 'B']] } });
  assert.equal(findAll(t, (n) => /cc-kind-/.test(n.props.className || '')).length, 0);
});

test('dashUnnamed draws edges without crosses dashed, only those', () => {
  const t = flow({ dashUnnamed: true });
  const edgesEls = findAll(t, hasClass('cc-edge'));
  const dashed = edgesEls.filter((e) => e.props.strokeDasharray);
  assert.equal(edgesEls.length, 3);
  assert.equal(dashed.length, 1, 'only W>C names nothing');
});

test('without dashUnnamed nothing is dashed', () => {
  assert.equal(findAll(flow(), hasClass('cc-edge')).filter((e) => e.props.strokeDasharray).length, 0);
});

// ---- inspector
function inspector(history, constraints) {
  const engine = (path) => {
    if (!path) return { data: null };
    if (path.indexOf('/api/node/history') === 0) return { data: { history } };
    if (path.indexOf('/api/constraints') === 0) return constraints ? { data: { constraints } } : { data: null, error: new Error('HTTP 404') };
    if (path.indexOf('/api/node') === 0) return { data: { node: { id: 'B', title: 'Build it', goal: 'Do it.', status: 'not_started', deps: [] }, events: [] } };
    return { data: null, error: new Error('HTTP 404') };
  };
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], { useEngine: engine, api: { get() { return Promise.resolve({}); }, post() { return Promise.resolve({}); } }, copyText() {}, openUrl() {} });
  return render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 1, cwd: '.', blockedBy: [], toast() {}, onClose() {} }));
}

test('returned and replanned history rows render as one quiet line each', () => {
  const t = inspector([
    { at: '2026-11-04T09:00:00+00:00', kind: 'returned', text: 'Returned: test_auth_redirect failed, scope handlers/auth.py', by: 'Check' },
    { at: '2026-11-04T09:10:00+00:00', kind: 'replanned', text: 'Replanned: split B', by: 'Planner' }
  ]);
  const lis = findAll(t, (n) => n.type === 'li' && /returned|replanned/.test(n.props['data-kind'] || ''));
  assert.equal(lis.length, 2);
  assert.ok(textOf(lis[0]).indexOf('Returned: test_auth_redirect failed, scope handlers/auth.py') >= 0);
  assert.ok(lis.every((l) => textOf(l).split('\n').length === 1));
});

test('Rules learned: quiet list from constraints, hidden when none', () => {
  const rules = [{ project: 'p', node: 'A', line: 'Handlers live in handlers/' }, { project: 'p', node: 'C', line: 'Run pytest -q' }];
  const t = inspector([], rules);
  const box = findAll(t, hasClass('cc-rules'))[0];
  assert.ok(box, 'rules block');
  const text = textOf(box);
  assert.ok(text.indexOf('Rules learned') >= 0 && text.indexOf('Handlers live in handlers/') >= 0);
  assert.equal(findAll(inspector([], []), hasClass('cc-rules')).length, 0);
  assert.equal(findAll(inspector([], null), hasClass('cc-rules')).length, 0);
});

done('loop_cues');
