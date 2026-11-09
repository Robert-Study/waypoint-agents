// todo_page.test.mjs - CC.TodoPage (T2): quick add, the list, Plan / Add to project / Run per item with the
// result shown in place, and the brief line + compact triage list, rendered in a vm with stub React.
// Loaded without ui.js on purpose: the page falls back to bare kit class names.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const posts = [];
let reply = () => Promise.resolve({ ok: true });
const CC = loadCC(['tokens.js', 'page_todo.js'], {
  api: {
    get: () => new Promise(() => {}),
    post: (path, body) => { posts.push({ path, body }); return reply(path, body); },
    subscribe: () => () => {}
  },
  useEngine: () => ({ data: null, error: null, loading: true })
});

const T = (o) => Object.assign({ id: 'td-1', text: 'Chase the invoice', status: 'open', done: false, handoffs: [] }, o);
const TODOS = [
  T({ id: 'td-1', text: 'Add a frontier chart for the ETF portfolio' }),
  T({ id: 'td-2', text: 'Rename the downloads folder', status: 'handed_off', handoffs: [
    { to: 'plan', at: '2026-11-04T08:00:00+00:00', by: 'owner', ref: { session: 'ps-1' } },
    { to: 'project', at: '2026-11-04T08:01:00+00:00', by: 'owner',
      ref: { project: 'fund-lab', node: 'todo-ab12', title: 'Portfolio optimiser', check: { type: 'text_present', path: 'todo/todo-ab12.md', text: 'Result:' } } },
    { to: 'run', at: '2026-11-04T08:02:00+00:00', by: 'owner', ref: { project: 'todo-ab12', node: 'task' } }] }),
  T({ id: 'td-3', text: 'Old finished thing', status: 'done', done: true }),
  T({ id: 'td-4', text: 'Merged away', status: 'dropped' })
];
const DATA = { todos: TODOS, counts: { open: 2, total: 4 } };
const BRIEF = {
  hours: 12, paragraph: 'In the last 12 hours, 3 tasks finished and 1 failed (Frontier chart). 2 things need you. Usage left: Claude 5 hours 62%.',
  done: 3, failed: 1, needs_you: 2, usage: [],
  triage: {
    merges: [{ keep: 'td-1', merge: ['td-9'], text: 'Add a frontier chart for the ETF portfolio', similarity: 0.9, texts: ['add frontier chart'] }],
    suggestions: [{ todo: 'td-1', text: 'Add a frontier chart for the ETF portfolio', project: 'fund-lab', title: 'Portfolio optimiser', words: ['frontier'] }],
    open: 2
  }
};

const page = (props) => render(CC.h(CC.TodoPage, Object.assign({ data: DATA, brief: BRIEF }, props || {})));
const rows = (t) => findAll(t, (n) => n.props['data-id'] && n.props['data-kind'] === 'todo');
const rowById = (t, id) => rows(t).find((r) => r.props['data-id'] === id);
const buttons = (t, re) => findAll(t, (n) => n.type === 'button' && re.test(textOf(n)));
const plain = (x) => JSON.parse(JSON.stringify(x));
const sugg = (t) => findAll(t, hasClass('cc-td-sugg'))[0];
const click = (btn) => btn.props.onClick({ preventDefault() {}, stopPropagation() {} });

test('registers the page component and exposes helpers', () => {
  assert.equal(typeof CC.TodoPage, 'function');
  assert.equal(typeof CC.todoView.visibleTodos, 'function');
});

test('lists open todos only, newest first, done and dropped hidden', () => {
  const t = page();
  assert.deepEqual(plain(rows(t).map((r) => r.props['data-id'])), ['td-2', 'td-1']);
  assert.ok(!textOf(t).includes('Merged away'));
  assert.ok(!textOf(t).includes('Old finished thing'));
  assert.match(textOf(t), /Done \(1\)/);
  const more = findAll(t, (n) => n.type === 'button' && /^Done \(1\)$/.test(textOf(n)))[0];
  assert.equal(more.props['aria-expanded'], false, 'done items start folded');
});

test('show done reveals finished todos', () => {
  const t = page({ initialShowDone: true });
  assert.ok(rowById(t, 'td-3'));
});

test('quick add: input with a label, Add disabled until there is text, posts the text', () => {
  const empty = page();
  const input = findAll(empty, (n) => n.type === 'input' && n.props['aria-label'] === 'Add a todo')[0];
  assert.ok(input, 'quick-add input');
  assert.ok(buttons(empty, /^Add$/)[0].props.disabled);
  posts.length = 0;
  reply = () => Promise.resolve({ ok: true, todo: T({ id: 'td-new', text: 'Buy milk' }) });
  const typed = page({ initialText: 'Buy milk' });
  const add = buttons(typed, /^Add$/)[0];
  assert.ok(!add.props.disabled);
  click(add);
  assert.deepEqual(plain(posts[0]), { path: '/api/todos', body: { text: 'Buy milk' } });
});

test('each open item has Plan, Add to project and Run buttons', () => {
  const t = page();
  for (const id of ['td-1', 'td-2']) {
    const r = rowById(t, id);
    assert.equal(buttons(r, /^Plan$/).length, 1, id);
    assert.equal(buttons(r, /^Add to project$/).length, 1, id);
    assert.equal(buttons(r, /^Run$/).length, 1, id);
  }
});

test('buttons post the hand-off to the right target', () => {
  const r = rowById(page(), 'td-1');
  reply = () => new Promise(() => {});
  posts.length = 0;
  click(buttons(r, /^Plan$/)[0]);
  click(buttons(r, /^Add to project$/)[0]);
  click(buttons(r, /^Run$/)[0]);
  assert.deepEqual(plain(posts.map((p) => p.path)), ['/api/todos/handoff', '/api/todos/handoff', '/api/todos/handoff']);
  assert.deepEqual(plain(posts.map((p) => p.body.to)), ['plan', 'project', 'run']);
  assert.ok(posts.every((p) => p.body.id === 'td-1'));
});

test('where a todo went is shown in place, per target', () => {
  const r = rowById(page(), 'td-2');
  const text = textOf(r);
  assert.match(text, /Plan/);
  assert.match(text, /Portfolio optimiser/);
  assert.match(text, /todo-ab12/);
  assert.match(text, /Autonomous/);
  assert.ok(buttons(r, /Open Plan/).length === 1 && buttons(r, /Open Autonomous/).length === 1);
});

test('a busy item disables its buttons and says what is happening', () => {
  const r = rowById(page({ initialResults: { 'td-1': { busy: 'plan' } } }), 'td-1');
  assert.ok(buttons(r, /^Plan|Starting/).every((b) => b.props.disabled));
  assert.ok(buttons(r, /^Run$/)[0].props.disabled);
});

test('a refusal shows its reason in place', () => {
  const r = rowById(page({ initialResults: { 'td-1': { error: 'No project fits this clearly; pick one.' } } }), 'td-1');
  assert.match(textOf(r), /No project fits this clearly/);
});

test('when no project fits, candidates are offered and nothing is preselected', () => {
  const pick = [{ project: 'fund-lab', title: 'Portfolio optimiser' }, { project: 'cv', title: 'LaTeX report' }];
  const r = rowById(page({ initialResults: { 'td-1': { pick } } }), 'td-1');
  const opts = buttons(r, /Portfolio optimiser|LaTeX report/);
  assert.equal(opts.length, 2);
  assert.ok(opts.every((b) => !b.props['aria-pressed']));
  posts.length = 0;
  reply = () => new Promise(() => {});
  click(opts[1]);
  assert.deepEqual(plain(posts[0].body), { id: 'td-1', to: 'project', project: 'cv' });
});

test('the brief is one line at the top; its triage is one compact list after the two lists', () => {
  const t = page();
  const line = findAll(t, hasClass('cc-td-brief'))[0];
  assert.ok(line, 'brief line');
  assert.equal(findAll(t, hasClass('cc-td-brief')).length, 1);
  assert.match(textOf(line), /3 tasks finished and 1 failed/);
  assert.doesNotMatch(textOf(line), /Merge|Portfolio optimiser/);
  const block = sugg(t);
  const order = findAll(t, (n) => n.type === 'section').map((n) => n.props['aria-label']);
  assert.ok(order.indexOf('Suggestions') > order.indexOf('For the computer'), 'suggestions come after the lists');
  assert.match(textOf(block), /similar|duplicate/i);
  assert.match(textOf(block), /Portfolio optimiser/);
  assert.ok(buttons(block, /^Merge$/).length === 1);
  const suggest = buttons(block, /^Add to Portfolio optimiser$|^Add$/);
  assert.ok(suggest.length >= 1);
});

test('triage actions post a merge and a project hand-off', () => {
  const block = sugg(page());
  posts.length = 0;
  reply = () => new Promise(() => {});
  click(buttons(block, /^Merge$/)[0]);
  assert.deepEqual(plain(posts[0]), { path: '/api/todos/merge', body: { keep: 'td-1', merge: ['td-9'] } });
  click(buttons(block, /^Add to Portfolio optimiser$|^Add$/)[0]);
  assert.deepEqual(plain(posts[1]), { path: '/api/todos/handoff', body: { id: 'td-1', to: 'project', project: 'fund-lab' } });
});

test('triage drops suggestions for todos that are no longer open', () => {
  const data = { todos: [T({ id: 'td-1', text: 'Add a frontier chart for the ETF portfolio', status: 'handed_off' })] };
  const t = page({ data });
  assert.ok(findAll(t, hasClass('cc-td-brief'))[0], 'the line stays');
  assert.equal(sugg(t), undefined, 'nothing left to suggest');
  assert.equal(buttons(t, /^Merge$/).length, 0);
  assert.ok(!textOf(t).includes('Portfolio optimiser'));
});

test('no brief from the engine: no block, the list still renders', () => {
  const t = page({ brief: null });
  assert.equal(findAll(t, hasClass('cc-td-brief')).length, 0);
  assert.equal(sugg(t), undefined);
  assert.equal(rows(t).length, 2);
});

test('engine down: a calm one-line state, no crash', () => {
  const t = page({ data: undefined, error: { status: 0 } });
  assert.match(textOf(t), /engine is not running/i);
  assert.equal(findAll(t, (n) => n.type === 'button' && /^Plan$/.test(textOf(n))).length, 0);
  const loading = render(CC.h(CC.TodoPage, {}));
  assert.ok(loading);
});

test('empty list: short empty state and the quick-add stays', () => {
  const t = page({ data: { todos: [] } });
  assert.match(textOf(t), /Nothing to do/);
  assert.ok(findAll(t, (n) => n.type === 'input' && n.props['aria-label'] === 'Add a todo').length === 1);
});

test('brief: the usage sentence is not restated in prose', () => {
  const block = findAll(page(), hasClass('cc-td-brief'))[0];
  assert.ok(!/Usage left/.test(textOf(block)));
  assert.equal(textOf(findAll(block, hasClass('cc-td-para'))[0]), 'In the last 12 hours, 3 tasks finished and 1 failed (Frontier chart). 2 things need you.');
  const s = CC.todoView.briefText;
  assert.equal(s('Done: 3. Usage left: Claude 5 hours 92% (stale), Claude week (all models) 73% (stale). 2 need you.'), 'Done: 3. 2 need you.');
  assert.equal(s('Usage left: Claude 5 hours 92.5% (stale).'), '');
  assert.equal(s('Nothing failed.'), 'Nothing failed.');
});

test('hand-off result: plain line and Open link; the raw check sits in the tooltip', () => {
  const r = rowById(page(), 'td-2');
  const line = findAll(r, hasClass('cc-td-res-line')).find((n) => /Portfolio optimiser/.test(textOf(n)));
  assert.equal(textOf(line), 'Added to Portfolio optimiser as todo-ab12Open project');
  assert.ok(!/Done when/.test(textOf(r)));
  assert.match(line.props.title, /Done when todo\/todo-ab12\.md says/);
});

test('one header bar titled To-do with the open count; no primary button; Add is a default kit button', () => {
  const t = page();
  const bars = findAll(t, hasClass('cc-ph'));
  assert.equal(bars.length, 1);
  assert.equal(textOf(findAll(bars[0], hasClass('cc-ph-title'))[0]), 'To-do');
  assert.equal(textOf(findAll(bars[0], hasClass('cc-ph-meta'))[0]), '2 open');
  assert.equal(findAll(t, hasClass('cc-b-primary')).length, 0);
  const add = buttons(t, /^Add$/)[0];
  assert.ok(hasClass('cc-b')(add) && !hasClass('cc-b-primary')(add));
  // the add field is the field itself, not a boxed card
  assert.ok(!/cc-td-addrow|cc-td-primary/.test(CC.todoView.style));
});

test('long text is clamped to two lines with the full text on hover', () => {
  const css = CC.todoView.style;
  assert.match(css, /\.cc-td-text\{[^}]*-webkit-line-clamp:2/);
  assert.match(css, /\.cc-td-row\{[^}]*min-height:32px/);
  const r = rowById(page(), 'td-1');
  const text = findAll(r, hasClass('cc-td-text'))[0];
  assert.equal(text.props.title, 'Add a frontier chart for the ETF portfolio');
});

test('suggestions: one compact row per suggestion with one default button each', () => {
  const block = sugg(page());
  const rows = findAll(block, (n) => n.type === 'li');
  assert.equal(rows.length, 2);
  for (const r of rows) {
    const bs = findAll(r, (n) => n.type === 'button');
    assert.equal(bs.length, 1);
    assert.ok(hasClass('cc-b')(bs[0]) && hasClass('cc-b-sm')(bs[0]) && !hasClass('cc-b-primary')(bs[0]));
  }
  assert.ok(findAll(page(), hasClass('cc-td-para')).length === 1, 'the brief is one meta line');
});

test('no personal names, paths or old brand in the page source', () => {
  const src = fs.readFileSync(path.join(SRC, 'page_todo.js'), 'utf8');
  assert.deepEqual(personalHits(src), []);
  assert.doesNotMatch(src, /C:\Users|Control Centre|@rob\//);
});

test('helpers: result lines and check summary', () => {
  const v = CC.todoView;
  const lines = v.handoffLines(TODOS[1]);
  assert.deepEqual(plain(lines.map((l) => l.to)), ['plan', 'project', 'run']);
  assert.match(v.checkLine({ type: 'command', run: 'pytest -q' }), /pytest -q/);
  assert.match(v.checkLine({ type: 'files_exist', paths: ['a.txt'] }), /a\.txt/);
  assert.match(v.checkLine({ type: 'text_present', path: 'n.md', text: 'x' }), /n\.md/);
});

done('todo_page');
