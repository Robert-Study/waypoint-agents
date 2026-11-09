// view_star.js [views, C3] - constellation view (seeded cluster layout, frozen after one run).
// Props: {board:{nodes,edges|links}, filter, selected, onSelect, onOpen?, colorBy?, seed?, cameraKey?, labelBudget?,
//         labelMode?: 'budget'|'regions', edgeMode?: 'all'|'active'}
// Nodes may carry status (Create) or weight/provenance (Brain). Cluster = node.cluster | lane | kind.
// Dots and labels stay a constant screen size; only positions follow the camera.
// labelMode 'budget' (default, Brain): cluster names always; then selected, hovered and the
// heaviest nodes, greedily, rejecting any label that would collide. Zooming in raises the budget.
// labelMode 'regions' (Create): only region (cluster) names; a dot is labelled on hover or select.
// edgeMode 'active' (Create): only links into or out of ready/running tasks, plus the selected
// (and hovered) task's own links. Layout and camera always use every node and link, so neither
// filters nor status changes ever move a dot or the camera.
(function (CC) {
  'use strict';

  const BRIGHT = { explicit_user_statement: 1, user_reported_calibration: 0.72, vetted_source: 0.6, inherited_registry: 0.45, agent_synthesis: 0.42 };
  // Dot size also follows provenance, so low-provenance notes recede.
  const SIZE = { explicit_user_statement: 1, user_reported_calibration: 0.85, vetted_source: 0.75, inherited_registry: 0.7, agent_synthesis: 0.65 };
  const PROV_RANK = { explicit_user_statement: 5, user_reported_calibration: 4, vetted_source: 3, inherited_registry: 2, agent_synthesis: 1 };
  const LABEL_MAX = 28;
  const CHAR_W = 6.6; // 12 px system font, weight 500, generous average advance
  const LINE_H = 15;
  // Thin canvas-coloured halo so a label stays legible where it passes over dots or links.
  const HALO = { stroke: 'var(--cc-canvas)', strokeWidth: 4, strokeOpacity: 0.9, strokeLinejoin: 'round', paintOrder: 'stroke' };

  // Region names read as words, not ids: "ui" -> UI, "engine" -> Engine, "data_prep" -> Data Prep.
  // Only all-lowercase words are touched, so a name already cased by its author stays as written.
  const ACRONYMS = { ui: 1, ux: 1, api: 1, cli: 1, qa: 1, db: 1, id: 1, ci: 1, cd: 1, ai: 1, llm: 1, mcp: 1, sql: 1, http: 1, https: 1, url: 1, json: 1, pr: 1, os: 1, io: 1, css: 1, html: 1, js: 1, ide: 1, sdk: 1, ml: 1, gpu: 1, cpu: 1, ocr: 1, pdf: 1, csv: 1, yaml: 1, etf: 1 };
  function clusterLabel(key) {
    return String(key == null ? '' : key).replace(/_+/g, ' ').trim().split(/[ \t]+/).map((word) => word.split('-').map((w) => {
      if (!w || w !== w.toLowerCase()) return w;
      return ACRONYMS[w] ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    }).join('-')).join(' ');
  }

  // Fit-to-canvas (Create): the dots' layout units are scaled so the hulls span FILL of the canvas,
  // because the camera never zooms an automatic fit past 1:1 and a small project would sit in a
  // small patch of empty canvas. Dots, labels and hull padding stay constant screen size.
  // raw: {w,h} extent of the dot positions; view: {w,h} canvas. Never below 1 (large graphs keep the
  // camera's own shrink-to-fit), never above FILL_MAX; quantised so a few pixels of resize do not re-lay.
  const FILL = 0.85, HULL_PAD = 30, FILL_MAX = 2.5;
  function fillScale(raw, view) {
    let s = Infinity;
    if (raw.w > 1) s = Math.min(s, (FILL * view.w - 2 * HULL_PAD) / raw.w);
    if (raw.h > 1) s = Math.min(s, (FILL * view.h - 2 * HULL_PAD) / raw.h);
    if (!isFinite(s)) return 1;
    return Math.round(Math.max(1, Math.min(FILL_MAX, s)) * 20) / 20;
  }
  function scalePositions(pos, s) {
    if (s === 1) return pos;
    const out = {};
    Object.keys(pos).forEach((id) => { out[id] = { x: Math.round(pos[id].x * s * 100) / 100, y: Math.round(pos[id].y * s * 100) / 100 }; });
    return out;
  }

  function linkList(board) { return board.edges || board.links || []; }
  function ends(l) {
    if (Array.isArray(l)) return [String(l[0]), String(l[1])];
    const s = l.source != null ? l.source : (l.from != null ? l.from : l.src);
    const t = l.target != null ? l.target : (l.to != null ? l.to : l.dst);
    return [String(s && typeof s === 'object' ? s.id : s), String(t && typeof t === 'object' ? t.id : t)];
  }
  function dotRadius(n) {
    const w = Math.max(0, +n.weight || 1);
    const base = 2 + 1.5 * Math.min(3, Math.sqrt(w));
    const s = SIZE[n.provenance] == null ? 0.7 : SIZE[n.provenance];
    return Math.round(base * s * 100) / 100;
  }
  function dotOpacity(n) {
    if (n.brightness != null && isFinite(+n.brightness)) return Math.max(0.35, Math.min(1, +n.brightness));
    return BRIGHT[n.provenance] == null ? 0.6 : BRIGHT[n.provenance];
  }

  // Pure label planner (exported for tests). items: [{id, x, y, text, force?}] in screen
  // space, already in priority order. fixed: boxes that are always drawn (cluster names).
  // dots (optional): [{id, x, y}] screen positions of every dot; a label never covers another
  // note's dot (its own is exempt). Returns {id: {side: 1 | -1, text}} for labels to draw.
  function planLabels(items, fixed, budget, view, dots) {
    const boxes = (fixed || []).slice();
    const out = {};
    let used = 0;
    const DOT_PAD = 5; // a dot's radius plus a little air
    const hit = (b, selfId) => {
      for (let i = 0; i < boxes.length; i++) {
        const o = boxes[i];
        if (b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return true;
      }
      if (dots) {
        for (let j = 0; j < dots.length; j++) {
          const d = dots[j];
          if (d.id === selfId) continue;
          if (d.x + DOT_PAD > b.x0 && d.x - DOT_PAD < b.x1 && d.y + DOT_PAD > b.y0 && d.y - DOT_PAD < b.y1) return true;
        }
      }
      return false;
    };
    const boxFor = (it, side) => {
      const w = it.text.length * CHAR_W + 4;
      const x0 = side > 0 ? it.x + 9 : it.x - 9 - w;
      return { x0: x0, x1: x0 + w, y0: it.y - LINE_H / 2 - 1, y1: it.y + LINE_H / 2 + 1 };
    };
    const onScreen = (it) => !view || (it.x > -20 && it.x < view.w + 20 && it.y > -10 && it.y < view.h + 10);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.force && (used >= budget || !onScreen(it))) continue;
      const right = boxFor(it, 1);
      const left = boxFor(it, -1);
      const rightFits = !view || right.x1 < view.w;
      let pick = null, side = 1;
      if (rightFits && !hit(right, it.id)) pick = right;
      else if (!hit(left, it.id)) { pick = left; side = -1; }
      else if (it.force) pick = right;
      if (!pick) continue;
      boxes.push(pick);
      out[it.id] = { side: side, text: it.text };
      if (!it.force) used++;
    }
    return out;
  }

  function StarView(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const board = props.board || {};
    const nodes = board.nodes || [];
    const links = linkList(board);
    const filter = props.filter || 'all';
    const selected = props.selected == null ? null : String(props.selected);
    const onSelect = props.onSelect || function () {};
    const seed = props.seed == null ? 7 : props.seed;
    const regions = props.labelMode === 'regions';
    const activeEdges = props.edgeMode === 'active';
    const labelBudget = regions ? 0 : (props.labelBudget == null ? 12 : props.labelBudget);
    const colorBy = props.colorBy || 'status';
    const fill = props.fill == null ? regions : !!props.fill; // Create fits the hulls to the canvas

    const key = nodes.map((n) => n.id + ':' + CC.clusterOf(n) + ':' + (+n.weight || 1)).join('|') + '#' +
      links.map((l) => ends(l).join('>')).join('|') + '#' + seed;
    // The canvas size is read here (before the camera exists) so the fit scale can shape the bounds
    // the camera fits; it is re-read after mount and on every resize.
    const holder = React.useRef(null);
    const resized = React.useState(0);
    let vw = 800, vh = 480;
    if (holder.current && holder.current.getBoundingClientRect) {
      const r = holder.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { vw = Math.round(r.width); vh = Math.round(r.height); }
    }
    const raw = React.useMemo(() => CC.layoutStar(nodes, links, seed), [key]);
    const rawExtent = React.useMemo(() => CC.starBounds(raw, 0), [key]);
    const fitS = fill ? fillScale(rawExtent, { w: vw, h: vh }) : 1;
    const pos = React.useMemo(() => scalePositions(raw, fitS), [key, fitS]);
    const hulls = React.useMemo(() => CC.clusterHulls(nodes, pos), [key, fitS]);
    const bounds = React.useMemo(() => CC.starBounds(pos, fill ? HULL_PAD : 60), [key, fitS]);
    const degree = React.useMemo(() => {
      const d = {};
      links.forEach((l) => { const e = ends(l); d[e[0]] = (d[e[0]] || 0) + 1; d[e[1]] = (d[e[1]] || 0) + 1; });
      return d;
    }, [key]);
    const cam = CC.useCamera(bounds, props.cameraKey);
    const setRef = React.useCallback((el) => { holder.current = el; if (cam.ref) cam.ref.current = el; }, []);
    // The size this render was laid out for; the resize check below outlives the render it was made in.
    const drawn = React.useRef('');
    drawn.current = vw + 'x' + vh;
    (React.useLayoutEffect || React.useEffect)(() => {
      const el = holder.current;
      if (!fill || !el) return undefined;
      let last = '';
      const check = () => {
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        const sig = r ? Math.round(r.width) + 'x' + Math.round(r.height) : '';
        if (sig !== last) { last = sig; if (sig !== drawn.current) resized[1]((t) => t + 1); }
      };
      check();
      if (typeof ResizeObserver === 'undefined') return undefined;
      const ro = new ResizeObserver(check);
      ro.observe(el);
      return () => ro.disconnect();
    }, [fill]);
    const hov = React.useState(null);
    const hovered = hov[0];

    const byId = {};
    const clusterOfId = {};
    nodes.forEach((n) => { byId[String(n.id)] = n; clusterOfId[String(n.id)] = CC.clusterOf(n); });
    const visible = (id) => byId[id] && CC.matchesFilter(byId[id], filter);
    const sx = (x) => x * cam.k + cam.x;
    const sy = (y) => y * cam.k + cam.y;
    const pad = Math.max(10, 30 * cam.k);

    // Viewport and the zoom an automatic fit would use; the budget grows with zoom past it.
    let view = { w: 800, h: 480 };
    const el = cam.ref && cam.ref.current;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) view = { w: r.width, h: r.height };
    }
    const fitK = Math.max(0.1, Math.min(1, (view.w - 48) / Math.max(1, bounds.w), (view.h - 48) / Math.max(1, bounds.h)));
    const zoomGain = Math.max(1, cam.k / fitK);
    const budget = Math.round(labelBudget * zoomGain * zoomGain);

    const multi = hulls.length > 1;
    const named = multi || (regions && hulls.length > 0); // regions mode names even a lone region
    const hullEls = multi ? hulls.map((c) => {
      const pts = c.points.map((p) => sx(p[0]) + ' ' + sy(p[1]));
      return h('path', { key: c.key, className: 'cc-hull', strokeWidth: 2 * pad, d: 'M' + pts.join('L') + 'Z' });
    }) : [];
    const clusterBoxes = [];
    const clusterLabels = named ? hulls.map((c) => {
      // Review 2 (regions): the lane name sits on its hull's top edge, inside the band when the
      // band is tall enough, else touching it from above - never floating over empty canvas.
      const x = sx(c.cx), y = regions ? (pad >= 18 ? sy(c.top) - pad + 12 : sy(c.top) - pad - 3) : sy(c.top) - pad - 6;
      const name = clusterLabel(c.key);
      const w = name.length * 6.4 + 8;
      clusterBoxes.push({ x0: x - w / 2, x1: x + w / 2, y0: y - 12, y1: y + 4 });
      return h('text', { key: 'l' + c.key, className: 'cc-t-cluster', textAnchor: 'middle', x: x, y: y }, name);
    }) : [];

    // Label candidates in priority order: selected, then weight, provenance, degree. The
    // hovered label is drawn on top separately, so hovering never reshuffles the others.
    const rank = nodes.filter((n) => pos[String(n.id)]).map((n) => String(n.id));
    const score = (id) => {
      const n = byId[id];
      return (Math.max(0, +n.weight || 1)) * 10 + (PROV_RANK[n.provenance] || 0) + Math.min(4, Math.log2(1 + (degree[id] || 0)));
    };
    rank.sort((a, b) => (score(b) - score(a)) || (a < b ? -1 : a > b ? 1 : 0));
    const labelOf = (id) => { const n = byId[id]; return String(n.title || n.label || id); };
    const items = [];
    const pushItem = (id, force, full) => {
      if (!id || !pos[id] || !byId[id]) return;
      const t = labelOf(id);
      items.push({ id: id, x: sx(pos[id].x), y: sy(pos[id].y), text: full ? t : CC.truncate(t, LABEL_MAX), force: force });
    };
    pushItem(selected, true, false);
    rank.forEach((id) => { if (id !== selected && visible(id)) pushItem(id, false, false); });
    const dotPts = rank.map((id) => ({ id: id, x: sx(pos[id].x), y: sy(pos[id].y) }));
    const labels = planLabels(items, clusterBoxes, budget, view, dotPts);

    const near = (id) => id === selected || id === hovered;
    const hot = (id) => { const st = byId[id] ? CC.statusOf(byId[id]) : null; return st === 'ready' || st === 'running'; };
    const linkEls = links.map((l, i) => {
      const e = ends(l);
      const a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) return null;
      const sel = near(e[0]) || near(e[1]);
      if (activeEdges && !sel && !hot(e[0]) && !hot(e[1])) return null;
      const faded = !(visible(e[0]) && visible(e[1]));
      const across = clusterOfId[e[0]] !== clusterOfId[e[1]];
      return h('line', {
        key: i, 'data-edge': e[0] + '>' + e[1], x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y),
        // Review 2 (regions): links between lanes draw in the quiet line colour at full alpha.
        strokeOpacity: sel ? 1 : (across ? (regions ? 1 : 0.2) : 0.55),
        style: regions && across && !sel ? { stroke: 'var(--cc-line)', opacity: faded ? undefined : 1 } : undefined,
        className: 'cc-link' + (sel ? ' cc-edge-sel' : '') + (regions && across ? ' cc-link-x' : '') + (faded ? ' cc-faded' : '')
      });
    });

    const nodeEls = nodes.map((n) => {
      const id = String(n.id);
      const p = pos[id];
      if (!p) return null;
      const sel = id === selected;
      const hasStatus = n.status != null || n.display_status != null;
      const lane = colorBy === 'lane' ? CC.laneIndex(n.lane || n.pool || CC.clusterOf(n)) : null;
      const lab = labels[id];
      const title = labelOf(id);
      const claim = n.claim && n.claim.by ? ' · ' + n.claim.by + (n.claim.stale ? ' (stale claim)' : ' working on it') : '';
      return h('g', {
        key: id,
        className: 'cc-node' + (sel ? ' cc-sel' : '') + (visible(id) ? '' : ' cc-faded'),
        transform: 'translate(' + sx(p.x) + ',' + sy(p.y) + ')',
        'data-id': id,
        onClick: (ev) => { ev.stopPropagation(); if (!cam.wasDrag()) onSelect(id); },
        onDoubleClick: () => { if (props.onOpen) props.onOpen(id); },
        onMouseEnter: () => hov[1](id),
        onMouseLeave: () => hov[1]((cur) => (cur === id ? null : cur))
      },
      h('title', null, title + (hasStatus ? ' — ' + CC.statusLabel(CC.statusOf(n)) : '') + claim),
      h('circle', { className: 'cc-hit', r: 10 }),
      hasStatus
        ? h(CC.StatusDot, { status: CC.statusOf(n), lane: lane })
        : h(CC.StatusDot, { status: 'plain', r: dotRadius(n), opacity: dotOpacity(n) }),
      sel ? h('circle', { className: 'cc-s-accent', r: 10.5 }) : null,
      lab && !near(id) ? h('text', Object.assign({ className: 'cc-t-label', x: lab.side > 0 ? 10 : -10, y: 4, textAnchor: lab.side > 0 ? 'start' : 'end' }, HALO), lab.text) : null);
    });

    // Selected and hovered labels sit on top of everything, with a canvas-coloured halo.
    const topIds = [];
    if (selected && pos[selected] && byId[selected] && selected !== hovered) topIds.push(selected);
    if (hovered && pos[hovered] && byId[hovered]) topIds.push(hovered);
    const topEls = topIds.map((id) => {
      const full = id === hovered || regions; // regions mode: the only dot label, so in full
      const text = full ? labelOf(id) : (labels[id] ? labels[id].text : CC.truncate(labelOf(id), LABEL_MAX));
      const px = sx(pos[id].x);
      const tooWide = px + 10 + text.length * CHAR_W > view.w && px - 10 - text.length * CHAR_W > 0;
      const side = !full && labels[id] ? labels[id].side : (tooWide ? -1 : 1);
      return h('text', {
        key: 'top-' + id, className: 'cc-t-label', pointerEvents: 'none', textAnchor: side > 0 ? 'start' : 'end',
        x: px + (side > 0 ? 10 : -10), y: sy(pos[id].y) + 4,
        stroke: HALO.stroke, strokeWidth: 4, strokeLinejoin: 'round', paintOrder: 'stroke'
      }, text);
    });

    function onKeyDown(e) {
      if (cam.onKeyDown(e)) return;
      if (e.key === 'Escape') onSelect(null);
      if (e.key === 'Enter' && selected) { e.preventDefault(); (props.onOpen || onSelect)(selected); }
    }

    return h('div', {
      ref: setRef,
      className: 'cc-graph cc-star',
      tabIndex: 0,
      role: 'group',
      'aria-label': 'Constellation. Drag to pan, scroll to zoom, F fits.',
      onPointerDown: cam.onPointerDown,
      onKeyDown: onKeyDown
    },
    nodes.length === 0
      ? h('div', { className: 'cc-meta', style: { padding: 16 } }, 'Nothing to show yet')
      : h('svg', null,
        h('g', { className: 'cc-hulls' }, hullEls),
        h('g', { className: 'cc-links' }, linkEls),
        h('g', { className: 'cc-cluster-labels' }, clusterLabels),
        h('g', { className: 'cc-nodes' }, nodeEls),
        h('g', { className: 'cc-top-labels', 'aria-hidden': 'true' }, topEls)));
  }

  CC.StarView = StarView;
  CC.clusterLabel = clusterLabel;
  CC.starFillScale = fillScale;
  CC.planStarLabels = planLabels;
  CC.starDotRadius = dotRadius;
})(CC);
