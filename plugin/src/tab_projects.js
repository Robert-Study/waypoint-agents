// tab_projects.js - CC.ProjectsTab: every Waypoint project, grouped by family, with a version picker
// (newest active version first; archived versions behind a switch), progress and needs-you / hands-on
// markers per project. Choosing a project draws its task graph left to right in layers by dependency;
// choosing a task opens its panel. Read only: board_read {} for the list, board_read {project} for tasks.
(function (CC) {
  'use strict';
  var h = CC.h;

  var FINISHED = { done: 1, skipped: 1, carried: 1 };
  var STATUS_LABEL = { done: 'Done', running: 'Running', failed: 'Failed', error: 'Failed', needs_you: 'Needs you',
    pending: 'Waiting', ready: 'Ready', blocked: 'Blocked', skipped: 'Skipped', carried: 'Carried', submitted: 'Submitted' };
  var STATUS_VAR = { done: '--cc-done', running: '--cc-running', failed: '--cc-error', error: '--cc-error',
    needs_you: '--cc-accent', skipped: '--cc-neutral', carried: '--cc-neutral', submitted: '--cc-running' };
  var CW = 150, CH = 36, GAP_X = 32, GAP_Y = 10, PAD = 8;

  // ---- pure helpers (exported for tests)

  function statusLabel(s) { return STATUS_LABEL[s] || (s ? String(s).replace(/_/g, ' ') : 'Unknown'); }
  function statusFill(s) { return 'var(' + (STATUS_VAR[s] || '--cc-line-strong') + ')'; }
  function verLabel(p) { return p.version_range || p.version_label || (p.version != null ? 'v' + p.version : p.id); }

  // Families in board order; versions newest first. `current` is the newest active version, or the newest
  // archived one when `showArchived` is on and nothing in the family is active.
  function groupFamilies(projects, showArchived) {
    var groups = {}, order = [];
    (projects || []).forEach(function (p) {
      if (!p || !p.id) return;
      var fam = p.family || p.id;
      if (!groups[fam]) { groups[fam] = { id: fam, all: [] }; order.push(fam); }
      groups[fam].all.push(p);
    });
    var out = [];
    order.forEach(function (fam) {
      var g = groups[fam];
      g.all.sort(function (a, b) { return (Number(b.version) || 0) - (Number(a.version) || 0); });
      var active = g.all.filter(function (v) { return !v.archived; });
      var versions = showArchived ? g.all : active;
      if (!versions.length) return;
      out.push({ id: fam, versions: versions, active: active[0] || null, current: active[0] || versions[0] });
    });
    return out.filter(function (g) { return g.active; }).concat(out.filter(function (g) { return !g.active; }));
  }

  function progress(nodes) {
    var list = nodes || [];
    return { done: list.filter(function (n) { return FINISHED[n.status]; }).length, total: list.length };
  }

  // needs you: a quick approval. hands-on: real effort from a person.
  function nodeTag(n) {
    if (!n || FINISHED[n.status]) return null;
    var role = String(n.role || '').toLowerCase(), kind = String(n.kind || '').toLowerCase();
    if (role === 'human' || kind === 'hands_on') return 'hands';
    if (n.status === 'needs_you') return 'need';
    return null;
  }
  function countTags(nodes, todos) {
    var need = 0, hands = 0;
    (nodes || []).forEach(function (n) { var t = nodeTag(n); if (t === 'need') need++; else if (t === 'hands') hands++; });
    (todos || []).forEach(function (t) { if (t && t.category === 'hands_on') hands++; else need++; });
    return { need: need, hands: hands };
  }

  function edgesOf(nodes) {
    var ids = {};
    (nodes || []).forEach(function (n) { ids[n.id] = 1; });
    var edges = [];
    (nodes || []).forEach(function (n) {
      (n.deps || []).forEach(function (d) { d = typeof d === 'string' ? d : d && d.id; if (ids[d]) edges.push([d, n.id]); });
    });
    return edges;
  }

  // Layers left to right: each task sits one layer right of its deepest dependency (a cycle stops after n passes).
  function layoutLR(nodes, edges, ch, cw) {
    ch = ch || CH; cw = cw || CW;
    var layer = {}, rows = {}, pos = {}, w = 0, hgt = 0;
    (nodes || []).forEach(function (n) { layer[n.id] = 0; });
    for (var i = 0; i < (nodes || []).length; i++) {
      var moved = false;
      (edges || []).forEach(function (e) { if (layer[e[1]] <= layer[e[0]]) { layer[e[1]] = layer[e[0]] + 1; moved = true; } });
      if (!moved) break;
    }
    (nodes || []).forEach(function (n) {
      var r = layer[n.id]; rows[r] = (rows[r] || 0) + 1;
      pos[n.id] = { x: PAD + r * (cw + GAP_X), y: PAD + (rows[r] - 1) * (ch + GAP_Y) };
      w = Math.max(w, pos[n.id].x + cw + PAD); hgt = Math.max(hgt, pos[n.id].y + ch + PAD);
    });
    return { pos: pos, layer: layer, w: w, h: hgt };
  }

  function checkText(c) {
    if (c === null || c === undefined || c === '') return '';
    if (typeof c !== 'object') return String(c);
    var body = c.command || c.cmd || (c.paths && [].concat(c.paths).join(', ')) || c.text || c.pattern || c.prompt || '';
    return (c.type ? c.type + (body ? ': ' : '') : '') + body;
  }
  function claimText(c) {
    if (!c) return '';
    return (c.owner || 'someone') + (c.claimed_by && c.claimed_by !== c.owner ? ' (' + c.claimed_by + ')' : '') +
      (c.since ? ' since ' + String(c.since).replace('T', ' ').slice(0, 16) : '');
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // ---- styles (tokens only)

  var css = [
    '.cc-root .cc-pj-body{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-root .cc-pj-list{flex:none;width:320px;min-height:0;overflow:auto;border-right:1px solid var(--cc-line);padding:8px;}',
    '.cc-root .cc-pj-graphbox{padding:16px;}',
    '.cc-root .cc-pj-ver{width:auto;height:24px;padding:0 20px 0 6px;font-size:var(--cc-fs-meta,12px);}',
    '.cc-root .cc-pj-marks{display:inline-flex;gap:4px;align-items:center;}',
    '.cc-root .cc-pj-graph{display:block;max-width:100%;height:auto;}',
    '.cc-root .cc-pj-graph .cc-pj-card{fill:var(--cc-surface);stroke:var(--cc-line-strong);stroke-width:1;}',
    '.cc-root .cc-pj-graph g[data-node]{cursor:pointer;outline:none;}',
    '.cc-root .cc-pj-graph g[data-node]:hover .cc-pj-card,.cc-root .cc-pj-graph g[data-node]:focus .cc-pj-card{stroke:var(--cc-text-2);}',
    '.cc-root .cc-pj-graph g[aria-selected="true"] .cc-pj-card{stroke:var(--cc-accent);stroke-width:1.5;fill:var(--cc-selection);}',
    '.cc-root .cc-pj-graph .cc-pj-edge{fill:none;stroke:var(--cc-line-strong);stroke-width:1.2;}',
    '.cc-root .cc-pj-graph .cc-pj-arrow{fill:var(--cc-line-strong);}',
    '.cc-root .cc-pj-graph text{font-size:11px;fill:var(--cc-text);}',
    '.cc-root .cc-pj-graph text.cc-pj-sub{font-size:10px;fill:var(--cc-text-3);font-family:var(--cc-mono);}',
    '.cc-root .cc-pj-graph text.cc-pj-need{font-size:10px;fill:var(--cc-accent);font-weight:600;}',
    '.cc-root .cc-pj-graph text.cc-pj-hands{font-size:10px;fill:var(--cc-running);font-weight:600;}',
    '.cc-root .cc-pj-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:var(--cc-fs-meta,12px);color:var(--cc-text-3);}',
    '.cc-root .cc-pj-legend i{display:inline-block;width:8px;height:8px;margin-right:4px;border-radius:2px;vertical-align:0;}',
    '.cc-root .cc-pj-np{padding:12px 16px;}',
    '.cc-root .cc-pj-np-h{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;}',
    '.cc-root .cc-pj-np-t{flex:1 1 auto;min-width:0;font-weight:600;overflow-wrap:anywhere;}',
    '.cc-root .cc-pj-need{margin:0 0 6px;}',
    '.cc-root .cc-pj-need p{margin:2px 0;}'
  ].join('\n');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    var had = document.getElementById ? document.getElementById('cc-tab-projects') : null;
    if (had) { if (had.textContent !== css) had.textContent = css; return; }
    var el = document.createElement('style');
    el.id = 'cc-tab-projects';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ---- components

  function Marks(p) {
    var t = p.tags || { need: 0, hands: 0 };
    return h('span', { className: 'cc-pj-marks' },
      t.need ? CC.ui.Badge({ tone: 'action', title: 'Quick yes or no waiting', children: t.need + ' needs you' }) : null,
      t.hands ? CC.ui.Badge({ tone: 'run', title: 'Real effort from a person', children: t.hands + ' hands-on' }) : null);
  }

  // One family: the chosen version, its progress and markers. Reads that version's board slowly for the counts.
  function FamilyRow(p) {
    var g = p.family, cur = p.current;
    var b = CC.useWpc('board_read', { project: cur.id }, { every: 60000 });
    var nodes = (b.data && b.data.nodes) || null;
    var pr = nodes ? progress(nodes) : null;
    var tags = nodes ? countTags(nodes, b.data.todos) : null;
    var picker = g.versions.length > 1 ? h('select', {
      className: 'cc-in cc-pj-ver', value: cur.id, 'aria-label': 'Version of ' + (cur.title || cur.id), title: g.versions.length + ' versions',
      onChange: function (e) { p.onVersion(g.id, e && e.target ? e.target.value : cur.id); }
    }, g.versions.map(function (v) {
      return h('option', { key: v.id, value: v.id }, verLabel(v) + (v.archived ? ' (archived)' : ''));
    })) : null;
    return CC.ui.Row({
      key: g.id, id: cur.id, selected: p.selected, off: !!cur.archived, wrap: true,
      onClick: function () { p.onPick(cur.id); },
      title: cur.title || cur.id,
      sub: [pr ? pr.done + '/' + pr.total + ' done' : (b.error ? 'not read' : '…'),
        cur.archived ? ' · archived' : '', g.versions.length === 1 && cur.version_range ? ' · ' + cur.version_range : ''].join(''),
      meta: tags ? h(Marks, { tags: tags }) : null,
      trail: picker
    });
  }

  function Graph(p) {
    var nodes = p.nodes, edges = edgesOf(nodes), L = layoutLR(nodes, edges, CH, CW);
    var chars = Math.floor((CW - 16) / 6);
    var parts = [h('defs', { key: 'defs' }, h('marker', { id: 'cc-pj-ah', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto' },
      h('path', { className: 'cc-pj-arrow', d: 'M0 0L8 4L0 8z' })))];
    edges.forEach(function (e) {
      var a = L.pos[e[0]], c = L.pos[e[1]];
      var sx = a.x + CW, sy = a.y + CH / 2, tx = c.x, ty = c.y + CH / 2, mx = (sx + tx) / 2;
      parts.push(h('path', { key: e[0] + '>' + e[1], className: 'cc-pj-edge', markerEnd: 'url(#cc-pj-ah)',
        d: 'M' + sx + ' ' + sy + 'C' + mx + ' ' + sy + ' ' + mx + ' ' + ty + ' ' + tx + ' ' + ty }));
    });
    nodes.forEach(function (n) {
      var q = L.pos[n.id], tag = nodeTag(n), tagText = tag === 'need' ? 'needs you' : tag === 'hands' ? 'hands-on' : '';
      var pick = function () { p.onPick(n.id); };
      parts.push(h('g', {
        key: n.id, 'data-node': n.id, role: 'button', tabIndex: 0, 'aria-selected': p.selected === n.id ? 'true' : 'false',
        'aria-label': (n.title || n.id) + ', ' + statusLabel(n.status) + (tagText ? ', ' + tagText : ''),
        onClick: pick, onKeyDown: function (e) { if (e && (e.key === 'Enter' || e.key === ' ')) { if (e.preventDefault) e.preventDefault(); pick(); } }
      },
        h('title', null, (n.title || n.id) + ' | ' + n.id + ' | ' + statusLabel(n.status)),
        h('rect', { className: 'cc-pj-card', x: q.x, y: q.y, width: CW, height: CH, rx: 3 }),
        h('rect', { x: q.x, y: q.y, width: 4, height: CH, fill: statusFill(n.status) }),
        h('text', { x: q.x + 10, y: q.y + 15 }, clip(n.title || n.id, chars)),
        h('text', { className: 'cc-pj-sub', x: q.x + 10, y: q.y + 29 }, clip(n.id, tagText ? chars - tagText.length - 2 : chars)),
        tagText ? h('text', { className: 'cc-pj-' + tag, x: q.x + CW - 6, y: q.y + 29, textAnchor: 'end' }, tagText) : null));
    });
    return h('svg', { className: 'cc-pj-graph', viewBox: '0 0 ' + Math.ceil(L.w) + ' ' + Math.ceil(L.h),
      width: Math.ceil(L.w), height: Math.ceil(L.h), role: 'group', 'aria-label': 'Task graph' }, parts);
  }

  function Legend() {
    var item = function (k, label, style) { return h('span', { key: k }, h('i', { style: style }), label); };
    return h('div', { className: 'cc-pj-legend' },
      item('d', 'Done', { background: 'var(--cc-done)' }), item('r', 'Running', { background: 'var(--cc-running)' }),
      item('f', 'Failed', { background: 'var(--cc-error)' }), item('n', 'Needs you', { background: 'var(--cc-accent)' }),
      item('w', 'Waiting', { background: 'var(--cc-line-strong)' }));
  }

  function NodePanel(p) {
    var n = p.node || {};
    var dash = '–';
    var deps = (n.deps || []).map(function (d) { return typeof d === 'string' ? d : d && d.id; }).filter(Boolean);
    var needs = n.needs || [];
    var kv = function (k, v) { return [h('dt', { key: k + 't' }, k), h('dd', { key: k + 'd' }, v || dash)]; };
    var needsBody = needs.length ? needs.map(function (q) {
      return h('div', { key: q.id, className: 'cc-pj-need' }, h('p', null, q.problem || 'No question text.'),
        q.resolution ? h('p', null, 'Proposed: ' + q.resolution) : null);
    }) : (n.status === 'needs_you' ? 'Waiting for an answer. No question was written.' : '');
    var tag = nodeTag(n);
    return h('div', { className: 'cc-pj-np', 'data-cc-node': n.id || undefined },
      h('div', { className: 'cc-pj-np-h' },
        h('div', { className: 'cc-pj-np-t' }, n.title || n.id || 'Task'),
        tag ? h(Marks, { tags: { need: tag === 'need' ? 1 : 0, hands: tag === 'hands' ? 1 : 0 } }) : null,
        p.onClose ? CC.ui.Button({ kind: 'quiet', size: 'sm', icon: CC.ui.ICONS.close, title: 'Close', onClick: p.onClose }) : null),
      h('dl', { className: 'cc-kv' },
        kv('Task', n.id), kv('Status', statusLabel(n.status)), kv('Goal', n.goal), kv('Check', checkText(n.check)),
        kv('Depends on', deps.join(', ')), kv('Evidence', typeof n.evidence === 'object' && n.evidence ? JSON.stringify(n.evidence) : n.evidence),
        kv('Claim', claimText(n.claim)), kv('Needs you', needsBody)));
  }

  function ProjectsTab(p) {
    p = p || {};
    ensureCss();
    var React = CC.React;
    var arch = React.useState(false), showArchived = arch[0], setArchived = arch[1];
    var pk = React.useState({}), picked = pk[0], setPicked = pk[1];
    var sp = React.useState(p.initialProject || null), chosen = sp[0], setChosen = sp[1];
    var sn = React.useState(p.initialNode || null), node = sn[0], setNode = sn[1];

    var list = CC.useWpc('board_read', {});
    var projects = (list.data && list.data.projects) || [];
    var fams = groupFamilies(projects, showArchived).map(function (g) {
      var want = picked[g.id] || (chosen && g.versions.some(function (v) { return v.id === chosen; }) ? chosen : null);
      var cur = g.versions.filter(function (v) { return v.id === want; })[0] || g.current;
      return { family: g, current: cur };
    });
    var visible = {};
    fams.forEach(function (f) { f.family.versions.forEach(function (v) { visible[v.id] = 1; }); });
    var selected = chosen && visible[chosen] ? chosen : (fams[0] ? fams[0].current.id : null);
    var board = CC.useWpc(selected ? 'board_read' : null, selected ? { project: selected } : {});

    var activeN = fams.filter(function (f) { return f.family.active; }).length;
    var header = CC.ui.PageHeader({ title: 'Projects', pageId: p.pageId,
      meta: list.data ? activeN + ' active · ' + projects.length + ' versions' : null,
      actions: h('label', { className: 'cc-pj-marks', title: 'Show archived versions' },
        CC.ui.Toggle({ checked: showArchived, label: 'Show archived', onChange: setArchived }), 'Show archived') });

    function page(body, banner) {
      return CC.ui.Page({ page: 'projects', header: header, banner: banner || null, raw: true, children: body });
    }
    if (!list.data) {
      if (list.error) return page(h('div', { className: 'cc-pb' }, CC.WpcProblem({ error: list.error })));
      return page(h('div', { className: 'cc-pb' }, CC.ui.Empty({ title: 'Loading projects…' })));
    }
    var banner = list.error ? CC.ui.Banner({ tone: 'error', children: 'Showing the last answer. ' + (list.error.message || 'Waypoint could not answer.'),
      action: CC.ui.Button({ size: 'sm', onClick: list.reload, children: 'Try again' }) }) : null;
    if (!fams.length) {
      var anyArchived = projects.length > 0;
      return page(h('div', { className: 'cc-pb' }, CC.ui.Empty({
        title: anyArchived ? 'No active projects' : 'No projects yet',
        body: anyArchived ? 'Every version is archived. Turn on Show archived to see them.' : 'Plan a project in Waypoint and it shows here.'
      })), banner);
    }

    var onPick = function (id) { setChosen(id); setNode(null); };
    var onVersion = function (fam, id) {
      var next = Object.assign({}, picked); next[fam] = id; setPicked(next); onPick(id);
    };
    var listEl = h('nav', { className: 'cc-pj-list', 'aria-label': 'Projects' },
      CC.ui.List({ label: 'Project families', children: fams.map(function (f) {
        return h(FamilyRow, { key: f.family.id, family: f.family, current: f.current, selected: f.current.id === selected,
          onPick: onPick, onVersion: onVersion });
      }) }));

    var proj = projects.filter(function (x) { return x.id === selected; })[0] || {};
    var nodes = (board.data && board.data.nodes) || [];
    var graphBody;
    if (!board.data) {
      graphBody = board.error ? CC.WpcProblem({ error: board.error }) : CC.ui.Empty({ title: 'Loading tasks…' });
    } else if (!nodes.length) {
      graphBody = CC.ui.Empty({ title: 'No tasks in this version yet.', body: 'Add tasks in Waypoint and the graph shows here.' });
    } else {
      graphBody = [
        board.error ? CC.ui.Banner({ key: 'bn', tone: 'error', children: 'Tasks may be out of date. ' + (board.error.message || '') }) : null,
        board.data.cycle ? CC.ui.Banner({ key: 'cy', tone: 'error', children: 'The tasks have a dependency loop: ' + board.data.cycle }) : null,
        h(Graph, { key: 'g', nodes: nodes, selected: node, onPick: setNode }),
        h(Legend, { key: 'l' })
      ];
    }
    var pr = progress(nodes);
    var main = h('div', { className: 'cc-split-main' }, h('div', { className: 'cc-pj-graphbox' },
      CC.ui.Section({ title: (proj.title || selected) + (proj.version != null ? ' · ' + verLabel(proj) : ''),
        meta: board.data ? pr.done + '/' + pr.total + ' done' : null, section: 'graph', children: graphBody })));
    var nodeObj = node ? nodes.filter(function (n) { return n.id === node; })[0] : null;
    var side = nodeObj ? h('aside', { className: 'cc-split-side', 'aria-label': 'Task details' },
      h(NodePanel, { node: nodeObj, onClose: function () { setNode(null); } })) : null;

    return page(h('div', { className: 'cc-pj-body' }, listEl, h('div', { className: 'cc-split' }, main, side)), banner);
  }

  CC.ProjectsTab = ProjectsTab;
  CC.projectsTabInternals = {
    groupFamilies: groupFamilies, progress: progress, nodeTag: nodeTag, countTags: countTags, edgesOf: edgesOf,
    layoutLR: layoutLR, checkText: checkText, claimText: claimText, statusLabel: statusLabel, verLabel: verLabel,
    NodePanel: NodePanel, Graph: Graph, FamilyRow: FamilyRow, css: css
  };
})(CC);
