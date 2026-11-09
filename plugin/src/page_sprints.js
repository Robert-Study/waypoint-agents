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
