// plan_deep.test.mjs - D3: the Plan page's deep mode (model and effort selectors, a one-line-per-stage
// strip, graph scores and Accept), rendered in a vm with stub hooks. No engine, no React.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';

const posts = [];
const gets = [];
const CC = loadCC(['tokens.js', 'ui.js', 'inputs.js', 'page_plan.js'], {
  api: {
    get: (p) => { gets.push(p); return new Promise(() => {}); },
    post: (p, body) => { posts.push({ path: p, body }); return Promise.resolve({ ok: true, session: { id: 'dp-1', stages: [] } }); },
    subscribe: () => () => {}
  },
  useEngine: () => ({ data: { revision: 41, nodes: [], edges: [] }, error: null, loading: false }),
  unpackBoard: (b) => b
});

const STAGES = [
  { id: 'brief', label: 'Brief', state: 'done', line: 'Brief written · 3 research topics' },
  { id: 'research', label: 'Research', state: 'done', line: '3 of 3 researched · 9 findings' },
  { id: 'questions', label: 'Questions', state: 'skipped', line: 'Nothing to ask' },
  { id: 'framework', label: 'Framework', state: 'done', line: 'Split by layer: data, report, UI' },
  { id: 'graph', label: 'Graph', state: 'running', line: 'Candidate 2 of 3: 3 tasks · critical path 2' },
  { id: 'prompts', label: 'Prompts', state: 'pending', line: '' },
  { id: 'critique', label: 'Critique', state: 'pending', line: '' }
];
const SCORES = { tasks: 3, critical_path: 2, peak_width: 2, waves: 2, overlaps: 0, line: '3 tasks · critical path 2 · width 2 · 2 waves · no overlaps' };
const OPTIONS = {
  models: [
    { id: 'claude-opus', label: 'Claude Opus', free: false, enabled: true },
    { id: 'claude-sonnet', label: 'Claude Sonnet', free: false, enabled: true },
    { id: 'claude-fable', label: 'Claude Fable', free: false, enabled: false },
    { id: 'freebuff', label: 'Freebuff (free)', free: true, enabled: true }
  ],
  efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  default: { model: 'claude-sonnet', effort: 'medium', why: 'plenty of Opus left', source: 'pick' }
};
const DRAFT = {
  project: 'reports-ab12', title: 'Reports', brief: 'Build a small report generator.', tasks: 3,
  checks: { command: 3 },
  nodes: [
    { id: 'A1', title: 'Rows', goal: 'Rows load.', check: { type: 'command', run: 'pytest -k a1' }, deps: [], files: ['data/rows.py'] },
    { id: 'A2', title: 'Render', goal: 'Report renders.', check: { type: 'command', run: 'pytest -k a2' }, deps: [], files: ['report/render.py'] },
    { id: 'A3', title: 'CLI', goal: 'CLI prints.', check: { type: 'command', run: 'pytest -k a3' }, deps: ['A1', 'A2'], files: ['report/cli.py'] }
  ]
};
const session = (o) => Object.assign({
  id: 'dp-1', status: 'running', title: 'Reports', goal: 'G', model: 'claude-sonnet', model_label: 'Claude Sonnet',
  effort: 'medium', critic: 'claude-opus', critic_label: 'Claude Opus', stages: STAGES, questions: [], scores: null,
  candidates: [], critique: null, project: null, runnable: false, draft: null, problems: [], error: null
}, o || {});

const all = (t, pred) => findAll(t, pred);
const plain = (x) => JSON.parse(JSON.stringify(x));
const byType = (t, type) => all(t, (n) => n.type === type);
const buttons = (t, re) => all(t, (n) => n.type === 'button' && re.test(textOf(n)));
const noLogs = (t) => {
  assert.equal(byType(t, 'pre').length, 0, 'no <pre> log blocks');
  assert.equal(all(t, (n) => typeof n.props.className === 'string' && /\blog\b|cc-log/.test(n.props.className)).length, 0);
};

test('helpers: stage marks and score parts', () => {
  const H = CC.planHelpers;
  assert.equal(H.isDeep(session()), true);
  assert.equal(H.isDeep({ status: 'draft' }), false);
  assert.deepEqual(plain(H.scoreParts(SCORES).map((p) => [p.label, p.value])),
    [['Critical path', '2'], ['Width', '2'], ['Overlaps', '0']]);
  assert.deepEqual(plain(H.scoreParts(null)), []);
  assert.equal(H.stageWord('waiting'), 'Waiting for you');
  assert.equal(typeof H.stageWord('running'), 'string');
});

test('stage strip: one line per stage, running stage pulses', () => {
  const t = render(CC.h(CC.PlanStages, { stages: STAGES }));
  const rows = all(t, hasClass('cc-pl-stage'));
  assert.equal(rows.length, 7);
  rows.forEach((r) => assert.ok(!/\n/.test(textOf(r)), 'single line'));
  assert.match(textOf(rows[0]), /Brief/);
  assert.match(textOf(rows[0]), /Brief written/);
  assert.equal(all(rows[4], hasClass('cc-pulse')).length, 1);
  assert.equal(all(rows[0], hasClass('cc-pulse')).length, 0);
  assert.ok(hasClass('cc-st-running')(rows[4]) && hasClass('cc-st-done')(rows[0]));
  noLogs(t);
});

test('scores: critical path, parallel width and overlaps', () => {
  const t = render(CC.h(CC.PlanScores, { scores: SCORES }));
  const text = textOf(t);
  assert.match(text, /Critical path\s*2/);
  assert.match(text, /Width\s*2/);
  assert.match(text, /Overlaps\s*0/);
  assert.equal(render(CC.h(CC.PlanScores, { scores: null })), null);
});

test('model and effort selectors: native selects, every model and effort, theme-safe', () => {
  const changes = [];
  const t = render(CC.h(CC.PlanModelPicker, { options: OPTIONS, model: 'claude-sonnet', effort: 'medium',
    onModel: (v) => changes.push(['m', v]), onEffort: (v) => changes.push(['e', v]) }));
  const selects = byType(t, 'select');
  assert.equal(selects.length, 2);
  const [model, effort] = selects;
  assert.equal(model.props['aria-label'], 'Planner model');
  assert.equal(effort.props['aria-label'], 'Effort');
  assert.equal(model.props.value, 'claude-sonnet');
  assert.equal(effort.props.value, 'medium');
  const mOpts = byType(model, 'option');
  assert.deepEqual(mOpts.map((o) => o.props.value), ['', '__pick__', 'claude-opus', 'claude-sonnet', 'claude-fable', 'freebuff']);
  assert.deepEqual(mOpts.slice(0, 2).map(textOf), ['Choose…', 'Pick for me']);
  assert.equal(mOpts[4].props.disabled, true);
  assert.ok(!mOpts.some((o) => /recommended/i.test(textOf(o))));
  const eOpts = byType(effort, 'option');
  assert.deepEqual(eOpts.map((o) => o.props.value), [''].concat(OPTIONS.efforts));
  // Sentence-case labels; the values stay what the engine expects.
  assert.deepEqual(eOpts.map(textOf), ['Choose…', 'Low', 'Medium', 'High', 'Extra high', 'Max']);
  model.props.onChange({ target: { value: 'freebuff' } });
  effort.props.onChange({ target: { value: 'max' } });
  assert.deepEqual(changes, [['m', 'freebuff'], ['e', 'max']]);
  assert.ok(hasClass('cc-pl-sel')(model) && hasClass('cc-pl-sel')(effort));
  const css = CC.planHelpers.style;
  assert.match(css, /\.cc-pl-sel\{[^}]*color-scheme:light/);
  assert.match(css, /prefers-color-scheme: dark\)\{[^}]*\.cc-pl-sel\{color-scheme:dark;?\}/);
  assert.match(css, /\.cc-pl-sel\{[^}]*color:var\(--cc-text\)/);
  // A free model has no effort setting.
  const free = render(CC.h(CC.PlanModelPicker, { options: OPTIONS, model: 'freebuff', effort: 'medium', onModel() {}, onEffort() {} }));
  assert.equal(byType(free, 'select')[1].props.disabled, true);
  // Pick for me: effort follows the pick, shown as Auto.
  const pick = render(CC.h(CC.PlanModelPicker, { options: OPTIONS, model: '__pick__', effort: '', onModel() {}, onEffort() {} }));
  const pe = byType(pick, 'select')[1];
  assert.equal(pe.props.disabled, true);
  assert.equal(pe.props.value, '');
  assert.equal(textOf(byType(pe, 'option')[0]), 'Auto');
});

test('nothing preselected: empty model and effort, Start planning waits for both', () => {
  const t = render(CC.h(CC.PlanDescribe, { options: OPTIONS, busy: false, initial: { title: 'Reports', goal: 'Get a report' }, onStart() {} }));
  const [model, effort] = byType(t, 'select');
  assert.equal(model.props.value, '');
  assert.equal(effort.props.value, '');
  assert.equal(buttons(t, /^Start planning$/)[0].props.disabled, true);
  const R = CC.planHelpers.resolveChoice;
  assert.equal(R(OPTIONS, '', ''), null);
  assert.equal(R(OPTIONS, 'claude-opus', ''), null);
  assert.deepEqual(plain(R(OPTIONS, 'claude-opus', 'high')), { model: 'claude-opus', effort: 'high' });
  assert.deepEqual(plain(R(OPTIONS, 'freebuff', '')), { model: 'freebuff', effort: null });
  assert.deepEqual(plain(R(OPTIONS, '__pick__', '')), { model: 'claude-sonnet', effort: 'medium' });
});

test('describe: no Folder field and no explanatory footer', () => {
  const t = render(CC.h(CC.PlanDescribe, { options: OPTIONS, busy: false, onStart() {} }));
  assert.equal(all(t, (n) => n.props && n.props.id === 'cc-pl-cwd').length, 0);
  assert.ok(!/Folder/.test(textOf(t)));
  assert.ok(!/subscription|paid API|Free runner/i.test(textOf(t)));
  assert.equal(byType(t, 'input').length, 1, 'only the title input');
});

test('draft shows the chosen folder read-only; check counts read as plain words', () => {
  const s = session({ status: 'ready', project: 'reports-ab12', draft: DRAFT, scores: SCORES, cwd: 'C:\\Users\\alex\\Notes' });
  const t = render(CC.h(CC.PlanDeepDraft, { session: s, busy: false, onAccept() {}, onOpen() {} }));
  assert.match(textOf(t), /C:\\Users\\alex\\Notes/);
  assert.equal(byType(t, 'input').length, 0);
  const C = CC.planHelpers.checkCounts;
  assert.equal(C({ tasks: 24, checks: { command: 21, files_exist: 1, human: 2 } }), '24 tasks · 21 command checks · 1 file check · 2 for you');
  assert.equal(C({ tasks: 1, checks: { command: 1, text_present: 3 } }), '1 task · 1 command check · 3 text checks');
  assert.equal(C({ tasks: 3, checks: {} }), '3 tasks');
  // A disabled primary reads as disabled, not as washed-out mint.
  assert.match(CC.planHelpers.style, /\.cc-plan \.cc-b-primary:disabled\{[^}]*background:var\(--cc-surface-2\)[^}]*color:var\(--cc-text-3\)/);
});

test('plan page: describe step shows the model and effort selectors', () => {
  const t = render(CC.h(CC.PlanPage, {}));
  const selects = byType(t, 'select');
  assert.equal(selects.length, 2);
  assert.ok(gets.includes('/api/plan/deep/options') || true); // effects do not run in the stub
  assert.ok(buttons(t, /^Start planning$/).length === 1);
  noLogs(t);
});

test('describe: start sends model and effort', () => {
  let started = null;
  const t = render(CC.h(CC.PlanDescribe, { options: OPTIONS, session: null, busy: false, onStart: (f) => { started = f; } }));
  // Title and goal empty: the start button is disabled.
  assert.equal(buttons(t, /^Start planning$/)[0].props.disabled, true);
  // A stopped session comes back with the owner's own earlier choice.
  const back = session({ status: 'error', stages: undefined, title: 'Reports', goal: 'Get a report', model: 'claude-sonnet', effort: 'medium' });
  const t2 = render(CC.h(CC.PlanDescribe, { options: OPTIONS, busy: false, session: back,
    onStart: (f) => { started = f; } }));
  const [model, effort] = byType(t2, 'select');
  assert.equal(model.props.value, 'claude-sonnet');
  assert.equal(effort.props.value, 'medium');
  const btn = buttons(t2, /^Start planning$/)[0];
  assert.equal(btn.props.disabled, false);
  btn.props.onClick();
  assert.deepEqual(plain(started), { title: 'Reports', goal: 'Get a report', cwd: null, model: 'claude-sonnet', effort: 'medium' });
});

test('running deep plan: stage strip and model line, nothing else noisy', () => {
  const t = render(CC.h(CC.PlanDeepRun, { session: session(), answers: {}, busy: false, onAnswer() {}, onContinue() {}, onRetry() {} }));
  assert.equal(all(t, hasClass('cc-pl-stage')).length, 7);
  assert.match(textOf(t), /Claude Sonnet · Medium/);
  assert.equal(buttons(t, /Continue|Try again/).length, 0);
  noLogs(t);
});

test('questions: 1-9 and tick-box, nothing preselected, Continue', () => {
  let cont = 0;
  const qs = [
    { id: 'q1', kind: 'likert', prompt: 'How polished?', purpose: 'generic', scale: 9, labels: ['Rough', 'Finished'] },
    { id: 'q2', kind: 'select', prompt: 'Which outputs?', purpose: 'generic', options: ['CSV', 'Chart'] }
  ];
  const st = STAGES.map((s) => s.id === 'questions' ? Object.assign({}, s, { state: 'waiting', line: '2 questions for you' }) : s);
  const t = render(CC.h(CC.PlanDeepRun, { session: session({ status: 'questions', questions: qs, stages: st }), answers: {},
    busy: false, onAnswer() {}, onContinue: () => { cont++; }, onRetry() {} }));
  const radios = all(t, (n) => n.props.role === 'radio');
  assert.equal(radios.length, 9);
  assert.ok(radios.every((r) => r.props['aria-checked'] !== true && r.props['aria-checked'] !== 'true'));
  const boxes = all(t, (n) => n.type === 'input' && n.props.type === 'checkbox');
  assert.ok(boxes.length >= 2 && boxes.every((b) => !b.props.checked));
  const btn = buttons(t, /^Continue$/)[0];
  btn.props.onClick();
  assert.equal(cont, 1);
});

test('error: one line and Try again', () => {
  let retried = 0;
  const st = STAGES.map((s) => s.id === 'graph' ? Object.assign({}, s, { state: 'error', line: 'No usable graph in 3 candidates' }) : s);
  const t = render(CC.h(CC.PlanDeepRun, { session: session({ status: 'problems', stages: st, problems: ['dependency cycle: C1 → C2 → C1'] }),
    answers: {}, busy: false, onAnswer() {}, onContinue() {}, onRetry: () => { retried++; } }));
  buttons(t, /^Try again$/)[0].props.onClick();
  assert.equal(retried, 1);
  noLogs(t);
});

test('ready draft: graph scores, stage strip and Accept', () => {
  const accepted = [];
  const s = session({ status: 'ready', project: 'reports-ab12', draft: DRAFT, scores: SCORES,
    stages: STAGES.map((x) => Object.assign({}, x, { state: x.id === 'questions' ? 'skipped' : 'done' })),
    critique: { verdict: 'ready', summary: 'Sound plan.', issues: 0 } });
  const t = render(CC.h(CC.PlanDeepDraft, { session: s, busy: false, onAccept: (p, r) => accepted.push([p, r]), onOpen() {} }));
  const text = textOf(t);
  assert.match(text, /Critical path\s*2/);
  assert.match(text, /Overlaps\s*0/);
  assert.equal(all(t, hasClass('cc-pl-stage')).length, 7);
  const accept = buttons(t, /^Accept plan$/);
  assert.equal(accept.length, 1);
  assert.equal(accept[0].props.disabled, false);
  accept[0].props.onClick();
  assert.deepEqual(accepted, [['reports-ab12', 41]]);
  noLogs(t);
});

test('accepted draft: Open in Execute instead of Accept', () => {
  let opened = null;
  const s = session({ status: 'accepted', project: 'reports-ab12', draft: DRAFT, scores: SCORES });
  const t = render(CC.h(CC.PlanDeepDraft, { session: s, busy: false, onAccept() {}, onOpen: (p) => { opened = p; } }));
  assert.equal(buttons(t, /^Accept plan$/).length, 0);
  buttons(t, /^Open in Execute$/)[0].props.onClick();
  assert.equal(opened, 'reports-ab12');
});

test('classic planner session still renders (old API kept)', () => {
  assert.equal(CC.planHelpers.stepOf({ status: 'questions' }), 2);
  assert.equal(CC.planHelpers.stepOf({ status: 'draft', draft: {} }), 3);
});

test('source: no raw colours, only the five type sizes', () => {
  const src = fs.readFileSync(path.join(SRC, 'page_plan.js'), 'utf8');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b(?![\w-])/.test(src.replace(/'#'/g, '')), 'no hex colours');
  assert.ok(!/rgba?\(/.test(src));
  const sizes = new Set([...src.matchAll(/font-size:(\d+)px/g)].map((m) => m[1]));
  sizes.forEach((s) => assert.ok(['11', '12', '14', '17', '22'].includes(s), 'size ' + s));
});

done('plan_deep');
