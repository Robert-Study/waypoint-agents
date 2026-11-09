// waves.test.mjs - wave grouping, current wave, filters, list render.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const CC = loadCC(['tokens.js', 'waves.js', 'view_waves.js']);
const json = (x) => JSON.parse(JSON.stringify(x));

const nodes = [
  { id: 'A', deps: [], status: 'done' },
  { id: 'B', deps: ['A'], status: 'done' },
  { id: 'C', deps: ['A'], status: 'running' },
  { id: 'D', deps: ['B', 'C'], status: 'not_started' },
  { id: 'E', deps: ['D'], status: 'not_started' },
  { id: 'F', deps: [], status: 'done' }
];

test('waves computed from deps (longest path)', () => {
  const g = CC.groupWaves(nodes);
  assert.deepEqual(json(g.waves.map((w) => [w.wave, w.nodes.map((n) => n.id)])), [[0, ['A', 'F']], [1, ['B', 'C']], [2, ['D']], [3, ['E']]]);
  assert.deepEqual(json(g.waves.map((w) => [w.done, w.total])), [[2, 2], [1, 2], [0, 1], [0, 1]]);
});
test('current wave = lowest wave with unfinished nodes', () => {
  assert.equal(CC.groupWaves(nodes).current, 1);
  const later = nodes.map((n) => Object.assign({}, n, { status: ['A', 'B', 'C', 'F'].includes(n.id) ? 'done' : n.status }));
  assert.equal(CC.groupWaves(later).current, 2);
});
test('non-strict waves: a ready node in a later wave does not move the current wave', () => {
  const g = CC.groupWaves(nodes.map((n) => (n.id === 'E' ? Object.assign({}, n, { status: 'running' }) : n)));
  assert.equal(g.current, 1);
});
test('submitted and error count as unfinished; all done -> null', () => {
  assert.equal(CC.groupWaves([{ id: 'x', status: 'submitted' }]).current, 0);
  assert.equal(CC.groupWaves([{ id: 'x', status: 'done' }, { id: 'y', deps: ['x'], status: 'error' }]).current, 1);
  assert.equal(CC.groupWaves(nodes.map((n) => Object.assign({}, n, { status: 'done' }))).current, null);
});
test('engine-supplied wave wins over computed depth; display_status respected', () => {
  const g = CC.groupWaves([{ id: 'a', wave: 2, status: 'not_started', display_status: 'ready' }, { id: 'b', wave: 0, status: 'done' }]);
  assert.deepEqual(g.waves.map((w) => w.wave), [0, 2]);
  assert.equal(g.current, 2);
  assert.equal(CC.statusOf(g.waves[1].nodes[0]), 'ready');
});
test('matchesFilter semantics', () => {
  const d = { status: 'done' }, r = { status: 'running' };
  assert.deepEqual([CC.matchesFilter(d, 'all'), CC.matchesFilter(d, 'active'), CC.matchesFilter(d, 'completed')], [true, false, true]);
  assert.deepEqual([CC.matchesFilter(r, 'all'), CC.matchesFilter(r, 'active'), CC.matchesFilter(r, 'completed')], [true, true, false]);
});
test('cycles do not hang', () => {
  const g = CC.groupWaves([{ id: 'a', deps: ['b'] }, { id: 'b', deps: ['a'] }]);
  assert.equal(g.waves.reduce((s, w) => s + w.total, 0), 2);
});
test('WavesView: sections per wave, current marked, filter hides rows', () => {
  const tree = render(CC.h(CC.WavesView, { board: { nodes }, filter: 'all', selected: 'C', onSelect() {} }));
  const secs = findAll(tree, (n) => n.type === 'section');
  assert.equal(secs.length, 4);
  const cur = secs.filter(hasClass('cc-wave-cur'));
  assert.equal(cur.length, 1);
  assert.match(textOf(cur[0]), /Wave 2/);
  assert.match(textOf(cur[0]), /1 of 2 done/);
  assert.equal(findAll(tree, hasClass('cc-row')).length, 6);
  assert.equal(findAll(tree, (n) => hasClass('cc-row')(n) && hasClass('cc-sel')(n)).length, 1);
  const act = render(CC.h(CC.WavesView, { board: { nodes }, filter: 'active', onSelect() {} }));
  assert.equal(findAll(act, hasClass('cc-row')).length, 3);
  assert.equal(findAll(act, (n) => n.type === 'section').length, 3, 'fully completed wave hidden under Active');
});
test('WavesView row click calls onSelect with the id', () => {
  let got = null;
  const tree = render(CC.h(CC.WavesView, { board: { nodes }, onSelect: (id) => { got = id; } }));
  const row = findAll(tree, (n) => hasClass('cc-row')(n) && n.props['data-id'] === 'D')[0];
  row.props.onClick();
  assert.equal(got, 'D');
});

done('waves');
