// agents_panel.test.mjs - Agents tab as the control panel (A4): one switch per agent and route, usage, and the
// Models content (Elo, context, health, Gemini key pool) folded in.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const posts = [];
let postImpl = () => Promise.resolve({ ok: true });
const CC = loadCC(['tokens.js', 'page_agents.js', 'page_models.js'], {
  api: {
    get: () => new Promise(() => {}),
    post: (path, body) => { posts.push([path, JSON.parse(JSON.stringify(body))]); return postImpl(path, body); },
    subscribe: () => () => {}
  },
  useEngine: () => ({ data: null, error: null, loading: true })
});
const X = CC.agentsPanel;
const J = (v) => JSON.parse(JSON.stringify(v));

const U = (pool, label, pct, status) => ({ pool, label, remaining_percent: pct, status: status || 'FRESH', resets_at: null });
const AGENTS = { agents: [
  { id: 'claude_code', name: 'Claude Code', route: 'claude CLI', available: true, usage_percent: 40, usage_status: 'FRESH',
    usage: [U('claude_5h', 'Claude 5 hours', 62), U('claude_week', 'Claude week', 40)] },
  { id: 'codex', name: 'Codex', route: 'codex CLI', available: true, usage_percent: 80, usage_status: 'FRESH',
    usage: [U('codex_5h', 'Codex 5 hours', 80), U('codex_week', 'Codex week', null, 'UNKNOWN')] },
  { id: 'freebuff', name: 'Freebuff', route: 'local proxy', available: false, availability_detail: 'nothing listening on port 1455',
    usage_percent: null, usage_status: 'UNKNOWN', usage: [] }
], folders: [] };
const TOGGLES = [
  { id: 'agent:claude_code', kind: 'agent', label: 'Claude Code', enabled: true },
  { id: 'agent:codex', kind: 'agent', label: 'Codex', enabled: false },
  { id: 'agent:freebuff', kind: 'agent', label: 'Freebuff', enabled: true },
  { id: 'manual:gemini_app', kind: 'route', label: 'Gemini app', enabled: true },
  { id: 'chat:freebuff/deepseek', kind: 'model', label: 'DeepSeek', enabled: true }
];
const MODELS = { models: [
  { id: 'chat:freebuff/deepseek', label: 'DeepSeek V4.1 Flash', provider: 'freebuff', kind: 'chat', model: 'deepseek/x', route: 'freebuff', roles: ['agent'],
    pool: 'provider:freebuff', pool_size: 1, enabled: true, access: true, elo: 1400, context_window: 131072, strongest: true,
    elo_by_effort: {}, health: { ok: false, reason: 'Timed out', checked_at: '2026-11-04T09:00:00+00:00' }, usage: null, source: 'x', sources: {} },
  { id: 'agent:codex', label: 'Codex', provider: 'openai-codex', kind: 'agent', roles: [], enabled: false, access: null, elo: null,
    elo_by_effort: {}, usage: null, strongest: true, pool_size: 1, source: 'x', sources: {} }
], kinds: ['chat', 'subagent', 'agent', 'manual'] };
const KEYS = { provider: 'Google AI Studio (Gemini API)', separate_from: 'Antigravity is separate.', slots: [], active: null, active_state: 'matched',
  subagent_rotation: [], rotation_note: '' };

const page = (extra) => render(CC.h(CC.AgentsPage, Object.assign({ agents: AGENTS, toggles: TOGGLES, modelsData: MODELS, keys: KEYS }, extra || {})));
const switches = (t) => findAll(t, (n) => n.type === 'input' && n.props.type === 'checkbox' && n.props.role === 'switch');
const sw = (t, id) => switches(t).find((n) => n.props['data-id'] === id);

test('normalizeToggles: list form, grouped form, and the /api/models fallback', () => {
  assert.equal(X.normalizeToggles({ toggles: TOGGLES }).length, 5);
  const grouped = X.normalizeToggles({ agents: [{ id: 'agent:codex', enabled: false }], routes: [{ id: 'route:x', enabled: true }], models: [{ id: 'chat:a/b', enabled: true }] });
  assert.deepEqual(J(grouped.map((t) => [t.id, t.kind, t.enabled])), [['agent:codex', 'agent', false], ['route:x', 'route', true], ['chat:a/b', 'model', true]]);
  const fb = X.fromModels(MODELS);
  assert.deepEqual(J(fb.map((t) => [t.id, t.kind, t.enabled])), [['chat:freebuff/deepseek', 'model', true], ['agent:codex', 'agent', false]]);
  assert.deepEqual(X.normalizeToggles(null), null);
});

test('one switch per agent, reflecting the engine; off agents are greyed out', () => {
  const t = page();
  assert.deepEqual(J(switches(t).map((n) => n.props['data-id'])), ['agent:claude_code', 'agent:codex', 'agent:freebuff', 'manual:gemini_app']);
  assert.equal(sw(t, 'agent:claude_code').props.checked, true);
  assert.equal(sw(t, 'agent:codex').props.checked, false);
  const row = (id) => findAll(t, (n) => n.props['data-row'] === id)[0];
  assert.ok(hasClass('cc-ap-off')(row('agent:codex')) && !hasClass('cc-ap-off')(row('agent:claude_code')));
  assert.match(sw(t, 'agent:codex').props['aria-label'], /^Turn on Codex$/);
});

test('usage shows the tightest known pool as one short value; no meter shows nothing', () => {
  const t = page();
  const txt = (id) => textOf(findAll(t, (n) => n.props['data-row'] === id)[0]);
  assert.match(txt('agent:claude_code'), /40% · week/);
  assert.doesNotMatch(txt('agent:claude_code'), /Claude 5 hours/);
  assert.match(txt('agent:codex'), /80% · 5 h/);
  assert.doesNotMatch(txt('agent:freebuff'), /usage meter|%/);
  assert.match(txt('agent:freebuff'), /not running/i);
});

test('routes list after agents; models are not duplicated in the switch list', () => {
  const t = page();
  const heads = findAll(t, hasClass('cc-ap-h')).map(textOf);
  assert.deepEqual(J(heads), ['Agents', 'Routes', 'Models']);
  assert.ok(sw(t, 'manual:gemini_app'));
  assert.ok(!sw(t, 'chat:freebuff/deepseek'));
});

test('flipping a switch posts to /api/toggles/set', () => {
  posts.length = 0; postImpl = () => Promise.resolve({ ok: true });
  const t = page();
  sw(t, 'agent:codex').props.onChange();
  sw(t, 'agent:claude_code').props.onChange();
  assert.deepEqual(J(posts), [['/api/toggles/set', { id: 'agent:codex', enabled: true }], ['/api/toggles/set', { id: 'agent:claude_code', enabled: false }]]);
});

test('without /api/toggles the switch falls back to /api/models/toggle', async () => {
  posts.length = 0;
  postImpl = (path) => path === '/api/toggles/set' ? Promise.reject(Object.assign(new Error('HTTP 404'), { status: 404 })) : Promise.resolve({ ok: true });
  const t = page();
  sw(t, 'agent:codex').props.onChange();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(J(posts), [['/api/toggles/set', { id: 'agent:codex', enabled: true }], ['/api/models/toggle', { id: 'agent:codex', enabled: true }]]);
  postImpl = () => Promise.resolve({ ok: true });
});

test('Models content is folded in: Elo, context, health and the Gemini key pool', () => {
  const t = page();
  const text = textOf(t);
  assert.match(text, /DeepSeek V4\.1 Flash/);
  assert.match(text, /~1400/);
  assert.match(text, /128K/);
  assert.match(text, /Google AI Studio \(Gemini API\) key pool/);
  const tags = findAll(t, hasClass('cc-md-down'));
  assert.equal(tags.length, 1);
  assert.equal(tags[0].props.title, 'Timed out');
  // The agent and route switches live above; the embedded table lists models only.
  assert.ok(!/Codex/.test(textOf(findAll(t, (n) => n.props['data-section'] === 'models-table'))));
});

test('engine down: a calm one-line message and no live switches', () => {
  const t = render(CC.h(CC.AgentsPage, { agents: null, toggles: null, error: new Error('down'), modelsData: null }));
  assert.match(textOf(t), /not reachable/);
  assert.equal(switches(t).length, 0);
});

// ---------------------------------------------------------------- redesign: one dense table per group

test('each row reads switch, name, dot + state word, usage meter; groups are hairline sections', () => {
  const t = page({ agents: Object.assign({}, AGENTS, { connections: [{ id: 'claude_code', agent_id: 'claude_code', state: 'ready', line: 'Ready' }] }) });
  const row = findAll(t, (n) => n.props['data-row'] === 'agent:claude_code')[0];
  const kids = row.props.children;
  assert.equal(kids[0].props.role, 'switch');
  assert.ok(hasClass('cc-ap-name')(kids[1]));
  assert.ok(hasClass('cc-ap-st')(kids[2]));
  assert.equal(textOf(kids[2]), 'Ready');
  assert.ok(findAll(kids[2], hasClass('cc-ap-dot')).length === 1);
  assert.ok(hasClass('cc-ap-use')(kids[3]));
  assert.equal(textOf(kids[3]), '40% · week');
  assert.match(X.STYLE, /\.cc-ap-use\{[^}]*justify-content:flex-end/);
  assert.match(X.STYLE, /\.cc-ap-row\{[^}]*min-height:32px/);
  const secs = findAll(t, (n) => n.type === 'section' && hasClass('cc-sec')(n)).map((s) => s.props['data-section']);
  assert.deepEqual(J(secs.filter((s) => ['agents', 'routes', 'models'].includes(s))), ['agents', 'routes', 'models']);
});

test('owner-only refusals say "Only the owner can change this"', () => {
  assert.equal(X.errText({ status: 403 }), 'Only the owner can change this');
  assert.match(fs.readFileSync(path.join(SRC, 'page_models.js'), 'utf8'), /status === 403\) return 'Only the owner can change this'/);
});

// Retired ids are mapped by Core itself (engine/cc_engine/retired_ids.py); the plugin keeps no filter of its own.
test('ChatGPT Web is listed as a manual route row with its state word', () => {
  const t = page({
    agents: Object.assign({}, AGENTS, { connections: [{ id: 'chatgpt_web', agent_id: null, state: 'ready', line: 'Manual: Copy Prompt' }] }),
    toggles: TOGGLES.concat([{ id: 'chatgpt_web', kind: 'route', label: 'ChatGPT Web', enabled: true }])
  });
  const row = findAll(t, (n) => n.props['data-row'] === 'chatgpt_web')[0];
  assert.ok(row);
  assert.equal(textOf(findAll(row, hasClass('cc-ap-sub'))[0]), 'Manual');
});

test('no personal names, paths or old brand in the Agents and Models files', () => {
  for (const f of ['page_agents.js', 'page_models.js']) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.deepEqual(personalHits(src), [], f);
    assert.doesNotMatch(src, /C:\\Users|Control Centre|ChatMode|@rob\//, f);
  }
});

test('with the kit loaded, rows lead with the kit 28x16 Toggle and names are regular weight', () => {
  const sent = [];
  const K = loadCC(['tokens.js', 'ui.js', 'page_agents.js', 'page_models.js'], {
    api: { get: () => new Promise(() => {}), post: (p, b) => { sent.push([p, JSON.parse(JSON.stringify(b))]); return new Promise(() => {}); }, subscribe: () => () => {} },
    useEngine: () => ({ data: null, error: null, loading: true })
  });
  const t = render(K.h(K.AgentsPage, { agents: AGENTS, toggles: TOGGLES, modelsData: MODELS, keys: KEYS, embedded: true }));
  const row = findAll(t, (n) => n.props['data-row'] === 'agent:codex')[0];
  const lead = row.props.children[0];
  assert.ok(lead.type === 'button' && lead.props.role === 'switch' && hasClass('cc-sw')(lead), 'kit switch leads the row');
  assert.equal(lead.props['aria-checked'], 'false');
  lead.props.onClick();
  assert.deepEqual(sent[0], ['/api/toggles/set', { id: 'agent:codex', enabled: true }]);
  assert.match(K.agentsPanel.STYLE, /\.cc-ap-name\{[^}]*font-size:12px;font-weight:400/);
});

done('agents_panel');
