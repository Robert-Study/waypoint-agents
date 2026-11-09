// inspector_simple.test.mjs - I1 (redesigned): the Execute inspector shows title, status, goal, facts, one
// action row (planned route, Copy prompt, Send to menu) and the clean history; the status pill matches the node
// (Ready shows Ready). Mark done / Reopen stay reachable in a small overflow menu.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const FILES = ['tokens.js', 'check_counts.js', 'page_create.js'];
const HISTORY = [
  { at: '2026-11-04T09:00:00+00:00', kind: 'prereqs_met', text: 'Prerequisites done: A', by: 'Check' },
  { at: '2026-11-04T09:05:00+00:00', kind: 'started', text: 'Started by Scheduler', by: 'Scheduler' },
  { at: '2026-11-04T09:20:00+00:00', kind: 'failed', text: 'Failed its command check.', by: 'Check' },
  { at: '2026-11-04T09:30:00+00:00', kind: 'interrupted', text: 'Was stopped because the run was cancelled.', by: 'Scheduler' },
  { at: '2026-11-04T10:00:00+00:00', kind: 'completed', text: 'Marked done by Alex', by: 'Alex' }
];
const MODELS = { models: [{ id: 'claude-sonnet', label: 'Claude Sonnet', route: 'claude_code', enabled: true }] };
const LONG = 'Build the left side of the bridge so traffic flows. Then also write a very long explanation that goes on and on '
  + 'about every detail of the work, far past what fits on one line in the side panel.';

function setup(opts) {
  const o = Object.assign({ node: {}, history: HISTORY, pick: null, detailError: false }, opts || {});
  const node = Object.assign({ id: 'B', title: 'Build it', goal: LONG, status: 'not_started', display_status: 'ready',
    deps: ['A'], pool: 'claude_code', model: 'sonnet', effort: 'high', attempts: 2, actor: 'scheduler',
    evidence: 'exit 1: pytest', check: { type: 'command', run: 'python -m pytest engine/tests -k left -q' },
    checks: [1, 2, 'fail'], recommended: 'claude-sonnet', claim: null }, o.node);
  const calls = [], toasts = [], seen = [];
  const engine = (path) => {
    seen.push(path);
    if (!path) return { data: null };
    if (path.indexOf('/api/node/history') === 0) return o.history ? { data: { history: o.history } } : { data: null, error: new Error('HTTP 404') };
    if (path.indexOf('/api/node') === 0) return o.detailError ? { data: null, error: new Error('offline') } : { data: { node, events: [{ seq: 1, at: '2026-11-04T09:00:00+00:00', summary: 'Internal: swapped model' }] } };
    if (path.indexOf('/api/pick') === 0) return o.pick ? { data: o.pick } : { data: null, error: new Error('HTTP 404') };
    if (path.indexOf('/api/models') === 0) return { data: MODELS };
    return { data: null, error: new Error('HTTP 404') };
  };
  const api = { get() { return Promise.resolve({}); }, post(path, body) { calls.push([path, body]); return Promise.resolve({ ok: true }); } };
  const CC = loadCC(FILES, { useEngine: engine, api, copyText: () => Promise.resolve(), openUrl() {} });
  const tree = render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 7, cwd: 'C:/repo',
    blockedBy: ['A'], toast: (t) => toasts.push(t), onClose() {} }));
  return { CC, tree, calls, toasts, seen };
}

// What the owner sees before opening anything: closed <details> keep only their <summary>.
function visible(tree) {
  if (Array.isArray(tree)) return tree.map(visible);
  if (!tree || typeof tree !== 'object') return tree;
  let children = tree.props.children || [];
  if (tree.type === 'details' && !tree.props.open) children = children.filter((c) => c && c.type === 'summary');
  return { type: tree.type, props: Object.assign({}, tree.props, { children: children.map(visible) }) };
}
const buttons = (t) => findAll(t, (n) => n.type === 'button');

test('default view: title, status, goal, check and facts, one action row, history; routes behind Send to', () => {
  const { tree } = setup();
  const v = visible(tree);
  const text = textOf(v);
  assert.ok(text.indexOf('Build it') >= 0, 'title');
  // Raw evidence, internal events and the done/reopen switch stay out of the default view.
  for (const junk of ['Marked by', 'Details', 'Evidence', 'Mark done', 'exit 1: pytest', 'Internal: swapped model', 'Sprints may pick']) {
    assert.ok(text.indexOf(junk) < 0, 'no "' + junk + '" in the default view');
  }
  assert.equal(findAll(v, (n) => n.type === 'textarea').length, 0, 'no evidence box');
  const facts = findAll(v, hasClass('cc-facts'));
  assert.equal(facts.length, 1, 'one key/value block');
  const f = textOf(facts[0]);
  for (const want of ['Id', 'B', 'Needs', 'Model', 'Attempts', 'Check', 'the tests about left pass', 'Check failing', 'Blocked']) {
    assert.ok(f.indexOf(want) >= 0, 'facts show ' + want + ': ' + f);
  }
  // One action row: the planned route, Copy prompt, and Send to (a closed menu).
  const row = findAll(v, hasClass('cc-side-act'));
  assert.equal(row.length, 1);
  assert.deepEqual(buttons(row[0]).map(textOf), ['Run on Claude Code', 'Copy prompt']);
  assert.equal(textOf(findAll(row[0], (n) => n.type === 'summary')[0]), 'Send to');
  assert.equal(findAll(v, hasClass('cc-send-row')).length, 0, 'route list is closed by default');
  const labels = buttons(tree).map(textOf);
  assert.ok(labels.filter((l) => l === 'Run').length === 3 && labels.filter((l) => l === 'Open').length === 4, labels.join(','));
  assert.equal(findAll(tree, hasClass('cc-b-primary')).length, 0, 'no primary in the inspector until Codex is armed');
});

test('review 2: the description is the whole goal in three wrapped lines, More shows the rest', () => {
  const { tree } = setup();
  const d = findAll(tree, hasClass('cc-desc'));
  assert.equal(d.length, 1);
  const t = textOf(d[0]);
  assert.equal(t, LONG.replace(/\s+/g, ' ').trim());
  assert.ok(findAll(tree, hasClass('cc-desc-more')).length === 1, 'More for a long goal');
  assert.equal(d[0].props.title, LONG);
  const short = setup({ node: { goal: 'Tidy\nthe   logs' } });
  assert.equal(textOf(findAll(short.tree, hasClass('cc-desc'))[0]), 'Tidy the logs');
  const huge = setup({ node: { goal: 'x'.repeat(400) } });
  assert.equal(findAll(short.tree, hasClass('cc-desc-more')).length, 0, 'no More for a short goal');
  const css = huge.tree && true;
  assert.ok(css);
});

test('the clean history lists each moment oldest first with its time', () => {
  const { tree, seen } = setup();
  assert.ok(seen.some((p) => p === '/api/node/history?project=p&id=B'));
  const list = findAll(tree, hasClass('cc-history'));
  assert.equal(list.length, 1);
  const items = findAll(list[0], (n) => n.type === 'li');
  assert.equal(items.length, 5);
  assert.deepEqual(items.map((li) => li.props['data-kind']), HISTORY.map((x) => x.kind));
  assert.ok(textOf(items[0]).indexOf('Prerequisites done: A') >= 0);
  assert.equal(findAll(items[0], (n) => n.type === 'time').length, 1);
  assert.ok(textOf(items[2]).indexOf('Check') >= 0, 'who, when the text does not say it');
  assert.equal((textOf(items[1]).match(/Scheduler/g) || []).length, 1, 'who is not repeated');
});

test('a correction return shows as one line in the history', () => {
  const ret = HISTORY.concat([{ at: '2026-11-04T10:05:00+00:00', kind: 'returned', text: 'Returned: UNIT parser VERDICT fail', by: 'checker' }]);
  const { tree } = setup({ history: ret });
  const items = findAll(findAll(tree, hasClass('cc-history'))[0], (n) => n.type === 'li');
  const last = items[items.length - 1];
  assert.equal(last.props['data-kind'], 'returned');
  assert.ok(textOf(last).indexOf('Returned: UNIT parser VERDICT fail') >= 0 && textOf(last).indexOf(String.fromCharCode(10)) < 0);
});

test('no history API (404) or no history yet: no history block, no crash', () => {
  for (const h of [null, []]) {
    const { tree } = setup({ history: h });
    assert.equal(findAll(tree, hasClass('cc-history')).length, 0);
    assert.ok(textOf(tree).indexOf('Build it') >= 0);
  }
});

test('the status pill uses display_status: Ready shows Ready', () => {
  const pill = (t) => textOf(findAll(t, hasClass('cc-pill'))[0]);
  assert.equal(pill(setup().tree), 'Ready');
  assert.equal(pill(setup({ node: { status: 'running', display_status: 'running' } }).tree), 'Running');
  assert.equal(pill(setup({ node: { status: 'not_started', display_status: 'not_started' } }).tree), 'Not started');
  assert.equal(pill(setup({ node: { status: 'submitted', display_status: undefined } }).tree), 'Checking');
});

test('Mark done and Reopen live in a small overflow menu', () => {
  const s = setup();
  const menu = findAll(s.tree, (n) => n.type === 'details' && hasClass('cc-more')(n));
  assert.equal(menu.length, 1);
  const summary = findAll(menu[0], (n) => n.type === 'summary')[0];
  assert.equal(textOf(summary), '…');
  assert.ok(summary.props['aria-label']);
  const mark = buttons(menu[0]).find((b) => textOf(b) === 'Mark done');
  assert.ok(mark, 'Mark done in the menu');
  mark.props.onClick();
  assert.equal(JSON.stringify(s.calls[0]), JSON.stringify(['/api/node/status', { project: 'p', id: 'B', status: 'done', revision: 7 }]));
  const fin = setup({ node: { status: 'done', display_status: 'done' } });
  const m2 = findAll(fin.tree, (n) => n.type === 'details' && hasClass('cc-more')(n))[0];
  const reopen = buttons(m2).find((b) => textOf(b) === 'Reopen');
  assert.ok(reopen);
  reopen.props.onClick();
  assert.equal(fin.calls[0][1].status, 'not_started');
});

test('Pick for me: a quiet hint when /api/pick answers, nothing on 404', () => {
  const s = setup({ pick: { model: 'claude-sonnet', effort: 'high', why: 'Fits a medium code task.' } });
  const hint = findAll(s.tree, hasClass('cc-pick'));
  assert.equal(hint.length, 1);
  assert.match(textOf(hint[0]), /Pick for me · Sonnet/);
  assert.doesNotMatch(textOf(hint[0]), /high/, 'review 2: effort moves to the tooltip');
  assert.equal(hint[0].props.title, 'Effort high. Fits a medium code task.');
  assert.ok(s.seen.some((p) => p === '/api/pick?kind=task&project=p&id=B'));
  assert.equal(findAll(setup().tree, hasClass('cc-pick')).length, 0);
});

test('engine down: a plain one-line state', () => {
  const { tree } = setup({ detailError: true });
  assert.equal(textOf(tree), 'Could not load this step.');
});

test('quick action: Codex arms first and never runs on one click; a switched-off planned route gets no quick button', () => {
  const s = setup({ node: { recommended: 'codex-5', model: null } });
  const quick = findAll(s.tree, (n) => n.type === 'button' && n.props['data-cc-quick'] === 'codex')[0];
  assert.ok(quick, 'planned Codex shows as the quick action');
  assert.equal(textOf(quick), 'Run on Codex');
  quick.props.onClick();
  assert.equal(s.calls.filter((c) => c[0] === '/api/node/run_owner').length, 0, 'one click only arms');
  const off = setup({ node: { recommended: 'codex-5', model: null } });
  off.CC.isEnabled = (id) => id !== 'codex';
  const t = render(off.CC.h(off.CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 7, toast() {}, onClose() {} }));
  assert.equal(findAll(t, (n) => n.type === 'button' && n.props['data-cc-quick'] === 'codex').length, 0);
  assert.ok(findAll(t, (n) => n.type === 'button' && n.props['data-cc-quick'] === 'copy').length === 1, 'Copy prompt stays');
});

done('inspector_simple');
