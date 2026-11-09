// The preview page's stand-in for dsh: a module loader, a mock plugin context and a small
// sidebar + main frame. It loads before plugin/lib/client.js, which calls
// window.__ModuleLoader__.load({id, factory}); everything the plugin registers lands in `slots`
// below and the frame re-renders whenever that changes.
(function () {
  'use strict';
  var R = window.React, RD = window.ReactDOM;
  var root = document.getElementById('pv-root');
  if (!R || !RD) {
    root.innerHTML = '<div class="pv-note">React is not cached yet. Run <code>node plugin/tools/preview.mjs</code> once without <code>--offline</code>.</div>';
    window.__previewState = { ready: false, reason: 'no-react' };
    return;
  }
  var h = R.createElement;
  function noop() {}

  // ---------------------------------------------------------------- slot registry
  // slots[name] = [{ spec, Comp, seq }]; inject() runs its callback at once (dsh runs it when the
  // slot mounts), register() stores and returns a disposer.
  var slots = {};
  var seq = 0;
  var listeners = new Set();
  function changed() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } }); }
  var slotsApi = {
    inject: function (name, fn) {
      var dispose = null;
      try { dispose = fn(); } catch (e) { console.warn('[preview] slot ' + name + ' inject callback failed: ' + (e && e.message)); }
      return typeof dispose === 'function' ? dispose : noop;
    },
    register: function (spec, Comp) {
      var name = (spec && spec.name) || 'unknown';
      var entry = { spec: spec || {}, Comp: Comp, seq: ++seq };
      (slots[name] = slots[name] || []).push(entry);
      changed();
      return function () {
        var list = slots[name] || [];
        var i = list.indexOf(entry);
        if (i >= 0) { list.splice(i, 1); changed(); }
      };
    }
  };
  window.__previewSlots = slots;

  // A seat that takes one component shows the lowest priority (dsh's rule).
  function single(name) {
    var list = (slots[name] || []).slice().sort(function (a, b) {
      return ((a.spec.priority || 0) - (b.spec.priority || 0)) || (a.seq - b.seq);
    });
    return list[0] || null;
  }

  // ---------------------------------------------------------------- page id in the URL hash
  function pageId() { return (location.hash || '').replace(/^#\/?/, '') || 'cc-todo'; }
  function go(id) { if (pageId() !== id) location.hash = id; }

  // ---------------------------------------------------------------- mock ctx
  var disposerOnly = { register: function () { return noop; } };
  var ctx = {
    slots: slotsApi,
    layout: {
      selectPanel: function (id) { go(id); },
      openPanel: function (id) { go(id); },
      selected: function () { return pageId(); }
    },
    uiConversation: { events: disposerOnly, register: function () { return noop; } },
    sidebarRightTabs: { register: function () { return noop; } },
    get: function () { return null; },
    effect: function (fn) { try { var d = fn(); return typeof d === 'function' ? d : noop; } catch (e) { return noop; } }
  };
  window.__previewCtx = ctx;

  // ---------------------------------------------------------------- module loader
  var modules = {};
  function requireShim(name) {
    if (name === 'react') return R;
    if (name === 'react-dom' || name === 'react-dom/client') return RD;
    return {};
  }
  window.__ModuleLoader__ = {
    load: function (spec) {
      var id = spec && spec.id;
      try {
        var exp = spec.factory(requireShim);
        modules[id] = exp;
        if (exp && typeof exp.apply === 'function') exp.apply(ctx);
        window.__previewState = { ready: true, module: id };
      } catch (e) {
        window.__previewState = { ready: false, reason: 'load-failed', error: String(e && e.message || e) };
        console.error('[preview] plugin ' + id + ' failed to load: ' + (e && e.message));
      }
      changed();
    }
  };
  window.__previewModules = modules;

  // ---------------------------------------------------------------- frame
  function Svg(props) {
    return h('svg', { width: props.size || 16, height: props.size || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: props.sw || 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, props.children);
  }
  function PlusCircle() { return h(Svg, { size: 15 }, h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 8v8M8 12h8' })); }
  function Collapse() { return h(Svg, { size: 18, sw: 1.6 }, h('rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2 }), h('path', { d: 'M9 4.5v15' })); }
  function Person() { return h(Svg, { size: 20, sw: 1.6 }, h('circle', { cx: 12, cy: 9, r: 3.5 }), h('path', { d: 'M5.5 19c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5' })); }
  function Puzzle() { return h(Svg, { size: 15 }, h('path', { d: 'M10 4h4v3a2 2 0 1 0 0 0h3v4h-1a2 2 0 1 0 0 4h1v4h-4v-1a2 2 0 1 0-4 0v1H5v-4h1a2 2 0 1 0 0-4H5V7h3V6a2 2 0 0 1 2-2z' })); }
  function Clock() { return h(Svg, { size: 15 }, h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 7v5l3 2' })); }

  // dsh's own rows that sit under the plugin's entries in the real sidebar.
  var HOST_ROWS = [
    { id: 'pv-plugins', order: 100, label: 'Plugins', Icon: Puzzle },
    { id: 'pv-automation', order: 101, label: 'Automation tasks', Icon: Clock }
  ];

  function useSlots() {
    var st = R.useState(0), bump = st[1];
    R.useEffect(function () {
      var fn = function () { bump(function (n) { return n + 1; }); };
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    }, []);
  }
  function usePage() {
    var st = R.useState(pageId()), id = st[0], set = st[1];
    R.useEffect(function () {
      var fn = function () { set(pageId()); };
      window.addEventListener('hashchange', fn);
      return function () { window.removeEventListener('hashchange', fn); };
    }, []);
    return id;
  }

  function Sidebar(props) {
    var mark = single('sidebar.brand.mark'), name = single('sidebar.brand.name');
    var rows = (slots['sidebar.panellist'] || []).map(function (e) {
      var label = typeof e.spec.label === 'function' ? e.spec.label() : (e.spec.label || e.spec.id);
      return { id: e.spec.id, order: e.spec.order || 0, label: label, Icon: e.Comp, plugin: true };
    }).concat(HOST_ROWS).sort(function (a, b) { return a.order - b.order; });
    return h('nav', { className: 'pv-sidebar', 'aria-label': 'Sidebar' },
      h('div', { className: 'pv-brand' },
        h('span', { className: 'pv-brand-mark' }, mark ? h(mark.Comp, { size: 22 }) : null),
        h('span', { className: 'pv-brand-name' }, name ? h(name.Comp) : 'DeepSeek Harness'),
        h('button', { className: 'pv-collapse', 'aria-label': 'Collapse sidebar', type: 'button' }, h(Collapse))),
      h('button', { className: 'pv_newSession', 'aria-label': 'New session', type: 'button' }, h(PlusCircle), 'New Session'),
      h('div', { className: 'pv-rows pv_panelList' }, rows.map(function (r) {
        return h('button', { key: r.id, type: 'button', className: 'pv-row pv_panelRow', 'aria-label': r.label, title: r.label,
          'aria-current': r.id === props.page ? 'page' : undefined, 'data-pv-panel': r.id,
          onClick: function () { if (r.plugin) go(r.id); } },
          h('span', { className: 'pv-row-icon' }, r.Icon ? h(r.Icon, { size: 16 }) : null),
          h('span', null, r.label));
      })),
      h('div', { className: 'pv-foot' }, h(Person)));
  }

  function Main(props) {
    var list = (slots.main || []).filter(function (e) { return e.spec.key === props.page; });
    var entry = list[list.length - 1];
    if (!entry) {
      var ready = window.__previewState && window.__previewState.ready;
      return h('main', { className: 'pv-main' }, h('div', { className: 'pv-note', 'data-pv-empty': props.page },
        ready ? 'No page is registered for ' + props.page + ' (yet).' : 'Loading the plugin bundle…'));
    }
    return h('main', { className: 'pv-main', 'data-pv-page': props.page }, h(entry.Comp, { key: props.page }));
  }

  function Frame() {
    useSlots();
    var page = usePage();
    return h('div', { className: 'pv-app' }, h(Sidebar, { page: page }), h(Main, { page: page }));
  }

  RD.createRoot(root).render(h(Frame));
})();
