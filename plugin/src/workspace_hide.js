(function (CC) {
  // E2: no workspace picker (the owner finds workspaces confusing).
  //
  // Public routes used (dsh files are never edited):
  // - `conversation.hero.workspace` is a replaceable `single` seat (ui-conversation contract). Its
  //   owner props are {open, anchorRef, selectedId, onPick(workspaceId), onClose}. We register an
  //   occupant below the official picker's priority that renders nothing, closes itself if opened,
  //   and calls onPick(<home workspace>) once when a blank New Session sits anywhere else, so new
  //   sessions start in one home folder. The home folder is configured, never hard-coded: CC.DRIVE_PATH,
  //   window.WAYPOINT_HOME_WORKSPACE, localStorage WAYPOINT_HOME_WORKSPACE, or Core's GET /api/toggles
  //   `home_workspace` (or /health) (in that order). With none set, new sessions stay where dsh puts them. The
  //   workspace id comes from ctx.workspaces.list (read through ctx.get, so nothing new is
  //   injected); it is never created here.
  // - The hero chip that opens the picker, the Workspaces section label, the workspace group rows
  //   and Add workspace have no public option, so one scoped style rule hides them.
  // Known limit: hiding a workspace group row also hides the sessions of a group that is collapsed;
  // dsh's own View options > Group by flat lists every session without workspaces.
  // Settings 'Workspaces' (settings.js, off by default) brings all of it back at once.
  // Waypoint code that deliberately opens a blank session in another workspace (a worktree,
  // say) calls CC.workspaceHide.expect(workspaceId) first so it is not moved to the home folder.
  var SLOT = 'conversation.hero.workspace';
  var PRIORITY = -10;
  var STYLE_ID = 'cc-hide-workspaces';
  var HOME_KEY = 'WAYPOINT_HOME_WORKSPACE';
  var LABELS = { choose: ['Choose workspace', '选择工作区'], add: ['Add workspace', '添加工作区'] };

  function warn(what, err) { if (CC.warn) CC.warn(what, err); }
  function q(s) { return String(s).replace(/["\\]/g, ''); }
  function norm(p) { return String(p || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase(); }

  function hidden() { return !(CC.settings && CC.settings.isOn && CC.settings.isOn('workspaces')); }

  // Review 2 (53): on a Waypoint page (its frame, [data-cc-frame], is on screen) dsh's whole session browser (header with
  // search + view options, and the rows) is hidden, so it never floats mid-sidebar once a blank session
  // exists. Chat pages keep it. The browser is the workspace package's root: the `_root` whose direct
  // child is the `_sectionHeader` and which holds the `_listArea`.
  // Everywhere, an untitled blank session (dsh renders it not draggable, unlike every other live row)
  // is left out of the list; the rule only applies where draggable rows exist, so a view without
  // dragging never hides its rows.
  var BROWSER = '[class*="_root"]:has(> [class*="_sectionHeader"]):has([class*="_listArea"])';
  // v4 (the owner: no search and filter buttons): the browser's header (search + view options) is
  // hidden on every page; its rows, which are the owner's chats, stay on chat pages.
  var WAYPOINT_CSS = BROWSER + ' > [class*="_sectionHeader"]{display:none;}' +
    'body:has([data-cc-frame]) ' + BROWSER + '{display:none;}' +
    '[class*="_listArea"]:has([data-row-key^="session:"][draggable="true"]) ' +
    '[data-row-key^="session:"][draggable="false"]:not([class*="_archived"]){display:none;}';

  // dsh's composer access chip still says "Workspace Write" after workspaces were dropped (112).
  // Its label is a text node React owns, so the chip is relabelled in CSS only (the text stays for
  // screen readers through the button's own aria-label). Only labels listed here change.
  var CHIP = { 'Workspace Write': 'Can edit' };
  function chipLabel(text) { return Object.prototype.hasOwnProperty.call(CHIP, text) ? CHIP[text] : null; }
  function chipCss() {
    return Object.keys(CHIP).map(function (k) {
      // The button is a flex row (icon, label, chevron): the label hides, ::after carries the new
      // words and `order` puts them back before the chevron.
      var b = 'button[aria-label="Access mode, current: ' + q(k) + '"]';
      return b + ' [class*="_triggerLabel"]{display:none;}' + b + '::after{content:"' + q(chipLabel(k)) + '";order:1;}' +
        b + ' [class*="_chevron"]{order:2;}';
    }).join('');
  }

  function css() {
    var sel = ['[class*="_listArea"] [data-row-key^="workspace:"]', '[data-row-key^="workspace:"][role="treeitem"]',
      '[class*="_sectionHeader"] [class*="_sectionLabel"]'];
    LABELS.add.forEach(function (l) { sel.push('[class*="_sectionHeader"] button[aria-label="' + q(l) + '"]'); });
    LABELS.choose.forEach(function (l) { sel.push('[class*="_heroWorkspaceRow"] button[aria-label="' + q(l) + '"]'); });
    return sel.join(',') + '{display:none;}' + WAYPOINT_CSS + chipCss();
  }
  function syncCss(on) {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById(STYLE_ID);
      if (!on) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
      if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
      el.textContent = css();
    } catch (e) { warn('workspace hide rule skipped', e); }
  }

  function service(ctx) {
    try {
      if (!ctx) return null;
      if (typeof ctx.get === 'function') return ctx.get('workspaces') || null;
      return ctx.workspaces || null;
    } catch (e) { return null; }
  }
  function items(ctx) {
    try {
      var ws = service(ctx);
      var snap = ws && ws.list && typeof ws.list.getSnapshot === 'function' ? ws.list.getSnapshot() : null;
      return (snap && snap.items) || [];
    } catch (e) { return []; }
  }
  // The configured home folder, or '' when none is set.
  function homePath() {
    try {
      if (CC.DRIVE_PATH) return String(CC.DRIVE_PATH);
      var g = typeof globalThis !== 'undefined' ? globalThis : {};
      if (g[HOME_KEY]) return String(g[HOME_KEY]);
      var stored = g.localStorage ? g.localStorage.getItem(HOME_KEY) : null;
      if (stored) return String(stored);
      if (CC.toggles && CC.toggles.state && CC.toggles.state.homeWorkspace) return String(CC.toggles.state.homeWorkspace);
      if (CC.core && CC.core.home) return String(CC.core.home);
    } catch (e) { /* storage blocked */ }
    return '';
  }
  function driveId(ctx) {
    var want = norm(homePath());
    if (!want) return null;
    var hit = items(ctx).filter(function (w) { return w && norm(w.path) === want; })[0];
    return hit ? hit.workspaceId : null;
  }

  var expected = new Set();
  function expect(id) { if (id) expected.add(id); }

  function DrivePicker(props) {
    var React = CC.React;
    var ctx = CC.ctx;
    var bump = React.useState(0)[1];
    React.useEffect(function () {
      var ws = service(ctx);
      if (!ws || !ws.list || typeof ws.list.subscribe !== 'function') return undefined;
      try { return ws.list.subscribe(function () { bump(function (n) { return n + 1; }); }); } catch (e) { return undefined; }
    }, []);
    var drive = driveId(ctx);
    var sel = props && props.selectedId;
    var open = !!(props && props.open);
    React.useEffect(function () {
      if (open && typeof props.onClose === 'function') { try { props.onClose(); } catch (e) { warn('workspace picker close failed', e); } }
    }, [open]);
    React.useEffect(function () {
      if (!drive || sel === drive || (sel && expected.has(sel)) || !props || typeof props.onPick !== 'function') return;
      try { props.onPick(drive); } catch (e) { warn('could not move the new session to the home folder', e); }
    }, [sel, drive]);
    return null;
  }

  var handle = null;
  function register(ctx) {
    if (handle || !ctx || !ctx.slots) return;
    var inner = null;
    try {
      var outer = ctx.slots.inject(SLOT, function () {
        try {
          inner = ctx.slots.register({ name: SLOT, priority: PRIORITY }, DrivePicker);
          return typeof inner === 'function' ? inner : function () {};
        } catch (e) { warn('workspace chooser replacement not registered; skipped', e); return function () {}; }
      });
      handle = function () {
        try { if (typeof outer === 'function') outer(); else if (typeof inner === 'function') inner(); } catch (e) { warn('workspace chooser restore failed', e); }
      };
    } catch (e) { warn('workspace chooser replacement not injected into slot "' + SLOT + '"; skipped', e); }
  }
  function unregister() {
    if (!handle) return;
    var h = handle;
    handle = null;
    h();
  }

  function sync() {
    var on = hidden();
    syncCss(on);
    if (on) register(CC.ctx); else unregister();
  }

  var listening = false;
  function apply(ctx) {
    if (ctx) CC.ctx = ctx;
    if (!listening && CC.settings && CC.settings.subscribe) {
      listening = true;
      CC.settings.subscribe(function (id) { if (id === 'workspaces') sync(); });
    }
    sync();
  }

  CC.workspaceHide = { apply: apply, sync: sync, css: css, styleId: STYLE_ID, slot: SLOT, driveId: driveId,
    expect: expect, Picker: DrivePicker, homePath: homePath, homeKey: HOME_KEY, waypointCss: WAYPOINT_CSS, chipLabel: chipLabel };
})(CC);
