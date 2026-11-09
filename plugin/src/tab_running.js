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
