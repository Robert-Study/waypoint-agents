// flat_picker_inject.test.mjs - regression for the wave-3 crash: dsh's modelDirectories.directoryFor
// reads ctx.remote.session through the calling scope, and cordis throws
// `cannot get property "remote.session" without inject` unless that scope injected it. The slot
// entry then crashed on first open and dsh's two-level picker came back.
import assert from 'node:assert/strict';
import { loadCC, makeReact, render, findAll, textOf, test, done } from './harness.mjs';

class Component { constructor(props) { this.props = props; this.state = {}; } }
const fresh = () => loadCC(['tokens.js', 'model_badges.js', 'flat_picker.js', 'app.js'],
  { React: Object.assign(makeReact(), { Component }) });

const GROUPS = [{ id: 'google', name: 'Google', models: [{ id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }] }];
const STORE = { subscribe: () => () => {}, getSnapshot: () => ({ current: { provider: 'google', model: 'gemini-3.8-flash' },
  groups: GROUPS, status: 'ready', pending: null, error: null }) };

// A cordis-like ctx: the service resolves remote.session through the scope that injected it.
function cordisCtx() {
  const rec = { deps: null, registers: [] };
  const ctx = {
    inject(deps, cb) {
      rec.deps = deps.slice();
      const scope = {
        sessions: { subagentAddress: () => undefined },
        modelDirectories: {
          directoryFor(sid) {
            for (const need of ['remote', 'remote.session']) {
              if (!rec.deps.includes(need)) throw new Error('cannot get property "' + need + '" without inject');
            }
            return { store: STORE, load: () => Promise.resolve(), select: () => Promise.resolve({ ok: true }), sid };
          }
        },
        slots: {
          inject(key, fn) { fn(); return () => {}; },
          register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
        }
      };
      cb(scope);
      return () => {};
    }
  };
  return { ctx, rec };
}

test('the picker injects remote and remote.session, so directoryFor resolves at render time', () => {
  const CC = fresh();
  const { ctx, rec } = cordisCtx();
  CC.applyFlatPicker(ctx);
  for (const d of ['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session']) assert.ok(rec.deps.includes(d), d);
  const reg = rec.registers.find((r) => r.spec.name === 'conversation.input.model');
  assert.ok(reg, 'seat registered');
  // The slot runtime calls spec.inject(sessionId) later, outside the ctx.inject callback.
  const face = reg.spec.inject('s1');
  assert.equal(face.available, true);
  assert.equal(face.directory, STORE);
  const tree = render(CC.h(reg.comp, face));
  assert.ok(textOf(tree).includes('Gemini 3.8 Flash'));
});

test('a directory that cannot be resolved gives a locked trigger, not a crashed slot', () => {
  const CC = fresh();
  const orig = console.warn; console.warn = () => {};
  try {
    for (const dirs of [
      { directoryFor() { throw new Error('cannot get property "remote.session" without inject'); } },
      { directoryFor() { return undefined; } },
      { directoryFor() { return {}; } }]) {
      let face;
      assert.doesNotThrow(() => { face = CC.flatPicker.faceFor(dirs, null, 's1'); });
      assert.equal(face.available, false);
      assert.doesNotThrow(() => face.load());
      const tree = render(CC.h(CC.FlatModelSelect, face));
      const btn = findAll(tree, (n) => n.type === 'button')[0];
      assert.ok(btn && btn.props.disabled, 'trigger locked');
    }
  } finally { console.warn = orig; }
});

done('flat_picker_inject');
