// addons_toggle.test.mjs - add-on switches hide add-on pages; the owner's default keeps every tab; core pages stay.
import assert from 'node:assert/strict';
import { loadCC, test, done } from './harness.mjs';

function registered(addons) {
  const CC = loadCC(['toggles.js', 'app.js']);
  if (addons !== undefined) CC.toggles.state.addons = addons;
  const keys = [];
  const ctx = { slots: { inject: (slot, fn) => fn(), register: (spec) => { if (spec.name === 'sidebar.panellist') keys.push(spec.id); return () => {}; } } };
  CC.apply(ctx);
  return keys;
}
const ALL = ['cc-approvals', 'cc-projects', 'cc-running', 'cc-brain', 'cc-learn', 'cc-settings'];

test('no settings: every current tab present (owner default)', () => {
  const k = registered();
  ALL.forEach((id) => assert.ok(k.includes(id), id));
});
test('brain_learn off hides Brain and Learn only', () => {
  const k = registered({ brain_learn: false });
  assert.ok(!k.includes('cc-brain') && !k.includes('cc-learn'));
  assert.ok(k.includes('cc-approvals') && k.includes('cc-running'));
});
test('claude_codex_pages off hides Claude and Codex', () => {
  const k = registered({ claude_codex_pages: false });
  assert.ok(!k.includes('cc-claude') && !k.includes('cc-codex') && k.includes('cc-brain'));
});
test('core pages cannot be switched off', () => {
  const k = registered({ plan_board: false, engine: false, plugin_shell: false, brain_learn: false, claude_codex_pages: false });
  ['cc-approvals', 'cc-projects', 'cc-running', 'cc-settings'].forEach((id) => assert.ok(k.includes(id), id));
});
done();
