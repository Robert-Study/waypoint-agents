// autonomous_review.test.mjs - Waypoint v3 wave 3: the U1 review items for the Autonomous tab
// (docs/ui_review.md, surface autonomous). Run: node plugin/tests/autonomous_review.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

function load(files, payload) {
  const CC = { h, React: makeReact() };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, isNaN, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  if (payload && CC.toggles) CC.toggles.apply(payload);
  return CC;
}
const OFF_CODEX = { enabled: { claude_code: true, codex: false, 'agent:codex': false, antigravity: false, antigravity_manual: false } };
const ON_CODEX = { enabled: { claude_code: true, codex: true, 'agent:codex': true } };
// Text a viewer sees: hidden subtrees (folded rows) left out.
const visibleText = (t) => Array.isArray(t) ? t.map(visibleText).join('') : t == null ? '' : typeof t !== 'object' ? String(t)
  : t.props.hidden === true ? '' : (t.props.children || []).map(visibleText).join('');
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const SETTINGS = { preset: 'balanced', models: [], efforts: { claude: 'medium', codex: 'medium' }, max_use: {}, sequence: [] };

// The live registry rows the review saw (labels as /api/models sends them).
const REGISTRY = [
  { id: 'subagent:claude/opus-5.5', label: 'Claude Opus 5.5 · Claude Code CLI', route: 'claude_code', kind: 'subagent', enabled: true },
  { id: 'subagent:claude/haiku-5.5', label: 'haiku-5.5 · Claude Code CLI', route: 'claude_code', kind: 'subagent', enabled: true },
  { id: 'agent:codex', label: 'Codex', provider: 'openai-codex', kind: 'agent', enabled: true },
  { id: 'subagent:antigravity/gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (high) · Antigravity (agy CLI)', route: 'antigravity', kind: 'subagent', enabled: true },
  { id: 'subagent:antigravity/gemini-4-argon-high', label: 'Gemini 4 Argon (high) · Antigravity (agy CLI)', route: 'antigravity', kind: 'subagent', enabled: true },
  { id: 'subagent:antigravity/claude-sonnet-5-5-high', label: 'Claude Sonnet 5.5 (high) · Antigravity (agy CLI)', route: 'antigravity', kind: 'subagent', enabled: true },
  { id: 'manual:gemini_app', label: 'Gemini app', route: 'gemini_app', kind: 'manual', enabled: true }
];

// ---- line 24: Project sequence rows at 1024 ------------------------------------------------
test('sequence rows keep the project name readable: name min 120px, select flex 0 1 180px, select below the name when narrow', () => {
  const src = read('autonomous_controls.js');
  assert.match(src, /\.cc-au-item \.cc-au-n\{[^}]*flex:1 1 auto[^}]*min-width:120px/);
  assert.match(src, /\.cc-au-item \.cc-au-input\{[^}]*flex:0 1 180px/);
  assert.doesNotMatch(src, /grid-template-columns:12px 1fr minmax\(0,168px\) 20px/);
  // Narrow sequence: the select moves under the name (container query on the sequence panel).
  assert.match(src, /@container cc-au-seq \(max-width:[0-9]+px\)\{[^\n]*\.cc-au-item \.cc-au-input\{[^}]*order:/);
});

// ---- line 25: Timeline hour labels ---------------------------------------------------------
test('tick spacing comes from the track width: 6 h at a 1024-wide track, 3 h at 1440, labels never closer than 40px', () => {
  const S = load(['autonomous_controls.js', 'page_sprints.js']).sprintsHelpers;
  const now = new Date(2026, 10, 4, 20, 10).getTime();
  const ax = S.axis(now, 24);
  assert.equal(S.tickStep(ax, 650), 3);
  assert.equal(S.tickStep(ax, 205), 6);
  assert.equal(S.tickStep(ax, 120), 12);
  assert.equal(S.tickStep(ax, 300), 6);
  for (const width of [205, 300, 650, 1100]) {
    const shown = S.tickLabels(ax, 24, width, now).filter((k) => k.show);
    for (let i = 1; i < shown.length; i++) {
      assert.ok(shown[i].x - shown[i - 1].x >= 40, width + ': ' + shown[i - 1].label + ' / ' + shown[i].label);
      assert.ok(shown[i].x + 4 >= shown[i - 1].x + 4 + shown[i - 1].w, 'labels do not overlap at ' + width);
    }
    for (const k of shown) assert.ok(k.x + 4 + k.w <= width, 'label clipped at the right edge: ' + k.label);
    assert.ok(shown.every((k) => Math.abs(k.x - (S.pct(now, ax) / 100) * width) > 18), 'no label under "now"');
  }
  // The midnight day label wins over a plain hour that would crowd it.
  const shown = S.tickLabels(ax, 24, 300, now).filter((k) => k.show);
  assert.ok(shown.some((k) => k.label === 'Tomorrow'));
});

// ---- line 26: header "stale" -----------------------------------------------------------------
test('usage strip never prints "stale": stale numbers are dimmed with a Last read tooltip', () => {
  const CC = load(['autonomous_controls.js']);
  const rows = [
    { pool: 'claude_5h', remaining_percent: 83, status: 'FRESH' },
    { pool: 'claude_week', remaining_percent: 72, status: 'FRESH' },
    { pool: 'codex_5h', remaining_percent: 100, status: 'STALE', observed_at: new Date(2026, 10, 4, 18, 33).toISOString() },
    { pool: 'codex_week', remaining_percent: 13, status: 'STALE' }
  ];
  const tree = render(h(CC.AutonomousControls.UsageStrip, { rows }));
  const text = textOf(tree);
  assert.doesNotMatch(text, /stale/i);
  assert.doesNotMatch(text, / {2}/, 'no double spaces');
  assert.match(text, /100%/); assert.match(text, /13%/);
  const dim = findAll(tree, (n) => n.props && /\bcc-dim\b/.test(n.props.className || ''));
  assert.equal(dim.length, 2, 'the two stale meters are dimmed');
  assert.ok(dim.some((n) => /Last read 18:33/.test(n.props.title)));
  assert.ok(dim.every((n) => !/stale/i.test(n.props.title)));
  const S = load(['autonomous_controls.js', 'page_sprints.js']).sprintsHelpers;
  const hint = S.usageInfo({ gate: 'usage', usage: [{ status: 'STALE', remaining_percent: 40 }] });
  assert.equal(hint.text, '40% left'); assert.equal(hint.dim, true);
  assert.doesNotMatch(read('page_sprints.js').replace(/\/\/.*$/gm, ''), /'Usage stale'|stale reading/);
});

// ---- line 27: off rows folded -----------------------------------------------------------------
test('switched-off models fold into one quiet "N off" row per group that expands on click', () => {
  const CC = load(['toggles.js', 'autonomous_controls.js'], OFF_CODEX);
  const models = CC.autonomous.enabledModels(REGISTRY);
  const tree = render(h(CC.AutonomousControls.RunControls, { settings: SETTINGS, models, source: 'registry', onChange() {} }));
  const text = visibleText(tree);
  assert.doesNotMatch(textOf(tree), /off in Agents/);
  assert.ok(!text.includes('Gemini 3.8 Flash'), 'off rows are folded away');
  const folded = findAll(tree, (n) => n.props && n.props.hidden === true);
  assert.ok(folded.some((n) => textOf(n).includes('Gemini 3.8 Flash')), 'off rows stay greyed behind the fold');
  const folds = findAll(tree, (n) => n.type === 'button' && /^\d+ off$/.test(textOf(n)));
  assert.ok(folds.length >= 2, 'one fold per group with off rows');
  assert.ok(folds.some((f) => textOf(f) === '3 off'), 'Manual: three Antigravity rows off');
  assert.ok(folds.every((f) => f.props['aria-expanded'] === false && typeof f.props.onClick === 'function'));
  assert.ok(text.includes('Gemini app'));
});

// ---- line 28: plain model names --------------------------------------------------------------
test('model names are plain: no route, CLI or effort suffixes', () => {
  const A = load(['autonomous_controls.js']).autonomous;
  const by = Object.fromEntries(A.enabledModels(REGISTRY).map((m) => [m.id, m]));
  assert.equal(A.plainName(by['subagent:antigravity/claude-sonnet-5-5-high']), 'Claude Sonnet 5.5');
  assert.equal(A.plainName(by['subagent:antigravity/gemini-4-argon-high']), 'Gemini 4 Argon');
  assert.equal(A.plainName(by['subagent:claude/opus-5.5']), 'Claude Opus 5.5');
  assert.equal(A.plainName(by['subagent:claude/haiku-5.5']), 'Claude Haiku 5.5');
  assert.equal(A.plainName({ id: 'x', label: 'GPT 6 Sol (ChatGPT Web)' }), 'GPT 6 Sol');
  assert.equal(A.plainName({ id: 'manual:gemini_app', label: 'Gemini app' }), 'Gemini app');
  const CC = load(['toggles.js', 'autonomous_controls.js'], { enabled: { antigravity: true, antigravity_manual: true, codex: true } });
  const models = CC.autonomous.enabledModels(REGISTRY);
  const text = textOf(render(h(CC.AutonomousControls.RunControls, { settings: SETTINGS, models, source: 'registry', onChange() {} })));
  assert.doesNotMatch(text, /agy CLI|\(high\)|Claude Code CLI/);
  assert.ok(text.includes('Claude Sonnet 5.5'));
});

// ---- line 29: Codex effort hidden ------------------------------------------------------------
test('the Codex effort slider is hidden while Codex is off, shown once it is on', () => {
  const sliders = (payload) => {
    const CC = load(['toggles.js', 'autonomous_controls.js'], payload);
    const models = CC.autonomous.enabledModels(REGISTRY);
    const tree = render(h(CC.AutonomousControls.RunControls, { settings: SETTINGS, models, source: 'registry', onChange() {} }));
    return findAll(tree, (n) => n.type === 'input' && n.props.type === 'range').length;
  };
  assert.equal(sliders(OFF_CODEX), 1);
  assert.equal(sliders(ON_CODEX), 2);
});

// ---- line 30: Codex-dependent adders hidden --------------------------------------------------
test('+ Codex, + Dual and + Auto Dual are hidden while Codex is off', () => {
  const S = load(['toggles.js', 'autonomous_controls.js', 'page_sprints.js'], OFF_CODEX).sprintsHelpers;
  assert.deepEqual(Array.from(S.visibleAdders(), (a) => a.kind), ['claude']);
  const S2 = load(['toggles.js', 'autonomous_controls.js', 'page_sprints.js'], ON_CODEX).sprintsHelpers;
  assert.deepEqual(Array.from(S2.visibleAdders(), (a) => a.kind), ['claude', 'codex', 'dual', 'auto_dual']);
});

done('autonomous_review');
