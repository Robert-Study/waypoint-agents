// page_brain.js [brain-learn, C7] - Brain page (cc-brain): a read-only index of your preferences,
// notes, skills, instructions and a shallow folder tree, from GET /api/brain.
// Header: title, counts and index time, a Map / List / Overlaps switch, one compact search field and a
// More menu (rebuild the index, check overlaps again). Under it, one quiet line of kind chips with counts.
//   Map: the constellation (StarView), labelled by cluster; a click opens the note in the side panel.
//   List: a dense table (kind, title, cluster, source), sortable by column; arrows move, Home/End jump,
//     Enter opens; ArrowDown in the search field enters the table, Escape clears the search.
//   Overlaps: duplicate material from GET /api/brain/overlaps (read-only; you decide what to cut), most
//     cuttable first; a finding opens in the side panel and "Show on map" highlights its notes.
// The side panel (360 px) shows provenance, path, tags and connected notes; "Copy path" copies the path.
(function (CC) {
  'use strict';

  const KINDS = [
    { id: 'preference', label: 'Preferences' },
    { id: 'brain', label: 'Notes' },
    { id: 'skill', label: 'Skills' },
    { id: 'instruction', label: 'Instructions' },
    { id: 'folder', label: 'Folders' }
  ];
  const KIND_ONE = { preference: 'Preference', brain: 'Note', skill: 'Skill', instruction: 'Instruction', folder: 'Folder' };
  const DEFAULT_KINDS = { preference: true, brain: true, skill: true, instruction: true, folder: false };
  // The Map keeps the id 'star' so saved camera keys still apply.
  const VIEWS = [{ id: 'star', label: 'Map' }, { id: 'list', label: 'List' }, { id: 'overlaps', label: 'Overlaps' }];
  const OVERLAP_TYPE = { near_duplicate: 'Near-duplicate notes', passage: 'Repeated passage', superseded: 'Superseded' };
  const OVERLAP_SHORT = { near_duplicate: 'Near-duplicate', passage: 'Repeated passage', superseded: 'Superseded' };
  const DEFAULT_COLLAPSED = { 'k:folder': true };
  const PROVENANCE = {
    explicit_user_statement: { label: 'Your own words', rank: 0 },
    user_reported_calibration: { label: 'Your calibration', rank: 1 },
    vetted_source: { label: 'Vetted source', rank: 2 },
    agent_synthesis: { label: 'Agent summary', rank: 3 },
    inherited_registry: { label: 'Imported', rank: 4 }
  };
  const LINK_WORD = { link: 'links to', related: 'related', supersedes: 'supersedes', contains: 'contains', cites: 'cites' };
  const SORTS = [
    { id: 'kind', label: 'Kind' }, { id: 'title', label: 'Title' },
    { id: 'cluster', label: 'Cluster' }, { id: 'source', label: 'Source' }
  ];

  // Brain page styles; Learn adds its own. Colours and radii come only from tokens.js variables.
  const STYLE = [
    // kind chips: one quiet line under the header
    '.cc-brain .cc-br-chips{flex:none;display:flex;align-items:center;gap:4px;min-height:36px;padding:0 16px;border-bottom:1px solid var(--cc-line);overflow-x:auto;}',
    '.cc-root .cc-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border:1px solid transparent;border-radius:var(--cc-r-control);' +
      'background:transparent;color:var(--cc-text-3);font:inherit;font-size:12px;font-weight:500;white-space:nowrap;cursor:pointer;}',
    '.cc-root .cc-chip:hover{color:var(--cc-text);background:var(--cc-wash);}',
    '.cc-root .cc-chip[aria-pressed="true"]{color:var(--cc-text);border-color:var(--cc-line-strong);background:var(--cc-surface);}',
    '.cc-root .cc-chip-n{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    // search field (240 px) and its result popover on the Map
    '.cc-root .cc-br-search{position:relative;width:240px;flex:none;}',
    '.cc-root .cc-br-search .cc-in{height:28px;}',
    '@media (max-width:1180px){.cc-root .cc-br-search{width:160px;}}',
    '.cc-root .cc-br-results{position:absolute;right:0;top:32px;width:320px;max-height:320px;overflow:auto;z-index:5;padding:4px;' +
      'background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);}',
    '.cc-root .cc-br-results .cc-r{border-bottom:0;}',
    // one quiet status line (loading, error, empty)
    '.cc-root .cc-br-line{display:flex;align-items:center;gap:12px;padding:12px 16px;font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-br-line.cc-bad{color:var(--cc-error);}',
    // canvas and split
    '.cc-brain .cc-br-canvas{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-canvas);}',
    '.cc-brain .cc-br-canvas > .cc-graph{flex:1 1 auto;}',
    '.cc-brain .cc-t-label{font-weight:400;}',
    '.cc-brain .cc-split-main{position:relative;}',
    '.cc-root .cc-toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:7;background:var(--cc-surface);border:1px solid var(--cc-line-strong);' +
      'border-radius:var(--cc-r-panel);padding:6px 12px;font-size:12px;white-space:nowrap;}',
    // dense table (List and Overlaps)
    '.cc-root .cc-tb{container-type:inline-size;min-height:100%;}',
    '.cc-root .cc-tb-h,.cc-root .cc-tb-r{display:grid;align-items:center;column-gap:16px;padding:0 16px;}',
    '.cc-brain .cc-tb-notes .cc-tb-h,.cc-brain .cc-tb-notes .cc-tb-r{grid-template-columns:96px minmax(0,2fr) minmax(0,1fr) 128px;}',
    '.cc-brain .cc-tb-ov .cc-tb-h,.cc-brain .cc-tb-ov .cc-tb-r{grid-template-columns:128px minmax(0,2fr) minmax(0,1fr) 88px;}',
    '.cc-root .cc-tb-h{position:sticky;top:0;z-index:1;height:32px;background:var(--cc-bg);border-bottom:1px solid var(--cc-line);font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-tb-sort{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;justify-self:start;}',
    '.cc-root .cc-tb-sort:hover{color:var(--cc-text);}',
    '.cc-root .cc-tb-sort[aria-sort="ascending"],.cc-root .cc-tb-sort[aria-sort="descending"]{color:var(--cc-text);}',
    '.cc-root .cc-tb-ls{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-tb-r{width:100%;height:32px;border:0;border-bottom:1px solid var(--cc-line);background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;text-align:left;cursor:pointer;}',
    '.cc-root .cc-tb-r:hover{background:var(--cc-wash);}',
    '.cc-root .cc-tb-r[aria-current="true"]{background:var(--cc-selection);}',
    '.cc-root .cc-tb-r:focus-visible{outline:2px solid var(--cc-focus,var(--cc-accent));outline-offset:-2px;}',
    '.cc-root .cc-tb-c{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-tb-t{color:var(--cc-text);}',
    '.cc-root .cc-tb-num{text-align:right;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-tb-h .cc-tb-num{justify-self:end;}',
    '@container (max-width:560px){.cc-brain .cc-tb-notes .cc-tb-h,.cc-brain .cc-tb-notes .cc-tb-r{grid-template-columns:80px minmax(0,1fr) minmax(0,40%);}' +
      '.cc-brain .cc-tb-notes .cc-tb-src{display:none;}' +
      '.cc-brain .cc-tb-ov .cc-tb-h,.cc-brain .cc-tb-ov .cc-tb-r{grid-template-columns:minmax(0,1fr) 72px;}.cc-brain .cc-tb-ov .cc-tb-ty,.cc-brain .cc-tb-ov .cc-tb-nt{display:none;}}',
    // side panel (360 px, kit .cc-split-side)
    '.cc-root .cc-sp{display:flex;flex-direction:column;gap:12px;padding:12px 16px 24px;}',
    '.cc-root .cc-sp-h{display:flex;align-items:flex-start;gap:8px;}',
    '.cc-root .cc-sp-t{flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
    '.cc-root .cc-sp-m{margin-top:2px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-sp-p{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);overflow-wrap:anywhere;}',
    '.cc-root .cc-sp-path{font-family:var(--cc-mono);font-size:11px;color:var(--cc-text-2);overflow-wrap:anywhere;}',
    '.cc-root .cc-sp-a{display:flex;gap:8px;flex-wrap:wrap;}',
    '.cc-root .cc-sp .cc-sec{padding:8px 0 0;}',
    '.cc-root .cc-sp .cc-r{padding:4px 0;}',
    '.cc-root .cc-sp-q{margin:0;padding:0 0 0 10px;border-left:2px solid var(--cc-line-strong);font-size:12px;line-height:1.5;color:var(--cc-text-2);overflow-wrap:anywhere;}',
    '.cc-root .cc-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border:1px solid var(--cc-line-strong);border-radius:999px;font-size:11px;color:var(--cc-text-3);flex:none;}',
    '.cc-root .cc-tag-keep{border-color:var(--cc-done);color:var(--cc-text);}'
  ].join('\n');

  function ensureStyle() {
    if (CC.ensureStyles) CC.ensureStyles();
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-brain-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-brain-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function copy(text) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }

  function useToast() {
    const React = CC.React;
    const st = React.useState(null);
    const timer = React.useRef(null);
    function show(msg) {
      st[1](msg);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => st[1](null), 1800);
    }
    return { msg: st[0], show: show };
  }

  function errorText(err, what) {
    if (!err) return '';
    if (err.status === 503) return what + ' is not available in Waypoint Core yet.';
    if (err.status) return what + ' failed (' + (err.message || 'HTTP ' + err.status) + ').';
    return 'Waypoint Core is not running.';
  }

  // The "More" menu for rare actions is the kit's (CC.ui.Menu: icon trigger, popover, Escape closes).
  // Without that kit piece the actions stay reachable as plain quiet buttons.
  function Menu(props) {
    const h = CC.h;
    const ui = CC.ui;
    if (ui && typeof ui.Menu === 'function') return ui.Menu(props);
    const items = (props.items || []).filter(Boolean);
    return h('span', { className: 'cc-mn', role: 'group', 'aria-label': props.label || 'More' }, items.map((it, i) => h('button', {
      key: i, type: 'button', className: 'cc-b cc-b-quiet', disabled: !!it.disabled, onClick: it.onClick
    }, it.label)));
  }

  CC.brainLearn = { ensureStyle: ensureStyle, copy: copy, useToast: useToast, errorText: errorText, Menu: Menu };

  // ---- pure helpers (exported for tests) ------------------------------------
  function provRank(p) { return PROVENANCE[p] ? PROVENANCE[p].rank : 9; }

  function matches(n, q) {
    if (!q) return true;
    const hay = [n.label, n.id, n.cluster, n.path, (n.tags || []).join(' ')].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.indexOf(w) >= 0);
  }

  // Build the board handed to StarView. Kind chips choose which nodes exist; every link kind
  // between visible nodes is drawn.
  function toBoard(graph, kinds) {
    const all = (graph && graph.nodes) || [];
    const links = (graph && graph.links) || [];
    const keep = {};
    all.forEach((n) => { if (kinds[n.kind]) keep[n.id] = true; });
    const nodes = all.filter((n) => keep[n.id]).map((n) => ({
      id: n.id, title: n.label, label: n.label, kind: n.kind, cluster: n.cluster, lane: n.kind,
      provenance: n.provenance, weight: n.weight, brightness: n.brightness, path: n.path, tags: n.tags
    }));
    const edges = links.filter((l) => keep[l.source] && keep[l.target])
      .map((l) => ({ source: l.source, target: l.target, kind: l.kind }));
    return { nodes: nodes, edges: edges, links: edges };
  }

  function provLabel(p) { return PROVENANCE[p] ? PROVENANCE[p].label : null; }

  function labelForKind(kind) {
    const k = KINDS.filter((x) => x.id === kind)[0];
    return k ? k.label : kind;
  }

  // Grouped outline: kind (fixed order) -> cluster (A-Z) -> rows (A-Z; folders by path). ``collapsed``
  // maps 'k:<kind>' / 'c:<kind>/<cluster>' to true/false; Folders and every cluster of a
  // multi-cluster kind start folded. A filter keeps only matching rows and opens every group with one.
  function groupNotes(nodes, opts) {
    const o = opts || {};
    const q = (o.q || '').trim();
    const folded = o.collapsed || {};
    const isFolded = (key, dflt) => (q ? false : (Object.prototype.hasOwnProperty.call(folded, key) ? !!folded[key]
      : (DEFAULT_COLLAPSED[key] !== undefined ? DEFAULT_COLLAPSED[key] : !!dflt)));
    const order = KINDS.map((k) => k.id);
    const byKind = {};
    (nodes || []).forEach((n) => {
      const k = n.kind || 'other';
      if (order.indexOf(k) < 0) order.push(k);
      (byKind[k] = byKind[k] || []).push(n);
    });
    const name = (a, b) => String(a.label).localeCompare(String(b.label));
    const hit = (n) => matches(Object.assign({}, n, { tags: (n.tags || []).concat([provLabel(n.provenance) || '']) }), q);
    const out = [];
    order.forEach((kind) => {
      const all = byKind[kind] || [];
      const rows = q ? all.filter(hit) : all;
      if (!rows.length) return;
      const byCluster = {};
      rows.forEach((n) => { const c = n.cluster || 'Other'; (byCluster[c] = byCluster[c] || []).push(n); });
      const totals = {};
      all.forEach((n) => { const c = n.cluster || 'Other'; totals[c] = (totals[c] || 0) + 1; });
      const names = Object.keys(byCluster).sort((a, b) => a.localeCompare(b));
      const multi = Object.keys(totals).length > 1;
      const clusters = names.map((c) => {
        const list = byCluster[c].slice().sort(kind === 'folder'
          ? (a, b) => String(a.path).localeCompare(String(b.path)) : name);
        const key = 'c:' + kind + '/' + c;
        return { key: key, cluster: c, count: list.length, total: totals[c], collapsed: isFolded(key, multi), rows: list };
      });
      const key = 'k:' + kind;
      out.push({ key: key, kind: kind, label: labelForKind(kind), count: rows.length, total: all.length,
        collapsed: isFolded(key), clusters: clusters, clusterCount: Object.keys(totals).length });
    });
    return out;
  }

  // Table rows for the List: the chosen kinds, narrowed by the search (title, cluster, path, tags,
  // source), sorted by a column. Default order is kind (fixed order), then cluster, then title;
  // folders keep their path order so they read as a tree.
  function tableRows(nodes, opts) {
    const o = opts || {};
    const kinds = o.kinds || null;
    const q = (o.q || '').trim();
    const sort = o.sort || { key: 'kind', dir: 1 };
    const order = KINDS.map((k) => k.id);
    const kindIx = (k) => { const i = order.indexOf(k); return i < 0 ? order.length : i; };
    const rows = (nodes || []).filter((n) => (!kinds || kinds[n.kind]) &&
      matches(Object.assign({}, n, { tags: (n.tags || []).concat([provLabel(n.provenance) || '']) }), q));
    const s = (v) => String(v == null ? '' : v);
    const byTitle = (a, b) => (a.kind === 'folder' && b.kind === 'folder' ? s(a.path).localeCompare(s(b.path)) : s(a.label).localeCompare(s(b.label)));
    const cmp = {
      kind: (a, b) => kindIx(a.kind) - kindIx(b.kind) || s(a.cluster).localeCompare(s(b.cluster)) || byTitle(a, b),
      title: (a, b) => s(a.label).localeCompare(s(b.label)) || kindIx(a.kind) - kindIx(b.kind),
      cluster: (a, b) => s(a.cluster).localeCompare(s(b.cluster)) || byTitle(a, b),
      source: (a, b) => provRank(a.provenance) - provRank(b.provenance) || byTitle(a, b)
    }[sort.key] || ((a, b) => 0);
    const dir = sort.dir < 0 ? -1 : 1;
    return rows.slice().sort((a, b) => dir * cmp(a, b));
  }

  // Shorten a path against the index roots (Drive / Disk); the full path stays in the tooltip.
  function shortPath(p, roots) {
    const s = String(p || '');
    const r = roots || {};
    const pairs = [['Drive', r.drive], ['Disk', r.disk]];
    for (let i = 0; i < pairs.length; i++) {
      const root = pairs[i][1];
      if (root && s.toLowerCase().indexOf(String(root).toLowerCase()) === 0) return pairs[i][0] + s.slice(String(root).length);
    }
    return s;
  }

  // The parent folder name (skills are named by their folder already, so they show none).
  function parentFolder(n) {
    if (n.kind === 'skill') return '';
    const parts = String(n.path || '').split(/[\\/]+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 2] : '';
  }

  // Keyboard model for the table: returns {index, fold?} or null for keys it does not handle.
  function listKey(key, index, count) {
    const last = Math.max(0, count - 1);
    if (key === 'ArrowDown') return { index: Math.min(last, index + 1) };
    if (key === 'ArrowUp') return { index: Math.max(0, index - 1) };
    if (key === 'Home') return { index: 0 };
    if (key === 'End') return { index: last };
    if (key === 'ArrowLeft') return { index: index, fold: true };
    if (key === 'ArrowRight') return { index: index, fold: false };
    return null;
  }

  function neighbours(graph, id) {
    const out = [];
    ((graph && graph.links) || []).forEach((l) => {
      if (l.source === id) out.push({ id: l.target, kind: l.kind, dir: 'out' });
      else if (l.target === id) out.push({ id: l.source, kind: l.kind, dir: 'in' });
    });
    return out;
  }

  // Overlap findings, most cuttable first, narrowed by the search box (names, paths, excerpt).
  function overlapRows(data, q) {
    const rows = ((data && data.findings) || []).slice();
    rows.sort((a, b) => (b.cut_words || 0) - (a.cut_words || 0) || String(a.id).localeCompare(String(b.id)));
    if (!q) return rows;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((f) => {
      const hay = [f.suggestion, f.excerpt, OVERLAP_TYPE[f.type]].concat((f.notes || []).map((n) =>
        [n.name, n.title, n.path, n.id].join(' '))).join(' ').toLowerCase();
      return words.every((w) => hay.indexOf(w) >= 0);
    });
  }

  // Highlight a finding's notes on the map without touching its layout: involved nodes pass the
  // 'completed' filter and everything else fades (layout keys ignore status).
  function highlightBoard(board, ids) {
    if (!ids || !ids.length) return { board: board, filter: 'all' };
    const on = {};
    ids.forEach((id) => { on[id] = true; });
    const nodes = board.nodes.map((n) => (on[n.id] ? Object.assign({}, n, { display_status: 'done' }) : n));
    return { board: { nodes: nodes, edges: board.edges, links: board.links }, filter: 'completed' };
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function ovSummary(rows, scanned) {
    if (!rows.length) return 'No overlaps in ' + scanned + ' notes';
    return plural(rows.length, 'finding') + ' · about ' + wordsLabel(rows.reduce((s, f) => s + (f.cut_words || 0), 0)) + ' could go';
  }

  // "23:25" for today, "3 Nov 09:05" otherwise; the full time stays in the tooltip.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fullStamp(iso) { return String(iso).replace('T', ' ').slice(0, 16); }
  function stamp(iso, now) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/.exec(String(iso));
    if (!m) return fullStamp(iso);
    const t = now || new Date();
    const same = +m[1] === t.getFullYear() && +m[2] === t.getMonth() + 1 && +m[3] === t.getDate();
    return same ? m[4] : (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[4];
  }

  // Skills are folder ids ("bounded-task-packets"); read them as "Bounded task packets". The id
  // stays in the tooltip.
  function noteName(n) {
    const l = String((n && n.label) || '');
    if (!n || n.kind !== 'skill') return l;
    const t = l.replace(/[-_]+/g, ' ').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : l;
  }
  function withNames(graph) {
    if (!graph || !graph.nodes) return graph;
    return Object.assign({}, graph, { nodes: graph.nodes.map((n) => (n.kind === 'skill'
      ? Object.assign({}, n, { label: noteName(n), rawLabel: n.label }) : n)) });
  }
  function noteTip(n) { return n.rawLabel && n.rawLabel !== n.label ? n.rawLabel + (n.path ? '\n' + n.path : '') : n.path; }

  function wordsLabel(n) {
    const v = Math.max(0, Math.round(+n || 0));
    return v.toLocaleString('en-GB') + (v === 1 ? ' word' : ' words');
  }

  CC.brainBoard = toBoard;
  CC.brainNoteName = noteName;
  CC.brainStamp = stamp;
  CC.brainMatches = matches;
  CC.brainGroups = groupNotes;
  CC.brainRows = tableRows;
  CC.brainProvLabel = provLabel;
  CC.brainShortPath = shortPath;
  CC.brainParentFolder = parentFolder;
  CC.brainListKey = listKey;
  CC.brainViews = VIEWS;
  CC.brainKinds = KINDS;
  CC.brainOverlapRows = overlapRows;
  CC.brainHighlight = highlightBoard;

  // ---- components ------------------------------------------------------------
  function navItems(root) {
    return root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('[data-nav]')) : [];
  }
  function onTableKey(e) {
    const items = navItems(e.currentTarget);
    const i = items.indexOf(e.target);
    if (i < 0) return;
    const r = listKey(e.key, i, items.length);
    if (!r || r.fold !== undefined) return;
    e.preventDefault();
    if (items[r.index]) items[r.index].focus();
  }

  function KindChips(props) {
    const h = CC.h;
    const counts = props.counts || {};
    return h('div', { className: 'cc-br-chips', role: 'group', 'aria-label': 'Kinds' },
      KINDS.map((k) => h('button', {
        key: k.id, type: 'button', className: 'cc-chip', 'aria-pressed': props.kinds[k.id] ? 'true' : 'false',
        'data-kind': k.id, title: (props.kinds[k.id] ? 'Hide ' : 'Show ') + k.label.toLowerCase(),
        onClick: () => props.onToggle(k.id)
      }, k.label, h('span', { className: 'cc-chip-n' }, String(counts[k.id] || 0)))));
  }

  function SortHead(props) {
    const h = CC.h;
    const on = props.sort.key === props.id;
    return h('button', {
      type: 'button', className: 'cc-tb-sort' + (props.className ? ' ' + props.className : ''),
      'aria-sort': on ? (props.sort.dir < 0 ? 'descending' : 'ascending') : 'none',
      onClick: () => props.onSort({ key: props.id, dir: on ? -props.sort.dir : 1 })
    }, props.label, on ? h('span', { 'aria-hidden': 'true' }, props.sort.dir < 0 ? '↓' : '↑') : null);
  }

  // List: one dense table of the chosen kinds (kind, title, cluster, source).
  function ListView(props) {
    const h = CC.h;
    const sort = props.sort || { key: 'kind', dir: 1 };
    const rows = tableRows(props.nodes, { kinds: props.kinds, q: props.q, sort: sort });
    const head = h('div', { className: 'cc-tb-h', role: 'row' },
      SORTS.map((c) => h(SortHead, { key: c.id, id: c.id, label: c.label, sort: sort, onSort: props.onSort,
        className: c.id === 'source' ? 'cc-tb-src' : null })));
    if (!rows.length) {
      return h('div', { className: 'cc-tb cc-tb-notes' }, head,
        h('div', { className: 'cc-br-line', role: 'status' }, props.q ? 'No notes match.' : 'No notes of the chosen kinds.'));
    }
    return h('div', { className: 'cc-tb cc-tb-notes cc-bl-list', onKeyDown: onTableKey },
      head,
      h('ul', { className: 'cc-tb-ls', 'aria-label': 'Notes' }, rows.map((n) => {
        const prov = provLabel(n.provenance);
        return h('li', { key: n.id }, h('button', {
          type: 'button', className: 'cc-tb-r cc-bl-li', 'data-nav': '1', 'data-id': n.id,
          'aria-current': n.id === props.selected ? 'true' : undefined, title: noteTip(n),
          onClick: () => props.onSelect(n.id)
        },
        h('span', { className: 'cc-tb-c' }, KIND_ONE[n.kind] || n.kind),
        h('span', { className: 'cc-tb-c cc-tb-t' }, n.label),
        h('span', { className: 'cc-tb-c' }, n.cluster || ''),
        h('span', { className: 'cc-tb-c cc-tb-src cc-bl-prov' }, prov || '')));
      })));
  }

  // Side panel for one note.
  function DetailPanel(props) {
    const h = CC.h;
    const ui = CC.ui;
    const n = props.node;
    const prov = PROVENANCE[n.provenance];
    const nb = neighbours(props.graph, n.id).filter((x) => props.byId[x.id]).slice(0, 12);
    const kv = [];
    const add = (k, v, tip) => { if (v !== null && v !== undefined && v !== '') kv.push(h('dt', { key: k + 't' }, k), h('dd', { key: k + 'd', title: tip }, v)); };
    add('Source', prov ? prov.label : (n.provenance || 'Not recorded'));
    if (n.weight > 1) add('Sources', String(n.weight));
    add('Updated', n.updated_at || n.captured_at || null);
    add('Scope', n.scope || null);
    add('Tags', n.tags && n.tags.length ? n.tags.map((t) => '#' + t).join(' ') : null);
    add('Folder', parentFolder(n) || null);
    return h('aside', { className: 'cc-split-side', 'aria-label': 'Note details' }, h('div', { className: 'cc-sp' },
      h('div', { className: 'cc-sp-h' },
        h('div', { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', { className: 'cc-sp-t' }, n.label),
          h('div', { className: 'cc-sp-m' }, labelForKind(n.kind) + (n.cluster ? ' · ' + n.cluster : ''))),
        ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close', onClick: props.onClose })),
      n.summary ? h('p', { className: 'cc-sp-p' }, n.summary) : null,
      h('dl', { className: 'cc-kv' }, kv),
      n.path ? h('div', { className: 'cc-sp-path', title: n.path }, shortPath(n.path, props.roots)) : null,
      n.path ? h('div', { className: 'cc-sp-a' }, ui.Button({ onClick: () => props.onCopy(n.path), children: 'Copy path' })) : null,
      nb.length ? h(ui.Section, { title: 'Connected', meta: String(nb.length) },
        h(ui.List, { label: 'Connected notes' }, nb.map((x, i) => h(ui.Row, {
          key: x.id + i, id: x.id, title: props.byId[x.id].label,
          meta: (x.dir === 'in' ? '← ' : '→ ') + (LINK_WORD[x.kind] || x.kind), onClick: () => props.onSelect(x.id)
        })))) : null));
  }

  // Overlaps: one dense row per finding (type, suggestion, notes, words that could go).
  function OverlapsView(props) {
    const h = CC.h;
    const ui = CC.ui;
    const st = props.state;
    const data = st.data;
    if (!data) {
      if (st.loading) return h('div', { className: 'cc-br-line', role: 'status' }, 'Looking for duplicate material…');
      return h('div', { className: 'cc-br-line cc-bad', role: 'status' },
        h('span', null, st.error ? errorText(st.error, 'The overlap finder') : 'Overlaps unavailable.'),
        st.error ? ui.Button({ kind: 'quiet', size: 'sm', onClick: props.onRetry, children: 'Try again' }) : null);
    }
    const rows = overlapRows(data, props.q);
    const scanned = data.notes_scanned || 0;
    if (!rows.length) {
      return h('div', { className: 'cc-br-line', role: 'status' },
        props.q ? 'No overlaps match.' : 'No duplicate material in ' + scanned + ' notes.');
    }
    return h('div', { className: 'cc-tb cc-tb-ov', onKeyDown: onTableKey },
      h('div', { className: 'cc-tb-h', role: 'row' },
        h('span', { className: 'cc-tb-ty' }, 'Type'), h('span', null, 'Suggestion'),
        h('span', { className: 'cc-tb-nt' }, 'Notes'), h('span', { className: 'cc-tb-num' }, 'Could go')),
      h('ul', { className: 'cc-tb-ls', 'aria-label': 'Overlaps' }, rows.map((f) => {
        const notes = (f.notes || []).map((n) => n.name || n.title || n.id);
        return h('li', { key: f.id }, h('button', {
          type: 'button', className: 'cc-tb-r', 'data-nav': '1', 'data-id': f.id,
          'aria-current': f.id === props.active ? 'true' : undefined,
          'aria-label': (OVERLAP_TYPE[f.type] || f.type) + ': ' + f.suggestion,
          title: f.suggestion, onClick: () => props.onPick(f)
        },
        h('span', { className: 'cc-tb-c cc-tb-ty' }, OVERLAP_SHORT[f.type] || f.type),
        h('span', { className: 'cc-tb-c cc-tb-t' }, f.suggestion),
        h('span', { className: 'cc-tb-c cc-tb-nt' }, notes.join(', ')),
        h('span', { className: 'cc-tb-c cc-tb-num' }, wordsLabel(f.cut_words))));
      })));
  }

  // Side panel for one overlap finding.
  function OverlapPanel(props) {
    const h = CC.h;
    const ui = CC.ui;
    const f = props.finding;
    const sim = f.similarity == null ? null : Math.round(f.similarity * 100);
    const meta = [OVERLAP_TYPE[f.type] || f.type, f.copies > 2 ? f.copies + ' notes' : null,
      sim != null && f.type === 'near_duplicate' ? sim + '% similar' : null,
      f.template ? 'template text' : null, wordsLabel(f.cut_words) + ' could go'].filter(Boolean).join(' · ');
    return h('aside', { className: 'cc-split-side', 'aria-label': 'Overlap details' }, h('div', { className: 'cc-sp' },
      h('div', { className: 'cc-sp-h' },
        h('div', { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', { className: 'cc-sp-t' }, f.suggestion),
          h('div', { className: 'cc-sp-m' }, meta)),
        ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close', onClick: props.onClose })),
      h(ui.List, { label: 'Notes in this overlap' }, (f.notes || []).map((n) => h(ui.Row, {
        key: n.id, id: n.id, tip: n.path, title: n.name || n.title || n.id,
        lead: h('span', { className: 'cc-tag' + (n.role === 'keep' ? ' cc-tag-keep' : '') }, n.role === 'keep' ? 'Keep' : 'Trim')
      }))),
      f.excerpt ? h('blockquote', { className: 'cc-sp-q' }, f.excerpt) : null,
      h('div', { className: 'cc-sp-a' },
        ui.Button({ onClick: () => props.onShow(f), children: 'Show on map' }),
        ui.Button({ kind: 'quiet', onClick: () => props.onCopy(f.suggestion), children: 'Copy suggestion' }))));
  }

  function BrainPage(props) {
    const React = CC.React;
    const h = CC.h;
    const ui = CC.ui;
    ensureStyle();
    const api = props.api || CC.api;
    const st = React.useState({ data: null, error: null, loading: true });
    const ovS = React.useState({ data: null, error: null, loading: false });
    const viewS = React.useState('star');
    const kindsS = React.useState(DEFAULT_KINDS);
    const qS = React.useState('');
    const selS = React.useState(null);
    const sortS = React.useState({ key: 'kind', dir: 1 });
    const openS = React.useState(false);       // Map search results open
    const hlS = React.useState(null);          // the overlap finding highlighted on the map
    const fS = React.useState(null);           // the overlap finding open in the side panel
    const toast = useToast();
    const state = st[0], ov = ovS[0], view = viewS[0], kinds = kindsS[0], q = qS[0], selected = selS[0];
    const hl = hlS[0];

    function load(refresh) {
      st[1]((prev) => ({ data: prev.data, error: null, loading: true }));
      api.get('/api/brain' + (refresh ? '?refresh=1' : '')).then(
        (data) => st[1]({ data: data, error: null, loading: false }),
        (error) => st[1]((prev) => ({ data: prev.data, error: error, loading: false })));
    }
    function loadOverlaps(refresh) {
      ovS[1]((prev) => ({ data: prev.data, error: null, loading: true }));
      api.get('/api/brain/overlaps' + (refresh ? '?refresh=1' : '')).then(
        (data) => ovS[1]({ data: data, error: null, loading: false }),
        (error) => ovS[1]((prev) => ({ data: prev.data, error: error, loading: false })));
    }
    React.useEffect(() => { load(false); }, []);
    // Overlaps are fetched the first time the view opens (the scan reads every note once).
    React.useEffect(() => { if (view === 'overlaps' && !ov.data && !ov.loading && !ov.error) loadOverlaps(false); }, [view]);

    const graph = React.useMemo(() => withNames(state.data), [state.data]);
    const byId = React.useMemo(() => {
      const m = {};
      ((graph && graph.nodes) || []).forEach((n) => { m[n.id] = n; });
      return m;
    }, [graph]);
    const hlIds = hl ? (hl.notes || []).map((n) => n.id).filter((id) => byId[id]) : [];
    // Highlighted notes stay visible even when their kind is switched off.
    const effKinds = React.useMemo(() => {
      if (!hlIds.length) return kinds;
      const k = Object.assign({}, kinds);
      hlIds.forEach((id) => { k[byId[id].kind] = true; });
      return k;
    }, [kinds, hl, graph]);
    const board = React.useMemo(() => toBoard(graph, effKinds), [graph, effKinds]);
    const visible = board.nodes.map((n) => byId[n.id]).filter(Boolean);
    const results = q && view === 'star' ? visible.filter((n) => matches(n, q)) : [];
    const isOv = view === 'overlaps';
    const selNode = !isOv && selected && byId[selected] ? byId[selected] : null;
    const finding = isOv && fS[0] && ov.data ? ((ov.data.findings || []).filter((f) => f.id === fS[0].id)[0] || null) : null;

    function select(id) { selS[1](id); openS[1](false); }
    function setView(v) { viewS[1](v); openS[1](false); }
    function toggleKind(id) {
      const next = Object.assign({}, kinds);
      next[id] = !next[id];
      kindsS[1](next);
    }
    function onCopy(path) {
      copy(path).then(() => toast.show('Path copied'), () => toast.show('Could not copy; the path is in the panel'));
    }
    function onCopySuggestion(text) {
      copy(text).then(() => toast.show('Suggestion copied'), () => toast.show('Could not copy the suggestion'));
    }
    function showFinding(f) {
      hlS[1](f);
      const keep = (f.notes || []).filter((n) => byId[n.id])[0];
      selS[1](keep ? keep.id : null);
      if (!graph) toast.show('The map is still loading');
      setView('star');
    }
    function clearHighlight() { hlS[1](null); }
    function onSearchKey(e) {
      if (e.key === 'Escape') {
        if (q) { e.preventDefault(); qS[1](''); }
        openS[1](false);
      } else if (e.key === 'Enter' && view === 'star' && results.length) {
        e.preventDefault(); select(results[0].id);
      } else if (e.key === 'ArrowDown' && view !== 'star' && typeof document !== 'undefined' && document.querySelector) {
        const first = document.querySelector('.cc-brain .cc-tb [data-nav]');
        if (first) { e.preventDefault(); first.focus(); }
      }
    }

    const counts = (graph && graph.counts) || {};
    const built = isOv ? (ov.data && ov.data.built_at) : (graph && graph.built_at);
    const ovRows = isOv && ov.data ? overlapRows(ov.data, q) : null;
    let metaText;
    if (isOv) metaText = ovRows ? ovSummary(ovRows, ov.data.notes_scanned || 0) : '';
    else if (graph) metaText = plural(visible.length, 'note') + (built ? ' · indexed ' + stamp(built) : '');
    const meta = metaText ? h('span', { title: built ? (isOv ? 'Checked ' : 'Indexed ') + fullStamp(built) : undefined }, metaText) : null;

    const search = h('div', { className: 'cc-br-search', role: 'search' },
      h('input', {
        className: 'cc-in', type: 'search', value: q, 'aria-label': 'Search',
        placeholder: isOv ? 'Search overlaps' : 'Search notes',
        onChange: (e) => { qS[1](e.target.value); openS[1](true); },
        onFocus: () => openS[1](true), onKeyDown: onSearchKey
      }),
      view === 'star' && openS[0] && q ? h('div', { className: 'cc-br-results' },
        results.length ? h(ui.List, { label: 'Matches' }, results.slice(0, 12).map((n) => h(ui.Row, {
          key: n.id, id: n.id, title: n.label, meta: labelForKind(n.kind), tip: noteTip(n),
          selected: n.id === selected, onClick: () => select(n.id)
        }))) : h('div', { className: 'cc-br-line' }, 'No matches')) : null);
    const more = h(Menu, { label: 'More', items: [
      { label: state.loading ? 'Rebuilding the index…' : 'Rebuild index', disabled: state.loading, onClick: () => load(true) },
      isOv ? { label: ov.loading ? 'Checking…' : 'Check overlaps again', disabled: ov.loading, onClick: () => loadOverlaps(true) } : null
    ] });

    const header = ui.PageHeader({
      title: 'Brain', pageId: 'cc-brain', meta: meta,
      mid: ui.Segmented({ label: 'View', options: VIEWS.map((v) => ({ value: v.id, label: v.label,
        count: v.id === 'overlaps' && ov.data ? (ov.data.findings || []).length : undefined })), value: view, onChange: setView }),
      actions: [h('span', { key: 's' }, search), h('span', { key: 'm' }, more)]
    });

    let main;
    let side = null;
    let banner = null;
    if (isOv) {
      main = h(OverlapsView, {
        state: ov, q: q, active: finding ? finding.id : null, onPick: (f) => fS[1](f),
        onRetry: () => loadOverlaps(false)
      });
      if (finding) side = h(OverlapPanel, { finding: finding, onClose: () => fS[1](null), onShow: showFinding, onCopy: onCopySuggestion });
    } else if (!graph) {
      main = state.loading
        ? h('div', { className: 'cc-br-line', role: 'status' }, 'Building the index…')
        : h('div', { className: 'cc-br-line cc-bad', role: 'status' },
          h('span', null, errorText(state.error, 'The brain index') || 'The brain index is unavailable.'),
          ui.Button({ kind: 'quiet', size: 'sm', onClick: () => load(false), children: 'Try again' }));
    } else if (view === 'list') {
      main = h(ListView, {
        nodes: graph.nodes || [], kinds: kinds, q: q, sort: sortS[0], onSort: sortS[1], selected: selected, onSelect: select
      });
    } else {
      const View = CC.StarView;
      const lit = highlightBoard(board, hlIds);
      main = h('div', { className: 'cc-br-canvas' }, View
        ? h(View, {
          board: lit.board, filter: lit.filter, selected: selected, onSelect: select, onOpen: (id) => { if (byId[id]) onCopy(byId[id].path); },
          cameraKey: 'brain-' + view, colorBy: 'status', seed: 11, labelMode: 'regions', fill: false
        })
        : h('div', { className: 'cc-br-line' }, 'The map is still loading; List shows the same notes.'));
      if (hl) {
        banner = ui.Banner({
          action: h('span', { style: { display: 'inline-flex', gap: '4px' } },
            ui.Button({ kind: 'quiet', size: 'sm', onClick: () => setView('overlaps'), children: 'Back to overlaps' }),
            ui.Button({ kind: 'quiet', size: 'sm', onClick: clearHighlight, children: 'Clear' })),
          children: (OVERLAP_TYPE[hl.type] || 'Overlap') + ' · ' + hlIds.length + ' of ' + (hl.notes || []).length + ' notes highlighted'
        });
      }
    }
    if (selNode) {
      side = h(DetailPanel, { node: selNode, graph: graph, roots: graph.roots, byId: byId, onClose: () => select(null), onSelect: select, onCopy: onCopy });
    }

    const lateError = !isOv && state.error && graph ? errorText(state.error, 'Rebuild')
      : (isOv && ov.error && ov.data ? errorText(ov.error, 'Check again') : null);

    return ui.Page({
      id: 'cc-ready', className: 'cc-brain', header: header, raw: true,
      children: [
        !isOv && graph ? h(KindChips, { key: 'k', kinds: kinds, counts: counts, onToggle: toggleKind }) : null,
        banner ? h('div', { key: 'b' }, banner) : null,
        h('div', { key: 'v', className: 'cc-split' },
          h('div', { className: 'cc-split-main' }, main,
            toast.msg ? h('div', { className: 'cc-toast', role: 'status' }, toast.msg) : null,
            !toast.msg && lateError ? h('div', { className: 'cc-toast', role: 'status' }, lateError) : null),
          side)
      ]
    });
  }

  CC.BrainPage = BrainPage;
  CC.BrainListView = ListView;
  CC.BrainOverlapsView = OverlapsView;
  CC.BrainDetailPanel = DetailPanel;
})(CC);
