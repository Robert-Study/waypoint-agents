// agents_wave6.test.mjs - second UI review, agents surface: one route-health source, sentence-case section headings,
// the Claude/Codex Model chip opens the flat table (name, Elo, context, usage), no duplicate empty-chat heading,
// plain route names, and smoke-test chats kept out of the chat list.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

let engine = { data: null, error: null, loading: false };
const CC = loadCC(['tokens.js', 'toggles.js', 'model_badges.js', 'flat_picker.js', 'chat_panel.js', 'page_claude.js',
  'page_models.js', 'page_agents.js'], {
  api: { get: () => new Promise(() => {}), post: () => new Promise(() => {}), subscribe: () => () => {} },
  useEngine: () => engine
});
const X = CC.chatInternals;
const J = (v) => JSON.parse(JSON.stringify(v));

const claude = {
  id: 'claude_code', name: 'Claude Code', available: true, needs_confirm: false, usage_percent: 61.6, usage_status: 'FRESH', usage: [],
  models: [{ id: 'subagent:claude/sonnet', model: 'sonnet-5.5', label: 'Claude Sonnet 5.5', elo: 1450, context_window: 200000 },
    { id: 'subagent:claude/opus', model: 'opus-5.5', label: 'Claude Opus 5.5', elo: 1502.4, context_window: 1000000 }],
  efforts: ['low', 'medium', 'high']
};

// ---- 1. one health source
const CONNS = [
  { id: 'claude_code', agent_id: 'claude_code', state: 'ready', line: 'Ready', ok: true },
  { id: 'freebuff', agent_id: 'freebuff', state: 'bridge_down', line: 'Bridge not answering (HTTP 502)', ok: false },
  { id: 'gemini_app', agent_id: null, state: 'ready', line: 'Manual: Copy Prompt', ok: true }
];

test('route health: one shared source greys a down route and its models, with the reason', () => {
  CC.toggles.applyHealth(CONNS);
  const T = CC.toggles;
  assert.equal(T.usable('chat:freebuff/deepseek'), false);
  assert.equal(T.downReason('chat:freebuff/deepseek'), 'Bridge not answering (HTTP 502)');
  assert.equal(T.usable('route:freebuff'), false);
  assert.equal(T.usable('subagent:claude/opus'), true);
  assert.equal(T.downReason('subagent:claude/opus'), null);
  assert.equal(T.usable('chat:groq/llama'), true, 'unknown health stays usable');
});

test('Models table greys models whose route is down and says why', () => {
  const data = { kinds: ['chat'], models: [
    { id: 'chat:freebuff/deepseek', kind: 'chat', label: 'DeepSeek V4', enabled: true, provider: 'freebuff', route: 'freebuff', roles: ['chat'] },
    { id: 'chat:anthropic/opus', kind: 'chat', label: 'Opus 5.5', enabled: true, provider: 'anthropic', route: 'claude_code', roles: ['chat'] }] };
  const t = render(CC.h(CC.ModelsPage, { embedded: true, data }));
  const tr = (id) => findAll(t, (n) => n.type === 'tr' && n.props['data-id'] === id)[0];
  assert.ok(hasClass('cc-md-off')(tr('chat:freebuff/deepseek')), 'down route greyed');
  assert.ok(findAll(tr('chat:freebuff/deepseek'), (n) => n.props.title === 'Bridge not answering (HTTP 502)').length >= 1, 'reason in tooltip');
  assert.ok(!hasClass('cc-md-off')(tr('chat:anthropic/opus')));
});

// ---- 2. sentence-case headings
test('section headings are sentence case, 12px, never uppercase', () => {
  assert.ok(!/text-transform:uppercase/.test(X.STYLE), 'chat panel');
  assert.ok(!/text-transform:uppercase/.test(CC.agentsPanel.STYLE), 'agents panel');
  assert.match(X.STYLE, /\.cc-ag-h\{[^}]*font-size:12px/);
  assert.match(CC.agentsPanel.STYLE, /\.cc-ap-h\{[^}]*font-size:12px/);
  const s = render(CC.h(X.SessionList, { sessions: [], onNew() {}, onOpen() {} }));
  assert.equal(textOf(findAll(s, hasClass('cc-ag-h'))[0]).replace('New chat', ''), 'Chats');
  const a = render(CC.h(X.SubagentList, { chats: [], onOpen() {} }));
  assert.equal(textOf(findAll(a, hasClass('cc-ag-h'))[0]), 'Subagents');
});

// ---- 3. one model picker
test('Model chip is a button that opens the flat table; nothing preselected; effort stays its own chip', () => {
  const t = render(CC.h(X.ChoiceSelects, { agent: claude, model: '', effort: '', onModel() {}, onEffort() {} }));
  const chip = findAll(t, (n) => n.type === 'button' && n.props['aria-label'] === 'Model')[0];
  assert.ok(chip, 'model chip');
  assert.equal(chip.props['aria-haspopup'], 'listbox');
  assert.equal(textOf(chip).replace(/[▴▾]/g, '').trim(), 'Model');
  assert.equal(findAll(t, (n) => n.type === 'select' && n.props['aria-label'] === 'Model').length, 0, 'no second picker style');
  const eff = findAll(t, (n) => n.type === 'select' && n.props['aria-label'] === 'Effort')[0];
  assert.equal(eff.props.value, '');
});

test('flat rows: name, Elo, context, usage; strongest first; none selected until chosen', () => {
  const rows = X.modelRows(claude, '');
  assert.deepEqual(J(rows.map((r) => [r.name, r.elo, r.ctx, r.usage, r.selected])),
    [['Opus 5.5', '~1502', '1M', '62%', false], ['Sonnet 5.5', '~1450', '200K', '62%', false]]);
  assert.equal(X.modelRows(claude, 'sonnet-5.5').filter((r) => r.selected).map((r) => r.model)[0], 'sonnet-5.5');
});

test('the menu reuses the flat picker table: Pick for me first, a click picks the model', () => {
  const seen = [];
  const t = render(CC.h(X.ModelMenu, { agent: claude, model: '', onModel: (v) => seen.push(v), onClose() {} }));
  const lb = findAll(t, (n) => n.props.role === 'listbox')[0];
  assert.ok(lb, 'flat table listbox');
  const opts = findAll(lb, (n) => n.props.role === 'option');
  assert.equal(textOf(opts[0]), 'Pick for me');
  assert.match(textOf(opts[1]), /^Opus 5\.5~15021M62%$/);
  assert.ok(opts.every((o) => o.props['aria-selected'] === false));
  opts[1].props.onClick();
  opts[0].props.onClick();
  assert.deepEqual(seen, ['opus-5.5', X.PICK]);
  assert.equal(findAll(t, (n) => n.props['aria-label'] === 'Effort').length, 0, 'effort is not in the model menu');
});

// ---- 4. empty chat: name once
test('empty Claude chat names Claude Code once (header), no centred heading', () => {
  engine = { data: { agents: [claude], folders: [{ id: 'd', label: 'Drive', path: 'C:/d' }], default_folder: 'd' }, error: null, loading: false };
  const t = render(CC.h(CC.ClaudePage, null));
  assert.equal((textOf(t).match(/Claude Code/g) || []).length, 1);
  assert.equal(findAll(t, hasClass('cc-ag-hello')).length, 0);
});

// ---- 5. plain route names; every row says a state word (a manual route says Manual)
test('route rows: plain names, wide name column, a manual route says Manual', () => {
  const R = (id, label) => ({ id, kind: 'route', label, enabled: true });
  const toggles = [R('gemini_studio', 'Google AI Studio (Gemini key pool)'), R('deepseek_dsh', 'DeepSeek (dsh)'), R('gemini_app', 'Gemini App')];
  const t = render(CC.h(CC.AgentsPage, { agents: { agents: [], connections: CONNS, folders: [] }, toggles, modelsData: null, keys: null }));
  const row = (id) => findAll(t, (n) => n.props['data-row'] === id)[0];
  const name = (id) => findAll(row(id), hasClass('cc-ap-name'))[0];
  assert.equal(textOf(name('gemini_studio')), 'Google AI Studio');
  assert.equal(textOf(name('deepseek_dsh')), 'DeepSeek');
  assert.match(name('deepseek_dsh').props.title, /DeepSeek \(dsh\)/);
  assert.equal(textOf(findAll(row('gemini_app'), hasClass('cc-ap-sub'))[0]), 'Manual');
  assert.equal(CC.agentsPanel.stateLine(null), 'Unknown');
  assert.equal(CC.agentsPanel.stateLine({ state: 'not_installed' }), 'Not installed');
  assert.ok(!/\.cc-ap-name\{(?:[^}]*;)?width:180px/.test(CC.agentsPanel.STYLE), 'no fixed name width');
  assert.match(CC.agentsPanel.STYLE, /\.cc-ap-name\{[^}]*max-width:360px/);
  assert.equal(CC.agentsPanel.plainName('Google AI Studio (Gemini …'), 'Google AI Studio');
});

test('a down bridge reads red in the Agents list', () => {
  const t = render(CC.h(CC.AgentsPage, { agents: { agents: [{ id: 'freebuff', name: 'Freebuff', available: true, usage: [] }], connections: CONNS, folders: [] },
    toggles: [{ id: 'freebuff', kind: 'agent', label: 'Freebuff', enabled: true }], modelsData: null, keys: null }));
  const dot = findAll(t, (n) => n.props['data-state'] === 'bridge_down')[0];
  assert.ok(dot && hasClass('cc-bad')(dot));
});

// ---- 6. smoke chats hidden
test('smoke-test chats are kept out of the chat list', () => {
  assert.equal(X.isSmoke({ title: 'Reply with exactly: WAYPOINT_OK' }), true);
  assert.equal(X.isSmoke({ title: '[smoke] probe' }), true);
  assert.equal(X.isSmoke({ title: 'Fix the picker' }), false);
  const s = render(CC.h(X.SessionList, { sessions: [{ id: 'a', title: 'Reply with exactly: WAYPOINT_OK' }, { id: 'b', title: 'Real chat' }], onNew() {}, onOpen() {} }));
  assert.equal(findAll(s, hasClass('cc-ag-row')).length, 1);
  assert.match(textOf(s), /Real chat/);
});

done('agents_wave6');
