// constellation.test.mjs - seeded star layout: determinism, clustering, hulls, view render.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const CC = loadCC(['tokens.js', 'layout_star.js', 'view_star.js']);

const clusters = ['UI & design', 'Models & budget', 'Orchestration', 'Dashboard'];
const nodes = [];
const links = [];
for (let i = 0; i < 48; i++) {
  const c = clusters[i % clusters.length];
  nodes.push({ id: 'n' + String(i).padStart(2, '0'), label: 'Note ' + i, cluster: c, weight: 1 + (i % 5), provenance: i % 3 ? 'inherited_registry' : 'explicit_user_statement' });
  if (i >= clusters.length) links.push({ source: 'n' + String(i).padStart(2, '0'), target: 'n' + String(i - clusters.length).padStart(2, '0') });
}
links.push({ source: 'n00', target: 'n01' }, { source: 'n05', target: 'n10' });

const json = (x) => JSON.stringify(x);

test('same seed -> identical positions', () => {
  const a = CC.layoutStar(nodes, links, 42);
  const b = CC.layoutStar(nodes, links, 42);
  assert.equal(json(a), json(b));
  assert.equal(Object.keys(a).length, nodes.length);
});
test('input order does not matter', () => {
  const a = CC.layoutStar(nodes, links, 42);
  const b = CC.layoutStar(nodes.slice().reverse(), links.slice().reverse(), 42);
  assert.equal(json(a), json(b));
});
test('string seeds are deterministic too; different seeds differ', () => {
  assert.equal(json(CC.layoutStar(nodes, links, 'brain')), json(CC.layoutStar(nodes, links, 'brain')));
  assert.notEqual(json(CC.layoutStar(nodes, links, 1)), json(CC.layoutStar(nodes, links, 2)));
});
test('positions finite and nodes not stacked', () => {
  const p = CC.layoutStar(nodes, links, 3);
  const pts = Object.values(p);
  pts.forEach((q) => assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y)));
  let minD = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) minD = Math.min(minD, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  console.log('       min pair distance ' + minD.toFixed(1));
  assert.ok(minD > 6, 'nodes overlap');
});
test('clusters are spatially grouped', () => {
  const p = CC.layoutStar(nodes, links, 3);
  let intra = 0, ni = 0, inter = 0, ne = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(p[nodes[i].id].x - p[nodes[j].id].x, p[nodes[i].id].y - p[nodes[j].id].y);
      if (nodes[i].cluster === nodes[j].cluster) { intra += d; ni++; } else { inter += d; ne++; }
    }
  }
  console.log(`       mean intra=${(intra / ni).toFixed(1)} inter=${(inter / ne).toFixed(1)}`);
  assert.ok(intra / ni < inter / ne);
});
test('hulls: one per cluster, convex polygon around members', () => {
  const p = CC.layoutStar(nodes, links, 3);
  const hulls = CC.clusterHulls(nodes, p);
  assert.equal(hulls.length, clusters.length);
  hulls.forEach((hl) => { assert.ok(hl.points.length >= 3); assert.equal(hl.size, 12); });
});
test('empty and degenerate inputs', () => {
  assert.equal(json(CC.layoutStar([], [], 1)), '{}');
  const one = CC.layoutStar([{ id: 'x' }], [{ source: 'x', target: 'ghost' }], 1);
  assert.ok(Number.isFinite(one.x.x));
});
test('500 nodes lay out in under 3 s', () => {
  const big = [];
  for (let i = 0; i < 500; i++) big.push({ id: 'b' + i, cluster: 'c' + (i % 7) });
  const t = Date.now();
  CC.layoutStar(big, big.slice(7).map((n, i) => ({ source: n.id, target: big[i].id })), 9);
  const ms = Date.now() - t;
  console.log('       500 nodes: ' + ms + 'ms');
  assert.ok(ms < 3000);
});
test('StarView renders; filter only fades; labels within budget, selected labelled', () => {
  const st = ['done', 'running', 'ready', 'error', 'not_started', 'needs_you'];
  const board = { nodes: nodes.slice(0, 12).map((n, i) => Object.assign({}, n, { status: st[i % st.length], title: n.label })), edges: links.slice(0, 8) };
  const all = render(CC.h(CC.StarView, { board, filter: 'all', selected: 'n01', onSelect() {} }));
  const act = render(CC.h(CC.StarView, { board, filter: 'active', selected: 'n01', onSelect() {} }));
  const gA = findAll(all, hasClass('cc-node')), gB = findAll(act, hasClass('cc-node'));
  assert.equal(gA.length, 12);
  assert.deepEqual(gA.map((g) => g.props.transform), gB.map((g) => g.props.transform));
  assert.equal(gB.filter(hasClass('cc-faded')).length, 2);
  assert.equal(findAll(all, hasClass('cc-hull')).length, 4);
  assert.equal(findAll(all, hasClass('cc-t-cluster')).length, 4);
  const labels = findAll(all, hasClass('cc-t-label'));
  assert.ok(labels.length >= 1 && labels.length <= 12, labels.length + ' labels');
  const top = findAll(all, hasClass('cc-top-labels'))[0];
  assert.equal(textOf(top), 'Note 1', 'selected label drawn on top');
  assert.equal(findAll(all, hasClass('cc-pulse')).length, 2);
});

// A brain-sized fixture: 14 clusters, 186 nodes, mostly cross-cluster links, weight 1 dominant.
const brainNodes = [];
const brainLinks = [];
const sizes = [12, 20, 10, 9, 18, 8, 12, 7, 7, 4, 8, 32, 29, 10];
let seedR = 11;
const rnd = () => { seedR = (seedR * 16807) % 2147483647; return seedR / 2147483647; };
const prov = ['explicit_user_statement', 'inherited_registry', 'vetted_source', 'agent_synthesis', null];
sizes.forEach((m, c) => {
  for (let i = 0; i < m; i++) {
    const w = rnd() < 0.8 ? 1 : 1 + Math.floor(rnd() * 5);
    brainNodes.push({ id: 'c' + c + '-' + i, title: 'A fairly long preference title number ' + c + '-' + i, cluster: 'Cluster ' + c, weight: w, provenance: prov[(c + i) % prov.length] });
  }
});
for (let k = 0; k < 500; k++) {
  const a = brainNodes[Math.floor(rnd() * brainNodes.length)], b = brainNodes[Math.floor(rnd() * brainNodes.length)];
  if (a !== b) brainLinks.push({ source: a.id, target: b.id });
}

test('clusters never overlap: members of different clusters keep a clear gap', () => {
  const p = CC.layoutStar(brainNodes, brainLinks, 11);
  let minInter = Infinity;
  for (let i = 0; i < brainNodes.length; i++) {
    for (let j = i + 1; j < brainNodes.length; j++) {
      if (brainNodes[i].cluster === brainNodes[j].cluster) continue;
      const a = p[brainNodes[i].id], b = p[brainNodes[j].id];
      minInter = Math.min(minInter, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  console.log('       min distance across clusters ' + minInter.toFixed(1));
  assert.ok(minInter >= 100, 'clusters too close: ' + minInter);
  const b = CC.starBounds(p, 60);
  console.log('       bounds ' + b.w.toFixed(0) + ' x ' + b.h.toFixed(0));
  assert.ok(b.w > b.h, 'arrangement should be wider than tall');
});

function fitCamera(view) {
  return (bounds) => {
    const k = Math.max(0.1, Math.min(1, (view.w - 48) / bounds.w, (view.h - 48) / bounds.h)) * (view.zoom || 1);
    return {
      ref: { current: { getBoundingClientRect: () => ({ width: view.w, height: view.h }) } },
      k, x: view.w / 2 - (bounds.x + bounds.w / 2) * k, y: view.h / 2 - (bounds.y + bounds.h / 2) * k,
      wasDrag: () => false, onPointerDown() {}, onKeyDown() {}
    };
  };
}
// Rebuild node label boxes from the rendered tree and count pairwise overlaps.
function labelOverlaps(tree) {
  const boxes = findAll(tree, hasClass('cc-node')).map((g) => {
    const t = findAll(g, hasClass('cc-t-label'))[0];
    if (!t) return null;
    const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(g.props.transform);
    const x = +m[1] + t.props.x, y = +m[2];
    const w = textOf(t).length * 6.6;
    return t.props.textAnchor === 'end' ? [x - w, y - 7, x, y + 7] : [x, y - 7, x + w, y + 7];
  }).filter(Boolean);
  let n = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) n++;
    }
  }
  return { count: boxes.length, overlaps: n };
}
function renderBrain(view, hovered) {
  const C2 = loadCC(['tokens.js', 'layout_star.js', 'view_star.js']);
  C2.useCamera = fitCamera(view);
  if (hovered) C2.React.useState = () => [hovered, () => {}];
  return render(C2.h(C2.StarView, { board: { nodes: brainNodes, links: brainLinks }, filter: 'all', onSelect() {} }));
}

test('fit zoom: cluster names plus at most 12 node labels, none overlapping, all <= 28 chars', () => {
  const tree = renderBrain({ w: 1134, h: 715 });
  const res = labelOverlaps(tree);
  console.log('       fit: ' + res.count + ' node labels, ' + res.overlaps + ' overlaps');
  assert.ok(res.count >= 6 && res.count <= 12, res.count + ' labels at fit');
  assert.equal(res.overlaps, 0);
  assert.equal(findAll(tree, hasClass('cc-t-cluster')).length, sizes.length);
  findAll(tree, hasClass('cc-t-label')).forEach((t) => assert.ok(textOf(t).length <= 28, textOf(t)));
});
test('zooming in reveals more labels, still without overlaps', () => {
  const res = labelOverlaps(renderBrain({ w: 1134, h: 715, zoom: 2.5 }));
  console.log('       zoom 2.5x: ' + res.count + ' node labels, ' + res.overlaps + ' overlaps');
  assert.ok(res.count > 12, 'more labels when zoomed in');
  assert.equal(res.overlaps, 0);
});
test('hover shows the full title on top without reshuffling other labels', () => {
  const target = brainNodes[40].id;
  const before = renderBrain({ w: 1134, h: 715 });
  const after = renderBrain({ w: 1134, h: 715 }, target);
  assert.equal(textOf(findAll(after, hasClass('cc-top-labels'))[0]), brainNodes[40].title);
  const keep = (t) => findAll(t, hasClass('cc-node')).filter((g) => g.props['data-id'] !== target)
    .map((g) => g.props['data-id'] + ':' + textOf(findAll(g, hasClass('cc-t-label'))));
  assert.deepEqual(keep(before), keep(after));
});
test('label planner: priority order, collision rejection, budget, forced labels', () => {
  const items = [
    { id: 'a', x: 100, y: 100, text: 'Alpha label' },
    { id: 'b', x: 105, y: 102, text: 'Beta label' }, // collides on the right, flips left
    { id: 'c', x: 102, y: 101, text: 'Gamma label' }, // collides on both sides: rejected
    { id: 'd', x: 400, y: 300, text: 'Delta' },
    { id: 'e', x: 5000, y: 300, text: 'Off screen' },
    { id: 'f', x: 600, y: 300, text: 'Over budget' }
  ];
  const out = CC.planStarLabels(items, [], 3, { w: 1000, h: 600 });
  assert.ok(out.a && out.a.side === 1);
  assert.ok(out.b && out.b.side === -1);
  assert.ok(!out.c);
  assert.ok(out.d);
  assert.ok(!out.e && !out.f);
  const forced = CC.planStarLabels([{ id: 'z', x: 10, y: 10, text: 'Forced', force: true }].concat(items), [{ x0: 0, x1: 2000, y0: 0, y1: 2000 }], 0, { w: 1000, h: 600 });
  assert.deepEqual(Object.keys(forced), ['z']);
});
test('low-provenance dots are smaller than explicit statements', () => {
  const hi = CC.starDotRadius({ weight: 1, provenance: 'explicit_user_statement' });
  const lo = CC.starDotRadius({ weight: 1, provenance: 'agent_synthesis' });
  const heavy = CC.starDotRadius({ weight: 9, provenance: 'explicit_user_statement' });
  assert.ok(lo < hi && hi < heavy, [lo, hi, heavy].join(' '));
});

done('constellation');
