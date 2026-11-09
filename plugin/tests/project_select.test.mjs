// project_select.test.mjs - P2: the Create project selector is legible in dark and light themes.
// A native <select> draws its popup list with the OS scheme unless told otherwise, which gave a
// white list with near-invisible light text in dark mode. The select must set color-scheme per
// theme and give its options explicit token colours (never transparent / raw colours).
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const projects = [{ id: 'p1', title: 'Meridian v2' }, { id: 'p2', title: 'Docs Site' }];
const engine = (path) => {
  if (!path) return { data: null };
  if (path.indexOf('/api/projects') === 0) return { data: { projects } };
  return { data: null };
};
const CC = loadCC(['tokens.js', 'ui.js', 'check_counts.js', 'layout_flow.js', 'layout_star.js', 'waves.js',
  'view_flow.js', 'view_star.js', 'view_waves.js', 'inputs.js', 'page_create.js'],
{ useEngine: engine, unpackBoard: (b) => b, api: { get() {}, post() { return Promise.resolve({}); } } });
const STYLE = CC.createHelpers.STYLE;
const rules = (sel) => STYLE.split('\n').filter((l) => l.indexOf(sel) >= 0).join('\n');

test('the selector renders every project as an option', () => {
  const tree = render(CC.h(CC.CreatePage, {}));
  const sel = findAll(tree, hasClass('cc-project'));
  assert.equal(sel.length, 1);
  assert.equal(sel[0].type, 'select');
  const opts = findAll(sel[0], (n) => n.type === 'option');
  assert.deepEqual(opts.map(textOf), ['Meridian v2', 'Docs Site']);
});

test('light theme: color-scheme light and an opaque token background', () => {
  const base = STYLE.split('\n').find((l) => l.indexOf('.cc-root .cc-project{') === 0);
  assert.ok(base, 'base .cc-project rule');
  assert.match(base, /color-scheme:light/);
  assert.match(base, /background(-color)?:var\(--cc-bg\)/);
  assert.match(base, /color:var\(--cc-text\)/);
  assert.ok(!/background:transparent/.test(base), 'a transparent select paints a white popup in dark mode');
});

test('dark theme: color-scheme dark for OS dark and for dsh dark classes', () => {
  const dark = rules('color-scheme:dark');
  assert.match(dark, /@media \(prefers-color-scheme: dark\)\{\.cc-root:not\(\[data-theme="light"\]\) \.cc-project/);
  for (const sel of ['.cc-root[data-theme="dark"] .cc-project', 'html[data-theme="dark"] .cc-root .cc-project',
    'body.dark .cc-root .cc-project', 'body.theme-dark .cc-root .cc-project']) assert.ok(dark.indexOf(sel) >= 0, sel);
  const light = rules('color-scheme:light');
  for (const sel of ['html[data-theme="light"] .cc-root .cc-project', 'body.light .cc-root .cc-project']) assert.ok(light.indexOf(sel) >= 0, sel);
});

test('options carry explicit token colours in both themes', () => {
  const opt = rules('.cc-project option');
  assert.match(opt, /background(-color)?:var\(--cc-surface\)/);
  assert.match(opt, /color:var\(--cc-text\)/);
});

test('no raw colours in the page stylesheet', () => {
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(STYLE));
});

done('project_select');
