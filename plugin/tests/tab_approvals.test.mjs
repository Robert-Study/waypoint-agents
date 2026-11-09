// tab_approvals.test.mjs - CC.ApprovalsTab: needs-you questions and open to-dos in one native tab (dsh-v2 t-approvals).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, textOf, findAll, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const FILES = ['tokens.js', 'ui.js', 'wpc_client.js', 'tab_approvals.js'];

function setup(reply) {
  const calls = [];
  const CC = loadCC(FILES, {
    fetch: (url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      const r = reply ? reply(body) : { payload: { ok: true }, isError: false };
      if (r === 'down') return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(r)) });
    }
  });
  return { CC, calls };
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const flush = () => new Promise((r) => setTimeout(r, 0));

const ITEMS_Q = {
  id: 'nq-1', project: 'demo-project', node: 'n-design', problem: 'Design choices: 4 questions.', resolution: 'Answer below.',
  options: null, recommended: null, kind: 'items',
  items: [
    { id: '1', prompt: 'Agree with the plan?', kind: 'scale', options: null },
    { id: '2', prompt: 'Which sources count?', kind: 'multi', options: ['A', 'B', 'C'] },
    { id: '3', prompt: 'Read or skip?', kind: 'choice', options: ['read', 'skip'] },
    { id: '4', prompt: 'Anything else?', kind: 'text', options: null }
  ]
};
const CHOICE_Q = { id: 'nq-2', project: 'other', node: null, problem: 'Pick a model.', resolution: 'Use the fast one.',
  options: ['fast', 'strong'], recommended: 'fast', items: null, kind: 'choice' };
const APPROVAL_Q = { id: 'nq-3', project: 'demo-project', node: 'n-ship', problem: 'Ship it?', resolution: 'Ship v1.',
  options: null, recommended: null, items: null, kind: 'approval' };
const BOARD = {
  projects: [{ id: 'demo-project', title: 'Demo Project' }, { id: 'other', title: 'Other Work' }],
  todos: [
    { id: 'td-1', text: 'Say publish or not yet.', category: 'decisions', rev: 3, project: 'demo-project', order: 1 },
    { id: 'td-2', text: 'Review the prototype.', category: 'hands_on', rev: 1, project: 'other', order: 1, link: 'https://example.com/p' },
    { id: 'td-3', text: 'Check the report.', category: 'review', rev: 2, project: null, order: 2 },
    { id: 'td-4', text: 'Old thing.', category: 'decisions', rev: 5, status: 'done' }
  ],
  needs: [ITEMS_Q, CHOICE_Q, APPROVAL_Q]
};

function view(CC, state) {
  CC.useWpc = () => Object.assign({ data: null, error: null, loading: false, reload: () => {} }, state);
  return render(CC.h(CC.ApprovalsTab, { pageId: 'cc-approvals' }));
}

test('approvals: exports the tab and its helpers; no personal terms in source', () => {
  const { CC } = setup();
  assert.equal(typeof CC.ApprovalsTab, 'function');
  assert.equal(typeof CC.approvalsTabInternals.buildAnswer, 'function');
  const src = fs.readFileSync(path.join(SRC, 'tab_approvals.js'), 'utf8');
  assert.deepEqual(personalHits(src), []);
});

test('approvals: answer input for items covers scale, multi, choice and text', () => {
  const { CC } = setup();
  const I = CC.approvalsTabInternals;
  const form = { picks: { '1': 7, '2': ['A', 'C'], '3': 'skip', '4': '  more tests  ' } };
  assert.deepEqual(plain(I.buildAnswer(ITEMS_Q, form, 'answers')), {
    input: { decision: 'answers', question: 'nq-1', answers: { '1': 7, '2': ['A', 'C'], '3': 'skip', '4': 'more tests' } }
  });
  // Unpicked items are left out (the server shows them as skipped); blank text and empty multi too.
  const part = I.buildAnswer(ITEMS_Q, { picks: { '1': '4', '2': [], '4': '   ' } }, 'answers');
  assert.deepEqual(plain(part.input.answers), { '1': 4 });
  assert.match(I.buildAnswer(ITEMS_Q, { picks: {} }, 'answers').error, /at least one/);
});

test('approvals: answer input for a choice option, an approval, a reject and a reply', () => {
  const { CC } = setup();
  const I = CC.approvalsTabInternals;
  assert.equal(I.kindOf(ITEMS_Q), 'items');
  assert.equal(I.kindOf(CHOICE_Q), 'choice');
  assert.equal(I.kindOf(APPROVAL_Q), 'approval');
  assert.deepEqual(plain(I.buildAnswer(CHOICE_Q, {}, 'option', 'strong').input), { decision: 'option', question: 'nq-2', option: 'strong' });
  assert.match(I.buildAnswer(CHOICE_Q, {}, 'option', 'nope').error, /not one of/);
  assert.deepEqual(plain(I.buildAnswer(APPROVAL_Q, { text: ' ok ' }, 'approve').input), { decision: 'approve', question: 'nq-3', text: 'ok' });
  assert.deepEqual(plain(I.buildAnswer(APPROVAL_Q, {}, 'reject').input), { decision: 'reject', question: 'nq-3' });
  assert.match(I.buildAnswer(APPROVAL_Q, { text: ' ' }, 'reply').error, /reply first/);
  assert.deepEqual(plain(I.buildAnswer(APPROVAL_Q, { text: 'wait' }, 'reply').input), { decision: 'reply', question: 'nq-3', text: 'wait' });
});

test('approvals: picks toggle like the reference page (single for choice and scale, many for multi)', () => {
  const { CC } = setup();
  const I = CC.approvalsTabInternals;
  const [scale, multi, choice, text] = ITEMS_Q.items;
  assert.equal(I.pick(scale, undefined, 5), 5);
  assert.equal(I.pick(scale, 5, 5), undefined);
  assert.equal(I.pick(choice, 'read', 'skip'), 'skip');
  assert.deepEqual(plain(I.pick(multi, ['A'], 'B')), ['A', 'B']);
  assert.deepEqual(plain(I.pick(multi, ['A', 'B'], 'A')), ['B']);
  assert.equal(I.pick(text, 'x', 'typed'), 'typed');
});

test('approvals: to-dos split into decisions and hands-on; done ones are dropped', () => {
  const { CC } = setup();
  const s = CC.approvalsTabInternals.splitTodos(BOARD.todos);
  assert.deepEqual(plain(s.approvals.map((t) => t.id)), ['td-1', 'td-3']);
  assert.deepEqual(plain(s.handsOn.map((t) => t.id)), ['td-2']);
  assert.deepEqual(plain(CC.approvalsTabInternals.splitTodos(null)), { approvals: [], handsOn: [] });
});

test('approvals: Done calls todo_tick with expected_rev and refreshes board_read', async () => {
  const { CC, calls } = setup();
  const heard = [];
  CC.wpc.listen((tools) => heard.push(tools));
  assert.deepEqual(plain(CC.approvalsTabInternals.tickInput(BOARD.todos[0])), { id: 'td-1', expected_rev: 3 });
  const tree = view(CC, { data: BOARD });
  const done = findAll(tree, (n) => n.type === 'button' && n.props['data-cc-action'] === 'todo-done');
  assert.equal(done.length, 3);
  done[0].props.onClick();
  await flush();
  assert.deepEqual(plain(calls), [{ tool: 'todo_tick', input: { id: 'td-1', expected_rev: 3 } }]);
  assert.deepEqual(plain(heard), [['board_read']]);
});

test('approvals: an option button answers in one click through the answer tool', async () => {
  const { CC, calls } = setup();
  const tree = view(CC, { data: BOARD });
  const opt = findAll(tree, (n) => n.type === 'button' && n.props['data-cc-action'] === 'answer-option' && textOf(n).startsWith('strong'));
  assert.equal(opt.length, 1);
  opt[0].props.onClick();
  await flush();
  assert.deepEqual(plain(calls), [{ tool: 'answer', input: { decision: 'option', question: 'nq-2', option: 'strong' } }]);
});

test('approvals: renders sections with counts, project chips and every item kind', () => {
  const { CC } = setup();
  const tree = view(CC, { data: BOARD });
  const text = textOf(tree);
  assert.match(text, /Approvals/);
  assert.match(text, /3 questions · 2 approvals · 1 hands-on/);
  assert.match(text, /Demo Project/);
  assert.match(text, /Other Work/);
  assert.match(text, /Agree with the plan\?/);
  assert.match(text, /Send answers/);
  const sections = findAll(tree, (n) => n.type === 'section').map((n) => n.props['data-section']);
  assert.deepEqual(sections, ['needs', 'approvals', 'hands-on']);
  // Scale offers 1 to 9; multi offers checkboxes; text offers an input.
  const scale = findAll(tree, (n) => n.props && n.props['data-item'] === 'nq-1/1')[0];
  assert.equal(findAll(scale, (n) => n.type === 'button').length, 9);
  const multi = findAll(tree, (n) => n.props && n.props['data-item'] === 'nq-1/2')[0];
  assert.equal(findAll(multi, (n) => n.type === 'input' && n.props.type === 'checkbox').length, 3);
  const txt = findAll(tree, (n) => n.props && n.props['data-item'] === 'nq-1/4')[0];
  assert.equal(findAll(txt, (n) => n.type === 'input').length, 1);
});

test('approvals: server down shows the problem state; stale data keeps a banner', () => {
  const { CC } = setup();
  const down = textOf(view(CC, { error: { code: 'server_down', message: 'x' } }));
  assert.match(down, /server is not running/);
  const stale = textOf(view(CC, { data: BOARD, error: { code: 'server_down', message: 'The Waypoint server is not running.' } }));
  assert.match(stale, /Could not refresh/);
  assert.match(stale, /Say publish or not yet/);
  assert.match(textOf(view(CC, { loading: true })), /Loading/);
});

test('approvals: empty board shows a calm empty state', () => {
  const { CC } = setup();
  const text = textOf(view(CC, { data: { projects: [], todos: [], needs: [] } }));
  assert.match(text, /Nothing waits for you/);
  assert.match(text, /0 questions · 0 approvals · 0 hands-on/);
});

test('approvals: a refused answer leaves the item and says why', async () => {
  const { CC } = setup(() => ({ payload: { error: 'bad_state', message: 'that question is already answered' }, isError: true }));
  const said = [];
  await CC.approvalsTabInternals.send('answer', { decision: 'reject', question: 'nq-3' }, (m) => said.push(m));
  assert.deepEqual(said, ['Sending…', 'Not sent: that question is already answered']);
  const { CC: CC2 } = setup(() => 'down');
  const said2 = [];
  await CC2.approvalsTabInternals.send('todo_tick', { id: 'td-1' }, (m) => said2.push(m));
  assert.match(said2[1], /^Not done: The Waypoint server is not running/);
});
