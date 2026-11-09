// brain_list.test.mjs - B1 (release redesign): the Brain has no Flow view; List is one dense table
// (kind, title, cluster, source) of the chosen kinds, narrowed by the header search and sortable by
// column; the grouped outline helper still groups by kind, then cluster, with counts and folding.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const CC = loadCC(['tokens.js', 'ui.js', 'page_brain.js']);
const src = fs.readFileSync(path.join(SRC, 'page_brain.js'), 'utf8');

const D = 'C:\\Notes';
const nodes = [
  { id: 'pref:b', label: 'Bravo preference', kind: 'preference', cluster: 'UI & design', provenance: 'explicit_user_statement', path: D + '\\Prefs\\b.md', tags: ['ui'] },
  { id: 'pref:a', label: 'Alpha preference', kind: 'preference', cluster: 'Communication', provenance: 'agent_synthesis', path: D + '\\Prefs\\a.md' },
  { id: 'pref:c', label: 'Charlie preference', kind: 'preference', cluster: 'Communication', provenance: 'inherited_registry', path: D + '\\Prefs\\c.md' },
  { id: 'brain:m', label: 'Mental model one', kind: 'brain', cluster: 'Mental Models', provenance: 'vetted_source', path: D + '\\Brain\\m.md' },
  { id: 'skill:s', label: 'A skill', kind: 'skill', cluster: 'Skills', provenance: null, path: D + '\\Skills\\s\\SKILL.md' },
  { id: 'inst:i', label: 'AGENTS.md', kind: 'instruction', cluster: 'Instructions', provenance: null, path: D + '\\AGENTS.md' },
  { id: 'folder:x', label: 'Notes', kind: 'folder', cluster: 'Notes', provenance: null, path: D, depth: 0 },
  { id: 'folder:y', label: '06 System', kind: 'folder', cluster: 'Notes', provenance: null, path: D + '\\06 System', depth: 1 }
];
const graph = {
  nodes, roots: { drive: D, disk: 'C:\\Work' },
  links: [{ source: 'folder:x', target: 'folder:y', kind: 'contains' }, { source: 'pref:a', target: 'pref:b', kind: 'related' },
    { source: 'folder:x', target: 'pref:a', kind: 'contains' }]
};
const ALL = { preference: true, brain: true, skill: true, instruction: true, folder: true };
const DEF = { preference: true, brain: true, skill: true, instruction: true, folder: false };

test('Brain views are Map, List and Overlaps; Flow is gone', () => {
  assert.deepEqual(Array.from(CC.brainViews, (v) => v.label), ['Map', 'List', 'Overlaps']);
  assert.ok(!/['"]flow['"]/.test(src), 'no flow view id left in page_brain.js');
  assert.ok(!/FlowView/.test(src), 'Brain no longer renders FlowView');
});

test('Map board is unchanged: kind chips choose nodes, every link kind is drawn', () => {
  const b = CC.brainBoard(graph, DEF);
  assert.equal(b.nodes.length, 6);
  assert.deepEqual(b.edges.map((e) => e.kind), ['related']);
  assert.equal(CC.brainBoard(graph, ALL).edges.length, 3);
});

test('outline groups by kind in fixed order, then cluster, with counts', () => {
  const g = CC.brainGroups(nodes, {});
  assert.deepEqual(Array.from(g, (x) => x.label), ['Preferences', 'Notes', 'Skills', 'Instructions', 'Folders']);
  assert.deepEqual(Array.from(g, (x) => x.count), [3, 1, 1, 1, 2]);
  assert.deepEqual(Array.from(g[0].clusters, (c) => c.cluster), ['Communication', 'UI & design']);
  assert.deepEqual(Array.from(g[0].clusters[0].rows, (r) => r.label), ['Alpha preference', 'Charlie preference']);
  assert.deepEqual(Array.from(g[4].clusters[0].rows, (r) => r.id), ['folder:x', 'folder:y']);
});

test('outline folding: Folders and multi-cluster clusters start folded; a filter opens matches', () => {
  const g = CC.brainGroups(nodes, {});
  assert.equal(g[4].collapsed, true);
  assert.deepEqual(Array.from(g[0].clusters, (c) => c.collapsed), [true, true]);
  assert.equal(g[1].clusters[0].collapsed, false);
  const f = CC.brainGroups(nodes, { q: 'preference comm', collapsed: { 'k:preference': true } });
  assert.equal(f.length, 1); assert.equal(f[0].count, 2); assert.equal(f[0].total, 3); assert.equal(f[0].collapsed, false);
});

test('table rows: chosen kinds only, default order kind > cluster > title, folders by path', () => {
  const r = CC.brainRows(nodes, { kinds: DEF });
  assert.deepEqual(r.map((n) => n.id), ['pref:a', 'pref:c', 'pref:b', 'brain:m', 'skill:s', 'inst:i']);
  const all = CC.brainRows(nodes, { kinds: ALL });
  assert.deepEqual(all.slice(-2).map((n) => n.id), ['folder:x', 'folder:y']);
});

test('table rows: search matches title, cluster, path, tags and the source label', () => {
  assert.deepEqual(CC.brainRows(nodes, { kinds: ALL, q: 'preference comm' }).map((n) => n.id), ['pref:a', 'pref:c']);
  assert.deepEqual(CC.brainRows(nodes, { kinds: ALL, q: '06 system' }).map((n) => n.id), ['folder:y']);
  assert.deepEqual(CC.brainRows(nodes, { kinds: ALL, q: 'your own words' }).map((n) => n.id), ['pref:b']);
  assert.equal(CC.brainRows(nodes, { kinds: ALL, q: 'zzz' }).length, 0);
});

test('table rows sort by title, cluster or source, both directions', () => {
  const t = CC.brainRows(nodes, { kinds: DEF, sort: { key: 'title', dir: 1 } }).map((n) => n.label);
  assert.equal(t[0], 'A skill');
  const d = CC.brainRows(nodes, { kinds: DEF, sort: { key: 'title', dir: -1 } }).map((n) => n.label);
  assert.deepEqual(d, t.slice().reverse());
  const s = CC.brainRows(nodes, { kinds: DEF, sort: { key: 'source', dir: 1 } }).map((n) => n.id);
  assert.deepEqual(s.slice(0, 4), ['pref:b', 'brain:m', 'pref:a', 'pref:c'], 'your own words, vetted, agent summary, imported');
});

test('source labels are neutral: no owner name', () => {
  assert.equal(CC.brainProvLabel('explicit_user_statement'), 'Your own words');
  assert.equal(CC.brainProvLabel('agent_synthesis'), 'Agent summary');
  assert.deepEqual(personalHits(src), []);
});

test('short path keeps the useful tail and marks the root', () => {
  assert.equal(CC.brainShortPath(D + '\\AGENTS.md', graph.roots), 'Drive\\AGENTS.md');
  assert.equal(CC.brainShortPath('C:\\Work\\x\\y.md', graph.roots), 'Disk\\x\\y.md');
  assert.equal(CC.brainShortPath('D:\\other\\z.md', graph.roots), 'D:\\other\\z.md');
});

function list(props) {
  return render(CC.h(CC.BrainListView, Object.assign({ nodes, kinds: DEF, q: '', sort: { key: 'kind', dir: 1 }, onSort() {}, onSelect() {}, selected: null }, props)));
}

test('List is a dense table: sortable header (Kind, Title, Cluster, Source), one 32 px row per note', () => {
  const t = list({ selected: 'pref:b' });
  const heads = findAll(t, hasClass('cc-tb-sort'));
  assert.deepEqual(heads.map(textOf).map((x) => x.replace(/[↑↓]/, '')), ['Kind', 'Title', 'Cluster', 'Source']);
  assert.equal(heads[0].props['aria-sort'], 'ascending');
  const rows = findAll(t, hasClass('cc-tb-r'));
  assert.equal(rows.length, 6, 'folders hidden while their chip is off');
  const r = rows.find((x) => textOf(x).includes('Bravo preference'));
  assert.deepEqual(r.props.children.map(textOf), ['Preference', 'Bravo preference', 'UI & design', 'Your own words']);
  assert.equal(r.props.title, D + '\\Prefs\\b.md', 'full path in the tooltip');
  assert.equal(r.props['aria-current'], 'true');
  assert.match(src, /\.cc-tb-r\{[^}]*height:32px/);
});

test('a header click sorts (again reverses); a row click selects', () => {
  const sorts = [], picked = [];
  const t = list({ sort: { key: 'title', dir: 1 }, onSort: (s) => sorts.push(s), onSelect: (id) => picked.push(id) });
  const heads = findAll(t, hasClass('cc-tb-sort'));
  heads[1].props.onClick();
  heads[2].props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(sorts)), [{ key: 'title', dir: -1 }, { key: 'cluster', dir: 1 }]);
  findAll(t, hasClass('cc-tb-r')).find((x) => textOf(x).includes('Alpha')).props.onClick();
  assert.deepEqual(picked, ['pref:a']);
});

test('keyboard: arrows move, Home/End jump; the table handles keys', () => {
  const nav = CC.brainListKey;
  assert.equal(nav('ArrowDown', 0, 5).index, 1);
  assert.equal(nav('ArrowDown', 4, 5).index, 4);
  assert.equal(nav('ArrowUp', 3, 5).index, 2);
  assert.equal(nav('Home', 3, 5).index, 0);
  assert.equal(nav('End', 1, 5).index, 4);
  assert.equal(nav('x', 2, 5), null);
  const box = findAll(list({}), hasClass('cc-tb'))[0];
  assert.equal(typeof box.props.onKeyDown, 'function');
  assert.ok(findAll(list({}), (n) => n.props['data-nav']).length === 6, 'every row is reachable');
});

test('empty search result says so in one line', () => {
  assert.match(textOf(list({ q: 'nothing-like-this' })), /No notes match/);
});

done('brain_list');
