// claude_codex_tabs.test.mjs - Claude and Codex chat tabs (CC.ChatPanel): model/effort selectors, Pick for me, Subagents list (A1-A3).
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

const gets = [];
let engine = { data: null, error: null, loading: true };
const CC = loadCC(['tokens.js', 'chat_panel.js', 'page_claude.js', 'page_codex.js'], {
  api: {
    get: (p) => { gets.push(p); return new Promise(() => {}); },
    post: () => new Promise(() => {}),
    subscribe: () => () => {}
  },
  useEngine: () => engine
});
const X = CC.chatInternals;
const J = (v) => JSON.parse(JSON.stringify(v));

const claude = {
  id: 'claude_code', name: 'Claude Code', glyph: 'claude', route: 'claude CLI', note: 'Max', available: true,
  needs_confirm: false, usage_percent: 60, usage_status: 'FRESH', usage: [],
  models: [{ id: 'subagent:claude/opus', model: 'opus-5.5', label: 'Claude Opus 5.5' },
    { id: 'subagent:claude/sonnet', model: 'sonnet-5.5', label: 'Claude Sonnet 5.5' }],
  efforts: ['low', 'medium', 'high', 'xhigh', 'max']
};
const codex = {
  id: 'codex', name: 'Codex', glyph: 'codex', route: 'codex CLI', note: 'Plus', available: true, needs_confirm: true,
  usage_percent: 80, usage_status: 'FRESH', usage: [],
  models: [{ id: 'chat:openai-codex/c', model: 'gpt-6-codex', label: 'GPT-6 Codex' }], efforts: ['low', 'medium', 'high', 'xhigh']
};
const freebuff = {
  id: 'freebuff', name: 'Freebuff', glyph: 'deepseek', route: 'local proxy', note: 'Free', available: true,
  needs_confirm: false, usage_percent: null, usage_status: 'UNKNOWN', usage: [],
  models: [{ id: 'chat:freebuff/d', model: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4.1 Flash' }], efforts: []
};
const bare = Object.assign({}, freebuff, { id: 'antigravity', name: 'Antigravity', models: [], efforts: [] });

const selects = (t) => findAll(t, (n) => n.type === 'select');
const sel = (t, label) => selects(t).find((n) => n.props['aria-label'] === label);
const opts = (s) => findAll(s, (n) => n.type === 'option');

test('Claude: model select offers Pick for me then only the registry models; nothing preselected', () => {
  const t = render(CC.h(X.ChoiceSelects, { agent: claude, model: '', effort: '', onModel() {}, onEffort() {} }));
  const m = sel(t, 'Model');
  assert.ok(m, 'model select');
  assert.equal(m.props.value, '');
  const o = opts(m);
  assert.deepEqual(o.map((n) => n.props.value), ['', '__pick__', 'opus-5.5', 'sonnet-5.5']);
  assert.equal(textOf(o[1]), 'Pick for me');
  assert.equal(textOf(o[2]), 'Opus 5.5');
  const e = sel(t, 'Effort');
  assert.equal(e.props.value, '');
  assert.deepEqual(opts(e).map((n) => n.props.value), ['', 'low', 'medium', 'high', 'xhigh', 'max']);
  assert.ok(!/recommended/i.test(textOf(t)));
});

test('selects set color-scheme through their class and report changes', () => {
  const seen = [];
  const t = render(CC.h(X.ChoiceSelects, { agent: claude, model: '', effort: '', onModel: (v) => seen.push(['m', v]), onEffort: (v) => seen.push(['e', v]) }));
  assert.ok(hasClass('cc-ag-chip')(sel(t, 'Model')));
  sel(t, 'Model').props.onChange({ target: { value: 'opus-5.5' } });
  sel(t, 'Effort').props.onChange({ target: { value: 'max' } });
  assert.deepEqual(seen, [['m', 'opus-5.5'], ['e', 'max']]);
});

test('Codex keeps its own efforts; agents without lists show no selects', () => {
  const c = render(CC.h(X.ChoiceSelects, { agent: codex, model: '', effort: '', onModel() {}, onEffort() {} }));
  assert.deepEqual(opts(sel(c, 'Effort')).map((n) => n.props.value), ['', 'low', 'medium', 'high', 'xhigh']);
  const f = render(CC.h(X.ChoiceSelects, { agent: freebuff, model: '', effort: '', onModel() {}, onEffort() {} }));
  assert.ok(sel(f, 'Model') && !sel(f, 'Effort'));
  const b = render(CC.h(X.ChoiceSelects, { agent: bare, model: '', effort: '', onModel() {}, onEffort() {} }));
  assert.equal(selects(b).length, 0);
});

test('Pick for me locks effort to the picker answer', () => {
  const t = render(CC.h(X.ChoiceSelects, { agent: claude, model: '__pick__', effort: '', onModel() {}, onEffort() {} }));
  assert.equal(sel(t, 'Effort').props.disabled, true);
});

test('resolveChoice: plain choices pass through without asking the picker', async () => {
  let asked = 0;
  const get = () => { asked++; return Promise.resolve({}); };
  assert.deepEqual(await X.resolveChoice(claude, { model: 'opus-5.5', effort: 'high' }, get), { model: 'opus-5.5', effort: 'high' });
  assert.deepEqual(await X.resolveChoice(claude, {}, get), {});
  assert.equal(asked, 0);
});

test('resolveChoice: Pick for me maps the picked model id to an offered model and clamps effort', async () => {
  const urls = [];
  const ok = (answer) => (u) => { urls.push(u); return Promise.resolve(answer); };
  let r = await X.resolveChoice(claude, { model: '__pick__' }, ok({ model: 'subagent:claude/sonnet', effort: 'max', why: 'x' }));
  assert.deepEqual(r, { model: 'sonnet-5.5', effort: 'max' });
  assert.equal(urls[0], '/api/pick?kind=chat');
  r = await X.resolveChoice(claude, { model: '__pick__' }, ok({ model: 'opus-5.5', effort: 'high' }));
  assert.deepEqual(r, { model: 'opus-5.5', effort: 'high' });
  r = await X.resolveChoice(codex, { model: '__pick__' }, ok({ model: 'gpt-6-codex', effort: 'max' }));
  assert.deepEqual(r, { model: 'gpt-6-codex', effort: 'xhigh' });
  r = await X.resolveChoice(freebuff, { model: '__pick__' }, ok({ model: 'other', effort: 'high' }));
  assert.deepEqual(r, {}, 'unknown model and no efforts: the CLI default');
});

test('resolveChoice: a missing picker (404) falls back to the default instead of failing', async () => {
  const r = await X.resolveChoice(claude, { model: '__pick__' }, () => Promise.reject(Object.assign(new Error('HTTP 404'), { status: 404 })));
  assert.deepEqual(r, {});
});

test('Subagents list: heading, one row per chat with agent and state, selection and click', () => {
  const chats = [
    { id: 'job:p/A1/1', title: 'A1 · p', agent: 'claude_code', agent_name: 'Claude Code', status: 'running', started: '2026-11-04T09:00:00+00:00', resumable: false },
    { id: 'ticket:t1', title: 'Summarise the repo', agent: 'freebuff', agent_name: 'Freebuff', status: 'error', started: '2026-11-04T08:00:00+00:00', resumable: false }
  ];
  const clicked = [];
  const t = render(CC.h(X.SubagentList, { chats, selected: 'ticket:t1', onOpen: (c) => clicked.push(c.id) }));
  assert.match(textOf(findAll(t, hasClass('cc-ag-h'))[0]), /^subagents$/i);
  const rows = findAll(t, (n) => n.type === 'button' && hasClass('cc-ag-row')(n));
  assert.equal(rows.length, 2);
  assert.match(textOf(rows[0]), /A1 · p/);
  assert.ok(findAll(rows[0], hasClass('cc-busy')).length === 1, 'running chat pulses');
  assert.match(textOf(rows[1]), /failed/);
  assert.ok(hasClass('cc-sel')(rows[1]) && !hasClass('cc-sel')(rows[0]));
  rows[0].props.onClick();
  assert.deepEqual(clicked, ['job:p/A1/1']);
});

test('Subagents list: empty state is one line', () => {
  const t = render(CC.h(X.SubagentList, { chats: [], selected: null, onOpen() {} }));
  assert.match(textOf(t), /SUBAGENTS/i);
  assert.match(textOf(findAll(t, hasClass('cc-ag-empty'))[0]), /^No subagent chats yet\.$/);
});

test('subagent transcript: prompt, output and a one-line reason when it cannot be resumed', () => {
  const chat = { id: 'ticket:t1', title: 'Summarise', agent_name: 'Freebuff', model: null, status: 'done', prompt: 'Summarise the repo',
    output: 'It is a repo.', resumable: false, resume_note: 'This ticket worker ran once and cannot be resumed.' };
  const items = X.subagentItems(chat);
  assert.deepEqual(Array.from(items.map((i) => i.kind)), ['user', 'text']);
  assert.equal(items[1].text, 'It is a repo.');
  assert.equal(X.subagentWait(Object.assign({}, chat, { status: 'running', output: '' })), true);
  assert.equal(X.subagentWait(chat), false);
});

test('subagent reply body carries the chat id and the chosen model/effort', () => {
  assert.deepEqual(J(X.replyBody({ id: 'job:p/A1/1' }, ' go on ', { model: 'opus-5.5', effort: 'high' })),
    { id: 'job:p/A1/1', message: 'go on', model: 'opus-5.5', effort: 'high' });
  assert.deepEqual(J(X.replyBody({ id: 'x' }, 'hi', {})), { id: 'x', message: 'hi' });
});

test('Claude tab: only Claude, with Model and Effort selects and a Subagents heading; engine down is calm', () => {
  engine = { data: { agents: [claude, codex, freebuff], folders: [{ id: 'drive', label: 'Drive', path: 'C:/d' }], default_folder: 'drive' }, error: null, loading: false };
  let t = render(CC.h(CC.ClaudePage, null));
  assert.ok(sel(t, 'Model') && sel(t, 'Effort'), 'selects in the composer');
  assert.deepEqual(opts(sel(t, 'Model')).map((n) => n.props.value).slice(2), ['opus-5.5', 'sonnet-5.5']);
  assert.match(textOf(findAll(t, (n) => n.type === 'aside')[0]), /SUBAGENTS/i);
  assert.ok(!/Codex/.test(textOf(t)), 'no other agent in the Claude tab');
  assert.equal(findAll(t, (n) => n.type === 'button' && /^Send$/.test(textOf(n))).length, 1);
  engine = { data: null, error: new Error('down'), loading: false };
  t = render(CC.h(CC.ClaudePage, null));
  assert.match(textOf(t), /not answering/);
  assert.equal(selects(t).filter((n) => n.props['aria-label'] === 'Model').length, 0);
});

test('Codex tab: its own models and efforts; the confirm click is kept', () => {
  engine = { data: { agents: [claude, codex], folders: [{ id: 'drive', label: 'Drive', path: 'C:/d' }], default_folder: 'drive' }, error: null, loading: false };
  const t = render(CC.h(CC.CodexPage, null));
  assert.deepEqual(opts(sel(t, 'Model')).map((n) => n.props.value).slice(2), ['gpt-6-codex']);
  assert.deepEqual(opts(sel(t, 'Effort')).map((n) => n.props.value), ['', 'low', 'medium', 'high', 'xhigh']);
  assert.ok(codex.needs_confirm);
});

test('a disabled agent hides the composer and cannot send', () => {
  engine = { data: { agents: [claude, codex], folders: [], default_folder: null }, error: null, loading: false };
  CC.isEnabled = (id) => id !== 'agent:codex';
  let t = render(CC.h(CC.CodexPage, null));
  assert.equal(findAll(t, (n) => n.type === 'textarea').length, 0);
  assert.match(textOf(t), /Turned off in Agents/);
  t = render(CC.h(CC.ClaudePage, null));
  assert.equal(findAll(t, (n) => n.type === 'textarea')[0].props.disabled, false);
  delete CC.isEnabled;
});

done('claude_codex_tabs');
