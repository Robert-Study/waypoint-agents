// layout_flow.js [views, C2] - pure layered left-to-right layout (no React, testable in node).
// Longest-path layering, dummy nodes for long edges, >= 8 barycenter sweeps with transpose,
// order-preserving vertical placement (isotonic regression), orthogonal edge routing.
(function (CC) {
  'use strict';

  // Cards: a status dot, then a label of labelChars characters per line (full title on hover and
  // in the inspector). With fitWidth / fitHeight (canvas px) the card width comes from the free
  // width, clamped to minNodeW..maxNodeW (U1 review: never compress columns into stubs). A graph
  // that is still wider than the canvas keeps 160 px cards and pans horizontally: its fit zoom
  // never drops below legibleK (12 px labels render at 11 px or more).
  const DEFAULTS = {
    nodeW: 0, nodeH: 32, gapX: 56, minGapX: 18, panGapX: 28, gapY: 20, dummyGap: 12, pad: 16, sweeps: 12,
    labelChars: 18, charW: 6.1, textX: 20, textPad: 4, minNodeW: 160, minFitNodeW: 136, maxNodeW: 240,
    labelPx: 12, legiblePx: 11, fitWidth: 0, fitHeight: 0, fitPad: 24
  };

  // Column sizing for n layers and a graph of the given height:
  // {nodeW, gapX, labelChars, scale, panX}, where scale is the zoom the opening fit uses.
  function chooseSizing(n, height, o) {
    const widthFor = (c) => Math.round(o.textX + c * o.charW + o.textPad);
    const charsFor = (w) => Math.max(1, Math.floor((w - o.textX - o.textPad) / o.charW));
    const fixedW = o.nodeW > 0 ? o.nodeW : 0;
    const maxC = Math.max(1, o.labelChars | 0);
    if (!(o.fitWidth > 0)) return { nodeW: fixedW || widthFor(maxC), gapX: o.gapX, labelChars: maxC, scale: 1, panX: false };
    const availW = Math.max(1, o.fitWidth - 2 * o.fitPad);
    const availH = o.fitHeight > 0 ? Math.max(1, o.fitHeight - 2 * o.fitPad) : Infinity;
    const kH = Math.min(1, availH / Math.max(1, height));
    const inner = availW - 2 * o.pad;
    let g = o.gapX;
    let w = fixedW || Math.floor((inner - (n - 1) * g) / n);
    if (!fixedW && w < o.minNodeW) {
      // Shrink the gaps first; if 160 px cards still do not fit, keep roomy gaps and pan.
      w = o.minNodeW;
      g = n > 1 ? Math.floor((inner - n * w) / (n - 1)) : o.gapX;
      if (g < o.minGapX) {
        // Tightest gaps still fit at a legible zoom: keep them; otherwise pan with roomier gaps.
        const tight = 2 * o.pad + n * w + (n - 1) * o.minGapX;
        const legible = Math.min(1, o.legiblePx / o.labelPx);
        if (availW / tight >= legible - 1e-9) g = o.minGapX;
        else {
          // Review: a graph a little wider than the canvas should not clip its last column on
          // first open. Narrower cards (down to minFitNodeW) at full size, else at the legible
          // zoom, before falling back to 160 px cards and a pan.
          const at = (k) => Math.floor((availW / k - 2 * o.pad - (n - 1) * o.minGapX) / n);
          const w1 = at(1), wl = at(legible);
          if (w1 >= o.minFitNodeW) { w = Math.min(w, w1); g = o.minGapX; }
          else if (wl >= o.minFitNodeW) { w = Math.min(w, wl); g = o.minGapX; }
          else g = Math.max(o.minGapX, Math.min(o.gapX, o.panGapX));
        }
      }
    }
    if (!fixedW) w = Math.min(o.maxNodeW, w);
    const W = 2 * o.pad + n * w + (n - 1) * g;
    const legibleK = Math.min(1, o.legiblePx / o.labelPx);
    let scale = Math.min(1, availW / W, kH);
    if (scale < legibleK - 1e-9) scale = Math.max(legibleK, kH);
    return { nodeW: w, gapX: g, labelChars: charsFor(w), scale: scale, panX: W * scale > availW + 1e-6 };
  }

  function edgeEnds(e) {
    if (Array.isArray(e)) return [e[0], e[1]];
    if (!e) return [undefined, undefined];
    return [e.source != null ? e.source : (e.from != null ? e.from : e.src),
      e.target != null ? e.target : (e.to != null ? e.to : e.dst)];
  }
  function idOf(v) { return v != null && typeof v === 'object' ? v.id : v; }

  // Normalise edges; fall back to node.deps when no edge list is given.
  function normalizeEdges(nodes, edges, has) {
    const out = [];
    const seen = {};
    const add = (s, t) => {
      s = idOf(s); t = idOf(t);
      if (s == null || t == null || s === t || !has[s] || !has[t]) return;
      const key = s + '\u0001' + t;
      if (seen[key]) return;
      seen[key] = 1;
      out.push([String(s), String(t)]);
    };
    if (edges && edges.length) edges.forEach((e) => { const p = edgeEnds(e); add(p[0], p[1]); });
    else nodes.forEach((n) => (n.deps || []).forEach((d) => add(d, n.id)));
    return out;
  }

  // Review 2: an edge that another path already implies (a->c when a->b->c) draws nothing new;
  // drop it so the board shows only the edges that carry information. Cycles are left alone.
  function dropImplied(edges) {
    if (edges.length > 4000) return edges;
    const out = {};
    edges.forEach((e) => { (out[e[0]] = out[e[0]] || []).push(e[1]); });
    const reach = (from, to, skip) => {
      const seen = {}, stack = (out[from] || []).filter((x) => x !== skip);
      while (stack.length) {
        const v = stack.pop();
        if (v === to) return true;
        if (seen[v] || v === from) continue;
        seen[v] = 1;
        (out[v] || []).forEach((w) => stack.push(w));
      }
      return false;
    };
    const keep = edges.filter((e) => !reach(e[0], e[1], e[1]));
    return keep.length ? keep : edges;
  }

  // Count crossings between consecutive layers. layers: [[id]], succ: {id:[id]}.
  function countCrossings(layers, succ) {
    let total = 0;
    for (let L = 0; L + 1 < layers.length; L++) total += crossingsBetween(layers[L], layers[L + 1], succ);
    return total;
  }
  function crossingsBetween(upper, lower, succ) {
    const pos = {};
    lower.forEach((id, i) => { pos[id] = i; });
    const segs = [];
    upper.forEach((u, i) => (succ[u] || []).forEach((v) => { if (pos[v] != null) segs.push([i, pos[v]]); }));
    let c = 0;
    for (let a = 0; a < segs.length; a++) {
      for (let b = a + 1; b < segs.length; b++) {
        const s = segs[a], t = segs[b];
        if ((s[0] - t[0]) * (s[1] - t[1]) < 0) c++;
      }
    }
    return c;
  }

  // Pool-adjacent-violators: closest non-decreasing sequence to z (least squares).
  function isotonic(z) {
    const blocks = [];
    z.forEach((v) => {
      blocks.push({ sum: v, n: 1 });
      while (blocks.length > 1) {
        const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
        if (a.sum / a.n <= b.sum / b.n) break;
        a.sum += b.sum; a.n += b.n; blocks.pop();
      }
    });
    const out = [];
    blocks.forEach((b) => { for (let i = 0; i < b.n; i++) out.push(b.sum / b.n); });
    return out;
  }

  // Crossing minimisation on integer ids. Several starts (input order, depth-first order,
  // reversed, seeded shuffles); each gets >= 8 alternating down/up barycenter sweeps with a
  // transpose pass after every sweep, then sifting. The best ordering seen is kept, so the
  // result is never worse than the naive input order.
  function minimizeCrossings(layersIn, succMap, predMap, o) {
    const ids = [];
    const ix = {};
    layersIn.forEach((l) => l.forEach((id) => { ix[id] = ids.length; ids.push(id); }));
    const P = ids.length;
    const succ = ids.map((id) => succMap[id].map((x) => ix[x]));
    const pred = ids.map((id) => predMap[id].map((x) => ix[x]));
    const maxL = layersIn.length - 1;
    const pos = new Int32Array(P);
    let order = layersIn.map((l) => l.map((id) => ix[id]));
    const setPos = (L) => { const a = order[L]; for (let i = 0; i < a.length; i++) pos[a[i]] = i; };
    const setAll = () => { for (let L = 0; L <= maxL; L++) setPos(L); };

    function crossBetween(L) {
      // inversions among target positions, edges ordered by (source pos, target pos)
      const seqT = [];
      const up = order[L];
      for (let i = 0; i < up.length; i++) {
        const t = succ[up[i]].map((v) => pos[v]).sort((a, b) => a - b);
        for (let j = 0; j < t.length; j++) seqT.push(t[j]);
      }
      const n = order[L + 1].length;
      const bit = new Int32Array(n + 1);
      let c = 0, seen = 0;
      for (let k = 0; k < seqT.length; k++) {
        const t = seqT[k];
        let le = 0;
        for (let i = t + 1; i > 0; i -= i & -i) le += bit[i];
        c += seen - le;
        for (let i = t + 1; i <= n; i += i & -i) bit[i]++;
        seen++;
      }
      return c;
    }
    const total = () => { let c = 0; for (let L = 0; L < maxL; L++) c += crossBetween(L); return c; };
    // crossings contributed by a and b (a above b) with both neighbouring layers
    function pairCost(a, b) {
      let c = 0;
      const pa = pred[a], pb = pred[b], sa = succ[a], sb = succ[b];
      for (let i = 0; i < pa.length; i++) for (let j = 0; j < pb.length; j++) if (pos[pa[i]] > pos[pb[j]]) c++;
      for (let i = 0; i < sa.length; i++) for (let j = 0; j < sb.length; j++) if (pos[sa[i]] > pos[sb[j]]) c++;
      return c;
    }
    function sortByBary(L, adj) {
      const lay = order[L];
      const bary = new Float64Array(lay.length);
      const keyOf = {};
      lay.forEach((v, i) => {
        const nb = adj[v];
        let s = 0;
        for (let j = 0; j < nb.length; j++) s += pos[nb[j]];
        bary[i] = nb.length ? s / nb.length : i;
        keyOf[v] = i;
      });
      order[L] = lay.slice().sort((a, b) => (bary[keyOf[a]] - bary[keyOf[b]]) || (keyOf[a] - keyOf[b]));
      setPos(L);
    }
    function transpose() {
      for (let guard = 0; guard < 20; guard++) {
        let improved = false;
        for (let L = 0; L <= maxL; L++) {
          const lay = order[L];
          for (let i = 0; i + 1 < lay.length; i++) {
            const a = lay[i], b = lay[i + 1];
            if (pairCost(b, a) < pairCost(a, b)) { lay[i] = b; lay[i + 1] = a; pos[a] = i + 1; pos[b] = i; improved = true; }
          }
        }
        if (!improved) break;
      }
    }
    function sift() {
      for (let pass = 0; pass < 4; pass++) {
        let improved = false;
        for (let L = 0; L <= maxL; L++) {
          if (order[L].length < 2) continue;
          order[L].slice().forEach((v) => {
            const rest = order[L].filter((x) => x !== v);
            const curIdx = order[L].indexOf(v);
            // cost relative to v at the front; moving v past w adds pairCost(w,v) - pairCost(v,w)
            let cost = 0, bestCost = 0, bestK = 0, curCost = null;
            if (curIdx === 0) curCost = 0;
            for (let k = 0; k < rest.length; k++) {
              const w = rest[k];
              cost += pairCost(w, v) - pairCost(v, w);
              if (k + 1 === curIdx) curCost = cost;
              if (cost < bestCost) { bestCost = cost; bestK = k + 1; }
            }
            if (bestCost < curCost) {
              order[L] = rest.slice(0, bestK).concat([v], rest.slice(bestK));
              setPos(L);
              improved = true;
            }
          });
        }
        if (!improved) break;
      }
    }

    setAll();
    const naive = total();
    let best = order.map((l) => l.slice());
    let bestC = naive;
    const dfsRank = new Int32Array(P).fill(-1);
    let seq = 0;
    const visit = (v) => {
      if (dfsRank[v] >= 0) return;
      dfsRank[v] = seq++;
      succ[v].forEach(visit);
    };
    (order[0] || []).forEach(visit);
    for (let v = 0; v < P; v++) visit(v);
    const base = order.map((l) => l.slice());
    const starts = [
      base,
      base.map((l) => l.slice().sort((a, b) => dfsRank[a] - dfsRank[b])),
      base.map((l) => l.slice().reverse())
    ];
    let rs = 0x2545f491;
    const rnd = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return (rs >>> 0) / 4294967296; };
    // Seeded shuffled restarts (deterministic); the budget shrinks as the graph grows.
    const extra = o.restarts != null ? o.restarts : (P <= 60 ? 32 : P <= 120 ? 12 : P <= 300 ? 4 : 0);
    for (let s = 0; s < extra; s++) {
      starts.push(base.map((l) => {
        const a = l.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }));
    }
    const sweeps = Math.max(8, o.sweeps | 0);
    const keep = () => {
      const c = total();
      if (c < bestC) { bestC = c; best = order.map((l) => l.slice()); }
    };
    for (let s = 0; s < starts.length && bestC > 0; s++) {
      order = starts[s].map((l) => l.slice());
      setAll();
      keep();
      for (let it = 0; it < sweeps && bestC > 0; it++) {
        if (it % 2 === 0) for (let L = 1; L <= maxL; L++) sortByBary(L, pred);
        else for (let L = maxL - 1; L >= 0; L--) sortByBary(L, succ);
        transpose();
        keep();
      }
      if (bestC > 0) { sift(); transpose(); keep(); }
    }
    return { order: best.map((l) => l.map((v) => ids[v])), crossings: bestC, naive: naive };
  }

  // Review 2: a disconnected component sits directly under the ones above it (one row gap in
  // the layers it spans), never in a band of empty canvas. Components keep their order; only
  // upward moves are made, so nothing can overlap.
  function packComponents(order, y, hOf, succ, o) {
    const parent = {};
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    order.forEach((lay) => lay.forEach((id) => { parent[id] = id; }));
    Object.keys(succ).forEach((a) => (succ[a] || []).forEach((b) => { if (parent[a] != null && parent[b] != null) parent[find(a)] = find(b); }));
    const comps = {}, layerOf = {};
    order.forEach((lay, L) => lay.forEach((id) => { layerOf[id] = L; const r = find(id); (comps[r] = comps[r] || []).push(id); }));
    const roots = Object.keys(comps);
    if (roots.length < 2) return;
    const top = (r) => Math.min.apply(null, comps[r].map((id) => y[id] - hOf(id) / 2));
    roots.sort((a, b) => top(a) - top(b));
    const bottom = order.map(() => -Infinity);   // per layer: lowest box edge placed so far
    roots.forEach((r, i) => {
      const ids = comps[r];
      if (i > 0) {
        let room = Infinity;
        ids.forEach((id) => { const L = layerOf[id]; if (bottom[L] > -Infinity) room = Math.min(room, (y[id] - hOf(id) / 2) - (bottom[L] + o.gapY)); });
        if (room > 0.5 && isFinite(room)) ids.forEach((id) => { y[id] -= room; });
      }
      ids.forEach((id) => { const L = layerOf[id]; bottom[L] = Math.max(bottom[L], y[id] + hOf(id) / 2); });
    });
  }

  // Two-line cards (U1 review): when some title is longer than one line, cards get two full
  // lines before the ellipsis.
  const TWO_LINE_H = 48;
  function layoutFlow(nodesIn, edgesIn, options) {
    const opts = options || {};
    const one = layoutOnce(nodesIn, edgesIn, opts);
    one.lines = 1;
    const o = Object.assign({}, DEFAULTS, opts);
    if (!(o.fitWidth > 0) || opts.nodeH) return one;
    const long = (nodesIn || []).some((n) => n && String(n.title || n.id || '').length > one.labelChars - (n.kind ? 2 : 0));
    if (!long) return one;
    const two = layoutOnce(nodesIn, edgesIn, Object.assign({}, opts, { nodeH: TWO_LINE_H, gapY: 14 }));
    const availH = o.fitHeight > 0 ? Math.max(1, o.fitHeight - 2 * o.fitPad) : Infinity;
    const legibleK = Math.min(1, o.legiblePx / o.labelPx);
    // Review 2: two full lines at every canvas size while the zoom stays legible; a graph taller
    // than the canvas pans vertically rather than cutting every title to one line.
    if (two.fitScale < legibleK - 1e-9 || (two.height * two.fitScale > availH + 1e-6 && opts.preferOneLine)) return one;
    two.lines = 2;
    return two;
  }

  function layoutOnce(nodesIn, edgesIn, options) {
    const o = Object.assign({}, DEFAULTS, options || {});
    const nodes = [];
    const has = {};
    (nodesIn || []).forEach((n) => {
      if (!n || n.id == null) return;
      const id = String(n.id);
      if (has[id]) return;
      has[id] = 1;
      nodes.push(Object.assign({}, n, { id: id }));
    });
    const ids = nodes.map((n) => n.id);
    const rank = {};
    ids.forEach((id, i) => { rank[id] = i; });
    let edges = normalizeEdges(nodes, edgesIn, has);
    if (o.dropImplied) edges = dropImplied(edges);

    // Break cycles defensively (display only): DFS in input order, reverse back edges.
    const out0 = {};
    ids.forEach((id) => { out0[id] = []; });
    edges.forEach((e) => out0[e[0]].push(e[1]));
    const state = {};
    const back = {};
    ids.forEach((root) => {
      if (state[root]) return;
      const stack = [[root, 0]];
      state[root] = 1;
      while (stack.length) {
        const top = stack[stack.length - 1];
        const nxt = out0[top[0]][top[1]++];
        if (nxt === undefined) { state[top[0]] = 2; stack.pop(); continue; }
        if (state[nxt] === 1) back[top[0] + '\u0001' + nxt] = 1;
        else if (!state[nxt]) { state[nxt] = 1; stack.push([nxt, 0]); }
      }
    });
    edges = edges.map((e) => (back[e[0] + '\u0001' + e[1]] ? [e[1], e[0], true] : e));

    // Longest-path layering (Kahn, input order).
    const preds = {}, succs = {}, indeg = {};
    ids.forEach((id) => { preds[id] = []; succs[id] = []; indeg[id] = 0; });
    edges.forEach((e) => {
      if (succs[e[0]].indexOf(e[1]) >= 0) return;
      succs[e[0]].push(e[1]); preds[e[1]].push(e[0]); indeg[e[1]]++;
    });
    const layer = {};
    const queue = ids.filter((id) => indeg[id] === 0);
    ids.forEach((id) => { layer[id] = 0; });
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi];
      succs[u].forEach((v) => {
        layer[v] = Math.max(layer[v], layer[u] + 1);
        if (--indeg[v] === 0) queue.push(v);
      });
    }
    let maxL = 0;
    ids.forEach((id) => { maxL = Math.max(maxL, layer[id]); });

    // Proper graph with dummy chains. Long edges share dummies (edge concentration): a dummy
    // is keyed by its source, so a fan-out travels as one trunk; the last dummy before a
    // target fed by several long edges is keyed by that target, so a fan-in arrives as one.
    const layers = [];
    for (let L = 0; L <= maxL; L++) layers.push([]);
    ids.forEach((id) => layers[layer[id]].push(id));
    const isDummy = {};
    const pSucc = {}, pPred = {};
    ids.forEach((id) => { pSucc[id] = []; pPred[id] = []; });
    const longIn = {};
    edges.forEach((e) => {
      if (layer[e[1]] - layer[e[0]] > 1) (longIn[e[1]] = longIn[e[1]] || {})[e[0]] = 1;
    });
    const fanIn = (t) => Object.keys(longIn[t] || {}).length > 1;
    const link = (a, b) => { if (pSucc[a].indexOf(b) < 0) { pSucc[a].push(b); pPred[b].push(a); } };
    const chains = [];
    const made = {};
    edges.forEach((e) => {
      const s = e[0], t = e[1];
      if (succs[s].indexOf(t) < 0 || made[s + '|' + t]) return;
      made[s + '|' + t] = 1;
      const chain = [s];
      for (let L = layer[s] + 1; L < layer[t]; L++) {
        const d = L === layer[t] - 1 && fanIn(t) ? '\u0000t' + t + ':' + L : '\u0000s' + s + ':' + L;
        if (!isDummy[d]) {
          isDummy[d] = true; pSucc[d] = []; pPred[d] = [];
          layer[d] = L;
          layers[L].push(d);
        }
        chain.push(d);
      }
      chain.push(t);
      for (let i = 0; i + 1 < chain.length; i++) link(chain[i], chain[i + 1]);
      chains.push({ id: (e[2] ? t + '->' + s : s + '->' + t), source: e[2] ? t : s, target: e[2] ? s : t, reversed: !!e[2], chain: chain });
    });

    // Crossing minimisation (see minimizeCrossings).
    const mc = minimizeCrossings(layers, pSucc, pPred, o);
    const naive = mc.naive;
    const bestC = mc.crossings;
    const order = mc.order;

    // Vertical placement: keep order, pull towards neighbours (isotonic regression).
    const hOf = (id) => (isDummy[id] ? 0 : o.nodeH);
    const y = {};
    const offsets = order.map((lay) => {
      const off = [0];
      for (let i = 1; i < lay.length; i++) {
        const a = lay[i - 1], b = lay[i];
        const gap = isDummy[a] || isDummy[b] ? o.dummyGap : o.gapY;
        off.push(off[i - 1] + (hOf(a) + hOf(b)) / 2 + gap);
      }
      return off;
    });
    order.forEach((lay, L) => lay.forEach((id, i) => { y[id] = offsets[L][i]; }));
    function place(L, adjs) {
      const lay = order[L];
      if (!lay.length) return;
      const desired = lay.map((id) => {
        const nb = [];
        adjs.forEach((adj) => adj[id].forEach((x) => nb.push(y[x])));
        return nb.length ? nb.reduce((a, b) => a + b, 0) / nb.length : y[id];
      });
      const z = isotonic(desired.map((d, i) => d - offsets[L][i]));
      lay.forEach((id, i) => { y[id] = z[i] + offsets[L][i]; });
    }
    for (let r = 0; r < 6; r++) {
      for (let L = 1; L <= maxL; L++) place(L, [pPred]);
      for (let L = maxL - 1; L >= 0; L--) place(L, [pSucc]);
    }
    for (let L = 0; L <= maxL; L++) place(L, [pPred, pSucc]);

    let minTop = Infinity, maxBot = -Infinity;
    Object.keys(y).forEach((id) => {
      minTop = Math.min(minTop, y[id] - hOf(id) / 2);
      maxBot = Math.max(maxBot, y[id] + hOf(id) / 2);
    });
    if (!isFinite(minTop)) { minTop = 0; maxBot = 0; }
    const shift = o.pad - minTop;
    Object.keys(y).forEach((id) => { y[id] = Math.round(y[id] + shift); });

    // Straighten: remove tiny jogs (< 4 px) on edge chains when spacing allows.
    const slot = {};
    order.forEach((lay) => lay.forEach((id, i) => { slot[id] = i; }));
    const minSep = (a, b) => (hOf(a) + hOf(b)) / 2 + (isDummy[a] || isDummy[b] ? o.dummyGap : o.gapY) - 1;
    function canMove(id, ny) {
      const lay = order[layer[id]], i = slot[id];
      const prev = lay[i - 1], next = lay[i + 1];
      return (prev == null || ny - y[prev] >= minSep(prev, id)) && (next == null || y[next] - ny >= minSep(id, next));
    }
    chains.forEach((c) => {
      for (let i = 1; i < c.chain.length; i++) {
        const a = c.chain[i - 1], b = c.chain[i];
        const d = Math.abs(y[a] - y[b]);
        if (d === 0 || d >= 4) continue;
        if (isDummy[b] && canMove(b, y[a])) y[b] = y[a];
        else if (isDummy[a] && canMove(a, y[b])) y[a] = y[b];
      }
    });
    packComponents(order, y, hOf, pSucc, o);
    minTop = Infinity; maxBot = -Infinity;
    Object.keys(y).forEach((id) => {
      minTop = Math.min(minTop, y[id] - hOf(id) / 2);
      maxBot = Math.max(maxBot, y[id] + hOf(id) / 2);
    });
    if (!isFinite(minTop)) { minTop = 0; maxBot = 0; }
    if (Math.abs(minTop - o.pad) > 0.5) { const d = o.pad - minTop; Object.keys(y).forEach((id) => { y[id] = Math.round(y[id] + d); }); maxBot += d; minTop = o.pad; }
    // Column sizing waits until here: it depends on the layer count and the final height.
    const sizing = chooseSizing(maxL + 1, (maxBot - minTop) + 2 * o.pad, o);
    o.nodeW = sizing.nodeW;
    o.gapX = sizing.gapX;
    const colX = (L) => o.pad + L * (o.nodeW + o.gapX);

    const outNodes = {};
    order.forEach((lay, L) => {
      let i = 0;
      lay.forEach((id) => {
        if (isDummy[id]) return;
        outNodes[id] = { x: colX(L), y: y[id] - o.nodeH / 2, w: o.nodeW, h: o.nodeH, cy: y[id], layer: L, order: i++ };
      });
    });

    // Orthogonal routing. Vertical runs sit in the gap between layers; runs leaving the
    // same item share a track so fan-outs read as one trunk.
    const gapItems = {};
    chains.forEach((c) => {
      for (let i = 0; i + 1 < c.chain.length; i++) {
        const a = c.chain[i], b = c.chain[i + 1];
        if (Math.abs(y[a] - y[b]) < 0.5) continue;
        const L = layer[a];
        (gapItems[L] = gapItems[L] || {})[a] = 1;
      }
    });
    const track = {};
    Object.keys(gapItems).forEach((L) => {
      const keys = Object.keys(gapItems[L]).sort((a, b) => y[a] - y[b]);
      // One trunk per gap (U1 review): every vertical run between two columns shares one bus x.
      keys.forEach((k) => { track[L + '|' + k] = colX(+L) + o.nodeW + o.gapX * 0.5; });
    });
    const outEdges = chains.map((c) => {
      const pts = [];
      const push = (px, py) => {
        px = Math.round(px * 100) / 100; py = Math.round(py * 100) / 100;
        const last = pts[pts.length - 1];
        if (last && last[0] === px && last[1] === py) return;
        pts.push([px, py]);
      };
      for (let i = 0; i + 1 < c.chain.length; i++) {
        const a = c.chain[i], b = c.chain[i + 1];
        const L = layer[a];
        if (i === 0) push(colX(L) + o.nodeW, y[a]);
        if (Math.abs(y[a] - y[b]) >= 0.5) {
          const tx = track[L + '|' + a];
          push(tx, y[a]);
          push(tx, y[b]);
        }
        const bx = colX(L + 1);
        push(bx, y[b]);
        if (isDummy[b]) push(bx + o.nodeW, y[b]);
      }
      // drop collinear interior points
      const clean = pts.filter((p, i) => {
        if (i === 0 || i === pts.length - 1) return true;
        const a = pts[i - 1], b = pts[i + 1];
        return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
      });
      return { id: c.id, source: c.source, target: c.target, reversed: c.reversed, points: clean };
    });

    return {
      nodes: outNodes,
      edges: outEdges,
      width: colX(maxL) + o.nodeW + o.pad,
      height: (maxBot - minTop) + 2 * o.pad,
      crossings: bestC,
      naiveCrossings: naive,
      labelChars: sizing.labelChars,
      nodeW: o.nodeW,
      gapX: o.gapX,
      fitScale: sizing.scale,
      panX: sizing.panX,
      layers: order.map((l) => l.filter((id) => !isDummy[id])),
      properLayers: order,
      properSucc: pSucc
    };
  }

  // SVG path through orthogonal points with small rounded corners.
  function roundedPath(points, radius) {
    if (!points || !points.length) return '';
    const r0 = radius == null ? 6 : radius;
    const f = (n) => Math.round(n * 100) / 100;
    let d = 'M' + f(points[0][0]) + ' ' + f(points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i - 1], c = points[i], n = points[i + 1];
      const l1 = Math.hypot(c[0] - p[0], c[1] - p[1]), l2 = Math.hypot(n[0] - c[0], n[1] - c[1]);
      const r = Math.min(r0, l1 / 2, l2 / 2);
      if (r <= 0.01) { d += 'L' + f(c[0]) + ' ' + f(c[1]); continue; }
      const ax = c[0] - (c[0] - p[0]) / l1 * r, ay = c[1] - (c[1] - p[1]) / l1 * r;
      const bx = c[0] + (n[0] - c[0]) / l2 * r, by = c[1] + (n[1] - c[1]) / l2 * r;
      d += 'L' + f(ax) + ' ' + f(ay) + 'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(bx) + ' ' + f(by);
    }
    const last = points[points.length - 1];
    return d + 'L' + f(last[0]) + ' ' + f(last[1]);
  }

  CC.layoutFlow = layoutFlow;
  CC.countCrossings = countCrossings;
  CC.roundedPath = roundedPath;
  CC.normalizeEdges = function (nodes, edges) {
    const has = {};
    (nodes || []).forEach((n) => { has[String(n.id)] = 1; });
    return normalizeEdges(nodes || [], edges, has);
  };
})(CC);
