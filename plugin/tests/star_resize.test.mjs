// star_resize.test.mjs - REV-plugin: Create's Stars view re-reads the canvas on every resize. The resize
// check compared against the size of the render it was created in (deps [fill]), so a canvas that went
// back to that first size (800x480 before the holder is measured) never re-rendered and kept a stale
// fill scale. It must compare against the size of the latest render.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC, h, test, done } from './harness.mjs';

function setup() {
  const slots = []; let idx = 0; const layoutFx = []; let bumps = 0; let roCb = null;
  const React = {
    createElement: h,
    useState: (init) => { const i = idx++; if (!(i in slots)) slots[i] = { v: typeof init === 'function' ? init() : init };
      const s = slots[i]; return [s.v, (nv) => { s.v = typeof nv === 'function' ? nv(s.v) : nv; bumps++; }]; },
    useRef: (v) => { const i = idx++; if (!(i in slots)) slots[i] = { current: v === undefined ? null : v }; return slots[i]; },
    useMemo: (fn, deps) => { const i = idx++; const s = slots[i]; if (s && s.deps && deps && s.deps.every((d, j) => Object.is(d, deps[j]))) return s.v;
      slots[i] = { v: fn(), deps }; return slots[i].v; },
    useCallback: (fn, deps) => React.useMemo(() => fn, deps),
    useEffect: () => { idx++; },
    useLayoutEffect: (fn) => { const i = idx++; if (!(i in slots)) { slots[i] = {}; layoutFx.push(fn); } }
  };
  const CC = { h, React };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Float64Array, Number, String, isFinite, Date,
    ResizeObserver: class { constructor(cb) { roCb = cb; } observe() {} disconnect() {} } });
  for (const f of ['tokens.js', 'check_counts.js', 'layout_star.js', 'view_star.js']) {
    vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  }
  const size = { w: 1100, h: 600 };
  const el = { getBoundingClientRect: () => ({ width: size.w, height: size.h, left: 0, top: 0 }), addEventListener() {}, removeEventListener() {} };
  const board = { nodes: [{ id: 'a', lane: 'ui' }, { id: 'b', lane: 'ui' }, { id: 'c', lane: 'engine' }], edges: [['a', 'b'], ['b', 'c']] };
  function renderOnce() { idx = 0; return CC.StarView({ board, labelMode: 'regions' }); }
  return { renderOnce, layoutFx, size, el, fire: () => roCb && roCb(), bumps: () => bumps };
}

test('a canvas resized back to the first render size still re-renders the stars', () => {
  const s = setup();
  const out = s.renderOnce();                       // first render: holder unmeasured, 800x480 assumed
  assert.equal(typeof out.props.ref, 'function');
  out.props.ref(s.el);                              // commit attaches the holder
  s.layoutFx.forEach((fn) => fn());                 // mount: measures 1100x600 and asks for a render
  const afterMount = s.bumps();
  assert.ok(afterMount >= 1, 'mount re-renders at the measured size');
  s.renderOnce();                                   // now laid out for 1100x600
  s.size.w = 800; s.size.h = 480;                   // the canvas shrinks to exactly the first guess
  s.fire();
  assert.ok(s.bumps() > afterMount, 'resize to 800x480 re-renders');
});

done('star_resize');
