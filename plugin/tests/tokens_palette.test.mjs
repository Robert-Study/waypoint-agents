// tokens_palette.test.mjs [U2] - the Waypoint palette: the accent is the logo's green family (pine
// #0B3B2E / mint #34D399) in both themes, status colours keep their meaning (done green, ready a
// quieter green outline, running blue with a pulse, error red, not started neutral) and stay clearly
// apart from each other and from the accent; no gradients, glows or !important; five type sizes.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, test, done } from './harness.mjs';

// ---- colour maths (sRGB -> CIELAB, CIEDE2000, HSV hue/saturation) ----------------------------
const rgb = (hex) => {
  const h = String(hex).replace('#', '');
  assert.match(h, /^[0-9a-fA-F]{6}$/, 'expected #rrggbb, got ' + hex);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function lab(hex) {
  const [r, g, b] = rgb(hex).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function deltaE(a, b) { // CIEDE2000 (Sharma, Wu & Dalal 2005)
  const [L1, a1, b1] = lab(a), [L2, a2, b2] = lab(b);
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (x, y) => { if (x === 0 && y === 0) return 0; const h = Math.atan2(y, x) / rad; return h < 0 ? h + 360 : h; };
  const h1 = hp(ap1, b1), h2 = hp(ap2, b2);
  let dh = 0;
  if (Cp1 * Cp2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dL = L2 - L1, dC = Cp2 - Cp1, dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * rad / 2);
  const Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb = h1 + h2;
  if (Cp1 * Cp2 !== 0) hb = Math.abs(h1 - h2) > 180 ? (h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2) : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const RC = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const RT = -Math.sin(2 * 30 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad) * RC;
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cpb, SH = 1 + 0.015 * Cpb * T;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
function hue(hex) {
  const [r, g, b] = rgb(hex);
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (!d) return 0;
  const x = 60 * (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return x < 0 ? x + 360 : x;
}
function sat(hex) { const [r, g, b] = rgb(hex); const mx = Math.max(r, g, b); return mx ? (mx - Math.min(r, g, b)) / mx : 0; }
const inHue = (hex, lo, hi) => { const x = hue(hex); return lo <= hi ? x >= lo && x <= hi : x >= lo || x <= hi; };

// ---- fixtures ---------------------------------------------------------------------------------
const CC = loadCC(['tokens.js']);
const palette = CC.tokens.color;
const THEMES = ['light', 'dark'];
const BRAND = { pine: '#0b3b2e', mint: '#34d399' };
const OLD_BLUES = ['#2f6bff', '#7aa2ff'];
const STATUS = ['done', 'ready', 'running', 'error', 'neutral'];
// Minimum CIEDE2000 distances. ~2 is a just-noticeable difference; 10+ reads as a different colour
// at a glance on a 10 px dot. The accent/done pair gets the strictest bar because both are green.
const MIN_PAIR = 10;
const MIN_ACCENT_DONE = 12;

test('the accent is the Waypoint green family in both themes, not the old blue', () => {
  for (const t of THEMES) {
    const a = palette[t].accent;
    assert.ok(!OLD_BLUES.includes(a.toLowerCase()), t + ' accent is still the old blue ' + a);
    // Logo hues: pine 163 deg, mint 158 deg. Allow a teal/mint lean, never a blue or a yellow-green.
    assert.ok(inHue(a, 150, 180), t + ' accent ' + a + ' hue ' + hue(a).toFixed(0) + ' is outside the Waypoint green band 150-180');
    assert.ok(sat(a) >= 0.5, t + ' accent ' + a + ' is too grey to read as the brand green');
  }
  // Light theme uses the deep (pine-leaning) end, dark theme the bright (mint-leaning) end.
  assert.ok(deltaE(palette.light.accent, BRAND.pine) < deltaE(palette.light.accent, BRAND.mint),'light accent should lean toward pine');
  assert.ok(deltaE(palette.dark.accent, BRAND.mint) < deltaE(palette.dark.accent, BRAND.pine), 'dark accent should lean toward mint');
});

test('status colours keep their meaning in both themes', () => {
  for (const t of THEMES) {
    const p = palette[t];
    assert.ok(inHue(p.done, 115, 145), t + ' done ' + p.done + ' is not a clear status green');
    assert.ok(inHue(p.ready, 110, 145), t + ' ready ' + p.ready + ' is not green');
    assert.ok(inHue(p.running, 200, 225), t + ' running ' + p.running + ' is not blue');
    assert.ok(inHue(p.error, 345, 15), t + ' error ' + p.error + ' is not red');
    assert.ok(sat(p.neutral) < 0.2, t + ' not started ' + p.neutral + ' is not neutral');
  }
});

test('accent and status colours are pairwise distinct (CIEDE2000) in each theme', () => {
  const misses = [];
  for (const t of THEMES) {
    const p = palette[t];
    const keys = ['accent'].concat(STATUS);
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const min = keys[i] === 'accent' && keys[j] === 'done' ? MIN_ACCENT_DONE : MIN_PAIR;
        const d = deltaE(p[keys[i]], p[keys[j]]);
        if (d < min) misses.push(t + ': ' + keys[i] + ' ' + p[keys[i]] + ' vs ' + keys[j] + ' ' + p[keys[j]] + ' dE=' + d.toFixed(1) + ' < ' + min);
      }
    }
  }
  assert.deepEqual(misses, []);
});

test('primary buttons, focus rings, selection, links and checkboxes use the accent', () => {
  const css = CC.css;
  assert.match(css, /:focus-visible\{outline:2px solid var\(--cc-accent\)/);
  assert.match(css, /\.cc-likert-opt\[aria-checked="true"\]\{background:var\(--cc-accent\)/);
  assert.match(css, /accent-color:var\(--cc-accent\)/);
  assert.match(css, /::selection\{background:var\(--cc-selection\)/);
  assert.match(css, /:where\(\.cc-root a\)\{color:var\(--cc-accent\)/);
  for (const t of THEMES) {
    const s = palette[t].selection;
    assert.ok(inHue(s, 150, 180), t + ' selection ' + s + ' should be an accent tint');
  }
});

test('StatusDot: done solid, ready its own outline, running pulses blue', () => {
  const dot = (status) => findAll(render(CC.StatusDot({ status })), (n) => n.type === 'circle').map((n) => n.props.className);
  assert.deepEqual(dot('done'), ['cc-f-done']);
  assert.deepEqual(dot('ready'), ['cc-s-ready']);
  assert.ok(dot('running').some((c) => c.includes('cc-s-running') && c.includes('cc-pulse')));
  assert.match(CC.css, /\.cc-s-ready\{stroke:var\(--cc-ready\);fill:none;stroke-width:1\.5;\}/);
  assert.match(CC.css, /@keyframes cc-pulse/);
});

test('no gradients, glows or !important; five type sizes unchanged', () => {
  const css = CC.css;
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.doesNotMatch(css, /!\s*important/i);
  assert.doesNotMatch(css, /drop-shadow|blur\s*\(|text-shadow/i);
  for (const m of css.matchAll(/box-shadow:([^;}]*)/g)) {
    const nums = (m[1].replace(/var\([^)]*\)/g, '').match(/-?\d*\.?\d+/g) || []).map(Number);
    assert.ok(nums.length < 3 || nums[2] === 0, 'box-shadow with blur: ' + m[1]);
  }
  for (const t of THEMES) for (const [k, v] of Object.entries(palette[t])) {
    assert.ok(!/gradient/i.test(v), t + '.' + k + ' is a gradient');
  }
  assert.deepEqual(JSON.parse(JSON.stringify(CC.tokens.size)), { meta: 11, label: 12, body: 14, section: 17, title: 22 });
});

done('tokens_palette');
