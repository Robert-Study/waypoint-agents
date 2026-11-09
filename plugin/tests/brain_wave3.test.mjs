// brain_wave3.test.mjs - Waypoint v3 wave 3 Brain items (labels never cover other notes' dots, skills
// show no path), updated for the release redesign: both pages use the kit header, and Learn is a
// generic concept page (no interview, company or voice-assistant wording; one primary action).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js', 'view_star.js', 'page_learn.js']);
const src = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

test('a label is moved or dropped rather than drawn over another note dot', () => {
  const items = [{ id: 'a', x: 100, y: 100, text: 'Alpha note' }];
  const right = CC.planStarLabels(items, [], 5, { w: 1000, h: 600 }, [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 140, y: 102 }]);
  assert.equal(right.a.side, -1, 'right side blocked by b, so it flips left');
  const both = CC.planStarLabels(items, [], 5, { w: 1000, h: 600 }, [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 140, y: 100 }, { id: 'c', x: 60, y: 99 }]);
  assert.ok(!both.a, 'both sides blocked: label hidden');
  const own = CC.planStarLabels(items, [], 5, { w: 1000, h: 600 }, [{ id: 'a', x: 100, y: 100 }]);
  assert.equal(own.a.side, 1, 'its own dot never blocks it');
  const forced = CC.planStarLabels([{ id: 'a', x: 100, y: 100, text: 'Alpha note', force: true }], [], 0, { w: 1000, h: 600 }, [{ id: 'b', x: 140, y: 100 }, { id: 'c', x: 60, y: 99 }]);
  assert.ok(forced.a, 'the selected label is always drawn');
});

test('labels carry a 4px canvas halo painted under the text', () => {
  assert.match(src('view_star.js'), /strokeWidth: 4[^}]*paintOrder: 'stroke'/);
});

const nodes = [
  { id: 'p', label: 'Alpha', kind: 'preference', cluster: 'UI', provenance: 'explicit_user_statement', path: 'C:/Notes/Prefs/a.md' },
  { id: 's', label: 'A skill', kind: 'skill', cluster: 'Skills', provenance: null, path: 'C:/Notes/Skills/s/SKILL.md' }
];
test('list rows: no path text; skills show no folder', () => {
  const t = render(CC.h(CC.BrainListView, { nodes, kinds: { preference: true, skill: true }, q: '', sort: { key: 'kind', dir: 1 }, onSort() {}, onSelect() {}, selected: null }));
  const skill = findAll(t, hasClass('cc-tb-r')).find((x) => textOf(x).includes('A skill'));
  assert.ok(!/SKILL\.md|[\\/]/.test(textOf(skill)));
  assert.equal(CC.brainParentFolder(nodes[1]), '');
});

test('Brain and Learn build their header with the kit PageHeader; no old bar or segmented copies', () => {
  for (const f of ['page_brain.js', 'page_learn.js']) {
    assert.match(src(f), /ui\.PageHeader\(\{/, f);
    assert.match(src(f), /ui\.Page\(\{/, f);
    assert.ok(!/'cc-bar'|cc-bar-l|className: 'cc-seg'/.test(src(f)), f + ' has no old header bar');
  }
});

// Strip API paths: the engine routes keep their names; only interface text is checked.
const ui = (f) => src(f).replace(/'\/api\/[^']*'/g, "''").replace(/\/api\/[\w/?=&.-]*/g, '');
test('Learn has no interview, company, employer or voice-assistant brand wording', () => {
  const l = ui('page_learn.js');
  for (const w of [/interview/i, /\bSTAR\b/, /Gemini/, /compan(y|ies)\b(?!_files)/i, /employer/i, /competenc/i, /Get my 10/, /recruit/i])
    // engine field names (company_files, s.competencies) are data keys, not interface text
    assert.ok(!w.test(l.replace(/company_files|company=|\.competencies\b/g, '')), String(w));
  assert.deepEqual(personalHits(l), []);  // owner name, employer and paths: tools/personal_terms.json
  assert.deepEqual(personalHits(l), []);  // owner name, employer and paths: tools/personal_terms.json
});

const step = {
  concept: 'c1', title: 'Concept one', mastery: 1, builds_on: [{ id: 'c0', title: 'Basics' }], explain: 'Why it matters.',
  question: { id: 'q1', text: 'What is it?', also_tests: [] }, model_answer: { bullets: [{ label: '', text: 'It is this.' }] },
  intervals: { again: '10 min', hard: '1 d', good: '3 d', easy: '7 d' }, card: { new: true }, evidence: []
};
const primaries = (t) => findAll(t, (n) => n.type === 'button' && hasClass('cc-b-primary')(n));

test('Practice: one primary (Reveal answer); after reveal the four outcomes, none preferred', () => {
  const before = render(CC.h(CC.LearnPractice, { step, revealed: false, onReveal() {}, onRate() {}, onCopy() {} }));
  assert.deepEqual(primaries(before).map(textOf), ['Reveal answer']);
  assert.match(textOf(before), /What is it\?/);
  assert.match(textOf(before), /Next step · Builds on Basics · Mastery 1 of 4/);
  const rated = [];
  const after = render(CC.h(CC.LearnPractice, { step, revealed: true, onReveal() {}, onRate: (n) => rated.push(n), onCopy() {} }));
  assert.equal(primaries(after).length, 0, 'no outcome looks preferred');
  const rate = findAll(after, (n) => n.props.role === 'group' && n.props['aria-label'] === 'Record outcome')[0];
  const buttons = findAll(rate, (n) => n.type === 'button');
  assert.deepEqual(buttons.map((b) => b.props.children[0]), ['Again', 'Hard', 'Good', 'Easy']);
  buttons[2].props.onClick();
  assert.deepEqual(rated, [3]);
  assert.match(textOf(after), /It is this\./);
});

test('Concept: one primary (Practise) when it has questions; level scale starts empty', () => {
  const node = { id: 'c1', title: 'Concept one', learn_status: 'ready', mastery: 0, deps: ['c0'], explain: 'Text.', questions: ['q1', 'q2'], evidence: [] };
  CC.Likert = (p) => CC.h('div', { 'data-likert': String(p.value) });
  const picked = [];
  const t = render(CC.h(CC.LearnConcept, { node, byId: { c0: { title: 'Basics' } }, qById: {}, stories: [], onSet() {}, onCopy() {}, onPractise: (q) => picked.push(q) }));
  assert.deepEqual(primaries(t).map(textOf), ['Practise']);
  primaries(t)[0].props.onClick();
  assert.deepEqual(picked, ['q1']);
  assert.equal(findAll(t, (n) => n.props['data-likert'] !== undefined)[0].props['data-likert'], 'null');
  assert.match(textOf(t), /Needs Basics/);
  delete CC.Likert;
});

test('worked examples render only when the engine data provides them', () => {
  const node = { id: 'c1', title: 'Concept one', learn_status: 'ready', mastery: 0, questions: [], evidence: [], stories: ['e1'] };
  const none = render(CC.h(CC.LearnConcept, { node, byId: {}, qById: {}, stories: [], onSet() {}, onCopy() {}, onPractise() {} }));
  assert.doesNotMatch(textOf(none), /Worked examples/);
  const ex = render(CC.h(CC.LearnConcept, { node, byId: {}, qById: {}, stories: [{ id: 'e1', title: 'Example one', situation: 'S', action: 'A', result: 'R' }], onSet() {}, onCopy() {}, onPractise() {} }));
  assert.match(textOf(ex), /Worked examples.*Example one/);
});

test('focused practice is optional: shown only when the engine sends roles', () => {
  const l = src('page_learn.js');
  assert.match(l, /const hasFocus = !!\(data && data.roles && data.roles.length\);/);
  assert.match(l, /hasFocus && focusOnS\[0\] \? h\(Focus/);
  assert.deepEqual(CC.learnNormalize({ concept_graph: { nodes: [] }, next_step: null }).roles.length, 0);
});

done('brain_wave3');
