// layout_star.js [views, C3] - deterministic seeded force layout (pure; run once, then frozen).
// Same nodes + links + seed => identical positions, independent of input order.
(function (CC) {
  'use strict';
  const sqrt = Math.sqrt;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedOf(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
    let x = 2166136261;
    const s = String(seed == null ? 'cc' : seed);
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function clusterOf(n) {
    const c = n.cluster != null ? n.cluster : (n.lane != null ? n.lane : (n.kind != null ? n.kind : ''));
    return String(c);
  }
  function linkEnds(l) {
    if (Array.isArray(l)) return [l[0], l[1]];
    const s = l.source != null ? l.source : (l.from != null ? l.from : l.src);
    const t = l.target != null ? l.target : (l.to != null ? l.to : l.dst);
    return [s && typeof s === 'object' ? s.id : s, t && typeof t === 'object' ? t.id : t];
  }

  // Two-phase layout so clusters never overlap:
  // 1. each cluster is a disc sized for its members; discs are placed by a small force
  //    model (pulled together by the links between them, pushed apart by hard collision with
  //    a clear gap for hull padding and the cluster name), on a wide ellipse for screens;
  // 2. members start on a sunflower spiral inside their disc (heaviest at the centre), then
  //    relax with local repulsion and link springs, clamped to the disc.
  function importanceOrder(members, deg) {
    return members.slice().sort((p, q) => (q.weight - p.weight) || (deg[q.i] - deg[p.i]) || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  }

  function layoutStar(nodesIn, linksIn, seed, options) {
    const o = Object.assign({ spacing: 30, gap: 120, aspect: 1.6, iterations: 0 }, options || {});
    const seen = {};
    const nodes = [];
    (nodesIn || []).forEach((n) => {
      if (!n || n.id == null || seen[String(n.id)]) return;
      seen[String(n.id)] = 1;
      nodes.push({ id: String(n.id), cluster: clusterOf(n), weight: Math.max(0, +n.weight || 1) });
    });
    nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const n = nodes.length;
    const out = {};
    if (!n) return out;
    const index = {};
    nodes.forEach((d, i) => { index[d.id] = i; d.i = i; });

    const linkSet = {};
    const links = [];
    (linksIn || []).forEach((l) => {
      const e = linkEnds(l);
      const a = index[String(e[0])], b = index[String(e[1])];
      if (a == null || b == null || a === b) return;
      const key = a < b ? a + ',' + b : b + ',' + a;
      if (linkSet[key]) return;
      linkSet[key] = 1;
      links.push(a < b ? [a, b] : [b, a]);
    });
    links.sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]));
    const deg = new Float64Array(n);
    links.forEach((l) => { deg[l[0]]++; deg[l[1]]++; });

    const rng = mulberry32(seedOf(seed));
    const clusters = Array.from(new Set(nodes.map((d) => d.cluster))).sort();
    const C = clusters.length;
    const cIndex = {};
    clusters.forEach((c, i) => { cIndex[c] = i; });
    const ci = new Int32Array(n);
    nodes.forEach((d, i) => { ci[i] = cIndex[d.cluster]; });
    const members = clusters.map(() => []);
    nodes.forEach((d) => members[cIndex[d.cluster]].push(d));
    const step = o.spacing / 1.9; // sunflower: nearest-neighbour distance ~ 1.9 * step
    const R = members.map((m) => step * sqrt(m.length) + 6);

    // Phase 1: cluster discs.
    const cx = new Float64Array(C), cy = new Float64Array(C);
    if (C > 1) {
      const W = [];
      for (let a = 0; a < C; a++) W.push(new Float64Array(C));
      let maxW = 0;
      links.forEach((l) => {
        const a = ci[l[0]], b = ci[l[1]];
        if (a === b) return;
        W[a][b]++; W[b][a]++;
        maxW = Math.max(maxW, W[a][b]);
      });
      let ring = 0;
      R.forEach((r) => { ring += 2 * r + o.gap; });
      ring /= 2 * Math.PI;
      const rot = rng() * 2 * Math.PI;
      for (let a = 0; a < C; a++) {
        const t = rot + (2 * Math.PI * a) / C;
        cx[a] = Math.cos(t) * ring * sqrt(o.aspect);
        cy[a] = Math.sin(t) * ring / sqrt(o.aspect);
      }
      const minD = (a, b) => R[a] + R[b] + o.gap;
      const collide = () => {
        for (let a = 0; a < C; a++) {
          for (let b = a + 1; b < C; b++) {
            let dx = cx[b] - cx[a], dy = cy[b] - cy[a];
            let d = sqrt(dx * dx + dy * dy);
            if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
            const need = minD(a, b);
            if (d >= need) continue;
            const push = (need - d) / d;
            const wa = R[b] * R[b] / (R[a] * R[a] + R[b] * R[b]);
            cx[a] -= dx * push * wa; cy[a] -= dy * push * wa;
            cx[b] += dx * push * (1 - wa); cy[b] += dy * push * (1 - wa);
          }
        }
      };
      const fx = new Float64Array(C), fy = new Float64Array(C);
      for (let it = 0; it < 400; it++) {
        const alpha = 1 - it / 400;
        fx.fill(0); fy.fill(0);
        for (let a = 0; a < C; a++) {
          for (let b = a + 1; b < C; b++) {
            if (!W[a][b]) continue;
            const dx = cx[b] - cx[a], dy = cy[b] - cy[a];
            const d = sqrt(dx * dx + dy * dy) || 1;
            const f = 0.02 * (W[a][b] / maxW) * (d - minD(a, b));
            fx[a] += dx / d * f; fy[a] += dy / d * f;
            fx[b] -= dx / d * f; fy[b] -= dy / d * f;
          }
          // anisotropic gravity: the arrangement ends wider than tall, like the canvas
          fx[a] -= cx[a] * 0.01;
          fy[a] -= cy[a] * 0.01 * o.aspect * o.aspect;
        }
        for (let a = 0; a < C; a++) { cx[a] += fx[a] * alpha; cy[a] += fy[a] * alpha; }
        collide();
      }
      for (let k = 0; k < 60; k++) collide();
    }

    // Phase 2: members inside their disc.
    const x = new Float64Array(n), y = new Float64Array(n);
    const golden = Math.PI * (3 - sqrt(5));
    members.forEach((m, c) => {
      const rot = rng() * 2 * Math.PI;
      importanceOrder(m, deg).forEach((d, k) => {
        const r = step * sqrt(k + 0.5);
        const t = rot + k * golden;
        x[d.i] = cx[c] + Math.cos(t) * r;
        y[d.i] = cy[c] + Math.sin(t) * r;
      });
    });
    const iters = o.iterations > 0 ? o.iterations : (n <= 400 ? 160 : Math.max(40, Math.floor(160 * 400 / n)));
    const s2 = o.spacing * o.spacing;
    const fx = new Float64Array(n), fy = new Float64Array(n);
    for (let it = 0; it < iters; it++) {
      const alpha = 1 - it / iters;
      fx.fill(0); fy.fill(0);
      members.forEach((m) => {
        for (let p = 0; p < m.length; p++) {
          const i = m[p].i;
          for (let q = p + 1; q < m.length; q++) {
            const j = m[q].i;
            let dx = x[i] - x[j], dy = y[i] - y[j];
            let d2 = dx * dx + dy * dy;
            if (d2 > 1.44 * s2) continue;
            if (d2 < 0.01) { dx = ((i * 7 + j * 13) % 11) / 11 - 0.5; dy = ((i * 3 + j * 5) % 7) / 7 - 0.5; d2 = dx * dx + dy * dy + 0.01; }
            const d = sqrt(d2);
            const f = 0.35 * s2 / d2;
            fx[i] += dx / d * f; fy[i] += dy / d * f;
            fx[j] -= dx / d * f; fy[j] -= dy / d * f;
          }
        }
      });
      for (let k = 0; k < links.length; k++) {
        const i = links[k][0], j = links[k][1];
        const dx = x[j] - x[i], dy = y[j] - y[i];
        const d = sqrt(dx * dx + dy * dy) || 0.01;
        const same = ci[i] === ci[j];
        if (same && d < o.spacing * 1.4) continue;
        const f = (same ? 0.03 : 0.0012) * (d - o.spacing);
        fx[i] += dx / d * f / sqrt(deg[i]); fy[i] += dy / d * f / sqrt(deg[i]);
        fx[j] -= dx / d * f / sqrt(deg[j]); fy[j] -= dy / d * f / sqrt(deg[j]);
      }
      for (let i = 0; i < n; i++) {
        const sp = sqrt(fx[i] * fx[i] + fy[i] * fy[i]);
        const cap = o.spacing * 0.3 * alpha + 0.2;
        const k = sp > cap ? cap / sp : 1;
        x[i] += fx[i] * k; y[i] += fy[i] * k;
        const c = ci[i];
        const dx = x[i] - cx[c], dy = y[i] - cy[c];
        const d = sqrt(dx * dx + dy * dy);
        if (d > R[c]) { x[i] = cx[c] + dx / d * R[c]; y[i] = cy[c] + dy / d * R[c]; }
      }
    }
    nodes.forEach((d, i) => { out[d.id] = { x: Math.round(x[i] * 100) / 100, y: Math.round(y[i] * 100) / 100 }; });
    return out;
  }

  function starBounds(positions, pad) {
    const p = pad == null ? 40 : pad;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.keys(positions || {}).forEach((id) => {
      const q = positions[id];
      minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y);
    });
    if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: minX - p, y: minY - p, w: maxX - minX + 2 * p, h: maxY - minY + 2 * p };
  }

  // Convex hull per cluster (Andrew's monotone chain), for soft hulls + centroid labels.
  function hull(points) {
    const pts = points.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    pts.forEach((p) => { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); });
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  function clusterHulls(nodes, positions) {
    const groups = {};
    (nodes || []).forEach((nd) => {
      const p = positions[String(nd.id)];
      if (!p) return;
      const c = clusterOf(nd);
      (groups[c] = groups[c] || []).push([p.x, p.y]);
    });
    return Object.keys(groups).sort().filter((c) => c !== '').map((c) => {
      const pts = groups[c];
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const top = pts.reduce((a, p) => Math.min(a, p[1]), Infinity);
      return { key: c, points: hull(pts), cx: cx, cy: cy, top: top, size: pts.length };
    });
  }

  CC.layoutStar = layoutStar;
  CC.starBounds = starBounds;
  CC.clusterHulls = clusterHulls;
  CC.clusterOf = clusterOf;
  CC.seededRandom = function (seed) { return mulberry32(seedOf(seed)); };
})(CC);
