// model_badges.test.mjs - badges in dsh's chat model picker (M4), drawn through the public
// `conversation.input.model.label` slot from Meridian's /api/models rows. The catalog name stays
// the text; unknown facts stay blank; every slot call is guarded like the rest of the bundle.
import assert from 'node:assert/strict';
import { loadCC, makeReact, render, findAll, textOf, test, done } from './harness.mjs';

const SLOT = 'conversation.input.model.label';
class Component { constructor(props) { this.props = props; this.state = {}; } }
const fresh = (extra) => loadCC(['tokens.js', 'model_badges.js', 'app.js'],
  Object.assign({ React: Object.assign(makeReact(), { Component }) }, extra || {}));

const ROWS = [
  { id: 'chat:freebuff/deepseek/deepseek-v4-flash', dsh: { provider: 'freebuff', model: 'deepseek/deepseek-v4-flash' },
    elo: null, context_window: 131072, speed: '227 tok/s', run_natively: false },
  { id: 'chat:anthropic/claude-opus-5-5', dsh: { provider: 'anthropic', model: 'claude-opus-5-5' },
    elo: 1507, context_window: 1048576, speed: '48-95 tok/s', run_natively: true,
    run_natively_reason: 'Use Claude Code for Claude Max models.' },
  { id: 'chat:google/gemini-3.8-flash', dsh: { provider: 'google', model: 'gemini-3.8-flash' },
    elo: null, context_window: 1000000, speed: null, run_natively: false },
  { id: 'subagent:claude/opus-5.5', dsh: null, elo: 1507, context_window: 1048576 }
];

function captureWarns(fn) {
  const warns = [];
  const orig = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  try { fn(); } finally { console.warn = orig; }
  return warns;
}
const label = (CC, provider, model, placement, name) => render(CC.h(CC.ModelBadgeLabel, {
  provider: { id: provider, name: provider }, model: { id: model, name: name || model }, placement, selected: false }));
const badgeNodes = (tree) => findAll(tree, (n) => n.props && n.props['data-cc-badge']);

// Spread copies: objects made inside the vm have another realm's prototype.
test('badge parts: ~Elo, context and Run natively; unknown stays blank', () => {
  const CC = fresh();
  assert.deepEqual({ ...CC.modelBadges.parts(ROWS[1]) }, { elo: '~1507', ctx: '1M', native: true, usage: null });
  assert.deepEqual({ ...CC.modelBadges.parts(ROWS[0]) }, { elo: null, ctx: '128K', native: false, usage: null });
  assert.deepEqual({ ...CC.modelBadges.parts(ROWS[2]) }, { elo: null, ctx: '1M', native: false, usage: null });
  assert.deepEqual({ ...CC.modelBadges.parts(null) }, { elo: null, ctx: null, native: false, usage: null });
  assert.equal(CC.modelBadges.parts({ usage: { remaining_percent: 61.6, pool: 'claude_5h' } }).usage, '62%');
  assert.equal(CC.modelBadges.text(ROWS[1]), '~1507 · 1M · Run natively');
  assert.equal(CC.modelBadges.text(ROWS[0]), '128K');
  assert.equal(CC.modelBadges.text({ elo: null, context_window: null }), '');
  assert.equal(CC.modelBadges.fmtCtx(200000), '200K');
});

test('option rows keep the catalog name and add a quiet badge after it', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const tree = label(CC, 'anthropic', 'claude-opus-5-5', 'option', 'Claude Opus 5.5');
  const text = textOf(tree);
  assert.ok(text.startsWith('Claude Opus 5.5'), text);
  assert.match(text, /~1507/);
  assert.match(text, /1M/);
  assert.match(text, /Run natively/);
  const b = badgeNodes(tree);
  assert.ok(b.length >= 1);
  // Non-interactive inline content only.
  assert.equal(findAll(tree, (n) => n.type === 'button' || n.type === 'a' || n.props.onClick).length, 0);
});

test('the composer trigger stays compact: name only, badge in the tooltip', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const tree = label(CC, 'anthropic', 'claude-opus-5-5', 'trigger', 'Claude Opus 5.5');
  assert.equal(textOf(tree), 'Claude Opus 5.5');
  assert.match(String(tree.props.title || ''), /~1507/);
});

test('unknown model or engine down: just the catalog name, no badge', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  const tree = label(CC, 'groq', 'llama-3.3-70b-versatile', 'option', 'Llama 3.3 70B');
  assert.equal(textOf(tree), 'Llama 3.3 70B');
  assert.equal(badgeNodes(tree).length, 0);
  const CC2 = fresh();
  const tree2 = label(CC2, 'anthropic', 'claude-opus-5-5', 'menu', 'Claude Opus 5.5');
  assert.equal(textOf(tree2), 'Claude Opus 5.5');
});

test('rows are matched by the dsh provider/model pair, not by name', () => {
  const CC = fresh();
  CC.modelBadges.prime(ROWS);
  assert.equal(CC.modelBadges.lookup('freebuff', 'deepseek/deepseek-v4-flash').id, ROWS[0].id);
  assert.equal(CC.modelBadges.lookup('anthropic', 'deepseek/deepseek-v4-flash'), null);
  assert.equal(CC.modelBadges.lookup('claude', 'opus-5.5'), null);
});

// harness.test() is synchronous, so the async body settles first and its test re-throws.
async function settle(fn) { try { await fn(); return null; } catch (e) { return e; } }
const loadErr = await settle(async () => {
  let calls = 0;
  const CC = fresh();
  CC.api = { get: (p) => { calls++; assert.equal(p, '/api/models'); return Promise.resolve({ models: ROWS }); } };
  await CC.modelBadges.load(1000);
  await CC.modelBadges.load(2000);
  assert.equal(calls, 1);
  assert.equal(CC.modelBadges.lookup('google', 'gemini-3.8-flash').context_window, 1000000);
  await CC.modelBadges.load(1000 + 61000);
  assert.equal(calls, 2);
  const CC2 = fresh();
  CC2.api = { get: () => Promise.reject(new Error('engine down')) };
  await CC2.modelBadges.load(5000);
  assert.equal(CC2.modelBadges.lookup('google', 'gemini-3.8-flash'), null);
  const CC3 = fresh();
  CC3.api = { get: () => { throw new Error('sync throw'); } };
  await CC3.modelBadges.load(5000);
});
test('load fetches /api/models once per minute and tolerates failure', () => { if (loadErr) throw loadErr; });

test('apply registers the label slot through the guarded helper', () => {
  const CC = fresh();
  const rec = { injects: [], registers: [] };
  const ctx = { slots: {
    inject(key, cb) { rec.injects.push(key); const r = cb(); assert.equal(typeof r, 'function'); return () => {}; },
    register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
  } };
  const warns = captureWarns(() => CC.applyModelBadges(ctx));
  assert.deepEqual(warns, []);
  assert.deepEqual(rec.injects, [SLOT]);
  assert.equal(rec.registers.length, 1);
  assert.equal(rec.registers[0].spec.name, SLOT);
  assert.equal(rec.registers[0].comp, CC.ModelBadgeLabel);
});

test('a missing or renamed slot never throws into dsh startup', () => {
  for (const ctx of [
    undefined, null, {}, { slots: {} },
    { slots: { inject() { throw new Error('unknown slot'); }, register() { return () => {}; } } },
    { slots: { inject(k, cb) { return cb(); }, register() { throw new Error('bad slot'); } } }
  ]) {
    const CC = fresh();
    const warns = captureWarns(() => assert.doesNotThrow(() => CC.applyModelBadges(ctx)));
    assert.ok(warns.length <= 1, warns.join('\n'));
    assert.ok(warns.every((w) => w.startsWith('[waypoint] ')), warns.join('\n'));
  }
});

test('works before app.js loads (no CC.contribute): one warning, no throw', () => {
  const CC = loadCC(['tokens.js', 'model_badges.js'], { React: Object.assign(makeReact(), { Component }) });
  const ctx = { slots: { inject() { throw new Error('should not be reached'); }, register() {} } };
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.applyModelBadges(ctx)));
  assert.equal(warns.length, 1);
});

test('a render failure inside the label falls back to the catalog name', () => {
  const CC = fresh();
  CC.modelBadges.prime([{ dsh: { provider: 'p', model: 'm' }, get elo() { throw new Error('boom'); } }]);
  const warns = captureWarns(() => {
    const tree = label(CC, 'p', 'm', 'option', 'Plain Name');
    assert.equal(textOf(tree), 'Plain Name');
  });
  assert.ok(warns.length <= 1);
});

done('model_badges');
