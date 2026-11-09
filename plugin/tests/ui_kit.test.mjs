// ui_kit.test.mjs - the shared component kit (ui.js): structure, states and design rules.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, hasClass, test, done } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const CC = loadCC(['tokens.js', 'ui.js']);
const U = CC.ui;

test('kit exports every documented component', () => {
  for (const k of ['Page', 'PageHeader', 'Button', 'Segmented', 'Toggle', 'Section', 'List', 'Row', 'Meter', 'Badge', 'Banner', 'Empty', 'Field', 'Icon'])
    assert.equal(typeof U[k], 'function', k);
});

test('page header: title, meta, actions in one bar', () => {
  const t = render(U.PageHeader({ title: 'Plan', meta: '3 open', actions: U.Button({ kind: 'primary', children: 'Run' }) }));
  assert.ok(hasClass('cc-ph')(t));
  assert.equal(textOf(findAll(t, hasClass('cc-ph-title'))[0]), 'Plan');
  assert.equal(textOf(findAll(t, hasClass('cc-ph-meta'))[0]), '3 open');
  assert.equal(findAll(t, hasClass('cc-b-primary')).length, 1);
});

test('segmented marks only the chosen option pressed and shows counts', () => {
  const t = render(U.Segmented({ options: [{ value: 'a', label: 'All', count: 4 }, { value: 'b', label: 'Open' }], value: 'a' }));
  const opts = findAll(t, hasClass('cc-sg-o'));
  assert.deepEqual(opts.map((o) => o.props['aria-pressed']), ['true', 'false']);
  assert.equal(textOf(opts[0]), 'All4');
});

test('segmented does not call onChange for the current value', () => {
  let calls = 0;
  const t = render(U.Segmented({ options: ['x', 'y'], value: 'x', onChange: () => calls++ }));
  const opts = findAll(t, hasClass('cc-sg-o'));
  opts[0].props.onClick(); assert.equal(calls, 0);
  opts[1].props.onClick(); assert.equal(calls, 1);
});

test('toggle is a switch with aria-checked and flips the value', () => {
  let got = null;
  const t = render(U.Toggle({ checked: false, label: 'Codex', onChange: (v) => { got = v; } }));
  assert.equal(t.props.role, 'switch');
  assert.equal(t.props['aria-checked'], 'false');
  t.props.onClick(); assert.equal(got, true);
});

test('meter never invents a number when the value is unknown', () => {
  assert.match(textOf(render(U.Meter({ value: null }))), /^–/);
  assert.match(textOf(render(U.Meter({ value: 42.4 }))), /^42%/);
  assert.ok(hasClass('cc-mt-low')(render(U.Meter({ value: 5 }))));
});

test('clickable rows are keyboard reachable; plain rows are not', () => {
  const r1 = render(U.Row({ title: 'A', onClick: () => {} }));
  assert.equal(r1.props.tabIndex, 0);
  assert.equal(r1.props.role, 'button');
  const r2 = render(U.Row({ title: 'B' }));
  assert.equal(r2.props.tabIndex, undefined);
});

test('kit css: no raw colours, gradients, glows or !important; sizes on the scale', () => {
  const css = U.css;
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'raw colour in ui.js');
  assert.doesNotMatch(css, /gradient|!important|backdrop-filter|box-shadow/);
  const sizes = new Set([...css.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1])));
  for (const s of sizes) assert.ok([11, 12, 14, 17, 22].includes(s), 'off-scale size ' + s);
});

test('Menu: a quiet "More" button, closed by default, a menu of items when open', () => {
  const closed = render(U.Menu({ items: [{ label: 'Archive', onClick() {} }] }));
  const btn = findAll(closed, (n) => n.type === 'button');
  assert.equal(btn.length, 1);
  assert.equal(btn[0].props['aria-haspopup'], 'menu');
  assert.equal(btn[0].props['aria-expanded'], 'false');
  assert.equal(btn[0].props['aria-label'], 'More');
  assert.ok(hasClass('cc-b-quiet')(btn[0]), 'never a primary button');
  assert.equal(findAll(closed, (n) => n.props.role === 'menu').length, 0);
});

test('Menu: items carry danger and disabled; a disabled item never runs', () => {
  const ran = [];
  const t = render(U.Menu({ label: 'Node actions', defaultOpen: true, items: [
    { label: 'Retry', onClick: () => ran.push('retry') },
    { label: 'Skip', danger: true, onClick: () => ran.push('skip') },
    { label: 'Run with Codex', disabled: true, onClick: () => ran.push('codex') }
  ] }));
  const menu = findAll(t, (n) => n.props.role === 'menu');
  assert.equal(menu.length, 1);
  const items = findAll(t, (n) => n.props.role === 'menuitem');
  assert.deepEqual(items.map(textOf), ['Retry', 'Skip', 'Run with Codex']);
  assert.ok(hasClass('cc-mn-danger')(items[1]));
  assert.equal(items[2].props.disabled, true);
  items[0].props.onClick(); items[2].props.onClick();
  assert.deepEqual(ran, ['retry']);
});

test('Menu: with no items the button is disabled; h(Menu) and Menu() both work', () => {
  const t = render(U.Menu({ items: [] }));
  assert.equal(findAll(t, (n) => n.type === 'button')[0].props.disabled, true);
  assert.ok(findAll(render(CC.h(U.Menu, { items: [{ label: 'A' }] })), (n) => n.type === 'button').length === 1);
});

test('Menu trigger is the quiet 28 px icon button with the kit More icon, never text dots', () => {
  const t = render(U.Menu({ label: 'More', text: true, items: [{ label: 'A' }] }));
  const btn = findAll(t, (n) => n.type === 'button')[0];
  assert.ok(hasClass('cc-b-icon')(btn) && hasClass('cc-b-quiet')(btn));
  assert.equal(findAll(btn, (n) => n.type === 'path')[0].props.d, U.ICONS.more);
  assert.equal(textOf(btn), '', 'no text label or dot glyphs');
  assert.match(U.css, /\.cc-root \.cc-b-icon\{width:28px;padding:0;\}/);
});

test('native checkboxes: one kit rule, 16 px, accent when checked', () => {
  assert.match(U.css, /\.cc-root input\[type="checkbox"\]\{[^}]*width:16px;height:16px;[^}]*accent-color:var\(--cc-accent\)/);
  assert.match(CC.css, /color-scheme:dark/, 'dark theme draws dark native controls');
});

test('Menu css: one hairline popover, no shadow, sizes on the scale', () => {
  assert.match(U.css, /\.cc-mn-pop\{[^}]*border:1px solid var\(--cc-line-strong\)/);
});

test('CoreEmpty: a compact empty state that says Core is not running', () => {
  const t = render(U.CoreEmpty({ core: { state: 'down' } }));
  assert.ok(hasClass('cc-em')(t));
  assert.equal(textOf(findAll(t, hasClass('cc-em-t'))[0]), 'The Waypoint server is not running');
});

test('additive props: Toggle id, Section data-section, Page data-cc-page', () => {
  assert.equal(render(U.Toggle({ id: 'cc-plan', checked: true })).props['data-id'], 'cc-plan');
  assert.equal(render(U.Section({ title: 'About', section: 'settings-about' })).props['data-section'], 'settings-about');
  assert.equal(render(U.Page({ page: 'settings', header: null, children: [] })).props['data-cc-page'], 'settings');
});

test('a key on a control inside a row is not taken by the row', () => {
  let n = 0;
  const r = render(U.Row({ title: 'A', onClick: () => { n++; } }));
  const el = {};
  r.props.onKeyDown({ key: ' ', target: {}, currentTarget: el, preventDefault() {} });
  assert.equal(n, 0);
  r.props.onKeyDown({ key: 'Enter', target: el, currentTarget: el, preventDefault() {} });
  assert.equal(n, 1);
});

test('kit and shell sources name no owner and no personal path', () => {
  const fs = globalThis.process && process.getBuiltinModule ? process.getBuiltinModule('node:fs') : null;
  if (!fs) return;
  for (const f of ['ui.js', 'tokens.js', 'app.js', 'api.js', 'brand.js', 'topbar.js', 'settings.js', 'workspace_hide.js',
    'toggles.js', 'inputs.js', 'command_bar.js', 'sidebar_chats.js']) {
    const src = fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    assert.deepEqual(personalHits(src), [], f);
    assert.doesNotMatch(src, /C:\\\\Users|Control Centre|control-centre|@rob\//, f);
  }
});

done('ui_kit');
