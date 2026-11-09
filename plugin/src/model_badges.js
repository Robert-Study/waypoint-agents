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
