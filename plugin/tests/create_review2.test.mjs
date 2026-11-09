// create_review2.test.mjs - second design review of the Create surface (Waypoint v3 wave 6):
// cards 160-240 px with two full lines and a meta line that is never cut (no status word, the
// dot says it; code nodes say Code, even when the board omits kind); a graph wider than the
// canvas shows edge buttons; implied edges are dropped; a disconnected chain packs under the
// main graph; the header puts the count after the title (compact below 1200 px) and lets the
// project menu sit above the canvas; route subtitles read "Pick for me . Opus 5.5"; Stars draw
// cross-lane links at full alpha and pin lane names to their hulls.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const N = (id, deps, extra) => Object.assign({ id, title: 'Task ' + id, deps: deps || [], status: 'not_started' }, extra || {});
const edgesOf = (nodes) => nodes.flatMap((n) => n.deps.map((d) => [d, n.id]));
const rule = (css, sel) => (css.split('\n').find((l) => l.indexOf(sel + '{') >= 0) || '');

test('cards take 160-240 px from the free width', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js']);
  const few = [N('a'), N('b', ['a']), N('c', ['b'])];
  assert.equal(CC.layoutFlow(few, edgesOf(few), { fitWidth: 1160, fitHeight: 800 }).nodeW, 240);
  const chain = []; for (let i = 0; i < 14; i++) chain.push(N('n' + i, i ? ['n' + (i - 1)] : [], { title: 'Decide the backtest window and the as-of date ' + i }));
  const L = CC.layoutFlow(chain, edgesOf(chain), { fitWidth: 1024 - 220, fitHeight: 600 });
  assert.equal(L.nodeW, 160);
  assert.equal(L.lines, 2, 'two full title lines at 1024 too');
  assert.ok(L.labelChars >= 22, 'label budget ' + L.labelChars);
});

test('meta line: id plus Code/model, never the status word, never an ellipsis', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  assert.equal(CC.flowMetaLine({ id: 'V9-R5', model: 'haiku' }, false, 30), 'V9-R5 · haiku');
  assert.equal(CC.flowMetaLine({ id: 'n1', kind: 'code', model: 'haiku' }, false, 30), 'n1 · Code');
  assert.equal(CC.flowMetaLine({ id: 'n1', pool: 'code', model: 'haiku' }, false, 30), 'n1 · Code', 'code route without kind');
  assert.equal(CC.flowMetaLine({ id: 'V9-R5', model: 'claude-opus-5.5' }, false, 10), 'V9-R5', 'model dropped, not cut');
  const nodes = [N('n1', [], { model: 'haiku', status: 'done', pool: 'code' }), N('n2', ['n1'], { model: 'haiku' })];
  const t = render(CC.h(CC.FlowView, { board: { nodes, edges: edgesOf(nodes) }, filter: 'all', onSelect() {} }));
  const metas = findAll(t, hasClass('cc-t-meta')).map(textOf);
  assert.ok(metas.includes('n1 · Code'), metas.join('|'));
  assert.ok(metas.every((m) => !/Not started|Done|…/.test(m)), metas.join('|'));
  const g = findAll(t, (n) => n.props && n.props['data-id'] === 'n1')[0];
  assert.equal(g.props['data-kind'], 'code');
});

test('a graph wider than the canvas shows a right edge button; a fitting one shows none', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  const real = CC.React.useState;
  const at = (w) => { let first = true; CC.React.useState = (init) => { if (first && init === null) { first = false; return [{ w, h: 600 }, () => {}]; } return real(init); }; };
  const chain = []; for (let i = 0; i < 12; i++) chain.push(N('n' + i, i ? ['n' + (i - 1)] : []));
  at(800);
  const wide = render(CC.h(CC.FlowView, { board: { nodes: chain, edges: edgesOf(chain) }, filter: 'all', onSelect() {} }));
  assert.equal(findAll(wide, hasClass('cc-pan-r')).length, 1);
  assert.equal(findAll(wide, hasClass('cc-pan-l')).length, 0);
  at(1400);
  const few = chain.slice(0, 3);
  const narrow = render(CC.h(CC.FlowView, { board: { nodes: few, edges: edgesOf(few) }, filter: 'all', onSelect() {} }));
  assert.equal(findAll(narrow, hasClass('cc-pan')).length, 0);
});

test('Plan draft graph (dashUnnamed): same card sizing and edge buttons, every handoff edge kept', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  const real = CC.React.useState;
  let first = true;
  CC.React.useState = (init) => { if (first && init === null) { first = false; return [{ w: 800, h: 600 }, () => {}]; } return real(init); };
  const g = [N('a'), N('b', ['a']), N('c', ['a', 'b'])];
  for (let i = 0; i < 10; i++) g.push(N('z' + i, [i ? 'z' + (i - 1) : 'c']));
  const t = render(CC.h(CC.FlowView, { board: { nodes: g, edges: edgesOf(g) }, filter: 'all', onSelect() {}, dashUnnamed: true }));
  assert.equal(findAll(t, hasClass('cc-edge')).length, edgesOf(g).length, 'Plan review keeps a->c');
  assert.equal(findAll(t, hasClass('cc-pan-r')).length, 1);
});

test('implied edges are dropped (FlowView), and a disconnected chain packs under the main graph', () => {
  const CC = loadCC(['tokens.js', 'layout_flow.js']);
  const nodes = [N('a'), N('b', ['a']), N('c', ['a', 'b'])];
  assert.equal(CC.layoutFlow(nodes, edgesOf(nodes), { dropImplied: true }).edges.length, 2);
  assert.equal(CC.layoutFlow(nodes, edgesOf(nodes), {}).edges.length, 3, 'layout keeps every edge unless asked');
  // Main: a fan of 4 in layer 1; side chain x -> y sits in layers 2-3 (below nothing there).
  const g = [N('r'), N('m1', ['r']), N('m2', ['r']), N('m3', ['r']), N('m4', ['r']), N('t', ['m1', 'm2', 'm3', 'm4']), N('x'), N('y', ['x'])];
  const L = CC.layoutFlow(g, edgesOf(g), {});
  const mainBottom = Math.max(...['r', 'm1', 'm2', 'm3', 'm4', 't'].map((id) => L.nodes[id].y + L.nodes[id].h));
  const sideTop = Math.min(L.nodes.x.y, L.nodes.y.y);
  assert.ok(sideTop - mainBottom <= 20 + 1, 'side chain within one row gap: ' + (sideTop - mainBottom));
});

test('header: one kit bar - picker title, counts, switches, one primary, menu above the canvas', () => {
  const engine = (p) => {
    if (!p) return { data: null };
    if (p === '/api/projects') return { data: { projects: [{ id: 'p', title: 'Proj' }, { id: 'q', title: 'Other' }] } };
    if (p.indexOf('/api/board') === 0) return { data: { nodes: [], edges: [], counts: { done: 45, ready: 2, total: 47 } } };
    return { data: null };
  };
  const CC = loadCC(['tokens.js', 'ui.js', 'check_counts.js', 'page_create.js'], { useEngine: engine, unpackBoard: (b) => b, api: { get() { return Promise.resolve({}); }, post() { return Promise.resolve({}); } } });
  const t = render(CC.h(CC.CreatePage));
  // One kit header: title (project picker), meta counts, view + filter switches, actions.
  const bars = findAll(t, hasClass('cc-ph'));
  assert.equal(bars.length, 1, 'one PageHeader');
  const kids = bars[0].props.children.filter((c) => c && typeof c === 'object');
  const order = kids.map((c) => (c.props.className || '').split(' ')[0]);
  assert.deepEqual(order.slice(0, 3), ['cc-ph-title', 'cc-ph-meta', 'cc-ph-mid'], order.join(','));
  assert.equal(textOf(findAll(t, hasClass('cc-ph-meta'))[0]), '45 done');
  assert.equal(findAll(findAll(t, hasClass('cc-ph-title'))[0], hasClass('cc-project')).length, 1, 'the picker is the title');
  assert.equal(bars[0].props['aria-label'], 'Execute: Proj', 'the toolbar label is text, not the picker');
  const act = findAll(t, hasClass('cc-ph-act'))[0];
  assert.equal(findAll(act, hasClass('cc-b-primary')).length, 1, 'one primary action');
  assert.equal(findAll(t, hasClass('cc-b-primary')).length, 1, 'and only one on the page');
  assert.equal(findAll(act, hasClass('cc-proj-more')).length, 1, 'project menu sits in the actions');
  const css = CC.createHelpers.STYLE;
  assert.match(rule(css, '.cc-root.cc-create .cc-ph'), /z-index:3/, 'header stacks above the canvas so the menu is not covered');
  assert.match(css, /@container \(max-width:980px\)\{\.cc-root\.cc-create \.cc-ph-meta\{display:none;\}\}/, 'narrow column drops the meta first');
});

test('Stars (regions): cross-lane links in --cc-line at full alpha', () => {
  const CC = loadCC(['tokens.js', 'layout_star.js', 'view_star.js']);
  const nodes = [N('a', [], { lane: 'one', status: 'ready' }), N('b', ['a'], { lane: 'two' }), N('c', ['a'], { lane: 'one' })];
  const t = render(CC.h(CC.StarView, { board: { nodes, edges: edgesOf(nodes) }, filter: 'all', onSelect() {}, labelMode: 'regions', edgeMode: 'active' }));
  const x = findAll(t, hasClass('cc-link-x'));
  assert.ok(x.length >= 1, 'a cross-lane link is drawn');
  assert.equal(x[0].props.strokeOpacity, 1);
  assert.equal(x[0].props.style.stroke, 'var(--cc-line)');
});

done('create_review2');
