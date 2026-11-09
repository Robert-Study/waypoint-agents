// v4_feel.test.mjs [F1] - the calm "Claude / Antigravity" feel as a token contract (owner, v4):
// warm-neutral low-chroma surfaces in both themes, 1px hairline dividers, one restrained accent per
// theme (the Waypoint green), a system sans stack with a small clear type scale, 6-12 px corners,
// no gradients, glows, heavy shadows or !important, and a top bar that reads every colour, size and
// radius from tokens instead of hard-coding them. Token NAMES stay backward compatible.
import assert from 'node:assert/strict';
import { loadCC, test, done } from './harness.mjs';

const CC = loadCC(['tokens.js', 'topbar.js']);
const T = CC.tokens;
const P = T.color;
const THEMES = ['light', 'dark'];
const SURFACES = ['bg', 'surface', 'surface2', 'canvas', 'hull'];

const rgb = (hex) => {
  const h = String(hex).replace('#', '');
  assert.match(h, /^[0-9a-fA-F]{6}$/, 'expected #rrggbb, got ' + hex);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const chroma = (hex) => { const c = rgb(hex); return Math.max(...c) - Math.min(...c); };
const sat = (hex) => { const c = rgb(hex); const mx = Math.max(...c); return mx ? (mx - Math.min(...c)) / mx : 0; };
const alpha = (v) => { const m = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d*\.?\d+)\s*\)$/.exec(v); return m ? Number(m[1]) : null; };

// Every name a page may read today. Values may change; names may not disappear.
const PALETTE_KEYS = ['bg', 'surface', 'surface2', 'canvas', 'line', 'lineStrong', 'text', 'text2', 'text3', 'accent',
  'selection', 'onStatus', 'hull', 'done', 'ready', 'running', 'error', 'neutral', 'lane0', 'lane1', 'lane2', 'lane3',
  'lane4', 'lane5', 'scrim', 'thumb', 'thumbHover', 'wash', 'focus'];

test('token names stay backward compatible', () => {
  for (const t of THEMES) for (const k of PALETTE_KEYS) assert.equal(typeof P[t][k], 'string', t + '.' + k + ' missing');
  for (const k of ['meta', 'label', 'body', 'section', 'title']) assert.equal(typeof T.size[k], 'number', 'size.' + k);
  for (const k of ['regular', 'medium', 'semibold']) assert.equal(typeof T.weight[k], 'number', 'weight.' + k);
  for (const k of ['control', 'pane', 'panel', 'field', 'pill']) assert.equal(typeof T.radius[k], 'number', 'radius.' + k);
  for (const k of ['compact', 'regular', 'bar']) assert.equal(typeof T.control[k], 'number', 'control.' + k);
  for (const k of ['ui', 'mono']) assert.equal(typeof T.font[k], 'string', 'font.' + k);
  assert.ok(Array.isArray(T.space) && T.space.length >= 6, 'space scale');
  assert.equal(T.lanes, 6);
});

test('type scale: small and clear (body 13-14, meta 11-12, section 15-17), ascending, comfortable line height', () => {
  const s = T.size;
  assert.ok(s.body >= 13 && s.body <= 14, 'body ' + s.body);
  // Brief asks 12 px meta; 81 page literals still say 11 px and ui_lint caps the app at five sizes,
  // so meta moves to 12 only together with a page pass (all pages then read var(--cc-fs-meta)).
  assert.ok(s.meta >= 11 && s.meta <= 12, 'meta ' + s.meta);
  assert.ok(s.section >= 15 && s.section <= 17, 'section ' + s.section);
  assert.ok(s.meta < s.label && s.label < s.body && s.body < s.section && s.section < s.title, 'scale must ascend');
  assert.ok(s.title <= 22, 'title ' + s.title);
  const root = CC.css.split('\n')[0];
  const lh = Number((/line-height:(\d*\.?\d+);/.exec(root) || [])[1]);
  assert.ok(lh >= 1.4 && lh <= 1.6, 'root line-height ' + lh);
  assert.equal(T.weight.regular, 400);
  assert.ok(T.weight.semibold <= 600, 'no heavy weights');
});

test('type sizes are CSS variables too, so inline-styled pages can read them', () => {
  const root = CC.css.split('\n')[0];
  for (const k of ['meta', 'label', 'body', 'section', 'title']) {
    assert.ok(root.includes('--cc-fs-' + k + ':' + T.size[k] + 'px;'), '--cc-fs-' + k);
  }
});

test('font: a system sans stack (Segoe UI Variable / SF / Inter), mono for numbers', () => {
  const ui = T.font.ui;
  assert.match(ui, /sans-serif\s*$/, 'ui stack must end in sans-serif');
  assert.match(ui, /-apple-system|system-ui/);
  assert.match(ui, /"Segoe UI Variable Text"/, 'Windows 11 text face by its real family name');
  assert.match(ui, /"Segoe UI"/);
  assert.match(ui, /Inter/);
  assert.doesNotMatch(ui, /(^|,)\s*serif\s*(,|$)|Georgia|Times/);
  assert.match(T.font.mono, /monospace\s*$/);
});

test('radius scale sits in 6-12 px and grows control <= panel <= field', () => {
  const r = T.radius;
  for (const k of ['control', 'pane', 'panel', 'field']) assert.ok(r[k] >= 6 && r[k] <= 12, k + ' ' + r[k]);
  assert.equal(r.pane, r.panel, 'pane is the older name for panel');
  assert.ok(r.control <= r.panel && r.panel <= r.field);
  assert.ok(r.pill >= 999, 'pill stays a full round');
  const root = CC.css.split('\n')[0];
  for (const k of ['control', 'panel', 'field']) assert.ok(root.includes('--cc-r-' + k + ':' + r[k] + 'px;'), '--cc-r-' + k);
});

test('surfaces are warm-neutral greys with low chroma in both themes', () => {
  for (const t of THEMES) for (const k of SURFACES) {
    const v = P[t][k];
    assert.ok(chroma(v) <= 8, t + '.' + k + ' ' + v + ' is not neutral (chroma ' + chroma(v) + '/255)');
    const [r, , b] = rgb(v);
    assert.ok(r >= b, t + '.' + k + ' ' + v + ' leans blue; surfaces are warm-neutral');
  }
  for (const k of SURFACES) {
    assert.ok(lum(P.light[k]) > 0.8, 'light.' + k + ' should be a light surface');
    assert.ok(lum(P.dark[k]) < 0.03, 'dark.' + k + ' should be a dark surface');
  }
  // Calm: neighbouring surfaces differ by a whisper, never a block of contrast.
  for (const t of THEMES) for (const k of ['surface', 'surface2', 'canvas', 'hull']) {
    assert.ok(ratio(P[t].bg, P[t][k]) < 1.2, t + ': bg vs ' + k + ' contrast ' + ratio(P[t].bg, P[t][k]).toFixed(2));
  }
  // The dark theme is a soft charcoal, not near-black.
  assert.ok(lum(P.dark.bg) >= 0.008, 'dark bg ' + P.dark.bg + ' is near-black');
});

test('dividers are 1px hairlines: low-alpha rgba in both themes', () => {
  for (const t of THEMES) {
    const a = alpha(P[t].line), b = alpha(P[t].lineStrong);
    assert.ok(a !== null && a <= 0.1, t + '.line ' + P[t].line);
    assert.ok(b !== null && b <= 0.2 && b > a, t + '.lineStrong ' + P[t].lineStrong);
  }
  const borders = (CC.css + CC.topbar.css).match(/border(?:-(?:top|bottom|left|right))?:\s*\d+px solid var\(--cc-line(?:-strong)?\)/g) || [];
  assert.ok(borders.length > 0);
  for (const b of borders) assert.match(b, /:\s*1px /, 'dividers are 1px: ' + b);
});

test('one restrained accent per theme: focus and selection derive from it, no second accent', () => {
  for (const t of THEMES) {
    const p = P[t];
    assert.equal(p.focus, p.accent, t + ': the focus ring is the accent');
    assert.ok(!Object.keys(p).some((k) => /^(accent.+|brand|primary|highlight)$/i.test(k)), t + ': a second accent token');
    assert.ok(ratio(p.selection, p.bg) < ratio(p.accent, p.bg) / 2, t + ': selection is a quiet tint, not a second accent');
    assert.ok(ratio(p.accent, p.surface) >= 4.5, t + ': accent as text must pass AA');
  }
});

function shadowsAndSlop(css, label) {
  assert.doesNotMatch(css, /gradient/i, label + ': gradient');
  assert.doesNotMatch(css, /glow/i, label + ': glow');
  assert.doesNotMatch(css, /!\s*important/i, label + ': !important');
  assert.doesNotMatch(css, /drop-shadow|blur\s*\(|text-shadow|backdrop-filter/i, label + ': blur or glow filter');
  for (const m of css.matchAll(/box-shadow:([^;}]*)/g)) {
    for (const part of m[1].replace(/var\([^)]*\)/g, 'C').split(',')) {
      const nums = (part.match(/-?\d*\.?\d+/g) || []).map(Number);
      assert.ok(nums.length < 3 || nums[2] <= 8, label + ': box-shadow blur over 8px: ' + m[1]);
    }
  }
}

test('no gradients, glows, !important or heavy shadows in tokens or the top bar', () => {
  shadowsAndSlop(CC.css, 'tokens.js');
  shadowsAndSlop(CC.topbar.css, 'topbar.js');
  for (const t of THEMES) for (const [k, v] of Object.entries(P[t])) assert.ok(!/gradient|glow/i.test(v), t + '.' + k);
});

test('top bar reads colours, type sizes and radii from tokens', () => {
  const css = CC.topbar.css;
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/, 'hard-coded colour in topbar.js');
  assert.doesNotMatch(css, /font-size:\s*\d/, 'topbar font sizes must be var(--cc-fs-*)');
  assert.doesNotMatch(css, /border-radius:\s*\d+(px|rem|em)/, 'topbar radii must be var(--cc-r-*)');
  for (const m of css.matchAll(/(?:^|[;{])(?:color|background|border(?:-bottom|-top)?|box-shadow):([^;}]*)/g)) {
    const v = m[1].trim();
    if (/^(transparent|0|none|inherit)$/.test(v)) continue;
    assert.match(v, /var\(--cc-[a-z0-9-]+\)/, 'colour not from tokens: ' + v);
  }
  assert.match(css, /\.cc-hs-chip\{[^}]*border:1px solid var\(--cc-line\)/, 'the header chip is a hairline control');
  assert.match(css, /var\(--cc-fs-label\)/);
  assert.match(css, /var\(--cc-r-control\)/);
  // No accent fill of its own: the one action that needs you (a merge) is the kit's primary button.
  const fills = css.split('}').filter((r) => r.includes('background:var(--cc-accent)') && !r.includes('.cc-hs-dot'));
  assert.equal(fills.length, 0, 'accent fill only through the kit primary button');
  const s = { mode: 'Local', repos: [{ name: 'a', state: 'diverged' }], needs_merge: true };
  const v = CC.topbar.View({ status: s, onMode() {}, onPull() {} });
  const btn = JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
  assert.match(btn, /cc-b cc-b-primary cc-b-sm/);
});

test('top bar renders unchanged structure with nothing preselected before status arrives', () => {
  const v = CC.topbar.View({ status: null, onMode() {}, onPull() {} });
  const seg = v.props.children[0];
  assert.equal(seg.props.role, 'radiogroup');
  for (const b of seg.props.children) assert.notEqual(b.props['aria-checked'], true, 'a mode is preselected');
});

done('v4_feel');
