// tab_projects.test.mjs - CC.ProjectsTab: projects by family, version picker, task graph, node panel (dsh-v2 t-projects).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCC, render, textOf, findAll, hasClass } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const PROJECTS = [
  { id: 'demo-v1', title: 'Demo one', family: 'demo', version: 1, version_label: 'v1', archived: true },
  { id: 'demo-v3', title: 'Demo three', family: 'demo', version: 3, version_label: 'v3', archived: false },
  { id: 'demo-v2', title: 'Demo two', family: 'demo', version: 2, version_label: 'v2', archived: false },
  { id: 'solo', title: 'Solo', family: null, version: 1, archived: false },
  { id: 'old-only', title: 'Old only', family: 'old', version: 1, archived: true }
];
const NODES = [
  { id: 'A', title: 'Start', status: 'done', deps: [], claim: null, needs: [] },
  { id: 'B', title: 'Left branch', status: 'running', deps: ['A'], claim: { owner: 'Alex', claimed_by: 'worker-1', since: '2026-11-08T10:00:00Z' }, needs: [] },
  { id: 'C', title: 'Right branch', status: 'needs_you', deps: ['A'], claim: null,
    needs: [{ id: 'q1', node: 'C', problem: 'Pick a model', resolution: 'Use the small one' }] },
  { id: 'D', title: 'Join', status: 'pending', kind: 'hands_on', deps: ['B', 'C'], claim: null, needs: [],
    goal: 'Ship the join', check: { type: 'command', command: 'npm test' }, evidence: 'tests pass' }
];

function load(reads) {
  const CC = loadCC(['tokens.js', 'ui.js', 'wpc_client.js', 'tab_projects.js']);
  CC.useWpc = (tool, input) => {
    const key = input && input.project ? input.project : '';
    const r = reads(key);
    return Object.assign({ data: null, error: null, loading: false, reload: () => {} }, r);
  };
  return CC;
}
const boards = (key) => key ? { data: { project: { id: key }, nodes: key === 'demo-v3' ? NODES : [], todos: [], needs: [] } }
  : { data: { projects: PROJECTS, todos: [], needs: [] } };

test('projects: families group versions newest active first, archived hidden by default', () => {
  const CC = load(boards);
  const I = CC.projectsTabInternals;
  const fams = I.groupFamilies(PROJECTS, false);
  assert.deepEqual(plain(fams.map((f) => f.id)), ['demo', 'solo']);
  assert.deepEqual(plain(fams[0].versions.map((v) => v.id)), ['demo-v3', 'demo-v2']);
  assert.equal(fams[0].current.id, 'demo-v3');
  const all = I.groupFamilies(PROJECTS, true);
  assert.deepEqual(plain(all.map((f) => f.id)), ['demo', 'solo', 'old']);
  assert.deepEqual(plain(all[0].versions.map((v) => v.id)), ['demo-v3', 'demo-v2', 'demo-v1']);
  assert.equal(all[2].current.id, 'old-only');
});

test('projects: progress counts done of total and needs-you / hands-on markers', () => {
  const I = load(boards).projectsTabInternals;
  assert.deepEqual(JSON.parse(JSON.stringify(I.progress(NODES))), { done: 1, total: 4 });
  const t = I.countTags(NODES, [{ id: 't1', category: 'hands_on' }]);
  assert.equal(t.need, 1);
  assert.equal(t.hands, 2);
});

test('projects: layer layout puts each node one layer right of its deepest dep', () => {
  const I = load(boards).projectsTabInternals;
  const L = I.layoutLR(NODES, I.edgesOf(NODES), 34, 140);
  assert.deepEqual(JSON.parse(JSON.stringify(L.layer)), { A: 0, B: 1, C: 1, D: 2 });
  assert.equal(L.pos.A.x < L.pos.B.x, true);
  assert.equal(L.pos.B.x, L.pos.C.x);
  assert.notEqual(L.pos.B.y, L.pos.C.y);
  assert.equal(L.pos.D.x > L.pos.B.x, true);
  assert.equal(L.w >= L.pos.D.x + 140, true);
  assert.deepEqual(plain(I.edgesOf([{ id: 'X', deps: ['gone'] }])), []);
});

test('projects: tab draws the list, the version picker and the graph of the chosen project', () => {
  const CC = load(boards);
  const tree = render(CC.h(CC.ProjectsTab, { pageId: 'projects' }));
  const text = textOf(tree);
  assert.match(text, /Demo three/);
  assert.match(text, /Solo/);
  assert.doesNotMatch(text, /Old only/);
  const pick = findAll(tree, (n) => n.type === 'select');
  assert.equal(pick.length, 1);
  assert.deepEqual(findAll(pick[0], (n) => n.type === 'option').map((o) => o.props.value), ['demo-v3', 'demo-v2']);
  assert.match(text, /1\/4/);
  assert.match(text, /needs you/);
  assert.match(text, /hands-on/);
  const svg = findAll(tree, (n) => n.type === 'svg' && hasClass('cc-pj-graph')(n));
  assert.equal(svg.length, 1);
  assert.equal(findAll(svg[0], (n) => n.type === 'g' && n.props['data-node']).length, 4);
  assert.equal(findAll(svg[0], (n) => n.type === 'path' && hasClass('cc-pj-edge')(n)).length, 4);
});

test('projects: node panel shows title, status, goal, check, deps, evidence, claim and needs-you', () => {
  const CC = load(boards);
  const I = CC.projectsTabInternals;
  const d = textOf(render(CC.h(I.NodePanel, { node: NODES[3], onClose: () => {} })));
  for (const s of ['Join', 'Waiting', 'Ship the join', 'npm test', 'B, C', 'tests pass']) assert.ok(d.includes(s), s);
  const b = textOf(render(CC.h(I.NodePanel, { node: NODES[1] })));
  assert.match(b, /Alex/);
  assert.match(b, /worker-1/);
  const c = textOf(render(CC.h(I.NodePanel, { node: NODES[2] })));
  assert.match(c, /Pick a model/);
  assert.match(c, /Use the small one/);
  const tree = render(CC.h(CC.ProjectsTab, { pageId: 'projects', initialNode: 'D' }));
  assert.match(textOf(findAll(tree, hasClass('cc-split-side'))), /Ship the join/);
});

test('projects: server down with no data shows the problem; stale data shows a banner', () => {
  const down = { code: 'server_down', message: 'The Waypoint server is not running.' };
  let CC = load(() => ({ error: down }));
  assert.match(textOf(render(CC.h(CC.ProjectsTab, { pageId: 'projects' }))), /server is not running/);
  CC = load((k) => Object.assign(boards(k), { error: down }));
  const tree = render(CC.h(CC.ProjectsTab, { pageId: 'projects' }));
  assert.equal(findAll(tree, hasClass('cc-bn')).length >= 1, true);
  assert.match(textOf(tree), /Demo three/);
});

test('projects: empty board and empty project show calm empty states', () => {
  let CC = load(() => ({ data: { projects: [], todos: [], needs: [] } }));
  assert.match(textOf(render(CC.h(CC.ProjectsTab, { pageId: 'projects' }))), /No projects yet/);
  CC = load(boards);
  const tree = render(CC.h(CC.ProjectsTab, { pageId: 'projects', initialProject: 'solo' }));
  assert.match(textOf(tree), /No tasks in this version yet/);
  CC = load(() => ({ loading: true }));
  assert.match(textOf(render(CC.h(CC.ProjectsTab, { pageId: 'projects' }))), /Loading/);
});
