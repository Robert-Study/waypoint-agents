// view_flow.js [views, C2] - left-to-right task flow chart (SVG via React elements).
// Props: {board:{nodes,edges}, filter:'all'|'active'|'completed', selected, onSelect, onOpen?, colorBy?:'status'|'lane', cameraKey?}
// Implied edges (a->c when a->b->c) are dropped except with dashUnnamed (Plan review shows every handoff).
// Layout is computed from ALL nodes and only recomputed when the graph structure or the canvas
// size changes; the filter fades nodes; the camera lives in a ref and is never refit on filter
// change. The opening view fits the graph at a legible zoom: cards take their width from the
// canvas (160-240 px); a graph wider than the canvas anchors left, pans horizontally and shows
// an edge button on each side it continues past.
// It follows canvas resizes until the user pans or zooms.
(function (CC) {
  'use strict';

  let uid = 0;
  const META_MIN_PX = 9;   // hide the meta line when 11 px meta text would render below this
  const MAX_FIT = 1.25;     // largest zoom the opening fit uses when the graph has room
  const SIZE_STEP = 16;    // canvas size bucket (px) so small resizes do not relayout
  const movedStore = {};   // cameraKey -> user has panned/zoomed since the last fit

  function structureKey(nodes, edges) {
    const n = nodes.map((x) => x.id + ':' + (x.deps || []).join(',')).join('|');
    const e = (edges || []).map((x) => (Array.isArray(x) ? x.join('>') : (x.source || x.from || x.src) + '>' + (x.target || x.to || x.dst))).join('|');
    return n + '#' + e;
  }

  // U3 node cards: a quiet surface card per task, status read from the dot and (for running,
  // error, needs you) the card's 1 px outline; selection is the accent outline.
  const FLOW_STYLE = [
    '.cc-root .cc-flow .cc-node .cc-hit{fill:var(--cc-surface);stroke:var(--cc-line-strong);stroke-width:1;transition:fill 120ms,stroke 120ms;}',
    '.cc-root .cc-flow .cc-node:hover .cc-hit{fill:var(--cc-surface-2);}',
    '.cc-root .cc-flow .cc-node.cc-st-running .cc-hit{stroke:var(--cc-running);}',
    '.cc-root .cc-flow .cc-node.cc-st-error .cc-hit{stroke:var(--cc-error);}',
    '.cc-root .cc-flow .cc-node.cc-st-needs_you .cc-hit{stroke:var(--cc-accent);}',
    '.cc-root .cc-flow .cc-node.cc-blocked:not(.cc-sel) .cc-hit{stroke:var(--cc-error);stroke-dasharray:3 2;}',
    '.cc-root .cc-flow .cc-node.cc-sel .cc-hit{fill:var(--cc-surface);stroke:var(--cc-accent);stroke-width:1.5;}',
    '.cc-root .cc-flow .cc-node.cc-st-done:not(.cc-sel) .cc-t-label{fill:var(--cc-text-2);}',
    '.cc-root .cc-flow .cc-kind{stroke:var(--cc-text-3);}',
    '.cc-root .cc-flow .cc-node.cc-sel .cc-kind{stroke:var(--cc-accent);}',
    '.cc-root .cc-flow .cc-edge.cc-edge-sel{stroke-width:1.5;}',
    // U1 review: edges share one bus per gap and sit back in the quiet line colour.
    '.cc-root .cc-flow .cc-edge:not(.cc-edge-sel):not(.cc-edge-blocked){stroke:var(--cc-line);}',
    '.cc-root .cc-flow .cc-faded{opacity:.18;}',
    // Review 2: a graph wider than the canvas says so at the edge it continues past.
    '.cc-root .cc-flow{position:relative;}',
    '.cc-root .cc-flow .cc-pan{position:absolute;top:50%;width:28px;height:28px;margin-top:-14px;display:flex;align-items:center;justify-content:center;border:1px solid var(--cc-line-strong);border-radius:8px;background:var(--cc-surface);color:var(--cc-text-2);font:inherit;font-size:14px;line-height:1;cursor:pointer;z-index:1;}',
    '.cc-root .cc-flow .cc-pan:hover{background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root .cc-flow .cc-pan:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-flow .cc-pan-l{left:8px;}',
    '.cc-root .cc-flow .cc-pan-r{right:8px;}'
  ].join('\n');
  function ensureFlowStyle() {
    if (typeof document === 'undefined' || !document.getElementById || document.getElementById('cc-flow-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-flow-style';
    el.textContent = FLOW_STYLE;
    document.head.appendChild(el);
  }
  // Two lines of at most n characters, broken at the last space that fits; a first word longer
  // than the line is split with a hyphen.
  function wrap2(text, n) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return [t];
    const sp = t.lastIndexOf(' ', n), hy = t.lastIndexOf('-', n - 1);
    if (sp > 0 && sp >= hy) return [t.slice(0, sp), clip(t.slice(sp + 1), n)];
    if (hy > 0) return [t.slice(0, hy + 1), clip(t.slice(hy + 1), n)];
    return [t.slice(0, n - 1) + '-', clip(t.slice(n - 1), n)];
  }
  // Truncate without a space before the ellipsis.
  function clip(text, n) { return CC.truncate(text, n).replace(/\s+…$/, '…'); }

  // A code node runs its script and never a model. The board may omit `kind` (packed rows), so
  // the code route counts too.
  function isCodeNode(n) { return !!n && (n.kind === 'code' || n.pool === 'code' || n.route === 'code'); }
  CC.isCodeNode = CC.isCodeNode || isCodeNode;
  // The card's meta line: id, then Blocked / Code / model. The status word is left to the dot and
  // the tooltip (review 2: it was the part that got cut); the line is never ellipsized - the model
  // is dropped first, then the id alone stays.
  function metaLine(n, blocked, room) {
    const tail = blocked ? 'Blocked' : isCodeNode(n) ? 'Code' : (n.model || '');
    const full = [n.id, tail].filter(Boolean).join(' · ');
    if (!(room > 0) || full.length <= room) return full;
    return String(n.id);
  }
  CC.flowMetaLine = metaLine;

  function neighbours(layout) {
    const succ = {}, pred = {};
    layout.edges.forEach((e) => {
      (succ[e.source] = succ[e.source] || []).push(e.target);
      (pred[e.target] = pred[e.target] || []).push(e.source);
    });
    const byY = (a, b) => layout.nodes[a].cy - layout.nodes[b].cy;
    Object.keys(succ).forEach((k) => succ[k].sort(byY));
    Object.keys(pred).forEach((k) => pred[k].sort(byY));
    return { succ: succ, pred: pred };
  }

  function FlowView(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    ensureFlowStyle();
    const board = props.board || {};
    const nodes = board.nodes || [];
    const edges = board.edges || [];
    const filter = props.filter || 'all';
    const selected = props.selected == null ? null : String(props.selected);
    const onSelect = props.onSelect || function () {};
    const colorBy = props.colorBy || 'status';

    const key = structureKey(nodes, edges);
    // Canvas size (bucketed) drives column spacing. Null until measured.
    const sizeS = React.useState(null);
    const canvas = sizeS[0], setCanvas = sizeS[1];
    const cw = canvas ? canvas.w : 0, ch = canvas ? canvas.h : 0;
    const layout = React.useMemo(() => CC.layoutFlow(nodes, edges, { fitWidth: cw, fitHeight: ch, dropImplied: !props.dashUnnamed }), [key, cw, ch]);
    const nb = React.useMemo(() => neighbours(layout), [layout]);
    const idRef = React.useRef(null);
    if (idRef.current == null) idRef.current = 'cc-flow-' + (++uid);
    const mid = idRef.current;
    // The fit never zooms below the layout's legible scale; wider graphs anchor left and pan.
    // Review: a graph with room to spare opens larger (up to MAX_FIT), using the canvas width and
    // height with the camera's 24 px margin. The camera never zooms an automatic fit past 1, so it
    // works in boosted units: bounds and the zoom floor are scaled, and K is the zoom on screen.
    const boost = cw > 0 && ch > 0 && nodes.length
      ? Math.max(1, Math.min(MAX_FIT, (cw - 48) / Math.max(1, layout.width), (ch - 48) / Math.max(1, layout.height))) : 1;
    const cam = CC.useCamera({ x: 0, y: 0, w: layout.width * boost, h: layout.height * boost }, props.cameraKey, { minFit: layout.fitScale / boost });
    const K = cam.k * boost;
    // The camera's own resize observer keeps its first render's zoom floor; refit with this one.
    const camRef = React.useRef(cam);
    camRef.current = cam;
    const lastFit = React.useRef(null);
    // Horizontal offset on top of the camera: the edge buttons and "keep the selection in view"
    // move it; a fit resets it.
    const shiftS = React.useState(0);
    const shift = shiftS[0], setShift = shiftS[1];
    React.useEffect(() => {
      if (moved.current || !canvas || lastFit.current === layout) return;
      lastFit.current = layout;
      setShift(0);
      camRef.current.fit();
    }, [layout]);
    const moved = React.useRef(props.cameraKey ? !!movedStore[props.cameraKey] : false);
    const setMoved = (v) => { moved.current = v; if (props.cameraKey) movedStore[props.cameraKey] = v; };
    const measure = () => {
      const el = cam.ref.current;
      if (!el || !el.getBoundingClientRect) return;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return;
      const w = Math.floor(r.width / SIZE_STEP) * SIZE_STEP, hh = Math.floor(r.height / SIZE_STEP) * SIZE_STEP;
      setCanvas((c) => (c && c.w === w && c.h === hh ? c : { w: w, h: hh }));
    };
    (React.useLayoutEffect || React.useEffect)(() => {
      // Measure before first paint; a stored manual camera keeps its layout as it was.
      if (!canvas || !moved.current) measure();
    }, [key]);
    React.useEffect(() => {
      const el = cam.ref.current;
      if (!el) return undefined;
      const onWheel = () => setMoved(true);
      if (el.addEventListener) el.addEventListener('wheel', onWheel, { passive: true });
      const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
        if (moved.current) return;
        measure();
        camRef.current.fit();
      });
      if (ro) ro.observe(el);
      return () => {
        if (el.removeEventListener) el.removeEventListener('wheel', onWheel);
        if (ro) ro.disconnect();
      };
    }, []);
    function onPointerDown(e) {
      cam.onPointerDown(e);
      if (e.button !== 0 || typeof window === 'undefined') return;
      const up = () => { window.removeEventListener('pointerup', up); if (cam.wasDrag()) setMoved(true); };
      window.addEventListener('pointerup', up);
    }
    // What is off the visible canvas (screen px), for the edge buttons.
    const viewW = cw || 0;
    const left0 = cam.x + shift + 16 * K, right0 = cam.x + shift + (layout.width - 16) * K;
    const offLeft = viewW > 0 && left0 < -1, offRight = viewW > 0 && right0 > viewW + 1;
    const panBy = (dir) => {
      const step = Math.max(120, Math.round(viewW * 0.7));
      setShift((s0) => {
        const lo = Math.min(0, viewW - 24 - (cam.x + (layout.width - 16) * K)), hi = Math.max(0, 24 - (cam.x + 16 * K));
        return Math.max(lo, Math.min(hi, s0 + (dir < 0 ? step : -step)));
      });
    };
    // The inspector opening (or a click near the edge) never leaves the selected card under it or
    // under an edge button. It re-checks after an automatic fit, but never fights the user's own pan.
    const prevSel = React.useRef(null);
    React.useEffect(() => {
      const fresh = prevSel.current !== selected;
      prevSel.current = selected;
      if (moved.current && !fresh) return;
      const p = selected && layout.nodes[selected];
      if (!p || !(viewW > 0)) return;
      const m = 48, x0 = cam.x + shift + p.x * K, x1 = cam.x + shift + (p.x + p.w) * K;
      if (x1 > viewW - m) setShift(shift - (x1 - (viewW - m)));
      else if (x0 < m) setShift(shift + (m - x0));
    }, [selected, viewW, layout, cam.x, K]);
    const showMeta = 11 * K >= META_MIN_PX;
    const chars = layout.labelChars || 18;
    // Zoomed out so far that 12 px labels would render under 11 px: draw them at 11 px on screen
    // (fewer characters, two lines when the layout made two-line cards) with the dot scaled to match.
    const small = 12 * K < 11 - 1e-9;
    const sc = small ? 11 / (12 * K) : 1;
    const lines = layout.lines === 2 ? 2 : 1;

    const byId = {};
    nodes.forEach((n) => { byId[String(n.id)] = n; });
    const visible = (id) => byId[id] && CC.matchesFilter(byId[id], filter);
    // C10: per-node check counts and dependants blocked by a failing check upstream.
    // Without check_counts.js (older tests/bundles) nothing is blocked and no badge is drawn.
    const hasChecks = typeof CC.checkCounts === 'function';
    const blocked = React.useMemo(() => (hasChecks ? CC.blockedByFailedCheck(nodes) : {}), [nodes]);
    const failing = (id) => hasChecks && byId[id] && CC.checkCounts(byId[id]).last === 'fail' && CC.statusOf(byId[id]) !== 'done';

    function onKeyDown(e) {
      if (e.key === 'f' || e.key === 'F' || e.key === '0') { setMoved(false); setShift(0); measure(); }
      if (cam.onKeyDown(e)) {
        if (['+', '=', '-', '_'].indexOf(e.key) >= 0) setMoved(true);
        return;
      }
      const ids = Object.keys(layout.nodes);
      if (!ids.length) return;
      if (e.key === 'Escape') { onSelect(null); return; }
      if (e.key === 'Enter' && selected) { e.preventDefault(); (props.onOpen || onSelect)(selected); return; }
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      if (!selected || !layout.nodes[selected]) { onSelect(layout.layers[0][0]); return; }
      const cur = layout.nodes[selected];
      let next = null;
      if (e.key === 'ArrowRight') next = (nb.succ[selected] || [])[0];
      else if (e.key === 'ArrowLeft') next = (nb.pred[selected] || [])[0];
      else {
        const lay = layout.layers[cur.layer];
        next = lay[cur.order + (e.key === 'ArrowDown' ? 1 : -1)];
      }
      if (next) onSelect(next);
    }

    const marker = (id, cls) => h('marker', {
      key: id, id: id, viewBox: '0 0 8 8', refX: 8, refY: 4, markerWidth: 7, markerHeight: 7,
      markerUnits: 'userSpaceOnUse', orient: 'auto'
    }, h('path', { d: 'M0 0.5L8 4L0 7.5z', className: cls }));

    // W9: with dashUnnamed (Plan review) an edge whose dependant names nothing crossing it is dashed.
    // Only nodes that carry a `crosses` map count, so boards without loop data stay solid.
    const unnamed = (e) => {
      if (!props.dashUnnamed) return false;
      const dst = byId[e.reversed ? e.source : e.target], src = e.reversed ? e.target : e.source;
      if (!dst || !dst.crosses || typeof dst.crosses !== 'object') return false;
      return !String(dst.crosses[src] || '').trim();
    };
    // Kind glyph (top right of the node): code is a small square, splitter a fork, gate a diamond.
    const kindGlyph = (kind, w, top) => {
      const g = { className: 'cc-kind cc-kind-' + kind, fill: 'none', strokeWidth: 1.25 };
      const x = w - 14, y = top == null ? 5 : top;
      if (kind === 'code') return h('rect', Object.assign({ x: x, y: y, width: 8, height: 8 }, g));
      if (kind === 'gate') return h('path', Object.assign({ d: 'M' + (x + 4) + ' ' + y + 'L' + (x + 8) + ' ' + (y + 4) + 'L' + (x + 4) + ' ' + (y + 8) + 'L' + x + ' ' + (y + 4) + 'z' }, g));
      if (kind === 'splitter') return h('path', Object.assign({ d: 'M' + x + ' ' + (y + 4) + 'H' + (x + 3) + 'M' + (x + 3) + ' ' + (y + 4) + 'L' + (x + 8) + ' ' + y + 'M' + (x + 3) + ' ' + (y + 4) + 'L' + (x + 8) + ' ' + (y + 8) }, g));
      return null;
    };
    const edgeEls = layout.edges.map((e) => {
      const sel = selected && (e.source === selected || e.target === selected);
      const faded = !(visible(e.source) && visible(e.target));
      const blk = !!blocked[e.target] && (failing(e.source) || !!blocked[e.source]);
      return h('path', {
        key: e.id,
        d: CC.roundedPath(e.points, 6),
        className: 'cc-edge' + (sel ? ' cc-edge-sel' : '') + (blk ? ' cc-edge-blocked' : '') + (faded ? ' cc-faded' : ''),
        strokeDasharray: unnamed(e) ? '4 3' : undefined,
        markerEnd: 'url(#' + mid + (sel ? '-as' : '-a') + ')'
      });
    });

    const nodeEls = Object.keys(layout.nodes).map((id) => {
      const p = layout.nodes[id];
      const n = byId[id] || { id: id };
      const st = CC.statusOf(n);
      const sel = id === selected;
      const lane = colorBy === 'lane' ? CC.laneIndex(n.lane || n.pool) : null;
      const by = blocked[id];
      const counts = hasChecks ? CC.checkCounts(n) : null;
      const badge = counts ? CC.checkBadge(counts) : null;
      const code = isCodeNode(n);
      const kind = code ? 'code' : n.kind;
      const line = counts ? CC.checkLine(counts) : '';
      const glyphW = kind ? 2 : 0;
      const tx = 20 * sc;
      const room = small ? Math.max(4, Math.floor((p.w - tx - 4 - (kind ? 12 * sc : 0)) / (6.1 * sc))) : chars - glyphW;
      const fs = small ? { fontSize: (11 / K).toFixed(2) + 'px' } : undefined;
      const title = n.title || id;
      let labelEl;
      const meta2 = showMeta && !small;
      let metaY = p.h / 2 + 11;
      if (small && lines === 2 && 2.45 * (11 / K) + 8 <= p.h) {
        const f = 11 / K, parts = wrap2(title, room), b1 = parts.length > 1 ? p.h / 2 - 0.22 * f : p.h / 2 + 0.36 * f;
        labelEl = h('text', { className: 'cc-t-label', x: tx, y: b1, style: fs },
          parts.map((t, i) => h('tspan', { key: i, x: tx, dy: i ? 1.2 * f : 0 }, t)));
      } else if (!small && lines === 2) {
        // Two full 12 px lines before the ellipsis, then the meta line; the block is centred.
        const parts = wrap2(title, room);
        const top = (p.h - (parts.length * 14 + (meta2 ? 13 : 0))) / 2;
        labelEl = h('text', { className: 'cc-t-label', x: tx, y: top + 11 },
          parts.map((t, i) => h('tspan', { key: i, x: tx, dy: i ? 14 : 0 }, t)));
        metaY = top + parts.length * 14 + 10;
      } else {
        const ly = small ? p.h / 2 + 0.36 * (11 / K) : (showMeta ? p.h / 2 - 3 : p.h / 2 + 4);
        labelEl = h('text', { className: 'cc-t-label', x: tx, y: ly, style: fs }, clip(title, room));
      }
      const tip = (n.title || id) + ' — ' + CC.statusLabel(st) + (code ? ' · Code' : '') +
        (line ? '; ' + line.charAt(0).toLowerCase() + line.slice(1) : '') + (by ? '. ' + CC.blockedLine(by) : '');
      return h('g', {
        key: id,
        className: 'cc-node cc-st-' + st + (sel ? ' cc-sel' : '') + (by ? ' cc-blocked' : '') + (visible(id) ? '' : ' cc-faded'),
        transform: 'translate(' + p.x + ',' + p.y + ')',
        'data-id': id,
        'data-kind': kind || undefined,
        onClick: (ev) => { ev.stopPropagation(); if (!cam.wasDrag()) onSelect(id); },
        onDoubleClick: () => { if (props.onOpen) props.onOpen(id); }
      },
      h('title', null, tip),
      h('rect', { className: 'cc-hit', x: 0, y: 0, width: p.w, height: p.h, rx: 6 }),
      sc === 1
        ? h(CC.StatusDot, { status: st, cx: 9, cy: p.h / 2, lane: lane })
        : h('g', { transform: 'translate(' + (9 * sc) + ',' + (p.h / 2) + ') scale(' + sc.toFixed(3) + ')' }, h(CC.StatusDot, { status: st, cx: 0, cy: 0, lane: lane })),
      kind ? (sc === 1 ? kindGlyph(kind, p.w)
        : h('g', { transform: 'translate(' + (p.w - 14 * sc) + ',' + (4 * sc) + ') scale(' + sc.toFixed(3) + ')' }, kindGlyph(kind, 14, 0))) : null,
      labelEl,
      showMeta && !small ? h('text', { className: 'cc-t-meta', x: tx, y: metaY }, metaLine(n, !!by, chars + 2 - (badge ? badge.length + 1 : 0))) : null,
      showMeta && !small && badge ? h('text', {
        className: 'cc-t-meta cc-check cc-check-' + counts.last, x: p.w - 6, y: metaY, textAnchor: 'end'
      }, badge) : null);
    });

    return h('div', {
      ref: cam.ref,
      className: 'cc-graph cc-flow',
      tabIndex: 0,
      role: 'group',
      'aria-label': 'Task flow. Arrow keys move along edges, F fits, 0 shows all.',
      onPointerDown: onPointerDown,
      onKeyDown: onKeyDown,
      onClick: () => { if (!cam.wasDrag() && props.deselectOnBackground) onSelect(null); }
    },
    nodes.length === 0
      ? h('div', { className: 'cc-meta', style: { padding: 16 } }, 'No tasks yet')
      : h('svg', { 'aria-hidden': 'false' },
        h('defs', null, marker(mid + '-a', 'cc-arrow'), marker(mid + '-as', 'cc-arrow-sel')),
        h('g', { transform: 'translate(' + (cam.x + shift) + ',' + cam.y + ') scale(' + K + ')' },
          h('g', { className: 'cc-edges' }, edgeEls),
          h('g', { className: 'cc-nodes' }, nodeEls))),
    nodes.length && offLeft ? h('button', { className: 'cc-pan cc-pan-l', type: 'button', 'aria-label': 'Scroll left', title: 'Scroll left',
      onPointerDown: (ev) => ev.stopPropagation(), onClick: (ev) => { ev.stopPropagation(); panBy(-1); } }, '\u2039') : null,
    nodes.length && offRight ? h('button', { className: 'cc-pan cc-pan-r', type: 'button', 'aria-label': 'Scroll right', title: 'Scroll right',
      onPointerDown: (ev) => ev.stopPropagation(), onClick: (ev) => { ev.stopPropagation(); panBy(1); } }, '\u203a') : null);
  }

  CC.FlowView = FlowView;
})(CC);
