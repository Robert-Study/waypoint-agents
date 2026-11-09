// v4: Agents merges into Settings; the Interview tab is Learn (page id cc-learn is unchanged).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

function load(files) {
  const CC = { h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, setTimeout, clearTimeout });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}
const FILES = ['tokens.js', 'ui.js', 'api.js', 'settings.js', 'page_agents.js', 'app.js'];
const src = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

test('no top-level Agents tab: not in the sidebar list or the Settings tab switches', () => {
  const CC = load(FILES);
  const side = CC.PAGES.filter((p) => p.sidebar !== false).map((p) => p.label);
  assert.ok(!side.includes('Agents'), side.join(','));
  assert.deepEqual([...side], ['Approvals', 'Projects', 'Running', 'Preferences', 'Brain', 'Learn', 'Settings']);
  const ids = findAll(render(h(CC.SettingsPage, {})), (n) => n.props.role === 'switch').map((s) => s.props['data-id']);
  assert.ok(!ids.includes('cc-agents'));
});

test('the cc-learn tab is labelled Learn, not Interview', () => {
  const CC = load(FILES);
  const p = CC.PAGES.find((x) => x.id === 'cc-learn');
  assert.equal(p.label, 'Learn');
  assert.ok(!CC.PAGES.some((x) => x.label === 'Interview'));
  assert.ok(!/'Interview'/.test(src('app.js')));
});

test('Settings renders a Waypoint section in place of the retired Agents panel', () => {
  const CC = load(FILES);
  const seen = [];
  CC.AgentsPage = function FakeAgents(props) { seen.push(props); return h('div', { 'data-fake': 'agents-panel' }); };
  const tree = render(h(CC.SettingsPage, {}));
  // dsh 2.0: the 8751 Agents panel is retired; a Waypoint section (CC.wpc) takes its place.
  assert.equal(findAll(tree, (n) => n.props['data-section'] === 'settings-agents').length, 0);
  const sec = findAll(tree, (n) => n.props['data-section'] === 'settings-waypoint')[0];
  assert.ok(sec, 'no Waypoint section');
  assert.equal(findAll(tree, (n) => n.props['data-fake'] === 'agents-panel').length, 0, 'the retired panel is gone');
  assert.equal(seen.length, 0);
  assert.match(textOf(findAll(sec, (n) => n.props.className === 'cc-sec-t')[0]), /^Waypoint/);
  assert.ok(!/Recommended/.test(textOf(tree)));
});

test('Settings still renders when the Agents panel file is absent', () => {
  const CC = load(['tokens.js', 'ui.js', 'api.js', 'settings.js']);
  assert.ok(textOf(render(h(CC.SettingsPage, {}))).includes('Settings'));
});

test('the embedded Agents panel has no second page title bar', () => {
  const CC = load(FILES);
  CC.useEngine = () => ({ data: null });
  const t = render(h(CC.AgentsPage, { embedded: true, agents: { agents: [{ id: 'claude', name: 'Claude', usage: [] }] },
    toggles: [{ id: 'agent:claude', kind: 'agent', label: 'Claude', enabled: false }], modelsData: { models: [] } }));
  assert.equal(findAll(t, (n) => /cc-ap-bar/.test(n.props.className || '')).length, 0);
  assert.ok(findAll(t, (n) => n.props['data-section'] === 'agents').length === 1);
  assert.ok(findAll(t, (n) => /cc-ap-in/.test(n.props.className || '')).length === 1);
});

test('old cc-agents route redirects to Settings and asks for the Waypoint section', () => {
  const CC = load(FILES);
  const old = CC.PAGES.find((p) => p.id === 'cc-agents');
  assert.ok(old && old.sidebar === false, 'cc-agents stays resolvable but hidden');
  const picked = [];
  CC.ctx = { layout: { selectPanel: (id) => picked.push(id) } };
  CC.openSettingsAgents();
  assert.deepEqual([...picked], ['cc-settings']);
  assert.equal(CC.settingsFocus, 'agents');
  // landing on the old id directly (saved last tab) renders the Settings page and moves on
  CC.settingsFocus = null; picked.length = 0;
  CC.AgentsPage = () => h('div', {});
  const effects = [];
  CC.React.useEffect = (fn) => effects.push(fn);
  const t = render(h(old.component(), {}));
  assert.ok(findAll(t, (n) => n.props['data-section'] === 'settings-waypoint').length === 1);
  effects.reverse().forEach((f) => f()); // children first, as React runs them
  assert.deepEqual([...picked], ['cc-settings']);
  assert.equal(CC.settingsFocus, 'agents');
});

test('"Open Agents" (Claude/Codex pages) lands on Settings: it selects cc-agents, which redirects', () => {
  const chat = src('chat_panel.js');
  assert.ok(/openSettingsAgents|selectPanel\('cc-settings'\)|selectPanel\('cc-agents'\)/.test(chat));
  const CC = load(FILES);
  assert.ok(CC.PAGES.some((p) => p.id === 'cc-agents'));
});

done('v4_tabs_merge');
