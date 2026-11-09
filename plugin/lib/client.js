window.__ModuleLoader__.load({
	id: "@waypoint/dsh-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		try {
		var React = require("react");
		var CC = { React: React, h: React.createElement, version: "2.0.0" };
		// ── tokens.js
// tokens.js [views, C1] - design tokens, scoped stylesheet and shared view primitives.
// Raw colour values live ONLY in this file (scripts/ui_lint.py enforces it).
(function (CC) {
  'use strict';

  // Waypoint palette (U2). Accent = the logo's greens: deep pine-teal on light, mint on dark.
  // Status keeps the owner's meanings (done green, ready green outline, running blue pulse, error red,
  // not started neutral) with per-theme values so each passes WCAG AA as text and as a mark
  // (tests/tokens_contrast.test.mjs). Done is a yellower status green and the accent leans teal, so
  // the two never read as one colour (CIEDE2000 >= 12, tests/tokens_palette.test.mjs). Ready is a
  // quieter green than done (lighter on light, deeper on dark) and is only ever drawn as an outline.
  // v4 F1 feel (Claude desktop / Antigravity): warm-neutral, low-chroma greys with whisper-quiet
  // steps between surfaces, 1px low-alpha hairlines, and the Waypoint green as the one restrained
  // accent. The dark theme is a soft charcoal rather than near-black (tests/v4_feel.test.mjs).
  const palette = {
    light: {
      bg: '#faf9f7', surface: '#ffffff', surface2: '#f3f2ef', canvas: '#f5f4f1',
      line: 'rgba(31,30,27,.08)', lineStrong: 'rgba(31,30,27,.15)',
      text: '#1c1b19', text2: '#55534e', text3: '#65635d',
      accent: '#0e7360', selection: '#d3ede3', onStatus: '#ffffff', hull: '#ecebe7',
      done: '#16702f', ready: '#2e9645', running: '#0969da', error: '#cf222e', neutral: '#6c6a65',
      lane0: '#a0784c', lane1: '#5a6fb0', lane2: '#a45f8c', lane3: '#3f8f83', lane4: '#8f8a3a', lane5: '#6e6c67',
      // U8 shell: overlay scrim, scrollbar thumb, hover wash and the focus ring (never a glow).
      scrim: 'rgba(31,30,27,.16)', thumb: 'rgba(31,30,27,.16)', thumbHover: 'rgba(31,30,27,.30)', wash: 'rgba(31,30,27,.04)',
      focus: '#0e7360'
    },
    dark: {
      bg: '#1b1b19', surface: '#222220', surface2: '#2a2a27', canvas: '#171715', hull: '#252523',
      line: 'rgba(255,255,255,.07)', lineStrong: 'rgba(255,255,255,.15)',
      text: '#ecebe7', text2: '#b4b2ab', text3: '#9e9c95',
      accent: '#5cd9b6', selection: '#1e3e35', onStatus: '#171715',
      done: '#34c759', ready: '#2a9d48', running: '#4c9fff', error: '#ff5c52', neutral: '#9b9994',
      lane0: '#c9a074', lane1: '#8e9bd1', lane2: '#c78bb0', lane3: '#6fb5a8', lane4: '#b8ad62', lane5: '#a09e98',
      scrim: 'rgba(0,0,0,.44)', thumb: 'rgba(255,255,255,.14)', thumbHover: 'rgba(255,255,255,.26)', wash: 'rgba(255,255,255,.04)',
      focus: '#5cd9b6'
    }
  };

  const tokens = {
    font: {
      ui: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, Inter, Roboto, "Helvetica Neue", sans-serif',
      mono: '"SF Mono", "JetBrains Mono", "Cascadia Mono", Consolas, monospace'
    },
    // Five sizes (ui_lint caps the app at five; page files still write 11/12/14/17/22 literally).
    size: { meta: 11, label: 12, body: 14, section: 17, title: 22 },
    weight: { regular: 400, medium: 500, semibold: 600 },
    space: [4, 8, 12, 16, 24, 32],
    // 6 controls / 8 panels / 8 fields (v4 6-12 px range; release design pass keeps corners tight). `pane` stays as the older name for `panel`.
    radius: { control: 6, pane: 8, panel: 8, field: 8, pill: 999 },
    control: { compact: 28, regular: 32, bar: 44 },
    motion: { fast: 120, pane: 180, tween: 240, pulse: 1600, ease: 'cubic-bezier(.2,.8,.2,1)' },
    color: palette,
    lanes: 6
  };

  const kebab = (k) => k.replace(/([A-Z0-9]+)/g, (m) => '-' + m.toLowerCase());
  // Follow dsh's own theme tokens when the host provides them; our values are fallbacks.
  const DSW = {
    bg: 'alias-bg-base', canvas: 'alias-bg-base', surface: 'alias-bg-layer-1', surface2: 'alias-interactive-bg-hover',
    text: 'alias-label-primary', text2: 'alias-label-secondary', text3: 'alias-label-tertiary',
    line: 'alias-border-l1', lineStrong: 'alias-border-l2'
  };
  const vars = (obj) => Object.keys(obj).map((k) => '--cc-' + kebab(k) + ':' +
    (DSW[k] ? 'var(--dsw-' + DSW[k] + ',' + obj[k] + ')' : obj[k]) + ';').join('');

  const S = tokens.size;
  const M = tokens.motion;
  const R = tokens.radius;
  // Review 2 (55): one content rule for every page's form or list column: left-aligned, at most
  // 960 px, 24 px gutters. Page files keep their own vertical padding; this rule's doubled .cc-root
  // outranks their single-class column rules wherever the files load.
  const CONTENT_MAX = 960;
  const CONTENT_COLS = '.cc-set-body,.cc-td-col,.cc-pl-col,.cc-iv-wrap,.cc-ap-sec';
  // Shape, spacing and type sizes as CSS variables too, so a page styled inline can say
  // var(--cc-r-control) or var(--cc-fs-meta) instead of a literal.
  const shape = '--cc-r-control:' + R.control + 'px;--cc-r-panel:' + R.panel + 'px;--cc-r-field:' + R.field + 'px;' +
    Object.keys(S).map((k) => '--cc-fs-' + k + ':' + S[k] + 'px;').join('') +
    tokens.space.map((v, i) => '--cc-space-' + (i + 1) + ':' + v + 'px;').join('') +
    '--cc-ease:' + M.ease + ';--cc-fast:' + M.fast + 'ms;--cc-content-max:' + CONTENT_MAX + 'px;';
  // The brand mark takes the accent green (sidebar and blank-session hero sit outside .cc-root).
  const markSel = 'svg[data-cc-brand="mark"]';
  const newSel = 'button[class*="_newSession"]';
  const newDark = 'background:transparent;border:1px solid ' + palette.dark.lineStrong + ';';
  const css = [
    '.cc-root{' + vars(palette.light) + shape + 'color-scheme:light;' +
      '--cc-mono:' + tokens.font.mono + ';font-family:var(--dsw-font-family,' + tokens.font.ui + ');font-size:' + S.body + 'px;line-height:1.5;color:var(--cc-text);' +
      'background:var(--cc-bg);-webkit-font-smoothing:antialiased;scrollbar-color:var(--cc-thumb) transparent;}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]){' + vars(palette.dark) + 'color-scheme:dark;}}',
    '.cc-root[data-theme="dark"],html[data-theme="dark"] .cc-root,body.dark .cc-root,body.theme-dark .cc-root{' + vars(palette.dark) + 'color-scheme:dark;}',
    'html[data-theme="light"] .cc-root,body.light .cc-root,body.theme-light .cc-root{' + vars(palette.light) + 'color-scheme:light;}',
    markSel + '{color:' + palette.light.accent + ';}',
    '@media (prefers-color-scheme: dark){html:not([data-theme="light"]) ' + markSel + '{color:' + palette.dark.accent + ';}}',
    'html[data-theme="dark"] ' + markSel + ',body.dark ' + markSel + ',body.theme-dark ' + markSel + '{color:' + palette.dark.accent + ';}',
    // dsh's New Session button is a heavy filled grey in dark; quiet it to an outline as in light
    // (it sits outside .cc-root, so the dark palette values are written out).
    '@media (prefers-color-scheme: dark){html:not([data-theme="light"]) ' + newSel + '{' + newDark + '}html:not([data-theme="light"]) ' + newSel + ':hover{background:' + palette.dark.wash + ';}}',
    'html[data-theme="dark"] ' + newSel + ',body.dark ' + newSel + '{' + newDark + '}html[data-theme="dark"] ' + newSel + ':hover,body.dark ' + newSel + ':hover{background:' + palette.dark.wash + ';}',
    '.cc-root *,.cc-root *::before,.cc-root *::after{box-sizing:border-box;}',
    // Older page columns only: inside the kit's page column (ui.js .cc-pb-col, which already caps the
    // width and has the 16 px gutter) the rule steps aside so nothing is indented twice.
    '.cc-root.cc-root :is(' + CONTENT_COLS + '):not(.cc-pb-col *){width:100%;max-width:var(--cc-content-max);margin-left:0;margin-right:auto;' +
      'padding-left:24px;padding-right:24px;}',
    // Review 2 (54): dsh's own mode menu descriptions (Standard, PTC, Minimal, Creator) are dsh's
    // built-in copy and wrap to 3-4 lines; every menu item description is held to one line, cut off
    // with an ellipsis (dsh's menus sit outside .cc-root, so this rule is unscoped).
    '[role="menu"] [class*="_itemDesc"]{display:block;max-width:22rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    // Scrollbars: thin, quiet thumb on a clear track, in every Waypoint scroller (the page frame too).
    '[data-cc-frame],[data-cc-frame] *,.cc-root *{scrollbar-width:thin;}',
    '[data-cc-frame]{scrollbar-color:color-mix(in srgb,currentColor 22%,transparent) transparent;}',
    // Keyboard focus: one accent ring everywhere, zero specificity so a page's own ring still wins;
    // mouse focus never draws it.
    ':where(.cc-root) :where(button,a,input,select,textarea,[tabindex],[role="switch"],[role="radio"]):focus-visible' +
      '{outline:2px solid var(--cc-focus);outline-offset:2px;}',
    ':where(.cc-root) :where(button,[role="switch"],[role="radio"]):focus:not(:focus-visible){outline:none;}',
    ':where(.cc-root) :where(button,input,select,textarea){font-family:inherit;}',
    ':where(.cc-root) ::placeholder{color:var(--cc-text-3);opacity:1;}',
    ':where(.cc-root) kbd{font-family:inherit;font-size:' + S.meta + 'px;line-height:16px;min-width:18px;padding:0 4px;display:inline-block;text-align:center;' +
      'border:1px solid var(--cc-line-strong);border-bottom-width:2px;border-radius:4px;color:var(--cc-text-2);background:var(--cc-surface);}',
    // Zero-specificity base for links so any page's own link class still wins.
    ':where(.cc-root a){color:var(--cc-accent);text-decoration-color:var(--cc-line-strong);text-underline-offset:2px;}',
    '.cc-root ::selection{background:var(--cc-selection);color:var(--cc-text);}',
    '.cc-root .cc-num{font-family:' + tokens.font.mono + ';font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-meta{font-size:' + S.meta + 'px;color:var(--cc-text-3);}',
    '.cc-root .cc-section{font-size:' + S.section + 'px;font-weight:600;line-height:1.25;}',
    '.cc-root .cc-title{font-size:' + S.title + 'px;font-weight:600;line-height:1.25;}',
    // Calm placeholder app.js shows while a page file is not loaded yet.
    '.cc-root.cc-fallback{padding:24px;}',
    '.cc-root .cc-empty-title{font-size:' + S.section + 'px;font-weight:600;line-height:1.25;}',
    '.cc-root .cc-empty-body{margin-top:4px;font-size:' + S.label + 'px;color:var(--cc-text-3);}',
    // Graph canvas (flow + star)
    '.cc-root .cc-graph{position:relative;width:100%;height:100%;min-height:240px;overflow:hidden;background:var(--cc-canvas);' +
      'border-radius:' + tokens.radius.pane + 'px;cursor:grab;touch-action:none;user-select:none;outline:none;}',
    '.cc-root .cc-graph.cc-dragging{cursor:grabbing;}',
    '.cc-root .cc-graph:focus-visible{outline:2px solid var(--cc-accent);outline-offset:-2px;}',
    '.cc-root .cc-graph svg{display:block;width:100%;height:100%;}',
    '.cc-root .cc-node{cursor:pointer;transition:opacity ' + M.pane + 'ms ' + M.ease + ';}',
    '.cc-root .cc-hit{fill:transparent;stroke:none;}',
    '.cc-root .cc-node:hover .cc-hit{fill:var(--cc-surface-2);}',
    '.cc-root .cc-node.cc-sel .cc-hit{fill:var(--cc-surface);stroke:var(--cc-accent);stroke-width:1;}',
    '.cc-root .cc-t-label{font-size:' + S.label + 'px;fill:var(--cc-text);font-weight:500;}',
    '.cc-root .cc-t-meta{font-size:' + S.meta + 'px;fill:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-t-cluster{font-size:' + S.meta + 'px;fill:var(--cc-text-2);font-weight:600;letter-spacing:.02em;}',
    '.cc-root .cc-edge{fill:none;stroke:var(--cc-line-strong);stroke-width:1;transition:opacity ' + M.pane + 'ms;}',
    '.cc-root .cc-edge.cc-edge-sel{stroke:var(--cc-accent);}',
    '.cc-root .cc-arrow{fill:var(--cc-line-strong);}',
    '.cc-root .cc-arrow-sel{fill:var(--cc-accent);}',
    '.cc-root .cc-link{stroke:var(--cc-line-strong);stroke-width:1;opacity:.6;}',
    '.cc-root .cc-hulls{opacity:.8;}',
    '.cc-root .cc-hull{fill:var(--cc-hull);stroke:var(--cc-hull);stroke-linejoin:round;stroke-linecap:round;}',
    // C10 check counts: a quiet pass count, a red count when the last run failed, and a dashed
    // red outline on dependants a failing check blocks (selection outline still wins).
    '.cc-root .cc-check-pass{fill:var(--cc-text-3);}',
    '.cc-root .cc-check-fail{fill:var(--cc-error);font-weight:600;}',
    '.cc-root .cc-node.cc-blocked:not(.cc-sel) .cc-hit{stroke:var(--cc-error);stroke-width:1;stroke-dasharray:3 2;}',
    '.cc-root .cc-node.cc-blocked .cc-t-label{fill:var(--cc-text-2);}',
    '.cc-root .cc-edge.cc-edge-blocked{stroke:var(--cc-error);stroke-dasharray:3 2;}',
    '.cc-root .cc-faded{opacity:.14;}',
    '.cc-root .cc-hidden{display:none;}',
    // Status marks (shape + size + colour redundancy)
    '.cc-root .cc-f-done{fill:var(--cc-done);}',
    '.cc-root .cc-s-done{stroke:var(--cc-done);fill:none;stroke-width:1.5;}',
    '.cc-root .cc-s-ready{stroke:var(--cc-ready);fill:none;stroke-width:1.5;}',
    '.cc-root .cc-f-running{fill:var(--cc-running);}',
    '.cc-root .cc-s-running{stroke:var(--cc-running);fill:none;stroke-width:1.5;}',
    '.cc-root .cc-f-error{fill:var(--cc-error);}',
    '.cc-root .cc-s-neutral{stroke:var(--cc-neutral);fill:none;stroke-width:1.2;}',
    '.cc-root .cc-f-neutral{fill:var(--cc-neutral);}',
    '.cc-root .cc-f-accent{fill:var(--cc-accent);}',
    '.cc-root .cc-s-accent{stroke:var(--cc-accent);fill:none;stroke-width:1.5;}',
    '.cc-root .cc-glyph{stroke:var(--cc-on-status);stroke-width:1.4;fill:none;stroke-linecap:round;stroke-linejoin:round;}',
    '.cc-root .cc-glyph-dot{fill:var(--cc-on-status);}',
    '.cc-root .cc-f-text{fill:var(--cc-text-2);}',
    '.cc-root .cc-glyph-text{fill:var(--cc-neutral);font-size:' + S.label + 'px;font-weight:600;}',
    '.cc-root .cc-node.cc-st-skipped .cc-t-label,.cc-root .cc-node.cc-st-carried .cc-t-label{fill:var(--cc-text-3);}',
    // kebab() turns lane0 into --cc-lane-0, so the lane rules must read that name.
    [0, 1, 2, 3, 4, 5].map((i) => '.cc-root .cc-f-lane' + i + '{fill:var(--cc-lane-' + i + ');}.cc-root .cc-s-lane' + i +
      '{stroke:var(--cc-lane-' + i + ');fill:none;stroke-width:1.5;}').join(''),
    '.cc-root .cc-pulse{animation:cc-pulse ' + M.pulse + 'ms ease-in-out infinite;}',
    '@keyframes cc-pulse{0%,100%{opacity:1}50%{opacity:.2}}',
    // Wave list
    '.cc-root .cc-waves{position:relative;height:100%;overflow:auto;padding:4px 0;}',
    '.cc-root .cc-wave{padding:4px 0 8px;}',
    '.cc-root .cc-wave-h{display:flex;align-items:baseline;gap:8px;padding:8px 12px 4px;font-size:' + S.label + 'px;font-weight:600;color:var(--cc-text-2);}',
    '.cc-root .cc-wave-cur .cc-wave-h{color:var(--cc-text);}',
    '.cc-root .cc-wave-tag{font-size:' + S.meta + 'px;font-weight:500;color:var(--cc-accent);}',
    '.cc-root .cc-rows{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-row{display:flex;align-items:center;gap:8px;width:100%;height:32px;padding:0 12px;border:0;background:transparent;' +
      'color:inherit;font:inherit;font-size:' + S.label + 'px;text-align:left;cursor:pointer;border-radius:' + tokens.radius.control + 'px;' +
      'transition:background ' + M.fast + 'ms;}',
    '.cc-root .cc-row:hover{background:var(--cc-surface-2);}',
    '.cc-root .cc-row.cc-sel{background:var(--cc-surface-2);box-shadow:inset 2px 0 0 var(--cc-accent);}',
    '.cc-root .cc-row:focus-visible{outline:2px solid var(--cc-accent);outline-offset:-2px;}',
    '.cc-root .cc-row-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-row-m{font-size:' + S.meta + 'px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-dot-svg{flex:none;width:18px;height:18px;overflow:visible;}',
    // Inputs
    '.cc-root .cc-likert{display:inline-flex;flex-direction:column;gap:4px;width:max-content;max-width:100%;}',
    '.cc-root .cc-likert-row{display:flex;gap:4px;}',
    '.cc-root .cc-likert-opt{min-width:32px;height:32px;padding:0 8px;border:1px solid var(--cc-line-strong);border-radius:' +
      tokens.radius.control + 'px;background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:' + S.label +
      'px;font-variant-numeric:tabular-nums;cursor:pointer;transition:background ' + M.fast + 'ms,border-color ' + M.fast + 'ms;}',
    '.cc-root .cc-likert-opt:hover{background:var(--cc-surface-2);}',
    '.cc-root .cc-likert-opt[aria-checked="true"]{background:var(--cc-accent);border-color:var(--cc-accent);color:var(--cc-on-status);font-weight:600;}',
    '.cc-root .cc-likert-opt:focus-visible,.cc-root .cc-btn:focus-visible,.cc-root .cc-check input:focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px;}',
    '.cc-root .cc-likert-ends{display:flex;justify-content:space-between;gap:12px;font-size:' + S.meta + 'px;color:var(--cc-text-3);}',
    '.cc-root .cc-select{display:flex;flex-direction:column;gap:4px;width:max-content;max-width:100%;}',
    '.cc-root .cc-select-bar{display:flex;gap:8px;align-items:center;}',
    '.cc-root .cc-btn{height:28px;padding:0 12px;border:1px solid var(--cc-line-strong);border-radius:' + tokens.radius.control +
      'px;background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;cursor:pointer;transition:background ' + M.fast + 'ms;}',
    '.cc-root .cc-btn:hover:not(:disabled){background:var(--cc-surface-2);}',
    '.cc-root .cc-btn:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-check{display:flex;align-items:center;gap:8px;min-height:32px;padding:0 4px;font-size:' + S.label + 'px;cursor:pointer;border-radius:' + tokens.radius.control + 'px;}',
    '.cc-root .cc-check:hover{background:var(--cc-surface-2);}',
    '.cc-root .cc-check input{accent-color:var(--cc-accent);width:16px;height:16px;margin:0;}',
    '.cc-root .cc-check-hint{font-size:' + S.meta + 'px;color:var(--cc-text-3);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-pulse,.cc-root .cc-node,.cc-root .cc-edge,.cc-root .cc-row,.cc-root .cc-btn,.cc-root .cc-likert-opt{animation:none;transition:none;}}'
  ].join('\n');

  function ensureStyles(doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || !d.head) return false;
    if (d.getElementById('cc-styles')) return true;
    const el = d.createElement('style');
    el.id = 'cc-styles';
    el.textContent = css;
    d.head.appendChild(el);
    return true;
  }

  // ---- shared pure helpers ---------------------------------------------------
  const STATUS = {
    done: { label: 'Done', order: 5 },
    submitted: { label: 'Awaiting check', order: 4 },
    running: { label: 'Running', order: 1 },
    ready: { label: 'Ready', order: 2 },
    error: { label: 'Error', order: 0 },
    needs_you: { label: 'Needs you', order: 0 },
    not_started: { label: 'Not started', order: 3 },
    // Versions: an idea deliberately not pursued, and work moved to a later version. Neither is open.
    skipped: { label: 'Skipped', order: 6, glyph: '⊘' },
    carried: { label: 'Carried', order: 6, glyph: '↷' }
  };
  function statusGlyph(s) { return (STATUS[s] && STATUS[s].glyph) || ''; }
  function statusOf(node) {
    const s = node && (node.display_status || node.status);
    return STATUS[s] ? s : 'not_started';
  }
  function statusLabel(s) { return (STATUS[s] || STATUS.not_started).label; }
  function matchesFilter(node, filter) {
    if (!filter || filter === 'all') return true;
    const st = statusOf(node);
    if (filter === 'completed') return st === 'done';
    return st !== 'done' && st !== 'skipped' && st !== 'carried';
  }
  function hashString(s) {
    let x = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function laneIndex(key) { return key == null || key === '' ? 5 : hashString(key) % tokens.lanes; }
  function truncate(text, max) {
    const t = String(text == null ? '' : text);
    return t.length > max ? t.slice(0, Math.max(1, max - 1)) + '…' : t;
  }
  function prefersReducedMotion() {
    try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // ---- StatusDot: SVG mark, 10 px base. Shape differs per status, not only colour.
  // done = solid green + check; ready = quieter green outline; running = blue + pulsing ring;
  // error = red + "!"; not_started = small neutral hollow; submitted = dashed green ring;
  // needs_you = accent double ring. colorBy:'lane' recolours only the calm states.
  function StatusDot(props) {
    const h = CC.h;
    const s = props.status || 'not_started';
    const lane = props.lane == null ? null : 'lane' + props.lane;
    const cx = props.cx || 0;
    const cy = props.cy || 0;
    const k = [];
    const c = (cls, r, extra) => h('circle', Object.assign({ key: k.length + cls, className: cls, cx: cx, cy: cy, r: r }, extra || {}));
    if (s === 'done') {
      k.push(c('cc-f-' + (lane || 'done'), 5));
      k.push(h('path', { key: 'g', className: 'cc-glyph', d: 'M' + (cx - 2.3) + ' ' + cy + 'l1.6 1.6l3-3.1' }));
    } else if (s === 'ready') {
      k.push(c('cc-s-' + (lane || 'ready'), 4.25));
    } else if (s === 'submitted') {
      k.push(c('cc-s-' + (lane || 'done'), 4.25, { strokeDasharray: '2.2 1.6' }));
      k.push(c('cc-f-' + (lane || 'done'), 1.6));
    } else if (s === 'running') {
      k.push(c('cc-s-running cc-pulse', 7.5));
      k.push(c('cc-f-running', 5));
    } else if (s === 'error') {
      k.push(c('cc-f-error', 5));
      k.push(h('path', { key: 'g', className: 'cc-glyph', d: 'M' + cx + ' ' + (cy - 2.6) + 'v2.9' }));
      k.push(c('cc-glyph-dot', 0.85, { cy: cy + 2.3 }));
    } else if (s === 'needs_you') {
      k.push(c('cc-s-accent', 7.5));
      k.push(c('cc-f-accent', 3.25));
    } else if (s === 'skipped' || s === 'carried') {
      k.push(h('text', { key: 'g', className: 'cc-glyph-text', x: cx, y: cy, textAnchor: 'middle', dominantBaseline: 'central' }, statusGlyph(s)));
    } else if (s === 'plain') {
      k.push(c('cc-f-text', props.r || 3.5, { opacity: props.opacity == null ? 1 : props.opacity }));
    } else {
      k.push(c(lane ? 'cc-s-' + lane : 'cc-s-neutral', 3.5));
    }
    return h('g', { className: 'cc-dot', 'aria-hidden': 'true' }, k);
  }

  // ---- useCamera: pan/zoom kept in a ref; fits on first content, on F, and on resize until the user moves it.
  const cameraStore = {};
  // opts.minFit: smallest zoom an automatic fit may use (keeps 12 px labels legible);
  // when the graph is wider than that, the fit anchors to its left edge. Key 0 fits everything.
  function useCamera(bounds, cameraKey, opts) {
    const minFit = opts && opts.minFit ? opts.minFit : 0.1;
    const React = CC.React;
    const ref = React.useRef(null);
    const cam = React.useRef(cameraKey && cameraStore[cameraKey] ? cameraStore[cameraKey] : null);
    const drag = React.useRef(null);
    const moved = React.useRef(false);
    const boundsRef = React.useRef(bounds);
    boundsRef.current = bounds;
    const tick = React.useState(0);
    const redraw = () => tick[1]((t) => t + 1);
    const store = () => { if (cameraKey) cameraStore[cameraKey] = cam.current; };

    function size() {
      const el = ref.current;
      if (el && el.getBoundingClientRect) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return { w: r.width, h: r.height };
      }
      return { w: 800, h: 480 };
    }
    function fit(all) {
      const b = boundsRef.current;
      const v = size();
      const bw = Math.max(1, b.w), bh = Math.max(1, b.h), pad = 24;
      const whole = Math.min(1, (v.w - 2 * pad) / bw, (v.h - 2 * pad) / bh);
      const k = Math.max(all ? 0.1 : minFit, whole);
      const x = bw * k <= v.w - 2 * pad ? (v.w - bw * k) / 2 - (b.x || 0) * k : pad - (b.x || 0) * k;
      const y = bh * k <= v.h - 2 * pad ? (v.h - bh * k) / 2 - (b.y || 0) * k : pad - (b.y || 0) * k;
      cam.current = { k: k, x: x, y: y, auto: true };
      store();
      redraw();
    }
    function zoomAt(factor, mx, my) {
      const c = cam.current || { x: 0, y: 0, k: 1 };
      const k = Math.max(0.1, Math.min(4, c.k * factor));
      const f = k / c.k;
      cam.current = { k: k, x: mx - (mx - c.x) * f, y: my - (my - c.y) * f, auto: false };
      store();
      redraw();
    }
    // Fit on first content. While the camera is still the automatic fit (the owner has not
    // panned or zoomed), follow container resizes and graph growth. Filter changes never
    // change bounds, so they never move the camera.
    React.useEffect(() => {
      if (bounds.w > 0 && (!cam.current || cam.current.auto)) fit();
    }, [Math.round(bounds.w), Math.round(bounds.h)]);
    React.useEffect(() => {
      const el = ref.current;
      if (!el || typeof ResizeObserver === 'undefined') return undefined;
      const ro = new ResizeObserver(() => { if (!cam.current || cam.current.auto) fit(); });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    React.useEffect(() => {
      const el = ref.current;
      if (!el || !el.addEventListener) return undefined;
      const onWheel = (e) => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }, []);

    function onPointerDown(e) {
      if (e.button !== 0) return;
      const c = cam.current || { x: 0, y: 0, k: 1 };
      drag.current = { sx: e.clientX, sy: e.clientY, x: c.x, y: c.y };
      moved.current = false;
      const move = (ev) => {
        const d = drag.current;
        if (!d) return;
        const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
        if (!moved.current && Math.abs(dx) + Math.abs(dy) < 4) return;
        if (!moved.current && ref.current) ref.current.classList.add('cc-dragging');
        moved.current = true;
        cam.current = { k: (cam.current || c).k, x: d.x + dx, y: d.y + dy, auto: false };
        store();
        redraw();
      };
      const up = () => {
        drag.current = null;
        if (ref.current) ref.current.classList.remove('cc-dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
    function onKeyDown(e) {
      const v = size();
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fit(); return true; }
      if (e.key === '0') { e.preventDefault(); fit(true); return true; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.2, v.w / 2, v.h / 2); return true; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / 1.2, v.w / 2, v.h / 2); return true; }
      return false;
    }
    const c = cam.current || { x: 0, y: 0, k: 1 };
    return {
      ref: ref, x: c.x, y: c.y, k: c.k, fit: fit,
      wasDrag: () => moved.current,
      onPointerDown: onPointerDown, onKeyDown: onKeyDown
    };
  }

  CC.tokens = tokens;
  CC.css = css;
  CC.ensureStyles = ensureStyles;
  CC.statusOf = statusOf;
  CC.statusLabel = statusLabel;
  CC.statusGlyph = statusGlyph;
  CC.matchesFilter = matchesFilter;
  CC.hashString = hashString;
  CC.laneIndex = laneIndex;
  CC.truncate = truncate;
  CC.prefersReducedMotion = prefersReducedMotion;
  CC.StatusDot = StatusDot;
  CC.useCamera = useCamera;
})(CC);

		// ── ui.js
// ui.js - the shared component kit. Every page builds its chrome from these pieces so headers,
// buttons, rows, switches and meters look and behave the same everywhere (DESIGN.md).
// Colours, sizes and radii come only from tokens.js CSS variables; this file holds no raw colour.
(function (CC) {
  'use strict';
  const h = CC.h;
  const S = CC.tokens.size;

  // Joins class names, skipping empty ones.
  function cx() {
    const out = [];
    for (let i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }

  const css = [
    // Page frame: one header bar, then a scrolling body with one gutter.
    '.cc-root.cc-page{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);}',
    '.cc-root .cc-ph{flex:none;display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;border-bottom:1px solid var(--cc-line);min-width:0;}',
    '.cc-root .cc-ph-title{font-size:' + S.section + 'px;font-weight:600;line-height:1.2;white-space:nowrap;letter-spacing:-.01em;}',
    '.cc-root .cc-ph-meta{font-size:' + S.label + 'px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ph-mid{display:flex;align-items:center;gap:8px;min-width:0;}',
    '.cc-root .cc-ph-gap{flex:1 1 auto;min-width:8px;}',
    '.cc-root .cc-ph-act{display:flex;align-items:center;gap:8px;flex:none;}',
    '.cc-root .cc-pb{flex:1 1 auto;min-height:0;overflow:auto;}',
    '.cc-root .cc-pb-pad{padding:16px;}',
    '.cc-root .cc-pb-col{max-width:var(--cc-content-max);}',
    // Buttons: default (hairline), primary (accent fill, one per view), quiet (text only), danger.
    '.cc-root .cc-b{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--cc-line-strong);' +
      'border-radius:var(--cc-r-control);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;font-weight:500;' +
      'line-height:1;white-space:nowrap;cursor:pointer;user-select:none;}',
    '.cc-root .cc-b:hover:not(:disabled){background:var(--cc-surface-2);}',
    '.cc-root .cc-b:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-b-sm{height:24px;padding:0 8px;font-size:' + S.meta + 'px;}',
    '.cc-root .cc-b-primary{background:var(--cc-accent);border-color:var(--cc-accent);color:var(--cc-on-status);}',
    '.cc-root .cc-b-primary:hover:not(:disabled){background:var(--cc-accent);filter:brightness(1.06);}',
    '.cc-root .cc-b-quiet{border-color:transparent;background:transparent;color:var(--cc-text-2);}',
    '.cc-root .cc-b-quiet:hover:not(:disabled){background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-b-danger{color:var(--cc-error);}',
    '.cc-root .cc-b-icon{width:28px;padding:0;}',
    '.cc-root .cc-b-sm.cc-b-icon{width:24px;}',
    '.cc-root .cc-b svg{flex:none;}',
    // Segmented control: a quiet track with the chosen option raised.
    '.cc-root .cc-sg{display:inline-flex;align-items:center;gap:2px;height:28px;padding:2px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);flex:none;}',
    '.cc-root .cc-sg-o{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border:1px solid transparent;border-radius:calc(var(--cc-r-control) - 2px);' +
      'background:transparent;color:var(--cc-text-2);font:inherit;font-size:' + S.label + 'px;font-weight:500;cursor:pointer;white-space:nowrap;}',
    '.cc-root .cc-sg-o:hover{color:var(--cc-text);}',
    '.cc-root .cc-sg-o[aria-pressed="true"]{background:var(--cc-surface);border-color:var(--cc-line);color:var(--cc-text);}',
    '.cc-root .cc-sg-n{font-size:' + S.meta + 'px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    // Switch.
    '.cc-root .cc-sw{position:relative;flex:none;width:28px;height:16px;padding:0;border:0;border-radius:999px;background:var(--cc-line-strong);cursor:pointer;}',
    '.cc-root .cc-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--cc-surface);transition:transform var(--cc-fast) var(--cc-ease);}',
    '.cc-root .cc-sw[aria-checked="true"]{background:var(--cc-accent);}',
    '.cc-root .cc-sw[aria-checked="true"]::after{transform:translateX(12px);}',
    '.cc-root .cc-sw:disabled{opacity:.45;cursor:default;}',
    // Sections: a header row and content, separated by hairlines, never boxed.
    '.cc-root .cc-sec{padding:12px 0;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-sec:first-child{border-top:0;padding-top:0;}',
    '.cc-root .cc-sec-h{display:flex;align-items:center;gap:8px;min-height:24px;margin-bottom:4px;}',
    '.cc-root .cc-sec-t{font-size:' + S.label + 'px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-sec-m{font-size:' + S.meta + 'px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sec-a{margin-left:auto;display:flex;gap:6px;align-items:center;}',
    // Rows: 32 px, hairline separated; lead (status/check), title, meta, trailing controls.
    '.cc-root .cc-ls{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-r{display:flex;align-items:center;gap:10px;min-height:32px;padding:4px 8px;border-bottom:1px solid var(--cc-line);font-size:' + S.label + 'px;}',
    '.cc-root .cc-r:last-child{border-bottom:0;}',
    '.cc-root .cc-r-click{cursor:pointer;border-radius:var(--cc-r-control);}',
    '.cc-root .cc-r-click:hover{background:var(--cc-wash);}',
    '.cc-root .cc-r[aria-selected="true"]{background:var(--cc-selection);}',
    '.cc-root .cc-r-lead{flex:none;display:flex;align-items:center;}',
    '.cc-root .cc-r-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cc-text);}',
    '.cc-root .cc-r-wrap .cc-r-t{white-space:normal;}',
    '.cc-root .cc-r-sub{display:block;font-size:' + S.meta + 'px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-r-m{flex:none;font-size:' + S.meta + 'px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-r-trail{flex:none;display:flex;align-items:center;gap:6px;}',
    '.cc-root .cc-r-off{opacity:.5;}',
    // Meter: a thin bar with a tabular number.
    '.cc-root .cc-mt{display:inline-flex;align-items:center;gap:6px;font-size:' + S.meta + 'px;color:var(--cc-text-2);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-mt-bar{position:relative;width:48px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-mt-fill{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-text-2);}',
    '.cc-root .cc-mt-ok .cc-mt-fill{background:var(--cc-done);}',
    '.cc-root .cc-mt-low .cc-mt-fill{background:var(--cc-error);}',
    '.cc-root .cc-mt-run .cc-mt-fill{background:var(--cc-running);}',
    // Badge: only for something that needs action, or a count of it.
    '.cc-root .cc-bd{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:999px;font-size:' + S.meta + 'px;font-weight:600;' +
      'line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums;border:1px solid var(--cc-line-strong);color:var(--cc-text-2);}',
    '.cc-root .cc-bd-action{border-color:var(--cc-accent);color:var(--cc-accent);}',
    '.cc-root .cc-bd-error{border-color:var(--cc-error);color:var(--cc-error);}',
    '.cc-root .cc-bd-run{border-color:var(--cc-running);color:var(--cc-running);}',
    // Banner: one line across the top of a page body.
    '.cc-root .cc-bn{display:flex;align-items:center;gap:10px;min-height:36px;padding:6px 16px;border-bottom:1px solid var(--cc-line);font-size:' + S.label + 'px;color:var(--cc-text-2);background:var(--cc-surface-2);}',
    '.cc-root .cc-bn-error{color:var(--cc-error);}',
    '.cc-root .cc-bn-t{flex:1 1 auto;min-width:0;}',
    // Empty state: left aligned, compact.
    '.cc-root .cc-em{padding:24px 16px;max-width:560px;}',
    '.cc-root .cc-em-t{font-size:' + S.body + 'px;font-weight:600;}',
    '.cc-root .cc-em-b{margin-top:4px;font-size:' + S.label + 'px;color:var(--cc-text-3);}',
    '.cc-root .cc-em-a{margin-top:12px;display:flex;gap:8px;}',
    // Form fields.
    '.cc-root .cc-fd{display:flex;flex-direction:column;gap:4px;min-width:0;}',
    '.cc-root .cc-fd-l{font-size:' + S.label + 'px;font-weight:500;color:var(--cc-text-2);}',
    '.cc-root .cc-fd-h{font-size:' + S.meta + 'px;color:var(--cc-text-3);}',
    '.cc-root .cc-in{width:100%;height:32px;padding:0 10px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);background:var(--cc-surface);' +
      'color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;}',
    '.cc-root textarea.cc-in{height:auto;min-height:72px;padding:8px 10px;line-height:1.45;resize:vertical;}',
    '.cc-root select.cc-in{padding-right:24px;}',
    '.cc-root .cc-in:focus{outline:none;border-color:var(--cc-accent);}',
    // Split view: main area and a fixed-width side panel with a hairline.
    '.cc-root .cc-split{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-root .cc-split-main{flex:1 1 auto;min-width:0;min-height:0;overflow:auto;}',
    '.cc-root .cc-split-side{flex:none;width:360px;min-height:0;overflow:auto;border-left:1px solid var(--cc-line);background:var(--cc-surface);}',
    // Key/value grid for inspectors.
    '.cc-root .cc-kv{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;font-size:' + S.label + 'px;}',
    '.cc-root .cc-kv dt{color:var(--cc-text-3);}',
    '.cc-root .cc-kv dd{margin:0;min-width:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;}',
    // Menu: a "More" button with a small popover list for rare actions (hairline, no shadow).
    '.cc-root .cc-mn{position:relative;display:inline-flex;flex:none;}',
    '.cc-root .cc-mn-pop{position:absolute;right:0;top:calc(100% + 4px);z-index:60;min-width:160px;max-width:280px;padding:4px;margin:0;list-style:none;' +
      'border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);}',
    '.cc-root .cc-mn-left .cc-mn-pop{right:auto;left:0;}',
    '.cc-root .cc-mn-i{display:flex;align-items:center;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--cc-r-control);background:transparent;' +
      'color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}',
    '.cc-root .cc-mn-i:hover:not(:disabled),.cc-root .cc-mn-i:focus-visible{background:var(--cc-wash);outline:none;}',
    '.cc-root .cc-mn-i:disabled{color:var(--cc-text-3);cursor:default;}',
    '.cc-root .cc-mn-danger{color:var(--cc-error);}',
    '.cc-root .cc-mn-sep{height:1px;margin:4px 0;background:var(--cc-line);}',
    // Native checkboxes: 16 px, the accent when checked, sitting on the text line of their row.
    '.cc-root input[type="checkbox"]{flex:none;width:16px;height:16px;margin:0;accent-color:var(--cc-accent);vertical-align:-3px;cursor:pointer;}',
    '.cc-root input[type="checkbox"]:disabled{cursor:default;}',
    '.cc-root .cc-em code{font-family:var(--cc-mono);font-size:' + S.meta + 'px;padding:1px 4px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);color:var(--cc-text);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-sw::after{transition:none;}}'
  ].join('\n');

  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    const had = document.getElementById ? document.getElementById('cc-ui-kit') : null;
    if (had) { if (had.textContent !== css) had.textContent = css; return; }
    const el = document.createElement('style');
    el.id = 'cc-ui-kit';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // A whole page: header bar + body. `pad` adds the 16 px gutter; `col` caps width for forms.
  // `page` sets data-cc-page (the page's stable name for tests and screenshots); `boxRef` reaches the root.
  function Page(p) {
    ensureCss();
    return h('div', { className: cx('cc-root', 'cc-page', p.className), 'data-cc': p.id || undefined,
      'data-cc-page': p.page || undefined, ref: p.boxRef || undefined },
      p.header || null,
      p.banner || null,
      p.raw ? p.children : h('div', { className: cx('cc-pb', p.pad !== false && 'cc-pb-pad') },
        p.col ? h('div', { className: 'cc-pb-col' }, p.children) : p.children));
  }

  // Header bar: title, one meta line, optional middle controls (view switch), right-hand actions.
  function PageHeader(p) {
    ensureCss();
    return h('div', { className: 'cc-ph', role: 'toolbar', 'aria-label': p.label || (typeof p.title === 'string' ? p.title : undefined) },
      h('div', { className: 'cc-ph-title' }, p.title),
      p.meta ? h('div', { className: 'cc-ph-meta' }, p.meta) : null,
      p.mid ? h('div', { className: 'cc-ph-mid' }, p.mid) : null,
      h('div', { className: 'cc-ph-gap' }),
      p.actions ? h('div', { className: 'cc-ph-act' }, p.actions) : null,
      // App-wide status (sync mode, Waypoint Core link) sits at the right end of every header,
      // so no page needs a second bar. topbar.js defines it; absent in tests.
      typeof CC.HeaderStatus === 'function' && p.status !== false ? h(CC.HeaderStatus, { pageId: p.pageId }) : null);
  }

  function Button(p) {
    const kind = p.kind || 'default';
    return h('button', {
      type: 'button', className: cx('cc-b', kind !== 'default' && 'cc-b-' + kind, p.size === 'sm' && 'cc-b-sm',
        p.icon && !p.children && 'cc-b-icon', p.className),
      onClick: p.onClick, disabled: !!p.disabled, title: p.title, 'aria-label': p.label || p.title,
      'data-cc-action': p.action || undefined
    }, p.icon ? Icon({ d: p.icon, size: p.size === 'sm' ? 14 : 16 }) : null, p.children);
  }

  function Segmented(p) {
    return h('div', { className: 'cc-sg', role: 'group', 'aria-label': p.label },
      (p.options || []).map(function (o) {
        const value = typeof o === 'object' ? o.value : o;
        const text = typeof o === 'object' ? o.label : o;
        return h('button', {
          key: String(value), type: 'button', className: 'cc-sg-o', 'aria-pressed': p.value === value ? 'true' : 'false',
          title: o.title, onClick: function () { if (p.onChange && p.value !== value) p.onChange(value); }
        }, text, o.count !== undefined && o.count !== null ? h('span', { className: 'cc-sg-n' }, String(o.count)) : null);
      }));
  }

  function Toggle(p) {
    return h('button', {
      type: 'button', role: 'switch', className: 'cc-sw', 'aria-checked': p.checked ? 'true' : 'false',
      'aria-label': p.label, title: p.title || p.label, disabled: !!p.disabled, 'data-id': p.id || undefined,
      onClick: function () { if (p.onChange) p.onChange(!p.checked); }
    });
  }

  // `section` sets data-section (a stable hook for tests and scroll targets); `boxRef` reaches the element.
  function Section(p) {
    return h('section', { key: p.key, className: cx('cc-sec', p.className), 'aria-label': p.title,
      'data-section': p.section || undefined, ref: p.boxRef || undefined },
      p.title || p.actions ? h('div', { className: 'cc-sec-h' },
        p.title ? h('div', { className: 'cc-sec-t' }, p.title) : null,
        p.meta !== undefined && p.meta !== null ? h('div', { className: 'cc-sec-m' }, p.meta) : null,
        p.actions ? h('div', { className: 'cc-sec-a' }, p.actions) : null) : null,
      p.children);
  }

  function List(p) { return h('ul', { className: cx('cc-ls', p.className), 'aria-label': p.label }, p.children); }

  function Row(p) {
    const click = typeof p.onClick === 'function';
    return h('li', {
      key: p.key, className: cx('cc-r', click && 'cc-r-click', p.wrap && 'cc-r-wrap', p.off && 'cc-r-off', p.className),
      'aria-selected': p.selected ? 'true' : undefined, role: click ? 'button' : undefined, tabIndex: click ? 0 : undefined,
      // Enter/Space on the row itself only: a key on a control inside the row (a switch, a menu) is that control's.
      onClick: p.onClick, onKeyDown: click ? function (e) {
        if (e.target && e.currentTarget && e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onClick(e); }
      } : undefined,
      'data-cc-row': p.id || undefined, title: p.tip
    },
      p.lead ? h('span', { className: 'cc-r-lead' }, p.lead) : null,
      h('span', { className: 'cc-r-t' }, p.title, p.sub ? h('span', { className: 'cc-r-sub' }, p.sub) : null),
      p.meta !== undefined && p.meta !== null && p.meta !== '' ? h('span', { className: 'cc-r-m' }, p.meta) : null,
      p.trail ? h('span', { className: 'cc-r-trail', onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); } }, p.trail) : null);
  }

  // value 0-100 or null (unknown: an empty bar and a dash, never an invented number).
  function Meter(p) {
    const known = typeof p.value === 'number' && isFinite(p.value);
    const v = known ? Math.max(0, Math.min(100, p.value)) : 0;
    const tone = p.tone || (known ? (v < 15 ? 'low' : 'ok') : '');
    return h('span', { className: cx('cc-mt', tone && 'cc-mt-' + tone), title: p.title },
      h('span', { className: 'cc-mt-bar', 'aria-hidden': true }, h('span', { className: 'cc-mt-fill', style: { width: v + '%' } })),
      h('span', null, known ? Math.round(v) + '%' : '–', p.label ? ' ' + p.label : ''));
  }

  function Badge(p) {
    return h('span', { className: cx('cc-bd', p.tone && 'cc-bd-' + p.tone), title: p.title }, p.children);
  }

  function Banner(p) {
    return h('div', { className: cx('cc-bn', p.tone && 'cc-bn-' + p.tone), role: 'status' },
      h('span', { className: 'cc-bn-t' }, p.children), p.action || null);
  }

  function Empty(p) {
    return h('div', { className: 'cc-em' },
      h('div', { className: 'cc-em-t' }, p.title),
      p.body ? h('div', { className: 'cc-em-b' }, p.body) : null,
      p.action ? h('div', { className: 'cc-em-a' }, p.action) : null);
  }

  // Empty state for a page that has no data because Waypoint Core is not reachable. Pages show this
  // only when they have nothing at all to draw; otherwise the header's Core chip is the one signal.
  function coreProblem(core) {
    const c = core || CC.core;
    return !!c && (c.state === 'down' || c.state === 'mismatch');
  }
  function CoreEmpty(p) {
    const c = (p && p.core) || CC.core || {};
    if (c.state === 'mismatch') {
      return Empty({ title: 'Waypoint Core speaks API ' + c.api,
        body: 'This plugin needs API ' + (CC.CORE_API || 1) + '. Update Waypoint for dsh or Core so both match.' });
    }
    return Empty({ title: 'The Waypoint server is not running',
      body: ['dsh starts it; if it does not, see INSTALL.md (Tell the plugin where Waypoint is).'] });
  }

  // "More" menu for rare actions: items [{label, onClick, danger, disabled, sep}]. Escape, an outside
  // click or choosing an item closes it; arrow keys move between items. Menu() can be called like the
  // other kit functions or used as h(CC.ui.Menu, ...): either way its state lives in MenuBox.
  function Menu(p) { return h(MenuBox, p); }
  function MenuBox(p) {
    const React = CC.React;
    const st = React.useState(!!p.defaultOpen), open = st[0], setOpen = st[1];
    const ref = React.useRef(null);
    React.useEffect(function () {
      if (!open || typeof document === 'undefined' || !document.addEventListener) return undefined;
      const outside = function (ev) {
        const root = ref.current;
        if (root && root.contains && ev && ev.target && root.contains(ev.target)) return;
        setOpen(false);
      };
      const esc = function (ev) { if (ev && ev.key === 'Escape') setOpen(false); };
      document.addEventListener('mousedown', outside);
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
    }, [open]);
    function onKey(e) {
      if (!e || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const root = ref.current;
      const list = root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('.cc-mn-i:not(:disabled)')) : [];
      if (!list.length) return;
      e.preventDefault();
      const at = list.indexOf(typeof document !== 'undefined' ? document.activeElement : null);
      const next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at <= 0 ? list.length - 1 : at - 1);
      if (list[next] && list[next].focus) list[next].focus();
    }
    const items = (p.items || []).filter(Boolean);
    const label = p.label || 'More';
    return h('div', { className: cx('cc-mn', p.align === 'left' && 'cc-mn-left', p.className), ref: ref, onKeyDown: onKey },
      h('button', {
        // Always the quiet 28 px square icon button with the kit's More icon (never text dots).
        type: 'button', className: cx('cc-b', 'cc-b-quiet', 'cc-b-icon', p.size === 'sm' && 'cc-b-sm'), 'data-cc-menu': 'more',
        'aria-haspopup': 'menu', 'aria-expanded': open ? 'true' : 'false', 'aria-label': label, title: label,
        disabled: !!p.disabled || !items.length, onClick: function () { setOpen(!open); }
      }, Icon({ d: ICONS.more, size: p.size === 'sm' ? 14 : 16 })),
      open ? h('div', { className: 'cc-mn-pop', role: 'menu', 'aria-label': label },
        items.map(function (it, i) {
          if (it.sep) return h('div', { key: 'sep' + i, className: 'cc-mn-sep', role: 'separator' });
          return h('button', {
            key: it.key || it.label || i, type: 'button', role: 'menuitem', className: cx('cc-mn-i', it.danger && 'cc-mn-danger'),
            disabled: !!it.disabled, title: it.title || it.label, 'data-cc-action': it.action || undefined,
            onClick: function (e) { setOpen(false); if (!it.disabled && typeof it.onClick === 'function') it.onClick(e); }
          }, it.label);
        })) : null);
  }

  function Field(p) {
    return h('label', { className: cx('cc-fd', p.className) },
      h('span', { className: 'cc-fd-l' }, p.label),
      p.children,
      p.hint ? h('span', { className: 'cc-fd-h' }, p.hint) : null);
  }

  function Icon(p) {
    const size = p.size || 16;
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: p.d }));
  }

  // Common icon paths (24 px grid, stroke only).
  const ICONS = {
    play: 'M8 5l11 7l-11 7z', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5l9-10',
    more: 'M6.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0M13.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0M20.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0', chevron: 'M9 6l6 6l-6 6', down: 'M6 9l6 6l6-6', copy: 'M9 9h10v10H9zM5 15V5h10',
    stop: 'M7 7h10v10H7z', search: 'M11 18a7 7 0 1 0 0-14a7 7 0 0 0 0 14zM20 20l-4-4', back: 'M15 6l-6 6l6 6'
  };

  CC.ui = { css: css, ensureCss: ensureCss, cx: cx, Page: Page, PageHeader: PageHeader, Button: Button, Segmented: Segmented,
    Toggle: Toggle, Section: Section, List: List, Row: Row, Meter: Meter, Badge: Badge, Banner: Banner, Empty: Empty,
    Field: Field, Icon: Icon, ICONS: ICONS, Menu: Menu, CoreEmpty: CoreEmpty, coreProblem: coreProblem };
})(CC);

		// ── check_counts.js
// check_counts.js [views, C10] - per-node check counts and "blocked by a failing check" (pure).
// The board sends `checks: [passed, failed, last]` per node (last 'pass'|'fail'|null), or null when
// the done-check has never run. Without the field (older engine) the counts come from the node's
// status and actor: only a `check:<type>` actor is a check result.
(function (CC) {
  'use strict';

  function checkCounts(node) {
    const n = node || {};
    let passed = 0, failed = 0, last = null;
    const c = n.checks;
    if (Array.isArray(c)) {
      passed = +c[0] || 0; failed = +c[1] || 0; last = c[2] === 'pass' || c[2] === 'fail' ? c[2] : null;
    } else if (c && typeof c === 'object') {
      passed = +c.passed || 0; failed = +c.failed || 0; last = c.last === 'pass' || c.last === 'fail' ? c.last : null;
    } else if (c === undefined && typeof n.actor === 'string' && n.actor.indexOf('check:') === 0) {
      if (n.status === 'done') { passed = 1; last = 'pass'; } else if (n.status === 'error') { failed = 1; last = 'fail'; }
    }
    if (last === null && passed + failed > 0) last = failed && !passed ? 'fail' : 'pass';
    return { passed: passed, failed: failed, runs: passed + failed, pending: last === null ? 1 : 0, last: last };
  }

  // A node's check is failing when its last run failed and it is not done (the owner's "done" overrides).
  function isFailing(n) { return checkCounts(n).last === 'fail' && CC.statusOf(n) !== 'done'; }

  // {id: [failing upstream ids]} for every not-done node with a failing check upstream. A done
  // node is a firewall: what it already produced stands, so the block does not pass through it.
  function blockedByFailedCheck(board) {
    const nodes = Array.isArray(board) ? board : ((board && board.nodes) || []);
    const byId = {};
    nodes.forEach((n) => { if (n && n.id != null) byId[String(n.id)] = n; });
    const memo = {}, busy = {};
    function upstream(id) {
      if (memo[id]) return memo[id];
      if (busy[id]) return {};
      busy[id] = true;
      const out = {};
      ((byId[id] && byId[id].deps) || []).forEach((d) => {
        d = String(d);
        const dn = byId[d];
        if (!dn) return;
        if (isFailing(dn)) out[d] = true;
        if (CC.statusOf(dn) === 'done') return;
        Object.keys(upstream(d)).forEach((k) => { out[k] = true; });
      });
      busy[id] = false;
      memo[id] = out;
      return out;
    }
    const result = {};
    Object.keys(byId).forEach((id) => {
      if (CC.statusOf(byId[id]) === 'done') return;
      const ids = Object.keys(upstream(id)).filter((k) => k !== id).sort();
      if (ids.length) result[id] = ids;
    });
    return result;
  }

  function checkLine(c) {
    if (!c || c.last === null) return 'Check not run yet';
    return 'Check ' + (c.last === 'fail' ? 'failing' : 'passing') + ' · ' + c.passed + ' of ' + c.runs +
      (c.runs === 1 ? ' run' : ' runs') + ' passed';
  }
  function blockedLine(ids) {
    return ids && ids.length ? 'Blocked: the check on ' + ids.join(', ') + ' is failing' : null;
  }
  // Short badge text for a Flow node, or null when the check has not run (no badge).
  function checkBadge(c) {
    if (!c || c.last === null) return null;
    return (c.last === 'fail' ? '✕ ' : '✓ ') + c.passed + '/' + c.runs;
  }

  CC.checkCounts = checkCounts;
  CC.blockedByFailedCheck = blockedByFailedCheck;
  CC.checkLine = checkLine;
  CC.blockedLine = blockedLine;
  CC.checkBadge = checkBadge;
})(CC);

		// ── layout_flow.js
// layout_flow.js [views, C2] - pure layered left-to-right layout (no React, testable in node).
// Longest-path layering, dummy nodes for long edges, >= 8 barycenter sweeps with transpose,
// order-preserving vertical placement (isotonic regression), orthogonal edge routing.
(function (CC) {
  'use strict';

  // Cards: a status dot, then a label of labelChars characters per line (full title on hover and
  // in the inspector). With fitWidth / fitHeight (canvas px) the card width comes from the free
  // width, clamped to minNodeW..maxNodeW (U1 review: never compress columns into stubs). A graph
  // that is still wider than the canvas keeps 160 px cards and pans horizontally: its fit zoom
  // never drops below legibleK (12 px labels render at 11 px or more).
  const DEFAULTS = {
    nodeW: 0, nodeH: 32, gapX: 56, minGapX: 18, panGapX: 28, gapY: 20, dummyGap: 12, pad: 16, sweeps: 12,
    labelChars: 18, charW: 6.1, textX: 20, textPad: 4, minNodeW: 160, minFitNodeW: 136, maxNodeW: 240,
    labelPx: 12, legiblePx: 11, fitWidth: 0, fitHeight: 0, fitPad: 24
  };

  // Column sizing for n layers and a graph of the given height:
  // {nodeW, gapX, labelChars, scale, panX}, where scale is the zoom the opening fit uses.
  function chooseSizing(n, height, o) {
    const widthFor = (c) => Math.round(o.textX + c * o.charW + o.textPad);
    const charsFor = (w) => Math.max(1, Math.floor((w - o.textX - o.textPad) / o.charW));
    const fixedW = o.nodeW > 0 ? o.nodeW : 0;
    const maxC = Math.max(1, o.labelChars | 0);
    if (!(o.fitWidth > 0)) return { nodeW: fixedW || widthFor(maxC), gapX: o.gapX, labelChars: maxC, scale: 1, panX: false };
    const availW = Math.max(1, o.fitWidth - 2 * o.fitPad);
    const availH = o.fitHeight > 0 ? Math.max(1, o.fitHeight - 2 * o.fitPad) : Infinity;
    const kH = Math.min(1, availH / Math.max(1, height));
    const inner = availW - 2 * o.pad;
    let g = o.gapX;
    let w = fixedW || Math.floor((inner - (n - 1) * g) / n);
    if (!fixedW && w < o.minNodeW) {
      // Shrink the gaps first; if 160 px cards still do not fit, keep roomy gaps and pan.
      w = o.minNodeW;
      g = n > 1 ? Math.floor((inner - n * w) / (n - 1)) : o.gapX;
      if (g < o.minGapX) {
        // Tightest gaps still fit at a legible zoom: keep them; otherwise pan with roomier gaps.
        const tight = 2 * o.pad + n * w + (n - 1) * o.minGapX;
        const legible = Math.min(1, o.legiblePx / o.labelPx);
        if (availW / tight >= legible - 1e-9) g = o.minGapX;
        else {
          // Review: a graph a little wider than the canvas should not clip its last column on
          // first open. Narrower cards (down to minFitNodeW) at full size, else at the legible
          // zoom, before falling back to 160 px cards and a pan.
          const at = (k) => Math.floor((availW / k - 2 * o.pad - (n - 1) * o.minGapX) / n);
          const w1 = at(1), wl = at(legible);
          if (w1 >= o.minFitNodeW) { w = Math.min(w, w1); g = o.minGapX; }
          else if (wl >= o.minFitNodeW) { w = Math.min(w, wl); g = o.minGapX; }
          else g = Math.max(o.minGapX, Math.min(o.gapX, o.panGapX));
        }
      }
    }
    if (!fixedW) w = Math.min(o.maxNodeW, w);
    const W = 2 * o.pad + n * w + (n - 1) * g;
    const legibleK = Math.min(1, o.legiblePx / o.labelPx);
    let scale = Math.min(1, availW / W, kH);
    if (scale < legibleK - 1e-9) scale = Math.max(legibleK, kH);
    return { nodeW: w, gapX: g, labelChars: charsFor(w), scale: scale, panX: W * scale > availW + 1e-6 };
  }

  function edgeEnds(e) {
    if (Array.isArray(e)) return [e[0], e[1]];
    if (!e) return [undefined, undefined];
    return [e.source != null ? e.source : (e.from != null ? e.from : e.src),
      e.target != null ? e.target : (e.to != null ? e.to : e.dst)];
  }
  function idOf(v) { return v != null && typeof v === 'object' ? v.id : v; }

  // Normalise edges; fall back to node.deps when no edge list is given.
  function normalizeEdges(nodes, edges, has) {
    const out = [];
    const seen = {};
    const add = (s, t) => {
      s = idOf(s); t = idOf(t);
      if (s == null || t == null || s === t || !has[s] || !has[t]) return;
      const key = s + '\u0001' + t;
      if (seen[key]) return;
      seen[key] = 1;
      out.push([String(s), String(t)]);
    };
    if (edges && edges.length) edges.forEach((e) => { const p = edgeEnds(e); add(p[0], p[1]); });
    else nodes.forEach((n) => (n.deps || []).forEach((d) => add(d, n.id)));
    return out;
  }

  // Review 2: an edge that another path already implies (a->c when a->b->c) draws nothing new;
  // drop it so the board shows only the edges that carry information. Cycles are left alone.
  function dropImplied(edges) {
    if (edges.length > 4000) return edges;
    const out = {};
    edges.forEach((e) => { (out[e[0]] = out[e[0]] || []).push(e[1]); });
    const reach = (from, to, skip) => {
      const seen = {}, stack = (out[from] || []).filter((x) => x !== skip);
      while (stack.length) {
        const v = stack.pop();
        if (v === to) return true;
        if (seen[v] || v === from) continue;
        seen[v] = 1;
        (out[v] || []).forEach((w) => stack.push(w));
      }
      return false;
    };
    const keep = edges.filter((e) => !reach(e[0], e[1], e[1]));
    return keep.length ? keep : edges;
  }

  // Count crossings between consecutive layers. layers: [[id]], succ: {id:[id]}.
  function countCrossings(layers, succ) {
    let total = 0;
    for (let L = 0; L + 1 < layers.length; L++) total += crossingsBetween(layers[L], layers[L + 1], succ);
    return total;
  }
  function crossingsBetween(upper, lower, succ) {
    const pos = {};
    lower.forEach((id, i) => { pos[id] = i; });
    const segs = [];
    upper.forEach((u, i) => (succ[u] || []).forEach((v) => { if (pos[v] != null) segs.push([i, pos[v]]); }));
    let c = 0;
    for (let a = 0; a < segs.length; a++) {
      for (let b = a + 1; b < segs.length; b++) {
        const s = segs[a], t = segs[b];
        if ((s[0] - t[0]) * (s[1] - t[1]) < 0) c++;
      }
    }
    return c;
  }

  // Pool-adjacent-violators: closest non-decreasing sequence to z (least squares).
  function isotonic(z) {
    const blocks = [];
    z.forEach((v) => {
      blocks.push({ sum: v, n: 1 });
      while (blocks.length > 1) {
        const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
        if (a.sum / a.n <= b.sum / b.n) break;
        a.sum += b.sum; a.n += b.n; blocks.pop();
      }
    });
    const out = [];
    blocks.forEach((b) => { for (let i = 0; i < b.n; i++) out.push(b.sum / b.n); });
    return out;
  }

  // Crossing minimisation on integer ids. Several starts (input order, depth-first order,
  // reversed, seeded shuffles); each gets >= 8 alternating down/up barycenter sweeps with a
  // transpose pass after every sweep, then sifting. The best ordering seen is kept, so the
  // result is never worse than the naive input order.
  function minimizeCrossings(layersIn, succMap, predMap, o) {
    const ids = [];
    const ix = {};
    layersIn.forEach((l) => l.forEach((id) => { ix[id] = ids.length; ids.push(id); }));
    const P = ids.length;
    const succ = ids.map((id) => succMap[id].map((x) => ix[x]));
    const pred = ids.map((id) => predMap[id].map((x) => ix[x]));
    const maxL = layersIn.length - 1;
    const pos = new Int32Array(P);
    let order = layersIn.map((l) => l.map((id) => ix[id]));
    const setPos = (L) => { const a = order[L]; for (let i = 0; i < a.length; i++) pos[a[i]] = i; };
    const setAll = () => { for (let L = 0; L <= maxL; L++) setPos(L); };

    function crossBetween(L) {
      // inversions among target positions, edges ordered by (source pos, target pos)
      const seqT = [];
      const up = order[L];
      for (let i = 0; i < up.length; i++) {
        const t = succ[up[i]].map((v) => pos[v]).sort((a, b) => a - b);
        for (let j = 0; j < t.length; j++) seqT.push(t[j]);
      }
      const n = order[L + 1].length;
      const bit = new Int32Array(n + 1);
      let c = 0, seen = 0;
      for (let k = 0; k < seqT.length; k++) {
        const t = seqT[k];
        let le = 0;
        for (let i = t + 1; i > 0; i -= i & -i) le += bit[i];
        c += seen - le;
        for (let i = t + 1; i <= n; i += i & -i) bit[i]++;
        seen++;
      }
      return c;
    }
    const total = () => { let c = 0; for (let L = 0; L < maxL; L++) c += crossBetween(L); return c; };
    // crossings contributed by a and b (a above b) with both neighbouring layers
    function pairCost(a, b) {
      let c = 0;
      const pa = pred[a], pb = pred[b], sa = succ[a], sb = succ[b];
      for (let i = 0; i < pa.length; i++) for (let j = 0; j < pb.length; j++) if (pos[pa[i]] > pos[pb[j]]) c++;
      for (let i = 0; i < sa.length; i++) for (let j = 0; j < sb.length; j++) if (pos[sa[i]] > pos[sb[j]]) c++;
      return c;
    }
    function sortByBary(L, adj) {
      const lay = order[L];
      const bary = new Float64Array(lay.length);
      const keyOf = {};
      lay.forEach((v, i) => {
        const nb = adj[v];
        let s = 0;
        for (let j = 0; j < nb.length; j++) s += pos[nb[j]];
        bary[i] = nb.length ? s / nb.length : i;
        keyOf[v] = i;
      });
      order[L] = lay.slice().sort((a, b) => (bary[keyOf[a]] - bary[keyOf[b]]) || (keyOf[a] - keyOf[b]));
      setPos(L);
    }
    function transpose() {
      for (let guard = 0; guard < 20; guard++) {
        let improved = false;
        for (let L = 0; L <= maxL; L++) {
          const lay = order[L];
          for (let i = 0; i + 1 < lay.length; i++) {
            const a = lay[i], b = lay[i + 1];
            if (pairCost(b, a) < pairCost(a, b)) { lay[i] = b; lay[i + 1] = a; pos[a] = i + 1; pos[b] = i; improved = true; }
          }
        }
        if (!improved) break;
      }
    }
    function sift() {
      for (let pass = 0; pass < 4; pass++) {
        let improved = false;
        for (let L = 0; L <= maxL; L++) {
          if (order[L].length < 2) continue;
          order[L].slice().forEach((v) => {
            const rest = order[L].filter((x) => x !== v);
            const curIdx = order[L].indexOf(v);
            // cost relative to v at the front; moving v past w adds pairCost(w,v) - pairCost(v,w)
            let cost = 0, bestCost = 0, bestK = 0, curCost = null;
            if (curIdx === 0) curCost = 0;
            for (let k = 0; k < rest.length; k++) {
              const w = rest[k];
              cost += pairCost(w, v) - pairCost(v, w);
              if (k + 1 === curIdx) curCost = cost;
              if (cost < bestCost) { bestCost = cost; bestK = k + 1; }
            }
            if (bestCost < curCost) {
              order[L] = rest.slice(0, bestK).concat([v], rest.slice(bestK));
              setPos(L);
              improved = true;
            }
          });
        }
        if (!improved) break;
      }
    }

    setAll();
    const naive = total();
    let best = order.map((l) => l.slice());
    let bestC = naive;
    const dfsRank = new Int32Array(P).fill(-1);
    let seq = 0;
    const visit = (v) => {
      if (dfsRank[v] >= 0) return;
      dfsRank[v] = seq++;
      succ[v].forEach(visit);
    };
    (order[0] || []).forEach(visit);
    for (let v = 0; v < P; v++) visit(v);
    const base = order.map((l) => l.slice());
    const starts = [
      base,
      base.map((l) => l.slice().sort((a, b) => dfsRank[a] - dfsRank[b])),
      base.map((l) => l.slice().reverse())
    ];
    let rs = 0x2545f491;
    const rnd = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return (rs >>> 0) / 4294967296; };
    // Seeded shuffled restarts (deterministic); the budget shrinks as the graph grows.
    const extra = o.restarts != null ? o.restarts : (P <= 60 ? 32 : P <= 120 ? 12 : P <= 300 ? 4 : 0);
    for (let s = 0; s < extra; s++) {
      starts.push(base.map((l) => {
        const a = l.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }));
    }
    const sweeps = Math.max(8, o.sweeps | 0);
    const keep = () => {
      const c = total();
      if (c < bestC) { bestC = c; best = order.map((l) => l.slice()); }
    };
    for (let s = 0; s < starts.length && bestC > 0; s++) {
      order = starts[s].map((l) => l.slice());
      setAll();
      keep();
      for (let it = 0; it < sweeps && bestC > 0; it++) {
        if (it % 2 === 0) for (let L = 1; L <= maxL; L++) sortByBary(L, pred);
        else for (let L = maxL - 1; L >= 0; L--) sortByBary(L, succ);
        transpose();
        keep();
      }
      if (bestC > 0) { sift(); transpose(); keep(); }
    }
    return { order: best.map((l) => l.map((v) => ids[v])), crossings: bestC, naive: naive };
  }

  // Review 2: a disconnected component sits directly under the ones above it (one row gap in
  // the layers it spans), never in a band of empty canvas. Components keep their order; only
  // upward moves are made, so nothing can overlap.
  function packComponents(order, y, hOf, succ, o) {
    const parent = {};
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    order.forEach((lay) => lay.forEach((id) => { parent[id] = id; }));
    Object.keys(succ).forEach((a) => (succ[a] || []).forEach((b) => { if (parent[a] != null && parent[b] != null) parent[find(a)] = find(b); }));
    const comps = {}, layerOf = {};
    order.forEach((lay, L) => lay.forEach((id) => { layerOf[id] = L; const r = find(id); (comps[r] = comps[r] || []).push(id); }));
    const roots = Object.keys(comps);
    if (roots.length < 2) return;
    const top = (r) => Math.min.apply(null, comps[r].map((id) => y[id] - hOf(id) / 2));
    roots.sort((a, b) => top(a) - top(b));
    const bottom = order.map(() => -Infinity);   // per layer: lowest box edge placed so far
    roots.forEach((r, i) => {
      const ids = comps[r];
      if (i > 0) {
        let room = Infinity;
        ids.forEach((id) => { const L = layerOf[id]; if (bottom[L] > -Infinity) room = Math.min(room, (y[id] - hOf(id) / 2) - (bottom[L] + o.gapY)); });
        if (room > 0.5 && isFinite(room)) ids.forEach((id) => { y[id] -= room; });
      }
      ids.forEach((id) => { const L = layerOf[id]; bottom[L] = Math.max(bottom[L], y[id] + hOf(id) / 2); });
    });
  }

  // Two-line cards (U1 review): when some title is longer than one line, cards get two full
  // lines before the ellipsis.
  const TWO_LINE_H = 48;
  function layoutFlow(nodesIn, edgesIn, options) {
    const opts = options || {};
    const one = layoutOnce(nodesIn, edgesIn, opts);
    one.lines = 1;
    const o = Object.assign({}, DEFAULTS, opts);
    if (!(o.fitWidth > 0) || opts.nodeH) return one;
    const long = (nodesIn || []).some((n) => n && String(n.title || n.id || '').length > one.labelChars - (n.kind ? 2 : 0));
    if (!long) return one;
    const two = layoutOnce(nodesIn, edgesIn, Object.assign({}, opts, { nodeH: TWO_LINE_H, gapY: 14 }));
    const availH = o.fitHeight > 0 ? Math.max(1, o.fitHeight - 2 * o.fitPad) : Infinity;
    const legibleK = Math.min(1, o.legiblePx / o.labelPx);
    // Review 2: two full lines at every canvas size while the zoom stays legible; a graph taller
    // than the canvas pans vertically rather than cutting every title to one line.
    if (two.fitScale < legibleK - 1e-9 || (two.height * two.fitScale > availH + 1e-6 && opts.preferOneLine)) return one;
    two.lines = 2;
    return two;
  }

  function layoutOnce(nodesIn, edgesIn, options) {
    const o = Object.assign({}, DEFAULTS, options || {});
    const nodes = [];
    const has = {};
    (nodesIn || []).forEach((n) => {
      if (!n || n.id == null) return;
      const id = String(n.id);
      if (has[id]) return;
      has[id] = 1;
      nodes.push(Object.assign({}, n, { id: id }));
    });
    const ids = nodes.map((n) => n.id);
    const rank = {};
    ids.forEach((id, i) => { rank[id] = i; });
    let edges = normalizeEdges(nodes, edgesIn, has);
    if (o.dropImplied) edges = dropImplied(edges);

    // Break cycles defensively (display only): DFS in input order, reverse back edges.
    const out0 = {};
    ids.forEach((id) => { out0[id] = []; });
    edges.forEach((e) => out0[e[0]].push(e[1]));
    const state = {};
    const back = {};
    ids.forEach((root) => {
      if (state[root]) return;
      const stack = [[root, 0]];
      state[root] = 1;
      while (stack.length) {
        const top = stack[stack.length - 1];
        const nxt = out0[top[0]][top[1]++];
        if (nxt === undefined) { state[top[0]] = 2; stack.pop(); continue; }
        if (state[nxt] === 1) back[top[0] + '\u0001' + nxt] = 1;
        else if (!state[nxt]) { state[nxt] = 1; stack.push([nxt, 0]); }
      }
    });
    edges = edges.map((e) => (back[e[0] + '\u0001' + e[1]] ? [e[1], e[0], true] : e));

    // Longest-path layering (Kahn, input order).
    const preds = {}, succs = {}, indeg = {};
    ids.forEach((id) => { preds[id] = []; succs[id] = []; indeg[id] = 0; });
    edges.forEach((e) => {
      if (succs[e[0]].indexOf(e[1]) >= 0) return;
      succs[e[0]].push(e[1]); preds[e[1]].push(e[0]); indeg[e[1]]++;
    });
    const layer = {};
    const queue = ids.filter((id) => indeg[id] === 0);
    ids.forEach((id) => { layer[id] = 0; });
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi];
      succs[u].forEach((v) => {
        layer[v] = Math.max(layer[v], layer[u] + 1);
        if (--indeg[v] === 0) queue.push(v);
      });
    }
    let maxL = 0;
    ids.forEach((id) => { maxL = Math.max(maxL, layer[id]); });

    // Proper graph with dummy chains. Long edges share dummies (edge concentration): a dummy
    // is keyed by its source, so a fan-out travels as one trunk; the last dummy before a
    // target fed by several long edges is keyed by that target, so a fan-in arrives as one.
    const layers = [];
    for (let L = 0; L <= maxL; L++) layers.push([]);
    ids.forEach((id) => layers[layer[id]].push(id));
    const isDummy = {};
    const pSucc = {}, pPred = {};
    ids.forEach((id) => { pSucc[id] = []; pPred[id] = []; });
    const longIn = {};
    edges.forEach((e) => {
      if (layer[e[1]] - layer[e[0]] > 1) (longIn[e[1]] = longIn[e[1]] || {})[e[0]] = 1;
    });
    const fanIn = (t) => Object.keys(longIn[t] || {}).length > 1;
    const link = (a, b) => { if (pSucc[a].indexOf(b) < 0) { pSucc[a].push(b); pPred[b].push(a); } };
    const chains = [];
    const made = {};
    edges.forEach((e) => {
      const s = e[0], t = e[1];
      if (succs[s].indexOf(t) < 0 || made[s + '|' + t]) return;
      made[s + '|' + t] = 1;
      const chain = [s];
      for (let L = layer[s] + 1; L < layer[t]; L++) {
        const d = L === layer[t] - 1 && fanIn(t) ? '\u0000t' + t + ':' + L : '\u0000s' + s + ':' + L;
        if (!isDummy[d]) {
          isDummy[d] = true; pSucc[d] = []; pPred[d] = [];
          layer[d] = L;
          layers[L].push(d);
        }
        chain.push(d);
      }
      chain.push(t);
      for (let i = 0; i + 1 < chain.length; i++) link(chain[i], chain[i + 1]);
      chains.push({ id: (e[2] ? t + '->' + s : s + '->' + t), source: e[2] ? t : s, target: e[2] ? s : t, reversed: !!e[2], chain: chain });
    });

    // Crossing minimisation (see minimizeCrossings).
    const mc = minimizeCrossings(layers, pSucc, pPred, o);
    const naive = mc.naive;
    const bestC = mc.crossings;
    const order = mc.order;

    // Vertical placement: keep order, pull towards neighbours (isotonic regression).
    const hOf = (id) => (isDummy[id] ? 0 : o.nodeH);
    const y = {};
    const offsets = order.map((lay) => {
      const off = [0];
      for (let i = 1; i < lay.length; i++) {
        const a = lay[i - 1], b = lay[i];
        const gap = isDummy[a] || isDummy[b] ? o.dummyGap : o.gapY;
        off.push(off[i - 1] + (hOf(a) + hOf(b)) / 2 + gap);
      }
      return off;
    });
    order.forEach((lay, L) => lay.forEach((id, i) => { y[id] = offsets[L][i]; }));
    function place(L, adjs) {
      const lay = order[L];
      if (!lay.length) return;
      const desired = lay.map((id) => {
        const nb = [];
        adjs.forEach((adj) => adj[id].forEach((x) => nb.push(y[x])));
        return nb.length ? nb.reduce((a, b) => a + b, 0) / nb.length : y[id];
      });
      const z = isotonic(desired.map((d, i) => d - offsets[L][i]));
      lay.forEach((id, i) => { y[id] = z[i] + offsets[L][i]; });
    }
    for (let r = 0; r < 6; r++) {
      for (let L = 1; L <= maxL; L++) place(L, [pPred]);
      for (let L = maxL - 1; L >= 0; L--) place(L, [pSucc]);
    }
    for (let L = 0; L <= maxL; L++) place(L, [pPred, pSucc]);

    let minTop = Infinity, maxBot = -Infinity;
    Object.keys(y).forEach((id) => {
      minTop = Math.min(minTop, y[id] - hOf(id) / 2);
      maxBot = Math.max(maxBot, y[id] + hOf(id) / 2);
    });
    if (!isFinite(minTop)) { minTop = 0; maxBot = 0; }
    const shift = o.pad - minTop;
    Object.keys(y).forEach((id) => { y[id] = Math.round(y[id] + shift); });

    // Straighten: remove tiny jogs (< 4 px) on edge chains when spacing allows.
    const slot = {};
    order.forEach((lay) => lay.forEach((id, i) => { slot[id] = i; }));
    const minSep = (a, b) => (hOf(a) + hOf(b)) / 2 + (isDummy[a] || isDummy[b] ? o.dummyGap : o.gapY) - 1;
    function canMove(id, ny) {
      const lay = order[layer[id]], i = slot[id];
      const prev = lay[i - 1], next = lay[i + 1];
      return (prev == null || ny - y[prev] >= minSep(prev, id)) && (next == null || y[next] - ny >= minSep(id, next));
    }
    chains.forEach((c) => {
      for (let i = 1; i < c.chain.length; i++) {
        const a = c.chain[i - 1], b = c.chain[i];
        const d = Math.abs(y[a] - y[b]);
        if (d === 0 || d >= 4) continue;
        if (isDummy[b] && canMove(b, y[a])) y[b] = y[a];
        else if (isDummy[a] && canMove(a, y[b])) y[a] = y[b];
      }
    });
    packComponents(order, y, hOf, pSucc, o);
    minTop = Infinity; maxBot = -Infinity;
    Object.keys(y).forEach((id) => {
      minTop = Math.min(minTop, y[id] - hOf(id) / 2);
      maxBot = Math.max(maxBot, y[id] + hOf(id) / 2);
    });
    if (!isFinite(minTop)) { minTop = 0; maxBot = 0; }
    if (Math.abs(minTop - o.pad) > 0.5) { const d = o.pad - minTop; Object.keys(y).forEach((id) => { y[id] = Math.round(y[id] + d); }); maxBot += d; minTop = o.pad; }
    // Column sizing waits until here: it depends on the layer count and the final height.
    const sizing = chooseSizing(maxL + 1, (maxBot - minTop) + 2 * o.pad, o);
    o.nodeW = sizing.nodeW;
    o.gapX = sizing.gapX;
    const colX = (L) => o.pad + L * (o.nodeW + o.gapX);

    const outNodes = {};
    order.forEach((lay, L) => {
      let i = 0;
      lay.forEach((id) => {
        if (isDummy[id]) return;
        outNodes[id] = { x: colX(L), y: y[id] - o.nodeH / 2, w: o.nodeW, h: o.nodeH, cy: y[id], layer: L, order: i++ };
      });
    });

    // Orthogonal routing. Vertical runs sit in the gap between layers; runs leaving the
    // same item share a track so fan-outs read as one trunk.
    const gapItems = {};
    chains.forEach((c) => {
      for (let i = 0; i + 1 < c.chain.length; i++) {
        const a = c.chain[i], b = c.chain[i + 1];
        if (Math.abs(y[a] - y[b]) < 0.5) continue;
        const L = layer[a];
        (gapItems[L] = gapItems[L] || {})[a] = 1;
      }
    });
    const track = {};
    Object.keys(gapItems).forEach((L) => {
      const keys = Object.keys(gapItems[L]).sort((a, b) => y[a] - y[b]);
      // One trunk per gap (U1 review): every vertical run between two columns shares one bus x.
      keys.forEach((k) => { track[L + '|' + k] = colX(+L) + o.nodeW + o.gapX * 0.5; });
    });
    const outEdges = chains.map((c) => {
      const pts = [];
      const push = (px, py) => {
        px = Math.round(px * 100) / 100; py = Math.round(py * 100) / 100;
        const last = pts[pts.length - 1];
        if (last && last[0] === px && last[1] === py) return;
        pts.push([px, py]);
      };
      for (let i = 0; i + 1 < c.chain.length; i++) {
        const a = c.chain[i], b = c.chain[i + 1];
        const L = layer[a];
        if (i === 0) push(colX(L) + o.nodeW, y[a]);
        if (Math.abs(y[a] - y[b]) >= 0.5) {
          const tx = track[L + '|' + a];
          push(tx, y[a]);
          push(tx, y[b]);
        }
        const bx = colX(L + 1);
        push(bx, y[b]);
        if (isDummy[b]) push(bx + o.nodeW, y[b]);
      }
      // drop collinear interior points
      const clean = pts.filter((p, i) => {
        if (i === 0 || i === pts.length - 1) return true;
        const a = pts[i - 1], b = pts[i + 1];
        return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
      });
      return { id: c.id, source: c.source, target: c.target, reversed: c.reversed, points: clean };
    });

    return {
      nodes: outNodes,
      edges: outEdges,
      width: colX(maxL) + o.nodeW + o.pad,
      height: (maxBot - minTop) + 2 * o.pad,
      crossings: bestC,
      naiveCrossings: naive,
      labelChars: sizing.labelChars,
      nodeW: o.nodeW,
      gapX: o.gapX,
      fitScale: sizing.scale,
      panX: sizing.panX,
      layers: order.map((l) => l.filter((id) => !isDummy[id])),
      properLayers: order,
      properSucc: pSucc
    };
  }

  // SVG path through orthogonal points with small rounded corners.
  function roundedPath(points, radius) {
    if (!points || !points.length) return '';
    const r0 = radius == null ? 6 : radius;
    const f = (n) => Math.round(n * 100) / 100;
    let d = 'M' + f(points[0][0]) + ' ' + f(points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i - 1], c = points[i], n = points[i + 1];
      const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]), l2 = Math.hypot(n[0] - c[0], n[1] - c[1]);
      const r = Math.min(r0, l1 / 2, l2 / 2);
      if (r <= 0.01) { d += 'L' + f(c[0]) + ' ' + f(c[1]); continue; }
      const ax = c[0] - (c[0] - p[0]) / l1 * r, ay = c[1] - (c[1] - p[1]) / l1 * r;
      const bx = c[0] + (n[0] - c[0]) / l2 * r, by = c[1] + (n[1] - c[1]) / l2 * r;
      d += 'L' + f(ax) + ' ' + f(ay) + 'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(bx) + ' ' + f(by);
    }
    const last = points[points.length - 1];
    return d + 'L' + f(last[0]) + ' ' + f(last[1]);
  }

  CC.layoutFlow = layoutFlow;
  CC.countCrossings = countCrossings;
  CC.roundedPath = roundedPath;
  CC.normalizeEdges = function (nodes, edges) {
    const has = {};
    (nodes || []).forEach((n) => { has[String(n.id)] = 1; });
    return normalizeEdges(nodes || [], edges, has);
  };
})(CC);

		// ── layout_star.js
// layout_star.js [views, C3] - deterministic seeded force layout (pure; run once, then frozen).
// Same nodes + links + seed => identical positions, independent of input order.
(function (CC) {
  'use strict';
  const sqrt = Math.sqrt;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedOf(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
    let x = 2166136261;
    const s = String(seed == null ? 'cc' : seed);
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function clusterOf(n) {
    const c = n.cluster != null ? n.cluster : (n.lane != null ? n.lane : (n.kind != null ? n.kind : ''));
    return String(c);
  }
  function linkEnds(l) {
    if (Array.isArray(l)) return [l[0], l[1]];
    const s = l.source != null ? l.source : (l.from != null ? l.from : l.src);
    const t = l.target != null ? l.target : (l.to != null ? l.to : l.dst);
    return [s && typeof s === 'object' ? s.id : s, t && typeof t === 'object' ? t.id : t];
  }

  // Two-phase layout so clusters never overlap:
  // 1. each cluster is a disc sized for its members; discs are placed by a small force
  //    model (pulled together by the links between them, pushed apart by hard collision with
  //    a clear gap for hull padding and the cluster name), on a wide ellipse for screens;
  // 2. members start on a sunflower spiral inside their disc (heaviest at the centre), then
  //    relax with local repulsion and link springs, clamped to the disc.
  function importanceOrder(members, deg) {
    return members.slice().sort((p, q) => (q.weight - p.weight) || (deg[q.i] - deg[p.i]) || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  }

  function layoutStar(nodesIn, linksIn, seed, options) {
    const o = Object.assign({ spacing: 30, gap: 120, aspect: 1.6, iterations: 0 }, options || {});
    const seen = {};
    const nodes = [];
    (nodesIn || []).forEach((n) => {
      if (!n || n.id == null || seen[String(n.id)]) return;
      seen[String(n.id)] = 1;
      nodes.push({ id: String(n.id), cluster: clusterOf(n), weight: Math.max(0, +n.weight || 1) });
    });
    nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const n = nodes.length;
    const out = {};
    if (!n) return out;
    const index = {};
    nodes.forEach((d, i) => { index[d.id] = i; d.i = i; });

    const linkSet = {};
    const links = [];
    (linksIn || []).forEach((l) => {
      const e = linkEnds(l);
      const a = index[String(e[0])], b = index[String(e[1])];
      if (a == null || b == null || a === b) return;
      const key = a < b ? a + ',' + b : b + ',' + a;
      if (linkSet[key]) return;
      linkSet[key] = 1;
      links.push(a < b ? [a, b] : [b, a]);
    });
    links.sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]));
    const deg = new Float64Array(n);
    links.forEach((l) => { deg[l[0]]++; deg[l[1]]++; });

    const rng = mulberry32(seedOf(seed));
    const clusters = Array.from(new Set(nodes.map((d) => d.cluster))).sort();
    const C = clusters.length;
    const cIndex = {};
    clusters.forEach((c, i) => { cIndex[c] = i; });
    const ci = new Int32Array(n);
    nodes.forEach((d, i) => { ci[i] = cIndex[d.cluster]; });
    const members = clusters.map(() => []);
    nodes.forEach((d) => members[cIndex[d.cluster]].push(d));
    const step = o.spacing / 1.9; // sunflower: nearest-neighbour distance ~ 1.9 * step
    const R = members.map((m) => step * sqrt(m.length) + 6);

    // Phase 1: cluster discs.
    const cx = new Float64Array(C), cy = new Float64Array(C);
    if (C > 1) {
      const W = [];
      for (let a = 0; a < C; a++) W.push(new Float64Array(C));
      let maxW = 0;
      links.forEach((l) => {
        const a = ci[l[0]], b = ci[l[1]];
        if (a === b) return;
        W[a][b]++; W[b][a]++;
        maxW = Math.max(maxW, W[a][b]);
      });
      let ring = 0;
      R.forEach((r) => { ring += 2 * r + o.gap; });
      ring /= 2 * Math.PI;
      const rot = rng() * 2 * Math.PI;
      for (let a = 0; a < C; a++) {
        const t = rot + (2 * Math.PI * a) / C;
        cx[a] = Math.cos(t) * ring * sqrt(o.aspect);
        cy[a] = Math.sin(t) * ring / sqrt(o.aspect);
      }
      const minD = (a, b) => R[a] + R[b] + o.gap;
      const collide = () => {
        for (let a = 0; a < C; a++) {
          for (let b = a + 1; b < C; b++) {
            let dx = cx[b] - cx[a], dy = cy[b] - cy[a];
            let d = sqrt(dx * dx + dy * dy);
            if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
            const need = minD(a, b);
            if (d >= need) continue;
            const push = (need - d) / d;
            const wa = R[b] * R[b] / (R[a] * R[a] + R[b] * R[b]);
            cx[a] -= dx * push * wa; cy[a] -= dy * push * wa;
            cx[b] += dx * push * (1 - wa); cy[b] += dy * push * (1 - wa);
          }
        }
      };
      const fx = new Float64Array(C), fy = new Float64Array(C);
      for (let it = 0; it < 400; it++) {
        const alpha = 1 - it / 400;
        fx.fill(0); fy.fill(0);
        for (let a = 0; a < C; a++) {
          for (let b = a + 1; b < C; b++) {
            if (!W[a][b]) continue;
            const dx = cx[b] - cx[a], dy = cy[b] - cy[a];
            const d = sqrt(dx * dx + dy * dy) || 1;
            const f = 0.02 * (W[a][b] / maxW) * (d - minD(a, b));
            fx[a] += dx / d * f; fy[a] += dy / d * f;
            fx[b] -= dx / d * f; fy[b] -= dy / d * f;
          }
          // anisotropic gravity: the arrangement ends wider than tall, like the canvas
          fx[a] -= cx[a] * 0.01;
          fy[a] -= cy[a] * 0.01 * o.aspect * o.aspect;
        }
        for (let a = 0; a < C; a++) { cx[a] += fx[a] * alpha; cy[a] += fy[a] * alpha; }
        collide();
      }
      for (let k = 0; k < 60; k++) collide();
    }

    // Phase 2: members inside their disc.
    const x = new Float64Array(n), y = new Float64Array(n);
    const golden = Math.PI * (3 - sqrt(5));
    members.forEach((m, c) => {
      const rot = rng() * 2 * Math.PI;
      importanceOrder(m, deg).forEach((d, k) => {
        const r = step * sqrt(k + 0.5);
        const t = rot + k * golden;
        x[d.i] = cx[c] + Math.cos(t) * r;
        y[d.i] = cy[c] + Math.sin(t) * r;
      });
    });
    const iters = o.iterations > 0 ? o.iterations : (n <= 400 ? 160 : Math.max(40, Math.floor(160 * 400 / n)));
    const s2 = o.spacing * o.spacing;
    const fx = new Float64Array(n), fy = new Float64Array(n);
    for (let it = 0; it < iters; it++) {
      const alpha = 1 - it / iters;
      fx.fill(0); fy.fill(0);
      members.forEach((m) => {
        for (let p = 0; p < m.length; p++) {
          const i = m[p].i;
          for (let q = p + 1; q < m.length; q++) {
            const j = m[q].i;
            let dx = x[i] - x[j], dy = y[i] - y[j];
            let d2 = dx * dx + dy * dy;
            if (d2 > 1.44 * s2) continue;
            if (d2 < 0.01) { dx = ((i * 7 + j * 13) % 11) / 11 - 0.5; dy = ((i * 3 + j * 5) % 7) / 7 - 0.5; d2 = dx * dx + dy * dy + 0.01; }
            const d = sqrt(d2);
            const f = 0.35 * s2 / d2;
            fx[i] += dx / d * f; fy[i] += dy / d * f;
            fx[j] -= dx / d * f; fy[j] -= dy / d * f;
          }
        }
      });
      for (let k = 0; k < links.length; k++) {
        const i = links[k][0], j = links[k][1];
        const dx = x[j] - x[i], dy = y[j] - y[i];
        const d = sqrt(dx * dx + dy * dy) || 0.01;
        const same = ci[i] === ci[j];
        if (same && d < o.spacing * 1.4) continue;
        const f = (same ? 0.03 : 0.0012) * (d - o.spacing);
        fx[i] += dx / d * f / sqrt(deg[i]); fy[i] += dy / d * f / sqrt(deg[i]);
        fx[j] -= dx / d * f / sqrt(deg[j]); fy[j] -= dy / d * f / sqrt(deg[j]);
      }
      for (let i = 0; i < n; i++) {
        const sp = sqrt(fx[i] * fx[i] + fy[i] * fy[i]);
        const cap = o.spacing * 0.3 * alpha + 0.2;
        const k = sp > cap ? cap / sp : 1;
        x[i] += fx[i] * k; y[i] += fy[i] * k;
        const c = ci[i];
        const dx = x[i] - cx[c], dy = y[i] - cy[c];
        const d = sqrt(dx * dx + dy * dy);
        if (d > R[c]) { x[i] = cx[c] + dx / d * R[c]; y[i] = cy[c] + dy / d * R[c]; }
      }
    }
    nodes.forEach((d, i) => { out[d.id] = { x: Math.round(x[i] * 100) / 100, y: Math.round(y[i] * 100) / 100 }; });
    return out;
  }

  function starBounds(positions, pad) {
    const p = pad == null ? 40 : pad;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.keys(positions || {}).forEach((id) => {
      const q = positions[id];
      minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y);
    });
    if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: minX - p, y: minY - p, w: maxX - minX + 2 * p, h: maxY - minY + 2 * p };
  }

  // Convex hull per cluster (Andrew's monotone chain), for soft hulls + centroid labels.
  function hull(points) {
    const pts = points.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    pts.forEach((p) => { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); });
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  function clusterHulls(nodes, positions) {
    const groups = {};
    (nodes || []).forEach((nd) => {
      const p = positions[String(nd.id)];
      if (!p) return;
      const c = clusterOf(nd);
      (groups[c] = groups[c] || []).push([p.x, p.y]);
    });
    return Object.keys(groups).sort().filter((c) => c !== '').map((c) => {
      const pts = groups[c];
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const top = pts.reduce((a, p) => Math.min(a, p[1]), Infinity);
      return { key: c, points: hull(pts), cx: cx, cy: cy, top: top, size: pts.length };
    });
  }

  CC.layoutStar = layoutStar;
  CC.starBounds = starBounds;
  CC.clusterHulls = clusterHulls;
  CC.clusterOf = clusterOf;
  CC.seededRandom = function (seed) { return mulberry32(seedOf(seed)); };
})(CC);

		// ── waves.js
// waves.js [views, C4] - pure wave grouping for the List view.
// Wave = node.wave when given (engine: longest-path depth, 0-based), else computed from deps.
// Current wave = lowest wave that still has an unfinished (not done) node; null when all done.
(function (CC) {
  'use strict';

  function computeWaves(nodes) {
    const byId = {};
    nodes.forEach((n) => { byId[String(n.id)] = n; });
    const memo = {};
    const visiting = {};
    function depth(id) {
      if (memo[id] != null) return memo[id];
      if (visiting[id]) return 0; // cycle guard
      visiting[id] = true;
      const n = byId[id];
      let d = 0;
      (n && n.deps ? n.deps : []).forEach((p) => {
        if (byId[String(p)]) d = Math.max(d, depth(String(p)) + 1);
      });
      visiting[id] = false;
      memo[id] = d;
      return d;
    }
    const out = {};
    nodes.forEach((n) => {
      const w = n.wave;
      out[String(n.id)] = typeof w === 'number' && isFinite(w) ? w : depth(String(n.id));
    });
    return out;
  }

  function groupWaves(nodesIn) {
    const nodes = (nodesIn || []).filter((n) => n && n.id != null);
    const wave = computeWaves(nodes);
    const map = {};
    nodes.forEach((n) => {
      const w = wave[String(n.id)];
      (map[w] = map[w] || { wave: w, nodes: [], done: 0, total: 0 }).nodes.push(n);
    });
    const waves = Object.keys(map).map(Number).sort((a, b) => a - b).map((w) => {
      const g = map[w];
      g.total = g.nodes.length;
      g.done = g.nodes.filter((n) => CC.statusOf(n) === 'done').length;
      return g;
    });
    let current = null;
    for (let i = 0; i < waves.length; i++) {
      if (waves[i].done < waves[i].total) { current = waves[i].wave; break; }
    }
    return { waves: waves, current: current };
  }

  CC.groupWaves = groupWaves;
  CC.computeWaves = computeWaves;
})(CC);

		// ── view_flow.js
// view_flow.js [views, C2] - left-to-right task flow chart (SVG via React elements).
// Props: {board:{nodes,edges}, filter:'all'|'active'|'completed', selected, onSelect, onOpen?, colorBy?:'status'|'lane', cameraKey?}
// Implied edges (a->c when a->b->c) are dropped except with dashUnnamed (Plan review shows every handoff).
// Layout is computed from ALL nodes and only recomputed when the graph structure or the canvas
// size changes; the filter fades nodes; the camera lives in a ref and is never refit on filter
// change. The opening view fits the graph at a legible zoom: cards take their width from the
// canvas (160-240 px); a graph wider than the canvas anchors left, pans horizontally and shows
// an edge button on each side it continues past.
// It follows canvas resizes until the user pans or zooms.
(function (CC) {
  'use strict';

  let uid = 0;
  const META_MIN_PX = 9;   // hide the meta line when 11 px meta text would render below this
  const MAX_FIT = 1.25;     // largest zoom the opening fit uses when the graph has room
  const SIZE_STEP = 16;    // canvas size bucket (px) so small resizes do not relayout
  const movedStore = {};   // cameraKey -> user has panned/zoomed since the last fit

  function structureKey(nodes, edges) {
    const n = nodes.map((x) => x.id + ':' + (x.deps || []).join(',')).join('|');
    const e = (edges || []).map((x) => (Array.isArray(x) ? x.join('>') : (x.source || x.from || x.src) + '>' + (x.target || x.to || x.dst))).join('|');
    return n + '#' + e;
  }

  // U3 node cards: a quiet surface card per task, status read from the dot and (for running,
  // error, needs you) the card's 1 px outline; selection is the accent outline.
  const FLOW_STYLE = [
    '.cc-root .cc-flow .cc-node .cc-hit{fill:var(--cc-surface);stroke:var(--cc-line-strong);stroke-width:1;transition:fill 120ms,stroke 120ms;}',
    '.cc-root .cc-flow .cc-node:hover .cc-hit{fill:var(--cc-surface-2);}',
    '.cc-root .cc-flow .cc-node.cc-st-running .cc-hit{stroke:var(--cc-running);}',
    '.cc-root .cc-flow .cc-node.cc-st-error .cc-hit{stroke:var(--cc-error);}',
    '.cc-root .cc-flow .cc-node.cc-st-needs_you .cc-hit{stroke:var(--cc-accent);}',
    '.cc-root .cc-flow .cc-node.cc-blocked:not(.cc-sel) .cc-hit{stroke:var(--cc-error);stroke-dasharray:3 2;}',
    '.cc-root .cc-flow .cc-node.cc-sel .cc-hit{fill:var(--cc-surface);stroke:var(--cc-accent);stroke-width:1.5;}',
    '.cc-root .cc-flow .cc-node.cc-st-done:not(.cc-sel) .cc-t-label{fill:var(--cc-text-2);}',
    '.cc-root .cc-flow .cc-kind{stroke:var(--cc-text-3);}',
    '.cc-root .cc-flow .cc-node.cc-sel .cc-kind{stroke:var(--cc-accent);}',
    '.cc-root .cc-flow .cc-edge.cc-edge-sel{stroke-width:1.5;}',
    // U1 review: edges share one bus per gap and sit back in the quiet line colour.
    '.cc-root .cc-flow .cc-edge:not(.cc-edge-sel):not(.cc-edge-blocked){stroke:var(--cc-line);}',
    '.cc-root .cc-flow .cc-faded{opacity:.18;}',
    // Review 2: a graph wider than the canvas says so at the edge it continues past.
    '.cc-root .cc-flow{position:relative;}',
    '.cc-root .cc-flow .cc-pan{position:absolute;top:50%;width:28px;height:28px;margin-top:-14px;display:flex;align-items:center;justify-content:center;border:1px solid var(--cc-line-strong);border-radius:8px;background:var(--cc-surface);color:var(--cc-text-2);font:inherit;font-size:14px;line-height:1;cursor:pointer;z-index:1;}',
    '.cc-root .cc-flow .cc-pan:hover{background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root .cc-flow .cc-pan:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-flow .cc-pan-l{left:8px;}',
    '.cc-root .cc-flow .cc-pan-r{right:8px;}'
  ].join('\n');
  function ensureFlowStyle() {
    if (typeof document === 'undefined' || !document.getElementById || document.getElementById('cc-flow-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-flow-style';
    el.textContent = FLOW_STYLE;
    document.head.appendChild(el);
  }
  // Two lines of at most n characters, broken at the last space that fits; a first word longer
  // than the line is split with a hyphen.
  function wrap2(text, n) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return [t];
    const sp = t.lastIndexOf(' ', n), hy = t.lastIndexOf('-', n - 1);
    if (sp > 0 && sp >= hy) return [t.slice(0, sp), clip(t.slice(sp + 1), n)];
    if (hy > 0) return [t.slice(0, hy + 1), clip(t.slice(hy + 1), n)];
    return [t.slice(0, n - 1) + '-', clip(t.slice(n - 1), n)];
  }
  // Truncate without a space before the ellipsis.
  function clip(text, n) { return CC.truncate(text, n).replace(/\s+…$/, '…'); }

  // A code node runs its script and never a model. The board may omit `kind` (packed rows), so
  // the code route counts too.
  function isCodeNode(n) { return !!n && (n.kind === 'code' || n.pool === 'code' || n.route === 'code'); }
  CC.isCodeNode = CC.isCodeNode || isCodeNode;
  // The card's meta line: id, then Blocked / Code / model. The status word is left to the dot and
  // the tooltip (review 2: it was the part that got cut); the line is never ellipsized - the model
  // is dropped first, then the id alone stays.
  function metaLine(n, blocked, room) {
    const tail = blocked ? 'Blocked' : isCodeNode(n) ? 'Code' : (n.model || '');
    const full = [n.id, tail].filter(Boolean).join(' · ');
    if (!(room > 0) || full.length <= room) return full;
    return String(n.id);
  }
  CC.flowMetaLine = metaLine;

  function neighbours(layout) {
    const succ = {}, pred = {};
    layout.edges.forEach((e) => {
      (succ[e.source] = succ[e.source] || []).push(e.target);
      (pred[e.target] = pred[e.target] || []).push(e.source);
    });
    const byY = (a, b) => layout.nodes[a].cy - layout.nodes[b].cy;
    Object.keys(succ).forEach((k) => succ[k].sort(byY));
    Object.keys(pred).forEach((k) => pred[k].sort(byY));
    return { succ: succ, pred: pred };
  }

  function FlowView(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    ensureFlowStyle();
    const board = props.board || {};
    const nodes = board.nodes || [];
    const edges = board.edges || [];
    const filter = props.filter || 'all';
    const selected = props.selected == null ? null : String(props.selected);
    const onSelect = props.onSelect || function () {};
    const colorBy = props.colorBy || 'status';

    const key = structureKey(nodes, edges);
    // Canvas size (bucketed) drives column spacing. Null until measured.
    const sizeS = React.useState(null);
    const canvas = sizeS[0], setCanvas = sizeS[1];
    const cw = canvas ? canvas.w : 0, ch = canvas ? canvas.h : 0;
    const layout = React.useMemo(() => CC.layoutFlow(nodes, edges, { fitWidth: cw, fitHeight: ch, dropImplied: !props.dashUnnamed }), [key, cw, ch]);
    const nb = React.useMemo(() => neighbours(layout), [layout]);
    const idRef = React.useRef(null);
    if (idRef.current == null) idRef.current = 'cc-flow-' + (++uid);
    const mid = idRef.current;
    // The fit never zooms below the layout's legible scale; wider graphs anchor left and pan.
    // Review: a graph with room to spare opens larger (up to MAX_FIT), using the canvas width and
    // height with the camera's 24 px margin. The camera never zooms an automatic fit past 1, so it
    // works in boosted units: bounds and the zoom floor are scaled, and K is the zoom on screen.
    const boost = cw > 0 && ch > 0 && nodes.length
      ? Math.max(1, Math.min(MAX_FIT, (cw - 48) / Math.max(1, layout.width), (ch - 48) / Math.max(1, layout.height))) : 1;
    const cam = CC.useCamera({ x: 0, y: 0, w: layout.width * boost, h: layout.height * boost }, props.cameraKey, { minFit: layout.fitScale / boost });
    const K = cam.k * boost;
    // The camera's own resize observer keeps its first render's zoom floor; refit with this one.
    const camRef = React.useRef(cam);
    camRef.current = cam;
    const lastFit = React.useRef(null);
    // Horizontal offset on top of the camera: the edge buttons and "keep the selection in view"
    // move it; a fit resets it.
    const shiftS = React.useState(0);
    const shift = shiftS[0], setShift = shiftS[1];
    React.useEffect(() => {
      if (moved.current || !canvas || lastFit.current === layout) return;
      lastFit.current = layout;
      setShift(0);
      camRef.current.fit();
    }, [layout]);
    const moved = React.useRef(props.cameraKey ? !!movedStore[props.cameraKey] : false);
    const setMoved = (v) => { moved.current = v; if (props.cameraKey) movedStore[props.cameraKey] = v; };
    const measure = () => {
      const el = cam.ref.current;
      if (!el || !el.getBoundingClientRect) return;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return;
      const w = Math.floor(r.width / SIZE_STEP) * SIZE_STEP, hh = Math.floor(r.height / SIZE_STEP) * SIZE_STEP;
      setCanvas((c) => (c && c.w === w && c.h === hh ? c : { w: w, h: hh }));
    };
    (React.useLayoutEffect || React.useEffect)(() => {
      // Measure before first paint; a stored manual camera keeps its layout as it was.
      if (!canvas || !moved.current) measure();
    }, [key]);
    React.useEffect(() => {
      const el = cam.ref.current;
      if (!el) return undefined;
      const onWheel = () => setMoved(true);
      if (el.addEventListener) el.addEventListener('wheel', onWheel, { passive: true });
      const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
        if (moved.current) return;
        measure();
        camRef.current.fit();
      });
      if (ro) ro.observe(el);
      return () => {
        if (el.removeEventListener) el.removeEventListener('wheel', onWheel);
        if (ro) ro.disconnect();
      };
    }, []);
    function onPointerDown(e) {
      cam.onPointerDown(e);
      if (e.button !== 0 || typeof window === 'undefined') return;
      const up = () => { window.removeEventListener('pointerup', up); if (cam.wasDrag()) setMoved(true); };
      window.addEventListener('pointerup', up);
    }
    // What is off the visible canvas (screen px), for the edge buttons.
    const viewW = cw || 0;
    const left0 = cam.x + shift + 16 * K, right0 = cam.x + shift + (layout.width - 16) * K;
    const offLeft = viewW > 0 && left0 < -1, offRight = viewW > 0 && right0 > viewW + 1;
    const panBy = (dir) => {
      const step = Math.max(120, Math.round(viewW * 0.7));
      setShift((s0) => {
        const lo = Math.min(0, viewW - 24 - (cam.x + (layout.width - 16) * K)), hi = Math.max(0, 24 - (cam.x + 16 * K));
        return Math.max(lo, Math.min(hi, s0 + (dir < 0 ? step : -step)));
      });
    };
    // The inspector opening (or a click near the edge) never leaves the selected card under it or
    // under an edge button. It re-checks after an automatic fit, but never fights the user's own pan.
    const prevSel = React.useRef(null);
    React.useEffect(() => {
      const fresh = prevSel.current !== selected;
      prevSel.current = selected;
      if (moved.current && !fresh) return;
      const p = selected && layout.nodes[selected];
      if (!p || !(viewW > 0)) return;
      const m = 48, x0 = cam.x + shift + p.x * K, x1 = cam.x + shift + (p.x + p.w) * K;
      if (x1 > viewW - m) setShift(shift - (x1 - (viewW - m)));
      else if (x0 < m) setShift(shift + (m - x0));
    }, [selected, viewW, layout, cam.x, K]);
    const showMeta = 11 * K >= META_MIN_PX;
    const chars = layout.labelChars || 18;
    // Zoomed out so far that 12 px labels would render under 11 px: draw them at 11 px on screen
    // (fewer characters, two lines when the layout made two-line cards) with the dot scaled to match.
    const small = 12 * K < 11 - 1e-9;
    const sc = small ? 11 / (12 * K) : 1;
    const lines = layout.lines === 2 ? 2 : 1;

    const byId = {};
    nodes.forEach((n) => { byId[String(n.id)] = n; });
    const visible = (id) => byId[id] && CC.matchesFilter(byId[id], filter);
    // C10: per-node check counts and dependants blocked by a failing check upstream.
    // Without check_counts.js (older tests/bundles) nothing is blocked and no badge is drawn.
    const hasChecks = typeof CC.checkCounts === 'function';
    const blocked = React.useMemo(() => (hasChecks ? CC.blockedByFailedCheck(nodes) : {}), [nodes]);
    const failing = (id) => hasChecks && byId[id] && CC.checkCounts(byId[id]).last === 'fail' && CC.statusOf(byId[id]) !== 'done';

    function onKeyDown(e) {
      if (e.key === 'f' || e.key === 'F' || e.key === '0') { setMoved(false); setShift(0); measure(); }
      if (cam.onKeyDown(e)) {
        if (['+', '=', '-', '_'].indexOf(e.key) >= 0) setMoved(true);
        return;
      }
      const ids = Object.keys(layout.nodes);
      if (!ids.length) return;
      if (e.key === 'Escape') { onSelect(null); return; }
      if (e.key === 'Enter' && selected) { e.preventDefault(); (props.onOpen || onSelect)(selected); return; }
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      if (!selected || !layout.nodes[selected]) { onSelect(layout.layers[0][0]); return; }
      const cur = layout.nodes[selected];
      let next = null;
      if (e.key === 'ArrowRight') next = (nb.succ[selected] || [])[0];
      else if (e.key === 'ArrowLeft') next = (nb.pred[selected] || [])[0];
      else {
        const lay = layout.layers[cur.layer];
        next = lay[cur.order + (e.key === 'ArrowDown' ? 1 : -1)];
      }
      if (next) onSelect(next);
    }

    const marker = (id, cls) => h('marker', {
      key: id, id: id, viewBox: '0 0 8 8', refX: 8, refY: 4, markerWidth: 7, markerHeight: 7,
      markerUnits: 'userSpaceOnUse', orient: 'auto'
    }, h('path', { d: 'M0 0.5L8 4L0 7.5z', className: cls }));

    // W9: with dashUnnamed (Plan review) an edge whose dependant names nothing crossing it is dashed.
    // Only nodes that carry a `crosses` map count, so boards without loop data stay solid.
    const unnamed = (e) => {
      if (!props.dashUnnamed) return false;
      const dst = byId[e.reversed ? e.source : e.target], src = e.reversed ? e.target : e.source;
      if (!dst || !dst.crosses || typeof dst.crosses !== 'object') return false;
      return !String(dst.crosses[src] || '').trim();
    };
    // Kind glyph (top right of the node): code is a small square, splitter a fork, gate a diamond.
    const kindGlyph = (kind, w, top) => {
      const g = { className: 'cc-kind cc-kind-' + kind, fill: 'none', strokeWidth: 1.25 };
      const x = w - 14, y = top == null ? 5 : top;
      if (kind === 'code') return h('rect', Object.assign({ x: x, y: y, width: 8, height: 8 }, g));
      if (kind === 'gate') return h('path', Object.assign({ d: 'M' + (x + 4) + ' ' + y + 'L' + (x + 8) + ' ' + (y + 4) + 'L' + (x + 4) + ' ' + (y + 8) + 'L' + x + ' ' + (y + 4) + 'z' }, g));
      if (kind === 'splitter') return h('path', Object.assign({ d: 'M' + x + ' ' + (y + 4) + 'H' + (x + 3) + 'M' + (x + 3) + ' ' + (y + 4) + 'L' + (x + 8) + ' ' + y + 'M' + (x + 3) + ' ' + (y + 4) + 'L' + (x + 8) + ' ' + (y + 8) }, g));
      return null;
    };
    const edgeEls = layout.edges.map((e) => {
      const sel = selected && (e.source === selected || e.target === selected);
      const faded = !(visible(e.source) && visible(e.target));
      const blk = !!blocked[e.target] && (failing(e.source) || !!blocked[e.source]);
      return h('path', {
        key: e.id,
        d: CC.roundedPath(e.points, 6),
        className: 'cc-edge' + (sel ? ' cc-edge-sel' : '') + (blk ? ' cc-edge-blocked' : '') + (faded ? ' cc-faded' : ''),
        strokeDasharray: unnamed(e) ? '4 3' : undefined,
        markerEnd: 'url(#' + mid + (sel ? '-as' : '-a') + ')'
      });
    });

    const nodeEls = Object.keys(layout.nodes).map((id) => {
      const p = layout.nodes[id];
      const n = byId[id] || { id: id };
      const st = CC.statusOf(n);
      const sel = id === selected;
      const lane = colorBy === 'lane' ? CC.laneIndex(n.lane || n.pool) : null;
      const by = blocked[id];
      const counts = hasChecks ? CC.checkCounts(n) : null;
      const badge = counts ? CC.checkBadge(counts) : null;
      const code = isCodeNode(n);
      const kind = code ? 'code' : n.kind;
      const line = counts ? CC.checkLine(counts) : '';
      const glyphW = kind ? 2 : 0;
      const tx = 20 * sc;
      const room = small ? Math.max(4, Math.floor((p.w - tx - 4 - (kind ? 12 * sc : 0)) / (6.1 * sc))) : chars - glyphW;
      const fs = small ? { fontSize: (11 / K).toFixed(2) + 'px' } : undefined;
      const title = n.title || id;
      let labelEl;
      const meta2 = showMeta && !small;
      let metaY = p.h / 2 + 11;
      if (small && lines === 2 && 2.45 * (11 / K) + 8 <= p.h) {
        const f = 11 / K, parts = wrap2(title, room), b1 = parts.length > 1 ? p.h / 2 - 0.22 * f : p.h / 2 + 0.36 * f;
        labelEl = h('text', { className: 'cc-t-label', x: tx, y: b1, style: fs },
          parts.map((t, i) => h('tspan', { key: i, x: tx, dy: i ? 1.2 * f : 0 }, t)));
      } else if (!small && lines === 2) {
        // Two full 12 px lines before the ellipsis, then the meta line; the block is centred.
        const parts = wrap2(title, room);
        const top = (p.h - (parts.length * 14 + (meta2 ? 13 : 0))) / 2;
        labelEl = h('text', { className: 'cc-t-label', x: tx, y: top + 11 },
          parts.map((t, i) => h('tspan', { key: i, x: tx, dy: i ? 14 : 0 }, t)));
        metaY = top + parts.length * 14 + 10;
      } else {
        const ly = small ? p.h / 2 + 0.36 * (11 / K) : (showMeta ? p.h / 2 - 3 : p.h / 2 + 4);
        labelEl = h('text', { className: 'cc-t-label', x: tx, y: ly, style: fs }, clip(title, room));
      }
      const tip = (n.title || id) + ' — ' + CC.statusLabel(st) + (code ? ' · Code' : '') +
        (line ? '; ' + line.charAt(0).toLowerCase() + line.slice(1) : '') + (by ? '. ' + CC.blockedLine(by) : '');
      return h('g', {
        key: id,
        className: 'cc-node cc-st-' + st + (sel ? ' cc-sel' : '') + (by ? ' cc-blocked' : '') + (visible(id) ? '' : ' cc-faded'),
        transform: 'translate(' + p.x + ',' + p.y + ')',
        'data-id': id,
        'data-kind': kind || undefined,
        onClick: (ev) => { ev.stopPropagation(); if (!cam.wasDrag()) onSelect(id); },
        onDoubleClick: () => { if (props.onOpen) props.onOpen(id); }
      },
      h('title', null, tip),
      h('rect', { className: 'cc-hit', x: 0, y: 0, width: p.w, height: p.h, rx: 6 }),
      sc === 1
        ? h(CC.StatusDot, { status: st, cx: 9, cy: p.h / 2, lane: lane })
        : h('g', { transform: 'translate(' + (9 * sc) + ',' + (p.h / 2) + ') scale(' + sc.toFixed(3) + ')' }, h(CC.StatusDot, { status: st, cx: 0, cy: 0, lane: lane })),
      kind ? (sc === 1 ? kindGlyph(kind, p.w)
        : h('g', { transform: 'translate(' + (p.w - 14 * sc) + ',' + (4 * sc) + ') scale(' + sc.toFixed(3) + ')' }, kindGlyph(kind, 14, 0))) : null,
      labelEl,
      showMeta && !small ? h('text', { className: 'cc-t-meta', x: tx, y: metaY }, metaLine(n, !!by, chars + 2 - (badge ? badge.length + 1 : 0))) : null,
      showMeta && !small && badge ? h('text', {
        className: 'cc-t-meta cc-check cc-check-' + counts.last, x: p.w - 6, y: metaY, textAnchor: 'end'
      }, badge) : null);
    });

    return h('div', {
      ref: cam.ref,
      className: 'cc-graph cc-flow',
      tabIndex: 0,
      role: 'group',
      'aria-label': 'Task flow. Arrow keys move along edges, F fits, 0 shows all.',
      onPointerDown: onPointerDown,
      onKeyDown: onKeyDown,
      onClick: () => { if (!cam.wasDrag() && props.deselectOnBackground) onSelect(null); }
    },
    nodes.length === 0
      ? h('div', { className: 'cc-meta', style: { padding: 16 } }, 'No tasks yet')
      : h('svg', { 'aria-hidden': 'false' },
        h('defs', null, marker(mid + '-a', 'cc-arrow'), marker(mid + '-as', 'cc-arrow-sel')),
        h('g', { transform: 'translate(' + (cam.x + shift) + ',' + cam.y + ') scale(' + K + ')' },
          h('g', { className: 'cc-edges' }, edgeEls),
          h('g', { className: 'cc-nodes' }, nodeEls))),
    nodes.length && offLeft ? h('button', { className: 'cc-pan cc-pan-l', type: 'button', 'aria-label': 'Scroll left', title: 'Scroll left',
      onPointerDown: (ev) => ev.stopPropagation(), onClick: (ev) => { ev.stopPropagation(); panBy(-1); } }, '\u2039') : null,
    nodes.length && offRight ? h('button', { className: 'cc-pan cc-pan-r', type: 'button', 'aria-label': 'Scroll right', title: 'Scroll right',
      onPointerDown: (ev) => ev.stopPropagation(), onClick: (ev) => { ev.stopPropagation(); panBy(1); } }, '\u203a') : null);
  }

  CC.FlowView = FlowView;
})(CC);

		// ── view_star.js
// view_star.js [views, C3] - constellation view (seeded cluster layout, frozen after one run).
// Props: {board:{nodes,edges|links}, filter, selected, onSelect, onOpen?, colorBy?, seed?, cameraKey?, labelBudget?,
//         labelMode?: 'budget'|'regions', edgeMode?: 'all'|'active'}
// Nodes may carry status (Create) or weight/provenance (Brain). Cluster = node.cluster | lane | kind.
// Dots and labels stay a constant screen size; only positions follow the camera.
// labelMode 'budget' (default, Brain): cluster names always; then selected, hovered and the
// heaviest nodes, greedily, rejecting any label that would collide. Zooming in raises the budget.
// labelMode 'regions' (Create): only region (cluster) names; a dot is labelled on hover or select.
// edgeMode 'active' (Create): only links into or out of ready/running tasks, plus the selected
// (and hovered) task's own links. Layout and camera always use every node and link, so neither
// filters nor status changes ever move a dot or the camera.
(function (CC) {
  'use strict';

  const BRIGHT = { explicit_user_statement: 1, user_reported_calibration: 0.72, vetted_source: 0.6, inherited_registry: 0.45, agent_synthesis: 0.42 };
  // Dot size also follows provenance, so low-provenance notes recede.
  const SIZE = { explicit_user_statement: 1, user_reported_calibration: 0.85, vetted_source: 0.75, inherited_registry: 0.7, agent_synthesis: 0.65 };
  const PROV_RANK = { explicit_user_statement: 5, user_reported_calibration: 4, vetted_source: 3, inherited_registry: 2, agent_synthesis: 1 };
  const LABEL_MAX = 28;
  const CHAR_W = 6.6; // 12 px system font, weight 500, generous average advance
  const LINE_H = 15;
  // Thin canvas-coloured halo so a label stays legible where it passes over dots or links.
  const HALO = { stroke: 'var(--cc-canvas)', strokeWidth: 4, strokeOpacity: 0.9, strokeLinejoin: 'round', paintOrder: 'stroke' };

  // Region names read as words, not ids: "ui" -> UI, "engine" -> Engine, "data_prep" -> Data Prep.
  // Only all-lowercase words are touched, so a name already cased by its author stays as written.
  const ACRONYMS = { ui: 1, ux: 1, api: 1, cli: 1, qa: 1, db: 1, id: 1, ci: 1, cd: 1, ai: 1, llm: 1, mcp: 1, sql: 1, http: 1, https: 1, url: 1, json: 1, pr: 1, os: 1, io: 1, css: 1, html: 1, js: 1, ide: 1, sdk: 1, ml: 1, gpu: 1, cpu: 1, ocr: 1, pdf: 1, csv: 1, yaml: 1, etf: 1 };
  function clusterLabel(key) {
    return String(key == null ? '' : key).replace(/_+/g, ' ').trim().split(/[ \t]+/).map((word) => word.split('-').map((w) => {
      if (!w || w !== w.toLowerCase()) return w;
      return ACRONYMS[w] ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    }).join('-')).join(' ');
  }

  // Fit-to-canvas (Create): the dots' layout units are scaled so the hulls span FILL of the canvas,
  // because the camera never zooms an automatic fit past 1:1 and a small project would sit in a
  // small patch of empty canvas. Dots, labels and hull padding stay constant screen size.
  // raw: {w,h} extent of the dot positions; view: {w,h} canvas. Never below 1 (large graphs keep the
  // camera's own shrink-to-fit), never above FILL_MAX; quantised so a few pixels of resize do not re-lay.
  const FILL = 0.85, HULL_PAD = 30, FILL_MAX = 2.5;
  function fillScale(raw, view) {
    let s = Infinity;
    if (raw.w > 1) s = Math.min(s, (FILL * view.w - 2 * HULL_PAD) / raw.w);
    if (raw.h > 1) s = Math.min(s, (FILL * view.h - 2 * HULL_PAD) / raw.h);
    if (!isFinite(s)) return 1;
    return Math.round(Math.max(1, Math.min(FILL_MAX, s)) * 20) / 20;
  }
  function scalePositions(pos, s) {
    if (s === 1) return pos;
    const out = {};
    Object.keys(pos).forEach((id) => { out[id] = { x: Math.round(pos[id].x * s * 100) / 100, y: Math.round(pos[id].y * s * 100) / 100 }; });
    return out;
  }

  function linkList(board) { return board.edges || board.links || []; }
  function ends(l) {
    if (Array.isArray(l)) return [String(l[0]), String(l[1])];
    const s = l.source != null ? l.source : (l.from != null ? l.from : l.src);
    const t = l.target != null ? l.target : (l.to != null ? l.to : l.dst);
    return [String(s && typeof s === 'object' ? s.id : s), String(t && typeof t === 'object' ? t.id : t)];
  }
  function dotRadius(n) {
    const w = Math.max(0, +n.weight || 1);
    const base = 2 + 1.5 * Math.min(3, Math.sqrt(w));
    const s = SIZE[n.provenance] == null ? 0.7 : SIZE[n.provenance];
    return Math.round(base * s * 100) / 100;
  }
  function dotOpacity(n) {
    if (n.brightness != null && isFinite(+n.brightness)) return Math.max(0.35, Math.min(1, +n.brightness));
    return BRIGHT[n.provenance] == null ? 0.6 : BRIGHT[n.provenance];
  }

  // Pure label planner (exported for tests). items: [{id, x, y, text, force?}] in screen
  // space, already in priority order. fixed: boxes that are always drawn (cluster names).
  // dots (optional): [{id, x, y}] screen positions of every dot; a label never covers another
  // note's dot (its own is exempt). Returns {id: {side: 1 | -1, text}} for labels to draw.
  function planLabels(items, fixed, budget, view, dots) {
    const boxes = (fixed || []).slice();
    const out = {};
    let used = 0;
    const DOT_PAD = 5; // a dot's radius plus a little air
    const hit = (b, selfId) => {
      for (let i = 0; i < boxes.length; i++) {
        const o = boxes[i];
        if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return true;
      }
      if (dots) {
        for (let j = 0; j < dots.length; j++) {
          const d = dots[j];
          if (d.id === selfId) continue;
          if (d.x + DOT_PAD > b.x0 && d.x - DOT_PAD < b.x1 && d.y + DOT_PAD > b.y0 && d.y - DOT_PAD < b.y1) return true;
        }
      }
      return false;
    };
    const boxFor = (it, side) => {
      const w = it.text.length * CHAR_W + 4;
      const x0 = side > 0 ? it.x + 9 : it.x - 9 - w;
      return { x0: x0, x1: x0 + w, y0: it.y - LINE_H / 2 - 1, y1: it.y + LINE_H / 2 + 1 };
    };
    const onScreen = (it) => !view || (it.x > -20 && it.x < view.w + 20 && it.y > -10 && it.y < view.h + 10);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.force && (used >= budget || !onScreen(it))) continue;
      const right = boxFor(it, 1);
      const left = boxFor(it, -1);
      const rightFits = !view || right.x1 < view.w;
      let pick = null, side = 1;
      if (rightFits && !hit(right, it.id)) pick = right;
      else if (!hit(left, it.id)) { pick = left; side = -1; }
      else if (it.force) pick = right;
      if (!pick) continue;
      boxes.push(pick);
      out[it.id] = { side: side, text: it.text };
      if (!it.force) used++;
    }
    return out;
  }

  function StarView(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const board = props.board || {};
    const nodes = board.nodes || [];
    const links = linkList(board);
    const filter = props.filter || 'all';
    const selected = props.selected == null ? null : String(props.selected);
    const onSelect = props.onSelect || function () {};
    const seed = props.seed == null ? 7 : props.seed;
    const regions = props.labelMode === 'regions';
    const activeEdges = props.edgeMode === 'active';
    const labelBudget = regions ? 0 : (props.labelBudget == null ? 12 : props.labelBudget);
    const colorBy = props.colorBy || 'status';
    const fill = props.fill == null ? regions : !!props.fill; // Create fits the hulls to the canvas

    const key = nodes.map((n) => n.id + ':' + CC.clusterOf(n) + ':' + (+n.weight || 1)).join('|') + '#' +
      links.map((l) => ends(l).join('>')).join('|') + '#' + seed;
    // The canvas size is read here (before the camera exists) so the fit scale can shape the bounds
    // the camera fits; it is re-read after mount and on every resize.
    const holder = React.useRef(null);
    const resized = React.useState(0);
    let vw = 800, vh = 480;
    if (holder.current && holder.current.getBoundingClientRect) {
      const r = holder.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { vw = Math.round(r.width); vh = Math.round(r.height); }
    }
    const raw = React.useMemo(() => CC.layoutStar(nodes, links, seed), [key]);
    const rawExtent = React.useMemo(() => CC.starBounds(raw, 0), [key]);
    const fitS = fill ? fillScale(rawExtent, { w: vw, h: vh }) : 1;
    const pos = React.useMemo(() => scalePositions(raw, fitS), [key, fitS]);
    const hulls = React.useMemo(() => CC.clusterHulls(nodes, pos), [key, fitS]);
    const bounds = React.useMemo(() => CC.starBounds(pos, fill ? HULL_PAD : 60), [key, fitS]);
    const degree = React.useMemo(() => {
      const d = {};
      links.forEach((l) => { const e = ends(l); d[e[0]] = (d[e[0]] || 0) + 1; d[e[1]] = (d[e[1]] || 0) + 1; });
      return d;
    }, [key]);
    const cam = CC.useCamera(bounds, props.cameraKey);
    const setRef = React.useCallback((el) => { holder.current = el; if (cam.ref) cam.ref.current = el; }, []);
    // The size this render was laid out for; the resize check below outlives the render it was made in.
    const drawn = React.useRef('');
    drawn.current = vw + 'x' + vh;
    (React.useLayoutEffect || React.useEffect)(() => {
      const el = holder.current;
      if (!fill || !el) return undefined;
      let last = '';
      const check = () => {
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        const sig = r ? Math.round(r.width) + 'x' + Math.round(r.height) : '';
        if (sig !== last) { last = sig; if (sig !== drawn.current) resized[1]((t) => t + 1); }
      };
      check();
      if (typeof ResizeObserver === 'undefined') return undefined;
      const ro = new ResizeObserver(check);
      ro.observe(el);
      return () => ro.disconnect();
    }, [fill]);
    const hov = React.useState(null);
    const hovered = hov[0];

    const byId = {};
    const clusterOfId = {};
    nodes.forEach((n) => { byId[String(n.id)] = n; clusterOfId[String(n.id)] = CC.clusterOf(n); });
    const visible = (id) => byId[id] && CC.matchesFilter(byId[id], filter);
    const sx = (x) => x * cam.k + cam.x;
    const sy = (y) => y * cam.k + cam.y;
    const pad = Math.max(10, 30 * cam.k);

    // Viewport and the zoom an automatic fit would use; the budget grows with zoom past it.
    let view = { w: 800, h: 480 };
    const el = cam.ref && cam.ref.current;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) view = { w: r.width, h: r.height };
    }
    const fitK = Math.max(0.1, Math.min(1, (view.w - 48) / Math.max(1, bounds.w), (view.h - 48) / Math.max(1, bounds.h)));
    const zoomGain = Math.max(1, cam.k / fitK);
    const budget = Math.round(labelBudget * zoomGain * zoomGain);

    const multi = hulls.length > 1;
    const named = multi || (regions && hulls.length > 0); // regions mode names even a lone region
    const hullEls = multi ? hulls.map((c) => {
      const pts = c.points.map((p) => sx(p[0]) + ' ' + sy(p[1]));
      return h('path', { key: c.key, className: 'cc-hull', strokeWidth: 2 * pad, d: 'M' + pts.join('L') + 'Z' });
    }) : [];
    const clusterBoxes = [];
    const clusterLabels = named ? hulls.map((c) => {
      // Review 2 (regions): the lane name sits on its hull's top edge, inside the band when the
      // band is tall enough, else touching it from above - never floating over empty canvas.
      const x = sx(c.cx), y = regions ? (pad >= 18 ? sy(c.top) - pad + 12 : sy(c.top) - pad - 3) : sy(c.top) - pad - 6;
      const name = clusterLabel(c.key);
      const w = name.length * 6.4 + 8;
      clusterBoxes.push({ x0: x - w / 2, x1: x + w / 2, y0: y - 12, y1: y + 4 });
      return h('text', { key: 'l' + c.key, className: 'cc-t-cluster', textAnchor: 'middle', x: x, y: y }, name);
    }) : [];

    // Label candidates in priority order: selected, then weight, provenance, degree. The
    // hovered label is drawn on top separately, so hovering never reshuffles the others.
    const rank = nodes.filter((n) => pos[String(n.id)]).map((n) => String(n.id));
    const score = (id) => {
      const n = byId[id];
      return (Math.max(0, +n.weight || 1)) * 10 + (PROV_RANK[n.provenance] || 0) + Math.min(4, Math.log2(1 + (degree[id] || 0)));
    };
    rank.sort((a, b) => (score(b) - score(a)) || (a < b ? -1 : a > b ? 1 : 0));
    const labelOf = (id) => { const n = byId[id]; return String(n.title || n.label || id); };
    const items = [];
    const pushItem = (id, force, full) => {
      if (!id || !pos[id] || !byId[id]) return;
      const t = labelOf(id);
      items.push({ id: id, x: sx(pos[id].x), y: sy(pos[id].y), text: full ? t : CC.truncate(t, LABEL_MAX), force: force });
    };
    pushItem(selected, true, false);
    rank.forEach((id) => { if (id !== selected && visible(id)) pushItem(id, false, false); });
    const dotPts = rank.map((id) => ({ id: id, x: sx(pos[id].x), y: sy(pos[id].y) }));
    const labels = planLabels(items, clusterBoxes, budget, view, dotPts);

    const near = (id) => id === selected || id === hovered;
    const hot = (id) => { const st = byId[id] ? CC.statusOf(byId[id]) : null; return st === 'ready' || st === 'running'; };
    const linkEls = links.map((l, i) => {
      const e = ends(l);
      const a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) return null;
      const sel = near(e[0]) || near(e[1]);
      if (activeEdges && !sel && !hot(e[0]) && !hot(e[1])) return null;
      const faded = !(visible(e[0]) && visible(e[1]));
      const across = clusterOfId[e[0]] !== clusterOfId[e[1]];
      return h('line', {
        key: i, 'data-edge': e[0] + '>' + e[1], x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y),
        // Review 2 (regions): links between lanes draw in the quiet line colour at full alpha.
        strokeOpacity: sel ? 1 : (across ? (regions ? 1 : 0.2) : 0.55),
        style: regions && across && !sel ? { stroke: 'var(--cc-line)', opacity: faded ? undefined : 1 } : undefined,
        className: 'cc-link' + (sel ? ' cc-edge-sel' : '') + (regions && across ? ' cc-link-x' : '') + (faded ? ' cc-faded' : '')
      });
    });

    const nodeEls = nodes.map((n) => {
      const id = String(n.id);
      const p = pos[id];
      if (!p) return null;
      const sel = id === selected;
      const hasStatus = n.status != null || n.display_status != null;
      const lane = colorBy === 'lane' ? CC.laneIndex(n.lane || n.pool || CC.clusterOf(n)) : null;
      const lab = labels[id];
      const title = labelOf(id);
      const claim = n.claim && n.claim.by ? ' · ' + n.claim.by + (n.claim.stale ? ' (stale claim)' : ' working on it') : '';
      return h('g', {
        key: id,
        className: 'cc-node' + (sel ? ' cc-sel' : '') + (visible(id) ? '' : ' cc-faded'),
        transform: 'translate(' + sx(p.x) + ',' + sy(p.y) + ')',
        'data-id': id,
        onClick: (ev) => { ev.stopPropagation(); if (!cam.wasDrag()) onSelect(id); },
        onDoubleClick: () => { if (props.onOpen) props.onOpen(id); },
        onMouseEnter: () => hov[1](id),
        onMouseLeave: () => hov[1]((cur) => (cur === id ? null : cur))
      },
      h('title', null, title + (hasStatus ? ' — ' + CC.statusLabel(CC.statusOf(n)) : '') + claim),
      h('circle', { className: 'cc-hit', r: 10 }),
      hasStatus
        ? h(CC.StatusDot, { status: CC.statusOf(n), lane: lane })
        : h(CC.StatusDot, { status: 'plain', r: dotRadius(n), opacity: dotOpacity(n) }),
      sel ? h('circle', { className: 'cc-s-accent', r: 10.5 }) : null,
      lab && !near(id) ? h('text', Object.assign({ className: 'cc-t-label', x: lab.side > 0 ? 10 : -10, y: 4, textAnchor: lab.side > 0 ? 'start' : 'end' }, HALO), lab.text) : null);
    });

    // Selected and hovered labels sit on top of everything, with a canvas-coloured halo.
    const topIds = [];
    if (selected && pos[selected] && byId[selected] && selected !== hovered) topIds.push(selected);
    if (hovered && pos[hovered] && byId[hovered]) topIds.push(hovered);
    const topEls = topIds.map((id) => {
      const full = id === hovered || regions; // regions mode: the only dot label, so in full
      const text = full ? labelOf(id) : (labels[id] ? labels[id].text : CC.truncate(labelOf(id), LABEL_MAX));
      const px = sx(pos[id].x);
      const tooWide = px + 10 + text.length * CHAR_W > view.w && px - 10 - text.length * CHAR_W > 0;
      const side = !full && labels[id] ? labels[id].side : (tooWide ? -1 : 1);
      return h('text', {
        key: 'top-' + id, className: 'cc-t-label', pointerEvents: 'none', textAnchor: side > 0 ? 'start' : 'end',
        x: px + (side > 0 ? 10 : -10), y: sy(pos[id].y) + 4,
        stroke: HALO.stroke, strokeWidth: 4, strokeLinejoin: 'round', paintOrder: 'stroke'
      }, text);
    });

    function onKeyDown(e) {
      if (cam.onKeyDown(e)) return;
      if (e.key === 'Escape') onSelect(null);
      if (e.key === 'Enter' && selected) { e.preventDefault(); (props.onOpen || onSelect)(selected); }
    }

    return h('div', {
      ref: setRef,
      className: 'cc-graph cc-star',
      tabIndex: 0,
      role: 'group',
      'aria-label': 'Constellation. Drag to pan, scroll to zoom, F fits.',
      onPointerDown: cam.onPointerDown,
      onKeyDown: onKeyDown
    },
    nodes.length === 0
      ? h('div', { className: 'cc-meta', style: { padding: 16 } }, 'Nothing to show yet')
      : h('svg', null,
        h('g', { className: 'cc-hulls' }, hullEls),
        h('g', { className: 'cc-links' }, linkEls),
        h('g', { className: 'cc-cluster-labels' }, clusterLabels),
        h('g', { className: 'cc-nodes' }, nodeEls),
        h('g', { className: 'cc-top-labels', 'aria-hidden': 'true' }, topEls)));
  }

  CC.StarView = StarView;
  CC.clusterLabel = clusterLabel;
  CC.starFillScale = fillScale;
  CC.planStarLabels = planLabels;
  CC.starDotRadius = dotRadius;
})(CC);

		// ── view_waves.js
// view_waves.js [views, C4] - dispatch list batched into waves; auto-scrolls to the current wave.
// Props: {board:{nodes,edges}, filter, selected, onSelect, onOpen?, colorBy?}
// Current wave = lowest wave with an unfinished node. The list scrolls only when that changes,
// so the user's own scrolling is never fought.
(function (CC) {
  'use strict';

  function WavesView(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const board = props.board || {};
    const nodes = board.nodes || [];
    const filter = props.filter || 'all';
    const selected = props.selected == null ? null : String(props.selected);
    const onSelect = props.onSelect || function () {};
    const colorBy = props.colorBy || 'status';

    const g = React.useMemo(() => CC.groupWaves(nodes), [nodes]);
    const scroller = React.useRef(null);
    const sections = React.useRef({});

    React.useEffect(() => {
      const box = scroller.current;
      const target = g.current == null ? null : sections.current[g.current];
      if (!box || !target || typeof box.scrollTo !== 'function') return;
      box.scrollTo({ top: Math.max(0, target.offsetTop - 4), behavior: CC.prefersReducedMotion() ? 'auto' : 'smooth' });
    }, [g.current]);

    function onKeyDown(e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const box = scroller.current;
      if (!box || !box.querySelectorAll) return;
      const rows = Array.prototype.slice.call(box.querySelectorAll('.cc-row'));
      const i = rows.indexOf(typeof document !== 'undefined' ? document.activeElement : null);
      const next = rows[i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); }
    }

    const groups = g.waves.map((w) => {
      const rows = w.nodes.filter((n) => CC.matchesFilter(n, filter));
      if (!rows.length) return null;
      const isCur = w.wave === g.current;
      return h('section', {
        key: w.wave,
        className: 'cc-wave' + (isCur ? ' cc-wave-cur' : ''),
        ref: (el) => { if (el) sections.current[w.wave] = el; else delete sections.current[w.wave]; },
        'aria-label': 'Wave ' + (w.wave + 1),
        'aria-current': isCur ? 'step' : undefined
      },
      h('div', { className: 'cc-wave-h' },
        h('span', null, 'Wave ' + (w.wave + 1)),
        h('span', { className: 'cc-meta', style: { fontVariantNumeric: 'tabular-nums' } }, w.done + ' of ' + w.total + ' done'),
        h('span', { className: 'cc-wave-bar', 'aria-hidden': 'true',
          style: { alignSelf: 'center', width: 48, height: 3, borderRadius: 2, background: 'var(--cc-line-strong)', overflow: 'hidden', flex: 'none' } },
          h('span', { style: { display: 'block', height: '100%', width: (w.total ? Math.round(100 * w.done / w.total) : 0) + '%', background: 'var(--cc-done)' } })),
        isCur ? h('span', { className: 'cc-wave-tag' }, 'Current') : null),
      h('ul', { className: 'cc-rows' }, rows.map((n) => {
        const id = String(n.id);
        const st = CC.statusOf(n);
        const lane = colorBy === 'lane' ? CC.laneIndex(n.lane || n.pool) : null;
        return h('li', { key: id },
          h('button', {
            type: 'button',
            className: 'cc-row' + (id === selected ? ' cc-sel' : ''),
            'aria-current': id === selected ? 'true' : undefined,
            'data-id': id,
            onClick: () => onSelect(id),
            onDoubleClick: () => { if (props.onOpen) props.onOpen(id); }
          },
          h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18', 'aria-hidden': 'true' },
            h(CC.StatusDot, { status: st, lane: lane })),
          h('span', { className: 'cc-row-t' }, n.title || id),
          h('span', { className: 'cc-row-m' }, [id, CC.statusLabel(st), (CC.isCodeNode ? CC.isCodeNode(n) : n.kind === 'code') ? 'Code' : n.model].filter(Boolean).join(' · '))));
      })));
    });

    return h('div', {
      ref: scroller,
      className: 'cc-waves',
      role: 'region',
      'aria-label': 'Dispatch waves',
      onKeyDown: onKeyDown
    }, nodes.length ? groups : h('div', { className: 'cc-meta', style: { padding: 16 } }, 'No tasks yet'));
  }

  CC.WavesView = WavesView;
})(CC);

		// ── inputs.js
// inputs.js [views, C6] - Likert and "select all that apply" inputs, usable on any surface.
// Nothing is ever preselected: option flags such as recommended/checked/selected are ignored.
//   CC.Likert({scale, value, onChange, labels, ariaLabel, disabled})
//     scale: N (>= 2), values 1..N ascending. labels: [low, high] | {low, high} | N per-option labels.
//   CC.SelectAll({options, value, onChange, ariaLabel, disabled})
//     options: ['a', ...] | [{value, label, hint}]. value: array of selected values (default []).
// Both work controlled (value given) or uncontrolled (internal state, starts empty).
(function (CC) {
  'use strict';

  function endLabels(labels, n) {
    if (!labels) return { low: null, high: null, each: null };
    if (Array.isArray(labels)) {
      if (labels.length === n && n > 2) return { low: labels[0], high: labels[n - 1], each: labels };
      return { low: labels[0] == null ? null : labels[0], high: labels[labels.length - 1] == null ? null : labels[labels.length - 1], each: null };
    }
    return { low: labels.low != null ? labels.low : labels.min, high: labels.high != null ? labels.high : labels.max, each: null };
  }

  function Likert(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const n = Math.max(2, Math.floor(+props.scale || 5));
    const controlled = props.value !== undefined;
    const st = React.useState(null);
    const value = controlled ? props.value : st[0];
    const refs = React.useRef([]);
    const lab = endLabels(props.labels, n);
    const disabled = !!props.disabled;

    function choose(v) {
      if (disabled) return;
      if (!controlled) st[1](v);
      if (props.onChange) props.onChange(v);
    }
    function onKeyDown(e, i) {
      let t = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') t = Math.min(n - 1, i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') t = Math.max(0, i - 1);
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = n - 1;
      else if (e.key === ' ' || e.key === 'Enter') t = i;
      if (t == null) return;
      e.preventDefault();
      choose(t + 1);
      const el = refs.current[t];
      if (el && el.focus) el.focus();
    }
    const focusIndex = value != null && value >= 1 && value <= n ? value - 1 : 0;
    const opts = [];
    for (let i = 0; i < n; i++) {
      const v = i + 1;
      const extra = lab.each ? lab.each[i] : (i === 0 ? lab.low : (i === n - 1 ? lab.high : null));
      opts.push(h('button', {
        key: v,
        type: 'button',
        role: 'radio',
        className: 'cc-likert-opt cc-num',
        'aria-checked': value === v ? 'true' : 'false',
        'aria-label': v + ' of ' + n + (extra ? ', ' + extra : ''),
        tabIndex: i === focusIndex ? 0 : -1,
        disabled: disabled,
        ref: (el) => { refs.current[i] = el; },
        onClick: () => choose(v),
        onKeyDown: (e) => onKeyDown(e, i)
      }, String(v)));
    }
    return h('div', { className: 'cc-likert' },
      h('div', { className: 'cc-likert-row', role: 'radiogroup', 'aria-label': props.ariaLabel || 'Rating, 1 to ' + n }, opts),
      lab.low != null || lab.high != null
        ? h('div', { className: 'cc-likert-ends', 'aria-hidden': 'true' },
          h('span', null, lab.low != null ? '1 · ' + lab.low : ''),
          h('span', null, lab.high != null ? lab.high + ' · ' + n : ''))
        : null);
  }

  function normOptions(options) {
    return (options || []).map((o) => {
      if (o != null && typeof o === 'object') {
        const v = o.value != null ? o.value : o.id;
        return { value: String(v), label: o.label != null ? String(o.label) : String(v), hint: o.hint || null };
      }
      return { value: String(o), label: String(o), hint: null };
    });
  }

  function SelectAll(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const opts = normOptions(props.options);
    const controlled = props.value !== undefined;
    const st = React.useState([]);
    const raw = (controlled ? props.value : st[0]) || [];
    const chosen = {};
    raw.forEach((v) => { chosen[String(v)] = true; });
    const count = opts.filter((o) => chosen[o.value]).length;
    const disabled = !!props.disabled;

    function commit(map) {
      if (disabled) return;
      const next = opts.filter((o) => map[o.value]).map((o) => o.value);
      if (!controlled) st[1](next);
      if (props.onChange) props.onChange(next);
    }
    function toggle(v) {
      const m = Object.assign({}, chosen);
      if (m[v]) delete m[v]; else m[v] = true;
      commit(m);
    }
    function all() {
      const m = {};
      opts.forEach((o) => { m[o.value] = true; });
      commit(m);
    }

    return h('div', { className: 'cc-select', role: 'group', 'aria-label': props.ariaLabel || 'Select all that apply' },
      h('div', { className: 'cc-select-bar' },
        h('button', { type: 'button', className: 'cc-btn', disabled: disabled || count === opts.length || !opts.length, onClick: all }, 'Select all'),
        h('button', { type: 'button', className: 'cc-btn', disabled: disabled || count === 0, onClick: () => commit({}) }, 'Clear'),
        h('span', { className: 'cc-meta cc-num', 'aria-live': 'polite' }, count + ' of ' + opts.length + ' selected')),
      opts.map((o) => h('label', { key: o.value, className: 'cc-check' },
        h('input', {
          type: 'checkbox',
          value: o.value,
          checked: !!chosen[o.value],
          disabled: disabled,
          onChange: () => toggle(o.value)
        }),
        h('span', null, o.label),
        o.hint ? h('span', { className: 'cc-check-hint' }, o.hint) : null)));
  }

  CC.Likert = Likert;
  CC.SelectAll = SelectAll;
})(CC);

		// ── api.js
(function (CC) {
  var BASE = 'http://127.0.0.1:8751';

  function request(method, path, body) {
    var init = { method: method, headers: {} };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return fetch(BASE + path, init).then(null, function (err) {
      // No answer at all (not an HTTP error): Core is not running. Mark it so the header chip shows.
      try { if (CC.coreLost) CC.coreLost(); } catch (e) { /* status only */ }
      throw err;
    }).then(function (resp) {
      // Any answer means Core is up; a stale 'down' re-checks at once instead of waiting.
      try { if (CC.core && CC.core.state === 'down' && CC.coreCheck) CC.coreCheck(); } catch (e) { /* status only */ }
      return resp.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = { error: text }; }
        if (!resp.ok) {
          var err = new Error((data && data.error) || ('HTTP ' + resp.status));
          err.status = resp.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  // Subscribers share one EventSource; it reconnects on its own after an engine restart.
  var source = null;
  var listeners = new Set();
  function subscribe(fn) {
    listeners.add(fn);
    if (!source && typeof EventSource !== 'undefined') {
      source = new EventSource(BASE + '/api/stream');
      ['state', 'run', 'pool', 'question', 'agent', 'planner', 'sprint', 'deep_plan', 'toggles', 'sync', 'todo'].forEach(function (kind) {
        source.addEventListener(kind, function (ev) {
          var data = null;
          try { data = JSON.parse(ev.data); } catch (e) { return; }
          listeners.forEach(function (l) { l(kind, data); });
        });
      });
    }
    return function () {
      listeners.delete(fn);
      if (!listeners.size && source) { source.close(); source = null; }
    };
  }

  // The board endpoint packs nodes as rows under `fields` to stay small; views want objects.
  CC.unpackBoard = function (board) {
    if (!board || !board.fields || !board.nodes || !Array.isArray(board.nodes[0])) return board;
    var fields = board.fields;
    var nodes = board.nodes.map(function (row) {
      var n = {};
      // A short row leaves off trailing nulls (e.g. `checks` for a check that never ran).
      fields.forEach(function (f, i) { n[f] = i < row.length ? row[i] : null; });
      return n;
    });
    return Object.assign({}, board, { nodes: nodes });
  };

  CC.api = {
    base: BASE,
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body || {}); },
    subscribe: subscribe
  };

  // ---- Core link and API pin ------------------------------------------------------------------
  // This plugin speaks Waypoint Core API 1. GET /health answers {api, api_version, version, ...};
  // an answer without `api` is an older Core and counts as API 1. State: 'checking' until the first
  // answer, then 'ok', 'down' (no answer) or 'mismatch' (a different API). While not ok it checks
  // again every 10 s, quietly (no console lines), and stops once ok. A failed request elsewhere
  // (network error, no HTTP status) marks Core down and starts the same quiet retry.
  CC.CORE_API = 1;
  var RETRY_MS = 10000;
  CC.core = { state: 'checking', api: null, apiVersion: null, version: null };
  var coreListeners = new Set();
  var coreTimer = null;
  var coreBusy = false;
  function setCore(next) {
    var cur = CC.core;
    if (cur.state === next.state && cur.api === next.api && cur.version === next.version && cur.apiVersion === next.apiVersion) return;
    CC.core = next;
    coreListeners.forEach(function (l) { try { l(next); } catch (e) { /* a listener never breaks the link */ } });
  }
  function readHealth(data) {
    var api = data && typeof data.api === 'number' && isFinite(data.api) ? data.api : 1;
    return {
      state: api === CC.CORE_API ? 'ok' : 'mismatch', api: api,
      apiVersion: (data && data.api_version) ? String(data.api_version) : null,
      version: (data && data.version) ? String(data.version) : null,
      // Optional: the folder new chats start in (workspace_hide.js), when Core is configured with one.
      home: (data && typeof data.home_workspace === 'string' && data.home_workspace) ? data.home_workspace : null
    };
  }
  function scheduleCore() {
    if (coreTimer || CC.core.state === 'ok' || typeof setTimeout !== 'function') return;
    coreTimer = setTimeout(function () { coreTimer = null; checkCore(); }, RETRY_MS);
  }
  function checkCore() {
    if (coreBusy) return Promise.resolve(CC.core);
    if (typeof fetch !== 'function') return Promise.resolve(CC.core);
    coreBusy = true;
    var p;
    // 2.0: the header's link light is the Waypoint server (wpc_client.js, 8762); the 8751 engine is retired.
    var healthUrl = (CC.wpc && CC.wpc.base ? CC.wpc.base : BASE) + '/health';
    try { p = fetch(healthUrl, { method: 'GET' }); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).then(function (resp) {
      if (!resp || !resp.ok) throw new Error('health ' + (resp && resp.status));
      return resp.json();
    }).then(function (data) {
      setCore(readHealth(data));
    }, function () {
      setCore({ state: 'down', api: null, apiVersion: null, version: null });
    }).then(function () {
      coreBusy = false;
      scheduleCore();
      return CC.core;
    });
  }
  function coreLost() {
    if (CC.core.state !== 'ok') return;
    setCore({ state: 'down', api: null, apiVersion: null, version: null });
    scheduleCore();
  }
  var started = false;
  CC.coreStart = function () { if (started) return; started = true; checkCore(); };
  CC.coreCheck = checkCore;
  CC.coreSubscribe = function (fn) { coreListeners.add(fn); return function () { coreListeners.delete(fn); }; };
  CC.coreRead = readHealth;
  CC.coreLost = coreLost;
  // Hook: the current Core link, re-rendering on change. Starts the first check if nobody has.
  CC.useCore = function () {
    var React = CC.React;
    var st = React.useState(CC.core), core = st[0], setCoreState = st[1];
    React.useEffect(function () {
      CC.coreStart();
      if (CC.core !== core) setCoreState(CC.core);
      return CC.coreSubscribe(function (c) { setCoreState(c); });
    }, []);
    return core;
  };

  // Hook: fetch a path once and refetch whenever the engine reports a change of the given kinds.
  CC.useEngine = function (path, kinds) {
    var React = CC.React;
    var st = React.useState({ data: null, error: null, loading: true });
    var state = st[0], setState = st[1];
    var watch = (kinds || ['state']).join(',');
    React.useEffect(function () {
      if (!path) return undefined;
      var alive = true;
      function load() {
        CC.api.get(path).then(function (data) {
          if (alive) setState({ data: data, error: null, loading: false });
        }, function (error) {
          if (alive) setState(function (prev) { return { data: prev.data, error: error, loading: false }; });
        });
      }
      load();
      var off = CC.api.subscribe(function (kind) { if (watch.indexOf(kind) >= 0) load(); });
      var retry = setInterval(function () { if (alive) load(); }, 30000);
      return function () { alive = false; off(); clearInterval(retry); };
    }, [path, watch]);
    return state;
  };
})(CC);

		// ── wpc_client.js
// wpc_client.js - CC.wpc: the one client every Waypoint tab uses to reach the plugin server
// (runner/waypoint_runner/wpc_http.py, 127.0.0.1:8762). The server runs the Waypoint tools over the data folder;
// the tabs never read files or the retired 8751 engine.
//   CC.wpc.read(tool, input)          -> payload (throws on a refusal or when the server is down)
//   CC.wpc.act(tool, input, refresh)  -> payload; then every tab watching a tool in `refresh` reads again
//   CC.wpc.features()                 -> {tools, addons, data_dir} (cached; which tabs and add-ons exist)
//   CC.useWpc(tool, input, opts)      -> {data, error, loading, reload}: read now, every opts.every ms, after acts
//   CC.WpcProblem({error})            -> the calm empty state for "server down" or "refused"
(function (CC) {
  'use strict';
  var BASE = 'http://127.0.0.1:8762';
  var EVERY = 15000;
  var listeners = new Set();
  var featuresP = null;

  function fail(code, message) { var e = new Error(message); e.code = code; return e; }

  function call(tool, input) {
    var f = (CC.fetch || (typeof fetch === 'function' ? fetch : null));
    if (!f) return Promise.reject(fail('no_fetch', 'This page cannot make requests.'));
    return Promise.resolve().then(function () {
      return f(BASE + '/api/wpc/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool, input: input || {} })
      });
    }).then(function (resp) {
      return resp.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!resp.ok) throw fail((data && data.error) || 'http_' + resp.status, (data && (data.detail || data.error)) || 'HTTP ' + resp.status);
        if (!data) throw fail('bad_answer', 'The Waypoint server gave no answer.');
        return data;
      });
    }, function (err) {
      if (err && err.code) throw err;
      throw fail('server_down', 'The Waypoint server is not running.');
    });
  }

  function unwrap(r) {
    if (r.isError) throw fail((r.payload && r.payload.error) || 'refused', (r.payload && r.payload.message) || 'Refused.');
    return r.payload;
  }

  function changed(tools) {
    var list = [].concat(tools || []);
    listeners.forEach(function (l) { try { l(list); } catch (e) { /* one tab must not stop the others */ } });
  }

  function features() {
    if (!featuresP) {
      var f = (CC.fetch || (typeof fetch === 'function' ? fetch : null));
      featuresP = Promise.resolve().then(function () { return f(BASE + '/api/wpc/features'); })
        .then(function (r) { if (!r.ok) throw fail('http_' + r.status, 'HTTP ' + r.status); return r.json(); })
        .then(null, function (err) { featuresP = null; throw err && err.code ? err : fail('server_down', 'The Waypoint server is not running.'); });
    }
    return featuresP;
  }

  CC.wpc = {
    base: BASE,
    call: call,
    read: function (tool, input) { return call(tool, input).then(unwrap); },
    act: function (tool, input, refresh) {
      return call(tool, input).then(unwrap).then(function (payload) { changed(refresh || [tool]); return payload; });
    },
    features: features,
    changed: changed,
    listen: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
    _reset: function () { featuresP = null; listeners.clear(); }
  };

  CC.useWpc = function (tool, input, opts) {
    var React = CC.React;
    var key = tool + ' ' + JSON.stringify(input || {});
    var st = React.useState({ data: null, error: null, loading: !!tool });
    var state = st[0], setState = st[1];
    var tick = React.useState(0);
    var reload = function () { tick[1](function (n) { return n + 1; }); };
    var every = (opts && opts.every) || EVERY;
    React.useEffect(function () {
      if (!tool) return undefined;
      var alive = true, busy = false, again = false;
      // One request at a time: a slow read (a large preferences registry) must not pile up behind the timer.
      // A refresh asked for while one runs is done once, right after it.
      function load() {
        if (busy) { again = true; return; }
        busy = true;
        CC.wpc.read(tool, input).then(function (data) {
          if (alive) setState({ data: data, error: null, loading: false });
        }, function (error) {
          // Keep the last good data on screen; the error shows beside it.
          if (alive) setState(function (prev) { return { data: prev.data, error: error, loading: false }; });
        }).then(function () { busy = false; if (again && alive) { again = false; load(); } });
      }
      load();
      var off = CC.wpc.listen(function (tools) { if (tools.indexOf(tool) >= 0 || tools.indexOf('*') >= 0) load(); });
      var timer = setInterval(load, every);
      var vis = function () { if (typeof document !== 'undefined' && document.visibilityState === 'visible') load(); };
      if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', vis);
      return function () {
        alive = false; off(); clearInterval(timer);
        if (typeof document !== 'undefined' && document.removeEventListener) document.removeEventListener('visibilitychange', vis);
      };
    }, [key, every, tick[0]]);
    return { data: state.data, error: state.error, loading: state.loading, reload: reload };
  };

  CC.useWpcFeatures = function () {
    var React = CC.React;
    var st = React.useState(null);
    React.useEffect(function () {
      var alive = true;
      CC.wpc.features().then(function (f) { if (alive) st[1](f); }, function () { if (alive) st[1](null); });
      return function () { alive = false; };
    }, []);
    return st[0];
  };

  CC.WpcProblem = function WpcProblem(p) {
    var e = (p && p.error) || {};
    if (e.code === 'server_down') {
      return CC.ui.Empty({ title: 'The Waypoint server is not running',
        body: ['Start it with ', CC.h('code', { key: 'c' }, 'python -m waypoint_runner.wpc_http'),
          ' (the installer can start it with dsh). It reads your Waypoint data folder.'] });
    }
    if (e.code === 'addon_off') {
      return CC.ui.Empty({ title: 'This add-on is off', body: 'Turn it on in Settings, under Add-ons.' });
    }
    return CC.ui.Empty({ title: 'Waypoint could not answer', body: e.message || String(e.code || 'error') });
  };
})(CC);

		// ── toggles.js
(function (CC) {
  // One switch per agent, route and model (engine: cc_engine/toggles.py, GET /api/toggles).
  // CC.isEnabled(id) answers everywhere in the plugin; CC.toggles holds the state, fetched once and
  // refreshed on the SSE 'toggles' event. A switched-off item is greyed out with CC.toggles.GREY
  // and never offered as a subagent. Before the first answer (or with the engine down) the engine's
  // defaults apply: Codex off, everything else on.
  var GREY = 'cc-greyed';
  var PREFIXES = ['route', 'runner', 'agent', 'manual', 'pool'];
  var CASCADE = ['subagent', 'agent', 'manual'];
  // Mirrors toggles.GROUPS aliases (the server's map replaces it once loaded).
  var GROUP_ALIASES = {
    claude_code: ['claude', 'claude_max'],
    codex: ['codex_cli', 'delegate_codex_metered_subagent'],
    freebuff: ['deepseek'],
    antigravity_manual: ['antigravity', 'agy', 'agy_cli'],
    gemini_studio: ['gemini'],
    groq: [],
    copilot: ['github_copilot', 'gh_copilot'],
    deepseek_dsh: ['dsh'],
    gemini_app: [],
    chatgpt_web: ['chatgpt'],
    manual: []
  };
  var PROVIDER_GROUP = { anthropic: 'claude_code', 'openai-codex': 'codex', freebuff: 'freebuff',
    google: 'gemini_studio', groq: 'groq', antigravity: 'antigravity_manual', 'github-copilot': 'copilot' };
  var LOCAL_ALIASES = {};
  Object.keys(GROUP_ALIASES).forEach(function (g) {
    GROUP_ALIASES[g].forEach(function (a) { LOCAL_ALIASES[a] = g; });
  });
  LOCAL_ALIASES['runner:claude'] = 'claude_code';
  LOCAL_ALIASES['runner:gemini'] = 'gemini_studio';
  LOCAL_ALIASES['runner:antigravity'] = 'antigravity_manual';
  LOCAL_ALIASES['runner:dsh'] = 'deepseek_dsh';

  var state = { loaded: false, error: null, addons: {}, enabled: {}, aliases: {}, defaultsOff: ['codex'], cascade: CASCADE.slice(), rows: [] };
  var listeners = new Set();
  var started = false;

  function groups() { return GROUP_ALIASES; }
  function alias(name) {
    if (Object.prototype.hasOwnProperty.call(state.aliases, name)) return state.aliases[name];
    if (Object.prototype.hasOwnProperty.call(LOCAL_ALIASES, name)) return LOCAL_ALIASES[name];
    return null;
  }
  function canonical(id) {
    var s = String(id == null ? '' : id).trim();
    var low = s.toLowerCase();
    if (groups()[low]) return low;
    var a = alias(low);
    if (a) return a;
    var i = low.indexOf(':');
    if (i > 0 && PREFIXES.indexOf(low.slice(0, i)) >= 0 && low.indexOf('/') < 0) {
      var rest = low.slice(i + 1);
      if (groups()[rest]) return rest;
      if (alias(rest)) return alias(rest);
      if (alias('runner:' + rest)) return alias('runner:' + rest);
    }
    return s;
  }
  // The route switch a model id lives under: subagent:claude/x -> claude_code.
  function groupOf(id) {
    var c = canonical(id);
    if (groups()[c]) return c;
    var s = String(id), i = s.indexOf(':');
    if (i < 0) return null;
    var kind = s.slice(0, i), head = s.slice(i + 1).split('/')[0].toLowerCase();
    if (kind === 'chat') return PROVIDER_GROUP[head] || null;
    var g = canonical(head);
    return groups()[g] ? g : alias('runner:' + head);
  }
  function explicit(id) {
    var c = canonical(id);
    if (Object.prototype.hasOwnProperty.call(state.enabled, c)) return state.enabled[c];
    if (Object.prototype.hasOwnProperty.call(state.enabled, String(id))) return state.enabled[String(id)];
    return null;
  }

  // true unless the owner switched this agent, route or model off (or it is off by default).
  function isEnabled(id) {
    if (id == null || id === '') return true;
    var c = canonical(id);
    if (groups()[c]) {
      var g = explicit(c);
      return g === null ? state.defaultsOff.indexOf(c) < 0 : g !== false;
    }
    var kind = String(id).split(':')[0];
    var group = groupOf(id);
    if (group && state.cascade.indexOf(kind) >= 0 && !isEnabled(group)) return false;
    var own = explicit(id);
    return own === null ? true : own !== false;
  }

  function notify() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { /* a bad listener never breaks others */ } }); }
  function apply(data) {
    if (!data || typeof data !== 'object') return;
    state.enabled = data.enabled && typeof data.enabled === 'object' ? Object.assign({}, data.enabled) : {};
    (Array.isArray(data.toggles) ? data.toggles : []).forEach(function (r) {
      if (r && r.id && typeof r.enabled === 'boolean' && !Object.prototype.hasOwnProperty.call(state.enabled, r.id)) state.enabled[r.id] = r.enabled;
    });
    if (data.addons && typeof data.addons === 'object') state.addons = Object.assign({}, data.addons);
    // Core 1.x: the folder new dsh chats start in (settings key home_workspace), or null.
    state.homeWorkspace = typeof data.home_workspace === 'string' && data.home_workspace ? data.home_workspace : null;
    state.aliases = data.aliases && typeof data.aliases === 'object' ? Object.assign({}, data.aliases) : {};
    if (Array.isArray(data.defaults_off)) state.defaultsOff = data.defaults_off.slice();
    if (Array.isArray(data.cascade_kinds)) state.cascade = data.cascade_kinds.slice();
    state.rows = Array.isArray(data.toggles) ? data.toggles.slice() : [];
    state.loaded = true;
    state.error = null;
    notify();
  }
  function load() {
    if (!CC.api || typeof CC.api.get !== 'function') return Promise.resolve(state);
    return CC.api.get('/api/toggles').then(function (data) { apply(data); return state; }, function (err) {
      state.error = err; notify(); return state;
    });
  }
  function start() {
    if (started) return;
    started = true;
    load();
    if (CC.api && typeof CC.api.subscribe === 'function') {
      CC.api.subscribe(function (kind) { if (kind === 'toggles') load(); });
    }
  }
  // Resolves once the first /api/toggles answer is in (or has failed), or after ms (default WAIT_MS) so an
  // engine that is down or silent never holds pages back: callers then see the "no settings" defaults.
  // True while the first answer is in flight (the live page starts the fetch at load; nothing waits otherwise).
  function pending() { return started && !state.loaded && !state.error; }
  function whenLoaded(ms) {
    if (state.loaded || state.error) return Promise.resolve(state);
    return new Promise(function (resolve) {
      var done = false, timer = null;
      function finish() {
        if (done) return;
        done = true;
        listeners.delete(onChange);
        if (timer) clearTimeout(timer);
        resolve(state);
      }
      function onChange() { if (state.loaded || state.error) finish(); }
      listeners.add(onChange);
      if (typeof setTimeout === 'function') timer = setTimeout(finish, typeof ms === 'number' ? ms : CC.toggles.WAIT_MS);
      else finish();  // no timers here: never hold pages back
    });
  }
  function subscribe(fn) {
    listeners.add(fn);
    start();
    return function () { listeners.delete(fn); };
  }
  // Owner action (Agents tab): POST /api/toggles/set, then refresh everyone.
  function set(id, on) {
    if (!CC.api || typeof CC.api.post !== 'function') return Promise.reject(new Error('engine unavailable'));
    return CC.api.post('/api/toggles/set', { id: id, enabled: !!on }).then(function (out) { return load().then(function () { return out; }); });
  }
  // ---- route health: one source for every surface (GET /api/agents `connections`, the same probe the
  // Agents list shows). A route whose probe says it cannot run (bridge down, signed out, out of
  // credits, not installed) greys out with its line as the reason; unknown health stays usable.
  // CC.toggles.usable(id) / downReason(id) answer for routes and model ids alike. Fed by whoever already
  // reads /api/agents (the Agents page); loadHealth() fetches it on demand. No extra fetch on start.
  var health = { byRoute: {}, at: 0, pending: null };
  function applyHealth(conns) {
    var next = {};
    (Array.isArray(conns) ? conns : []).forEach(function (c) {
      if (!c || !c.id) return;
      var key = canonical(c.id);
      if (c.state === 'usage_unknown') return; // unknown evidence is not a fault
      if (c.ok === false || (c.ok === undefined && c.state && c.state !== 'ready')) next[key] = c.line || 'Not answering';
    });
    health.byRoute = next;
    health.at = Date.now();
    notify();
  }
  function loadHealth() {
    if (health.pending || !CC.api || typeof CC.api.get !== 'function') return health.pending || Promise.resolve(health);
    var req;
    try { req = CC.api.get('/api/agents'); } catch (e) { req = null; }
    if (!req || typeof req.then !== 'function') return Promise.resolve(health);
    health.pending = req.then(function (d) { if (d && Array.isArray(d.connections)) applyHealth(d.connections); }, function () {})
      .then(function () { health.pending = null; return health; });
    return health.pending;
  }
  function routeOf(id) { var c = canonical(id); return groups()[c] ? c : groupOf(id); }
  // The reason a route (or a model under it) cannot run right now; null when it can or nobody knows.
  function downReason(id) {
    var g = routeOf(id);
    return g && Object.prototype.hasOwnProperty.call(health.byRoute, g) ? health.byRoute[g] : null;
  }
  // Switched on and its route answering: the test every picker uses before offering an item.
  function usable(id) { return isEnabled(id) && downReason(id) === null; }

  // ---- optional add-ons (standalone/addons.json). One settings object decides which add-on pages show:
  // globalThis.WAYPOINT_ADDONS = { claude_codex_pages: false, brain_learn: false } (the installer writes it
  // from the one settings file; the older name DSH_CC_ADDONS is still read), or an `addons` object in the /api/toggles answer. RULE: an add-on is ON unless
  // the settings say false. So an existing install (no settings) keeps every page; the "default: off" values in
  // addons.json apply only to a fresh standalone install, whose settings file lists them as false.
  // Core pages (Todo, Plan, Execute, Autonomous, Settings and the hidden Agents/Models) can never be switched off.
  var ADDON_PAGES = { claude_codex_pages: ['cc-claude', 'cc-codex'], brain_learn: ['cc-brain', 'cc-learn'] };
  function addonSettings() {
    var out = {}, g = typeof globalThis !== 'undefined' ? globalThis : {};
    [state.addons, g.DSH_CC_ADDONS, g.WAYPOINT_ADDONS].forEach(function (o) {
      if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    });
    return out;
  }
  function addonOn(id) { return addonSettings()[id] !== false; }
  // true when pageId belongs to a switched-off add-on; core and unknown pages are never hidden.
  function pageHidden(pageId) {
    return Object.keys(ADDON_PAGES).some(function (id) { return ADDON_PAGES[id].indexOf(pageId) >= 0 && !addonOn(id); });
  }

  // className helper: '' when on, the shared grey class when off.
  function grey(id) { return isEnabled(id) ? '' : GREY; }
  // Several ids (model + route): on only when every one is on.
  function allEnabled(ids) { return (ids || []).every(function (x) { return x == null || isEnabled(x); }); }

  // React hook: re-render when the switches change.
  function useToggles() {
    var React = CC.React;
    var st = React.useState(0), bump = st[1];
    React.useEffect(function () { return subscribe(function () { bump(function (n) { return n + 1; }); }); }, []);
    return state;
  }

  var STYLE = [
    '.cc-root .' + GREY + '{opacity:.45;}',
    '.cc-root .' + GREY + ',.cc-root .' + GREY + ' input,.cc-root .' + GREY + ' button,.cc-root .' + GREY + ' select,' +
      '.cc-root .' + GREY + ' label{cursor:not-allowed;}',
    '.cc-root option.' + GREY + '{color:var(--cc-text-3);}'
  ].join('\n');
  function ensureStyle() {
    if (typeof document === 'undefined' || !document || !document.head || document.getElementById('cc-toggles-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-toggles-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }
  ensureStyle();
  if (typeof window !== 'undefined' && typeof fetch === 'function') start();  // live page: fetch once

  CC.isEnabled = isEnabled;
  CC.toggles = {
    GREY: GREY, STYLE: STYLE, state: state, isEnabled: isEnabled, allEnabled: allEnabled, canonical: canonical, groupOf: groupOf,
    grey: grey, load: load, apply: apply, subscribe: subscribe, set: set, start: start, useToggles: useToggles, ensureStyle: ensureStyle,
    whenLoaded: whenLoaded, pending: pending, WAIT_MS: 1500, addonOn: addonOn, pageHidden: pageHidden, ADDON_PAGES: ADDON_PAGES,
    applyHealth: applyHealth, loadHealth: loadHealth, downReason: downReason, usable: usable, health: health
  };
})(CC);

		// ── page_create.js
(function (CC) {
  // Run pools: ids are exactly runsheet.POOLS (engine/cc_engine/runsheet.py); test_ui_contract checks it.
  // usage: /api/usage pool-name prefixes that belong to each Run pool.
  var POOLS = [
    { id: 'claude_code', label: 'Claude Code', short: 'Claude', note: 'Max subscription', usage: ['claude_'] },
    { id: 'freebuff', label: 'Freebuff', short: 'Freebuff', note: 'local proxy, free', usage: ['freebuff'] },
    { id: 'gemini_app', label: 'Gemini App', short: 'Gemini', note: 'Gemini 4 Argon, copy prompt', usage: ['gemini_app'] },
    { id: 'chatgpt_web', label: 'ChatGPT Web', short: 'ChatGPT', note: 'GPT 6 Sol, copy prompt', usage: ['chatgpt_web'] }
  ];
  // The default run settings (runs now start from the Autonomous tab; Create's Run button opens
  // it). Kept as a JSON literal so test_ui_contract.py can check it against runsheet.expand.
  var DEFAULT_RUN_SETTINGS = /*CC-DEFAULT-RUN-SETTINGS*/{"pools": ["claude_code", "freebuff"], "preset": "balanced", "use_pool_fully": false, "auto_resume": true, "power_off": false, "merge_resets": true, "advanced": {}, "sprints": []}/*END*/;
  var AUTONOMOUS_PAGE = 'cc-sprints';
  // Inspector "Send to" routes, in display order (owner decision, 4 Nov 2026): automatic routes say Run;
  // Antigravity, Gemini App and AI Studio Playground are 1-click Open (copy the prompt, open the
  // app or site). CLI routes go through the Agents route (owner only, usage floors enforced there).
  // Codex runs only on the owner's own confirmed click (POST /api/node/run_owner, confirm: true).
  // Gemini App and AI Studio (web, pasted) are not the Gemini API.
  var GEMINI_URL = 'https://gemini.google.com/app';
  var CHATGPT_URL = 'https://chatgpt.com/';
  var AI_STUDIO_URL = 'https://aistudio.google.com/prompts/new_chat';
  var ANTIGRAVITY_URL = 'antigravity://';
  var SEND_TO = [
    { id: 'claude_code', label: 'Claude Code', note: 'Max subscription', action: 'Run', kind: 'cli' },
    { id: 'freebuff', label: 'Freebuff', note: 'local proxy, free', action: 'Run', kind: 'cli' },
    { id: 'codex', label: 'Codex', note: 'Your Codex plan, after a confirm', action: 'Run', kind: 'owner' },
    { id: 'antigravity', label: 'Antigravity', note: 'Opens the app, prompt copied', action: 'Open', kind: 'open', url: ANTIGRAVITY_URL },
    { id: 'gemini_app', label: 'Gemini App', note: 'Opens Gemini, prompt copied', action: 'Open', kind: 'open', url: GEMINI_URL },
    { id: 'chatgpt_web', label: 'ChatGPT Web', note: 'Opens ChatGPT, prompt copied', action: 'Open', kind: 'open', url: CHATGPT_URL },
    { id: 'ai_studio', label: 'AI Studio Playground', note: 'Opens AI Studio, prompt copied', action: 'Open', kind: 'open', url: AI_STUDIO_URL },
    { id: 'copy', label: 'Copy prompt', note: 'Paste it anywhere', action: 'Copy', kind: 'copy' }
  ];
  var DESC_LIMIT = 120;
  // History dot per moment, drawn with the shared StatusDot shapes.
  var HISTORY_DOT = { prereqs_met: 'ready', started: 'plain', interrupted: 'not_started', failed: 'error', completed: 'done',
    returned: 'submitted', replanned: 'ready' };
  // Every route has one on/off switch in the Agents tab; a switched-off route is greyed out and its
  // button does nothing. CC.isEnabled (toggles.js) decides when present, else /api/models enabled.
  function routeEnabled(row, models) {
    if (row.kind === 'copy') return true;
    if (typeof CC.isEnabled === 'function') {
      try { return CC.isEnabled(row.id) !== false; } catch (e) { return true; }
    }
    var list = Array.isArray(models) ? models : [];
    var ids = [row.id, 'agent:' + row.id, 'manual:' + row.id, 'manual:' + row.id + '_manual'];
    var own = list.filter(function (m) { return m && ids.indexOf(m.id) >= 0; });
    if (own.length) return own.some(function (m) { return m.enabled !== false; });
    var onRoute = list.filter(function (m) { return m && m.route === row.id; });
    if (onRoute.length) return onRoute.some(function (m) { return m.enabled !== false; });
    return true;
  }
  var ANSWER_LABEL = { accept: 'Accept', edit: 'Edit', reply: 'Reply', ignore: 'Ignore' };
  var ANSWER_KEY = { a: 'accept', e: 'edit', r: 'reply', i: 'ignore' };
  var STATUS_WORD = {
    done: 'Done', ready: 'Ready', running: 'Running', submitted: 'Checking', error: 'Error',
    not_started: 'Not started', needs_you: 'Needs you', skipped: 'Skipped', carried: 'Carried'
  };

  var STYLE = [
    // Page frame: CC.ui.Page + PageHeader (ui.js); the page is a size container so the header can
    // drop its meta line and segment counts when the column is narrow (1024 with the sidebar).
    '.cc-root.cc-create{container-type:inline-size;}',
    '.cc-root.cc-create .cc-ph{position:relative;z-index:3;}',
    '.cc-root.cc-create .cc-ph-title{display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto;overflow:hidden;}',
    '.cc-root.cc-create .cc-ph-mid,.cc-root.cc-create .cc-ph-act{flex:none;}',
    '.cc-root.cc-create .cc-ph-meta{flex:0 100 auto;}',
    '@container (max-width:980px){.cc-root.cc-create .cc-ph-meta{display:none;}}',
    '@container (max-width:860px){.cc-root.cc-create .cc-sg-n,.cc-root.cc-create .cc-attn-l,.cc-root.cc-create .cc-vchip{display:none;}.cc-root.cc-create .cc-sg-o{padding:0 8px;}.cc-root.cc-create .cc-ph{gap:8px;}}',
    // Project picker: the title itself. A native <select> paints its popup with the page's
    // color-scheme and the select's own colours, so both are set per theme (same selectors as
    // tokens.js) and the options get explicit token colours.
    '.cc-root .cc-proj{position:relative;display:inline-flex;align-items:center;min-width:0;max-width:360px;height:32px;margin-left:-6px;}',
    // The select sits over an invisible copy of the current name, so it is exactly as wide as the name.
    '.cc-root .cc-proj-size{visibility:hidden;font-size:17px;font-weight:600;letter-spacing:-.01em;padding:0 24px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
    '.cc-root .cc-project{appearance:none;border:0;background-color:var(--cc-bg);color:var(--cc-text);color-scheme:light;font:inherit;font-size:17px;font-weight:600;letter-spacing:-.01em;position:absolute;left:0;top:0;width:100%;height:32px;padding:0 24px 0 6px;border-radius:var(--cc-r-control);cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]) .cc-project{color-scheme:dark;}}',
    '.cc-root[data-theme="dark"] .cc-project,html[data-theme="dark"] .cc-root .cc-project,body.dark .cc-root .cc-project,body.theme-dark .cc-root .cc-project{color-scheme:dark;}',
    'html[data-theme="light"] .cc-root .cc-project,body.light .cc-root .cc-project,body.theme-light .cc-root .cc-project{color-scheme:light;}',
    '.cc-root .cc-project option{background-color:var(--cc-surface);color:var(--cc-text);font-size:14px;font-weight:400;}',
    '.cc-root .cc-project:hover{background-color:var(--cc-wash);}',
    '.cc-root .cc-project:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-proj-chev{position:absolute;right:6px;top:50%;margin-top:-7px;pointer-events:none;color:var(--cc-text-3);display:flex;}',
    '.cc-root .cc-proj-wrap{display:inline-flex;align-items:center;min-width:0;}',
    '.cc-root .cc-proj-one{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}',
    '.cc-root .cc-vchip{flex:none;font-size:11px;font-weight:500;color:var(--cc-text-3);border:1px solid var(--cc-line-strong);border-radius:999px;padding:0 6px;line-height:16px;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-attn{color:var(--cc-accent);}',
    // Menus: a <details> whose summary looks like a kit button; the popover is the one place a
    // panel floats (hairline, no blur). Escape and an outside click close it.
    '.cc-root .cc-more,.cc-root .cc-pop{position:relative;flex:none;}',
    '.cc-root .cc-more > summary,.cc-root .cc-pop > summary{list-style:none;}',
    '.cc-root .cc-more > summary::-webkit-details-marker,.cc-root .cc-pop > summary::-webkit-details-marker{display:none;}',
    '.cc-root .cc-more > summary:focus-visible,.cc-root .cc-pop > summary:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-more-m{position:absolute;right:0;top:32px;z-index:5;min-width:184px;background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);padding:4px;display:flex;flex-direction:column;gap:2px;font-size:12px;}',
    '.cc-root .cc-more-m .cc-meta{padding:4px 8px;}',
    '.cc-root .cc-mi{display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text);font:inherit;font-size:12px;text-align:left;cursor:pointer;white-space:nowrap;}',
    '.cc-root .cc-mi:hover:not(:disabled){background:var(--cc-wash);}',
    '.cc-root .cc-mi:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-mi.cc-danger{color:var(--cc-error);}',
    '.cc-root .cc-more-sep{height:1px;margin:4px 0;background:var(--cc-line);}',
    // Body: graph edge to edge on the canvas colour, inspector as the fixed side panel.
    '.cc-root .cc-canvas{position:relative;overflow:hidden;background:var(--cc-canvas);container-type:inline-size;}',
    '.cc-root .cc-canvas > .cc-em{position:relative;z-index:1;}',
    '.cc-root .cc-legend{position:absolute;left:16px;bottom:10px;display:flex;align-items:center;gap:12px;font-size:11px;color:var(--cc-text-3);pointer-events:none;white-space:nowrap;}',
    '.cc-root .cc-legend span{display:inline-flex;align-items:center;gap:4px;}',
    '.cc-root .cc-legend svg{width:12px;height:12px;overflow:visible;}',
    '@container (max-width:520px){.cc-root .cc-legend{display:none;}}',
    // Inspector: title, status, goal, check, facts, one action row, then a quiet history.
    '.cc-root .cc-side{display:flex;flex-direction:column;}',
    '.cc-root .cc-side-h{display:flex;align-items:flex-start;gap:8px;padding:12px 12px 0 16px;}',
    '.cc-root .cc-side-t{flex:1;min-width:0;padding-top:4px;font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
    '.cc-root .cc-side-a{display:flex;align-items:center;gap:2px;flex:none;}',
    '.cc-root .cc-side-b{display:flex;flex-direction:column;gap:12px;padding:8px 16px 16px;}',
    '.cc-root .cc-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--cc-text-2);white-space:nowrap;align-self:flex-start;}',
    '.cc-root .cc-pill .cc-dot-svg{width:12px;height:12px;overflow:visible;}',
    '.cc-root .cc-desc{font-size:12px;line-height:1.5;color:var(--cc-text-2);overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;}',
    '.cc-root .cc-desc.cc-desc-open{display:block;-webkit-line-clamp:unset;}',
    '.cc-root .cc-desc-more{align-self:flex-start;border:0;background:none;padding:0;margin-top:-8px;font:inherit;font-size:11px;color:var(--cc-text-3);cursor:pointer;}',
    '.cc-root .cc-desc-more:hover{color:var(--cc-text-2);}',
    '.cc-root .cc-desc-more:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-facts{display:grid;grid-template-columns:72px minmax(0,1fr);gap:4px 12px;margin:0;font-size:12px;}',
    '.cc-root .cc-facts dt{color:var(--cc-text-3);}',
    '.cc-root .cc-facts dd{margin:0;min-width:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-facts .cc-check-line{color:var(--cc-text);}',
    '.cc-root .cc-facts .cc-blocked-line{color:var(--cc-error);}',
    '.cc-root .cc-side-act{display:flex;align-items:center;gap:6px;min-width:0;}',
    '.cc-root .cc-side-act > .cc-b{min-width:0;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-side-act > .cc-pop > summary{padding:0 8px;}',
    '.cc-root .cc-ro-note{font-size:12px;color:var(--cc-text-3);}',
    // Send to: the full route list in a popover; the planned route carries a quiet accent bar.
    '.cc-root .cc-send-menu .cc-more-m{left:0;right:auto;width:328px;padding:0;gap:0;}',
    '.cc-root .cc-send{display:flex;flex-direction:column;}',
    '.cc-root .cc-send-h{display:flex;align-items:center;gap:8px;min-height:28px;padding:4px 12px;border-bottom:1px solid var(--cc-line);font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-send-h > *{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}',
    '.cc-root .cc-send-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-send-row{display:flex;align-items:center;gap:8px;min-height:40px;padding:4px 8px 4px 12px;}',
    '.cc-root .cc-send-row + .cc-send-row,.cc-root .cc-send-row + .cc-send-offs,.cc-root .cc-send-offs + .cc-send-row{border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-send-row.cc-send-rec{box-shadow:inset 2px 0 0 var(--cc-accent);}',
    '.cc-root .cc-send-t{flex:1;min-width:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-send-n{font-size:12px;font-weight:500;}',
    '.cc-root .cc-send-note{font-size:11px;color:var(--cc-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-send-row.cc-armed .cc-send-note{color:var(--cc-accent);}',
    '.cc-root .cc-send-row .cc-b{flex:none;min-width:56px;}',
    '.cc-root .cc-send-row.cc-off{opacity:.45;}',
    '.cc-root .cc-send-row.cc-off .cc-b{cursor:default;}',
    '.cc-root .cc-send-plan{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-send-offs{display:flex;align-items:center;min-height:32px;padding:2px 4px;}',
    '.cc-root .cc-off-toggle{height:24px;padding:0 8px;border:0;background:transparent;font:inherit;font-size:11px;color:var(--cc-text-3);border-radius:var(--cc-r-control);cursor:pointer;}',
    '.cc-root .cc-off-toggle:hover{background:var(--cc-wash);color:var(--cc-text-2);}',
    // History: a quiet list, one line per moment.
    '.cc-root .cc-sub{display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-sub-h{font-size:12px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-hist-none{font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-log{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;font-size:12px;}',
    '.cc-root .cc-log li{display:flex;align-items:center;gap:8px;min-height:24px;min-width:0;}',
    '.cc-root .cc-log time{color:var(--cc-text-3);font-size:11px;font-variant-numeric:tabular-nums;flex:none;width:40px;}',
    '.cc-root .cc-history .cc-hist-dot{width:12px;height:12px;flex:none;overflow:visible;}',
    '.cc-root .cc-hist-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cc-text-2);}',
    '.cc-root .cc-history li[data-kind="returned"] .cc-hist-t,.cc-root .cc-history li[data-kind="replanned"] .cc-hist-t{color:var(--cc-text-3);}',
    '.cc-root .cc-rules{padding:4px 8px;}',
    '.cc-root .cc-rules summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--cc-text-3);width:max-content;}',
    '.cc-root .cc-rules summary::-webkit-details-marker{display:none;}',
    '.cc-root .cc-rules summary::before{content:"\\203A";display:inline-block;width:8px;transition:transform 120ms;}',
    '.cc-root .cc-rules[open] summary::before{transform:rotate(90deg);}',
    '.cc-root .cc-rules summary:focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px;border-radius:4px;}',
    '.cc-root .cc-rules-l{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--cc-text-2);white-space:normal;}',
    // Claim: who is on the task right now, and where (flat, hairline-separated).
    '.cc-root .cc-claim{display:flex;flex-direction:column;gap:6px;padding:8px 0;border-top:1px solid var(--cc-line);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-claim-h{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;}',
    '.cc-root .cc-claim-h .cc-b{margin-left:auto;}',
    '.cc-root .cc-claim-stale{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-claim .cc-dot-svg{width:12px;height:12px;overflow:visible;}',
    // Sheets (Needs you, Changes, History) slide over the canvas from the right.
    '.cc-root .cc-scrim{position:absolute;inset:0;z-index:4;background:var(--cc-bg);opacity:.5;}',
    '.cc-root .cc-sheet{position:absolute;top:0;right:0;bottom:0;z-index:4;width:420px;max-width:100%;background:var(--cc-surface);border-left:1px solid var(--cc-line-strong);display:flex;flex-direction:column;}',
    '.cc-root .cc-sheet-h{flex:none;display:flex;align-items:center;gap:8px;height:48px;padding:0 8px 0 16px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-sheet-t{font-size:14px;font-weight:600;}',
    '.cc-root .cc-sheet-h .cc-gap{flex:1;}',
    '.cc-root .cc-sheet-b{flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:16px;}',
    '.cc-root .cc-sheet-f{display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-sheet-f .cc-keys{margin-right:auto;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-sheet .cc-log li{align-items:baseline;min-height:28px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-sheet .cc-log li:last-child{border-bottom:0;}',
    '.cc-root .cc-q{display:flex;flex-direction:column;gap:12px;font-size:14px;}',
    '.cc-root .cc-field{display:flex;flex-direction:column;gap:4px;}',
    '.cc-root .cc-field > label{font-size:12px;font-weight:500;color:var(--cc-text-2);}',
    '.cc-root .cc-sheet .cc-kv{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;font-size:12px;}',
    '.cc-root .cc-sheet .cc-kv dt{color:var(--cc-text-3);}',
    '.cc-root .cc-sheet .cc-kv dd{margin:0;overflow-wrap:anywhere;}',
    '.cc-root .cc-cap{font-size:12px;font-weight:600;margin-bottom:4px;}',
    '.cc-root .cc-vh-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-vh-row{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;text-align:left;font:inherit;font-size:12px;color:var(--cc-text);background:transparent;border:0;border-bottom:1px solid var(--cc-line);padding:0 4px;cursor:pointer;}',
    '.cc-root .cc-vh-row:hover{background:var(--cc-wash);}',
    '.cc-root .cc-vh-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-vh-sk{font-size:12px;color:var(--cc-text-2);padding:6px 4px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-vh-sk summary{cursor:pointer;color:var(--cc-text);}',
    '.cc-root .cc-vh-sk .cc-meta{margin-top:2px;}',
    '.cc-root .cc-input{width:100%;border:1px solid var(--cc-line-strong);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:12px;border-radius:var(--cc-r-control);padding:6px 10px;box-sizing:border-box;}',
    '.cc-root .cc-input:focus{outline:none;border-color:var(--cc-accent);}',
    '.cc-root textarea.cc-input{min-height:72px;resize:vertical;line-height:1.45;}',
    '.cc-root .cc-toast{position:absolute;left:50%;bottom:16px;z-index:6;transform:translateX(-50%);background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);padding:6px 12px;font-size:12px;}'
  ].join('\n');

  // Kit-class pieces that work even where ui.js is not loaded (plugin tests load page_create.js
  // alone): the class names are ui.js's, so the look is the kit's.
  var ICON = { down: 'M6 9l6 6l6-6', more: 'M5 12h.01M12 12h.01M19 12h.01' };
  function icon(d, size) {
    return CC.h('svg', { width: size || 14, height: size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, CC.h('path', { d: d }));
  }
  function btnClass(kind, size, iconOnly) {
    return 'cc-b' + (kind && kind !== 'default' ? ' cc-b-' + kind : '') + (size === 'sm' ? ' cc-b-sm' : '') + (iconOnly ? ' cc-b-icon' : '');
  }
  // A <details> popover closes on Escape and on a click outside it (DESIGN rule 11).
  function useDismiss(ref) {
    var React = CC.React;
    React.useEffect(function () {
      if (typeof document === 'undefined' || !document.addEventListener) return undefined;
      function close(e) {
        var el = ref.current;
        if (!el || !el.open) return;
        if (e.type === 'keydown' ? e.key === 'Escape' : !el.contains(e.target)) el.open = false;
      }
      document.addEventListener('pointerdown', close);
      document.addEventListener('keydown', close);
      return function () { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
    }, []);
  }
  // React elements are immutable; the harness's are plain objects.
  function withProps(el, extra) {
    if (!el) return el;
    if (CC.React && typeof CC.React.cloneElement === 'function') return CC.React.cloneElement(el, extra);
    Object.assign(el.props, extra);
    return el;
  }

  // A More menu: the kit's (CC.ui.Menu, icon trigger) when ui.js is loaded; otherwise a <details>
  // with the same items, for plugin tests that load this file on its own.
  function moreMenu(p) {
    var h = CC.h;
    var items = (p.items || []).filter(Boolean);
    if (CC.ui && CC.ui.Menu) return h(CC.ui.Menu, { key: p.key, label: p.label, className: p.className, items: items });
    return h('details', { key: p.key, className: 'cc-more' + (p.className ? ' ' + p.className : ''), ref: p.ref },
      h('summary', { className: btnClass('quiet', null, true), 'aria-label': p.label, title: p.label }, '…'),
      h('div', { className: 'cc-more-m', role: 'menu' }, items.map(function (it, i) {
        if (it.sep) return h('div', { key: 'sep' + i, className: 'cc-more-sep', role: 'separator' });
        return h('button', { key: it.label, className: 'cc-mi' + (it.danger ? ' cc-danger' : ''), type: 'button', role: 'menuitem',
          disabled: !!it.disabled, onClick: function (e) { if (p.ref && p.ref.current) p.ref.current.open = false; if (it.onClick) it.onClick(e); },
          onBlur: it.onBlur }, it.label);
      })));
  }

  function ensurePageStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || document.getElementById('cc-create-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-create-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function hm(iso) {
    if (!iso) return '–';
    var d = new Date(iso);
    if (isNaN(d)) return '–';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function shortCommand(cmd) {
    // Drop folders from path-like words so the line stays readable.
    return String(cmd).trim().split(/\s+/).map(function (w) {
      var bare = w.replace(/^["']|["']$/g, '');
      return /[\\/]/.test(bare) && !/^-/.test(bare) ? bare.split(/[\\/]/).filter(Boolean).pop() || bare : bare;
    }).join(' ');
  }
  function clip(prefix, middle, suffix, limit) {
    var room = limit - prefix.length - suffix.length;
    if (middle.length > room) middle = middle.slice(0, Math.max(room - 1, 1)) + '…';
    return prefix + middle + suffix;
  }
  // One plain sentence for a done-check; the raw check stays behind Details.
  function checkSummary(check) {
    check = check || {};
    if (check.type === 'command' && check.run) {
      var cmd = shortCommand(check.run);
      if (/\bpytest\b/.test(cmd)) {
        var files = (cmd.match(/test_[\w-]+\.py/g) || []).map(function (f) { return f.replace(/^test_|\.py$/g, '').replace(/_/g, ' '); });
        var k = cmd.match(/-k\s+["']?([^"'\s]+)/);
        if (files.length) return clip('Done when the tests for the ', files.join(' and '), ' pass', 60);
        if (k) return clip('Done when the tests about ', k[1], ' pass', 60);
        return 'Done when the tests pass';
      }
      return clip('Done when `', cmd, '` succeeds', 60);
    }
    if (check.type === 'files_exist') {
      var n = (check.paths || []).length;
      return 'Done when ' + n + (n === 1 ? ' file exists' : ' files exist');
    }
    if (check.type === 'text_present') return clip('Done when ', shortCommand(check.path || 'a file'), ' has the expected text', 60);
    if (check.type === 'human') return 'Done when you confirm';
    return 'Done when its check passes';
  }
  // CC.copyText / CC.openUrl may be injected (plugin tests); otherwise the browser does it.
  function copy(text) {
    if (typeof CC.copyText === 'function') return CC.copyText(text);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    return Promise.resolve();
  }
  function openUrl(url) {
    if (typeof CC.openUrl === 'function') return CC.openUrl(url);
    if (typeof window !== 'undefined' && window.open) window.open(url, '_blank', 'noopener');
    return undefined;
  }
  // The Send to row a planned model belongs to: the catalogue's route when /api/models knows the
  // id, else a cautious guess from the id. A Gemini API model is not the Gemini App.
  var ROUTE_ROWS = { claude_code: 'claude_code', freebuff: 'freebuff', gemini_app: 'gemini_app', chatgpt_web: 'chatgpt_web',
    antigravity: 'antigravity', codex: 'codex' };
  function guessRoute(text) {
    var t = String(text || '').toLowerCase();
    if (/codex/.test(t)) return 'codex';
    if (/antigravity|\bagy\b/.test(t)) return 'antigravity';
    if (/gemini[-_ ]?app/.test(t)) return 'gemini_app';
    if (/chatgpt|chat[-_]web/.test(t)) return 'chatgpt_web';
    if (/freebuff|deepseek/.test(t)) return 'freebuff';
    if (/claude|opus|sonnet|haiku/.test(t)) return 'claude_code';
    return null;
  }
  function recommendedRoute(id, models) {
    if (!id) return { route: null, label: null };
    var m = (Array.isArray(models) ? models : []).find(function (x) { return x && x.id === id; });
    if (!m) return { route: guessRoute(id), label: id };
    var route = m.route && ROUTE_ROWS[m.route] ? ROUTE_ROWS[m.route]
      : (m.route && m.route !== 'manual' ? null : guessRoute([m.id, m.label, m.provider].join(' ')));
    return { route: route, label: m.label || id };
  }
  // What dispatch will use for a node while a run is active (engine scheduler._candidate_pools,
  // _initial_model and runsheet.expand): the node's own pool/model/effort first (a model the
  // scheduler already wrote counts as a pin), else the run's default or first ticked pool, its
  // ladder's first model (advanced.model_ladder, else the preset ladder) and the per-pool effort.
  // Preset values mirror runsheet.LADDERS / PRESETS; Codex and Antigravity ladders are left out.
  var PRESET_FIRST = {
    frugal: { claude_code: 'haiku', freebuff: 'deepseek-chat' }, balanced: { claude_code: 'sonnet', freebuff: 'deepseek-chat' },
    push: { claude_code: 'sonnet', freebuff: 'deepseek-reasoner' }, max: { claude_code: 'opus', freebuff: 'deepseek-reasoner' } };
  ['frugal', 'balanced', 'push', 'max'].forEach(function (p) {
    PRESET_FIRST[p].chatgpt_web = 'gpt-6-sol'; PRESET_FIRST[p].gemini_app = 'gemini-4-argon';
  });
  var PRESET_EFFORT = { frugal: 'low', balanced: 'medium', push: 'high', max: 'xhigh' };
  // dispatch.POOL_ROUTES -> the Send to row id.
  var POOL_ROW = { claude: 'claude_code', claude_code: 'claude_code', claude_max: 'claude_code', codex: 'codex', codex_cli: 'codex',
    chatgpt: 'chatgpt_web', chatgpt_web: 'chatgpt_web', freebuff: 'freebuff', deepseek: 'freebuff',
    gemini: 'gemini_app', gemini_app: 'gemini_app', antigravity: 'antigravity', antigravity_manual: 'antigravity', agy: 'antigravity' };
  var RUN_OVER = { done: 1, finished: 1, cancelled: 1, failed: 1, error: 1, stopped: 1 };
  function activeRun(runs, project) {
    return (Array.isArray(runs) ? runs : []).find(function (r) {
      return r && r.project_id === project && !RUN_OVER[String(r.status || '').toLowerCase()];
    }) || null;
  }
  function dispatchPlan(node, run) {
    if (!node || !run) return null;
    var s = run.settings || {};
    var raw = s.raw && typeof s.raw === 'object' ? s.raw : s;
    var pools = Array.isArray(raw.pools) ? raw.pools
      : raw.pools && typeof raw.pools === 'object' ? Object.keys(raw.pools).filter(function (k) { return raw.pools[k]; }) : [];
    var pool = node.pool || (raw.default_pool && pools.indexOf(raw.default_pool) >= 0 ? raw.default_pool : pools[0]);
    if (!pool) return null;
    var preset = PRESET_EFFORT[raw.preset] ? raw.preset : 'balanced';
    var adv = raw.advanced && typeof raw.advanced === 'object' ? raw.advanced : {};
    var ladder = adv.model_ladder && Array.isArray(adv.model_ladder[pool]) && adv.model_ladder[pool].length ? adv.model_ladder[pool] : null;
    var model = node.model || (ladder ? ladder[0] : PRESET_FIRST[preset][pool]) || null;
    var base = typeof adv.effort === 'string' ? adv.effort : PRESET_EFFORT[preset];
    var effort = node.effort || (raw.efforts && raw.efforts[pool]) || base;
    return { pool: pool, route: POOL_ROW[pool] || null, model: model, effort: effort };
  }
  // Review 2: route subtitles name the model without its family prefix ("Opus 5.5").
  function shortModel(label) { return String(label || '').split(' · ')[0].replace(/\s*\([^()]*\)\s*$/, '').replace(/^Claude\s+/i, '').trim(); }
  // A display name for a model id: the catalogue label (exact id, else a catalogue id ending in
  // "/<id>-…" such as subagent:claude/haiku-5.5 for "haiku"), else "Claude Haiku" for a bare alias.
  function modelLabel(id, models) {
    if (!id) return '';
    var list = Array.isArray(models) ? models : [];
    var esc = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('[/:]' + esc + '(-|$)', 'i');
    var m = list.find(function (x) { return x && x.id === id; }) || list.find(function (x) { return x && re.test(String(x.id || '')); });
    var s = m && m.label ? String(m.label).split(' · ')[0].replace(/\s*\([^()]*\)\s*$/, '').trim() : '';
    var bare = /^(opus|sonnet|haiku)(?:-(\d[\d.]*))?$/i.exec(s || String(id));
    if (bare) return 'Claude ' + bare[1].charAt(0).toUpperCase() + bare[1].slice(1).toLowerCase() + (bare[2] ? ' ' + bare[2] : '');
    return s || String(id);
  }
  // A PowerShell line the owner pastes by hand: the prompt as a literal here-string piped to Codex.
  function codexCommand(prompt, cwd) {
    var body = String(prompt || '').replace(/\r\n/g, '\n').replace(/^'@/gm, " '@");
    return "@'\n" + body + "\n'@ | codex exec --skip-git-repo-check" + (cwd ? ' -C "' + String(cwd).replace(/"/g, '') + '"' : '') + ' -';
  }
  // Extra StarView props Create uses: region names only and the live dependencies (C1).
  function viewProps(view) {
    return view === 'star' ? { labelMode: 'regions', edgeMode: 'active' } : {};
  }

  // The status pill: the board's display status (derived Ready, Draft-aware), stored status as fallback.
  function StatusDot(props) {
    var h = CC.h;
    return h('span', { className: 'cc-pill' },
      CC.StatusDot ? h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18', 'aria-hidden': true }, h(CC.StatusDot, { status: props.status })) : null,
      STATUS_WORD[props.status] || props.status);
  }
  function displayStatus(node) { return (node && (node.display_status || node.status)) || 'not_started'; }
  // The goal as one paragraph (whitespace folded); the CSS shows three lines, More the rest.
  var DESC_MORE = 150;
  function goalText(goal) { return String(goal || '').replace(/\s+/g, ' ').trim(); }
  // One line from the goal: its first sentence when that fits, else the start, clipped.
  function oneLine(goal) {
    var t = String(goal || '').replace(/\s+/g, ' ').trim();
    var m = t.match(/^(.+?[.!?])(\s|$)/);
    if (m && m[1].length <= DESC_LIMIT) return m[1];
    return t.length > DESC_LIMIT ? t.slice(0, DESC_LIMIT - 1).trimEnd() + '…' : t;
  }
  // HH:MM today, else "4 Nov".
  function when(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return '–';
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return hm(iso);
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  }
  function History(props) {
    var h = CC.h;
    var rows = Array.isArray(props.rows) ? props.rows : [];
    if (!rows.length) {
      return h('section', { className: 'cc-sub' }, h('div', { className: 'cc-sub-h' }, 'History'),
        h('div', { className: 'cc-meta cc-hist-none' }, 'No history yet'));
    }
    return h('section', { className: 'cc-sub' }, h('div', { className: 'cc-sub-h' }, 'History'),
      h('ol', { className: 'cc-log cc-history', 'aria-label': 'History' }, rows.map(function (r, i) {
      var text = String(r.text || '');
      var by = r.by && text.indexOf(r.by) < 0 ? r.by : null;
      return h('li', { key: i, 'data-kind': r.kind },
        h('time', { dateTime: r.at, title: r.at ? new Date(r.at).toLocaleString() : '' }, when(r.at)),
        CC.StatusDot ? h('svg', { className: 'cc-hist-dot', viewBox: '-9 -9 18 18', 'aria-hidden': true },
          h(CC.StatusDot, { status: HISTORY_DOT[r.kind] || 'not_started' })) : null,
        h('span', { className: 'cc-hist-t', title: text + (by ? ' · ' + by : '') }, text, by ? h('span', { className: 'cc-meta' }, ' · ' + by) : null));
    })));
  }

  // A quiet "Rules learned" list for the project (read-only, from /api/constraints); nothing when empty.
  function RulesLearned(props) {
    var h = CC.h;
    var rules = (props.rules || []).filter(function (r) { return r && r.line; });
    if (!rules.length) return null;
    return h('details', { className: 'cc-rules cc-sub' },
      h('summary', null, 'Rules learned · ' + rules.length),
      h('ul', { className: 'cc-rules-l' }, rules.slice(0, 12).map(function (r, i) {
        return h('li', { key: i }, String(r.line));
      })));
  }

  function Inspector(props) {
    var h = CC.h, React = CC.React;
    var q = props.project && props.id ? 'project=' + encodeURIComponent(props.project) + '&id=' + encodeURIComponent(props.id) : null;
    var detail = CC.useEngine(q ? '/api/node?' + q : null, ['state']);
    // Clean history (worker A's /api/node/history) and the optional Pick for me hint (/api/pick);
    // either may be absent (404) and the panel still works.
    var hist = CC.useEngine(q ? '/api/node/history?' + q : null, ['state']);
    var rulesQ = CC.useEngine(props.project ? '/api/constraints?project=' + encodeURIComponent(props.project) : null, ['state']);
    var pick = CC.useEngine(q ? '/api/pick?kind=task&' + q : null, ['state']);
    // Optional catalogue (/api/models) and agent availability (/api/agents); absent falls back.
    var models = CC.useEngine('/api/models', ['models']);
    var agents = CC.useEngine('/api/agents', ['agents']);
    // The project's active run decides what dispatch will use (Planned line); absent means none.
    var runs = CC.useEngine(props.project ? '/api/runs' : null, ['run', 'state']);
    var bz = React.useState(null), busy = bz[0], setBusy = bz[1];
    var ar = React.useState(null), armed = ar[0], setArmed = ar[1];
    var so = React.useState(false), showOff = so[0], setShowOff = so[1];
    var dm = React.useState(false), descOpen = dm[0], setDescOpen = dm[1];
    var sendRef = React.useRef(null), moreRef = React.useRef(null);
    useDismiss(sendRef);
    useDismiss(moreRef);
    var node = detail.data && (detail.data.node || detail.data);
    if (!node) return h('aside', { className: 'cc-split-side cc-side' }, h('div', { className: 'cc-side-b' },
      h('div', { className: 'cc-meta' }, detail.error ? 'Could not load this step.' : 'Loading…')));
    var check = node.check || node.check_json || {};
    if (typeof check === 'string') { try { check = JSON.parse(check); } catch (e) { check = { type: 'text', run: check }; } }
    var status = displayStatus(node);
    function setStatus(next) {
      CC.api.post('/api/node/status', { project: props.project, id: node.id, status: next, revision: props.revision })
        .then(function () { props.toast(next === 'done' ? 'Marked done' : 'Reopened'); },
          function (e) { props.toast(e.status === 409 ? 'Changed elsewhere — refreshed, try again' : 'Could not save: ' + e.message); });
    }
    var modelList = models.data && (models.data.models || models.data);
    // A code node runs its script, never a model. With an active run the Planned row and text are
    // what dispatch will use; the generic Pick for me hint shows only when no run is active.
    var isCode = CC.isCodeNode ? CC.isCodeNode(node) : node.kind === 'code';
    var plan = isCode ? null : dispatchPlan(node, activeRun(runs.data && (runs.data.runs || runs.data), props.project));
    var picked = !isCode && !plan && pick.data && pick.data.model ? pick.data : null;
    var rec = isCode ? { route: null, label: null }
      : plan ? { route: plan.route, label: modelLabel(plan.model, modelList) }
        : recommendedRoute(node.recommended || (picked && picked.model), modelList);
    var planText = plan ? [shortModel(rec.label), plan.effort].filter(Boolean).join(' · ') : '';
    var agentList = (agents.data && (agents.data.agents || agents.data)) || [];
    var agy = Array.isArray(agentList) ? agentList.find(function (a) { return a && a.id === 'antigravity'; }) : null;
    var codexInfo = Array.isArray(agentList) ? agentList.find(function (a) { return a && a.id === 'codex'; }) : null;
    function reason(e) { return (e && e.data && e.data.detail) || (e && e.message) || 'unknown error'; }
    function withPrompt(fn) {
      return CC.api.post('/api/prompt', { project: props.project, id: node.id }).then(function (r) { return fn(r.prompt); },
        function (e) { props.toast('Could not build prompt: ' + e.message); });
    }
    function runCodex() {
      // The owner's own confirmed click; the engine refuses anything else (I4).
      return CC.api.post('/api/node/run_owner', { project: props.project, id: node.id, route: 'codex', confirm: true })
        .then(function () { props.toast('Codex is running on this task'); },
          function (e) { props.toast('Codex did not start: ' + reason(e)); });
    }
    function sendTo(row) {
      if (busy || !routeEnabled(row, modelList)) return undefined;
      if (row.kind === 'owner' && armed !== row.id) { setArmed(row.id); return undefined; }
      setArmed(null);
      setBusy(row.id);
      var finish = function () { setBusy(null); };
      if (row.kind === 'owner') return runCodex().then(finish, finish);
      return withPrompt(function (prompt) {
        if (row.kind === 'cli') {
          var body = { agent: row.id, message: prompt };
          if (props.cwd) body.cwd = props.cwd;
          return CC.api.post('/api/agents/send', body).then(function () {
            props.toast('Running on ' + row.label + ' — follow it on the Agents tab');
          }, function (e) { props.toast('Could not run on ' + row.label + ': ' + reason(e)); });
        }
        return copy(prompt).then(function () {
          if (row.kind !== 'open') { props.toast('Prompt copied'); return; }
          if (row.id === 'antigravity' && agy && agy.available === false) {
            props.toast('Prompt copied — open Antigravity and paste it');
            return;
          }
          props.toast('Prompt copied — paste it into ' + row.label);
          openUrl(row.url);
        });
      }).then(finish, finish);
    }
    function release() {
      CC.api.post('/api/release', { project: props.project, node: node.id }).then(function () { props.toast('Claim released'); },
        function (e) { props.toast('Could not release: ' + e.message); });
    }
    var claim = node.claim && node.claim.by ? node.claim : null;
    var claimBox = claim ? h('div', { className: 'cc-claim', role: 'status' },
      h('div', { className: 'cc-claim-h' },
        h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18', 'aria-hidden': true }, h(CC.StatusDot, { status: claim.stale ? 'not_started' : 'running' })),
        h('span', null, claim.by + (claim.stale ? '' : ' is working on this')),
        props.readOnly ? null : h('button', { className: btnClass('quiet', 'sm'), type: 'button', onClick: release }, 'Release')),
      claim.stale ? h('div', { className: 'cc-claim-stale' }, 'Claim is stale: no refresh since ' + hm(claim.refreshed_at || claim.since)) : null,
      h('dl', { className: 'cc-facts' },
        h('dt', null, 'Worktree'), h('dd', null, claim.worktree || 'Main folder'),
        h('dt', null, 'Folder'), h('dd', null, claim.cwd || '–'),
        h('dt', null, 'Environment'), h('dd', null, claim.environment || '–'),
        h('dt', null, 'Since'), h('dd', null, hm(claim.since)))) : null;
    var codexLeft = codexInfo && codexInfo.usage_percent != null ? ' · ' + Math.round(codexInfo.usage_percent) + '% left' : '';
    var head = isCode ? h('span', { key: 'plan', className: 'cc-send-plan' }, 'Code · runs its script, no model')
      : !plan && node.recommended ? h('span', { key: 'plan', className: 'cc-send-plan' }, 'Planned: ' + (rec.label || node.recommended)) : null;
    // Switched-off routes stay greyed but fold into one quiet trailing "N off" row (shared rule).
    var onRows = SEND_TO.filter(function (row) { return routeEnabled(row, modelList); });
    var offRows = SEND_TO.filter(function (row) { return !routeEnabled(row, modelList); });
    // Pick for me sits in the subtitle of the route it picked (else the first route).
    var pickRoute = picked ? recommendedRoute(picked.model, modelList).route : null;
    var pickRow = picked ? (onRows.find(function (r) { return r.id === pickRoute; }) || onRows[0]) : null;
    var pickText = picked ? 'Pick for me · ' + shortModel(recommendedRoute(picked.model, modelList).label || picked.model) : '';
    function sendRow(row) {
      var isRec = !!rec.route && rec.route === row.id;
      var on = routeEnabled(row, modelList);
      var isArmed = on && armed === row.id;
      var label = isArmed ? 'Confirm' : row.action;
      var isPick = !!pickRow && pickRow.id === row.id && !isArmed;
      var note = !on ? 'Off in Agents' : isArmed ? 'Uses your Codex plan' + codexLeft : isPick ? pickText
        : isRec && planText ? planText : row.note;
      return h('li', { key: row.id, className: 'cc-send-row' + (isRec ? ' cc-send-rec' : '') + (isArmed ? ' cc-armed' : '') + (on ? '' : ' cc-off'),
        'aria-disabled': on ? undefined : 'true' },
        h('div', { className: 'cc-send-t' },
          h('span', { className: 'cc-send-n' }, row.label),
          h('span', { className: 'cc-meta cc-send-note' + (isPick ? ' cc-pick' : ''), title: isPick ? [picked.effort ? 'Effort ' + picked.effort : '', picked.why || ''].filter(Boolean).join('. ') : (isRec && !isArmed ? 'Planned' : undefined) },
            note)),
        h('button', { className: btnClass(isArmed ? 'primary' : 'default', 'sm'), type: 'button', disabled: !!busy || !on, 'aria-label': label + ': ' + row.label,
          onClick: function () { sendTo(row); } }, busy === row.id ? '…' : label));
    }
    var offToggle = offRows.length ? h('li', { key: 'off', className: 'cc-send-offs' },
      h('button', { className: 'cc-off-toggle', type: 'button', 'aria-expanded': showOff ? 'true' : 'false',
        title: offRows.map(function (r) { return r.label; }).join(', ') + ' · off in Agents',
        onClick: function () { setShowOff(!showOff); } }, offRows.length + ' off')) : null;
    var sendList = h('div', { className: 'cc-send' },
      head ? h('div', { className: 'cc-send-h' }, head) : null,
      h('ul', { className: 'cc-send-list' }, onRows.map(sendRow).concat(offToggle ? [offToggle] : [], showOff ? offRows.map(sendRow) : [])));
    // One action row: the planned route as a direct button (when it is switched on), Copy prompt,
    // and Send to for every other route. Codex still arms first and runs only on Confirm.
    var quick = rec.route ? onRows.find(function (r) { return r.id === rec.route && r.kind !== 'copy'; }) : null;
    var quickArmed = !!quick && armed === quick.id;
    var copyRow = SEND_TO.find(function (r) { return r.kind === 'copy'; });
    var actions = props.readOnly ? null : h('div', { className: 'cc-side-act' },
      quick ? h('button', { className: btnClass(quickArmed ? 'primary' : 'default'), type: 'button', disabled: !!busy, 'data-cc-quick': quick.id,
        title: quickArmed ? 'Uses your Codex plan' + codexLeft : (planText || rec.label || quick.note),
        onClick: function () { sendTo(quick); } }, busy === quick.id ? '…' : quickArmed ? 'Confirm Codex' : (quick.action === 'Open' ? 'Open in ' : 'Run on ') + quick.label) : null,
      h('button', { className: btnClass('default'), type: 'button', disabled: !!busy, 'data-cc-quick': 'copy',
        onClick: function () { sendTo(copyRow); } }, busy === 'copy' ? '…' : 'Copy prompt'),
      h('details', { className: 'cc-pop cc-send-menu', ref: sendRef },
        h('summary', { className: btnClass('quiet'), 'aria-label': 'Send to another route', title: 'Send to' }, 'Send to', icon(ICON.down, 14)),
        h('div', { className: 'cc-more-m' }, sendList)));
    // Overflow: Mark done / Reopen and the learned rules, out of the default view.
    // Overflow: Mark done / Reopen, out of the default view (the kit's More menu).
    var doneItem = props.readOnly ? null : node.status === 'done'
      ? { label: 'Reopen', onClick: function () { setStatus('not_started'); } }
      : { label: 'Mark done', onClick: function () { setStatus('done'); } };
    var more = doneItem ? moreMenu({ label: 'More actions', items: [doneItem], ref: moreRef }) : null;
    var historyRows = hist.data && (hist.data.history || hist.data);
    var deps = Array.isArray(node.deps) ? node.deps : [];
    var blockedLine = props.blockedBy && props.blockedBy.length && CC.blockedLine ? CC.blockedLine(props.blockedBy) : null;
    var modelName = isCode ? 'Code' : shortModel(rec.label) || node.model || '';
    var model = modelName && !isCode ? [modelName, plan ? plan.effort : node.effort].filter(Boolean).join(' · ') : modelName;
    var facts = h('dl', { className: 'cc-facts' },
      h('dt', null, 'Id'), h('dd', null, String(node.id)),
      h('dt', null, 'Needs'), h('dd', null, deps.length ? deps.join(', ') : 'Nothing'),
      model ? h('dt', null, 'Model') : null, model ? h('dd', null, model) : null,
      node.attempts ? h('dt', null, 'Attempts') : null, node.attempts ? h('dd', null, String(node.attempts)) : null,
      h('dt', null, 'Check'), h('dd', { title: checkSummary(check) }, checkSummary(check).replace(/^Done when /, '')),
      CC.checkCounts ? h('dt', null, 'Runs') : null,
      CC.checkCounts ? h('dd', { className: 'cc-check-line' }, CC.checkLine(CC.checkCounts(node))) : null,
      blockedLine ? h('dt', null, 'Blocked') : null,
      blockedLine ? h('dd', { className: 'cc-blocked-line' }, blockedLine) : null);
    return h('aside', { className: 'cc-split-side cc-side', 'aria-label': 'Step details' },
      h('div', { className: 'cc-side-h' },
        h('div', { className: 'cc-side-t' }, node.title || node.id),
        h('div', { className: 'cc-side-a' }, more,
          h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×'))),
      h('div', { className: 'cc-side-b' },
        h(StatusDot, { status: status }),
        h('div', { className: 'cc-desc' + (descOpen ? ' cc-desc-open' : ''), title: node.goal || '' }, goalText(node.goal)),
        goalText(node.goal).length > DESC_MORE ? h('button', { className: 'cc-desc-more', type: 'button', 'aria-expanded': descOpen ? 'true' : 'false',
          onClick: function () { setDescOpen(!descOpen); } }, descOpen ? 'Less' : 'More') : null,
        props.readOnly ? h('div', { className: 'cc-ro-note' }, 'Archived version, read-only') : null,
        facts,
        claimBox,
        actions,
        h(History, { rows: Array.isArray(historyRows) ? historyRows : [] }),
        h(RulesLearned, { rules: rulesQ.data && rulesQ.data.constraints })));
  }

  function allowedOf(q) {
    if (q.allowed && q.allowed.length) return q.allowed;
    return q.kind === 'text' ? ['reply', 'ignore'] : ['answer', 'ignore'];
  }
  function fieldText(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
  function isTyping(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el.isContentEditable;
  }

  // One question at a time (Agent Inbox model): buttons only for the question's allowed
  // answer types; nothing preselected or focused. Keys: A accept, E edit, R reply, I ignore, J/K next/prev.
  function NeedsYou(props) {
    var h = CC.h, React = CC.React;
    var ix = React.useState(0), index = ix[0], setIndex = ix[1];
    var md = React.useState(null), mode = md[0], setMode = md[1];          // null | 'edit' | 'reply'
    var dr = React.useState({ value: undefined, reply: '', edits: {} }), draft = dr[0], setDraft = dr[1];
    var cl = React.useState({}), closed = cl[0], setClosed = cl[1];        // answered here, awaiting refresh
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var replyRef = React.useRef(null);

    var list = (props.questions || []).filter(function (q) { return !closed[q.id]; });
    var at = Math.min(index, Math.max(list.length - 1, 0));
    var q = list[at] || null;
    var allowed = q ? allowedOf(q) : [];
    var can = function (t) { return allowed.indexOf(t) >= 0; };
    // A text question whose only real answer is a reply opens straight onto the reply box.
    var replyOnly = !!q && can('reply') && !can('accept') && !can('edit') && !can('answer');
    var activeMode = mode || (replyOnly ? 'reply' : null);
    var qid = q && q.id;

    React.useEffect(function () {
      setMode(null); setDraft({ value: undefined, reply: '', edits: {} });
    }, [qid]);

    function go(step) {
      if (!list.length) return;
      setIndex(Math.min(Math.max(at + step, 0), list.length - 1));
    }
    function send(type, value) {
      if (!q || busy || !can(type)) return;
      var id = q.id;
      setBusy(true);
      var body = { id: id, answer: value === undefined ? { type: type } : { type: type, value: value } };
      CC.api.post('/api/question/answer', body).then(function () {
        setBusy(false);
        setClosed(function (prev) { var n = Object.assign({}, prev); n[id] = true; return n; });
        props.toast({ accept: 'Accepted', edit: 'Changes saved', reply: 'Reply sent', ignore: 'Dismissed', answer: 'Answer saved' }[type]);
        if (list.length <= 1) props.onClose();
      }, function (e) { setBusy(false); props.toast('Could not save: ' + e.message); });
    }
    function startEdit() {
      if (!q || !can('edit')) return;
      var edits = {};
      Object.keys(q.proposal || {}).forEach(function (k) { edits[k] = fieldText(q.proposal[k]); });
      setDraft(function (d) { return Object.assign({}, d, { edits: edits }); });
      setMode('edit');
    }
    function startReply() {
      if (!q || !can('reply')) return;
      setMode('reply');
      setTimeout(function () { if (replyRef.current) replyRef.current.focus(); }, 0);
    }
    function changedFields() {
      var out = {};
      Object.keys(q.proposal || {}).forEach(function (k) {
        var was = q.proposal[k], now = draft.edits[k];
        if (now === undefined || now === fieldText(was)) return;
        if (typeof was === 'string') { out[k] = now; return; }
        try { out[k] = JSON.parse(now); } catch (e) { out[k] = now; }
      });
      return out;
    }
    function cancelMode() { setMode(null); }

    var handlers = { accept: function () { send('accept'); }, edit: startEdit, reply: startReply, ignore: function () { send('ignore'); } };
    var keyRef = React.useRef(null);
    keyRef.current = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { e.preventDefault(); if (mode) cancelMode(); else props.onClose(); return; }
      if (isTyping(e.target)) return;
      var k = (e.key || '').toLowerCase();
      if (k === 'j') { e.preventDefault(); go(1); return; }
      if (k === 'k') { e.preventDefault(); go(-1); return; }
      var type = ANSWER_KEY[k];
      if (type && can(type) && !mode) { e.preventDefault(); handlers[type](); }
    };
    React.useEffect(function () {
      function onKey(e) { if (keyRef.current) keyRef.current(e); }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, []);

    var body = null, footer = [];
    if (q) {
      var options = q.options || q.options_json || [];
      var proposal = q.proposal && Object.keys(q.proposal).length ? q.proposal : null;
      var answerInput = null;
      if (can('answer') && !activeMode) {
        answerInput = q.kind === 'likert' && CC.Likert
          ? h(CC.Likert, { scale: q.scale || 9, value: draft.value, labels: options, ariaLabel: q.prompt, onChange: function (v) { setDraft(function (d) { return Object.assign({}, d, { value: v }); }); } })
          : q.kind === 'select' && CC.SelectAll
            ? h(CC.SelectAll, { options: options, value: draft.value || [], ariaLabel: q.prompt, onChange: function (v) { setDraft(function (d) { return Object.assign({}, d, { value: v }); }); } })
            : h('textarea', { className: 'cc-input', 'aria-label': 'Answer', value: draft.value || '', onChange: function (e) { var v = e.target.value; setDraft(function (d) { return Object.assign({}, d, { value: v }); }); } });
      }
      var hasAnswer = draft.value != null && draft.value !== '' && !(Array.isArray(draft.value) && !draft.value.length);
      body = h('div', { className: 'cc-q', key: q.id },
        h('div', null, q.prompt),
        q.node_id ? h('div', { className: 'cc-meta' }, 'Step ' + q.node_id) : null,
        proposal && activeMode !== 'edit' ? h('div', { className: 'cc-field' }, h('label', null, 'Proposed'),
          h('dl', { className: 'cc-kv' }, Object.keys(proposal).map(function (k) {
            return [h('dt', { key: k + 'k' }, k), h('dd', { key: k + 'v' }, fieldText(proposal[k]))];
          }))) : null,
        activeMode === 'edit' ? h('div', { className: 'cc-field' }, h('label', null, 'Change the proposal'),
          h('dl', { className: 'cc-kv' }, Object.keys(q.proposal || {}).map(function (k) {
            return [h('dt', { key: k + 'k' }, h('label', { htmlFor: 'cc-edit-' + k }, k)), h('dd', { key: k + 'v' },
              h('input', { id: 'cc-edit-' + k, className: 'cc-input', value: draft.edits[k] == null ? '' : draft.edits[k],
                onChange: function (e) { var v = e.target.value; setDraft(function (d) { var ed = Object.assign({}, d.edits); ed[k] = v; return Object.assign({}, d, { edits: ed }); }); } }))];
          }))) : null,
        activeMode === 'reply' ? h('div', { className: 'cc-field' }, h('label', { htmlFor: 'cc-reply' }, 'Reply'),
          h('textarea', { id: 'cc-reply', ref: replyRef, className: 'cc-input', value: draft.reply,
            onChange: function (e) { var v = e.target.value; setDraft(function (d) { return Object.assign({}, d, { reply: v }); }); } })) : null,
        answerInput);

      if (activeMode === 'edit') {
        var changed = changedFields();
        footer = [
          h('button', { key: 'c', className: 'cc-b cc-b-quiet', type: 'button', onClick: cancelMode }, 'Cancel'),
          h('button', { key: 's', className: 'cc-b cc-b-primary', type: 'button', disabled: busy || !Object.keys(changed).length,
            onClick: function () { send('edit', changed); } }, 'Save changes')];
      } else if (activeMode === 'reply') {
        footer = [
          replyOnly && can('ignore') ? h('button', { key: 'i', className: 'cc-b cc-b-quiet', type: 'button', title: 'I', disabled: busy, onClick: handlers.ignore }, 'Ignore')
            : h('button', { key: 'c', className: 'cc-b cc-b-quiet', type: 'button', onClick: cancelMode }, 'Cancel'),
          h('button', { key: 's', className: 'cc-b cc-b-primary', type: 'button', disabled: busy || !draft.reply.trim(),
            onClick: function () { send('reply', draft.reply); } }, 'Send reply')];
      } else {
        // Order: Ignore, Reply, Edit, (Save answer), Accept. Accept is primary only when allowed;
        // otherwise Save answer is. Nothing is preselected or focused.
        ['ignore', 'reply', 'edit'].forEach(function (t) {
          if (!can(t)) return;
          footer.push(h('button', { key: t, className: t === 'ignore' ? 'cc-b cc-b-quiet' : 'cc-b', type: 'button', title: t.charAt(0).toUpperCase(),
            disabled: busy, onClick: handlers[t] }, ANSWER_LABEL[t]));
        });
        if (can('answer')) footer.push(h('button', { key: 'answer', className: can('accept') ? 'cc-b' : 'cc-b cc-b-primary', type: 'button',
          disabled: busy || !hasAnswer, onClick: function () { send('answer', draft.value); } }, 'Save answer'));
        if (can('accept')) footer.push(h('button', { key: 'accept', className: 'cc-b cc-b-primary', type: 'button', title: 'A',
          disabled: busy, onClick: handlers.accept }, 'Accept'));
      }
    }
    var keys = allowed.filter(function (t) { return ANSWER_LABEL[t]; }).map(function (t) { return t.charAt(0).toUpperCase() + ' ' + t; });
    if (list.length > 1) keys.push('J / K next, previous');

    return h('div', null,
      h('div', { className: 'cc-scrim', onClick: props.onClose }),
      h('section', { className: 'cc-sheet', role: 'dialog', 'aria-label': 'Needs you' },
        h('div', { className: 'cc-sheet-h' },
          h('div', { className: 'cc-sheet-t' }, 'Needs you'),
          list.length ? h('span', { className: 'cc-meta', 'aria-live': 'polite' }, (at + 1) + ' of ' + list.length) : null,
          h('div', { className: 'cc-gap' }),
          list.length > 1 ? h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Previous question', title: 'K', disabled: at === 0, onClick: function () { go(-1); } }, '‹') : null,
          list.length > 1 ? h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Next question', title: 'J', disabled: at >= list.length - 1, onClick: function () { go(1); } }, '›') : null,
          h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×')),
        h('div', { className: 'cc-sheet-b' }, body || h('div', { className: 'cc-meta' }, 'Nothing needs you right now.')),
        q ? h('div', { className: 'cc-sheet-f' }, h('span', { className: 'cc-keys' }, keys.join(' · ')), footer) : null));
  }


  var CHANGES_MAX = 30;
  // One line per task: the latest summary for each step (run-level events keep one line per
  // kind), newest first, at most CHANGES_MAX lines.
  function latestPerTask(events) {
    var seen = {}, out = [];
    (Array.isArray(events) ? events : []).filter(function (e) { return e && e.summary; })
      .slice().sort(function (a, b) { return (b.seq || 0) - (a.seq || 0); })
      .forEach(function (e) {
        var key = e.node_id ? 'node:' + e.node_id : 'run:' + (e.kind || '');
        if (seen[key] || out.length >= CHANGES_MAX) return;
        seen[key] = true;
        out.push(e);
      });
    return out;
  }

  // The header of a sheet: title, optional meta, close.
  function SheetHead(props) {
    var h = CC.h;
    return h('div', { className: 'cc-sheet-h' },
      h('div', { className: 'cc-sheet-t' }, props.title),
      props.meta ? h('span', { className: 'cc-meta' }, props.meta) : null,
      h('div', { className: 'cc-gap' }),
      h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×'));
  }

  function Changes(props) {
    var h = CC.h;
    var events = CC.useEngine('/api/events?project=' + encodeURIComponent(props.project) + '&since=0&auto=1', ['state', 'run']);
    var list = latestPerTask(events.data && (events.data.events || events.data));
    return h('div', null,
      h('div', { className: 'cc-scrim', onClick: props.onClose }),
      h('section', { className: 'cc-sheet', role: 'dialog', 'aria-label': 'Changes' },
        h(SheetHead, { title: 'Changes', meta: list.length ? String(list.length) : null, onClose: props.onClose }),
        h('div', { className: 'cc-sheet-b' }, list.length ? h('ul', { className: 'cc-log' }, list.map(function (e) {
          return h('li', { key: e.seq }, h('time', null, hm(e.at)), h('span', { className: 'cc-hist-t', title: e.summary }, e.summary));
        })) : h('div', { className: 'cc-meta' }, 'No changes yet'))));
  }

  // Versions: one row per family (the current version). The engine already hides archived rows;
  // this keeps the highest version per family if a response ever carries several.
  function familyRows(list) {
    var best = {};
    (list || []).forEach(function (p) { if (p && p.family && !p.archived && (!best[p.family] || (p.version || 0) > (best[p.family].version || 0))) best[p.family] = p; });
    return (list || []).filter(function (p) { return p && (!p.family || (!p.archived && best[p.family] === p)); });
  }
  function VersionChip(props) {
    var h = CC.h;
    if (props.version == null) return null;
    var n = props.versions;
    return h('span', { className: 'cc-vchip', title: n > 1 ? 'Version ' + props.version + ' of ' + n : 'Version ' + props.version }, 'v' + props.version);
  }
  function countText(c) {
    c = c || {};
    var parts = [(c.done || 0) + ' done', (c.open || 0) + ' open', (c.skipped || 0) + ' skipped'];
    if (c.carried) parts.push(c.carried + ' carried');
    return parts.join(' · ');
  }
  // History: earlier versions oldest first (open one read-only) and the Skipped ideas list.
  function VersionHistory(props) {
    var h = CC.h;
    var q = props.family ? 'family=' + encodeURIComponent(props.family) : 'project=' + encodeURIComponent(props.project || '');
    var hist = CC.useEngine('/api/history?' + q, ['state']);
    var d = hist.data;
    var versions = ((d && d.versions) || []).filter(function (v) { return v.project !== d.current; });
    var skipped = (d && d.skipped) || [];
    return h('div', null,
      h('div', { className: 'cc-scrim', onClick: props.onClose }),
      h('section', { className: 'cc-sheet', role: 'dialog', 'aria-label': 'History' },
        h(SheetHead, { title: 'History', meta: d && d.family ? d.family.title : null, onClose: props.onClose }),
        h('div', { className: 'cc-sheet-b' },
          !d ? h('div', { className: 'cc-meta' }, hist.error ? 'Could not load history' : 'Loading…') : null,
          d ? h('div', null,
            h('div', { className: 'cc-cap' }, 'Earlier versions'),
            versions.length ? h('ul', { className: 'cc-vh-list' }, versions.map(function (v) {
              return h('li', { key: v.project }, h('button', { className: 'cc-vh-row', type: 'button', 'data-project': v.project,
                onClick: function () { props.onOpen(v.project, v.version); } },
              h(VersionChip, { version: v.version }),
              h('span', { className: 'cc-vh-t' }, v.title || v.project),
              h('span', { className: 'cc-meta' }, countText(v.counts))));
            })) : h('div', { className: 'cc-meta' }, 'No earlier versions')) : null,
          d ? h('div', null,
            h('div', { className: 'cc-cap' }, 'Skipped ideas'),
            skipped.length ? h('div', { className: 'cc-vh-list' }, skipped.map(function (k) {
              return h('details', { key: k.project + '/' + k.id, className: 'cc-vh-sk' },
                h('summary', null, (CC.statusGlyph ? CC.statusGlyph('skipped') + ' ' : '') + (k.title || k.id) + ' · v' + k.version),
                h('div', { className: 'cc-meta' }, k.reason || 'No reason recorded'),
                h('div', { className: 'cc-vh-goal' }, k.goal || ''));
            })) : h('div', { className: 'cc-meta' }, 'Nothing skipped')) : null)));
  }

  // The header "…" menu: History (earlier versions, skipped ideas) when the project has a family
  // with more than one version, and Archive project, which arms on the first click and archives on
  // the second (POST /api/project/archive). A 404 means the engine has not restarted onto that route.
  function ProjectMenu(props) {
    var h = CC.h, React = CC.React;
    var ar = React.useState(null), armed = ar[0], setArmed = ar[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var ref = React.useRef(null);
    useDismiss(ref);
    var canArchive = props.canArchive !== false && !!props.project;
    var isArmed = armed === props.project;
    function archive() {
      if (busy || !props.project) return undefined;
      if (!isArmed) { setArmed(props.project); return undefined; }
      setArmed(null);
      setBusy(true);
      var id = props.project;
      return CC.api.post('/api/project/archive', { project: id }).then(function () {
        setBusy(false);
        props.toast('Project archived');
        if (props.onArchived) props.onArchived(id);
      }, function (e) {
        setBusy(false);
        props.toast(e && e.status === 404 ? 'Archive arrives after the engine restarts'
          : 'Could not archive: ' + ((e && e.data && e.data.detail) || (e && e.message) || 'unknown error'));
      });
    }
    if (!canArchive && !props.onHistory) return null;
    // Archive arms on the first choice and archives on the second; the kit menu closes between
    // them, so the armed item reads Confirm archive when the menu opens again.
    return moreMenu({ label: 'Project actions', className: canArchive ? 'cc-proj-more' : null, ref: ref, items: [
      props.onHistory ? { label: 'History', onClick: props.onHistory } : null,
      props.onHistory && canArchive ? { sep: true } : null,
      canArchive ? { label: busy ? '…' : isArmed ? 'Confirm archive' : 'Archive project', danger: isArmed, disabled: busy || !props.project,
        onClick: archive, onBlur: function () { if (isArmed && !(CC.ui && CC.ui.Menu)) setArmed(null); } } : null] });
  }

  // The status legend: one quiet line in the corner of the canvas.
  var LEGEND = ['done', 'ready', 'running', 'error', 'needs_you', 'not_started'];
  function Legend() {
    var h = CC.h;
    if (!CC.StatusDot) return null;
    return h('div', { className: 'cc-legend', 'aria-label': 'Status key' }, LEGEND.map(function (s) {
      return h('span', { key: s },
        h('svg', { viewBox: '-9 -9 18 18', 'aria-hidden': true }, h(CC.StatusDot, { status: s })),
        s === 'error' ? 'Failing' : STATUS_WORD[s]);
    }));
  }

  function goPanel(id, fallback, toast) {
    try {
      if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') { CC.ctx.layout.selectPanel(id); return; }
    } catch (e) { /* fall through to the hint */ }
    toast(fallback);
  }

  // Pure helpers, exposed for plugin tests.
  CC.createHelpers = { POOLS: POOLS, DEFAULT_RUN_SETTINGS: DEFAULT_RUN_SETTINGS, SEND_TO: SEND_TO, STYLE: STYLE,
    checkSummary: checkSummary, latestPerTask: latestPerTask, viewProps: viewProps, codexCommand: codexCommand,
    recommendedRoute: recommendedRoute, routeEnabled: routeEnabled, oneLine: oneLine, displayStatus: displayStatus, Inspector: Inspector,
    ProjectMenu: ProjectMenu, VersionHistory: VersionHistory, familyRows: familyRows, dispatchPlan: dispatchPlan, activeRun: activeRun,
    modelLabel: modelLabel, headerMeta: headerMeta };

  // "12 done · 3 running · 1 failing": the counts that matter at a glance (board display statuses).
  function headerMeta(counts) {
    var c = counts || {};
    return [['done', 'done'], ['running', 'running'], ['error', 'failing']]
      .filter(function (k) { return c[k[0]]; }).map(function (k) { return c[k[0]] + ' ' + k[1]; }).join(' · ');
  }

  CC.CreatePage = function CreatePage() {
    var h = CC.h, React = CC.React, ui = CC.ui;
    ensurePageStyle();
    var projects = CC.useEngine('/api/projects', ['state']);
    // Plan's "Open in Execute" leaves the accepted project here; read it once.
    var pj = React.useState(function () {
      var id = CC.pendingProject || null;
      try { id = id || localStorage.getItem('cc.create.project'); localStorage.removeItem('cc.create.project'); } catch (e) { /* storage blocked */ }
      CC.pendingProject = null;
      return id;
    }), project = pj[0], setProject = pj[1];
    var vw = React.useState('flow'), view = vw[0], setView = vw[1];
    var fl = React.useState('all'), filter = fl[0], setFilter = fl[1];
    var sl = React.useState(null), selected = sl[0], setSelected = sl[1];
    var pn = React.useState(null), panel = pn[0], setPanel = pn[1];
    var tt = React.useState(null), toastText = tt[0], setToast = tt[1];
    var list = familyRows((projects.data && (projects.data.projects || projects.data)) || []);
    var current = project || (list[0] && list[0].id);
    var board = CC.useEngine(current ? '/api/board?project=' + encodeURIComponent(current) : null, ['state', 'run']);
    var questions = CC.useEngine('/api/questions?open=1', ['question', 'state']);
    var open = ((questions.data && (questions.data.questions || questions.data)) || []);

    React.useEffect(function () {
      if (!toastText) return undefined;
      var t = setTimeout(function () { setToast(null); }, 2600);
      return function () { clearTimeout(t); };
    }, [toastText]);

    function page(header, banner, body) {
      return withProps(ui.Page({ className: 'cc-create', raw: true, header: header, banner: banner, children: body }), { 'data-cc-page': 'create' });
    }
    if (projects.error && !projects.data) {
      return page(ui.PageHeader({ title: 'Execute', pageId: 'cc-create' }), null,
        h('div', { className: 'cc-pb' }, ui.Empty({ title: 'Waypoint Core is not running', body: 'Start it and this page connects on its own.' })));
    }
    var data = CC.unpackBoard(board.data) || { nodes: [], edges: [] };
    var nodes = data.nodes || [];
    // A board whose project is not in the picker (or is flagged archived) is an earlier version: read-only.
    var entry = list.find(function (p) { return p.id === current; }) || null;
    var bp = data.project || {};
    var archived = !!current && (bp.archived === true || bp.archived === 1 || (!entry && !!bp.id && bp.id === current && bp.version != null));
    var family = (entry && entry.family) || bp.family || null;
    var version = entry ? entry.version : bp.version;
    var versions = entry ? entry.versions : 0;
    var showHistory = !!current && !!family && (archived || versions > 1);
    var name = ((entry && entry.title) || bp.title || current || 'Execute');
    var View = view === 'star' ? CC.StarView : view === 'waves' ? CC.WaveView || CC.WavesView : CC.FlowView;
    var n = function (f) { return nodes.filter(function (x) { return CC.matchesFilter ? CC.matchesFilter(x, f) : true; }).length; };
    // Runs start from the Autonomous tab (usage-aware sprints); the Run button opens it.
    function openAutonomous() {
      CC.pendingAutonomousProject = current;
      try { localStorage.setItem('cc.autonomous.project', current); } catch (e) { /* storage blocked */ }
      goPanel(AUTONOMOUS_PAGE, 'Open Autonomous from the sidebar', setToast);
    }
    function pick(id) { setProject(id); setSelected(null); }

    var picker = list.length > 1
      ? h('span', { className: 'cc-proj' },
        h('span', { className: 'cc-proj-size', 'aria-hidden': 'true' }, name),
        h('select', { className: 'cc-project', value: current || '', 'aria-label': 'Project', title: name, onChange: function (e) { pick(e.target.value); } },
          (entry || !current ? [] : [h('option', { key: current, value: current }, (bp.title || current) + ' (archived)')])
            .concat(list.map(function (p) { return h('option', { key: p.id, value: p.id }, p.title); }))),
        h('span', { className: 'cc-proj-chev' }, icon(ICON.down, 14)))
      : h('span', { className: 'cc-proj-one', title: name }, name);
    var header = withProps(ui.PageHeader({
      pageId: 'cc-create',
      title: [h('span', { key: 'p', className: 'cc-proj-wrap' }, picker), h(VersionChip, { key: 'v', version: version, versions: versions })],
      meta: headerMeta(data.counts) || null,
      mid: [
        h(ui.Segmented, { key: 'v', label: 'View', value: view, onChange: setView,
          options: [{ value: 'flow', label: 'Flow' }, { value: 'star', label: 'Stars' }, { value: 'waves', label: 'Waves' }] }),
        h(ui.Segmented, { key: 'f', label: 'Show', value: filter, onChange: setFilter, options: [
          { value: 'all', label: 'All', count: nodes.length || null },
          { value: 'active', label: 'Active', count: nodes.length ? n('active') : null },
          { value: 'completed', label: 'Done', count: nodes.length ? n('completed') : null }] })],
      actions: [
        open.length ? h(ui.Button, { key: 'q', kind: 'quiet', className: 'cc-attn', onClick: function () { setPanel('needs'); },
          title: open.length + ' need' + (open.length === 1 ? 's' : '') + ' you' }, h('span', { className: 'cc-bd cc-bd-action' }, String(open.length)), h('span', { className: 'cc-attn-l' }, ' need' + (open.length === 1 ? 's' : '') + ' you')) : null,
        h(ui.Button, { key: 'c', onClick: function () { setPanel('changes'); }, disabled: !current }, 'Changes'),
        h(ui.Button, { key: 'r', kind: 'primary', disabled: !current || archived, title: 'Open Autonomous to plan and start sprints',
          onClick: openAutonomous }, 'Run'),
        current ? h(ProjectMenu, { key: 'm:' + current, project: archived ? null : current, canArchive: !archived, toast: setToast,
          onHistory: showHistory ? function () { setPanel('history'); } : null,
          onArchived: function (id) {
            var next = list.find(function (p) { return p.id !== id; });
            pick(next ? next.id : null);
          } }) : null]
    }), { 'aria-label': 'Execute: ' + name });
    var banner = archived ? ui.Banner({ children: 'Archived v' + (version == null ? '?' : version) + ', read-only',
      action: ui.Button({ size: 'sm', kind: 'quiet', onClick: function () { pick(null); }, children: 'Back to current' }) }) : null;

    var graph;
    if (!current) {
      graph = ui.Empty({ title: 'No projects yet', body: 'Plans you accept appear here.',
        action: ui.Button({ onClick: function () { goPanel('cc-plan', 'Open Plan from the sidebar', setToast); }, children: 'Open Plan' }) });
    } else if (board.data && !nodes.length) {
      graph = ui.Empty({ title: 'No tasks in this project', body: 'Draft a plan to add tasks.' });
    } else if (!View) {
      graph = h('div', { className: 'cc-meta', style: { padding: 16 } }, 'View unavailable');
    } else {
      graph = h(View, Object.assign({ board: data, filter: filter, selected: selected, onSelect: setSelected }, viewProps(view)));
    }
    var body = h('div', { className: 'cc-split' },
      h('div', { className: 'cc-split-main cc-canvas' },
        graph,
        current && nodes.length ? h(Legend) : null,
        panel === 'needs' ? h(NeedsYou, { questions: open, toast: setToast, onClose: function () { setPanel(null); } }) : null,
        panel === 'history' ? h(VersionHistory, { family: family, project: current, onClose: function () { setPanel(null); },
          onOpen: function (id) { pick(id); setPanel(null); } }) : null,
        panel === 'changes' ? h(Changes, { project: current, onClose: function () { setPanel(null); } }) : null,
        toastText ? h('div', { className: 'cc-toast', role: 'status' }, toastText) : null),
      selected && !panel ? h(Inspector, { project: current, id: selected, revision: data.revision, cwd: data.project && data.project.cwd, readOnly: archived,
        toast: setToast, onClose: function () { setSelected(null); },
        blockedBy: CC.blockedByFailedCheck ? CC.blockedByFailedCheck(data)[selected] : null }) : null);
    return page(header, banner, body);
  };
})(CC);

		// ── page_brain.js
// page_brain.js [brain-learn, C7] - Brain page (cc-brain): a read-only index of your preferences,
// notes, skills, instructions and a shallow folder tree, from GET /api/brain.
// Header: title, counts and index time, a Map / List / Overlaps switch, one compact search field and a
// More menu (rebuild the index, check overlaps again). Under it, one quiet line of kind chips with counts.
//   Map: the constellation (StarView), labelled by cluster; a click opens the note in the side panel.
//   List: a dense table (kind, title, cluster, source), sortable by column; arrows move, Home/End jump,
//     Enter opens; ArrowDown in the search field enters the table, Escape clears the search.
//   Overlaps: duplicate material from GET /api/brain/overlaps (read-only; you decide what to cut), most
//     cuttable first; a finding opens in the side panel and "Show on map" highlights its notes.
// The side panel (360 px) shows provenance, path, tags and connected notes; "Copy path" copies the path.
(function (CC) {
  'use strict';

  const KINDS = [
    { id: 'preference', label: 'Preferences' },
    { id: 'brain', label: 'Notes' },
    { id: 'skill', label: 'Skills' },
    { id: 'instruction', label: 'Instructions' },
    { id: 'folder', label: 'Folders' }
  ];
  const KIND_ONE = { preference: 'Preference', brain: 'Note', skill: 'Skill', instruction: 'Instruction', folder: 'Folder' };
  const DEFAULT_KINDS = { preference: true, brain: true, skill: true, instruction: true, folder: false };
  // The Map keeps the id 'star' so saved camera keys still apply.
  const VIEWS = [{ id: 'star', label: 'Map' }, { id: 'list', label: 'List' }, { id: 'overlaps', label: 'Overlaps' }];
  const OVERLAP_TYPE = { near_duplicate: 'Near-duplicate notes', passage: 'Repeated passage', superseded: 'Superseded' };
  const OVERLAP_SHORT = { near_duplicate: 'Near-duplicate', passage: 'Repeated passage', superseded: 'Superseded' };
  const DEFAULT_COLLAPSED = { 'k:folder': true };
  const PROVENANCE = {
    explicit_user_statement: { label: 'Your own words', rank: 0 },
    user_reported_calibration: { label: 'Your calibration', rank: 1 },
    vetted_source: { label: 'Vetted source', rank: 2 },
    agent_synthesis: { label: 'Agent summary', rank: 3 },
    inherited_registry: { label: 'Imported', rank: 4 }
  };
  const LINK_WORD = { link: 'links to', related: 'related', supersedes: 'supersedes', contains: 'contains', cites: 'cites' };
  const SORTS = [
    { id: 'kind', label: 'Kind' }, { id: 'title', label: 'Title' },
    { id: 'cluster', label: 'Cluster' }, { id: 'source', label: 'Source' }
  ];

  // Brain page styles; Learn adds its own. Colours and radii come only from tokens.js variables.
  const STYLE = [
    // kind chips: one quiet line under the header
    '.cc-brain .cc-br-chips{flex:none;display:flex;align-items:center;gap:4px;min-height:36px;padding:0 16px;border-bottom:1px solid var(--cc-line);overflow-x:auto;}',
    '.cc-root .cc-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border:1px solid transparent;border-radius:var(--cc-r-control);' +
      'background:transparent;color:var(--cc-text-3);font:inherit;font-size:12px;font-weight:500;white-space:nowrap;cursor:pointer;}',
    '.cc-root .cc-chip:hover{color:var(--cc-text);background:var(--cc-wash);}',
    '.cc-root .cc-chip[aria-pressed="true"]{color:var(--cc-text);border-color:var(--cc-line-strong);background:var(--cc-surface);}',
    '.cc-root .cc-chip-n{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    // search field (240 px) and its result popover on the Map
    '.cc-root .cc-br-search{position:relative;width:240px;flex:none;}',
    '.cc-root .cc-br-search .cc-in{height:28px;}',
    '@media (max-width:1180px){.cc-root .cc-br-search{width:160px;}}',
    '.cc-root .cc-br-results{position:absolute;right:0;top:32px;width:320px;max-height:320px;overflow:auto;z-index:5;padding:4px;' +
      'background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);}',
    '.cc-root .cc-br-results .cc-r{border-bottom:0;}',
    // one quiet status line (loading, error, empty)
    '.cc-root .cc-br-line{display:flex;align-items:center;gap:12px;padding:12px 16px;font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-br-line.cc-bad{color:var(--cc-error);}',
    // canvas and split
    '.cc-brain .cc-br-canvas{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-canvas);}',
    '.cc-brain .cc-br-canvas > .cc-graph{flex:1 1 auto;}',
    '.cc-brain .cc-t-label{font-weight:400;}',
    '.cc-brain .cc-split-main{position:relative;}',
    '.cc-root .cc-toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:7;background:var(--cc-surface);border:1px solid var(--cc-line-strong);' +
      'border-radius:var(--cc-r-panel);padding:6px 12px;font-size:12px;white-space:nowrap;}',
    // dense table (List and Overlaps)
    '.cc-root .cc-tb{container-type:inline-size;min-height:100%;}',
    '.cc-root .cc-tb-h,.cc-root .cc-tb-r{display:grid;align-items:center;column-gap:16px;padding:0 16px;}',
    '.cc-brain .cc-tb-notes .cc-tb-h,.cc-brain .cc-tb-notes .cc-tb-r{grid-template-columns:96px minmax(0,2fr) minmax(0,1fr) 128px;}',
    '.cc-brain .cc-tb-ov .cc-tb-h,.cc-brain .cc-tb-ov .cc-tb-r{grid-template-columns:128px minmax(0,2fr) minmax(0,1fr) 88px;}',
    '.cc-root .cc-tb-h{position:sticky;top:0;z-index:1;height:32px;background:var(--cc-bg);border-bottom:1px solid var(--cc-line);font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-tb-sort{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;justify-self:start;}',
    '.cc-root .cc-tb-sort:hover{color:var(--cc-text);}',
    '.cc-root .cc-tb-sort[aria-sort="ascending"],.cc-root .cc-tb-sort[aria-sort="descending"]{color:var(--cc-text);}',
    '.cc-root .cc-tb-ls{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-tb-r{width:100%;height:32px;border:0;border-bottom:1px solid var(--cc-line);background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;text-align:left;cursor:pointer;}',
    '.cc-root .cc-tb-r:hover{background:var(--cc-wash);}',
    '.cc-root .cc-tb-r[aria-current="true"]{background:var(--cc-selection);}',
    '.cc-root .cc-tb-r:focus-visible{outline:2px solid var(--cc-focus,var(--cc-accent));outline-offset:-2px;}',
    '.cc-root .cc-tb-c{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-tb-t{color:var(--cc-text);}',
    '.cc-root .cc-tb-num{text-align:right;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-tb-h .cc-tb-num{justify-self:end;}',
    '@container (max-width:560px){.cc-brain .cc-tb-notes .cc-tb-h,.cc-brain .cc-tb-notes .cc-tb-r{grid-template-columns:80px minmax(0,1fr) minmax(0,40%);}' +
      '.cc-brain .cc-tb-notes .cc-tb-src{display:none;}' +
      '.cc-brain .cc-tb-ov .cc-tb-h,.cc-brain .cc-tb-ov .cc-tb-r{grid-template-columns:minmax(0,1fr) 72px;}.cc-brain .cc-tb-ov .cc-tb-ty,.cc-brain .cc-tb-ov .cc-tb-nt{display:none;}}',
    // side panel (360 px, kit .cc-split-side)
    '.cc-root .cc-sp{display:flex;flex-direction:column;gap:12px;padding:12px 16px 24px;}',
    '.cc-root .cc-sp-h{display:flex;align-items:flex-start;gap:8px;}',
    '.cc-root .cc-sp-t{flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
    '.cc-root .cc-sp-m{margin-top:2px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-sp-p{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);overflow-wrap:anywhere;}',
    '.cc-root .cc-sp-path{font-family:var(--cc-mono);font-size:11px;color:var(--cc-text-2);overflow-wrap:anywhere;}',
    '.cc-root .cc-sp-a{display:flex;gap:8px;flex-wrap:wrap;}',
    '.cc-root .cc-sp .cc-sec{padding:8px 0 0;}',
    '.cc-root .cc-sp .cc-r{padding:4px 0;}',
    '.cc-root .cc-sp-q{margin:0;padding:0 0 0 10px;border-left:2px solid var(--cc-line-strong);font-size:12px;line-height:1.5;color:var(--cc-text-2);overflow-wrap:anywhere;}',
    '.cc-root .cc-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border:1px solid var(--cc-line-strong);border-radius:999px;font-size:11px;color:var(--cc-text-3);flex:none;}',
    '.cc-root .cc-tag-keep{border-color:var(--cc-done);color:var(--cc-text);}'
  ].join('\n');

  function ensureStyle() {
    if (CC.ensureStyles) CC.ensureStyles();
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-brain-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-brain-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function copy(text) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }

  function useToast() {
    const React = CC.React;
    const st = React.useState(null);
    const timer = React.useRef(null);
    function show(msg) {
      st[1](msg);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => st[1](null), 1800);
    }
    return { msg: st[0], show: show };
  }

  function errorText(err, what) {
    if (!err) return '';
    if (err.status === 503) return what + ' is not available in Waypoint Core yet.';
    if (err.status) return what + ' failed (' + (err.message || 'HTTP ' + err.status) + ').';
    return 'Waypoint Core is not running.';
  }

  // The "More" menu for rare actions is the kit's (CC.ui.Menu: icon trigger, popover, Escape closes).
  // Without that kit piece the actions stay reachable as plain quiet buttons.
  function Menu(props) {
    const h = CC.h;
    const ui = CC.ui;
    if (ui && typeof ui.Menu === 'function') return ui.Menu(props);
    const items = (props.items || []).filter(Boolean);
    return h('span', { className: 'cc-mn', role: 'group', 'aria-label': props.label || 'More' }, items.map((it, i) => h('button', {
      key: i, type: 'button', className: 'cc-b cc-b-quiet', disabled: !!it.disabled, onClick: it.onClick
    }, it.label)));
  }

  CC.brainLearn = { ensureStyle: ensureStyle, copy: copy, useToast: useToast, errorText: errorText, Menu: Menu };

  // ---- pure helpers (exported for tests) ------------------------------------
  function provRank(p) { return PROVENANCE[p] ? PROVENANCE[p].rank : 9; }

  function matches(n, q) {
    if (!q) return true;
    const hay = [n.label, n.id, n.cluster, n.path, (n.tags || []).join(' ')].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.indexOf(w) >= 0);
  }

  // Build the board handed to StarView. Kind chips choose which nodes exist; every link kind
  // between visible nodes is drawn.
  function toBoard(graph, kinds) {
    const all = (graph && graph.nodes) || [];
    const links = (graph && graph.links) || [];
    const keep = {};
    all.forEach((n) => { if (kinds[n.kind]) keep[n.id] = true; });
    const nodes = all.filter((n) => keep[n.id]).map((n) => ({
      id: n.id, title: n.label, label: n.label, kind: n.kind, cluster: n.cluster, lane: n.kind,
      provenance: n.provenance, weight: n.weight, brightness: n.brightness, path: n.path, tags: n.tags
    }));
    const edges = links.filter((l) => keep[l.source] && keep[l.target])
      .map((l) => ({ source: l.source, target: l.target, kind: l.kind }));
    return { nodes: nodes, edges: edges, links: edges };
  }

  function provLabel(p) { return PROVENANCE[p] ? PROVENANCE[p].label : null; }

  function labelForKind(kind) {
    const k = KINDS.filter((x) => x.id === kind)[0];
    return k ? k.label : kind;
  }

  // Grouped outline: kind (fixed order) -> cluster (A-Z) -> rows (A-Z; folders by path). ``collapsed``
  // maps 'k:<kind>' / 'c:<kind>/<cluster>' to true/false; Folders and every cluster of a
  // multi-cluster kind start folded. A filter keeps only matching rows and opens every group with one.
  function groupNotes(nodes, opts) {
    const o = opts || {};
    const q = (o.q || '').trim();
    const folded = o.collapsed || {};
    const isFolded = (key, dflt) => (q ? false : (Object.prototype.hasOwnProperty.call(folded, key) ? !!folded[key]
      : (DEFAULT_COLLAPSED[key] !== undefined ? DEFAULT_COLLAPSED[key] : !!dflt)));
    const order = KINDS.map((k) => k.id);
    const byKind = {};
    (nodes || []).forEach((n) => {
      const k = n.kind || 'other';
      if (order.indexOf(k) < 0) order.push(k);
      (byKind[k] = byKind[k] || []).push(n);
    });
    const name = (a, b) => String(a.label).localeCompare(String(b.label));
    const hit = (n) => matches(Object.assign({}, n, { tags: (n.tags || []).concat([provLabel(n.provenance) || '']) }), q);
    const out = [];
    order.forEach((kind) => {
      const all = byKind[kind] || [];
      const rows = q ? all.filter(hit) : all;
      if (!rows.length) return;
      const byCluster = {};
      rows.forEach((n) => { const c = n.cluster || 'Other'; (byCluster[c] = byCluster[c] || []).push(n); });
      const totals = {};
      all.forEach((n) => { const c = n.cluster || 'Other'; totals[c] = (totals[c] || 0) + 1; });
      const names = Object.keys(byCluster).sort((a, b) => a.localeCompare(b));
      const multi = Object.keys(totals).length > 1;
      const clusters = names.map((c) => {
        const list = byCluster[c].slice().sort(kind === 'folder'
          ? (a, b) => String(a.path).localeCompare(String(b.path)) : name);
        const key = 'c:' + kind + '/' + c;
        return { key: key, cluster: c, count: list.length, total: totals[c], collapsed: isFolded(key, multi), rows: list };
      });
      const key = 'k:' + kind;
      out.push({ key: key, kind: kind, label: labelForKind(kind), count: rows.length, total: all.length,
        collapsed: isFolded(key), clusters: clusters, clusterCount: Object.keys(totals).length });
    });
    return out;
  }

  // Table rows for the List: the chosen kinds, narrowed by the search (title, cluster, path, tags,
  // source), sorted by a column. Default order is kind (fixed order), then cluster, then title;
  // folders keep their path order so they read as a tree.
  function tableRows(nodes, opts) {
    const o = opts || {};
    const kinds = o.kinds || null;
    const q = (o.q || '').trim();
    const sort = o.sort || { key: 'kind', dir: 1 };
    const order = KINDS.map((k) => k.id);
    const kindIx = (k) => { const i = order.indexOf(k); return i < 0 ? order.length : i; };
    const rows = (nodes || []).filter((n) => (!kinds || kinds[n.kind]) &&
      matches(Object.assign({}, n, { tags: (n.tags || []).concat([provLabel(n.provenance) || '']) }), q));
    const s = (v) => String(v == null ? '' : v);
    const byTitle = (a, b) => (a.kind === 'folder' && b.kind === 'folder' ? s(a.path).localeCompare(s(b.path)) : s(a.label).localeCompare(s(b.label)));
    const cmp = {
      kind: (a, b) => kindIx(a.kind) - kindIx(b.kind) || s(a.cluster).localeCompare(s(b.cluster)) || byTitle(a, b),
      title: (a, b) => s(a.label).localeCompare(s(b.label)) || kindIx(a.kind) - kindIx(b.kind),
      cluster: (a, b) => s(a.cluster).localeCompare(s(b.cluster)) || byTitle(a, b),
      source: (a, b) => provRank(a.provenance) - provRank(b.provenance) || byTitle(a, b)
    }[sort.key] || ((a, b) => 0);
    const dir = sort.dir < 0 ? -1 : 1;
    return rows.slice().sort((a, b) => dir * cmp(a, b));
  }

  // Shorten a path against the index roots (Drive / Disk); the full path stays in the tooltip.
  function shortPath(p, roots) {
    const s = String(p || '');
    const r = roots || {};
    const pairs = [['Drive', r.drive], ['Disk', r.disk]];
    for (let i = 0; i < pairs.length; i++) {
      const root = pairs[i][1];
      if (root && s.toLowerCase().indexOf(String(root).toLowerCase()) === 0) return pairs[i][0] + s.slice(String(root).length);
    }
    return s;
  }

  // The parent folder name (skills are named by their folder already, so they show none).
  function parentFolder(n) {
    if (n.kind === 'skill') return '';
    const parts = String(n.path || '').split(/[\\/]+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 2] : '';
  }

  // Keyboard model for the table: returns {index, fold?} or null for keys it does not handle.
  function listKey(key, index, count) {
    const last = Math.max(0, count - 1);
    if (key === 'ArrowDown') return { index: Math.min(last, index + 1) };
    if (key === 'ArrowUp') return { index: Math.max(0, index - 1) };
    if (key === 'Home') return { index: 0 };
    if (key === 'End') return { index: last };
    if (key === 'ArrowLeft') return { index: index, fold: true };
    if (key === 'ArrowRight') return { index: index, fold: false };
    return null;
  }

  function neighbours(graph, id) {
    const out = [];
    ((graph && graph.links) || []).forEach((l) => {
      if (l.source === id) out.push({ id: l.target, kind: l.kind, dir: 'out' });
      else if (l.target === id) out.push({ id: l.source, kind: l.kind, dir: 'in' });
    });
    return out;
  }

  // Overlap findings, most cuttable first, narrowed by the search box (names, paths, excerpt).
  function overlapRows(data, q) {
    const rows = ((data && data.findings) || []).slice();
    rows.sort((a, b) => (b.cut_words || 0) - (a.cut_words || 0) || String(a.id).localeCompare(String(b.id)));
    if (!q) return rows;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((f) => {
      const hay = [f.suggestion, f.excerpt, OVERLAP_TYPE[f.type]].concat((f.notes || []).map((n) =>
        [n.name, n.title, n.path, n.id].join(' '))).join(' ').toLowerCase();
      return words.every((w) => hay.indexOf(w) >= 0);
    });
  }

  // Highlight a finding's notes on the map without touching its layout: involved nodes pass the
  // 'completed' filter and everything else fades (layout keys ignore status).
  function highlightBoard(board, ids) {
    if (!ids || !ids.length) return { board: board, filter: 'all' };
    const on = {};
    ids.forEach((id) => { on[id] = true; });
    const nodes = board.nodes.map((n) => (on[n.id] ? Object.assign({}, n, { display_status: 'done' }) : n));
    return { board: { nodes: nodes, edges: board.edges, links: board.links }, filter: 'completed' };
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function ovSummary(rows, scanned) {
    if (!rows.length) return 'No overlaps in ' + scanned + ' notes';
    return plural(rows.length, 'finding') + ' · about ' + wordsLabel(rows.reduce((s, f) => s + (f.cut_words || 0), 0)) + ' could go';
  }

  // "23:25" for today, "3 Nov 09:05" otherwise; the full time stays in the tooltip.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fullStamp(iso) { return String(iso).replace('T', ' ').slice(0, 16); }
  function stamp(iso, now) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/.exec(String(iso));
    if (!m) return fullStamp(iso);
    const t = now || new Date();
    const same = +m[1] === t.getFullYear() && +m[2] === t.getMonth() + 1 && +m[3] === t.getDate();
    return same ? m[4] : (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[4];
  }

  // Skills are folder ids ("bounded-task-packets"); read them as "Bounded task packets". The id
  // stays in the tooltip.
  function noteName(n) {
    const l = String((n && n.label) || '');
    if (!n || n.kind !== 'skill') return l;
    const t = l.replace(/[-_]+/g, ' ').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : l;
  }
  function withNames(graph) {
    if (!graph || !graph.nodes) return graph;
    return Object.assign({}, graph, { nodes: graph.nodes.map((n) => (n.kind === 'skill'
      ? Object.assign({}, n, { label: noteName(n), rawLabel: n.label }) : n)) });
  }
  function noteTip(n) { return n.rawLabel && n.rawLabel !== n.label ? n.rawLabel + (n.path ? '\n' + n.path : '') : n.path; }

  function wordsLabel(n) {
    const v = Math.max(0, Math.round(+n || 0));
    return v.toLocaleString('en-GB') + (v === 1 ? ' word' : ' words');
  }

  CC.brainBoard = toBoard;
  CC.brainNoteName = noteName;
  CC.brainStamp = stamp;
  CC.brainMatches = matches;
  CC.brainGroups = groupNotes;
  CC.brainRows = tableRows;
  CC.brainProvLabel = provLabel;
  CC.brainShortPath = shortPath;
  CC.brainParentFolder = parentFolder;
  CC.brainListKey = listKey;
  CC.brainViews = VIEWS;
  CC.brainKinds = KINDS;
  CC.brainOverlapRows = overlapRows;
  CC.brainHighlight = highlightBoard;

  // ---- components ------------------------------------------------------------
  function navItems(root) {
    return root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('[data-nav]')) : [];
  }
  function onTableKey(e) {
    const items = navItems(e.currentTarget);
    const i = items.indexOf(e.target);
    if (i < 0) return;
    const r = listKey(e.key, i, items.length);
    if (!r || r.fold !== undefined) return;
    e.preventDefault();
    if (items[r.index]) items[r.index].focus();
  }

  function KindChips(props) {
    const h = CC.h;
    const counts = props.counts || {};
    return h('div', { className: 'cc-br-chips', role: 'group', 'aria-label': 'Kinds' },
      KINDS.map((k) => h('button', {
        key: k.id, type: 'button', className: 'cc-chip', 'aria-pressed': props.kinds[k.id] ? 'true' : 'false',
        'data-kind': k.id, title: (props.kinds[k.id] ? 'Hide ' : 'Show ') + k.label.toLowerCase(),
        onClick: () => props.onToggle(k.id)
      }, k.label, h('span', { className: 'cc-chip-n' }, String(counts[k.id] || 0)))));
  }

  function SortHead(props) {
    const h = CC.h;
    const on = props.sort.key === props.id;
    return h('button', {
      type: 'button', className: 'cc-tb-sort' + (props.className ? ' ' + props.className : ''),
      'aria-sort': on ? (props.sort.dir < 0 ? 'descending' : 'ascending') : 'none',
      onClick: () => props.onSort({ key: props.id, dir: on ? -props.sort.dir : 1 })
    }, props.label, on ? h('span', { 'aria-hidden': 'true' }, props.sort.dir < 0 ? '↓' : '↑') : null);
  }

  // List: one dense table of the chosen kinds (kind, title, cluster, source).
  function ListView(props) {
    const h = CC.h;
    const sort = props.sort || { key: 'kind', dir: 1 };
    const rows = tableRows(props.nodes, { kinds: props.kinds, q: props.q, sort: sort });
    const head = h('div', { className: 'cc-tb-h', role: 'row' },
      SORTS.map((c) => h(SortHead, { key: c.id, id: c.id, label: c.label, sort: sort, onSort: props.onSort,
        className: c.id === 'source' ? 'cc-tb-src' : null })));
    if (!rows.length) {
      return h('div', { className: 'cc-tb cc-tb-notes' }, head,
        h('div', { className: 'cc-br-line', role: 'status' }, props.q ? 'No notes match.' : 'No notes of the chosen kinds.'));
    }
    return h('div', { className: 'cc-tb cc-tb-notes cc-bl-list', onKeyDown: onTableKey },
      head,
      h('ul', { className: 'cc-tb-ls', 'aria-label': 'Notes' }, rows.map((n) => {
        const prov = provLabel(n.provenance);
        return h('li', { key: n.id }, h('button', {
          type: 'button', className: 'cc-tb-r cc-bl-li', 'data-nav': '1', 'data-id': n.id,
          'aria-current': n.id === props.selected ? 'true' : undefined, title: noteTip(n),
          onClick: () => props.onSelect(n.id)
        },
        h('span', { className: 'cc-tb-c' }, KIND_ONE[n.kind] || n.kind),
        h('span', { className: 'cc-tb-c cc-tb-t' }, n.label),
        h('span', { className: 'cc-tb-c' }, n.cluster || ''),
        h('span', { className: 'cc-tb-c cc-tb-src cc-bl-prov' }, prov || '')));
      })));
  }

  // Side panel for one note.
  function DetailPanel(props) {
    const h = CC.h;
    const ui = CC.ui;
    const n = props.node;
    const prov = PROVENANCE[n.provenance];
    const nb = neighbours(props.graph, n.id).filter((x) => props.byId[x.id]).slice(0, 12);
    const kv = [];
    const add = (k, v, tip) => { if (v !== null && v !== undefined && v !== '') kv.push(h('dt', { key: k + 't' }, k), h('dd', { key: k + 'd', title: tip }, v)); };
    add('Source', prov ? prov.label : (n.provenance || 'Not recorded'));
    if (n.weight > 1) add('Sources', String(n.weight));
    add('Updated', n.updated_at || n.captured_at || null);
    add('Scope', n.scope || null);
    add('Tags', n.tags && n.tags.length ? n.tags.map((t) => '#' + t).join(' ') : null);
    add('Folder', parentFolder(n) || null);
    return h('aside', { className: 'cc-split-side', 'aria-label': 'Note details' }, h('div', { className: 'cc-sp' },
      h('div', { className: 'cc-sp-h' },
        h('div', { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', { className: 'cc-sp-t' }, n.label),
          h('div', { className: 'cc-sp-m' }, labelForKind(n.kind) + (n.cluster ? ' · ' + n.cluster : ''))),
        ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close', onClick: props.onClose })),
      n.summary ? h('p', { className: 'cc-sp-p' }, n.summary) : null,
      h('dl', { className: 'cc-kv' }, kv),
      n.path ? h('div', { className: 'cc-sp-path', title: n.path }, shortPath(n.path, props.roots)) : null,
      n.path ? h('div', { className: 'cc-sp-a' }, ui.Button({ onClick: () => props.onCopy(n.path), children: 'Copy path' })) : null,
      nb.length ? h(ui.Section, { title: 'Connected', meta: String(nb.length) },
        h(ui.List, { label: 'Connected notes' }, nb.map((x, i) => h(ui.Row, {
          key: x.id + i, id: x.id, title: props.byId[x.id].label,
          meta: (x.dir === 'in' ? '← ' : '→ ') + (LINK_WORD[x.kind] || x.kind), onClick: () => props.onSelect(x.id)
        })))) : null));
  }

  // Overlaps: one dense row per finding (type, suggestion, notes, words that could go).
  function OverlapsView(props) {
    const h = CC.h;
    const ui = CC.ui;
    const st = props.state;
    const data = st.data;
    if (!data) {
      if (st.loading) return h('div', { className: 'cc-br-line', role: 'status' }, 'Looking for duplicate material…');
      return h('div', { className: 'cc-br-line cc-bad', role: 'status' },
        h('span', null, st.error ? errorText(st.error, 'The overlap finder') : 'Overlaps unavailable.'),
        st.error ? ui.Button({ kind: 'quiet', size: 'sm', onClick: props.onRetry, children: 'Try again' }) : null);
    }
    const rows = overlapRows(data, props.q);
    const scanned = data.notes_scanned || 0;
    if (!rows.length) {
      return h('div', { className: 'cc-br-line', role: 'status' },
        props.q ? 'No overlaps match.' : 'No duplicate material in ' + scanned + ' notes.');
    }
    return h('div', { className: 'cc-tb cc-tb-ov', onKeyDown: onTableKey },
      h('div', { className: 'cc-tb-h', role: 'row' },
        h('span', { className: 'cc-tb-ty' }, 'Type'), h('span', null, 'Suggestion'),
        h('span', { className: 'cc-tb-nt' }, 'Notes'), h('span', { className: 'cc-tb-num' }, 'Could go')),
      h('ul', { className: 'cc-tb-ls', 'aria-label': 'Overlaps' }, rows.map((f) => {
        const notes = (f.notes || []).map((n) => n.name || n.title || n.id);
        return h('li', { key: f.id }, h('button', {
          type: 'button', className: 'cc-tb-r', 'data-nav': '1', 'data-id': f.id,
          'aria-current': f.id === props.active ? 'true' : undefined,
          'aria-label': (OVERLAP_TYPE[f.type] || f.type) + ': ' + f.suggestion,
          title: f.suggestion, onClick: () => props.onPick(f)
        },
        h('span', { className: 'cc-tb-c cc-tb-ty' }, OVERLAP_SHORT[f.type] || f.type),
        h('span', { className: 'cc-tb-c cc-tb-t' }, f.suggestion),
        h('span', { className: 'cc-tb-c cc-tb-nt' }, notes.join(', ')),
        h('span', { className: 'cc-tb-c cc-tb-num' }, wordsLabel(f.cut_words))));
      })));
  }

  // Side panel for one overlap finding.
  function OverlapPanel(props) {
    const h = CC.h;
    const ui = CC.ui;
    const f = props.finding;
    const sim = f.similarity == null ? null : Math.round(f.similarity * 100);
    const meta = [OVERLAP_TYPE[f.type] || f.type, f.copies > 2 ? f.copies + ' notes' : null,
      sim != null && f.type === 'near_duplicate' ? sim + '% similar' : null,
      f.template ? 'template text' : null, wordsLabel(f.cut_words) + ' could go'].filter(Boolean).join(' · ');
    return h('aside', { className: 'cc-split-side', 'aria-label': 'Overlap details' }, h('div', { className: 'cc-sp' },
      h('div', { className: 'cc-sp-h' },
        h('div', { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', { className: 'cc-sp-t' }, f.suggestion),
          h('div', { className: 'cc-sp-m' }, meta)),
        ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close', onClick: props.onClose })),
      h(ui.List, { label: 'Notes in this overlap' }, (f.notes || []).map((n) => h(ui.Row, {
        key: n.id, id: n.id, tip: n.path, title: n.name || n.title || n.id,
        lead: h('span', { className: 'cc-tag' + (n.role === 'keep' ? ' cc-tag-keep' : '') }, n.role === 'keep' ? 'Keep' : 'Trim')
      }))),
      f.excerpt ? h('blockquote', { className: 'cc-sp-q' }, f.excerpt) : null,
      h('div', { className: 'cc-sp-a' },
        ui.Button({ onClick: () => props.onShow(f), children: 'Show on map' }),
        ui.Button({ kind: 'quiet', onClick: () => props.onCopy(f.suggestion), children: 'Copy suggestion' }))));
  }

  function BrainPage(props) {
    const React = CC.React;
    const h = CC.h;
    const ui = CC.ui;
    ensureStyle();
    const api = props.api || CC.api;
    const st = React.useState({ data: null, error: null, loading: true });
    const ovS = React.useState({ data: null, error: null, loading: false });
    const viewS = React.useState('star');
    const kindsS = React.useState(DEFAULT_KINDS);
    const qS = React.useState('');
    const selS = React.useState(null);
    const sortS = React.useState({ key: 'kind', dir: 1 });
    const openS = React.useState(false);       // Map search results open
    const hlS = React.useState(null);          // the overlap finding highlighted on the map
    const fS = React.useState(null);           // the overlap finding open in the side panel
    const toast = useToast();
    const state = st[0], ov = ovS[0], view = viewS[0], kinds = kindsS[0], q = qS[0], selected = selS[0];
    const hl = hlS[0];

    function load(refresh) {
      st[1]((prev) => ({ data: prev.data, error: null, loading: true }));
      api.get('/api/brain' + (refresh ? '?refresh=1' : '')).then(
        (data) => st[1]({ data: data, error: null, loading: false }),
        (error) => st[1]((prev) => ({ data: prev.data, error: error, loading: false })));
    }
    function loadOverlaps(refresh) {
      ovS[1]((prev) => ({ data: prev.data, error: null, loading: true }));
      api.get('/api/brain/overlaps' + (refresh ? '?refresh=1' : '')).then(
        (data) => ovS[1]({ data: data, error: null, loading: false }),
        (error) => ovS[1]((prev) => ({ data: prev.data, error: error, loading: false })));
    }
    React.useEffect(() => { load(false); }, []);
    // Overlaps are fetched the first time the view opens (the scan reads every note once).
    React.useEffect(() => { if (view === 'overlaps' && !ov.data && !ov.loading && !ov.error) loadOverlaps(false); }, [view]);

    const graph = React.useMemo(() => withNames(state.data), [state.data]);
    const byId = React.useMemo(() => {
      const m = {};
      ((graph && graph.nodes) || []).forEach((n) => { m[n.id] = n; });
      return m;
    }, [graph]);
    const hlIds = hl ? (hl.notes || []).map((n) => n.id).filter((id) => byId[id]) : [];
    // Highlighted notes stay visible even when their kind is switched off.
    const effKinds = React.useMemo(() => {
      if (!hlIds.length) return kinds;
      const k = Object.assign({}, kinds);
      hlIds.forEach((id) => { k[byId[id].kind] = true; });
      return k;
    }, [kinds, hl, graph]);
    const board = React.useMemo(() => toBoard(graph, effKinds), [graph, effKinds]);
    const visible = board.nodes.map((n) => byId[n.id]).filter(Boolean);
    const results = q && view === 'star' ? visible.filter((n) => matches(n, q)) : [];
    const isOv = view === 'overlaps';
    const selNode = !isOv && selected && byId[selected] ? byId[selected] : null;
    const finding = isOv && fS[0] && ov.data ? ((ov.data.findings || []).filter((f) => f.id === fS[0].id)[0] || null) : null;

    function select(id) { selS[1](id); openS[1](false); }
    function setView(v) { viewS[1](v); openS[1](false); }
    function toggleKind(id) {
      const next = Object.assign({}, kinds);
      next[id] = !next[id];
      kindsS[1](next);
    }
    function onCopy(path) {
      copy(path).then(() => toast.show('Path copied'), () => toast.show('Could not copy; the path is in the panel'));
    }
    function onCopySuggestion(text) {
      copy(text).then(() => toast.show('Suggestion copied'), () => toast.show('Could not copy the suggestion'));
    }
    function showFinding(f) {
      hlS[1](f);
      const keep = (f.notes || []).filter((n) => byId[n.id])[0];
      selS[1](keep ? keep.id : null);
      if (!graph) toast.show('The map is still loading');
      setView('star');
    }
    function clearHighlight() { hlS[1](null); }
    function onSearchKey(e) {
      if (e.key === 'Escape') {
        if (q) { e.preventDefault(); qS[1](''); }
        openS[1](false);
      } else if (e.key === 'Enter' && view === 'star' && results.length) {
        e.preventDefault(); select(results[0].id);
      } else if (e.key === 'ArrowDown' && view !== 'star' && typeof document !== 'undefined' && document.querySelector) {
        const first = document.querySelector('.cc-brain .cc-tb [data-nav]');
        if (first) { e.preventDefault(); first.focus(); }
      }
    }

    const counts = (graph && graph.counts) || {};
    const built = isOv ? (ov.data && ov.data.built_at) : (graph && graph.built_at);
    const ovRows = isOv && ov.data ? overlapRows(ov.data, q) : null;
    let metaText;
    if (isOv) metaText = ovRows ? ovSummary(ovRows, ov.data.notes_scanned || 0) : '';
    else if (graph) metaText = plural(visible.length, 'note') + (built ? ' · indexed ' + stamp(built) : '');
    const meta = metaText ? h('span', { title: built ? (isOv ? 'Checked ' : 'Indexed ') + fullStamp(built) : undefined }, metaText) : null;

    const search = h('div', { className: 'cc-br-search', role: 'search' },
      h('input', {
        className: 'cc-in', type: 'search', value: q, 'aria-label': 'Search',
        placeholder: isOv ? 'Search overlaps' : 'Search notes',
        onChange: (e) => { qS[1](e.target.value); openS[1](true); },
        onFocus: () => openS[1](true), onKeyDown: onSearchKey
      }),
      view === 'star' && openS[0] && q ? h('div', { className: 'cc-br-results' },
        results.length ? h(ui.List, { label: 'Matches' }, results.slice(0, 12).map((n) => h(ui.Row, {
          key: n.id, id: n.id, title: n.label, meta: labelForKind(n.kind), tip: noteTip(n),
          selected: n.id === selected, onClick: () => select(n.id)
        }))) : h('div', { className: 'cc-br-line' }, 'No matches')) : null);
    const more = h(Menu, { label: 'More', items: [
      { label: state.loading ? 'Rebuilding the index…' : 'Rebuild index', disabled: state.loading, onClick: () => load(true) },
      isOv ? { label: ov.loading ? 'Checking…' : 'Check overlaps again', disabled: ov.loading, onClick: () => loadOverlaps(true) } : null
    ] });

    const header = ui.PageHeader({
      title: 'Brain', pageId: 'cc-brain', meta: meta,
      mid: ui.Segmented({ label: 'View', options: VIEWS.map((v) => ({ value: v.id, label: v.label,
        count: v.id === 'overlaps' && ov.data ? (ov.data.findings || []).length : undefined })), value: view, onChange: setView }),
      actions: [h('span', { key: 's' }, search), h('span', { key: 'm' }, more)]
    });

    let main;
    let side = null;
    let banner = null;
    if (isOv) {
      main = h(OverlapsView, {
        state: ov, q: q, active: finding ? finding.id : null, onPick: (f) => fS[1](f),
        onRetry: () => loadOverlaps(false)
      });
      if (finding) side = h(OverlapPanel, { finding: finding, onClose: () => fS[1](null), onShow: showFinding, onCopy: onCopySuggestion });
    } else if (!graph) {
      main = state.loading
        ? h('div', { className: 'cc-br-line', role: 'status' }, 'Building the index…')
        : h('div', { className: 'cc-br-line cc-bad', role: 'status' },
          h('span', null, errorText(state.error, 'The brain index') || 'The brain index is unavailable.'),
          ui.Button({ kind: 'quiet', size: 'sm', onClick: () => load(false), children: 'Try again' }));
    } else if (view === 'list') {
      main = h(ListView, {
        nodes: graph.nodes || [], kinds: kinds, q: q, sort: sortS[0], onSort: sortS[1], selected: selected, onSelect: select
      });
    } else {
      const View = CC.StarView;
      const lit = highlightBoard(board, hlIds);
      main = h('div', { className: 'cc-br-canvas' }, View
        ? h(View, {
          board: lit.board, filter: lit.filter, selected: selected, onSelect: select, onOpen: (id) => { if (byId[id]) onCopy(byId[id].path); },
          cameraKey: 'brain-' + view, colorBy: 'status', seed: 11, labelMode: 'regions', fill: false
        })
        : h('div', { className: 'cc-br-line' }, 'The map is still loading; List shows the same notes.'));
      if (hl) {
        banner = ui.Banner({
          action: h('span', { style: { display: 'inline-flex', gap: '4px' } },
            ui.Button({ kind: 'quiet', size: 'sm', onClick: () => setView('overlaps'), children: 'Back to overlaps' }),
            ui.Button({ kind: 'quiet', size: 'sm', onClick: clearHighlight, children: 'Clear' })),
          children: (OVERLAP_TYPE[hl.type] || 'Overlap') + ' · ' + hlIds.length + ' of ' + (hl.notes || []).length + ' notes highlighted'
        });
      }
    }
    if (selNode) {
      side = h(DetailPanel, { node: selNode, graph: graph, roots: graph.roots, byId: byId, onClose: () => select(null), onSelect: select, onCopy: onCopy });
    }

    const lateError = !isOv && state.error && graph ? errorText(state.error, 'Rebuild')
      : (isOv && ov.error && ov.data ? errorText(ov.error, 'Check again') : null);

    return ui.Page({
      id: 'cc-ready', className: 'cc-brain', header: header, raw: true,
      children: [
        !isOv && graph ? h(KindChips, { key: 'k', kinds: kinds, counts: counts, onToggle: toggleKind }) : null,
        banner ? h('div', { key: 'b' }, banner) : null,
        h('div', { key: 'v', className: 'cc-split' },
          h('div', { className: 'cc-split-main' }, main,
            toast.msg ? h('div', { className: 'cc-toast', role: 'status' }, toast.msg) : null,
            !toast.msg && lateError ? h('div', { className: 'cc-toast', role: 'status' }, lateError) : null),
          side)
      ]
    });
  }

  CC.BrainPage = BrainPage;
  CC.BrainListView = ListView;
  CC.BrainOverlapsView = OverlapsView;
  CC.BrainDetailPanel = DetailPanel;
})(CC);

		// ── page_learn.js
// page_learn.js [brain-learn, C8] - Learn page (page id cc-learn): learn a set of concepts one small
// step at a time, from the engine's learn data (CONTRACT learn.py: concept_graph, next_step, record).
//   List (default): the left column lists every concept with its mastery; the right side shows the
//     selected concept. With nothing selected it shows the next step (the weakest concept whose
//     prerequisites are mastered) and one practice question: reveal the answer (Space), then record
//     how it went (Again / Hard / Good / Easy, keys 1-4; spaced repetition schedules the review).
//   Map: the prerequisite graph (FlowView) coloured by mastery; a concept opens in the side panel.
// Optional sections render only when the engine data carries them: worked examples per concept
// (`stories`), and focused practice (`roles`: a focus list of questions plus a copyable practice prompt).
// Data: GET /api/learn (falls back to the richer GET /api/interview snapshot), GET /api/interview/question?id=
//   (practise a chosen question), GET /api/interview/prep?q= and GET /api/learn/live_prompt (focused
//   practice), POST /api/learn/record {concept, outcome} (falls back to POST /api/interview/rate).
(function (CC) {
  'use strict';

  const VIEWS = [{ value: 'list', label: 'List' }, { value: 'map', label: 'Map' }];
  const LEARN_WORD = { mastered: 'Mastered', ready: 'Ready', learning: 'Learning', untouched: 'Locked' };
  const BOARD_TO_LEARN = { done: 'mastered', ready: 'ready', running: 'learning', not_started: 'untouched' };
  const LEARN_TO_BOARD = { mastered: 'done', ready: 'ready', learning: 'running', untouched: 'not_started' };
  const RATINGS = [
    { n: 1, id: 'again', label: 'Again' }, { n: 2, id: 'hard', label: 'Hard' },
    { n: 3, id: 'good', label: 'Good' }, { n: 4, id: 'easy', label: 'Easy' }];
  const MAX = 4;

  const STYLE = [
    '.cc-learn .cc-ln{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-learn .cc-ln-list{flex:none;width:320px;min-height:0;overflow:auto;border-right:1px solid var(--cc-line);padding:8px 8px 24px;}',
    '.cc-learn .cc-ln-list .cc-r{padding:4px 8px;}',
    // the bar alone in the list (mastery in the tooltip and the detail), so titles keep their room
    '.cc-learn .cc-ln-list .cc-mt-bar{width:32px;}',
    '.cc-learn .cc-ln-list .cc-mt > span:last-child{display:none;}',
    '.cc-learn .cc-ln-main{flex:1 1 auto;min-width:0;min-height:0;overflow:auto;position:relative;}',
    '.cc-learn .cc-ln-col{max-width:720px;padding:16px 24px 32px;display:flex;flex-direction:column;gap:16px;}',
    '.cc-learn .cc-ln-h{display:flex;flex-direction:column;gap:2px;}',
    '.cc-learn .cc-ln-t{font-size:14px;font-weight:600;line-height:1.35;}',
    '.cc-learn .cc-ln-m{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    '.cc-learn .cc-ln-l{font-size:11px;color:var(--cc-text-3);margin-bottom:4px;}',
    '.cc-learn .cc-ln-q{margin:0;font-size:14px;font-weight:600;line-height:1.45;}',
    '.cc-learn .cc-ln-p{margin:0;font-size:14px;line-height:1.55;color:var(--cc-text);}',
    '.cc-learn .cc-ln-s{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);}',
    '.cc-learn .cc-ln-notes{min-height:72px;}',
    '.cc-learn .cc-ln-act{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
    '.cc-learn .cc-ln-ans{display:flex;flex-direction:column;gap:12px;padding-top:12px;border-top:1px solid var(--cc-line);}',
    '.cc-learn .cc-ln-bul{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.5;}',
    '.cc-learn .cc-ln-bul li::marker{color:var(--cc-text-3);}',
    '.cc-learn .cc-ln-bul b{font-weight:600;}',
    '.cc-learn .cc-ln-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;line-height:1.5;}',
    '.cc-learn .cc-ln-rate{display:flex;gap:8px;flex-wrap:wrap;}',
    '.cc-learn .cc-ln-rate .cc-b{min-width:88px;}',
    '.cc-learn .cc-ln-iv{font-size:11px;color:var(--cc-text-3);font-weight:400;font-variant-numeric:tabular-nums;}',
    '.cc-learn details > summary{list-style:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--cc-text-2);}',
    '.cc-learn details > summary::-webkit-details-marker{display:none;}',
    '.cc-learn details > summary::before{content:"";flex:none;width:5px;height:5px;margin:0 2px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform 120ms;}',
    '.cc-learn details[open] > summary::before{transform:rotate(45deg);}',
    '.cc-learn details > summary:hover{color:var(--cc-text);}',
    '.cc-learn details > :not(summary){margin-top:8px;}',
    '.cc-learn .cc-ln-src{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}',
    '.cc-learn .cc-ln-src button{border:0;background:transparent;color:var(--cc-text-2);font-family:var(--cc-mono);font-size:11px;text-align:left;padding:2px 0;cursor:pointer;overflow-wrap:anywhere;}',
    '.cc-learn .cc-ln-src button:hover{color:var(--cc-text);}',
    '.cc-learn .cc-ln-ex{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;font-size:12px;line-height:1.5;margin:0;}',
    '.cc-learn .cc-ln-ex dt{color:var(--cc-text-3);}',
    '.cc-learn .cc-ln-ex dd{margin:0;}',
    '.cc-learn .cc-ln-focus{display:flex;gap:8px;align-items:center;}',
    '.cc-learn .cc-ln-focus .cc-in{flex:1 1 auto;min-width:120px;}',
    '.cc-learn .cc-ln-prompt{width:100%;min-height:120px;font-family:var(--cc-mono);font-size:11px;}',
    '.cc-learn .cc-ln-graph{position:relative;flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--cc-canvas);}',
    '.cc-learn .cc-ln-graph > .cc-graph{flex:1 1 auto;}',
    '.cc-learn .cc-ln-legend{display:flex;gap:12px;align-items:center;font-size:11px;color:var(--cc-text-3);}',
    '.cc-learn .cc-ln-legend span{display:inline-flex;align-items:center;gap:2px;}',
    '.cc-learn .cc-ln-dot{display:inline-flex;width:18px;justify-content:center;}',
    '.cc-learn .cc-ln-line{padding:12px 16px;font-size:12px;color:var(--cc-text-3);display:flex;gap:12px;align-items:center;}',
    '.cc-learn .cc-ln-line.cc-bad{color:var(--cc-error);}',
    '@media (max-width:1100px){.cc-learn .cc-ln-list{width:280px;}.cc-learn .cc-ln-col{padding:16px;}}',
    '@media (max-width:640px){.cc-learn .cc-ln-two{grid-template-columns:1fr;}}'
  ].join('\n');

  function ensureStyle() {
    if (CC.brainLearn && CC.brainLearn.ensureStyle) CC.brainLearn.ensureStyle();
    else if (CC.ensureStyles) CC.ensureStyles();
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-learn-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-learn-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // Shared helpers from page_brain.js, with a local fallback when that file is not loaded.
  function BL() {
    return CC.brainLearn || {
      copy: function (t) { return typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(new Error('no clipboard')); },
      useToast: function () { return { msg: null, show: function () {} }; },
      errorText: function (e, what) { return e && e.status === 503 ? what + ' is not available in Waypoint Core yet.' : 'Waypoint Core is not running.'; },
      Menu: null
    };
  }

  // Accept GET /api/learn ({concept_graph, next_step, stories}) or the richer snapshot
  // ({graph, next, stories, questions, roles, total, due}).
  function normalize(d) {
    if (!d) return null;
    const graph = d.graph || d.concept_graph || d.board || (d.nodes ? d : null) || { nodes: [], edges: [] };
    const next = d.next !== undefined ? d.next : (d.next_step !== undefined ? d.next_step : null);
    const nodes = graph.nodes || [];
    const max = graph.max_mastery || MAX;
    const mastered = nodes.filter((n) => learnStatus(n) === 'mastered').length;
    return {
      graph: graph, next: next, stories: d.stories || [], questions: d.questions || [], roles: d.roles || [],
      total: d.total || nodes.length, mastered: mastered, confident: mastered, max: max,
      due: d.due != null ? d.due : (graph.due || 0)
    };
  }
  CC.learnNormalize = normalize;

  function learnStatus(n) {
    return n.learn_status || BOARD_TO_LEARN[n.display_status || n.status] || 'untouched';
  }

  // Concepts in learning order: prerequisite depth (wave), then the seed order.
  function conceptOrder(nodes) {
    return (nodes || []).map((n, i) => ({ n: n, i: i }))
      .sort((a, b) => ((a.n.wave || 0) - (b.n.wave || 0)) || a.i - b.i).map((x) => x.n);
  }
  CC.learnOrder = conceptOrder;

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function Dot(props) {
    const h = CC.h;
    return h('span', { className: 'cc-ln-dot', 'aria-hidden': 'true' },
      h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18' }, CC.StatusDot ? h(CC.StatusDot, { status: props.status }) : null));
  }

  function Sources(props) {
    const h = CC.h;
    const list = props.paths || [];
    if (!list.length && !props.also) return null;
    return h('details', null,
      h('summary', null, (props.label || 'Sources') + (list.length ? ' (' + list.length + ')' : '')),
      props.also ? h('div', { className: 'cc-ln-m' }, props.also) : null,
      list.length ? h('ul', { className: 'cc-ln-src' }, list.map((p) => h('li', { key: p },
        h('button', { type: 'button', title: 'Copy path', onClick: () => props.onCopy(p) }, p)))) : null);
  }

  // Optional phrasing pair from the engine ("avoid" / "say").
  function Phrasing(props) {
    const h = CC.h;
    const s = props.say;
    if (!s || (!s.avoid && !s.say)) return null;
    return h('div', { className: 'cc-ln-two' },
      h('div', null, h('div', { className: 'cc-ln-l' }, 'Avoid'), s.avoid),
      h('div', null, h('div', { className: 'cc-ln-l' }, 'Prefer'), s.say));
  }

  // Optional worked example (situation, task, action, result).
  function Example(props) {
    const h = CC.h;
    const s = props.story;
    const row = (k, v) => (v ? [h('dt', { key: k + 't' }, k), h('dd', { key: k + 'd' }, v)] : null);
    return h('details', null,
      h('summary', null, s.title),
      s.sixty ? h('p', { className: 'cc-ln-s' }, s.sixty) : null,
      h('dl', { className: 'cc-ln-ex' }, row('Situation', s.situation), row('Task', s.task), row('Turning point', s.pivot),
        row('Action', s.action), row('Result', s.result), row('Link', s.link)),
      h(Phrasing, { say: s.say_it }),
      s.limits ? h('p', { className: 'cc-ln-s' }, 'Limits: ' + s.limits) : null,
      h(Sources, { paths: s.evidence, onCopy: props.onCopy }));
  }

  // ---- next step / practice -------------------------------------------------------------
  function Answer(props) {
    const h = CC.h;
    const ma = props.ma || {};
    const bullets = ma.bullets || [];
    return h('section', { className: 'cc-ln-ans', 'aria-label': 'Answer' },
      h('div', { className: 'cc-ln-l' }, ma.story ? 'Answer, from the example "' + ma.story.title + '"' : 'Answer'),
      bullets.length ? h('ul', { className: 'cc-ln-bul' }, bullets.map((b, i) => h('li', { key: i },
        b.label ? h('b', null, b.label + ': ') : null, b.text))) : h('p', { className: 'cc-ln-s' }, 'No answer outline recorded.'),
      ma.kind === 'outline' && ma.angle ? h('p', { className: 'cc-ln-s' }, ma.angle) : null,
      ma.sixty ? h('details', null, h('summary', null, 'Short version'), h('p', { className: 'cc-ln-s' }, ma.sixty)) : null,
      h(Phrasing, { say: ma.say_it }),
      ma.limits ? h('p', { className: 'cc-ln-s' }, 'Limits: ' + ma.limits) : null,
      ma.also && ma.also.length ? h('div', { className: 'cc-ln-m' },
        'Other examples: ' + ma.also.filter(Boolean).map((s) => s.title).join('; ')) : null);
  }

  function Practice(props) {
    const h = CC.h;
    const ui = CC.ui;
    const step = props.step;
    const q = step.question || { id: step.concept, text: step.check_question };
    const iv = step.intervals || {};
    const mastery = Math.max(0, Math.min(MAX, step.mastery || 0));
    const context = props.focusLabel || (step.builds_on && step.builds_on.length
      ? 'Builds on ' + step.builds_on.map((b) => b.title).join(', ') : 'Starting point');
    const also = q.also_tests && q.also_tests.length ? 'Also covers ' + q.also_tests.map((x) => x.title).join(', ') : '';
    const meta = [props.chosen ? 'Practice' : 'Next step', context, 'Mastery ' + mastery + ' of ' + MAX,
      step.card && step.card.due ? 'Due' : (step.card && step.card.new ? 'New' : null)].filter(Boolean).join(' · ');
    return h('article', { className: 'cc-ln-col', 'aria-label': 'Practice' },
      h('div', { className: 'cc-ln-h' }, h('div', { className: 'cc-ln-t' }, step.title), h('div', { className: 'cc-ln-m' }, meta)),
      step.explain ? h('details', null, h('summary', null, 'Explanation'), h('p', { className: 'cc-ln-s' }, step.explain)) : null,
      h('div', null, h('div', { className: 'cc-ln-l' }, 'Practice question'), h('p', { className: 'cc-ln-q' }, q.text)),
      h('textarea', { key: q.id, className: 'cc-in cc-ln-notes', 'aria-label': 'Your answer', placeholder: 'Your answer' }),
      props.revealed ? h(Answer, { ma: step.model_answer }) : null,
      props.revealed
        ? h('div', null,
          h('div', { className: 'cc-ln-l' }, 'Record outcome · keys 1 to 4'),
          h('div', { className: 'cc-ln-rate', role: 'group', 'aria-label': 'Record outcome' }, RATINGS.map((r) => h('button', {
            key: r.id, type: 'button', className: 'cc-b', disabled: !!props.busy, onClick: () => props.onRate(r.n),
            'aria-label': r.label + (iv[r.id] ? ', review in ' + iv[r.id] : '')
          }, r.label, iv[r.id] ? h('span', { className: 'cc-ln-iv' }, iv[r.id]) : null))))
        : h('div', { className: 'cc-ln-act' },
          ui.Button({ kind: 'primary', onClick: props.onReveal, children: 'Reveal answer', action: 'reveal' }),
          h('span', { className: 'cc-ln-m' }, 'Space')),
      h(Sources, { paths: step.evidence, also: also, onCopy: props.onCopy }));
  }

  // ---- one concept ----------------------------------------------------------------------
  function Concept(props) {
    const h = CC.h;
    const ui = CC.ui;
    const n = props.node;
    const ls = learnStatus(n);
    const byId = props.byId;
    const qs = (n.questions || []).map((id) => props.qById[id]).filter(Boolean);
    const examples = (props.stories || []).filter((s) => (n.stories || []).indexOf(s.id) >= 0 ||
      (s.competencies || s.concepts || []).indexOf(n.id) >= 0);
    const meta = [LEARN_WORD[ls] || ls, 'Mastery ' + (n.mastery || 0) + ' of ' + MAX, n.due ? n.due + ' due' : null].filter(Boolean).join(' · ');
    const likert = CC.Likert ? h('div', null,
      h('div', { className: 'cc-ln-l' }, 'Your level'),
      h(CC.Likert, {
        scale: MAX + 1, value: n.mastery ? n.mastery + 1 : null, ariaLabel: 'Your level',
        labels: ['New to this', 'Mastered'],
        onChange: (v) => props.onSet(n.id, Math.max(0, Math.min(MAX, v - 1)))
      })) : null;
    const canPractise = (n.questions || []).length > 0;
    return h('article', { className: props.side ? 'cc-sp' : 'cc-ln-col', 'aria-label': 'Concept' },
      h('div', { className: props.side ? 'cc-sp-h' : 'cc-ln-h' },
        h('div', { style: { flex: '1 1 auto', minWidth: 0 } }, h('div', { className: 'cc-ln-t' }, n.title), h('div', { className: 'cc-ln-m' }, meta)),
        props.onClose ? ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close', onClick: props.onClose }) : null),
      n.deps && n.deps.length ? h('div', { className: 'cc-ln-m' }, 'Needs ' + n.deps.map((d) => (byId[d] ? byId[d].title : d)).join(', ')) : null,
      n.explain ? h('p', { className: props.side ? 'cc-ln-s' : 'cc-ln-p' }, n.explain) : null,
      canPractise ? h('div', { className: 'cc-ln-act' },
        ui.Button({ kind: 'primary', onClick: () => props.onPractise(n.questions[0]), children: 'Practise', action: 'practise' }),
        h('span', { className: 'cc-ln-m' }, plural(n.questions.length, 'question'))) : null,
      qs.length > 1 ? h(ui.Section, { title: 'Questions', meta: String(qs.length) },
        h(ui.List, { label: 'Questions' }, qs.map((q) => h(ui.Row, { key: q.id, id: q.id, title: q.text, tip: 'Practise this question', wrap: true,
          onClick: () => props.onPractise(q.id) })))) : null,
      likert,
      examples.length ? h(ui.Section, { title: 'Worked examples', meta: String(examples.length) },
        examples.map((s) => h(Example, { key: s.id, story: s, onCopy: props.onCopy }))) : null,
      h(Sources, { paths: n.evidence, onCopy: props.onCopy }));
  }

  // ---- optional: focused practice (only when the engine provides roles) ---------------------
  function Focus(props) {
    const React = CC.React;
    const h = CC.h;
    const ui = CC.ui;
    const textS = React.useState('');
    const text = (textS[0] || '').trim();
    const f = props.focus;
    const L = props.live;
    function submit(e) { if (e && e.preventDefault) e.preventDefault(); if (text) props.onFocus(text); }
    return h('section', { className: 'cc-ln-col', 'aria-label': 'Focused practice', style: { paddingBottom: '0' } },
      h('form', { className: 'cc-ln-focus', onSubmit: submit, role: 'search', 'aria-label': 'Focus' },
        h('input', { className: 'cc-in', type: 'text', value: textS[0], 'aria-label': 'Focus', placeholder: 'Focus, e.g. a role or topic',
          onChange: (e) => textS[1](e.target.value) }),
        ui.Button({ disabled: !text || props.busy, onClick: submit, children: props.busy ? 'Finding…' : 'Build list' }),
        ui.Button({ kind: 'quiet', disabled: !text || props.liveBusy, onClick: () => props.onLive(text),
          title: 'Copies a practice prompt with these questions, to answer out loud with a voice assistant',
          children: props.liveBusy ? 'Copying…' : 'Copy practice prompt' }),
        ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close focused practice', onClick: props.onClose })),
      L ? h('div', { role: 'status' },
        h('div', { className: 'cc-ln-m' }, (L.copied ? 'Prompt copied' : 'Copy the prompt below') + ' · ' + L.target + ' · ' +
          plural((L.questions || []).length, 'question') + ' · ' + plural((L.stories || []).length, 'example')),
        h('details', { open: !L.copied }, h('summary', null, 'Show the prompt'),
          h('textarea', { className: 'cc-in cc-ln-prompt', readOnly: true, value: L.prompt, 'aria-label': 'Practice prompt',
            onFocus: (e) => { if (e.target && e.target.select) e.target.select(); } }))) : null,
      f ? h(ui.Section, { title: 'Focus list · ' + f.query, meta: f.note || null,
        actions: ui.Button({ kind: 'quiet', size: 'sm', onClick: props.onClear, children: 'Back to next step' }) },
      h(ui.List, { label: 'Focus list' }, (f.questions || []).map((q, i) => h(ui.Row, {
        key: q.id, id: q.id, title: q.text, wrap: true, selected: props.index === i,
        lead: h('span', { className: 'cc-ln-m', style: { minWidth: '16px' } }, String(i + 1)), onClick: () => props.onPick(i)
      }))),
      f.stories && f.stories.length ? h('div', { className: 'cc-ln-m', style: { marginTop: '8px' } },
        'Examples to have ready: ' + f.stories.map((s) => s.title).join('; ')) : null,
      h(Sources, { paths: (f.company_files || []).concat(f.company_files && f.company_files.length ? [] : (f.role_files || [])), onCopy: props.onCopy }))
        : null);
  }

  function Legend() {
    const h = CC.h;
    const item = (status, label) => h('span', { key: status }, h(Dot, { status: status }), label);
    return h('div', { className: 'cc-ln-legend' },
      item('done', 'Mastered'), item('ready', 'Ready'), item('running', 'Learning'), item('not_started', 'Locked'));
  }

  // ---- page ------------------------------------------------------------------
  function LearnPage(props) {
    const React = CC.React;
    const h = CC.h;
    const ui = CC.ui;
    const bl = BL();
    ensureStyle();
    const api = props.api || CC.api;
    const st = React.useState({ data: null, error: null, loading: true });
    const viewS = React.useState('list');
    const stepS = React.useState(null);        // the practice step on screen
    const chosenS = React.useState(false);     // the step was picked by hand (not the next step)
    const revealS = React.useState(false);
    const busyS = React.useState(false);
    const selS = React.useState(null);         // the selected concept id
    const focusOnS = React.useState(false);
    const focusS = React.useState(null);       // {query, questions, stories, ...}
    const focusBusyS = React.useState(false);
    const focusIdxS = React.useState(null);
    const liveS = React.useState(null);        // {prompt, target, questions, stories, copied}
    const liveBusyS = React.useState(false);
    const toast = bl.useToast();
    const state = st[0], view = viewS[0], step = stepS[0], focus = focusS[0], focusIdx = focusIdxS[0], sel = selS[0];

    function load() {
      return api.get('/api/learn').then((raw) => {
        if (!raw || (!raw.concept_graph && !raw.graph && !raw.nodes)) return api.get('/api/interview');
        return raw;
      }).catch((e) => {
        if (e && (e.status === 404 || e.status === 503)) return api.get('/api/interview');
        throw e;
      }).then(
        (raw) => { const d = normalize(raw); st[1]({ data: d, error: null, loading: false }); return d; },
        (error) => { st[1]((prev) => ({ data: prev.data, error: error, loading: false })); return null; });
    }
    React.useEffect(() => { load(); }, []);

    const data = state.data;
    React.useEffect(() => {
      if (data && !step) { stepS[1](data.next || null); chosenS[1](false); revealS[1](false); }
    }, [data]);

    function onCopy(path) {
      bl.copy(path).then(() => toast.show('Path copied'), () => toast.show('Could not copy'));
    }

    function show(next, chosen) { stepS[1](next || null); chosenS[1](!!chosen); revealS[1](false); selS[1](null); }

    function openQuestion(qid, idx) {
      return api.get('/api/interview/question?id=' + encodeURIComponent(qid)).then((s) => {
        focusIdxS[1](idx == null ? null : idx);
        show(s, true);
        viewS[1]('list');
      }, (e) => toast.show(bl.errorText(e, 'That question')));
    }

    function rate(qid, n) {
      return api.post('/api/learn/record', { concept: qid, outcome: n }).catch((e) => {
        if (e && e.status === 404 && !(e.data && e.data.detail)) return api.post('/api/interview/rate', { question: qid, rating: n });
        throw e;
      }).then((res) => (res && res.result) || res || {});
    }

    function onRate(n) {
      if (!step || busyS[0]) return;
      const qid = step.question ? step.question.id : step.concept;
      busyS[1](true);
      rate(qid, n).then((res) => {
        busyS[1](false);
        toast.show(RATINGS[n - 1].label + (res.next_review ? ' · next review in ' + res.next_review : '') +
          (res.mastery != null ? ' · mastery ' + res.mastery + ' of ' + MAX : ''));
        load();
        if (focus && focusIdx != null && focusIdx + 1 < (focus.questions || []).length) {
          openQuestion(focus.questions[focusIdx + 1].id, focusIdx + 1);
        } else {
          focusIdxS[1](null);
          show(res.next !== undefined ? res.next : null, false);
        }
      }, (error) => { busyS[1](false); toast.show(bl.errorText(error, 'Recording the outcome')); });
    }

    function onFocus(text) {
      focusBusyS[1](true);
      api.get('/api/interview/prep?q=' + encodeURIComponent(text)).then((p) => {
        focusBusyS[1](false);
        focusS[1](p);
        if (p && p.questions && p.questions.length) openQuestion(p.questions[0].id, 0);
      }, (e) => { focusBusyS[1](false); toast.show(bl.errorText(e, 'Focused practice')); });
    }
    function copyLive(live) {
      return bl.copy(live.prompt).then(() => true, () => false).then((ok) => {
        liveS[1](Object.assign({}, live, { copied: ok }));
        toast.show(ok ? 'Practice prompt copied' : 'Could not copy; the prompt is shown below');
      });
    }
    function onLive(text) {
      liveBusyS[1](true);
      api.get('/api/learn/live_prompt?company=&role=' + encodeURIComponent(text || '')).then(
        (live) => { liveBusyS[1](false); return copyLive(live); },
        (e) => { liveBusyS[1](false); toast.show(bl.errorText(e, 'The practice prompt')); });
    }
    function clearFocus() {
      focusS[1](null);
      focusIdxS[1](null);
      show(data ? data.next : null, false);
    }

    function onSet(conceptId, mastery) {
      api.post('/api/learn/record', { concept: conceptId, outcome: 'set:' + mastery }).then(
        () => load(), (e) => toast.show(bl.errorText(e, 'Saving your level')));
    }

    // Keyboard: Space or Enter reveals the answer, 1-4 record the outcome (never while typing).
    React.useEffect(() => {
      if (view !== 'list' || typeof document === 'undefined') return undefined;
      function onKey(e) {
        const tag = e.target && e.target.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
        if (!step || (sel && sel !== step.concept)) return;
        // only while the Learn page is on screen (dsh may keep hidden tabs mounted)
        if (document.querySelector) {
          const root = document.querySelector('.cc-learn');
          if (!root || (root.getClientRects && !root.getClientRects().length)) return;  // hidden: display:none has no boxes
        }
        if (!revealS[0] && (e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON') { e.preventDefault(); revealS[1](true); }
        else if (revealS[0] && /^[1-4]$/.test(e.key)) { e.preventDefault(); onRate(+e.key); }
      }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    });

    const nodes = data ? (data.graph.nodes || []) : [];
    const byId = {};
    nodes.forEach((n) => { byId[n.id] = n; });
    const qById = {};
    (data ? data.questions || [] : []).forEach((q) => { qById[q.id] = q; });
    const hasFocus = !!(data && data.roles && data.roles.length);
    const Menu = bl.Menu;

    const meta = data ? data.mastered + ' of ' + data.total + ' mastered' + (data.due ? ' · ' + data.due + ' due' : '') : null;
    const header = ui.PageHeader({
      title: 'Learn', pageId: 'cc-learn', meta: meta,
      mid: ui.Segmented({ label: 'View', options: VIEWS, value: view, onChange: viewS[1] }),
      actions: [
        view === 'map' ? h(Legend, { key: 'l' }) : null,
        hasFocus && Menu ? h(Menu, { key: 'm', label: 'More', items: [
          { label: focusOnS[0] ? 'Hide focused practice' : 'Focused practice', onClick: () => focusOnS[1](!focusOnS[0]) }] }) : null
      ]
    });

    let body;
    if (!data) {
      body = state.loading
        ? h('div', { className: 'cc-ln-line', role: 'status' }, 'Loading concepts…')
        : h('div', { className: 'cc-ln-line cc-bad', role: 'status' },
          h('span', null, bl.errorText(state.error, 'Learn') || 'Learn is unavailable.'),
          ui.Button({ kind: 'quiet', size: 'sm', onClick: load, children: 'Try again' }));
    } else if (!nodes.length) {
      body = h(ui.Empty, { title: 'No concepts yet', body: 'Add concepts to the learn seed file, then open Learn again.' });
    } else if (view === 'map') {
      const selNode = sel && byId[sel] ? byId[sel] : null;
      body = h('div', { className: 'cc-ln' },
        h('div', { className: 'cc-ln-graph' }, CC.FlowView
          ? h(CC.FlowView, { board: data.graph, filter: 'all', selected: sel, onSelect: selS[1], cameraKey: 'learn-map' })
          : h('div', { className: 'cc-ln-line' }, 'The map is still loading; List shows the same concepts.')),
        selNode ? h('aside', { className: 'cc-split-side', 'aria-label': 'Concept details' }, h(Concept, {
          node: selNode, byId: byId, qById: qById, stories: data.stories, side: true, onClose: () => selS[1](null),
          onCopy: onCopy, onSet: onSet, onPractise: (qid) => openQuestion(qid, null) })) : null);
    } else {
      const order = conceptOrder(nodes);
      const nextId = data.next ? data.next.concept : null;
      const current = sel || (step ? step.concept : null);
      const focusLabel = focus && focusIdx != null ? 'Question ' + (focusIdx + 1) + ' of ' + focus.questions.length + ' for ' + focus.query : null;
      const list = h('nav', { className: 'cc-ln-list', 'aria-label': 'Concepts' },
        h(ui.List, { label: 'Concepts' }, order.map((n) => {
          const ls = learnStatus(n);
          const pct = Math.round(100 * Math.max(0, Math.min(MAX, n.mastery || 0)) / MAX);
          return h(ui.Row, {
            key: n.id, id: n.id, title: n.title, tip: n.title + ' · ' + (LEARN_WORD[ls] || ls),
            lead: h(Dot, { status: n.display_status || LEARN_TO_BOARD[ls] || 'not_started' }),
            meta: n.id === nextId ? h(ui.Badge, { tone: 'action' }, 'Next') : (n.due ? n.due + ' due' : null),
            trail: h(ui.Meter, { value: pct, tone: ls === 'mastered' ? 'ok' : 'plain', title: 'Mastery ' + (n.mastery || 0) + ' of ' + MAX }),
            selected: n.id === current, onClick: () => selS[1](step && n.id === step.concept ? null : n.id)
          });
        })));
      let detail;
      if (sel && byId[sel] && !(step && step.concept === sel)) {
        detail = h(Concept, { node: byId[sel], byId: byId, qById: qById, stories: data.stories, onCopy: onCopy, onSet: onSet,
          onPractise: (qid) => openQuestion(qid, null) });
      } else if (step) {
        detail = h(Practice, { step: step, chosen: chosenS[0], revealed: revealS[0], busy: busyS[0], focusLabel: focusLabel,
          onReveal: () => revealS[1](true), onRate: onRate, onCopy: onCopy });
      } else {
        detail = h(ui.Empty, { title: 'Nothing due right now', body: 'Every concept is mastered and no review is due. Pick a concept to practise it again.' });
      }
      body = h('div', { className: 'cc-ln' }, list,
        h('div', { className: 'cc-ln-main' },
          hasFocus && focusOnS[0] ? h(Focus, { focus: focus, index: focusIdx, busy: focusBusyS[0], live: liveS[0], liveBusy: liveBusyS[0],
            onFocus: onFocus, onLive: onLive, onClear: clearFocus, onCopy: onCopy, onClose: () => focusOnS[1](false),
            onPick: (i) => openQuestion(focus.questions[i].id, i) }) : null,
          detail));
    }

    return ui.Page({
      id: 'cc-ready', className: 'cc-learn', header: header, raw: true,
      children: [
        h('div', { key: 'b', style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, position: 'relative' } }, body,
          toast.msg ? h('div', { className: 'cc-toast', role: 'status' }, toast.msg) : null)
      ]
    });
  }

  CC.LearnPage = LearnPage;
  CC.LearnPractice = Practice;
  CC.LearnConcept = Concept;
  CC.LearnFocus = Focus;
})(CC);

		// ── brand.js
(function (CC) {
  // Product identity for the harness, independent of the dsh distribution underneath.
  // Change the name or mark here only: the sidebar, the blank-session hero, the tab title and the
  // favicon all read CC.BRAND.
  //
  // How it fits dsh without editing it: `sidebar.brand.mark`, `sidebar.brand.name` (ui-sidebar) and
  // `conversation.hero.brand.mark` (ui-conversation) are declared replaceable `single` seats. dsh's
  // slot registry keeps every registration sorted by `priority` and renders the lowest, so we
  // register below the official occupant (priority 0) instead of disabling its row. If a dsh update
  // removes a seat, inject() simply never fires and dsh's own brand shows; if registration throws,
  // CC.contribute logs one [waypoint] warning and carries on.
  CC.BRAND = { name: 'Waypoint' };
  // Everything between the markers is written by scripts/make_icons.py from its CONFIG block (the
  // sidebar glyph and the icon data URIs); never edit it by hand.
  // @generated-art begin (scripts/make_icons.py; edit CONFIG there, never here)
  CC.BRAND.concept = 'constellation';
  CC.BRAND.mark = 'M5.4 18L9.6 11.6L14.4 14.8L18.6 6.8M9.6 11.6L5.8 7.2M3.4 18A2 2 0 1 1 7.4 18A2 2 0 1 1 3.4 18M7.6 11.6A2 2 0 1 1 11.6 11.6A2 2 0 1 1 7.6 11.6M12.4 14.8A2 2 0 1 1 16.4 14.8A2 2 0 1 1 12.4 14.8M15.8 6.8A2.8 2.8 0 1 1 21.4 6.8A2.8 2.8 0 1 1 15.8 6.8M4.4 7.2A1.4 1.4 0 1 1 7.2 7.2A1.4 1.4 0 1 1 4.4 7.2';
  CC.BRAND.svgUri = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20256%20256%22%20width=%22256%22%20height=%22256%22%3E%3Crect%20x=%228%22%20y=%228%22%20width=%22240%22%20height=%22240%22%20rx=%2256%22%20fill=%22%230b3b2e%22/%3E%3Cpath%20d=%22M62%20188%20L104%20124%20L152%20156%20L194%2076%20M104%20124%20L66%2080%22%20fill=%22none%22%20stroke=%22%2334d399%22%20stroke-width=%2212%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3Ccircle%20cx=%2262%22%20cy=%22188%22%20r=%2220%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%22104%22%20cy=%22124%22%20r=%2220%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%22152%22%20cy=%22156%22%20r=%2220%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%22194%22%20cy=%2276%22%20r=%2228%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%2266%22%20cy=%2280%22%20r=%2214%22%20fill=%22%2334d399%22/%3E%3C/svg%3E';
  CC.BRAND.png = {
      16: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABBElEQVR42mNggAJuaz1DIC4D4gYCGKTGkAEZQAX/k4jLkG3+TyY2JNp24Ujn/3p7O/8bnZ78X7o8AuEKqL/AAlrrG/4bHO3HaoDK9Pz/JpdngjHIIKh4A4YBIAWKPekYBij2ZcANUF9cjt0AEFbqzwQr0lhR/V8wyA4urjqr8L/JpRn/FbpS//PYG+I2AIQNjvRDndoF8X+UC8Rl3WnoLsNhwLEJcOfqbG35r7ur/b/RmSn/eV1MCBug2Avxq3i673/JguD/xuenoQccbgOUp+SAFStPzkEYCAxQkJhCewp+AyQLQ+DOFvC3ITYhNcATknC4EziRgPxLUnKmOClTnJkozc4ATWZ1X0p4mzEAAAAASUVORK5CYII=',
      32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB+0lEQVR42mNgGGyA21pPDog7gfgyEP8C4v8U4l9Qs0BmyhGyPIVKluJzTAo+y//TCadgC/ZfdHTAL5TogMbPfzrjTmQHXKa2BYrdaf8Njvb/N7k447/W2rr/oome6GouIzuAqsGvMi3vv8nlmagY6BDhcCeUaEB2AFaDlCZl/9dcVfNfPMOPaMsFfK0xLYdikMOQ1eJ1gGxNDFyjwZF+oh0ACmpcDgBFBVkOMD43lf4hAIsCvb2dYM2gREXlNEDYAXCHTMgCGyJTE02UA0SiXcDqjc5MwZcLiHcACKstKIUYenbqf8NTk/4rtKfgVKu+qOy/0anJ/3mdTfCaSZIDJLIDMIJVIssfMxEmQRKhXHMiQTNJcgDIx+gOwBYKGiuq/xsc7vvPbatPXQeAfIvuAO3NTf8FA2zhakDlBUhctjaGqLRCkgPEkrwgWfL8NHAa0FheBWaDMIgNEjO+OP2/4YmJROcWkhygs7UFmCW7/vPYGcDFQL4HhQIxaYMiByh0peI0mNi0QbYDROLcwYYqo5Vi+NIGVUJAdW4xOE6NzwHj/PjE/7xOxnhzCCgNECofiHaAYm8GRjHK52ZG9UYJTgeAik70YMVWlFLTAb/whQAoKmgQAr/wNslgaUBvX9d/yfxgWrQJLw+qRunANssHvGMyKLpmg6JzOhAAAIZYfsAlmIV3AAAAAElFTkSuQmCC',
      48: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADJUlEQVR42mNgGAmA21rPFIhTgLgGiBtojGugdplS6mg2qGH3gfj/AOH7UDewkep4nwF2ODaP+BDr+JRB5HB0nEJMyP8f5NgHX5q/PwQ8cB9rnoBmlv9DBNdg88D9IeSB+9jK+QFzkHCk83/VucX/DY9P+G9yeeZ//f3d/xX7Mv7zuZri02c6KEoeqcIQsKOxYZBHhMIcCZdIA5X+BYPscDoehrU3NxPOB9AqnKCF8s2J/1VmFf6XLg2nigeUJmUT9AAIS+YFYdPfQJIHNFdWoxiq0J1GsQd0t7cS5QGQRynygHCUC4ahRqcmU+wBUBonxgMqMwto4IGzUyn2gMaKaqI8IAdMulRPQiAsmuBBkQdAeYkYD4AyO8UegGVitXkl/w2O9IMNNjjc918wwJYiT6gvqcDrePn2ZFx6SfcAPElFOP03Oj0ZXszxOBiR7QGhUAdSkw7lHgBh8XRfuEWgUJQqDv2v0J4CpkkxR3V2EaTSOtD9X7YmBhzioKTF72FOSC9lHgCn4fIIrCGnt6cTXw0KxyIxrnA9ZNQtlHsAXBQe6sVeg25sJJz+F5WD1epsbSHHbso9AAplfBkQXyyIJXkRqmlp7wFQMYrPA/iKWVixrLWuntwCgHIP8LqY4C8CW7CXIuKZfnA1oMJgwDwAScdleD0BCmlQUQluOkNLKr29nWA5jeVVlNQhlHsA1OEwONIHaVqcmQIvgWQb4v4rT8lF8YjhsQkYnqOwVUu5B1RmFIAdYnxu6n8BfxsMeYks//96+7pwt/WJKKlo5gGJnEC4Q2SqoklqCBJbUtHMA7yORsCasweSjpdV0qykopkH4On70oz/gsH2FJVUIHm6eABU2YDaKcqTc+CWy9bFEmUZqOTB5niQOM3zAKhRBcps6JaTWv3L1saASyh4SQXkU9ghIs4Daguxl/MGR/sHenCLsAcIpV9QjTqoPSDga43XA6S2/WnpAZwDW/oHe2lRhlN3gBff0KJ0RST2oY5peYNnsoPQ4C4oqehsgwxCgWIET0ebnth0+AyvD5cJjqE9xTTkJ/mGxTTrsJjoHhZLDYbFYo+hAgAQ9G5mMVhtOQAAAABJRU5ErkJggg==',
      256: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAQSElEQVR42u2d63NV5RWHz4d8O0TBekEi4iVQy/0EG1uRhiK10cYO5aqnaMDaQhVQqahQDdCI9YJKikGs09gOvXzo2DbTqe3QKe200zot6bTRyV/AX5Cv+ZDddx12KgKSnPfsy1r7fdbMM8OE5Jyz917rd97LetcqlTAMwzAMwzAMwzAMwzAMwzAMwzAMwzAMwxRbefniJkfFUXX0OAYcJx3DjjOOUceYY9wRQdCMx74wGvvGcOwrA7HvVGNfaiKy9AZ8S/yg+h1DBDakJBRDsY+Jr7UQefkGfbujN34oOCjkwVDsg+1EZDZB3xoPy0ZwPlDGSOybrURq8oHf5RjEycAI4qtdRG7jgd/NEB+MTxG6ieT6A78ar8biRFAExJerRPbkgd/hOIXDQEER3+4g0i8M/OZ4ewUngRAQX28m8s8G/4Y4AQPHgJAQn98QevDzrQ/BjwZCDPwKq/sAH9stqIS0wj/GQwf4GGOF3ylwF7iPBw1wSfYVNfj7eLgAU6KvaME/wEMFqIuBogT/CR4mgBcn+OYHYCTAnB+ANQFW+wHYHTCwz88DA0ieqoUMP5J8ANJLFqpoFgDSewFSThvmYA8AB4jUHenlwQBkxwZNxTw4zw+QfT2BZob+AEwFcq3hx4MAyI+OPAWAAp4A+XKKhB8AEoQyFwDq9gPoYDiPjj3ceAA9dJPxB0CGYCaNOrnhAProykIA6NILoJPBtIO/lZsMoJrWNAWghxsMoJqeNAVghBsMoJqRtIK/nZsLYIL2NASglxsLYIJe9v4BzuOqLZ3R9Qe6o7lv744WDB6Mlvz11ajt3/3RrR+8VUP+LT+T/5Pfkd+Vvwk+J8C9YAsOBBa59vF10byfPHU20D98ywv5W3kNeS1D197CwR8Iksvv+Xx04yvfiirv93kH/SchrymvLe8RzAEhin6ABaatrNSCszak/zBl3HvIe8l7Fr5YCPN/sDDUl/l76oF/HvKeSqcGQ0kFf5NjHCcDrbQe25V54J+PfAZl90VitimpZh84GqhjxpoVtRX7vIN/Avks8pkU3aMKC4BQSD5VXZ3LkH8qUwL5bIVZCCT/HzQGfxor/EnuFCgRgZ4kBGAApwNNw36N3/wXGwkomA4MJCEAJ3E80IKmOf9U1gRyvl8nKf4JrPaHuzswnIQA0PYLVOzzWwv+CXLMEziThACM4oCQd4afhXn/pdYDcsoYHE1CAMZwQsiTWnqv0eCfQK4hh3s3loQAkAUIuR7sySS3P4OzAzkcIBpPQgBwRODb3+goAAEA02hO+PFJEEIAFHD1w1+Jbnr929GC3xyIKv844oZnx2vIv+Vn8n/yOwQgK//WdwQQgHO4bm81WvzHF6f8sOR35W8IxnyQKjxFEwC5JgQg69zx+++sfbN7Z3S5v5XXICizpZEyXlqRa0IAshxGPrb27BC/4VXc47XXIjCzK+BZtOCfIMtCo0ELQC34k57DIQKZIBV5iyoAcm0IQAbD/kS++S8yEmA6kD5SlruoAiDXhgCkfWqsgTn/VNYECFJO/Vk4JRikAMjKfdoPkd2BdLGc+z+VswEIQIrUs9Xni7wHgcoOgPadgOAEQBJ4snqQJAulRyHy/y9xLgABSAnJ4svqQcp7EawIAAIQyOIfi4FMAZgCaD88Irn9WR3ucO9FsLIIyCKgqqHj8QyHcscJVrYB2QZEAIBEIBKBmAIAqcCkArMICBwG4jAQ24DATgDHgUkEAgqCUBCkcKnAbf86SpBSEoySYKEeBqpVeT28jUClKChFQUNeDJz97GYClbLglAUPpiDIRZi542sEK41BNDYGoSRYFg932X/fjK584C4CllGAttZgFAVNrCjoZPndfzkcTb93OQG7nOagipqDIgBJlAWfemLQwWjaiqUELTsCWtqDIwCNNAaxsM8bEq3HdpkLfvnMed4zBMCjNdgtP9vbWIZg36MELKcEMz31hwAkjGzvNXTg42A3AZsCM9asMLEeIJ9RPisCYHn12SX6NOIEs3avJ2jTWNOprladICSfTT6jhnuFAOR8Lv3qh+4maFMSAY0jAflMWoIfAUiIz/zyOW+HWPr316MZa79A0KZxZLj7y+rm/BqG/QhAwlzWeVu0qIHdg4XvPR8137mMoE2Ym4/uYLUfAchoyLlpVdR2+qi3g9zy873cxyQXA9d1qBny57nPjwBkyDXb7i3kt4TJtZkfPpF7br+k9+aV4YcA5ETL0/c15Dhzvv8N7mMCC4B5rvBL4OdxsAcBUIIEcSNOJCLCfWygUtCP93hVcG6kjJdkeGoe6iMAxtJSZTrBffRY+d/qVyx01hPra8U4pSKvbO3Kir3M32t1Bz84O6SXf8vP5P/kd+R3syzgiQAYQxb2vL9V3IKiLCx+tKXVGc059FD06Z8+U9txkJJjEynK8m/5mfyf/I78brD3/Bf7TKbkIgAFRLb2ZIvPu8X4qZdrW1lLPRJa5G9ufHW7un1njYuwMx9dgwAgACltR7kkH0n2yXNF+uY3dkaX3/25wt/r+b/aX/e9kSSukP0TAcjidKFL98293rybJrQ8tam49QB2raV0OwKgFzn4oyExRUYDRby/C39X/1RL1kxC90sEIEPkCLAGESia47fs2eR1H6jTiABkjhQDQQQW597oZe6PvoM/IgBht7QqwnTguu9+3evar9j4RXwRAcipiq0rDCoFQjWIgOmFwTsWe53558wFAhBUY5LJdgesbhFe/70tXtccUm4EAqD1rLobfms5q25xKtC8allU+ecP6i/IeuQR/A8ByL9wpbZSVda+FW946ZteHZpCSIhCALQXE3UpuupaU7nPZOX+SRBLMNd7jSIa+B8CkDtLFRarlM9kZivVDePrPqfvpgsybcD/EICcC1V2qi1XbeEUoe/0SRYM8T8EIP9iIe64rlYBkM9WxDoLslUoW4b4HwKQO5KBp1UAtGcHSvKOz3VJshC+hwCoYFHKzUcbQT6b6kKfLn237poKyq8JAQiMWiUfpQIgn03rfZODO16Zjns24XcIgB40ZP9dqjBmkaZOckQYn0MAEADjAiBFO3yuR4qE4HMIAFMA41MAn96LUh4Mf0MAWAQ0vggoBTspq44AsA0Y6DaglOyuu8+iKw2OryEAJAIZTwSSZh1eGY1bO/E1BIBU4HqZ/dwDuqZLf3ih7muQtmD4GQLAYSDvU4HbdBT6fOZ+r88vjUHxMQSA48ANsPD3h1wvg3tyvUdL/vxK/YU+XUtw/AsBoCCI8dHA7P0P+hU1WdeBfyEAlASzPBqY1lHxaqUmPRTxKwTAVFUbzUlBeY0G5rzgt0syvet2/AoBsIWU5LYiAFmMBi6767NR29Ab9YvT4W34EwJgk/nv7jclAr6jAdn+lDwDSTaSjMPa6EfORTjk3/KzxX96qf70ZScYIhz4EgJgDhm2tp0+ak4ApjoakMVO2fFIc9tTpgz4EgJgknnv7DEZ/JONBmR9I4tFTlkslEVDfAkBMMesJzfm88393qFURwOyrpHV4qZsF+JLCIC9HYDO26LK+32ZH/Wd6AMowSpBa0FcPrHQp0sUwpcQAJPMfXt35q2/LtYRR4bvVqcekiqMLyEA5rj28XWZNfqQBbjJWn6lNRoIvYIxAgAX0Lz61mjp317zW2x7bfuk22jyf/I7Pg0+LI4GLDY1RQACpvXNx/y+7U48nU3tPYOjgYl1DUAAVDNzh19pq2X/OZZ5515LowEZ/dDxFwFQzbSVbV7HW2tdbZ7dnE8lXkOjAaYCCIDyk387vBxbQ207K6OBrEdJCAACMCWu2f5Vb6e+Yv1KFddgYTQgOx74GwKgizuW1HrTebWzPvCgwkpGekcDsu2JzyEAqrjpyCNeziyNMLRekxQO1SoCPtufCAACoKqdVa2w5X2rKGtegLLmCEDALPKcM895fmtEYxOyAxEAy1V/D/vNlef/+gCtzQrW2gwBCIyrtvg3/rhy85cimpsWr7kpAhAQC37b6+W8N7z4cER782K2N0cAAkGC2MdxRTSsXCMCgAAgABdBhu/e21db7GxfMQVAABCAi1X3dQt4XhlsxkpaswiIACAA5++Nu607L4d1W4XWrpVtQAQAATgHSdrxdVhJFjIndiQCIQAIwEdI2q6Ps0qasMltzu5OUoERAARAkAM7Po4qB4TkoJDV606z0QeHgRAAE8hRXV9nlSPCpjMd3dFbjgMjAEELgBTr8KteY7+NtRTfoCAIAhCsAEiZLt9mFlIerBhVjnZSEgwBCE8A5JtGCnX6OKoUBi3KfZBCnBqSgigKigBkuw/uSnT7OKqUBC/avZCS3JQFRwBsn96bQt/6iYYb0pzDa4XaNQORpiDFLHi6k6E/AmBvGJ923/pzkXZghR4V5ZAdSNYfAuA1b836G0sagQYxNcpQBAh+BMBrvpr1opW0AJdW4OVg+h/sZNiPADBPnWDWkxuDc6i0hFZekwU/BMDM6bV57+wJ1qmSnmrJa7HVhwCYCf6200ej6V23B+9cjSy2yt/I35LhhwCY256a/+5+nKuB7VZO9SEAJKgAIACkqAIgABxSAUAAOKYKgABQqAIAAaBUFQACQLFKAASActUAAQsADSsAAhYAWlYBBCwANK0ECFgAaFsNgAAgAABMAZgCALAIyCIgANuAbAMCpCcA4yQCkQgEJhlPQgDGSAUmFRhMMpaEAIxyGIjDQGCS0SQE4AzHgTkODCY5k4QADFMQhIIgYJLhJATgJCXBKAkGJjmZhAAMlCkKSlFQsMhAEgLQU6YsOGXBwSI9SQhAtUxjEIb+YJFqEgJQKdMajKw/sEglCQFo0pINSN96gKlnAUrslpIw90JDZfrW41RgiaFSUuZerL9M33oAS/QnKQDVMn3rAcJaADxHAFrK9K0HsERLKUnTvg5A33qAFOb/5whALzcWwAS9aQhAOzcWwATtpTTMvfAINxdANSOltEzjuQAASDj//xIC0MoNBlBNaylNc28wyE0GUMlgKW1zb9LFjQZQSVcpC7OaEwDA3n8yAtDNDQdQRXcpSysrKhYKUKb4ZylrAahy4wEKdvCnThE4xc0HyJVTpbzMvXkHDwAgVzpKeZqFYiEAFP1ITwCay4rahwEEgsRcc0mDuQ+ygQcCkCkbSpqMqQBAQEN/MgQBCp7x59lEZIyHBJAKY4k0+yBBCICEnzRFYB8PCyBR9pUsmfvAfTw0gEToK1k098EHeHgADTFQsmzuAk7wEAG8OFEqgjESAAjsm581AYDA5vzsDgAEttrvmSdAshDAhUk+1VIIFmcMkjYMEKf3qs/w4wARQEAHezI+Skw9AQjxPP+GEvb/oiKMBiCYb301xTyUCUFHmUKjUFxO5V7Dz9BOAX0HoCgMB7PCn0IHInYLwPLqfjeRnExDUroSgxUGM2vUGZgQtDp6HCM4GShjJPbNViI1GzFod/QyRYCch/jig+1EZL5i0BIvHPbHD2Uc54SEGY99qz/2tRYiT68gNMXpxtV4WCbHkU/Gq7GSgDEa514jFDAe+8Jo7BvDsa8MxL5TjX2picjCMAzDMAzDMAzDMAzDMAzDMAzDMAzDMEyz/Q/lWkwVs/iBewAAAABJRU5ErkJggg=='
  };
  // @generated-art end
  var PRIORITY = -10;
  var SLOTS = { mark: 'sidebar.brand.mark', name: 'sidebar.brand.name', hero: 'conversation.hero.brand.mark' };
  var UPSTREAM_TITLE = /DeepSeek Harness/;
  CC.BRAND_SLOTS = [SLOTS.mark, SLOTS.name, SLOTS.hero];

  // app.js (loaded later) defines CC.warn; until then log the same prefixed line directly.
  function warn(what, err) {
    if (typeof CC.warn === 'function') return CC.warn(what, err);
    try { console.warn('[waypoint] ' + what + (err ? ': ' + (err.message || err) : '')); } catch (e) { /* never throw */ }
  }

  function BrandMark(props) {
    var size = (props && props.size) || 24;
    var attrs = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, 'data-cc-brand': 'mark' };
    if (props && props.className) attrs.className = props.className;
    return CC.h('svg', attrs, CC.h('path', { d: CC.BRAND.mark }));
  }

  function BrandName() {
    var t = CC.tokens || {};
    return CC.h('span', { 'data-cc-brand': 'name', style: {
      fontSize: (t.size && t.size.section) || 17, fontWeight: (t.weight && t.weight.semibold) || 600,
      letterSpacing: '-0.005em', lineHeight: 1, whiteSpace: 'nowrap', color: 'currentColor' } }, CC.BRAND.name);
  }
  CC.BrandMark = BrandMark;
  CC.BrandName = BrandName;

  // ui-layout's DocumentTitle rewrites the tab title to "<session title> — DeepSeek Harness" (a
  // hard-coded product title) whenever the selected session changes, so we swap just the product
  // part and keep the session prefix.
  function brandTitle(current) {
    var name = CC.BRAND.name;
    if (!current) return name;
    return UPSTREAM_TITLE.test(current) ? current.replace(UPSTREAM_TITLE, name) : current;
  }
  CC.brandTitle = brandTitle;

  // The icon is one flat, full-colour tile, so it reads on light and dark tab strips and taskbars alike
  // (no per-scheme variants). The vector goes in as `sizes=any`; sharp PNGs (drawn with optical sizing at
  // 16 and 32 px) and an apple-touch-icon sit beside it, all as data URIs so no served asset is needed.
  function faviconUri() { return CC.BRAND.svgUri || ''; }
  CC.faviconUri = faviconUri;

  function iconSpecs() {
    var png = CC.BRAND.png || {};
    var specs = [];
    if (CC.BRAND.svgUri) specs.push({ rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: CC.BRAND.svgUri });
    [16, 32, 48, 256].forEach(function (n) {
      if (png[n]) specs.push({ rel: 'icon', type: 'image/png', sizes: n + 'x' + n, href: png[n] });
    });
    if (png[256]) specs.push({ rel: 'apple-touch-icon', sizes: '256x256', href: png[256] });
    return specs;
  }
  CC.iconSpecs = iconSpecs;

  function setLink(l, spec) {
    ['rel', 'type', 'sizes', 'href'].forEach(function (k) {
      if (spec[k]) l.setAttribute(k, spec[k]); else if (l.removeAttribute) l.removeAttribute(k);
    });
  }

  // Re-brand every later title write. Our replacement never matches UPSTREAM_TITLE, so the observer
  // cannot loop. One observer per page: a bundle reload (HMR) disconnects the previous one.
  function watchTitle(doc) {
    var g = typeof globalThis !== 'undefined' ? globalThis : {};
    if (typeof g.MutationObserver !== 'function' || !doc.head) return;
    if (g.__ccBrandTitleObserver) { try { g.__ccBrandTitleObserver.disconnect(); } catch (e) { /* gone */ } }
    var obs = new g.MutationObserver(function () {
      try { if (UPSTREAM_TITLE.test(doc.title)) doc.title = brandTitle(doc.title); } catch (e) { /* never throw */ }
    });
    obs.observe(doc.head, { subtree: true, childList: true, characterData: true });
    g.__ccBrandTitleObserver = obs;
  }

  function applyDocument() {
    var doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return;
    try { doc.title = brandTitle(doc.title); watchTitle(doc); } catch (e) { warn('tab title not set', e); }
    try {
      var specs = iconSpecs();
      if (!specs.length) return;
      var all = doc.querySelectorAll ? Array.prototype.slice.call(doc.querySelectorAll('link[rel~="icon"]')) : [];
      var ours = {};
      var theirs = [];
      var mine = doc.querySelectorAll ? Array.prototype.slice.call(doc.querySelectorAll('link[data-cc-icon]')) : [];
      mine.forEach(function (l) {
        var key = l.getAttribute && l.getAttribute('data-cc-icon');
        if (key) ours[key] = l;
      });
      all.forEach(function (l) { if (!(l.getAttribute && l.getAttribute('data-cc-icon'))) theirs.push(l); });
      // dsh's own icon links (one per colour scheme) now show the vector tile for both schemes.
      theirs.forEach(function (l) {
        setLink(l, specs[0]);
        if (l.removeAttribute) l.removeAttribute('media'); else l.setAttribute('media', 'all');
      });
      specs.forEach(function (spec, i) {
        if (i === 0 && theirs.length) return;
        var key = spec.rel + ':' + spec.sizes;
        var l = ours[key];
        if (!l && doc.createElement && doc.head) {
          l = doc.createElement('link');
          doc.head.appendChild(l);
        }
        if (!l) return;
        setLink(l, spec);
        l.setAttribute('data-cc-icon', key);
      });
    } catch (e) { warn('favicon not set', e); }
  }

  CC.applyBrand = function applyBrand(ctx) {
    try {
      if (typeof CC.contribute !== 'function') { warn('brand helper missing; dsh brand kept'); return; }
      CC.contribute(ctx, SLOTS.mark, { name: SLOTS.mark, priority: PRIORITY }, BrandMark, 'brand mark');
      CC.contribute(ctx, SLOTS.name, { name: SLOTS.name, priority: PRIORITY }, BrandName, 'brand name');
      CC.contribute(ctx, SLOTS.hero, { name: SLOTS.hero, priority: PRIORITY }, BrandMark, 'hero brand mark');
      applyDocument();
    } catch (e) { warn('brand not applied; dsh brand kept', e); }
  };
})(CC);

		// ── model_badges.js
(function (CC) {
  // Badges in dsh's chat model picker (M4): ~Elo, context window and a "Run natively"
  // marker beside each model name, from Waypoint's model registry (GET /api/models).
  //
  // How it fits dsh without editing it: `conversation.input.model.label` (dsh-client-ui-model-
  // selection) is a public, session-scoped inline `single` slot that dsh renders for the composer
  // trigger ('trigger'), the root menu's current value ('menu') and each model row ('option'). It
  // gets the provider id/name and the exact catalog model; the selector keeps clicks, focus, search
  // and check marks, so this label is plain non-interactive text. Model names stay as dsh's catalog
  // names: badges are never baked into them. Unknown facts stay blank. If the engine is down, or a
  // dsh update removes the slot, dsh simply shows the catalog name.
  var SLOT = 'conversation.input.model.label';
  var PRIORITY = -10;
  var TTL_MS = 60000;
  var SEP = ' · ';
  var state = { byKey: null, at: 0, pending: null };
  var listeners = [];
  var warned = false;

  // app.js (loaded later) defines CC.warn; until then log the same prefixed line directly.
  function warn(what, err) {
    if (typeof CC.warn === 'function') return CC.warn(what, err);
    try { console.warn('[waypoint] ' + what + (err ? ': ' + (err.message || err) : '')); } catch (e) { /* never throw */ }
  }
  function noop() {}

  function keyOf(provider, model) { return String(provider) + '\u0000' + String(model); }

  // Same rounding as the registry's badge (models._fmt_ctx): 131072 -> 128K, 1048576 -> 1M.
  function fmtCtx(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
    if (n >= 1000000) {
      var v = n / (n % 1048576 === 0 ? 1048576 : 1000000);
      return v.toFixed(1).replace(/\.0$/, '') + 'M';
    }
    return (n % 1024 === 0 ? n / 1024 : Math.round(n / 1000)) + 'K';
  }

  function parts(row) {
    if (!row) return { elo: null, ctx: null, native: false, usage: null };
    var elo = typeof row.elo === 'number' && isFinite(row.elo) ? '~' + Math.round(row.elo) : null;
    return { elo: elo, ctx: fmtCtx(row.context_window), native: !!row.run_natively, usage: usageOf(row) };
  }

  // Usage left on a metered pool ('62%'), else null (free routes and unknown usage stay blank).
  function usageOf(row) {
    var u = row && row.usage;
    return u && typeof u.remaining_percent === 'number' && isFinite(u.remaining_percent)
      ? Math.round(u.remaining_percent) + '%' : null;
  }

  function text(row) {
    var p = parts(row);
    return [p.elo, p.ctx, p.native ? 'Run natively' : null].filter(Boolean).join(SEP);
  }

  // Longer hover text: the badge spelled out, Elo per effort where known, speed, the native reason.
  function tooltip(row) {
    if (!row) return '';
    var p = parts(row);
    var bits = [];
    if (p.elo) bits.push(p.elo + ' Elo');
    var by = row.elo_by_effort && typeof row.elo_by_effort === 'object' ? row.elo_by_effort : {};
    var efforts = Object.keys(by).filter(function (k) { return by[k] && by[k] !== 'n/a'; })
      .map(function (k) { return k + ' ' + by[k]; });
    if (efforts.length) bits.push('Elo by effort: ' + efforts.join(', '));
    if (p.ctx) bits.push(p.ctx + ' context');
    if (p.usage) bits.push(p.usage + ' usage left');
    if (row.speed) bits.push(String(row.speed));
    if (p.native) bits.push('Run natively' + (row.run_natively_reason ? ': ' + row.run_natively_reason : ''));
    return bits.join(SEP);
  }

  function index(rows) {
    var out = {};
    (Array.isArray(rows) ? rows : []).forEach(function (r) {
      var d = r && r.dsh;
      if (d && d.provider && d.model) out[keyOf(d.provider, d.model)] = r;
    });
    return out;
  }

  function notify() {
    listeners.slice().forEach(function (fn) { try { fn(); } catch (e) { /* a gone label */ } });
  }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
  }

  // One shared fetch for every label on screen, at most once a minute (failures retry after that).
  function load(now) {
    now = typeof now === 'number' ? now : Date.now();
    if (state.pending) return state.pending;
    if (state.at && now - state.at < TTL_MS) return Promise.resolve(state.byKey);
    state.at = now;
    var req = null;
    try { req = CC.api && typeof CC.api.get === 'function' ? CC.api.get('/api/models') : null; } catch (e) { req = null; }
    if (!req || typeof req.then !== 'function') return Promise.resolve(state.byKey);
    state.pending = Promise.resolve(req).then(function (data) {
      state.byKey = index(data && data.models);
      notify();
    }, noop).then(function () { state.pending = null; return state.byKey; });
    return state.pending;
  }

  function prime(rows) { state.byKey = index(rows); state.at = Date.now(); notify(); }
  function lookup(provider, model) { return (state.byKey && state.byKey[keyOf(provider, model)]) || null; }

  CC.modelBadges = { parts: parts, text: text, tooltip: tooltip, fmtCtx: fmtCtx, load: load, prime: prime,
    lookup: lookup, subscribe: subscribe };

  function ModelBadgeLabel(props) {
    var R = CC.React || {};
    var tick = typeof R.useState === 'function' ? R.useState(0) : [0, noop];
    if (typeof R.useEffect === 'function') {
      R.useEffect(function () {
        var off = subscribe(function () { tick[1](function (n) { return n + 1; }); });
        load();
        return off;
      }, []);
    }
    var model = (props && props.model) || {};
    var name = model.name || model.id || '';
    try {
      var provider = (props && props.provider) || {};
      var row = lookup(provider.id, model.id);
      var badge = text(row);
      var tip = tooltip(row) || undefined;
      var t = CC.tokens || {};
      var meta = (t.size && t.size.meta) || 11;
      if (props && props.placement === 'trigger') {
        return CC.h('span', { 'data-cc-model-label': 'trigger', title: tip }, name);
      }
      var p = parts(row);
      var facts = [p.elo, p.ctx, p.usage ? p.usage + ' left' : null].filter(Boolean).join(SEP);
      return CC.h('span', { 'data-cc-model-label': (props && props.placement) || 'option',
        style: { display: 'inline-flex', alignItems: 'baseline', gap: 8, minWidth: 0, maxWidth: '100%' } },
        CC.h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }, name),
        badge ? CC.h('span', { 'data-cc-badge': 'facts', title: tip, style: { display: 'inline-flex', gap: 6,
          flex: 'none', fontSize: meta, color: 'var(--cc-text-3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } },
          facts ? CC.h('span', null, facts) : null,
          p.native ? CC.h('span', { 'data-cc-badge': 'native', style: { fontWeight: 500 } }, 'Run natively') : null) : null);
    } catch (e) {
      if (!warned) { warned = true; warn('model badge not drawn; catalog name kept', e); }
      return CC.h('span', null, name);
    }
  }
  CC.ModelBadgeLabel = ModelBadgeLabel;

  // Called from app.js's apply; every slot call goes through the guarded CC.contribute.
  // It also applies the flat picker (flat_picker.js, v3 P3), which replaces the whole seat these
  // labels sit in; if that seat is not taken over, these badges still decorate dsh's own picker.
  CC.applyModelBadges = function applyModelBadges(ctx) {
    try {
      if (typeof CC.contribute !== 'function') { warn('model badge helper missing; dsh model names kept'); return; }
      CC.contribute(ctx, SLOT, { name: SLOT, priority: PRIORITY }, ModelBadgeLabel, 'model badges');
    } catch (e) { warn('model badges not applied; dsh model names kept', e); }
    try { if (typeof CC.applyFlatPicker === 'function') CC.applyFlatPicker(ctx); } catch (e) { warn('flat model picker skipped', e); }
  };
})(CC);

		// ── page_plan.js
(function (CC) {
  // Plan mode: describe a new project, pick the planner model and effort, and let the deep planner
  // (deep_plan.py: brief, research, questions, framework, graph, prompts, critique) work. The owner
  // answers only what research could not find, reviews the scored graph and accepts it. Engine
  // routes: /api/plan/deep* and /api/plan/accept; the classic /api/planner/* flow stays as the
  // fallback when the engine has no deep planner yet. Never a paid API.
  var POLL_MS = 2000;
  var SAFETY_POLL_MS = 60000;
  var SESSION_KEY = 'cc.plan.session';
  var DEEP_KEY = 'cc.plan.deep';
  var CREATE_KEY = 'cc.create.project';
  var BUSY = { asking: true, drafting: true, running: true };
  var PURPOSE_WORD = { preference: 'Your preference', generic: 'This project' };
  var CHECK_WORD = { command: 'command', files_exist: 'file', text_present: 'text', human: 'you' };
  // Summary counts: [singular, plural] per check type.
  var CHECK_COUNT = { command: ['command check', 'command checks'], files_exist: ['file check', 'file checks'],
    text_present: ['text check', 'text checks'], human: ['for you', 'for you'] };
  var EFFORT_LABEL = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max' };
  var PICK = '__pick__';
  // Used until GET /api/plan/deep/options answers (or when the engine is older).
  var FALLBACK_OPTIONS = {
    models: [
      { id: 'claude-opus', label: 'Claude Opus', free: false, enabled: true },
      { id: 'claude-sonnet', label: 'Claude Sonnet', free: false, enabled: true },
      { id: 'claude-fable', label: 'Claude Fable', free: false, enabled: true },
      { id: 'freebuff', label: 'Freebuff (free)', free: true, enabled: true }
    ],
    efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    default: { model: 'claude-opus', effort: 'high', why: null, source: 'fixed' }
  };
  var STAGE_WORD = { pending: 'Waiting', running: 'Working', done: 'Done', skipped: 'Skipped',
    waiting: 'Waiting for you', error: 'Stopped' };

  // Page chrome comes from the kit (ui.js: Page, PageHeader, cc-b buttons, cc-in fields); these
  // rules cover the stepper, the form column, questions, stages and the draft checklist.
  var STYLE = [
    '.cc-root.cc-plan{position:relative;color:var(--cc-text);}',
    // A disabled primary reads as disabled, not as washed-out mint.
    '.cc-root.cc-plan .cc-b-primary:disabled{opacity:1;background:var(--cc-surface-2);border-color:var(--cc-line-strong);color:var(--cc-text-3);}',
    '.cc-root .cc-pl-link{border:0;background:transparent;color:var(--cc-text-3);font:inherit;font-size:11px;padding:0;cursor:pointer;align-self:flex-start;}',
    '.cc-root .cc-pl-link:hover{color:var(--cc-text);}',
    '.cc-root .cc-pl-link:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-input::placeholder,.cc-root .cc-in::placeholder{color:var(--cc-text-3);}',
    '.cc-root .cc-in:disabled{opacity:.6;}',
    '.cc-root .cc-field{display:flex;flex-direction:column;gap:4px;min-width:0;}',
    '.cc-root .cc-field > label{font-size:12px;font-weight:500;color:var(--cc-text-2);}',
    '.cc-root .cc-toast{position:absolute;left:50%;bottom:64px;z-index:6;transform:translateX(-50%);background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);padding:6px 12px;font-size:12px;}',
    // Stepper in the header: small numbered marks joined by short rules; done steps carry a tick.
    '.cc-root .cc-pl-steps{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--cc-text-3);margin:0;padding:0;list-style:none;}',
    '.cc-root .cc-pl-step{display:flex;align-items:center;gap:6px;white-space:nowrap;}',
    '.cc-root .cc-pl-num{width:16px;height:16px;border-radius:50%;border:1px solid var(--cc-line-strong);display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;font-variant-numeric:tabular-nums;box-sizing:border-box;}',
    '.cc-root .cc-pl-step.cc-on{color:var(--cc-text);font-weight:500;}',
    '.cc-root .cc-pl-step.cc-on .cc-pl-num{border-color:var(--cc-accent);color:var(--cc-accent);}',
    '.cc-root .cc-pl-step.cc-past{color:var(--cc-text-2);}',
    '.cc-root .cc-pl-step.cc-past .cc-pl-num{border-color:var(--cc-done);color:var(--cc-done);}',
    '.cc-root .cc-pl-rule{width:12px;height:1px;background:var(--cc-line-strong);flex:none;}',
    // Form column: left aligned, at most 960 px, labels above fields.
    '.cc-root .cc-pl-scroll{flex:1;min-height:0;overflow:auto;position:relative;}',
    '.cc-root .cc-pl-col{max-width:960px;padding:16px 16px 32px;display:flex;flex-direction:column;gap:16px;}',
    '.cc-root .cc-pl-h{font-size:14px;font-weight:600;line-height:1.35;margin:0;}',
    '.cc-root .cc-pl-sub{font-size:12px;color:var(--cc-text-3);margin:-12px 0 0;}',
    '.cc-root .cc-pl-pick{display:grid;grid-template-columns:repeat(2,minmax(0,280px));gap:12px;}',
    '.cc-root .cc-pl-sel{color-scheme:light;}',
    '.cc-root .cc-pl-sel{background:var(--cc-surface);color:var(--cc-text);}',
    '.cc-root .cc-pl-sel:disabled{opacity:.45;}',
    '.cc-root .cc-pl-sel option{background:var(--cc-surface);color:var(--cc-text);}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]) .cc-pl-sel{color-scheme:dark;}}',
    '.cc-root[data-theme="dark"] .cc-pl-sel,html[data-theme="dark"] .cc-root .cc-pl-sel,body.dark .cc-root .cc-pl-sel{color-scheme:dark;}',
    '.cc-root .cc-pl-foot{display:flex;flex-direction:row-reverse;justify-content:flex-end;align-items:center;gap:12px;}',
    '.cc-root .cc-pl-foot .cc-in{flex:1;width:auto;}',
    '.cc-root .cc-pl-foot .cc-meta{min-width:0;}',
    '.cc-root .cc-pl-err{color:var(--cc-error);font-size:12px;}',
    // Questions: one numbered row each, answered inline; hairlines between them, no boxes.
    '.cc-root .cc-pl-qs{display:flex;flex-direction:column;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-q{display:grid;grid-template-columns:20px minmax(0,1fr);gap:6px 12px;padding:12px 0;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-qn{grid-row:1 / 4;width:18px;height:18px;margin-top:1px;border-radius:50%;border:1px solid var(--cc-line-strong);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--cc-text-2);font-variant-numeric:tabular-nums;box-sizing:border-box;}',
    '.cc-root .cc-pl-q.cc-pl-answered .cc-pl-qn{border-color:var(--cc-done);color:var(--cc-done);}',
    '.cc-root .cc-pl-qp{font-size:14px;font-weight:500;line-height:1.4;}',
    '.cc-root .cc-pl-qh{display:flex;justify-content:space-between;gap:12px;align-items:baseline;min-width:0;}',
    '.cc-root .cc-pl-q textarea{min-height:56px;}',
    '.cc-root .cc-pl-saved{color:var(--cc-done);}',
    // Stage strip: one 24 px line per stage.
    '.cc-root .cc-pl-stages{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-pl-stage{display:flex;align-items:center;gap:8px;height:24px;font-size:12px;min-width:0;}',
    '.cc-root .cc-pl-mark{width:8px;height:8px;border-radius:50%;flex:none;border:1.5px solid var(--cc-neutral);box-sizing:border-box;}',
    '.cc-root .cc-st-done .cc-pl-mark{background:var(--cc-done);border-color:var(--cc-done);}',
    '.cc-root .cc-st-running .cc-pl-mark{background:var(--cc-running);border-color:var(--cc-running);}',
    '.cc-root .cc-st-waiting .cc-pl-mark{border-color:var(--cc-accent);}',
    '.cc-root .cc-st-error .cc-pl-mark{background:var(--cc-error);border-color:var(--cc-error);}',
    '.cc-root .cc-st-skipped .cc-pl-mark{border-style:dashed;}',
    '.cc-root .cc-pl-slabel{width:80px;flex:none;color:var(--cc-text);}',
    '.cc-root .cc-st-pending .cc-pl-slabel,.cc-root .cc-st-skipped .cc-pl-slabel{color:var(--cc-text-3);}',
    '.cc-root .cc-pl-sline{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--cc-text-2);}',
    // Draft: the graph on the canvas, the plan as a dense checklist in the side panel, one action bar.
    '.cc-root .cc-pl-body{display:flex;flex:1;min-height:0;position:relative;}',
    '.cc-root .cc-pl-canvas{position:relative;background:var(--cc-canvas);overflow:hidden;}',
    '.cc-root .cc-pl-side{display:flex;flex-direction:column;font-size:12px;}',
    '.cc-root .cc-pl-sec{padding:12px 16px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-sec:last-child{border-bottom:0;}',
    '.cc-root .cc-pl-title{font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
    '.cc-root .cc-pl-brief{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);}',
    '.cc-root .cc-pl-cap{font-size:12px;font-weight:600;color:var(--cc-text);display:flex;justify-content:space-between;align-items:baseline;gap:8px;}',
    '.cc-root .cc-pl-cap .cc-meta{font-weight:400;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-pl-goal1{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-pl-more{display:flex;flex-direction:column;gap:8px;}',
    '.cc-root .cc-pl-more[hidden]{display:none;}',
    // The checklist: a header row and 28 px rows in aligned columns (wave or number, task, id, check).
    '.cc-root .cc-pl-th,.cc-root .cc-pl-task{display:grid;grid-template-columns:28px minmax(0,1fr) 52px 56px;align-items:center;gap:8px;}',
    '.cc-root .cc-pl-th{height:24px;padding:0 8px;margin:0 -8px;font-size:11px;color:var(--cc-text-3);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-tasks{list-style:none;margin:0 -8px;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-pl-tasks li + li{border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-task{width:100%;height:28px;padding:0 8px;box-sizing:border-box;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer;}',
    '.cc-root .cc-pl-task:hover{background:var(--cc-wash);}',
    '.cc-root .cc-pl-task.cc-sel{background:var(--cc-selection);}',
    '.cc-root .cc-pl-task:focus-visible{outline:2px solid var(--cc-accent);outline-offset:-2px;}',
    '.cc-root .cc-pl-tn{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-pl-tt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-pl-tm,.cc-root .cc-pl-tc{font-size:11px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-pl-kv{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 12px;margin:0;font-size:12px;}',
    '.cc-root .cc-pl-kv dt{color:var(--cc-text-3);}',
    '.cc-root .cc-pl-kv dd{margin:0;min-width:0;overflow-wrap:anywhere;}',
    '.cc-root .cc-pl-mono{font-family:var(--cc-mono);font-size:11px;}',
    '.cc-root .cc-pl-folder{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-pl-chips{display:flex;flex-wrap:wrap;gap:4px;}',
    '.cc-root .cc-pl-chip{border:1px solid var(--cc-line-strong);background:transparent;color:var(--cc-text-2);font:inherit;font-size:11px;height:20px;padding:0 6px;border-radius:999px;cursor:pointer;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-pl-chip:hover{color:var(--cc-text);background:var(--cc-wash);}',
    '.cc-root .cc-pl-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px;font-size:12px;}',
    '.cc-root .cc-pl-act{display:flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-top:1px solid var(--cc-line);background:var(--cc-surface);flex:none;}',
    '.cc-root .cc-pl-act .cc-in{flex:1;min-width:0;width:auto;}',
    '.cc-root .cc-pl-lead{margin-right:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--cc-text-2);min-width:0;}',
    '.cc-root .cc-pl-ok{color:var(--cc-done);font-weight:600;}',
    '.cc-root .cc-pl-scores{display:flex;gap:16px;}',
    '.cc-root .cc-pl-score{display:flex;flex-direction:column;gap:2px;}',
    '.cc-root .cc-pl-score b{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;}'
  ].join('\n');

  function ensurePageStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || document.getElementById('cc-plan-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-plan-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function remember(key, value) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
    } catch (e) { /* storage blocked: the page still works, it just forgets */ }
  }
  function recall(key) {
    try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); } catch (e) { return null; }
  }

  function checkLine(check) {
    var helpers = CC.createHelpers;
    if (helpers && helpers.checkSummary) return helpers.checkSummary(check);
    return 'Done when its ' + ((check && CHECK_WORD[check.type]) || 'check') + ' passes';
  }

  // The step a classic session is on: 1 describe, 2 questions, 3 draft.
  function stepOf(s) {
    if (!s) return 1;
    if (s.status === 'asking' || (s.status === 'error' && s.phase === 'questions')) return 1;
    if (s.status === 'questions' || (s.status === 'drafting' && !s.draft)) return 2;
    return 3;
  }

  function answerBody(q, value) {
    return q.kind === 'text' ? { type: 'reply', value: value } : { type: 'answer', value: value };
  }
  function hasValue(v) {
    return v != null && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'string' && !v.trim());
  }
  function storedValue(q) {
    return q.answer && q.answer.type !== 'ignore' ? q.answer.value : undefined;
  }

  // ---------------------------------------------------------------- deep plan helpers
  function isDeep(s) { return !!(s && Array.isArray(s.stages)); }
  function stageWord(state) { return STAGE_WORD[state] || STAGE_WORD.pending; }
  function scoreParts(sc) {
    if (!sc) return [];
    function v(x) { return x == null ? '–' : String(x); }
    return [{ label: 'Critical path', value: v(sc.critical_path) }, { label: 'Width', value: v(sc.peak_width) },
      { label: 'Overlaps', value: v(sc.overlaps) }];
  }
  function modelRow(options, id) {
    return ((options && options.models) || []).filter(function (m) { return m.id === id; })[0] || null;
  }
  function effortLabel(x) { return EFFORT_LABEL[x] || (x ? x.charAt(0).toUpperCase() + x.slice(1) : ''); }
  function modelLine(s) {
    var label = s.model_label || s.model || '';
    return label + (s.effort && s.model !== 'freebuff' ? ' · ' + effortLabel(s.effort) : '');
  }
  // What Start planning sends, or null while a choice is missing. Pick for me takes the engine's pick.
  function resolveChoice(options, model, effort) {
    var opts = options || FALLBACK_OPTIONS;
    if (model === PICK) {
      var d = opts.default || {};
      return d.model ? { model: d.model, effort: d.effort || null } : null;
    }
    var row = modelRow(opts, model);
    if (!row || row.enabled === false) return null;
    if (row.free) return { model: model, effort: null };
    return effort ? { model: model, effort: effort } : null;
  }

  // One line per stage: a status mark, the stage name, and what it did.
  function PlanStages(props) {
    var h = CC.h;
    return h('ol', { className: 'cc-pl-stages', 'aria-label': 'Planning stages' },
      (props.stages || []).map(function (st) {
        return h('li', { key: st.id, className: 'cc-pl-stage cc-st-' + st.state, title: st.line || stageWord(st.state) },
          h('span', { className: 'cc-pl-mark' + (st.state === 'running' ? ' cc-pulse' : ''), 'aria-hidden': 'true' }),
          h('span', { className: 'cc-pl-slabel' }, st.label),
          h('span', { className: 'cc-pl-sline' }, st.line || (st.state === 'pending' ? '' : stageWord(st.state))));
      }));
  }

  function PlanScores(props) {
    var h = CC.h;
    var parts = scoreParts(props.scores);
    if (!parts.length) return null;
    return h('div', { className: 'cc-pl-scores', 'aria-label': 'Graph scores' },
      parts.map(function (p) {
        return h('div', { key: p.label, className: 'cc-pl-score' },
          h('span', { className: 'cc-meta' }, p.label), h('b', null, p.value));
      }));
  }

  function PlanModelPicker(props) {
    var h = CC.h;
    var opts = props.options || FALLBACK_OPTIONS;
    var row = modelRow(opts, props.model);
    var free = !!(row && row.free), picking = props.model === PICK;
    var why = opts.default && opts.default.why;
    return h('div', { className: 'cc-pl-pick' },
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-model' }, 'Planner model'),
        h('select', { id: 'cc-pl-model', className: 'cc-in cc-pl-sel', 'aria-label': 'Planner model', value: props.model || '',
          disabled: props.disabled, onChange: function (e) { props.onModel(e.target.value); } },
          [h('option', { key: '', value: '' }, 'Choose…'),
            h('option', { key: PICK, value: PICK, title: why || undefined }, 'Pick for me')].concat(
            opts.models.map(function (m) {
              return h('option', { key: m.id, value: m.id, disabled: m.enabled === false }, m.label);
            })))),
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-effort' }, 'Effort'),
        h('select', { id: 'cc-pl-effort', className: 'cc-in cc-pl-sel', 'aria-label': 'Effort', value: picking || free ? '' : (props.effort || ''),
          disabled: props.disabled || free || picking, onChange: function (e) { props.onEffort(e.target.value); } },
          [h('option', { key: '', value: '' }, picking ? 'Auto' : free ? 'None' : 'Choose…')].concat(
            (opts.efforts || []).map(function (x) { return h('option', { key: x, value: x }, effortLabel(x)); })))));
  }

  // ---------------------------------------------------------------- shared pieces
  function Steps(props) {
    var h = CC.h;
    var out = [];
    ['Describe', 'Questions', 'Draft'].forEach(function (label, i) {
      var n = i + 1, on = props.step === n, past = props.step > n;
      if (i) out.push(h('li', { key: 'r' + n, className: 'cc-pl-rule', 'aria-hidden': 'true' }));
      out.push(h('li', { key: label, className: 'cc-pl-step' + (on ? ' cc-on' : past ? ' cc-past' : ''), 'aria-current': on ? 'step' : undefined },
        h('span', { className: 'cc-pl-num', 'aria-hidden': 'true' }, past ? '✓' : String(n)), label));
    });
    return h('ol', { className: 'cc-pl-steps', 'aria-label': 'Steps' }, out);
  }

  function Describe(props) {
    var h = CC.h, React = CC.React;
    var s = props.session, init = props.initial || {};
    var opts = props.options || FALLBACK_OPTIONS;
    var f = React.useState({ title: (s && s.title) || init.title || '', goal: (s && s.goal) || init.goal || '' });
    var form = f[0], setForm = f[1];
    // Nothing preselected: empty until the owner chooses (a stopped session keeps the earlier choice).
    var mm = React.useState(null), modelPick = mm[0], setModel = mm[1];
    var ee = React.useState(null), effortPick = ee[0], setEffort = ee[1];
    var model = modelPick != null ? modelPick : (s && s.model) || '';
    var effort = effortPick != null ? effortPick : (s && s.effort) || '';
    var choice = resolveChoice(opts, model, effort);
    // The folder is Waypoint's choice (Drive by default); only a hand-over from elsewhere carries one.
    var cwd = (s && s.cwd) || init.cwd || null;
    function set(key) { return function (e) { var v = e.target.value; setForm(function (p) { var n = Object.assign({}, p); n[key] = v; return n; }); }; }
    var asking = s && s.status === 'asking';
    var ready = form.title.trim() && form.goal.trim() && choice && !props.busy && !asking;
    return h('div', { className: 'cc-pl-col' },
      h('h2', { className: 'cc-pl-h' }, 'What do you want to make?'),
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-title' }, 'Title'),
        h('input', { id: 'cc-pl-title', className: 'cc-in', value: form.title, disabled: asking, onChange: set('title') })),
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-goal' }, 'Goal'),
        h('textarea', { id: 'cc-pl-goal', className: 'cc-in', rows: 5, value: form.goal, disabled: asking,
          placeholder: 'What is true when it is finished', onChange: set('goal') })),
      h(PlanModelPicker, { options: opts, model: model, effort: effort, disabled: asking || props.busy,
        onModel: setModel, onEffort: setEffort }),
      s && s.status === 'error' ? h('div', { className: 'cc-pl-err', role: 'status' }, s.error || 'The planner stopped.') : null,
      h('div', { className: 'cc-pl-foot' },
        asking ? h('span', { className: 'cc-meta' }, 'Writing a few questions…') : null,
        h('button', { className: 'cc-b cc-b-primary', type: 'button', disabled: !ready,
          onClick: function () {
            if (!choice) return;
            props.onStart({ title: form.title.trim(), goal: form.goal.trim(), cwd: cwd, model: choice.model, effort: choice.effort });
          } },
          asking ? 'Starting…' : 'Start planning')));
  }

  function Question(props) {
    var h = CC.h;
    var q = props.q, value = props.value, done = !!q.answered_at, filled = done || hasValue(value);
    var input;
    if (q.kind === 'likert' && CC.Likert) {
      input = h(CC.Likert, { scale: q.scale || 9, value: value == null ? null : value, labels: q.labels, ariaLabel: q.prompt, disabled: done || props.disabled, onChange: props.onChange });
    } else if (q.kind === 'select' && CC.SelectAll) {
      input = h(CC.SelectAll, { options: q.options || [], value: value || [], ariaLabel: q.prompt, disabled: done || props.disabled, onChange: props.onChange });
    } else {
      input = h('textarea', { className: 'cc-in', 'aria-label': q.prompt, value: value || '', disabled: done || props.disabled,
        onChange: function (e) { props.onChange(e.target.value); } });
    }
    return h('section', { className: 'cc-pl-q' + (filled ? ' cc-pl-answered' : ''), 'aria-label': q.prompt },
      h('span', { className: 'cc-pl-qn', 'aria-hidden': 'true' }, filled ? '✓' : String(props.n || '')),
      h('div', { className: 'cc-pl-qh' },
        h('div', { className: 'cc-pl-qp' }, q.prompt),
        h('span', { className: 'cc-meta' + (done ? ' cc-pl-saved' : '') }, done ? 'Saved' : (PURPOSE_WORD[q.purpose] || ''))),
      q.why ? h('div', { className: 'cc-meta' }, q.why) : null,
      h('div', null, input));
  }

  // The open questions as one numbered list.
  function QuestionList(props) {
    var h = CC.h;
    return h('div', { className: 'cc-pl-qs' }, props.questions.map(function (q, i) {
      return h(Question, { key: q.id, q: q, n: i + 1, disabled: props.disabled,
        value: q.answered_at ? storedValue(q) : props.answers[q.id],
        onChange: function (v) { props.onAnswer(q.id, v); } });
    }));
  }
  function answeredCount(qs, answers) {
    return qs.filter(function (q) { return q.answered_at || hasValue(answers[q.id]); }).length;
  }

  function Questions(props) {
    var h = CC.h;
    var s = props.session, qs = s.questions || [];
    var drafting = s.status === 'drafting';
    var count = answeredCount(qs, props.answers);
    return h('div', { className: 'cc-pl-col' },
      h('h2', { className: 'cc-pl-h' }, s.title),
      h('div', { className: 'cc-pl-sub' }, qs.length ? 'Answer what you can; skip anything that does not matter.' : 'No questions needed; the goal is clear enough to draft.'),
      qs.length ? h(QuestionList, { questions: qs, answers: props.answers, disabled: drafting || props.busy, onAnswer: props.onAnswer }) : null,
      h('div', { className: 'cc-pl-foot' },
        h('span', { className: 'cc-meta', 'aria-live': 'polite' },
          drafting ? 'Drafting the plan with Claude Code… this can take a few minutes.' : (qs.length ? count + ' of ' + qs.length + ' answered' : '')),
        h('button', { className: 'cc-b cc-b-primary', type: 'button', disabled: drafting || props.busy, onClick: props.onDraft },
          drafting ? 'Drafting…' : 'Draft the plan')));
  }

  function checkCounts(d) {
    var c = d.checks || {};
    var parts = Object.keys(CHECK_COUNT).filter(function (k) { return c[k]; }).map(function (k) {
      return c[k] + ' ' + CHECK_COUNT[k][c[k] === 1 ? 0 : 1];
    });
    return [d.tasks + ' task' + (d.tasks === 1 ? '' : 's')].concat(parts).join(' · ');
  }

  // Draft tasks in run order: grouped into waves (tasks in one wave can run side by side).
  function taskWaves(nodes) {
    var list = (nodes || []).filter(function (n) { return n && n.id != null; });
    if (CC.groupWaves) return CC.groupWaves(list).waves;
    return list.length ? [{ wave: 0, nodes: list, total: list.length }] : [];
  }

  // The selected task: what it does, how it is checked, what it needs.
  function TaskDetail(props) {
    var h = CC.h;
    var n = props.node;
    return h('div', { className: 'cc-pl-sec', 'aria-label': 'Task' },
      h('div', { className: 'cc-pl-qh' },
        h('div', { className: 'cc-pl-title' }, n.title || n.id),
        h('button', { className: 'cc-b cc-b-quiet cc-b-icon cc-b-sm', type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×')),
      n.goal ? h('p', { className: 'cc-pl-brief' }, n.goal) : null,
      h('dl', { className: 'cc-pl-kv' },
        h('dt', null, 'Id'), h('dd', { className: 'cc-pl-mono' }, n.id),
        h('dt', null, 'Check'), h('dd', null, checkLine(n.check)),
        n.deps && n.deps.length ? h('dt', null, 'Needs') : null,
        n.deps && n.deps.length ? h('dd', null, h('div', { className: 'cc-pl-chips' }, n.deps.map(function (d) {
          return h('button', { key: d, className: 'cc-pl-chip', type: 'button', onClick: function () { props.onSelect(String(d)); } }, d);
        }))) : null,
        n.files && n.files.length ? h('dt', null, 'Writes') : null,
        n.files && n.files.length ? h('dd', { className: 'cc-pl-mono' }, n.files.join(', ')) : null),
      props.onChange ? h('button', { className: 'cc-pl-link', type: 'button', onClick: function () { props.onChange(n); } }, 'Change this task') : null);
  }

  // The plan as a checklist in run order; the left column is the wave ("W1"), or the task number when the
  // plan is one wave. A row selects its node on the graph.
  function TaskList(props) {
    var h = CC.h;
    var waves = taskWaves(props.nodes);
    var many = waves.length > 1;
    var i = 0, rows = [];
    waves.forEach(function (w) {
      w.nodes.forEach(function (n) {
        var id = String(n.id), full = props.byId[id] || n;
        i += 1;
        rows.push(h('li', { key: id },
          h('button', { type: 'button', className: 'cc-pl-task' + (id === props.selected ? ' cc-sel' : ''), 'data-id': id,
            'aria-current': id === props.selected ? 'true' : undefined, title: full.goal || full.title || id,
            onClick: function () { props.onSelect(id === props.selected ? null : id); } },
            h('span', { className: 'cc-pl-tn' }, many ? 'W' + (w.wave + 1) : String(i)),
            h('span', { className: 'cc-pl-tt' }, full.title || id),
            h('span', { className: 'cc-pl-tm', title: id }, id),
            h('span', { className: 'cc-pl-tc' }, (full.check && CHECK_WORD[full.check.type]) || '–'))));
      });
    });
    return h('div', { className: 'cc-pl-sec' },
      h('div', { className: 'cc-pl-cap' }, h('span', null, 'Tasks'), h('span', { className: 'cc-meta' }, checkCounts(props.draft))),
      rows.length ? h('div', { className: 'cc-pl-th', 'aria-hidden': 'true' }, h('span', null, many ? 'Wave' : '#'), h('span', null, 'Task'), h('span', null, 'Id'), h('span', null, 'Check')) : null,
      rows.length ? h('ol', { className: 'cc-pl-tasks', 'aria-label': 'Tasks' }, rows)
        : h('div', { className: 'cc-meta' }, 'No tasks in this draft.'));
  }

  // The one line the summary shows at rest: the goal's first line, else the spec's first sentence.
  function oneLine(goal, brief) {
    var g = String(goal || '').trim().split(/\r?\n/)[0].trim();
    if (g) return g;
    var b = String(brief || '').trim().split(/\r?\n/)[0].trim();
    var m = /^[\s\S]*?[.!?](?=\s|$)/.exec(b);
    return m ? m[0] : b;
  }
  function hasKids(c) {
    return Array.isArray(c) ? c.some(hasKids) : !!c;
  }

  // Title, the one-line goal, and More: the full spec plus whatever the caller adds (scores, critique).
  function PlanSummary(props) {
    var h = CC.h, React = CC.React;
    var mm = React.useState(false), more = mm[0], setMore = mm[1];
    var brief = props.brief || '';
    var line = oneLine(props.goal, brief);
    var extra = hasKids(props.children);
    var hasMore = extra || (brief && brief !== line);
    return h('div', { className: 'cc-pl-sec' },
      h('div', { className: 'cc-pl-title' }, props.title),
      props.meta ? h('span', { className: 'cc-meta' }, props.meta) : null,
      props.folder ? h('span', { className: 'cc-meta cc-pl-mono cc-pl-folder', title: props.folder }, props.folder) : null,
      line ? h('p', { className: 'cc-pl-goal1', title: line }, line) : null,
      hasMore ? h('div', { className: 'cc-pl-more', hidden: !more },
        brief && brief !== line ? h('p', { className: 'cc-pl-brief' }, brief) : null,
        props.children) : null,
      hasMore ? h('button', { className: 'cc-pl-link', type: 'button', 'aria-expanded': more,
        onClick: function () { setMore(!more); } }, more ? 'Less' : 'More') : null);
  }

  // The side panel of a draft: summary, the selected task, then the checklist.
  function DraftSide(props) {
    var h = CC.h;
    var d = props.draft, node = props.selected ? props.byId[props.selected] : null;
    return h('aside', { className: 'cc-split-side cc-pl-side', 'aria-label': 'Plan' },
      h(PlanSummary, { title: d.title || props.title, meta: props.meta, folder: props.folder, goal: props.goal || d.goal, brief: d.brief }, props.extra),
      node ? h(TaskDetail, { node: node, onClose: function () { props.onSelect(null); }, onSelect: props.onSelect, onChange: props.onChange }) : null,
      h(TaskList, { draft: d, nodes: props.nodes, byId: props.byId, selected: props.selected, onSelect: props.onSelect }),
      props.after || null);
  }

  // The one action bar under a draft: accepted, or the lead text and the actions.
  function ActionBar(props) {
    var h = CC.h;
    if (props.accepted) {
      return h('div', { className: 'cc-pl-act' },
        h('span', { className: 'cc-pl-lead' }, h('span', { className: 'cc-pl-ok', 'aria-hidden': 'true' }, '✓'), 'Accepted. Its tasks run from Execute.'),
        h('button', { className: 'cc-b cc-b-primary', type: 'button', onClick: props.onOpen }, 'Open in Execute'));
    }
    return h('div', { className: 'cc-pl-act' }, props.children);
  }

  function boardNodes(data, d) {
    return data && data.nodes && data.nodes.length ? data.nodes : (d && d.nodes) || [];
  }

  // Classic planner draft (POST /api/planner/draft), kept for older engines.
  function Draft(props) {
    var h = CC.h, React = CC.React;
    var s = props.session, d = s.draft;
    var sl = React.useState(null), selected = sl[0], setSelected = sl[1];
    var nt = React.useState(''), note = nt[0], setNote = nt[1];
    var showDraft = d && (s.status === 'draft' || s.status === 'accepted' || s.status === 'drafting');
    var board = CC.useEngine(showDraft && s.project ? '/api/board?project=' + encodeURIComponent(s.project) : null, ['state']);
    var data = CC.unpackBoard(board.data) || { nodes: [], edges: [] };
    var byId = {};
    ((d && d.nodes) || []).forEach(function (n) { byId[n.id] = n; });
    var drafting = s.status === 'drafting';
    var accepted = s.status === 'accepted';

    var redraft = h('button', { key: 'r', className: 'cc-b', type: 'button',
      disabled: drafting || props.busy, onClick: function () { props.onRedraft(note.trim()); setNote(''); } }, drafting ? 'Drafting…' : 'Redraft');
    var noteBox = h('input', { key: 'n', className: 'cc-in', value: note, disabled: drafting || props.busy, 'aria-label': 'What should change',
      placeholder: 'What should change? Used by Redraft', onChange: function (e) { setNote(e.target.value); } });

    if (!showDraft) {
      return h('div', { className: 'cc-pl-scroll' }, h('div', { className: 'cc-pl-col' },
        h('h2', { className: 'cc-pl-h' }, s.title),
        s.status === 'problems' ? [
          h('div', { key: 'm' }, 'The draft did not pass its checks, so nothing was imported.'),
          h('ul', { key: 'l', className: 'cc-pl-list' }, (s.problems || []).map(function (p, i) { return h('li', { key: i }, p); }))
        ] : h('div', { className: 'cc-pl-err', role: 'status' }, s.error || 'The planner stopped.'),
        h('div', { className: 'cc-pl-foot' }, noteBox, h('button', { className: 'cc-b cc-b-primary', type: 'button',
          disabled: drafting || props.busy, onClick: function () { props.onRedraft(note.trim()); setNote(''); } }, drafting ? 'Drafting…' : 'Redraft'))));
    }
    return [
      h('div', { key: 'b', className: 'cc-split cc-pl-body' },
        h('div', { className: 'cc-split-main cc-pl-canvas' },
          CC.FlowView ? h(CC.FlowView, { board: data, filter: 'all', selected: selected, onSelect: setSelected, deselectOnBackground: true, dashUnnamed: true, cameraKey: s.project })
            : h('div', { className: 'cc-meta' }, 'Flow view unavailable')),
        h(DraftSide, { draft: d, title: s.title, folder: s.cwd, goal: s.goal, nodes: boardNodes(data, d), byId: byId, selected: selected, onSelect: setSelected,
          onChange: accepted ? null : function (n) { setNote(n.id + ' (' + (n.title || n.id) + '): '); } })),
      h(ActionBar, { key: 'a', accepted: accepted, onOpen: function () { props.onOpen(s.project); } },
        s.problems && s.problems.length ? h('span', { key: 'm', className: 'cc-pl-lead', style: { marginRight: 0, flex: 'none' } },
          h('span', { className: 'cc-pl-err' }, s.problems.length + ' problem(s)')) : null,
        noteBox, redraft,
        h('button', { key: 'ac', className: 'cc-b cc-b-primary', type: 'button', disabled: drafting || props.busy || !s.project,
          onClick: function () { props.onAccept(s.project, board.data && board.data.revision); } }, 'Accept plan'))
    ];
  }

  // ---------------------------------------------------------------- deep plan views
  // A deep plan at work, waiting for answers, or stopped: the stage strip and one action at most.
  function DeepRun(props) {
    var h = CC.h;
    var s = props.session, qs = s.questions || [];
    var waiting = s.status === 'questions';
    var stopped = s.status === 'error' || s.status === 'problems';
    var problem = s.status === 'problems' ? ((s.problems && s.problems[0]) || 'No usable graph') : s.error;
    return h('div', { className: 'cc-pl-col' },
      h('div', { className: 'cc-pl-qh' },
        h('h2', { className: 'cc-pl-h' }, s.title),
        h('span', { className: 'cc-meta' }, modelLine(s))),
      h(PlanStages, { stages: s.stages }),
      waiting && qs.length ? h(QuestionList, { questions: qs, answers: props.answers, disabled: props.busy, onAnswer: props.onAnswer }) : null,
      stopped ? h('div', { className: 'cc-pl-err', role: 'status' }, problem || 'The planner stopped.') : null,
      waiting || stopped ? h('div', { className: 'cc-pl-foot' },
        waiting ? h('span', { className: 'cc-meta', 'aria-live': 'polite' },
          qs.length ? answeredCount(qs, props.answers) + ' of ' + qs.length + ' answered' : '') : null,
        h('button', { className: 'cc-b cc-b-primary', type: 'button', disabled: props.busy,
          onClick: waiting ? props.onContinue : props.onRetry }, waiting ? 'Continue' : 'Try again')) : null);
  }

  // The drafted graph with its scores, checklist and stage strip beside it; Accept when it is right.
  function DeepDraft(props) {
    var h = CC.h, React = CC.React;
    var s = props.session, d = s.draft || { nodes: [], tasks: 0, checks: {} };
    var sl = React.useState(null), selected = sl[0], setSelected = sl[1];
    var board = CC.useEngine(s.project ? '/api/board?project=' + encodeURIComponent(s.project) : null, ['state']);
    var data = CC.unpackBoard(board.data) || { nodes: [], edges: [] };
    var byId = {};
    (d.nodes || []).forEach(function (n) { byId[n.id] = n; });
    var accepted = s.status === 'accepted';
    var extra = [
      scoreParts(s.scores).length ? h(PlanScores, { key: 'sc', scores: s.scores }) : null,
      s.critique && s.critique.summary ? h('div', { key: 'cr', className: 'cc-meta' }, s.critique.summary) : null
    ];
    var after = h('div', { className: 'cc-pl-sec' }, h('div', { className: 'cc-pl-cap' }, 'Stages'), h(PlanStages, { stages: s.stages }));
    return [
      h('div', { key: 'b', className: 'cc-split cc-pl-body' },
        h('div', { className: 'cc-split-main cc-pl-canvas' },
          CC.FlowView ? h(CC.FlowView, { board: data, filter: 'all', selected: selected, onSelect: setSelected, deselectOnBackground: true, dashUnnamed: true, cameraKey: s.project })
            : h('div', { className: 'cc-meta' }, checkCounts(d))),
        h(DraftSide, { draft: d, title: s.title, folder: s.cwd, goal: s.goal, meta: modelLine(s) + (s.critic_label ? ' · checked by ' + s.critic_label : ''),
          extra: extra, after: after, nodes: boardNodes(data, d), byId: byId, selected: selected, onSelect: setSelected })),
      h(ActionBar, { key: 'a', accepted: accepted, onOpen: function () { props.onOpen(s.project); } },
        h('span', { key: 'm', className: 'cc-pl-lead' }),
        h('button', { key: 'ac', className: 'cc-b cc-b-primary', type: 'button', disabled: props.busy || !s.project,
          onClick: function () { props.onAccept(s.project, board.data && board.data.revision); } }, 'Accept plan'))
    ];
  }

  CC.planHelpers = { stepOf: stepOf, answerBody: answerBody, hasValue: hasValue, isDeep: isDeep, stageWord: stageWord,
    scoreParts: scoreParts, fallbackOptions: FALLBACK_OPTIONS, style: STYLE, resolveChoice: resolveChoice,
    checkCounts: checkCounts, effortLabel: effortLabel };
  CC.PlanStages = PlanStages;
  CC.PlanScores = PlanScores;
  CC.PlanModelPicker = PlanModelPicker;
  CC.PlanDescribe = Describe;
  CC.PlanDeepRun = DeepRun;
  CC.PlanDeepDraft = DeepDraft;
  CC.PlanDraft = Draft;
  CC.PlanSteps = Steps;
  CC.PlanTaskList = TaskList;

  CC.PlanPage = function PlanPage() {
    var h = CC.h, React = CC.React, ui = CC.ui;
    ensurePageStyle();
    var dk = React.useState(function () { return recall(DEEP_KEY); }), deepId = dk[0], setDeepId = dk[1];
    var sd = React.useState(function () { return recall(DEEP_KEY) ? null : recall(SESSION_KEY); }), sid = sd[0], setSid = sd[1];
    var op = React.useState(FALLBACK_OPTIONS), opts = op[0], setOpts = op[1];
    var ss = React.useState(null), session = ss[0], setSession = ss[1];
    var an = React.useState({}), answers = an[0], setAnswers = an[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var tt = React.useState(null), toastText = tt[0], setToast = tt[1];
    var off = React.useState(false), offline = off[0], setOffline = off[1];

    function load(id) {
      if (!id) return Promise.resolve(null);
      return CC.api.get('/api/planner/session?id=' + encodeURIComponent(id)).then(function (data) {
        setOffline(false); setSession(data); return data;
      }, function (e) {
        if (e.status === 404) { remember(SESSION_KEY, null); setSid(null); setSession(null); }
        else if (!e.status) setOffline(true);
        return null;
      });
    }
    function loadDeep(id) {
      if (!id) return Promise.resolve(null);
      return CC.api.get('/api/plan/deep?id=' + encodeURIComponent(id)).then(function (data) {
        setOffline(false); setSession(data); return data;
      }, function (e) {
        if (e.status === 404) { remember(DEEP_KEY, null); setDeepId(null); setSession(null); }
        else if (!e.status) setOffline(true);
        return null;
      });
    }
    function reload() { if (deepId) loadDeep(deepId); else load(sid); }

    React.useEffect(function () {
      var alive = true;
      CC.api.get('/api/plan/deep/options').then(function (o) {
        if (alive && o && Array.isArray(o.models) && o.models.length) setOpts(o);
      }, function () { /* older engine: the fallback list and the classic planner */ });
      return function () { alive = false; };
    }, []);

    var status = session && session.status;
    React.useEffect(function () {
      if (!sid) return undefined;
      var alive = true;
      load(sid);
      // 'planner' events (planner.py notify) drive refresh; the slow poll is only a safety net if the stream drops.
      var unsub = CC.api.subscribe ? CC.api.subscribe(function (kind, data) {
        if (alive && kind === 'planner' && data && data.id === sid) load(sid);
      }) : null;
      var t = BUSY[status] ? setInterval(function () { if (alive) load(sid); }, SAFETY_POLL_MS) : null;
      return function () { alive = false; if (t) clearInterval(t); if (unsub) unsub(); };
    }, [sid, status]);

    React.useEffect(function () {
      if (!deepId) return undefined;
      var alive = true;
      loadDeep(deepId);
      // Stage changes arrive as 'deep_plan' events when the stream carries them; polling covers the rest.
      var unsub = CC.api.subscribe ? CC.api.subscribe(function (kind, data) {
        if (alive && kind === 'deep_plan' && data && data.id === deepId) loadDeep(deepId);
      }) : null;
      // Safety net only (stream dropped); 'deep_plan' events above carry every stage change.
      var t = BUSY[status] ? setInterval(function () { if (alive) loadDeep(deepId); }, SAFETY_POLL_MS) : null;
      return function () { alive = false; if (t) clearInterval(t); if (unsub) unsub(); };
    }, [deepId, status]);

    React.useEffect(function () {
      if (!toastText) return undefined;
      var t = setTimeout(function () { setToast(null); }, 2600);
      return function () { clearTimeout(t); };
    }, [toastText]);

    function fail(what) { return function (e) { setBusy(false); setToast(what + ': ' + ((e.data && e.data.detail) || e.message)); }; }
    function saveAnswers() {
      var qs = (session.questions || []).filter(function (q) { return !q.answered_at && hasValue(answers[q.id]); });
      // Save each new answer (preference answers go to the owner's notes).
      return qs.reduce(function (p, q) {
        return p.then(function () { return CC.api.post('/api/question/answer', { id: q.id, answer: answerBody(q, answers[q.id]) }); });
      }, Promise.resolve());
    }

    function onStart(form) {
      setBusy(true);
      CC.api.post('/api/plan/deep/start', form).then(function (r) {
        setBusy(false); setAnswers({});
        remember(SESSION_KEY, null); setSid(null);
        remember(DEEP_KEY, r.session.id); setDeepId(r.session.id); setSession(r.session);
      }, function (e) {
        if (e.status !== 404) { fail('Could not start')(e); return; }
        // The engine has no deep planner yet: the classic planner still works.
        CC.api.post('/api/planner/start', { title: form.title, goal: form.goal, cwd: form.cwd }).then(function (r) {
          setBusy(false); setAnswers({});
          remember(SESSION_KEY, r.session.id); setSid(r.session.id); setSession(r.session);
        }, fail('Could not start'));
      });
    }
    function onContinue() {
      setBusy(true);
      saveAnswers().then(function () {
        return CC.api.post('/api/plan/deep/continue', { id: session.id });
      }).then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not continue'));
    }
    function onRetry() {
      setBusy(true);
      CC.api.post('/api/plan/deep/continue', { id: session.id })
        .then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not try again'));
    }
    function onDraft() {
      setBusy(true);
      saveAnswers().then(function () {
        return CC.api.post('/api/planner/draft', { session: session.id });
      }).then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not draft'));
    }
    function onRedraft(note) {
      setBusy(true);
      CC.api.post('/api/planner/draft', { session: session.id, note: note || undefined })
        .then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not redraft'));
    }
    function onAccept(project, revision) {
      setBusy(true);
      var body = { project: project };
      if (revision != null) body.revision = revision;
      CC.api.post('/api/plan/accept', body).then(function () {
        setBusy(false); setToast('Plan accepted'); reload();
      }, function (e) {
        setBusy(false);
        setToast(e.status === 409 ? 'Changed elsewhere — refreshed, try again' : 'Could not accept: ' + ((e.data && e.data.detail) || e.message));
        reload();
      });
    }
    function onOpen(project) {
      remember(CREATE_KEY, project);
      CC.pendingProject = project;
      try {
        if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') CC.ctx.layout.selectPanel('cc-create');
        else setToast('Open Execute from the sidebar');
      } catch (e) { setToast('Open Execute from the sidebar'); }
    }
    function onNew() {
      remember(SESSION_KEY, null); remember(DEEP_KEY, null);
      setSid(null); setDeepId(null); setSession(null); setAnswers({});
    }
    function onAnswer(id, v) { setAnswers(function (p) { var n = Object.assign({}, p); n[id] = v; return n; }); }

    var deep = isDeep(session);
    var step = deep ? 0 : stepOf(session);
    // Deep plans use the same three steps: research and questions are step 2, the graph step 3.
    var shown = deep ? (status === 'ready' || status === 'accepted' ? 3 : 2) : step;
    var body;
    if (offline && !session) {
      body = h('div', { className: 'cc-pl-scroll' }, ui.Empty({ title: 'Waypoint Core is not running', body: 'Start it and this page connects on its own.' }));
    } else if (deep && (status === 'ready' || status === 'accepted')) {
      body = h(DeepDraft, { key: session.project || session.id, session: session, busy: busy, onAccept: onAccept, onOpen: onOpen });
    } else if (deep) {
      body = h('div', { className: 'cc-pl-scroll' }, h(DeepRun, { session: session, answers: answers, busy: busy,
        onAnswer: onAnswer, onContinue: onContinue, onRetry: onRetry }));
    } else if (step === 1) {
      body = h('div', { className: 'cc-pl-scroll' }, h(Describe, { key: session ? session.id : 'new', session: session, busy: busy,
        options: opts, onStart: onStart }));
    } else if (step === 2) {
      body = h('div', { className: 'cc-pl-scroll' }, h(Questions, { session: session, answers: answers, busy: busy, onAnswer: onAnswer, onDraft: onDraft }));
    } else {
      body = h(Draft, { key: session.project || session.id, session: session, busy: busy, onRedraft: onRedraft, onAccept: onAccept, onOpen: onOpen });
    }

    var header = ui.PageHeader({
      title: 'Plan', pageId: 'cc-plan',
      meta: session && session.title ? session.title : null,
      mid: h(Steps, { step: shown }),
      actions: session ? h(ui.Button, { disabled: busy, onClick: onNew }, 'New plan') : null
    });
    var page = ui.Page({ className: 'cc-plan', raw: true, header: header,
      children: [].concat(Array.isArray(body) || !CC.React.cloneElement ? body : CC.React.cloneElement(body, { key: 'b' }), toastText ? [h('div', { key: 't', className: 'cc-toast', role: 'status' }, toastText)] : []) });
    // command_bar.js finds the page by data-cc-page; the kit frame does not set it yet.
    if (CC.React && typeof CC.React.cloneElement === 'function') return CC.React.cloneElement(page, { 'data-cc-page': 'plan' });
    page.props['data-cc-page'] = 'plan';
    return page;
  };
})(CC);

		// ── autonomous_controls.js
(function (CC) {
  // Autonomous run controls (used by page_sprints.js): model ticks from GET /api/models (enabled
  // models only; the current pools when the route is absent), Claude and Codex effort sliders, the
  // spend preset, timing switches, max use per selected pool, the project sequence (priority rows, a
  // model per project, drag, Undo/Redo, Ctrl+Arrow) and the compact Codex + Claude usage meters.
  // Anything switched off in Agents (CC.isEnabled, toggles.js) is greyed out and cannot be ticked or
  // picked; so is a model whose route is down (GET /api/agents connections) or whose health check
  // failed, with the reason.
  // Pure helpers are exposed as CC.autonomous for tests; components render inside .cc-root.
  var EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
  var EFFORT_WORD = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max' };
  var RUN_ROUTES = ['claude_code', 'codex', 'freebuff', 'gemini_app', 'chatgpt_web', 'antigravity_manual'];
  var MANUAL_ROUTES = ['gemini_app', 'chatgpt_web', 'antigravity_manual'];
  var AUTOMATED_ROUTES = ['claude_code', 'codex', 'freebuff'];
  var ROUTE_LABEL = { claude_code: 'Claude Code', freebuff: 'Freebuff', gemini_app: 'Gemini App', chatgpt_web: 'ChatGPT Web',
    antigravity_manual: 'Antigravity', codex: 'Codex' };
  var STRIP = ['claude_5h', 'claude_week', 'codex_5h', 'codex_week'];
  var STRIP_LABEL = { claude_5h: 'Claude 5 h', claude_week: 'Claude week', codex_5h: 'Codex 5 h', codex_week: 'Codex week' };
  // The header meters group by provider: "Claude 5 h 83%  week 72%".
  var STRIP_GROUPS = [{ id: 'claude', label: 'Claude', pools: ['claude_5h', 'claude_week'] },
    { id: 'codex', label: 'Codex', pools: ['codex_5h', 'codex_week'] }];
  var STRIP_SHORT = { claude_5h: '5 h', claude_week: 'week', codex_5h: '5 h', codex_week: 'week' };
  var HISTORY_LIMIT = 50;
  // The current pools, shown when the engine has no model registry yet (same list as sprints.py).
  var FALLBACK_MODELS = [
    { id: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic', kind: 'subagent', route: 'claude_code', enabled: true },
    { id: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic', kind: 'subagent', route: 'claude_code', enabled: true },
    { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash (Freebuff)', provider: 'freebuff', kind: 'subagent', route: 'freebuff', enabled: true },
    { id: 'gemini-4-argon', label: 'Gemini 4 Argon (Gemini App)', provider: 'google', kind: 'manual', route: 'gemini_app', enabled: true },
    { id: 'gpt-6-sol', label: 'GPT 6 Sol (ChatGPT Web)', provider: 'openai', kind: 'manual', route: 'chatgpt_web', enabled: true },
    { id: 'gemini-3.8-flash-high', label: 'AG Flash 3.8 (Antigravity)', provider: 'antigravity', kind: 'manual', route: 'antigravity_manual', enabled: true },
    { id: 'ag-pro-3.1', label: 'AG Pro 3.1 (Antigravity)', provider: 'antigravity', kind: 'manual', route: 'antigravity_manual', enabled: true },
    { id: 'agent:codex', label: 'Codex', provider: 'openai-codex', kind: 'agent', route: 'codex', enabled: true }
  ];

  var STYLE = [
    // Flat: sections are hairline-separated (kit .cc-sec), never boxed.
    '.cc-root .cc-au-panel{display:flex;flex-direction:column;min-width:0;}',
    '.cc-root .cc-au-sub{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-au-gh{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;margin-top:4px;}',
    '.cc-root .cc-au-row{display:flex;align-items:center;gap:8px;min-height:28px;font-size:12px;min-width:0;}',
    // Checkbox size and colour come from the kit (ui.js); only the focus ring is local.
    '.cc-root .cc-au-row input[type=checkbox]:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    '.cc-root .cc-au-row.cc-off{color:var(--cc-text-3);}',
    '.cc-root .cc-au-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-au-fold{align-self:flex-start;border:0;background:transparent;color:var(--cc-text-3);font:inherit;font-size:11px;height:24px;padding:0 4px;margin-left:-4px;border-radius:var(--cc-r-control);cursor:pointer;}',
    '.cc-root .cc-au-fold:hover{color:var(--cc-text-2);}',
    '.cc-root .cc-au-fold:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    '.cc-root .cc-au-m{font-size:11px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-au-slider{display:grid;grid-template-columns:56px 1fr 72px;align-items:center;gap:8px;min-height:28px;font-size:12px;}',
    '.cc-root .cc-au-slider input{width:100%;accent-color:var(--cc-accent);margin:0;}',
    '.cc-root .cc-au-input{border:1px solid var(--cc-line-strong);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:12px;height:28px;border-radius:var(--cc-r-control);padding:0 8px;min-width:0;color-scheme:light;}',
    '.cc-root .cc-au-input:focus-visible{outline:none;border-color:var(--cc-accent);}',
    '.cc-root .cc-au-input option{background:var(--cc-surface);color:var(--cc-text);}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]) .cc-au-input{color-scheme:dark;}}',
    '.cc-root[data-theme="dark"] .cc-au-input,html[data-theme="dark"] .cc-root .cc-au-input,body.dark .cc-root .cc-au-input{color-scheme:dark;}',
    '.cc-root .cc-au-seg{display:flex;}',
    '.cc-root .cc-au-seg .cc-sg{flex:1 1 auto;}',
    '.cc-root .cc-au-seg .cc-sg-o{flex:1 1 0;justify-content:center;}',
    // Usage meters in the header: "Claude 5 h [bar] 83%  week [bar] 72%".
    '.cc-root .cc-au-strip{display:flex;flex-wrap:nowrap;align-items:center;gap:16px;font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;}',
    '.cc-root .cc-au-ug{display:inline-flex;align-items:center;gap:10px;white-space:nowrap;}',
    '.cc-root .cc-au-u{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}',
    '.cc-root .cc-au-meter{position:relative;width:32px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-au-meter span{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-done);}',
    '.cc-root .cc-au-strip b{font-weight:500;color:var(--cc-text-2);min-width:26px;}',
    '.cc-root .cc-au-strip .cc-unk b{font-weight:400;color:var(--cc-text-3);}',
    '.cc-root .cc-au-strip .cc-low b{color:var(--cc-error);}',
    '.cc-root .cc-au-strip .cc-low .cc-au-meter span{background:var(--cc-error);}',
    // An old reading keeps its number, dimmed; the tooltip says when it was read.
    '.cc-root .cc-au-strip .cc-dim b{font-weight:400;color:var(--cc-text-3);}',
    '.cc-root .cc-au-strip .cc-dim .cc-au-meter span{background:var(--cc-text-3);}',
    // Sequence: hairline rows under a row label, no boxes. Red only after a Run attempt.
    '.cc-root .cc-au-seq{display:flex;flex-direction:column;container:cc-au-seq / inline-size;}',
    '.cc-root .cc-au-prow{display:grid;grid-template-columns:44px 1fr;gap:8px;align-items:start;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-au-prow.cc-over{background:var(--cc-wash);box-shadow:inset 0 0 0 1px var(--cc-accent);}',
    '.cc-root .cc-au-plab{font-size:11px;color:var(--cc-text-3);line-height:32px;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-au-items{display:flex;flex-direction:column;min-width:0;}',
    // A project row: grip, name (never under 120px), model select, remove. A narrow sequence puts
    // the select under the name.
    '.cc-root .cc-au-item{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;min-height:32px;padding:0 4px;border-radius:var(--cc-r-control);font-size:12px;cursor:grab;outline:none;}',
    '.cc-root .cc-au-item + .cc-au-item{border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-au-item:hover{background:var(--cc-wash);}',
    '.cc-root .cc-au-item .cc-au-n{flex:1 1 auto;min-width:120px;width:0;}',
    '.cc-root .cc-au-item .cc-au-input{height:24px;flex:0 1 180px;}',
    '.cc-root .cc-au-item .cc-au-grip,.cc-root .cc-au-item .cc-au-x{flex:none;}',
    '@container cc-au-seq (max-width:440px){.cc-root .cc-au-item{padding:4px;} .cc-root .cc-au-item .cc-au-input{order:3;flex:1 1 100%;margin-left:18px;max-width:calc(100% - 18px);}}',
    '.cc-root .cc-au-item.cc-live .cc-au-n::before{content:"";display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:var(--cc-running);vertical-align:1px;}',
    '.cc-root .cc-au-seq.cc-tried .cc-au-item.cc-need .cc-au-input{border-color:var(--cc-error);}',
    '.cc-root .cc-au-seq.cc-tried .cc-au-item.cc-need .cc-au-n{color:var(--cc-error);}',
    // A down model's reason: one line, cut with an ellipsis; the tooltip has it in full.
    '.cc-root .cc-au-m.cc-au-why{flex:0 1 auto;min-width:0;max-width:60%;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-au-item:focus-visible{box-shadow:inset 0 0 0 1px var(--cc-focus);}',
    '.cc-root .cc-au-item.cc-dragging{opacity:.5;}',
    '.cc-root .cc-au-grip{color:var(--cc-text-3);font-size:11px;line-height:1;user-select:none;}',
    '.cc-root .cc-au-x{border:0;background:transparent;color:var(--cc-text-3);font:inherit;font-size:14px;width:24px;height:24px;border-radius:var(--cc-r-control);cursor:pointer;padding:0;opacity:0;}',
    '.cc-root .cc-au-item:hover .cc-au-x,.cc-root .cc-au-item:focus-within .cc-au-x{opacity:1;}',
    '@media (hover: none){.cc-root .cc-au-x{opacity:1;}}',
    '.cc-root .cc-au-x:hover{background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root .cc-au-drop{font-size:11px;color:var(--cc-text-3);padding:6px 8px;border:1px dashed var(--cc-line-strong);border-radius:var(--cc-r-control);margin-top:4px;}',
    '.cc-root .cc-au-drop.cc-over{border-color:var(--cc-accent);color:var(--cc-accent);}',
    '.cc-root .cc-au-addrow{margin-top:8px;}',
    '.cc-root .cc-au-tools{display:flex;gap:4px;align-items:center;}',
    '.cc-root .cc-au-mini{border:1px solid var(--cc-line-strong);background:var(--cc-surface);color:var(--cc-text-2);font:inherit;font-size:11px;height:24px;padding:0 8px;border-radius:var(--cc-r-control);cursor:pointer;}',
    '.cc-root .cc-au-mini:hover{color:var(--cc-text);background:var(--cc-surface-2);}',
    '.cc-root .cc-au-mini:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-au-mini:focus-visible,.cc-root .cc-au-x:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;opacity:1;}'
  ].join('\n');

  function ensureStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-autonomous-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-autonomous-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ---- the shared kit (ui.js) ---------------------------------------------------------------------
  // A harness that loads these files without ui.js gets a bare stand-in with the same class names and
  // the same props, so rendering never depends on load order. page_sprints.js uses it too.
  function cx() { var o = []; for (var i = 0; i < arguments.length; i++) if (arguments[i]) o.push(arguments[i]); return o.join(' '); }
  var LITE = {
    cx: cx,
    Page: function (p) {
      return CC.h('div', { className: cx('cc-root', 'cc-page', p.className), 'data-cc': p.id }, p.header || null, p.banner || null,
        CC.h('div', { className: cx('cc-pb', p.pad !== false && 'cc-pb-pad') }, p.children));
    },
    PageHeader: function (p) {
      return CC.h('div', { className: 'cc-ph', role: 'toolbar', 'aria-label': p.title }, CC.h('div', { className: 'cc-ph-title' }, p.title),
        p.meta ? CC.h('div', { className: 'cc-ph-meta' }, p.meta) : null, p.mid ? CC.h('div', { className: 'cc-ph-mid' }, p.mid) : null,
        CC.h('div', { className: 'cc-ph-gap' }), p.actions ? CC.h('div', { className: 'cc-ph-act' }, p.actions) : null);
    },
    Button: function (p) {
      var kind = p.kind || 'default';
      return CC.h('button', { type: 'button', className: cx('cc-b', kind !== 'default' && 'cc-b-' + kind, p.size === 'sm' && 'cc-b-sm', p.className),
        onClick: p.onClick, onBlur: p.onBlur, disabled: !!p.disabled, title: p.title, 'aria-label': p.label || p.title }, p.children);
    },
    Segmented: function (p) {
      return CC.h('div', { className: 'cc-sg', role: 'group', 'aria-label': p.label }, (p.options || []).map(function (o) {
        return CC.h('button', { key: String(o.value), type: 'button', className: 'cc-sg-o', 'aria-pressed': p.value === o.value ? 'true' : 'false', title: o.title,
          onClick: function () { if (p.onChange && p.value !== o.value) p.onChange(o.value); } }, o.label);
      }));
    },
    Toggle: function (p) {
      return CC.h('button', { type: 'button', role: 'switch', className: 'cc-sw', 'aria-checked': p.checked ? 'true' : 'false',
        'aria-label': p.label, title: p.title || p.label, disabled: !!p.disabled, onClick: function () { if (p.onChange) p.onChange(!p.checked); } });
    },
    Empty: function (p) {
      return CC.h('div', { className: 'cc-em' }, CC.h('div', { className: 'cc-em-t' }, p.title), p.body ? CC.h('div', { className: 'cc-em-b' }, p.body) : null);
    },
    Icon: function () { return null; },
    ICONS: {}
  };
  function kit() { return CC.ui || LITE; }

  // ---- models --------------------------------------------------------------------------------
  // Antigravity is a manual agentic coder in Autonomous, so its registry route is offered as
  // antigravity_manual (the engine does the same in sprints.py).
  var ROUTE_ALIASES = { antigravity: 'antigravity_manual' };
  function isCodex(m) {
    return /codex/i.test(String(m.route || '')) || /^(openai-codex|codex)$/i.test(String(m.provider || '')) || /^(agent:)?codex$/i.test(String(m.id || ''));
  }
  // Agents switches (toggles.js): a model is off when its row, its id or its route is switched off.
  function isOn(m) {
    if (!m || m.enabled === false) return false;
    if (typeof CC.isEnabled !== 'function') return true;
    return CC.isEnabled(m.id) !== false && (!m.route || CC.isEnabled(m.route) !== false)
      && (!m.registry_route || CC.isEnabled(m.registry_route) !== false);
  }
  // Plain display name (preference 82): no route or CLI suffix (" · Antigravity (agy CLI)"), no
  // effort or route in brackets ("(high)", "(Freebuff)"); a bare "haiku-5.5" becomes "Claude Haiku 5.5".
  function plainName(m) {
    var s = String((m && (m.label || m.id)) || '').split(' · ')[0].trim();
    var prev;
    do { prev = s; s = s.replace(/\s*\([^()]*\)\s*$/, ''); } while (s !== prev && s);
    var bare = /^(opus|sonnet|haiku)-(\d[\d.]*)$/i.exec(s);
    if (bare) s = 'Claude ' + bare[1].charAt(0).toUpperCase() + bare[1].slice(1).toLowerCase() + ' ' + bare[2];
    return s || String((m && m.id) || '');
  }
  function runnable(m) { return RUN_ROUTES.indexOf(m.route) >= 0 && isOn(m) && !m.down; }
  // Why a switched-on model cannot run now: its route's connection is not ready (GET /api/agents
  // connections[].state, e.g. "Bridge not answering (HTTP 502)") or its own last health check failed.
  // Returns { line, title } (one short line, the full reason) or null.
  function downReason(m, conns) {
    var c = conns[m.route] || (m.registry_route && conns[m.registry_route]);
    if (c && c.state && c.state !== 'ready') { var l = String(c.line || 'Not ready'); return { line: l, title: l }; }
    var hl = m.health;
    if (hl && hl.ok === false && !hl.stale) {
      var code = /HTTP (\d{3})/.exec(String(hl.reason || ''));
      return { line: 'Last check failed' + (code ? ' (HTTP ' + code[1] + ')' : ''), title: String(hl.reason || 'Last check failed') };
    }
    return null;
  }
  // Every model, each marked off (switched off in Agents: greyed, folded, never ticked), down (its
  // route or health check is failing: greyed with the reason, never ticked), runnable (a run may
  // use it) and with a short note. `connections` is GET /api/agents connections (optional).
  function enabledModels(models, connections) {
    var conns = {};
    (connections || []).forEach(function (c) { if (c && c.id) conns[c.id] = c; });
    return (models || []).filter(function (m) { return m && m.id; }).map(function (m) {
      var out = Object.assign({}, m);
      if (ROUTE_ALIASES[out.route]) { out.registry_route = out.route; out.route = ROUTE_ALIASES[out.route]; out.kind = 'manual'; }
      else if (!out.route && out.kind === 'agent' && isCodex(out)) { out.route = 'codex'; }
      out.off = !isOn(out);
      var why = out.off || RUN_ROUTES.indexOf(out.route) < 0 ? null : downReason(out, conns);
      out.down = why ? why.line : null;
      out.down_title = why ? why.title : null;
      out.runnable = runnable(out);
      out.note = out.off ? 'off in Agents'
        : out.down ? out.down
        : out.runnable ? ROUTE_LABEL[out.route]
        : isCodex(out) ? 'Codex · tick the Codex agent' : 'chat only';
      return out;
    });
  }
  // Pick the registry when GET /api/models answered, otherwise the current pools.
  function modelsFrom(registry, engineFallback, connections) {
    var list = registry && Array.isArray(registry.models) ? registry.models : null;
    if (list) return { models: enabledModels(list, connections), source: 'registry' };
    var fb = engineFallback && engineFallback.length ? engineFallback : FALLBACK_MODELS;
    return { models: enabledModels(fb, connections), source: 'fallback' };
  }
  function groupModels(models) {
    var groups = [
      { id: 'runs', label: 'Unattended', items: [] },
      { id: 'manual', label: 'Manual', title: 'Copy Prompt only; never run unattended', items: [] },
      { id: 'other', label: 'Chat only', title: 'Chat in dsh; not a run route', items: [] }
    ];
    models.forEach(function (m) {
      // A switched-off or down run model stays in its group, greyed, so the owner sees what cannot run.
      var runRoute = RUN_ROUTES.indexOf(m.route) >= 0;
      groups[!(m.runnable || ((m.off || m.down) && runRoute)) ? 2 : MANUAL_ROUTES.indexOf(m.route) >= 0 ? 1 : 0].items.push(m);
    });
    groups.forEach(function (g) {
      // A route-level row ("Claude Code" on the Claude Code route) reads "Any model" beside that
      // route's own models, so the route is never listed as a model of itself.
      g.items = g.items.map(function (m) {
        var rl = ROUTE_LABEL[m.route];
        if (!rl || plainName(m) !== rl) return m;
        var siblings = g.items.some(function (x) { return x !== m && x.route === m.route; });
        return siblings ? Object.assign({}, m, { display: 'Any model' }) : m;
      });
      // Down models after the ones that can run.
      g.items = g.items.filter(function (m) { return !m.down; }).concat(g.items.filter(function (m) { return !!m.down; }));
    });
    return groups.filter(function (g) { return g.items.length; });
  }
  // Pools of the ticked models (and of projects' own models), in run order.
  function selectedPools(settings, models) {
    var byId = {};
    models.forEach(function (m) { byId[m.id] = m; });
    var ids = (settings.models || []).slice();
    (settings.sequence || []).forEach(function (row) { row.forEach(function (i) { if (i.model) ids.push(i.model); }); });
    var pools = {};
    ids.forEach(function (id) { var m = byId[id]; if (m && m.runnable) pools[m.route] = true; });
    return RUN_ROUTES.filter(function (r) { return pools[r]; });
  }
  // Ticking a switched-off model is refused (pass the model list); unticking always works.
  function toggleModel(settings, id, models) {
    var has = (settings.models || []).indexOf(id) >= 0;
    var m = (models || []).filter(function (x) { return x.id === id; })[0];
    if (!has && (m ? !runnable(m) : typeof CC.isEnabled === 'function' && CC.isEnabled(id) === false)) return settings;
    var next = has ? settings.models.filter(function (x) { return x !== id; }) : (settings.models || []).concat([id]);
    return Object.assign({}, settings, { models: next });
  }

  // ---- usage meters: Codex and Claude only -----------------------------------------------------
  function usageStrip(rows) {
    var by = {};
    (rows || []).forEach(function (r) { if (r && r.pool) by[r.pool] = r; });
    return STRIP.map(function (pool) {
      var r = by[pool] || {};
      return { pool: pool, label: STRIP_LABEL[pool], remaining_percent: r.remaining_percent == null ? null : r.remaining_percent,
        resets_at: r.resets_at || null, status: r.status || 'UNKNOWN', observed_at: r.observed_at || null };
    });
  }
  // One meter as shown: a fresh number; an old reading's number dimmed (never the word "stale")
  // with "Last read hh:mm" in its tooltip; no number as a dash.
  function meterView(r) {
    var has = r.remaining_percent != null && r.status !== 'UNKNOWN';
    var left = has ? Math.max(0, Math.min(100, Math.round(r.remaining_percent))) : null;
    var dim = has && r.status !== 'FRESH';
    var title = r.label + (has ? ': ' + left + '% left' : ': usage unknown')
      + (dim ? ' · ' + (r.observed_at ? 'Last read ' + hm(r.observed_at) : 'Last read earlier') : '')
      + (r.resets_at ? ' · resets ' + hm(r.resets_at) : '');
    return { pool: r.pool, short: STRIP_SHORT[r.pool], left: left, dim: dim, low: has && !dim && left < 15, title: title };
  }

  // ---- project sequence ------------------------------------------------------------------------
  function clone(seq) { return (seq || []).map(function (row) { return row.map(function (i) { return Object.assign({}, i); }); }); }
  function tidy(seq) { return seq.filter(function (row) { return row.length; }); }
  function find(seq, pid) {
    for (var r = 0; r < seq.length; r++) for (var i = 0; i < seq[r].length; i++) if (seq[r][i].project === pid) return [r, i];
    return null;
  }
  function addProject(seq, pid) {
    if (!pid || find(seq || [], pid)) return seq;
    return clone(seq).concat([[{ project: pid, model: null }]]);
  }
  function removeProject(seq, pid) {
    return tidy(clone(seq).map(function (row) { return row.filter(function (i) { return i.project !== pid; }); }));
  }
  function setModel(seq, pid, model) {
    return clone(seq).map(function (row) { return row.map(function (i) { return i.project === pid ? Object.assign(i, { model: model || null }) : i; }); });
  }
  // Move pid into row `row` at `index`. row === -1 makes a new first row; row >= length a new last row.
  function moveTo(seq, pid, row, index) {
    var at = find(seq, pid);
    if (!at) return seq;
    var next = clone(seq);
    var item = next[at[0]].splice(at[1], 1)[0];
    var rows = next.length;
    if (row < 0) { next.unshift([item]); return tidy(next); }
    if (row >= rows) { next.push([item]); return tidy(next); }
    var target = next[row];
    var i = index == null ? target.length : Math.max(0, Math.min(index, target.length));
    target.splice(i, 0, item);
    return tidy(next);
  }
  // Ctrl+Arrow: Up/Down moves to the row above/below (a new row past either end, unless the project
  // is already alone there); Left/Right reorders within the row.
  function nudge(seq, pid, key) {
    var at = find(seq, pid);
    if (!at) return seq;
    var r = at[0], i = at[1], alone = seq[r].length === 1;
    if (key === 'ArrowUp') {
      if (r === 0) return alone ? seq : moveTo(seq, pid, -1);
      return moveTo(seq, pid, r - 1);
    }
    if (key === 'ArrowDown') {
      if (r === seq.length - 1) return alone ? seq : moveTo(seq, pid, seq.length);
      return moveTo(seq, pid, r + 1);  // row indices are taken before an emptied row is dropped
    }
    if (key === 'ArrowLeft') return i === 0 ? seq : moveTo(seq, pid, r, i - 1);
    if (key === 'ArrowRight') return i === seq[r].length - 1 ? seq : moveTo(seq, pid, r, i + 1);
    return seq;
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Undo / Redo over the sequence.
  function history(present) { return { past: [], present: present || [], future: [] }; }
  function commit(hist, next) {
    if (same(hist.present, next)) return hist;
    return { past: hist.past.concat([hist.present]).slice(-HISTORY_LIMIT), present: next, future: [] };
  }
  function undo(hist) {
    if (!hist.past.length) return hist;
    return { past: hist.past.slice(0, -1), present: hist.past[hist.past.length - 1], future: [hist.present].concat(hist.future) };
  }
  function redo(hist) {
    if (!hist.future.length) return hist;
    return { past: hist.past.concat([hist.present]), present: hist.future[0], future: hist.future.slice(1) };
  }

  CC.autonomous = {
    EFFORTS: EFFORTS, RUN_ROUTES: RUN_ROUTES, MANUAL_ROUTES: MANUAL_ROUTES, AUTOMATED_ROUTES: AUTOMATED_ROUTES,
    ROUTE_LABEL: ROUTE_LABEL, FALLBACK_MODELS: FALLBACK_MODELS,
    isOn: isOn, enabledModels: enabledModels, modelsFrom: modelsFrom, groupModels: groupModels, selectedPools: selectedPools,
    toggleModel: toggleModel, usageStrip: usageStrip, meterView: meterView, plainName: plainName,
    addProject: addProject, removeProject: removeProject, setModel: setModel, moveTo: moveTo, nudge: nudge, find: find,
    history: history, commit: commit, undo: undo, redo: redo, ensureStyle: ensureStyle, style: STYLE
  };

  // ---- components -------------------------------------------------------------------------------
  function hm(v) {
    var t = typeof v === 'number' ? v : new Date(v).getTime();
    if (isNaN(t)) return '–';
    var d = new Date(t);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function UsageStrip(props) {
    var h = CC.h;
    var by = {};
    usageStrip(props.rows).forEach(function (r) { by[r.pool] = meterView(r); });
    // A provider switched off in Agents (Codex) has no meters here.
    var groups = STRIP_GROUPS.filter(function (g) { return typeof CC.isEnabled !== 'function' || CC.isEnabled(g.id) !== false; });
    return h('div', { className: 'cc-au-strip', role: 'status', 'aria-label': 'Usage' },
      groups.map(function (g) {
        return h('span', { key: g.id, className: 'cc-au-ug' },
          g.pools.map(function (pool, i) {
            var v = by[pool];
            return h('span', { key: pool, className: 'cc-au-u' + (v.low ? ' cc-low' : '') + (v.dim ? ' cc-dim' : '') + (v.left == null ? ' cc-unk' : ''),
              title: v.title },
              h('span', null, i === 0 ? g.label + ' ' + v.short : v.short),
              v.left != null ? h('span', { className: 'cc-au-meter', 'aria-hidden': 'true' }, h('span', { style: { width: v.left + '%' } })) : null,
              h('b', null, v.left != null ? v.left + '%' : '–'));
          }));
      }));
  }

  // A hairline section in the kit's classes (.cc-sec), with optional tools at the right.
  function Section(props) {
    var h = CC.h;
    return h('section', { className: 'cc-sec cc-au-sec', 'aria-label': props.title },
      h('div', { className: 'cc-sec-h' }, h('div', { className: 'cc-sec-t' }, props.title),
        props.meta ? h('div', { className: 'cc-sec-m' }, props.meta) : null,
        props.tools ? h('div', { className: 'cc-sec-a' }, props.tools) : null),
      props.children);
  }

  function greyClass() { return (CC.toggles && CC.toggles.GREY) || 'cc-greyed'; }

  function Tick(props) {
    var h = CC.h;
    var grey = props.off ? ' ' + greyClass() : '';
    return h('label', { className: 'cc-au-row' + (props.disabled ? ' cc-off' : '') + grey, title: props.title || undefined,
      'aria-disabled': props.disabled ? 'true' : undefined },
      h('input', { type: 'checkbox', checked: !!props.checked, disabled: !!props.disabled,
        onChange: function (e) { props.onChange(e.target.checked); } }),
      h('span', { className: 'cc-au-n' }, props.label),
      props.hint ? h('span', { className: 'cc-au-m' + (props.why ? ' cc-au-why' : '') }, props.hint) : null);
  }

  // An on/off setting: the kit switch, then its label.
  function Switch(props) {
    var h = CC.h;
    return h('div', { className: 'cc-au-row cc-au-switch', title: props.title || undefined },
      h(kit().Toggle, { checked: !!props.checked, label: props.label, title: props.title, onChange: props.onChange }),
      h('span', { className: 'cc-au-n', onClick: function () { props.onChange(!props.checked); } }, props.label));
  }

  function ModelTicks(props) {
    var h = CC.h, React = CC.React, s = props.settings;
    var ex = React.useState(false), showAll = ex[0], setShowAll = ex[1];
    var of = React.useState({}), openOff = of[0], setOpenOff = of[1];
    var groups = groupModels(props.models);
    var ticked = (s.models || []).filter(function (id) { return props.models.some(function (m) { return m.id === id && m.runnable; }); }).length;
    return h(Section, { title: 'Models', meta: ticked ? ticked + ' ticked' : null },
      groups.map(function (g) {
        // Chat-only models are listed for completeness but folded away: they cannot run a task.
        var folded = g.id === 'other' && !showAll;
        return h('div', { key: g.id },
          h('div', { className: 'cc-au-gh' }, h('span', { className: 'cc-au-sub', title: g.title }, g.label),
            g.id === 'other' ? h('button', { type: 'button', className: 'cc-au-fold', 'aria-expanded': showAll,
              onClick: function () { setShowAll(!showAll); } }, showAll ? 'Hide' : 'Show ' + g.items.length) : null),
          folded ? null : g.items.filter(function (m) { return !m.off; }).map(tick),
          folded ? null : offFold(g));
      }));
    function tick(m) {
      var label = m.display || plainName(m);
      return h(Tick, { key: m.id, label: label, hint: m.off || m.note === label ? null : m.note, why: !!m.down,
        disabled: !m.runnable, off: m.off || !!m.down,
        title: m.runnable ? undefined : m.off ? 'Switched off in Agents' : m.down ? 'Not ready: ' + m.down_title
          : (m.note === 'chat only' ? 'Chat in dsh; not a run route' : 'Tick the Codex agent to run Codex'),
        checked: m.runnable && (s.models || []).indexOf(m.id) >= 0,
        onChange: function () { props.onChange(toggleModel(s, m.id, props.models)); } });
    }
    // Switched-off models stay greyed but fold into one quiet trailing "N off" row per group.
    function offFold(g) {
      var off = g.items.filter(function (m) { return m.off; });
      if (!off.length) return null;
      var open = !!openOff[g.id];
      return [
        h('button', { key: 'off', type: 'button', className: 'cc-au-fold', 'aria-expanded': open, title: 'Switched off in Agents',
          onClick: function () { var n = Object.assign({}, openOff); n[g.id] = !open; setOpenOff(n); } }, off.length + ' off'),
        h('div', { key: 'offrows', hidden: !open }, off.map(tick))
      ];
    }
  }

  function Slider(props) {
    var h = CC.h, i = Math.max(0, EFFORTS.indexOf(props.value));
    var id = 'cc-au-eff-' + props.name;
    var off = props.agent && typeof CC.isEnabled === 'function' && CC.isEnabled(props.agent) === false;
    return h('div', { className: 'cc-au-slider' + (off ? ' ' + greyClass() : ''), title: off ? 'Switched off in Agents' : undefined },
      h('label', { htmlFor: id }, props.label),
      h('input', { id: id, type: 'range', min: 0, max: EFFORTS.length - 1, step: 1, value: i, disabled: off,
        'aria-valuetext': EFFORT_WORD[EFFORTS[i]],
        onChange: function (e) { props.onChange(EFFORTS[Number(e.target.value)]); } }),
      h('span', { className: 'cc-au-m' }, EFFORT_WORD[EFFORTS[i]]));
  }

  var PRESETS = [{ value: 'frugal', label: 'Frugal' }, { value: 'balanced', label: 'Balanced' }, { value: 'push', label: 'Push' }, { value: 'max', label: 'Max' }];

  function RunControls(props) {
    var h = CC.h, s = props.settings, set = props.onChange;
    var fo = CC.React.useState(false), effortOpen = fo[0], setEffortOpen = fo[1];
    var codexOff = typeof CC.isEnabled === 'function' && CC.isEnabled('codex') === false;
    function put(key, value) { var n = Object.assign({}, s); n[key] = value; set(n); }
    var pools = selectedPools(s, props.models).filter(function (p) { return AUTOMATED_ROUTES.indexOf(p) >= 0; });
    return h('div', { className: 'cc-au-panel', role: 'group', 'aria-label': 'Run controls' },
      h(ModelTicks, { models: props.models, source: props.source, settings: s, onChange: set }),
      h(Section, { title: 'Effort' },
        h(Slider, { name: 'claude', label: 'Claude', agent: 'claude_code', value: s.efforts.claude, onChange: function (v) { put('efforts', Object.assign({}, s.efforts, { claude: v })); } }),
        codexOff ? null
          : h(Slider, { name: 'codex', label: 'Codex', agent: 'codex', value: s.efforts.codex, onChange: function (v) { put('efforts', Object.assign({}, s.efforts, { codex: v })); } }),
        // Codex switched off in Agents: its effort row folds into the same quiet "1 off" line the
        // model list uses, greyed behind it.
        codexOff ? h('button', { type: 'button', className: 'cc-au-fold', 'aria-expanded': effortOpen, title: 'Switched off in Agents',
          onClick: function () { setEffortOpen(!effortOpen); } }, '1 off') : null,
        codexOff ? h('div', { hidden: !effortOpen },
          h('div', { className: 'cc-au-row cc-off ' + greyClass(), title: 'Switched off in Agents' },
            h('span', { className: 'cc-au-n' }, 'Codex'), h('span', { className: 'cc-au-m' }, 'off'))) : null),
      h(Section, { title: 'Spend' },
        h('div', { className: 'cc-au-seg' },
          h(kit().Segmented, { label: 'Spend', value: s.preset, options: PRESETS, onChange: function (v) { put('preset', v); } }))),
      h(Section, { title: 'Timing' },
        h(Switch, { label: 'Punch clock', title: 'Autonomous windows gate the pools', checked: s.punch_clock, onChange: function (v) { put('punch_clock', v); } }),
        h(Switch, { label: 'Auto-wake on reset', title: 'Starts one minute after the reset', checked: s.auto_wake, onChange: function (v) { put('auto_wake', v); } }),
        h(Switch, { label: 'Merge Codex and Claude resets', checked: s.merge_resets, onChange: function (v) { put('merge_resets', v); } }),
        h(Switch, { label: 'Power off when done', title: '10 minutes to cancel', checked: s.power_off, onChange: function (v) { put('power_off', v); } })),
      h(Section, { title: 'Use fully' },
        pools.length ? pools.map(function (p) {
          return h(Switch, { key: p, label: 'Max ' + ROUTE_LABEL[p], title: 'Use ' + ROUTE_LABEL[p] + ' until its floor', checked: !!(s.max_use || {})[p],
            onChange: function (v) { var m = Object.assign({}, s.max_use || {}); if (v) m[p] = true; else delete m[p]; put('max_use', m); } });
        }) : h('div', { className: 'cc-au-m' }, 'Tick a run model to choose.')));
  }

  function Sequence(props) {
    var h = CC.h, React = CC.React;
    var seq = props.sequence || [];
    var dg = React.useState(null), dragging = dg[0], setDragging = dg[1];
    var ov = React.useState(null), over = ov[0], setOver = ov[1];
    var byId = {};
    (props.projects || []).forEach(function (p) { byId[p.id] = p; });
    var placed = {};
    seq.forEach(function (row) { row.forEach(function (i) { placed[i.project] = true; }); });
    var free = (props.projects || []).filter(function (p) { return !placed[p.id]; });
    // Run models; switched-off and down ones stay listed, greyed and unselectable.
    var runModels = (props.models || []).filter(function (m) { return m.runnable || ((m.off || m.down) && RUN_ROUTES.indexOf(m.route) >= 0); });
    var byModel = {};
    (props.models || []).forEach(function (m) { byModel[m.id] = m; });
    var anyTicked = props.ticked > 0;

    function drop(row, index) {
      return function (e) {
        e.preventDefault();
        var pid = dragging || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        setDragging(null); setOver(null);
        if (pid) props.onChange(moveTo(seq, pid, row, index));
      };
    }
    function overRow(key) { return function (e) { e.preventDefault(); if (over !== key) setOver(key); }; }
    function onKey(pid) {
      return function (e) {
        if (!(e.ctrlKey || e.metaKey) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
        e.preventDefault();
        props.onChange(nudge(seq, pid, e.key));
        props.focusLater(pid);
      };
    }
    function Item(item, r, i) {
      var p = byId[item.project] || { title: item.project };
      // A row's own model that is off or down is never kept silently: the select shows empty and
      // the row is flagged. With no own model and nothing ticked the row has nothing to run on.
      // The flag turns red only after a Run attempt (props.tried).
      var chosen = item.model ? byModel[item.model] : null;
      var bad = !!(chosen && !chosen.runnable);
      var need = bad || (!item.model && !anyTicked);
      return h('div', {
        key: item.project, className: 'cc-au-item' + (dragging === item.project ? ' cc-dragging' : '')
          + ((props.live || {})[item.project] === 'running' ? ' cc-live' : '') + (need ? ' cc-need' : ''), tabIndex: 0,
        title: need ? (bad ? plainName(chosen) + ': ' + (chosen.off ? 'switched off in Agents' : 'not ready, ' + chosen.down_title) : 'Pick a model') : undefined,
        draggable: true, 'data-project': item.project, role: 'listitem',
        'aria-label': (p.title || item.project) + ', row ' + (r + 1) + '. Drag, or Ctrl plus an arrow key, to move.',
        onDragStart: function (e) { setDragging(item.project); try { e.dataTransfer.setData('text/plain', item.project); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* old engines */ } },
        onDragEnd: function () { setDragging(null); setOver(null); },
        onDragOver: function (e) { e.preventDefault(); e.stopPropagation(); if (over !== r) setOver(r); },
        onDrop: function (e) { e.stopPropagation(); drop(r, i)(e); },
        onKeyDown: onKey(item.project)
      },
      h('span', { className: 'cc-au-grip', 'aria-hidden': 'true' }, '⋮⋮'),
      h('span', { className: 'cc-au-n', title: p.title || item.project }, p.title || item.project),
      h('select', { className: 'cc-au-input', value: item.model && !bad ? item.model : '', 'aria-label': 'Model for ' + (p.title || item.project),
        'aria-invalid': need && props.tried ? 'true' : undefined,
        onChange: function (e) { props.onChange(setModel(seq, item.project, e.target.value)); } },
        [h('option', { key: '', value: '' }, anyTicked ? 'Ticked models' : 'Model')].concat(runModels.map(function (m) {
          return h('option', { key: m.id, value: m.id, disabled: !m.runnable, className: m.runnable ? undefined : greyClass() },
            plainName(m) + (m.runnable ? '' : m.off ? ' (off)' : ' (not ready)'));
        }))),
      h('button', { type: 'button', className: 'cc-au-x', 'aria-label': 'Remove ' + (p.title || item.project), title: 'Remove',
        onClick: function () { props.onChange(removeProject(seq, item.project)); } }, '×'));
    }

    // Undo and Redo appear once there is history.
    var showTools = !!(props.canUndo || props.canRedo);
    var count = 0;
    seq.forEach(function (row) { count += row.length; });
    return h(Section, {
      title: 'Project sequence', meta: count ? String(count) : null,
      tools: showTools ? h('div', { className: 'cc-au-tools' },
        h('button', { type: 'button', className: 'cc-au-mini', disabled: !props.canUndo, onClick: props.onUndo, title: 'Undo (Ctrl+Z)' }, 'Undo'),
        h('button', { type: 'button', className: 'cc-au-mini', disabled: !props.canRedo, onClick: props.onRedo, title: 'Redo (Ctrl+Y)' }, 'Redo')) : null
    },
    h('div', { className: 'cc-au-seq' + (props.tried ? ' cc-tried' : ''), role: 'list', 'aria-label': 'Priority rows',
      title: 'Projects in a row start together; a row waits for every project above it. Ctrl+Arrow moves the focused project.' },
      seq.map(function (row, r) {
        return h('div', { key: 'r' + r, className: 'cc-au-prow' + (over === r ? ' cc-over' : ''),
          onDragOver: overRow(r), onDragLeave: function () { if (over === r) setOver(null); }, onDrop: drop(r, null) },
        h('div', { className: 'cc-au-plab' }, 'Row ' + (r + 1)),
        h('div', { className: 'cc-au-items' }, row.map(function (item, i) { return Item(item, r, i); })));
      }),
      dragging ? h('div', { className: 'cc-au-drop' + (over === 'new' ? ' cc-over' : ''), onDragOver: overRow('new'), onDrop: drop(seq.length, null) },
        'Drop here for a new last row') : null),
    h('div', { className: 'cc-au-row cc-au-addrow' },
      h('select', { className: 'cc-au-input', value: '', 'aria-label': 'Add a project as a new last row', style: { flex: 1 }, disabled: !free.length,
        onChange: function (e) { if (e.target.value) props.onChange(addProject(seq, e.target.value)); } },
        [h('option', { key: '', value: '' }, !free.length ? 'Every project is in the sequence' : seq.length ? 'Add a project…' : 'Add a project to run; rows run top to bottom')].concat(free.map(function (p) {
          return h('option', { key: p.id, value: p.id }, p.title || p.id);
        })))));
  }

  CC.AutonomousControls = { UsageStrip: UsageStrip, RunControls: RunControls, Sequence: Sequence, Section: Section, kit: kit };
})(CC);

		// ── page_sprints.js
(function (CC) {
  // Autonomous page (page id cc-sprints, so old links still open it): the one place runs start.
  // One header (state, usage meters, Copy prompt, Run). Below, two columns from 1200 px: the run
  // controls (autonomous_controls.js: models, effort, spend, timing) on the left; the project
  // sequence, the timeline (reset markers, sprint blocks you drag to move or click to edit, actual
  // execution time on finished blocks), the punch clock and recent runs on the right. Data:
  // GET /api/autonomous, GET /api/models (current pools when absent) and GET /api/sprints/timeline
  // (engine/cc_engine/sprints.py). Also hides dsh's Automation tasks sidebar entry from page load
  // once the owner chose to hide it (see "Automation tasks" below). Pools and adders switched off in
  // Agents (CC.isEnabled, toggles.js) are greyed out and refused.
  var ROWS = [
    { id: 'claude_code', label: 'Claude Code' },
    { id: 'codex', label: 'Codex' },
    { id: 'freebuff', label: 'Freebuff', optional: true }
  ];
  var LABEL = {};
  ROWS.forEach(function (r) { LABEL[r.id] = r.label; });
  var LOOKBACK_H = 3;          // the track starts a little before now so recent work stays visible
  var SNAP_MS = 5 * 60000;     // drags snap to 5 minutes
  var DRAG_PX = 4;             // below this a press is a click
  var SAVE_DELAY_MS = 600;
  var TICK_STEPS = [3, 6, 12, 24];  // hour steps, the smallest whose spacing is at least LABEL_GAP
  var LABEL_GAP = 40;          // px: a tick label never sits closer than this to the last one
  var NOW_HALF = 18;           // px kept clear of tick labels either side of "now"
  var TRACK_GUESS = 800;       // px assumed before the track is measured
  var TEXT_MIN = 7;            // blocks narrower than this % of the track show no text (the title still has it)
  var HOURS = [{ id: 24, label: '24 h' }, { id: 48, label: '48 h' }];
  var STATE_WORD = { planned: 'Planned', due: 'Due', active: 'Running', finished: 'Finished', cancelled: 'Cancelled' };
  var ADDERS = [
    { kind: 'claude', label: 'Claude' }, { kind: 'codex', label: 'Codex' },
    { kind: 'dual', label: 'Dual' }, { kind: 'auto_dual', label: 'Auto dual' }
  ];
  var KIND_TEXT = { codex: 'a Codex sprint', dual: 'a Dual sprint (Claude and Codex together)',
    auto_dual: 'an Auto Dual pair (Claude and Codex one after the other)' };
  // Pools each sprint adder needs; an adder whose pool is switched off in Agents is greyed out.
  var KIND_POOLS = { claude: ['claude_code'], codex: ['codex'], dual: ['claude_code', 'codex'], auto_dual: ['claude_code', 'codex'] };
  // Agents switches (toggles.js). Without the helper every pool counts as on; the engine still refuses.
  function isOn(id) { return typeof CC.isEnabled !== 'function' || CC.isEnabled(id) !== false; }
  function adderOn(kind) { return (KIND_POOLS[kind] || []).every(isOn); }
  // Adders whose pools are all on; Codex, Dual and Auto dual are left out of the menu while Codex is off.
  function visibleAdders() { return ADDERS.filter(function (a) { return adderOn(a.kind); }); }
  function greyClass() { return (CC.toggles && CC.toggles.GREY) || 'cc-greyed'; }
  // Kit button classes, written directly so every state renders the same <button>.
  function btn(kind, size) { return 'cc-b' + (kind && kind !== 'default' ? ' cc-b-' + kind : '') + (size === 'sm' ? ' cc-b-sm' : ''); }
  function kit() { return (CC.AutonomousControls && CC.AutonomousControls.kit) ? CC.AutonomousControls.kit() : CC.ui; }

  var STYLE = [
    '.cc-root.cc-sp-page{position:relative;}',
    // Two dense columns from 1200 px, one below. Hairline sections, no boxed cards.
    '.cc-root .cc-sp-main{position:relative;display:grid;grid-template-columns:minmax(0,1fr);gap:0;align-items:start;}',
    '.cc-root .cc-sp-col{display:flex;flex-direction:column;min-width:0;}',
    '.cc-root .cc-sp-right{border-top:1px solid var(--cc-line);padding-top:12px;}',
    '.cc-root .cc-sp-left .cc-au-panel{max-width:560px;}',
    '@media (min-width:1200px){.cc-root .cc-sp-main{grid-template-columns:minmax(300px,380px) minmax(0,1fr);}' +
      '.cc-root .cc-sp-right{border-top:0;padding-top:0;border-left:1px solid var(--cc-line);padding-left:24px;margin-left:24px;}}',
    '.cc-root .cc-sp-m{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-sp-act{display:flex;align-items:center;gap:8px;min-width:0;}',
    '.cc-root .cc-sp-act .cc-au-strip{margin-right:8px;}',
    '@media (max-width:1100px){.cc-root .cc-sp-act .cc-au-ug + .cc-au-ug,.cc-root .cc-sp-act .cc-au-u + .cc-au-u{display:none;}}',
    // Run is the one start control, Stop the one stop control: a play or a square glyph, no icon font.
    '.cc-root .cc-sp-go::before{content:"";width:0;height:0;border-left:7px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent;}',
    '.cc-root .cc-sp-stop::before{content:"";width:8px;height:8px;border-radius:2px;background:currentColor;}',
    '.cc-root .cc-sp-stop.cc-ask{background:var(--cc-error);border-color:var(--cc-error);color:var(--cc-on-status);}',
    // State dot in the header meta.
    '.cc-root .cc-sp-dot{display:inline-block;flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-neutral);margin-right:6px;vertical-align:1px;}',
    '.cc-root .cc-sp-dot.cc-ready{background:transparent;box-shadow:inset 0 0 0 1.5px var(--cc-ready);}',
    '.cc-root .cc-sp-dot.cc-running{background:var(--cc-running);}',
    '.cc-root .cc-sp-dot.cc-waiting{background:transparent;box-shadow:inset 0 0 0 1.5px var(--cc-neutral);}',
    // Running now: one row per live run
    '.cc-root .cc-sp-live-r{display:grid;grid-template-columns:6px minmax(0,1fr) auto 72px;align-items:center;gap:10px;min-height:32px;padding:0 4px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-sp-live-r:last-child{border-bottom:0;}',
    '.cc-root .cc-sp-live-r .cc-sp-dot{margin:0;}',
    '.cc-root .cc-sp-live-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-sp-live-r .cc-sp-m:last-child{text-align:right;}',
    '.cc-root .cc-sp-addm > .cc-mn-pop[hidden]{display:none;}',
    '.cc-root .cc-sp-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-sp-confirm span{flex:1;min-width:200px;}',
    '.cc-root .cc-sp-block:focus-visible,.cc-root .cc-sp-li:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    // Timeline: a hairline grid, no box.
    '.cc-root .cc-sp-tl{display:grid;grid-template-columns:112px 1fr;border-top:1px solid var(--cc-line);border-bottom:1px solid var(--cc-line);user-select:none;}',
    '.cc-root .cc-sp-lab{display:flex;flex-direction:column;justify-content:center;gap:0;padding:0 8px 0 0;border-top:1px solid var(--cc-line);font-size:12px;font-weight:500;min-width:0;}',
    '.cc-root .cc-sp-lab .cc-sp-m{overflow:hidden;text-overflow:ellipsis;font-weight:400;}',
    '.cc-root .cc-sp-lab .cc-sp-m.cc-dim{opacity:.7;}',
    '.cc-root .cc-sp-axis{position:relative;height:24px;}',
    '.cc-root .cc-sp-axis-lab{border-top:0;}',
    '.cc-root .cc-sp-track{position:relative;height:40px;border-top:1px solid var(--cc-line);overflow:hidden;}',
    '.cc-root .cc-sp-tick{position:absolute;top:0;bottom:0;width:1px;background:var(--cc-line);pointer-events:none;}',
    '.cc-root .cc-sp-tick-l{position:absolute;top:5px;font-size:11px;color:var(--cc-text-3);transform:translateX(4px);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sp-tick-l.cc-day{color:var(--cc-text-2);font-weight:600;}',
    '.cc-root .cc-sp-now{position:absolute;top:0;bottom:0;width:1px;background:var(--cc-accent);pointer-events:none;}',
    '.cc-root .cc-sp-now-l{position:absolute;top:5px;font-size:11px;font-weight:600;color:var(--cc-accent);transform:translateX(-50%);padding:0 4px;background:var(--cc-bg);}',
    '.cc-root .cc-sp-reset{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--cc-line-strong);pointer-events:none;}',
    '.cc-root .cc-sp-reset-l{position:absolute;bottom:1px;left:3px;font-size:11px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sp-block{position:absolute;top:6px;height:28px;display:flex;align-items:center;gap:6px;padding:0 8px;border-radius:var(--cc-r-control);font:inherit;font-size:11px;' +
      'color:var(--cc-text);background:var(--cc-surface);border:1px solid var(--cc-accent);overflow:hidden;white-space:nowrap;text-align:left;cursor:pointer;touch-action:none;user-select:none;}',
    '.cc-root .cc-sp-block.cc-drag{cursor:grab;}',
    '.cc-root .cc-sp-block.cc-dragging{cursor:grabbing;border-style:dashed;z-index:2;}',
    '.cc-root .cc-sp-block.cc-due{color:var(--cc-accent);}',
    '.cc-root .cc-sp-block.cc-active{border-color:var(--cc-running);}',
    '.cc-root .cc-sp-block.cc-finished{border:1px solid var(--cc-line-strong);background:var(--cc-surface-2);color:var(--cc-text-2);}',
    '.cc-root .cc-sp-block.cc-cancelled{top:16px;height:8px;padding:0;border:1px dashed var(--cc-neutral);background:transparent;color:var(--cc-text-3);}',
    '.cc-root .cc-sp-block.cc-sel{border-color:var(--cc-accent);box-shadow:inset 0 0 0 1px var(--cc-accent);}',
    // State fill (tokens): planned and due a quiet accent tint, running a running tint; never an empty outline.
    '.cc-root .cc-sp-block.cc-planned{background:color-mix(in srgb,var(--cc-accent) 14%,var(--cc-surface));}',
    '.cc-root .cc-sp-block.cc-due{background:color-mix(in srgb,var(--cc-accent) 26%,var(--cc-surface));}',
    '.cc-root .cc-sp-block.cc-active{background:color-mix(in srgb,var(--cc-running) 14%,var(--cc-surface));}',
    // A block too narrow for text carries its pool label just beside it (outside the button).
    '.cc-root .cc-sp-tag{position:absolute;top:6px;height:28px;display:flex;align-items:center;margin:0 4px;font-size:11px;color:var(--cc-text-2);white-space:nowrap;pointer-events:none;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sp-run{position:absolute;left:0;bottom:0;height:3px;pointer-events:none;}',
    '.cc-root .cc-sp-run.cc-active{background:var(--cc-running);}',
    '.cc-root .cc-sp-run.cc-finished{background:var(--cc-done);}',
    '.cc-root .cc-sp-bt{position:relative;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;pointer-events:none;}',
    // Popover (the one shadowless overlay with a hairline).
    '.cc-root .cc-sp-pop-scrim{position:absolute;inset:0;z-index:4;}',
    '.cc-root .cc-sp-pop{position:absolute;z-index:5;width:300px;max-width:calc(100% - 32px);background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);padding:12px;display:flex;flex-direction:column;gap:8px;font-size:12px;}',
    '.cc-root .cc-sp-pop-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;}',
    '.cc-root .cc-sp-pop-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}',
    '.cc-root .cc-sp-input{border:1px solid var(--cc-line-strong);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:12px;height:28px;border-radius:var(--cc-r-control);padding:0 8px;min-width:0;color-scheme:light;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sp-input:focus{outline:none;border-color:var(--cc-accent);}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]) .cc-sp-input{color-scheme:dark;}}',
    '.cc-root[data-theme="dark"] .cc-sp-input,html[data-theme="dark"] .cc-root .cc-sp-input,body.dark .cc-root .cc-sp-input{color-scheme:dark;}',
    '.cc-root .cc-sp-state{font-size:11px;color:var(--cc-text-2);white-space:nowrap;}',
    // Punch clock: one 32 px row per upcoming sprint.
    '.cc-root .cc-sp-clock{display:grid;grid-template-columns:96px minmax(0,220px) minmax(0,1fr) auto;column-gap:8px;align-items:center;font-size:12px;}',
    '.cc-root .cc-sp-clock > *{min-height:32px;display:flex;align-items:center;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-sp-clock .cc-sp-input{height:24px;}',
    // Recent runs: a fixed table, aligned columns.
    '.cc-root .cc-sp-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px;}',
    '.cc-root .cc-sp-table th{height:28px;padding:0 8px 0 0;text-align:left;font-size:11px;font-weight:500;color:var(--cc-text-3);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-sp-table td{height:32px;padding:0 8px 0 0;border-bottom:1px solid var(--cc-line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sp-table tr:last-child td{border-bottom:0;}',
    '.cc-root .cc-sp-table tbody tr:hover td{background:var(--cc-wash);}',
    '.cc-root .cc-sp-table .cc-sp-c-route{width:22%;}',
    '.cc-root .cc-sp-table .cc-sp-c-state{width:88px;}',
    '.cc-root .cc-sp-table .cc-sp-c-time{width:96px;}',
    '.cc-root .cc-sp-table td.cc-sp-dimc{color:var(--cc-text-3);}',
    '.cc-root .cc-sp-li{display:block;width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-sp-empty{font-size:12px;color:var(--cc-text-3);padding:6px 0;}',
    '.cc-root .cc-sp-toast{position:fixed;left:50%;bottom:16px;z-index:8;transform:translateX(-50%);background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);padding:8px 12px;font-size:12px;max-width:calc(100% - 32px);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-sp-block{transition:none;}}'
  ].join('\n');

  function ensureStyle() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-sprints-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-sprints-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ---- pure helpers (exposed as CC.sprintsHelpers) --------------------------------------
  function toMs(v) {
    if (v == null || v === '') return NaN;
    if (typeof v === 'number') return v;
    return new Date(v).getTime();
  }
  function p2(n) { return String(n).padStart(2, '0'); }
  function hm(v) {
    var t = toMs(v);
    if (isNaN(t)) return '–';
    var d = new Date(t);
    return p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function dayWord(t, now) {
    var a = new Date(t), b = new Date(now);
    var da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()), db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    var diff = Math.round((da - db) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return a.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }
  function when(v, now) {
    var t = toMs(v);
    if (isNaN(t)) return '–';
    var w = dayWord(t, now);
    return (w === 'Today' ? '' : w + ' ') + hm(t);
  }
  function span(ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    return m >= 60 ? Math.floor(m / 60) + ' h ' + p2(m % 60) + ' m' : m + ' m';
  }
  function axis(now, hours) {
    var lo = now - LOOKBACK_H * 3600000;
    var hi = now + hours * 3600000;
    return { lo: lo, hi: hi, span: hi - lo };
  }
  function pct(t, ax) { return Math.max(0, Math.min(100, ((t - ax.lo) / ax.span) * 100)); }
  // Hour step from the track width: the smallest of 3, 6, 12 or 24 h whose ticks sit at least
  // LABEL_GAP px apart (every 3 h on a 1440 screen, every 6 h at 1024). Null when unmeasured.
  function tickStep(ax, width) {
    if (!(width > 0)) return null;
    var pxPerHour = width / (ax.span / 3600000);
    for (var i = 0; i < TICK_STEPS.length; i++) if (TICK_STEPS[i] * pxPerHour >= LABEL_GAP) return TICK_STEPS[i];
    return TICK_STEPS[TICK_STEPS.length - 1];
  }
  // Hour ticks on local whole hours (every `step` hours; 3 h for 24 h and 6 h for 48 h when no
  // step is given); midnight is a day tick.
  function ticks(ax, hours, step) {
    step = step || (hours > 24 ? 6 : 3);
    var d = new Date(ax.lo);
    d.setMinutes(0, 0, 0);
    var out = [];
    for (var t = d.getTime(); t <= ax.hi; t += 3600000) {
      var hr = new Date(t).getHours();
      if (t < ax.lo || hr % step !== 0) continue;
      out.push({ t: t, day: hr === 0, label: hr === 0 ? dayWord(t, ax.lo + LOOKBACK_H * 3600000) : p2(hr) + ':00' });
    }
    return out;
  }
  // Ticks with their labels placed for a track `width` px wide: a label is shown only when it starts
  // at least LABEL_GAP px after the last shown one and clear of its text, stays inside the track and
  // off the "now" label. A day label (Tomorrow) wins over a plain hour that would crowd it.
  function labelWidth(text) { return Math.ceil(String(text).length * 6.5); }
  function tickLabels(ax, hours, width, now) {
    var w = width > 0 ? width : TRACK_GUESS;
    var nowX = (pct(now == null ? ax.lo + LOOKBACK_H * 3600000 : now, ax) / 100) * w;
    var list = ticks(ax, hours, tickStep(ax, width)).map(function (k) {
      return { t: k.t, day: k.day, label: k.label, x: (pct(k.t, ax) / 100) * w, w: labelWidth(k.label), show: false };
    });
    var shown = [];
    function fits(k, prev) { return !prev || (k.x - prev.x >= LABEL_GAP && k.x >= prev.x + prev.w + 4); }
    list.forEach(function (k) {
      var a = k.x + 4, b = k.x + 4 + k.w;
      if (b > w || (b > nowX - NOW_HALF && a < nowX + NOW_HALF)) return;
      if (k.day) while (shown.length && !shown[shown.length - 1].day && !fits(k, shown[shown.length - 1])) shown.pop().show = false;
      if (!fits(k, shown[shown.length - 1])) return;
      k.show = true;
      shown.push(k);
    });
    return list;
  }
  function snap(t) { return Math.round(t / SNAP_MS) * SNAP_MS; }
  // A drag of dx pixels on a track w pixels wide moves the start by the matching share of the axis.
  function dragStart(start, dx, width, ax, now) {
    var moved = snap(start + (dx / Math.max(1, width)) * ax.span);
    return Math.max(snap(now + SNAP_MS / 2), moved);
  }
  function localInput(t) {
    var d = new Date(isNaN(t) ? Date.now() : t);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function blockEnd(s) {
    var end = toMs(s.end_at);
    return isNaN(end) ? toMs(s.start_at) + 4 * 3600000 : end;
  }
  function who(s) { return s.anchor ? 'Autonomous' : (s.project_title || s.project_id); }
  function blockText(s, now) {
    if (s.state === 'finished' && s.actual_start && s.actual_end) return 'ran ' + hm(s.actual_start) + '–' + hm(s.actual_end);
    if (s.state === 'finished') return 'closed, nothing ran';
    if ((s.state === 'active' || s.state === 'due') && !isOn(s.pool)) return 'off in Agents';
    if (s.state === 'active') return 'running since ' + hm(s.actual_start || s.start_at);
    if (s.state === 'due') return 'due now';
    if (s.state === 'cancelled') return 'cancelled';
    return hm(s.start_at) + '–' + hm(s.end_at) + ' · ' + who(s);
  }
  // A pool's usage line: the fresh number; else an older reading's number, dimmed, with "Last
  // read hh:mm" in its tooltip (never the word "stale"); else unknown.
  function usageInfo(pool) {
    if (!pool) return { text: '', dim: false };
    if (pool.gate === 'free') return { text: 'Free', dim: false };
    var rows = pool.usage || [];
    var row = rows.filter(function (u) { return u.status === 'FRESH' && u.remaining_percent != null; })[0];
    if (row) return { text: Math.round(row.remaining_percent) + '% left', dim: false };
    var old = rows.filter(function (u) { return u.remaining_percent != null && u.status !== 'UNKNOWN'; })[0];
    if (old) return { text: Math.round(old.remaining_percent) + '% left', dim: true, title: old.observed_at ? 'Last read ' + hm(old.observed_at) : 'Last read earlier' };
    if (pool.gate === 'rate' && !rows.length) return { text: 'Usage unknown · 30 turns an hour', dim: false };
    return { text: 'Usage unknown', dim: false };
  }
  function usageHint(pool) { return usageInfo(pool).text; }
  // Timeline rows: Claude Code and Codex always; Freebuff only while they hold a sprint.
  // A pool switched off in Agents has no row.
  function visibleRows(sprints) {
    var used = {};
    (sprints || []).forEach(function (s) { used[s.pool] = true; });
    return ROWS.filter(function (r) { return (!r.optional || used[r.id]) && isOn(r.id); });
  }
  // A finished or cancelled sprint as one line: "Live2 throwaway · Claude Code · cancelled", with
  // the planned window (and the actual run) in the tooltip.
  function finishedLine(s) {
    var text = [s.project_title || s.project_id, s.pool_label || LABEL[s.pool] || s.pool,
      String(STATE_WORD[s.state] || s.state || '').toLowerCase()].filter(Boolean).join(' · ');
    var title = 'Planned ' + hm(s.start_at) + (s.end_at ? '–' + hm(s.end_at) : '')
      + (s.actual_start && s.actual_end ? ' · ran ' + hm(s.actual_start) + '–' + hm(s.actual_end) : '');
    return { text: text, title: title };
  }
  function movable(s) { return !!s.editable && (s.state === 'planned' || s.state === 'due'); }

  CC.sprintsHelpers = { axis: axis, pct: pct, ticks: ticks, snap: snap, dragStart: dragStart, hm: hm, span: span,
    blockText: blockText, usageHint: usageHint, usageInfo: usageInfo, visibleRows: visibleRows, movable: movable, isOn: isOn, adderOn: adderOn,
    visibleAdders: visibleAdders, tickStep: tickStep, tickLabels: tickLabels, KIND_POOLS: KIND_POOLS,
    finishedLine: finishedLine, Track: Track, List: List };

  // ---- small components -------------------------------------------------------------
  // A hairline section in the kit's classes (.cc-sec) with optional tools at the right.
  function Section(props) {
    var h = CC.h;
    return h('section', { className: 'cc-sec' + (props.className ? ' ' + props.className : ''), 'aria-label': props.label || props.title },
      h('div', { className: 'cc-sec-h' }, h('div', { className: 'cc-sec-t' }, props.title),
        props.meta ? h('div', { className: 'cc-sec-m' }, props.meta) : null,
        props.tools ? h('div', { className: 'cc-sec-a' }, props.tools) : null),
      props.children);
  }

  function Seg(props) {
    var h = CC.h;
    return h(kit().Segmented, { label: props.label, value: props.value, onChange: props.onChange,
      options: props.options.map(function (o) { return { value: o.id, label: o.label }; }) });
  }

  // "Add sprint": one default button that opens a menu in the kit's menu classes (.cc-mn, .cc-mn-pop,
  // .cc-mn-i). The kit's own Menu is the icon-only "More" menu, so this text trigger is local.
  // Escape, an outside click or choosing an item closes it; arrow keys move between items.
  function AddMenu(props) {
    var h = CC.h, React = CC.React;
    var st = React.useState(false), open = st[0], setOpen = st[1];
    var ref = React.useRef(null);
    React.useEffect(function () {
      if (!open || typeof document === 'undefined' || !document.addEventListener) return undefined;
      function outside(ev) { var root = ref.current; if (root && root.contains && ev && root.contains(ev.target)) return; setOpen(false); }
      function esc(ev) { if (ev && ev.key === 'Escape') setOpen(false); }
      document.addEventListener('mousedown', outside);
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
    }, [open]);
    function onKey(e) {
      if (!e || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      var root = ref.current;
      var list = root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('.cc-mn-i:not(:disabled)')) : [];
      if (!list.length) return;
      e.preventDefault();
      var at = list.indexOf(typeof document !== 'undefined' ? document.activeElement : null);
      var next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at <= 0 ? list.length - 1 : at - 1);
      if (list[next] && list[next].focus) list[next].focus();
    }
    var items = props.items || [];
    return h('div', { className: 'cc-mn cc-sp-addm', ref: ref, onKeyDown: onKey, title: props.title },
      h('button', { type: 'button', className: btn('default', 'sm'), 'aria-haspopup': 'menu', 'aria-expanded': open ? 'true' : 'false',
        disabled: !!props.disabled || !items.length, onClick: function () { setOpen(!open); } }, props.label),
      // Closed, the items stay in the tree but hidden, so the menu is the same element when it opens.
      h('div', { className: 'cc-mn-pop', role: 'menu', 'aria-label': props.label, hidden: !open },
        items.map(function (it) {
          return h('button', { key: it.key, type: 'button', role: 'menuitem', className: 'cc-mn-i', disabled: !!props.disabled,
            'data-cc-action': it.action, onClick: function (e) { setOpen(false); it.onClick(e); } }, it.label);
        })));
  }

  // The axis measures its own width (the tracks share it) so tick spacing follows the screen.
  function Axis(props) {
    var h = CC.h, React = CC.React, ax = props.ax;
    var ref = React.useRef(null);
    var onWidth = props.onWidth;
    React.useEffect(function () {
      var el = ref.current;
      if (!el || !el.getBoundingClientRect || typeof onWidth !== 'function') return undefined;
      function measure() { var w = Math.round(el.getBoundingClientRect().width); if (w > 0) onWidth(w); }
      measure();
      if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', measure);
        return function () { window.removeEventListener('resize', measure); };
      }
      var ro = new ResizeObserver(measure);
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    return h('div', { className: 'cc-sp-axis', ref: ref },
      tickLabels(ax, props.hours, props.width, props.now).map(function (k) {
        var at = pct(k.t, ax);
        // A label that would crowd its neighbour, the edge or "now" is left out; its line stays.
        return [h('div', { key: k.t + 'l', className: 'cc-sp-tick', style: { left: at + '%' } }),
          k.show ? h('div', { key: k.t + 't', className: 'cc-sp-tick-l' + (k.day ? ' cc-day' : ''), style: { left: at + '%' } }, k.label) : null];
      }),
      h('div', { className: 'cc-sp-now-l', style: { left: pct(props.now, ax) + '%' } }, 'now'));
  }

  function Track(props) {
    var h = CC.h, ax = props.ax, now = props.now, pool = props.pool || {};
    var tickEls = ticks(ax, props.hours, tickStep(ax, props.width)).map(function (k) {
      return h('div', { key: 't' + k.t, className: 'cc-sp-tick', style: { left: pct(k.t, ax) + '%' } });
    });
    var resets = (pool.resets || []).map(function (r) {
      var t = toMs(r.at);
      return h('div', { key: 'r' + r.at + r.usage_pool, className: 'cc-sp-reset', style: { left: pct(t, ax) + '%' },
        title: r.label + ' resets at ' + hm(t) + (r.status !== 'FRESH' ? ' · from an earlier reading' : '') },
      h('span', { className: 'cc-sp-reset-l' }, 'reset ' + hm(t)));
    });
    var blocks = (props.sprints || []).map(function (s) {
      // A cancelled sprint never ran: no block on the track (it is listed under Recently finished).
      if (s.state === 'cancelled') return null;
      var start = toMs(s.start_at), end = blockEnd(s);
      var drag = props.drag && props.drag.id === s.id ? props.drag : null;
      if (drag) { end = drag.start + (end - start); start = drag.start; }
      if (end < ax.lo || start > ax.hi) return null;
      var left = pct(start, ax), right = pct(end, ax);
      var canMove = movable(s);
      var runBar = null;
      if ((s.state === 'active' || s.state === 'finished') && s.actual_start) {
        var a = toMs(s.actual_start), b = s.state === 'active' ? now : toMs(s.actual_end || s.actual_start);
        var w = Math.max(end - start, 1);
        runBar = h('span', { className: 'cc-sp-run cc-' + s.state, 'aria-hidden': 'true',
          style: { left: Math.max(0, ((a - start) / w) * 100) + '%', width: Math.max(1.5, Math.min(100, ((b - a) / w) * 100)) + '%' } });
      }
      var narrow = right - left < TEXT_MIN;
      var tag = narrow && !drag && s.state !== 'cancelled' && s.state !== 'finished'
        ? h('span', { key: s.id + 'tag', className: 'cc-sp-tag', 'aria-hidden': 'true',
          style: right > 82 ? { right: (100 - left) + '%' } : { left: right + '%' } },
        (s.pool_label || s.pool) + (s.state === 'planned' || s.state === 'due' ? ' ' + hm(s.start_at) : ''))
        : null;
      var cls = 'cc-sp-block cc-' + s.state + (canMove ? ' cc-drag' : '') + (drag ? ' cc-dragging' : '') + (props.selected === s.id ? ' cc-sel' : '');
      return [h('button', {
        key: s.id, type: 'button', className: cls, 'data-sprint': s.id, draggable: false,
        style: { left: left + '%', width: 'max(' + Math.max(0.4, right - left) + '%, 10px)' },
        title: s.summary, 'aria-label': s.summary + (canMove ? ' Drag to move, or press Enter to edit.' : ''),
        onPointerDown: canMove ? function (e) { props.onDragStart(e, s); } : undefined,
        onPointerMove: canMove ? props.onDragMove : undefined,
        onPointerUp: canMove ? props.onDragEnd : undefined,
        onPointerCancel: canMove ? props.onDragCancel : undefined,
        onLostPointerCapture: canMove ? props.onDragEnd : undefined,
        onDragStart: function (e) { e.preventDefault(); },
        onClick: function (e) { if (!props.wasDrag()) props.onOpen(s, e.currentTarget); }
      }, runBar, drag ? h('span', { className: 'cc-sp-bt' }, hm(drag.start) + ' · release to move')
        : !narrow && s.state !== 'cancelled' ? h('span', { className: 'cc-sp-bt' }, blockText(s, now)) : null), tag];
    });
    return h('div', { className: 'cc-sp-track' + (props.manual ? ' cc-manual' : '') },
      tickEls, resets,
      h('div', { className: 'cc-sp-now', style: { left: pct(now, ax) + '%' } }),
      blocks);
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function statusWord(s) { var t = String(s || '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); }
  var PHASE_WORD = { running: 'Running', ready: 'Ready', idle: 'Idle' };

  function errText(e) { return (e && e.data && e.data.detail) || (e && e.message) || 'unknown error'; }

  function Popover(props) {
    var h = CC.h, React = CC.React, s = props.sprint;
    var st = React.useState(localInput(toMs(s.start_at))), start = st[0], setStart = st[1];
    var cf = React.useState(false), confirm = cf[0], setConfirm = cf[1];
    var b = React.useState(false), busy = b[0], setBusy = b[1];
    var canMove = movable(s);
    function act(path, body, done) {
      setBusy(true);
      CC.api.post(path, body).then(function (r) { props.onChanged(done(r)); }, function (e) {
        setBusy(false); props.toast('Could not update: ' + errText(e));
      });
    }
    var actual = s.actual_start && s.actual_end
      ? 'Ran ' + hm(s.actual_start) + '–' + hm(s.actual_end) + ' (' + span(toMs(s.actual_end) - toMs(s.actual_start)) + ')'
      : s.actual_start ? 'Started ' + hm(s.actual_start) : null;
    return h('div', null,
      h('div', { className: 'cc-sp-pop-scrim', onClick: props.onClose }),
      h('div', { className: 'cc-sp-pop', role: 'dialog', 'aria-label': s.pool_label + ' sprint', style: { left: props.x + 'px', top: props.y + 'px' } },
        h('div', { className: 'cc-sp-pop-h' },
          h('span', null, s.pool_label + ' · ' + who(s)),
          h('span', { className: 'cc-sp-state' }, STATE_WORD[s.state] || s.state)),
        h('div', null, s.summary),
        h('div', { className: 'cc-sp-m', style: { whiteSpace: 'normal' } }, 'Window ' + when(s.start_at, props.now) + '–' + hm(s.end_at)
          + (s.aligned ? ' · reset + 1 min' : '') + (actual ? ' · ' + actual : '')
          + (s.tasks_started ? ' · ' + s.tasks_done + ' of ' + s.tasks_started + ' tasks done' : '')),
        canMove ? h('div', { className: 'cc-sp-pop-row' },
          h('label', { className: 'cc-sp-m', htmlFor: 'cc-sp-start' }, 'Start'),
          h('input', { id: 'cc-sp-start', type: 'datetime-local', className: 'cc-sp-input', value: start, onChange: function (e) { setStart(e.target.value); } }),
          h('button', { className: btn('default', 'sm'), type: 'button', disabled: busy || !start, onClick: function () {
            act('/api/sprints/update', { id: s.id, start_at: new Date(start).toISOString() }, function (r) { return 'Moved to ' + hm(r.start_at); });
          } }, 'Save')) : null,
        s.editable ? h('div', { className: 'cc-sp-pop-row' },
          canMove && s.pool !== 'codex' ? h('button', { className: btn('default', 'sm'), type: 'button', disabled: busy, onClick: function () {
            act('/api/sprints/start-now', { id: s.id }, function (r) { return r.tick_started ? 'Starting now' : 'Starts on the next tick'; });
          } }, 'Start now') : null,
          h('button', { className: btn(confirm ? 'danger' : 'quiet', 'sm') + (confirm ? '' : ' cc-b-danger'), type: 'button', disabled: busy, onClick: function () {
            if (!confirm) { setConfirm(true); return; }
            act('/api/sprints/cancel', { id: s.id }, function () { return 'Sprint removed'; });
          } }, confirm ? (s.owned ? 'Confirm: cancel sprint and its run' : 'Confirm: remove sprint') : (s.state === 'active' ? 'Stop sprint' : 'Remove sprint'))) : null));
  }

  // Upcoming sprints with editable start times (the punch clock), one 32 px row each.
  function Clock(props) {
    var h = CC.h, React = CC.React;
    var ed = React.useState({}), edits = ed[0], setEdits = ed[1];
    function save(s) {
      var v = edits[s.id];
      if (!v || v === localInput(toMs(s.start_at))) return;
      CC.api.post('/api/sprints/update', { id: s.id, start_at: new Date(v).toISOString() }).then(function (r) {
        props.toast(s.pool_label + ' sprint now starts ' + when(r.start_at, Date.now()));
        setEdits(function (prev) { var n = Object.assign({}, prev); delete n[s.id]; return n; });
      }, function (e) { props.toast('Could not move: ' + errText(e)); });
    }
    return h(Section, { title: 'Punch clock', meta: props.items.length ? String(props.items.length) : null },
      props.items.length ? h('div', { className: 'cc-sp-clock' }, props.items.map(function (s) {
        var canMove = movable(s);
        return [
          h('span', { key: s.id + 'n' }, s.pool_label),
          canMove
            ? h('span', { key: s.id + 't' }, h('input', { type: 'datetime-local', className: 'cc-sp-input', 'aria-label': s.pool_label + ' sprint start',
              value: edits[s.id] || localInput(toMs(s.start_at)),
              onChange: function (e) { var v = e.target.value; setEdits(function (prev) { var n = Object.assign({}, prev); n[s.id] = v; return n; }); },
              onBlur: function () { save(s); }, onKeyDown: function (e) { if (e.key === 'Enter') save(s); } }))
            : h('span', { key: s.id + 't', className: 'cc-sp-m' }, (STATE_WORD[s.state] || s.state) + ' since ' + hm(s.actual_start || s.start_at)),
          h('span', { key: s.id + 'a', className: 'cc-sp-m' }, s.aligned ? 'reset + 1 min' : 'until ' + hm(s.end_at)),
          h('span', { key: s.id + 'o' }, h('button', { type: 'button', className: btn('quiet', 'sm'), onClick: function (e) { props.onOpen(s, e.currentTarget); } }, 'Edit'))
        ];
      })) : h('div', { className: 'cc-sp-empty' }, props.empty));
  }

  // Recent runs as a table: project, route, state, planned window, actual run. A row opens the sprint.
  function List(props) {
    var h = CC.h;
    return h(Section, { title: props.title, meta: props.items.length ? String(props.items.length) : null },
      props.items.length
        ? h('table', { className: 'cc-sp-table' },
          h('colgroup', null, h('col', null), h('col', { className: 'cc-sp-c-route' }), h('col', { className: 'cc-sp-c-state' }),
            h('col', { className: 'cc-sp-c-time' }), h('col', { className: 'cc-sp-c-time' })),
          h('thead', null, h('tr', null, h('th', null, 'Project'), h('th', null, 'Route'), h('th', null, 'State'), h('th', null, 'Planned'), h('th', null, 'Ran'))),
          h('tbody', null, props.items.map(function (s) {
            var v = finishedLine(s);
            var ran = s.actual_start && s.actual_end ? hm(s.actual_start) + '–' + hm(s.actual_end) : '–';
            return h('tr', { key: s.id, 'data-sprint': s.id, title: v.title },
              h('td', null, h('button', { type: 'button', className: 'cc-sp-li', title: v.text, onClick: function (e) { props.onOpen(s, e.currentTarget); } },
                s.project_title || s.project_id)),
              h('td', null, s.pool_label || LABEL[s.pool] || s.pool),
              h('td', { className: 'cc-sp-dimc' }, STATE_WORD[s.state] || statusWord(s.state)),
              h('td', { className: 'cc-sp-dimc' }, hm(s.start_at) + (s.end_at ? '–' + hm(s.end_at) : '')),
              h('td', { className: 'cc-sp-dimc' }, ran));
          })))
        : h('div', { className: 'cc-sp-empty' }, props.empty));
  }

  // ---- dsh Automation tasks: hidden from page load once the owner hides it ----------------------
  // dsh's sidebar gives every `sidebar.panellist.actions` registration `entries` and
  // `onPinnedChange(id, pinned)` (dsh-client-ui-sidebar README). Those pins live in dsh's memory
  // only and the menu rows mount only when More opens, so after a reload the pin alone would
  // bring the entry back. The owner's choice is therefore kept in localStorage and applied at
  // startup (from app.js apply) with one scoped style rule over that sidebar row; the pin
  // callback makes it real the first time More opens. dsh files are never edited.
  var SCHEDULES_ID = 'schedules';
  var HIDE_KEY = 'DSH_CC_HIDE_AUTOMATION_TASKS';
  var HIDE_STYLE_ID = 'cc-hide-automation';
  // The schedule plugin's English and Chinese panel labels (dsh-client-ui-schedule "panel").
  var AUTOMATION_LABELS = ['Automation tasks', '自动化任务'];
  function wantHidden() { try { return typeof localStorage !== 'undefined' && localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } }
  function setWantHidden(on) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(HIDE_KEY, on ? '1' : '0'); } catch (e) { /* storage blocked */ } }
  function hideCss(labels) {
    return labels.map(function (l) {
      return '[class*="_panelRow"][aria-label="' + String(l).replace(/["\\]/g, '') + '"]';
    }).join(',') + '{display:none;}';
  }
  // Add or remove the startup rule to match the owner's choice; `label` adds a localised label.
  function syncHidden(label) {
    if (typeof document === 'undefined' || !document.head) return false;
    var el = document.getElementById(HIDE_STYLE_ID);
    if (!wantHidden()) { if (el && el.parentNode) el.parentNode.removeChild(el); return false; }
    var labels = AUTOMATION_LABELS.slice();
    if (label && labels.indexOf(label) < 0) labels.push(label);
    if (!el) {
      el = document.createElement('style');
      el.id = HIDE_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = hideCss(labels);
    return true;
  }
  function primitives() {
    try { return typeof require === 'function' ? require('@deepseek-ai/dsh-client-ui-primitives') : null; } catch (e) { return null; }
  }
  function AutomationPinRow(props) {
    var h = CC.h, React = CC.React;
    var entry = (props.entries || []).filter(function (e) { return e && e.id === SCHEDULES_ID; })[0] || null;
    var ok = !!entry && typeof props.onPinnedChange === 'function';
    React.useEffect(function () {
      if (ok && entry.pinned && wantHidden()) {
        try { props.onPinnedChange(SCHEDULES_ID, false); } catch (e) { CC.warn && CC.warn('could not hide Automation tasks', e); }
      }
      if (ok) syncHidden(entry.label);
    }, [ok, entry && entry.pinned]);
    if (!ok) return null;
    // While the startup rule hides it, the entry counts as hidden whatever dsh's pin says.
    var hidden = !entry.pinned || wantHidden();
    var label = (hidden ? 'Show ' : 'Hide ') + (entry.label || 'Automation tasks') + ' in the sidebar';
    function onSelect() {
      setWantHidden(!hidden);
      syncHidden(entry.label);
      try { props.onPinnedChange(SCHEDULES_ID, hidden); } catch (e) { CC.warn && CC.warn('pin change failed', e); }
      if (typeof props.onDismiss === 'function') props.onDismiss();
    }
    var P = primitives();
    if (P && P.MenuItemButton) return h(P.MenuItemButton, { separatorBefore: true, onSelect: onSelect }, label);
    return h('button', { type: 'button', role: 'menuitem', onClick: onSelect,
      style: { display: 'block', width: '100%', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: '6px 12px', cursor: 'pointer' } }, label);
  }
  var pinRegistered = false;
  function registerSidebar(ctx) {
    try { syncHidden(); } catch (e) { if (CC.warn) CC.warn('Automation tasks hide rule skipped', e); }
    if (pinRegistered) return true;
    try {
      var slots = ctx && ctx.slots;
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return false;
      slots.inject('sidebar.panellist.actions', function () {
        try {
          var dispose = slots.register({ name: 'sidebar.panellist.actions', id: 'cc-automation-pin' }, AutomationPinRow);
          return typeof dispose === 'function' ? dispose : function () {};
        } catch (e) { if (CC.warn) CC.warn('Automation tasks row not registered; skipped', e); return function () {}; }
      });
      pinRegistered = true;
      return true;
    } catch (e) {
      if (CC.warn) CC.warn('Automation tasks row not injected; skipped', e);
      return false;
    }
  }
  // app.js calls this from apply(ctx), so the choice holds from page load.
  CC.sprintsSidebar = { apply: registerSidebar, Row: AutomationPinRow, storageKey: HIDE_KEY, styleId: HIDE_STYLE_ID,
    sync: syncHidden, labels: AUTOMATION_LABELS };

  function copyText(text) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    } catch (e) { /* fall through */ }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('copy refused'));
      } catch (e) { reject(e); }
    });
  }

  var DEFAULTS = { preset: 'balanced', models: [], efforts: { claude: 'medium', codex: 'medium' }, punch_clock: true,
    max_use: {}, auto_wake: true, power_off: false, merge_resets: true, sequence: [] };
  function withDefaults(s) {
    var out = Object.assign({}, DEFAULTS, s || {});
    out.efforts = Object.assign({}, DEFAULTS.efforts, (s && s.efforts) || {});
    out.max_use = Object.assign({}, (s && s.max_use) || {});
    out.models = ((s && s.models) || []).slice();
    out.sequence = (s && s.sequence) || [];
    return out;
  }
  // Ticks and per-project models that are no longer enabled drop out before saving.
  function prune(settings, models) {
    var ok = {};
    models.forEach(function (m) { if (m.runnable) ok[m.id] = true; });
    var out = Object.assign({}, settings);
    out.models = settings.models.filter(function (id) { return ok[id]; });
    out.max_use = {};
    Object.keys(settings.max_use || {}).forEach(function (p) { if (settings.max_use[p] && isOn(p)) out.max_use[p] = true; });
    out.sequence = settings.sequence.map(function (row) {
      return row.map(function (i) { return { project: i.project, model: i.model && ok[i.model] ? i.model : null }; });
    });
    return out;
  }
  CC.sprintsHelpers.withDefaults = withDefaults;
  CC.sprintsHelpers.prune = prune;

  CC.SprintsPage = function AutonomousPage() {
    var h = CC.h, React = CC.React, A = CC.autonomous, AC = CC.AutonomousControls, UI = kit();
    ensureStyle();
    if (A && A.ensureStyle) A.ensureStyle();
    if (CC.toggles && CC.toggles.useToggles) CC.toggles.useToggles();  // re-render when Agents switches change
    var hr = React.useState(24), hours = hr[0], setHours = hr[1];
    var tw = React.useState(0), trackWidth = tw[0], setTrackWidth = tw[1];
    var tl = CC.useEngine('/api/sprints/timeline?hours=' + hours, ['run', 'state', 'pool']);
    var auto = CC.useEngine('/api/autonomous', ['run', 'pool']);
    var reg = CC.useEngine('/api/models', ['run', 'state']);
    var agents = CC.useEngine('/api/agents', ['agents', 'pool']);  // route readiness (connections[].state)
    var projects = CC.useEngine('/api/projects', ['state']);
    var nw = React.useState(Date.now()), now = nw[0], setNow = nw[1];
    var pp = React.useState(null), pop = pp[0], setPop = pp[1];
    var tt = React.useState(null), toast = tt[0], setToast = tt[1];
    var dg = React.useState(null), drag = dg[0], setDrag = dg[1];
    var cs = React.useState(null), cfgState = cs[0], setCfg = cs[1];
    var hs = React.useState(null), hist = hs[0], setHist = hs[1];
    var cx = React.useState(null), confirmKind = cx[0], setConfirmKind = cx[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var st = React.useState(false), stopAsk = st[0], setStopAsk = st[1];
    var tr = React.useState(false), tried = tr[0], setTried = tr[1];  // a Run attempt flags rows that cannot run
    var rootRef = React.useRef(null);
    var dragRef = React.useRef(null);
    var movedRef = React.useRef(false);
    var saveRef = React.useRef(null);
    var dirtyRef = React.useRef(false);

    React.useEffect(function () { registerSidebar(CC.ctx); }, []);
    React.useEffect(function () {
      var t = setInterval(function () { setNow(Date.now()); }, 30000);
      return function () { clearInterval(t); };
    }, []);
    React.useEffect(function () {
      if (!toast) return undefined;
      var t = setTimeout(function () { setToast(null); }, 3200);
      return function () { clearTimeout(t); };
    }, [toast]);
    // "Stop every run" asks once; the question lapses after a few seconds.
    React.useEffect(function () {
      if (!stopAsk) return undefined;
      var t = setTimeout(function () { setStopAsk(false); }, 4000);
      return function () { clearTimeout(t); };
    }, [stopAsk]);
    React.useEffect(function () {
      function onKey(e) { if (e.key === 'Escape') { setPop(null); setConfirmKind(null); setStopAsk(false); } }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, []);
    // Saved settings arrive once; later engine pushes do not overwrite unsaved edits.
    var saved = auto.data && auto.data.settings;
    React.useEffect(function () {
      if (!saved || dirtyRef.current) return;
      var s = withDefaults(saved);
      setCfg(s);
      setHist(function (prev) { return prev || A.history(s.sequence); });
    }, [saved && JSON.stringify(saved)]);

    var conns = agents && agents.data && !agents.error && Array.isArray(agents.data.connections) ? agents.data.connections : null;
    var picked = A.modelsFrom(reg.data && !reg.error ? reg.data : null, auto.data && auto.data.models_source === 'fallback' ? auto.data.models : null, conns);
    var models = picked.models;
    var runOk = {};
    models.forEach(function (m) { if (m.runnable) runOk[m.id] = true; });
    // Until GET /api/models has answered, keep every tick (the fallback list is not the registry).
    var modelsReady = !!(reg.data || reg.error);
    function clean(x) { return modelsReady ? prune(x, models) : x; }
    var cfg = cfgState || withDefaults(saved);
    var sequence = hist ? hist.present : cfg.sequence;
    var settings = Object.assign({}, cfg, { sequence: sequence });

    function persist(next) {
      dirtyRef.current = true;
      if (saveRef.current) clearTimeout(saveRef.current);
      saveRef.current = setTimeout(function () {
        CC.api.post('/api/autonomous/settings', { settings: clean(next) }).then(function () {
          dirtyRef.current = false;
        }, function (e) {
          dirtyRef.current = false;
          setToast(e.status === 404 ? 'Run controls are kept on this page until the engine update lands.' : 'Not saved: ' + errText(e));
        });
      }, SAVE_DELAY_MS);
    }
    function changeCfg(next) {
      var n = Object.assign({}, next);
      delete n.sequence;
      var merged = Object.assign({}, cfg, n);
      setCfg(merged);
      persist(Object.assign({}, merged, { sequence: sequence }));
    }
    function changeSeq(nextSeq) {
      var nh = A.commit(hist || A.history(sequence), nextSeq);
      setHist(nh);
      persist(Object.assign({}, cfg, { sequence: nh.present }));
    }
    function stepHistory(fn) {
      var nh = fn(hist || A.history(sequence));
      if (nh === hist) return;
      setHist(nh);
      persist(Object.assign({}, cfg, { sequence: nh.present }));
    }
    React.useEffect(function () {
      function onKey(e) {
        if (!(e.ctrlKey || e.metaKey)) return;
        var tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var k = String(e.key).toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); stepHistory(A.undo); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); stepHistory(A.redo); }
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    });
    function focusLater(pid) {
      setTimeout(function () {
        var root = rootRef.current;
        var el = root && root.querySelector && root.querySelector('[data-project="' + String(pid).replace(/"/g, '') + '"]');
        if (el && el.focus) el.focus();
      }, 0);
    }

    function header(meta, actions) {
      return h(UI.PageHeader, { title: 'Autonomous', meta: meta, actions: actions, pageId: 'cc-sprints' });
    }
    var data = tl.data;
    if (!data && tl.error) {
      var old = tl.error.status === 404;
      return h(UI.Page, { id: 'autonomous', className: 'cc-sp-page', header: header(old ? 'Needs the engine update' : 'Engine not running') },
        !old && typeof UI.CoreEmpty === 'function' ? h(UI.CoreEmpty, {}) : h(UI.Empty, old
          ? { title: 'Autonomous needs the engine update', body: 'The running engine has no sprint routes. Restart it after the update lands.' }
          : { title: 'The engine is not running', body: 'It starts at sign-in.' }));
    }
    var ax = axis(now, hours);
    var sprints = (data && data.sprints) || [];
    var byId = {};
    sprints.forEach(function (s) { byId[s.id] = s; });
    var pools = (data && data.pools) || [];
    var poolById = {};
    pools.forEach(function (p) { poolById[p.id] = p; });
    var projectList = (projects.data && (projects.data.projects || projects.data)) || [];
    if (!Array.isArray(projectList)) projectList = [];
    var live = (auto.data && auto.data.runs) || [];
    var running = live.length > 0;
    var usageRows = (auto.data && auto.data.usage) || [];
    var noAuto = auto.error && auto.error.status === 404;

    function refresh() { setNow(Date.now()); }
    function openPop(s, el) {
      var root = rootRef.current;
      if (!root || !el || !el.getBoundingClientRect) { setPop({ id: s.id, x: 16, y: 80 }); return; }
      var r = el.getBoundingClientRect(), base = root.getBoundingClientRect();
      var x = Math.max(0, Math.min(r.left - base.left, base.width - 300));
      var y = r.bottom - base.top + 6;
      if (y + 220 > Math.max(base.height, 260)) y = Math.max(0, r.top - base.top - 226);
      setPop({ id: s.id, x: x, y: y });
    }
    // Block dragging: pointer capture keeps every move and the release on the block itself, so
    // the drag survives the pointer leaving the track and dsh's own window listeners.
    function onDragStart(e, s) {
      if (e.button !== 0) return;
      var track = e.currentTarget.parentNode;
      var width = track && track.getBoundingClientRect ? track.getBoundingClientRect().width : 800;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* capture unsupported */ }
      dragRef.current = { id: s.id, x0: e.clientX, start: toMs(s.start_at), width: width, ax: ax, sprint: s, next: null };
      movedRef.current = false;
    }
    function onDragMove(e) {
      var d = dragRef.current;
      if (!d) return;
      var dx = e.clientX - d.x0;
      if (!movedRef.current && Math.abs(dx) < DRAG_PX) return;
      movedRef.current = true;
      d.next = dragStart(d.start, dx, d.width, d.ax, Date.now());
      setDrag({ id: d.id, start: d.next });
    }
    function onDragEnd(e) {
      var d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      try { if (e && e.currentTarget && e.currentTarget.releasePointerCapture) e.currentTarget.releasePointerCapture(e.pointerId); } catch (x) { /* already released */ }
      if (!movedRef.current || d.next == null || d.next === d.start) { setDrag(null); return; }
      var s = d.sprint, next = d.next;
      setDrag({ id: s.id, start: next });
      CC.api.post('/api/sprints/update', { id: s.id, start_at: new Date(next).toISOString() }).then(function (r) {
        setToast(s.pool_label + ' sprint moved to ' + when(r.start_at, Date.now()));
        setTimeout(function () { setDrag(null); refresh(); }, 400);
      }, function (err) {
        setDrag(null);
        setToast('Could not move: ' + errText(err));
      });
    }
    function onDragCancel() { dragRef.current = null; movedRef.current = false; setDrag(null); }
    function wasDrag() {
      var m = movedRef.current;
      movedRef.current = false;
      return m;
    }

    // Adding a Codex sprint needs the owner's own confirm click (409 confirm_codex), never implied.
    function addSprint(kind, confirmed) {
      if (!adderOn(kind)) { setToast('Switched off in Agents'); return; }
      var body = { kind: kind };
      if (confirmed) body.confirm = true;
      setBusy(true);
      CC.api.post('/api/autonomous/sprint', body).then(function (r) {
        setBusy(false); setConfirmKind(null);
        var first = (r.sprints || [])[0];
        setToast((r.sprints || []).map(function (s) { return (LABEL[s.pool] || s.pool) + ' ' + when(s.start_at, Date.now()); }).join(' and ')
          + (first && first.aligned ? ', one minute after the reset' : ''));
        refresh();
      }, function (e) {
        setBusy(false);
        if (e.status === 409 && e.data && e.data.error === 'confirm_codex') { setConfirmKind({ kind: kind, usage: e.data.usage || [] }); return; }
        setToast('Could not add: ' + errText(e));
      });
    }
    function run() {
      // Nothing can run yet: say why and flag the rows, never post.
      if (!canRun) {
        setTried(true);
        setToast(!sequence.length ? 'Add a project to run' : 'Pick a model for each project, or tick one');
        return;
      }
      setBusy(true); setTried(false);
      if (saveRef.current) clearTimeout(saveRef.current);
      CC.api.post('/api/autonomous/run', { settings: clean(settings) }).then(function (r) {
        setBusy(false); dirtyRef.current = false;
        var n = (r.runs || []).length;
        setToast('Autonomous started: ' + n + ' project' + (n === 1 ? '' : 's') + (r.tick_started ? ', first tick running' : ', on the next tick'));
        refresh();
      }, function (e) { setBusy(false); setToast('Could not start: ' + errText(e)); });
    }
    function stop() {
      if (!stopAsk) { setStopAsk(true); return; }
      setStopAsk(false); setBusy(true);
      CC.api.post('/api/autonomous/cancel', {}).then(function (r) {
        setBusy(false); setToast('Stopped ' + (r.cancelled || []).length + ' run(s); running jobs stop on the next tick.'); refresh();
      }, function (e) { setBusy(false); setToast('Could not stop: ' + errText(e)); });
    }
    function copyPrompt() {
      CC.api.post('/api/autonomous/prompt', { settings: clean(settings) }).then(function (r) {
        return copyText(r.prompt).then(function () { setToast('Prompt copied'); });
      }, function (e) { setToast('Could not build the prompt: ' + errText(e)); }).catch(function () { setToast('Could not copy; the clipboard is blocked.'); });
    }

    var upcoming = ((data && data.next_up) || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var finished = ((data && data.recently_finished) || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var wake = data && data.next_wake_at;
    var popSprint = pop && byId[pop.id];
    var tickedCount = settings.models.filter(function (id) { return runOk[id]; }).length;
    var canRun = !running && sequence.length > 0 && !noAuto && (clean(settings).models.length > 0 || sequence.some(function (row) {
      return row.every(function (i) {  // a row's own model counts only while it can run (on in Agents, route ready)
        return !!i.model && (modelsReady ? !!runOk[i.model] : !(CC.toggles && CC.toggles.isEnabled && CC.toggles.isEnabled(i.model) === false));
      });
    }));
    var waitingRows = live.filter(function (r) { return r.waiting; }).length;
    var queued = 0;
    sequence.forEach(function (row) { queued += row.length; });
    // One state word, then the one fact that matters next.
    var phase = running ? 'running' : canRun ? 'ready' : 'idle';
    var next = wake ? 'next sprint ' + when(wake, now) : '';
    var metaText = running
      ? 'Running ' + live.length + (waitingRows ? ' · ' + waitingRows + ' waiting' : '')
      : !auto.data && !auto.error ? 'Loading…'
      : canRun ? 'Ready · ' + plural(queued, 'project') + ' queued' + (next ? ' · ' + next : '')
      : 'Idle' + (noAuto ? ' · needs the engine update' : !sequence.length ? ' · add a project' : ' · tick a model');
    var meta = [h('span', { key: 'd', className: 'cc-sp-dot cc-' + phase, 'aria-hidden': 'true' }), h('span', { key: 't', role: 'status' }, metaText)];
    var liveBy = {};
    live.forEach(function (r) { if (r.project_id) liveBy[r.project_id] = r.waiting ? 'waiting' : 'running'; });

    var actions = h('div', { className: 'cc-sp-act' },
      AC ? h(AC.UsageStrip, { rows: usageRows }) : null,
      h('button', { className: btn('default'), type: 'button', onClick: copyPrompt, disabled: !!noAuto, title: 'Copy the run prompt for a manual hand-off' }, 'Copy prompt'),
      running
        ? h('button', { className: btn(stopAsk ? 'danger' : 'default') + ' cc-b-danger cc-sp-stop' + (stopAsk ? ' cc-ask' : ''), type: 'button', disabled: busy, onClick: stop },
          stopAsk ? 'Stop every run' : 'Stop')
        : h('button', { className: btn('primary') + ' cc-sp-go', type: 'button', disabled: !!(busy || noAuto), onClick: run,
          title: canRun ? 'Start every project in the sequence' : 'Add a project and tick a model first' }, busy ? 'Starting…' : 'Run'));

    var timeline = h(Section, { title: 'Timeline', label: 'Sprint schedule',
      tools: [
        h(Seg, { key: 'range', label: 'Range', value: hours, options: HOURS, onChange: setHours }),
        // One "Add sprint" menu; each kind takes the next free slot: now until the reset, then reset + 1 min.
        // Kinds whose pools are switched off in Agents are left out (visibleAdders).
        h(AddMenu, { key: 'add', label: 'Add sprint', disabled: !!(busy || noAuto),
          title: 'Each takes the next free slot: now until the reset, then reset + 1 min.',
          items: visibleAdders().map(function (a) {
            return { key: a.kind, label: a.label, action: 'add-sprint-' + a.kind, onClick: function () { addSprint(a.kind, false); } };
          }) })
      ] },
      confirmKind ? h('div', { className: 'cc-sp-confirm', role: 'alertdialog', 'aria-label': 'Confirm Codex sprint' },
        h('span', null, 'Add ' + (KIND_TEXT[confirmKind.kind] || 'a Codex sprint') + '? Codex ' +
          (confirmKind.usage.map(function (u) {
            return (u.pool === 'codex_week' ? 'week ' : '5 h ') + (u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '%');
          }).join(', ') || 'usage unknown') + '. Ticked Codex work runs in this window.'),
        h('button', { type: 'button', className: btn('quiet', 'sm'), onClick: function () { setConfirmKind(null); } }, 'Cancel'),
        h('button', { type: 'button', className: btn('default', 'sm'), disabled: busy, onClick: function () { addSprint(confirmKind.kind, true); } }, 'Confirm Codex sprint')) : null,
      h('div', { className: 'cc-sp-tl', role: 'group', 'aria-label': 'Sprint timeline, next ' + hours + ' hours' },
        h('div', { className: 'cc-sp-lab cc-sp-axis-lab' }),
        h(Axis, { ax: ax, now: now, hours: hours, width: trackWidth, onWidth: setTrackWidth }),
        visibleRows(sprints).map(function (row) {
          var info = poolById[row.id];
          var mine = sprints.filter(function (s) { return s.pool === row.id; });
          var on = isOn(row.id);
          var use = on ? usageInfo(info) : { text: 'off in Agents', dim: false };
          return [
            h('div', { key: row.id + 'l', className: 'cc-sp-lab' + (on ? '' : ' ' + greyClass()),
              title: on ? undefined : 'Switched off in Agents' },
              h('span', null, row.label),
              h('span', { className: 'cc-sp-m' + (use.dim ? ' cc-dim' : ''), title: use.title }, use.text)),
            h(Track, { key: row.id + 't', ax: ax, now: now, hours: hours, width: trackWidth, pool: info,
              sprints: mine, drag: drag, selected: pop && pop.id, onDragStart: onDragStart, onDragMove: onDragMove,
              onDragEnd: onDragEnd, onDragCancel: onDragCancel, wasDrag: wasDrag, onOpen: openPop })
          ];
        })));

    return h(UI.Page, { id: 'autonomous', className: 'cc-sp-page', header: header(meta, actions) },
      h('div', { className: 'cc-sp-main', ref: rootRef, 'data-cc-page': 'autonomous' },
        h('div', { className: 'cc-sp-col cc-sp-left' },
          AC ? h(AC.RunControls, { settings: settings, models: models, source: picked.source, onChange: changeCfg }) : null),
        h('div', { className: 'cc-sp-col cc-sp-right' },
          running ? h(Section, { title: 'Running now', meta: String(live.length) },
            live.map(function (r) {
              return h('div', { key: r.id, className: 'cc-sp-live-r' },
                h('span', { className: 'cc-sp-dot cc-' + (r.waiting ? 'waiting' : 'running'), 'aria-hidden': 'true' }),
                h('span', { className: 'cc-sp-live-n', title: r.project_title }, r.project_title || r.project_id),
                h('span', { className: 'cc-sp-m' }, 'Row ' + (r.row + 1)),
                h('span', { className: 'cc-sp-m' }, r.waiting ? 'Waiting' : statusWord(r.status)));
            })) : null,
          AC ? h(AC.Sequence, {
            sequence: sequence, projects: projectList, models: models, ticked: modelsReady ? tickedCount : settings.models.length,
            onChange: changeSeq, focusLater: focusLater, live: liveBy, tried: tried,
            canUndo: !!(hist && hist.past.length), canRedo: !!(hist && hist.future.length),
            onUndo: function () { stepHistory(A.undo); }, onRedo: function () { stepHistory(A.redo); } }) : null,
          timeline,
          h(Clock, { items: upcoming, onOpen: openPop, toast: setToast, empty: 'No sprints planned' }),
          h(List, { title: 'Recent runs', items: finished, onOpen: openPop, empty: 'Nothing in the last day' })),
        popSprint ? h(Popover, { key: popSprint.id, sprint: popSprint, x: pop.x, y: pop.y, now: now, toast: setToast,
          onClose: function () { setPop(null); },
          onChanged: function (msg) { setPop(null); setToast(msg); refresh(); } }) : null),
      toast ? h('div', { className: 'cc-sp-toast', role: 'status' }, toast) : null);
  };
})(CC);

		// ── page_agents.js
// page_agents.js [worker-d] - CC.AgentsPage: the control panel, shown inside Settings. One dense table per group
// (Agents, Routes, Models): switch, name, a state word with a status dot, and usage as a meter with its window,
// right-aligned. Talking to Claude and Codex lives in their own tabs (chat_panel.js). Switches use GET /api/toggles +
// POST /api/toggles/set and fall back to /api/models + POST /api/models/toggle when the toggles routes are absent.
// Disabled items grey out; the engine refuses them anyway.
(function (CC) {
  'use strict';
  const h = CC.h;

  const STYLE = [
    '.cc-root.cc-ap{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);color:var(--cc-text);color-scheme:light;}',
    '@media (prefers-color-scheme: dark){.cc-root.cc-ap:not([data-theme="light"]){color-scheme:dark;}}',
    '.cc-root.cc-ap[data-theme="dark"],html[data-theme="dark"] .cc-root.cc-ap,body.dark .cc-root.cc-ap,body.theme-dark .cc-root.cc-ap{color-scheme:dark;}',
    '.cc-root .cc-ap-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:16px;}',
    '.cc-root .cc-ap-sec{max-width:960px;}',
    '.cc-root .cc-ap-h{font-size:12px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-ap-list{list-style:none;margin:0;padding:0;}',
    // One row: switch | name | dot + state word | usage meter (right-aligned). 32 px, hairline separated.
    '.cc-root .cc-ap-row{display:grid;grid-template-columns:28px minmax(120px,200px) minmax(0,1fr) 128px;align-items:center;column-gap:12px;' +
      'min-height:32px;padding:0 8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-ap-row:hover{background:var(--cc-wash);}',
    '.cc-root .cc-ap-row:last-child{border-bottom:0;}',
    '.cc-root .cc-ap-row.cc-ap-off .cc-ap-name,.cc-root .cc-ap-row.cc-ap-off .cc-ap-use,.cc-root .cc-ap-row.cc-ap-off .cc-ap-st{opacity:.5;}',
    '.cc-root .cc-ap-name{min-width:0;max-width:360px;font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ap-st{display:flex;align-items:center;gap:6px;min-width:0;}',
    '.cc-root .cc-ap-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-neutral);}',
    '.cc-root .cc-ap-dot.cc-ready{background:var(--cc-done);}',
    '.cc-root .cc-ap-dot.cc-bad{background:var(--cc-error);}',
    '.cc-root .cc-ap-sub{min-width:0;font-size:11px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ap-sub.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-ap-use{display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:0;font-size:11px;color:var(--cc-text-2);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-ap-meter{flex:none;position:relative;width:48px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-ap-meter span{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-done);}',
    '.cc-root .cc-ap-meter.cc-low span{background:var(--cc-error);}',
    '.cc-root .cc-ap-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ap-dim{color:var(--cc-text-3);}',
    '.cc-root .cc-ap-dim .cc-ap-meter span{background:var(--cc-text-3);}',
    '.cc-root .cc-ap-note{font-size:12px;color:var(--cc-text-3);padding:8px 0;}',
    '.cc-root .cc-ap-note.cc-bad{color:var(--cc-error);}',
    // The kit switch (.cc-sw, 28x16, accent when on), drawn on a checkbox so it stays a form control.
    '.cc-root input.cc-ap-sw{appearance:none;flex:none;width:28px;height:16px;margin:0;border:0;border-radius:999px;background:var(--cc-line-strong);position:relative;cursor:pointer;}',
    '.cc-root input.cc-ap-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--cc-surface);transition:transform var(--cc-fast) var(--cc-ease);}',
    '.cc-root input.cc-ap-sw:checked{background:var(--cc-accent);}',
    '.cc-root input.cc-ap-sw:checked::after{transform:translateX(12px);}',
    '.cc-root input.cc-ap-sw:disabled{opacity:.45;cursor:default;}',
    '.cc-root input.cc-ap-sw:focus-visible{outline:2px solid var(--cc-focus);outline-offset:2px;}',
    // Embedded in Settings: no title bar, no own scroll, the Settings page supplies the gutter.
    '.cc-root.cc-ap.cc-ap-in{height:auto;background:transparent;}',
    '.cc-root .cc-ap-in .cc-ap-sec{max-width:none;}',
    '@media (max-width:1100px){.cc-root .cc-ap-row{grid-template-columns:28px minmax(96px,160px) minmax(0,1fr) 112px;}}',
    '@media (prefers-reduced-motion: reduce){.cc-root input.cc-ap-sw::after{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || document.getElementById('cc-agents-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-agents-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ------------------------------------------------------------ toggles (pure, node-testable)
  const KIND_OF_ROW = { chat: 'model', subagent: 'model', agent: 'agent', manual: 'route' };
  const GROUPS = [['agents', 'agent'], ['routes', 'route'], ['models', 'model']];

  // GET /api/toggles -> [{id, kind: agent|route|model, label, enabled}]; null when the shape is not recognised.
  function normalizeToggles(data) {
    if (!data || typeof data !== 'object') return null;
    const out = [];
    const take = function (list, kind) {
      (list || []).forEach(function (t) {
        if (!t || !t.id) return;
        out.push({ id: t.id, kind: t.kind || kind, label: t.label || t.id, enabled: t.enabled !== false });
      });
    };
    if (Array.isArray(data.toggles)) { take(data.toggles, 'model'); return out; }
    let any = false;
    GROUPS.forEach(function (g) { if (Array.isArray(data[g[0]])) { any = true; take(data[g[0]], g[1]); } });
    return any ? out : null;
  }

  // Fallback: the same switches read from GET /api/models.
  function fromModels(data) {
    if (!data || !Array.isArray(data.models)) return null;
    return data.models.map(function (r) {
      return { id: r.id, kind: KIND_OF_ROW[r.kind] || 'model', label: r.label || r.id, enabled: r.enabled !== false };
    });
  }

  function usageLine(a) {
    const rows = (a && a.usage) || [];
    return rows.map(function (u) {
      const pct = u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '%';
      return (u.label || u.pool) + ' ' + pct;
    }).join(' · ');
  }

  function clock(iso) {
    const t = new Date(iso || '');
    if (isNaN(t.getTime())) return '';
    const pad = function (x) { return (x < 10 ? '0' : '') + x; };
    return pad(t.getHours()) + ':' + pad(t.getMinutes());
  }

  function usageTitle(a) {
    return ((a && a.usage) || []).map(function (u) {
      return (u.label || u.pool) + ': ' + (u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '% left') +
        (u.resets_at && clock(u.resets_at) ? ', resets ' + clock(u.resets_at) : '');
    }).join('\n');
  }

  // "Claude 5 hours" -> "5 h", "Codex week (all models)" -> "week".
  function windowShort(label) {
    const l = String(label || '').toLowerCase();
    const hrs = /(\d+)\s*(?:h\b|hours?|hrs?)/.exec(l);
    if (hrs) return hrs[1] + ' h';
    const w = /\b(week|day|month)\b/.exec(l);
    if (w) return w[1];
    return String(label || '').replace(/\s*\(.*\)\s*$/, '');
  }

  // The tightest known pool as one short value {pct, text: "73% · week", stale, title}; null without a meter.
  // Stale is a dimmer number with "Last read HH:MM" in the tooltip, never the word.
  function usageShort(a) {
    const rows = ((a && a.usage) || []).filter(function (u) { return u && typeof u.remaining_percent === 'number'; });
    if (!rows.length) return null;
    const u = rows.reduce(function (lo, x) { return x.remaining_percent < lo.remaining_percent ? x : lo; });
    const stale = u.status === 'STALE';
    const read = clock(u.observed_at);
    return {
      pct: u.remaining_percent, text: Math.round(u.remaining_percent) + '% · ' + windowShort(u.label || u.pool), stale: stale,
      title: usageTitle(a) + (stale ? '\n' + (read ? 'Last read ' + read : 'Not read recently') : '')
    };
  }

  // GET /api/agents connections: [{id, agent_id, state, line, ok, enabled}] -> the one for a row id
  // ('agent:antigravity', 'route:copilot', 'manual:gemini_app', 'gemini_studio' ...).
  function connectionFor(list, id) {
    const bare = String(id || '').replace(/^(agent|route|runner|manual):/, '');
    for (let i = 0; i < (list || []).length; i++) {
      const c = list[i];
      if (c && (c.id === bare || c.agent_id === bare || c.id === id)) return c;
    }
    return null;
  }

  const BAD_STATES = ['out_of_credits', 'signed_out', 'bridge_down'];
  function dotClass(c) {
    if (!c) return 'cc-ap-dot';
    return 'cc-ap-dot' + (c.state === 'ready' ? ' cc-ready' : (BAD_STATES.indexOf(c.state) >= 0 ? ' cc-bad' : ''));
  }

  // "Google AI Studio (Gemini key pool)" -> "Google AI Studio", "DeepSeek (dsh)" -> "DeepSeek"; the full label stays in the tooltip.
  function plainName(label) {
    const s = String(label || '').replace(/\s*\(.*$/, '').replace(/\s*…$/, '').trim();
    return s || String(label || '');
  }
  // Every row says one state word. A manual route says "Manual" ("Manual: Copy Prompt" is how it works);
  // a connection without a line says its state; no connection at all says "Unknown".
  const STATE_WORD = { ready: 'Ready', out_of_credits: 'Out of credits', signed_out: 'Signed out', bridge_down: 'Bridge down', not_installed: 'Not installed' };
  function stateLine(c) {
    if (!c) return 'Unknown';
    const line = c.line ? String(c.line) : '';
    if (/^manual\b/i.test(line)) return 'Manual';
    if (line) return line;
    const st = String(c.state || '');
    return STATE_WORD[st] || (st ? st.charAt(0).toUpperCase() + st.slice(1).replace(/_/g, ' ') : 'Unknown');
  }

  function errText(e) {
    if (e && e.status === 403) return 'Only the owner can change this';
    return (e && e.data && e.data.detail) || (e && e.message) || 'The engine did not answer.';
  }

  // ------------------------------------------------------------ pieces
  // The kit's 28x16 Toggle (as in Settings' Pages rows); a bare checkbox switch only where ui.js is not loaded.
  function Switch(props) {
    const label = props.label;
    const UI = CC.ui;
    if (UI && typeof UI.Toggle === 'function') {
      return h(UI.Toggle, { id: props.id, checked: !!props.enabled, disabled: props.enabled === undefined || props.disabled,
        label: (props.enabled ? 'Turn off ' : 'Turn on ') + label,
        title: props.enabled === undefined ? 'The engine is not answering' : (props.enabled ? 'On: click to turn off' : 'Off: click to turn on'),
        onChange: function () { props.onChange(); } });
    }
    return h('input', {
      type: 'checkbox', role: 'switch', className: 'cc-ap-sw', 'data-id': props.id, checked: !!props.enabled,
      disabled: props.enabled === undefined || props.disabled,
      'aria-label': (props.enabled ? 'Turn off ' : 'Turn on ') + label,
      title: props.enabled === undefined ? 'The engine is not answering' : (props.enabled ? 'On: click to turn off' : 'Off: click to turn on'),
      onChange: props.onChange
    });
  }

  function Row(props) {
    const a = props.agent, on = props.enabled, conn = props.conn;
    // Switched on here but off through its route (CC.isEnabled resolves aliases): show greyed, say why.
    let viaRoute = false;
    if (on !== false && typeof CC.isEnabled === 'function') {
      try { viaRoute = CC.isEnabled(props.id) === false; } catch (e) { viaRoute = false; }
    }
    const us = usageShort(a);
    const low = !!(us && us.pct <= 20);
    const state = viaRoute ? 'Off through its route'
      : (conn ? stateLine(conn) : (!a ? 'Unknown' : (a.available ? 'Available' : 'Not running')));
    const bad = !!(conn && BAD_STATES.indexOf(conn.state) >= 0);
    return h('li', { className: 'cc-ap-row' + (on === false || viaRoute ? ' cc-ap-off' : ''), 'data-row': props.id },
      h(Switch, { id: props.id, label: props.label, enabled: on, onChange: props.onToggle }),
      h('span', { className: 'cc-ap-name', title: props.label !== plainName(props.label) ? props.label + '\n' + props.id : props.id }, plainName(props.label)),
      h('span', { className: 'cc-ap-st' },
        h('span', { className: dotClass(conn), 'data-state': conn ? conn.state : '', 'aria-hidden': 'true' }),
        h('span', { className: 'cc-ap-sub' + (bad ? ' cc-bad' : ''), title: state || (a && (a.availability_detail || a.route)) || '' }, state)),
      us ? h('span', { className: 'cc-ap-use' + (us.stale ? ' cc-ap-dim' : ''), title: us.title },
        h('span', { className: 'cc-ap-meter' + (low ? ' cc-low' : ''), 'aria-hidden': 'true' },
          h('span', { style: { width: Math.max(2, Math.min(100, Math.round(us.pct))) + '%' } })),
        h('span', { className: 'cc-ap-line' }, us.text)) : h('span', { className: 'cc-ap-use' }));
  }

  // A hairline group in the kit's classes (.cc-sec), titled with .cc-ap-h.
  function Group(props) {
    return h('section', { className: 'cc-sec cc-ap-sec' + (props.className ? ' ' + props.className : ''), 'data-section': props.id, 'aria-label': props.title || props.id },
      // Inside Settings the first group sits under the page's own Agents heading, so it has none.
      props.title ? h('div', { className: 'cc-sec-h' }, h('div', { className: 'cc-sec-t cc-ap-h' }, props.title),
        props.meta ? h('div', { className: 'cc-sec-m' }, props.meta) : null) : null,
      props.children);
  }

  // ------------------------------------------------------------ page
  CC.AgentsPage = function AgentsPage(props) {
    const React = CC.React;
    const P = props || {};
    ensurePageStyle();
    const fixedAgents = P.agents !== undefined, fixedToggles = P.toggles !== undefined;
    const liveAgents = CC.useEngine(fixedAgents ? null : '/api/agents', ['pool']);
    const liveToggles = CC.useEngine(fixedToggles ? null : '/api/toggles', ['pool', 'toggles']);
    const liveModels = CC.useEngine(P.modelsData !== undefined ? null : '/api/models', ['pool']);
    const sOver = React.useState({}), over = sOver[0], setOver = sOver[1];
    const sNote = React.useState(null), note = sNote[0], setNote = sNote[1];

    const agentsData = fixedAgents ? P.agents : liveAgents.data;
    const modelsData = P.modelsData !== undefined ? P.modelsData : liveModels.data;
    const toggles = fixedToggles ? P.toggles
      : (normalizeToggles(liveToggles.data) || fromModels(modelsData));
    const error = P.error || (fixedAgents ? null : liveAgents.error);
    const byId = {};
    (toggles || []).forEach(function (t) { byId[t.id] = t; });
    // Agent rows use 'agent:<id>'; the engine keys switches by route id and sends an alias map.
    const aliases = (!fixedToggles && liveToggles.data && liveToggles.data.aliases) || {};
    const resolve = function (id) {
      if (byId[id]) return id;
      if (aliases[id] && byId[aliases[id]]) return aliases[id];
      const bare = id.replace(/^agent:/, '');
      return byId[bare] ? bare : id;
    };
    const stateOf = function (id) {
      if (Object.prototype.hasOwnProperty.call(over, id)) return over[id];
      const key = resolve(id);
      return byId[key] ? byId[key].enabled : undefined;
    };

    function flip(id, label, current) {
      const next = !current;
      setNote(null);
      setOver(function (o) { const c = Object.assign({}, o); c[id] = next; return c; });
      const revert = function (e) {
        setOver(function (o) { const c = Object.assign({}, o); delete c[id]; return c; });
        setNote(label + ': ' + errText(e));
      };
      const first = CC.api.post('/api/toggles/set', { id: id, enabled: next });
      if (!first || !first.then) return;
      first.then(function () {}, function (e) {
        if (e && (e.status === 404 || e.status === 405)) {
          const second = CC.api.post('/api/models/toggle', { id: id, enabled: next });
          if (second && second.then) second.then(function () {}, revert);
        } else revert(e);
      });
    }

    const agents = ((agentsData && agentsData.agents) || []).filter(Boolean);
    const conns = ((agentsData && agentsData.connections) || []).filter(Boolean);
    // Feed the shared route-health source so every picker greys the same routes this list marks down.
    React.useEffect(function () {
      if (agentsData && Array.isArray(agentsData.connections) && CC.toggles && typeof CC.toggles.applyHealth === 'function') {
        CC.toggles.applyHealth(agentsData.connections);
      }
    }, [agentsData]);
    const emb = P.embedded === true, rootCls = 'cc-root cc-ap' + (emb ? ' cc-ap-in' : '');
    const UI = CC.ui;
    function frame(meta, body) {
      if (emb) return h('div', { className: rootCls }, body);
      if (UI && UI.Page) return h(UI.Page, { id: 'agents', className: 'cc-ap', header: h(UI.PageHeader, { title: 'Agents', meta: meta, pageId: 'cc-agents' }) }, body);
      return h('div', { className: rootCls }, h('div', { className: 'cc-ph' }, h('div', { className: 'cc-ph-title' }, 'Agents'), meta ? h('div', { className: 'cc-ph-meta' }, meta) : null),
        h('div', { className: 'cc-ap-scroll' }, body));
    }
    if (!agentsData) {
      // Engine offline: the kit's one Core empty state when ui.js is loaded, else one quiet line.
      if (error && UI && typeof UI.CoreEmpty === 'function') return frame(null, h(UI.CoreEmpty, {}));
      return frame(null, h('div', { className: 'cc-ap-note', role: 'status' },
        error ? 'Waypoint Core is not reachable, so agents and usage are unavailable.' : 'Loading agents…'));
    }

    const agentRows = agents.map(function (a) {
      const id = 'agent:' + a.id, on = stateOf(id);
      return h(Row, { key: id, id: id, label: a.name, agent: a, conn: connectionFor(conns, a.id), enabled: on, onToggle: function () { flip(id, a.name, on); } });
    });
    const routes = (toggles || []).filter(function (t) { return t.kind === 'route' && t.id.indexOf('agent:') !== 0; });
    const routeRows = routes.map(function (t) {
      const on = stateOf(t.id);
      return h(Row, { key: t.id, id: t.id, label: t.label, agent: null, conn: connectionFor(conns, t.id), enabled: on, onToggle: function () { flip(t.id, t.label, on); } });
    });
    const all = agents.map(function (a) { return stateOf('agent:' + a.id); }).concat(routes.map(function (t) { return stateOf(t.id); }));
    const offCount = all.filter(function (v) { return v === false; }).length;
    const offIn = function (list) { const n = list.filter(function (v) { return v === false; }).length; return n ? n + ' off' : null; };

    // Models: the embedded table lists models only; agents and routes switch above.
    const md = modelsData && Array.isArray(modelsData.models)
      ? Object.assign({}, modelsData, { kinds: (modelsData.kinds || []).filter(function (k) { return k === 'chat' || k === 'subagent'; }) })
      : undefined;
    const mp = { embedded: true };
    if (md) mp.data = md;
    if (P.keys !== undefined) mp.keys = P.keys;
    const models = typeof CC.ModelsPage === 'function' ? h(CC.ModelsPage, mp) : null;

    const body = [
      note ? h('div', { key: 'note', className: 'cc-ap-note cc-bad', role: 'status' }, note) : null,
      h(Group, { key: 'agents', id: 'agents', title: emb ? null : 'Agents', meta: offIn(agents.map(function (a) { return stateOf('agent:' + a.id); })) },
        h('ul', { className: 'cc-ap-list' }, agentRows)),
      routeRows.length ? h(Group, { key: 'routes', id: 'routes', title: 'Routes', meta: offIn(routes.map(function (t) { return stateOf(t.id); })) },
        h('ul', { className: 'cc-ap-list' }, routeRows)) : null,
      h(Group, { key: 'models', id: 'models', title: 'Models', className: 'cc-ap-embed' },
        h('div', { 'data-section': 'models-table' }, models))
    ];
    return frame(agents.length + ' agents' + (offCount ? ' · ' + offCount + ' off' : ''), body);
  };

  CC.agentsPanel = { plainName: plainName, stateLine: stateLine, normalizeToggles: normalizeToggles, fromModels: fromModels, usageLine: usageLine, usageShort: usageShort, windowShort: windowShort, connectionFor: connectionFor, errText: errText, STYLE: STYLE };
})(CC);

		// ── chat_panel.js
// chat_panel.js [worker-d] - CC.ChatPanel: one agent's direct chat (stream, resume, model + effort), shared by the
// Claude and Codex tabs (page_claude.js, page_codex.js). Left: that agent's chats and the subagent chats that
// orchestration models dispatched to it. Right: calm conversation + composer (Send, Ctrl+Enter).
// Engine: engine/cc_engine/agents.py (/api/agents*) and subagent_chats.py (/api/subagent_chats*).
(function (CC) {
  'use strict';
  const h = CC.h;

  const STYLE = [
    '.cc-root.cc-ag{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);color:var(--cc-text);}',
    '.cc-root .cc-ag-body{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-root .cc-ag-bar{flex:none;}',
    '.cc-root .cc-ag-side{width:240px;flex:none;display:flex;flex-direction:column;min-height:0;overflow:auto;padding-bottom:16px;border-right:1px solid var(--cc-line);background:var(--cc-surface);}',
    '.cc-root .cc-ag-h{display:flex;align-items:center;justify-content:space-between;gap:8px;height:32px;min-height:32px;margin:8px 0 0;padding:0 8px 0 16px;font-size:12px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-ag-subs{margin-top:8px;padding-top:4px;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-ag-emptywrap{width:100%;max-width:768px;margin:auto auto 0;padding:0 24px;}',
    '.cc-root .cc-ag-emptywrap .cc-em{padding:16px 8px 8px;}',
    '.cc-root .cc-ag-list{list-style:none;margin:0;padding:0 8px;display:flex;flex-direction:column;gap:2px;}',
    '.cc-root .cc-ag-row{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:0 8px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:background 120ms,color 120ms;}',
    '.cc-root .cc-ag-row:hover{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-ag-row.cc-sel{background:var(--cc-selection);color:var(--cc-text);font-weight:500;}',
    '.cc-root .cc-ag-row:focus-visible,.cc-root .cc-ag-send:focus-visible,.cc-root .cc-ag-ghost:focus-visible,.cc-root .cc-ag-chip:focus-visible,.cc-root .cc-ag-mode button:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-ag-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-ag-dot{flex:none;width:6px;height:6px;border-radius:50%;border:1.5px solid var(--cc-neutral);}',
    '.cc-root .cc-ag-dot.cc-on{background:var(--cc-done);border-color:var(--cc-done);}',
    '.cc-root .cc-ag-dot.cc-busy{background:var(--cc-running);border-color:var(--cc-running);animation:cc-pulse 1600ms ease-in-out infinite;}',
    '.cc-root .cc-ag-sessions{flex:none;}',
    '.cc-root .cc-ag-sub{font-size:11px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ag-sub.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-ag-empty{padding:4px 16px 8px;font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-ag-ghost{border:0;background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;font-weight:500;height:28px;padding:0 10px;border-radius:var(--cc-r-control);cursor:pointer;transition:background 120ms,color 120ms;}',
    '.cc-root .cc-ag-ghost:hover{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-ag-ghost:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-ag-h .cc-ag-ghost{height:24px;padding:0 8px;}',
    '.cc-root .cc-ag-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;}',
    // plain header, used only when the kit (ui.js) is missing
    '.cc-root .cc-ag-plain{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-ag-plain .cc-ag-title{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ag-scroll{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;}',
    '.cc-root .cc-ag-thread{width:100%;max-width:768px;margin:0 auto;padding:32px 24px 24px;display:flex;flex-direction:column;gap:20px;font-size:14px;line-height:1.6;}',
    '.cc-root .cc-ag-user{align-self:flex-end;max-width:80%;background:var(--cc-selection);color:var(--cc-text);border-radius:var(--cc-r-panel);padding:8px 12px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;}',
    '.cc-root .cc-ag-text{overflow-wrap:anywhere;color:var(--cc-text);}',
    '.cc-root .cc-ag-text p{margin:0 0 12px;white-space:pre-wrap;}',
    '.cc-root .cc-ag-text p:last-child{margin-bottom:0;}',
    '.cc-root .cc-ag-text code{font-family:var(--cc-mono);font-size:12px;background:var(--cc-surface-2);border-radius:4px;padding:1px 5px;}',
    '.cc-root .cc-ag-text pre{margin:0 0 12px;padding:12px 16px;background:var(--cc-surface);border:1px solid var(--cc-line);border-radius:var(--cc-r-panel);overflow:auto;font-family:var(--cc-mono);font-size:12px;line-height:1.55;white-space:pre;}',
    '.cc-root .cc-ag-text pre code{background:transparent;padding:0;}',
    '.cc-root .cc-ag-text .cc-ag-hd{font-weight:600;margin-top:4px;}',
    '.cc-root .cc-ag-tool{font-size:12px;color:var(--cc-text-3);font-family:var(--cc-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ag-err{font-size:12px;color:var(--cc-error);padding:8px 12px;border:1px solid var(--cc-line);border-radius:var(--cc-r-panel);}',
    '.cc-root .cc-ag-wait{font-size:12px;color:var(--cc-text-3);display:flex;align-items:center;gap:8px;}',
    '.cc-root .cc-ag-wait::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--cc-running);animation:cc-pulse 1600ms ease-in-out infinite;}',
    '.cc-root .cc-ag-hello{width:100%;max-width:560px;padding:24px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;color:var(--cc-text-2);}',
    '.cc-root .cc-ag-hello-line{font-size:14px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-ag-comp{flex:none;background:var(--cc-bg);}',
    '.cc-root .cc-ag-comp-in{max-width:768px;margin:0 auto;padding:8px 24px 20px;display:flex;flex-direction:column;gap:8px;}',
    '.cc-root .cc-ag-field{display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);transition:border-color 120ms;}',
    '.cc-root .cc-ag-field:focus-within{border-color:var(--cc-accent);}',
    '.cc-root .cc-ag-input{width:100%;min-height:48px;max-height:240px;resize:none;border:0;outline:0;background:transparent;color:var(--cc-text);color-scheme:light dark;font:inherit;font-size:14px;line-height:1.5;padding:4px 8px;}',
    '.cc-root .cc-ag-input::placeholder{color:var(--cc-text-3);}',
    '.cc-root .cc-ag-comp-in{container-type:inline-size;}',
    '.cc-root .cc-ag-tools{display:flex;align-items:center;gap:4px;flex-wrap:nowrap;min-width:0;}',
    '.cc-root .cc-ag-tools > *{flex:none;}',
    '.cc-root .cc-ag-tools > .cc-ag-gap{flex:1 1 auto;min-width:0;}',
    '.cc-root .cc-ag-tools > .cc-ag-folder{flex:0 1 auto;min-width:56px;}',
    '.cc-root .cc-ag-att{display:inline-flex;align-items:center;gap:0;border-radius:var(--cc-r-control);color:var(--cc-text-3);cursor:text;}',
    '.cc-root .cc-ag-att svg{display:none;flex:none;margin:0 6px;}',
    '@container (max-width:600px){.cc-root .cc-ag-att svg{display:block;}.cc-root .cc-ag-tools .cc-ag-chip{padding:0 6px;}.cc-root .cc-ag-mode button{padding:0 8px;}' +
      '.cc-root .cc-ag-att input.cc-ag-attach{width:0;min-width:0;padding:0;}' +
      '.cc-root .cc-ag-att:hover{background:var(--cc-wash);color:var(--cc-text);}' +
      '.cc-root .cc-ag-att:focus-within input.cc-ag-attach{width:140px;padding:0 10px 0 0;}}',
    '.cc-root .cc-ag-chips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:0 4px;}',
    '.cc-root .cc-ag-chip{display:inline-flex;align-items:center;gap:6px;height:28px;max-width:240px;padding:0 10px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background 120ms,color 120ms;}',
    '.cc-root select.cc-ag-chip{appearance:none;cursor:pointer;color-scheme:light dark;field-sizing:content;max-width:180px;}',
    '.cc-root input.cc-ag-attach{field-sizing:content;min-width:84px;max-width:200px;}',
    '.cc-root select.cc-ag-chip:hover,.cc-root button.cc-ag-chip:hover,.cc-root input.cc-ag-chip:focus{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root select.cc-ag-chip option{background:var(--cc-surface);color:var(--cc-text);}',
    '.cc-root select.cc-ag-chip:disabled{opacity:.5;cursor:default;}',
    '.cc-root .cc-ag-chips .cc-ag-chip{background:var(--cc-surface-2);border-radius:var(--cc-r-control);height:24px;font-size:11px;font-family:var(--cc-mono);cursor:pointer;}',
    '.cc-root .cc-ag-chip.cc-warn{color:var(--cc-error);}',
    '.cc-root .cc-ag-chip.cc-ag-stale{color:var(--cc-text-3);}',
    '.cc-root .cc-ag-choice{display:inline-flex;align-items:center;gap:0;}',
    '.cc-root button.cc-ag-chip{cursor:pointer;}',
    '.cc-root button.cc-ag-chip[aria-expanded=true]{background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root.cc-ag-pop{position:fixed;z-index:1000;min-width:380px;max-width:min(520px,calc(100vw - 24px));max-height:60vh;overflow:auto;padding:4px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);color:var(--cc-text);font-size:12px;}',
    '.cc-ag-pop .cc-fp-grid{display:grid;grid-template-columns:minmax(0,1fr) 60px 56px 52px;align-items:center;column-gap:8px;}',
    '.cc-ag-pop .cc-fp-head{padding:6px 10px 4px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-ag-pop .cc-fp-row{width:100%;min-height:28px;padding:4px 10px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text);font:inherit;text-align:left;cursor:pointer;}',
    '.cc-ag-pop .cc-fp-row:hover,.cc-ag-pop .cc-fp-row.cc-fp-hi{background:var(--cc-wash);}',
    '.cc-ag-pop .cc-fp-row[aria-selected="true"]{box-shadow:inset 2px 0 0 var(--cc-accent);}',
    '.cc-ag-pop .cc-fp-row[aria-disabled="true"]{cursor:default;opacity:.45;}',
    '.cc-ag-pop .cc-fp-num{font-variant-numeric:tabular-nums;color:var(--cc-text-2);text-align:right;white-space:nowrap;}',
    '.cc-ag-pop .cc-fp-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-ag-pop .cc-fp-pick{color:var(--cc-accent);font-weight:500;}',
    '.cc-ag-pop .cc-fp-status{padding:6px 10px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-ag-sep{color:var(--cc-text-3);font-size:12px;margin:0 -4px;}',
    '.cc-root .cc-ag-hello .cc-ag-go{margin-left:-10px;}',
    '.cc-root .cc-ag-gap{flex:1;}',
    '.cc-root .cc-ag-keys{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-ag-send{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;background:var(--cc-accent);color:var(--cc-on-status);font:inherit;font-size:12px;font-weight:600;min-width:28px;height:28px;padding:0;border-radius:var(--cc-r-control);cursor:pointer;transition:opacity 120ms;}',
    '.cc-root .cc-ag-send.cc-ag-wide{padding:0 12px;}',
    '.cc-root .cc-ag-send:disabled{opacity:.3;cursor:default;}',
    '.cc-root .cc-ag-send svg{display:block;}',
    '.cc-root .cc-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    '.cc-root .cc-ag-note{font-size:12px;color:var(--cc-text-2);padding:0 8px;}',
    '.cc-root .cc-ag-note.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-ag-off{opacity:.55;}',
    '.cc-root .cc-ag-code{position:relative;margin:0 0 12px;}',
    '.cc-root .cc-ag-code pre{margin:0;}',
    '.cc-root .cc-ag-copy{position:absolute;top:6px;right:6px;border:1px solid var(--cc-line);background:var(--cc-surface);color:var(--cc-text-2);font:inherit;font-size:11px;height:24px;padding:0 8px;border-radius:var(--cc-r-control);cursor:pointer;opacity:0;transition:opacity 120ms;}',
    '.cc-root .cc-ag-code:hover .cc-ag-copy,.cc-root .cc-ag-copy:focus-visible{opacity:1;}',
    '.cc-root .cc-ag-text ul,.cc-root .cc-ag-text ol{margin:0 0 12px;padding-left:20px;}',
    '.cc-root .cc-ag-text li{margin:0 0 4px;}',
    '.cc-root .cc-ag-steps{font-size:12px;color:var(--cc-text-3);border-left:2px solid var(--cc-line);padding-left:12px;}',
    '.cc-root .cc-ag-steps summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;min-height:24px;transition:color 120ms;}',
    '.cc-root .cc-ag-steps summary:hover{color:var(--cc-text);}',
    '.cc-root .cc-ag-steps summary::-webkit-details-marker{display:none;}',
    '.cc-root .cc-ag-steps .cc-ag-st{font-family:var(--cc-mono);font-size:11px;line-height:1.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ag-add{color:var(--cc-done);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ag-del{color:var(--cc-error);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ag-mode{display:inline-flex;align-items:center;gap:2px;height:28px;padding:2px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);}',
    '.cc-root .cc-ag-mode button{border:1px solid transparent;background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;font-weight:500;height:24px;padding:0 10px;border-radius:calc(var(--cc-r-control) - 2px);cursor:pointer;transition:background 120ms,color 120ms;}',
    '.cc-root .cc-ag-mode button:hover{color:var(--cc-text);}',
    '.cc-root .cc-ag-mode button[aria-pressed=true]{background:var(--cc-surface);border-color:var(--cc-line);color:var(--cc-text);}',
    '.cc-root input.cc-ag-attach{width:104px;cursor:text;}',
    '.cc-root input.cc-ag-attach::placeholder{color:var(--cc-text-3);}',
    '.cc-root .cc-ag-plan{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 4px 4px 12px;border:1px solid var(--cc-line);border-radius:var(--cc-r-panel);background:var(--cc-surface);font-size:12px;color:var(--cc-text-2);}',
    '.cc-root .cc-ag-plan .cc-ag-ghost{color:var(--cc-accent);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-ag-dot.cc-busy,.cc-root .cc-ag-wait::before{animation:none;}.cc-root .cc-ag-row,.cc-root .cc-ag-chip,.cc-root .cc-ag-field{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (typeof document === 'undefined' || document.getElementById('cc-chat-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-chat-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ------------------------------------------------------------ small pure helpers (node-testable)
  function ago(iso, now) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const s = Math.max(0, Math.round(((now || Date.now()) - t) / 1000));
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }

  // "Claude 5 hours" -> "5 h", "Codex week (all models)" -> "week".
  function windowShort(label) {
    const l = String(label || '').toLowerCase();
    const hrs = /(\d+)\s*(?:h\b|hours?|hrs?)/.exec(l);
    if (hrs) return hrs[1] + ' h';
    const w = /\b(week|day|month)\b/.exec(l);
    if (w) return w[1];
    return String(label || '').replace(/\s*\(.*\)\s*$/, '');
  }
  function clock(iso) {
    const t = new Date(iso || '');
    if (isNaN(t.getTime())) return '';
    const pad = function (x) { return (x < 10 ? '0' : '') + x; };
    return pad(t.getHours()) + ':' + pad(t.getMinutes());
  }

  // Composer chip: "73% week"; empty without a meter. Staleness is shown by tone and tooltip, never as text.
  function usageChipText(a) {
    if (!a || a.usage_percent == null) return '';
    const w = windowShort(a.usage_pool);
    return Math.round(a.usage_percent) + '%' + (w ? ' ' + w : '');
  }
  // Longer form for the confirm note: "Codex week 13% left".
  function usageLong(a) {
    if (!a || a.usage_percent == null) return 'Usage unknown';
    return (a.usage_pool ? String(a.usage_pool).replace(/\s*\(.*\)\s*$/, '') + ' ' : '') + Math.round(a.usage_percent) + '% left';
  }
  function usageTip(a) {
    const rows = (a && a.usage) || [];
    const lines = rows.map(function (u) {
      return (u.label || u.pool) + ': ' + (u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '% left');
    });
    if (a && a.usage_status === 'STALE') {
      const pick = rows.filter(function (u) { return u.status === 'STALE' && u.observed_at; })[0];
      lines.push(pick && clock(pick.observed_at) ? 'Last read ' + clock(pick.observed_at) : 'Last read a while ago');
    }
    return lines.join('\n');
  }

  // Option text: "Claude Opus 5.5" -> "Opus 5.5" inside the Claude tab; efforts capitalised.
  function modelText(agent, m) {
    const label = String(m.label || m.model || '');
    const fam = agent && agent.name ? String(agent.name).split(' ')[0] + ' ' : '';
    return fam && label.indexOf(fam) === 0 && label.length > fam.length ? label.slice(fam.length) : label;
  }
  function effortText(x) {
    const s = String(x || '');
    return s === 'xhigh' ? 'Extra high' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Split text into prose and fenced code blocks: [{code:bool, lang, text}].
  function splitFences(text) {
    const out = [];
    const re = /```([\w+-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ code: false, text: text.slice(last, m.index) });
      out.push({ code: true, lang: m[1] || '', text: m[2].replace(/\n$/, '') });
      last = re.lastIndex;
      if (m[0].length === 0) break;
    }
    if (last < text.length) out.push({ code: false, text: text.slice(last) });
    return out;
  }

  // Inline `code` and **bold**; everything else stays plain text (no HTML injection).
  function inline(text, keyBase) {
    const parts = [];
    const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
    let last = 0, m, i = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const tok = m[0];
      parts.push(tok[0] === '`' ? h('code', { key: keyBase + 'c' + (i++) }, tok.slice(1, -1))
        : h('strong', { key: keyBase + 'b' + (i++) }, tok.slice(2, -2)));
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  function copyText(t) {
    try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(t); } catch (e) { /* no clipboard */ }
  }

  function CodeBlock(props) {
    return h('div', { className: 'cc-ag-code' },
      h('button', { type: 'button', className: 'cc-ag-copy', 'aria-label': 'Copy code', onClick: function () { copyText(props.text); } }, 'Copy'),
      h('pre', { 'data-lang': props.lang || undefined }, h('code', null, props.text)));
  }

  const LI_RE = /^\s*(?:[-*]|\d+[.)])\s+/;

  function Markdownish(props) {
    const blocks = splitFences(String(props.text || ''));
    const kids = [];
    blocks.forEach(function (b, bi) {
      if (b.code) { kids.push(h(CodeBlock, { key: 'p' + bi, lang: b.lang, text: b.text })); return; }
      b.text.split(/\n{2,}/).forEach(function (para, pi) {
        const t = para.replace(/^\n+|\n+$/g, '');
        if (!t) return;
        const key = 'g' + bi + '-' + pi;
        const lines = t.split('\n');
        if (lines.every(function (l) { return LI_RE.test(l); })) {
          const ordered = /^\s*\d/.test(lines[0]);
          kids.push(h(ordered ? 'ol' : 'ul', { key: key }, lines.map(function (l, li) {
            return h('li', { key: li }, inline(l.replace(LI_RE, ''), key + '-' + li + '-'));
          })));
          return;
        }
        const hd = /^#{1,6}\s+(.*)$/.exec(t);
        kids.push(h('p', { key: key, className: hd ? 'cc-ag-hd' : undefined }, inline(hd ? hd[1] : t, key + '-')));
      });
    });
    return h('div', { className: 'cc-ag-text' }, kids);
  }

  // ---- tool steps: consecutive tool items fold into one row
  const EDIT_RE = /^(Edited|Edit|MultiEdit|Write|Wrote|Created)\s+(.+?)(?:\s+\+(\d+)\s+-(\d+))?$/;
  function groupItems(items) {
    const out = [];
    (items || []).forEach(function (it) {
      const last = out[out.length - 1];
      if (it.kind === 'tool') {
        if (last && last.kind === 'steps') last.steps.push(it); else out.push({ kind: 'steps', steps: [it] });
      } else out.push(it);
    });
    return out;
  }
  function stepSummary(steps) {
    const files = {}, order = [];
    let added = 0, removed = 0;
    function add(path, a, r) {
      if (!files[path]) { files[path] = { path: path, added: 0, removed: 0 }; order.push(path); }
      files[path].added += a; files[path].removed += r; added += a; removed += r;
    }
    (steps || []).forEach(function (st) {
      if (st.files && st.files.length) { st.files.forEach(function (f) { add(f.path, f.added || 0, f.removed || 0); }); return; }
      const m = EDIT_RE.exec(String(st.text || ''));
      if (!m) return;
      const parts = m[2].split(/,\s+/);
      parts.forEach(function (p) { add(p, parts.length === 1 ? Number(m[3] || 0) : 0, parts.length === 1 ? Number(m[4] || 0) : 0); });
    });
    return { count: (steps || []).length, added: added, removed: removed, files: order.map(function (p) { return files[p]; }) };
  }
  function StepsRow(props) {
    const sum = stepSummary(props.steps);
    const head = [sum.count + (sum.count === 1 ? ' step' : ' steps')];
    if (sum.files.length) head.push(sum.files.length + (sum.files.length === 1 ? ' file' : ' files'));
    const counts = sum.added || sum.removed;
    return h('details', { className: 'cc-ag-steps', open: props.open ? true : undefined },
      h('summary', null, head.join(' · '),
        counts ? h('span', { className: 'cc-ag-add' }, '+' + sum.added) : null,
        counts ? h('span', { className: 'cc-ag-del' }, '-' + sum.removed) : null),
      (props.steps || []).map(function (st, i) { return h('div', { key: i, className: 'cc-ag-st', title: st.text }, st.text); }));
  }

  // ---- modes (Plan / Autonomous), attachments
  const MODE_MARK = '[Waypoint mode]';
  function modeMessage(mode, message) {
    if (mode === 'plan') {
      return MODE_MARK + ' Plan: do not change anything yet. Reply with a short numbered checklist plan and wait for approval.\n---\n' + message;
    }
    if (mode === 'auto') {
      return MODE_MARK + ' Autonomous: work straight through and post brief progress as each step finishes.\n---\n' + message;
    }
    return message;
  }
  function withAttachments(message, paths) {
    if (!paths || !paths.length) return message;
    return message + '\n\nAttached files:\n' + paths.map(function (p) { return '- ' + p; }).join('\n');
  }
  function displayUser(text) {
    const t = String(text || '');
    if (t.indexOf(MODE_MARK) !== 0) return t;
    const i = t.indexOf('\n---\n');
    return i < 0 ? t : t.slice(i + 5);
  }

  // Stored rows -> render items. Live turn items are appended after.
  function rowsToItems(rows) {
    return (rows || []).map(function (r) {
      const kind = r.role === 'assistant' ? 'text' : r.role;
      return { kind: kind, text: kind === 'user' ? displayUser(r.text) : (r.text || ''), turn: r.turn_id };
    });
  }

  function applyEvent(live, ev) {
    if (!live || ev.turn_id !== live.turn_id) return live;
    const items = live.items.slice();
    if (ev.delta) {
      const lastItem = items[items.length - 1];
      if (lastItem && lastItem.kind === 'text') items[items.length - 1] = { kind: 'text', text: lastItem.text + ev.delta };
      else items.push({ kind: 'text', text: ev.delta });
    }
    if (ev.tool) items.push({ kind: 'tool', text: ev.tool });
    const next = Object.assign({}, live, { items: items, sse: true });
    if (ev.done) next.state = ev.error ? 'error' : (ev.stopped ? 'stopped' : 'done');
    if (ev.error) next.error = ev.error;
    return next;
  }

  // ---- model and effort ("Pick for me" asks GET /api/pick?kind=chat; a missing picker means the CLI default)
  const PICK = '__pick__';

  function resolveChoice(agent, choice, get) {
    const c = choice || {};
    if (c.model !== PICK) {
      const out = {};
      if (c.model) out.model = c.model;
      if (c.effort) out.effort = c.effort;
      return Promise.resolve(out);
    }
    let call;
    try { call = get('/api/pick?kind=chat'); } catch (e) { call = Promise.reject(e); }
    return Promise.resolve(call).then(function (pick) {
      const out = {};
      if (!pick) return out;
      const hit = ((agent && agent.models) || []).find(function (m) { return m.id === pick.model || m.model === pick.model; });
      if (hit) out.model = hit.model;
      let effort = pick.effort;
      if (effort === 'max' && agent && agent.id === 'codex') effort = 'xhigh';
      if (effort && ((agent && agent.efforts) || []).indexOf(effort) >= 0) out.effort = effort;
      return out;
    }, function () { return {}; });
  }

  function replyBody(chat, text, choice) {
    const body = { id: chat.id, message: String(text || '').trim() };
    if (choice && choice.model) body.model = choice.model;
    if (choice && choice.effort) body.effort = choice.effort;
    return body;
  }

  function subagentItems(chat) {
    const items = [];
    if (chat.prompt) items.push({ kind: 'user', text: chat.prompt });
    if (chat.output) items.push({ kind: 'text', text: chat.output });
    return items;
  }
  function subagentWait(chat) { return chat.status === 'running' && !chat.output; }

  // Smoke-test chats (scripts' "Reply with exactly: ..." probes, or titles tagged "[smoke]") stay out of the list.
  const SMOKE_RE = /^\s*(?:\[smoke\]|reply with exactly\b)/i;
  function isSmoke(s) { return !!(s && SMOKE_RE.test(String(s.title || ''))); }

  function fmtCtx(n) {
    if (CC.modelBadges && typeof CC.modelBadges.fmtCtx === 'function') return CC.modelBadges.fmtCtx(n);
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    return Math.round(n / 1000) + 'K';
  }
  // The agent's models as flat-picker rows (name, Elo, context, usage): strongest first, nothing selected
  // until you pick. Usage is the agent's own pool, the same number the composer chip shows.
  function modelRows(agent, model) {
    const a = agent || {};
    const usage = a.usage_percent == null ? 'n/a' : Math.round(a.usage_percent) + '%';
    const rows = (a.models || []).map(function (m, i) {
      const eloNum = typeof m.elo === 'number' && isFinite(m.elo) ? Math.round(m.elo) : null;
      let off = false;
      if (typeof CC.isEnabled === 'function') { try { off = CC.isEnabled(m.id || m.model) === false; } catch (e) { off = false; } }
      return { key: m.model, provider: a.id, model: m.model, name: modelText(a, m), eloNum: eloNum, i: i,
        elo: eloNum !== null ? '~' + eloNum : 'n/a', ctx: fmtCtx(m.context_window) || 'n/a', usage: usage,
        selected: !!model && model === m.model, disabled: off, note: off ? 'Switched off in Waypoint' : (m.label || m.id || null) };
    });
    rows.sort(function (x, y) {
      if (x.disabled !== y.disabled) return x.disabled ? 1 : -1;
      const ex = x.eloNum === null ? -1 : x.eloNum, ey = y.eloNum === null ? -1 : y.eloNum;
      return ey - ex || x.i - y.i;
    });
    return rows;
  }

  // The flat table from flat_picker.js (CC.FlatModelTable), so the Claude/Codex chats pick models the same way
  // as dsh chat. Effort is not in here: it stays its own quiet chip next to the Model chip.
  function ModelMenu(props) {
    const rows = modelRows(props.agent, props.model === PICK ? '' : props.model);
    const pos = props.pos;
    return h('div', {
      className: 'cc-root cc-ag-pop', 'data-cc-model-menu': '', onKeyDown: props.onKey, ref: props.menuRef,
      style: pos ? { bottom: pos.bottom, left: pos.left } : undefined
    }, h(CC.FlatModelTable, {
      rows: rows, highlight: typeof props.highlight === 'number' ? props.highlight : -1, empty: 'No models available',
      onPick: function (r) { props.onModel(r.model); }, onPickForMe: function () { props.onModel(PICK); }
    }));
  }

  function ModelChip(props) {
    const React = CC.React;
    const a = props.agent;
    const sOpen = React.useState(false), open = sOpen[0], setOpen = sOpen[1];
    const sPos = React.useState(null), pos = sPos[0], setPos = sPos[1];
    const sHi = React.useState(-1), hi = sHi[0], setHi = sHi[1];
    const trigRef = React.useRef(null), menuRef = React.useRef(null);
    const rows = modelRows(a, props.model === PICK ? '' : props.model);
    React.useEffect(function () {
      if (!open || typeof document === 'undefined') return undefined;
      const away = function (ev) {
        if (trigRef.current && trigRef.current.contains(ev.target)) return;
        if (menuRef.current && menuRef.current.contains(ev.target)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', away);
      return function () { document.removeEventListener('mousedown', away); };
    }, [open]);
    function close() { setOpen(false); try { if (trigRef.current) trigRef.current.focus(); } catch (e) { /* gone */ } }
    function pick(v) { props.onModel(v); close(); }
    function toggle() {
      if (open) { close(); return; }
      let p = { bottom: 80, left: 16 };
      try {
        const r = trigRef.current.getBoundingClientRect();
        const vh = window.innerHeight || 800, vw = window.innerWidth || 1200;
        p = { bottom: Math.max(8, vh - r.top + 6), left: Math.max(8, Math.min(r.left, vw - 532)) };
      } catch (e) { /* default spot */ }
      setPos(p);
      setHi(Math.max(0, rows.findIndex(function (r) { return r.selected; }) + 1));
      setOpen(true);
    }
    function onKey(e) {
      if (!open) return;
      const n = rows.length + 1;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const d = e.key === 'ArrowDown' ? 1 : -1;
        setHi(function (i) { return ((i < 0 ? 0 : i) + d + n) % n; });
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (hi === 0) pick(PICK);
        else if (rows[hi - 1] && !rows[hi - 1].disabled) pick(rows[hi - 1].model);
      }
    }
    const cur = (a.models || []).find(function (m) { return m.model === props.model; });
    const label = props.model === PICK ? 'Pick for me' : (cur ? modelText(a, cur) : 'Model');
    return h('span', { className: 'cc-ag-mwrap' },
      h('button', {
        type: 'button', ref: trigRef, className: 'cc-ag-chip', 'aria-label': 'Model', 'aria-haspopup': 'listbox',
        'aria-expanded': open, title: cur ? (cur.label || cur.model) : undefined, onClick: toggle, onKeyDown: onKey
      }, label),
      open ? h(ModelMenu, { agent: a, model: props.model, pos: pos, highlight: hi, onKey: onKey, menuRef: menuRef, onModel: pick }) : null);
  }

  // ------------------------------------------------------------ components
  function ChoiceSelects(props) {
    const a = props.agent;
    if (!a) return null;
    const models = a.models || [], efforts = a.efforts || [];
    const picking = props.model === PICK;
    const kids = [];
    if (models.length && typeof CC.FlatModelTable === 'function') {
      kids.push(h(ModelChip, { key: 'm', agent: a, model: props.model, onModel: props.onModel }));
    } else if (models.length) { // flat_picker.js missing: the plain select still works
      kids.push(h('select', {
        key: 'm', className: 'cc-ag-chip', 'aria-label': 'Model', value: props.model || '',
        onChange: function (e) { props.onModel(e.target.value); }
      }, [h('option', { key: '', value: '' }, 'Model'), h('option', { key: PICK, value: PICK }, 'Pick for me')]
        .concat(models.map(function (m) { return h('option', { key: m.model, value: m.model, title: m.label || m.id }, modelText(a, m)); }))));
    }
    // "Opus 5.5 · Medium" once both are chosen; empty pickers read "Model" and "Effort".
    if (models.length && efforts.length && props.model && props.effort && !picking) {
      kids.push(h('span', { key: 'dot', className: 'cc-ag-sep', 'aria-hidden': 'true' }, '·'));
    }
    if (efforts.length) {
      kids.push(h('select', {
        key: 'e', className: 'cc-ag-chip', 'aria-label': 'Effort', value: picking ? '' : (props.effort || ''), disabled: picking,
        onChange: function (e) { props.onEffort(e.target.value); }
      }, [h('option', { key: '', value: '' }, picking ? 'Auto' : 'Effort')]
        .concat(efforts.map(function (x) { return h('option', { key: x, value: x }, effortText(x)); }))));
    }
    return kids.length ? h('span', { className: 'cc-ag-choice' + (props.model || props.effort ? ' cc-ag-set' : '') }, kids) : null;
  }

  function SessionRow(props) {
    const s = props.session;
    return h('li', null, h('button', {
      type: 'button', className: 'cc-ag-row' + (props.selected ? ' cc-sel' : ''), title: s.cwd || '',
      onClick: props.onClick
    }, h('span', { className: 'cc-ag-name' }, s.title || 'Chat'),
    s.active_turn ? h('span', { className: 'cc-ag-dot cc-busy', 'aria-label': 'answering' }) :
      h('span', { className: 'cc-ag-sub' }, ago(s.last_at))));
  }

  function SubagentRow(props) {
    const c = props.chat;
    const tip = [c.agent_name, c.model, c.status].filter(Boolean).join(' · ');
    return h('li', null, h('button', {
      type: 'button', className: 'cc-ag-row' + (props.selected ? ' cc-sel' : ''), title: tip, onClick: props.onClick
    }, h('span', { className: 'cc-ag-name' }, c.title || 'Subagent'),
    c.status === 'running' ? h('span', { className: 'cc-ag-dot cc-busy', 'aria-label': 'running' })
      : c.status === 'error' ? h('span', { className: 'cc-ag-sub cc-bad' }, 'failed')
        : h('span', { className: 'cc-ag-sub' }, ago(c.started))));
  }

  function SubagentList(props) {
    const chats = props.chats || [];
    return h('div', { className: 'cc-ag-subs' },
      h('div', { className: 'cc-sec-h cc-ag-h' }, h('div', { className: 'cc-sec-t' }, 'Subagents')),
      chats.length ? h('ul', { className: 'cc-ag-list' }, chats.map(function (c) {
        return h(SubagentRow, { key: c.id, chat: c, selected: c.id === props.selected, onClick: function () { props.onOpen(c); } });
      })) : h('div', { className: 'cc-ag-empty' }, 'No subagent chats yet.'));
  }

  function Item(props) {
    const it = props.item;
    if (it.kind === 'user') return h('div', { className: 'cc-ag-user' }, it.text);
    if (it.kind === 'tool') return h('div', { className: 'cc-ag-tool', title: it.text }, '· ' + it.text);
    if (it.kind === 'error') return h('div', { className: 'cc-ag-err', role: 'status' }, it.text);
    return h(Markdownish, { text: it.text });
  }

  function folderLabel(folders, path) {
    const f = (folders || []).find(function (x) { return x.path === path; });
    if (f) return f.label;
    const parts = String(path || '').split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || path || '';
  }

  function agentEnabled(id) {
    if (typeof CC.isEnabled !== 'function') return true;
    try { return CC.isEnabled('agent:' + id) !== false; } catch (e) { return true; }
  }

  // A quiet small kit button; without the kit, the panel's own ghost button.
  function quietButton(label, onClick, disabled) {
    const ui = CC.ui;
    if (ui && typeof ui.Button === 'function') return ui.Button({ kind: 'quiet', size: 'sm', onClick: onClick, disabled: !!disabled, children: label });
    return h('button', { type: 'button', className: 'cc-ag-ghost', onClick: onClick, disabled: disabled }, label);
  }

  function SessionList(props) {
    const sessions = (props.sessions || []).filter(function (s) { return !isSmoke(s); });
    return h('div', { className: 'cc-ag-sessions' },
      h('div', { className: 'cc-sec-h cc-ag-h' }, h('div', { className: 'cc-sec-t' }, 'Chats'),
        h('div', { className: 'cc-sec-a' }, quietButton('New chat', props.onNew, props.disabled))),
      sessions.length ? h('ul', { className: 'cc-ag-list' }, sessions.map(function (s) {
        return h(SessionRow, { key: s.id, session: s, selected: s.id === props.selected, onClick: function () { props.onOpen(s.id); } });
      })) : h('div', { className: 'cc-ag-empty' }, 'No chats yet.'));
  }

  const SEND_ICON = h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M8 13V3.5M3.5 7.5 8 3l4.5 4.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }));

  const CLIP_ICON = h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7', fill: 'none', stroke: 'currentColor',
      strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }));

  function Composer(props) {
    const agent = props.agent, mode = props.mode || '';
    const modes = [['plan', 'Plan'], ['auto', 'Autonomous']];
    function onKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); props.onSend(); }
    }
    return h('div', { className: 'cc-ag-comp' + (props.on ? '' : ' cc-ag-off') }, h('div', { className: 'cc-ag-comp-in' },
      props.note ? h('div', { className: 'cc-ag-note' + (props.note.bad ? ' cc-bad' : ''), role: 'status' }, props.note.text) : null,
      props.planReady ? h('div', { className: 'cc-ag-plan' }, 'Plan ready.',
        h('button', { type: 'button', className: 'cc-ag-ghost', onClick: props.onApprove }, 'Approve and run')) : null,
      h('div', { className: 'cc-ag-field' },
      (props.attachments || []).length ? h('div', { className: 'cc-ag-chips' }, props.attachments.map(function (p) {
        return h('button', { key: p, type: 'button', className: 'cc-ag-chip', title: 'Remove ' + p, onClick: function () { props.onDetach(p); } }, p);
      })) : null,
      h('textarea', {
        className: 'cc-ag-input', value: props.text, rows: 3, 'aria-label': 'Message', disabled: !props.on,
        placeholder: props.placeholder || (agent ? 'Message ' + agent.name : 'Message'),
        onChange: function (e) { props.onText(e.target.value); }, onKeyDown: onKey
      }),
      h('div', { className: 'cc-ag-tools' }, props.lead,
        h(ChoiceSelects, { agent: agent, model: props.choice.model, effort: props.choice.effort, onModel: props.onModel, onEffort: props.onEffort }),
        h('span', { className: 'cc-ag-mode', role: 'group', 'aria-label': 'Mode' }, modes.map(function (m) {
          return h('button', { key: m[0], type: 'button', 'data-mode': m[0], 'aria-pressed': mode === m[0],
            onClick: function () { props.onMode(mode === m[0] ? '' : m[0]); } }, m[1]);
        })),
        h('label', { className: 'cc-ag-att', title: 'Attach file path' }, CLIP_ICON,
          h('input', { className: 'cc-ag-chip cc-ag-attach', placeholder: 'Attach path', 'aria-label': 'Attach file path',
            onKeyDown: function (e) {
              if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const v = e.target.value.trim(); if (v) { props.onAttach(v); e.target.value = ''; } }
            } })),
        props.trail, h('span', { className: 'cc-ag-gap' }),
        props.running ? h('button', { type: 'button', className: 'cc-ag-ghost', onClick: props.onStop }, 'Stop')
          : props.canRetry ? h('button', { type: 'button', className: 'cc-ag-ghost', onClick: props.onRetry }, 'Retry') : null,
        props.armed
          ? h('button', { type: 'button', className: 'cc-ag-send cc-ag-wide', disabled: !props.canSend, onClick: props.onSend }, 'Confirm send')
          : h('button', { type: 'button', className: 'cc-ag-send', disabled: !props.canSend, onClick: props.onSend, title: props.sendLabel || 'Send' },
            SEND_ICON, h('span', { className: 'cc-sr' }, props.sendLabel || 'Send'))))));
  }

  CC.ChatPanel = function ChatPanel(props) {
    const React = CC.React;
    ensurePageStyle();
    const aid = props.agentId;
    const list = CC.useEngine('/api/agents', ['pool']);
    const data = list.data || { agents: [], folders: [] };
    const agentsList = data.agents || [];
    const folders = data.folders || [];

    const sSess = React.useState([]), sessions = sSess[0], setSessions = sSess[1];
    const sSubs = React.useState([]), subs = sSubs[0], setSubs = sSubs[1];
    const sSub = React.useState(null), subSel = sSub[0], setSubSel = sSub[1];
    const sCur = React.useState(null), current = sCur[0], setCurrent = sCur[1];
    const sRows = React.useState([]), rows = sRows[0], setRows = sRows[1];
    const sLive = React.useState(null), live = sLive[0], setLive = sLive[1];
    const sText = React.useState(''), text = sText[0], setText = sText[1];
    const sFolder = React.useState(null), folder = sFolder[0], setFolder = sFolder[1];
    const sNote = React.useState(null), note = sNote[0], setNote = sNote[1];
    const sArm = React.useState(false), armed = sArm[0], setArmed = sArm[1];
    const sMode = React.useState(''), mode = sMode[0], setMode = sMode[1];
    const sAtt = React.useState([]), attachments = sAtt[0], setAttachments = sAtt[1];
    const stickRef = React.useRef(true);
    const sTick = React.useState(0), tick = sTick[0], setTick = sTick[1];
    const sChoice = React.useState({ model: '', effort: '' }), choice = sChoice[0], setChoice = sChoice[1];
    const liveRef = React.useRef(null);
    liveRef.current = live;
    const scrollRef = React.useRef(null);

    const agent = agentsList.find(function (a) { return a.id === aid; }) || null;
    const name = agent ? agent.name : (props.name || 'Chat');
    const on = agentEnabled(aid);
    function openAgents() {
      try { if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') CC.ctx.layout.selectPanel('cc-agents'); } catch (e) { /* no layout */ }
    }
    const session = sessions.find(function (s) { return s.id === current; }) || null;
    const subChat = subs.find(function (c) { return c.id === subSel; }) || null;
    const showSub = !!(subChat && !current);   // a dispatched chat you have not replied to yet
    const folderPath = session ? session.cwd : (folder || data.default_folder || (folders[0] && folders[0].id));

    // This agent's chats.
    React.useEffect(function () {
      let alive = true;
      CC.api.get('/api/agents/sessions?agent=' + encodeURIComponent(aid)).then(function (d) {
        if (alive) setSessions((d && d.sessions) || []);
      }, function () {});
      return function () { alive = false; };
    }, [aid, tick]);

    // Subagent chats dispatched to this agent (a missing route just means none).
    React.useEffect(function () {
      let alive = true;
      const load = function () {
        CC.api.get('/api/subagent_chats?agent=' + encodeURIComponent(aid)).then(function (d) {
          if (alive) setSubs((d && d.chats) || []);
        }, function () {});
      };
      load();
      // Subagent dispatches surface as 'agent' events; no dedicated kind exists for the chat list itself,
      // so a 60 s fallback poll stays for anything the stream does not announce.
      const off = CC.api.subscribe(function (kind) { if (alive && kind === 'agent') load(); });
      const timer = setInterval(load, 60000);
      return function () { alive = false; clearInterval(timer); off(); };
    }, [aid, tick]);

    // Messages for the open chat (also picks up a turn already running after a reload).
    React.useEffect(function () {
      if (!current) { setRows([]); return undefined; }
      let alive = true;
      CC.api.get('/api/agents/messages?session=' + encodeURIComponent(current)).then(function (d) {
        if (!alive || !d) return;
        setRows(d.messages || []);
        const cur = liveRef.current;
        if (d.active && (!cur || cur.turn_id !== d.active.turn_id)) {
          setLive({ turn_id: d.active.turn_id, session_id: current, items: d.active.items || [], state: 'running' });
        } else if (!d.active && cur && cur.session_id === current && cur.state === 'running' && !cur.sse) {
          setLive(null);
        }
      }, function () {});
      return function () { alive = false; };
    }, [current, tick]);

    // Live deltas over SSE.
    React.useEffect(function () {
      return CC.api.subscribe(function (kind, ev) {
        if (kind !== 'agent' || !ev) return;
        const cur = liveRef.current;
        if (cur && ev.turn_id === cur.turn_id) {
          const next = applyEvent(cur, ev);
          liveRef.current = next;
          setLive(next);
          if (ev.done) setTick(function (t) { return t + 1; });
        } else if (ev.done) {
          setTick(function (t) { return t + 1; });
        }
      });
    }, []);

    // Fallback while a turn runs: poll its snapshot if no SSE deltas are arriving.
    React.useEffect(function () {
      if (!live || live.state !== 'running' || live.sse) return undefined;
      const sid = live.session_id, tid = live.turn_id;
      const timer = setInterval(function () {
        CC.api.get('/api/agents/messages?session=' + encodeURIComponent(sid)).then(function (d) {
          const cur = liveRef.current;
          if (!d || !cur || cur.turn_id !== tid || cur.sse) return;
          if (d.active && d.active.turn_id === tid) setLive(Object.assign({}, cur, { items: d.active.items || [] }));
          else { setRows(d.messages || []); setLive(null); setTick(function (t) { return t + 1; }); }
        }, function () {});
      }, 10000);  // runs only when no SSE deltas arrive (live.sse false): degraded-stream fallback
      return function () { clearInterval(timer); };
    }, [live && live.turn_id, live && live.state, live && live.sse]);

    // A finished live turn is replaced by the stored rows once they have loaded.
    React.useEffect(function () {
      if (live && live.state !== 'running' && rows.some(function (r) { return r.turn_id === live.turn_id && r.role !== 'user'; })) {
        setLive(null);
      }
    }, [rows, live && live.state]);

    // Keep the newest text in view.
    React.useEffect(function () {
      const el = scrollRef.current;
      if (el && stickRef.current) el.scrollTop = el.scrollHeight;
    }, [rows.length, live && live.items.length, live && live.items.length && live.items[live.items.length - 1].text.length]);

    function newChat() { setCurrent(null); setSubSel(null); setRows([]); setArmed(false); setNote(null); }
    function openSession(id) { setCurrent(id); setSubSel(null); setArmed(false); setNote(null); }
    function openSubagent(c) {
      setSubSel(c.id); setArmed(false); setNote(null);
      if (c.agent_session) setCurrent(c.agent_session); else { setCurrent(null); setRows([]); }
    }

    const running = !!(live && live.state === 'running' && (!current || live.session_id === current));
    const replyOk = !showSub || !!(subChat && subChat.resumable);
    const canSend = !!(on && agent && agent.available && text.trim() && !running && replyOk);

    function started(res, message) {
      setText('');
      const lv = { turn_id: res.turn_id, session_id: res.session_id, items: [], state: 'running', pending: message };
      liveRef.current = lv;
      setLive(lv);
      setCurrent(res.session_id);
      setTick(function (t) { return t + 1; });
    }
    function failed(err) {
      const d = (err && err.data) || {};
      if (d.error === 'confirm_usage') {
        setArmed(true);
        setNote({ text: usageLong(Object.assign({}, agent, d)) + '. Press Send again to confirm.' });
      } else {
        setNote({ bad: true, text: d.detail || d.error || (err && err.message) || 'Send failed.' });
      }
    }

    function send(over) {
      const raw = typeof over === 'string' ? over : null;
      if (raw === null ? !canSend : !(on && agent && agent.available && !running && replyOk)) return;
      if (agent.needs_confirm && !armed) {
        setArmed(true);
        setNote({ text: usageLong(agent) + '. This uses your ' + agent.name + ' plan; press Send again to confirm.' });
        return;
      }
      stickRef.current = true;
      const message = raw !== null ? raw : withAttachments(modeMessage(mode, text.trim()), attachments);
      setNote(null); setArmed(false);
      if (raw === null) setAttachments([]);
      resolveChoice(agent, choice, CC.api.get).then(function (pick) {
        let post;
        if (showSub) {
          const body = replyBody(subChat, message, pick);
          if (agent.needs_confirm) body.confirm = true;
          post = CC.api.post('/api/subagent_chats/reply', body);
        } else {
          const body = Object.assign({ agent: agent.id, message: message }, pick);
          if (current) body.session_id = current; else body.cwd = folderPath;
          if (agent.needs_confirm) body.confirm = true;
          post = CC.api.post('/api/agents/send', body);
        }
        return post.then(function (res) { started(res, message); }, failed);
      });
    }
    const lastUser = (function () {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].role === 'user') return rows[i].text;
      return '';
    })();
    const hasReply = rows.some(function (r) { return r.role === 'assistant'; });
    const lastIsAssistant = rows.length > 0 && rows[rows.length - 1].role === 'assistant';
    function retry() { if (lastUser) send(lastUser); }
    function approve() { setMode(''); send('Plan approved. Execute it now, step by step.'); }
    function stop() {
      if (!live) return;
      CC.api.post('/api/agents/stop', { turn_id: live.turn_id }).catch(function () {});
    }

    // Conversation items: a dispatched chat's prompt and output, or stored rows then the live turn.
    let items;
    if (showSub) {
      items = subagentItems(subChat);
      if (subagentWait(subChat)) items.push({ kind: 'wait' });
    } else {
      items = rowsToItems(rows);
      if (live && (live.session_id === current)) {
        const stored = rows.some(function (r) { return r.turn_id === live.turn_id && r.role !== 'user'; });
        if (!stored) {
          if (live.pending && !rows.some(function (r) { return r.turn_id === live.turn_id; })) {
            items.push({ kind: 'user', text: live.pending });
          }
          items = items.concat(live.items);
          if (live.state === 'running' && !live.items.length) items.push({ kind: 'wait' });
          if (live.state === 'error' && live.error) items.push({ kind: 'error', text: live.error });
        }
      }
    }

    const groups = groupItems(items);

    const side = h('aside', { className: 'cc-ag-side', 'aria-label': (agent ? agent.name : 'Agent') + ' chats' },
      list.error && !agentsList.length ? h('div', { className: 'cc-ag-empty' }, 'Waypoint Core is not answering.') : null,
      h(SessionList, { sessions: sessions, selected: subSel ? null : current, disabled: !agent, onNew: newChat, onOpen: openSession }),
      h(SubagentList, { chats: subs, selected: subSel, onOpen: openSubagent }));

    const thread = items.length ? h('div', { className: 'cc-ag-thread' }, groups.map(function (it, i) {
      if (it.kind === 'steps') return h(StepsRow, { key: 's' + i + (running && i === groups.length - 1 ? 'o' : 'c'), steps: it.steps, open: running && i === groups.length - 1 });
      if (it.kind === 'wait') return h('div', { key: 'w', className: 'cc-ag-wait' }, (agent ? agent.name : 'Agent') + ' is working…');
      return h(Item, { key: i, item: it });
    })) : agent && !on ? h('div', { className: 'cc-ag-hello' },
      h('div', { className: 'cc-ag-hello-line' }, 'Turned off in Agents.'),
      h('button', { type: 'button', className: 'cc-ag-ghost cc-ag-go', onClick: openAgents }, 'Open Agents'))
      : agent && !agent.available ? h('div', { className: 'cc-ag-hello' },
        h('div', { className: 'cc-ag-hello-line' }, agent.availability_detail || 'Not available right now.'))
        : !current && !showSub && agent ? h('div', { className: 'cc-ag-emptywrap' }, emptyState()) : null;

    const folderChip = session
      ? h('span', { className: 'cc-ag-chip cc-ag-folder', title: session.cwd }, folderLabel(folders, session.cwd))
      : showSub && subChat.cwd ? h('span', { className: 'cc-ag-chip cc-ag-folder', title: subChat.cwd }, folderLabel(folders, subChat.cwd))
        : h('select', {
          className: 'cc-ag-chip cc-ag-folder', 'aria-label': 'Working folder', value: folderPath || '',
          onChange: function (e) { setFolder(e.target.value); }
        }, folders.map(function (f) { return h('option', { key: f.id, value: f.id, title: f.path }, f.label); }));
    const staleUsage = !!(agent && agent.usage_status === 'STALE');
    const lowUsage = !!(agent && agent.usage_percent != null && agent.usage_percent <= 20);
    const usageChip = agent && usageChipText(agent) ? h('span', {
      className: 'cc-ag-chip cc-ag-use' + (staleUsage ? ' cc-ag-stale' : (lowUsage ? ' cc-warn' : '')), 'data-usage': '',
      title: usageTip(agent) || null
    }, usageChipText(agent)) : null;

    // Switched off in Agents: no composer, just the way back (the hello block above).
    const composer = agent && !on ? null : showSub && !replyOk
      ? h('div', { className: 'cc-ag-comp' }, h('div', { className: 'cc-ag-comp-in' },
        h('div', { className: 'cc-ag-note', role: 'status' }, subChat.resume_note || 'This chat cannot be resumed.')))
      : h(Composer, {
        agent: agent, on: on, text: text, note: note, armed: armed, running: running, canSend: canSend, canRetry: hasReply && !!lastUser,
        planReady: mode === 'plan' && lastIsAssistant && !running, mode: mode, attachments: attachments, choice: choice,
        sendLabel: showSub ? 'Reply' : 'Send', lead: folderChip, trail: usageChip,
        placeholder: agent ? (showSub ? 'Reply to ' + subChat.title : 'Message ' + agent.name) : 'Message',
        onText: function (v) { setText(v); if (armed) setArmed(false); }, onSend: function () { send(); }, onStop: stop, onRetry: retry, onApprove: approve,
        onMode: setMode, onAttach: function (p) { setAttachments(attachments.indexOf(p) < 0 ? attachments.concat([p]) : attachments); },
        onDetach: function (p) { setAttachments(attachments.filter(function (x) { return x !== p; })); },
        onModel: function (v) { setChoice(Object.assign({}, choice, { model: v })); },
        onEffort: function (v) { setChoice(Object.assign({}, choice, { effort: v })); }
      });

    const title = session ? session.title : (showSub ? subChat.title : name);
    // No route tag (the tab names the agent); an open chat shows its folder.
    const subline = showSub
      ? [subChat.agent_name, subChat.model, subChat.status].filter(Boolean).join(' · ')
      : (session ? folderLabel(folders, session.cwd) : '');

    const body = h('div', { className: 'cc-ag-body' }, side,
      h('main', { className: 'cc-ag-main' },
        h('div', { className: 'cc-ag-scroll', ref: scrollRef, onScroll: function (e) { const t = e.target; stickRef.current = t.scrollHeight - t.scrollTop - t.clientHeight < 60; } }, thread),
        composer));
    return frame(title, subline, body, props.pageId);
  };

  // No chat open: a compact left-aligned note just above the composer (the header names the agent).
  function emptyState() {
    const ui = CC.ui;
    const title = 'No chat open', body = 'Pick a chat on the left or type below.';
    if (ui && typeof ui.Empty === 'function') return ui.Empty({ title: title, body: body });
    return h('div', { className: 'cc-em' }, h('div', { className: 'cc-em-t' }, title), h('div', { className: 'cc-em-b' }, body));
  }

  // The page frame: the kit's Page and PageHeader (title, one meta line, app status at the right end).
  // Without the kit (ui.js not loaded) a plain header keeps the page usable.
  function frame(title, meta, body, pageId) {
    const ui = CC.ui;
    if (ui && typeof ui.Page === 'function' && typeof ui.PageHeader === 'function') {
      return ui.Page({ className: 'cc-ag', raw: true, children: body,
        header: h('div', { className: 'cc-ag-bar' }, ui.PageHeader({ title: title, meta: meta || null, pageId: pageId })) });
    }
    return h('div', { className: 'cc-root cc-page cc-ag' },
      h('div', { className: 'cc-ag-bar cc-ag-plain' },
        h('span', { className: 'cc-ag-title' }, title),
        meta ? h('span', { className: 'cc-ag-sub' }, meta) : null),
      body);
  }

  CC.chatInternals = {
    splitFences: splitFences, applyEvent: applyEvent, usageChipText: usageChipText, usageLong: usageLong, windowShort: windowShort, ago: ago, ChoiceSelects: ChoiceSelects,
    SubagentList: SubagentList, resolveChoice: resolveChoice, replyBody: replyBody, subagentItems: subagentItems,
    subagentWait: subagentWait, PICK: PICK, STYLE: STYLE, Composer: Composer, SessionList: SessionList, Markdownish: Markdownish,
    CodeBlock: CodeBlock, groupItems: groupItems, stepSummary: stepSummary, StepsRow: StepsRow, modeMessage: modeMessage,
    withAttachments: withAttachments, displayUser: displayUser, isSmoke: isSmoke, modelRows: modelRows, ModelMenu: ModelMenu,
    ModelChip: ModelChip
  };
})(CC);

		// ── page_claude.js
// page_claude.js [worker-d] - CC.ClaudePage: talk to Claude Code directly (stream, resume, model + effort).
(function (CC) {
  'use strict';
  CC.ClaudePage = function ClaudePage() {
    return CC.h(CC.ChatPanel, { agentId: 'claude_code', name: 'Claude Code', pageId: 'cc-claude' });
  };
})(CC);

		// ── page_codex.js
// page_codex.js [worker-d] - CC.CodexPage: talk to Codex directly (stream, resume, model + effort).
// Your own sends keep a confirm click that shows current Codex usage first.
(function (CC) {
  'use strict';
  CC.CodexPage = function CodexPage() {
    return CC.h(CC.ChatPanel, { agentId: 'codex', name: 'Codex', pageId: 'cc-codex' });
  };
})(CC);

		// ── settings.js
(function (CC) {
  // S1 Settings: one stored on/off map for every sidebar tab, ours and dsh's.
  //
  // dsh gives no public "hide this panel" option (its More-menu pins live in memory only and the
  // Plugins row can never be unpinned; dsh-client-ui-sidebar README), and the More button shows
  // whenever `sidebar.panellist.actions` has any registration, which dsh itself always adds. So
  // the owner's choices are kept in localStorage and applied with ONE scoped style rule over dsh's
  // sidebar rows (matched by their accessible label inside the panel list). dsh files are never
  // edited; a renamed class simply makes the rule match nothing and dsh shows its default.
  var KEY = 'WAYPOINT_TABS_V1';
  var LEGACY_AUTOMATION = 'DSH_CC_HIDE_AUTOMATION_TASKS'; // page_sprints.js keeps its own copy
  var STYLE_ID = 'cc-sidebar-settings';
  var LOCKED = 'cc-settings';
  var ROW = '[class*="_panelList"] [class*="_panelRow"]';

  // dsh-owned entries. `labels` are the English and Chinese row labels dsh renders.
  var DSH = [
    { id: 'plugins', label: 'Plugins', labels: ['Plugins', '插件'], def: true },
    { id: 'schedules', label: 'Automation tasks', labels: ['Automation tasks', '自动化任务'], def: true },
    { id: 'more', label: 'More menu', def: false },
    { id: 'workspaces', label: 'Workspaces', hint: 'Folder chooser and list', def: false }
  ];

  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }
  function readRaw(key) { try { var s = storage(); return s ? s.getItem(key) : null; } catch (e) { return null; } }
  function writeRaw(key, value) { try { var s = storage(); if (s) s.setItem(key, value); } catch (e) { /* blocked */ } }

  function tabs() {
    // An add-on tab (cc-prefs) gets a switch only while its add-on is on, like its sidebar row (app.js).
    return (CC.PAGES || []).filter(function (p) { return p.sidebar !== false && (!p.addon || (CC.addonOn && CC.addonOn(p.addon))); })
      .slice().sort(function (a, b) { return a.order - b.order; });
  }
  function entries() {
    var out = tabs().map(function (p) { return { id: p.id, label: p.label, group: 'tabs', def: p.def !== false, locked: p.id === LOCKED }; });
    DSH.forEach(function (d) { out.push({ id: d.id, label: d.label, hint: d.hint || null, group: 'dsh', def: d.def }); });
    return out;
  }
  function defaultFor(id) {
    if (id === 'schedules') return readRaw(LEGACY_AUTOMATION) !== '1';
    var d = DSH.filter(function (x) { return x.id === id; })[0];
    if (d) return d.def;
    // v4 B3: a page can start off (Claude and Codex now run from the main chat; their tabs keep the
    // session history and come back from Settings).
    var page = (CC.PAGES || []).filter(function (x) { return x.id === id; })[0];
    return !(page && page.def === false);
  }

  var cache = null;
  function load() {
    if (cache) return cache;
    var map = {};
    try { var raw = readRaw(KEY); var parsed = raw ? JSON.parse(raw) : null; if (parsed && typeof parsed === 'object') map = parsed; } catch (e) { map = {}; }
    cache = map;
    return cache;
  }
  function isOn(id) {
    if (id === LOCKED) return true;
    var map = load();
    return typeof map[id] === 'boolean' ? map[id] : defaultFor(id);
  }

  var listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
  }
  function set(id, on) {
    if (id === LOCKED) return true;
    var map = Object.assign({}, load());
    map[id] = !!on;
    cache = map;
    writeRaw(KEY, JSON.stringify(map));
    if (id === 'schedules') {
      writeRaw(LEGACY_AUTOMATION, on ? '0' : '1');
      try { if (CC.sprintsSidebar && CC.sprintsSidebar.sync) CC.sprintsSidebar.sync(); } catch (e) { /* its rule is optional */ }
    }
    applyCss();
    listeners.slice().forEach(function (l) { try { l(id, !!on); } catch (e) { if (CC.warn) CC.warn('settings listener failed', e); } });
    return !!on;
  }

  function q(label) { return String(label).replace(/["\\]/g, ''); }
  function rowRule(labels) {
    return labels.map(function (l) { return ROW + '[aria-label="' + q(l) + '"]'; }).join(',');
  }
  function css() {
    var sel = [];
    tabs().forEach(function (p) { if (!isOn(p.id)) sel.push(rowRule([p.label])); });
    DSH.forEach(function (d) { if (d.labels && !isOn(d.id)) sel.push(rowRule(d.labels)); });
    if (!isOn('more')) sel.push('[class*="_panelList"] [class*="_moreAnchor"]', ROW + '[aria-haspopup="menu"]');
    return sel.length ? sel.join(',') + '{display:none;}' : '';
  }
  // The owner (109): a logical order. Waypoint's rows first, dsh's own rows (Plugins, Automation tasks,
  // More) after Settings. The panel list is a flex column, so CSS `order` moves rows without
  // touching dsh's DOM; a renamed class just leaves dsh's order.
  var ORDER_ID = STYLE_ID + '-order';
  // Review 2 (57): the sidebar footer flickered between the avatar alone and "Signed in to DeepSeek"
  // while dsh's account profile loaded. The avatar is enough: the label is hidden in every state; the
  // button keeps its own aria-label ("Account menu") for screen readers.
  var FOOTER_CSS = 'button[class*="_trigger"][aria-haspopup="menu"]:has(> [class*="_avatar"]) > [class*="_label"]{display:none;}';
  function orderCss() {
    var dshRows = [];
    DSH.forEach(function (d) { if (d.labels) dshRows.push(rowRule(d.labels)); });
    return '[class*="_panelList"]{display:flex;flex-direction:column;}' +
      dshRows.join(',') + '{order:1;}' +
      '[class*="_panelList"] [class*="_moreAnchor"]{order:2;}' + FOOTER_CSS;
  }
  function applyOrder() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById(ORDER_ID);
      if (!el) { el = document.createElement('style'); el.id = ORDER_ID; document.head.appendChild(el); }
      var text = orderCss();
      if (el.textContent !== text) el.textContent = text;
    } catch (e) { /* dsh's order stays */ }
  }
  function applyCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return false;
      applyOrder();
      var text = css();
      var el = document.getElementById(STYLE_ID);
      if (!text) { if (el && el.parentNode) el.parentNode.removeChild(el); return false; }
      if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
      el.textContent = text;
      return true;
    } catch (e) { if (CC.warn) CC.warn('sidebar settings rule skipped', e); return false; }
  }

  CC.settings = { storageKey: KEY, styleId: STYLE_ID, entries: entries, isOn: isOn, set: set, subscribe: subscribe,
    css: css, orderCss: orderCss, footerCss: FOOTER_CSS, apply: applyCss, reload: function () { cache = null; return load(); } };

  // ---- page -----------------------------------------------------------------------------------
  // Built from the kit (ui.js): one header, a left-aligned 960 px column, flat hairline sections.
  // Pages (Waypoint's sidebar rows, in sidebar order), Chat app (dsh's own rows), Waypoint (server
  // status, models and connectors, add-ons; all through CC.wpc), About (plugin version and the
  // Waypoint server). Every switch row is 32 px and the whole row flips its switch.
  var PAGE_CSS = [
    '.cc-root.cc-set{min-height:100%;}',
    '.cc-root .cc-set-sec .cc-sec-h{padding:0 8px;}',
    '.cc-root .cc-set-sw{display:inline-flex;align-items:center;}',
    '.cc-root .cc-set-off .cc-r-t{color:var(--cc-text-2);}',
    '.cc-root .cc-set-about .cc-r-m{font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-err{color:var(--cc-error);}',
    '.cc-root .cc-set-sub{padding:12px 8px 4px;font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-fix{padding:4px 8px;font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-status{padding:6px 8px;font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-floor{width:44px;margin-left:8px;text-align:right;font:inherit;}',
    '.cc-root .cc-set-pool{display:inline-flex;align-items:center;}'
  ].join('');
  CC.settings.pageCss = PAGE_CSS;
  function ensurePageCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById('cc-settings-page');
      if (!el) { el = document.createElement('style'); el.id = 'cc-settings-page'; document.head.appendChild(el); }
      if (el.textContent !== PAGE_CSS) el.textContent = PAGE_CSS;
    } catch (e) { /* cosmetic only */ }
  }

  function Row(props) {
    var U = CC.ui, e = props.entry;
    function flip(ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); props.onToggle(e.id, !props.on); }
    // Settings rule (same in Pages, Chat app and Models): the switch leads the row, the label follows,
    // any hint is the row's meta on the right.
    return U.Row({ key: e.id, id: e.id, className: 'cc-set-row' + (props.on ? '' : ' cc-set-off'), title: e.label, meta: e.hint || null,
      onClick: flip,
      // The switch's own click must not also reach the row (that would flip twice).
      lead: CC.h('span', { className: 'cc-set-sw', onClick: function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); } },
        U.Toggle({ id: e.id, checked: !!props.on, label: e.label, onChange: function () { flip(); } })) });
  }

  // ---- Waypoint section (dsh 2.0): everything through CC.wpc (wpc_client.js), never the retired engine ----
  var REFRESH = ['ops_read'];
  var FIX = ['Start it with ', 'python -m waypoint_runner.wpc_http', ' in the Core runner folder, or restart dsh (the plugin starts it).'];
  // How to turn each add-on on (plugin/INSTALL.md). Shown only while it is off.
  var ADDONS = [
    { id: 'preferences', label: 'Preferences', how: 'Set prefs_tools in ~/.waypoint/config.json to a folder with mcp_preferences.py, then restart dsh.' },
    { id: 'brain', label: 'Brain', how: 'Needs brain_tools in Waypoint Core (runner/waypoint_runner). Update Core, then restart dsh.' },
    { id: 'learn', label: 'Learn', how: 'Needs learn_tools in Waypoint Core (runner/waypoint_runner). Update Core, then restart dsh.' },
    { id: 'toolbox', label: 'Toolbox', how: 'Add a toolbox.json file to your Waypoint data folder.' }
  ];
  var STATE_WORDS = { up: 'Up', down: 'Down', disabled: 'Off' };

  // Up when features answered and no read since says the server is gone; a refusal is not "down".
  function serverState(features, featuresError, opsError) {
    var down = (featuresError && featuresError.code === 'server_down') || (opsError && opsError.code === 'server_down');
    if (down) return { up: false, down: true, checking: false };
    if (features) return { up: true, down: false, checking: false };
    if (featuresError) return { up: false, down: false, checking: false, error: featuresError };
    return { up: false, down: false, checking: true };
  }
  function parseFloor(text) {
    var t = String(text == null ? '' : text).trim().replace(/%$/, '').trim();
    var bad = { ok: false, message: 'Floor must be a number from 0 to 100, or blank.' };
    if (!t) return { ok: true, value: null };
    if (!/^\d+(\.\d+)?$/.test(t)) return bad;
    var n = Number(t);
    return n >= 0 && n <= 100 ? { ok: true, value: n } : bad;
  }
  function toggleInput(id, on) { return { id: String(id), enabled: !!on }; }
  function floorInput(pool, value) { return { pool: String(pool), min_percent: value == null ? null : value }; }
  function errText(e) { return (e && (e.message || e.code)) || 'Refused.'; }
  // Each write waits for the server's answer and returns a status line {text, error}.
  function doToggle(cc, id, on, label) {
    var name = label || id;
    return cc.wpc.act('toggle_set', toggleInput(id, on), REFRESH).then(function (r) {
      var now = r && typeof r.enabled === 'boolean' ? r.enabled : !!on;
      return { text: name + ' switched ' + (now ? 'on.' : 'off.'), error: false };
    }, function (e) { return { text: 'Could not switch ' + name + ': ' + errText(e), error: true }; });
  }
  function doFloor(cc, pool, text) {
    var f = parseFloor(text);
    if (!f.ok) return Promise.resolve({ text: f.message, error: true });
    return cc.wpc.act('floor_set', floorInput(pool, f.value), REFRESH).then(function () {
      return { text: 'Floor for ' + pool + (f.value == null ? ' cleared.' : ' set to ' + f.value + '%.'), error: false };
    }, function (e) { return { text: 'Could not set the floor for ' + pool + ': ' + errText(e), error: true }; });
  }
  function providerMeta(p) {
    var w = STATE_WORDS[p.state] || (p.enabled ? 'Up' : 'Off');
    return p.state === 'down' && p.reason ? w + ': ' + p.reason : w;
  }

  function Sub(title) { return CC.h('div', { key: 'h-' + title, className: 'cc-set-sub' }, title); }
  function stop(ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); }

  function ServerPart(p) {
    var h = CC.h, U = CC.ui, s = serverState(p.features, p.featuresError, p.opsError);
    var words = s.down ? 'Not running' : s.up ? 'Running' : s.checking ? 'Checking' : 'Could not answer: ' + errText(s.error);
    var rows = [
      U.Row({ key: 'st', id: 'server', title: 'Waypoint server', meta: h('span', { className: s.up || s.checking ? undefined : 'cc-set-err' }, words) }),
      U.Row({ key: 'dd', id: 'data-dir', title: 'Data folder', meta: (p.features && p.features.data_dir) || '–' })
    ];
    return h('div', { 'data-part': 'server' }, Sub('Server'), U.List({ label: 'Waypoint server', children: rows }),
      s.down ? h('div', { className: 'cc-set-fix' }, FIX[0], h('code', { key: 'c' }, FIX[1]), FIX[2]) : null);
  }

  function ProviderRow(p) {
    var h = CC.h, U = CC.ui, pr = p.provider, label = pr.label || pr.id, busy = p.busy === 'toggle:' + pr.id;
    function flip(ev) { stop(ev); if (!busy) p.onToggle(pr.id, !pr.enabled, label); }
    return U.Row({ key: pr.id, id: 'prov-' + pr.id, className: 'cc-set-row' + (pr.enabled ? '' : ' cc-set-off'), title: label,
      meta: h('span', { className: pr.state === 'down' ? 'cc-set-err' : undefined }, providerMeta(pr)), onClick: flip,
      lead: h('span', { className: 'cc-set-sw', onClick: stop },
        U.Toggle({ id: pr.id, checked: !!pr.enabled, label: label, disabled: busy, onChange: function () { flip(); } })) });
  }

  function PoolRow(p) {
    var h = CC.h, U = CC.ui, pl = p.pool, busy = p.busy === 'floor:' + pl.pool;
    function send(ev) { if (!busy) p.onFloor(pl.pool, ev && ev.target ? ev.target.value : ''); }
    return U.Row({ key: pl.pool, id: 'pool-' + pl.pool, title: pl.pool, sub: pl.provider ? ' · ' + pl.provider : null,
      meta: h('span', { className: 'cc-set-pool' },
        U.Meter({ value: pl.remaining_percent, label: 'left', tone: pl.below_floor ? 'low' : undefined }),
        h('label', { className: 'cc-set-pool' }, ' floor',
          h('input', { key: pl.pool + ':' + pl.floor, type: 'text', inputMode: 'numeric', className: 'cc-set-floor',
            'data-floor': pl.pool, 'aria-label': 'Floor for ' + pl.pool, placeholder: '0', disabled: busy,
            defaultValue: pl.floor == null ? '' : String(pl.floor), onBlur: send,
            onKeyDown: function (ev) { if (ev && ev.key === 'Enter' && ev.target && ev.target.blur) ev.target.blur(); } }), '%')) });
  }

  function ModelsPart(p) {
    var h = CC.h, U = CC.ui, ops = p.ops, body;
    if (!ops) {
      body = p.opsError ? CC.WpcProblem({ error: p.opsError }) : U.Empty({ title: p.loading === false ? 'No data yet' : 'Loading…' });
    } else {
      var provs = ops.providers || [], pools = ops.pools || [];
      if (!provs.length && !pools.length) {
        body = U.Empty({ title: 'No models or connectors yet', body: 'Waypoint lists them from the agents folder in your data folder.' });
      } else {
        body = [
          p.opsError ? U.Banner({ key: 'bn', tone: 'warn', children: 'Could not refresh: ' + errText(p.opsError) }) : null,
          provs.length ? U.List({ key: 'pv', label: 'Models and connectors',
            children: provs.map(function (pr) { return ProviderRow({ provider: pr, busy: p.busy, onToggle: p.onToggle }); }) }) : null,
          pools.length ? Sub('Usage floors') : null,
          pools.length ? U.List({ key: 'pl', label: 'Usage floors',
            children: pools.map(function (pl) { return PoolRow({ pool: pl, busy: p.busy, onFloor: p.onFloor }); }) }) : null
        ];
      }
    }
    return h('div', { 'data-part': 'models' }, Sub('Models and connectors'), body,
      p.status ? h('div', { className: 'cc-set-status' + (p.status.error ? ' cc-set-err' : ''), role: 'status' }, p.status.text) : null);
  }

  function AddonsPart(p) {
    var h = CC.h, U = CC.ui, addons = p.features && p.features.addons;
    var body = !addons ? U.Empty({ title: 'Add-ons show when the Waypoint server is running.' })
      : U.List({ label: 'Add-ons', children: ADDONS.map(function (a) {
        var on = !!addons[a.id];
        return U.Row({ key: a.id, id: 'addon-' + a.id, className: on ? undefined : 'cc-set-off', title: a.label,
          sub: on ? null : ' ' + a.how, meta: on ? 'On' : 'Off', wrap: !on });
      }) });
    return h('div', { 'data-part': 'addons' }, Sub('Add-ons'), body);
  }

  function WaypointSection(p) {
    return CC.ui.Section({ key: 'wp', title: 'Waypoint', section: 'settings-waypoint', boxRef: p.boxRef, className: 'cc-set-sec',
      children: [ServerPart(p), ModelsPart(p), AddonsPart(p)] });
  }

  CC.settingsInternals = { serverState: serverState, parseFloor: parseFloor, toggleInput: toggleInput, floorInput: floorInput,
    doToggle: doToggle, doFloor: doFloor, providerMeta: providerMeta, ADDONS: ADDONS, WaypointSection: WaypointSection };

  // Open Settings scrolled to its Waypoint section (old cc-agents route, "Open Agents" links).
  CC.openSettingsAgents = function () {
    CC.settingsFocus = 'agents';
    try { if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') CC.ctx.layout.selectPanel('cc-settings'); } catch (e) { /* no layout */ }
  };

  var NO_DATA = { data: null, error: null, loading: false };
  var NO_SERVER = { code: 'server_down', message: 'The Waypoint client is not loaded.' };
  CC.SettingsPage = function SettingsPage() {
    var h = CC.h, React = CC.React, U = CC.ui;
    ensurePageCss();
    var st = React.useState(0), bump = st[1];
    React.useEffect(function () { return subscribe(function () { bump(function (n) { return n + 1; }); }); }, []);
    function toggle(id, on) { set(id, on); bump(function (n) { return n + 1; }); }
    var all = entries().filter(function (e) { return !e.locked; });
    function group(title, key) {
      var rows = all.filter(function (e) { return e.group === key; });
      var on = rows.filter(function (e) { return isOn(e.id); }).length;
      return U.Section({ key: key, title: title, meta: on + ' of ' + rows.length + ' shown', section: 'settings-' + key, className: 'cc-set-sec',
        children: U.List({ label: title, children: rows.map(function (e) { return h(Row, { key: e.id, entry: e, on: isOn(e.id), onToggle: toggle }); }) }) });
    }
    // Waypoint server: features once (cached by CC.wpc), ops_read every 15 s and after every write.
    var hasWpc = !!(CC.wpc && typeof CC.useWpc === 'function');
    var fs = React.useState({ features: null, error: null }), feat = fs[0], setFeat = fs[1];
    React.useEffect(function () {
      if (!hasWpc) return undefined;
      var alive = true;
      CC.wpc.features().then(function (f) { if (alive) setFeat({ features: f, error: null }); },
        function (e) { if (alive) setFeat({ features: null, error: e }); });
      return function () { alive = false; };
    }, []);
    var ops = hasWpc ? CC.useWpc('ops_read', {}, { every: 15000 }) : NO_DATA;
    var featErr = hasWpc ? feat.error : NO_SERVER;
    var bs = React.useState(null), busy = bs[0], setBusy = bs[1];
    var ss = React.useState(null), status = ss[0], setStatus = ss[1];
    function run(key, p) { setBusy(key); return p.then(function (msg) { setBusy(null); setStatus(msg); }); }
    var wpRef = React.useRef(null);
    React.useEffect(function () {
      if (CC.settingsFocus !== 'agents') return;
      CC.settingsFocus = null;
      try { if (wpRef.current && wpRef.current.scrollIntoView) wpRef.current.scrollIntoView({ block: 'start' }); } catch (e) { /* cosmetic */ }
    }, []);
    var waypoint = WaypointSection({ boxRef: wpRef, features: feat.features, featuresError: featErr,
      ops: ops.data, opsError: ops.error, loading: ops.loading, busy: busy, status: status,
      onToggle: function (id, on, label) { if (hasWpc) run('toggle:' + id, doToggle(CC, id, on, label)); },
      onFloor: function (pool, text) { if (hasWpc) run('floor:' + pool, doFloor(CC, pool, text)); } });
    var srv = serverState(feat.features, featErr, ops.error);
    var addr = String((CC.wpc && CC.wpc.base) || 'http://127.0.0.1:8762').replace(/^https?:\/\//, '');
    var about = U.Section({ key: 'about', title: 'About', section: 'settings-about', className: 'cc-set-sec cc-set-about',
      children: U.List({ label: 'About', children: [
        U.Row({ key: 'v', title: 'Waypoint for dsh', meta: CC.version ? 'Version ' + CC.version : '–' }),
        U.Row({ key: 's', title: 'Waypoint server', meta: h('span', { className: srv.up || srv.checking ? undefined : 'cc-set-err' },
          (srv.up ? 'Running' : srv.checking ? 'Checking' : 'Not running') + ' · ' + addr) })
      ] }) });
    return U.Page({ className: 'cc-set', page: 'settings', col: true,
      header: U.PageHeader({ title: 'Settings', pageId: 'cc-settings' }),
      children: [group('Pages', 'tabs'), group('Chat app', 'dsh'), waypoint, about] });
  };
})(CC);

		// ── topbar.js
(function (CC) {
  // Header status: the compact app-wide status at the right end of every page header
  // (CC.ui.PageHeader renders CC.HeaderStatus), so no page needs a second bar.
  // - Sync chip: the current work mode (Cloud or Local) and a dot only when something waits
  //   (a merge, a clash, or updates held back by local edits). Click opens a small popover with the
  //   mode switch, one status line, the waiting repos and 'Update local files' when a merge is needed.
  // - Core chip: only when Waypoint Core is down or speaks another API (api.js CC.core), a quiet
  //   error chip whose popover says how to start it. While Core is down the sync chip is hidden.
  // Engine routes (engine/cc_engine/sync.py): GET /api/sync/status, POST /api/sync/mode,
  // POST /api/sync/open (fast-forward clean repos; run once per page load), POST /api/sync/pull.
  var MODES = ['Cloud', 'Local'];
  var opened = false;
  // Last status this page load saw: a tab switch remounts the header, which then shows the known
  // mode at once instead of an empty chip while the (slow) status read runs again.
  var known = null;
  // The chip reads the same on every page: the current mode, else the last mode seen (kept across
  // reloads), else Local. Never a placeholder word.
  var MODE_KEY = 'WAYPOINT_SYNC_MODE';
  var DEFAULT_MODE = 'Local';
  function readMode() {
    try { var v = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_KEY) : null; return MODES.indexOf(v) >= 0 ? v : null; } catch (e) { return null; }
  }
  var lastMode = null;
  function remember(s) {
    var m = s && s.mode;
    if (MODES.indexOf(m) < 0 || m === lastMode) return;
    lastMode = m;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(MODE_KEY, m); } catch (e) { /* storage blocked */ }
  }
  function modeOf(s) {
    if (s && MODES.indexOf(s.mode) >= 0) return s.mode;
    if (!lastMode) lastMode = readMode();
    return lastMode || DEFAULT_MODE;
  }

  function names(list) {
    var n = (list || []).map(function (x) { return x && x.name; }).filter(Boolean);
    if (!n.length) return '';
    if (n.length === 1) return n[0];
    if (n.length === 2) return n[0] + ' and ' + n[1];
    return n.length + ' repos';
  }
  function hm(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function repos(status) { return (status && status.repos) || []; }
  function needsMerge(status) {
    return !!status && (status.needs_merge === true || repos(status).some(function (r) { return r.state === 'diverged'; }));
  }
  function summary(status) {
    if (!status) return '';
    var rs = repos(status);
    var clash = rs.filter(function (r) { return r.conflict; });
    if (clash.length) return names(clash) + ' needs you: changes clash';
    var merge = rs.filter(function (r) { return r.state === 'diverged'; });
    if (merge.length) return names(merge) + ' changed in the cloud and here';
    var last = status.last || {};
    if (last.updated && last.updated.length) {
      var at = last.at ? hm(last.at) : '';
      return 'Updated ' + names(last.updated) + ' from GitHub' + (at ? ' at ' + at : '');
    }
    var waiting = waitingRepos(status);
    if (waiting.length) return 'Sync paused · ' + names(waiting) + (waiting.length === 1 ? ' has' : ' have') + ' local edits';
    return 'Local files are up to date';
  }
  // Repos whose GitHub updates were not applied because of local edits (the last open's skip list,
  // else any repo behind with edits), as full rows where the status has them.
  function waitingRepos(status) {
    if (!status) return [];
    var rs = repos(status);
    var last = status.last || {};
    if ((last.skipped || []).length) {
      return last.skipped.map(function (x) {
        var n = x && (x.name || x);
        return rs.filter(function (r) { return r.name === n; })[0] || (typeof x === 'object' ? x : { name: n });
      });
    }
    return rs.filter(function (r) { return r.behind > 0 && (r.state === 'dirty' || r.state === 'merging'); });
  }
  function paused(status) {
    if (!status || needsMerge(status) || repos(status).some(function (r) { return r.conflict; })) return false;
    var last = status.last || {};
    return !(last.updated && last.updated.length) && waitingRepos(status).length > 0;
  }

  // Tone of the status: calm when nothing needs you, accent when a merge waits, red on a clash.
  // A repo that waited on local edits is neither good nor bad news, so it stays neutral.
  function tone(status) {
    if (!status) return null;
    if (repos(status).some(function (r) { return r.conflict; })) return 'error';
    if (needsMerge(status)) return 'accent';
    var last = status.last || {};
    if (!(last.updated && last.updated.length) && paused(status)) return 'neutral';
    return 'calm';
  }
  // The chip carries a dot only when something waits; a calm status shows the mode alone.
  function waits(status) { var t = tone(status); return t === 'error' || t === 'accent' || t === 'neutral'; }

  // Every colour, type size and radius comes from tokens.js (var(--cc-*)). The chip is a quiet
  // hairline control; the popover is the one raised surface (hairline border, no shadow).
  var CSS = [
    '.cc-root .cc-hs{position:relative;display:flex;align-items:center;gap:var(--cc-space-2);flex:none;}',
    '.cc-root .cc-hs-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 var(--cc-space-2);border:1px solid var(--cc-line);',
    'border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text-2);font:inherit;font-size:var(--cc-fs-label);font-weight:500;',
    'line-height:1;white-space:nowrap;cursor:pointer;transition:background var(--cc-fast) var(--cc-ease),color var(--cc-fast) var(--cc-ease);}',
    '.cc-root .cc-hs-chip:hover{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-hs-chip[aria-expanded="true"]{background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root .cc-hs-chip[data-tone="error"]{color:var(--cc-error);}',
    '.cc-root .cc-hs-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-neutral);}',
    '.cc-root .cc-hs-dot[data-tone="calm"]{background:var(--cc-done);}',
    '.cc-root .cc-hs-dot[data-tone="accent"]{background:var(--cc-accent);}',
    '.cc-root .cc-hs-dot[data-tone="error"]{background:var(--cc-error);}',
    '.cc-root .cc-hs-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:50;width:320px;max-width:calc(100vw - 32px);',
    'padding:var(--cc-space-3);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);',
    'color:var(--cc-text);font-size:var(--cc-fs-label);line-height:1.45;text-align:left;}',
    '.cc-root .cc-hs-panel{display:flex;flex-direction:column;gap:var(--cc-space-2);min-width:0;}',
    '.cc-root .cc-hs-seg{display:flex;gap:2px;padding:2px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);}',
    '.cc-root .cc-hs-seg button{flex:1 1 0;height:24px;border:0;border-radius:calc(var(--cc-r-control) - 2px);background:transparent;',
    'color:var(--cc-text-2);font:inherit;font-size:var(--cc-fs-label);font-weight:500;padding:0 10px;cursor:pointer;}',
    '.cc-root .cc-hs-seg button:hover:not(:disabled):not([aria-checked="true"]){color:var(--cc-text);}',
    '.cc-root .cc-hs-seg button[aria-checked="true"]{background:var(--cc-surface);box-shadow:0 0 0 1px var(--cc-line);color:var(--cc-text);}',
    '.cc-root .cc-hs-seg button:disabled{cursor:default;}',
    '.cc-root .cc-hs-seg button:disabled:not([aria-checked="true"]){color:var(--cc-text-3);}',
    '.cc-root .cc-hs-line{display:flex;align-items:center;gap:var(--cc-space-2);min-width:0;color:var(--cc-text-2);}',
    '.cc-root .cc-hs-line>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-hs-line[data-tone="error"]{color:var(--cc-error);}',
    '.cc-root .cc-hs-repos{border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-hs-repo{display:flex;flex-direction:column;gap:2px;padding:6px 0;border-bottom:1px solid var(--cc-line);min-width:0;}',
    '.cc-root .cc-hs-repo b{font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-hs-meta{color:var(--cc-text-3);font-size:var(--cc-fs-meta);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-hs-path{font-family:var(--cc-mono);font-size:var(--cc-fs-meta);color:var(--cc-text-3);user-select:all;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-hs-t{font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-hs-b{color:var(--cc-text-2);}',
    '.cc-root .cc-hs-b code{font-family:var(--cc-mono);font-size:var(--cc-fs-meta);padding:1px 4px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root .cc-hs-act{display:flex;justify-content:flex-end;}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-hs-chip{transition:none;}}'
  ].join('');
  function ensureCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById('cc-topbar-css');
      if (!el) { el = document.createElement('style'); el.id = 'cc-topbar-css'; document.head.appendChild(el); }
      if (el.textContent !== CSS) el.textContent = CSS;
    } catch (e) { /* cosmetic only */ }
  }

  // The sync popover's body: mode switch first, then one line, the waiting repos, and the merge
  // action. Nothing is checked until a status has arrived.
  function View(props) {
    var h = CC.h, s = props.status, mode = s && s.mode;
    var line = props.note || summary(s);
    var t = props.note ? 'error' : tone(s);
    var waiting = paused(s) && !props.note ? waitingRepos(s) : [];
    return h('div', { className: 'cc-hs-panel', 'data-cc': 'sync-panel' },
      h('div', { className: 'cc-hs-seg', role: 'radiogroup', 'aria-label': 'Work mode' }, MODES.map(function (m) {
        return h('button', { key: m, type: 'button', role: 'radio', 'aria-checked': mode === m, disabled: !s || !!props.busy,
          onClick: function () { if (s && mode !== m) props.onMode(m); } }, m);
      })),
      line ? h('div', { className: 'cc-hs-line', 'data-tone': t, title: line },
        h('i', { className: 'cc-hs-dot', 'data-tone': t, 'aria-hidden': 'true' }), h('span', null, line)) : null,
      waiting.length ? h('div', { className: 'cc-hs-repos', role: 'list', 'aria-label': 'Repos waiting' },
        waiting.map(function (r) {
          var bits = [r.behind > 0 ? r.behind + (r.behind === 1 ? ' update' : ' updates') + ' waiting' : null, 'local edits'].filter(Boolean);
          return h('div', { key: r.name, className: 'cc-hs-repo', role: 'listitem' },
            h('span', null, h('b', null, r.name), h('span', { className: 'cc-hs-meta' }, ' · ' + bits.join(', '))),
            r.path ? h('span', { className: 'cc-hs-path', title: r.path }, r.path) : null);
        })) : null,
      needsMerge(s) ? h('div', { className: 'cc-hs-act' },
        h('button', { type: 'button', className: 'cc-b cc-b-primary cc-b-sm', disabled: !!props.busy, onClick: function () { props.onPull(); } },
          'Update local files')) : null);
  }

  // The sync chip: mode, plus a dot only when something waits (or the last action failed).
  function Chip(props) {
    var h = CC.h, s = props.status;
    var t = props.note ? 'error' : tone(s);
    var dot = !!props.note || waits(s);
    var line = props.note || summary(s);
    return h('button', { type: 'button', className: 'cc-hs-chip', 'data-cc': 'sync-chip', 'aria-haspopup': 'dialog',
      'aria-expanded': !!props.open, 'aria-label': 'Sync: ' + modeOf(s) + (line ? '. ' + line : ''), title: line || undefined,
      onClick: function () { if (props.onToggle) props.onToggle(); } },
      dot ? h('i', { className: 'cc-hs-dot', 'data-tone': t, 'aria-hidden': 'true' }) : null,
      modeOf(s));
  }

  function coreLabel(core) {
    if (!core) return '';
    if (core.state === 'down') return 'Waypoint server offline';
    if (core.state === 'mismatch') return 'Core API ' + core.api + ', needs ' + CC.CORE_API;
    return '';
  }
  function CoreChip(props) {
    var h = CC.h;
    return h('button', { type: 'button', className: 'cc-hs-chip', 'data-cc': 'core-chip', 'data-tone': 'error', 'aria-haspopup': 'dialog',
      'aria-expanded': !!props.open, onClick: function () { if (props.onToggle) props.onToggle(); } },
      h('i', { className: 'cc-hs-dot', 'data-tone': 'error', 'aria-hidden': 'true' }), coreLabel(props.core));
  }
  // How to get Core back: generic words, no paths.
  function CorePanel(props) {
    var h = CC.h, core = props.core || {};
    if (core.state === 'mismatch') {
      return h('div', { className: 'cc-hs-panel', 'data-cc': 'core-panel' },
        h('div', { className: 'cc-hs-t' }, 'Waypoint Core speaks API ' + core.api),
        h('div', { className: 'cc-hs-b' }, 'This plugin needs API ' + CC.CORE_API + '. Update Waypoint for dsh or Core so both match.'));
    }
    return h('div', { className: 'cc-hs-panel', 'data-cc': 'core-panel' },
      h('div', { className: 'cc-hs-t' }, 'Waypoint Core is not running'),
      h('div', { className: 'cc-hs-b' }, 'Start it with ', h('code', null, 'waypoint start'), ' or the Core start script. Pages reconnect by themselves.'));
  }

  // One status read; the first in a page load also fast-forwards clean repos. Never throws.
  function load(cb) {
    var first = !opened;
    opened = true;
    var p = first ? CC.api.post('/api/sync/open', {}) : CC.api.get('/api/sync/status');
    return p.then(function (s) { known = s || null; remember(known); cb(known); }, function () { if (first) opened = false; known = null; cb(null); });
  }

  function coreBad(core) { return !!core && (core.state === 'down' || core.state === 'mismatch'); }

  CC.HeaderStatus = function HeaderStatus() {
    var React = CC.React, h = CC.h;
    ensureCss();
    var st = React.useState(known), status = st[0], setStatus = st[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var nt = React.useState(null), note = nt[0], setNote = nt[1];
    var op = React.useState(null), open = op[0], setOpen = op[1];
    var core = typeof CC.useCore === 'function' ? CC.useCore() : (CC.core || null);
    var bad = coreBad(core);
    React.useEffect(function () {
      if (!open || typeof document === 'undefined' || !document.addEventListener) return undefined;
      var close = function (ev) {
        var t = ev && ev.target;
        if (t && t.closest && t.closest('.cc-hs')) return;
        setOpen(null);
      };
      var esc = function (ev) { if (ev && ev.key === 'Escape') setOpen(null); };
      document.addEventListener('mousedown', close);
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, [open]);
    React.useEffect(function () {
      var alive = true;
      load(function (s) { if (alive) setStatus(s); });
      var off = CC.api.subscribe ? CC.api.subscribe(function (kind, data) {
        if (kind === 'run' && data && data.sync) CC.api.get('/api/sync/status').then(function (s) { known = s || known; remember(s); if (alive) setStatus(s); }, function () {});
      }) : function () {};
      return function () { alive = false; off(); };
    }, []);
    // Core came back after a failed first read: read the sync status again (the open runs again too).
    var coreState = core && core.state;
    var mounted = React.useRef(false);
    React.useEffect(function () {
      if (!mounted.current) { mounted.current = true; return undefined; } // the mount read above covers it
      if (coreState !== 'ok' || known) return undefined;
      var alive = true;
      load(function (s) { if (alive) setStatus(s); });
      return function () { alive = false; };
    }, [coreState]);
    function act(path, body) {
      setBusy(true);
      setNote(null);
      CC.api.post(path, body).then(function (s) { known = s || known; remember(s); setStatus(s); setBusy(false); }, function (e) {
        setBusy(false);
        setNote((e && e.data && e.data.detail) || 'Could not reach Waypoint Core');
      });
    }
    function flip(which) { setOpen(function (o) { return o === which ? null : which; }); }
    var pop = function (which, body) {
      return open === which ? h('div', { className: 'cc-hs-pop', role: 'dialog', 'aria-label': which === 'core' ? 'Waypoint Core' : 'Sync' }, body) : null;
    };
    var items = [];
    if (bad) {
      items.push(h(CoreChip, { key: 'core', core: core, open: open === 'core', onToggle: function () { flip('core'); } }));
      items.push(pop('core', h(CorePanel, { core: core })));
    } else {
      // Always the chip (same place, same words on every page); before a status arrives the popover
      // shows the mode switch disabled with nothing checked.
      items.push(h(Chip, { key: 'sync', status: status, note: note, open: open === 'sync', onToggle: function () { flip('sync'); } }));
      items.push(pop('sync', h(View, { status: status, busy: busy, note: note,
        onMode: function (m) { act('/api/sync/mode', { mode: m }); },
        onPull: function () { act('/api/sync/pull', {}); } })));
    }
    return h('div', { className: 'cc-hs', 'data-cc': 'header-status' }, items);
  };
  // Older name kept so any caller still gets the same status element.
  CC.TopBar = CC.HeaderStatus;

  CC.topbar = { css: CSS, summary: summary, needsMerge: needsMerge, tone: tone, paused: paused, waits: waits, waitingRepos: waitingRepos,
    View: View, Chip: Chip, modeOf: modeOf, CoreChip: CoreChip, CorePanel: CorePanel, coreLabel: coreLabel, load: load, modes: MODES };
})(CC);

		// ── workspace_hide.js
(function (CC) {
  // E2: no workspace picker (the owner finds workspaces confusing).
  //
  // Public routes used (dsh files are never edited):
  // - `conversation.hero.workspace` is a replaceable `single` seat (ui-conversation contract). Its
  //   owner props are {open, anchorRef, selectedId, onPick(workspaceId), onClose}. We register an
  //   occupant below the official picker's priority that renders nothing, closes itself if opened,
  //   and calls onPick(<home workspace>) once when a blank New Session sits anywhere else, so new
  //   sessions start in one home folder. The home folder is configured, never hard-coded: CC.DRIVE_PATH,
  //   window.WAYPOINT_HOME_WORKSPACE, localStorage WAYPOINT_HOME_WORKSPACE, or Core's GET /api/toggles
  //   `home_workspace` (or /health) (in that order). With none set, new sessions stay where dsh puts them. The
  //   workspace id comes from ctx.workspaces.list (read through ctx.get, so nothing new is
  //   injected); it is never created here.
  // - The hero chip that opens the picker, the Workspaces section label, the workspace group rows
  //   and Add workspace have no public option, so one scoped style rule hides them.
  // Known limit: hiding a workspace group row also hides the sessions of a group that is collapsed;
  // dsh's own View options > Group by flat lists every session without workspaces.
  // Settings 'Workspaces' (settings.js, off by default) brings all of it back at once.
  // Waypoint code that deliberately opens a blank session in another workspace (a worktree,
  // say) calls CC.workspaceHide.expect(workspaceId) first so it is not moved to the home folder.
  var SLOT = 'conversation.hero.workspace';
  var PRIORITY = -10;
  var STYLE_ID = 'cc-hide-workspaces';
  var HOME_KEY = 'WAYPOINT_HOME_WORKSPACE';
  var LABELS = { choose: ['Choose workspace', '选择工作区'], add: ['Add workspace', '添加工作区'] };

  function warn(what, err) { if (CC.warn) CC.warn(what, err); }
  function q(s) { return String(s).replace(/["\\]/g, ''); }
  function norm(p) { return String(p || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase(); }

  function hidden() { return !(CC.settings && CC.settings.isOn && CC.settings.isOn('workspaces')); }

  // Review 2 (53): on a Waypoint page (its frame, [data-cc-frame], is on screen) dsh's whole session browser (header with
  // search + view options, and the rows) is hidden, so it never floats mid-sidebar once a blank session
  // exists. Chat pages keep it. The browser is the workspace package's root: the `_root` whose direct
  // child is the `_sectionHeader` and which holds the `_listArea`.
  // Everywhere, an untitled blank session (dsh renders it not draggable, unlike every other live row)
  // is left out of the list; the rule only applies where draggable rows exist, so a view without
  // dragging never hides its rows.
  var BROWSER = '[class*="_root"]:has(> [class*="_sectionHeader"]):has([class*="_listArea"])';
  // v4 (the owner: no search and filter buttons): the browser's header (search + view options) is
  // hidden on every page; its rows, which are the owner's chats, stay on chat pages.
  var WAYPOINT_CSS = BROWSER + ' > [class*="_sectionHeader"]{display:none;}' +
    'body:has([data-cc-frame]) ' + BROWSER + '{display:none;}' +
    '[class*="_listArea"]:has([data-row-key^="session:"][draggable="true"]) ' +
    '[data-row-key^="session:"][draggable="false"]:not([class*="_archived"]){display:none;}';

  // dsh's composer access chip still says "Workspace Write" after workspaces were dropped (112).
  // Its label is a text node React owns, so the chip is relabelled in CSS only (the text stays for
  // screen readers through the button's own aria-label). Only labels listed here change.
  var CHIP = { 'Workspace Write': 'Can edit' };
  function chipLabel(text) { return Object.prototype.hasOwnProperty.call(CHIP, text) ? CHIP[text] : null; }
  function chipCss() {
    return Object.keys(CHIP).map(function (k) {
      // The button is a flex row (icon, label, chevron): the label hides, ::after carries the new
      // words and `order` puts them back before the chevron.
      var b = 'button[aria-label="Access mode, current: ' + q(k) + '"]';
      return b + ' [class*="_triggerLabel"]{display:none;}' + b + '::after{content:"' + q(chipLabel(k)) + '";order:1;}' +
        b + ' [class*="_chevron"]{order:2;}';
    }).join('');
  }

  function css() {
    var sel = ['[class*="_listArea"] [data-row-key^="workspace:"]', '[data-row-key^="workspace:"][role="treeitem"]',
      '[class*="_sectionHeader"] [class*="_sectionLabel"]'];
    LABELS.add.forEach(function (l) { sel.push('[class*="_sectionHeader"] button[aria-label="' + q(l) + '"]'); });
    LABELS.choose.forEach(function (l) { sel.push('[class*="_heroWorkspaceRow"] button[aria-label="' + q(l) + '"]'); });
    return sel.join(',') + '{display:none;}' + WAYPOINT_CSS + chipCss();
  }
  function syncCss(on) {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById(STYLE_ID);
      if (!on) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
      if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
      el.textContent = css();
    } catch (e) { warn('workspace hide rule skipped', e); }
  }

  function service(ctx) {
    try {
      if (!ctx) return null;
      if (typeof ctx.get === 'function') return ctx.get('workspaces') || null;
      return ctx.workspaces || null;
    } catch (e) { return null; }
  }
  function items(ctx) {
    try {
      var ws = service(ctx);
      var snap = ws && ws.list && typeof ws.list.getSnapshot === 'function' ? ws.list.getSnapshot() : null;
      return (snap && snap.items) || [];
    } catch (e) { return []; }
  }
  // The configured home folder, or '' when none is set.
  function homePath() {
    try {
      if (CC.DRIVE_PATH) return String(CC.DRIVE_PATH);
      var g = typeof globalThis !== 'undefined' ? globalThis : {};
      if (g[HOME_KEY]) return String(g[HOME_KEY]);
      var stored = g.localStorage ? g.localStorage.getItem(HOME_KEY) : null;
      if (stored) return String(stored);
      if (CC.toggles && CC.toggles.state && CC.toggles.state.homeWorkspace) return String(CC.toggles.state.homeWorkspace);
      if (CC.core && CC.core.home) return String(CC.core.home);
    } catch (e) { /* storage blocked */ }
    return '';
  }
  function driveId(ctx) {
    var want = norm(homePath());
    if (!want) return null;
    var hit = items(ctx).filter(function (w) { return w && norm(w.path) === want; })[0];
    return hit ? hit.workspaceId : null;
  }

  var expected = new Set();
  function expect(id) { if (id) expected.add(id); }

  function DrivePicker(props) {
    var React = CC.React;
    var ctx = CC.ctx;
    var bump = React.useState(0)[1];
    React.useEffect(function () {
      var ws = service(ctx);
      if (!ws || !ws.list || typeof ws.list.subscribe !== 'function') return undefined;
      try { return ws.list.subscribe(function () { bump(function (n) { return n + 1; }); }); } catch (e) { return undefined; }
    }, []);
    var drive = driveId(ctx);
    var sel = props && props.selectedId;
    var open = !!(props && props.open);
    React.useEffect(function () {
      if (open && typeof props.onClose === 'function') { try { props.onClose(); } catch (e) { warn('workspace picker close failed', e); } }
    }, [open]);
    React.useEffect(function () {
      if (!drive || sel === drive || (sel && expected.has(sel)) || !props || typeof props.onPick !== 'function') return;
      try { props.onPick(drive); } catch (e) { warn('could not move the new session to the home folder', e); }
    }, [sel, drive]);
    return null;
  }

  var handle = null;
  function register(ctx) {
    if (handle || !ctx || !ctx.slots) return;
    var inner = null;
    try {
      var outer = ctx.slots.inject(SLOT, function () {
        try {
          inner = ctx.slots.register({ name: SLOT, priority: PRIORITY }, DrivePicker);
          return typeof inner === 'function' ? inner : function () {};
        } catch (e) { warn('workspace chooser replacement not registered; skipped', e); return function () {}; }
      });
      handle = function () {
        try { if (typeof outer === 'function') outer(); else if (typeof inner === 'function') inner(); } catch (e) { warn('workspace chooser restore failed', e); }
      };
    } catch (e) { warn('workspace chooser replacement not injected into slot "' + SLOT + '"; skipped', e); }
  }
  function unregister() {
    if (!handle) return;
    var h = handle;
    handle = null;
    h();
  }

  function sync() {
    var on = hidden();
    syncCss(on);
    if (on) register(CC.ctx); else unregister();
  }

  var listening = false;
  function apply(ctx) {
    if (ctx) CC.ctx = ctx;
    if (!listening && CC.settings && CC.settings.subscribe) {
      listening = true;
      CC.settings.subscribe(function (id) { if (id === 'workspaces') sync(); });
    }
    sync();
  }

  CC.workspaceHide = { apply: apply, sync: sync, css: css, styleId: STYLE_ID, slot: SLOT, driveId: driveId,
    expect: expect, Picker: DrivePicker, homePath: homePath, homeKey: HOME_KEY, waypointCss: WAYPOINT_CSS, chipLabel: chipLabel };
})(CC);

		// ── sidebar_chats.js
(function (CC) {
  // v4 S1: your chats in the left sidebar on Waypoint pages, Claude Code style: date groups with
  // compact rows (title, relative time, a quiet status dot), each chat's subagents in a collapsible
  // dropdown (collapsed by default, count shown). The owner asked to see chats in the sidebar with
  // each chat's subagents as a second dropdown.
  //
  // Public dsh routes only (dsh files are never edited):
  // - Seat: `sidebar.footer.action` (ui-sidebar contract, a list seat directly above Settings). On a
  //   Waypoint page workspace_hide.js hides dsh's session browser, so the region above is empty; the
  //   style rules below (all gated on this list being on screen) let the foot grow into that space.
  // - Sessions: ctx.sessions.list (SessionListState: ids in Host order, byId rows with displayTitle,
  //   updatedAt, running, blank, parentId, origin 'subagent'). Subagents are the rows whose parentId
  //   is the chat; retained fallback rows in byId count too.
  // - Archived / pinned sets: ctx.workspaces.list snapshot (archivedSessionIds, pinnedSessionIds).
  // - Open: ctx.uiWorkspace.openSession(target): a SessionId for a chat, the direct-parent
  //   SubagentAddress (ctx.sessions.subagentAddress, else mode 'unknown') for a subagent, as dsh's
  //   own subagent catalogue does.
  // - Open beside (subagents only): dsh's subagentchat resource in the right sidebar of the parent,
  //   ctx.sidebarRight.openResource(address, {kind: 'subagentchat'}), as dsh's "open aside" does.
  //   dsh has no split view for two top-level chats, so top-level rows offer no beside action.
  // Grouping is by date (Pinned, Today, Yesterday, Previous 7 days, Older): workspaces are
  // switched off and new chats all land in one home folder, so a workspace grouping would be one group.
  // Chat pages keep dsh's own rows (pin, rename, archive, drag); this list renders only on
  // Waypoint pages, so the two never show at once.
  var SLOT = 'sidebar.footer.action';
  var STYLE_ID = 'cc-sidebar-chats';
  var MAX_ROWS = 15;
  var MAX_DEPTH = 4;
  var DAY = 24 * 60 * 60 * 1000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var CHEV = 'M9 6l6 6l-6 6';
  var BESIDE = 'M4 5h16v14H4zM13 5v14';

  function warn(what, err) { if (CC.warn) CC.warn(what, err); }

  function svc(ctx, name) {
    try {
      if (!ctx) return null;
      var s = typeof ctx.get === 'function' ? ctx.get(name) : null;
      return s || ctx[name] || null;
    } catch (e) { return null; }
  }
  function snap(src) {
    try { return src && typeof src.getSnapshot === 'function' ? src.getSnapshot() : null; } catch (e) { return null; }
  }
  function ms(t) { var n = Number(t) || 0; return n > 0 && n < 1e12 ? n * 1000 : n; }

  function relTime(t, now) {
    var d = Math.max(0, now - ms(t));
    if (d < 60 * 1000) return 'now';
    if (d < 60 * 60 * 1000) return Math.floor(d / 60000) + 'm';
    if (d < DAY) return Math.floor(d / 3600000) + 'h';
    if (d < 7 * DAY) return Math.floor(d / DAY) + 'd';
    var x = new Date(ms(t));
    return MONTHS[x.getMonth()] + ' ' + x.getDate();
  }

  function bucket(t, now) {
    var start = new Date(now);
    start.setHours(0, 0, 0, 0);
    var today = start.getTime();
    var u = ms(t);
    if (u >= today) return 'today';
    if (u >= today - DAY) return 'yesterday';
    if (u >= today - 7 * DAY) return 'week';
    return 'older';
  }
  var GROUPS = [['pinned', 'Pinned'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'Previous 7 days'], ['older', 'Older']];

  // Pure projection of the dsh snapshots into groups of chats with nested subagents.
  function model(ctx, now) {
    var empty = { groups: [] };
    var list = snap(svc(ctx, 'sessions') && svc(ctx, 'sessions').list);
    if (!list || list.phase === 'pending' || !list.byId) return empty;
    var ws = snap(svc(ctx, 'workspaces') && svc(ctx, 'workspaces').list) || {};
    var archived = new Set(ws.archivedSessionIds || []);
    var pinnedOrder = ws.pinnedSessionIds || [];
    var pinned = new Set(pinnedOrder);
    var byId = list.byId;
    var kids = {};
    Object.keys(byId).forEach(function (id) {
      var r = byId[id];
      if (!r || !r.parentId || r.blank) return;
      (kids[r.parentId] = kids[r.parentId] || []).push(r);
    });
    function item(r, depth, seen) {
      var id = r.id;
      seen.add(id);
      var children = depth >= MAX_DEPTH ? [] : (kids[id] || []).filter(function (c) { return !seen.has(c.id); })
        .sort(function (a, b) { return ms(b.updatedAt) - ms(a.updatedAt); })
        .map(function (c) { return item(c, depth + 1, seen); });
      return { id: id, title: String(r.displayTitle || r.title || 'Untitled'), updatedAt: ms(r.updatedAt),
        running: !!r.running, parentId: r.parentId || null, children: children };
    }
    var top = (list.ids || []).map(function (id) { return byId[id]; }).filter(function (r) {
      return r && !r.parentId && r.origin !== 'subagent' && !r.blank && !archived.has(r.id);
    });
    var by = { pinned: [], today: [], yesterday: [], week: [], older: [] };
    top.forEach(function (r) { if (!pinned.has(r.id)) by[bucket(r.updatedAt, now)].push(r); });
    top.filter(function (r) { return pinned.has(r.id); })
      .sort(function (a, b) { return pinnedOrder.indexOf(a.id) - pinnedOrder.indexOf(b.id); })
      .forEach(function (r) { by.pinned.push(r); });
    ['today', 'yesterday', 'week', 'older'].forEach(function (k) {
      by[k].sort(function (a, b) { return ms(b.updatedAt) - ms(a.updatedAt); });
    });
    return {
      groups: GROUPS.filter(function (g) { return by[g[0]].length; }).map(function (g) {
        return { id: g[0], label: g[1], items: by[g[0]].map(function (r) { return item(r, 0, new Set()); }) };
      })
    };
  }

  function activePanel(ctx) {
    var layout = svc(ctx, 'layout');
    var s = layout && snap(layout.panelInfo);
    return s ? (s.activePanelId == null ? null : s.activePanelId) : undefined;
  }
  function isOurs(id) {
    if (!id) return false;
    var pages = CC.PAGES || [];
    for (var i = 0; i < pages.length; i++) if (pages[i].id === id) return true;
    return /^cc-/.test(String(id));
  }
  function onWaypoint(ctx) {
    var p = activePanel(ctx);
    if (p !== undefined) return isOurs(p);
    try { return typeof document !== 'undefined' && !!document.querySelector('[data-cc-frame]'); } catch (e) { return false; }
  }

  function address(ctx, row) {
    var s = svc(ctx, 'sessions');
    var a = null;
    try { a = s && typeof s.subagentAddress === 'function' ? s.subagentAddress(row.id) : null; } catch (e) { a = null; }
    return a || { parentSessionId: row.parentId, childSessionId: row.id, mode: 'unknown' };
  }
  // Same address dsh's subagent package builds for its right-sidebar chat resource.
  function chatAddress(a) {
    return 'dsh-resource://subagentchat/session/' + encodeURIComponent(a.childSessionId) +
      '?parent=' + encodeURIComponent(a.parentSessionId) + '&mode=' + encodeURIComponent(a.mode);
  }

  function actions(ctx) {
    function showConversation() {
      try {
        var layout = svc(ctx, 'layout');
        if (layout && typeof layout.selectPanel === 'function' && activePanel(ctx)) layout.selectPanel(null);
      } catch (e) { warn('could not show the conversation', e); }
    }
    function openTarget(target) {
      try {
        var ui = svc(ctx, 'uiWorkspace');
        if (!ui || typeof ui.openSession !== 'function') return false;
        ui.openSession(target);
        showConversation();
        return true;
      } catch (e) { warn('could not open the chat', e); return false; }
    }
    function open(row) {
      if (!row || !row.id) return;
      openTarget(row.parentId ? address(ctx, row) : row.id);
    }
    function beside(row) {
      if (!row || !row.parentId) return open(row);
      var sr = svc(ctx, 'sidebarRight');
      if (!sr || typeof sr.openResource !== 'function') return open(row);
      var addr = address(ctx, row);
      var parent = addr.parentSessionId || row.parentId;
      function go() {
        try { sr.openResource(chatAddress(addr), { kind: 'subagentchat', preferNewPane: true }); } catch (e) { warn('could not open the subagent beside its chat', e); }
      }
      var mounted = sr.mounted;
      if (snap(mounted) === parent && !activePanel(ctx)) return go();
      if (!openTarget(parent)) return undefined;
      if (snap(mounted) === parent || !mounted || typeof mounted.subscribe !== 'function') return go();
      // The right sidebar follows the on-screen session: wait until the parent is mounted.
      var off = null;
      var timer = null;
      var settled = false;
      function finish() {
        settled = true;
        if (off) { try { off(); } catch (e) { /* already gone */ } off = null; }
        if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
      }
      try {
        off = mounted.subscribe(function () { if (!settled && snap(mounted) === parent) { finish(); go(); } });
        if (settled && off) { off(); off = null; }
      } catch (e) { warn('could not wait for the chat to open', e); return undefined; }
      if (!settled && typeof setTimeout === 'function') timer = setTimeout(finish, 5000);
      return undefined;
    }
    return { open: open, beside: beside };
  }

  function Glyph(props) {
    return CC.h('svg', { className: props.className, width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, CC.h('path', { d: props.d }));
  }

  function domId(id) { return 'cc-sbc-sub-' + String(id).replace(/[^A-Za-z0-9_-]/g, '_'); }

  function Row(props) {
    var h = CC.h;
    var it = props.item;
    var p = props.view;
    var open = !!(p.subOpen && p.subOpen[it.id]);
    var n = it.children.length;
    return h('div', { className: 'cc-sbc-item' },
      h('div', { className: 'cc-sbc-row' },
        h('button', { type: 'button', className: 'cc-sbc-open', 'data-cc-chat': it.id, title: it.title,
          onClick: function () { p.actions.open(it); } },
          h('span', { className: 'cc-sbc-dot' + (it.running ? ' cc-sbc-live' : ''), 'aria-hidden': true }),
          h('span', { className: 'cc-sbc-title' }, it.title),
          h('span', { className: 'cc-sbc-time' }, relTime(it.updatedAt, p.now))),
        it.parentId ? h('button', { type: 'button', className: 'cc-sbc-icon cc-sbc-beside', 'data-cc-beside': it.id,
          'aria-label': 'Open beside its chat', title: 'Open beside its chat',
          onClick: function () { p.actions.beside(it); } }, h(Glyph, { d: BESIDE })) : null,
        n ? h('button', { type: 'button', className: 'cc-sbc-icon cc-sbc-sub', 'data-cc-sub-toggle': it.id,
          'aria-expanded': open, 'aria-controls': open ? domId(it.id) : undefined,
          'aria-label': 'Subagents (' + n + ')', title: n === 1 ? '1 subagent' : n + ' subagents',
          onClick: function () { if (p.onToggleSub) p.onToggleSub(it.id); } },
          h('span', { className: 'cc-sbc-count' }, String(n)), h(Glyph, { className: 'cc-sbc-chev', d: CHEV })) : null),
      open && n ? h('div', { className: 'cc-sbc-children', id: domId(it.id), role: 'group', 'aria-label': 'Subagents of ' + it.title },
        it.children.map(function (c) { return h(Row, { key: c.id, item: c, view: p }); })) : null);
  }

  // Pure view: model + open/shut state in, buttons out (the stateful wrapper owns the state).
  function View(props) {
    var h = CC.h;
    var p = Object.assign({ subOpen: {}, groupShut: {}, more: {} }, props);
    return h('nav', { className: 'cc-root cc-sbc', 'aria-label': 'Chats' },
      p.model.groups.map(function (g) {
        var shut = !!p.groupShut[g.id];
        var all = !!p.more[g.id];
        var rows = all ? g.items : g.items.slice(0, MAX_ROWS);
        var hidden = g.items.length - rows.length;
        return h('div', { key: g.id, className: 'cc-sbc-section', role: 'group', 'aria-label': g.label },
          h('button', { type: 'button', className: 'cc-sbc-group', 'data-cc-group': g.id, 'aria-expanded': !shut,
            onClick: function () { if (p.onToggleGroup) p.onToggleGroup(g.id); } },
            h('span', null, g.label), h(Glyph, { className: 'cc-sbc-chev', d: CHEV })),
          shut ? null : rows.map(function (it) { return h(Row, { key: it.id, item: it, view: p }); }),
          !shut && hidden > 0 ? h('button', { type: 'button', className: 'cc-sbc-more', 'data-cc-more': g.id,
            onClick: function () { if (p.onMore) p.onMore(g.id); } }, hidden + ' more') : null);
      }));
  }

  function flip(set) {
    return function (id) { set(function (m) { var n = Object.assign({}, m); n[id] = !m[id]; return n; }); };
  }

  function SidebarChats(props) {
    var React = CC.React;
    var ctx = CC.ctx;
    var bump = React.useState(0)[1];
    var sub = React.useState({});
    var shut = React.useState({});
    var more = React.useState({});
    React.useEffect(function () {
      var offs = [];
      var tick = function () { bump(function (n) { return n + 1; }); };
      [svc(ctx, 'sessions'), svc(ctx, 'workspaces')].forEach(function (s) {
        try { if (s && s.list && typeof s.list.subscribe === 'function') offs.push(s.list.subscribe(tick)); } catch (e) { /* no updates */ }
      });
      try {
        var layout = svc(ctx, 'layout');
        if (layout && layout.panelInfo && typeof layout.panelInfo.subscribe === 'function') offs.push(layout.panelInfo.subscribe(tick));
      } catch (e) { /* no updates */ }
      var iv = typeof setInterval === 'function' ? setInterval(tick, 60000) : null;
      return function () {
        offs.forEach(function (off) { try { if (typeof off === 'function') off(); } catch (e) { /* gone */ } });
        if (iv && typeof clearInterval === 'function') clearInterval(iv);
      };
    }, [ctx]);
    if (!props || !props.wide || !svc(ctx, 'sessions') || !onWaypoint(ctx)) return null;
    var now = Date.now();
    var m = model(ctx, now);
    if (!m.groups.length) return null;
    try { if (CC.ensureStyles) CC.ensureStyles(); } catch (e) { warn('styles not injected', e); }
    return CC.h(View, { model: m, now: now, actions: actions(ctx),
      subOpen: sub[0], groupShut: shut[0], more: more[0],
      onToggleSub: flip(sub[1]), onToggleGroup: flip(shut[1]), onMore: flip(more[1]) });
  }

  function css() {
    var S = CC.tokens.size;
    var C = CC.tokens.control;
    var r = 'border-radius:var(--cc-r-control);';
    var bare = 'border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;';
    return [
      // Layout: only while this list is on screen (a Waypoint page, where dsh's browser is hidden),
      // the empty region gives up its space and the foot grows; Settings stays at the bottom.
      '[class*="_regionArea"]:has(~ [class*="_footArea"] .cc-sbc){flex:0 0 auto;min-height:0;}',
      '[class*="_footArea"]:has(.cc-sbc){flex:1 1 auto;min-height:0;}',
      '[class*="_footerActions"]:has(.cc-sbc){flex:1 1 auto;min-height:0;flex-direction:column;align-items:flex-start;}',
      '[class*="_footerActions"] > :has(.cc-sbc){flex:1 1 auto;min-height:0;align-self:stretch;display:flex;flex-direction:column;}',
      '.cc-root.cc-sbc{background:transparent;flex:1 1 auto;align-self:stretch;width:100%;min-height:0;overflow-x:hidden;overflow-y:auto;' +
        'padding:4px 0 8px;font-size:' + S.label + 'px;line-height:1.35;scrollbar-width:thin;scrollbar-color:var(--cc-thumb) transparent;}',
      '.cc-sbc .cc-sbc-group{display:flex;align-items:center;gap:4px;width:100%;height:24px;margin-top:8px;padding:0 8px;' + bare + r +
        'color:var(--cc-text-3);font-size:' + S.meta + 'px;font-weight:500;text-align:left;}',
      '.cc-sbc .cc-sbc-section:first-child .cc-sbc-group{margin-top:0;}',
      '.cc-sbc .cc-sbc-group:hover{color:var(--cc-text-2);}',
      '.cc-sbc .cc-sbc-group .cc-sbc-chev{opacity:0;transform:rotate(90deg);}',
      '.cc-sbc .cc-sbc-group:hover .cc-sbc-chev,.cc-sbc .cc-sbc-group:focus-visible .cc-sbc-chev{opacity:1;}',
      '.cc-sbc .cc-sbc-group[aria-expanded="false"] .cc-sbc-chev{opacity:1;transform:none;}',
      '.cc-sbc .cc-sbc-row{display:flex;align-items:center;gap:2px;padding-right:4px;' + r + '}',
      '.cc-sbc .cc-sbc-row:hover{background:var(--cc-wash);}',
      '.cc-sbc .cc-sbc-open{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;height:' + C.compact + 'px;padding:0 6px 0 8px;' +
        bare + r + 'color:var(--cc-text);text-align:left;}',
      '.cc-sbc .cc-sbc-dot{flex:none;width:6px;height:6px;border-radius:999px;background:transparent;}',
      '.cc-sbc .cc-sbc-dot.cc-sbc-live{background:var(--cc-running);}',
      '.cc-sbc .cc-sbc-title{flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}',
      '.cc-sbc .cc-sbc-time{flex:none;color:var(--cc-text-3);font-size:' + S.meta + 'px;font-variant-numeric:tabular-nums;}',
      '.cc-sbc .cc-sbc-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:2px;height:22px;min-width:22px;padding:0 4px;' +
        bare + r + 'color:var(--cc-text-3);font-size:' + S.meta + 'px;font-variant-numeric:tabular-nums;}',
      '.cc-sbc .cc-sbc-icon:hover{color:var(--cc-text);background:var(--cc-wash);}',
      '.cc-sbc .cc-sbc-chev{flex:none;transition:transform var(--cc-fast) var(--cc-ease);}',
      '.cc-sbc .cc-sbc-sub[aria-expanded="true"] .cc-sbc-chev{transform:rotate(90deg);}',
      '.cc-sbc .cc-sbc-beside{opacity:0;}',
      '.cc-sbc .cc-sbc-row:hover .cc-sbc-beside,.cc-sbc .cc-sbc-beside:focus-visible{opacity:1;}',
      '.cc-sbc .cc-sbc-children{margin-left:11px;padding-left:4px;border-left:1px solid var(--cc-line);}',
      '.cc-sbc .cc-sbc-more{display:block;width:100%;height:24px;padding:0 8px 0 22px;' + bare + r +
        'color:var(--cc-text-3);font-size:' + S.meta + 'px;text-align:left;}',
      '.cc-sbc .cc-sbc-more:hover{color:var(--cc-text);background:var(--cc-wash);}'
    ].join('');
  }
  function syncCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById(STYLE_ID);
      if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
      el.textContent = css();
    } catch (e) { warn('sidebar chats style skipped', e); }
  }

  var applied = false;
  function apply(ctx) {
    try {
      if (!ctx || !ctx.slots || typeof ctx.slots.inject !== 'function' || applied) return;
      CC.ctx = CC.ctx || ctx;
      syncCss();
      if (typeof CC.contribute !== 'function') return;
      applied = true;
      CC.contribute(ctx, SLOT, { name: SLOT, id: 'cc-chats', order: -100 }, SidebarChats, 'sidebar chats');
    } catch (e) { warn('sidebar chats skipped', e); }
  }

  CC.sidebarChats = { apply: apply, model: model, View: View, SidebarChats: SidebarChats, actions: actions, css: css,
    relTime: relTime, chatAddress: chatAddress, slot: SLOT, styleId: STYLE_ID };
})(CC);

		// ── command_bar.js
(function (CC) {
  // F3: Ctrl+K command bar. A plain request ('run Career tonight', 'move Efficient Frontiers up',
  // 'add todo renew passport', 'open Brain') becomes a one-line action preview; Enter runs it,
  // Esc cancels. A deterministic rule parser runs first; only when it gives up, an optional engine
  // model fallback (POST /api/command/parse {text, projects, tabs, kinds} -> {action}) may suggest an
  // action, which is turned back into a rule sentence and re-parsed, so the same checks apply.
  // Only owner actions that already exist can run:
  //   add_todo      POST /api/todos {text}                       (todo.py)
  //   run_project   POST /api/sprints/plan {project, pool, start_at} (sprints.py, owner only)
  //   move_project  POST /api/autonomous/settings {settings}     (sprints.py, the Autonomous order)
  //   open_tab      ctx.layout.selectPanel(id)                   (dsh layout)
  // Ctrl+K belongs to the bar only while a Waypoint page is on screen; elsewhere dsh's own Ctrl+K
  // (search sessions) keeps working. The overlay is contributed to dsh's frame-wide `shell.overlay`.
  var KINDS = ['add_todo', 'run_project', 'move_project', 'open_tab'];
  var POOLS = [
    { id: 'claude_code', label: 'Claude Code', words: ['claude', 'claude code'] },
    { id: 'freebuff', label: 'Freebuff', words: ['freebuff'] }
  ];
  var DEFAULT_POOL = 'claude_code';
  var TONIGHT = 22;
  var MORNING = 9;

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fail(reason) { return { ok: false, reason: reason || 'Not understood' }; }

  function matchOne(query, items, keys) {
    var q = norm(query);
    if (!q) return { hit: null };
    var tiers = [
      function (v) { return v === q; },
      function (v) { return v.indexOf(q) === 0; },
      function (v) { return (' ' + v + ' ').indexOf(' ' + q + ' ') >= 0; },
      function (v) { return q.split(' ').every(function (w) { return v.indexOf(w) >= 0; }); }
    ];
    for (var t = 0; t < tiers.length; t++) {
      var found = items.filter(function (it) { return keys.some(function (k) { return tiers[t](norm(it[k])); }); });
      if (found.length === 1) return { hit: found[0] };
      if (found.length > 1) return { hit: null, many: found };
    }
    return { hit: null };
  }
  function project(query, env) {
    var m = matchOne(query, (env && env.projects) || [], ['title', 'id']);
    if (m.hit) return { project: m.hit };
    if (m.many) return { reason: 'Several projects match: ' + m.many.slice(0, 3).map(function (p) { return p.title || p.id; }).join(', ') };
    return { reason: 'No project called ' + String(query).trim() };
  }
  function title(p) { return p.title || p.id; }

  // ---- time ----------------------------------------------------------------------------------
  function when(word, now) {
    var d = new Date(now.getTime());
    if (!word || word === 'now') return { at: d, text: 'now' };
    if (word === 'tonight') {
      var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TONIGHT, 0, 0, 0);
      return t.getTime() > now.getTime() ? { at: t, text: 'tonight at ' + hm(t) } : { at: d, text: 'now' };
    }
    if (word === 'tomorrow') {
      var m = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, MORNING, 0, 0, 0);
      return { at: m, text: 'tomorrow at ' + hm(m) };
    }
    var at = /^at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(word);
    if (!at) return null;
    var hour = parseInt(at[1], 10), min = at[2] ? parseInt(at[2], 10) : 0;
    if (at[3] === 'pm' && hour < 12) hour += 12;
    if (at[3] === 'am' && hour === 12) hour = 0;
    if (hour > 23 || min > 59) return null;
    var s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
    var day = 'today';
    if (s.getTime() <= now.getTime()) { s = new Date(s.getTime() + 86400000); day = 'tomorrow'; }
    return { at: s, text: day + ' at ' + hm(s) };
  }

  // ---- the Autonomous order ------------------------------------------------------------------
  function moveIn(sequence, pid, dir) {
    var rows = (sequence || []).map(function (row) { return row.map(function (i) { return { project: i.project, model: i.model || null }; }); });
    var from = -1, item = null;
    rows.forEach(function (row, r) { row.forEach(function (i) { if (i.project === pid) { from = r; item = i; } }); });
    if (from < 0) {
      item = { project: pid, model: null };
      if (dir === 'up' || dir === 'top') rows.unshift([item]); else rows.push([item]);
      return { rows: rows, from: null, to: dir === 'up' || dir === 'top' ? 1 : rows.length };
    }
    var alone = rows[from].length === 1;
    var last = rows.length - 1;
    if ((dir === 'up' || dir === 'top') && from === 0 && alone) return { already: 'first' };
    if ((dir === 'down' || dir === 'bottom') && from === last && alone) return { already: 'last' };
    rows[from] = rows[from].filter(function (i) { return i.project !== pid; });
    var to;
    if (dir === 'top') { to = 0; rows.unshift([item]); }
    else if (dir === 'bottom') { rows.push([item]); to = rows.length - 1; }
    else if (!alone) { to = dir === 'up' ? from : from + 1; rows.splice(to, 0, [item]); }
    else if (dir === 'up') { to = from - 1; rows[from] = rows[to]; rows[to] = [item]; }
    else { to = from + 1; rows[from] = rows[to]; rows[to] = [item]; }
    rows = rows.filter(function (r) { return r.length; });
    rows.forEach(function (r, i) { if (r[0] && r.some(function (x) { return x.project === pid; })) to = i; });
    return { rows: rows, from: from + 1, to: to + 1 };
  }

  function tabs() { return (CC.PAGES || []).map(function (p) { return { id: p.id, label: p.label }; }); }

  // ---- rule parser ---------------------------------------------------------------------------
  function parse(text, env) {
    env = env || {};
    var raw = String(text || '').trim().replace(/\s+/g, ' ');
    if (!raw) return fail('Type a request');
    if (/^(?:add\s+(?:a\s+)?)?todo\s*[:\-]?$/i.test(raw)) return fail('Type the todo');
    var low = raw.toLowerCase();
    var m;

    if ((m = /^(?:add\s+(?:a\s+)?)?todo\s*[:\-]?\s+(.+)$/i.exec(raw)) || (m = /^remind me to\s+(.+)$/i.exec(raw))
        || (m = /^add\s+(.+?)\s+to\s+(?:my\s+)?(?:todos?|todo list)$/i.exec(raw))) {
      var t = m[1].trim();
      return { ok: true, action: { kind: 'add_todo', text: t }, preview: 'Add todo: ' + t };
    }

    if ((m = /^(?:open|go to|show|switch to)\s+(?:the\s+)?(.+?)(?:\s+(?:tab|page))?$/.exec(low))) {
      var tab = matchOne(m[1], tabs(), ['label', 'id']).hit;
      if (!tab) return fail('No tab called ' + m[1]);
      return { ok: true, action: { kind: 'open_tab', id: tab.id, label: tab.label }, preview: 'Open ' + tab.label };
    }

    if ((m = /^(?:run|start)\s+(.+)$/.exec(low))) {
      var rest = m[1], pool = null;
      POOLS.forEach(function (p) {
        p.words.forEach(function (w) {
          var tail = ' on ' + w;
          if (!pool && rest.slice(-tail.length) === tail) { pool = p; rest = rest.slice(0, -tail.length).trim(); }
        });
      });
      var tm = /\s+(now|tonight|tomorrow|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/.exec(rest);
      var word = null;
      if (tm) { word = tm[1]; rest = rest.slice(0, tm.index).trim(); }
      var w = when(word, env.now || new Date());
      if (!w) return fail('Could not read the time');
      var pr = project(rest, env);
      if (!pr.project) return fail(pr.reason);
      pool = pool || POOLS.filter(function (p) { return p.id === DEFAULT_POOL; })[0];
      return { ok: true, action: { kind: 'run_project', project: pr.project.id, title: title(pr.project), pool: pool.id,
        start_at: w.at.toISOString() }, preview: 'Run ' + title(pr.project) + ' ' + w.text + ' on ' + pool.label };
    }

    if ((m = /^(?:move|bump|push)\s+(.+?)\s+(up|down|to (?:the )?top|to (?:the )?bottom|first|last)$/.exec(low))
        || (m = /^(prioriti[sz]e)\s+(.+)$/.exec(low))) {
      var name = m[1], dir = m[2];
      if (name === 'prioritise' || name === 'prioritize') { name = m[2]; dir = 'up'; }
      dir = /top|first/.test(dir) ? 'top' : /bottom|last/.test(dir) ? 'bottom' : dir;
      var pj = project(name, env);
      if (!pj.project) return fail(pj.reason);
      var seq = env.sequence || (env.settings && env.settings.sequence) || [];
      var mv = moveIn(seq, pj.project.id, dir);
      if (mv.already) return fail(title(pj.project) + ' is already ' + mv.already);
      var preview = mv.from === null
        ? 'Add ' + title(pj.project) + ' to the Autonomous order at row ' + mv.to
        : 'Move ' + title(pj.project) + ' from row ' + mv.from + ' to row ' + mv.to;
      return { ok: true, action: { kind: 'move_project', project: pj.project.id, title: title(pj.project), direction: dir,
        sequence: mv.rows }, preview: preview };
    }
    return fail('Not understood');
  }

  // An engine suggestion is only a hint: it is rewritten as a rule sentence and parsed again.
  function sentence(a) {
    if (!a || typeof a !== 'object' || KINDS.indexOf(a.kind) < 0) return null;
    var s = function (v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); };
    if (a.kind === 'add_todo') return s(a.text) ? 'add todo ' + s(a.text) : null;
    if (a.kind === 'open_tab') return s(a.label || a.id) ? 'open ' + s(a.label || a.id) : null;
    if (a.kind === 'run_project') {
      if (!s(a.project)) return null;
      var w = s(a.when).toLowerCase();
      var pool = POOLS.filter(function (p) { return p.id === a.pool; })[0];
      return 'run ' + s(a.project) + (w ? ' ' + w : '') + (pool ? ' on ' + pool.words[0] : '');
    }
    if (a.kind === 'move_project') {
      var d = ({ up: 'up', down: 'down', top: 'to the top', bottom: 'to the bottom' })[s(a.direction).toLowerCase()];
      return s(a.project) && d ? 'move ' + s(a.project) + ' ' + d : null;
    }
    return null;
  }

  function resolve(text, env) {
    var r = parse(text, env);
    if (r.ok || !String(text || '').trim()) return Promise.resolve(r);
    var body = { text: String(text), kinds: KINDS.slice(), tabs: tabs().map(function (t) { return t.label; }),
      projects: ((env && env.projects) || []).map(function (p) { return p.title || p.id; }) };
    var p;
    try { p = CC.api.post('/api/command/parse', body); } catch (e) { return Promise.resolve(r); }
    return Promise.resolve(p).then(function (res) {
      var again = sentence(res && res.action);
      if (!again) return r;
      var out = parse(again, env);
      if (out.ok) out.via = 'model';
      return out.ok ? out : r;
    }, function () { return r; });
  }

  function execute(action, env) {
    var a = action || {};
    if (a.kind === 'add_todo') return CC.api.post('/api/todos', { text: a.text });
    if (a.kind === 'run_project') return CC.api.post('/api/sprints/plan', { project: a.project, pool: a.pool, start_at: a.start_at });
    if (a.kind === 'move_project') {
      var settings = Object.assign({}, (env && env.settings) || {}, { sequence: a.sequence });
      return CC.api.post('/api/autonomous/settings', { settings: settings });
    }
    if (a.kind === 'open_tab') {
      return new Promise(function (resolveIt, reject) {
        try { CC.ctx.layout.selectPanel(a.id); resolveIt({ ok: true }); } catch (e) { reject(e); }
      });
    }
    return Promise.reject(new Error('That is not one of the allowed actions'));
  }

  // Which key does what: 'open' | 'confirm' | 'cancel' | null.
  function keyAction(e, st) {
    if (!e) return null;
    var k = String(e.key || '');
    if (!st.open) return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k.toLowerCase() === 'k' && st.onPage ? 'open' : null;
    if (k === 'Escape') return 'cancel';
    if (k === 'Enter' && st.ready) return 'confirm';
    return null;
  }

  // Under an empty input: a few starting points (one click fills the input; Enter still runs it).
  // Fixed and deterministic: Add todo, then the first sidebar tabs.
  var EMPTY_MAX = 5;
  function emptyList() {
    var out = [{ label: 'Add todo', text: 'todo ' }];
    (CC.PAGES || []).filter(function (p) { return p.sidebar !== false; }).slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .forEach(function (p) { out.push({ label: 'Open ' + p.label, text: 'open ' + p.label }); });
    return out.slice(0, EMPTY_MAX);
  }

  // The content column's left edge (the Waypoint page beside dsh's sidebar), so the bar centres on
  // the page you are looking at rather than on the whole window. 0 when it cannot be measured.
  function contentLeft() {
    try {
      var el = document.querySelector('[data-cc-frame]') || document.querySelector('.cc-root[data-cc-page]');
      var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return r && r.left > 0 && r.left < (window.innerWidth || 0) / 2 ? Math.round(r.left) : 0;
    } catch (e) { return 0; }
  }

  // ---- UI ------------------------------------------------------------------------------------
  // A quiet scrim, one panel with a hairline (no blur, no shadow), a 48 px input row with a prompt
  // glyph, and one preview row whose dot says ready (accent) or not understood (neutral). Sizes,
  // radii and colours are tokens.js variables.
  var CSS = [
    '.cc-root.cc-cmd-back{position:fixed;inset:0;z-index:1000;background:var(--cc-scrim);display:flex;justify-content:center;align-items:flex-start;padding:14vh 16px 0;}',
    '.cc-root .cc-cmd{width:600px;max-width:100%;background:var(--cc-surface);border:1px solid var(--cc-line-strong);',
    'border-radius:var(--cc-r-panel);overflow:hidden;}',
    '.cc-root .cc-cmd-in{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;color:var(--cc-text-3);}',
    '.cc-root .cc-cmd-in svg{flex:none;}',
    '.cc-root .cc-cmd input{flex:1;min-width:0;height:100%;border:0;outline:none;background:transparent;color:var(--cc-text);color-scheme:light dark;',
    'font:inherit;font-size:var(--cc-fs-body);padding:0;}',
    '.cc-root .cc-cmd input:focus-visible{outline:none;}',
    '.cc-root .cc-cmd-p{display:flex;align-items:center;gap:12px;border-top:1px solid var(--cc-line);padding:0 16px;font-size:var(--cc-fs-label);height:36px;background:var(--cc-surface-2);}',
    '.cc-root .cc-cmd-t{display:flex;align-items:center;gap:8px;flex:1;min-width:0;}',
    '.cc-root .cc-cmd-t>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-cmd-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-neutral);}',
    '.cc-root .cc-cmd-ok{color:var(--cc-text);}',
    '.cc-root .cc-cmd-ok .cc-cmd-dot{background:var(--cc-accent);}',
    '.cc-root .cc-cmd-no{color:var(--cc-text-3);}',
    '.cc-root .cc-cmd-k{display:flex;align-items:center;gap:4px;font-size:var(--cc-fs-meta);color:var(--cc-text-3);white-space:nowrap;}',
    '.cc-root .cc-cmd-k kbd+span{margin-right:8px;}',
    '.cc-root .cc-cmd-k span:last-child{margin-right:0;}',
    '.cc-root .cc-cmd-list{border-top:1px solid var(--cc-line);padding:4px;}',
    '.cc-root .cc-cmd-item{display:flex;align-items:center;width:100%;height:32px;padding:0 12px;border:0;border-radius:var(--cc-r-control);background:transparent;',
    'color:var(--cc-text-2);font:inherit;font-size:var(--cc-fs-label);text-align:left;cursor:pointer;}',
    '.cc-root .cc-cmd-item:hover,.cc-root .cc-cmd-item:focus-visible{background:var(--cc-wash);color:var(--cc-text);outline:none;}'
  ].join('');
  function ensureCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById('cc-command-bar-css');
      if (!el) { el = document.createElement('style'); el.id = 'cc-command-bar-css'; document.head.appendChild(el); }
      if (el.textContent !== CSS) el.textContent = CSS;
    } catch (e) { /* cosmetic only */ }
  }

  function Prompt() {
    return CC.h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, CC.h('path', { d: 'M5 7l5 5l-5 5M12 18h7' }));
  }

  function Panel(props) {
    var h = CC.h, r = props.result;
    var line = props.message || (r ? (r.ok ? r.preview : r.reason) : '');
    var ready = !!(r && r.ok) && !props.busy && !props.message;
    var empty = !String(props.text || '').trim() && !line;
    var left = props.left > 0 ? props.left : 0;
    return h('div', { className: 'cc-root cc-cmd-back', 'data-cc': 'command-bar', style: left ? { paddingLeft: left + 16 } : undefined, onMouseDown: function (e) {
      if (e && e.target === e.currentTarget && props.onCancel) props.onCancel();
    } },
      h('div', { className: 'cc-cmd', role: 'dialog', 'aria-label': 'Command bar' },
        h('div', { className: 'cc-cmd-in' }, h(Prompt),
          h('input', { type: 'text', value: props.text || '', autoFocus: true, spellCheck: false, 'aria-label': 'Request',
            placeholder: 'Add todo, run, move or open', onChange: function (e) { props.onText(e.target.value); } })),
        line ? h('div', { className: 'cc-cmd-p' },
          h('div', { className: 'cc-cmd-t ' + (ready ? 'cc-cmd-ok' : 'cc-cmd-no') },
            h('i', { className: 'cc-cmd-dot', 'aria-hidden': 'true' }), h('span', null, props.busy ? 'Working…' : line)),
          ready ? h('div', { className: 'cc-cmd-k' },
            h('kbd', null, 'Enter'), h('span', null, 'run'), h('kbd', null, 'Esc'), h('span', null, 'cancel')) : null) : null,
        empty ? h('div', { className: 'cc-cmd-list', role: 'listbox', 'aria-label': 'Suggestions' }, emptyList().map(function (it) {
          return h('button', { key: it.text, type: 'button', role: 'option', 'aria-selected': false, className: 'cc-cmd-item',
            onMouseDown: function (e) { if (e && e.preventDefault) e.preventDefault(); },
            onClick: function () { props.onText(it.text); } }, it.label);
        })) : null));
  }

  function onPage() {
    try { return typeof document !== 'undefined' && !!document.querySelector && !!document.querySelector('[data-cc-frame], .cc-root[data-cc-page]'); }
    catch (e) { return false; }
  }
  function loadEnv() {
    var get = function (p) { try { return Promise.resolve(CC.api.get(p)).then(function (x) { return x; }, function () { return null; }); } catch (e) { return Promise.resolve(null); } };
    return Promise.all([get('/api/projects'), get('/api/autonomous')]).then(function (r) {
      var settings = (r[1] && r[1].settings) || null;
      return { projects: (r[0] && r[0].projects) || [], settings: settings, sequence: (settings && settings.sequence) || [] };
    });
  }

  function Overlay() {
    var React = CC.React, h = CC.h;
    var s = React.useState({ open: false, text: '', result: null, busy: false, message: null, left: 0 });
    var st = s[0], setSt = s[1];
    var ref = React.useRef(null);
    ref.current = st;
    var envRef = React.useRef({ projects: [], sequence: [], settings: null });
    var seq = React.useRef(0);
    var running = React.useRef(false);
    function patch(p) { setSt(function (prev) { return Object.assign({}, prev, p); }); }
    function close() { patch({ open: false, text: '', result: null, busy: false, message: null }); }
    function setText(t) {
      var n = ++seq.current;
      var env = Object.assign({}, envRef.current, { now: new Date() });
      var quick = parse(t, env);
      patch({ text: t, result: quick, message: null });
      if (!quick.ok && String(t).trim()) {
        setTimeout(function () {
          if (n !== seq.current) return;
          resolve(t, env).then(function (r) { if (n === seq.current) patch({ result: r }); });
        }, 600);
      }
    }
    function confirm() {
      var cur = ref.current;
      if (!cur.result || !cur.result.ok || running.current) return;
      running.current = true;
      patch({ busy: true });
      execute(cur.result.action, envRef.current).then(function () { running.current = false; close(); }, function (e) {
        running.current = false;
        patch({ busy: false, message: (e && e.data && e.data.detail) || (e && e.message) || 'That did not work' });
      });
    }
    function handle(e) {
      var cur = ref.current;
      var act = keyAction(e, { open: cur.open, onPage: onPage(), ready: !!(cur.result && cur.result.ok) && !cur.busy && !cur.message });
      if (!act) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      if (act === 'open') {
        ensureCss();
        patch({ open: true, text: '', result: null, message: null, left: contentLeft() });
        loadEnv().then(function (env) { envRef.current = env; });
      } else if (act === 'cancel') close();
      else if (act === 'confirm') confirm();
    }
    React.useEffect(function () {
      if (typeof document === 'undefined' || !document.addEventListener) return undefined;
      document.addEventListener('keydown', handle, true);
      return function () { document.removeEventListener('keydown', handle, true); };
    }, []);
    if (!st.open) return null;
    // Keys reach handle() once, through the document capture listener (the input has no handler).
    return h(Panel, { text: st.text, result: st.result, busy: st.busy, message: st.message, left: st.left, onText: setText, onCancel: close });
  }

  function apply(ctx) {
    if (!ctx || !ctx.slots) return;
    if (CC.contribute) CC.contribute(ctx, 'shell.overlay', { name: 'shell.overlay', id: 'cc-command-bar' }, Overlay, 'command bar');
  }

  CC.commandBar = { parse: parse, resolve: resolve, execute: execute, keyAction: keyAction, Panel: Panel, Overlay: Overlay,
    apply: apply, kinds: KINDS, sentence: sentence, emptyList: emptyList, contentLeft: contentLeft, css: CSS };
})(CC);

		// ── flat_picker.js
(function (CC) {
  // Flat chat model picker (Waypoint v3 P3). See docs/picker_spike.md.
  //
  // dsh's composer seat `conversation.input.model` is a public, session-scoped `single` slot; the
  // lowest priority renders, and dsh's own two-level, provider-grouped ModelSelect sits at 0. This
  // file registers one flat table at PRIORITY (-10): it opens straight onto every model, columns
  // name / Elo / context / usage, no provider names or headings, "Pick for me" first, and an effort
  // row for the current model. Data and selection go through the public `ctx.modelDirectories`
  // service (the same per-session directory and session.selectModel call dsh's own picker and
  // /model use), so the two stay in sync. Elo/context/usage/health/on-off come from Waypoint's
  // GET /api/models via CC.modelBadges; with the engine down the table shows names only.
  // Switched-off models are greyed and unclickable; models whose hourly check failed are left out
  // (the current one stays, greyed, with the reason). If the seat or service is missing, or the
  // off switch is set (localStorage DSH_CC_FLAT_PICKER = '0'), dsh's own picker stays.
  var SLOT = 'conversation.input.model';
  var PRIORITY = -10;
  // `remote` and `remote.session` too: dsh's directoryFor() reads ctx.remote.session through the
  // calling scope, and cordis throws "cannot get property "remote.session" without inject" when the
  // caller did not inject it (dsh's own plugin declares both at its top level).
  var DEPS = ['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session'];
  var STYLE_ID = 'cc-flat-picker-style';

  function warn(what, err) {
    if (typeof CC.warn === 'function') return CC.warn(what, err);
    try { console.warn('[waypoint] ' + what + (err ? ': ' + (err.message || err) : '')); } catch (e) { /* never throw */ }
  }
  function noop() {}
  function badges() { return CC.modelBadges || { lookup: function () { return null; }, fmtCtx: function () { return null; },
    load: function () { return Promise.resolve(null); }, subscribe: function () { return noop; } }; }

  function off() {
    if (typeof CC.flatPickerOff === 'function') { try { return !!CC.flatPickerOff(); } catch (e) { return false; } }
    try {
      var g = typeof globalThis !== 'undefined' ? globalThis : {};
      return !!(g.localStorage && g.localStorage.getItem('DSH_CC_FLAT_PICKER') === '0');
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ pure helpers (tested in node)
  function freshFail(h) { return !!(h && h.ok === false && !h.stale); }

  function usageText(row) {
    if (!row) return 'n/a';
    var u = row.usage;
    if (u && typeof u.remaining_percent === 'number' && isFinite(u.remaining_percent)) return Math.round(u.remaining_percent) + '%';
    if (u && u.pool) return 'n/a';
    return 'Free';
  }

  function same(a, b) { return !!(a && b && a.provider === b.provider && a.model === b.model); }

  // One flat list from dsh's provider groups: strongest first, unknown Elo after, switched-off last.
  function buildRows(groups, current) {
    var B = badges();
    var out = [];
    (Array.isArray(groups) ? groups : []).forEach(function (g) {
      (g && Array.isArray(g.models) ? g.models : []).forEach(function (m) {
        if (!m || !m.id) return;
        var reg = B.lookup(g.id, m.id);
        var selected = same({ provider: g.id, model: m.id }, current);
        var failed = !!reg && freshFail(reg.health);
        if (failed && !selected) return; // only models that answer
        var disabled = (!!reg && reg.enabled === false) ||
          (typeof CC.isEnabled === 'function' && CC.isEnabled(reg && reg.id ? reg.id : m.id) === false);
        var eloNum = reg && typeof reg.elo === 'number' && isFinite(reg.elo) ? Math.round(reg.elo) : null;
        var note = null;
        if (disabled) note = 'Switched off in Waypoint';
        else if (failed) note = (reg.health && reg.health.reason) || 'Did not answer its last check';
        out.push({ key: g.id + '\u0000' + m.id, provider: g.id, model: m.id, name: m.name || m.id,
          reasoning: m.reasoning || null, eloNum: eloNum, elo: eloNum !== null ? '~' + eloNum : 'n/a',
          ctx: (reg && B.fmtCtx(reg.context_window)) || 'n/a', usage: reg ? usageText(reg) : 'n/a',
          selected: selected, disabled: disabled || failed, note: note });
      });
    });
    out.sort(function (a, b) {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      var ea = a.eloNum === null ? -1 : a.eloNum, eb = b.eloNum === null ? -1 : b.eloNum;
      if (ea !== eb) return eb - ea;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : (a.key < b.key ? -1 : 1);
    });
    return out;
  }

  function selectionFor(row) {
    var sel = { provider: row.provider, model: row.model };
    var d = row.reasoning && row.reasoning.defaultEffort;
    if (d !== undefined && d !== null) sel.reasoningEffort = d;
    return sel;
  }

  function findModel(groups, provider, model) {
    var g = (Array.isArray(groups) ? groups : []).filter(function (x) { return x && x.id === provider; })[0];
    return g ? ((g.models || []).filter(function (m) { return m && m.id === model; })[0] || null) : null;
  }

  function effortsFor(groups, current) {
    if (!current) return [];
    var m = findModel(groups, current.provider, current.model);
    var r = m && m.reasoning;
    if (!r || !Array.isArray(r.efforts)) return [];
    var cur = current.reasoningEffort !== undefined ? current.reasoningEffort : r.defaultEffort;
    return r.efforts.map(function (e) { return { id: e.id, name: e.name || e.id, selected: e.id === cur }; });
  }

  // GET /api/pick answer -> a catalog selection (null when dsh does not list that model).
  function fromPick(groups, picked) {
    var d = picked && picked.dsh;
    if (!d || !d.provider || !d.model) return null;
    var m = findModel(groups, d.provider, d.model);
    if (!m) return null;
    var sel = { provider: d.provider, model: d.model };
    var r = m.reasoning;
    if (r && Array.isArray(r.efforts)) {
      var want = r.efforts.filter(function (e) { return e.id === picked.effort; })[0];
      if (want) sel.reasoningEffort = want.id;
      else if (r.defaultEffort !== undefined) sel.reasoningEffort = r.defaultEffort;
    }
    return sel;
  }

  CC.flatPicker = { buildRows: buildRows, selectionFor: selectionFor, effortsFor: effortsFor, fromPick: fromPick,
    usageText: usageText, SLOT: SLOT, PRIORITY: PRIORITY };

  // ------------------------------------------------------------------ styles
  function ensureStyle() {
    try {
      if (CC.ensureStyles) CC.ensureStyles();
      if (typeof document === 'undefined' || !document.getElementById || document.getElementById(STYLE_ID)) return;
      var S = (CC.tokens && CC.tokens.size) || { meta: 11, label: 12, body: 14 };
      var el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = [
        '.cc-fp-menu{position:fixed;z-index:1000;min-width:380px;max-width:min(520px,calc(100vw - 24px));max-height:60vh;overflow:auto;' +
          'padding:4px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);font-size:' + S.label + 'px;}',
        '.cc-fp-grid{display:grid;grid-template-columns:minmax(0,1fr) 60px 56px 52px;align-items:center;column-gap:8px;}',
        '.cc-fp-head{padding:6px 10px 4px;font-size:' + S.meta + 'px;color:var(--cc-text-3);}',
        '.cc-fp-row{width:100%;min-height:28px;padding:4px 10px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text);' +
          'font:inherit;text-align:left;cursor:pointer;}',
        '.cc-fp-row:hover,.cc-fp-row.cc-fp-hi{background:var(--cc-wash);}',
        '.cc-fp-row[aria-selected="true"]{box-shadow:inset 2px 0 0 var(--cc-accent);}',
        '.cc-fp-row[aria-disabled="true"]{cursor:default;opacity:.45;}',
        '.cc-fp-row[aria-disabled="true"]:hover{background:transparent;}',
        '.cc-fp-num{font-variant-numeric:tabular-nums;color:var(--cc-text-2);text-align:right;white-space:nowrap;}',
        '.cc-fp-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
        '.cc-fp-pick{color:var(--cc-accent);font-weight:500;}',
        '.cc-fp-sep{height:1px;margin:4px 6px;background:var(--cc-line);}',
        '.cc-fp-efforts{display:flex;gap:4px;padding:4px 6px 2px;flex-wrap:wrap;}',
        '.cc-fp-chip{height:24px;padding:0 8px;border:1px solid var(--cc-line);border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text-2);' +
          'font:inherit;font-size:' + S.meta + 'px;cursor:pointer;}',
        '.cc-fp-chip[aria-pressed="true"]{border-color:var(--cc-accent);color:var(--cc-text);}',
        '.cc-fp-trigger{display:inline-flex;align-items:center;gap:6px;max-width:240px;height:28px;padding:0 8px;border:0;border-radius:var(--cc-r-control);' +
          'background:transparent;color:inherit;font:inherit;font-size:' + S.label + 'px;cursor:pointer;}',
        '.cc-fp-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,transparent);}',
        '.cc-fp-cap{color:var(--cc-text-3);}',
        '.cc-fp-status{padding:6px 10px;font-size:' + S.meta + 'px;color:var(--cc-text-3);}'
      ].join('\n');
      (document.head || document.documentElement).appendChild(el);
    } catch (e) { /* styling is optional */ }
  }

  // ------------------------------------------------------------------ table (pure render)
  function FlatModelTable(props) {
    var h = CC.h;
    var rows = props.rows || [];
    var hi = typeof props.highlight === 'number' ? props.highlight : -1;
    var kids = [
      h('div', { key: 'head', className: 'cc-fp-grid cc-fp-head', 'aria-hidden': true },
        h('span', null, 'Model'), h('span', { className: 'cc-fp-num' }, 'Elo'),
        h('span', { className: 'cc-fp-num' }, 'Context'), h('span', { className: 'cc-fp-num' }, 'Usage')),
      h('button', { key: 'pick', type: 'button', role: 'option', 'aria-selected': false,
        className: 'cc-fp-row cc-fp-grid' + (hi === 0 ? ' cc-fp-hi' : ''), title: props.pickWhy || undefined,
        onClick: function () { props.onPickForMe && props.onPickForMe(); } },
        h('span', { className: 'cc-fp-name cc-fp-pick' }, 'Pick for me'), h('span'), h('span'), h('span'))
    ];
    rows.forEach(function (r, i) {
      var attrs = { key: r.key, type: 'button', role: 'option', 'aria-selected': !!r.selected,
        className: 'cc-fp-row cc-fp-grid' + (hi === i + 1 ? ' cc-fp-hi' : ''), title: r.note || undefined,
        'data-cc-model': r.model };
      if (r.disabled) attrs['aria-disabled'] = true;
      else attrs.onClick = function () { props.onPick && props.onPick(r); };
      kids.push(h('button', attrs,
        h('span', { className: 'cc-fp-name' }, r.name),
        h('span', { className: 'cc-fp-num' }, r.elo),
        h('span', { className: 'cc-fp-num' }, r.ctx),
        h('span', { className: 'cc-fp-num' }, r.usage)));
    });
    if (!rows.length) kids.push(h('div', { key: 'empty', className: 'cc-fp-status', role: 'status' }, props.empty || 'No models available'));
    if (props.status) kids.push(h('div', { key: 'status', className: 'cc-fp-status', role: 'status' }, props.status));
    var efforts = props.efforts || [];
    if (efforts.length) {
      kids.push(h('div', { key: 'sep', className: 'cc-fp-sep' }));
      kids.push(h('div', { key: 'eff', className: 'cc-fp-efforts', role: 'group', 'aria-label': 'Effort' },
        efforts.map(function (e) {
          return h('button', { key: e.id, type: 'button', className: 'cc-fp-chip', 'aria-pressed': !!e.selected,
            onClick: function () { props.onEffort && props.onEffort(e); } }, e.name);
        })));
    }
    return h('div', { role: 'listbox', 'aria-label': 'Model' }, kids);
  }
  CC.FlatModelTable = FlatModelTable;

  // ------------------------------------------------------------------ the seat
  function useStore(store) {
    var R = CC.React || {};
    var get = function () { try { return store && store.getSnapshot ? store.getSnapshot() : null; } catch (e) { return null; } };
    if (typeof R.useSyncExternalStore === 'function' && store && store.subscribe) {
      return R.useSyncExternalStore(function (fn) { return store.subscribe(fn); }, get);
    }
    var st = R.useState(get());
    if (typeof R.useEffect === 'function') {
      R.useEffect(function () {
        if (!store || !store.subscribe) return undefined;
        return store.subscribe(function () { st[1](get()); });
      }, [store]);
    }
    return get() || st[0];
  }

  function FlatModelSelect(props) {
    var R = CC.React || {};
    var h = CC.h;
    var state = useStore(props.directory) || {};
    var openS = R.useState(false), posS = R.useState(null), hiS = R.useState(0), msgS = R.useState(null);
    var tickS = R.useState(0);
    var trigRef = R.useRef(null), menuRef = R.useRef(null);
    var open = openS[0];
    if (typeof R.useEffect === 'function') {
      R.useEffect(function () {
        var unsub = badges().subscribe(function () { tickS[1](function (n) { return n + 1; }); });
        badges().load();
        return unsub;
      }, []);
      R.useEffect(function () {
        if (!open || typeof document === 'undefined') return undefined;
        var close = function (ev) {
          if (trigRef.current && trigRef.current.contains(ev.target)) return;
          if (menuRef.current && menuRef.current.contains(ev.target)) return;
          openS[1](false);
        };
        document.addEventListener('mousedown', close);
        return function () { document.removeEventListener('mousedown', close); };
      }, [open]);
    }
    // Anchor: the menu's bottom-right corner sits 6 px above the trigger's right edge. A transformed
    // dsh ancestor can move what position:fixed is measured from, so after the menu renders its real
    // box is compared with the trigger's and the offset corrected (settles in one pass).
    var useLayout = R.useLayoutEffect || R.useEffect;
    if (typeof useLayout === 'function') {
      useLayout(function () {
        var p = posS[0];
        if (!open || !p || !menuRef.current || !trigRef.current) return;
        try {
          var m = menuRef.current.getBoundingClientRect(), t = trigRef.current.getBoundingClientRect();
          var dy = m.bottom - (t.top - 6), dx = m.right - t.right;
          if (Math.abs(dy) > 1 || Math.abs(dx) > 1) posS[1]({ bottom: p.bottom + dy, right: p.right + dx });
        } catch (e) { /* the first position stays */ }
      }, [open, posS[0]]);
    }
    var current = state.current || null;
    var groups = state.groups || [];
    var rows = buildRows(groups, current);
    var efforts = effortsFor(groups, current);
    var curModel = current ? findModel(groups, current.provider, current.model) : null;
    var name = curModel ? (curModel.name || curModel.id) : (state.status === 'loading' ? 'Loading' : 'Select model');
    var effortName = null;
    efforts.forEach(function (e) { if (e.selected) effortName = e.name; });
    var busy = !!state.pending;
    var locked = !!props.locked || props.available === false;

    function close() { openS[1](false); try { trigRef.current && trigRef.current.focus(); } catch (e) { /* gone */ } }
    function choose(sel) {
      if (!sel || typeof props.select !== 'function') return;
      msgS[1](null);
      Promise.resolve(props.select(sel)).then(function (res) {
        if (res && res.ok === false) msgS[1]('That model could not be selected just now.');
        else close();
      }, function () { msgS[1]('That model could not be selected just now.'); });
    }
    function pickForMe() {
      var get = CC.api && CC.api.get;
      if (typeof get !== 'function') { msgS[1]('Pick for me needs the Waypoint engine.'); return; }
      Promise.resolve(get('/api/pick?kind=chat')).then(function (ans) {
        var sel = fromPick(groups, ans);
        if (sel) choose(sel); else msgS[1]((ans && ans.why) || 'No working model to pick.');
      }, function () { msgS[1]('Pick for me needs the Waypoint engine.'); });
    }
    function toggle() {
      if (locked) return;
      if (open) { close(); return; }
      ensureStyle();
      try { if (typeof props.load === 'function') props.load(); } catch (e) { /* load errors land on the store */ }
      badges().load();
      var pos = null;
      try {
        var rect = trigRef.current.getBoundingClientRect();
        var vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
        var vw = (typeof window !== 'undefined' && window.innerWidth) || 1200;
        pos = { bottom: Math.max(8, vh - rect.top + 6), right: Math.max(8, vw - rect.right) };
      } catch (e) { pos = { bottom: 80, right: 16 }; }
      posS[1](pos);
      hiS[1](-1); // nothing highlighted on open: only the hovered row (or the arrow keys) lights up
      msgS[1](null);
      openS[1](true);
    }
    function onKey(ev) {
      if (!open) return;
      var n = rows.length + 1;
      if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        var d = ev.key === 'ArrowDown' ? 1 : -1;
        hiS[1](function (i) { return i < 0 ? (d > 0 ? 0 : n - 1) : (i + d + n) % n; });
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        var i = hiS[0];
        if (i < 0) return;
        if (i === 0) pickForMe();
        else if (rows[i - 1] && !rows[i - 1].disabled) choose(selectionFor(rows[i - 1]));
      }
    }

    var trigger = h('button', { ref: trigRef, type: 'button', className: 'cc-fp-trigger', 'aria-haspopup': 'listbox',
      'aria-expanded': open, 'aria-label': 'Model: ' + name + (effortName ? ', effort ' + effortName : ''),
      disabled: locked || undefined, onClick: toggle, onKeyDown: onKey, 'data-cc-flat-picker': 'trigger',
      title: (function () { var r = curModel && badges().lookup(current.provider, current.model);
        return r && CC.modelBadges && CC.modelBadges.tooltip ? CC.modelBadges.tooltip(r) || undefined : undefined; })() },
      h('span', { className: 'cc-fp-name' }, name),
      effortName ? h('span', { className: 'cc-fp-cap' }, effortName) : null,
      h('span', { className: 'cc-fp-cap', 'aria-hidden': true }, busy ? '…' : '▴'));

    var menu = open ? h('div', { ref: menuRef, className: 'cc-root cc-fp-menu', onKeyDown: onKey,
      style: posS[0] ? { bottom: posS[0].bottom, right: posS[0].right } : undefined, 'data-cc-flat-picker': 'menu' },
      h(FlatModelTable, { rows: rows, highlight: hiS[0], efforts: efforts, status: msgS[0] || state.error || null,
        empty: state.status === 'loading' ? 'Loading' : 'No models available',
        onPick: function (r) { choose(selectionFor(r)); },
        onPickForMe: pickForMe,
        onEffort: function (e) { if (current) choose({ provider: current.provider, model: current.model, reasoningEffort: e.id }); } }))
      : null;
    return h('span', { style: { position: 'relative', display: 'inline-flex' } }, trigger, menu);
  }
  CC.FlatModelSelect = FlatModelSelect;

  // ------------------------------------------------------------------ registration
  var EMPTY_STORE = { subscribe: function () { return noop; }, getSnapshot: function () { return null; } };

  // The seat's per-session face. Never throws: a directory that cannot be resolved (unknown session,
  // missing service) gives a locked trigger instead of crashing the slot entry.
  function faceFor(dirs, sessions, sessionId) {
    var directory;
    try { directory = dirs.directoryFor(sessionId); } catch (e) { directory = null; warn('flat model picker: no model directory for this session', e); }
    if (!directory || !directory.store) {
      return { available: false, directory: EMPTY_STORE, load: noop, select: function () { return Promise.resolve(undefined); } };
    }
    var available = true;
    try { available = !(sessions && typeof sessions.subagentAddress === 'function' && sessions.subagentAddress(sessionId) !== undefined); } catch (e) { available = true; }
    return {
      available: available,
      directory: directory.store,
      load: function () { if (available) { try { Promise.resolve(directory.load()).catch(noop); } catch (e) { /* lands on the store */ } } },
      select: function (sel) { return available ? directory.select(sel) : Promise.resolve(undefined); }
    };
  }
  CC.flatPicker.faceFor = faceFor;
  CC.flatPicker.DEPS = DEPS;

  CC.applyFlatPicker = function applyFlatPicker(ctx) {
    try {
      if (off()) return;
      if (!ctx || typeof ctx.inject !== 'function') return; // older dsh / test ctx: dsh's picker stays, quietly
      ctx.inject(DEPS, function (scope) {
        try {
          var dirs = scope && scope.modelDirectories;
          if (!dirs || typeof dirs.directoryFor !== 'function') { warn('flat model picker skipped (no modelDirectories); dsh picker kept'); return; }
          var sessions = scope.sessions;
          var spec = { name: SLOT, priority: PRIORITY, inject: function (sessionId) { return faceFor(dirs, sessions, sessionId); } };
          if (typeof CC.contribute === 'function') CC.contribute(scope, SLOT, spec, FlatModelSelect, 'flat model picker');
          else scope.slots.inject(SLOT, function () { return scope.slots.register(spec, FlatModelSelect); });
        } catch (e) { warn('flat model picker not registered; dsh picker kept', e); }
      });
    } catch (e) { warn('flat model picker skipped; dsh picker kept', e); }
  };
})(CC);

		// ── page_todo.js
(function (CC) {
  // To-do page (page id cc-todo): one add field (Enter adds), then two lists. "For you" holds what
  // agents left for the owner, numbered in order with the next one marked; "For the computer" holds
  // what the owner jotted, each sent on with one click: Plan (a draft plan), Add to project (the
  // engine picks the project and writes a task with a done-check) or Run (a one-task item the
  // Autonomous tab starts). Done items fold into "Done (n)" at the bottom. The morning brief is one
  // meta line and its triage (merge duplicates, add to the project that fits) a compact list.
  // Engine routes: todo.py and brief.py (/api/todos*, /api/brief); the page renders with the engine down.
  'use strict';

  var PLAN_KEY = 'cc.plan.session';
  var CREATE_KEY = 'cc.create.project';
  var RUN_KEY = 'cc.autonomous.project';
  var TARGET_ORDER = ['plan', 'project', 'run'];
  var OPEN_STATES = { open: true, handed_off: true };

  var STYLE = [
    '.cc-root.cc-td{color:var(--cc-text);color-scheme:light;}',
    '@media (prefers-color-scheme: dark){.cc-root.cc-td:not([data-theme="light"]){color-scheme:dark;}}',
    '.cc-root.cc-td[data-theme="dark"],html[data-theme="dark"] .cc-root.cc-td,body.dark .cc-root.cc-td,body.theme-dark .cc-root.cc-td{color-scheme:dark;}',
    '.cc-root .cc-td-body{max-width:880px;}',
    // Add: one field; Enter adds. The small Add button is there for the mouse.
    '.cc-root .cc-td-add{display:flex;align-items:center;gap:8px;margin:0 0 8px;}',
    '.cc-root .cc-td-add .cc-in{flex:1 1 auto;min-width:0;}',
    '.cc-root .cc-td-err{font-size:12px;color:var(--cc-error);margin:0 0 8px;}',
    // Brief: one meta line; triage: a compact suggestion list, one button per row.
    '.cc-root .cc-td-brief{margin:0 0 4px;}',
    '.cc-root .cc-td-para{margin:0 0 8px;font-size:11px;line-height:16px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-td-tri{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-td-tri li{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(0,auto) auto;align-items:center;gap:10px;min-height:32px;padding:0 8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-td-tri li:last-child{border-bottom:0;}',
    '.cc-root .cc-td-tag{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-td-grow{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-td-to{max-width:280px;min-width:0;font-size:11px;color:var(--cc-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    // Rows: 32 px, a checkbox lead, text clamped to two lines (full text on hover; click expands).
    '.cc-root .cc-td-list{display:flex;flex-direction:column;}',
    '.cc-root .cc-td-row{display:grid;grid-template-columns:16px minmax(0,1fr) auto;column-gap:10px;row-gap:2px;align-items:start;min-height:32px;padding:7px 8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-td-row:last-child{border-bottom:0;}',
    '.cc-root .cc-td-row:hover{background:var(--cc-wash);}',
    '.cc-root .cc-td-row.cc-td-human{grid-template-columns:16px 16px minmax(0,1fr) auto;}',
    '.cc-root .cc-td-text{min-width:0;line-height:18px;overflow:hidden;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;cursor:pointer;}',
    '.cc-root .cc-td-text[aria-expanded="true"]{display:block;}',
    '.cc-root .cc-td-text:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;border-radius:2px;}',
    '.cc-root .cc-td-row.cc-td-closed .cc-td-text{color:var(--cc-text-3);text-decoration:line-through;}',
    // The checkbox itself is the kit's (ui.js: 16 px, accent); the lead span only sets it on the first text line.
    '.cc-root .cc-td-row > .cc-r-lead{height:18px;}',
    '.cc-root .cc-td input[type="checkbox"]:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    '.cc-root .cc-td-num{font-size:11px;line-height:18px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;text-align:right;}',
    '.cc-root .cc-td-tagnext,.cc-root .cc-td-tagnote{display:flex;align-items:center;min-height:18px;white-space:nowrap;}',
    '.cc-root .cc-td-tagnote{font-size:11px;color:var(--cc-text-3);}',
    // Row actions are quiet at rest: they show on hover or keyboard focus (and stay while a hand-off is in flight).
    '.cc-root .cc-td-acts{display:flex;gap:2px;align-items:center;margin:-3px 0;opacity:0;transition:opacity var(--cc-fast) ease;}',
    '.cc-root .cc-td-row:hover .cc-td-acts,.cc-root .cc-td-row:focus-within .cc-td-acts,.cc-root .cc-td-row.cc-td-live .cc-td-acts{opacity:1;}',
    '@media (hover: none){.cc-root .cc-td-acts{opacity:1;}}',
    '.cc-root .cc-td-hand{display:inline-flex;gap:2px;}',
    '.cc-root .cc-td-meta{grid-column:2 / -1;font-size:11px;line-height:16px;color:var(--cc-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-td-human .cc-td-meta,.cc-root .cc-td-human .cc-td-detail{grid-column:3 / -1;}',
    '.cc-root .cc-td-res{grid-column:2 / -1;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-td-res-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:18px;}',
    '.cc-root .cc-td-res-line > span:first-child{color:var(--cc-text-2);}',
    '.cc-root .cc-td-link{border:0;background:transparent;color:var(--cc-accent);font:inherit;font-size:11px;padding:0;cursor:pointer;}',
    '.cc-root .cc-td-link:hover{text-decoration:underline;}',
    '.cc-root .cc-td-link:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    '.cc-root .cc-td-pick{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
    '.cc-root .cc-td-detail{grid-column:2 / -1;display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--cc-text-2);}',
    '.cc-root .cc-td-detail a{color:var(--cc-accent);text-decoration:none;overflow-wrap:anywhere;}',
    '.cc-root .cc-td-detail a:hover{text-decoration:underline;}',
    '.cc-root .cc-td-dl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}',
    '.cc-root .cc-td-empty{font-size:12px;color:var(--cc-text-3);padding:6px 8px;}',
    '.cc-root .cc-td-more{display:flex;align-items:center;gap:6px;}',
    '.cc-root .cc-td-more svg{transition:transform var(--cc-fast) ease;}',
    '.cc-root .cc-td-more[aria-expanded="true"] svg{transform:rotate(90deg);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-td-acts,.cc-root .cc-td-more svg{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-todo-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-todo-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // The shared kit (ui.js). A harness that loads this file without ui.js gets a bare stand-in with the
  // same class names, so the page never depends on load order.
  var LITE = {
    Page: function (p) {
      return CC.h('div', { className: 'cc-root cc-page ' + (p.className || ''), 'data-cc': p.id }, p.header || null,
        CC.h('div', { className: 'cc-pb cc-pb-pad' }, p.children));
    },
    PageHeader: function (p) {
      return CC.h('div', { className: 'cc-ph', role: 'toolbar', 'aria-label': p.title }, CC.h('div', { className: 'cc-ph-title' }, p.title),
        p.meta ? CC.h('div', { className: 'cc-ph-meta' }, p.meta) : null, CC.h('div', { className: 'cc-ph-gap' }));
    },
    Section: function (p) {
      return CC.h('section', { className: 'cc-sec ' + (p.className || ''), 'aria-label': p.title },
        CC.h('div', { className: 'cc-sec-h' }, CC.h('div', { className: 'cc-sec-t' }, p.title),
          p.meta !== undefined && p.meta !== null ? CC.h('div', { className: 'cc-sec-m' }, p.meta) : null), p.children);
    },
    Badge: function (p) { return CC.h('span', { className: 'cc-bd' + (p.tone ? ' cc-bd-' + p.tone : '') }, p.children); },
    Empty: function (p) { return CC.h('div', { className: 'cc-em' }, CC.h('div', { className: 'cc-em-t' }, p.title), p.body ? CC.h('div', { className: 'cc-em-b' }, p.body) : null); },
    Icon: function () { return null; },
    ICONS: {}
  };
  function kit() { return CC.ui || LITE; }

  // Kit button classes, written directly so tests and the bundle see the same <button>.
  function btn(kind, size) { return 'cc-b' + (kind && kind !== 'default' ? ' cc-b-' + kind : '') + (size === 'sm' ? ' cc-b-sm' : ''); }

  function remember(key, value) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch (e) { /* storage blocked: the tab just opens unselected */ }
  }
  function go(panel) {
    try {
      if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') { CC.ctx.layout.selectPanel(panel); return true; }
    } catch (e) { /* fall through */ }
    return false;
  }

  // ------------------------------------------------------------ pure helpers
  function isOpen(t) { return !!OPEN_STATES[t.status]; }

  // Open todos, newest first; done ones only when asked for; dropped (merged away) never.
  function visibleTodos(todos, showDone) {
    var out = (todos || []).filter(function (t) { return isOpen(t) || (showDone && t.status === 'done'); });
    return out.slice().reverse();
  }

  function checkLine(check) {
    var c = check || {};
    if (c.type === 'command') return 'Done when ' + (c.run || 'its command') + ' passes';
    if (c.type === 'files_exist') return 'Done when ' + ((c.paths || []).join(', ') || 'its files') + ' exist';
    if (c.type === 'text_present') return 'Done when ' + (c.path || 'its file') + ' says ' + JSON.stringify(c.text || '');
    return 'Done when you confirm';
  }

  // The latest hand-off per target, in the order Plan, Project, Run.
  function handoffLines(todo) {
    var latest = {};
    (todo.handoffs || []).forEach(function (e) { latest[e.to] = e; });
    return TARGET_ORDER.filter(function (to) { return latest[to]; }).map(function (to) {
      var e = latest[to], ref = e.ref || {};
      if (to === 'plan') return { to: to, text: 'Plan: questions started', meta: null, open: 'Open Plan', ref: ref };
      if (to === 'project') {
        return { to: to, text: 'Added to ' + (ref.title || ref.project) + ' as ' + ref.node,
          meta: ref.check ? checkLine(ref.check) : null, open: 'Open project', ref: ref };
      }
      return { to: to, text: 'Run: ready in Autonomous', meta: ref.check ? checkLine(ref.check) : null, open: 'Open Autonomous', ref: ref };
    });
  }

  // Triage entries that still apply to the todos as they are now.
  function triageView(brief, todos) {
    var tri = (brief && brief.triage) || {};
    var status = {};
    (todos || []).forEach(function (t) { status[t.id] = t.status; });
    function live(id) { return status[id] === undefined || status[id] === 'open'; }
    var merges = [];
    (tri.merges || []).forEach(function (m) {
      var keepStatus = status[m.keep];
      if (keepStatus !== undefined && keepStatus !== 'open') return;
      var rest = (m.merge || []).filter(live);
      if (rest.length) merges.push(Object.assign({}, m, { merge: rest }));
    });
    var suggestions = (tri.suggestions || []).filter(function (s) { return status[s.todo] === 'open'; });
    return { merges: merges, suggestions: suggestions };
  }

  // Sections: the engine sends sections.{computer,human}; an old engine sends none, so every item is the computer's.
  function sectionsOf(data, todos) {
    var sec = data && data.sections;
    var byId = {};
    (todos || []).forEach(function (t) { byId[t.id] = t; });
    if (!sec || !Array.isArray(sec.computer) || !Array.isArray(sec.human)) {
      return { sectioned: false, computer: todos || [], human: [] };
    }
    function pick(list) {
      return list.map(function (t) { return byId[t.id] || t; }).filter(function (t) { return t && t.status !== 'dropped'; });
    }
    var human = pick(sec.human).sort(function (a, b) { return (a.position || 0) - (b.position || 0); });
    return { sectioned: true, computer: pick(sec.computer), human: human };
  }

  // "archives in 5h" from archive_due_at (rounded up); null when unset.
  function archiveNote(t, now) {
    if (!t || !t.archive_due_at) return null;
    var due = Date.parse(t.archive_due_at);
    if (isNaN(due)) return null;
    var hrs = Math.ceil((due - (now === undefined ? Date.now() : now)) / 3600000);
    return hrs <= 0 ? 'archives soon' : 'archives in ' + hrs + 'h';
  }

  // Where a computer item went: "-> project X, task Y" or "-> run".
  function wentTo(t) {
    var n = t && t.node;
    if (n && n.project) return '→ project ' + n.project + (n.id ? ', task ' + n.id : '');
    var hs = (t && t.handoffs) || [];
    var last = hs[hs.length - 1];
    if (!last) return null;
    var ref = last.ref || {};
    if (last.to === 'project') return '→ project ' + (ref.title || ref.project || '') + (ref.node ? ', task ' + ref.node : '');
    if (last.to === 'run') return '→ run';
    return null;
  }

  function nextOpenId(human) {
    for (var i = 0; i < human.length; i++) if (isOpen(human[i])) return human[i].id;
    return null;
  }

  function errText(e) {
    if (!e) return 'Something went wrong';
    if (!e.status) return 'The engine is not running';
    if (e.status === 403) return 'Only the owner can change this';
    return (e.data && (e.data.detail || e.data.error)) || e.message || 'Something went wrong';
  }
  function quote(text) { return '“' + text + '”'; }

  // The brief paragraph without its "Usage left: ..." sentence; the header already shows usage.
  function briefText(paragraph) {
    return String(paragraph || '').replace(/\s*Usage left:[\s\S]*?(?:\.(?=\s|$)|$)/g, '').trim();
  }

  CC.todoView = { visibleTodos: visibleTodos, handoffLines: handoffLines, checkLine: checkLine, triageView: triageView,
    briefText: briefText, style: STYLE,
    sectionsOf: sectionsOf, archiveNote: archiveNote, wentTo: wentTo, nextOpenId: nextOpenId };

  // ------------------------------------------------------------ pieces
  // The brief as one meta line, then the triage as a compact list with one button per suggestion.
  function Brief(props) {
    var h = CC.h;
    var brief = props.brief;
    if (!brief || !brief.paragraph) return null;
    var para = briefText(brief.paragraph);
    var tri = triageView(brief, props.todos);
    var items = [];
    tri.merges.forEach(function (m) {
      items.push(h('li', { key: 'm-' + m.keep },
        h('span', { className: 'cc-td-tag' }, 'Merge'),
        h('span', { className: 'cc-td-grow', title: m.text }, quote(m.text)),
        h('span', { className: 'cc-td-to' }, m.merge.length + ' similar'),
        h('button', { className: btn('default', 'sm'), type: 'button', disabled: props.busy,
          onClick: function () { props.onMerge(m); } }, 'Merge')));
    });
    tri.suggestions.forEach(function (s) {
      items.push(h('li', { key: 's-' + s.todo },
        h('span', { className: 'cc-td-tag' }, 'Project'),
        h('span', { className: 'cc-td-grow', title: s.text }, quote(s.text)),
        h('span', { className: 'cc-td-to', title: s.title }, '→ ' + s.title),
        h('button', { className: btn('default', 'sm'), type: 'button', disabled: props.busy, title: 'Add to ' + s.title,
          onClick: function () { props.onSuggest(s); } }, 'Add')));
    });
    // The summary line sits under the add field; the suggestions come after the two lists.
    if (props.part === 'line') {
      return para ? h('div', { className: 'cc-td-brief', 'aria-label': 'Morning brief', role: 'region' },
        h('p', { className: 'cc-td-para', title: para }, para)) : null;
    }
    return items.length ? h(kit().Section, { className: 'cc-td-sugg', title: 'Suggestions', meta: String(items.length) },
      h('ul', { className: 'cc-td-tri' }, items)) : null;
  }

  function Result(props) {
    var h = CC.h;
    var todo = props.todo, st = props.state || {};
    var lines = handoffLines(todo);
    var pick = st.pick;
    if (!lines.length && !st.error && !pick) return null;
    return h('div', { className: 'cc-td-res', 'aria-live': 'polite' },
      lines.map(function (l) {
        return h('div', { key: l.to, className: 'cc-td-res-line', title: l.meta || undefined },
          h('span', null, l.text),
          h('button', { className: 'cc-td-link', type: 'button', onClick: function () { props.onOpen(l); } }, l.open));
      }),
      pick ? h('div', { className: 'cc-td-pick' },
        h('span', null, 'No project fits clearly. Choose one:'),
        pick.map(function (c) {
          return h('button', { key: c.project, className: btn('default', 'sm'), type: 'button', disabled: !!st.busy,
            onClick: function () { props.onPick(c.project); } }, c.title || c.project);
        })) : null,
      st.error ? h('div', { className: 'cc-td-err', role: 'status' }, st.error) : null);
  }

  function Detail(props) {
    var h = CC.h, t = props.todo;
    var parts = [];
    if (t.link) parts.push(h('div', { key: 'link' }, h('a', { href: t.link, target: '_blank', rel: 'noopener noreferrer' }, t.link)));
    if (t.node && t.node.project) parts.push(h('div', { key: 'node' }, 'Project ' + t.node.project + (t.node.id ? ', task ' + t.node.id : '')));
    var dl = t.deliverables || [];
    if (t.status === 'done' && dl.length) {
      parts.push(h('ul', { key: 'dl', className: 'cc-td-dl', 'aria-label': 'Deliverables' }, dl.map(function (d, i) {
        var ref = (d.project || '') + (d.node ? ' / ' + d.node : '');
        if (d.url) return h('li', { key: i }, h('a', { href: d.url, target: '_blank', rel: 'noopener noreferrer' }, d.label || d.url));
        return h('li', { key: i }, (d.label ? d.label + ': ' : '') + ref);
      })));
    }
    if (!parts.length) parts.push(h('div', { key: 'none', className: 'cc-td-tagnote' }, t.status === 'done' ? 'Nothing to review.' : 'No details yet.'));
    return h('div', { className: 'cc-td-detail' }, parts);
  }

  // The item text: two lines at most, full text in the tooltip; a click expands it with its details.
  function textButton(props, t) {
    var h = CC.h;
    return h('div', { className: 'cc-td-text', role: 'button', tabIndex: 0, 'aria-expanded': !!props.expanded, title: t.text,
      onClick: function () { props.onToggle(t); },
      onKeyDown: function (e) { if (e && (e.key === 'Enter' || e.key === ' ')) { if (e.preventDefault) e.preventDefault(); props.onToggle(t); } } }, t.text);
  }

  function tick(props, t) {
    // A plain checkbox in the kit's row lead, so the kit's one checkbox style applies.
    return CC.h('span', { className: 'cc-r-lead' }, CC.h('input', { type: 'checkbox', checked: !!t.done, 'aria-label': (t.done ? 'Reopen ' : 'Mark done: ') + t.text,
      onChange: function () { props.onDone(t); } }));
  }

  // One item "for you": number, tick, text, Next / auto, archive note, expandable detail.
  function HumanRow(props) {
    var h = CC.h, t = props.todo, closed = !isOpen(t);
    var auto = t.done_by === 'engine' && t.status === 'done';
    var note = archiveNote(t);
    var tag = props.next ? h('span', { className: 'cc-td-tagnext' }, h(kit().Badge, { title: 'Do this one next' }, 'Next'))
      : (auto ? h('span', { className: 'cc-td-tagnote', title: 'Ticked by the engine' }, 'auto') : h('span', null));
    return h('div', { className: 'cc-td-row' + (props.index == null ? '' : ' cc-td-human') + (closed ? ' cc-td-closed' : ''), role: 'listitem', 'data-kind': 'todo', 'data-section': 'human', 'data-id': t.id },
      // Done items (no number) line up with the computer's rows in the Done list.
      props.index == null ? null : h('span', { className: 'cc-td-num' }, props.index + 1),
      tick(props, t),
      textButton(props, t),
      tag,
      note ? h('div', { className: 'cc-td-meta' }, note) : null,
      props.expanded ? h(Detail, { todo: t }) : null);
  }

  function Row(props) {
    var h = CC.h;
    var t = props.todo, st = props.state || {}, busy = st.busy;
    var closed = !isOpen(t);
    var label = { plan: 'Starting…', project: 'Adding…', run: 'Queuing…' };
    function send(to, name) {
      return h('button', { key: to, type: 'button', className: btn('quiet', 'sm'), disabled: !!busy || closed,
        onClick: function () { props.onHandoff(t, to); } }, busy === to ? label[to] : name);
    }
    var live = !!(busy || st.error || st.pick);
    var remove = h('button', { className: btn('quiet', 'sm') + ' cc-b-icon', type: 'button', 'aria-label': 'Remove', title: 'Remove',
      onClick: function () { props.onRemove(t); } }, '×');
    var meta = [wentTo(t), archiveNote(t)].filter(Boolean).join(' · ');
    return h('div', { className: 'cc-td-row' + (closed ? ' cc-td-closed' : '') + (live ? ' cc-td-live' : ''), role: 'listitem', 'data-kind': 'todo', 'data-section': 'computer', 'data-id': t.id },
      tick(props, t),
      textButton(props, t),
      closed ? h('div', { className: 'cc-td-acts' }, remove)
        : h('div', { className: 'cc-td-acts' },
          h('div', { className: 'cc-td-hand', role: 'group', 'aria-label': 'Send on' }, send('plan', 'Plan'), send('project', 'Add to project'), send('run', 'Run')),
          remove),
      meta ? h('div', { className: 'cc-td-meta' }, meta) : null,
      h(Result, { todo: t, state: st, onOpen: props.onOpen, onPick: function (project) { props.onHandoff(t, 'project', project); } }),
      props.expanded ? h(Detail, { todo: t }) : null);
  }

  // ------------------------------------------------------------ page
  CC.TodoPage = function TodoPage(props) {
    var React = CC.React, h = CC.h, UI = kit();
    var P = props || {};
    ensurePageStyle();
    var fixed = P.data !== undefined;
    var live = CC.useEngine ? CC.useEngine(fixed ? null : '/api/todos', ['todo', 'state', 'question']) : { data: null, error: null, loading: false };
    var liveBrief = CC.useEngine ? CC.useEngine(P.brief !== undefined ? null : '/api/brief', ['state', 'question']) : { data: null };
    var data = fixed ? P.data : live.data;
    var error = P.error !== undefined ? P.error : live.error;
    var brief = P.brief !== undefined ? P.brief : liveBrief.data;

    var sText = React.useState(P.initialText || ''), text = sText[0], setText = sText[1];
    var sOver = React.useState({}), over = sOver[0], setOver = sOver[1];
    var sAdded = React.useState([]), added = sAdded[0], setAdded = sAdded[1];
    var sRes = React.useState(P.initialResults || {}), results = sRes[0], setResults = sRes[1];
    var sDone = React.useState(!!P.initialShowDone), showDone = sDone[0], setShowDone = sDone[1];
    var sNote = React.useState(null), note = sNote[0], setNote = sNote[1];
    var sBusy = React.useState(false), busy = sBusy[0], setBusy = sBusy[1];
    var sOpen = React.useState(P.initialExpanded || {}), expanded = sOpen[0], setExpanded = sOpen[1];

    var base = (data && data.todos) || [];
    var known = {};
    base.forEach(function (t) { known[t.id] = true; });
    var todos = base.concat(added.filter(function (t) { return !known[t.id]; })).map(function (t) { return over[t.id] || t; });
    var secs = sectionsOf(data, todos);
    if (secs.sectioned) {
      // Items just added here but not yet in the engine's list belong to the computer section.
      var listed = {};
      secs.computer.concat(secs.human).forEach(function (t) { listed[t.id] = true; });
      secs.computer = secs.computer.concat(added.filter(function (t) { return !listed[t.id]; }).map(function (t) { return over[t.id] || t; }));
    }
    // Open items in each list; done ones (from both) fold into "Done (n)" at the bottom.
    var computerOpen = visibleTodos(secs.computer, false);
    var humanOpen = secs.human.filter(isOpen);
    var doneHuman = secs.human.filter(function (t) { return t.status === 'done'; });
    var doneComputer = secs.computer.filter(function (t) { return t.status === 'done'; }).slice().reverse();
    var doneCount = doneHuman.length + doneComputer.length;
    var openCount = todos.filter(isOpen).length;
    var nextId = nextOpenId(secs.human);

    function apply(todo) { if (todo && todo.id) setOver(function (p) { var n = Object.assign({}, p); n[todo.id] = todo; return n; }); }
    function setState(id, st) { setResults(function (p) { var n = Object.assign({}, p); n[id] = st; return n; }); }

    function add() {
      var value = text.trim();
      if (!value || busy) return;
      setBusy(true); setNote(null);
      var pr = CC.api.post('/api/todos', secs.sectioned ? { text: value, section: 'computer' } : { text: value });
      pr.then(function (r) {
        setBusy(false); setText('');
        if (r && r.todo) setAdded(function (p) { return p.concat([r.todo]); });
      }, function (e) { setBusy(false); setNote(errText(e)); });
    }
    function patch(todo, body) {
      var pr = CC.api.post('/api/todos/update', Object.assign({ id: todo.id }, body));
      pr.then(function (r) { apply(r && r.todo); }, function (e) { setNote(errText(e)); });
    }
    function onToggle(todo) {
      var opening = !expanded[todo.id];
      setExpanded(function (p) { var n = Object.assign({}, p); n[todo.id] = !p[todo.id]; return n; });
      if (opening) {
        var pr = CC.api.post('/api/todos/click', { id: todo.id });
        pr.then(function (r) { apply(r && r.todo); }, function () { /* the click record is best effort */ });
      }
    }
    function onDone(todo) { patch(todo, { done: !todo.done }); }
    function onRemove(todo) { patch(todo, { status: 'dropped' }); }

    function onHandoff(todo, to, project) {
      var body = { id: todo.id, to: to };
      if (project) body.project = project;
      setState(todo.id, { busy: to });
      var pr = CC.api.post('/api/todos/handoff', body);
      pr.then(function (r) {
        setState(todo.id, {});
        apply(r && r.todo);
      }, function (e) {
        var d = e && e.data;
        if (e && e.status === 409 && d && d.error === 'no_match') {
          setState(todo.id, { pick: (d.candidates || []).map(function (c) { return { project: c.project, title: c.title }; }) });
        } else {
          setState(todo.id, { error: errText(e) });
        }
      });
    }
    function onOpen(line) {
      var ref = line.ref || {}, ok = false;
      if (line.to === 'plan') { remember(PLAN_KEY, ref.session); ok = go('cc-plan'); }
      else if (line.to === 'project') { remember(CREATE_KEY, ref.project); CC.pendingProject = ref.project; ok = go('cc-create'); }
      else { remember(RUN_KEY, ref.project); ok = go('cc-sprints'); }
      if (!ok) setNote('Open it from the sidebar');
    }
    function onMerge(m) {
      setBusy(true); setNote(null);
      var pr = CC.api.post('/api/todos/merge', { keep: m.keep, merge: m.merge });
      pr.then(function (r) {
        setBusy(false);
        ((r && r.merged) || []).forEach(apply);
        apply(r && r.todo);
      }, function (e) { setBusy(false); setNote(errText(e)); });
    }
    function onSuggest(s) {
      var t = todos.filter(function (x) { return x.id === s.todo; })[0] || { id: s.todo };
      onHandoff(t, 'project', s.project);
    }

    function computerRow(t) {
      return h(Row, { key: t.id, todo: t, state: results[t.id], expanded: !!expanded[t.id], onToggle: onToggle,
        onHandoff: onHandoff, onDone: onDone, onRemove: onRemove, onOpen: onOpen });
    }
    function humanRow(t, i, next) {
      return h(HumanRow, { key: t.id, todo: t, index: i, next: next, expanded: !!expanded[t.id], onToggle: onToggle, onDone: onDone });
    }

    var offline = !data && error;
    var body;
    if (offline) {
      body = !error.status && typeof UI.CoreEmpty === 'function' ? h(UI.CoreEmpty, {}) : h(UI.Empty, { title: !error.status ? 'The engine is not running' : 'Could not load your to-dos',
        body: !error.status ? 'It starts at sign-in.' : errText(error) });
    } else {
      body = h('div', { className: 'cc-td-body' },
        h('form', { key: 'add', className: 'cc-td-add', onSubmit: function (e) { if (e && e.preventDefault) e.preventDefault(); add(); } },
          h('input', { className: 'cc-in', type: 'text', value: text, 'aria-label': 'Add a todo', placeholder: 'Add a to-do and press Enter',
            maxLength: 2000, onChange: function (e) { setText(e.target.value); } }),
          h('button', { className: btn('default'), type: 'submit', disabled: !text.trim() || busy,
            onClick: function (e) { if (e && e.preventDefault) e.preventDefault(); add(); } }, 'Add')),
        note ? h('div', { key: 'note', className: 'cc-td-err', role: 'status' }, note) : null,
        brief ? h(Brief, { key: 'brief', part: 'line', brief: brief, todos: todos }) : null,
        !data ? h('div', { key: 'load', className: 'cc-td-empty', role: 'status' }, 'Loading…') : null,
        data && secs.sectioned ? h(UI.Section, { key: 'human', className: 'cc-td-sec', title: 'For you', meta: humanOpen.length ? String(humanOpen.length) : null },
          humanOpen.length
            ? h('div', { className: 'cc-td-list', role: 'list' }, humanOpen.map(function (t, i) { return humanRow(t, i, t.id === nextId); }))
            : h('div', { className: 'cc-td-empty' }, 'Nothing for you right now.')) : null,
        data ? h(UI.Section, { key: 'computer', className: 'cc-td-sec', title: 'For the computer', meta: computerOpen.length ? String(computerOpen.length) : null },
          computerOpen.length
            ? h('div', { className: 'cc-td-list', role: 'list' }, computerOpen.map(computerRow))
            : h('div', { className: 'cc-td-empty' }, 'Nothing to do.')) : null,
        brief && data ? h(Brief, { key: 'sugg', brief: brief, todos: todos, busy: busy, onMerge: onMerge, onSuggest: onSuggest }) : null,
        data && doneCount ? h('section', { key: 'done', className: 'cc-sec cc-td-sec cc-td-done', 'aria-label': 'Done' },
          h('button', { className: btn('quiet', 'sm') + ' cc-td-more', type: 'button', 'aria-expanded': showDone,
            onClick: function () { setShowDone(!showDone); } },
            UI.Icon && UI.ICONS && UI.ICONS.chevron ? h(UI.Icon, { d: UI.ICONS.chevron, size: 14 }) : null, 'Done (' + doneCount + ')'),
          showDone ? h('div', { className: 'cc-td-list', role: 'list' },
            doneHuman.map(function (t) { return humanRow(t, null, false); }),
            doneComputer.map(computerRow)) : null) : null);
    }

    return h(UI.Page, { id: 'todo', className: 'cc-td', header: h(UI.PageHeader, { title: 'To-do', meta: data ? openCount + ' open' : null, pageId: 'cc-todo' }) },
      body);
  };
})(CC);

		// ── live_diff.js
(function (CC) {
  // Live change counter (node L1): while a dsh turn runs, a quiet right-sidebar panel lists
  // +added / -removed lines per file, read from the streamed edit / write / str_replace_editor tool
  // results. Nothing is sent anywhere and no model is called: it only reads events dsh already has.
  //
  // How it fits dsh without editing it
  //  * `ctx.uiConversation.events.register(definition)` is dsh's public registry for Conversation event
  //    Definitions (the same door dsh's own changed-files card uses). Ours is state-only (no target, no
  //    transcript node): it sees `turn/start`, `tool/call` and `tool/result` as they stream in and folds
  //    them into one in-memory store.
  //  * `ctx.sidebarRightTabs.register(...)` plus the keyed `sidebar.right.pane.tab` seat add a "Changes"
  //    page to the right sidebar's guide (+ button); `CC.LiveDiffPanel` is that page's body and also
  //    works embedded in a Waypoint page.
  //  * dsh's end-of-turn changed-files card (needs Coding Tools on) shows the final numbers; this is
  //    the running view of the same turn.
  //
  // Where the counts come from, best source first (dsh's own result strings carry no counts, so the
  // arguments and the recorded diff hunks do the work; Antigravity-style strings are read when seen):
  //   1. a result string like "Made 1 replacement in X (+1/-1 lines)"
  //   2. `meta.diffs` on the result (dsh-tool-fs hunks with context: counted by a line diff)
  //   3. the call's own arguments (edit old/new_string, write content, str_replace_editor create/
  //      str_replace/insert); `replace_all` is counted once, as the arguments cannot say how often.
  // Failed results add nothing. Replayed history never counts twice (calls are de-duplicated per turn).
  var NAME_KIND = 'cc-live-diff';
  // Internal tab id, keyed to the bundle's package id (never shown). The id from before the package
  // rename is still accepted so a saved right sidebar keeps its Changes tab.
  var TAB_ID = '@waypoint/dsh-plugin/live-diff';
  var LEGACY_TAB_ID = '@waypoint/dsh-control-centre/live-diff';
  var DIFF_CELL_CAP = 4000000; // beyond this many line pairs, count the whole span as replaced

  function warn(what, err) {
    if (typeof CC.warn === 'function') return CC.warn(what, err);
    try { console.warn('[waypoint] ' + what + (err ? ': ' + (err.message || err) : '')); } catch (e) { /* never throw */ }
  }
  function noop() {}
  function isObj(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }

  // ---- parsing ----------------------------------------------------------------------------------

  var COUNTS = /\(\s*\+(\d+)\s*\/\s*[-−](\d+)\s*lines?\s*\)/;
  var TEXT_PATH = /\breplacements? in (.+?)(?: starting at line \d+)? \(\s*\+/;

  // "Made 1 replacement in X starting at line 9 (+1/-1 lines)." -> { added, removed, path }.
  function parseResultText(text) {
    if (typeof text !== 'string') return null;
    var m = COUNTS.exec(text);
    if (!m) return null;
    var p = TEXT_PATH.exec(text);
    return { added: parseInt(m[1], 10), removed: parseInt(m[2], 10), path: p ? p[1] : null };
  }

  function toLines(text) {
    if (typeof text !== 'string' || text === '') return [];
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  }
  function lineCount(text) { return toLines(text).length; }

  // Added / removed line counts between two texts: trim the shared head and tail, then a longest
  // common subsequence over what is left (rolling rows, bounded).
  function diffCounts(before, after) {
    var a = toLines(before);
    var b = toLines(after);
    var lo = 0;
    while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;
    var ea = a.length;
    var eb = b.length;
    while (ea > lo && eb > lo && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    var n = ea - lo;
    var m = eb - lo;
    if (n === 0) return { added: m, removed: 0 };
    if (m === 0) return { added: 0, removed: n };
    if (n * m > DIFF_CELL_CAP) return { added: m, removed: n };
    var prev = new Array(m + 1);
    var cur = new Array(m + 1);
    var j;
    for (j = 0; j <= m; j++) prev[j] = 0;
    for (var i = 1; i <= n; i++) {
      cur[0] = 0;
      var ai = a[lo + i - 1];
      for (j = 1; j <= m; j++) {
        cur[j] = ai === b[lo + j - 1] ? prev[j - 1] + 1 : (prev[j] >= cur[j - 1] ? prev[j] : cur[j - 1]);
      }
      var t = prev; prev = cur; cur = t;
    }
    var lcs = prev[m];
    return { added: m - lcs, removed: n - lcs };
  }

  // dsh-tool-fs result meta: [{ path, oldText: string|null, newText }] hunks (context lines in both).
  function statsFromDiffs(diffs) {
    if (!Array.isArray(diffs) || !diffs.length) return null;
    var added = 0;
    var removed = 0;
    for (var i = 0; i < diffs.length; i++) {
      var d = diffs[i];
      if (!isObj(d) || typeof d.path !== 'string' || typeof d.newText !== 'string' ||
        !(d.oldText === null || typeof d.oldText === 'string')) return null;
      if (d.oldText === null) { added += lineCount(d.newText); continue; }
      var c = diffCounts(d.oldText, d.newText);
      added += c.added;
      removed += c.removed;
    }
    return { added: added, removed: removed };
  }

  function parseArgs(args) {
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { return null; } }
    return isObj(args) ? args : null;
  }
  function str(v) { return typeof v === 'string' ? v : null; }

  // Counts implied by a mutation call's own arguments -> { added, removed, path } or null.
  function statsFromCall(name, rawArgs) {
    var a = parseArgs(rawArgs);
    if (!a) return null;
    var c;
    if (name === 'edit') {
      if (!str(a.file_path) || str(a.old_string) === null || str(a.new_string) === null) return null;
      c = diffCounts(a.old_string, a.new_string);
      return { added: c.added, removed: c.removed, path: a.file_path };
    }
    if (name === 'write') {
      if (!str(a.file_path) || str(a.content) === null) return null;
      return { added: lineCount(a.content), removed: 0, path: a.file_path };
    }
    if (name === 'str_replace_editor') {
      if (!str(a.path)) return null;
      if (a.command === 'create' && str(a.file_text) !== null) return { added: lineCount(a.file_text), removed: 0, path: a.path };
      if (a.command === 'str_replace' && str(a.old_str) !== null) {
        c = diffCounts(a.old_str, str(a.new_str) === null ? '' : a.new_str);
        return { added: c.added, removed: c.removed, path: a.path };
      }
      if (a.command === 'insert' && str(a.new_str) !== null) return { added: lineCount(a.new_str), removed: 0, path: a.path };
    }
    return null;
  }

  function resultText(message) {
    var c = message && message.content;
    if (typeof c === 'string') return c;
    if (!Array.isArray(c)) return '';
    return c.map(function (b) { return b && typeof b.text === 'string' ? b.text : ''; }).join('\n');
  }

  var MUTATIONS = { edit: 1, write: 1, str_replace_editor: 1 };

  // One settled result -> { added, removed, path } or null. `call` is the matching tool/call, if seen.
  function statsFromResult(call, message, meta) {
    if (!isObj(message) || message.isError === true) return null;
    var metaPath = isObj(meta) && typeof meta.path === 'string' && meta.path ? meta.path : null;
    var text = parseResultText(resultText(message));
    var fromCall = call && MUTATIONS[call.name] ? statsFromCall(call.name, call.args) : null;
    var diffs = call && MUTATIONS[call.name] && isObj(meta) ? statsFromDiffs(meta.diffs) : null;
    var counts = text || diffs || fromCall;
    if (!counts) return null;
    var args = call ? parseArgs(call.args) : null;
    var path = metaPath || (text && text.path) || (fromCall && fromCall.path) ||
      (diffs && meta.diffs[0].path) || (args && (args.file_path || args.path)) || null;
    if (typeof path !== 'string' || !path) return null;
    return { added: counts.added, removed: counts.removed, path: path };
  }

  // ---- the store --------------------------------------------------------------------------------

  // One turn's running list. `ingest` takes dsh session events ({ type, seq, data }); everything it
  // does not recognise is ignored. A new turn (or a different turn/start event) starts a fresh list.
  function createStore() {
    var s = { turn: null, startSeq: null, files: [], index: {}, calls: {}, seen: {}, revision: 0 };
    var listeners = [];
    var cache = null;

    function snapshot() {
      if (cache && cache.revision === s.revision) return cache;
      var files = s.files.map(function (f) { return { path: f.path, added: f.added, removed: f.removed, edits: f.edits }; });
      var t = { added: 0, removed: 0, files: files.length, edits: 0 };
      files.forEach(function (f) { t.added += f.added; t.removed += f.removed; t.edits += f.edits; });
      cache = { revision: s.revision, turn: s.turn, files: files, totals: t };
      return cache;
    }
    function notify() {
      s.revision++;
      var snap = snapshot();
      listeners.slice().forEach(function (fn) { try { fn(snap); } catch (e) { warn('live diff listener failed', e); } });
    }
    function reset(turn, seq) {
      s = { turn: turn, startSeq: seq, files: [], index: {}, calls: {}, seen: {}, revision: s.revision };
      notify();
    }
    function add(path, added, removed) {
      var f = s.index[path];
      if (!f) { f = { path: path, added: 0, removed: 0, edits: 0 }; s.index[path] = f; s.files.push(f); }
      f.added += added;
      f.removed += removed;
      f.edits += 1;
    }

    function ingest(event) {
      try {
        if (!isObj(event) || !isObj(event.data)) return;
        var d = event.data;
        var turn = typeof d.turn === 'number' ? d.turn : null;
        if (event.type === 'turn/start') {
          if (turn !== s.turn || (event.seq !== undefined && event.seq !== s.startSeq)) reset(turn, event.seq === undefined ? null : event.seq);
          return;
        }
        if (event.type !== 'tool/call' && event.type !== 'tool/result') return;
        if (turn !== null && turn !== s.turn) reset(turn, null); // a window without its turn/start
        if (event.type === 'tool/call') {
          if (d.callId !== undefined && d.callId !== null) s.calls[String(d.callId)] = { name: d.name, args: d.arguments };
          return;
        }
        var msg = d.message;
        var callId = isObj(msg) && isObj(msg.source) && msg.source.callId !== undefined ? String(msg.source.callId)
          : (isObj(msg) && msg.toolCallId !== undefined ? String(msg.toolCallId) : null);
        var key = callId !== null ? callId : (event.seq !== undefined ? 'seq:' + event.seq : null);
        if (key !== null && s.seen[key]) return;
        var st = statsFromResult(callId !== null ? s.calls[callId] : null, msg, d.meta);
        if (key !== null) s.seen[key] = true;
        if (!st) return;
        add(st.path, st.added, st.removed);
        notify();
      } catch (e) { warn('live diff event skipped', e); }
    }

    return {
      ingest: ingest,
      snapshot: snapshot,
      subscribe: function (fn) {
        listeners.push(fn);
        return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
      }
    };
  }

  // ---- dsh event Definition ---------------------------------------------------------------------

  var store = createStore();

  // State-only Definition: it publishes no transcript node, it just feeds the store. Replacement
  // (compaction) copies of tool results are skipped; only append-origin results are real calls.
  var definition = {
    kind: NAME_KIND,
    match: function (event) {
      if (!isObj(event) || !isObj(event.data)) return null;
      var t = event.type;
      if (t !== 'turn/start' && t !== 'tool/call' && t !== 'tool/result') return null;
      if (typeof event.data.turn !== 'number') return null;
      if (t === 'tool/result' && isObj(event.surfaceOp)) return null;
      return { id: String(event.data.turn), role: t === 'turn/start' ? 'start' : 'update' };
    },
    start: function (_context, match) {
      store.ingest(match.event);
      return { turn: match.event.data.turn };
    },
    update: function (context, match) {
      store.ingest(match.event);
      return context.state && context.state.turn === match.event.data.turn ? context.state : { turn: match.event.data.turn };
    }
  };

  // ---- panel ------------------------------------------------------------------------------------

  var MINUS = '−';

  function splitPath(p) {
    var clean = String(p).replace(/\\/g, '/');
    var i = clean.lastIndexOf('/');
    var name = i < 0 ? clean : clean.slice(i + 1);
    var dir = i < 0 ? '' : clean.slice(0, i).split('/').filter(Boolean);
    var tail = dir ? dir.slice(-2).join('/') : '';
    return { name: name || clean, dir: dir && dir.length > 2 ? '…/' + tail : tail };
  }

  function LiveDiffPanel() {
    var R = CC.React || {};
    var h = CC.h;
    var T = CC.tokens || {};
    var size = T.size || {};
    var font = T.font || {};
    var state = typeof R.useState === 'function' ? R.useState(function () { return store.snapshot(); }) : [store.snapshot(), noop];
    if (typeof R.useEffect === 'function') {
      R.useEffect(function () {
        state[1](store.snapshot());
        return store.subscribe(function (snap) { state[1](snap); });
      }, []);
    }
    try { if (CC.ensureStyles) CC.ensureStyles(); } catch (e) { warn('styles not injected', e); }
    var snap = state[0];
    var meta = { fontSize: size.meta || 11, color: 'var(--cc-text-3)' };
    var mono = { fontFamily: font.mono, fontVariantNumeric: 'tabular-nums', fontSize: size.label || 12, whiteSpace: 'nowrap' };

    var body;
    if (!snap.files.length) {
      body = h('div', { 'data-cc-live': 'empty', style: Object.assign({ padding: '12px 0' }, meta) }, 'No edits yet this turn');
    } else {
      var t = snap.totals;
      body = [
        h('div', { key: 'total', 'data-cc-live': 'total', style: Object.assign({ display: 'flex', gap: 8, alignItems: 'baseline', padding: '0 0 8px',
          borderBottom: '1px solid var(--cc-line)' }, meta) },
        h('span', null, t.files + (t.files === 1 ? ' file' : ' files')),
        h('span', { style: mono }, h('span', { style: { color: 'var(--cc-done)' } }, '+' + t.added), ' ',
          h('span', { style: { color: 'var(--cc-error)' } }, MINUS + t.removed))),
        snap.files.map(function (f) {
          var p = splitPath(f.path);
          return h('div', { key: f.path, 'data-cc-live-row': f.path, title: f.path, style: { display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '6px 0', borderBottom: '1px solid var(--cc-line)', minWidth: 0 } },
          h('div', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            h('span', { style: { fontSize: size.label || 12, fontWeight: 500 } }, p.name),
            p.dir ? h('span', { style: Object.assign({ marginLeft: 8 }, meta) }, p.dir) : null),
          h('span', { 'data-cc-live': 'added', style: Object.assign({ color: 'var(--cc-done)' }, mono) }, '+' + f.added),
          h('span', { 'data-cc-live': 'removed', style: Object.assign({ color: 'var(--cc-error)', minWidth: 28, textAlign: 'right' }, mono) }, MINUS + f.removed));
        })
      ];
    }
    return h('div', { className: 'cc-root', 'data-cc-live': 'panel', style: { padding: 12, minHeight: '100%', boxSizing: 'border-box' } }, body);
  }

  // ---- wiring -----------------------------------------------------------------------------------

  // Called from CC.apply (app.js). Every step is guarded: a dsh without these seats just has no panel.
  CC.applyLiveDiff = function applyLiveDiff(ctx) {
    try {
      if (!ctx) return;
      var conv = ctx.uiConversation;
      var tabs = ctx.sidebarRightTabs;
      if (!conv || !conv.events || typeof conv.events.register !== 'function' || !tabs || typeof tabs.register !== 'function') {
        warn('Live changes skipped: dsh does not expose uiConversation / sidebarRightTabs to this plugin');
        return;
      }
      try { conv.events.register(definition); } catch (e) { warn('Live changes: event feed not registered', e); return; }
      var title = function () { return 'Changes'; };
      var register = function () {
        var off = tabs.register({
          id: TAB_ID, kind: NAME_KIND, title: title, keepMounted: true,
          guide: [{ id: 'live-diff', order: 90, title: title, description: function () { return 'Lines added and removed, live'; } }]
        });
        // A sidebar saved before the package rename still names the old id: keep it resolvable, with
        // no guide entry, so the + menu lists "Changes" once.
        var legacy = null;
        try { legacy = tabs.register({ id: LEGACY_TAB_ID, kind: NAME_KIND, title: title, keepMounted: true, guide: [] }); }
        catch (e) { warn('Live changes: old tab id not kept', e); }
        return function () {
          if (typeof off === 'function') off();
          if (typeof legacy === 'function') legacy();
        };
      };
      try { if (typeof ctx.effect === 'function') ctx.effect(register, 'waypoint: live changes tab type'); else register(); } catch (e) { warn('Live changes tab not registered', e); return; }
      if (typeof CC.contribute === 'function') {
        CC.contribute(ctx, 'sidebar.right.pane.tab', { name: 'sidebar.right.pane.tab', key: TAB_ID }, LiveDiffPanel, 'live changes panel');
        CC.contribute(ctx, 'sidebar.right.pane.tab', { name: 'sidebar.right.pane.tab', key: LEGACY_TAB_ID }, LiveDiffPanel, 'live changes panel (old id)');
      }
    } catch (e) { warn('Live changes skipped', e); }
  };

  CC.liveDiff = {
    parseResultText: parseResultText, lineCount: lineCount, diffCounts: diffCounts, statsFromDiffs: statsFromDiffs,
    statsFromCall: statsFromCall, statsFromResult: statsFromResult, createStore: createStore, splitPath: splitPath
  };
  CC.liveDiffStore = store;
  CC.liveDiffDefinition = definition;
  CC.LiveDiffPanel = LiveDiffPanel;
})(CC);

		// ── tab_approvals.js
// tab_approvals.js - CC.ApprovalsTab: everything that waits for the owner, in one place.
//   Needs you   open questions from agents (board_read needs): items (scale, choice, multi, text) answered
//               together, a choice question answered in one click per option, an approval with Approve/Reject.
//   Approvals   open to-dos that ask for a decision (every category except hands_on).
//   Hands-on    open to-dos in category hands_on: real effort, ticked with Done.
// Data: board_read with no project ({projects, todos, needs}). Writes: answer and todo_tick (with expected_rev),
// each through CC.wpc.act(..., ['board_read']) so the board reads again after the server answers.
// The answer input mirrors the reference page (sendAnswer): {decision, question, option | answers | text}.
(function (CC) {
  'use strict';
  var h = CC.h;

  var STYLE = [
    '.cc-root .cc-ap-q{padding:8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-ap-q:last-child{border-bottom:0;}',
    '.cc-root .cc-ap-where{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--cc-text-3);font-size:11px;}',
    '.cc-root .cc-ap-prob{margin:4px 0 0;color:var(--cc-text);}',
    '.cc-root .cc-ap-res{margin:2px 0 0;color:var(--cc-text-2);}',
    '.cc-root .cc-ap-it{margin:8px 0 0;}',
    '.cc-root .cc-ap-it-p{margin:0 0 4px;color:var(--cc-text);}',
    '.cc-root .cc-ap-pick{display:flex;flex-wrap:wrap;gap:4px;align-items:center;}',
    '.cc-root .cc-ap-pick label{display:inline-flex;align-items:center;gap:6px;margin-right:8px;}',
    '.cc-root .cc-ap-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;}',
    '.cc-root .cc-ap-acts .cc-in{flex:1 1 200px;width:auto;height:28px;}',
    '.cc-root .cc-ap-msg{margin-top:4px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-ap-on{border-color:var(--cc-accent);color:var(--cc-accent);}'
  ].join('\n');

  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-approvals')) return;
    var el = document.createElement('style');
    el.id = 'cc-tab-approvals';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ---- pure helpers (tested)

  function kindOf(q) {
    if (q && q.items && q.items.length) return 'items';
    if (q && q.options && q.options.length) return 'choice';
    return 'approval';
  }

  // The next value of one item after the owner picks `value` (single pick toggles off; multi adds/removes).
  function pick(item, current, value) {
    if (item.kind === 'multi') {
      var list = Array.isArray(current) ? current.slice() : [];
      var at = list.indexOf(value);
      if (at >= 0) list.splice(at, 1); else list.push(value);
      return list;
    }
    if (item.kind === 'text') return value;
    return current === value ? undefined : value;
  }

  function trim(s) { return typeof s === 'string' ? s.trim() : ''; }

  // {input} ready for the answer tool, or {error} in plain words. form = {picks: {itemId: value}, text}.
  function buildAnswer(q, form, decision, option) {
    form = form || {};
    var input = { decision: decision, question: q.id };
    var text = trim(form.text);
    if (decision === 'answers') {
      var answers = {}, picks = form.picks || {};
      (q.items || []).forEach(function (it) {
        var v = picks[it.id];
        if (it.kind === 'scale') {
          var n = Number(v);
          if (v !== undefined && v !== null && v !== '' && n >= 1 && n <= 9 && Math.floor(n) === n) answers[it.id] = n;
        } else if (it.kind === 'choice') {
          if (v !== undefined && (it.options || []).indexOf(v) >= 0) answers[it.id] = v;
        } else if (it.kind === 'multi') {
          var on = (Array.isArray(v) ? v : []).filter(function (x) { return (it.options || []).indexOf(x) >= 0; });
          if (on.length) answers[it.id] = on;
        } else if (trim(v)) {
          answers[it.id] = trim(v);
        }
      });
      if (!Object.keys(answers).length) return { error: 'Pick at least one answer first.' };
      input.answers = answers;
      return { input: input };
    }
    if (decision === 'option') {
      if ((q.options || []).indexOf(option) < 0) return { error: 'That is not one of the options.' };
      input.option = option;
    }
    if (decision === 'reply' && !text) return { error: 'Write a reply first.' };
    if (text) input.text = text;
    return { input: input };
  }

  function isOpen(t) { return t && (!t.status || t.status === 'open'); }

  function splitTodos(todos) {
    var out = { approvals: [], handsOn: [] };
    (todos || []).forEach(function (t) {
      if (!isOpen(t)) return;
      (t.category === 'hands_on' ? out.handsOn : out.approvals).push(t);
    });
    return out;
  }

  function tickInput(t) {
    var input = { id: t.id };
    if (t.rev !== undefined && t.rev !== null && Number(t.rev) >= 1) input.expected_rev = Number(t.rev);
    return input;
  }

  function titles(projects) {
    var map = {};
    (projects || []).forEach(function (p) { if (p && p.id) map[p.id] = p.title || p.id; });
    return map;
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function meta(needs, split) {
    return plural(needs.length, 'question', 'questions') + ' · ' + plural(split.approvals.length, 'approval', 'approvals') +
      ' · ' + split.handsOn.length + ' hands-on';
  }

  // One write: say "Sending…", call the tool, refresh board_read, then say the result. Resolves to true on success.
  function send(tool, input, say) {
    say('Sending…');
    return CC.wpc.act(tool, input, ['board_read']).then(function () {
      say(tool === 'todo_tick' ? 'Done.' : 'Answered; sent to the agent.');
      return true;
    }, function (err) {
      say((tool === 'todo_tick' ? 'Not done: ' : 'Not sent: ') + ((err && err.message) || 'error'));
      return false;
    });
  }

  // ---- view

  function Chip(p) { return p.title ? CC.ui.Badge({ title: 'Project', children: p.title }) : null; }

  function Question(p) {
    var ui = CC.ui, q = p.q, form = p.form || {}, busy = p.busy, kind = kindOf(q);
    function go(decision, option) {
      var r = buildAnswer(q, form, decision, option);
      if (r.error) { p.say(r.error); return undefined; }
      return p.onSend(r.input);
    }
    function setPick(it, value) {
      var picks = Object.assign({}, form.picks || {});
      picks[it.id] = pick(it, picks[it.id], value);
      p.onForm(Object.assign({}, form, { picks: picks }));
    }
    var body = [];
    if (kind === 'items') {
      q.items.forEach(function (it) {
        var cur = (form.picks || {})[it.id], ctl;
        if (it.kind === 'scale' || it.kind === 'choice') {
          var opts = it.kind === 'scale' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : (it.options || []);
          ctl = opts.map(function (o) {
            return h(ui.Button, { key: String(o), size: 'sm', className: cur === o ? 'cc-ap-on' : '', title: String(o),
              onClick: function () { setPick(it, o); }}, String(o));
          });
        } else if (it.kind === 'multi') {
          ctl = (it.options || []).map(function (o) {
            return h('label', { key: o }, h('input', { type: 'checkbox', checked: Array.isArray(cur) && cur.indexOf(o) >= 0,
              onChange: function () { setPick(it, o); } }), o);
          });
        } else {
          ctl = h('input', { className: 'cc-in', type: 'text', value: cur || '', placeholder: 'Your answer (optional)',
            'aria-label': it.prompt, onChange: function (e) { setPick(it, e.target.value); } });
        }
        body.push(h('div', { key: it.id, className: 'cc-ap-it' },
          h('div', { className: 'cc-ap-it-p' }, it.id + '. ' + it.prompt,
            it.kind === 'scale' ? ' (1 disagree, 9 agree)' : it.kind === 'multi' ? ' (tick any)' : ''),
          h('div', { className: 'cc-ap-pick', 'data-item': q.id + '/' + it.id }, ctl)));
      });
    }
    var acts = [];
    if (kind === 'items') {
      acts.push(h(ui.Button, { key: 'send', kind: 'primary', size: 'sm', disabled: busy, action: 'answer-items',
        onClick: function () { go('answers'); }}, 'Send answers'));
    } else {
      if (q.resolution || kind === 'approval') {
        acts.push(h(ui.Button, { key: 'ok', size: 'sm', disabled: busy, action: 'answer-approve',
          onClick: function () { go('approve'); }}, 'Approve'));
      }
      (q.options || []).forEach(function (o) {
        acts.push(h(ui.Button, { key: 'o-' + o, size: 'sm', disabled: busy, action: 'answer-option',
          className: o === q.recommended ? 'cc-ap-on' : '', title: o === q.recommended ? 'Recommended' : o,
          onClick: function () { go('option', o); }}, o + (o === q.recommended ? ' (recommended)' : '')));
      });
    }
    acts.push(h(ui.Button, { key: 'no', size: 'sm', kind: 'danger', disabled: busy, action: 'answer-reject',
      onClick: function () { go('reject'); }}, 'Reject'));
    if (kind !== 'items') {
      acts.push(h('input', { key: 'reply', className: 'cc-in', type: 'text', value: form.text || '', placeholder: 'Note or reply (optional)',
        'aria-label': 'Reply', onChange: function (e) { p.onForm(Object.assign({}, form, { text: e.target.value })); },
        onKeyDown: function (e) { if (e && e.key === 'Enter') go('reply'); } }));
      acts.push(h(ui.Button, { key: 'send', size: 'sm', disabled: busy, action: 'answer-reply',
        onClick: function () { go('reply'); }}, 'Send'));
    }
    return h('div', { className: 'cc-ap-q', 'data-cc-row': q.id },
      h('div', { className: 'cc-ap-where' }, Chip({ title: p.project }), q.node ? h('span', null, q.node) : null),
      h('div', { className: 'cc-ap-prob' }, q.problem || '(no problem written)'),
      q.resolution ? h('div', { className: 'cc-ap-res' }, 'Proposed: ' + q.resolution) : null,
      body,
      h('div', { className: 'cc-ap-acts' }, acts),
      p.msg ? h('div', { className: 'cc-ap-msg', role: 'status' }, p.msg) : null);
  }

  function TodoRow(p) {
    var ui = CC.ui, t = p.t;
    return ui.Row({ key: t.id, id: t.id, wrap: true, lead: Chip({ title: p.project }), title: t.text || t.id,
      sub: p.msg || undefined,
      trail: [
        t.link ? h('a', { key: 'open', className: 'cc-b cc-b-sm cc-b-quiet', href: t.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open') : null,
        h(ui.Button, { key: 'done', size: 'sm', disabled: p.busy, action: 'todo-done', title: 'Mark this done',
          onClick: p.onDone}, 'Done')
      ] });
  }

  function ApprovalsTab(props) {
    var React = CC.React, ui = CC.ui;
    ensureCss();
    var board = CC.useWpc('board_read', {});
    var formsSt = React.useState({}), forms = formsSt[0], setForms = formsSt[1];
    var busySt = React.useState(null), busy = busySt[0], setBusy = busySt[1];
    var msgSt = React.useState({}), msgs = msgSt[0], setMsgs = msgSt[1];
    var statusSt = React.useState(''), status = statusSt[0], setStatus = statusSt[1];

    function sayFor(key) {
      return function (m) {
        setStatus(m);
        setMsgs(function (prev) { var n = Object.assign({}, prev); n[key] = m; return n; });
      };
    }
    function run(key, tool, input) {
      if (busy) return undefined;
      setBusy(key);
      return send(tool, input, sayFor(key)).then(function (ok) {
        setBusy(null);
        if (ok) setForms(function (prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
        return ok;
      });
    }

    var data = board.data;
    var header = ui.PageHeader({ title: 'Approvals', pageId: props && props.pageId,
      meta: data ? meta(data.needs || [], splitTodos(data.todos)) : null,
      actions: h(ui.Button, { size: 'sm', kind: 'quiet', title: 'Read the board again', onClick: board.reload}, 'Refresh') });

    if (!data) {
      var inner = board.error ? h(CC.WpcProblem, { error: board.error })
        : ui.Empty({ title: board.loading ? 'Loading…' : 'Nothing to show yet' });
      return ui.Page({ page: 'approvals', header: header, children: inner });
    }

    var names = titles(data.projects);
    var needs = data.needs || [];
    var split = splitTodos(data.todos);
    var banners = [
      board.error ? h(ui.Banner, { key: 'stale', tone: 'error' }, 'Could not refresh: ' + (board.error.message || board.error.code) + ' Showing the last board.') : null,
      status ? h(ui.Banner, { key: 'status' }, status) : null
    ].filter(Boolean);

    var body;
    if (!needs.length && !split.approvals.length && !split.handsOn.length) {
      body = ui.Empty({ title: 'Nothing waits for you', body: 'Agent questions and to-dos show here when they arrive.' });
    } else {
      var todoRows = function (list) {
        return ui.List({ label: 'To-dos', children: list.map(function (t) {
          return TodoRow({ key: t.id, t: t, project: names[t.project] || t.project, busy: !!busy, msg: msgs[t.id],
            onDone: function () { return run(t.id, 'todo_tick', tickInput(t)); } });
        }) });
      };
      body = [
        ui.Section({ key: 'needs', section: 'needs', title: 'Needs you', meta: String(needs.length),
          children: needs.length ? needs.map(function (q) {
            return h(Question, { key: q.id, q: q, project: names[q.project] || q.project, form: forms[q.id], busy: !!busy, msg: msgs[q.id],
              say: sayFor(q.id),
              onForm: function (f) { setForms(function (prev) { var n = Object.assign({}, prev); n[q.id] = f; return n; }); },
              onSend: function (input) { return run(q.id, 'answer', input); } });
          }) : h('div', { className: 'cc-ap-msg' }, 'No open questions.') }),
        ui.Section({ key: 'approvals', section: 'approvals', title: 'Approvals', meta: String(split.approvals.length),
          children: split.approvals.length ? todoRows(split.approvals) : h('div', { className: 'cc-ap-msg' }, 'No decisions waiting.') }),
        ui.Section({ key: 'hands-on', section: 'hands-on', title: 'Hands-on', meta: String(split.handsOn.length),
          children: split.handsOn.length ? todoRows(split.handsOn) : h('div', { className: 'cc-ap-msg' }, 'No hands-on work waiting.') })
      ];
    }
    return ui.Page({ page: 'approvals', header: header, banner: banners.length ? banners : null, col: true, children: body });
  }

  CC.ApprovalsTab = ApprovalsTab;
  CC.approvalsTabInternals = { kindOf: kindOf, pick: pick, buildAnswer: buildAnswer, splitTodos: splitTodos,
    tickInput: tickInput, titles: titles, meta: meta, send: send };
})(CC);

		// ── tab_projects.js
// tab_projects.js - CC.ProjectsTab: every Waypoint project, grouped by family, with a version picker
// (newest active version first; archived versions behind a switch), progress and needs-you / hands-on
// markers per project. Choosing a project draws its task graph left to right in layers by dependency;
// choosing a task opens its panel. Read only: board_read {} for the list, board_read {project} for tasks.
(function (CC) {
  'use strict';
  var h = CC.h;

  var FINISHED = { done: 1, skipped: 1, carried: 1 };
  var STATUS_LABEL = { done: 'Done', running: 'Running', failed: 'Failed', error: 'Failed', needs_you: 'Needs you',
    pending: 'Waiting', ready: 'Ready', blocked: 'Blocked', skipped: 'Skipped', carried: 'Carried', submitted: 'Submitted' };
  var STATUS_VAR = { done: '--cc-done', running: '--cc-running', failed: '--cc-error', error: '--cc-error',
    needs_you: '--cc-accent', skipped: '--cc-neutral', carried: '--cc-neutral', submitted: '--cc-running' };
  var CW = 150, CH = 36, GAP_X = 32, GAP_Y = 10, PAD = 8;

  // ---- pure helpers (exported for tests)

  function statusLabel(s) { return STATUS_LABEL[s] || (s ? String(s).replace(/_/g, ' ') : 'Unknown'); }
  function statusFill(s) { return 'var(' + (STATUS_VAR[s] || '--cc-line-strong') + ')'; }
  function verLabel(p) { return p.version_range || p.version_label || (p.version != null ? 'v' + p.version : p.id); }

  // Families in board order; versions newest first. `current` is the newest active version, or the newest
  // archived one when `showArchived` is on and nothing in the family is active.
  function groupFamilies(projects, showArchived) {
    var groups = {}, order = [];
    (projects || []).forEach(function (p) {
      if (!p || !p.id) return;
      var fam = p.family || p.id;
      if (!groups[fam]) { groups[fam] = { id: fam, all: [] }; order.push(fam); }
      groups[fam].all.push(p);
    });
    var out = [];
    order.forEach(function (fam) {
      var g = groups[fam];
      g.all.sort(function (a, b) { return (Number(b.version) || 0) - (Number(a.version) || 0); });
      var active = g.all.filter(function (v) { return !v.archived; });
      var versions = showArchived ? g.all : active;
      if (!versions.length) return;
      out.push({ id: fam, versions: versions, active: active[0] || null, current: active[0] || versions[0] });
    });
    return out.filter(function (g) { return g.active; }).concat(out.filter(function (g) { return !g.active; }));
  }

  function progress(nodes) {
    var list = nodes || [];
    return { done: list.filter(function (n) { return FINISHED[n.status]; }).length, total: list.length };
  }

  // needs you: a quick approval. hands-on: real effort from a person.
  function nodeTag(n) {
    if (!n || FINISHED[n.status]) return null;
    var role = String(n.role || '').toLowerCase(), kind = String(n.kind || '').toLowerCase();
    if (role === 'human' || kind === 'hands_on') return 'hands';
    if (n.status === 'needs_you') return 'need';
    return null;
  }
  function countTags(nodes, todos) {
    var need = 0, hands = 0;
    (nodes || []).forEach(function (n) { var t = nodeTag(n); if (t === 'need') need++; else if (t === 'hands') hands++; });
    (todos || []).forEach(function (t) { if (t && t.category === 'hands_on') hands++; else need++; });
    return { need: need, hands: hands };
  }

  function edgesOf(nodes) {
    var ids = {};
    (nodes || []).forEach(function (n) { ids[n.id] = 1; });
    var edges = [];
    (nodes || []).forEach(function (n) {
      (n.deps || []).forEach(function (d) { d = typeof d === 'string' ? d : d && d.id; if (ids[d]) edges.push([d, n.id]); });
    });
    return edges;
  }

  // Layers left to right: each task sits one layer right of its deepest dependency (a cycle stops after n passes).
  function layoutLR(nodes, edges, ch, cw) {
    ch = ch || CH; cw = cw || CW;
    var layer = {}, rows = {}, pos = {}, w = 0, hgt = 0;
    (nodes || []).forEach(function (n) { layer[n.id] = 0; });
    for (var i = 0; i < (nodes || []).length; i++) {
      var moved = false;
      (edges || []).forEach(function (e) { if (layer[e[1]] <= layer[e[0]]) { layer[e[1]] = layer[e[0]] + 1; moved = true; } });
      if (!moved) break;
    }
    (nodes || []).forEach(function (n) {
      var r = layer[n.id]; rows[r] = (rows[r] || 0) + 1;
      pos[n.id] = { x: PAD + r * (cw + GAP_X), y: PAD + (rows[r] - 1) * (ch + GAP_Y) };
      w = Math.max(w, pos[n.id].x + cw + PAD); hgt = Math.max(hgt, pos[n.id].y + ch + PAD);
    });
    return { pos: pos, layer: layer, w: w, h: hgt };
  }

  function checkText(c) {
    if (c === null || c === undefined || c === '') return '';
    if (typeof c !== 'object') return String(c);
    var body = c.command || c.cmd || (c.paths && [].concat(c.paths).join(', ')) || c.text || c.pattern || c.prompt || '';
    return (c.type ? c.type + (body ? ': ' : '') : '') + body;
  }
  function claimText(c) {
    if (!c) return '';
    return (c.owner || 'someone') + (c.claimed_by && c.claimed_by !== c.owner ? ' (' + c.claimed_by + ')' : '') +
      (c.since ? ' since ' + String(c.since).replace('T', ' ').slice(0, 16) : '');
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // ---- styles (tokens only)

  var css = [
    '.cc-root .cc-pj-body{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-root .cc-pj-list{flex:none;width:320px;min-height:0;overflow:auto;border-right:1px solid var(--cc-line);padding:8px;}',
    '.cc-root .cc-pj-graphbox{padding:16px;}',
    '.cc-root .cc-pj-ver{width:auto;height:24px;padding:0 20px 0 6px;font-size:var(--cc-fs-meta,12px);}',
    '.cc-root .cc-pj-marks{display:inline-flex;gap:4px;align-items:center;}',
    '.cc-root .cc-pj-graph{display:block;max-width:100%;height:auto;}',
    '.cc-root .cc-pj-graph .cc-pj-card{fill:var(--cc-surface);stroke:var(--cc-line-strong);stroke-width:1;}',
    '.cc-root .cc-pj-graph g[data-node]{cursor:pointer;outline:none;}',
    '.cc-root .cc-pj-graph g[data-node]:hover .cc-pj-card,.cc-root .cc-pj-graph g[data-node]:focus .cc-pj-card{stroke:var(--cc-text-2);}',
    '.cc-root .cc-pj-graph g[aria-selected="true"] .cc-pj-card{stroke:var(--cc-accent);stroke-width:1.5;fill:var(--cc-selection);}',
    '.cc-root .cc-pj-graph .cc-pj-edge{fill:none;stroke:var(--cc-line-strong);stroke-width:1.2;}',
    '.cc-root .cc-pj-graph .cc-pj-arrow{fill:var(--cc-line-strong);}',
    '.cc-root .cc-pj-graph text{font-size:11px;fill:var(--cc-text);}',
    '.cc-root .cc-pj-graph text.cc-pj-sub{font-size:10px;fill:var(--cc-text-3);font-family:var(--cc-mono);}',
    '.cc-root .cc-pj-graph text.cc-pj-need{font-size:10px;fill:var(--cc-accent);font-weight:600;}',
    '.cc-root .cc-pj-graph text.cc-pj-hands{font-size:10px;fill:var(--cc-running);font-weight:600;}',
    '.cc-root .cc-pj-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:var(--cc-fs-meta,12px);color:var(--cc-text-3);}',
    '.cc-root .cc-pj-legend i{display:inline-block;width:8px;height:8px;margin-right:4px;border-radius:2px;vertical-align:0;}',
    '.cc-root .cc-pj-np{padding:12px 16px;}',
    '.cc-root .cc-pj-np-h{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;}',
    '.cc-root .cc-pj-np-t{flex:1 1 auto;min-width:0;font-weight:600;overflow-wrap:anywhere;}',
    '.cc-root .cc-pj-need{margin:0 0 6px;}',
    '.cc-root .cc-pj-need p{margin:2px 0;}'
  ].join('\n');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    var had = document.getElementById ? document.getElementById('cc-tab-projects') : null;
    if (had) { if (had.textContent !== css) had.textContent = css; return; }
    var el = document.createElement('style');
    el.id = 'cc-tab-projects';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ---- components

  function Marks(p) {
    var t = p.tags || { need: 0, hands: 0 };
    return h('span', { className: 'cc-pj-marks' },
      t.need ? CC.ui.Badge({ tone: 'action', title: 'Quick yes or no waiting', children: t.need + ' needs you' }) : null,
      t.hands ? CC.ui.Badge({ tone: 'run', title: 'Real effort from a person', children: t.hands + ' hands-on' }) : null);
  }

  // One family: the chosen version, its progress and markers. Reads that version's board slowly for the counts.
  function FamilyRow(p) {
    var g = p.family, cur = p.current;
    var b = CC.useWpc('board_read', { project: cur.id }, { every: 60000 });
    var nodes = (b.data && b.data.nodes) || null;
    var pr = nodes ? progress(nodes) : null;
    var tags = nodes ? countTags(nodes, b.data.todos) : null;
    var picker = g.versions.length > 1 ? h('select', {
      className: 'cc-in cc-pj-ver', value: cur.id, 'aria-label': 'Version of ' + (cur.title || cur.id), title: g.versions.length + ' versions',
      onChange: function (e) { p.onVersion(g.id, e && e.target ? e.target.value : cur.id); }
    }, g.versions.map(function (v) {
      return h('option', { key: v.id, value: v.id }, verLabel(v) + (v.archived ? ' (archived)' : ''));
    })) : null;
    return CC.ui.Row({
      key: g.id, id: cur.id, selected: p.selected, off: !!cur.archived, wrap: true,
      onClick: function () { p.onPick(cur.id); },
      title: cur.title || cur.id,
      sub: [pr ? pr.done + '/' + pr.total + ' done' : (b.error ? 'not read' : '…'),
        cur.archived ? ' · archived' : '', g.versions.length === 1 && cur.version_range ? ' · ' + cur.version_range : ''].join(''),
      meta: tags ? h(Marks, { tags: tags }) : null,
      trail: picker
    });
  }

  function Graph(p) {
    var nodes = p.nodes, edges = edgesOf(nodes), L = layoutLR(nodes, edges, CH, CW);
    var chars = Math.floor((CW - 16) / 6);
    var parts = [h('defs', { key: 'defs' }, h('marker', { id: 'cc-pj-ah', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto' },
      h('path', { className: 'cc-pj-arrow', d: 'M0 0L8 4L0 8z' })))];
    edges.forEach(function (e) {
      var a = L.pos[e[0]], c = L.pos[e[1]];
      var sx = a.x + CW, sy = a.y + CH / 2, tx = c.x, ty = c.y + CH / 2, mx = (sx + tx) / 2;
      parts.push(h('path', { key: e[0] + '>' + e[1], className: 'cc-pj-edge', markerEnd: 'url(#cc-pj-ah)',
        d: 'M' + sx + ' ' + sy + 'C' + mx + ' ' + sy + ' ' + mx + ' ' + ty + ' ' + tx + ' ' + ty }));
    });
    nodes.forEach(function (n) {
      var q = L.pos[n.id], tag = nodeTag(n), tagText = tag === 'need' ? 'needs you' : tag === 'hands' ? 'hands-on' : '';
      var pick = function () { p.onPick(n.id); };
      parts.push(h('g', {
        key: n.id, 'data-node': n.id, role: 'button', tabIndex: 0, 'aria-selected': p.selected === n.id ? 'true' : 'false',
        'aria-label': (n.title || n.id) + ', ' + statusLabel(n.status) + (tagText ? ', ' + tagText : ''),
        onClick: pick, onKeyDown: function (e) { if (e && (e.key === 'Enter' || e.key === ' ')) { if (e.preventDefault) e.preventDefault(); pick(); } }
      },
        h('title', null, (n.title || n.id) + ' | ' + n.id + ' | ' + statusLabel(n.status)),
        h('rect', { className: 'cc-pj-card', x: q.x, y: q.y, width: CW, height: CH, rx: 3 }),
        h('rect', { x: q.x, y: q.y, width: 4, height: CH, fill: statusFill(n.status) }),
        h('text', { x: q.x + 10, y: q.y + 15 }, clip(n.title || n.id, chars)),
        h('text', { className: 'cc-pj-sub', x: q.x + 10, y: q.y + 29 }, clip(n.id, tagText ? chars - tagText.length - 2 : chars)),
        tagText ? h('text', { className: 'cc-pj-' + tag, x: q.x + CW - 6, y: q.y + 29, textAnchor: 'end' }, tagText) : null));
    });
    return h('svg', { className: 'cc-pj-graph', viewBox: '0 0 ' + Math.ceil(L.w) + ' ' + Math.ceil(L.h),
      width: Math.ceil(L.w), height: Math.ceil(L.h), role: 'group', 'aria-label': 'Task graph' }, parts);
  }

  function Legend() {
    var item = function (k, label, style) { return h('span', { key: k }, h('i', { style: style }), label); };
    return h('div', { className: 'cc-pj-legend' },
      item('d', 'Done', { background: 'var(--cc-done)' }), item('r', 'Running', { background: 'var(--cc-running)' }),
      item('f', 'Failed', { background: 'var(--cc-error)' }), item('n', 'Needs you', { background: 'var(--cc-accent)' }),
      item('w', 'Waiting', { background: 'var(--cc-line-strong)' }));
  }

  function NodePanel(p) {
    var n = p.node || {};
    var dash = '–';
    var deps = (n.deps || []).map(function (d) { return typeof d === 'string' ? d : d && d.id; }).filter(Boolean);
    var needs = n.needs || [];
    var kv = function (k, v) { return [h('dt', { key: k + 't' }, k), h('dd', { key: k + 'd' }, v || dash)]; };
    var needsBody = needs.length ? needs.map(function (q) {
      return h('div', { key: q.id, className: 'cc-pj-need' }, h('p', null, q.problem || 'No question text.'),
        q.resolution ? h('p', null, 'Proposed: ' + q.resolution) : null);
    }) : (n.status === 'needs_you' ? 'Waiting for an answer. No question was written.' : '');
    var tag = nodeTag(n);
    return h('div', { className: 'cc-pj-np', 'data-cc-node': n.id || undefined },
      h('div', { className: 'cc-pj-np-h' },
        h('div', { className: 'cc-pj-np-t' }, n.title || n.id || 'Task'),
        tag ? h(Marks, { tags: { need: tag === 'need' ? 1 : 0, hands: tag === 'hands' ? 1 : 0 } }) : null,
        p.onClose ? CC.ui.Button({ kind: 'quiet', size: 'sm', icon: CC.ui.ICONS.close, title: 'Close', onClick: p.onClose }) : null),
      h('dl', { className: 'cc-kv' },
        kv('Task', n.id), kv('Status', statusLabel(n.status)), kv('Goal', n.goal), kv('Check', checkText(n.check)),
        kv('Depends on', deps.join(', ')), kv('Evidence', typeof n.evidence === 'object' && n.evidence ? JSON.stringify(n.evidence) : n.evidence),
        kv('Claim', claimText(n.claim)), kv('Needs you', needsBody)));
  }

  function ProjectsTab(p) {
    p = p || {};
    ensureCss();
    var React = CC.React;
    var arch = React.useState(false), showArchived = arch[0], setArchived = arch[1];
    var pk = React.useState({}), picked = pk[0], setPicked = pk[1];
    var sp = React.useState(p.initialProject || null), chosen = sp[0], setChosen = sp[1];
    var sn = React.useState(p.initialNode || null), node = sn[0], setNode = sn[1];

    var list = CC.useWpc('board_read', {});
    var projects = (list.data && list.data.projects) || [];
    var fams = groupFamilies(projects, showArchived).map(function (g) {
      var want = picked[g.id] || (chosen && g.versions.some(function (v) { return v.id === chosen; }) ? chosen : null);
      var cur = g.versions.filter(function (v) { return v.id === want; })[0] || g.current;
      return { family: g, current: cur };
    });
    var visible = {};
    fams.forEach(function (f) { f.family.versions.forEach(function (v) { visible[v.id] = 1; }); });
    var selected = chosen && visible[chosen] ? chosen : (fams[0] ? fams[0].current.id : null);
    var board = CC.useWpc(selected ? 'board_read' : null, selected ? { project: selected } : {});

    var activeN = fams.filter(function (f) { return f.family.active; }).length;
    var header = CC.ui.PageHeader({ title: 'Projects', pageId: p.pageId,
      meta: list.data ? activeN + ' active · ' + projects.length + ' versions' : null,
      actions: h('label', { className: 'cc-pj-marks', title: 'Show archived versions' },
        CC.ui.Toggle({ checked: showArchived, label: 'Show archived', onChange: setArchived }), 'Show archived') });

    function page(body, banner) {
      return CC.ui.Page({ page: 'projects', header: header, banner: banner || null, raw: true, children: body });
    }
    if (!list.data) {
      if (list.error) return page(h('div', { className: 'cc-pb' }, CC.WpcProblem({ error: list.error })));
      return page(h('div', { className: 'cc-pb' }, CC.ui.Empty({ title: 'Loading projects…' })));
    }
    var banner = list.error ? CC.ui.Banner({ tone: 'error', children: 'Showing the last answer. ' + (list.error.message || 'Waypoint could not answer.'),
      action: CC.ui.Button({ size: 'sm', onClick: list.reload, children: 'Try again' }) }) : null;
    if (!fams.length) {
      var anyArchived = projects.length > 0;
      return page(h('div', { className: 'cc-pb' }, CC.ui.Empty({
        title: anyArchived ? 'No active projects' : 'No projects yet',
        body: anyArchived ? 'Every version is archived. Turn on Show archived to see them.' : 'Plan a project in Waypoint and it shows here.'
      })), banner);
    }

    var onPick = function (id) { setChosen(id); setNode(null); };
    var onVersion = function (fam, id) {
      var next = Object.assign({}, picked); next[fam] = id; setPicked(next); onPick(id);
    };
    var listEl = h('nav', { className: 'cc-pj-list', 'aria-label': 'Projects' },
      CC.ui.List({ label: 'Project families', children: fams.map(function (f) {
        return h(FamilyRow, { key: f.family.id, family: f.family, current: f.current, selected: f.current.id === selected,
          onPick: onPick, onVersion: onVersion });
      }) }));

    var proj = projects.filter(function (x) { return x.id === selected; })[0] || {};
    var nodes = (board.data && board.data.nodes) || [];
    var graphBody;
    if (!board.data) {
      graphBody = board.error ? CC.WpcProblem({ error: board.error }) : CC.ui.Empty({ title: 'Loading tasks…' });
    } else if (!nodes.length) {
      graphBody = CC.ui.Empty({ title: 'No tasks in this version yet.', body: 'Add tasks in Waypoint and the graph shows here.' });
    } else {
      graphBody = [
        board.error ? CC.ui.Banner({ key: 'bn', tone: 'error', children: 'Tasks may be out of date. ' + (board.error.message || '') }) : null,
        board.data.cycle ? CC.ui.Banner({ key: 'cy', tone: 'error', children: 'The tasks have a dependency loop: ' + board.data.cycle }) : null,
        h(Graph, { key: 'g', nodes: nodes, selected: node, onPick: setNode }),
        h(Legend, { key: 'l' })
      ];
    }
    var pr = progress(nodes);
    var main = h('div', { className: 'cc-split-main' }, h('div', { className: 'cc-pj-graphbox' },
      CC.ui.Section({ title: (proj.title || selected) + (proj.version != null ? ' · ' + verLabel(proj) : ''),
        meta: board.data ? pr.done + '/' + pr.total + ' done' : null, section: 'graph', children: graphBody })));
    var nodeObj = node ? nodes.filter(function (n) { return n.id === node; })[0] : null;
    var side = nodeObj ? h('aside', { className: 'cc-split-side', 'aria-label': 'Task details' },
      h(NodePanel, { node: nodeObj, onClose: function () { setNode(null); } })) : null;

    return page(h('div', { className: 'cc-pj-body' }, listEl, h('div', { className: 'cc-split' }, main, side)), banner);
  }

  CC.ProjectsTab = ProjectsTab;
  CC.projectsTabInternals = {
    groupFamilies: groupFamilies, progress: progress, nodeTag: nodeTag, countTags: countTags, edgesOf: edgesOf,
    layoutLR: layoutLR, checkText: checkText, claimText: claimText, statusLabel: statusLabel, verLabel: verLabel,
    NodePanel: NodePanel, Graph: Graph, FamilyRow: FamilyRow, css: css
  };
})(CC);

		// ── tab_running.js
// tab_running.js - CC.RunningTab: the Running and usage tab. One read, ops_read (every 20 s), shows
//   - what runs now (project, node, by, since),
//   - usage per pool as a Meter (remaining %, reset time) with an editable floor (floor_set),
//     coloured by pace against the floor (Waypoint Claude v8 rule),
//   - providers with state (up, down = fail, off) and an on/off switch (toggle_set),
//   - sprints (start, project, mode, next, overnight).
// Pools and providers come from the user's own data folder; nothing here names a vendor.
// Every write goes through CC.wpc.act and refreshes ops_read; the screen changes only on the server's answer.
(function (CC) {
  'use strict';
  var h = CC.h;
  var EVERY = 20000;
  var REFRESH = ['ops_read'];

  // ---------- pure helpers (CC.runningTabInternals) ----------

  var I = { now: function () { return Date.now(); } };

  function list(x) { return Array.isArray(x) ? x : []; }

  // Floor text from the input: "" (or spaces) clears the floor (null); otherwise a number from 0 to 100.
  function parseFloor(text) {
    var s = String(text == null ? '' : text).trim();
    if (s === '') return { ok: true, value: null };
    if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'Floor must be 0 to 100, or empty.' };
    var n = Number(s);
    if (!isFinite(n) || n < 0 || n > 100) return { ok: false, error: 'Floor must be 0 to 100, or empty.' };
    return { ok: true, value: n };
  }

  // The floor_set input for one pool, or the validation error.
  function floorInput(pool, text) {
    var r = parseFloor(text);
    if (!r.ok) return r;
    return { ok: true, input: { pool: String(pool), min_percent: r.value } };
  }

  // The toggle_set input that flips one provider.
  function toggleInput(provider) {
    return { id: String(provider.id), enabled: !provider.enabled };
  }

  function problemText(err) { return (err && (err.message || err.code)) || 'Waypoint could not answer.'; }

  // Saves one floor. Resolves to the status line text (also for a refusal or a bad value; never rejects).
  function saveFloor(pool, text) {
    var r = floorInput(pool, text);
    if (!r.ok) return Promise.resolve(r.error);
    return CC.wpc.act('floor_set', r.input, REFRESH).then(function (out) {
      var v = out && out.min_percent !== undefined ? out.min_percent : r.input.min_percent;
      return 'Floor for ' + pool + (v == null ? ' cleared.' : ' set to ' + v + '%.');
    }, function (err) { return 'Floor not saved: ' + problemText(err); });
  }

  // Switches one provider on or off. Resolves to the status line text.
  function runToggle(provider) {
    var input = toggleInput(provider);
    var name = provider.label || provider.id;
    return CC.wpc.act('toggle_set', input, REFRESH).then(function (out) {
      var on = out && typeof out.enabled === 'boolean' ? out.enabled : input.enabled;
      return name + ' switched ' + (on ? 'on.' : 'off.');
    }, function (err) { return name + ' not switched: ' + problemText(err); });
  }

  // Pace against the floor (v8): spending evenly from 100% down to the floor over the pool's window is on pace.
  // Returns {hue, tone, word}: green (135) on or under pace, amber slightly over, red (0) far over or at the floor;
  // null when the window or reset time is unknown; {stale: true} when the reset time has passed.
  var PACE_TOL = 0.02, PACE_RED = 0.3;
  function poolWindow(pool) {
    var s = String(pool || '').toLowerCase();
    return /5h/.test(s) ? 5 * 3600e3 : /week|7d/.test(s) ? 7 * 86400e3 : /day|24h/.test(s) ? 86400e3 : null;
  }
  function paceOf(p, now) {
    var win = poolWindow(p.pool), reset = Date.parse(p.resets_at || '');
    if (!win || isNaN(reset)) return null;
    var left = reset - now;
    if (left <= 0) return { stale: true, word: 'reset since this reading' };
    var floor = Math.max(0, Math.min(99, Number(p.floor) || 0)), rem = Number(p.remaining_percent) || 0;
    if (rem <= floor) return { hue: 0, tone: 'low', word: 'at or below the floor' };
    var elapsed = Math.max(0, Math.min(1, 1 - left / win)), spendable = 100 - floor;
    var over = ((100 - rem) - spendable * elapsed) / spendable;
    if (over <= PACE_TOL) return { hue: 135, tone: 'ok', word: 'on or under pace' };
    var sev = Math.min(1, (over - PACE_TOL) / (PACE_RED - PACE_TOL));
    var hue = Math.round(50 * (1 - sev));
    return { hue: hue, tone: hue === 0 ? 'low' : 'warn', word: sev < 0.34 ? 'slightly over pace' : sev < 1 ? 'over pace' : 'far over pace' };
  }

  // Short pool name: drops the first word (the source) when more follows, so "src_main_5h" reads "main 5h".
  function poolShort(pool) {
    var s = String(pool || ''), pre = s.split('_')[0] + '_';
    return (s.indexOf(pre) === 0 && s.length > pre.length ? s.slice(pre.length) : s).replace(/_/g, ' ');
  }

  function span(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return s < 60 ? s + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd';
  }
  function ago(stamp, now) { var t = Date.parse(stamp || ''); return isNaN(t) ? '' : span(now - t) + ' ago'; }
  function until(stamp, now) {
    var t = Date.parse(stamp || ''); if (isNaN(t)) return '';
    var s = Math.round((t - now) / 1000); if (s <= 0) return 'reset due';
    return 'resets in ' + (s < 3600 ? Math.ceil(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd');
  }

  // Pools grouped under the provider that uses them (in provider order); pools no provider claims go last.
  function groupPools(ops) {
    var pools = list(ops && ops.pools), seen = {}, out = [];
    list(ops && ops.providers).forEach(function (pv) {
      var mine = pools.filter(function (p) { return p.provider === pv.id; });
      mine.forEach(function (p) { seen[p.pool] = 1; });
      if (mine.length) out.push({ id: pv.id, label: pv.label || pv.id, pools: mine });
    });
    var rest = pools.filter(function (p) { return !seen[p.pool]; });
    if (rest.length) out.push({ id: '', label: 'Other pools', pools: rest });
    return out;
  }

  function providerState(pv) {
    if (pv.state === 'down') return { word: 'Fail', tone: 'error', tip: 'Failed connection: ' + (pv.reason || 'no answer') + '.' };
    if (!pv.enabled) return { word: 'Off', tone: '', tip: 'Switched off.' };
    return { word: 'On', tone: 'run', tip: 'Working.' };
  }

  function sprintWhen(start) {
    var t = Date.parse(start || '');
    if (isNaN(t)) return 'Manual';
    try { return new Date(t).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return new Date(t).toISOString().slice(0, 16).replace('T', ' '); }
  }

  function usageMeta(ops, now) {
    if (ops && ops.usage_refreshing) return 'Reading usage now';
    var newest = list(ops && ops.pools).reduce(function (m, p) {
      var t = Date.parse(p.observed_at || ''); return isNaN(t) ? m : Math.max(m, t);
    }, 0);
    return newest ? 'Usage read ' + span(now - newest) + ' ago' : '';
  }

  Object.assign(I, {
    parseFloor: parseFloor, floorInput: floorInput, toggleInput: toggleInput, saveFloor: saveFloor, runToggle: runToggle,
    paceOf: paceOf, poolWindow: poolWindow, poolShort: poolShort, ago: ago, until: until, groupPools: groupPools,
    providerState: providerState, usageMeta: usageMeta, EVERY: EVERY
  });
  CC.runningTabInternals = I;

  // ---------- small tab style (kit pattern: one style element, CSS variables only) ----------

  var STYLE = [
    '.cc-root .cc-rt-paced .cc-mt .cc-mt-fill{background:hsl(var(--cc-rt-h) 70% 45%);}',
    '.cc-root .cc-rt-stale .cc-mt-fill{opacity:.45;}',
    '.cc-root .cc-rt-fl{display:inline-flex;align-items:center;gap:4px;font-size:var(--cc-fs-meta);color:var(--cc-text-3);}',
    '.cc-root .cc-rt-fl .cc-in{width:52px;height:24px;padding:0 6px;text-align:right;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-rt-trail{display:inline-flex;align-items:center;gap:12px;}',
    '.cc-root .cc-rt-status{font-size:var(--cc-fs-meta);color:var(--cc-text-2);padding:0 0 12px;}'
  ].join('\n');
  function ensureStyle() {
    if (typeof document === 'undefined' || !document.head || !document.getElementById || document.getElementById('cc-running-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-running-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ---------- the tab ----------

  function RunningTab(props) {
    var React = CC.React, ui = CC.ui;
    var q = CC.useWpc('ops_read', {}, { every: EVERY });
    var drafts = React.useState({}), draft = drafts[0], setDraft = drafts[1];
    var busySt = React.useState(''), busy = busySt[0], setBusy = busySt[1];
    var statusSt = React.useState(''), status = statusSt[0], setStatus = statusSt[1];
    ensureStyle();
    var now = I.now();

    function finish(key) {
      return function (msg) {
        setStatus(msg); setBusy('');
        setDraft(function (d) { var n = Object.assign({}, d); delete n[key]; return n; });
      };
    }
    function commitFloor(p) {
      var key = 'floor:' + p.pool;
      if (!Object.prototype.hasOwnProperty.call(draft, p.pool)) return;
      var text = draft[p.pool];
      var cur = p.floor == null ? '' : String(p.floor);
      if (String(text).trim() === cur) { finish(p.pool)(''); return; }
      var check = parseFloor(text);
      if (!check.ok) { setStatus(check.error); return; }
      setBusy(key);
      saveFloor(p.pool, text).then(finish(p.pool));
    }
    function toggle(pv) {
      setBusy('toggle:' + pv.id);
      runToggle(pv).then(function (msg) { setStatus(msg); setBusy(''); });
    }

    var header = ui.PageHeader({
      title: 'Running', pageId: props && props.pageId, meta: q.data ? usageMeta(q.data, now) : '',
      actions: h(ui.Button, { size: 'sm', kind: 'quiet', onClick: q.reload, title: 'Read again', action: 'refresh' }, 'Refresh')
    });

    if (!q.data) {
      var body = q.error ? CC.WpcProblem({ error: q.error }) : ui.Empty({ title: 'Loading', body: 'Reading what runs and the usage.' });
      return h(ui.Page, { page: 'running', header: header }, body);
    }

    var ops = q.data;
    var banner = q.error ? h(ui.Banner, { tone: 'error' }, 'Showing the last reading. ' + problemText(q.error)) : null;

    // What runs now.
    var running = list(ops.running);
    var runSec = h(ui.Section, { key: 'run', section: 'running', title: 'Running now', meta: running.length ? String(running.length) : null },
      running.length ? h(ui.List, { label: 'Running now' }, running.map(function (r, i) {
        return ui.Row({ key: (r.project || '') + '/' + (r.node || '') + '/' + i, id: r.run || (r.project + '/' + r.node),
          lead: h(ui.Badge, { tone: 'run' }, 'Running'),
          title: (r.project || 'Unknown project') + ' · ' + (r.node || 'no node'),
          sub: r.by ? 'By ' + r.by : null, meta: ago(r.since, now), tip: r.since || undefined });
      })) : ui.Empty({ title: 'Nothing is running.' }));

    // Usage per pool, grouped by provider.
    var groups = groupPools(ops);
    function poolRow(p) {
      var pc = typeof p.remaining_percent === 'number' ? Math.max(0, Math.min(100, p.remaining_percent)) : null;
      var pace = pc == null ? null : paceOf(p, now);
      var tip = p.pool + ': ' + (pc == null ? 'no reading' : pc + '% left') +
        (p.floor != null ? ', floor ' + p.floor + '%' : ', no floor') + (pace ? ', ' + pace.word : '') +
        (p.resets_at ? ', ' + until(p.resets_at, now) : '') + (p.observed_at ? ', read ' + ago(p.observed_at, now) : '') + '.';
      var meter = h('span', {
        className: pace && pace.stale ? 'cc-rt-stale' : pace ? 'cc-rt-paced' : undefined,
        style: pace && !pace.stale ? { '--cc-rt-h': String(pace.hue) } : undefined
      }, ui.Meter({ value: pc, tone: pace && !pace.stale ? pace.tone : undefined, title: tip, label: 'left' }));
      var editing = Object.prototype.hasOwnProperty.call(draft, p.pool);
      var floorBox = h('label', { className: 'cc-rt-fl', title: 'Floor: keep at least this much. Empty means no floor.' }, 'Floor',
        h('input', {
          className: 'cc-in', type: 'text', inputMode: 'numeric', placeholder: '0', 'data-floor': p.pool,
          'aria-label': 'Floor for ' + p.pool, disabled: busy === 'floor:' + p.pool,
          value: editing ? draft[p.pool] : (p.floor == null ? '' : String(p.floor)),
          onChange: function (e) { var v = e && e.target ? e.target.value : ''; setDraft(function (d) { var n = Object.assign({}, d); n[p.pool] = v; return n; }); },
          onKeyDown: function (e) {
            if (!e) return;
            if (e.key === 'Enter') { e.preventDefault && e.preventDefault(); commitFloor(p); }
            if (e.key === 'Escape') finish(p.pool)('');
          },
          onBlur: function () { commitFloor(p); }
        }), '%');
      return ui.Row({ key: p.pool, id: p.pool, title: poolShort(p.pool), tip: tip,
        sub: [p.resets_at ? until(p.resets_at, now) : 'Reset time unknown', pace ? pace.word : null].filter(Boolean).join(' · '),
        trail: h('span', { className: 'cc-rt-trail' }, meter, floorBox) });
    }
    var useSec = h(ui.Section, { key: 'use', section: 'usage', title: 'Usage', meta: usageMeta(ops, now) || null },
      groups.length ? groups.map(function (g) {
        return h('div', { key: g.id || 'other', 'data-group': g.id || 'other' },
          h('div', { className: 'cc-sec-m' }, g.label),
          h(ui.List, { label: 'Usage for ' + g.label }, g.pools.map(poolRow)));
      }) : ui.Empty({ title: 'No usage readings yet.', body: 'Pools appear here when a provider that uses them is on.' }));

    // Providers.
    var providers = list(ops.providers);
    var nOn = providers.filter(function (x) { return x.enabled; }).length;
    var nFail = providers.filter(function (x) { return x.state === 'down'; }).length;
    var provSec = h(ui.Section, { key: 'prov', section: 'providers', title: 'Providers',
      meta: providers.length ? nOn + ' on' + (nFail ? ' · ' + nFail + ' fail' : '') : null },
      providers.length ? h(ui.List, { label: 'Providers' }, providers.map(function (pv) {
        var st = providerState(pv);
        return ui.Row({ key: pv.id, id: pv.id, off: !pv.enabled, tip: st.tip,
          lead: h(ui.Badge, { tone: st.tone || undefined, title: st.tip }, st.word),
          title: pv.label || pv.id, sub: pv.pool ? 'Pool ' + poolShort(pv.pool) : null,
          trail: ui.Toggle({ id: pv.id, checked: !!pv.enabled, disabled: busy === 'toggle:' + pv.id,
            label: (pv.enabled ? 'Switch off ' : 'Switch on ') + (pv.label || pv.id), onChange: function () { toggle(pv); } }) });
      })) : ui.Empty({ title: 'No providers.', body: 'Providers come from the agents folder in your Waypoint data.' }));

    // Sprints.
    var sprints = list(ops.sprints);
    var nNext = sprints.filter(function (x) { return x.next; }).length;
    var sprSec = h(ui.Section, { key: 'spr', section: 'sprints', title: 'Sprints', meta: sprints.length ? nNext + ' upcoming' : null },
      sprints.length ? h(ui.List, { label: 'Sprints' }, sprints.map(function (s, i) {
        return ui.Row({ key: s.id || i, id: s.id, title: sprintWhen(s.start) + ' · ' + (s.project || 'no project'),
          lead: s.next ? h(ui.Badge, { tone: 'action' }, 'next') : null,
          sub: [s.mode, s.last_result ? 'last: ' + s.last_result : null].filter(Boolean).join(' · ') || null,
          meta: s.overnight ? h(ui.Badge, null, 'overnight') : null, tip: s.window || s.start || undefined });
      })) : ui.Empty({ title: 'No sprints scheduled.' }));

    return h(ui.Page, { page: 'running', header: header, banner: banner },
      status ? h('div', { className: 'cc-rt-status', role: 'status' }, status) : null,
      runSec, useSec, provSec, sprSec);
  }

  CC.RunningTab = RunningTab;
})(CC);

		// ── tab_prefs.js
// tab_prefs.js - CC.PrefsTab: the Preferences and toolbox tab (an add-on).
// Preferences: pending notes from pref_list; Approve, Reject or Edit each one (pref_approve / pref_reject / pref_edit).
// A note may carry proposed skill_edits: one Approve applies the note and those skill rules together.
// "Harness only" (default on) keeps notes about the harness, dsh, Waypoint, agents, models or skills; 25 per page.
// Toolbox: items from toolbox_read, filtered by kind and text; a status other than on/off needs approval.
// Every write goes through CC.wpc.act and then reads pref_list again; nothing changes before the server answers.
(function (CC) {
  'use strict';
  var h = CC.h;
  var PAGE = 25;
  var HARNESS = /harness|\bdsh\b|waypoint|agent|\bmodels?\b|skill/i;
  var KIND_ORDER = ['subscription', 'model', 'route', 'mcp', 'cli', 'tool', 'skill-runtime'];

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  // True when the note's title, text, tags or skill edits mention the harness and its parts.
  function isHarness(p) {
    if (!p) return false;
    if ((p.skill_edits || []).length) return true;
    var parts = [p.title].concat(p.paragraphs || [], p.tags || []);
    return HARNESS.test(parts.map(str).join(' \n '));
  }
  function filterPrefs(list, harnessOnly) {
    return (list || []).filter(function (p) { return !harnessOnly || isHarness(p); });
  }
  function pageOf(list, shown) { return (list || []).slice(0, Math.max(0, shown || 0)); }

  // Blank line = new paragraph; each paragraph is trimmed; empty ones drop.
  function splitParagraphs(text) {
    return str(text).split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function draftOf(p) {
    return { text: (p.paragraphs || []).join('\n\n'), skills: (p.skill_edits || []).map(function (e) { return e.text || ''; }) };
  }
  // The pref_edit input for a draft, or null when no paragraph is left.
  function editInput(p, draft) {
    var paragraphs = splitParagraphs(draft && draft.text);
    if (!paragraphs.length) return null;
    var input = { id: p.id, paragraphs: paragraphs };
    var edits = p.skill_edits || [];
    if (edits.length) {
      var skills = (draft && draft.skills) || [];
      input.skill_edits = edits.map(function (e, i) {
        var copy = Object.assign({}, e);
        var t = str(skills[i]).trim();
        if (t && e.text) copy.text = t;
        return copy;
      });
    }
    return input;
  }

  function needsApproval(item) { return !item || (item.status !== 'on' && item.status !== 'off'); }
  function countNeeds(items) { return (items || []).filter(needsApproval).length; }
  function kindRank(k) { var i = KIND_ORDER.indexOf(k); return i < 0 ? 99 : i; }
  function filterToolbox(items, kind, query) {
    var q = str(query).trim().toLowerCase();
    return (items || []).filter(function (i) {
      if (kind && kind !== 'all' && i.kind !== kind) return false;
      if (!q) return true;
      return [i.name, i.provider, i.access, i.notes, i.id, i.kind].map(str).join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) {
      var ua = needsApproval(a), ub = needsApproval(b);
      if (ua !== ub) return ua ? -1 : 1;
      return kindRank(a.kind) - kindRank(b.kind) || str(a.name).localeCompare(str(b.name));
    });
  }
  function kindOptions(items) {
    var counts = {};
    (items || []).forEach(function (i) { counts[i.kind] = (counts[i.kind] || 0) + 1; });
    var kinds = Object.keys(counts).sort(function (a, b) { return kindRank(a) - kindRank(b) || a.localeCompare(b); });
    return [{ value: 'all', label: 'All', count: (items || []).length }].concat(kinds.map(function (k) {
      return { value: k, label: k, count: counts[k] };
    }));
  }

  // One write: show "Working", call the server, then show its answer. Returns the promise.
  function runAct(cc, job, setStatus, setBusy) {
    if (setBusy) setBusy(job.key || job.tool);
    setStatus({ text: 'Working…' });
    var p;
    try { p = cc.wpc.act(job.tool, job.input, ['pref_list']); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).then(function () {
      setStatus({ text: job.label || 'Done.' });
      if (job.after) job.after();
    }, function (err) {
      setStatus({ text: 'Not saved: ' + ((err && (err.message || err.code)) || 'error') + '.', tone: 'error' });
    }).then(function () { if (setBusy) setBusy(null); });
  }

  function SkillEdits(p) {
    var edits = p.pref.skill_edits || [];
    if (!edits.length) return null;
    var draft = p.draft || { skills: [] };
    return h('div', { className: 'cc-pf-skill' },
      h('div', { className: 'cc-pf-sh' }, 'Approve also changes ' + edits.length + ' skill rule' + (edits.length > 1 ? 's' : '')),
      edits.map(function (e, i) {
        var body;
        if (p.editing && e.text) {
          body = h('textarea', { className: 'cc-in', rows: 3, 'aria-label': 'New rule text', 'data-skill-i': i,
            value: str(draft.skills[i]), onChange: function (ev) {
              var skills = (draft.skills || []).slice(); skills[i] = ev.target.value;
              p.onDraft(Object.assign({}, draft, { skills: skills }));
            } });
        } else if (e.text) {
          body = [e.replaces ? h('p', { key: 'o', className: 'cc-pf-old' }, h('s', null, e.replaces)) : null,
            h('p', { key: 'n' }, e.text)];
        } else {
          body = h('p', { className: 'cc-pf-ev' }, 'Rule text stays; this note becomes its source.');
        }
        return h('div', { key: i, className: 'cc-pf-se' },
          h('div', { className: 'cc-pf-st' }, str(e.skill) + ' · ' + str(e.section)),
          body,
          h('p', { className: 'cc-pf-ev' }, 'Evidence row: ' + str(e.evidence)));
      }));
  }

  // One pending note. Props: pref, editing, draft, busy, onAct(kind, pref), onEdit(pref), onDraft, onSave, onCancel.
  function PrefCard(p) {
    var B = CC.ui.Button, pref = p.pref, busy = !!p.busy;
    var draft = p.draft || { text: '', skills: [] };
    var text = p.editing
      ? h('div', { className: 'cc-pf-edit' },
        h('textarea', { className: 'cc-in', rows: 6, 'aria-label': 'Preference text', value: draft.text,
          onChange: function (ev) { p.onDraft(Object.assign({}, draft, { text: ev.target.value })); } }),
        h('div', { className: 'cc-pf-bar' },
          h(B, { kind: 'primary', size: 'sm', disabled: busy, onClick: function () { p.onSave(pref); } }, 'Save'),
          h(B, { size: 'sm', disabled: busy, onClick: function () { p.onCancel(); } }, 'Cancel'),
          h('span', { className: 'cc-pf-hint' }, 'A blank line starts a new paragraph. Quotes stay as said.')))
      : h('div', { className: 'cc-pf-text' }, (pref.paragraphs || []).map(function (pg, i) { return h('p', { key: i }, pg); }));
    return h('div', { className: 'cc-pf', 'data-pref-id': pref.id },
      h('div', { className: 'cc-pf-head' },
        h('div', { className: 'cc-pf-t' }, str(pref.title)),
        h('div', { className: 'cc-pf-act' },
          h(B, { kind: 'primary', size: 'sm', disabled: busy || p.editing, action: 'approve', onClick: function () { p.onAct('approve', pref); } }, 'Approve'),
          h(B, { size: 'sm', disabled: busy || p.editing, action: 'reject', onClick: function () { p.onAct('reject', pref); } }, 'Reject'),
          p.editing ? null : h(B, { kind: 'quiet', size: 'sm', disabled: busy, action: 'edit', onClick: function () { p.onEdit(pref); } }, 'Edit'))),
      text,
      (pref.sources || []).map(function (s, i) {
        var skillText = s.origin === 'derived_from_skill_text';
        var when = skillText && s.location ? ' (' + s.location + ')' : (s.stated_at ? ' (' + s.stated_at + ')' : '');
        return h('p', { key: 'q' + i, className: 'cc-pf-q' }, skillText ? h('b', null, 'Skill text, not your words: ') : null,
          '“' + str(s.verbatim) + '”' + when);
      }),
      h(SkillEdits, { pref: pref, editing: p.editing, draft: draft, onDraft: p.onDraft }),
      h('div', { className: 'cc-pf-meta' }, str(pref.id) + ' · weight ' + (pref.weight === undefined || pref.weight === null ? '–' : pref.weight) +
        ((pref.tags || []).length ? ' · ' + pref.tags.join(', ') : '')));
  }

  var CSS = [
    '.cc-root .cc-pf{padding:12px 0;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pf-head{display:flex;align-items:flex-start;gap:12px;}',
    '.cc-root .cc-pf-t{flex:1 1 auto;font-weight:600;min-width:0;}',
    '.cc-root .cc-pf-act,.cc-root .cc-pf-bar,.cc-root .cc-pf-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.cc-root .cc-pf-text p,.cc-root .cc-pf-skill p{margin:6px 0;}',
    '.cc-root .cc-pf-edit textarea{width:100%;margin:8px 0;}',
    '.cc-root .cc-pf-q{margin:6px 0;color:var(--cc-text-2);font-style:italic;}',
    '.cc-root .cc-pf-skill{margin-top:8px;padding-left:10px;border-left:2px solid var(--cc-line-strong);}',
    '.cc-root .cc-pf-skill textarea{width:100%;}',
    '.cc-root .cc-pf-sh,.cc-root .cc-pf-st{font-weight:600;}',
    '.cc-root .cc-pf-old{color:var(--cc-text-3);}',
    '.cc-root .cc-pf-ev,.cc-root .cc-pf-meta,.cc-root .cc-pf-hint{color:var(--cc-text-3);font-size:12px;}',
    '.cc-root .cc-pf-tools{margin-bottom:8px;}',
    '.cc-root .cc-pf-more{padding:12px 0;}'
  ].join('');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-prefs')) return;
    var el = document.createElement('style'); el.id = 'cc-tab-prefs'; el.textContent = CSS; document.head.appendChild(el);
  }

  function PrefsSection(p) {
    var React = CC.React, ui = CC.ui;
    var res = p.res;
    var harnessSt = React.useState(true), harnessOnly = harnessSt[0];
    var shownSt = React.useState(PAGE), shown = shownSt[0];
    var editSt = React.useState(null), editing = editSt[0];
    var draftSt = React.useState(null), draft = draftSt[0];
    var busySt = React.useState(null), busy = busySt[0];
    var setStatus = p.setStatus;

    if (p.off) {
      return h(ui.Section, { title: 'Preferences', section: 'prefs' },
        h(ui.Empty, { title: 'The preferences add-on is off', body: 'Turn it on in Settings, under Add-ons. The toolbox below still works.' }));
    }
    var data = res.data;
    if (!data) {
      return h(ui.Section, { title: 'Preferences', section: 'prefs' },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading preferences…' }));
    }
    var pending = data.pending || [];
    var list = filterPrefs(pending, harnessOnly);
    var page = pageOf(list, shown);
    var active = (data.counts && data.counts.active) || 0;

    function act(kind, pref) {
      runAct(CC, { tool: kind === 'approve' ? 'pref_approve' : 'pref_reject', input: { id: pref.id }, key: pref.id,
        label: (kind === 'approve' ? 'Approved ' : 'Rejected ') + pref.id + '.' }, setStatus, busySt[1]);
    }
    function save(pref) {
      var input = editInput(pref, draft || draftOf(pref));
      if (!input) { setStatus({ text: 'Write at least one paragraph.', tone: 'error' }); return; }
      runAct(CC, { tool: 'pref_edit', input: input, key: pref.id, label: 'Saved ' + pref.id + '.',
        after: function () { editSt[1](null); draftSt[1](null); } }, setStatus, busySt[1]);
    }

    var tools = h('div', { className: 'cc-pf-tools' },
      h(ui.Toggle, { checked: harnessOnly, label: 'Harness only', onChange: function (v) { harnessSt[1](v); shownSt[1](PAGE); } }),
      h('span', null, 'Harness only'));
    var body;
    if (!pending.length) {
      body = h(ui.Empty, { title: 'No preferences wait for approval', body: active + ' active.' });
    } else if (!list.length) {
      body = h(ui.Empty, { title: 'No harness preferences wait', body: pending.length + ' other notes wait. Turn off Harness only to see them.' });
    } else {
      body = [h('div', { key: 'cards' }, page.map(function (pref) {
        var isEd = editing === pref.id;
        return h(PrefCard, { key: pref.id, pref: pref, editing: isEd, draft: isEd ? (draft || draftOf(pref)) : null,
          busy: busy === pref.id, onAct: act, onSave: save,
          onEdit: function (x) { editSt[1](x.id); draftSt[1](draftOf(x)); },
          onDraft: function (d) { draftSt[1](d); },
          onCancel: function () { editSt[1](null); draftSt[1](null); } });
      })),
      page.length < list.length ? h('div', { key: 'more', className: 'cc-pf-more' },
        h(ui.Button, { onClick: function () { shownSt[1](shown + PAGE); } }, 'Show more')) : null];
    }
    return h(ui.Section, { title: 'Preferences', section: 'prefs',
      meta: list.length ? 'Showing ' + page.length + ' of ' + list.length + (harnessOnly ? ' (' + pending.length + ' pending in all)' : '') : null },
    res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '. Showing the last list.') : null,
    tools, body);
  }

  function ToolboxSection(p) {
    var React = CC.React, ui = CC.ui;
    var res = p.res;
    var kindSt = React.useState('all'), kind = kindSt[0];
    var qSt = React.useState(''), query = qSt[0];
    var data = res.data;
    if (!data) {
      return h(ui.Section, { title: 'Toolbox', section: 'toolbox' },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading the toolbox…' }));
    }
    var items = data.items || [];
    if (data.missing || !items.length) {
      return h(ui.Section, { title: 'Toolbox', section: 'toolbox' },
        h(ui.Empty, { title: data.missing ? 'No toolbox file yet' : 'The toolbox is empty',
          body: 'Add items to toolbox.json in the Waypoint data folder.' }));
    }
    var shown = filterToolbox(items, kind, query);
    var needs = countNeeds(items);
    return h(ui.Section, { title: 'Toolbox', section: 'toolbox',
      meta: needs + ' to confirm' + (data.updated_at ? ' · updated ' + data.updated_at : '') },
    res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '.') : null,
    h('div', { className: 'cc-pf-tools' },
      h(ui.Segmented, { label: 'Kind', value: kind, options: kindOptions(items), onChange: function (v) { kindSt[1](v); } }),
      h('input', { className: 'cc-in', type: 'search', placeholder: 'Filter', 'aria-label': 'Filter the toolbox', value: query,
        onChange: function (ev) { qSt[1](ev.target.value); } })),
    shown.length ? h(ui.List, { label: 'Toolbox items' }, shown.map(function (i) {
      var st = i.status === 'on' ? h(ui.Badge, { tone: 'run' }, 'on') : i.status === 'off' ? h(ui.Badge, {}, 'off')
        : h(ui.Badge, { tone: 'action', title: 'Status is ' + (i.status || 'not set') }, 'to confirm');
      return h(ui.Row, { key: i.id || i.name, id: i.id, wrap: true, title: str(i.name), sub: i.notes || null,
        meta: [i.kind, i.provider, i.cost].filter(Boolean).join(' · '), trail: st });
    })) : h(ui.Empty, { title: 'No match', body: 'Change the kind or the filter text.' }));
  }

  function PrefsTab(p) {
    ensureCss();
    var React = CC.React, ui = CC.ui;
    var features = CC.useWpcFeatures();
    var off = !!(features && features.addons && features.addons.preferences === false);
    var prefs = CC.useWpc(off ? null : 'pref_list', {}, { every: 120000 });  // a large registry reads slowly
    var toolbox = CC.useWpc('toolbox_read', {}, { every: 300000 });
    var statusSt = React.useState(null), status = statusSt[0];
    var pendingN = !off && prefs.data ? (prefs.data.pending || []).length : null;
    var needsN = toolbox.data ? countNeeds(toolbox.data.items) : null;
    var meta = [pendingN === null ? null : pendingN + ' pending', needsN === null ? null : needsN + ' tools to confirm'].filter(Boolean).join(' · ');
    return h(ui.Page, { page: 'prefs', col: true,
      header: h(ui.PageHeader, { title: 'Preferences and toolbox', meta: meta || null, pageId: p && p.pageId }),
      banner: status ? h(ui.Banner, { tone: status.tone }, status.text) : null },
    h(PrefsSection, { res: prefs, off: off, setStatus: statusSt[1] }),
    h(ToolboxSection, { res: toolbox }));
  }

  CC.PrefsTab = PrefsTab;
  CC.prefsTabInternals = { PAGE: PAGE, isHarness: isHarness, filterPrefs: filterPrefs, pageOf: pageOf,
    splitParagraphs: splitParagraphs, draftOf: draftOf, editInput: editInput, needsApproval: needsApproval,
    countNeeds: countNeeds, filterToolbox: filterToolbox, kindOptions: kindOptions, runAct: runAct, PrefCard: PrefCard };
})(CC);

		// ── tab_brain.js
// tab_brain.js - CC.BrainTab: the knowledge graph (an add-on, read only).
// brain_read gives nodes (preferences, notes, skills, instructions) and links [source index, target index, kind].
// List view: search and filter by kind; each row shows its links; a click opens the node's links below.
// Graph view: no force layout. One column group per kind, dots in rows, links as SVG lines; the brightest
// CAP nodes are drawn, with a "Showing N of M" note. The graph reads slowly, so it is read every 5 minutes.
(function (CC) {
  'use strict';
  var h = CC.h;
  var CAP = 150;
  var PAGE = 100;
  var EVERY = 300000;
  var KINDS = ['preference', 'brain', 'skill', 'instruction'];
  var KIND_LABEL = { preference: 'Preferences', brain: 'Notes', skill: 'Skills', instruction: 'Instructions' };
  var KIND_ONE = { preference: 'Preference', brain: 'Note', skill: 'Skill', instruction: 'Instruction' };
  var KIND_VAR = { preference: '--cc-accent', brain: '--cc-done', skill: '--cc-running', instruction: '--cc-text-2' };
  var ROWS = 30, DX = 14, DY = 14, GAP = 36, TOP = 28, SIDE = 16;

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function kindRank(k) { var i = KINDS.indexOf(k); return i < 0 ? 99 : i; }
  function kindLabel(k) { return KIND_LABEL[k] || str(k); }
  function bright(n) { var b = Number(n && n.brightness); return isFinite(b) ? b : 0.4; }

  // Plain graph: nodes, pairs [{a, b, kind}] by node id, and links per node id [{id, title, kind, dir}].
  function normalize(data) {
    var nodes = ((data && data.nodes) || []).filter(function (n) { return n && n.id; }).map(function (n, i) {
      return { id: str(n.id), kind: str(n.kind), title: str(n.title || n.label || n.id), cluster: n.cluster || '',
        path: str(n.path), brightness: bright(n), index: i };
    });
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var pairs = [], links = {};
    nodes.forEach(function (n) { links[n.id] = []; });
    ((data && data.links) || []).forEach(function (l) {
      var a, b, kind;
      if (Array.isArray(l)) { a = nodes[l[0]]; b = nodes[l[1]]; kind = l[2]; }
      else if (l) { a = byId[l.source]; b = byId[l.target]; kind = l.kind; }
      if (!a || !b || a === b) return;
      pairs.push({ a: a.id, b: b.id, kind: str(kind) });
      links[a.id].push({ id: b.id, title: b.title, kind: str(kind), dir: 'to' });
      links[b.id].push({ id: a.id, title: a.title, kind: str(kind), dir: 'from' });
    });
    return { nodes: nodes, pairs: pairs, links: links };
  }

  function filterNodes(nodes, kind, query) {
    var q = str(query).trim().toLowerCase();
    return (nodes || []).filter(function (n) {
      if (kind && kind !== 'all' && n.kind !== kind) return false;
      if (!q) return true;
      return [n.title, n.path, n.cluster, n.id].map(str).join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }

  function kindOptions(nodes) {
    var counts = {};
    (nodes || []).forEach(function (n) { counts[n.kind] = (counts[n.kind] || 0) + 1; });
    var kinds = Object.keys(counts).sort(function (a, b) { return kindRank(a) - kindRank(b) || a.localeCompare(b); });
    return [{ value: 'all', label: 'All', count: (nodes || []).length }].concat(kinds.map(function (k) {
      return { value: k, label: kindLabel(k), count: counts[k] };
    }));
  }

  // Column layout: keep the brightest `cap` nodes (ties keep list order), one group per kind in kind order,
  // ROWS dots per column inside a group. Lines join kept nodes only.
  function graphLayout(nodes, pairs, cap) {
    var limit = cap || CAP;
    var all = (nodes || []).map(function (n, i) { return { n: n, i: i }; });
    var kept = all.slice().sort(function (x, y) { return y.n.brightness - x.n.brightness || x.i - y.i; }).slice(0, limit)
      .sort(function (x, y) { return x.i - y.i; }).map(function (x) { return x.n; });
    var groups = {};
    kept.forEach(function (n) { (groups[n.kind] = groups[n.kind] || []).push(n); });
    var kinds = Object.keys(groups).sort(function (a, b) { return kindRank(a) - kindRank(b) || a.localeCompare(b); });
    var out = [], heads = [], at = {}, x = SIDE, rowsMax = 0;
    kinds.forEach(function (k) {
      var list = groups[k], cols = Math.ceil(list.length / ROWS);
      heads.push({ kind: k, label: kindLabel(k), x: x, count: list.length });
      list.forEach(function (n, j) {
        var p = { id: n.id, kind: n.kind, title: n.title, x: x + Math.floor(j / ROWS) * DX + DX / 2, y: TOP + (j % ROWS) * DY + DY / 2 };
        at[n.id] = p; out.push(p);
      });
      rowsMax = Math.max(rowsMax, Math.min(ROWS, list.length));
      x += Math.max(cols * DX, 90) + GAP;
    });
    var lines = (pairs || []).filter(function (l) { return at[l.a] && at[l.b]; }).map(function (l) {
      return { a: l.a, b: l.b, kind: l.kind, x1: at[l.a].x, y1: at[l.a].y, x2: at[l.b].x, y2: at[l.b].y };
    });
    return { nodes: out, lines: lines, heads: heads, shown: kept.length, total: (nodes || []).length,
      width: Math.max(x - GAP + SIDE, 200), height: TOP + rowsMax * DY + 8 };
  }

  function linkWord(n) { return n === 1 ? '1 link' : n + ' links'; }

  function NodeLinks(p) {
    var ui = CC.ui, n = p.node, links = p.links || [];
    return h(ui.Section, { title: n.title, section: 'brain-node', meta: [KIND_ONE[n.kind] || n.kind, n.cluster, n.path].filter(Boolean).join(' · '),
      actions: h(ui.Button, { size: 'sm', kind: 'quiet', onClick: p.onClose }, 'Close') },
    links.length ? h(ui.List, { label: 'Links of ' + n.title }, links.map(function (l, i) {
      return h(ui.Row, { key: l.id + i, id: l.id, title: l.title, meta: (l.dir === 'to' ? 'links to' : 'linked from') + (l.kind ? ' · ' + l.kind : ''),
        onClick: function () { p.onPick(l.id); } });
    })) : h(ui.Empty, { title: 'No links', body: 'Nothing links to or from this node.' }));
  }

  function Graph(p) {
    var lay = p.layout;
    return h('div', { className: 'cc-bg-wrap' },
      h('svg', { 'data-brain-graph': '1', role: 'img', 'aria-label': 'Knowledge graph, ' + lay.shown + ' nodes',
        width: lay.width, height: lay.height, viewBox: '0 0 ' + lay.width + ' ' + lay.height },
      lay.heads.map(function (hd) {
        return h('text', { key: 'h' + hd.kind, x: hd.x, y: 14, className: 'cc-bg-head' }, hd.label + ' (' + hd.count + ')');
      }),
      lay.lines.map(function (l, i) {
        return h('line', { key: 'l' + i, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, className: 'cc-bg-line' });
      }),
      lay.nodes.map(function (n) {
        return h('circle', { key: n.id, cx: n.x, cy: n.y, r: p.selected === n.id ? 6 : 4, 'data-node': n.id,
          className: 'cc-bg-dot' + (p.selected === n.id ? ' cc-bg-on' : ''),
          style: { fill: 'var(' + (KIND_VAR[n.kind] || '--cc-text-3') + ')' },
          onClick: function () { p.onPick(n.id); } }, h('title', null, n.title));
      })));
  }

  var CSS = [
    '.cc-root .cc-br-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}',
    '.cc-root .cc-bg-wrap{overflow:auto;max-width:100%;border:1px solid var(--cc-line);border-radius:6px;}',
    '.cc-root .cc-bg-line{stroke:var(--cc-line-strong);stroke-width:1;opacity:.7;}',
    '.cc-root .cc-bg-dot{cursor:pointer;}',
    '.cc-root .cc-bg-on{stroke:var(--cc-text);stroke-width:2;}',
    '.cc-root .cc-bg-head{fill:var(--cc-text-2);font-size:12px;font-weight:600;}',
    '.cc-root .cc-br-note{color:var(--cc-text-3);font-size:12px;margin:6px 0;}'
  ].join('');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-brain')) return;
    var el = document.createElement('style'); el.id = 'cc-tab-brain'; el.textContent = CSS; document.head.appendChild(el);
  }

  function BrainTab(p) {
    ensureCss();
    var React = CC.React, ui = CC.ui;
    var features = CC.useWpcFeatures();
    var off = !!(features && features.addons && features.addons.brain === false);
    var res = CC.useWpc(off ? null : 'brain_read', {}, { every: EVERY });
    var viewSt = React.useState((p && p.initialView) || 'list'), view = viewSt[0];
    var kindSt = React.useState('all'), kind = kindSt[0];
    var qSt = React.useState(''), query = qSt[0];
    var selSt = React.useState(null), selected = selSt[0];
    var shownSt = React.useState(PAGE), shown = shownSt[0];
    var g = React.useMemo(function () { return normalize(res.data); }, [res.data]);
    var header = function (meta, mid) {
      return h(ui.PageHeader, { title: 'Brain', meta: meta || null, mid: mid || null, pageId: p && p.pageId });
    };
    if (off) {
      return h(ui.Page, { page: 'brain', header: header() },
        h(ui.Empty, { title: 'The brain add-on is off', body: 'Turn it on in Settings, under Add-ons.' }));
    }
    if (!res.data) {
      return h(ui.Page, { page: 'brain', header: header() },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading the knowledge graph…' }));
    }
    var meta = g.nodes.length + ' nodes · ' + g.pairs.length + ' links' + (res.data.truncated ? ' (brightest kept)' : '') +
      (res.data.built_at ? ' · built ' + res.data.built_at : '');
    var mid = h(ui.Segmented, { label: 'View', value: view, options: [{ value: 'list', label: 'List' }, { value: 'graph', label: 'Graph' }],
      onChange: function (v) { viewSt[1](v); } });
    var banner = res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '. Showing the last graph.') : null;
    if (!g.nodes.length) {
      return h(ui.Page, { page: 'brain', header: header(meta, mid), banner: banner },
        h(ui.Empty, { title: 'No knowledge notes yet', body: 'Preferences, notes, skills and instructions show here when the index finds them.' }));
    }
    var list = filterNodes(g.nodes, kind, query);
    var pick = function (id) { selSt[1](id === selected ? null : id); };
    var tools = h('div', { className: 'cc-br-tools' },
      h(ui.Segmented, { label: 'Kind', value: kind, options: kindOptions(g.nodes), onChange: function (v) { kindSt[1](v); shownSt[1](PAGE); } }),
      h('input', { className: 'cc-in', type: 'search', placeholder: 'Search', 'aria-label': 'Search the knowledge graph', value: query,
        onChange: function (ev) { qSt[1](ev.target.value); shownSt[1](PAGE); } }));
    var body;
    if (!list.length) {
      body = h(ui.Empty, { title: 'No match', body: 'Change the kind or the search text.' });
    } else if (view === 'graph') {
      var lay = graphLayout(list, g.pairs, CAP);
      body = [h('p', { key: 'n', className: 'cc-br-note' }, 'Showing ' + lay.shown + ' of ' + lay.total + ' nodes' +
        (lay.shown < lay.total ? ' (the brightest). Search or pick a kind to see others.' : '.') + ' Click a dot to see its links.'),
      h(Graph, { key: 'g', layout: lay, selected: selected, onPick: pick })];
    } else {
      var page = list.slice(0, shown);
      body = [h(ui.List, { key: 'l', label: 'Knowledge nodes' }, page.map(function (n) {
        return h(ui.Row, { key: n.id, id: n.id, wrap: true, title: n.title, sub: n.path || null, selected: selected === n.id,
          meta: (KIND_ONE[n.kind] || n.kind) + ' · ' + linkWord((g.links[n.id] || []).length), onClick: function () { pick(n.id); } });
      })),
      page.length < list.length ? h('div', { key: 'm', className: 'cc-br-note' }, 'Showing ' + page.length + ' of ' + list.length + '. ',
        h(ui.Button, { size: 'sm', onClick: function () { shownSt[1](shown + PAGE); } }, 'Show more')) : null];
    }
    var node = selected ? g.nodes.filter(function (n) { return n.id === selected; })[0] : null;
    return h(ui.Page, { page: 'brain', header: header(meta, mid), banner: banner },
      h(ui.Section, { title: kind === 'all' ? 'Knowledge' : kindLabel(kind), section: 'brain', meta: list.length + ' of ' + g.nodes.length },
        tools, body),
      node ? h(NodeLinks, { node: node, links: g.links[node.id], onPick: pick, onClose: function () { selSt[1](null); } }) : null);
  }

  CC.BrainTab = BrainTab;
  CC.brainTabInternals = { CAP: CAP, PAGE: PAGE, EVERY: EVERY, KINDS: KINDS, normalize: normalize, filterNodes: filterNodes,
    kindOptions: kindOptions, graphLayout: graphLayout };
})(CC);

		// ── tab_learn.js
// tab_learn.js - CC.LearnTab: learning topics (an add-on).
// learn_read gives topics (steps with deps and status todo/taught/repair), claims ("ideas") with premises, and the
// claims due for practice. Writes, with inputs built as the Waypoint Claude v8 page builds them:
//   learn_topic_set        {id: slug(title), title, goal?}      (v8 slug: lower case, a-z0-9 runs joined by "-", 48 max)
//   learn_step_set         {topic, step, status, note?}         (status taught or repair)
//   learn_prop_add         {topic, text, premises: [claim ids]}
//   learn_practice_record  {id, outcome}                        (again, hard, good, easy)
// Every write goes through CC.wpc.act and then reads learn_read again; nothing changes before the server answers.
// The tutor itself runs in a Claude chat with "/learn <topic>" (the learn skill uses the same tools).
(function (CC) {
  'use strict';
  var h = CC.h;
  var EVERY = 60000;
  var OUTCOMES = ['again', 'hard', 'good', 'easy'];
  var OUTCOME_LABEL = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
  var STEP_STATUS = ['todo', 'taught', 'repair'];

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  // Same as the v8 page's slug(): the topic id made from what the learner typed.
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'topic'; }

  function progress(t) {
    var steps = (t && t.steps) || [];
    var taught = steps.filter(function (s) { return s.status === 'taught'; }).length;
    return { taught: taught, total: steps.length, pct: steps.length ? Math.round(100 * taught / steps.length) : null };
  }

  // The step to teach now: a step marked repair first (build nothing on a confusion), else the first todo step
  // whose needed steps are all taught. Null when every step is taught.
  function currentStep(t) {
    var steps = (t && t.steps) || [];
    var repair = steps.filter(function (s) { return s.status === 'repair'; })[0];
    if (repair) return repair;
    var taught = {};
    steps.forEach(function (s) { if (s.status === 'taught') taught[s.id] = 1; });
    var ready = steps.filter(function (s) {
      return s.status !== 'taught' && (s.deps || []).every(function (d) { return taught[d]; });
    })[0];
    return ready || steps.filter(function (s) { return s.status !== 'taught'; })[0] || null;
  }

  function topicInput(title, goal) {
    var t = str(title).trim();
    if (!t) return null;
    var input = { id: slug(t), title: t };
    var g = str(goal).trim();
    if (g) input.goal = g;
    return input;
  }
  function stepInput(topic, step, status, note) {
    if (!topic || !step || STEP_STATUS.indexOf(status) < 0) return null;
    var input = { topic: topic, step: step, status: status };
    var n = str(note).trim();
    if (n) input.note = n;
    return input;
  }
  // premisesText: claim ids split by commas or spaces; each must be a known claim id.
  function propInput(topic, text, premisesText, knownIds) {
    var t = str(text).trim();
    if (!topic) return { ok: false, error: 'Pick a topic first.' };
    if (!t) return { ok: false, error: 'Write the idea first.' };
    var known = {};
    (knownIds || []).forEach(function (id) { known[id] = 1; });
    var prem = [], bad = [];
    str(premisesText).split(/[\s,]+/).filter(Boolean).forEach(function (id) {
      if (!known[id]) { if (bad.indexOf(id) < 0) bad.push(id); } else if (prem.indexOf(id) < 0) prem.push(id);
    });
    if (bad.length) return { ok: false, error: 'No idea has the id ' + bad.join(', ') + '.' };
    return { ok: true, input: { topic: topic, text: t, premises: prem } };
  }
  function practiceInput(id, outcome) {
    if (!id || OUTCOMES.indexOf(outcome) < 0) return null;
    return { id: id, outcome: outcome };
  }

  // One write: show "Working", call the server, then show its answer. Returns the promise.
  function runAct(cc, job, setStatus, setBusy) {
    if (setBusy) setBusy(job.key || job.tool);
    setStatus({ text: 'Working…' });
    var p;
    try { p = cc.wpc.act(job.tool, job.input, ['learn_read']); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).then(function () {
      setStatus({ text: job.label || 'Saved.' });
      if (job.after) job.after();
    }, function (err) {
      setStatus({ text: 'Not saved: ' + ((err && (err.message || err.code)) || 'error') + '.', tone: 'error' });
    }).then(function () { if (setBusy) setBusy(null); });
  }

  var CSS = [
    '.cc-root .cc-ln-form{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;}',
    '.cc-root .cc-ln-form .cc-fd{flex:1 1 200px;}',
    '.cc-root .cc-ln-form input,.cc-root .cc-ln-form textarea{width:100%;}',
    '.cc-root .cc-ln-t{padding:12px 0;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-ln-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
    '.cc-root .cc-ln-title{font-weight:600;flex:1 1 auto;min-width:0;}',
    '.cc-root .cc-ln-steps{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;}',
    '.cc-root .cc-ln-now{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;}',
    '.cc-root .cc-ln-sub{color:var(--cc-text-3);font-size:12px;margin:4px 0;}',
    '.cc-root .cc-ln-acts{display:flex;gap:6px;flex-wrap:wrap;}'
  ].join('');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-learn')) return;
    var el = document.createElement('style'); el.id = 'cc-tab-learn'; el.textContent = CSS; document.head.appendChild(el);
  }

  function stepBadge(s) {
    var tone = s.status === 'taught' ? 'run' : s.status === 'repair' ? 'action' : null;
    var tip = ((s.deps || []).length ? 'Needs ' + s.deps.join(', ') + '. ' : '') + (s.note || s.status || 'todo');
    return h(CC.ui.Badge, { key: s.id, tone: tone, title: tip }, str(s.title || s.id));
  }

  // One topic: progress, steps, the current step with Taught / Needs repair, and the add-an-idea form.
  function TopicCard(p) {
    var ui = CC.ui, t = p.topic, d = p.draft || {}, busy = p.busy;
    var pr = progress(t), cur = currentStep(t), ideas = p.ideas || [];
    var set = function (k, v) { p.onDraft(t.id, k, v); };
    return h('div', { className: 'cc-ln-t', 'data-topic': t.id },
      h('div', { className: 'cc-ln-head' },
        h('div', { className: 'cc-ln-title' }, str(t.title || t.id)),
        h(ui.Meter, { value: pr.pct, label: pr.taught + '/' + pr.total + ' steps' }),
        t.status && t.status !== 'active' ? h(ui.Badge, null, t.status) : null),
      t.goal ? h('div', { className: 'cc-ln-sub' }, 'Goal: ' + t.goal) : null,
      pr.total ? h('div', { className: 'cc-ln-steps' }, (t.steps || []).map(stepBadge))
        : h('div', { className: 'cc-ln-sub' }, 'No plan yet. Run "/learn ' + str(t.title || t.id) + '" in a chat to measure and plan.'),
      cur ? h('div', { className: 'cc-ln-now' },
        h('span', null, 'Next step: ' + str(cur.title || cur.id) + (cur.status === 'repair' ? ' (needs repair' + (cur.note ? ': ' + cur.note : '') + ')' : '')),
        h('input', { className: 'cc-in', type: 'text', placeholder: 'Note (optional)', 'aria-label': 'Step note', value: str(d.note),
          onChange: function (ev) { set('note', ev.target.value); } }),
        h(ui.Button, { size: 'sm', kind: 'primary', disabled: busy, onClick: function () { p.onStep(t, cur, 'taught'); } }, 'Taught'),
        h(ui.Button, { size: 'sm', disabled: busy, onClick: function () { p.onStep(t, cur, 'repair'); } }, 'Needs repair'))
        : (pr.total ? h('div', { className: 'cc-ln-sub' }, 'Every step is taught.') : null),
      h('div', { className: 'cc-ln-sub' }, ideas.length + (ideas.length === 1 ? ' idea' : ' ideas') +
        (ideas.length ? ': ' + ideas.map(function (x) { return x.id; }).join(', ') : '')),
      h('div', { className: 'cc-ln-form' },
        h(ui.Field, { label: 'Add an idea' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'One sentence you now hold', value: str(d.text),
            onChange: function (ev) { set('text', ev.target.value); } })),
        h(ui.Field, { label: 'Rests on', hint: 'Idea ids, for example p1, p3' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'p1, p2', value: str(d.prem),
            onChange: function (ev) { set('prem', ev.target.value); } })),
        h(ui.Button, { disabled: busy, onClick: function () { p.onIdea(t); } }, 'Add idea')));
  }

  function LearnTab(p) {
    ensureCss();
    var React = CC.React, ui = CC.ui;
    var features = CC.useWpcFeatures();
    var off = !!(features && features.addons && features.addons.learn === false);
    var res = CC.useWpc(off ? null : 'learn_read', {}, { every: EVERY });
    var statusSt = React.useState(null), status = statusSt[0], setStatus = statusSt[1];
    var busySt = React.useState(null), busy = busySt[0], setBusy = busySt[1];
    var newSt = React.useState({ title: '', goal: '' }), draftNew = newSt[0];
    var draftsSt = React.useState({}), drafts = draftsSt[0];
    var header = function (meta) { return h(ui.PageHeader, { title: 'Learn', meta: meta || null, pageId: p && p.pageId }); };
    var banner = status ? h(ui.Banner, { tone: status.tone }, status.text) : null;
    if (off) {
      return h(ui.Page, { page: 'learn', col: true, header: header() },
        h(ui.Empty, { title: 'The learn add-on is off', body: 'Turn it on in Settings, under Add-ons.' }));
    }
    var data = res.data;
    if (!data) {
      return h(ui.Page, { page: 'learn', col: true, header: header() },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading learning topics…' }));
    }
    var topics = data.topics || [], props = data.props || [], due = data.due || [];
    var ids = props.map(function (x) { return x.id; });
    var titles = {};
    topics.forEach(function (t) { titles[t.id] = t.title || t.id; });
    var setDraft = function (tid, k, v) {
      draftsSt[1](function (prev) { var n = Object.assign({}, prev); n[tid] = Object.assign({}, n[tid] || {}); n[tid][k] = v; return n; });
    };
    var clearDraft = function (tid, keys) {
      draftsSt[1](function (prev) { var n = Object.assign({}, prev); n[tid] = Object.assign({}, n[tid] || {}); keys.forEach(function (k) { n[tid][k] = ''; }); return n; });
    };

    function addTopic() {
      var input = topicInput(draftNew.title, draftNew.goal);
      if (!input) { setStatus({ text: 'Write what you want to understand first.', tone: 'error' }); return; }
      runAct(CC, { tool: 'learn_topic_set', input: input, key: 'new', label: 'Added topic ' + input.title + '.',
        after: function () { newSt[1]({ title: '', goal: '' }); } }, setStatus, setBusy);
    }
    function setStep(t, s, st) {
      var input = stepInput(t.id, s.id, st, (drafts[t.id] || {}).note);
      if (!input) return;
      runAct(CC, { tool: 'learn_step_set', input: input, key: t.id, label: (s.title || s.id) + (st === 'taught' ? ' is taught.' : ' needs repair.'),
        after: function () { clearDraft(t.id, ['note']); } }, setStatus, setBusy);
    }
    function addIdea(t) {
      var d = drafts[t.id] || {};
      var r = propInput(t.id, d.text, d.prem, ids);
      if (!r.ok) { setStatus({ text: r.error, tone: 'error' }); return; }
      runAct(CC, { tool: 'learn_prop_add', input: r.input, key: t.id, label: 'Idea added to ' + (t.title || t.id) + '.',
        after: function () { clearDraft(t.id, ['text', 'prem']); } }, setStatus, setBusy);
    }
    function practise(x, outcome) {
      var input = practiceInput(x.id, outcome);
      if (!input) return;
      runAct(CC, { tool: 'learn_practice_record', input: input, key: 'p:' + x.id, label: 'Recorded ' + outcome + ' for ' + x.id + '.' }, setStatus, setBusy);
    }

    var stale = res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '. Showing the last topics.') : null;
    var start = h(ui.Section, { title: 'Start a topic', section: 'learn-new' },
      h('div', { className: 'cc-ln-form' },
        h(ui.Field, { label: 'Topic' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'What do you want to understand?', value: draftNew.title,
            onChange: function (ev) { newSt[1](Object.assign({}, draftNew, { title: ev.target.value })); } })),
        h(ui.Field, { label: 'Goal (optional)' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'What you want to be able to do', value: draftNew.goal,
            onChange: function (ev) { newSt[1](Object.assign({}, draftNew, { goal: ev.target.value })); } })),
        h(ui.Button, { kind: 'primary', disabled: busy === 'new', onClick: addTopic }, 'Add topic')),
      h('div', { className: 'cc-ln-sub' }, 'To be taught, run "/learn <topic>" in a chat: the tutor measures, plans and teaches one step at a time, and saves here.'));
    var practice = due.length ? h(ui.Section, { title: 'Practice due', section: 'learn-due', meta: due.length + ' due' },
      h(ui.List, { label: 'Ideas due for practice' }, due.map(function (x) {
        return h(ui.Row, { key: x.id, id: x.id, wrap: true, title: str(x.text), sub: (titles[x.topic] || x.topic) + ' · ' + x.id,
          trail: h('div', { className: 'cc-ln-acts' }, OUTCOMES.map(function (o) {
            return h(ui.Button, { key: o, size: 'sm', kind: o === 'good' ? 'primary' : undefined, disabled: busy === 'p:' + x.id,
              onClick: function () { practise(x, o); } }, OUTCOME_LABEL[o]);
          })) });
      })),
      h('div', { className: 'cc-ln-sub' }, 'Answer from memory first, then say how it went.')) : null;
    var list = topics.length ? h(ui.Section, { title: 'Topics', section: 'learn-topics', meta: topics.length + ' topics · ' + props.length + ' ideas' },
      topics.map(function (t) {
        return h(TopicCard, { key: t.id, topic: t, draft: drafts[t.id], busy: busy === t.id,
          ideas: props.filter(function (x) { return x.topic === t.id; }),
          onDraft: setDraft, onStep: setStep, onIdea: addIdea });
      }))
      : h(ui.Section, { title: 'Topics', section: 'learn-topics' },
        h(ui.Empty, { title: 'No topics yet', body: 'Add one above. What you learn is kept as ideas and the ideas they rest on.' }));
    var meta = topics.length + ' topics' + (due.length ? ' · ' + due.length + ' due' : '');
    return h(ui.Page, { page: 'learn', col: true, header: header(meta), banner: banner },
      stale, practice, list, start);
  }

  CC.LearnTab = LearnTab;
  CC.learnTabInternals = { EVERY: EVERY, OUTCOMES: OUTCOMES, slug: slug, progress: progress, currentStep: currentStep,
    topicInput: topicInput, stepInput: stepInput, propInput: propInput, practiceInput: practiceInput, runAct: runAct, TopicCard: TopicCard };
})(CC);

		// ── app.js
(function (CC) {
  // Registers Waypoint's pages with dsh. dsh boots every bolt-on in one shared startup, so nothing
  // here may throw into it: each slot call is guarded (one console.warn, then carry on) and each
  // page renders inside an error boundary that shows a calm one-line message instead of crashing.
  // Sidebar (dsh v2, 9 Nov 2026): one tab per job, over the Waypoint server (wpc_client.js):
  // Approvals, Projects, Running, Preferences (add-on), Brain, Learn, Settings.
  // Old ids stay routable with no sidebar row: the 1.x pages that needed the retired 8751 engine open the tab that
  // now does their job (Todo and the Waypoint embed -> Approvals, Plan and Execute -> Projects, Autonomous ->
  // Running). Claude and Codex chats needed that engine too; they stay reachable by id only.
  // `addon`: the row shows only when the Waypoint server reports that add-on on (GET /api/wpc/features).
  CC.PAGES = [
    { id: 'cc-approvals', label: 'Approvals', order: 0, glyph: 'todo', component: function () { return CC.ApprovalsTab; } },
    { id: 'cc-projects', label: 'Projects', order: 1, glyph: 'plan', component: function () { return CC.ProjectsTab; } },
    { id: 'cc-running', label: 'Running', order: 2, glyph: 'sprints', component: function () { return CC.RunningTab; } },
    { id: 'cc-prefs', label: 'Preferences', order: 3, glyph: 'prefs', addon: 'preferences', component: function () { return CC.PrefsTab; } },
    { id: 'cc-waypoint', label: 'Waypoint', order: 0.1, glyph: 'todo', sidebar: false, component: function () { return CC.ApprovalsTab; } },
    { id: 'cc-todo', label: 'Todo', order: 0.2, glyph: 'todo', sidebar: false, component: function () { return CC.ApprovalsTab; } },
    { id: 'cc-plan', label: 'Plan', order: 1.1, glyph: 'plan', sidebar: false, component: function () { return CC.ProjectsTab; } },
    { id: 'cc-create', label: 'Execute', order: 1.2, glyph: 'create', sidebar: false, component: function () { return CC.ProjectsTab; } },
    { id: 'cc-sprints', label: 'Autonomous', order: 2.1, glyph: 'sprints', sidebar: false, component: function () { return CC.RunningTab; } },
    { id: 'cc-claude', label: 'Claude', order: 5, glyph: 'claude', sidebar: false, def: false, component: function () { return CC.ClaudePage; } },
    { id: 'cc-codex', label: 'Codex', order: 6, glyph: 'codex', sidebar: false, def: false, component: function () { return CC.CodexPage; } },
    // Agents merged into Settings (v4): no sidebar row. The old id stays resolvable (saved last tab, "Open Agents"
    // links) and lands on Settings at its Agents section.
    { id: 'cc-agents', label: 'Agents', order: 7, glyph: 'agents', sidebar: false, component: function () { return AgentsRedirect; } },
    // Models folds into Settings → Agents: no sidebar row, but the page id still opens.
    { id: 'cc-models', label: 'Models', order: 7.5, glyph: 'models', sidebar: false, component: function () { return CC.ModelsPage; } },
    { id: 'cc-brain', label: 'Brain', order: 8, glyph: 'brain', component: function () { return CC.BrainTab; } },
    { id: 'cc-learn', label: 'Learn', order: 9, glyph: 'learn', component: function () { return CC.LearnTab; } },
    { id: 'cc-settings', label: 'Settings', order: 10, glyph: 'settings', component: function () { return CC.SettingsPage; } }
  ];
  // An add-on row shows only when the Waypoint server says the add-on is on (no answer = off).
  CC.addonOn = function (name) { var f = CC.wpcFeatures; return !!(f && f.addons && f.addons[name]); };
  function whenFeatures() {
    if (!CC.wpc || !CC.wpc.features) return Promise.resolve(null);
    return Promise.race([
      CC.wpc.features().then(function (f) { CC.wpcFeatures = f; return f; }, function () { return null; }),
      new Promise(function (r) { setTimeout(function () { r(null); }, 1500); })
    ]);
  }
  function AgentsRedirect(props) {
    var React = CC.React;
    CC.settingsFocus = 'agents';
    React.useEffect(function () {
      try { if (CC.openSettingsAgents) CC.openSettingsAgents(); } catch (e) { warn('Agents redirect skipped', e); }
    }, []);
    return CC.SettingsPage ? CC.h(CC.SettingsPage, props) : CC.h(Fallback, { label: 'Settings' });
  }

  var SLOT_MAIN = 'main';
  var SLOT_PANEL = 'sidebar.panellist';

  var GLYPHS = {
    models: 'M12 3l9 5l-9 5l-9-5zM3 12l9 5l9-5M3 16l9 5l9-5',
    create: 'M4 6h5v4H4zM15 4h5v4h-5zM15 14h5v4h-5zM9 8h3v8h3M12 6h3',
    brain: 'M12 4a3 3 0 1 1 0 6a3 3 0 1 1 0-6M5 14a2 2 0 1 1 0 4a2 2 0 1 1 0-4M19 14a2 2 0 1 1 0 4a2 2 0 1 1 0-4M12 10L6 15M12 10l6 5',
    learn: 'M4 8l8-4l8 4l-8 4zM7 10v5c3 2 7 2 10 0v-5',
    plan: 'M6 4h9l3 3v13H6zM9 10h6M9 14h6M9 18h3',
    waypoint: 'M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4',
    prefs: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
    sprints: 'M12 21a8 8 0 1 0 0-16a8 8 0 1 0 0 16M12 9v4l3 2M9 2h6',
    agents: 'M4 6h16v10H8l-4 4zM8 10h.01M12 10h.01M16 10h.01',
    todo: 'M5 7l2 2l3-3M5 15l2 2l3-3M13 8h6M13 16h6',
    claude: 'M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7',
    codex: 'M9 7l-5 5l5 5M15 7l5 5l-5 5',
    settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4'
  };

  function warn(what, err) {
    try {
      var msg = '[waypoint] ' + what + (err ? ': ' + (err && err.message ? err.message : String(err)) : '');
      if (typeof console !== 'undefined' && console.warn) console.warn(msg);
    } catch (e) { /* never let logging throw */ }
  }
  CC.warn = warn;

  // Off switch: window.WAYPOINT_DISABLED = true, or localStorage WAYPOINT_DISABLED = '1'.
  // Compatibility: the older name DSH_CC_DISABLED (window flag or localStorage '1') still works.
  var OFF_FLAGS = ['WAYPOINT_DISABLED', 'DSH_CC_DISABLED'];
  function disabled() {
    try {
      var g = typeof globalThis !== 'undefined' ? globalThis : {};
      for (var i = 0; i < OFF_FLAGS.length; i++) {
        if (g[OFF_FLAGS[i]]) return OFF_FLAGS[i];
        if (g.localStorage && g.localStorage.getItem(OFF_FLAGS[i]) === '1') return OFF_FLAGS[i];
      }
    } catch (e) { /* storage blocked: treat as enabled */ }
    return null;
  }
  CC.offFlags = OFF_FLAGS;

  function Icon(glyph) {
    return function PanelIcon(props) {
      var h = CC.h;
      var size = (props && props.size) || 20;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: GLYPHS[glyph] }));
    };
  }

  // Shown while a page file is not loaded yet: the page name and one quiet line.
  function Fallback(props) {
    var h = CC.h;
    return h('div', { className: 'cc-root cc-fallback', 'data-cc': 'cc-ready' },
      h('div', { className: 'cc-empty-title' }, props.label || 'Waypoint'),
      h('div', { className: 'cc-empty-body' }, 'Waypoint · Loading'));
  }
  CC.Fallback = Fallback;

  function ErrorNote(props) {
    return CC.h('div', { className: 'cc-root' },
      CC.h('div', { 'data-cc-error': 'render', role: 'status', style: { padding: 16, fontSize: 14, opacity: 0.8 } },
        props.label + ' could not load just now; the rest of dsh is unaffected.'));
  }

  // Built lazily so a missing React.Component never breaks load; then cached.
  var Boundary = null;
  function getBoundary() {
    if (Boundary) return Boundary;
    var R = CC.React;
    if (!R || typeof R.Component !== 'function') return null;
    Boundary = class CCErrorBoundary extends R.Component {
      constructor(props) { super(props); this.state = { failed: false }; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(err) { warn('page ' + this.props.label + ' failed to render', err); }
      render() { return this.state.failed ? CC.h(ErrorNote, { label: this.props.label }) : this.props.children; }
    };
    return Boundary;
  }
  CC.getBoundary = getBoundary;

  function pageFor(page) {
    function PageBody() {
      var Comp = page.component();
      try { if (CC.ensureStyles) CC.ensureStyles(); } catch (e) { warn('styles not injected', e); }
      var body = Comp ? CC.h(Comp, { api: CC.api, pageId: page.id }) : CC.h(Fallback, { label: page.label });
      // One plain frame: it fills dsh's main area and scrolls a page that does not scroll itself.
      // App-wide status lives in each page's header (CC.ui.PageHeader renders CC.HeaderStatus), so
      // there is no separate bar. data-cc-frame also tells the sidebar and command bar a Waypoint
      // page is on screen.
      return CC.h('div', { 'data-cc-frame': page.id, style: { height: '100%', minHeight: 0, overflow: 'auto' } }, body);
    }
    return function Page() {
      var B = getBoundary();
      return B ? CC.h(B, { label: page.label }, CC.h(PageBody)) : CC.h(PageBody);
    };
  }

  function noop() {}

  // One guarded slot contribution: inject() and the register() inside its callback both run in dsh's
  // shared startup, so a renamed or missing slot logs one warning and is skipped.
  function contribute(ctx, slot, spec, comp, what) {
    try {
      ctx.slots.inject(slot, function () {
        try {
          var dispose = ctx.slots.register(spec, comp);
          return typeof dispose === 'function' ? dispose : noop;
        } catch (e) { warn(what + ' not registered; skipped', e); return noop; }
      });
    } catch (e) { warn(what + ' not injected into slot "' + slot + '"; skipped', e); }
  }
  CC.contribute = contribute;

  CC.apply = function apply(ctx) {
    try {
      var off = disabled();
      if (off) { warn('disabled by ' + off + '; not loading'); return; }
      var slots = ctx && ctx.slots;
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
        warn('ctx.slots is unavailable in this dsh; Waypoint skipped');
        return;
      }
      CC.ctx = ctx;
      // One quiet GET /health, then a 10 s retry while Core is down (api.js); never throws.
      try { if (CC.coreStart) CC.coreStart(); } catch (e) { warn('Core check skipped', e); }
      // Add-on switches arrive with GET /api/toggles, so pages register once that answer is in (at most
      // WAIT_MS later; engine down or silent = every page shows). Without an API client it is immediate.
      function registerPages() {
      CC.PAGES.forEach(function (page) {
        // A page of a switched-off add-on is not registered at all (toggles.js add-on rule).
        try { if (CC.toggles && CC.toggles.pageHidden && CC.toggles.pageHidden(page.id)) return; } catch (e) { warn('add-on check skipped', e); }
        contribute(ctx, SLOT_MAIN, { name: 'main', key: page.id }, pageFor(page), page.label + ' page');
        if (page.sidebar === false) return;
        if (page.addon && !CC.addonOn(page.addon)) return;
        contribute(ctx, SLOT_PANEL, { name: 'sidebar.panellist', id: page.id, order: 30 + page.order,
          label: function () { return page.label; } }, Icon(page.glyph), page.label + ' sidebar entry');
      });
      }
      // Wait (briefly) for what decides which rows show: the add-on switches and the Waypoint server's features.
      // With neither to wait for, register at once.
      var T = CC.toggles, ready = [];
      if (CC.wpc && CC.wpc.features && (CC.fetch || typeof fetch === 'function')) ready.push(whenFeatures());
      if (T && T.whenLoaded && T.pending && T.pending()) ready.push(T.whenLoaded().then(null, function () { return null; }));
      if (!ready.length) registerPages();
      else Promise.all(ready).then(function () { try { registerPages(); } catch (e) { warn('pages not registered', e); } },
        function () { registerPages(); });
      // Settings: hide switched-off tabs and dsh's More button (settings.js), dsh's workspace
      // chooser (workspace_hide.js) and the Ctrl+K command bar (command_bar.js); each guarded.
      try { if (CC.settings && CC.settings.apply) CC.settings.apply(); } catch (e) { warn('Sidebar settings skipped', e); }
      try { if (CC.workspaceHide && CC.workspaceHide.apply) CC.workspaceHide.apply(ctx); } catch (e) { warn('Workspace hiding skipped', e); }
      try { if (CC.sidebarChats && CC.sidebarChats.apply) CC.sidebarChats.apply(ctx); } catch (e) { warn('Sidebar chats skipped', e); }
      try { if (CC.commandBar && CC.commandBar.apply) CC.commandBar.apply(ctx); } catch (e) { warn('Command bar skipped', e); }
      try { if (CC.applyLiveDiff) CC.applyLiveDiff(ctx); } catch (e) { warn('Live changes skipped', e); }
      if (typeof CC.applyBrand === 'function') CC.applyBrand(ctx); // brand.js; guarded inside
      try { if (CC.applyModelBadges) CC.applyModelBadges(ctx); } catch (e) { warn('Model badges skipped', e); }
      // Autonomous adds a 'Hide Automation tasks' row to the sidebar More menu and applies the owner's
      // saved choice now, at page load, rather than when More is first opened; guarded like the rest.
      try { if (CC.sprintsSidebar && CC.sprintsSidebar.apply) CC.sprintsSidebar.apply(ctx); } catch (e) { warn('Autonomous sidebar row skipped', e); }
    } catch (e) { warn('apply failed; Waypoint skipped', e); }
  };
  CC.inject = ['slots', 'layout', 'uiConversation', 'sidebarRightTabs'];
})(CC);

		// ── page_models.js
// page_models.js [worker-a, M2/M3] - CC.ModelsPage: every agent, subagent and model dsh is set up
// with (engine/cc_engine/models.py, GET /api/models), an enable tick per row, and the Google AI
// Studio (Gemini API) key pool switcher (GET/POST /api/models/gemini_keys), kept apart from Antigravity.
// Views: All (grouped by kind), Agent picker (flat table by Elo), Subagents (select-all list).
// Unknown values stay blank; one model per multi-model pool shows until the pool is expanded.
(function (CC) {
  'use strict';
  const h = CC.h;

  const STYLE = [
    '.cc-root.cc-md{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);color:var(--cc-text);color-scheme:light;}',
    '@media (prefers-color-scheme: dark){.cc-root.cc-md:not([data-theme="light"]){color-scheme:dark;}}',
    '.cc-root.cc-md[data-theme="dark"],html[data-theme="dark"] .cc-root.cc-md,body.dark .cc-root.cc-md,body.theme-dark .cc-root.cc-md{color-scheme:dark;}',
    '.cc-root.cc-md.cc-md-embedded{height:auto;background:transparent;}',
    // The view switch and options: one toolbar row (embedded) or the header's middle (standalone).
    '.cc-root .cc-md-bar{display:flex;align-items:center;gap:12px;min-height:32px;padding:0 0 8px;flex:none;flex-wrap:wrap;}',
    '.cc-root .cc-md-meta{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-md-gap{flex:1;}',
    '.cc-root .cc-md-opt{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--cc-text-2);white-space:nowrap;cursor:pointer;}',
    '.cc-root .cc-md-opt input[type="checkbox"]{accent-color:var(--cc-accent);width:14px;height:14px;margin:0;}',
    '.cc-root .cc-md-scroll{flex:1;min-height:0;overflow:auto;}',
    '.cc-root .cc-md-embedded .cc-md-scroll{overflow:visible;}',
    '.cc-root.cc-md-page .cc-md-scroll{padding:8px 16px 16px;}',
    '.cc-root.cc-md-page .cc-md-bar{padding:0;}',
    // Fixed layout: the table never pushes the page sideways; long cells end in an ellipsis. 32 px rows.
    '.cc-root .cc-md-table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:12px;}',
    '.cc-root .cc-md-table th,.cc-root .cc-md-table td{padding:0 12px 0 0;height:32px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-sticky th{position:sticky;top:0;z-index:1;height:28px;background:var(--cc-bg);font-size:11px;font-weight:500;color:var(--cc-text-3);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-table th,.cc-root .cc-md-table th.cc-num{font-family:inherit;}',
    '.cc-root .cc-md-table col.cc-md-c-provider{width:20%;}',
    '.cc-root .cc-md-table col.cc-md-c-elo{width:64px;}',
    '.cc-root .cc-md-table col.cc-md-c-context{width:72px;}',
    '.cc-root .cc-md-table col.cc-md-c-speed{width:104px;}',
    '.cc-root .cc-md-table col.cc-md-c-usage{width:128px;}',
    '.cc-root .cc-md-table col.cc-md-c-effort{width:30%;}',
    // Below 1200 px Speed folds to a zero-width column (hiding its cells would shift Usage into its slot).
    '@media (max-width:1199px){.cc-root .cc-md-table col.cc-md-c-speed{width:0;}.cc-root .cc-md-table [data-col="speed"]{visibility:hidden;padding:0;}}',
    '.cc-root .cc-md-table .cc-num{text-align:right;font-family:inherit;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-md-table td.cc-md-tick,.cc-root .cc-md-table th.cc-md-tick{padding:0 12px 0 8px;overflow:visible;text-overflow:clip;}',
    '.cc-root .cc-md-table td.cc-md-tick .cc-sw,.cc-root .cc-md-table td.cc-md-tick input{display:block;}',
    '.cc-root .cc-md-group th{height:32px;padding-top:8px;font-size:12px;font-weight:600;color:var(--cc-text);background:var(--cc-bg);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-group .cc-md-meta{margin-left:8px;font-weight:400;}',
    '.cc-root .cc-md-table tr[data-id]:hover td{background:var(--cc-wash);}',
    '.cc-root .cc-md-off td{color:var(--cc-text-3);}',
    '.cc-root .cc-md-name{display:flex;align-items:center;gap:8px;max-width:420px;min-width:0;}',
    '.cc-root .cc-md-label{overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-md-tag{flex:none;font-size:11px;height:18px;line-height:16px;padding:0 6px;border:1px solid var(--cc-line-strong);border-radius:999px;color:var(--cc-text-2);}',
    // "Native" is quiet meta text after the name, not a badge (badges are only for action).
    '.cc-root .cc-md-native{flex:none;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-md-dim{color:var(--cc-text-3);}',
    '.cc-root .cc-md-bad{color:var(--cc-error);border-color:var(--cc-error);}',
    '.cc-root .cc-md-down{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-error);}',
    // Usage: a thin meter and "55% · 5 h", right-aligned; an old reading is dimmer.
    '.cc-root .cc-md-use{display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;}',
    '.cc-root .cc-md-mbar{position:relative;flex:none;width:40px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-md-mbar span{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-done);}',
    '.cc-root .cc-md-dim .cc-md-mbar span{background:var(--cc-text-3);}',
    '.cc-root .cc-md-low .cc-md-mbar span{background:var(--cc-error);}',
    '.cc-root .cc-md-more td{height:28px;}',
    '.cc-root .cc-md-link{border:0;background:transparent;color:var(--cc-accent);font:inherit;font-size:11px;padding:0;cursor:pointer;}',
    '.cc-root .cc-md-link:focus-visible,.cc-root .cc-md-btn:focus-visible,.cc-root .cc-md input:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    // The enable switch: the kit switch (28x16) drawn on a checkbox.
    '.cc-root input.cc-md-sw{appearance:none;display:block;width:28px;height:16px;margin:0;border:0;border-radius:999px;background:var(--cc-line-strong);position:relative;cursor:pointer;}',
    '.cc-root input.cc-md-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--cc-surface);transition:transform var(--cc-fast) var(--cc-ease);}',
    '.cc-root input.cc-md-sw:checked{background:var(--cc-accent);}',
    '.cc-root input.cc-md-sw:checked::after{transform:translateX(12px);}',
    '.cc-root .cc-md-sec{padding:12px 0;border-top:1px solid var(--cc-line);display:flex;flex-direction:column;gap:4px;margin-top:12px;}',
    '.cc-root .cc-md-sec-h{font-size:12px;font-weight:600;}',
    '.cc-root .cc-md-note{font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-md-note.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-md-keys{border-collapse:collapse;font-size:12px;width:100%;max-width:720px;}',
    '.cc-root .cc-md-keys th,.cc-root .cc-md-keys td{padding:0 12px 0 0;height:32px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-keys th{height:28px;font-size:11px;font-weight:500;color:var(--cc-text-3);}',
    '.cc-root .cc-md-on{color:var(--cc-done);font-weight:500;}',
    '.cc-root .cc-md-btn{height:24px;padding:0 8px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:11px;font-weight:500;cursor:pointer;}',
    '.cc-root .cc-md-btn:hover:not(:disabled){background:var(--cc-surface-2);}',
    '.cc-root .cc-md-btn:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-md-list{padding:4px 0;max-width:760px;}',
    '.cc-root .cc-md-empty{padding:8px 0;font-size:12px;color:var(--cc-text-3);}',
    '.cc-root.cc-md-page .cc-md-empty{padding:16px;}',
    '@media (prefers-reduced-motion: reduce){.cc-root input.cc-md-sw::after{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (typeof document === 'undefined' || document.getElementById('cc-models-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-models-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ------------------------------------------------------------ pure helpers (node-testable)
  const KIND_TITLES = { chat: 'Chat models', subagent: 'Subagents', agent: 'Agents', manual: 'Manual' };
  const KIND_HINTS = {
    chat: 'dsh chat picker models',
    subagent: 'runners the chat can prompt',
    agent: 'Waypoint dispatch routes and your own agents',
    manual: 'Copy Prompt hand-offs'
  };
  const PROVIDER_NAMES = {
    anthropic: 'Anthropic', antigravity: 'Antigravity (agy)', 'openai-codex': 'OpenAI Codex', google: 'Google',
    manual: 'Manual', freebuff: 'Freebuff', groq: 'Groq', 'github-copilot': 'GitHub Copilot'
  };
  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  function fmtContext(n) {
    if (!n || typeof n !== 'number') return '';
    if (n >= 1000000) {
      const v = n / (n % 1048576 === 0 ? 1048576 : 1000000);
      return (Math.round(v * 10) / 10) + 'M';
    }
    return (n % 1024 === 0 ? n / 1024 : Math.round(n / 1000)) + 'K';
  }
  function fmtElo(r) { return r && typeof r.elo === 'number' ? '~' + r.elo : ''; }
  function effortText(r) {
    const m = (r && r.elo_by_effort) || {};
    return EFFORTS.filter(function (e) { return m[e] && m[e] !== 'n/a'; })
      .map(function (e) { return e + ' ' + m[e]; }).join(' · ');
  }
  function fmtReset(iso, now) {
    if (!iso) return '';
    const t = new Date(iso);
    if (isNaN(t.getTime())) return '';
    const n = now || new Date();
    const pad = function (x) { return (x < 10 ? '0' : '') + x; };
    if (t.getTime() - n.getTime() < 86400000 && t.getTime() > n.getTime()) return pad(t.getHours()) + ':' + pad(t.getMinutes());
    return t.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getMonth()];
  }
  function fmtUsage(u, now) {
    if (!u || typeof u.remaining_percent !== 'number') return '';
    const reset = fmtReset(u.resets_at, now);
    return Math.round(u.remaining_percent) + '%' + (reset ? ' · resets ' + reset : '');
  }
  // Display case for bare provider ids: a small map, then title case ("some-host" -> "Some Host").
  const PROVIDER_CASE = { deepseek: 'DeepSeek', ollama: 'Ollama', openai: 'OpenAI', openrouter: 'OpenRouter', mistral: 'Mistral', xai: 'xAI', qwen: 'Qwen' };
  function displayCase(id) {
    const s = String(id || '');
    if (!s) return '';
    if (PROVIDER_CASE[s.toLowerCase()]) return PROVIDER_CASE[s.toLowerCase()];
    return s.split(/[-_\s]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function providerName(r) {
    if (r.provider_label) return String(r.provider_label).replace(/^\d+\.\s*/, '');
    return PROVIDER_NAMES[r.provider] || displayCase(r.provider);
  }
  // The provider's name only: "Freebuff ($0 Unmetered Pool)" -> "Freebuff". The full label stays in the tooltip.
  function providerShort(r) {
    return providerName(r).replace(/\s*\([^)]*\)\s*$/, '');
  }
  function routeText(r) {
    if (r.kind === 'agent' && !r.route) return 'none (own use)';
    return r.route || '';
  }
  function hasRole(r, role) { return (r.roles || []).indexOf(role) >= 0; }

  // Rows to show: hide no-access rows unless asked; per multi-model pool only the strongest unless
  // the pool is expanded (or showAll). Returns [{row}|{more: {pool, hidden, label}}] in order.
  function visibleRows(rows, opts) {
    const o = opts || {};
    const expanded = new Set(o.expanded || []);
    const shown = rows.filter(function (r) { return o.showNoAccess || r.access !== false; });
    const out = [];
    const seenPool = {};
    shown.forEach(function (r) {
      const pooled = r.pool && (r.pool_size || 1) > 1 && !o.showAll;
      if (!pooled || expanded.has(r.pool)) { out.push({ row: r }); return; }
      if (r.strongest) out.push({ row: r });
      if (!seenPool[r.pool]) {
        seenPool[r.pool] = true;
        const members = shown.filter(function (x) { return x.pool === r.pool; });
        const hidden = members.filter(function (x) { return !x.strongest; }).length;
        if (hidden) out.push({ more: { pool: r.pool, hidden: hidden, label: providerShort(r) }, after: r.pool });
      }
    });
    // A "more" marker sits right after its pool's strongest row.
    const ordered = [];
    const pending = {};
    out.forEach(function (e) { if (e.more) pending[e.more.pool] = e; });
    out.forEach(function (e) {
      if (e.more) return;
      ordered.push(e);
      if (e.row.pool && pending[e.row.pool] && e.row.strongest) { ordered.push(pending[e.row.pool]); delete pending[e.row.pool]; }
    });
    Object.keys(pending).forEach(function (k) { ordered.push(pending[k]); });
    return ordered;
  }
  function byElo(a, b) {
    const ea = typeof a.elo === 'number' ? a.elo : -1;
    const eb = typeof b.elo === 'number' ? b.elo : -1;
    return eb - ea;
  }
  function agentRows(rows, opts) {
    const list = rows.filter(function (r) { return hasRole(r, 'agent'); });
    return visibleRows(list, opts).filter(function (e) { return e.row; }).map(function (e) { return e.row; })
      .map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return byElo(a.r, b.r) || a.i - b.i; })
      .map(function (x) { return x.r; });
  }
  function subagentRows(rows, opts) {
    const list = rows.filter(function (r) { return hasRole(r, 'subagent'); });
    return visibleRows(list, opts).filter(function (e) { return e.row; }).map(function (e) { return e.row; });
  }

  // ------------------------------------------------------------ actions
  function errText(e) {
    if (e && e.status === 403) return 'Only the owner can change this';
    return (e && e.data && e.data.detail) || (e && e.message) || 'The engine did not answer.';
  }

  // ------------------------------------------------------------ pieces
  // The enable switch: the kit's 28x16 Toggle (as in Settings); a bare checkbox only where ui.js is not loaded.
  function Tick(props) {
    const UI = CC.ui;
    if (UI && typeof UI.Toggle === 'function') {
      return h(UI.Toggle, { checked: !!props.checked, label: (props.checked ? 'Turn off ' : 'Turn on ') + props.label,
        title: props.checked ? 'On: click to turn off' : 'Off: click to turn on', onChange: function () { props.onChange(); } });
    }
    return h('input', {
      type: 'checkbox', className: 'cc-md-sw', checked: !!props.checked, 'aria-label': (props.checked ? 'Turn off ' : 'Turn on ') + props.label,
      title: props.checked ? 'On: click to turn off' : 'Off: click to turn on', onChange: props.onChange
    });
  }

  // The shared route-health source (toggles.js): a model whose route cannot run greys out, reason in the tooltip.
  function routeDown(r) {
    const T = CC.toggles;
    if (!T || typeof T.downReason !== 'function' || !r) return null;
    try { return (r.route && T.downReason(r.route)) || T.downReason(r.id) || null; } catch (e) { return null; }
  }
  function rowClass(r) { return r.enabled && !routeDown(r) ? null : 'cc-md-off'; }

  function NameCell(r) {
    const tags = [];
    const down = routeDown(r);
    if (r.run_natively) {
      tags.push(h('span', { key: 'n', className: 'cc-md-native', title: r.run_natively_reason || 'Better used in its own app' }, 'Native'));
    }
    if (down) {
      tags.push(h('span', { key: 'r', className: 'cc-md-down', title: down, role: 'img', 'aria-label': 'Down: ' + down }));
    } else if (r.health && r.health.ok === false) {
      const why = r.health.reason || 'Failed its last health check';
      tags.push(h('span', { key: 'h', className: 'cc-md-down', title: why, role: 'img', 'aria-label': 'Down: ' + why }));
    }
    if (r.access === false) tags.push(h('span', { key: 'a', className: 'cc-md-tag', title: 'Not on your plan right now' }, 'No access'));
    return h('div', { className: 'cc-md-name' },
      h('span', { className: 'cc-md-label', title: [r.id, r.note, r.strongest_rule ? 'Pool pick: ' + r.strongest_rule : null].filter(Boolean).join('\n') }, r.label),
      tags);
  }

  // "Claude 5 hours" -> "5 h", "Codex week (all models)" -> "week"; '' when the label names no window.
  function windowOf(u) {
    const l = String((u && (u.label || u.pool)) || '').toLowerCase();
    const hrs = /(\d+)\s*(?:h\b|hours?|hrs?|_?h$)/.exec(l);
    if (hrs) return hrs[1] + ' h';
    const w = /(week|day|month)/.exec(l);
    return w ? w[1] : '';
  }
  // Usage as a thin meter and "55% · 5 h"; the reset and the pool name sit in the tooltip.
  function usageCell(r) {
    const u = r.usage;
    const known = !!(u && typeof u.remaining_percent === 'number');
    const stale = !!(u && u.status === 'STALE');
    const pct = known ? Math.max(0, Math.min(100, Math.round(u.remaining_percent))) : 0;
    const win = known ? windowOf(u) : '';
    const reset = known ? fmtReset(u.resets_at) : '';
    const title = u ? [u.label || u.pool, known ? pct + '% left' : null, reset ? 'resets ' + reset : null, stale ? 'last read earlier' : null].filter(Boolean).join(' · ') : null;
    return h('td', { key: 'u', 'data-col': 'usage', className: 'cc-num' + (stale ? ' cc-md-dim' : '') + (known && !stale && pct < 15 ? ' cc-md-low' : ''), title: title },
      known ? h('span', { className: 'cc-md-use' },
        h('span', { className: 'cc-md-mbar', 'aria-hidden': 'true' }, h('span', { style: { width: Math.max(2, pct) + '%' } })),
        h('span', null, pct + '%' + (win ? ' · ' + win : ''))) : null);
  }


  function factTitle(r, key) {
    return (r.sources && r.sources[key]) || null;
  }

  // Column widths for the fixed-layout tables; Name takes what is left.
  function Cols(names) {
    return h('colgroup', null, names.map(function (n) {
      return h('col', { key: n, className: 'cc-md-c-' + n, style: n === 'tick' ? { width: 48 } : undefined });
    }));
  }

  function AllTable(p) {
    const rows = p.rows;
    const kinds = p.kinds;
    const head = h('thead', { className: 'cc-md-sticky' }, h('tr', null,
      h('th', { className: 'cc-md-tick' }, h('span', { className: 'cc-md-meta' }, 'On')),
      h('th', null, 'Name'), h('th', { 'data-col': 'provider' }, 'Provider'), h('th', { className: 'cc-num' }, 'Elo'),
      h('th', { className: 'cc-num' }, 'Context'), h('th', { 'data-col': 'speed' }, 'Speed'), h('th', { className: 'cc-num' }, 'Usage')));
    const bodies = kinds.map(function (kind) {
      const mine = rows.filter(function (r) { return r.kind === kind; });
      if (!mine.length) return null;
      const entries = visibleRows(mine, p.opts);
      return h('tbody', { key: kind },
        h('tr', { className: 'cc-md-group' }, h('th', { colSpan: 7 }, KIND_TITLES[kind] || kind,
          h('span', { className: 'cc-md-meta', title: KIND_HINTS[kind] || null }, String(mine.length)))),
        entries.map(function (e) {
          if (e.more) {
            return h('tr', { key: 'more:' + e.more.pool, className: 'cc-md-more' }, h('td', null), h('td', { colSpan: 6 },
              h('button', { type: 'button', className: 'cc-md-link', onClick: function () { p.onExpand(e.more.pool); } },
                'Show ' + e.more.hidden + ' more ' + e.more.label + ' models')));
          }
          const r = e.row;
          const expanded = (p.opts.expanded || []).indexOf(r.pool) >= 0 && (r.pool_size || 1) > 1;
          return h('tr', { key: r.id, 'data-id': r.id, className: rowClass(r) },
            h('td', { className: 'cc-md-tick' }, h(Tick, { checked: r.enabled, label: r.label, onChange: function () { p.onToggle(r); } })),
            h('td', { 'data-col': 'name' }, NameCell(r),
              expanded && r.strongest ? h('button', { type: 'button', className: 'cc-md-link', onClick: function () { p.onCollapse(r.pool); } }, 'Show fewer') : null),
            h('td', { 'data-col': 'provider', title: providerName(r) }, providerShort(r)),
            h('td', { 'data-col': 'elo', className: 'cc-num', title: [effortText(r), factTitle(r, 'elo')].filter(Boolean).join('\n') || null }, fmtElo(r)),
            h('td', { 'data-col': 'context', className: 'cc-num', title: factTitle(r, 'context_window') }, fmtContext(r.context_window)),
            h('td', { 'data-col': 'speed', title: factTitle(r, 'speed') }, r.speed || ''),
            usageCell(r));
        }));
    });
    return h('table', { className: 'cc-md-table' }, Cols(['tick', 'name', 'provider', 'elo', 'context', 'speed', 'usage']), head, bodies);
  }

  function AgentTable(p) {
    const list = agentRows(p.rows, p.opts);
    return h('table', { className: 'cc-md-table' }, Cols(['tick', 'name', 'effort', 'context', 'speed', 'provider']),
      h('thead', { className: 'cc-md-sticky' }, h('tr', null,
        h('th', { className: 'cc-md-tick' }, h('span', { className: 'cc-md-meta' }, 'On')),
        h('th', null, 'Name'), h('th', null, 'Elo by effort'), h('th', { className: 'cc-num' }, 'Context'),
        h('th', { 'data-col': 'speed' }, 'Speed'), h('th', { 'data-col': 'provider' }, 'Provider'))),
      h('tbody', null, list.map(function (r) {
        const effort = effortText(r);
        return h('tr', { key: r.id, 'data-id': r.id, className: rowClass(r) },
          h('td', { className: 'cc-md-tick' }, h(Tick, { checked: r.enabled, label: r.label, onChange: function () { p.onToggle(r); } })),
          h('td', { 'data-col': 'name' }, NameCell(r)),
          h('td', { 'data-col': 'elo', title: factTitle(r, 'elo') }, effort || fmtElo(r)),
          h('td', { 'data-col': 'context', className: 'cc-num', title: factTitle(r, 'context_window') }, fmtContext(r.context_window)),
          h('td', { 'data-col': 'speed', title: factTitle(r, 'speed') }, r.speed || ''),
          h('td', { 'data-col': 'provider', title: providerName(r) }, providerShort(r)));
      })));
  }

  function SubagentList(p) {
    const list = subagentRows(p.rows, p.opts);
    const options = list.map(function (r) {
      const hint = [providerName(r), r.badge || [fmtElo(r), fmtContext(r.context_window), r.speed].filter(Boolean).join(' · '),
        r.run_natively ? 'better run natively' : null].filter(Boolean).join(' · ');
      return { value: r.id, label: r.label, hint: hint };
    });
    const on = list.filter(function (r) { return r.enabled; }).map(function (r) { return r.id; });
    function change(next) {
      const want = new Set(next);
      const enable = list.filter(function (r) { return !r.enabled && want.has(r.id); }).map(function (r) { return r.id; });
      const disable = list.filter(function (r) { return r.enabled && !want.has(r.id); }).map(function (r) { return r.id; });
      if (enable.length) p.onBulk(enable, true);
      if (disable.length) p.onBulk(disable, false);
    }
    return h('div', { className: 'cc-md-list' },
      h('div', { className: 'cc-md-note' }, 'Ticked models may run as subagents.'),
      CC.SelectAll ? h(CC.SelectAll, { options: options, value: on, onChange: change, ariaLabel: 'Subagent models' }) : null);
  }

  function KeySection(p) {
    const k = p.keys;
    const body = [];
    // Title only; how the pool differs from Antigravity sits in the title's tooltip, not in prose.
    const apart = (k && k.separate_from) || 'Separate from Antigravity (agy), which has its own sign-in and usage.';
    body.push(h('div', { key: 'h', className: 'cc-md-sec-h', title: apart }, 'Google AI Studio (Gemini API) key pool'));
    if (!k) {
      body.push(h('div', { key: 'l', className: 'cc-md-note' }, p.error ? 'Key pool not available from the engine.' : 'Loading key pool...'));
      return h('section', { className: 'cc-md-sec', 'data-section': 'gemini-keys' }, body);
    }
    const lose = k.active_state === 'not_in_pool';
    if (lose) body.push(h('div', { key: 'w', className: 'cc-md-note cc-bad' }, 'dsh is using a Gemini key that is not in this pool, so switching is off (it would be lost).'));
    if (k.active_state === 'credentials_missing') body.push(h('div', { key: 'c', className: 'cc-md-note cc-bad' }, 'dsh credentials file not found.'));
    if (k.active_state === 'no_dsh_key') body.push(h('div', { key: 'c', className: 'cc-md-note cc-bad' }, 'dsh has no Gemini API key set.'));
    const slots = k.slots || [];
    if (!slots.length) {
      body.push(h('div', { key: 'e', className: 'cc-md-note' }, 'No GEMINI_API_KEY slots found in the environment or .env.'));
    } else {
      body.push(h('table', { key: 't', className: 'cc-md-keys' },
        h('thead', null, h('tr', null, h('th', null, 'Slot'), h('th', null, 'Variable'), h('th', null, 'From'), h('th', null, 'State'), h('th', null, ''))),
        h('tbody', null, slots.map(function (s) {
          const state = s.active ? h('span', { className: 'cc-md-on' }, 'In use by dsh')
            : (s.same_as ? h('span', { className: 'cc-md-dim' }, 'same key as ' + s.same_as) : '');
          const blocked = s.active || !!s.same_as || lose || k.active_state === 'credentials_missing' || k.active_state === 'no_dsh_key' || p.busy;
          return h('tr', { key: s.slot },
            h('td', null, s.label || s.slot), h('td', { className: 'cc-md-dim' }, s.env), h('td', { className: 'cc-md-dim' }, s.from || ''),
            h('td', null, state),
            h('td', null, h('button', { type: 'button', className: 'cc-md-btn', disabled: blocked,
              onClick: function () { if (!blocked) p.onSwitch(s.slot); } }, 'Use in dsh')));
        }))));
    }
    // One short meta line: the rotation order and the restart rule (the engine's longer notes go in its tooltip).
    const rot = (k.subagent_rotation || []).join(' → ');
    const line = (rot ? 'Rotates ' + rot + ' on a 429. ' : '') + 'Restart dsh after a switch.';
    body.push(h('div', { key: 'r', className: 'cc-md-meta', title: [k.rotation_note, k.restart_hint].filter(Boolean).join(' ') || undefined }, line));
    if (p.note) body.push(h('div', { key: 'n', className: 'cc-md-note' + (p.noteBad ? ' cc-bad' : '') }, p.note));
    return h('section', { className: 'cc-md-sec', 'data-section': 'gemini-keys' }, body);
  }

  // ------------------------------------------------------------ page
  CC.ModelsPage = function ModelsPage(props) {
    const React = CC.React;
    const P = props || {};
    ensurePageStyle();
    if (CC.toggles && typeof CC.toggles.useToggles === 'function') CC.toggles.useToggles(); // re-render on switch or health change
    const fixed = P.data !== undefined;
    const live = CC.useEngine ? CC.useEngine(fixed ? null : '/api/models', ['pool']) : { data: null, loading: false };
    const liveKeys = CC.useEngine ? CC.useEngine(P.keys !== undefined ? null : '/api/models/gemini_keys', ['pool']) : { data: null };
    const data = fixed ? P.data : live.data;
    const error = fixed ? P.error : live.error;
    const loading = !fixed && live.loading;

    const sView = React.useState(P.initialView || 'all'), view = sView[0], setView = sView[1];
    const sExp = React.useState(P.initialExpanded || []), expanded = sExp[0], setExpanded = sExp[1];
    const sNA = React.useState(!!P.initialShowNoAccess), showNoAccess = sNA[0], setShowNoAccess = sNA[1];
    const sAll = React.useState(!!P.initialShowAll), showAll = sAll[0], setShowAll = sAll[1];
    const sOver = React.useState({}), over = sOver[0], setOver = sOver[1];
    const sNote = React.useState(null), note = sNote[0], setNote = sNote[1];
    const sKeys = React.useState(null), keysOver = sKeys[0], setKeysOver = sKeys[1];
    const sKNote = React.useState(null), keyNote = sKNote[0], setKeyNote = sKNote[1];
    const sBusy = React.useState(false), busy = sBusy[0], setBusy = sBusy[1];

    const keys = keysOver || (P.keys !== undefined ? P.keys : liveKeys.data);
    const rows = ((data && data.models) || []).filter(Boolean).map(function (r) {
      return Object.prototype.hasOwnProperty.call(over, r.id) ? Object.assign({}, r, { enabled: over[r.id] }) : r;
    });
    const kinds = (data && data.kinds) || ['chat', 'subagent', 'agent', 'manual'];
    const opts = { expanded: expanded, showNoAccess: showNoAccess, showAll: showAll };

    function applyResult(res, ids, enabled) {
      const next = {};
      ((res && res.models) || []).forEach(function (m) { next[m.id] = m.enabled; });
      ids.forEach(function (id) { if (!Object.prototype.hasOwnProperty.call(next, id)) next[id] = enabled; });
      setOver(function (prev) { return Object.assign({}, prev, next); });
    }
    function post(body, ids, enabled) {
      setNote(null);
      const pr = CC.api.post('/api/models/toggle', body);
      if (pr && pr.then) pr.then(function (res) { applyResult(res, ids, enabled); }, function (e) { setNote(errText(e)); });
    }
    function onToggle(r) { post({ id: r.id, enabled: !r.enabled }, [r.id], !r.enabled); }
    function onBulk(ids, enabled) { post({ ids: ids, enabled: enabled }, ids, enabled); }
    function onSwitch(slot) {
      setKeyNote(null);
      setBusy(true);
      const pr = CC.api.post('/api/models/gemini_keys/switch', { slot: slot });
      if (pr && pr.then) {
        pr.then(function (res) {
          setBusy(false);
          setKeysOver(res);
          setKeyNote({ text: 'dsh now uses slot ' + slot + '. ' + ((res && res.restart_hint) || ''), bad: false });
        }, function (e) { setBusy(false); setKeyNote({ text: errText(e), bad: true }); });
      }
    }

    // Standalone (cc-models) it is a page with the kit header; embedded in Settings it is a bare block.
    const UI = CC.ui;
    function frame(meta, mid, body) {
      if (P.embedded) {
        return h('div', { className: 'cc-root cc-md cc-md-embedded' }, mid ? h('div', { className: 'cc-md-bar' }, mid) : null, body);
      }
      if (UI && UI.Page) {
        return h(UI.Page, { id: 'models', className: 'cc-md cc-md-page', pad: false,
          header: h(UI.PageHeader, { title: 'Models', meta: meta, mid: mid, pageId: 'cc-models' }) }, body);
      }
      return h('div', { className: 'cc-root cc-md cc-md-page' }, h('div', { className: 'cc-ph' }, h('div', { className: 'cc-ph-title' }, 'Models'),
        meta ? h('div', { className: 'cc-ph-meta' }, meta) : null, mid ? h('div', { className: 'cc-ph-mid' }, mid) : null), body);
    }

    if (!data) {
      if (error && UI && typeof UI.CoreEmpty === 'function') return frame(null, null, h(UI.CoreEmpty, {}));
      return frame(null, null, h('div', { className: 'cc-md-empty', role: 'status' },
        error ? 'The Waypoint engine is not reachable, so the model list is unavailable.' : (loading || !fixed ? 'Loading models…' : 'No models.')));
    }

    const noAccess = rows.filter(function (r) { return r.access === false; }).length;
    const off = rows.filter(function (r) { return !r.enabled; }).length;
    const seg = [['all', 'All'], ['agent', 'Agent picker'], ['subagent', 'Subagents']];
    const content = view === 'agent'
      ? h(AgentTable, { rows: rows, opts: opts, onToggle: onToggle })
      : view === 'subagent'
        ? h(SubagentList, { rows: rows, opts: opts, onBulk: onBulk })
        : h(AllTable, { rows: rows, kinds: kinds, opts: opts, onToggle: onToggle,
          onExpand: function (pool) { setExpanded(function (x) { return x.concat([pool]); }); },
          onCollapse: function (pool) { setExpanded(function (x) { return x.filter(function (p) { return p !== pool; }); }); } });

    const meta = rows.length + ' models' + (off ? ' · ' + off + ' off' : '');
    // The view switch in the kit's segmented classes, then the two rare options.
    const mid = [
      h('div', { key: 'seg', className: 'cc-sg', role: 'group', 'aria-label': 'View' }, seg.map(function (s) {
        return h('button', { key: s[0], type: 'button', className: 'cc-sg-o', 'aria-pressed': view === s[0] ? 'true' : 'false',
          onClick: function () { if (view !== s[0]) setView(s[0]); } }, s[1]);
      })),
      P.embedded ? h('span', { key: 'meta', className: 'cc-md-meta' }, meta) : null,
      view !== 'all' ? h('label', { key: 'all', className: 'cc-md-opt' },
        h('input', { type: 'checkbox', checked: showAll, onChange: function () { setShowAll(!showAll); } }), 'Every model in each pool') : null,
      noAccess ? h('label', { key: 'na', className: 'cc-md-opt' },
        h('input', { type: 'checkbox', checked: showNoAccess, onChange: function () { setShowNoAccess(!showNoAccess); } }),
        'Show ' + noAccess + ' without access') : null
    ];
    return frame(meta, mid, [
      note ? h('div', { key: 'note', className: 'cc-md-note cc-bad', role: 'status' }, note) : null,
      h('div', { key: 'body', className: 'cc-md-scroll' },
        content,
        view === 'all' ? h(KeySection, { keys: keys, error: P.keys === undefined ? liveKeys.error : null, onSwitch: onSwitch, busy: busy,
          note: keyNote && keyNote.text, noteBad: keyNote && keyNote.bad }) : null)
    ]);
  };

  CC.modelsView = {
    STYLE: STYLE, fmtContext: fmtContext, fmtElo: fmtElo, effortText: effortText, fmtUsage: fmtUsage, fmtReset: fmtReset,
    providerName: providerName, providerShort: providerShort, routeText: routeText, visibleRows: visibleRows, agentRows: agentRows, subagentRows: subagentRows
  };
})(CC);

		exports.apply = function (ctx) {
			try { return CC.apply(ctx); }
			catch (e) { try { console.warn("[waypoint] apply failed; Waypoint skipped: " + (e && e.message ? e.message : e)); } catch (_) {} }
		};
		exports.inject = CC.inject;
		} catch (e) {
			try { console.warn("[waypoint] bundle failed to load; Waypoint disabled: " + (e && e.message ? e.message : e)); } catch (_) {}
			exports.apply = function () {};
			exports.inject = [];
		}
		return module.exports;
	}
});
