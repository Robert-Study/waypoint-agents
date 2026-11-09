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
