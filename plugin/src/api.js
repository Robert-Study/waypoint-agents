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
