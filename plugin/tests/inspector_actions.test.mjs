// inspector_actions.test.mjs - C3: clicking a task offers a clear "Send to" list (Run rows for each
// CLI route and Codex, Open rows for Antigravity, Gemini App and AI Studio, Copy prompt; I3), marks the planned
// recommended model, keeps Mark done / Reopen, shows who is working on it (C2 claim); the Create
// Run button opens Autonomous; the usage strip shows only Codex and Claude.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const FILES = ['tokens.js', 'ui.js', 'check_counts.js', 'layout_flow.js', 'layout_star.js', 'waves.js', 'view_flow.js',
  'view_star.js', 'view_waves.js', 'inputs.js', 'page_create.js'];
const PROMPT = '# Task B: Build it\nDo the thing.';
const MODELS = { models: [
  { id: 'claude-sonnet', label: 'Claude Sonnet', provider: 'anthropic', kind: 'subagent', route: 'claude_code', enabled: true },
  { id: 'deepseek-v4', label: 'DeepSeek V4', provider: 'deepseek', kind: 'subagent', route: 'freebuff', enabled: true }] };
const USAGE = { pools: [
  { pool: 'claude_5h', remaining_percent: 60, status: 'FRESH', resets_at: null },
  { pool: 'codex_5h', remaining_percent: 40, status: 'FRESH', resets_at: null },
  { pool: 'freebuff', remaining_percent: 90, status: 'FRESH', resets_at: null },
  { pool: 'gemini_app', remaining_percent: null, status: 'UNKNOWN', resets_at: null }] };

// Kit More menus open on click; this stand-in draws them open so their items can be asserted
// (the kit Menu itself is covered by ui_kit.test.mjs and execute_plan_kit.test.mjs).
const openMenus = (CC) => { CC.ui.Menu = (p) => CC.h('div', { className: 'cc-mn ' + (p.className || '') }, (p.items || []).filter((i) => i && !i.sep)
  .map((i) => CC.h('button', { key: i.label, type: 'button', className: 'cc-mn-i', disabled: !!i.disabled, onClick: i.onClick }, i.label))); return CC; };
function setup(opts) {
  const o = Object.assign({ node: {}, models: MODELS }, opts || {});
  const node = Object.assign({ id: 'B', title: 'Build it', goal: 'g', status: 'not_started', display_status: 'ready', deps: ['A'],
    check: { type: 'command', run: 'exit 0' }, recommended: 'claude-sonnet', claim: null }, o.node);
  const calls = [], copied = [], opened = [], panels = [], toasts = [];
  const engine = (path) => {
    if (!path) return { data: null };
    if (path.indexOf('/api/node') === 0) return { data: { node, events: [] } };
    if (path.indexOf('/api/models') === 0) return o.models ? { data: o.models } : { data: null, error: new Error('HTTP 404') };
    if (path.indexOf('/api/usage') === 0) return { data: USAGE };
    if (path.indexOf('/api/projects') === 0) return { data: { projects: [{ id: 'p', title: 'Proj' }] } };
    if (path.indexOf('/api/board') === 0) return { data: { project: { id: 'p', cwd: 'C:/repo' }, nodes: [], edges: [], counts: {} } };
    if (path.indexOf('/api/questions') === 0) return { data: { questions: [] } };
    return { data: null };
  };
  const api = {
    get() { return Promise.resolve({}); },
    post(path, body) {
      calls.push([path, body]);
      if (path === '/api/prompt') return Promise.resolve({ prompt: PROMPT });
      if (path === '/api/agents/send') return Promise.resolve({ turn_id: 't1', session_id: 's1', agent: body.agent });
      return Promise.resolve({ ok: true });
    }
  };
  const CC = loadCC(FILES, {
    useEngine: engine, unpackBoard: (b) => b, api,
    copyText: (t) => { copied.push(t); return Promise.resolve(); },
    openUrl: (u) => { opened.push(u); },
    ctx: { layout: { selectPanel: (id) => panels.push(id) } }
  });
  openMenus(CC);
  const tree = render(CC.h(CC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 3, cwd: 'C:/repo',
    toast: (t) => toasts.push(t), onClose() {} }));
  return { CC, tree, calls, copied, opened, panels, toasts };
}
const rows = (tree) => findAll(tree, hasClass('cc-send-row'));
const rowNamed = (tree, name) => rows(tree).find((r) => textOf(findAll(r, hasClass('cc-send-n'))[0]) === name);
const buttonIn = (el) => findAll(el, (n) => n.type === 'button')[0];
const flush = () => new Promise((r) => setTimeout(r, 0));

// ---- async clicks first; assertions run synchronously in test() below
const results = {};
{
  const s = setup();
  buttonIn(rowNamed(s.tree, 'Claude Code')).props.onClick();
  await flush(); await flush();
  results.claude = s;
}
{
  const s = setup();
  buttonIn(rowNamed(s.tree, 'Codex')).props.onClick();
  await flush(); await flush();
  results.codex = s;
}
{
  const s = setup();
  buttonIn(rowNamed(s.tree, 'Gemini App')).props.onClick();
  await flush(); await flush();
  results.gemini = s;
}
{
  const s = setup();
  buttonIn(rowNamed(s.tree, 'Antigravity')).props.onClick();
  await flush(); await flush();
  results.agy = s;
}
{
  const s = setup();
  buttonIn(rowNamed(s.tree, 'Copy prompt')).props.onClick();
  await flush(); await flush();
  results.copy = s;
}

test('Send to lists every route in order', () => {
  const { tree } = setup();
  assert.equal(findAll(tree, hasClass('cc-send')).length, 1);
  assert.deepEqual(rows(tree).map((r) => textOf(findAll(r, hasClass('cc-send-n'))[0])),
    ['Claude Code', 'Freebuff', 'Codex', 'Antigravity', 'Gemini App', 'ChatGPT Web', 'AI Studio Playground', 'Copy prompt']);
  assert.equal(textOf(buttonIn(rowNamed(tree, 'Codex'))), 'Run');
  assert.match(textOf(rowNamed(tree, 'Codex')), /confirm/i);
  assert.match(textOf(rowNamed(tree, 'Antigravity')), /opens/i);
});

test('the recommended model is marked on its route (from /api/models)', () => {
  const { tree } = setup();
  const marks = findAll(tree, hasClass('cc-send-rec'));
  assert.equal(marks.length, 1);
  assert.ok(findAll(rowNamed(tree, 'Claude Code'), hasClass('cc-send-rec')).length === 1);
  assert.match(textOf(findAll(tree, hasClass('cc-send-plan'))[0]), /Claude Sonnet/);
  const fb = setup({ node: { recommended: 'deepseek-v4' } });
  assert.equal(findAll(rowNamed(fb.tree, 'Freebuff'), hasClass('cc-send-rec')).length, 1);
});

test('without /api/models the recommendation still maps by id', () => {
  const a = setup({ models: null, node: { recommended: 'claude-opus' } });
  assert.equal(findAll(rowNamed(a.tree, 'Claude Code'), hasClass('cc-send-rec')).length, 1);
  const g = setup({ models: null, node: { recommended: 'gemini-app' } });
  assert.equal(findAll(rowNamed(g.tree, 'Gemini App'), hasClass('cc-send-rec')).length, 1);
  const n = setup({ models: null, node: { recommended: null } });
  assert.equal(findAll(n.tree, hasClass('cc-send-rec')).length, 0);
  const u = setup({ models: null, node: { recommended: 'mystery-1' } });
  assert.equal(findAll(u.tree, hasClass('cc-send-rec')).length, 0);
  assert.match(textOf(findAll(u.tree, hasClass('cc-send-plan'))[0]), /mystery-1/);
});

test('a CLI route sends the task prompt through the Agents route in the project folder', () => {
  const { calls, toasts } = results.claude;
  assert.equal(calls[0][0], '/api/prompt');
  assert.equal(JSON.stringify(calls[1]), JSON.stringify(['/api/agents/send', { agent: 'claude_code', message: PROMPT, cwd: 'C:/repo' }]));
  assert.ok(toasts.some((t) => /Claude Code/.test(t)));
});

test('Codex is never dispatched automatically: one click only arms its confirm (I4)', () => {
  const { calls, copied } = results.codex;
  assert.ok(!calls.some((c) => c[0] === '/api/agents/send'), 'no automatic Codex dispatch');
  assert.ok(!calls.some((c) => c[0] === '/api/node/run_owner'), 'runs only after the confirm click');
  assert.equal(copied.length, 0);
});

test('Gemini App and Antigravity copy and open; Copy prompt only copies', () => {
  assert.deepEqual(results.gemini.copied, [PROMPT]);
  assert.deepEqual(results.gemini.opened, ['https://gemini.google.com/app']);
  assert.deepEqual(results.agy.copied, [PROMPT]);
  assert.deepEqual(results.agy.opened, ['antigravity://']);
  assert.deepEqual(results.copy.copied, [PROMPT]);
  for (const r of [results.gemini, results.agy, results.copy]) assert.ok(!r.calls.some((c) => c[0] === '/api/agents/send'));
});

test('Mark done and Reopen stay', () => {
  const open = setup();
  assert.ok(findAll(open.tree, (n) => n.type === 'button' && textOf(n) === 'Mark done').length === 1);
  const fin = setup({ node: { status: 'done', display_status: 'done' } });
  assert.ok(findAll(fin.tree, (n) => n.type === 'button' && textOf(n) === 'Reopen').length === 1);
});

test('a claimed task shows who works on it, the worktree, folder and environment', () => {
  const claim = { by: 'lead-session', worktree: 'meridian-c', cwd: 'C:/work/worktrees/meridian-c',
    environment: 'Claude Code desktop, Opus 5.5', since: '2026-11-04T12:00:00+00:00', stale: false };
  const s = setup({ node: { status: 'running', display_status: 'running', actor: 'lead-session', claim } });
  const box = findAll(s.tree, hasClass('cc-claim'));
  assert.equal(box.length, 1);
  const t = textOf(box[0]);
  for (const part of ['lead-session', 'meridian-c', 'C:/work/worktrees/meridian-c', 'Claude Code desktop, Opus 5.5']) assert.ok(t.indexOf(part) >= 0, part);
  assert.ok(!/stale/i.test(t));
  const st = setup({ node: { status: 'running', claim: Object.assign({}, claim, { stale: true }) } });
  assert.match(textOf(findAll(st.tree, hasClass('cc-claim'))[0]), /stale/i);
  assert.equal(findAll(setup().tree, hasClass('cc-claim')).length, 0);
});

test('Create Run opens the Autonomous tab instead of the old sheet', () => {
  const s = setup();
  const page = render(s.CC.h(s.CC.CreatePage, {}));
  const run = findAll(page, (n) => n.type === 'button' && textOf(n) === 'Run')[0];
  assert.ok(run, 'Run button');
  run.props.onClick();
  assert.deepEqual(s.panels, ['cc-sprints']);
  assert.equal(findAll(page, (n) => n.props && n.props['aria-label'] === 'Run' && n.props.role === 'dialog').length, 0);
});

test('Create header carries no usage strip (U1 review: Autonomous owns usage)', () => {
  const s = setup();
  const page = render(s.CC.h(s.CC.CreatePage, {}));
  assert.equal(findAll(page, hasClass('cc-strip')).length, 0);
  assert.doesNotMatch(textOf(page), /stale/);
});

done('inspector_actions');
