// flow.test.mjs - layered flow layout: crossings, layering, orthogonal routing, view render.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, hasClass, textOf, test, done, REPO } from './harness.mjs';

const CC = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);

const N = (id, deps = [], extra = {}) => Object.assign({ id, title: 'Task ' + id, deps, status: 'not_started' }, extra);

// Fixture 1: planar chain feeding a diamond.
const planar = [N('A'), N('B', ['A']), N('C', ['B']), N('D', ['C']), N('E', ['D']), N('F', ['D']), N('G', ['E', 'F'])];
// Fixture 2: deliberately badly ordered DAG (input order forces crossings) plus long edges.
const crossed = [
  N('a'), N('b'), N('c'),
  N('x', ['c']), N('y', ['b']), N('z', ['a']),
  N('p', ['x', 'y']), N('q', ['z', 'x']), N('r', ['y']),
  N('s', ['a', 'p']), N('t', ['c', 'q', 'r'])
];
// Fixture 3: the real build plan graph.
// The plan lives in the Waypoint repo, not in the exported product tree: there the 40-node synthetic graph
// (same wave shape) stands in, so the suite still runs end to end.
const planPath = path.join(REPO, 'plans', 'build_plan.json');
const plan = fs.existsSync(planPath) ? JSON.parse(fs.readFileSync(planPath, 'utf8')) : null;
if (!plan) console.log('flow: plans/build_plan.json not found (exported tree); build_plan cases use the synthetic 40-node graph');
const planNodes = plan ? plan.nodes.map((n) => ({ id: n.id, title: n.title, deps: n.deps || [], status: 'not_started' }))
  : dag40().map((n) => Object.assign({}, n, { status: 'not_started' }));

// The board API sends the transitive reduction; lay that out too.
function reduce(nodes) {
  const deps = {}; nodes.forEach((n) => { deps[n.id] = n.deps; });
  const memo = {};
  const anc = (id) => memo[id] || (memo[id] = new Set((deps[id] || []).flatMap((d) => [d, ...anc(d)])));
  return nodes.map((n) => Object.assign({}, n, { deps: n.deps.filter((d) => !n.deps.some((o) => o !== d && anc(o).has(d))) }));
}
const fixtures = { planar, crossed, build_plan: planNodes, build_plan_reduced: reduce(planNodes) };
const results = {};

function edgesFromDeps(nodes) {
  const out = [];
  nodes.forEach((n) => (n.deps || []).forEach((d) => out.push([d, n.id])));
  return out;
}

for (const [name, nodes] of Object.entries(fixtures)) {
  test(`${name}: crossings <= naive order`, () => {
    const L = CC.layoutFlow(nodes, edgesFromDeps(nodes));
    results[name] = L;
    // Recount independently from the returned proper layers.
    const recount = CC.countCrossings(L.properLayers, L.properSucc);
    assert.equal(recount, L.crossings);
    assert.ok(L.crossings <= L.naiveCrossings, `${L.crossings} > naive ${L.naiveCrossings}`);
    console.log(`       ${name}: nodes=${nodes.length} layers=${L.layers.length} crossings=${L.crossings} naive=${L.naiveCrossings}`);
  });
  test(`${name}: edges are orthogonal, start at source port, end at target port`, () => {
    const L = results[name] || CC.layoutFlow(nodes, edgesFromDeps(nodes));
    assert.equal(L.edges.length, edgesFromDeps(nodes).length);
    for (const e of L.edges) {
      const pts = e.points;
      assert.ok(pts.length >= 2);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        assert.ok(x0 === x1 || y0 === y1, `diagonal segment in ${e.id}`);
        assert.ok(x1 >= x0, `edge ${e.id} runs backwards`);
      }
      const s = L.nodes[e.source], t = L.nodes[e.target];
      assert.deepEqual([...pts[0]], [s.x + s.w, s.cy]);
      assert.deepEqual([...pts[pts.length - 1]], [t.x, t.cy]);
    }
  });
  test(`${name}: no overlapping node boxes in a layer`, () => {
    const L = results[name];
    for (const lay of L.layers) {
      const boxes = lay.map((id) => L.nodes[id]).sort((a, b) => a.y - b.y);
      for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].y >= boxes[i - 1].y + boxes[i - 1].h, 'overlap');
    }
  });
}

test('planar chain/diamond fixture has 0 crossings', () => {
  assert.equal(results.planar.crossings, 0);
});
test('crossed fixture improves on naive order', () => {
  assert.ok(results.crossed.naiveCrossings > 0);
  assert.ok(results.crossed.crossings < results.crossed.naiveCrossings);
});
test('longest-path layering', () => {
  const L = results.planar;
  assert.deepEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => L.nodes[id].layer), [0, 1, 2, 3, 4, 4, 5]);
  const C = results.crossed;
  assert.equal(C.nodes.t.layer, 3);
  assert.equal(C.nodes.s.layer, 3);
});
test('chain is a straight line; diamond is symmetric', () => {
  const L = results.planar;
  ['B', 'C', 'D'].forEach((id) => assert.equal(L.nodes[id].cy, L.nodes.A.cy));
  assert.equal(L.nodes.G.cy, L.nodes.D.cy);
  assert.equal(L.nodes.E.cy + L.nodes.F.cy, 2 * L.nodes.D.cy);
});
test('deterministic and edge input formats agree', () => {
  const a = CC.layoutFlow(crossed, edgesFromDeps(crossed));
  const b = CC.layoutFlow(crossed, edgesFromDeps(crossed).map(([s, t]) => ({ source: s, target: t })));
  const c = CC.layoutFlow(crossed, null); // falls back to deps
  assert.equal(JSON.stringify(a.nodes), JSON.stringify(b.nodes));
  assert.equal(JSON.stringify(a.nodes), JSON.stringify(c.nodes));
});
test('cycles and unknown ids do not crash', () => {
  const L = CC.layoutFlow([N('a', ['c']), N('b', ['a']), N('c', ['b', 'ghost'])], null);
  assert.equal(Object.keys(L.nodes).length, 3);
});
test('120-node DAG lays out in under 1.5 s', () => {
  let r = 7;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const big = [];
  for (let i = 0; i < 120; i++) {
    const deps = [];
    for (let k = 0; k < 2 && i > 0; k++) { const d = 'n' + Math.floor(rnd() * i); if (!deps.includes(d)) deps.push(d); }
    big.push(N('n' + i, deps));
  }
  const t = Date.now();
  const L = CC.layoutFlow(big, null);
  const ms = Date.now() - t;
  console.log(`       random120: layers=${L.layers.length} crossings=${L.crossings} naive=${L.naiveCrossings} time=${ms}ms`);
  assert.ok(L.crossings <= L.naiveCrossings);
  assert.ok(ms < 1500, ms + 'ms');
});
test('roundedPath rounds corners', () => {
  const d = CC.roundedPath([[0, 0], [10, 0], [10, 20], [30, 20]], 6);
  assert.match(d, /^M0 0L5 0Q10 0 10 5L10 14Q10 20 16 20L30 20$/);
});
test('FlowView renders all nodes; filter only fades, layout unchanged', () => {
  const nodes = planar.map((n, i) => Object.assign({}, n, { status: i < 3 ? 'done' : i === 3 ? 'running' : 'not_started' }));
  const board = { nodes, edges: edgesFromDeps(nodes) };
  const all = render(CC.h(CC.FlowView, { board, filter: 'all', selected: 'D', onSelect() {} }));
  const comp = render(CC.h(CC.FlowView, { board, filter: 'completed', selected: 'D', onSelect() {} }));
  const gAll = findAll(all, hasClass('cc-node'));
  const gComp = findAll(comp, hasClass('cc-node'));
  assert.equal(gAll.length, 7);
  assert.equal(gComp.length, 7);
  assert.deepEqual(gAll.map((g) => g.props.transform), gComp.map((g) => g.props.transform));
  assert.equal(findAll(all, hasClass('cc-faded')).length, 0);
  assert.equal(gComp.filter(hasClass('cc-faded')).length, 4);
  assert.equal(findAll(all, hasClass('cc-sel')).length, 1);
  assert.equal(findAll(all, hasClass('cc-pulse')).length, 1, 'running node pulses');
  assert.equal(findAll(all, (n) => n.type === 'path' && hasClass('cc-edge')(n)).length, 7);
});

test('long edges share trunks: fan-out from one source and fan-in to one target', () => {
  // s feeds t1 and t2 three layers away; u1 and u2 both feed v two layers away.
  const g = [N('s'), N('a', ['s']), N('b', ['a']), N('t1', ['b', 's']), N('t2', ['b', 's']),
    N('u1'), N('u2'), N('w', ['u1']), N('v', ['w', 'u1', 'u2'])];
  const L = CC.layoutFlow(g, null);
  const pts = (id) => L.edges.find((e) => e.id === id).points.map((p) => p.join(','));
  const p1 = pts('s->t1'), p2 = pts('s->t2');
  // The trunk runs through the shared dummies at layers 1 and 2: identical until the last gap.
  const sharedOut = p1.findIndex((p, i) => p !== p2[i]);
  assert.ok(sharedOut >= 2, 'fan-out shares its first segments: ' + p1.join(' ') + ' | ' + p2.join(' '));
  const q1 = pts('u1->v').reverse(), q2 = pts('u2->v').reverse();
  const sharedIn = q1.findIndex((p, i) => p !== q2[i]);
  assert.ok(sharedIn >= 2, 'fan-in shares its last segments: ' + q1.join(' ') + ' | ' + q2.join(' '));
  const recount = CC.countCrossings(L.properLayers, L.properSucc);
  assert.equal(recount, L.crossings);
});
// Fit the 40-node build plan (and a generated 40-node DAG) into a 1100 x 700 canvas using the
// real camera fit from tokens.js, then check every node box lands inside the canvas.
function fitInto(C, L, vw, vh) {
  const cam = C.useCamera({ x: 0, y: 0, w: L.width, h: L.height }, 'fit-test-' + vw + 'x' + vh + '-' + L.width, { minFit: L.fitScale });
  cam.ref.current = { getBoundingClientRect: () => ({ width: vw, height: vh }) };
  cam.fit();
  return C.useCamera({ x: 0, y: 0, w: L.width, h: L.height }, 'fit-test-' + vw + 'x' + vh + '-' + L.width, { minFit: L.fitScale });
}
function dag40() {
  let r = 11;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const g = [];
  // 9 waves (like the build plan): each task depends on one or two tasks of the previous wave.
  const waves = [2, 3, 5, 8, 7, 7, 4, 2, 2];
  let prev = [];
  waves.forEach((size) => {
    const cur = [];
    for (let j = 0; j < size; j++) {
      const id = 'g' + g.length;
      const deps = [];
      for (let k = 0; k < 2 && prev.length; k++) { const d = prev[Math.floor(rnd() * prev.length)]; if (!deps.includes(d)) deps.push(d); }
      g.push(N(id, deps, { title: 'Generated task number ' + g.length }));
      cur.push(id);
    }
    prev = cur;
  });
  return g;
}
for (const [name, nodes] of [['build_plan', planNodes], ['build_plan_reduced', reduce(planNodes)], ['dag40', dag40()]]) {
  test(`${name}: fitted view at 1100x700 keeps cards >= 160 px and 11 px labels, panning instead of compressing`, () => {
    assert.equal(nodes.length, 40);
    const L = CC.layoutFlow(nodes, edgesFromDeps(nodes), { fitWidth: 1100, fitHeight: 700 });
    const c = fitInto(CC, L, 1100, 700);
    const margin = 8;
    assert.ok(Math.abs(c.k - L.fitScale) < 1e-9, `camera ${c.k} vs layout ${L.fitScale}`);
    assert.ok(12 * c.k >= 11 - 1e-9, `label renders at ${(12 * c.k).toFixed(2)} px`);
    assert.ok(L.nodeW >= 160 && L.nodeW <= 240, 'card width ' + L.nodeW);
    assert.equal(L.labelChars, Math.floor((L.nodeW - 24) / 6.1));
    const fitsH = L.height * c.k <= 700 - 2 * 24 + 1e-6;
    for (const [id, p] of Object.entries(L.nodes)) {
      const x0 = c.x + p.x * c.k, x1 = c.x + (p.x + p.w) * c.k;
      const y0 = c.y + p.y * c.k, y1 = c.y + (p.y + p.h) * c.k;
      assert.ok(x0 >= margin, `${id} starts left of the canvas: ${x0.toFixed(1)}`);
      if (!L.panX) assert.ok(x1 <= 1100 - margin, `${id} off canvas horizontally: ${x1.toFixed(1)}`);
      if (fitsH) assert.ok(y0 >= margin && y1 <= 700 - margin, `${id} off canvas vertically: ${y0.toFixed(1)}..${y1.toFixed(1)}`);
    }
    if (L.panX) assert.ok(L.width * c.k > 1100 - 48, 'panX only when the graph is wider than the canvas');
    console.log(`       ${name}: layers=${L.layers.length} nodeW=${L.nodeW} gap=${L.gapX} chars=${L.labelChars} lines=${L.lines} k=${c.k.toFixed(3)} panX=${L.panX}`);
  });
}
test('wide canvas keeps full 18-char labels and roomy gaps', () => {
  const L = CC.layoutFlow(planNodes, edgesFromDeps(planNodes), { fitWidth: 2400, fitHeight: 900 });
  assert.ok(L.labelChars >= 18, 'label budget ' + L.labelChars);
  assert.ok(L.nodeW <= 240);
  assert.equal(L.gapX, 56);
  assert.equal(L.fitScale, 1);
  assert.equal(L.panX, false);
});
test('FlowView: fit floor is the layout scale, labels truncated to the layout budget, meta hidden when tiny', () => {
  const C2 = loadCC(['tokens.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);
  let opts = null, k = 1;
  const real = C2.useCamera;
  C2.useCamera = (b, key, o) => { opts = o; const c = real(b, key, o); return Object.assign({}, c, { k }); };
  const board = { nodes: planNodes, edges: edgesFromDeps(planNodes) };
  const tree = render(C2.h(C2.FlowView, { board, filter: 'all', onSelect() {} }));
  const L0 = C2.layoutFlow(board.nodes, board.edges, { fitWidth: 0, fitHeight: 0 });
  assert.equal(opts.minFit, L0.fitScale, 'the fit floor is the layout scale');
  const labels = findAll(tree, hasClass('cc-t-label')).map(textOf);
  assert.equal(labels.length, 40);
  assert.ok(labels.every((t) => t.length <= L0.labelChars), 'labels within the layout budget');
  const titles = findAll(tree, (n) => n.type === 'title').map(textOf);
  assert.ok(titles.some((t) => t.length > 30), 'full titles kept for hover');
  assert.equal(findAll(tree, hasClass('cc-t-meta')).length, 40);
  k = 0.7; // 11 px meta would render at 7.7 px
  const small = render(C2.h(C2.FlowView, { board, filter: 'all', onSelect() {} }));
  assert.equal(findAll(small, hasClass('cc-t-meta')).length, 0);
  assert.equal(findAll(small, hasClass('cc-t-label')).length, 40);
});

done('flow');
