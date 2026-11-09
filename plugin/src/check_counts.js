// check_counts.js [views, C10] - per-node check counts and "blocked by a failing check" (pure).
// The board sends `checks: [passed, failed, last]` per node (last 'pass'|'fail'|null), or null when
// the done-check has never run. Without the field (older engine) the counts come from the node's
// status and actor: only a `check:<type>` actor is a check result.
(function (CC) {
  'use strict';

  function checkCounts(node) {
    const n = node || {};
    let passed = 0, failed = 0, last = null;
    const c = n.checks;
    if (Array.isArray(c)) {
      passed = +c[0] || 0; failed = +c[1] || 0; last = c[2] === 'pass' || c[2] === 'fail' ? c[2] : null;
    } else if (c && typeof c === 'object') {
      passed = +c.passed || 0; failed = +c.failed || 0; last = c.last === 'pass' || c.last === 'fail' ? c.last : null;
    } else if (c === undefined && typeof n.actor === 'string' && n.actor.indexOf('check:') === 0) {
      if (n.status === 'done') { passed = 1; last = 'pass'; } else if (n.status === 'error') { failed = 1; last = 'fail'; }
    }
    if (last === null && passed + failed > 0) last = failed && !passed ? 'fail' : 'pass';
    return { passed: passed, failed: failed, runs: passed + failed, pending: last === null ? 1 : 0, last: last };
  }

  // A node's check is failing when its last run failed and it is not done (the owner's "done" overrides).
  function isFailing(n) { return checkCounts(n).last === 'fail' && CC.statusOf(n) !== 'done'; }

  // {id: [failing upstream ids]} for every not-done node with a failing check upstream. A done
  // node is a firewall: what it already produced stands, so the block does not pass through it.
  function blockedByFailedCheck(board) {
    const nodes = Array.isArray(board) ? board : ((board && board.nodes) || []);
    const byId = {};
    nodes.forEach((n) => { if (n && n.id != null) byId[String(n.id)] = n; });
    const memo = {}, busy = {};
    function upstream(id) {
      if (memo[id]) return memo[id];
      if (busy[id]) return {};
      busy[id] = true;
      const out = {};
      ((byId[id] && byId[id].deps) || []).forEach((d) => {
        d = String(d);
        const dn = byId[d];
        if (!dn) return;
        if (isFailing(dn)) out[d] = true;
        if (CC.statusOf(dn) === 'done') return;
        Object.keys(upstream(d)).forEach((k) => { out[k] = true; });
      });
      busy[id] = false;
      memo[id] = out;
      return out;
    }
    const result = {};
    Object.keys(byId).forEach((id) => {
      if (CC.statusOf(byId[id]) === 'done') return;
      const ids = Object.keys(upstream(id)).filter((k) => k !== id).sort();
      if (ids.length) result[id] = ids;
    });
    return result;
  }

  function checkLine(c) {
    if (!c || c.last === null) return 'Check not run yet';
    return 'Check ' + (c.last === 'fail' ? 'failing' : 'passing') + ' · ' + c.passed + ' of ' + c.runs +
      (c.runs === 1 ? ' run' : ' runs') + ' passed';
  }
  function blockedLine(ids) {
    return ids && ids.length ? 'Blocked: the check on ' + ids.join(', ') + ' is failing' : null;
  }
  // Short badge text for a Flow node, or null when the check has not run (no badge).
  function checkBadge(c) {
    if (!c || c.last === null) return null;
    return (c.last === 'fail' ? '✕ ' : '✓ ') + c.passed + '/' + c.runs;
  }

  CC.checkCounts = checkCounts;
  CC.blockedByFailedCheck = blockedByFailedCheck;
  CC.checkLine = checkLine;
  CC.blockedLine = blockedLine;
  CC.checkBadge = checkBadge;
})(CC);
