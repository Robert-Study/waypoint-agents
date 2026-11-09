// tab_brain_learn.test.mjs - CC.BrainTab (knowledge graph, read only) and CC.LearnTab (topics, steps, ideas,
// practice) for dsh-v2 t-brain-learn. Every learn write's input is built as the Waypoint Claude v8 page builds it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCC, render, textOf, findAll } from './harness.mjs';

function load() {
  const CC = loadCC(['tokens.js', 'ui.js', 'wpc_client.js', 'tab_brain.js', 'tab_learn.js']);
  const acts = [];
  CC.wpc.act = (tool, input, refresh) => { acts.push({ tool, input, refresh }); return Promise.resolve({ ok: true }); };
  return { CC, B: CC.brainTabInternals, L: CC.learnTabInternals, acts };
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const buttons = (tree, label) => findAll(tree, (n) => n.type === 'button' && textOf(n) === label);
const tick = () => new Promise((r) => setTimeout(r, 0));
function serve(CC, tool, data, addons, error) {
  CC.useWpcFeatures = () => ({ addons: addons || { brain: true, learn: true } });
  CC.useWpc = (t) => ({ data: t === tool ? data : null, error: error || null, loading: false, reload() {} });
}

const brain = {
  built_at: '2026-01-01T00:00:00Z', counts: { preference: 2, brain: 1, skill: 1, instruction: 1 }, truncated: false,
  nodes: [
    { id: 'pref:a', kind: 'preference', title: 'Short replies', cluster: 'style', brightness: 0.9, path: 'prefs/a.md' },
    { id: 'pref:b', kind: 'preference', title: 'Cheap models first', cluster: 'models', brightness: 0.5, path: 'prefs/b.md' },
    { id: 'note:c', kind: 'brain', title: 'Demo note', cluster: 'notes', brightness: 0.7, path: 'brain/c.md' },
    { id: 'skill:d', kind: 'skill', title: 'demo-skill', cluster: null, brightness: 0.4, path: 'skills/d/SKILL.md' },
    { id: 'inst:e', kind: 'instruction', title: 'Agents file', cluster: null, brightness: 0.4, path: 'AGENTS.md' }
  ],
  links: [[0, 3, 'cites'], [2, 0, 'mentions'], [4, 3, 'loads']]
};

test('brain: list filters by kind and by search text, with links for each node', () => {
  const { B } = load();
  const g = B.normalize(brain);
  assert.equal(g.nodes.length, 5);
  assert.deepEqual(B.filterNodes(g.nodes, 'preference', '').map((n) => n.id), ['pref:a', 'pref:b']);
  assert.deepEqual(B.filterNodes(g.nodes, 'all', 'demo').map((n) => n.id), ['note:c', 'skill:d']);
  assert.deepEqual(B.filterNodes(g.nodes, 'skill', 'SKILL.md').map((n) => n.id), ['skill:d']);
  assert.deepEqual(B.filterNodes(g.nodes, 'all', 'models').map((n) => n.id), ['pref:b']);
  assert.deepEqual(plain(g.links['skill:d'].map((l) => l.id).sort()), ['inst:e', 'pref:a']);
  assert.deepEqual(plain(g.links['pref:a'].map((l) => l.kind).sort()), ['cites', 'mentions']);
  const opts = B.kindOptions(g.nodes);
  assert.deepEqual(plain(opts.map((o) => [o.value, o.count])), [['all', 5], ['preference', 2], ['brain', 1], ['skill', 1], ['instruction', 1]]);
});

test('brain: the list view renders rows with kind and link counts', () => {
  const { CC } = load();
  serve(CC, 'brain_read', brain);
  const tree = render(CC.h(CC.BrainTab, { pageId: 'brain' }));
  assert.equal(findAll(tree, (n) => n.props['data-cc-row']).length, 5);
  const txt = textOf(tree);
  assert.match(txt, /Short replies/);
  assert.match(txt, /2 links/);
  assert.match(txt, /Preferences/);
  assert.equal(buttons(tree, 'Graph').length, 1);
});

test('brain: the graph groups by kind in columns, draws links as lines and caps drawn nodes', () => {
  const { B } = load();
  const g = B.normalize(brain);
  const lay = B.graphLayout(g.nodes, g.pairs, 150);
  assert.equal(lay.shown, 5); assert.equal(lay.total, 5);
  const x = Object.fromEntries(lay.nodes.map((n) => [n.id, n.x]));
  assert.equal(x['pref:a'], x['pref:b']);
  assert.ok(x['pref:a'] < x['note:c'] && x['note:c'] < x['skill:d'] && x['skill:d'] < x['inst:e']);
  assert.equal(lay.lines.length, 3);
  const many = { nodes: Array.from({ length: 400 }, (_, i) => ({ id: 'n' + i, kind: i % 2 ? 'brain' : 'skill', title: 'N' + i, brightness: (i % 10) / 10 })),
    links: Array.from({ length: 399 }, (_, i) => [i, i + 1, 'next']) };
  const big = B.normalize(many);
  const capped = B.graphLayout(big.nodes, big.pairs, 150);
  assert.equal(capped.shown, 150); assert.equal(capped.total, 400);
  assert.equal(capped.nodes.length, 150);
  const kept = new Set(capped.nodes.map((n) => n.id));
  assert.ok(capped.lines.every((l) => kept.has(l.a) && kept.has(l.b)));
  assert.ok(capped.nodes.every((n) => Number(n.id.slice(1)) % 10 >= 6), 'brightest nodes are kept');
  assert.equal(B.CAP, 150);
});

test('brain: the graph view shows an SVG and a showing N of M note', () => {
  const { CC } = load();
  serve(CC, 'brain_read', { nodes: Array.from({ length: 200 }, (_, i) => ({ id: 'n' + i, kind: 'brain', title: 'N' + i, brightness: 0.5 })), links: [[0, 1, 'x']] });
  const tree = render(CC.h(CC.BrainTab, { pageId: 'brain', initialView: 'graph' }));
  assert.equal(findAll(tree, (n) => n.type === 'svg' && n.props['data-brain-graph']).length, 1);
  assert.equal(findAll(tree, (n) => n.type === 'line').length, 1);
  assert.match(textOf(tree), /Showing 150 of 200/);
});

test('brain: add-on off, server down, stale banner and empty states', () => {
  const { CC } = load();
  serve(CC, 'brain_read', brain, { brain: false, learn: true });
  let calls = [];
  const orig = CC.useWpc;
  CC.useWpc = (t, i, o) => { calls.push(t); return orig(t, i, o); };
  assert.match(textOf(render(CC.h(CC.BrainTab, {}))), /brain add-on is off/i);
  assert.deepEqual(calls, [null]);
  serve(CC, 'none', null, null, { code: 'server_down', message: 'down' });
  assert.match(textOf(render(CC.h(CC.BrainTab, {}))), /server is not running/);
  serve(CC, 'brain_read', brain, null, { code: 'server_down', message: 'The Waypoint server is not running.' });
  const stale = render(CC.h(CC.BrainTab, {}));
  assert.match(textOf(stale), /Could not refresh/);
  assert.match(textOf(stale), /Short replies/);
  serve(CC, 'brain_read', { nodes: [], links: [] });
  assert.match(textOf(render(CC.h(CC.BrainTab, {}))), /No knowledge notes yet/);
});

const learn = {
  topics: [
    { id: 'derivatives', title: 'Derivatives', goal: 'Read a slope', status: 'active', steps: [
      { id: 's1', title: 'Slope', deps: [], status: 'taught', note: '' },
      { id: 's2', title: 'Limit', deps: ['s1'], status: 'todo', note: '' },
      { id: 's3', title: 'Derivative', deps: ['s2'], status: 'todo', note: '' }] },
    { id: 'sets', title: 'Sets', goal: '', status: 'paused', steps: [
      { id: 'a', title: 'Union', deps: [], status: 'taught', note: '' },
      { id: 'b', title: 'Subset', deps: [], status: 'repair', note: 'mixed up with element' }] }
  ],
  props: [
    { id: 'p1', topic: 'derivatives', text: 'A slope is rise over run.', premises: [], practice: { reps: 2 } },
    { id: 'p2', topic: 'derivatives', text: 'A limit is the value approached.', premises: ['p1'], practice: { reps: 0 } }
  ],
  links: [{ from: 'p1', to: 'p2' }],
  due: [{ id: 'p2', topic: 'derivatives', text: 'A limit is the value approached.', premises: ['p1'] }]
};

test('learn: progress counts taught steps; the current step is a repair first, else the first ready todo', () => {
  const { L } = load();
  assert.deepEqual(plain(L.progress(learn.topics[0])), { taught: 1, total: 3, pct: 33 });
  assert.equal(L.currentStep(learn.topics[0]).id, 's2');
  assert.equal(L.currentStep(learn.topics[1]).id, 'b');
  assert.equal(L.currentStep({ steps: [{ id: 'x', deps: ['y'], status: 'todo' }, { id: 'y', deps: [], status: 'taught' }] }).id, 'x');
  assert.equal(L.currentStep({ steps: [{ id: 'x', status: 'taught' }] }), null);
  assert.deepEqual(plain(L.progress({ steps: [] })), { taught: 0, total: 0, pct: null });
});

test('learn: topic input uses the v8 slug for the id (learn_topic_set)', () => {
  const { L } = load();
  assert.equal(L.slug('  Bayes\' Rule, part 2! '), 'bayes-rule-part-2');
  assert.equal(L.slug('!!!'), 'topic');
  assert.equal(L.slug('x'.repeat(60)).length, 48);
  assert.deepEqual(plain(L.topicInput('Linear algebra', ' See a matrix as a map ')), { id: 'linear-algebra', title: 'Linear algebra', goal: 'See a matrix as a map' });
  assert.deepEqual(plain(L.topicInput('Graphs', '  ')), { id: 'graphs', title: 'Graphs' });
  assert.equal(L.topicInput('   ', 'goal'), null);
});

test('learn: step, idea and practice inputs match the v8 tool schemas', () => {
  const { L } = load();
  assert.deepEqual(plain(L.stepInput('derivatives', 's2', 'taught', '')), { topic: 'derivatives', step: 's2', status: 'taught' });
  assert.deepEqual(plain(L.stepInput('derivatives', 's2', 'repair', ' confused limit with value ')), { topic: 'derivatives', step: 's2', status: 'repair', note: 'confused limit with value' });
  assert.equal(L.stepInput('derivatives', 's2', 'done', ''), null);
  assert.deepEqual(plain(L.propInput('derivatives', ' A derivative is a limit of slopes. ', 'p1, p2 p1', ['p1', 'p2'])),
    { ok: true, input: { topic: 'derivatives', text: 'A derivative is a limit of slopes.', premises: ['p1', 'p2'] } });
  assert.deepEqual(plain(L.propInput('derivatives', 'Plain idea.', '', ['p1'])), { ok: true, input: { topic: 'derivatives', text: 'Plain idea.', premises: [] } });
  assert.equal(L.propInput('derivatives', '  ', '', []).ok, false);
  assert.match(L.propInput('derivatives', 'Idea.', 'p9', ['p1']).error, /p9/);
  assert.deepEqual(plain(L.practiceInput('p2', 'good')), { id: 'p2', outcome: 'good' });
  assert.equal(L.practiceInput('p2', 'great'), null);
  assert.deepEqual(plain(L.OUTCOMES), ['again', 'hard', 'good', 'easy']);
});

test('learn: the tab shows topics with progress, the current step and due practice; buttons call the learn writes', async () => {
  const { CC, acts } = load();
  serve(CC, 'learn_read', learn);
  const tree = render(CC.h(CC.LearnTab, { pageId: 'learn' }));
  const txt = textOf(tree);
  assert.match(txt, /Derivatives/);
  assert.match(txt, /1\/3 steps/);
  assert.match(txt, /Next step: Limit/);
  assert.match(txt, /A limit is the value approached/);
  buttons(tree, 'Good')[0].props.onClick();
  await tick();
  buttons(tree, 'Taught')[0].props.onClick();
  await tick();
  assert.deepEqual(plain(acts), [
    { tool: 'learn_practice_record', input: { id: 'p2', outcome: 'good' }, refresh: ['learn_read'] },
    { tool: 'learn_step_set', input: { topic: 'derivatives', step: 's2', status: 'taught' }, refresh: ['learn_read'] }]);
  assert.ok(buttons(tree, 'Add topic').length === 1 && buttons(tree, 'Add idea').length >= 1);
});

test('learn: runAct shows the server answer and never writes before it', async () => {
  const { CC, L } = load();
  const seen = [];
  CC.wpc.act = () => Promise.reject(Object.assign(new Error('topic t does not exist'), { code: 'not_found' }));
  let busy = 'x';
  await L.runAct(CC, { tool: 'learn_step_set', input: {}, key: 'k', label: 'Saved.' }, (s) => seen.push(s), (b) => { busy = b; });
  assert.deepEqual(plain(seen), [{ text: 'Working…' }, { text: 'Not saved: topic t does not exist.', tone: 'error' }]);
  assert.equal(busy, null);
});

test('learn: add-on off, server down, stale banner and empty states', () => {
  const { CC } = load();
  serve(CC, 'learn_read', learn, { brain: true, learn: false });
  assert.match(textOf(render(CC.h(CC.LearnTab, {}))), /learn add-on is off/i);
  serve(CC, 'none', null, null, { code: 'server_down', message: 'down' });
  assert.match(textOf(render(CC.h(CC.LearnTab, {}))), /server is not running/);
  serve(CC, 'learn_read', learn, null, { code: 'server_down', message: 'The Waypoint server is not running.' });
  const stale = render(CC.h(CC.LearnTab, {}));
  assert.match(textOf(stale), /Could not refresh/);
  assert.match(textOf(stale), /Derivatives/);
  serve(CC, 'learn_read', { topics: [], props: [], links: [], due: [] });
  const empty = textOf(render(CC.h(CC.LearnTab, {})));
  assert.match(empty, /No topics yet/);
  assert.match(empty, /Add topic/);
});
