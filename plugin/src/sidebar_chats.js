(function (CC) {
  // v4 S1: your chats in the left sidebar on Waypoint pages, Claude Code style: date groups with
  // compact rows (title, relative time, a quiet status dot), each chat's subagents in a collapsible
  // dropdown (collapsed by default, count shown). The owner asked to see chats in the sidebar with
  // each chat's subagents as a second dropdown.
  //
  // Public dsh routes only (dsh files are never edited):
  // - Seat: `sidebar.footer.action` (ui-sidebar contract, a list seat directly above Settings). On a
  //   Waypoint page workspace_hide.js hides dsh's session browser, so the region above is empty; the
  //   style rules below (all gated on this list being on screen) let the foot grow into that space.
  // - Sessions: ctx.sessions.list (SessionListState: ids in Host order, byId rows with displayTitle,
  //   updatedAt, running, blank, parentId, origin 'subagent'). Subagents are the rows whose parentId
  //   is the chat; retained fallback rows in byId count too.
  // - Archived / pinned sets: ctx.workspaces.list snapshot (archivedSessionIds, pinnedSessionIds).
  // - Open: ctx.uiWorkspace.openSession(target): a SessionId for a chat, the direct-parent
  //   SubagentAddress (ctx.sessions.subagentAddress, else mode 'unknown') for a subagent, as dsh's
  //   own subagent catalogue does.
  // - Open beside (subagents only): dsh's subagentchat resource in the right sidebar of the parent,
  //   ctx.sidebarRight.openResource(address, {kind: 'subagentchat'}), as dsh's "open aside" does.
  //   dsh has no split view for two top-level chats, so top-level rows offer no beside action.
  // Grouping is by date (Pinned, Today, Yesterday, Previous 7 days, Older): workspaces are
  // switched off and new chats all land in one home folder, so a workspace grouping would be one group.
  // Chat pages keep dsh's own rows (pin, rename, archive, drag); this list renders only on
  // Waypoint pages, so the two never show at once.
  var SLOT = 'sidebar.footer.action';
  var STYLE_ID = 'cc-sidebar-chats';
  var MAX_ROWS = 15;
  var MAX_DEPTH = 4;
  var DAY = 24 * 60 * 60 * 1000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var CHEV = 'M9 6l6 6l-6 6';
  var BESIDE = 'M4 5h16v14H4zM13 5v14';

  function warn(what, err) { if (CC.warn) CC.warn(what, err); }

  function svc(ctx, name) {
    try {
      if (!ctx) return null;
      var s = typeof ctx.get === 'function' ? ctx.get(name) : null;
      return s || ctx[name] || null;
    } catch (e) { return null; }
  }
  function snap(src) {
    try { return src && typeof src.getSnapshot === 'function' ? src.getSnapshot() : null; } catch (e) { return null; }
  }
  function ms(t) { var n = Number(t) || 0; return n > 0 && n < 1e12 ? n * 1000 : n; }

  function relTime(t, now) {
    var d = Math.max(0, now - ms(t));
    if (d < 60 * 1000) return 'now';
    if (d < 60 * 60 * 1000) return Math.floor(d / 60000) + 'm';
    if (d < DAY) return Math.floor(d / 3600000) + 'h';
    if (d < 7 * DAY) return Math.floor(d / DAY) + 'd';
    var x = new Date(ms(t));
    return MONTHS[x.getMonth()] + ' ' + x.getDate();
  }

  function bucket(t, now) {
    var start = new Date(now);
    start.setHours(0, 0, 0, 0);
    var today = start.getTime();
    var u = ms(t);
    if (u >= today) return 'today';
    if (u >= today - DAY) return 'yesterday';
    if (u >= today - 7 * DAY) return 'week';
    return 'older';
  }
  var GROUPS = [['pinned', 'Pinned'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'Previous 7 days'], ['older', 'Older']];

  // Pure projection of the dsh snapshots into groups of chats with nested subagents.
  function model(ctx, now) {
    var empty = { groups: [] };
    var list = snap(svc(ctx, 'sessions') && svc(ctx, 'sessions').list);
    if (!list || list.phase === 'pending' || !list.byId) return empty;
    var ws = snap(svc(ctx, 'workspaces') && svc(ctx, 'workspaces').list) || {};
    var archived = new Set(ws.archivedSessionIds || []);
    var pinnedOrder = ws.pinnedSessionIds || [];
    var pinned = new Set(pinnedOrder);
    var byId = list.byId;
    var kids = {};
    Object.keys(byId).forEach(function (id) {
      var r = byId[id];
      if (!r || !r.parentId || r.blank) return;
      (kids[r.parentId] = kids[r.parentId] || []).push(r);
    });
    function item(r, depth, seen) {
      var id = r.id;
      seen.add(id);
      var children = depth >= MAX_DEPTH ? [] : (kids[id] || []).filter(function (c) { return !seen.has(c.id); })
        .sort(function (a, b) { return ms(b.updatedAt) - ms(a.updatedAt); })
        .map(function (c) { return item(c, depth + 1, seen); });
      return { id: id, title: String(r.displayTitle || r.title || 'Untitled'), updatedAt: ms(r.updatedAt),
        running: !!r.running, parentId: r.parentId || null, children: children };
    }
    var top = (list.ids || []).map(function (id) { return byId[id]; }).filter(function (r) {
      return r && !r.parentId && r.origin !== 'subagent' && !r.blank && !archived.has(r.id);
    });
    var by = { pinned: [], today: [], yesterday: [], week: [], older: [] };
    top.forEach(function (r) { if (!pinned.has(r.id)) by[bucket(r.updatedAt, now)].push(r); });
    top.filter(function (r) { return pinned.has(r.id); })
      .sort(function (a, b) { return pinnedOrder.indexOf(a.id) - pinnedOrder.indexOf(b.id); })
      .forEach(function (r) { by.pinned.push(r); });
    ['today', 'yesterday', 'week', 'older'].forEach(function (k) {
      by[k].sort(function (a, b) { return ms(b.updatedAt) - ms(a.updatedAt); });
    });
    return {
      groups: GROUPS.filter(function (g) { return by[g[0]].length; }).map(function (g) {
        return { id: g[0], label: g[1], items: by[g[0]].map(function (r) { return item(r, 0, new Set()); }) };
      })
    };
  }

  function activePanel(ctx) {
    var layout = svc(ctx, 'layout');
    var s = layout && snap(layout.panelInfo);
    return s ? (s.activePanelId == null ? null : s.activePanelId) : undefined;
  }
  function isOurs(id) {
    if (!id) return false;
    var pages = CC.PAGES || [];
    for (var i = 0; i < pages.length; i++) if (pages[i].id === id) return true;
    return /^cc-/.test(String(id));
  }
  function onWaypoint(ctx) {
    var p = activePanel(ctx);
    if (p !== undefined) return isOurs(p);
    try { return typeof document !== 'undefined' && !!document.querySelector('[data-cc-frame]'); } catch (e) { return false; }
  }

  function address(ctx, row) {
    var s = svc(ctx, 'sessions');
    var a = null;
    try { a = s && typeof s.subagentAddress === 'function' ? s.subagentAddress(row.id) : null; } catch (e) { a = null; }
    return a || { parentSessionId: row.parentId, childSessionId: row.id, mode: 'unknown' };
  }
  // Same address dsh's subagent package builds for its right-sidebar chat resource.
  function chatAddress(a) {
    return 'dsh-resource://subagentchat/session/' + encodeURIComponent(a.childSessionId) +
      '?parent=' + encodeURIComponent(a.parentSessionId) + '&mode=' + encodeURIComponent(a.mode);
  }

  function actions(ctx) {
    function showConversation() {
      try {
        var layout = svc(ctx, 'layout');
        if (layout && typeof layout.selectPanel === 'function' && activePanel(ctx)) layout.selectPanel(null);
      } catch (e) { warn('could not show the conversation', e); }
    }
    function openTarget(target) {
      try {
        var ui = svc(ctx, 'uiWorkspace');
        if (!ui || typeof ui.openSession !== 'function') return false;
        ui.openSession(target);
        showConversation();
        return true;
      } catch (e) { warn('could not open the chat', e); return false; }
    }
    function open(row) {
      if (!row || !row.id) return;
      openTarget(row.parentId ? address(ctx, row) : row.id);
    }
    function beside(row) {
      if (!row || !row.parentId) return open(row);
      var sr = svc(ctx, 'sidebarRight');
      if (!sr || typeof sr.openResource !== 'function') return open(row);
      var addr = address(ctx, row);
      var parent = addr.parentSessionId || row.parentId;
      function go() {
        try { sr.openResource(chatAddress(addr), { kind: 'subagentchat', preferNewPane: true }); } catch (e) { warn('could not open the subagent beside its chat', e); }
      }
      var mounted = sr.mounted;
      if (snap(mounted) === parent && !activePanel(ctx)) return go();
      if (!openTarget(parent)) return undefined;
      if (snap(mounted) === parent || !mounted || typeof mounted.subscribe !== 'function') return go();
      // The right sidebar follows the on-screen session: wait until the parent is mounted.
      var off = null;
      var timer = null;
      var settled = false;
      function finish() {
        settled = true;
        if (off) { try { off(); } catch (e) { /* already gone */ } off = null; }
        if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
      }
      try {
        off = mounted.subscribe(function () { if (!settled && snap(mounted) === parent) { finish(); go(); } });
        if (settled && off) { off(); off = null; }
      } catch (e) { warn('could not wait for the chat to open', e); return undefined; }
      if (!settled && typeof setTimeout === 'function') timer = setTimeout(finish, 5000);
      return undefined;
    }
    return { open: open, beside: beside };
  }

  function Glyph(props) {
    return CC.h('svg', { className: props.className, width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, CC.h('path', { d: props.d }));
  }

  function domId(id) { return 'cc-sbc-sub-' + String(id).replace(/[^A-Za-z0-9_-]/g, '_'); }

  function Row(props) {
    var h = CC.h;
    var it = props.item;
    var p = props.view;
    var open = !!(p.subOpen && p.subOpen[it.id]);
    var n = it.children.length;
    return h('div', { className: 'cc-sbc-item' },
      h('div', { className: 'cc-sbc-row' },
        h('button', { type: 'button', className: 'cc-sbc-open', 'data-cc-chat': it.id, title: it.title,
          onClick: function () { p.actions.open(it); } },
          h('span', { className: 'cc-sbc-dot' + (it.running ? ' cc-sbc-live' : ''), 'aria-hidden': true }),
          h('span', { className: 'cc-sbc-title' }, it.title),
          h('span', { className: 'cc-sbc-time' }, relTime(it.updatedAt, p.now))),
        it.parentId ? h('button', { type: 'button', className: 'cc-sbc-icon cc-sbc-beside', 'data-cc-beside': it.id,
          'aria-label': 'Open beside its chat', title: 'Open beside its chat',
          onClick: function () { p.actions.beside(it); } }, h(Glyph, { d: BESIDE })) : null,
        n ? h('button', { type: 'button', className: 'cc-sbc-icon cc-sbc-sub', 'data-cc-sub-toggle': it.id,
          'aria-expanded': open, 'aria-controls': open ? domId(it.id) : undefined,
          'aria-label': 'Subagents (' + n + ')', title: n === 1 ? '1 subagent' : n + ' subagents',
          onClick: function () { if (p.onToggleSub) p.onToggleSub(it.id); } },
          h('span', { className: 'cc-sbc-count' }, String(n)), h(Glyph, { className: 'cc-sbc-chev', d: CHEV })) : null),
      open && n ? h('div', { className: 'cc-sbc-children', id: domId(it.id), role: 'group', 'aria-label': 'Subagents of ' + it.title },
        it.children.map(function (c) { return h(Row, { key: c.id, item: c, view: p }); })) : null);
  }

  // Pure view: model + open/shut state in, buttons out (the stateful wrapper owns the state).
  function View(props) {
    var h = CC.h;
    var p = Object.assign({ subOpen: {}, groupShut: {}, more: {} }, props);
    return h('nav', { className: 'cc-root cc-sbc', 'aria-label': 'Chats' },
      p.model.groups.map(function (g) {
        var shut = !!p.groupShut[g.id];
        var all = !!p.more[g.id];
        var rows = all ? g.items : g.items.slice(0, MAX_ROWS);
        var hidden = g.items.length - rows.length;
        return h('div', { key: g.id, className: 'cc-sbc-section', role: 'group', 'aria-label': g.label },
          h('button', { type: 'button', className: 'cc-sbc-group', 'data-cc-group': g.id, 'aria-expanded': !shut,
            onClick: function () { if (p.onToggleGroup) p.onToggleGroup(g.id); } },
            h('span', null, g.label), h(Glyph, { className: 'cc-sbc-chev', d: CHEV })),
          shut ? null : rows.map(function (it) { return h(Row, { key: it.id, item: it, view: p }); }),
          !shut && hidden > 0 ? h('button', { type: 'button', className: 'cc-sbc-more', 'data-cc-more': g.id,
            onClick: function () { if (p.onMore) p.onMore(g.id); } }, hidden + ' more') : null);
      }));
  }

  function flip(set) {
    return function (id) { set(function (m) { var n = Object.assign({}, m); n[id] = !m[id]; return n; }); };
  }

  function SidebarChats(props) {
    var React = CC.React;
    var ctx = CC.ctx;
    var bump = React.useState(0)[1];
    var sub = React.useState({});
    var shut = React.useState({});
    var more = React.useState({});
    React.useEffect(function () {
      var offs = [];
      var tick = function () { bump(function (n) { return n + 1; }); };
      [svc(ctx, 'sessions'), svc(ctx, 'workspaces')].forEach(function (s) {
        try { if (s && s.list && typeof s.list.subscribe === 'function') offs.push(s.list.subscribe(tick)); } catch (e) { /* no updates */ }
      });
      try {
        var layout = svc(ctx, 'layout');
        if (layout && layout.panelInfo && typeof layout.panelInfo.subscribe === 'function') offs.push(layout.panelInfo.subscribe(tick));
      } catch (e) { /* no updates */ }
      var iv = typeof setInterval === 'function' ? setInterval(tick, 60000) : null;
      return function () {
        offs.forEach(function (off) { try { if (typeof off === 'function') off(); } catch (e) { /* gone */ } });
        if (iv && typeof clearInterval === 'function') clearInterval(iv);
      };
    }, [ctx]);
    if (!props || !props.wide || !svc(ctx, 'sessions') || !onWaypoint(ctx)) return null;
    var now = Date.now();
    var m = model(ctx, now);
    if (!m.groups.length) return null;
    try { if (CC.ensureStyles) CC.ensureStyles(); } catch (e) { warn('styles not injected', e); }
    return CC.h(View, { model: m, now: now, actions: actions(ctx),
      subOpen: sub[0], groupShut: shut[0], more: more[0],
      onToggleSub: flip(sub[1]), onToggleGroup: flip(shut[1]), onMore: flip(more[1]) });
  }

  function css() {
    var S = CC.tokens.size;
    var C = CC.tokens.control;
    var r = 'border-radius:var(--cc-r-control);';
    var bare = 'border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;';
    return [
      // Layout: only while this list is on screen (a Waypoint page, where dsh's browser is hidden),
      // the empty region gives up its space and the foot grows; Settings stays at the bottom.
      '[class*="_regionArea"]:has(~ [class*="_footArea"] .cc-sbc){flex:0 0 auto;min-height:0;}',
      '[class*="_footArea"]:has(.cc-sbc){flex:1 1 auto;min-height:0;}',
      '[class*="_footerActions"]:has(.cc-sbc){flex:1 1 auto;min-height:0;flex-direction:column;align-items:flex-start;}',
      '[class*="_footerActions"] > :has(.cc-sbc){flex:1 1 auto;min-height:0;align-self:stretch;display:flex;flex-direction:column;}',
      '.cc-root.cc-sbc{background:transparent;flex:1 1 auto;align-self:stretch;width:100%;min-height:0;overflow-x:hidden;overflow-y:auto;' +
        'padding:4px 0 8px;font-size:' + S.label + 'px;line-height:1.35;scrollbar-width:thin;scrollbar-color:var(--cc-thumb) transparent;}',
      '.cc-sbc .cc-sbc-group{display:flex;align-items:center;gap:4px;width:100%;height:24px;margin-top:8px;padding:0 8px;' + bare + r +
        'color:var(--cc-text-3);font-size:' + S.meta + 'px;font-weight:500;text-align:left;}',
      '.cc-sbc .cc-sbc-section:first-child .cc-sbc-group{margin-top:0;}',
      '.cc-sbc .cc-sbc-group:hover{color:var(--cc-text-2);}',
      '.cc-sbc .cc-sbc-group .cc-sbc-chev{opacity:0;transform:rotate(90deg);}',
      '.cc-sbc .cc-sbc-group:hover .cc-sbc-chev,.cc-sbc .cc-sbc-group:focus-visible .cc-sbc-chev{opacity:1;}',
      '.cc-sbc .cc-sbc-group[aria-expanded="false"] .cc-sbc-chev{opacity:1;transform:none;}',
      '.cc-sbc .cc-sbc-row{display:flex;align-items:center;gap:2px;padding-right:4px;' + r + '}',
      '.cc-sbc .cc-sbc-row:hover{background:var(--cc-wash);}',
      '.cc-sbc .cc-sbc-open{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;height:' + C.compact + 'px;padding:0 6px 0 8px;' +
        bare + r + 'color:var(--cc-text);text-align:left;}',
      '.cc-sbc .cc-sbc-dot{flex:none;width:6px;height:6px;border-radius:999px;background:transparent;}',
      '.cc-sbc .cc-sbc-dot.cc-sbc-live{background:var(--cc-running);}',
      '.cc-sbc .cc-sbc-title{flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}',
      '.cc-sbc .cc-sbc-time{flex:none;color:var(--cc-text-3);font-size:' + S.meta + 'px;font-variant-numeric:tabular-nums;}',
      '.cc-sbc .cc-sbc-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:2px;height:22px;min-width:22px;padding:0 4px;' +
        bare + r + 'color:var(--cc-text-3);font-size:' + S.meta + 'px;font-variant-numeric:tabular-nums;}',
      '.cc-sbc .cc-sbc-icon:hover{color:var(--cc-text);background:var(--cc-wash);}',
      '.cc-sbc .cc-sbc-chev{flex:none;transition:transform var(--cc-fast) var(--cc-ease);}',
      '.cc-sbc .cc-sbc-sub[aria-expanded="true"] .cc-sbc-chev{transform:rotate(90deg);}',
      '.cc-sbc .cc-sbc-beside{opacity:0;}',
      '.cc-sbc .cc-sbc-row:hover .cc-sbc-beside,.cc-sbc .cc-sbc-beside:focus-visible{opacity:1;}',
      '.cc-sbc .cc-sbc-children{margin-left:11px;padding-left:4px;border-left:1px solid var(--cc-line);}',
      '.cc-sbc .cc-sbc-more{display:block;width:100%;height:24px;padding:0 8px 0 22px;' + bare + r +
        'color:var(--cc-text-3);font-size:' + S.meta + 'px;text-align:left;}',
      '.cc-sbc .cc-sbc-more:hover{color:var(--cc-text);background:var(--cc-wash);}'
    ].join('');
  }
  function syncCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById(STYLE_ID);
      if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
      el.textContent = css();
    } catch (e) { warn('sidebar chats style skipped', e); }
  }

  var applied = false;
  function apply(ctx) {
    try {
      if (!ctx || !ctx.slots || typeof ctx.slots.inject !== 'function' || applied) return;
      CC.ctx = CC.ctx || ctx;
      syncCss();
      if (typeof CC.contribute !== 'function') return;
      applied = true;
      CC.contribute(ctx, SLOT, { name: SLOT, id: 'cc-chats', order: -100 }, SidebarChats, 'sidebar chats');
    } catch (e) { warn('sidebar chats skipped', e); }
  }

  CC.sidebarChats = { apply: apply, model: model, View: View, SidebarChats: SidebarChats, actions: actions, css: css,
    relTime: relTime, chatAddress: chatAddress, slot: SLOT, styleId: STYLE_ID };
})(CC);
