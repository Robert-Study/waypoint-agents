// stars_focus.test.mjs - C1: Create's Stars view labels regions, not every dot, and draws only the
// dependencies into and out of ready or running tasks (plus the selected task's own). Filters and
// status changes never move the camera or the dots.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const lanes = ['engine', 'ui', 'docs'];
// A small project: chain per lane plus a few cross-lane deps.
const nodes = [];
const edges = [];
const status = {
  E0: 'done', E1: 'done', E2: 'running', E3: 'not_started', E4: 'not_started',
  U0: 'done', U1: 'ready', U2: 'not_started', U3: 'not_started',
  D0: 'not_started', D1: 'not_started', D2: 'not_started'
};
Object.keys(status).forEach((id) => {
  const lane = { E: 'engine', U: 'ui', D: 'docs' }[id[0]];
  nodes.push({ id, title: 'Task ' + id + ' with a fairly long title', lane, status: status[id] === 'ready' ? 'not_started' : status[id], display_status: status[id] });
});
[['E0', 'E1'], ['E1', 'E2'], ['E2', 'E3'], ['E3', 'E4'], ['U0', 'U1'], ['U1', 'U2'], ['U2', 'U3'],
  ['D0', 'D1'], ['D1', 'D2'], ['E4', 'D0'], ['U3', 'D2'], ['E1', 'U2']].forEach((e) => edges.push(e));
const board = { nodes, edges };
const hot = new Set(['E2', 'U1']);
const expected = (sel) => edges.filter((e) => hot.has(e[0]) || hot.has(e[1]) || e[0] === sel || e[1] === sel)
  .map((e) => e.join('>')).sort();

function fitCamera(view) {
  return (bounds) => {
    const k = Math.max(0.1, Math.min(1, (view.w - 48) / bounds.w, (view.h - 48) / bounds.h));
    return {
      ref: { current: { getBoundingClientRect: () => ({ width: view.w, height: view.h }) } },
      k, x: view.w / 2 - (bounds.x + bounds.w / 2) * k, y: view.h / 2 - (bounds.y + bounds.h / 2) * k,
      wasDrag: () => false, onPointerDown() {}, onKeyDown() {}, bounds
    };
  };
}
function load(hovered) {
  const CC = loadCC(['tokens.js', 'check_counts.js', 'layout_star.js', 'view_star.js']);
  const cams = [];
  const fit = fitCamera({ w: 1100, h: 700 });
  CC.useCamera = (bounds, key) => { const c = fit(bounds); cams.push({ bounds, key }); return c; };
  if (hovered !== undefined) CC.React.useState = (init) => [typeof init === 'function' ? init() : (init === null ? hovered : init), () => {}];
  return { CC, cams };
}
const focus = { labelMode: 'regions', edgeMode: 'active' };
function draw(CC, props) {
  return render(CC.h(CC.StarView, Object.assign({ board, filter: 'all', onSelect() {} }, focus, props || {})));
}
const linkIds = (tree) => findAll(tree, hasClass('cc-link')).map((l) => l.props['data-edge']).sort();
const nodeLabels = (tree) => findAll(tree, hasClass('cc-node')).flatMap((g) => findAll(g, hasClass('cc-t-label')));

test('regions mode: one name per region and no per-dot labels', () => {
  const { CC } = load();
  const tree = draw(CC);
  assert.equal(findAll(tree, hasClass('cc-t-cluster')).length, lanes.length);
  assert.deepEqual(findAll(tree, hasClass('cc-t-cluster')).map(textOf).sort(), ['Docs', 'Engine', 'UI']); // title case (stars_fit.test.mjs)
  assert.equal(nodeLabels(tree).length, 0, 'no dot carries a label');
  assert.equal(textOf(findAll(tree, hasClass('cc-top-labels'))[0]), '');
});

test('selected task is labelled; hovered task shows its full title', () => {
  const { CC } = load();
  const sel = draw(CC, { selected: 'U2' });
  assert.equal(textOf(findAll(sel, hasClass('cc-top-labels'))[0]), 'Task U2 with a fairly long title');
  assert.equal(nodeLabels(sel).length, 0);
  const hov = load('D1');
  const tree = draw(hov.CC);
  assert.equal(textOf(findAll(tree, hasClass('cc-top-labels'))[0]), 'Task D1 with a fairly long title');
});

test('only edges into and out of ready or running tasks are drawn', () => {
  const { CC } = load();
  const got = linkIds(draw(CC));
  assert.deepEqual(got, expected(null));
  assert.ok(got.includes('E1>E2') && got.includes('E2>E3') && got.includes('U0>U1') && got.includes('U1>U2'));
  assert.ok(!got.includes('D0>D1') && !got.includes('E4>D0'));
});

test('the selected task adds its own edges', () => {
  const { CC } = load();
  const got = linkIds(draw(CC, { selected: 'D1' }));
  assert.deepEqual(got, expected('D1'));
  assert.ok(got.includes('D0>D1') && got.includes('D1>D2'));
  findAll(draw(CC, { selected: 'D1' }), hasClass('cc-link')).forEach((l) => {
    const sel = l.props['data-edge'].split('>').includes('D1');
    assert.equal(hasClass('cc-edge-sel')(l), sel);
  });
});

test('dots and camera bounds never move with filter, status or focus', () => {
  const a = load(), b = load(), c = load();
  const t1 = draw(a.CC, { filter: 'all' });
  const t2 = draw(b.CC, { filter: 'completed', selected: 'E3' });
  const moved = JSON.parse(JSON.stringify(board));
  moved.nodes.forEach((n) => { n.status = 'done'; n.display_status = 'done'; });
  const t3 = render(c.CC.h(c.CC.StarView, Object.assign({ board: moved, filter: 'active', onSelect() {} }, focus)));
  const pos = (t) => findAll(t, hasClass('cc-node')).map((g) => g.props['data-id'] + g.props.transform);
  assert.deepEqual(pos(t1), pos(t2));
  assert.deepEqual(pos(t1), pos(t3));
  assert.equal(JSON.stringify(a.cams[0].bounds), JSON.stringify(b.cams[0].bounds));
  assert.equal(JSON.stringify(a.cams[0].bounds), JSON.stringify(c.cams[0].bounds));
  assert.equal(linkIds(t3).length, 0, 'nothing ready or running: no dependency lines');
});

test('default (Brain) mode is unchanged: every link drawn, budgeted dot labels', () => {
  const { CC } = load();
  const tree = render(CC.h(CC.StarView, { board, filter: 'all', onSelect() {} }));
  assert.equal(findAll(tree, hasClass('cc-link')).length, edges.length);
  assert.ok(nodeLabels(tree).length >= 1);
});

test('Create asks Stars for regions and active edges; a claimed task names who is on it', () => {
  const PC = loadCC(['tokens.js', 'check_counts.js', 'layout_star.js', 'view_star.js', 'page_create.js']);
  const vp = PC.createHelpers.viewProps('star');
  assert.equal(vp.labelMode, 'regions');
  assert.equal(vp.edgeMode, 'active');
  assert.equal(JSON.stringify(PC.createHelpers.viewProps('flow')), '{}');
  PC.useCamera = fitCamera({ w: 1100, h: 700 });
  const claimed = JSON.parse(JSON.stringify(board));
  claimed.nodes[2].claim = { by: 'lead-session', worktree: 'wt-c', stale: false };
  const tree = render(PC.h(PC.StarView, Object.assign({ board: claimed, filter: 'all', onSelect() {} }, vp)));
  const g = findAll(tree, (n) => n.props && n.props['data-id'] === 'E2')[0];
  assert.match(textOf(findAll(g, (n) => n.type === 'title')[0]), /lead-session/);
});

done('stars_focus');
