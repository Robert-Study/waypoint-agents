// tab_prefs.test.mjs - CC.PrefsTab: preferences review and toolbox (dsh-v2 t-prefs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCC, render, textOf, findAll, hasClass } from './harness.mjs';

function load() {
  const CC = loadCC(['tokens.js', 'ui.js', 'wpc_client.js', 'tab_prefs.js']);
  const acts = [];
  CC.wpc.act = (tool, input, refresh) => { acts.push({ tool, input, refresh }); return Promise.resolve({ ok: true }); };
  return { CC, I: CC.prefsTabInternals, acts };
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const buttons = (tree, label) => findAll(tree, (n) => n.type === 'button' && textOf(n) === label);

function pref(id, extra) {
  return Object.assign({ id, title: 'Note ' + id, paragraphs: ['Plain text about lunch.'], tags: [], weight: 1, sources: [], skill_edits: [] }, extra || {});
}
const harnessPref = pref('p-h', { paragraphs: ['Workers on the Waypoint board report one line.'] });
const skillPref = pref('p-s', {
  paragraphs: ['First paragraph.', 'Second paragraph.'],
  sources: [{ verbatim: 'keep it short', stated_at: '2026-01-02' }],
  skill_edits: [{ skill: 'demo-skill', section: 'Rules', text: 'Old rule text.', replaces: 'Older text.', evidence: 'row 1' },
    { skill: 'demo-skill', section: 'Notes', evidence: 'row 2' }]
});

test('prefs: the harness filter matches text, tags and skill edits', () => {
  const { I } = load();
  assert.equal(I.isHarness(harnessPref), true);
  assert.equal(I.isHarness(pref('a')), false);
  assert.equal(I.isHarness(pref('b', { tags: ['dsh'] })), true);
  assert.equal(I.isHarness(pref('c', { paragraphs: ['Pick cheaper models first.'] })), true);
  assert.equal(I.isHarness(pref('d', { paragraphs: ['Delegate to agents.'] })), true);
  assert.equal(I.isHarness(pref('e', { skill_edits: [{ skill: 'x', section: 'y', evidence: 'z' }] })), true);
  assert.equal(I.isHarness(pref('f', { title: 'The test harness' })), true);
  const all = [pref('a'), harnessPref, skillPref];
  assert.deepEqual(I.filterPrefs(all, true).map((p) => p.id), ['p-h', 'p-s']);
  assert.equal(I.filterPrefs(all, false).length, 3);
});

test('prefs: pages hold 25 cards and Show more adds the next 25', () => {
  const { CC, I } = load();
  assert.equal(I.PAGE, 25);
  const many = Array.from({ length: 60 }, (_, i) => pref('n' + i, { tags: ['waypoint'] }));
  assert.equal(I.pageOf(many, 25).length, 25);
  assert.equal(I.pageOf(many, 50).length, 50);
  assert.equal(I.pageOf(many, 75).length, 60);
  CC.useWpcFeatures = () => ({ addons: { preferences: true } });
  CC.useWpc = (tool) => ({ data: tool === 'pref_list' ? { pending: many, counts: { active: 3 } } : { items: [] }, error: null, loading: false, reload() {} });
  const tree = render(CC.h(CC.PrefsTab, { pageId: 'prefs' }));
  assert.equal(findAll(tree, (n) => n.props['data-pref-id']).length, 25);
  assert.equal(buttons(tree, 'Show more').length, 1);
  assert.match(textOf(tree), /25 of 60/);
});

test('prefs: approve and reject send the id and refresh pref_list', async () => {
  const { CC, acts } = load();
  CC.useWpcFeatures = () => ({ addons: { preferences: true } });
  CC.useWpc = (tool) => ({ data: tool === 'pref_list' ? { pending: [harnessPref] } : { items: [] }, error: null, loading: false, reload() {} });
  const tree = render(CC.h(CC.PrefsTab, { pageId: 'prefs' }));
  buttons(tree, 'Approve')[0].props.onClick();
  buttons(tree, 'Reject')[0].props.onClick();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(plain(acts), [
    { tool: 'pref_approve', input: { id: 'p-h' }, refresh: ['pref_list'] },
    { tool: 'pref_reject', input: { id: 'p-h' }, refresh: ['pref_list'] }]);
});

test('prefs: edit splits paragraphs on blank lines and carries skill edit text', () => {
  const { I } = load();
  assert.deepEqual(plain(I.splitParagraphs('One\n\n  Two  \n \nThree\nstill three\n\n')), ['One', 'Two', 'Three\nstill three']);
  const input = I.editInput(skillPref, { text: 'A\n\nB', skills: ['  New rule.  ', ''] });
  assert.deepEqual(plain(input), { id: 'p-s', paragraphs: ['A', 'B'], skill_edits: [
    { skill: 'demo-skill', section: 'Rules', text: 'New rule.', replaces: 'Older text.', evidence: 'row 1' },
    { skill: 'demo-skill', section: 'Notes', evidence: 'row 2' }] });
  assert.deepEqual(plain(I.editInput(harnessPref, { text: 'Only one.' })), { id: 'p-h', paragraphs: ['Only one.'] });
  assert.equal(I.editInput(harnessPref, { text: '  \n\n ' }), null);
  assert.deepEqual(plain(I.draftOf(skillPref)), { text: 'First paragraph.\n\nSecond paragraph.', skills: ['Old rule text.', ''] });
});

test('prefs: a card in edit mode shows one textarea for text and one per skill edit with text; Save calls pref_edit', () => {
  const { CC, I } = load();
  let saved = null;
  const card = render(CC.h(I.PrefCard, { pref: skillPref, editing: true, draft: I.draftOf(skillPref),
    onSave: () => { saved = true; }, onCancel() {}, onDraft() {}, onAct() {}, onEdit() {} }));
  const areas = findAll(card, (n) => n.type === 'textarea');
  assert.equal(areas.length, 2);
  assert.equal(areas[0].props.value, 'First paragraph.\n\nSecond paragraph.');
  assert.equal(areas[1].props.value, 'Old rule text.');
  assert.match(textOf(card), /Rule text stays/);
  buttons(card, 'Save')[0].props.onClick();
  assert.equal(saved, true);
  const view = render(CC.h(I.PrefCard, { pref: skillPref, editing: false, onAct() {}, onEdit() {} }));
  assert.equal(findAll(view, (n) => n.type === 'textarea').length, 0);
  assert.match(textOf(view), /keep it short/);
  assert.match(textOf(view), /Approve also changes 2 skill rules/);
  assert.match(textOf(view), /Older text\./);
  assert.equal(buttons(view, 'Edit').length, 1);
});

test('prefs: the save handler sends pref_edit with paragraphs and skill_edits and refreshes pref_list', async () => {
  const { CC, I, acts } = load();
  const statuses = [];
  await I.runAct(CC, { tool: 'pref_edit', input: I.editInput(skillPref, { text: 'X\n\nY', skills: ['Z', ''] }), label: 'Saved p-s.' },
    (s) => statuses.push(s));
  assert.equal(acts[0].tool, 'pref_edit');
  assert.deepEqual(plain(acts[0].refresh), ['pref_list']);
  assert.deepEqual(plain(acts[0].input.paragraphs), ['X', 'Y']);
  assert.equal(acts[0].input.skill_edits[0].text, 'Z');
  assert.equal(statuses.at(-1).text, 'Saved p-s.');
});

test('prefs: add-on off shows a calm off state and still shows the toolbox', () => {
  const { CC } = load();
  const asked = [];
  CC.useWpcFeatures = () => ({ addons: { preferences: false } });
  CC.useWpc = (tool) => { asked.push(tool); return { data: tool === 'toolbox_read' ? { items: [{ id: 't1', name: 'Tool one', kind: 'cli', status: 'on' }] } : null, error: null, loading: false, reload() {} }; };
  const tree = render(CC.h(CC.PrefsTab, { pageId: 'prefs' }));
  assert.match(textOf(tree), /add-on is off/);
  assert.equal(asked.includes('pref_list'), false);
  assert.match(textOf(tree), /Tool one/);
});

test('prefs: server down with no data shows the problem state', () => {
  const { CC } = load();
  CC.useWpcFeatures = () => null;
  CC.useWpc = () => ({ data: null, error: { code: 'server_down' }, loading: false, reload() {} });
  assert.match(textOf(render(CC.h(CC.PrefsTab, { pageId: 'prefs' }))), /server is not running/);
});

test('prefs: toolbox filters by kind and text; unknown status needs approval and sorts first', () => {
  const { I } = load();
  const items = [
    { id: 'a', name: 'Alpha', kind: 'cli', status: 'on', provider: 'Acme' },
    { id: 'b', name: 'Beta', kind: 'model', status: 'unknown', notes: 'cheap' },
    { id: 'c', name: 'Gamma', kind: 'model', status: 'off' },
    { id: 'd', name: 'Delta', kind: 'mcp' }];
  assert.equal(I.needsApproval(items[0]), false);
  assert.equal(I.needsApproval(items[1]), true);
  assert.equal(I.needsApproval(items[3]), true);
  assert.equal(I.countNeeds(items), 2);
  assert.deepEqual(I.filterToolbox(items, 'all', '').map((i) => i.id), ['b', 'd', 'c', 'a']);
  assert.deepEqual(I.filterToolbox(items, 'model', '').map((i) => i.id), ['b', 'c']);
  assert.deepEqual(I.filterToolbox(items, 'all', 'acme').map((i) => i.id), ['a']);
  assert.deepEqual(I.filterToolbox(items, 'model', 'CHEAP').map((i) => i.id), ['b']);
  assert.deepEqual(plain(I.kindOptions(items)), [
    { value: 'all', label: 'All', count: 4 }, { value: 'model', label: 'model', count: 2 },
    { value: 'mcp', label: 'mcp', count: 1 }, { value: 'cli', label: 'cli', count: 1 }]);
});
