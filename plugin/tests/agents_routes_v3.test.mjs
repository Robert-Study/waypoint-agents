// agents_routes_v3.test.mjs - every model connection has a row with a status dot, a one-line state and a switch.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

const CC = loadCC(['tokens.js', 'page_agents.js', 'page_models.js'], {
  api: { get: () => new Promise(() => {}), post: () => Promise.resolve({ ok: true }), subscribe: () => () => {} },
  useEngine: () => ({ data: null, error: null, loading: true })
});
const J = (v) => JSON.parse(JSON.stringify(v));

const AGENT = (id, name) => ({ id, name, route: 'x', available: true, usage_percent: null, usage_status: 'UNKNOWN', usage: [] });
const AGENTS = { agents: [AGENT('claude_code', 'Claude Code'), AGENT('codex', 'Codex'),
  AGENT('freebuff', 'Freebuff'), AGENT('antigravity', 'Antigravity')],
connections: [
  { id: 'claude_code', agent_id: 'claude_code', state: 'ready', line: 'Ready' },
  { id: 'codex', agent_id: 'codex', state: 'ready', line: 'Ready' },
  { id: 'freebuff', agent_id: 'freebuff', state: 'bridge_down', line: 'Bridge down (nothing on port 1455)' },
  { id: 'groq', agent_id: null, state: 'ready', line: 'Ready' },
  { id: 'gemini_studio', agent_id: null, state: 'ready', line: 'Ready' },
  { id: 'gemini_app', agent_id: null, state: 'ready', line: 'Manual: Copy Prompt' },
  { id: 'chatgpt_web', agent_id: null, state: 'ready', line: 'Manual: Copy Prompt' },
  { id: 'copilot', agent_id: null, state: 'not_installed', line: 'GitHub Copilot CLI not installed' },
  { id: 'deepseek_dsh', agent_id: null, state: 'ready', line: 'Ready' },
  { id: 'antigravity_manual', agent_id: 'antigravity', state: 'out_of_credits', line: 'Out of weekly credits, resets Mon 09 Nov' }
], folders: [] };
const R = (id, label) => ({ id, kind: 'route', label, enabled: true });
const TOGGLES = [
  { id: 'claude_code', kind: 'agent', label: 'Claude Code', enabled: true }, { id: 'codex', kind: 'agent', label: 'Codex', enabled: false },
  { id: 'freebuff', kind: 'agent', label: 'Freebuff', enabled: true },
  { id: 'antigravity_manual', kind: 'agent', label: 'Antigravity', enabled: true },
  R('groq', 'Groq LPU'), R('gemini_studio', 'Google AI Studio'), R('gemini_app', 'Gemini App'), R('chatgpt_web', 'ChatGPT Web'), R('copilot', 'GitHub Copilot'),
  R('deepseek_dsh', 'DeepSeek (dsh)')
];
const t = render(CC.h(CC.AgentsPage, { agents: AGENTS, toggles: TOGGLES, modelsData: null, keys: null }));
const row = (id) => findAll(t, (n) => n.props['data-row'] === id)[0];

test('every connection has a switch row', () => {
  const ids = findAll(t, (n) => n.type === 'li' && n.props['data-row']).map((n) => n.props['data-row']);
  for (const id of ['agent:claude_code', 'agent:codex', 'agent:freebuff', 'agent:antigravity',
    'groq', 'gemini_studio', 'gemini_app', 'chatgpt_web', 'copilot', 'deepseek_dsh']) assert.ok(ids.includes(id), id);
});

test('each row shows a status dot and a one-line state', () => {
  assert.match(textOf(row('copilot')), /GitHub Copilot CLI not installed/);
  assert.match(textOf(row('agent:antigravity')), /Out of weekly credits, resets/);
  assert.match(textOf(row('agent:freebuff')), /Bridge down/);
  const dot = (id) => findAll(row(id), (n) => n.props['data-state'] !== undefined)[0];
  assert.equal(dot('agent:claude_code').props['data-state'], 'ready');
  assert.ok(hasClass('cc-ready')(dot('agent:claude_code')));
  assert.ok(hasClass('cc-bad')(dot('agent:antigravity')));
  assert.ok(!hasClass('cc-ready')(dot('copilot')) && !hasClass('cc-bad')(dot('copilot')));
});

test('an off connection is greyed out', () => {
  assert.ok(hasClass('cc-ap-off')(row('agent:codex')));
  assert.ok(!hasClass('cc-ap-off')(row('copilot')));
});

test('connectionFor matches by id or chat agent id', () => {
  assert.equal(CC.agentsPanel.connectionFor(AGENTS.connections, 'agent:antigravity').id, 'antigravity_manual');
  assert.equal(CC.agentsPanel.connectionFor(AGENTS.connections, 'route:copilot').id, 'copilot');
  assert.equal(CC.agentsPanel.connectionFor([], 'x'), null);
});
done('agents_routes_v3');
