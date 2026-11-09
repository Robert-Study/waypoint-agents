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
