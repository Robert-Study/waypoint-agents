// brain_learn_polish.test.mjs - U7, updated for the release redesign: Brain and Learn carry no
// explanatory junk text, list rows keep the full path in the tooltip, the Learn level scale starts
// with nothing selected, and both pages style only through tokens (no raw radii or colours).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';

const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js']);
const brainSrc = fs.readFileSync(path.join(SRC, 'page_brain.js'), 'utf8');
const learnSrc = fs.readFileSync(path.join(SRC, 'page_learn.js'), 'utf8');

const nodes = [
  { id: 'pref:a', label: 'Alpha', kind: 'preference', cluster: 'UI', provenance: 'explicit_user_statement', path: 'C:\\Notes\\Prefs\\a.md' },
  { id: 'skill:s', label: 'A skill', kind: 'skill', cluster: 'Skills', provenance: null, path: 'C:\\Notes\\Skills\\s\\SKILL.md' }
];
const list = () => render(CC.h(CC.BrainListView, { nodes, kinds: { preference: true, skill: true }, q: '', sort: { key: 'kind', dir: 1 }, onSort() {}, onSelect() {}, selected: null }));

test('list rows show title and source; the full path stays in the tooltip; the folder is a helper', () => {
  const row = findAll(list(), hasClass('cc-tb-r')).find((x) => textOf(x).includes('Alpha'));
  assert.equal(row.props.title, nodes[0].path);
  assert.ok(!/[\\/]/.test(textOf(row)), 'no path text in the row');
  assert.equal(CC.brainParentFolder(nodes[0]), 'Prefs');
  assert.equal(CC.brainParentFolder(nodes[1]), '', 'skills show no folder');
});

test('the search placeholder is short', () => {
  assert.match(brainSrc, /placeholder: isOv \? 'Search overlaps' : 'Search notes'/);
});

test('no explanatory junk text on the Brain or Learn pages', () => {
  for (const junk of ['Every note, grouped by kind and cluster', 'nothing is changed until you act',
    'A skill or instruction restating a preference', 'Notes are never edited here; you decide']) assert.ok(!brainSrc.includes(junk), junk);
  for (const junk of ['Answer out loud as if they just asked you', 'Every fact comes from the evidence files listed',
    'Set your confidence yourself', 'Or type your answer here']) assert.ok(!learnSrc.includes(junk), junk);
});

test('the level scale is not preselected when nothing is recorded', () => {
  assert.match(learnSrc, /value: n\.mastery \? n\.mastery \+ 1 : null/);
});

test('page styles are scoped to their page and use token radii, never raw ones or raw colours', () => {
  assert.match(brainSrc, /\.cc-brain \.cc-br-chips\{/);
  assert.match(learnSrc, /'\.cc-learn \.cc-ln-list\{/);
  for (const s of [brainSrc, learnSrc]) {
    const css = s.match(/const STYLE = \[[\s\S]*?\]\.join/)[0];
    assert.ok(!/border-radius:(?:[2-9]|1\d)px/.test(css), 'radii come from --cc-r-control / --cc-r-panel');
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css), 'no raw colours');
    assert.ok(!/!important|gradient|text-transform:uppercase/.test(css));
  }
});

done('brain_learn_polish');
