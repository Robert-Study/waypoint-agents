// addons_settings.test.mjs - add-on pages wait (briefly) for the engine's `addons` answer before registering.
import assert from 'node:assert/strict';
import { loadCC } from './harness.mjs';
let fails = 0, passes = 0; const queue = [];
function test(name, fn) { queue.push([name, fn]); }

function boot(get) {
  const CC = loadCC(['toggles.js', 'app.js']);
  CC.api = { get, subscribe: () => {}, post: () => Promise.resolve({}) };
  const keys = [];
  const ctx = { slots: { inject: (slot, fn) => fn(), register: (spec) => { if (spec.name === 'sidebar.panellist') keys.push(spec.id); return () => {}; } } };
  CC.toggles.start();  // the live page starts the toggles fetch at load
  return { CC, ctx, keys };
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

test('apply() answer from /api/toggles with addons hides the page before registration', async () => {
  let release;
  const { CC, ctx, keys } = boot(() => new Promise((r) => { release = r; }));
  CC.apply(ctx);
  assert.equal(keys.length, 0, 'not registered before the answer');
  release({ enabled: {}, addons: { brain_learn: false } });
  await tick(20);
  assert.ok(keys.includes('cc-approvals') && keys.includes('cc-projects'));
  assert.ok(!keys.includes('cc-brain') && !keys.includes('cc-learn'));
});

test('engine down (request rejects): every page shows', async () => {
  const { CC, ctx, keys } = boot(() => Promise.reject(new Error('down')));
  CC.apply(ctx);
  await tick(20);
  ['cc-approvals', 'cc-projects', 'cc-running', 'cc-brain', 'cc-learn', 'cc-settings'].forEach((id) => assert.ok(keys.includes(id), id));
});

test('engine silent: pages register after the short timeout, all shown', async () => {
  const { CC, ctx, keys } = boot(() => new Promise(() => {}));
  CC.toggles.WAIT_MS = 30;
  CC.apply(ctx);
  assert.equal(keys.length, 0);
  await tick(80);
  assert.ok(keys.includes('cc-brain') && keys.includes('cc-approvals'));
});

test('answer without addons key: every page shows', async () => {
  const { CC, ctx, keys } = boot(() => Promise.resolve({ enabled: {} }));
  CC.apply(ctx);
  await tick(20);
  assert.ok(keys.includes('cc-brain') && keys.includes('cc-running'));
});
for (const [name, fn] of queue) {
  try { await fn(); passes++; console.log('  ok   ' + name); }
  catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); }
}
console.log('addons_settings: ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
