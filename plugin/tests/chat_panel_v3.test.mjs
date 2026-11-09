// chat_panel_v3.test.mjs - premium chat: pickers, stop/retry, session list, folded tool steps, +/- counts, code copy, modes.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

const engine = { data: null, error: new Error('down'), loading: false };
const CC = loadCC(['tokens.js', 'chat_panel.js', 'page_claude.js', 'page_codex.js'], {
  api: { get: () => new Promise(() => {}), post: () => new Promise(() => {}), subscribe: () => () => {} },
  useEngine: () => engine
});
const X = CC.chatInternals;
const agent = { id: 'claude_code', name: 'Claude Code', available: true, needs_confirm: false,
  models: [{ id: 'a', model: 'opus', label: 'Opus' }], efforts: ['low', 'medium', 'high', 'max'] };
const composerProps = (o) => Object.assign({ agent, on: true, text: 'hi', running: false, canSend: true, choice: { model: '', effort: '' },
  mode: '', onMode() {}, onText() {}, onSend() {}, onStop() {}, onRetry() {}, onModel() {}, onEffort() {}, attachments: [], onAttach() {}, onDetach() {} }, o || {});

test('composer has model and effort pickers, mode toggle, and Send', () => {
  const t = render(CC.h(X.Composer, composerProps()));
  const labels = findAll(t, (n) => n.type === 'select').map((n) => n.props['aria-label']);
  assert.ok(labels.includes('Model') && labels.includes('Effort'));
  const effort = findAll(t, (n) => n.type === 'select' && n.props['aria-label'] === 'Effort')[0];
  assert.deepEqual(findAll(effort, (n) => n.type === 'option').map((o) => o.props.value), ['', 'low', 'medium', 'high', 'max']);
  const modes = findAll(t, (n) => n.type === 'button' && n.props['data-mode']).map((n) => textOf(n));
  assert.deepEqual(modes, ['Plan', 'Autonomous']);
  assert.ok(textOf(t).includes('Send'));
});

test('Stop shows while running; Retry shows only when a last reply exists and idle', () => {
  assert.ok(textOf(render(CC.h(X.Composer, composerProps({ running: true })))).includes('Stop'));
  assert.ok(!textOf(render(CC.h(X.Composer, composerProps({ canRetry: false })))).includes('Retry'));
  assert.ok(textOf(render(CC.h(X.Composer, composerProps({ canRetry: true })))).includes('Retry'));
  assert.ok(!textOf(render(CC.h(X.Composer, composerProps({ canRetry: true, running: true })))).includes('Retry'));
});

test('Enter sends, Shift+Enter does not', () => {
  let sent = 0;
  const t = render(CC.h(X.Composer, composerProps({ onSend: () => sent++ })));
  const ta = findAll(t, (n) => n.type === 'textarea')[0];
  let prevented = 0;
  ta.props.onKeyDown({ key: 'Enter', shiftKey: false, preventDefault: () => prevented++ });
  ta.props.onKeyDown({ key: 'Enter', shiftKey: true, preventDefault: () => prevented++ });
  assert.equal(sent, 1); assert.equal(prevented, 1);
});

test('session list shows past sessions and resumes on click; New chat exists', () => {
  const picked = [];
  const t = render(CC.h(X.SessionList, { sessions: [{ id: 's1', title: 'Fix tests', last_at: null }, { id: 's2', title: 'Plan', last_at: null }],
    selected: 's2', onOpen: (id) => picked.push(id), onNew() {} }));
  const rows = findAll(t, hasClass('cc-ag-row'));
  assert.equal(rows.length, 2);
  rows[0].props.onClick();
  assert.deepEqual(picked, ['s1']);
  assert.ok(textOf(t).includes('New chat'));
});

test('tool steps fold into one row, collapsed after the turn, with +/- counts', () => {
  const items = [{ kind: 'text', text: 'ok' }, { kind: 'tool', text: 'Read a.py' },
    { kind: 'tool', text: 'Edited a.py +12 -3' }, { kind: 'tool', text: 'Edited b.py +1 -0' }, { kind: 'text', text: 'done' }];
  const groups = X.groupItems(items);
  assert.equal(groups.length, 3);
  assert.equal(groups[1].kind, 'steps');
  const sum = X.stepSummary(groups[1].steps);
  assert.equal(sum.count, 3); assert.equal(sum.added, 13); assert.equal(sum.removed, 3);
  assert.equal(sum.files.map((f) => f.path).join(','), 'a.py,b.py');
  const done_ = render(CC.h(X.StepsRow, { steps: groups[1].steps, open: false }));
  assert.ok(findAll(done_, (n) => n.type === 'details').length === 1);
  assert.ok(!findAll(done_, (n) => n.type === 'details')[0].props.open);
  assert.ok(textOf(done_).includes('+13') && textOf(done_).includes('-3'));
  const live = render(CC.h(X.StepsRow, { steps: groups[1].steps, open: true }));
  assert.ok(findAll(live, (n) => n.type === 'details')[0].props.open);
});

test('structured file counts from the engine are honoured', () => {
  const s = X.stepSummary([{ kind: 'tool', text: 'Edited x.py', files: [{ path: 'x.py', added: 5, removed: 2 }] }]);
  assert.equal(s.added, 5); assert.equal(s.removed, 2);
});

test('markdown: code block has a copy button, lists render, inline code stays', () => {
  const t = render(CC.h(X.Markdownish, { text: 'Intro `x`\n\n- one\n- two\n\n```js\nlet a = 1;\n```' }));
  assert.equal(findAll(t, (n) => n.type === 'ul').length, 1);
  assert.equal(findAll(t, (n) => n.type === 'li').length, 2);
  assert.ok(findAll(t, (n) => n.type === 'button' && n.props['aria-label'] === 'Copy code').length === 1);
  assert.ok(findAll(t, (n) => n.type === 'pre').length === 1);
});

test('plan mode wraps the message; autonomous reports progress', () => {
  assert.ok(/checklist/i.test(X.modeMessage('plan', 'do x')) && X.modeMessage('plan', 'do x').includes('do x'));
  assert.equal(X.modeMessage('', 'do x'), 'do x');
  assert.ok(/progress/i.test(X.modeMessage('auto', 'do x')));
});

test('attachments are appended as path context', () => {
  assert.ok(X.withAttachments('go', ['C:/a/b.py']).includes('C:/a/b.py'));
  assert.equal(X.withAttachments('go', []), 'go');
});

test('pages render with the engine down', () => {
  const t = render(CC.h(CC.ClaudePage, null));
  assert.ok(findAll(t, hasClass('cc-ag')).length === 1);
  assert.ok(findAll(render(CC.h(CC.CodexPage, null)), hasClass('cc-ag')).length === 1);
});
done('chat_panel_v3');
