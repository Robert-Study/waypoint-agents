// page_agents.js [worker-d] - CC.AgentsPage: the control panel, shown inside Settings. One dense table per group
// (Agents, Routes, Models): switch, name, a state word with a status dot, and usage as a meter with its window,
// right-aligned. Talking to Claude and Codex lives in their own tabs (chat_panel.js). Switches use GET /api/toggles +
// POST /api/toggles/set and fall back to /api/models + POST /api/models/toggle when the toggles routes are absent.
// Disabled items grey out; the engine refuses them anyway.
(function (CC) {
  'use strict';
  const h = CC.h;

  const STYLE = [
    '.cc-root.cc-ap{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);color:var(--cc-text);color-scheme:light;}',
    '@media (prefers-color-scheme: dark){.cc-root.cc-ap:not([data-theme="light"]){color-scheme:dark;}}',
    '.cc-root.cc-ap[data-theme="dark"],html[data-theme="dark"] .cc-root.cc-ap,body.dark .cc-root.cc-ap,body.theme-dark .cc-root.cc-ap{color-scheme:dark;}',
    '.cc-root .cc-ap-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:16px;}',
    '.cc-root .cc-ap-sec{max-width:960px;}',
    '.cc-root .cc-ap-h{font-size:12px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-ap-list{list-style:none;margin:0;padding:0;}',
    // One row: switch | name | dot + state word | usage meter (right-aligned). 32 px, hairline separated.
    '.cc-root .cc-ap-row{display:grid;grid-template-columns:28px minmax(120px,200px) minmax(0,1fr) 128px;align-items:center;column-gap:12px;' +
      'min-height:32px;padding:0 8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-ap-row:hover{background:var(--cc-wash);}',
    '.cc-root .cc-ap-row:last-child{border-bottom:0;}',
    '.cc-root .cc-ap-row.cc-ap-off .cc-ap-name,.cc-root .cc-ap-row.cc-ap-off .cc-ap-use,.cc-root .cc-ap-row.cc-ap-off .cc-ap-st{opacity:.5;}',
    '.cc-root .cc-ap-name{min-width:0;max-width:360px;font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ap-st{display:flex;align-items:center;gap:6px;min-width:0;}',
    '.cc-root .cc-ap-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-neutral);}',
    '.cc-root .cc-ap-dot.cc-ready{background:var(--cc-done);}',
    '.cc-root .cc-ap-dot.cc-bad{background:var(--cc-error);}',
    '.cc-root .cc-ap-sub{min-width:0;font-size:11px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ap-sub.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-ap-use{display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:0;font-size:11px;color:var(--cc-text-2);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-ap-meter{flex:none;position:relative;width:48px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-ap-meter span{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-done);}',
    '.cc-root .cc-ap-meter.cc-low span{background:var(--cc-error);}',
    '.cc-root .cc-ap-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ap-dim{color:var(--cc-text-3);}',
    '.cc-root .cc-ap-dim .cc-ap-meter span{background:var(--cc-text-3);}',
    '.cc-root .cc-ap-note{font-size:12px;color:var(--cc-text-3);padding:8px 0;}',
    '.cc-root .cc-ap-note.cc-bad{color:var(--cc-error);}',
    // The kit switch (.cc-sw, 28x16, accent when on), drawn on a checkbox so it stays a form control.
    '.cc-root input.cc-ap-sw{appearance:none;flex:none;width:28px;height:16px;margin:0;border:0;border-radius:999px;background:var(--cc-line-strong);position:relative;cursor:pointer;}',
    '.cc-root input.cc-ap-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--cc-surface);transition:transform var(--cc-fast) var(--cc-ease);}',
    '.cc-root input.cc-ap-sw:checked{background:var(--cc-accent);}',
    '.cc-root input.cc-ap-sw:checked::after{transform:translateX(12px);}',
    '.cc-root input.cc-ap-sw:disabled{opacity:.45;cursor:default;}',
    '.cc-root input.cc-ap-sw:focus-visible{outline:2px solid var(--cc-focus);outline-offset:2px;}',
    // Embedded in Settings: no title bar, no own scroll, the Settings page supplies the gutter.
    '.cc-root.cc-ap.cc-ap-in{height:auto;background:transparent;}',
    '.cc-root .cc-ap-in .cc-ap-sec{max-width:none;}',
    '@media (max-width:1100px){.cc-root .cc-ap-row{grid-template-columns:28px minmax(96px,160px) minmax(0,1fr) 112px;}}',
    '@media (prefers-reduced-motion: reduce){.cc-root input.cc-ap-sw::after{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || document.getElementById('cc-agents-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-agents-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ------------------------------------------------------------ toggles (pure, node-testable)
  const KIND_OF_ROW = { chat: 'model', subagent: 'model', agent: 'agent', manual: 'route' };
  const GROUPS = [['agents', 'agent'], ['routes', 'route'], ['models', 'model']];

  // GET /api/toggles -> [{id, kind: agent|route|model, label, enabled}]; null when the shape is not recognised.
  function normalizeToggles(data) {
    if (!data || typeof data !== 'object') return null;
    const out = [];
    const take = function (list, kind) {
      (list || []).forEach(function (t) {
        if (!t || !t.id) return;
        out.push({ id: t.id, kind: t.kind || kind, label: t.label || t.id, enabled: t.enabled !== false });
      });
    };
    if (Array.isArray(data.toggles)) { take(data.toggles, 'model'); return out; }
    let any = false;
    GROUPS.forEach(function (g) { if (Array.isArray(data[g[0]])) { any = true; take(data[g[0]], g[1]); } });
    return any ? out : null;
  }

  // Fallback: the same switches read from GET /api/models.
  function fromModels(data) {
    if (!data || !Array.isArray(data.models)) return null;
    return data.models.map(function (r) {
      return { id: r.id, kind: KIND_OF_ROW[r.kind] || 'model', label: r.label || r.id, enabled: r.enabled !== false };
    });
  }

  function usageLine(a) {
    const rows = (a && a.usage) || [];
    return rows.map(function (u) {
      const pct = u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '%';
      return (u.label || u.pool) + ' ' + pct;
    }).join(' · ');
  }

  function clock(iso) {
    const t = new Date(iso || '');
    if (isNaN(t.getTime())) return '';
    const pad = function (x) { return (x < 10 ? '0' : '') + x; };
    return pad(t.getHours()) + ':' + pad(t.getMinutes());
  }

  function usageTitle(a) {
    return ((a && a.usage) || []).map(function (u) {
      return (u.label || u.pool) + ': ' + (u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '% left') +
        (u.resets_at && clock(u.resets_at) ? ', resets ' + clock(u.resets_at) : '');
    }).join('\n');
  }

  // "Claude 5 hours" -> "5 h", "Codex week (all models)" -> "week".
  function windowShort(label) {
    const l = String(label || '').toLowerCase();
    const hrs = /(\d+)\s*(?:h\b|hours?|hrs?)/.exec(l);
    if (hrs) return hrs[1] + ' h';
    const w = /\b(week|day|month)\b/.exec(l);
    if (w) return w[1];
    return String(label || '').replace(/\s*\(.*\)\s*$/, '');
  }

  // The tightest known pool as one short value {pct, text: "73% · week", stale, title}; null without a meter.
  // Stale is a dimmer number with "Last read HH:MM" in the tooltip, never the word.
  function usageShort(a) {
    const rows = ((a && a.usage) || []).filter(function (u) { return u && typeof u.remaining_percent === 'number'; });
    if (!rows.length) return null;
    const u = rows.reduce(function (lo, x) { return x.remaining_percent < lo.remaining_percent ? x : lo; });
    const stale = u.status === 'STALE';
    const read = clock(u.observed_at);
    return {
      pct: u.remaining_percent, text: Math.round(u.remaining_percent) + '% · ' + windowShort(u.label || u.pool), stale: stale,
      title: usageTitle(a) + (stale ? '\n' + (read ? 'Last read ' + read : 'Not read recently') : '')
    };
  }

  // GET /api/agents connections: [{id, agent_id, state, line, ok, enabled}] -> the one for a row id
  // ('agent:antigravity', 'route:copilot', 'manual:gemini_app', 'gemini_studio' ...).
  function connectionFor(list, id) {
    const bare = String(id || '').replace(/^(agent|route|runner|manual):/, '');
    for (let i = 0; i < (list || []).length; i++) {
      const c = list[i];
      if (c && (c.id === bare || c.agent_id === bare || c.id === id)) return c;
    }
    return null;
  }

  const BAD_STATES = ['out_of_credits', 'signed_out', 'bridge_down'];
  function dotClass(c) {
    if (!c) return 'cc-ap-dot';
    return 'cc-ap-dot' + (c.state === 'ready' ? ' cc-ready' : (BAD_STATES.indexOf(c.state) >= 0 ? ' cc-bad' : ''));
  }

  // "Google AI Studio (Gemini key pool)" -> "Google AI Studio", "DeepSeek (dsh)" -> "DeepSeek"; the full label stays in the tooltip.
  function plainName(label) {
    const s = String(label || '').replace(/\s*\(.*$/, '').replace(/\s*…$/, '').trim();
    return s || String(label || '');
  }
  // Every row says one state word. A manual route says "Manual" ("Manual: Copy Prompt" is how it works);
  // a connection without a line says its state; no connection at all says "Unknown".
  const STATE_WORD = { ready: 'Ready', out_of_credits: 'Out of credits', signed_out: 'Signed out', bridge_down: 'Bridge down', not_installed: 'Not installed' };
  function stateLine(c) {
    if (!c) return 'Unknown';
    const line = c.line ? String(c.line) : '';
    if (/^manual\b/i.test(line)) return 'Manual';
    if (line) return line;
    const st = String(c.state || '');
    return STATE_WORD[st] || (st ? st.charAt(0).toUpperCase() + st.slice(1).replace(/_/g, ' ') : 'Unknown');
  }

  function errText(e) {
    if (e && e.status === 403) return 'Only the owner can change this';
    return (e && e.data && e.data.detail) || (e && e.message) || 'The engine did not answer.';
  }

  // ------------------------------------------------------------ pieces
  // The kit's 28x16 Toggle (as in Settings' Pages rows); a bare checkbox switch only where ui.js is not loaded.
  function Switch(props) {
    const label = props.label;
    const UI = CC.ui;
    if (UI && typeof UI.Toggle === 'function') {
      return h(UI.Toggle, { id: props.id, checked: !!props.enabled, disabled: props.enabled === undefined || props.disabled,
        label: (props.enabled ? 'Turn off ' : 'Turn on ') + label,
        title: props.enabled === undefined ? 'The engine is not answering' : (props.enabled ? 'On: click to turn off' : 'Off: click to turn on'),
        onChange: function () { props.onChange(); } });
    }
    return h('input', {
      type: 'checkbox', role: 'switch', className: 'cc-ap-sw', 'data-id': props.id, checked: !!props.enabled,
      disabled: props.enabled === undefined || props.disabled,
      'aria-label': (props.enabled ? 'Turn off ' : 'Turn on ') + label,
      title: props.enabled === undefined ? 'The engine is not answering' : (props.enabled ? 'On: click to turn off' : 'Off: click to turn on'),
      onChange: props.onChange
    });
  }

  function Row(props) {
    const a = props.agent, on = props.enabled, conn = props.conn;
    // Switched on here but off through its route (CC.isEnabled resolves aliases): show greyed, say why.
    let viaRoute = false;
    if (on !== false && typeof CC.isEnabled === 'function') {
      try { viaRoute = CC.isEnabled(props.id) === false; } catch (e) { viaRoute = false; }
    }
    const us = usageShort(a);
    const low = !!(us && us.pct <= 20);
    const state = viaRoute ? 'Off through its route'
      : (conn ? stateLine(conn) : (!a ? 'Unknown' : (a.available ? 'Available' : 'Not running')));
    const bad = !!(conn && BAD_STATES.indexOf(conn.state) >= 0);
    return h('li', { className: 'cc-ap-row' + (on === false || viaRoute ? ' cc-ap-off' : ''), 'data-row': props.id },
      h(Switch, { id: props.id, label: props.label, enabled: on, onChange: props.onToggle }),
      h('span', { className: 'cc-ap-name', title: props.label !== plainName(props.label) ? props.label + '\n' + props.id : props.id }, plainName(props.label)),
      h('span', { className: 'cc-ap-st' },
        h('span', { className: dotClass(conn), 'data-state': conn ? conn.state : '', 'aria-hidden': 'true' }),
        h('span', { className: 'cc-ap-sub' + (bad ? ' cc-bad' : ''), title: state || (a && (a.availability_detail || a.route)) || '' }, state)),
      us ? h('span', { className: 'cc-ap-use' + (us.stale ? ' cc-ap-dim' : ''), title: us.title },
        h('span', { className: 'cc-ap-meter' + (low ? ' cc-low' : ''), 'aria-hidden': 'true' },
          h('span', { style: { width: Math.max(2, Math.min(100, Math.round(us.pct))) + '%' } })),
        h('span', { className: 'cc-ap-line' }, us.text)) : h('span', { className: 'cc-ap-use' }));
  }

  // A hairline group in the kit's classes (.cc-sec), titled with .cc-ap-h.
  function Group(props) {
    return h('section', { className: 'cc-sec cc-ap-sec' + (props.className ? ' ' + props.className : ''), 'data-section': props.id, 'aria-label': props.title || props.id },
      // Inside Settings the first group sits under the page's own Agents heading, so it has none.
      props.title ? h('div', { className: 'cc-sec-h' }, h('div', { className: 'cc-sec-t cc-ap-h' }, props.title),
        props.meta ? h('div', { className: 'cc-sec-m' }, props.meta) : null) : null,
      props.children);
  }

  // ------------------------------------------------------------ page
  CC.AgentsPage = function AgentsPage(props) {
    const React = CC.React;
    const P = props || {};
    ensurePageStyle();
    const fixedAgents = P.agents !== undefined, fixedToggles = P.toggles !== undefined;
    const liveAgents = CC.useEngine(fixedAgents ? null : '/api/agents', ['pool']);
    const liveToggles = CC.useEngine(fixedToggles ? null : '/api/toggles', ['pool', 'toggles']);
    const liveModels = CC.useEngine(P.modelsData !== undefined ? null : '/api/models', ['pool']);
    const sOver = React.useState({}), over = sOver[0], setOver = sOver[1];
    const sNote = React.useState(null), note = sNote[0], setNote = sNote[1];

    const agentsData = fixedAgents ? P.agents : liveAgents.data;
    const modelsData = P.modelsData !== undefined ? P.modelsData : liveModels.data;
    const toggles = fixedToggles ? P.toggles
      : (normalizeToggles(liveToggles.data) || fromModels(modelsData));
    const error = P.error || (fixedAgents ? null : liveAgents.error);
    const byId = {};
    (toggles || []).forEach(function (t) { byId[t.id] = t; });
    // Agent rows use 'agent:<id>'; the engine keys switches by route id and sends an alias map.
    const aliases = (!fixedToggles && liveToggles.data && liveToggles.data.aliases) || {};
    const resolve = function (id) {
      if (byId[id]) return id;
      if (aliases[id] && byId[aliases[id]]) return aliases[id];
      const bare = id.replace(/^agent:/, '');
      return byId[bare] ? bare : id;
    };
    const stateOf = function (id) {
      if (Object.prototype.hasOwnProperty.call(over, id)) return over[id];
      const key = resolve(id);
      return byId[key] ? byId[key].enabled : undefined;
    };

    function flip(id, label, current) {
      const next = !current;
      setNote(null);
      setOver(function (o) { const c = Object.assign({}, o); c[id] = next; return c; });
      const revert = function (e) {
        setOver(function (o) { const c = Object.assign({}, o); delete c[id]; return c; });
        setNote(label + ': ' + errText(e));
      };
      const first = CC.api.post('/api/toggles/set', { id: id, enabled: next });
      if (!first || !first.then) return;
      first.then(function () {}, function (e) {
        if (e && (e.status === 404 || e.status === 405)) {
          const second = CC.api.post('/api/models/toggle', { id: id, enabled: next });
          if (second && second.then) second.then(function () {}, revert);
        } else revert(e);
      });
    }

    const agents = ((agentsData && agentsData.agents) || []).filter(Boolean);
    const conns = ((agentsData && agentsData.connections) || []).filter(Boolean);
    // Feed the shared route-health source so every picker greys the same routes this list marks down.
    React.useEffect(function () {
      if (agentsData && Array.isArray(agentsData.connections) && CC.toggles && typeof CC.toggles.applyHealth === 'function') {
        CC.toggles.applyHealth(agentsData.connections);
      }
    }, [agentsData]);
    const emb = P.embedded === true, rootCls = 'cc-root cc-ap' + (emb ? ' cc-ap-in' : '');
    const UI = CC.ui;
    function frame(meta, body) {
      if (emb) return h('div', { className: rootCls }, body);
      if (UI && UI.Page) return h(UI.Page, { id: 'agents', className: 'cc-ap', header: h(UI.PageHeader, { title: 'Agents', meta: meta, pageId: 'cc-agents' }) }, body);
      return h('div', { className: rootCls }, h('div', { className: 'cc-ph' }, h('div', { className: 'cc-ph-title' }, 'Agents'), meta ? h('div', { className: 'cc-ph-meta' }, meta) : null),
        h('div', { className: 'cc-ap-scroll' }, body));
    }
    if (!agentsData) {
      // Engine offline: the kit's one Core empty state when ui.js is loaded, else one quiet line.
      if (error && UI && typeof UI.CoreEmpty === 'function') return frame(null, h(UI.CoreEmpty, {}));
      return frame(null, h('div', { className: 'cc-ap-note', role: 'status' },
        error ? 'Waypoint Core is not reachable, so agents and usage are unavailable.' : 'Loading agents…'));
    }

    const agentRows = agents.map(function (a) {
      const id = 'agent:' + a.id, on = stateOf(id);
      return h(Row, { key: id, id: id, label: a.name, agent: a, conn: connectionFor(conns, a.id), enabled: on, onToggle: function () { flip(id, a.name, on); } });
    });
    const routes = (toggles || []).filter(function (t) { return t.kind === 'route' && t.id.indexOf('agent:') !== 0; });
    const routeRows = routes.map(function (t) {
      const on = stateOf(t.id);
      return h(Row, { key: t.id, id: t.id, label: t.label, agent: null, conn: connectionFor(conns, t.id), enabled: on, onToggle: function () { flip(t.id, t.label, on); } });
    });
    const all = agents.map(function (a) { return stateOf('agent:' + a.id); }).concat(routes.map(function (t) { return stateOf(t.id); }));
    const offCount = all.filter(function (v) { return v === false; }).length;
    const offIn = function (list) { const n = list.filter(function (v) { return v === false; }).length; return n ? n + ' off' : null; };

    // Models: the embedded table lists models only; agents and routes switch above.
    const md = modelsData && Array.isArray(modelsData.models)
      ? Object.assign({}, modelsData, { kinds: (modelsData.kinds || []).filter(function (k) { return k === 'chat' || k === 'subagent'; }) })
      : undefined;
    const mp = { embedded: true };
    if (md) mp.data = md;
    if (P.keys !== undefined) mp.keys = P.keys;
    const models = typeof CC.ModelsPage === 'function' ? h(CC.ModelsPage, mp) : null;

    const body = [
      note ? h('div', { key: 'note', className: 'cc-ap-note cc-bad', role: 'status' }, note) : null,
      h(Group, { key: 'agents', id: 'agents', title: emb ? null : 'Agents', meta: offIn(agents.map(function (a) { return stateOf('agent:' + a.id); })) },
        h('ul', { className: 'cc-ap-list' }, agentRows)),
      routeRows.length ? h(Group, { key: 'routes', id: 'routes', title: 'Routes', meta: offIn(routes.map(function (t) { return stateOf(t.id); })) },
        h('ul', { className: 'cc-ap-list' }, routeRows)) : null,
      h(Group, { key: 'models', id: 'models', title: 'Models', className: 'cc-ap-embed' },
        h('div', { 'data-section': 'models-table' }, models))
    ];
    return frame(agents.length + ' agents' + (offCount ? ' · ' + offCount + ' off' : ''), body);
  };

  CC.agentsPanel = { plainName: plainName, stateLine: stateLine, normalizeToggles: normalizeToggles, fromModels: fromModels, usageLine: usageLine, usageShort: usageShort, windowShort: windowShort, connectionFor: connectionFor, errText: errText, STYLE: STYLE };
})(CC);
