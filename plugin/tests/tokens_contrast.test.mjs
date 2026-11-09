// tokens_contrast.test.mjs [K3] - every text/background token pair in tokens.js meets WCAG 2.x AA in
// both themes: 4.5:1 for body and small text (all our text is 11-17 px, so everything counts as body),
// 3:1 for UI components and graphical marks (status dots, focus rings, outlines, lane marks).
// Divider lines (line, lineStrong) are decorative separators and are not tested.
import assert from 'node:assert/strict';
import { loadCC, test, done } from './harness.mjs';

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const h = String(hex).replace('#', '');
  assert.match(h, /^[0-9a-fA-F]{6}$/, 'expected #rrggbb, got ' + hex);
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const CC = loadCC(['tokens.js']);
const palette = CC.tokens.color;
const THEMES = ['light', 'dark'];

const BODY = 4.5;
const UI = 3;
// Backgrounds that text and marks sit on. `hull` (star-view cluster wash) only carries cluster
// labels (text/text2) and node marks.
const SURFACES = ['bg', 'surface', 'surface2', 'canvas'];
// Foreground tokens used as text colour somewhere in plugin/src (accent = links and tags; status
// tokens colour short state words such as "failed" or "done").
const TEXT = ['text', 'text2', 'text3', 'accent', 'done', 'running', 'error', 'neutral'];
// Graphical marks and component boundaries (3:1).
const MARKS = ['accent', 'done', 'ready', 'running', 'error', 'neutral', 'lane0', 'lane1', 'lane2', 'lane3', 'lane4', 'lane5'];
// Filled backgrounds that carry onStatus labels or glyphs (primary buttons, done check, error "!").
const FILLS = ['accent', 'done', 'running', 'error'];

function pairs() {
  const out = [];
  for (const theme of THEMES) {
    const p = palette[theme];
    for (const fg of TEXT) for (const bg of SURFACES) out.push({ theme, fg, bg, min: BODY, p });
    for (const fg of ['text', 'text2']) out.push({ theme, fg, bg: 'hull', min: BODY, p });
    for (const bg of FILLS) out.push({ theme, fg: 'onStatus', bg, min: BODY, p });
    out.push({ theme, fg: 'text', bg: 'selection', min: BODY, p });
    for (const fg of MARKS) for (const bg of SURFACES.concat('hull')) out.push({ theme, fg, bg, min: UI, p });
  }
  return out;
}

test('both themes define every token the contrast table needs', () => {
  for (const theme of THEMES) {
    for (const k of new Set(TEXT.concat(MARKS, FILLS, SURFACES, ['hull', 'onStatus', 'selection']))) {
      assert.ok(palette[theme] && typeof palette[theme][k] === 'string', theme + '.' + k + ' is missing');
    }
  }
});

test('every text-on-surface and mark-on-surface pair meets WCAG AA in both themes', () => {
  const misses = [];
  let n = 0;
  for (const { theme, fg, bg, min, p } of pairs()) {
    n++;
    const r = contrast(p[fg], p[bg]);
    if (r < min) misses.push(theme + ': ' + fg + ' ' + p[fg] + ' on ' + bg + ' ' + p[bg] + ' = ' + r.toFixed(2) + ' < ' + min);
  }
  assert.ok(n > 100, 'expected a full pair table, got ' + n);
  assert.deepEqual(misses, []);
});

test('the injected stylesheet carries each theme\'s own status values', () => {
  const css = CC.css;
  const dark = css.split('\n').find((l) => l.startsWith('@media (prefers-color-scheme: dark)'));
  assert.ok(dark, 'dark media block missing');
  for (const k of ['done', 'ready', 'running', 'error', 'neutral', 'accent', 'text3']) {
    const v = k === 'text3' ? '--cc-text-3' : '--cc-' + k;
    assert.ok(dark.includes(v), 'dark block lacks ' + v);
    assert.ok(dark.includes(palette.dark[k]), 'dark block lacks value ' + palette.dark[k] + ' for ' + k);
    assert.ok(css.split('\n')[0].includes(palette.light[k]), 'root block lacks light value for ' + k);
  }
});

done('tokens_contrast');
