(function (CC) {
  // Registers Waypoint's pages with dsh. dsh boots every bolt-on in one shared startup, so nothing
  // here may throw into it: each slot call is guarded (one console.warn, then carry on) and each
  // page renders inside an error boundary that shows a calm one-line message instead of crashing.
  // Sidebar (dsh v2, 9 Nov 2026): one tab per job, over the Waypoint server (wpc_client.js):
  // Approvals, Projects, Running, Preferences (add-on), Brain, Learn, Settings.
  // Old ids stay routable with no sidebar row: the 1.x pages that needed the retired 8751 engine open the tab that
  // now does their job (Todo and the Waypoint embed -> Approvals, Plan and Execute -> Projects, Autonomous ->
  // Running). Claude and Codex chats needed that engine too; they stay reachable by id only.
  // `addon`: the row shows only when the Waypoint server reports that add-on on (GET /api/wpc/features).
  CC.PAGES = [
    { id: 'cc-approvals', label: 'Approvals', order: 0, glyph: 'todo', component: function () { return CC.ApprovalsTab; } },
    { id: 'cc-projects', label: 'Projects', order: 1, glyph: 'plan', component: function () { return CC.ProjectsTab; } },
    { id: 'cc-running', label: 'Running', order: 2, glyph: 'sprints', component: function () { return CC.RunningTab; } },
    { id: 'cc-prefs', label: 'Preferences', order: 3, glyph: 'prefs', addon: 'preferences', component: function () { return CC.PrefsTab; } },
    { id: 'cc-waypoint', label: 'Waypoint', order: 0.1, glyph: 'todo', sidebar: false, component: function () { return CC.ApprovalsTab; } },
    { id: 'cc-todo', label: 'Todo', order: 0.2, glyph: 'todo', sidebar: false, component: function () { return CC.ApprovalsTab; } },
    { id: 'cc-plan', label: 'Plan', order: 1.1, glyph: 'plan', sidebar: false, component: function () { return CC.ProjectsTab; } },
    { id: 'cc-create', label: 'Execute', order: 1.2, glyph: 'create', sidebar: false, component: function () { return CC.ProjectsTab; } },
    { id: 'cc-sprints', label: 'Autonomous', order: 2.1, glyph: 'sprints', sidebar: false, component: function () { return CC.RunningTab; } },
    { id: 'cc-claude', label: 'Claude', order: 5, glyph: 'claude', sidebar: false, def: false, component: function () { return CC.ClaudePage; } },
    { id: 'cc-codex', label: 'Codex', order: 6, glyph: 'codex', sidebar: false, def: false, component: function () { return CC.CodexPage; } },
    // Agents merged into Settings (v4): no sidebar row. The old id stays resolvable (saved last tab, "Open Agents"
    // links) and lands on Settings at its Agents section.
    { id: 'cc-agents', label: 'Agents', order: 7, glyph: 'agents', sidebar: false, component: function () { return AgentsRedirect; } },
    // Models folds into Settings → Agents: no sidebar row, but the page id still opens.
    { id: 'cc-models', label: 'Models', order: 7.5, glyph: 'models', sidebar: false, component: function () { return CC.ModelsPage; } },
    { id: 'cc-brain', label: 'Brain', order: 8, glyph: 'brain', component: function () { return CC.BrainTab; } },
    { id: 'cc-learn', label: 'Learn', order: 9, glyph: 'learn', component: function () { return CC.LearnTab; } },
    { id: 'cc-settings', label: 'Settings', order: 10, glyph: 'settings', component: function () { return CC.SettingsPage; } }
  ];
  // An add-on row shows only when the Waypoint server says the add-on is on (no answer = off).
  CC.addonOn = function (name) { var f = CC.wpcFeatures; return !!(f && f.addons && f.addons[name]); };
  function whenFeatures() {
    if (!CC.wpc || !CC.wpc.features) return Promise.resolve(null);
    return Promise.race([
      CC.wpc.features().then(function (f) { CC.wpcFeatures = f; return f; }, function () { return null; }),
      new Promise(function (r) { setTimeout(function () { r(null); }, 1500); })
    ]);
  }
  function AgentsRedirect(props) {
    var React = CC.React;
    CC.settingsFocus = 'agents';
    React.useEffect(function () {
      try { if (CC.openSettingsAgents) CC.openSettingsAgents(); } catch (e) { warn('Agents redirect skipped', e); }
    }, []);
    return CC.SettingsPage ? CC.h(CC.SettingsPage, props) : CC.h(Fallback, { label: 'Settings' });
  }

  var SLOT_MAIN = 'main';
  var SLOT_PANEL = 'sidebar.panellist';

  var GLYPHS = {
    models: 'M12 3l9 5l-9 5l-9-5zM3 12l9 5l9-5M3 16l9 5l9-5',
    create: 'M4 6h5v4H4zM15 4h5v4h-5zM15 14h5v4h-5zM9 8h3v8h3M12 6h3',
    brain: 'M12 4a3 3 0 1 1 0 6a3 3 0 1 1 0-6M5 14a2 2 0 1 1 0 4a2 2 0 1 1 0-4M19 14a2 2 0 1 1 0 4a2 2 0 1 1 0-4M12 10L6 15M12 10l6 5',
    learn: 'M4 8l8-4l8 4l-8 4zM7 10v5c3 2 7 2 10 0v-5',
    plan: 'M6 4h9l3 3v13H6zM9 10h6M9 14h6M9 18h3',
    waypoint: 'M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4',
    prefs: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
    sprints: 'M12 21a8 8 0 1 0 0-16a8 8 0 1 0 0 16M12 9v4l3 2M9 2h6',
    agents: 'M4 6h16v10H8l-4 4zM8 10h.01M12 10h.01M16 10h.01',
    todo: 'M5 7l2 2l3-3M5 15l2 2l3-3M13 8h6M13 16h6',
    claude: 'M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7',
    codex: 'M9 7l-5 5l5 5M15 7l5 5l-5 5',
    settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4'
  };

  function warn(what, err) {
    try {
      var msg = '[waypoint] ' + what + (err ? ': ' + (err && err.message ? err.message : String(err)) : '');
      if (typeof console !== 'undefined' && console.warn) console.warn(msg);
    } catch (e) { /* never let logging throw */ }
  }
  CC.warn = warn;

  // Off switch: window.WAYPOINT_DISABLED = true, or localStorage WAYPOINT_DISABLED = '1'.
  // Compatibility: the older name DSH_CC_DISABLED (window flag or localStorage '1') still works.
  var OFF_FLAGS = ['WAYPOINT_DISABLED', 'DSH_CC_DISABLED'];
  function disabled() {
    try {
      var g = typeof globalThis !== 'undefined' ? globalThis : {};
      for (var i = 0; i < OFF_FLAGS.length; i++) {
        if (g[OFF_FLAGS[i]]) return OFF_FLAGS[i];
        if (g.localStorage && g.localStorage.getItem(OFF_FLAGS[i]) === '1') return OFF_FLAGS[i];
      }
    } catch (e) { /* storage blocked: treat as enabled */ }
    return null;
  }
  CC.offFlags = OFF_FLAGS;

  function Icon(glyph) {
    return function PanelIcon(props) {
      var h = CC.h;
      var size = (props && props.size) || 20;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: GLYPHS[glyph] }));
    };
  }

  // Shown while a page file is not loaded yet: the page name and one quiet line.
  function Fallback(props) {
    var h = CC.h;
    return h('div', { className: 'cc-root cc-fallback', 'data-cc': 'cc-ready' },
      h('div', { className: 'cc-empty-title' }, props.label || 'Waypoint'),
      h('div', { className: 'cc-empty-body' }, 'Waypoint · Loading'));
  }
  CC.Fallback = Fallback;

  function ErrorNote(props) {
    return CC.h('div', { className: 'cc-root' },
      CC.h('div', { 'data-cc-error': 'render', role: 'status', style: { padding: 16, fontSize: 14, opacity: 0.8 } },
        props.label + ' could not load just now; the rest of dsh is unaffected.'));
  }

  // Built lazily so a missing React.Component never breaks load; then cached.
  var Boundary = null;
  function getBoundary() {
    if (Boundary) return Boundary;
    var R = CC.React;
    if (!R || typeof R.Component !== 'function') return null;
    Boundary = class CCErrorBoundary extends R.Component {
      constructor(props) { super(props); this.state = { failed: false }; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(err) { warn('page ' + this.props.label + ' failed to render', err); }
      render() { return this.state.failed ? CC.h(ErrorNote, { label: this.props.label }) : this.props.children; }
    };
    return Boundary;
  }
  CC.getBoundary = getBoundary;

  function pageFor(page) {
    function PageBody() {
      var Comp = page.component();
      try { if (CC.ensureStyles) CC.ensureStyles(); } catch (e) { warn('styles not injected', e); }
      var body = Comp ? CC.h(Comp, { api: CC.api, pageId: page.id }) : CC.h(Fallback, { label: page.label });
      // One plain frame: it fills dsh's main area and scrolls a page that does not scroll itself.
      // App-wide status lives in each page's header (CC.ui.PageHeader renders CC.HeaderStatus), so
      // there is no separate bar. data-cc-frame also tells the sidebar and command bar a Waypoint
      // page is on screen.
      return CC.h('div', { 'data-cc-frame': page.id, style: { height: '100%', minHeight: 0, overflow: 'auto' } }, body);
    }
    return function Page() {
      var B = getBoundary();
      return B ? CC.h(B, { label: page.label }, CC.h(PageBody)) : CC.h(PageBody);
    };
  }

  function noop() {}

  // One guarded slot contribution: inject() and the register() inside its callback both run in dsh's
  // shared startup, so a renamed or missing slot logs one warning and is skipped.
  function contribute(ctx, slot, spec, comp, what) {
    try {
      ctx.slots.inject(slot, function () {
        try {
          var dispose = ctx.slots.register(spec, comp);
          return typeof dispose === 'function' ? dispose : noop;
        } catch (e) { warn(what + ' not registered; skipped', e); return noop; }
      });
    } catch (e) { warn(what + ' not injected into slot "' + slot + '"; skipped', e); }
  }
  CC.contribute = contribute;

  CC.apply = function apply(ctx) {
    try {
      var off = disabled();
      if (off) { warn('disabled by ' + off + '; not loading'); return; }
      var slots = ctx && ctx.slots;
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
        warn('ctx.slots is unavailable in this dsh; Waypoint skipped');
        return;
      }
      CC.ctx = ctx;
      // One quiet GET /health, then a 10 s retry while Core is down (api.js); never throws.
      try { if (CC.coreStart) CC.coreStart(); } catch (e) { warn('Core check skipped', e); }
      // Add-on switches arrive with GET /api/toggles, so pages register once that answer is in (at most
      // WAIT_MS later; engine down or silent = every page shows). Without an API client it is immediate.
      function registerPages() {
      CC.PAGES.forEach(function (page) {
        // A page of a switched-off add-on is not registered at all (toggles.js add-on rule).
        try { if (CC.toggles && CC.toggles.pageHidden && CC.toggles.pageHidden(page.id)) return; } catch (e) { warn('add-on check skipped', e); }
        contribute(ctx, SLOT_MAIN, { name: 'main', key: page.id }, pageFor(page), page.label + ' page');
        if (page.sidebar === false) return;
        if (page.addon && !CC.addonOn(page.addon)) return;
        contribute(ctx, SLOT_PANEL, { name: 'sidebar.panellist', id: page.id, order: 30 + page.order,
          label: function () { return page.label; } }, Icon(page.glyph), page.label + ' sidebar entry');
      });
      }
      // Wait (briefly) for what decides which rows show: the add-on switches and the Waypoint server's features.
      // With neither to wait for, register at once.
      var T = CC.toggles, ready = [];
      if (CC.wpc && CC.wpc.features && (CC.fetch || typeof fetch === 'function')) ready.push(whenFeatures());
      if (T && T.whenLoaded && T.pending && T.pending()) ready.push(T.whenLoaded().then(null, function () { return null; }));
      if (!ready.length) registerPages();
      else Promise.all(ready).then(function () { try { registerPages(); } catch (e) { warn('pages not registered', e); } },
        function () { registerPages(); });
      // Settings: hide switched-off tabs and dsh's More button (settings.js), dsh's workspace
      // chooser (workspace_hide.js) and the Ctrl+K command bar (command_bar.js); each guarded.
      try { if (CC.settings && CC.settings.apply) CC.settings.apply(); } catch (e) { warn('Sidebar settings skipped', e); }
      try { if (CC.workspaceHide && CC.workspaceHide.apply) CC.workspaceHide.apply(ctx); } catch (e) { warn('Workspace hiding skipped', e); }
      try { if (CC.sidebarChats && CC.sidebarChats.apply) CC.sidebarChats.apply(ctx); } catch (e) { warn('Sidebar chats skipped', e); }
      try { if (CC.commandBar && CC.commandBar.apply) CC.commandBar.apply(ctx); } catch (e) { warn('Command bar skipped', e); }
      try { if (CC.applyLiveDiff) CC.applyLiveDiff(ctx); } catch (e) { warn('Live changes skipped', e); }
      if (typeof CC.applyBrand === 'function') CC.applyBrand(ctx); // brand.js; guarded inside
      try { if (CC.applyModelBadges) CC.applyModelBadges(ctx); } catch (e) { warn('Model badges skipped', e); }
      // Autonomous adds a 'Hide Automation tasks' row to the sidebar More menu and applies the owner's
      // saved choice now, at page load, rather than when More is first opened; guarded like the rest.
      try { if (CC.sprintsSidebar && CC.sprintsSidebar.apply) CC.sprintsSidebar.apply(ctx); } catch (e) { warn('Autonomous sidebar row skipped', e); }
    } catch (e) { warn('apply failed; Waypoint skipped', e); }
  };
  CC.inject = ['slots', 'layout', 'uiConversation', 'sidebarRightTabs'];
})(CC);
