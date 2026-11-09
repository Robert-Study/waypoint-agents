// waves.js [views, C4] - pure wave grouping for the List view.
// Wave = node.wave when given (engine: longest-path depth, 0-based), else computed from deps.
// Current wave = lowest wave that still has an unfinished (not done) node; null when all done.
(function (CC) {
  'use strict';

  function computeWaves(nodes) {
    const byId = {};
    nodes.forEach((n) => { byId[String(n.id)] = n; });
    const memo = {};
    const visiting = {};
    function depth(id) {
      if (memo[id] != null) return memo[id];
      if (visiting[id]) return 0; // cycle guard
      visiting[id] = true;
      const n = byId[id];
      let d = 0;
      (n && n.deps ? n.deps : []).forEach((p) => {
        if (byId[String(p)]) d = Math.max(d, depth(String(p)) + 1);
      });
      visiting[id] = false;
      memo[id] = d;
      return d;
    }
    const out = {};
    nodes.forEach((n) => {
      const w = n.wave;
      out[String(n.id)] = typeof w === 'number' && isFinite(w) ? w : depth(String(n.id));
    });
    return out;
  }

  function groupWaves(nodesIn) {
    const nodes = (nodesIn || []).filter((n) => n && n.id != null);
    const wave = computeWaves(nodes);
    const map = {};
    nodes.forEach((n) => {
      const w = wave[String(n.id)];
      (map[w] = map[w] || { wave: w, nodes: [], done: 0, total: 0 }).nodes.push(n);
    });
    const waves = Object.keys(map).map(Number).sort((a, b) => a - b).map((w) => {
      const g = map[w];
      g.total = g.nodes.length;
      g.done = g.nodes.filter((n) => CC.statusOf(n) === 'done').length;
      return g;
    });
    let current = null;
    for (let i = 0; i < waves.length; i++) {
      if (waves[i].done < waves[i].total) { current = waves[i].wave; break; }
    }
    return { waves: waves, current: current };
  }

  CC.groupWaves = groupWaves;
  CC.computeWaves = computeWaves;
})(CC);
