// todo_sections.test.mjs - the To-do page's two sections: "For you" (agents add, in series order, numbered,
// Next badge) above, "For the computer" (the owner adds) below, and done items folded into "Done (n)".
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, test, done } from './harness.mjs';

const posts = [];
const engineCalls = [];
const CC = loadCC(['tokens.js', 'page_todo.js'], {
  api: {
    get: () => new Promise(() => {}),
    post: (path, body) => { posts.push({ path, body }); return Promise.resolve({ ok: true }); },
    subscribe: () => () => {}
  },
  useEngine: (path, kinds) => { engineCalls.push({ path, kinds }); return { data: null, error: null, loading: true }; }
});

const T = (o) => Object.assign({ id: 'x', text: 'x', status: 'open', done: false, section: 'computer', position: 0,
  link: null, node: null, deliverables: [], first_clicked_at: null, archived_at: null, archive_due_at: null,
  handoffs: [], done_by: null }, o);
const c1 = T({ id: 'c1', text: 'Tidy the downloads folder', status: 'handed_off', node: { project: 'desktop-tidy', id: 'u2' } });
const c2 = T({ id: 'c2', text: 'Summarise the audit', status: 'handed_off',
  handoffs: [{ to: 'run', at: '2026-11-05T08:00:00+00:00', by: 'engine', ref: { project: 'todo-1', node: 'task' } }] });
const c3 = T({ id: 'c3', text: 'Draft the report note', status: 'done', done: true, done_by: 'engine',
  deliverables: [{ label: 'report draft', url: 'https://example.test/cv' }, { label: 'Plan', project: 'cv-agentic', node: 'n3' }] });
const h1 = T({ id: 'h1', text: 'Sign the form', section: 'human', position: 1, status: 'done', done: true, done_by: 'engine',
  archive_due_at: new Date(Date.now() + 5 * 3600000 - 60000).toISOString() });
const h2 = T({ id: 'h2', text: 'Review the frontier chart', section: 'human', position: 2, link: 'https://example.test/r', node: { project: 'fund-lab', id: 'n9' } });
const h3 = T({ id: 'h3', text: 'Pick a holiday date', section: 'human', position: 3 });
const DATA = {
  todos: [c1, c2, c3, h3, h1, h2],
  counts: { open: 4, total: 6, human_open: 2, computer_open: 2, archived: 0 },
  sections: { computer: [c1, c2, c3], human: [h3, h1, h2] }
};

const page = (props) => render(CC.h(CC.TodoPage, Object.assign({ data: DATA, brief: null }, props || {})));
const rows = (t) => findAll(t, (n) => n.props['data-id'] && n.props['data-kind'] === 'todo');
const ids = (t, section) => rows(t).filter((r) => (section ? r.props['data-section'] === section : r.props['data-section'] !== 'human')).map((r) => r.props['data-id']);
const sections = (t) => findAll(t, (n) => n.type === 'section' && /cc-td-sec\b/.test(n.props.className || ''));
const byId = (t, id) => rows(t).find((r) => r.props['data-id'] === id);

test('two sections: for you above, for the computer below, done folded at the bottom', () => {
  const t = page();
  assert.deepEqual(sections(t).map((s) => s.props['aria-label']), ['For you', 'For the computer', 'Done']);
  assert.deepEqual(ids(t), ['c2', 'c1']);
  assert.deepEqual(ids(t, 'human'), ['h2', 'h3']);
  const open = page({ initialShowDone: true });
  assert.deepEqual(ids(open), ['c2', 'c1', 'c3']);
  assert.deepEqual(ids(open, 'human'), ['h2', 'h3', 'h1']);
  assert.match(textOf(open), /Done \(2\)/);
});

test('open human items are numbered in order and the first open one carries a quiet Next badge', () => {
  const t = page();
  const nums = (id) => findAll(byId(t, id), (n) => n.props.className === 'cc-td-num').map(textOf);
  assert.deepEqual(nums('h2'), ['1']);
  assert.deepEqual(nums('h3'), ['2']);
  assert.equal(CC.todoView.nextOpenId(DATA.sections.human.slice().sort((a, b) => a.position - b.position)), 'h2');
  const nexts = findAll(t, (n) => n.props.className === 'cc-td-tagnext');
  assert.equal(nexts.length, 1);
  assert.match(textOf(byId(t, 'h2')), /Next/);
  assert.ok(!/Next/.test(textOf(byId(t, 'h3'))));
  const badge = findAll(nexts[0], (n) => /\bcc-bd\b/.test(n.props.className || ''))[0];
  assert.ok(badge && !/cc-bd-(action|error|run)/.test(badge.props.className), 'quiet badge');
});

test('done by the engine shows auto and the archive note', () => {
  const t = page({ initialShowDone: true });
  assert.match(textOf(byId(t, 'h1')), /auto/);
  assert.match(textOf(byId(t, 'h1')), /archives in 5h/);
  assert.ok(byId(t, 'h1') && findAll(byId(t, 'h1'), (n) => n.type === 'input')[0].props.checked);
});

test('computer items say where they went', () => {
  const t = page();
  assert.match(textOf(byId(t, 'c1')), /→ project desktop-tidy, task u2/);
  assert.match(textOf(byId(t, 'c2')), /→ run/);
});

test('clicking an item posts /api/todos/click', () => {
  posts.length = 0;
  const t = page();
  const text = findAll(byId(t, 'h2'), (n) => n.props.role === 'button')[0];
  text.props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(posts[0])), { path: '/api/todos/click', body: { id: 'h2' } });
});

test('expanded item shows link and node; expanded done item shows deliverables', () => {
  const t = page({ initialExpanded: { h2: true, c3: true }, initialShowDone: true });
  const open = byId(t, 'h2');
  const a = findAll(open, (n) => n.type === 'a')[0];
  assert.equal(a.props.href, 'https://example.test/r');
  assert.equal(a.props.target, '_blank');
  assert.match(textOf(open), /Project fund-lab, task n9/);
  const dn = byId(t, 'c3');
  const links = findAll(dn, (n) => n.type === 'a');
  assert.equal(links[0].props.href, 'https://example.test/cv');
  assert.match(textOf(dn), /report draft/);
  assert.match(textOf(dn), /Plan: cv-agentic \/ n3/);
  assert.ok(!/report draft/.test(textOf(byId(page({ initialShowDone: true }), 'c3'))), 'collapsed hides deliverables');
});

test('the add box adds a computer item', () => {
  posts.length = 0;
  const t = page({ initialText: 'Buy milk' });
  const add = findAll(t, (n) => n.type === 'button' && /^Add$/.test(textOf(n)))[0];
  add.props.onClick({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(posts[0])), { path: '/api/todos', body: { text: 'Buy milk', section: 'computer' } });
});

test('the page subscribes to the todo event', () => {
  engineCalls.length = 0;
  render(CC.h(CC.TodoPage, {}));
  const call = engineCalls.find((c) => c.path === '/api/todos');
  assert.ok(call && call.kinds.includes('todo'));
});

test('without sections every item is the computer\'s and the old add body is kept', () => {
  posts.length = 0;
  const old = { todos: [c1, c2], counts: { open: 2, total: 2 } };
  const t = page({ data: old, initialText: 'Old way' });
  assert.deepEqual(sections(t).map((s) => s.props['aria-label']), ['For the computer']);
  assert.deepEqual(ids(t), ['c2', 'c1']);
  assert.equal(findAll(t, (n) => n.props['data-section'] === 'human').length, 0);
  findAll(t, (n) => n.type === 'button' && /^Add$/.test(textOf(n)))[0].props.onClick({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(posts[0])), { path: '/api/todos', body: { text: 'Old way' } });
});

done('todo_sections');
