(function (CC) {
  // S1 Settings: one stored on/off map for every sidebar tab, ours and dsh's.
  //
  // dsh gives no public "hide this panel" option (its More-menu pins live in memory only and the
  // Plugins row can never be unpinned; dsh-client-ui-sidebar README), and the More button shows
  // whenever `sidebar.panellist.actions` has any registration, which dsh itself always adds. So
  // the owner's choices are kept in localStorage and applied with ONE scoped style rule over dsh's
  // sidebar rows (matched by their accessible label inside the panel list). dsh files are never
  // edited; a renamed class simply makes the rule match nothing and dsh shows its default.
  var KEY = 'WAYPOINT_TABS_V1';
  var LEGACY_AUTOMATION = 'DSH_CC_HIDE_AUTOMATION_TASKS'; // page_sprints.js keeps its own copy
  var STYLE_ID = 'cc-sidebar-settings';
  var LOCKED = 'cc-settings';
  var ROW = '[class*="_panelList"] [class*="_panelRow"]';

  // dsh-owned entries. `labels` are the English and Chinese row labels dsh renders.
  var DSH = [
    { id: 'plugins', label: 'Plugins', labels: ['Plugins', '插件'], def: true },
    { id: 'schedules', label: 'Automation tasks', labels: ['Automation tasks', '自动化任务'], def: true },
    { id: 'more', label: 'More menu', def: false },
    { id: 'workspaces', label: 'Workspaces', hint: 'Folder chooser and list', def: false }
  ];

  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }
  function readRaw(key) { try { var s = storage(); return s ? s.getItem(key) : null; } catch (e) { return null; } }
  function writeRaw(key, value) { try { var s = storage(); if (s) s.setItem(key, value); } catch (e) { /* blocked */ } }

  function tabs() {
    // An add-on tab (cc-prefs) gets a switch only while its add-on is on, like its sidebar row (app.js).
    return (CC.PAGES || []).filter(function (p) { return p.sidebar !== false && (!p.addon || (CC.addonOn && CC.addonOn(p.addon))); })
      .slice().sort(function (a, b) { return a.order - b.order; });
  }
  function entries() {
    var out = tabs().map(function (p) { return { id: p.id, label: p.label, group: 'tabs', def: p.def !== false, locked: p.id === LOCKED }; });
    DSH.forEach(function (d) { out.push({ id: d.id, label: d.label, hint: d.hint || null, group: 'dsh', def: d.def }); });
    return out;
  }
  function defaultFor(id) {
    if (id === 'schedules') return readRaw(LEGACY_AUTOMATION) !== '1';
    var d = DSH.filter(function (x) { return x.id === id; })[0];
    if (d) return d.def;
    // v4 B3: a page can start off (Claude and Codex now run from the main chat; their tabs keep the
    // session history and come back from Settings).
    var page = (CC.PAGES || []).filter(function (x) { return x.id === id; })[0];
    return !(page && page.def === false);
  }

  var cache = null;
  function load() {
    if (cache) return cache;
    var map = {};
    try { var raw = readRaw(KEY); var parsed = raw ? JSON.parse(raw) : null; if (parsed && typeof parsed === 'object') map = parsed; } catch (e) { map = {}; }
    cache = map;
    return cache;
  }
  function isOn(id) {
    if (id === LOCKED) return true;
    var map = load();
    return typeof map[id] === 'boolean' ? map[id] : defaultFor(id);
  }

  var listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
  }
  function set(id, on) {
    if (id === LOCKED) return true;
    var map = Object.assign({}, load());
    map[id] = !!on;
    cache = map;
    writeRaw(KEY, JSON.stringify(map));
    if (id === 'schedules') {
      writeRaw(LEGACY_AUTOMATION, on ? '0' : '1');
      try { if (CC.sprintsSidebar && CC.sprintsSidebar.sync) CC.sprintsSidebar.sync(); } catch (e) { /* its rule is optional */ }
    }
    applyCss();
    listeners.slice().forEach(function (l) { try { l(id, !!on); } catch (e) { if (CC.warn) CC.warn('settings listener failed', e); } });
    return !!on;
  }

  function q(label) { return String(label).replace(/["\\]/g, ''); }
  function rowRule(labels) {
    return labels.map(function (l) { return ROW + '[aria-label="' + q(l) + '"]'; }).join(',');
  }
  function css() {
    var sel = [];
    tabs().forEach(function (p) { if (!isOn(p.id)) sel.push(rowRule([p.label])); });
    DSH.forEach(function (d) { if (d.labels && !isOn(d.id)) sel.push(rowRule(d.labels)); });
    if (!isOn('more')) sel.push('[class*="_panelList"] [class*="_moreAnchor"]', ROW + '[aria-haspopup="menu"]');
    return sel.length ? sel.join(',') + '{display:none;}' : '';
  }
  // The owner (109): a logical order. Waypoint's rows first, dsh's own rows (Plugins, Automation tasks,
  // More) after Settings. The panel list is a flex column, so CSS `order` moves rows without
  // touching dsh's DOM; a renamed class just leaves dsh's order.
  var ORDER_ID = STYLE_ID + '-order';
  // Review 2 (57): the sidebar footer flickered between the avatar alone and "Signed in to DeepSeek"
  // while dsh's account profile loaded. The avatar is enough: the label is hidden in every state; the
  // button keeps its own aria-label ("Account menu") for screen readers.
  var FOOTER_CSS = 'button[class*="_trigger"][aria-haspopup="menu"]:has(> [class*="_avatar"]) > [class*="_label"]{display:none;}';
  function orderCss() {
    var dshRows = [];
    DSH.forEach(function (d) { if (d.labels) dshRows.push(rowRule(d.labels)); });
    return '[class*="_panelList"]{display:flex;flex-direction:column;}' +
      dshRows.join(',') + '{order:1;}' +
      '[class*="_panelList"] [class*="_moreAnchor"]{order:2;}' + FOOTER_CSS;
  }
  function applyOrder() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById(ORDER_ID);
      if (!el) { el = document.createElement('style'); el.id = ORDER_ID; document.head.appendChild(el); }
      var text = orderCss();
      if (el.textContent !== text) el.textContent = text;
    } catch (e) { /* dsh's order stays */ }
  }
  function applyCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return false;
      applyOrder();
      var text = css();
      var el = document.getElementById(STYLE_ID);
      if (!text) { if (el && el.parentNode) el.parentNode.removeChild(el); return false; }
      if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
      el.textContent = text;
      return true;
    } catch (e) { if (CC.warn) CC.warn('sidebar settings rule skipped', e); return false; }
  }

  CC.settings = { storageKey: KEY, styleId: STYLE_ID, entries: entries, isOn: isOn, set: set, subscribe: subscribe,
    css: css, orderCss: orderCss, footerCss: FOOTER_CSS, apply: applyCss, reload: function () { cache = null; return load(); } };

  // ---- page -----------------------------------------------------------------------------------
  // Built from the kit (ui.js): one header, a left-aligned 960 px column, flat hairline sections.
  // Pages (Waypoint's sidebar rows, in sidebar order), Chat app (dsh's own rows), Waypoint (server
  // status, models and connectors, add-ons; all through CC.wpc), About (plugin version and the
  // Waypoint server). Every switch row is 32 px and the whole row flips its switch.
  var PAGE_CSS = [
    '.cc-root.cc-set{min-height:100%;}',
    '.cc-root .cc-set-sec .cc-sec-h{padding:0 8px;}',
    '.cc-root .cc-set-sw{display:inline-flex;align-items:center;}',
    '.cc-root .cc-set-off .cc-r-t{color:var(--cc-text-2);}',
    '.cc-root .cc-set-about .cc-r-m{font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-err{color:var(--cc-error);}',
    '.cc-root .cc-set-sub{padding:12px 8px 4px;font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-fix{padding:4px 8px;font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-status{padding:6px 8px;font-size:var(--cc-fs-label);color:var(--cc-text-2);}',
    '.cc-root .cc-set-floor{width:44px;margin-left:8px;text-align:right;font:inherit;}',
    '.cc-root .cc-set-pool{display:inline-flex;align-items:center;}'
  ].join('');
  CC.settings.pageCss = PAGE_CSS;
  function ensurePageCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById('cc-settings-page');
      if (!el) { el = document.createElement('style'); el.id = 'cc-settings-page'; document.head.appendChild(el); }
      if (el.textContent !== PAGE_CSS) el.textContent = PAGE_CSS;
    } catch (e) { /* cosmetic only */ }
  }

  function Row(props) {
    var U = CC.ui, e = props.entry;
    function flip(ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); props.onToggle(e.id, !props.on); }
    // Settings rule (same in Pages, Chat app and Models): the switch leads the row, the label follows,
    // any hint is the row's meta on the right.
    return U.Row({ key: e.id, id: e.id, className: 'cc-set-row' + (props.on ? '' : ' cc-set-off'), title: e.label, meta: e.hint || null,
      onClick: flip,
      // The switch's own click must not also reach the row (that would flip twice).
      lead: CC.h('span', { className: 'cc-set-sw', onClick: function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); } },
        U.Toggle({ id: e.id, checked: !!props.on, label: e.label, onChange: function () { flip(); } })) });
  }

  // ---- Waypoint section (dsh 2.0): everything through CC.wpc (wpc_client.js), never the retired engine ----
  var REFRESH = ['ops_read'];
  var FIX = ['Start it with ', 'python -m waypoint_runner.wpc_http', ' in the Core runner folder, or restart dsh (the plugin starts it).'];
  // How to turn each add-on on (plugin/INSTALL.md). Shown only while it is off.
  var ADDONS = [
    { id: 'preferences', label: 'Preferences', how: 'Set prefs_tools in ~/.waypoint/config.json to a folder with mcp_preferences.py, then restart dsh.' },
    { id: 'brain', label: 'Brain', how: 'Needs brain_tools in Waypoint Core (runner/waypoint_runner). Update Core, then restart dsh.' },
    { id: 'learn', label: 'Learn', how: 'Needs learn_tools in Waypoint Core (runner/waypoint_runner). Update Core, then restart dsh.' },
    { id: 'toolbox', label: 'Toolbox', how: 'Add a toolbox.json file to your Waypoint data folder.' }
  ];
  var STATE_WORDS = { up: 'Up', down: 'Down', disabled: 'Off' };

  // Up when features answered and no read since says the server is gone; a refusal is not "down".
  function serverState(features, featuresError, opsError) {
    var down = (featuresError && featuresError.code === 'server_down') || (opsError && opsError.code === 'server_down');
    if (down) return { up: false, down: true, checking: false };
    if (features) return { up: true, down: false, checking: false };
    if (featuresError) return { up: false, down: false, checking: false, error: featuresError };
    return { up: false, down: false, checking: true };
  }
  function parseFloor(text) {
    var t = String(text == null ? '' : text).trim().replace(/%$/, '').trim();
    var bad = { ok: false, message: 'Floor must be a number from 0 to 100, or blank.' };
    if (!t) return { ok: true, value: null };
    if (!/^\d+(\.\d+)?$/.test(t)) return bad;
    var n = Number(t);
    return n >= 0 && n <= 100 ? { ok: true, value: n } : bad;
  }
  function toggleInput(id, on) { return { id: String(id), enabled: !!on }; }
  function floorInput(pool, value) { return { pool: String(pool), min_percent: value == null ? null : value }; }
  function errText(e) { return (e && (e.message || e.code)) || 'Refused.'; }
  // Each write waits for the server's answer and returns a status line {text, error}.
  function doToggle(cc, id, on, label) {
    var name = label || id;
    return cc.wpc.act('toggle_set', toggleInput(id, on), REFRESH).then(function (r) {
      var now = r && typeof r.enabled === 'boolean' ? r.enabled : !!on;
      return { text: name + ' switched ' + (now ? 'on.' : 'off.'), error: false };
    }, function (e) { return { text: 'Could not switch ' + name + ': ' + errText(e), error: true }; });
  }
  function doFloor(cc, pool, text) {
    var f = parseFloor(text);
    if (!f.ok) return Promise.resolve({ text: f.message, error: true });
    return cc.wpc.act('floor_set', floorInput(pool, f.value), REFRESH).then(function () {
      return { text: 'Floor for ' + pool + (f.value == null ? ' cleared.' : ' set to ' + f.value + '%.'), error: false };
    }, function (e) { return { text: 'Could not set the floor for ' + pool + ': ' + errText(e), error: true }; });
  }
  function providerMeta(p) {
    var w = STATE_WORDS[p.state] || (p.enabled ? 'Up' : 'Off');
    return p.state === 'down' && p.reason ? w + ': ' + p.reason : w;
  }

  function Sub(title) { return CC.h('div', { key: 'h-' + title, className: 'cc-set-sub' }, title); }
  function stop(ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); }

  function ServerPart(p) {
    var h = CC.h, U = CC.ui, s = serverState(p.features, p.featuresError, p.opsError);
    var words = s.down ? 'Not running' : s.up ? 'Running' : s.checking ? 'Checking' : 'Could not answer: ' + errText(s.error);
    var rows = [
      U.Row({ key: 'st', id: 'server', title: 'Waypoint server', meta: h('span', { className: s.up || s.checking ? undefined : 'cc-set-err' }, words) }),
      U.Row({ key: 'dd', id: 'data-dir', title: 'Data folder', meta: (p.features && p.features.data_dir) || '–' })
    ];
    return h('div', { 'data-part': 'server' }, Sub('Server'), U.List({ label: 'Waypoint server', children: rows }),
      s.down ? h('div', { className: 'cc-set-fix' }, FIX[0], h('code', { key: 'c' }, FIX[1]), FIX[2]) : null);
  }

  function ProviderRow(p) {
    var h = CC.h, U = CC.ui, pr = p.provider, label = pr.label || pr.id, busy = p.busy === 'toggle:' + pr.id;
    function flip(ev) { stop(ev); if (!busy) p.onToggle(pr.id, !pr.enabled, label); }
    return U.Row({ key: pr.id, id: 'prov-' + pr.id, className: 'cc-set-row' + (pr.enabled ? '' : ' cc-set-off'), title: label,
      meta: h('span', { className: pr.state === 'down' ? 'cc-set-err' : undefined }, providerMeta(pr)), onClick: flip,
      lead: h('span', { className: 'cc-set-sw', onClick: stop },
        U.Toggle({ id: pr.id, checked: !!pr.enabled, label: label, disabled: busy, onChange: function () { flip(); } })) });
  }

  function PoolRow(p) {
    var h = CC.h, U = CC.ui, pl = p.pool, busy = p.busy === 'floor:' + pl.pool;
    function send(ev) { if (!busy) p.onFloor(pl.pool, ev && ev.target ? ev.target.value : ''); }
    return U.Row({ key: pl.pool, id: 'pool-' + pl.pool, title: pl.pool, sub: pl.provider ? ' · ' + pl.provider : null,
      meta: h('span', { className: 'cc-set-pool' },
        U.Meter({ value: pl.remaining_percent, label: 'left', tone: pl.below_floor ? 'low' : undefined }),
        h('label', { className: 'cc-set-pool' }, ' floor',
          h('input', { key: pl.pool + ':' + pl.floor, type: 'text', inputMode: 'numeric', className: 'cc-set-floor',
            'data-floor': pl.pool, 'aria-label': 'Floor for ' + pl.pool, placeholder: '0', disabled: busy,
            defaultValue: pl.floor == null ? '' : String(pl.floor), onBlur: send,
            onKeyDown: function (ev) { if (ev && ev.key === 'Enter' && ev.target && ev.target.blur) ev.target.blur(); } }), '%')) });
  }

  function ModelsPart(p) {
    var h = CC.h, U = CC.ui, ops = p.ops, body;
    if (!ops) {
      body = p.opsError ? CC.WpcProblem({ error: p.opsError }) : U.Empty({ title: p.loading === false ? 'No data yet' : 'Loading…' });
    } else {
      var provs = ops.providers || [], pools = ops.pools || [];
      if (!provs.length && !pools.length) {
        body = U.Empty({ title: 'No models or connectors yet', body: 'Waypoint lists them from the agents folder in your data folder.' });
      } else {
        body = [
          p.opsError ? U.Banner({ key: 'bn', tone: 'warn', children: 'Could not refresh: ' + errText(p.opsError) }) : null,
          provs.length ? U.List({ key: 'pv', label: 'Models and connectors',
            children: provs.map(function (pr) { return ProviderRow({ provider: pr, busy: p.busy, onToggle: p.onToggle }); }) }) : null,
          pools.length ? Sub('Usage floors') : null,
          pools.length ? U.List({ key: 'pl', label: 'Usage floors',
            children: pools.map(function (pl) { return PoolRow({ pool: pl, busy: p.busy, onFloor: p.onFloor }); }) }) : null
        ];
      }
    }
    return h('div', { 'data-part': 'models' }, Sub('Models and connectors'), body,
      p.status ? h('div', { className: 'cc-set-status' + (p.status.error ? ' cc-set-err' : ''), role: 'status' }, p.status.text) : null);
  }

  function AddonsPart(p) {
    var h = CC.h, U = CC.ui, addons = p.features && p.features.addons;
    var body = !addons ? U.Empty({ title: 'Add-ons show when the Waypoint server is running.' })
      : U.List({ label: 'Add-ons', children: ADDONS.map(function (a) {
        var on = !!addons[a.id];
        return U.Row({ key: a.id, id: 'addon-' + a.id, className: on ? undefined : 'cc-set-off', title: a.label,
          sub: on ? null : ' ' + a.how, meta: on ? 'On' : 'Off', wrap: !on });
      }) });
    return h('div', { 'data-part': 'addons' }, Sub('Add-ons'), body);
  }

  function WaypointSection(p) {
    return CC.ui.Section({ key: 'wp', title: 'Waypoint', section: 'settings-waypoint', boxRef: p.boxRef, className: 'cc-set-sec',
      children: [ServerPart(p), ModelsPart(p), AddonsPart(p)] });
  }

  CC.settingsInternals = { serverState: serverState, parseFloor: parseFloor, toggleInput: toggleInput, floorInput: floorInput,
    doToggle: doToggle, doFloor: doFloor, providerMeta: providerMeta, ADDONS: ADDONS, WaypointSection: WaypointSection };

  // Open Settings scrolled to its Waypoint section (old cc-agents route, "Open Agents" links).
  CC.openSettingsAgents = function () {
    CC.settingsFocus = 'agents';
    try { if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') CC.ctx.layout.selectPanel('cc-settings'); } catch (e) { /* no layout */ }
  };

  var NO_DATA = { data: null, error: null, loading: false };
  var NO_SERVER = { code: 'server_down', message: 'The Waypoint client is not loaded.' };
  CC.SettingsPage = function SettingsPage() {
    var h = CC.h, React = CC.React, U = CC.ui;
    ensurePageCss();
    var st = React.useState(0), bump = st[1];
    React.useEffect(function () { return subscribe(function () { bump(function (n) { return n + 1; }); }); }, []);
    function toggle(id, on) { set(id, on); bump(function (n) { return n + 1; }); }
    var all = entries().filter(function (e) { return !e.locked; });
    function group(title, key) {
      var rows = all.filter(function (e) { return e.group === key; });
      var on = rows.filter(function (e) { return isOn(e.id); }).length;
      return U.Section({ key: key, title: title, meta: on + ' of ' + rows.length + ' shown', section: 'settings-' + key, className: 'cc-set-sec',
        children: U.List({ label: title, children: rows.map(function (e) { return h(Row, { key: e.id, entry: e, on: isOn(e.id), onToggle: toggle }); }) }) });
    }
    // Waypoint server: features once (cached by CC.wpc), ops_read every 15 s and after every write.
    var hasWpc = !!(CC.wpc && typeof CC.useWpc === 'function');
    var fs = React.useState({ features: null, error: null }), feat = fs[0], setFeat = fs[1];
    React.useEffect(function () {
      if (!hasWpc) return undefined;
      var alive = true;
      CC.wpc.features().then(function (f) { if (alive) setFeat({ features: f, error: null }); },
        function (e) { if (alive) setFeat({ features: null, error: e }); });
      return function () { alive = false; };
    }, []);
    var ops = hasWpc ? CC.useWpc('ops_read', {}, { every: 15000 }) : NO_DATA;
    var featErr = hasWpc ? feat.error : NO_SERVER;
    var bs = React.useState(null), busy = bs[0], setBusy = bs[1];
    var ss = React.useState(null), status = ss[0], setStatus = ss[1];
    function run(key, p) { setBusy(key); return p.then(function (msg) { setBusy(null); setStatus(msg); }); }
    var wpRef = React.useRef(null);
    React.useEffect(function () {
      if (CC.settingsFocus !== 'agents') return;
      CC.settingsFocus = null;
      try { if (wpRef.current && wpRef.current.scrollIntoView) wpRef.current.scrollIntoView({ block: 'start' }); } catch (e) { /* cosmetic */ }
    }, []);
    var waypoint = WaypointSection({ boxRef: wpRef, features: feat.features, featuresError: featErr,
      ops: ops.data, opsError: ops.error, loading: ops.loading, busy: busy, status: status,
      onToggle: function (id, on, label) { if (hasWpc) run('toggle:' + id, doToggle(CC, id, on, label)); },
      onFloor: function (pool, text) { if (hasWpc) run('floor:' + pool, doFloor(CC, pool, text)); } });
    var srv = serverState(feat.features, featErr, ops.error);
    var addr = String((CC.wpc && CC.wpc.base) || 'http://127.0.0.1:8762').replace(/^https?:\/\//, '');
    var about = U.Section({ key: 'about', title: 'About', section: 'settings-about', className: 'cc-set-sec cc-set-about',
      children: U.List({ label: 'About', children: [
        U.Row({ key: 'v', title: 'Waypoint for dsh', meta: CC.version ? 'Version ' + CC.version : '–' }),
        U.Row({ key: 's', title: 'Waypoint server', meta: h('span', { className: srv.up || srv.checking ? undefined : 'cc-set-err' },
          (srv.up ? 'Running' : srv.checking ? 'Checking' : 'Not running') + ' · ' + addr) })
      ] }) });
    return U.Page({ className: 'cc-set', page: 'settings', col: true,
      header: U.PageHeader({ title: 'Settings', pageId: 'cc-settings' }),
      children: [group('Pages', 'tabs'), group('Chat app', 'dsh'), waypoint, about] });
  };
})(CC);
