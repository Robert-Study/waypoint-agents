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
