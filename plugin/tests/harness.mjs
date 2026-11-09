// harness.mjs - shared vm loader for plugin/src files (no React, no npm).
// loadCC(['tokens.js', ...]) runs each src file in one vm context with CC = {h, React} stubs.
// render(el) expands function components with stub hooks into a plain tree for assertions.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '..', 'src');
export const REPO = path.resolve(here, '..', '..');

export function h(type, props, ...children) {
  const flat = [];
  const walk = (c) => {
    if (Array.isArray(c)) c.forEach(walk);
    else if (c !== null && c !== undefined && c !== false && c !== true) flat.push(c);
  };
  walk(children);
  return { type, props: Object.assign({}, props || {}, { children: flat }) };
}

export function makeReact() {
  return {
    createElement: h,
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useRef: (v) => ({ current: v === undefined ? null : v }),
    useEffect: () => {},
    useLayoutEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useId: () => 'cc-test-id'
  };
}

export function loadCC(files, extra) {
  const CC = Object.assign({ h, React: makeReact() }, extra || {});
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Float64Array, Number, String, isFinite, setTimeout, clearTimeout });
  for (const f of files) {
    const file = path.join(SRC, f);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  return CC;
}

// Expand function components into host elements.
export function render(el) {
  if (Array.isArray(el)) return el.map(render).filter((x) => x != null);
  if (el === null || el === undefined || typeof el !== 'object') return el;
  if (typeof el.type === 'function') return render(el.type(el.props));
  const children = (el.props.children || []).map(render).filter((x) => x != null);
  return { type: el.type, props: Object.assign({}, el.props, { children }) };
}

export function findAll(tree, pred, out = []) {
  if (Array.isArray(tree)) { tree.forEach((t) => findAll(t, pred, out)); return out; }
  if (!tree || typeof tree !== 'object') return out;
  if (pred(tree)) out.push(tree);
  (tree.props.children || []).forEach((c) => findAll(c, pred, out));
  return out;
}

export function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (tree === null || tree === undefined) return '';
  if (typeof tree !== 'object') return String(tree);
  return (tree.props.children || []).map(textOf).join('');
}

export const hasClass = (cls) => (n) => typeof n.props.className === 'string' && n.props.className.split(/\s+/).includes(cls);

let failures = 0;
let passes = 0;
export function test(name, fn) {
  try { fn(); passes++; console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); }
}
export function done(label) {
  console.log(`${label}: ${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}
