// G4 done-check: one CC.isEnabled helper greys out switched-off agents, routes and models on every
// surface. Run: node plugin/tests/greyed_out.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done, SRC } from './harness.mjs';

const PAYLOAD = {
  toggles: [
    { id: 'claude_code', kind: 'agent', label: 'Claude Code', enabled: true },
    { id: 'codex', kind: 'agent', label: 'Codex', enabled: false },
    { id: 'freebuff', kind: 'agent', label: 'Freebuff', enabled: false },
    { id: 'subagent:claude/opus-5.5', kind: 'subagent', label: 'Opus', enabled: false }
  ],
  enabled: { claude_code: true, codex: false, 'agent:codex': false, freebuff: false, 'agent:freebuff': false,
    'subagent:claude/opus-5.5': false },
  aliases: { 'agent:codex': 'codex', 'runner:claude': 'claude_code', 'agent:freebuff': 'freebuff' },
  defaults_off: ['codex'],
  cascade_kinds: ['subagent', 'agent', 'manual']
};

function withToggles(files, payload) {
  const CC = loadCC(['toggles.js'].concat(files || []));
  if (payload) CC.toggles.apply(payload);
  return CC;
}

test('defaults before the engine answers: Codex off, the rest on', () => {
  const CC = withToggles();
  assert.equal(typeof CC.isEnabled, 'function');
  assert.equal(CC.isEnabled('codex'), false);
  assert.equal(CC.isEnabled('agent:codex'), false);
  assert.equal(CC.isEnabled('claude_code'), true);
  assert.equal(CC.isEnabled('subagent:claude/sonnet-5.5'), true);
  assert.equal(CC.isEnabled(''), true);
});

test('server payload: aliases share one switch, routes grey their models', () => {
  const CC = withToggles([], PAYLOAD);
  assert.equal(CC.toggles.state.loaded, true);
  assert.equal(CC.isEnabled('freebuff'), false);
  assert.equal(CC.isEnabled('route:freebuff'), false);
  assert.equal(CC.isEnabled('runner:freebuff'), false);
  assert.equal(CC.isEnabled('subagent:freebuff/deepseek-v4'), false);   // route off greys its models
  assert.equal(CC.isEnabled('subagent:claude/opus-5.5'), false);        // the model's own switch
  assert.equal(CC.isEnabled('subagent:claude/sonnet-5.5'), true);
  assert.equal(CC.isEnabled('runner:claude'), true);
  assert.equal(CC.toggles.grey('freebuff'), CC.toggles.GREY);
  assert.equal(CC.toggles.grey('claude_code'), '');
  assert.equal(CC.toggles.allEnabled(['claude_code', 'freebuff']), false);
});

test('codex switched on in the payload', () => {
  const CC = withToggles([], Object.assign({}, PAYLOAD, { enabled: { codex: true } }));
  assert.equal(CC.isEnabled('codex'), true);
  assert.equal(CC.isEnabled('agent:codex'), true);
});

// The fetch/SSE scenario runs first (async); its observations are asserted in a plain test.
// vm objects come from another realm: compare as JSON.
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const tick = () => new Promise((r) => setTimeout(r, 0));
const seenSse = await (async () => {
  let gets = 0, listener = null, seen = 0;
  const CC = loadCC(['toggles.js'], {
    api: {
      get: (p) => { gets++; return Promise.resolve(p === '/api/toggles' && gets === 1 ? PAYLOAD : { enabled: { freebuff: true } }); },
      subscribe: (fn) => { listener = fn; return () => {}; }
    }
  });
  const out = {};
  CC.toggles.subscribe(() => { seen++; });
  CC.toggles.subscribe(() => {});
  await tick();
  out.afterFirst = { gets, freebuff: CC.isEnabled('freebuff') };
  listener('state', {});
  await tick();
  out.afterState = gets;
  listener('toggles', { id: 'freebuff', enabled: true });
  await tick();
  out.afterToggles = { gets, freebuff: CC.isEnabled('freebuff'), seen };
  return out;
})();

test('fetches /api/toggles once and refreshes on the SSE toggles event', () => {
  same(seenSse.afterFirst, { gets: 1, freebuff: false }, 'one fetch, however many subscribers');
  assert.equal(seenSse.afterState, 1, 'other events do not refetch');
  assert.equal(seenSse.afterToggles.gets, 2);
  assert.equal(seenSse.afterToggles.freebuff, true);
  assert.ok(seenSse.afterToggles.seen >= 2);
});

test('shared greyed-out class has its own injected style', () => {
  const CC = withToggles();
  assert.ok(CC.toggles.STYLE.includes('.cc-root .' + CC.toggles.GREY));
  assert.ok(!/!important|gradient|box-shadow/.test(CC.toggles.STYLE));
});

test('Autonomous ticks: switched-off models are greyed and cannot be ticked', () => {
  const CC = withToggles(['autonomous_controls.js'], PAYLOAD);
  const A = CC.autonomous;
  const models = A.enabledModels([
    { id: 'subagent:claude/opus-5.5', label: 'Opus', kind: 'subagent', route: 'claude_code' },
    { id: 'subagent:claude/sonnet-5.5', label: 'Sonnet', kind: 'subagent', route: 'claude_code' },
    { id: 'chat:freebuff/deepseek', label: 'DeepSeek', kind: 'chat', route: 'freebuff' },
    { id: 'agent:codex', label: 'Codex', kind: 'agent', provider: 'openai-codex', route: null }
  ]);
  const by = Object.fromEntries(models.map((m) => [m.id, m]));
  assert.equal(by['subagent:claude/opus-5.5'].off, true);
  assert.equal(by['subagent:claude/opus-5.5'].runnable, false);
  assert.equal(by['subagent:claude/sonnet-5.5'].runnable, true);
  assert.equal(by['chat:freebuff/deepseek'].off, true);
  assert.equal(by['agent:codex'].route, 'codex');
  assert.equal(by['agent:codex'].off, true);
  const s = { models: [], sequence: [] };
  same(A.toggleModel(s, 'subagent:claude/opus-5.5', models).models, [], 'ticking an off model is refused');
  same(A.toggleModel(s, 'subagent:claude/sonnet-5.5', models).models, ['subagent:claude/sonnet-5.5']);
  same(A.selectedPools({ models: ['subagent:claude/opus-5.5'], sequence: [] }, models), []);
  const tree = render(CC.h(CC.AutonomousControls.RunControls, {
    settings: { preset: 'balanced', models: [], efforts: { claude: 'medium', codex: 'medium' }, max_use: {}, sequence: [] },
    models, source: 'registry', onChange: () => {} }));
  const grey = findAll(tree, hasClass(CC.toggles.GREY));
  assert.ok(grey.some((n) => textOf(n).includes('Opus')), 'Opus row greyed');
  assert.ok(!grey.some((n) => textOf(n).includes('Sonnet')), 'Sonnet row not greyed');
  assert.ok(grey.some((n) => textOf(n).startsWith('Codex')), 'Codex effort greyed while Codex is off');
});

test('Codex ticks run once Codex is switched on', () => {
  const CC = withToggles(['autonomous_controls.js'], { enabled: { codex: true } });
  const models = CC.autonomous.enabledModels([{ id: 'agent:codex', label: 'Codex', kind: 'agent', provider: 'openai-codex' }]);
  assert.equal(models[0].runnable, true);
  same(CC.autonomous.selectedPools({ models: ['agent:codex'], sequence: [] }, models), ['codex']);
});

test('Run sheet / sprint adders: switched-off pools are greyed and refused', () => {
  const CC = withToggles(['autonomous_controls.js', 'page_sprints.js'], PAYLOAD);
  const S = CC.sprintsHelpers;
  assert.equal(S.adderOn('claude'), true);
  assert.equal(S.adderOn('codex'), false);
  assert.equal(S.adderOn('dual'), false);
  assert.equal(S.isOn('freebuff'), false);
  const pruned = S.prune({ models: ['subagent:claude/opus-5.5'], sequence: [[{ project: 'p', model: 'subagent:claude/opus-5.5' }]],
    max_use: { freebuff: true, claude_code: true } },
  CC.autonomous.enabledModels([{ id: 'subagent:claude/opus-5.5', kind: 'subagent', route: 'claude_code' }]));
  same(pruned.models, []);
  assert.equal(pruned.sequence[0][0].model, null);
  same(pruned.max_use, { claude_code: true });
  assert.equal(S.blockText({ state: 'due', pool: 'codex' }, Date.now()), 'off in Agents');
});

// Every surface that offers an agent, route or model must ask CC.isEnabled. Some are still being
// written by other workers: a missing file is skipped and named below.
const SURFACES = [
  ['page_create.js'], ['flat_picker.js', 'model_badges.js'], ['page_claude.js', 'chat_panel.js'], ['page_codex.js', 'chat_panel.js'],
  ['page_agents.js'], ['autonomous_controls.js'], ['page_sprints.js']
];
const missing = [], lacking = [];
test('every surface references CC.isEnabled', () => {
  for (const group of SURFACES) {
    const present = group.filter((f) => fs.existsSync(path.join(SRC, f)));
    if (!present.length) { missing.push(group.join(' or ')); continue; }
    const uses = present.some((f) => /CC\.isEnabled\b/.test(fs.readFileSync(path.join(SRC, f), 'utf8')));
    if (!uses) lacking.push(present.join(' or '));
  }
  if (missing.length) console.log('       skipped (not written yet): ' + missing.join(', '));
  if (lacking.length) console.log('       still lacking CC.isEnabled: ' + lacking.join(', '));
  assert.deepEqual(lacking, [], 'surfaces without CC.isEnabled: ' + lacking.join(', '));
});

test('toggles.js is in the build order right after api.js', () => {
  const order = fs.readFileSync(path.join(SRC, 'ORDER'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  assert.ok(order.indexOf('toggles.js') > order.indexOf('api.js'));
  assert.ok(order.indexOf('toggles.js') < order.indexOf('autonomous_controls.js'));
});

setTimeout(() => done('greyed_out'), 50);
