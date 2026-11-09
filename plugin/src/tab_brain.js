// tab_brain.js - CC.BrainTab: the knowledge graph (an add-on, read only).
// brain_read gives nodes (preferences, notes, skills, instructions) and links [source index, target index, kind].
// List view: search and filter by kind; each row shows its links; a click opens the node's links below.
// Graph view: no force layout. One column group per kind, dots in rows, links as SVG lines; the brightest
// CAP nodes are drawn, with a "Showing N of M" note. The graph reads slowly, so it is read every 5 minutes.
(function (CC) {
  'use strict';
  var h = CC.h;
  var CAP = 150;
  var PAGE = 100;
  var EVERY = 300000;
  var KINDS = ['preference', 'brain', 'skill', 'instruction'];
  var KIND_LABEL = { preference: 'Preferences', brain: 'Notes', skill: 'Skills', instruction: 'Instructions' };
  var KIND_ONE = { preference: 'Preference', brain: 'Note', skill: 'Skill', instruction: 'Instruction' };
  var KIND_VAR = { preference: '--cc-accent', brain: '--cc-done', skill: '--cc-running', instruction: '--cc-text-2' };
  var ROWS = 30, DX = 14, DY = 14, GAP = 36, TOP = 28, SIDE = 16;

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function kindRank(k) { var i = KINDS.indexOf(k); return i < 0 ? 99 : i; }
  function kindLabel(k) { return KIND_LABEL[k] || str(k); }
  function bright(n) { var b = Number(n && n.brightness); return isFinite(b) ? b : 0.4; }

  // Plain graph: nodes, pairs [{a, b, kind}] by node id, and links per node id [{id, title, kind, dir}].
  function normalize(data) {
    var nodes = ((data && data.nodes) || []).filter(function (n) { return n && n.id; }).map(function (n, i) {
      return { id: str(n.id), kind: str(n.kind), title: str(n.title || n.label || n.id), cluster: n.cluster || '',
        path: str(n.path), brightness: bright(n), index: i };
    });
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var pairs = [], links = {};
    nodes.forEach(function (n) { links[n.id] = []; });
    ((data && data.links) || []).forEach(function (l) {
      var a, b, kind;
      if (Array.isArray(l)) { a = nodes[l[0]]; b = nodes[l[1]]; kind = l[2]; }
      else if (l) { a = byId[l.source]; b = byId[l.target]; kind = l.kind; }
      if (!a || !b || a === b) return;
      pairs.push({ a: a.id, b: b.id, kind: str(kind) });
      links[a.id].push({ id: b.id, title: b.title, kind: str(kind), dir: 'to' });
      links[b.id].push({ id: a.id, title: a.title, kind: str(kind), dir: 'from' });
    });
    return { nodes: nodes, pairs: pairs, links: links };
  }

  function filterNodes(nodes, kind, query) {
    var q = str(query).trim().toLowerCase();
    return (nodes || []).filter(function (n) {
      if (kind && kind !== 'all' && n.kind !== kind) return false;
      if (!q) return true;
      return [n.title, n.path, n.cluster, n.id].map(str).join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }

  function kindOptions(nodes) {
    var counts = {};
    (nodes || []).forEach(function (n) { counts[n.kind] = (counts[n.kind] || 0) + 1; });
    var kinds = Object.keys(counts).sort(function (a, b) { return kindRank(a) - kindRank(b) || a.localeCompare(b); });
    return [{ value: 'all', label: 'All', count: (nodes || []).length }].concat(kinds.map(function (k) {
      return { value: k, label: kindLabel(k), count: counts[k] };
    }));
  }

  // Column layout: keep the brightest `cap` nodes (ties keep list order), one group per kind in kind order,
  // ROWS dots per column inside a group. Lines join kept nodes only.
  function graphLayout(nodes, pairs, cap) {
    var limit = cap || CAP;
    var all = (nodes || []).map(function (n, i) { return { n: n, i: i }; });
    var kept = all.slice().sort(function (x, y) { return y.n.brightness - x.n.brightness || x.i - y.i; }).slice(0, limit)
      .sort(function (x, y) { return x.i - y.i; }).map(function (x) { return x.n; });
    var groups = {};
    kept.forEach(function (n) { (groups[n.kind] = groups[n.kind] || []).push(n); });
    var kinds = Object.keys(groups).sort(function (a, b) { return kindRank(a) - kindRank(b) || a.localeCompare(b); });
    var out = [], heads = [], at = {}, x = SIDE, rowsMax = 0;
    kinds.forEach(function (k) {
      var list = groups[k], cols = Math.ceil(list.length / ROWS);
      heads.push({ kind: k, label: kindLabel(k), x: x, count: list.length });
      list.forEach(function (n, j) {
        var p = { id: n.id, kind: n.kind, title: n.title, x: x + Math.floor(j / ROWS) * DX + DX / 2, y: TOP + (j % ROWS) * DY + DY / 2 };
        at[n.id] = p; out.push(p);
      });
      rowsMax = Math.max(rowsMax, Math.min(ROWS, list.length));
      x += Math.max(cols * DX, 90) + GAP;
    });
    var lines = (pairs || []).filter(function (l) { return at[l.a] && at[l.b]; }).map(function (l) {
      return { a: l.a, b: l.b, kind: l.kind, x1: at[l.a].x, y1: at[l.a].y, x2: at[l.b].x, y2: at[l.b].y };
    });
    return { nodes: out, lines: lines, heads: heads, shown: kept.length, total: (nodes || []).length,
      width: Math.max(x - GAP + SIDE, 200), height: TOP + rowsMax * DY + 8 };
  }

  function linkWord(n) { return n === 1 ? '1 link' : n + ' links'; }

  function NodeLinks(p) {
    var ui = CC.ui, n = p.node, links = p.links || [];
    return h(ui.Section, { title: n.title, section: 'brain-node', meta: [KIND_ONE[n.kind] || n.kind, n.cluster, n.path].filter(Boolean).join(' · '),
      actions: h(ui.Button, { size: 'sm', kind: 'quiet', onClick: p.onClose }, 'Close') },
    links.length ? h(ui.List, { label: 'Links of ' + n.title }, links.map(function (l, i) {
      return h(ui.Row, { key: l.id + i, id: l.id, title: l.title, meta: (l.dir === 'to' ? 'links to' : 'linked from') + (l.kind ? ' · ' + l.kind : ''),
        onClick: function () { p.onPick(l.id); } });
    })) : h(ui.Empty, { title: 'No links', body: 'Nothing links to or from this node.' }));
  }

  function Graph(p) {
    var lay = p.layout;
    return h('div', { className: 'cc-bg-wrap' },
      h('svg', { 'data-brain-graph': '1', role: 'img', 'aria-label': 'Knowledge graph, ' + lay.shown + ' nodes',
        width: lay.width, height: lay.height, viewBox: '0 0 ' + lay.width + ' ' + lay.height },
      lay.heads.map(function (hd) {
        return h('text', { key: 'h' + hd.kind, x: hd.x, y: 14, className: 'cc-bg-head' }, hd.label + ' (' + hd.count + ')');
      }),
      lay.lines.map(function (l, i) {
        return h('line', { key: 'l' + i, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, className: 'cc-bg-line' });
      }),
      lay.nodes.map(function (n) {
        return h('circle', { key: n.id, cx: n.x, cy: n.y, r: p.selected === n.id ? 6 : 4, 'data-node': n.id,
          className: 'cc-bg-dot' + (p.selected === n.id ? ' cc-bg-on' : ''),
          style: { fill: 'var(' + (KIND_VAR[n.kind] || '--cc-text-3') + ')' },
          onClick: function () { p.onPick(n.id); } }, h('title', null, n.title));
      })));
  }

  var CSS = [
    '.cc-root .cc-br-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}',
    '.cc-root .cc-bg-wrap{overflow:auto;max-width:100%;border:1px solid var(--cc-line);border-radius:6px;}',
    '.cc-root .cc-bg-line{stroke:var(--cc-line-strong);stroke-width:1;opacity:.7;}',
    '.cc-root .cc-bg-dot{cursor:pointer;}',
    '.cc-root .cc-bg-on{stroke:var(--cc-text);stroke-width:2;}',
    '.cc-root .cc-bg-head{fill:var(--cc-text-2);font-size:12px;font-weight:600;}',
    '.cc-root .cc-br-note{color:var(--cc-text-3);font-size:12px;margin:6px 0;}'
  ].join('');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-brain')) return;
    var el = document.createElement('style'); el.id = 'cc-tab-brain'; el.textContent = CSS; document.head.appendChild(el);
  }

  function BrainTab(p) {
    ensureCss();
    var React = CC.React, ui = CC.ui;
    var features = CC.useWpcFeatures();
    var off = !!(features && features.addons && features.addons.brain === false);
    var res = CC.useWpc(off ? null : 'brain_read', {}, { every: EVERY });
    var viewSt = React.useState((p && p.initialView) || 'list'), view = viewSt[0];
    var kindSt = React.useState('all'), kind = kindSt[0];
    var qSt = React.useState(''), query = qSt[0];
    var selSt = React.useState(null), selected = selSt[0];
    var shownSt = React.useState(PAGE), shown = shownSt[0];
    var g = React.useMemo(function () { return normalize(res.data); }, [res.data]);
    var header = function (meta, mid) {
      return h(ui.PageHeader, { title: 'Brain', meta: meta || null, mid: mid || null, pageId: p && p.pageId });
    };
    if (off) {
      return h(ui.Page, { page: 'brain', header: header() },
        h(ui.Empty, { title: 'The brain add-on is off', body: 'Turn it on in Settings, under Add-ons.' }));
    }
    if (!res.data) {
      return h(ui.Page, { page: 'brain', header: header() },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading the knowledge graph…' }));
    }
    var meta = g.nodes.length + ' nodes · ' + g.pairs.length + ' links' + (res.data.truncated ? ' (brightest kept)' : '') +
      (res.data.built_at ? ' · built ' + res.data.built_at : '');
    var mid = h(ui.Segmented, { label: 'View', value: view, options: [{ value: 'list', label: 'List' }, { value: 'graph', label: 'Graph' }],
      onChange: function (v) { viewSt[1](v); } });
    var banner = res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '. Showing the last graph.') : null;
    if (!g.nodes.length) {
      return h(ui.Page, { page: 'brain', header: header(meta, mid), banner: banner },
        h(ui.Empty, { title: 'No knowledge notes yet', body: 'Preferences, notes, skills and instructions show here when the index finds them.' }));
    }
    var list = filterNodes(g.nodes, kind, query);
    var pick = function (id) { selSt[1](id === selected ? null : id); };
    var tools = h('div', { className: 'cc-br-tools' },
      h(ui.Segmented, { label: 'Kind', value: kind, options: kindOptions(g.nodes), onChange: function (v) { kindSt[1](v); shownSt[1](PAGE); } }),
      h('input', { className: 'cc-in', type: 'search', placeholder: 'Search', 'aria-label': 'Search the knowledge graph', value: query,
        onChange: function (ev) { qSt[1](ev.target.value); shownSt[1](PAGE); } }));
    var body;
    if (!list.length) {
      body = h(ui.Empty, { title: 'No match', body: 'Change the kind or the search text.' });
    } else if (view === 'graph') {
      var lay = graphLayout(list, g.pairs, CAP);
      body = [h('p', { key: 'n', className: 'cc-br-note' }, 'Showing ' + lay.shown + ' of ' + lay.total + ' nodes' +
        (lay.shown < lay.total ? ' (the brightest). Search or pick a kind to see others.' : '.') + ' Click a dot to see its links.'),
      h(Graph, { key: 'g', layout: lay, selected: selected, onPick: pick })];
    } else {
      var page = list.slice(0, shown);
      body = [h(ui.List, { key: 'l', label: 'Knowledge nodes' }, page.map(function (n) {
        return h(ui.Row, { key: n.id, id: n.id, wrap: true, title: n.title, sub: n.path || null, selected: selected === n.id,
          meta: (KIND_ONE[n.kind] || n.kind) + ' · ' + linkWord((g.links[n.id] || []).length), onClick: function () { pick(n.id); } });
      })),
      page.length < list.length ? h('div', { key: 'm', className: 'cc-br-note' }, 'Showing ' + page.length + ' of ' + list.length + '. ',
        h(ui.Button, { size: 'sm', onClick: function () { shownSt[1](shown + PAGE); } }, 'Show more')) : null];
    }
    var node = selected ? g.nodes.filter(function (n) { return n.id === selected; })[0] : null;
    return h(ui.Page, { page: 'brain', header: header(meta, mid), banner: banner },
      h(ui.Section, { title: kind === 'all' ? 'Knowledge' : kindLabel(kind), section: 'brain', meta: list.length + ' of ' + g.nodes.length },
        tools, body),
      node ? h(NodeLinks, { node: node, links: g.links[node.id], onPick: pick, onClose: function () { selSt[1](null); } }) : null);
  }

  CC.BrainTab = BrainTab;
  CC.brainTabInternals = { CAP: CAP, PAGE: PAGE, EVERY: EVERY, KINDS: KINDS, normalize: normalize, filterNodes: filterNodes,
    kindOptions: kindOptions, graphLayout: graphLayout };
})(CC);
