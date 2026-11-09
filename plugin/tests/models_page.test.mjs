// models_page.test.mjs - CC.ModelsPage (M2) and its Google AI Studio key section (M3), in a vm.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';

const posts = [];
const CC = loadCC(['tokens.js', 'inputs.js', 'page_models.js'], {
  api: {
    get: () => new Promise(() => {}),
    post: (path, body) => { posts.push({ path, body }); return Promise.resolve({ ok: true, models: [] }); },
    subscribe: () => () => {}
  },
  useEngine: () => ({ data: null, error: null, loading: true })
});

const U = (pct, status, resets) => ({ remaining_percent: pct, status: status || 'FRESH', resets_at: resets || null });
const row = (o) => Object.assign({
  provider_label: null, model: null, route: null, runner: null, roles: [], pool: null, enabled: true, access: null,
  elo: null, elo_by_effort: { low: 'n/a', medium: 'n/a', high: 'n/a', xhigh: 'n/a', max: 'n/a' }, effort: null,
  context_window: null, speed: null, usage: null, run_natively: false, run_natively_reason: null, note: null,
  strongest: true, pool_size: 1, source: 'fixture', sources: {}
}, o);

const MODELS = [
  row({ id: 'chat:freebuff/deepseek', label: 'DeepSeek V4.1 Flash', provider: 'freebuff', provider_label: '1. Freebuff ($0 Unmetered Pool)',
    kind: 'chat', model: 'deepseek/deepseek-v4-flash', route: 'freebuff', runner: 'freebuff', roles: ['agent', 'subagent'],
    pool: 'provider:freebuff', pool_size: 3, context_window: 131072, speed: '227 tok/s' }),
  row({ id: 'chat:freebuff/luna', label: 'GPT-6 Luna', provider: 'freebuff', kind: 'chat', model: 'openai/gpt-6-luna',
    route: 'freebuff', runner: 'freebuff', roles: ['agent', 'subagent'], pool: 'provider:freebuff', pool_size: 3,
    strongest: false, context_window: 131072, enabled: false }),
  row({ id: 'chat:freebuff/mimo', label: 'MiMo 2.6 Pro', provider: 'freebuff', kind: 'chat', model: 'mimo/mimo-v2.6-pro',
    route: 'freebuff', roles: ['agent', 'subagent'], pool: 'provider:freebuff', pool_size: 3, strongest: false }),
  row({ id: 'chat:github-copilot/gone', label: 'Gone model', provider: 'github-copilot', kind: 'chat', roles: ['agent'],
    pool: 'provider:github-copilot', access: false }),
  row({ id: 'chat:anthropic/opus', label: 'Claude Opus 5.5 (Claude Pro OAuth)', provider: 'anthropic', kind: 'chat', roles: [],
    elo: 1507, run_natively: true, run_natively_reason: 'Use it in Claude Code.', usage: U(40, 'FRESH', '2026-11-09T09:00:00+00:00'),
    context_window: 1000000 }),
  row({ id: 'subagent:antigravity/argon', label: 'Gemini 4 Argon (high) · Antigravity (agy CLI)', provider: 'antigravity',
    kind: 'subagent', model: 'gemini-4-argon-high', route: 'antigravity', runner: 'antigravity', roles: ['subagent'],
    pool: 'runner:antigravity', elo: 1525, elo_by_effort: { low: 'n/a', medium: 'n/a', high: '~1525', xhigh: 'n/a', max: 'n/a' },
    effort: 'high', context_window: 1000000, speed: '43-62 tok/s', usage: U(55, 'STALE'), run_natively: true,
    run_natively_reason: 'Best inside Antigravity.' }),
  row({ id: 'agent:claude_code', label: 'Claude Code', provider: 'anthropic', kind: 'agent', route: 'claude_code', runner: 'claude',
    usage: U(62) }),
  row({ id: 'agent:codex', label: 'Codex', provider: 'openai-codex', kind: 'agent', route: null, run_natively: true,
    note: "Alex's own agent", usage: U(null, 'UNKNOWN') }),
  row({ id: 'manual:gemini_app', label: 'Gemini app', provider: 'google', kind: 'manual', route: 'gemini_app', usage: U(null, 'UNKNOWN') })
];
const DATA = { models: MODELS, kinds: ['chat', 'subagent', 'agent', 'manual'] };
const KEYS = {
  provider: 'Google AI Studio (Gemini API)',
  separate_from: 'Antigravity (agy) is a different product with its own sign-in and usage pools.',
  slots: [
    { slot: 'A', label: 'Key A', env: 'GEMINI_API_KEY_A', present: true, active: true, same_as: null, from: '.env' },
    { slot: 'B', label: 'Key B', env: 'GEMINI_API_KEY_B', present: true, active: false, same_as: null, from: '.env' },
    { slot: 'Primary', label: 'Primary', env: 'GEMINI_API_KEY', present: true, active: false, same_as: 'A', from: '.env' }
  ],
  active: 'A', active_state: 'matched', subagent_rotation: ['A', 'B'],
  rotation_note: 'The Gemini subagent starts at the first slot.', restart_hint: 'Restart dsh after a switch.'
};

const page = (props) => render(CC.h(CC.ModelsPage, Object.assign({ data: DATA, keys: KEYS }, props || {})));
const table = (t) => findAll(t, (n) => n.type === 'table' && hasClass('cc-md-table')(n))[0];
const bodyRows = (t) => findAll(table(t), (n) => n.type === 'tr' && n.props['data-id']);
const rowById = (t, id) => bodyRows(t).find((r) => r.props['data-id'] === id);
const cells = (tr) => findAll(tr, (n) => n.type === 'td');
const tick = (tr) => findAll(tr, (n) => n.type === 'input' && n.props.type === 'checkbox')[0];
const buttons = (t, re) => findAll(t, (n) => n.type === 'button' && re.test(textOf(n)));

test('helpers: context, usage and Elo formatting (blank when unknown)', () => {
  const v = CC.modelsView;
  assert.equal(v.fmtContext(131072), '128K');
  assert.equal(v.fmtContext(200000), '200K');
  assert.equal(v.fmtContext(1000000), '1M');
  assert.equal(v.fmtContext(null), '');
  assert.equal(v.fmtElo(MODELS[5]), '~1525');
  assert.equal(v.fmtElo(MODELS[0]), '');
  assert.equal(v.effortText(MODELS[5]), 'high ~1525');
  assert.equal(v.effortText(MODELS[0]), '');
  assert.match(v.fmtUsage(U(62)), /^62%/);
  assert.equal(v.fmtUsage(U(null, 'UNKNOWN')), '');
  assert.equal(v.fmtUsage(null), '');
  assert.equal(v.providerName(MODELS[0]), 'Freebuff ($0 Unmetered Pool)');
});

test('all view: one dense table, sticky header, groups in kind order', () => {
  const t = page();
  assert.equal(findAll(t, (n) => n.type === 'table' && hasClass('cc-md-table')(n)).length, 1);
  // The key pool table is its own section, not nested in the model table.
  assert.equal(findAll(table(t), (n) => n.type === 'table').length, 1);
  const thead = findAll(table(t), (n) => n.type === 'thead')[0];
  assert.ok(hasClass('cc-md-sticky')(thead) || findAll(thead, hasClass('cc-md-sticky')).length);
  const heads = findAll(thead, (n) => n.type === 'th').map(textOf);
  for (const col of ['Name', 'Provider', 'Elo', 'Context', 'Speed', 'Usage']) assert.ok(heads.includes(col), col);
  assert.ok(!heads.includes('Route'), 'no Route column');
  const groups = findAll(table(t), hasClass('cc-md-group')).map(textOf);
  assert.deepEqual(groups.map((g) => g.replace(/\s*\d+$/, '')), ['Chat models', 'Subagents', 'Agents', 'Manual']);
  // No cards inside cards: nothing in the table carries a card class.
  assert.equal(findAll(t, (n) => typeof n.props.className === 'string' && /card/.test(n.props.className)).length, 0);
});

test('all view: blank cells when unknown, values when sourced', () => {
  const t = page();
  const luna = cells(rowById(t, 'chat:freebuff/deepseek'));
  const text = luna.map(textOf);
  assert.ok(text.includes('128K'));
  assert.ok(text.includes('227 tok/s'));
  const elo = luna.find((c) => c.props['data-col'] === 'elo');
  assert.equal(textOf(elo), '');
  const usage = luna.find((c) => c.props['data-col'] === 'usage');
  assert.equal(textOf(usage), '');
  const argon = cells(rowById(t, 'subagent:antigravity/argon'));
  assert.equal(textOf(argon.find((c) => c.props['data-col'] === 'elo')), '~1525');
  assert.match(textOf(argon.find((c) => c.props['data-col'] === 'usage')), /55%/);
  const codex = cells(rowById(t, 'agent:codex'));
  assert.equal(textOf(codex.find((c) => c.props['data-col'] === 'usage')), '');
});

test('all view: only the strongest model per pool until expanded; no-access rows hidden', () => {
  let t = page();
  assert.ok(rowById(t, 'chat:freebuff/deepseek'));
  assert.equal(rowById(t, 'chat:freebuff/luna'), undefined);
  assert.equal(rowById(t, 'chat:github-copilot/gone'), undefined);
  assert.equal(buttons(t, /2 more/).length, 1);
  t = page({ initialExpanded: ['provider:freebuff'], initialShowNoAccess: true });
  assert.ok(rowById(t, 'chat:freebuff/luna'));
  assert.ok(rowById(t, 'chat:github-copilot/gone'));
});

test('enable tick reflects state and posts an owner toggle', () => {
  posts.length = 0;
  const t = page({ initialExpanded: ['provider:freebuff'] });
  assert.equal(tick(rowById(t, 'chat:freebuff/deepseek')).props.checked, true);
  assert.equal(tick(rowById(t, 'chat:freebuff/luna')).props.checked, false);
  tick(rowById(t, 'chat:freebuff/deepseek')).props.onChange();
  tick(rowById(t, 'chat:freebuff/luna')).props.onChange();
  assert.deepEqual(JSON.parse(JSON.stringify(posts)), [
    { path: '/api/models/toggle', body: { id: 'chat:freebuff/deepseek', enabled: false } },
    { path: '/api/models/toggle', body: { id: 'chat:freebuff/luna', enabled: true } }
  ]);
});

test('run natively marker and Codex as own agent', () => {
  const t = page();
  const opus = rowById(t, 'chat:anthropic/opus');
  assert.match(textOf(opus), /Native/);
  const mark = findAll(opus, hasClass('cc-md-native'))[0];
  assert.match(mark.props.title, /Claude Code/);
  assert.doesNotMatch(textOf(rowById(t, 'chat:freebuff/deepseek')), /Native/);
  assert.equal(cells(rowById(t, 'agent:codex')).find((c) => c.props['data-col'] === 'route'), undefined);
  assert.equal(CC.modelsView.routeText(MODELS.find((r) => r.id === 'agent:codex')), 'none (own use)');
});

test('agent picker view: flat table, agent role only, strongest first by Elo', () => {
  const t = page({ initialView: 'agent' });
  const ids = bodyRows(t).map((r) => r.props['data-id']);
  assert.deepEqual(ids, ['chat:freebuff/deepseek']);
  assert.equal(findAll(table(t), hasClass('cc-md-group')).length, 0);
  const heads = findAll(table(t), (n) => n.type === 'th').map(textOf);
  assert.ok(heads.includes('Elo by effort') && heads.includes('Context') && heads.includes('Speed'));
  const all = page({ initialView: 'agent', initialShowAll: true });
  const allIds = bodyRows(all).map((r) => r.props['data-id']);
  assert.ok(allIds.includes('chat:freebuff/luna'));
  assert.ok(!allIds.includes('chat:anthropic/opus'));
});

test('agent view sorts by known Elo, unknown last', () => {
  const extra = row({ id: 'chat:x/strong', label: 'Strong', provider: 'x', kind: 'chat', roles: ['agent'], pool: 'provider:x', elo: 1600 });
  const t = page({ initialView: 'agent', data: { models: MODELS.concat([extra]) } });
  assert.deepEqual(bodyRows(t).map((r) => r.props['data-id']), ['chat:x/strong', 'chat:freebuff/deepseek']);
});

test('subagent view: select-all list of subagent models, ticks = enabled', () => {
  posts.length = 0;
  const t = page({ initialView: 'subagent', initialShowAll: true });
  const list = findAll(t, hasClass('cc-select'))[0];
  const boxes = findAll(list, (n) => n.type === 'input' && n.props.type === 'checkbox');
  const values = boxes.map((b) => b.props.value);
  assert.deepEqual(values, ['chat:freebuff/deepseek', 'chat:freebuff/luna', 'chat:freebuff/mimo', 'subagent:antigravity/argon']);
  assert.deepEqual(boxes.map((b) => b.props.checked), [true, false, true, true]);
  const selectAll = findAll(t, (n) => n.type === 'button' && textOf(n) === 'Select all')[0];
  selectAll.props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(posts)), [
    { path: '/api/models/toggle', body: { ids: ['chat:freebuff/luna'], enabled: true } }
  ]);
  posts.length = 0;
  findAll(t, (n) => n.type === 'button' && textOf(n) === 'Clear')[0].props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(posts)), [
    { path: '/api/models/toggle', body: { ids: ['chat:freebuff/deepseek', 'chat:freebuff/mimo', 'subagent:antigravity/argon'], enabled: false } }
  ]);
});

test('Google AI Studio key section: slots only, separate from Antigravity, owner switch', () => {
  posts.length = 0;
  const t = page();
  const sec = findAll(t, (n) => n.props['data-section'] === 'gemini-keys')[0];
  assert.ok(sec);
  const text = textOf(sec);
  assert.match(text, /Google AI Studio/);
  // Kept apart from Antigravity: said in the heading's tooltip, not in a paragraph.
  assert.match(findAll(sec, hasClass('cc-md-sec-h'))[0].props.title, /Antigravity/);
  assert.doesNotMatch(text, /different product|Subagent rotation/);
  const meta = findAll(sec, hasClass('cc-md-meta'));
  assert.equal(meta.length, 1, 'one short meta line');
  assert.equal(textOf(meta[0]), 'Rotates A → B on a 429. Restart dsh after a switch.');
  assert.match(text, /GEMINI_API_KEY_B/);
  assert.match(text, /In use by dsh/);
  assert.match(text, /same key as A/);
  const use = findAll(sec, (n) => n.type === 'button' && /Use in dsh/.test(textOf(n)));
  assert.equal(use.length, 3);
  assert.equal(use[0].props.disabled, true);
  assert.equal(use[2].props.disabled, true);
  use[1].props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(posts)), [{ path: '/api/models/gemini_keys/switch', body: { slot: 'B' } }]);
});

test('key section: refuses to offer a switch that would lose an outside key', () => {
  const keys = Object.assign({}, KEYS, { active: null, active_state: 'not_in_pool',
    slots: KEYS.slots.map((s) => Object.assign({}, s, { active: false })) });
  const sec = findAll(page({ keys }), (n) => n.props['data-section'] === 'gemini-keys')[0];
  assert.match(textOf(sec), /not in this pool/);
  assert.ok(findAll(sec, (n) => n.type === 'button' && /Use in dsh/.test(textOf(n))).every((b) => b.props.disabled));
});

test('loading and engine-down states render without throwing', () => {
  assert.match(textOf(render(CC.h(CC.ModelsPage, {}))), /Loading/);
  const t = render(CC.h(CC.ModelsPage, { data: null, error: new Error('down') }));
  assert.match(textOf(t), /engine/i);
});

test('styles: tokens only, both themes set color-scheme', () => {
  const css = CC.modelsView.STYLE;
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|gradient|!important/i);
  assert.match(css, /color-scheme:light/);
  assert.match(css, /color-scheme:dark/);
  assert.match(css, /position:sticky/);
  const sizes = new Set([...css.matchAll(/font-size:(\d+)px/g)].map((m) => +m[1]));
  for (const s of sizes) assert.ok([11, 12, 14, 17, 22].includes(s), 'font size ' + s);
});

test('provider names are display-cased; Native is quiet meta text, not a badge', () => {
  const v = CC.modelsView;
  assert.equal(v.providerName({ provider: 'deepseek' }), 'DeepSeek');
  assert.equal(v.providerName({ provider: 'ollama' }), 'Ollama');
  assert.equal(v.providerName({ provider: 'some-host' }), 'Some Host');
  assert.equal(v.providerName({ provider: 'anthropic' }), 'Anthropic');
  const opus = rowById(page(), 'chat:anthropic/opus');
  const mark = findAll(opus, hasClass('cc-md-native'))[0];
  assert.ok(mark && !hasClass('cc-md-tag')(mark) && !/cc-bd/.test(mark.props.className));
  assert.match(CC.modelsView.STYLE, /\.cc-md-native\{[^}]*color:var\(--cc-text-3\)/);
  assert.doesNotMatch(CC.modelsView.STYLE, /\.cc-md-native\{[^}]*border/);
});

test('with the kit loaded, the enable switch is the kit 28x16 Toggle (as in Settings)', () => {
  const K = loadCC(['tokens.js', 'ui.js', 'inputs.js', 'page_models.js'], {
    api: { get: () => new Promise(() => {}), post: (p, b) => { posts.push({ path: p, body: b }); return Promise.resolve({ ok: true, models: [] }); }, subscribe: () => () => {} },
    useEngine: () => ({ data: null, error: null, loading: true })
  });
  const t = render(K.h(K.ModelsPage, { data: DATA, keys: KEYS }));
  const tr = findAll(t, (n) => n.type === 'tr' && n.props['data-id'] === 'chat:freebuff/deepseek')[0];
  const sw = findAll(tr, (n) => n.type === 'button' && n.props.role === 'switch')[0];
  assert.ok(sw && hasClass('cc-sw')(sw), 'kit switch');
  assert.equal(sw.props['aria-checked'], 'true');
  assert.equal(findAll(tr, (n) => n.type === 'input').length, 0);
  posts.length = 0;
  sw.props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(posts)), [{ path: '/api/models/toggle', body: { id: 'chat:freebuff/deepseek', enabled: false } }]);
});

done('models_page');
