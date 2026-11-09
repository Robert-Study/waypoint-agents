// plan_checklist.test.mjs - U6: the Plan draft reads as a numbered checklist grouped into waves, questions
// are numbered and never preselected, the stepper ticks past steps, and the Todo hand-offs are one group.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

const CC = loadCC(['tokens.js', 'ui.js', 'inputs.js', 'waves.js', 'page_plan.js', 'page_todo.js'], {
  api: { get: () => new Promise(() => {}), post: () => new Promise(() => {}), subscribe: () => () => {} },
  useEngine: () => ({ data: { revision: 7, nodes: [], edges: [] }, error: null, loading: false }),
  unpackBoard: (b) => b
});

const DRAFT = {
  title: 'Reports', brief: 'Build a small report generator.', tasks: 3, checks: { command: 3 },
  nodes: [
    { id: 'A1', title: 'Rows', goal: 'Rows load.', check: { type: 'command', run: 'pytest -k a1' }, deps: [] },
    { id: 'A2', title: 'Render', goal: 'Report renders.', check: { type: 'command', run: 'pytest -k a2' }, deps: [] },
    { id: 'A3', title: 'CLI', goal: 'CLI prints.', check: { type: 'command', run: 'pytest -k a3' }, deps: ['A1', 'A2'] }
  ]
};
const byId = {};
DRAFT.nodes.forEach((n) => { byId[n.id] = n; });
const tasks = (t) => findAll(t, hasClass('cc-pl-task'));

test('draft side: tasks in run order, the wave as a left meta column on each row, no wave headings', () => {
  const t = render(CC.h(CC.PlanTaskList, { draft: DRAFT, nodes: DRAFT.nodes, byId, selected: null, onSelect() {} }));
  const rows = tasks(t);
  assert.deepEqual(rows.map((r) => r.props['data-id']), ['A1', 'A2', 'A3']);
  assert.deepEqual(findAll(t, hasClass('cc-pl-tn')).map(textOf), ['W1', 'W1', 'W2']);
  assert.equal(findAll(t, hasClass('cc-pl-wave')).length, 0);
  const text = textOf(t);
  assert.ok(!/Wave \d/.test(text), 'no per-wave headings');
  assert.ok(!/in parallel/.test(text));
});

test('one wave only: the left column numbers the tasks instead', () => {
  const flat = DRAFT.nodes.map((n) => Object.assign({}, n, { deps: [] }));
  const t = render(CC.h(CC.PlanTaskList, { draft: DRAFT, nodes: flat, byId, selected: null, onSelect() {} }));
  assert.deepEqual(findAll(t, hasClass('cc-pl-tn')).map(textOf), ['1', '2', '3']);
});

test('deep draft side: one-line goal at rest; critique, spec and metrics sit behind More', () => {
  const s = { id: 'dp', status: 'ready', title: 'Reports', goal: 'A report generator that prints a CSV summary.\nSecond line.',
    project: 'reports-ab12', draft: DRAFT, stages: [], model: 'claude-opus',
    scores: { critical_path: 2, peak_width: 2, overlaps: 0 }, critique: { summary: 'Sound plan, small risk.' } };
  const t = render(CC.h(CC.PlanDeepDraft, { session: s, busy: false, onAccept() {}, onOpen() {} }));
  const goal = findAll(t, hasClass('cc-pl-goal1'));
  assert.equal(goal.length, 1);
  assert.equal(textOf(goal[0]), 'A report generator that prints a CSV summary.');
  const more = findAll(t, hasClass('cc-pl-more'));
  assert.equal(more.length, 1);
  assert.equal(more[0].props.hidden, true, 'details hidden at rest');
  const inner = textOf(more[0]);
  assert.match(inner, /Critical path/);
  assert.match(inner, /Sound plan, small risk\./);
  assert.match(inner, /Build a small report generator\./);
  const btn = findAll(t, (n) => n.type === 'button' && textOf(n) === 'More');
  assert.equal(btn.length, 1);
  assert.equal(btn[0].props['aria-expanded'], false);
  // The scores and critique render only inside the hidden block.
  const side = findAll(t, hasClass('cc-pl-side'))[0];
  assert.equal(findAll(side, hasClass('cc-pl-scores')).length, findAll(more[0], hasClass('cc-pl-scores')).length);
  assert.ok(!/cc-pl-clamp/.test(JSON.stringify(findAll(side, hasClass('cc-pl-brief')).map((n) => n.props.className))));
});

test('no goal on the session: the first sentence of the spec is the one line', () => {
  const s = { id: 'dp', status: 'ready', title: 'Reports', project: 'reports-ab12', stages: [], model: 'claude-opus',
    draft: Object.assign({}, DRAFT, { brief: 'Build a small report generator. It reads rows and prints.' }) };
  const t = render(CC.h(CC.PlanDeepDraft, { session: s, busy: false, onAccept() {}, onOpen() {} }));
  assert.equal(textOf(findAll(t, hasClass('cc-pl-goal1'))[0]), 'Build a small report generator.');
});

test('describe: the goal hint is the textarea placeholder, not a label aside', () => {
  const t = render(CC.h(CC.PlanDescribe, { busy: false, onStart() {} }));
  const ta = findAll(t, (n) => n.type === 'textarea' && n.props.id === 'cc-pl-goal')[0];
  assert.match(ta.props.placeholder, /^What is true when it is finished/);
  const label = findAll(t, (n) => n.type === 'label' && n.props.htmlFor === 'cc-pl-goal')[0];
  assert.equal(textOf(label), 'Goal');
});

test('checklist row selects its task; the selected one is marked; clicking again clears', () => {
  const got = [];
  const t = render(CC.h(CC.PlanTaskList, { draft: DRAFT, nodes: DRAFT.nodes, byId, selected: 'A3', onSelect: (id) => got.push(id) }));
  const rows = tasks(t);
  assert.ok(/cc-sel/.test(rows[2].props.className) && !/cc-sel/.test(rows[0].props.className));
  rows[0].props.onClick(); rows[2].props.onClick();
  assert.deepEqual(got, ['A1', null]);
});

test('deep draft: checklist and one Accept plan in the action bar', () => {
  const s = { id: 'dp', status: 'ready', title: 'Reports', project: 'reports-ab12', draft: DRAFT, stages: [], scores: null, model: 'claude-opus' };
  const t = render(CC.h(CC.PlanDeepDraft, { session: s, busy: false, onAccept() {}, onOpen() {} }));
  assert.equal(tasks(t).length, 3);
  assert.equal(findAll(t, (n) => n.type === 'button' && /^Accept plan$/.test(textOf(n))).length, 1);
  assert.ok(!/\d+ tasks?\b|in \d+ waves/.test(textOf(findAll(t, hasClass('cc-pl-act'))[0])), 'footer does not repeat the task count');
});

test('classic draft: Redraft is secondary, Accept plan is the one primary', () => {
  const s = { id: 's1', status: 'draft', title: 'Reports', project: 'reports-ab12', draft: DRAFT };
  const t = render(CC.h(CC.PlanDraft, { session: s, busy: false, onRedraft() {}, onAccept() {}, onOpen() {} }));
  const primaries = findAll(t, (n) => n.type === 'button' && /cc-b-primary/.test(n.props.className || ''));
  assert.deepEqual(primaries.map(textOf), ['Accept plan']);
  assert.equal(findAll(t, (n) => n.type === 'button' && textOf(n) === 'Redraft').length, 1);
});

test('questions are numbered, answered inline, nothing preselected', () => {
  const qs = [
    { id: 'q1', kind: 'likert', prompt: 'How polished?', purpose: 'generic', scale: 9, labels: ['Rough', 'Finished'] },
    { id: 'q2', kind: 'select', prompt: 'Which outputs?', purpose: 'generic', options: ['CSV', 'Chart'] }
  ];
  const s = { id: 'dp', status: 'questions', title: 'Reports', stages: [], questions: qs, model: 'claude-opus' };
  const t = render(CC.h(CC.PlanDeepRun, { session: s, answers: {}, busy: false, onAnswer() {}, onContinue() {}, onRetry() {} }));
  assert.deepEqual(findAll(t, hasClass('cc-pl-qn')).map(textOf), ['1', '2']);
  assert.ok(findAll(t, (n) => n.props.role === 'radio').every((r) => r.props['aria-checked'] === 'false'));
  assert.ok(findAll(t, (n) => n.type === 'input' && n.props.type === 'checkbox').every((b) => !b.props.checked));
  assert.match(textOf(t), /0 of 2 answered/);
  const t2 = render(CC.h(CC.PlanDeepRun, { session: s, answers: { q1: 7 }, busy: false, onAnswer() {}, onContinue() {}, onRetry() {} }));
  assert.match(textOf(t2), /1 of 2 answered/);
});

test('stepper ticks past steps and marks the current one', () => {
  const t = render(CC.h(CC.PlanSteps, { step: 3 }));
  const steps = findAll(t, hasClass('cc-pl-step'));
  assert.equal(steps.length, 3);
  assert.deepEqual(findAll(t, hasClass('cc-pl-num')).map(textOf), ['✓', '✓', '3']);
  assert.equal(steps[2].props['aria-current'], 'step');
});

test('todo: the three hand-offs sit in one labelled group per open row; brief is one block', () => {
  const data = { todos: [{ id: 'td-1', text: 'Chase the invoice', status: 'open', done: false, handoffs: [] }] };
  const brief = { hours: 12, paragraph: 'In the last 12 hours, nothing failed.', triage: {} };
  const t = render(CC.h(CC.TodoPage, { data, brief }));
  const groups = findAll(t, (n) => n.props.role === 'group' && n.props['aria-label'] === 'Send on');
  assert.equal(groups.length, 1);
  assert.deepEqual(findAll(groups[0], (n) => n.type === 'button').map(textOf), ['Plan', 'Add to project', 'Run']);
  assert.equal(findAll(t, hasClass('cc-td-brief')).length, 1);
});

test('todo: row actions are quiet at rest and show on hover or keyboard focus', () => {
  const css = CC.todoView.style;
  assert.match(css, /\.cc-root \.cc-td-acts\{[^}]*opacity:0/);
  assert.match(css, /\.cc-root \.cc-td-row:hover \.cc-td-acts,\.cc-root \.cc-td-row:focus-within \.cc-td-acts[^{]*\{[^}]*opacity:1/);
  assert.match(css, /@media \(hover: none\)\{[^}]*\.cc-td-acts\{opacity:1/);
  assert.match(css, /\.cc-root \.cc-td-row\.cc-td-live \.cc-td-acts/);
  const todo = { id: 'td-1', text: 'Chase the invoice', status: 'open', done: false, handoffs: [] };
  const rest = render(CC.h(CC.TodoPage, { data: { todos: [todo] }, brief: null }));
  assert.ok(!/cc-td-live/.test(findAll(rest, hasClass('cc-td-row'))[0].props.className));
  const done1 = render(CC.h(CC.TodoPage, { data: { todos: [Object.assign({}, todo, { handoffs: [{ to: 'plan', ref: { session: 's1' } }] })] }, brief: null }));
  assert.ok(!/cc-td-live/.test(findAll(done1, hasClass('cc-td-row'))[0].props.className), 'a past hand-off alone stays quiet');
  for (const st of [{ busy: 'plan' }, { error: 'No project fits.' }, { pick: [{ project: 'p1', title: 'P1' }] }]) {
    const t = render(CC.h(CC.TodoPage, { data: { todos: [todo] }, brief: null, initialResults: { 'td-1': st } }));
    assert.match(findAll(t, hasClass('cc-td-row'))[0].props.className, /cc-td-live/, 'in flight or waiting: actions stay visible');
  }
});

done('plan_checklist');
