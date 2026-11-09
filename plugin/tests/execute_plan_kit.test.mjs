// execute_plan_kit.test.mjs - Execute and Plan are built on the shared kit (ui.js): one PageHeader,
// one primary action per view, the Plan stepper in the header, a 960 px form column, a dense draft
// checklist, the inspector as the fixed side panel, an empty project as CC.ui.Empty, and no
// owner-identifying or retired strings in these files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, hasClass, textOf, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const primaries = (t) => findAll(t, (n) => n.type === 'button' && hasClass('cc-b-primary')(n));
const api = { get: () => new Promise(() => {}), post: () => new Promise(() => {}), subscribe: () => () => {} };

test('Plan: one kit header with the three-step stepper in the middle and one primary', () => {
  const CC = loadCC(['tokens.js', 'ui.js', 'inputs.js', 'page_plan.js'], { api, useEngine: () => ({ data: null }), unpackBoard: (b) => b });
  const t = render(CC.h(CC.PlanPage, {}));
  assert.equal(t.props['data-cc-page'], 'plan');
  assert.equal(findAll(t, hasClass('cc-ph')).length, 1);
  assert.equal(textOf(findAll(t, hasClass('cc-ph-title'))[0]), 'Plan');
  const mid = findAll(t, hasClass('cc-ph-mid'))[0];
  assert.equal(findAll(mid, hasClass('cc-pl-step')).length, 3, 'stepper sits in the header');
  assert.deepEqual(primaries(t).map(textOf), ['Start planning']);
  assert.match(CC.planHelpers.style, /\.cc-root \.cc-pl-col\{max-width:960px;/, 'left-aligned 960 px column');
  assert.doesNotMatch(CC.planHelpers.style.match(/\.cc-pl-col\{[^}]*\}/)[0], /margin:0 auto/, 'not centred');
  assert.match(CC.planHelpers.style, /\.cc-pl-pick\{display:grid;grid-template-columns:repeat\(2,/, 'model and effort side by side');
});

test('Plan draft: the checklist has aligned columns with a header row', () => {
  const CC = loadCC(['tokens.js', 'ui.js', 'inputs.js', 'waves.js', 'page_plan.js'], { api, useEngine: () => ({ data: null }), unpackBoard: (b) => b });
  const nodes = [{ id: 'A1', title: 'Rows', check: { type: 'command' }, deps: [] }, { id: 'A2', title: 'CLI', check: { type: 'human' }, deps: ['A1'] }];
  const byId = { A1: nodes[0], A2: nodes[1] };
  const t = render(CC.h(CC.PlanTaskList, { draft: { tasks: 2, checks: { command: 1, human: 1 } }, nodes, byId, selected: null, onSelect() {} }));
  assert.deepEqual(findAll(t, hasClass('cc-pl-th')).map((r) => r.props.children.map(textOf)), [['Wave', 'Task', 'Id', 'Check']]);
  assert.deepEqual(findAll(t, hasClass('cc-pl-tc')).map(textOf), ['command', 'you']);
  assert.match(textOf(t), /1 for you/);
});

const engine = (opts) => (p) => {
  if (!p) return { data: null };
  if (p === '/api/projects') return { data: { projects: opts.projects } };
  if (p.indexOf('/api/board') === 0) return { data: opts.board };
  if (p.indexOf('/api/questions') === 0) return { data: { questions: [] } };
  return { data: null };
};
const FILES = ['tokens.js', 'ui.js', 'check_counts.js', 'layout_flow.js', 'waves.js', 'view_flow.js', 'page_create.js'];

test('Execute: data-cc-page, one header, one primary, graph in the split main, legend as one line', () => {
  const board = { project: { id: 'p' }, nodes: [{ id: 'a', title: 'A', status: 'done', deps: [] }, { id: 'b', title: 'B', status: 'running', deps: ['a'] }],
    edges: [['a', 'b']], counts: { done: 1, running: 1, total: 2 } };
  const CC = loadCC(FILES, { useEngine: engine({ projects: [{ id: 'p', title: 'Proj' }], board }), unpackBoard: (b) => b, api });
  const t = render(CC.h(CC.CreatePage));
  assert.equal(t.props['data-cc-page'], 'create');
  assert.equal(findAll(t, hasClass('cc-ph')).length, 1);
  assert.equal(primaries(t).length, 1);
  assert.equal(textOf(primaries(t)[0]), 'Run');
  assert.equal(textOf(findAll(t, hasClass('cc-ph-meta'))[0]), '1 done · 1 running');
  const main = findAll(t, hasClass('cc-split-main'))[0];
  assert.ok(main && findAll(main, hasClass('cc-flow')).length === 1, 'graph fills the main area');
  const legend = findAll(main, hasClass('cc-legend'));
  assert.equal(legend.length, 1);
  assert.match(textOf(legend[0]), /^DoneReadyRunningFailingNeeds youNot started$/);
  const seg = findAll(t, hasClass('cc-sg'));
  assert.equal(seg.length, 2, 'view and filter switches');
  assert.deepEqual(findAll(seg[1], hasClass('cc-sg-n')).map(textOf), ['2', '1', '1'], 'filter options carry counts');
});

test('Execute: no projects and an empty project use the kit empty state', () => {
  const none = loadCC(FILES, { useEngine: engine({ projects: [], board: null }), unpackBoard: (b) => b, api });
  const t = render(none.h(none.CreatePage));
  assert.equal(textOf(findAll(t, hasClass('cc-em-t'))[0]), 'No projects yet');
  assert.equal(primaries(t).length, 1, 'Run stays the one primary (disabled)');
  assert.equal(primaries(t)[0].props.disabled, true);
  const empty = loadCC(FILES, { useEngine: engine({ projects: [{ id: 'p', title: 'Proj' }], board: { project: { id: 'p' }, nodes: [], edges: [], counts: {} } }), unpackBoard: (b) => b, api });
  const t2 = render(empty.h(empty.CreatePage));
  assert.equal(textOf(findAll(t2, hasClass('cc-em-t'))[0]), 'No tasks in this project');
  assert.equal(findAll(t2, hasClass('cc-legend')).length, 0);
});

test('Execute inspector is the fixed kit side panel', () => {
  const CC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], {
    useEngine: (p) => (p && p.indexOf('/api/node?') === 0 ? { data: { node: { id: 'B', title: 'B', status: 'ready', deps: [] } } } : { data: null }), api });
  const t = render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 1, toast() {}, onClose() {} }));
  assert.ok(hasClass('cc-split-side')(t), t.props.className);
});

test('no owner-identifying, old-brand or retired strings in these files', () => {
  const files = ['page_create.js', 'page_plan.js', 'view_flow.js', 'view_star.js', 'view_waves.js', 'layout_flow.js', 'layout_star.js', 'waves.js', 'check_counts.js'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.deepEqual(personalHits(src), [], f);
    for (const bad of [/Control Centre/i, /C:\\\\Users/, /@rob\//, /ChatMode/, /dsh-control-centre/]) {
      assert.ok(!bad.test(src), f + ' contains ' + bad);
    }
  }
});

test('More menus are the kit Menu (icon trigger): header has History and Archive, inspector has Mark done', () => {
  const projects = [{ id: 'p', title: 'Proj', family: 'f', version: 2, versions: 2 }];
  const board = { project: { id: 'p' }, nodes: [{ id: 'a', title: 'A', status: 'ready', deps: [] }], edges: [], counts: {} };
  const node = { id: 'a', title: 'A', status: 'ready', deps: [] };
  const CC = loadCC(FILES, { api, unpackBoard: (b) => b, useEngine: (p) => (p && p.indexOf('/api/node?') === 0 ? { data: { node } } : engine({ projects, board })(p)) });
  // Stateful hooks, so clicking a trigger opens its menu on the next draw.
  const st = []; let i = 0;
  CC.React.useState = (init) => { const k = i++; if (!(k in st)) st[k] = typeof init === 'function' ? init() : init; return [st[k], (v) => { st[k] = typeof v === 'function' ? v(st[k]) : v; }]; };
  const draw = (el) => { i = 0; return render(el); };
  const page = () => draw(CC.h(CC.CreatePage));
  let t = page();
  const trig = findAll(t, (n) => n.type === 'button' && n.props['aria-label'] === 'Project actions')[0];
  assert.ok(trig && hasClass('cc-b-icon')(trig), 'icon trigger from the kit');
  assert.equal(textOf(trig), '', 'no hand-written "..." label');
  assert.equal(findAll(t, (n) => n.type === 'summary' && textOf(n) === '…').length, 0);
  trig.props.onClick();
  t = page();
  const items = findAll(t, hasClass('cc-mn-i')).map(textOf);
  assert.deepEqual(items, ['History', 'Archive project']);
  const insp = draw(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'a', revision: 1, toast() {}, onClose() {} }));
  const it = findAll(insp, (n) => n.type === 'button' && n.props['aria-label'] === 'More actions')[0];
  assert.ok(it && hasClass('cc-b-icon')(it));
});

done('execute_plan_kit');
