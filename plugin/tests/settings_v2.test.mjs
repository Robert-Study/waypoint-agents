// settings_v2.test.mjs - dsh 2.0 Settings: the Waypoint section (server status, models and connectors, add-ons) on CC.wpc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, render, findAll, textOf, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const FILES = ['tokens.js', 'ui.js', 'wpc_client.js', 'settings.js'];
const FEATURES = { tools: ['ops_read'], addons: { preferences: false, brain: true, learn: false, toolbox: true }, data_dir: '/data/demo' };
const OPS = {
  providers: [
    { id: 'alpha', label: 'Alpha CLI', enabled: true, pool: 'alpha-week', state: 'up', reason: null },
    { id: 'beta', label: 'Beta API', enabled: false, pool: 'beta-day', state: 'disabled', reason: null },
    { id: 'gamma', label: 'Gamma', enabled: true, pool: 'gamma-month', state: 'down', reason: 'usage source failed' }
  ],
  pools: [
    { pool: 'alpha-week', provider: 'alpha', remaining_percent: 62, floor: 20 },
    { pool: 'gamma-month', provider: 'gamma', remaining_percent: 8, floor: null }
  ]
};

function setup() {
  const acts = [];
  const CC = loadCC(FILES);
  CC.wpc.act = (tool, input, refresh) => { acts.push({ tool, input, refresh }); return Promise.resolve(input); };
  const I = CC.settingsInternals;
  return { CC, I, acts };
}
const view = (CC, props) => render(CC.h(CC.settingsInternals.WaypointSection, Object.assign({
  features: FEATURES, featuresError: null, ops: OPS, opsError: null, onToggle() {}, onFloor() {} }, props || {})));
const plain = (x) => JSON.parse(JSON.stringify(x));
const part = (tree, name) => findAll(tree, (n) => n.props['data-part'] === name)[0];

test('settings: the Waypoint section replaces Agents; Pages, Chat app and About stay', () => {
  const { CC } = setup();
  CC.AgentsPage = () => { throw new Error('the retired Agents panel must not render'); };
  const tree = render(CC.h(CC.SettingsPage, {}));
  const heads = findAll(tree, (n) => n.props.className === 'cc-sec-t').map(textOf);
  assert.deepEqual(heads, ['Pages', 'Chat app', 'Waypoint', 'About']);
  assert.equal(findAll(tree, (n) => n.props['data-section'] === 'settings-agents').length, 0);
  assert.equal(findAll(tree, (n) => n.props['data-section'] === 'settings-waypoint').length, 1);
  const src = fs.readFileSync(path.join(SRC, 'settings.js'), 'utf8');
  assert.doesNotMatch(src, /AgentsPage|\/api\/models\/toggle|\/api\/toggles\/set|useCore|8751/);
});

test('settings server status: reachable shows the data folder', () => {
  const { CC } = setup();
  const t = textOf(part(view(CC), 'server'));
  assert.match(t, /Waypoint server/);
  assert.match(t, /Running/);
  assert.match(t, /\/data\/demo/);
});

test('settings server status: down says so and gives the one-line fix', () => {
  const { CC } = setup();
  const down = Object.assign(new Error('The Waypoint server is not running.'), { code: 'server_down' });
  const tree = view(CC, { features: null, featuresError: down, ops: null, opsError: down });
  const t = textOf(part(tree, 'server'));
  assert.match(t, /Not running/);
  assert.match(t, /python -m waypoint_runner\.wpc_http/);
  assert.equal(findAll(part(tree, 'server'), (n) => n.props.className === 'cc-set-err').length, 1);
  assert.match(textOf(part(tree, 'addons')), /server/i);
  // a refused ops read with the server up is not "down"
  assert.equal(CC.settingsInternals.serverState(FEATURES, null, { code: 'forbidden' }).up, true);
  assert.equal(CC.settingsInternals.serverState(null, null, null).checking, true);
});

test('settings models and connectors: every provider from ops_read with its state and a switch', () => {
  const { CC } = setup();
  const tree = view(CC);
  const box = part(tree, 'models');
  const t = textOf(box);
  assert.match(t, /Models and connectors/);
  ['Alpha CLI', 'Beta API', 'Gamma'].forEach((l) => assert.match(t, new RegExp(l)));
  assert.match(t, /Up/); assert.match(t, /Off/); assert.match(t, /Down/); assert.match(t, /usage source failed/);
  const sw = findAll(box, (n) => n.props.role === 'switch');
  assert.deepEqual(sw.map((s) => s.props['data-id']), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(sw.map((s) => s.props['aria-checked']), ['true', 'false', 'true']);
  // nothing hard-coded to a vendor
  const src = fs.readFileSync(path.join(SRC, 'settings.js'), 'utf8');
  assert.doesNotMatch(src.slice(src.indexOf('---- Waypoint section')), /claude|codex|openai|anthropic|gemini|deepseek-chat|copilot|ollama/i);
});

test('settings toggle_set input: a switch sends {id, enabled} and refreshes ops_read', async () => {
  const { CC, I, acts } = setup();
  assert.deepEqual(plain(I.toggleInput('beta', true)), { id: 'beta', enabled: true });
  const seen = [];
  const box = part(view(CC, { onToggle: (id, on) => seen.push([id, on]) }), 'models');
  findAll(box, (n) => n.props.role === 'switch' && n.props['data-id'] === 'beta')[0].props.onClick();
  assert.deepEqual(seen, [['beta', true]]);
  const msg = await I.doToggle(CC, 'beta', true);
  assert.deepEqual(JSON.parse(JSON.stringify(acts[0])), { tool: 'toggle_set', input: { id: 'beta', enabled: true }, refresh: ['ops_read'] });
  assert.match(msg.text, /Beta|beta/);
  assert.equal(msg.error, false);
});

test('settings floor_set input: each pool shows its floor; a number, a blank and a bad value', async () => {
  const { CC, I, acts } = setup();
  const box = part(view(CC), 'models');
  const inputs = findAll(box, (n) => n.type === 'input' && n.props['data-floor']);
  assert.deepEqual(inputs.map((i) => i.props['data-floor']), ['alpha-week', 'gamma-month']);
  assert.equal(inputs[0].props.defaultValue, '20');
  assert.equal(inputs[1].props.defaultValue, '');
  assert.deepEqual(plain(I.parseFloor('15')), { ok: true, value: 15 });
  assert.deepEqual(plain(I.parseFloor(' ')), { ok: true, value: null });
  assert.equal(I.parseFloor('140').ok, false);
  assert.equal(I.parseFloor('abc').ok, false);
  assert.deepEqual(plain(I.floorInput('gamma-month', null)), { pool: 'gamma-month', min_percent: null });
  await I.doFloor(CC, 'alpha-week', '30');
  await I.doFloor(CC, 'gamma-month', '');
  const bad = await I.doFloor(CC, 'gamma-month', '101');
  assert.deepEqual(JSON.parse(JSON.stringify(acts)), [
    { tool: 'floor_set', input: { pool: 'alpha-week', min_percent: 30 }, refresh: ['ops_read'] },
    { tool: 'floor_set', input: { pool: 'gamma-month', min_percent: null }, refresh: ['ops_read'] }]);
  assert.equal(bad.error, true);
  // blur on the input hands the typed text to onFloor
  const got = [];
  const box2 = part(view(CC, { onFloor: (p, v) => got.push([p, v]) }), 'models');
  findAll(box2, (n) => n.type === 'input' && n.props['data-floor'] === 'alpha-week')[0].props.onBlur({ target: { value: '25' } });
  assert.deepEqual(got, [['alpha-week', '25']]);
});

test('settings refused writes show the server message; the switch is disabled while it runs', async () => {
  const { CC, I } = setup();
  CC.wpc.act = () => Promise.reject(Object.assign(new Error('provider gone'), { code: 'not_found' }));
  const msg = await I.doToggle(CC, 'beta', true);
  assert.equal(msg.error, true);
  assert.match(msg.text, /provider gone/);
  const box = part(view(CC, { busy: 'toggle:beta' }), 'models');
  assert.equal(findAll(box, (n) => n.props.role === 'switch' && n.props['data-id'] === 'beta')[0].props.disabled, true);
});

test('settings models: empty, loading and stale states', () => {
  const { CC } = setup();
  assert.match(textOf(part(view(CC, { ops: { providers: [], pools: [] } }), 'models')), /No models or connectors/);
  assert.match(textOf(part(view(CC, { ops: null, loading: true }), 'models')), /Loading/);
  const stale = view(CC, { opsError: Object.assign(new Error('timeout'), { code: 'http_500' }) });
  assert.match(textOf(part(stale, 'models')), /Alpha CLI/);
  assert.equal(findAll(part(stale, 'models'), (n) => /(^| )cc-bn( |$)/.test(n.props.className || '')).length, 1);
});

test('settings add-ons: preferences, brain, learn, toolbox read-only, with how to turn an off one on', () => {
  const { CC } = setup();
  const box = part(view(CC), 'addons');
  const t = textOf(box);
  ['Preferences', 'Brain', 'Learn', 'Toolbox'].forEach((l) => assert.match(t, new RegExp(l)));
  assert.equal(findAll(box, (n) => n.props.role === 'switch').length, 0, 'read only');
  const rows = findAll(box, (n) => n.props['data-cc-row']);
  const row = (id) => textOf(rows.find((r) => r.props['data-cc-row'] === 'addon-' + id));
  assert.match(row('preferences'), /Off/);
  assert.match(row('preferences'), /prefs_tools/);
  assert.match(row('preferences'), /~\/\.waypoint\/config\.json/);
  assert.match(row('brain'), /On/);
  assert.doesNotMatch(row('brain'), /turn|Set /i);
  assert.match(row('learn'), /Off/);
  assert.match(row('learn'), /learn_tools/);
  assert.match(row('toolbox'), /On/);
  const off = textOf(part(view(CC, { features: { addons: { toolbox: false } } }), 'addons'));
  assert.match(off, /toolbox\.json/);
});

test('settings About: plugin version and Waypoint server, no Core 8751 line', () => {
  const { CC } = setup();
  CC.version = '2.0.0';
  const tree = render(CC.h(CC.SettingsPage, {}));
  const about = textOf(findAll(tree, (n) => n.props['data-section'] === 'settings-about')[0]);
  assert.match(about, /Waypoint for dshVersion 2\.0\.0/);
  assert.match(about, /Waypoint server/);
  assert.match(about, /127\.0\.0\.1:8762/);
  assert.doesNotMatch(about, /Waypoint Core|Core API|Core address/);
  assert.deepEqual(personalHits(textOf(tree)), []);
});
