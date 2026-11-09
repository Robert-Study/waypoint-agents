// agents_wave3.test.mjs - U1 review fixes for the agents surface (docs/ui_review.md lines 34-43):
// one switch style, short usage, a fixed-width models table, no Route column, red dots instead of Down pills,
// no starter chips, chosen values on the pickers, short calm usage, an off state that links to Agents, no CLI tag.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

let engine = { data: null, error: null, loading: true };
const selected = [];
const CC = loadCC(['tokens.js', 'chat_panel.js', 'page_claude.js', 'page_codex.js', 'page_agents.js', 'page_models.js'], {
  api: { get: () => new Promise(() => {}), post: () => new Promise(() => {}), subscribe: () => () => {} },
  useEngine: () => engine
});
CC.ctx = { layout: { selectPanel: (p) => selected.push(p) } };
const X = CC.chatInternals;
const AP = CC.agentsPanel;
const MV = CC.modelsView;

const U = (pool, label, pct, status, observed) => ({ pool, label, remaining_percent: pct, status: status || 'FRESH', resets_at: null, observed_at: observed || null });
const claude = {
  id: 'claude_code', name: 'Claude Code', route: 'claude CLI', available: true, needs_confirm: false,
  usage_percent: 73, usage_pool: 'Claude week (all models)', usage_status: 'STALE',
  usage: [U('claude_5h', 'Claude 5 hours', 92), U('claude_week', 'Claude week (all models)', 73, 'STALE', '2026-11-04T18:33:00')],
  models: [{ id: 'subagent:claude/opus', model: 'opus-5.5', label: 'Claude Opus 5.5' }], efforts: ['low', 'medium', 'high']
};
const codex = {
  id: 'codex', name: 'Codex', route: 'codex CLI', available: true, needs_confirm: true,
  usage_percent: 13, usage_pool: 'Codex week', usage_status: 'STALE', usage: [U('codex_week', 'Codex week', 13, 'STALE')],
  models: [], efforts: []
};
const free = { id: 'freebuff', name: 'Freebuff', route: 'local proxy', available: true, usage_percent: null, usage_status: 'UNKNOWN', usage: [] };
const ENGINE = { data: { agents: [claude, codex, free], folders: [{ id: 'drive', label: 'Drive', path: 'C:/d' }], default_folder: 'drive' }, error: null, loading: false };

// ---------------------------------------------------------------- Agents page (lines 34-36)
test('34: agent switches match the Settings switch (the kit switch: accent, 28x16)', () => {
  const css = AP.STYLE;
  assert.match(css, /input\.cc-ap-sw\{[^}]*width:28px;height:16px/);
  assert.match(css, /input\.cc-ap-sw:checked\{background:var\(--cc-accent\)/);
  assert.doesNotMatch(css, /cc-ap-sw[^{]*\{[^}]*--cc-done/);
});

test('35: usage is one meter and one short value, stale is a dimmer number with a tooltip, no meter shows nothing', () => {
  const u = AP.usageShort(claude);
  assert.equal(u.text, '73% · week');
  assert.equal(u.stale, true);
  assert.match(u.title, /Last read 18:33/);
  assert.equal(AP.usageShort(free), null);
  assert.equal(AP.usageShort({ usage: [U('a', 'Claude 5 hours', 92)] }).text, '92% · 5 h');
  const t = render(CC.h(CC.AgentsPage, { agents: { agents: [claude, free], connections: [] }, toggles: [], modelsData: { models: [] }, keys: null }));
  const row = (id) => findAll(t, (n) => n.props['data-row'] === id)[0];
  const all = textOf(t);
  assert.doesNotMatch(all, /stale/i);
  assert.doesNotMatch(all, /no usage meter/);
  assert.doesNotMatch(all, /Claude 5 hours/);
  assert.match(textOf(row('agent:claude_code')), /73% · week/);
  assert.ok(findAll(row('agent:claude_code'), hasClass('cc-ap-dim')).length >= 1, 'stale value is dimmed');
  assert.equal(findAll(row('agent:freebuff'), hasClass('cc-ap-meter')).length, 0);
});

test('36: the models table is fixed width with ellipsis cells and folds Speed to zero width below 1200px', () => {
  assert.match(MV.STYLE, /\.cc-md-table\{[^}]*table-layout:fixed/);
  assert.match(MV.STYLE, /text-overflow:ellipsis/);
  // Speed folds to a zero-width column; hiding its cells would shift Usage into its slot.
  assert.match(MV.STYLE, /@media \(max-width:1199px\)\{[^\n]*col\.cc-md-c-speed\{width:0;\}[^\n]*\[data-col="speed"\]\{visibility:hidden/);
  assert.match(AP.STYLE, /\.cc-ap-scroll\{[^}]*overflow-x:hidden/);
});

// ---------------------------------------------------------------- Models table (lines 37-38)
const ROW = (o) => Object.assign({ id: 'x', label: 'X', provider: 'freebuff', provider_label: null, kind: 'chat', roles: [], enabled: true,
  access: null, elo: null, elo_by_effort: {}, context_window: null, speed: null, usage: null, sources: {}, pool: null }, o);
const MODELS = { models: [
  ROW({ id: 'chat:freebuff/deepseek', label: 'DeepSeek V4.1 Flash', provider_label: '3. Freebuff ($0 Unmetered Pool)', route: 'freebuff', speed: '227 tok/s',
    health: { ok: false, reason: 'Timed out' } }),
  ROW({ id: 'chat:groq/llama', label: 'Llama 3.3 70B', provider_label: 'Groq LPU ($0 Sub-Second)', route: 'groq' })
], kinds: ['chat'] };

test('37: no Route column, short provider names, headers in the UI font', () => {
  const t = render(CC.h(CC.ModelsPage, { data: MODELS, keys: null }));
  const heads = findAll(t, (n) => n.type === 'th').map(textOf);
  assert.ok(!heads.includes('Route'));
  assert.equal(findAll(t, (n) => n.props && n.props['data-col'] === 'route').length, 0);
  const prov = findAll(t, (n) => n.type === 'td' && n.props['data-col'] === 'provider').map(textOf);
  assert.deepEqual(prov, ['Freebuff', 'Groq LPU']);
  assert.match(MV.STYLE, /\.cc-md-table th[^{]*\{[^}]*font-family:inherit/);
  assert.equal(MV.providerShort({ provider_label: 'Freebuff ($0 Unmetered Pool)' }), 'Freebuff');
});

test('38: a failed health check is a small red dot with the reason as its tooltip', () => {
  const t = render(CC.h(CC.ModelsPage, { data: MODELS, keys: null }));
  const row = findAll(t, (n) => n.props && n.props['data-id'] === 'chat:freebuff/deepseek')[0];
  assert.doesNotMatch(textOf(row), /Down/);
  const dot = findAll(row, hasClass('cc-md-down'))[0];
  assert.ok(dot, 'red dot');
  assert.equal(dot.props.title, 'Timed out');
  assert.match(MV.STYLE, /\.cc-md-down\{[^}]*border-radius:50%[^}]*background:var\(--cc-error\)/);
});

// ---------------------------------------------------------------- Chat tabs (lines 39-43)
test('39: the empty chat has no starter chips, only the heading and the composer', () => {
  engine = ENGINE;
  const t = render(CC.h(CC.ClaudePage, null));
  assert.equal(findAll(t, hasClass('cc-ag-starter')).length, 0);
  assert.doesNotMatch(textOf(t), /Summarise this folder|Review my recent changes|Plan the next step/);
  assert.ok(findAll(t, (n) => n.type === 'textarea').length === 1);
});

test('40: pickers show the chosen value; usage is short ("73% week")', () => {
  assert.equal(X.usageChipText(claude), '73% week');
  const t = render(CC.h(X.ChoiceSelects, { agent: claude, model: 'opus-5.5', effort: 'medium', onModel() {}, onEffort() {} }));
  const opts = (label) => findAll(findAll(t, (n) => n.type === 'select' && n.props['aria-label'] === label)[0], (n) => n.type === 'option');
  assert.equal(textOf(opts('Model').find((o) => o.props.value === 'opus-5.5')), 'Opus 5.5');
  assert.equal(textOf(opts('Effort').find((o) => o.props.value === 'medium')), 'Medium');
  assert.match(textOf(t), /·/);
  const blank = render(CC.h(X.ChoiceSelects, { agent: claude, model: '', effort: '', onModel() {}, onEffort() {} }));
  assert.doesNotMatch(textOf(blank), /·/);
});

test('41: stale usage is quiet text, low fresh usage uses the warning tone, never the accent', () => {
  engine = ENGINE;
  CC.isEnabled = () => true;
  const t = render(CC.h(CC.CodexPage, null));
  const chip = findAll(t, (n) => n.props && n.props['data-usage'] !== undefined)[0];
  assert.ok(chip, 'usage chip');
  assert.equal(textOf(chip), '13% week');
  assert.ok(hasClass('cc-ag-stale')(chip));
  assert.match(chip.props.title, /Last read/);
  assert.match(X.STYLE, /\.cc-ag-chip\.cc-ag-stale\{color:var\(--cc-text-3\)/);
  assert.match(X.STYLE, /\.cc-ag-chip\.cc-warn\{color:var\(--cc-error\)/);
  delete CC.isEnabled;
});

test('42: an agent switched off offers Open Agents and hides the composer', () => {
  engine = ENGINE;
  selected.length = 0;
  CC.isEnabled = (id) => id !== 'agent:codex';
  const t = render(CC.h(CC.CodexPage, null));
  assert.equal(findAll(t, (n) => n.type === 'textarea').length, 0);
  const btn = findAll(t, (n) => n.type === 'button' && textOf(n) === 'Open Agents')[0];
  assert.ok(btn && hasClass('cc-ag-ghost')(btn));
  btn.props.onClick();
  assert.deepEqual(selected, ['cc-agents']);
  delete CC.isEnabled;
});

test('43: the chat header has no CLI tag; the name shows before the engine answers', () => {
  engine = ENGINE;
  const t = render(CC.h(CC.ClaudePage, null));
  const bar = findAll(t, hasClass('cc-ag-bar'))[0];
  assert.doesNotMatch(textOf(bar), /CLI/);
  engine = { data: null, error: null, loading: true };
  const l = render(CC.h(CC.ClaudePage, null));
  assert.doesNotMatch(textOf(l), /Loading/);
  assert.match(textOf(findAll(l, hasClass('cc-ag-bar'))[0]), /Claude Code/);
});

done('agents_wave3');
