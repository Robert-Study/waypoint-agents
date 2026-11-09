// knowledge_chat_redesign.test.mjs - release redesign of Brain, Learn and the Claude/Codex chat pages:
// each renders the kit Page + PageHeader, has at most one primary button, and none of these files
// carries the owner's name, personal paths, the old product name or the old console prefix.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const FILES = ['page_brain.js', 'page_learn.js', 'chat_panel.js', 'page_claude.js', 'page_codex.js', 'flat_picker.js', 'model_badges.js', 'live_diff.js'];
const src = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

test('no owner name, personal paths, old product name or old console prefix in these files', () => {
  for (const f of FILES) {
    const s = src(f);
    assert.deepEqual(personalHits(s), [], f);  // owner name, employer, paths: tools/personal_terms.json
    for (const bad of [/Control Centre/i, /\[control-centre\]/, /Meridian/])
      assert.ok(!bad.test(s), f + ': ' + bad);
    // the only @waypoint/ left is live_diff's internal tab id, keyed to the package id
    const rob = s.match(/@rob\//g) || [];
    assert.ok(rob.length === 0 || (f === 'live_diff.js' && rob.length === 1), f + ': @waypoint/');
  }
});

const pending = () => new Promise(() => {});
const api = { get: pending, post: pending, subscribe: () => () => {} };
const primaries = (t) => findAll(t, (n) => n.type === 'button' && hasClass('cc-b-primary')(n));

test('Brain renders the kit header (title Brain, Map / List / Overlaps, search, More) and a quiet loading line', () => {
  const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js'], { api });
  const t = render(CC.h(CC.BrainPage, {}));
  const ph = findAll(t, hasClass('cc-ph'));
  assert.equal(ph.length, 1);
  assert.equal(textOf(findAll(t, hasClass('cc-ph-title'))[0]), 'Brain');
  assert.deepEqual(findAll(t, hasClass('cc-sg-o')).map(textOf), ['Map', 'List', 'Overlaps']);
  assert.ok(findAll(t, (n) => n.type === 'input' && n.props['aria-label'] === 'Search').length === 1);
  assert.ok(findAll(t, (n) => n.props['aria-haspopup'] === 'menu').length === 1, 'More menu');
  if (typeof CC.ui.Menu === 'function') assert.ok(/ui\.Menu\(props\)/.test(src('page_brain.js')), 'the kit Menu draws the trigger');
  assert.ok(!/'…'\)|'···'/.test(src('page_brain.js')), 'no local glyph trigger');
  assert.equal(textOf(findAll(t, hasClass('cc-br-line'))[0]), 'Building the index…');
  assert.ok(primaries(t).length <= 1);
  assert.match(src('page_brain.js'), /\.cc-br-search\{[^}]*width:240px/);
});

test('Brain kind chips: one quiet line of toggles with counts, folders off by default', () => {
  const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js'], { api });
  const graph = { nodes: [{ id: 'a', label: 'A', kind: 'preference', cluster: 'X' }], links: [], counts: { preference: 1, brain: 0, skill: 0, instruction: 0, folder: 4 } };
  CC.React.useState = ((orig) => { let i = 0; return (init) => (i++ === 0 ? [{ data: graph, error: null, loading: false }, () => {}] : orig(init)); })(CC.React.useState);
  const t = render(CC.h(CC.BrainPage, {}));
  const chips = findAll(t, hasClass('cc-chip'));
  assert.deepEqual(chips.map(textOf), ['Preferences1', 'Notes0', 'Skills0', 'Instructions0', 'Folders4']);
  assert.deepEqual(chips.map((c) => c.props['aria-pressed']), ['true', 'true', 'true', 'true', 'false']);
  assert.ok(!findAll(t, (n) => n.type === 'input' && n.props.type === 'checkbox').length, 'no checkbox soup');
});

test('Learn renders the kit header (title Learn, List / Map) and a quiet loading line', () => {
  const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js', 'page_learn.js'], { api });
  const t = render(CC.h(CC.LearnPage, {}));
  assert.equal(textOf(findAll(t, hasClass('cc-ph-title'))[0]), 'Learn');
  assert.deepEqual(findAll(t, hasClass('cc-sg-o')).map(textOf), ['List', 'Map']);
  assert.match(textOf(t), /Loading concepts…/);
  assert.ok(primaries(t).length <= 1);
});

test('Learn list: concepts in prerequisite order with a mastery meter; the next step is marked', () => {
  const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js', 'page_learn.js'], { api });
  const raw = {
    concept_graph: { nodes: [
      { id: 'b', title: 'Second', learn_status: 'ready', mastery: 1, wave: 1, deps: ['a'], questions: ['qb'] },
      { id: 'a', title: 'First', learn_status: 'mastered', mastery: 4, wave: 0, deps: [], questions: ['qa'] }], due: 0 },
    next_step: { concept: 'b', title: 'Second', mastery: 1, question: { id: 'qb', text: 'Explain the second idea.' }, intervals: {} },
    stories: []
  };
  const data = CC.learnNormalize(raw);
  assert.equal(data.mastered, 1);
  let i = 0;
  const orig = CC.React.useState;
  CC.React.useState = (init) => { const k = i++; if (k === 0) return [{ data, error: null, loading: false }, () => {}]; if (k === 2) return [data.next, () => {}]; return orig(init); };
  const t = render(CC.h(CC.LearnPage, {}));
  CC.React.useState = orig;
  assert.match(textOf(findAll(t, hasClass('cc-ph-meta'))[0]), /^1 of 2 mastered$/);
  const rows = findAll(findAll(t, (n) => n.type === 'nav')[0], hasClass('cc-r'));
  assert.deepEqual(rows.map((r) => textOf(findAll(r, hasClass('cc-r-t'))[0])), ['First', 'Second']);
  assert.ok(findAll(rows[0], hasClass('cc-mt')).length === 1, 'mastery meter');
  assert.match(textOf(rows[1]), /Next/);
  assert.deepEqual(primaries(t).map(textOf), ['Reveal answer']);
  assert.match(textOf(t), /Explain the second idea\./);
});

test('chat pages use the kit header when ui.js is loaded; Send stays the one primary action', () => {
  const engine = { data: { agents: [{ id: 'codex', name: 'Codex', available: true, needs_confirm: true, usage_percent: 40, usage: [], models: [], efforts: [] }], folders: [], default_folder: null }, error: null, loading: false };
  const CC = loadCC(['tokens.js', 'ui.js', 'chat_panel.js', 'page_claude.js', 'page_codex.js'], { api, useEngine: () => engine });
  const t = render(CC.h(CC.CodexPage, null));
  assert.equal(findAll(t, hasClass('cc-ph')).length, 1);
  assert.equal(textOf(findAll(t, hasClass('cc-ph-title'))[0]), 'Codex');
  assert.equal(findAll(t, hasClass('cc-ag-send')).length, 1);
  assert.ok(hasClass('cc-page')(t) && hasClass('cc-ag')(t));
  // no chat open: one compact kit Empty above the composer; Chats heading in Section style with a quiet New chat
  const em = findAll(t, hasClass('cc-em'));
  assert.equal(em.length, 1);
  assert.equal(textOf(em[0]), 'No chat openPick a chat on the left or type below.');
  const heads = findAll(t, hasClass('cc-ag-h'));
  assert.ok(heads.every((x) => hasClass('cc-sec-h')(x)));
  const nc = findAll(heads[0], (n) => n.type === 'button')[0];
  assert.equal(textOf(nc), 'New chat');
  assert.ok(hasClass('cc-b-quiet')(nc));
  assert.match(src('chat_panel.js'), /'\.cc-root \.cc-ag-sessions\{flex:none;\}'/, 'Subagents sit right under the chat list');
  // Codex's confirm-first flow is unchanged: needs_confirm arms Send and shows usage before anything is posted
  assert.match(src('chat_panel.js'), /if \(agent\.needs_confirm && !armed\) \{\s*setArmed\(true\);\s*setNote\(\{ text: usageLong\(agent\)/);
});

done('knowledge_chat_redesign');
