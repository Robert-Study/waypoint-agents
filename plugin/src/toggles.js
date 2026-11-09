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
