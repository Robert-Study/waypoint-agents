// create_polish.test.mjs - U3: Create graph cards and inspector polish.
// A wide graph whose whole-width fit would draw labels under 11 px gets two-line cards; labels are
// drawn at 11 px on screen and wrap at a space; every node is a card carrying its status class;
// the inspector shows title, status pill, one line, then a labelled one-line history.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const N = (id, deps, extra) => Object.assign({ id, title: 'Task ' + id, deps: deps || [], status: 'not_started' }, extra || {});
// 14 layers in a chain with a little fan-out: wider than a 1100 px canvas can show at 12 px.
const chain = [];
for (let i = 0; i < 14; i++) chain.push(N('n' + i, i ? ['n' + (i - 1)] : [], { title: 'Accessibility pass and the release note number ' + i }));
chain.push(N('x', ['n3'], { title: 'One as-of date for every table', status: 'running' }));
const edges = chain.flatMap((n) => n.deps.map((d) => [d, n.id]));

test('wide graph: cards stay >= 120 px at a legible zoom and long titles get two-line cards', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js']);
  const L = CC.layoutFlow(chain, edges, { fitWidth: 1100, fitHeight: 700 });
  assert.equal(L.lines, 2);
  assert.ok(12 * L.fitScale >= 11 - 1e-9, 'labels render at 11 px or more: ' + (12 * L.fitScale).toFixed(2));
  assert.ok(L.nodeW >= 120, 'no 3-letter stubs: ' + L.nodeW);
  assert.equal(L.panX, true, '14 layers pan horizontally instead of compressing');
  const one = Object.values(L.nodes)[0];
  assert.equal(one.h, 48, 'two-line cards');
  assert.ok(L.height * L.fitScale <= 700 - 48 + 1e-6, 'still fits the height');
  // Short titles keep one-line 32 px cards.
  const short = chain.slice(0, 4).map((n) => Object.assign({}, n, { title: 'Task ' + n.id }));
  const small = CC.layoutFlow(short, edges.slice(0, 3), { fitWidth: 1100, fitHeight: 700 });
  assert.equal(small.lines, 1);
  assert.equal(Object.values(small.nodes)[0].h, 32);
});

function flowAt(k, nodes, es) {
  const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  const real = CC.useCamera;
  CC.useCamera = (b, key, o) => Object.assign({}, real(b, key, o), { k });
  const realLayout = CC.layoutFlow;
  CC.layoutFlow = (a, b) => realLayout(a, b, { fitWidth: 1100, fitHeight: 700 });
  return render(CC.h(CC.FlowView, { board: { nodes, edges: es }, filter: 'all', onSelect() {} }));
}

test('zoomed-out two-line cards draw 11 px labels wrapped at spaces', () => {
  const k = 0.75; // The owner zoomed out by hand: 12 px labels would render at 9 px
  const t = flowAt(k, chain, edges);
  const labels = findAll(t, hasClass('cc-t-label'));
  assert.equal(labels.length, chain.length);
  for (const l of labels) {
    const fs = parseFloat(l.props.style.fontSize);
    assert.ok(Math.abs(fs * k - 11) < 0.05, 'renders at 11 px, got ' + (fs * k).toFixed(2));
    const spans = findAll(l, (n) => n.type === 'tspan').map(textOf);
    assert.equal(spans.length, 2);
    const words = chain.some((n) => n.title.startsWith(spans[0] + ' '));
    assert.ok(words || /-$/.test(spans[0]), 'line one ends on a whole word or a hyphen: ' + spans[0]);
  }
  assert.equal(findAll(t, hasClass('cc-t-meta')).length, 0, 'no meta line when zoomed out');
});

test('every node is a status-classed card; selection and running read from classes', () => {
  const t = flowAt(1, chain.slice(0, 4).concat([N('r', ['n0'], { status: 'running' })]), [['n0', 'n1'], ['n1', 'n2'], ['n2', 'n3'], ['n0', 'r']]);
  const nodes = findAll(t, hasClass('cc-node'));
  assert.equal(nodes.length, 5);
  for (const g of nodes) {
    const card = findAll(g, hasClass('cc-hit'))[0];
    assert.equal(card.props.x, 0);
    assert.ok(card.props.rx > 0);
    assert.ok(/\bcc-st-[a-z_]+\b/.test(g.props.className), g.props.className);
  }
  assert.ok(nodes.some((g) => hasClass('cc-st-running')(g)));
  const labels = findAll(t, hasClass('cc-t-label'));
  assert.ok(labels.every((l) => !l.props.style), 'normal zoom uses the 12 px token size');
  assert.equal(findAll(t, hasClass('cc-t-meta')).length, 5);
});

test('inspector: title, status pill, one line, then a labelled one-line history', () => {
  const engine = (path) => {
    if (!path) return { data: null };
    if (path.indexOf('/api/node/history') === 0) return { data: { history: [
      { at: '2026-11-04T09:00:00+00:00', kind: 'returned', text: 'Returned: test_auth_redirect failed, scope handlers/auth.py', by: 'Check' }] } };
    if (path.indexOf('/api/node') === 0) return { data: { node: { id: 'B', title: 'Build it', goal: 'Do it.', status: 'not_started', display_status: 'ready', deps: [] } } };
    return { data: null, error: new Error('HTTP 404') };
  };
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], { useEngine: engine, api: { get() { return Promise.resolve({}); }, post() { return Promise.resolve({}); } }, copyText() {}, openUrl() {} });
  const tree = render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 1, cwd: '.', blockedBy: [], toast() {}, onClose() {} }));
  const body = findAll(tree, hasClass('cc-side-b'))[0];
  const kids = body.props.children.flat().filter((c) => c && typeof c === 'object');
  const ix = (pred) => kids.findIndex(pred);
  const pill = ix((c) => findAll(c, hasClass('cc-pill')).length > 0);
  const desc = ix((c) => hasClass('cc-desc')(c));
  assert.ok(pill >= 0 && desc > pill, 'pill sits above the one-line description');
  const sec = findAll(tree, hasClass('cc-sub'))[0];
  assert.ok(sec && textOf(findAll(sec, hasClass('cc-sub-h'))[0]) === 'History');
  const t = findAll(sec, hasClass('cc-hist-t'))[0];
  assert.ok(t.props.title.indexOf('Returned: test_auth_redirect failed') === 0, 'full text on hover');
  assert.ok(/white-space:nowrap/.test(CC.createHelpers.STYLE.match(/\.cc-hist-t\{[^}]*\}/)[0]), 'history rows are one line');
});

done('create_polish');
