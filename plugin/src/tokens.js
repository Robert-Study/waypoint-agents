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
