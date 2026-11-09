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
