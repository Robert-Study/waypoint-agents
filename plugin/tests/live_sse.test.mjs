// live_sse.test.mjs - L1: surfaces refresh on engine SSE events and clear their timers on unmount.
// Effects are captured by a stub React and run by hand; subscribe/get/setInterval are stubs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, SRC, test, done } from './harness.mjs';

function setup(files, store, stateOverride) {
  const gets = [], listeners = new Set(), intervals = new Map(), cleared = [];
  let nextId = 1, unsubs = 0;
  const effects = [];
  let idx = 0;
  const React = {
    createElement: h,
    useState: (init) => { const i = idx++; const v = stateOverride && i in stateOverride ? stateOverride[i] : (typeof init === 'function' ? init() : init); return [v, () => {}]; },
    useRef: (v) => ({ current: v === undefined ? null : v }),
    useEffect: (fn) => { effects.push(fn); },
    useLayoutEffect: () => {}, useMemo: (fn) => fn(), useCallback: (fn) => fn, useId: () => 'id'
  };
  const CC = {
    h, React,
    api: {
      get: (p) => { gets.push(p); return new Promise(() => {}); },
      post: () => new Promise(() => {}),
      subscribe: (fn) => { listeners.add(fn); return () => { unsubs++; listeners.delete(fn); }; }
    },
    useEngine: () => ({ data: null, error: new Error('down'), loading: false })
  };
  const ctx = vm.createContext({
    CC, console, Math, JSON, Object, Array, Set, Map, Number, String, isFinite,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem() {}, removeItem() {} },
    setInterval: (fn, ms) => { const id = nextId++; intervals.set(id, ms); return id; },
    clearInterval: (id) => { cleared.push(id); intervals.delete(id); },
    setTimeout: () => 0, clearTimeout: () => {}
  });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  const emit = (kind, data) => listeners.forEach((l) => l(kind, data));
  return { CC, gets, listeners, intervals, cleared, effects, emit, unsubs: () => unsubs, reset: () => { gets.length = 0; } };
}

test('Plan page: classic planner session reloads on a planner event, safety poll >= 60 s, all cleaned up', () => {
  const s = setup(['tokens.js', 'ui.js', 'inputs.js', 'page_plan.js'], { 'cc.plan.session': 's-1' }, { 3: { status: 'running' } });
  s.CC.PlanPage({});
  const cleanups = s.effects.map((e) => e()).filter(Boolean);
  s.reset();
  s.emit('planner', { id: 'other', status: 'running' });
  assert.equal(s.gets.length, 0, 'other sessions ignored');
  s.emit('planner', { id: 's-1', status: 'running' });
  assert.deepEqual(s.gets, ['/api/planner/session?id=s-1']);
  const ms = [...s.intervals.values()];
  assert.ok(ms.length >= 1 && ms.every((m) => m >= 60000), 'fallback polls are slow: ' + ms);
  cleanups.forEach((c) => c());
  assert.equal(s.intervals.size, 0, 'intervals cleared on unmount');
  assert.equal(s.listeners.size, 0, 'unsubscribed on unmount');
});

test('Plan page: deep plan reloads on a deep_plan event; cleaned up on unmount', () => {
  const s = setup(['tokens.js', 'ui.js', 'inputs.js', 'page_plan.js'], { 'cc.plan.deep': 'dp-1' }, { 3: { status: 'running' } });
  s.CC.PlanPage({});
  const cleanups = s.effects.map((e) => e()).filter(Boolean);
  s.reset();
  s.emit('deep_plan', { id: 'dp-1', status: 'running', stage: 'graph' });
  assert.deepEqual(s.gets, ['/api/plan/deep?id=dp-1']);
  assert.ok([...s.intervals.values()].every((m) => m >= 60000));
  cleanups.forEach((c) => c());
  assert.equal(s.intervals.size, 0);
  assert.equal(s.listeners.size, 0);
});

test('Chat panel: subagent chat list reloads on an agent event; 60 s fallback; cleaned up', () => {
  const s = setup(['tokens.js', 'chat_panel.js'], {});
  s.CC.ChatPanel({ agentId: 'claude_code' });
  const cleanups = s.effects.map((e) => e()).filter(Boolean);
  s.reset();
  s.emit('state', {});
  assert.ok(!s.gets.some((g) => g.startsWith('/api/subagent_chats')), 'unrelated kind ignored');
  s.emit('agent', { turn_id: 't', done: false });
  assert.ok(s.gets.some((g) => g.startsWith('/api/subagent_chats?agent=claude_code')), 'reloaded on agent event');
  assert.ok([...s.intervals.values()].every((m) => m >= 60000), 'only slow polls remain: ' + [...s.intervals.values()]);
  cleanups.forEach((c) => c());
  assert.equal(s.intervals.size, 0, 'intervals cleared');
  assert.equal(s.listeners.size, 0, 'unsubscribed');
});

test('Execute page: fetches subscribe to state/run and the fallback title says Execute', () => {
  const src = fs.readFileSync(path.join(SRC, 'page_create.js'), 'utf8');
  assert.ok(/'\/api\/board\?project='[^;]*\['state', 'run'\]/.test(src), 'board refreshes on state and run');
  assert.ok(/'\/api\/runs'[^;]*\['run', 'state'\]/.test(src), 'runs refresh on run and state');
  assert.ok(/\|\| 'Execute'\)/.test(src) && !/\|\| 'Create'\)/.test(src));
});

done('live_sse');
