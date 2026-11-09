// stars_fit.test.mjs - Create's Stars view fits its hulls to ~85% of the canvas (review: "Stars uses about
// 30% of the canvas"), keeps the camera across filter changes, and names regions in title case
// (review: "Lane hull labels are raw lowercase ids"). Brain (no regions/fill) keeps its layout unscaled.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const lanes = { ui: 'U', engine: 'E', integration: 'I' };
const sizes = { ui: 18, engine: 28, integration: 6 };
const nodes = [];
const edges = [];
Object.keys(lanes).forEach((lane) => {
  for (let i = 0; i < sizes[lane]; i++) {
    nodes.push({ id: lanes[lane] + i, title: lanes[lane] + i, lane, status: 'done', display_status: 'done' });
    if (i) edges.push([lanes[lane] + (i - 1), lanes[lane] + i]);
  }
});
edges.push(['U3', 'I1'], ['E5', 'I2'], ['E9', 'U10']);
const board = { nodes, edges };

function load(view) {
  const CC = loadCC(['tokens.js', 'check_counts.js', 'layout_star.js', 'view_star.js']);
  const fakeEl = { getBoundingClientRect: () => ({ width: view.w, height: view.h }) };
  const bounds = [];
  CC.React.useRef = () => ({ current: fakeEl });
  // The real camera's automatic fit: never above 1:1, centred, 24 px of margin.
  CC.useCamera = (b, key) => {
    bounds.push(b);
    const k = Math.max(0.1, Math.min(1, (view.w - 48) / b.w, (view.h - 48) / b.h));
    return {
      ref: { current: fakeEl }, k,
      x: (view.w - b.w * k) / 2 - b.x * k, y: (view.h - b.h * k) / 2 - b.y * k,
      wasDrag: () => false, onPointerDown() {}, onKeyDown() {}
    };
  };
  return { CC, bounds };
}
const create = { labelMode: 'regions', edgeMode: 'active' };
const draw = (CC, props) => render(CC.h(CC.StarView, Object.assign({ board, filter: 'all', onSelect() {} }, props)));

// Screen-space box of every hull, including the padding the stroke adds on each side.
function hullBox(tree) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  findAll(tree, hasClass('cc-hull')).forEach((p) => {
    const pad = p.props.strokeWidth / 2;
    (p.props.d.match(/-?\d+(\.\d+)?/g) || []).reduce((acc, v, i, all) => {
      if (i % 2) return acc;
      const x = +v, y = +all[i + 1];
      x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad);
      return acc;
    }, 0);
  });
  return { w: x1 - x0, h: y1 - y0, x0, y0, x1, y1 };
}

test('clusterLabel: title case, known acronyms uppercase, authored casing kept', () => {
  const { CC } = load({ w: 800, h: 600 });
  const f = CC.clusterLabel;
  assert.equal(f('ui'), 'UI');
  assert.equal(f('engine'), 'Engine');
  assert.equal(f('integration'), 'Integration');
  assert.equal(f('docs'), 'Docs');
  assert.equal(f('api'), 'API');
  assert.equal(f('data_prep'), 'Data Prep');
  assert.equal(f('self-improving base'), 'Self-Improving Base');
  assert.equal(f('iOS'), 'iOS');
  assert.equal(f(''), '');
});

test('Stars region names are title case', () => {
  const { CC } = load({ w: 1160, h: 800 });
  const names = findAll(draw(CC, create), hasClass('cc-t-cluster')).map(textOf).sort();
  assert.deepEqual(names, ['Engine', 'Integration', 'UI']);
});

[[1160, 800], [1160, 700], [740, 600], [1500, 900]].forEach(([w, h]) => {
  test('hulls fill ~85% of the canvas at ' + w + 'x' + h, () => {
    const { CC } = load({ w, h });
    const box = hullBox(draw(CC, create));
    const share = Math.max(box.w / w, box.h / h);
    assert.ok(share >= 0.8 && share <= 0.9, 'binding side uses ' + share.toFixed(2));
    assert.ok(box.w <= w * 0.9 && box.h <= h * 0.9, 'both sides stay inside the canvas');
    assert.ok(box.x0 > 0 && box.y0 > 0 && box.x1 < w && box.y1 < h, 'fully on canvas');
    assert.ok(Math.abs((box.x0 + box.x1) / 2 - w / 2) < 6 && Math.abs((box.y0 + box.y1) / 2 - h / 2) < 6, 'centred');
  });
});

test('the old layout used well under half the canvas (guards the regression)', () => {
  const { CC } = load({ w: 1160, h: 800 });
  const box = hullBox(draw(CC, Object.assign({ fill: false }, create)));
  assert.ok(Math.max(box.w / 1160, box.h / 800) < 0.6, 'unfilled share ' + (box.h / 800).toFixed(2));
});

test('F re-fits to the same 85%: the bounds the camera fits do not move with filters or selection', () => {
  const { CC, bounds } = load({ w: 1160, h: 800 });
  const base = hullBox(draw(CC, create));
  ['active', 'completed', 'all'].forEach((filter) => {
    const b = hullBox(draw(CC, Object.assign({ filter, selected: 'E3' }, create)));
    assert.deepEqual(b, base, 'hulls identical under filter ' + filter);
  });
  assert.ok(bounds.length > 1 && bounds.every((b) => JSON.stringify(b) === JSON.stringify(bounds[0])), 'camera bounds identical across filters');
});

test('a larger canvas scales the layout; a tiny project is capped, a huge one is never shrunk below 1', () => {
  const { CC } = load({ w: 800, h: 600 });
  assert.equal(CC.starFillScale({ w: 100, h: 100 }, { w: 1160, h: 800 }), 2.5);
  assert.equal(CC.starFillScale({ w: 5000, h: 5000 }, { w: 1160, h: 800 }), 1);
  assert.equal(CC.starFillScale({ w: 0, h: 0 }, { w: 1160, h: 800 }), 1);
  const s = CC.starFillScale({ w: 400, h: 330 }, { w: 1160, h: 800 });
  assert.ok(s > 1.7 && s < 2.1, 'got ' + s);
});

test('Brain constellation (no regions, no fill) keeps its unscaled layout and bounds', () => {
  const { CC, bounds } = load({ w: 1160, h: 800 });
  const tree = draw(CC, { labelMode: 'budget' });
  const raw = CC.layoutStar(nodes, edges, 7);
  assert.deepEqual(bounds[0], CC.starBounds(raw, 60));
  assert.deepEqual(findAll(tree, hasClass('cc-t-cluster')).map(textOf).sort(), ['Engine', 'Integration', 'UI']);
});

done('stars_fit');
