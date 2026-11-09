// page_models.js [worker-a, M2/M3] - CC.ModelsPage: every agent, subagent and model dsh is set up
// with (engine/cc_engine/models.py, GET /api/models), an enable tick per row, and the Google AI
// Studio (Gemini API) key pool switcher (GET/POST /api/models/gemini_keys), kept apart from Antigravity.
// Views: All (grouped by kind), Agent picker (flat table by Elo), Subagents (select-all list).
// Unknown values stay blank; one model per multi-model pool shows until the pool is expanded.
(function (CC) {
  'use strict';
  const h = CC.h;

  const STYLE = [
    '.cc-root.cc-md{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);color:var(--cc-text);color-scheme:light;}',
    '@media (prefers-color-scheme: dark){.cc-root.cc-md:not([data-theme="light"]){color-scheme:dark;}}',
    '.cc-root.cc-md[data-theme="dark"],html[data-theme="dark"] .cc-root.cc-md,body.dark .cc-root.cc-md,body.theme-dark .cc-root.cc-md{color-scheme:dark;}',
    '.cc-root.cc-md.cc-md-embedded{height:auto;background:transparent;}',
    // The view switch and options: one toolbar row (embedded) or the header's middle (standalone).
    '.cc-root .cc-md-bar{display:flex;align-items:center;gap:12px;min-height:32px;padding:0 0 8px;flex:none;flex-wrap:wrap;}',
    '.cc-root .cc-md-meta{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-md-gap{flex:1;}',
    '.cc-root .cc-md-opt{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--cc-text-2);white-space:nowrap;cursor:pointer;}',
    '.cc-root .cc-md-opt input[type="checkbox"]{accent-color:var(--cc-accent);width:14px;height:14px;margin:0;}',
    '.cc-root .cc-md-scroll{flex:1;min-height:0;overflow:auto;}',
    '.cc-root .cc-md-embedded .cc-md-scroll{overflow:visible;}',
    '.cc-root.cc-md-page .cc-md-scroll{padding:8px 16px 16px;}',
    '.cc-root.cc-md-page .cc-md-bar{padding:0;}',
    // Fixed layout: the table never pushes the page sideways; long cells end in an ellipsis. 32 px rows.
    '.cc-root .cc-md-table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:12px;}',
    '.cc-root .cc-md-table th,.cc-root .cc-md-table td{padding:0 12px 0 0;height:32px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-sticky th{position:sticky;top:0;z-index:1;height:28px;background:var(--cc-bg);font-size:11px;font-weight:500;color:var(--cc-text-3);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-table th,.cc-root .cc-md-table th.cc-num{font-family:inherit;}',
    '.cc-root .cc-md-table col.cc-md-c-provider{width:20%;}',
    '.cc-root .cc-md-table col.cc-md-c-elo{width:64px;}',
    '.cc-root .cc-md-table col.cc-md-c-context{width:72px;}',
    '.cc-root .cc-md-table col.cc-md-c-speed{width:104px;}',
    '.cc-root .cc-md-table col.cc-md-c-usage{width:128px;}',
    '.cc-root .cc-md-table col.cc-md-c-effort{width:30%;}',
    // Below 1200 px Speed folds to a zero-width column (hiding its cells would shift Usage into its slot).
    '@media (max-width:1199px){.cc-root .cc-md-table col.cc-md-c-speed{width:0;}.cc-root .cc-md-table [data-col="speed"]{visibility:hidden;padding:0;}}',
    '.cc-root .cc-md-table .cc-num{text-align:right;font-family:inherit;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-md-table td.cc-md-tick,.cc-root .cc-md-table th.cc-md-tick{padding:0 12px 0 8px;overflow:visible;text-overflow:clip;}',
    '.cc-root .cc-md-table td.cc-md-tick .cc-sw,.cc-root .cc-md-table td.cc-md-tick input{display:block;}',
    '.cc-root .cc-md-group th{height:32px;padding-top:8px;font-size:12px;font-weight:600;color:var(--cc-text);background:var(--cc-bg);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-group .cc-md-meta{margin-left:8px;font-weight:400;}',
    '.cc-root .cc-md-table tr[data-id]:hover td{background:var(--cc-wash);}',
    '.cc-root .cc-md-off td{color:var(--cc-text-3);}',
    '.cc-root .cc-md-name{display:flex;align-items:center;gap:8px;max-width:420px;min-width:0;}',
    '.cc-root .cc-md-label{overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-md-tag{flex:none;font-size:11px;height:18px;line-height:16px;padding:0 6px;border:1px solid var(--cc-line-strong);border-radius:999px;color:var(--cc-text-2);}',
    // "Native" is quiet meta text after the name, not a badge (badges are only for action).
    '.cc-root .cc-md-native{flex:none;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-md-dim{color:var(--cc-text-3);}',
    '.cc-root .cc-md-bad{color:var(--cc-error);border-color:var(--cc-error);}',
    '.cc-root .cc-md-down{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-error);}',
    // Usage: a thin meter and "55% · 5 h", right-aligned; an old reading is dimmer.
    '.cc-root .cc-md-use{display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;}',
    '.cc-root .cc-md-mbar{position:relative;flex:none;width:40px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-md-mbar span{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-done);}',
    '.cc-root .cc-md-dim .cc-md-mbar span{background:var(--cc-text-3);}',
    '.cc-root .cc-md-low .cc-md-mbar span{background:var(--cc-error);}',
    '.cc-root .cc-md-more td{height:28px;}',
    '.cc-root .cc-md-link{border:0;background:transparent;color:var(--cc-accent);font:inherit;font-size:11px;padding:0;cursor:pointer;}',
    '.cc-root .cc-md-link:focus-visible,.cc-root .cc-md-btn:focus-visible,.cc-root .cc-md input:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    // The enable switch: the kit switch (28x16) drawn on a checkbox.
    '.cc-root input.cc-md-sw{appearance:none;display:block;width:28px;height:16px;margin:0;border:0;border-radius:999px;background:var(--cc-line-strong);position:relative;cursor:pointer;}',
    '.cc-root input.cc-md-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--cc-surface);transition:transform var(--cc-fast) var(--cc-ease);}',
    '.cc-root input.cc-md-sw:checked{background:var(--cc-accent);}',
    '.cc-root input.cc-md-sw:checked::after{transform:translateX(12px);}',
    '.cc-root .cc-md-sec{padding:12px 0;border-top:1px solid var(--cc-line);display:flex;flex-direction:column;gap:4px;margin-top:12px;}',
    '.cc-root .cc-md-sec-h{font-size:12px;font-weight:600;}',
    '.cc-root .cc-md-note{font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-md-note.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-md-keys{border-collapse:collapse;font-size:12px;width:100%;max-width:720px;}',
    '.cc-root .cc-md-keys th,.cc-root .cc-md-keys td{padding:0 12px 0 0;height:32px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-md-keys th{height:28px;font-size:11px;font-weight:500;color:var(--cc-text-3);}',
    '.cc-root .cc-md-on{color:var(--cc-done);font-weight:500;}',
    '.cc-root .cc-md-btn{height:24px;padding:0 8px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:11px;font-weight:500;cursor:pointer;}',
    '.cc-root .cc-md-btn:hover:not(:disabled){background:var(--cc-surface-2);}',
    '.cc-root .cc-md-btn:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-md-list{padding:4px 0;max-width:760px;}',
    '.cc-root .cc-md-empty{padding:8px 0;font-size:12px;color:var(--cc-text-3);}',
    '.cc-root.cc-md-page .cc-md-empty{padding:16px;}',
    '@media (prefers-reduced-motion: reduce){.cc-root input.cc-md-sw::after{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (typeof document === 'undefined' || document.getElementById('cc-models-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-models-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ------------------------------------------------------------ pure helpers (node-testable)
  const KIND_TITLES = { chat: 'Chat models', subagent: 'Subagents', agent: 'Agents', manual: 'Manual' };
  const KIND_HINTS = {
    chat: 'dsh chat picker models',
    subagent: 'runners the chat can prompt',
    agent: 'Waypoint dispatch routes and your own agents',
    manual: 'Copy Prompt hand-offs'
  };
  const PROVIDER_NAMES = {
    anthropic: 'Anthropic', antigravity: 'Antigravity (agy)', 'openai-codex': 'OpenAI Codex', google: 'Google',
    manual: 'Manual', freebuff: 'Freebuff', groq: 'Groq', 'github-copilot': 'GitHub Copilot'
  };
  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

  function fmtContext(n) {
    if (!n || typeof n !== 'number') return '';
    if (n >= 1000000) {
      const v = n / (n % 1048576 === 0 ? 1048576 : 1000000);
      return (Math.round(v * 10) / 10) + 'M';
    }
    return (n % 1024 === 0 ? n / 1024 : Math.round(n / 1000)) + 'K';
  }
  function fmtElo(r) { return r && typeof r.elo === 'number' ? '~' + r.elo : ''; }
  function effortText(r) {
    const m = (r && r.elo_by_effort) || {};
    return EFFORTS.filter(function (e) { return m[e] && m[e] !== 'n/a'; })
      .map(function (e) { return e + ' ' + m[e]; }).join(' · ');
  }
  function fmtReset(iso, now) {
    if (!iso) return '';
    const t = new Date(iso);
    if (isNaN(t.getTime())) return '';
    const n = now || new Date();
    const pad = function (x) { return (x < 10 ? '0' : '') + x; };
    if (t.getTime() - n.getTime() < 86400000 && t.getTime() > n.getTime()) return pad(t.getHours()) + ':' + pad(t.getMinutes());
    return t.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getMonth()];
  }
  function fmtUsage(u, now) {
    if (!u || typeof u.remaining_percent !== 'number') return '';
    const reset = fmtReset(u.resets_at, now);
    return Math.round(u.remaining_percent) + '%' + (reset ? ' · resets ' + reset : '');
  }
  // Display case for bare provider ids: a small map, then title case ("some-host" -> "Some Host").
  const PROVIDER_CASE = { deepseek: 'DeepSeek', ollama: 'Ollama', openai: 'OpenAI', openrouter: 'OpenRouter', mistral: 'Mistral', xai: 'xAI', qwen: 'Qwen' };
  function displayCase(id) {
    const s = String(id || '');
    if (!s) return '';
    if (PROVIDER_CASE[s.toLowerCase()]) return PROVIDER_CASE[s.toLowerCase()];
    return s.split(/[-_\s]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function providerName(r) {
    if (r.provider_label) return String(r.provider_label).replace(/^\d+\.\s*/, '');
    return PROVIDER_NAMES[r.provider] || displayCase(r.provider);
  }
  // The provider's name only: "Freebuff ($0 Unmetered Pool)" -> "Freebuff". The full label stays in the tooltip.
  function providerShort(r) {
    return providerName(r).replace(/\s*\([^)]*\)\s*$/, '');
  }
  function routeText(r) {
    if (r.kind === 'agent' && !r.route) return 'none (own use)';
    return r.route || '';
  }
  function hasRole(r, role) { return (r.roles || []).indexOf(role) >= 0; }

  // Rows to show: hide no-access rows unless asked; per multi-model pool only the strongest unless
  // the pool is expanded (or showAll). Returns [{row}|{more: {pool, hidden, label}}] in order.
  function visibleRows(rows, opts) {
    const o = opts || {};
    const expanded = new Set(o.expanded || []);
    const shown = rows.filter(function (r) { return o.showNoAccess || r.access !== false; });
    const out = [];
    const seenPool = {};
    shown.forEach(function (r) {
      const pooled = r.pool && (r.pool_size || 1) > 1 && !o.showAll;
      if (!pooled || expanded.has(r.pool)) { out.push({ row: r }); return; }
      if (r.strongest) out.push({ row: r });
      if (!seenPool[r.pool]) {
        seenPool[r.pool] = true;
        const members = shown.filter(function (x) { return x.pool === r.pool; });
        const hidden = members.filter(function (x) { return !x.strongest; }).length;
        if (hidden) out.push({ more: { pool: r.pool, hidden: hidden, label: providerShort(r) }, after: r.pool });
      }
    });
    // A "more" marker sits right after its pool's strongest row.
    const ordered = [];
    const pending = {};
    out.forEach(function (e) { if (e.more) pending[e.more.pool] = e; });
    out.forEach(function (e) {
      if (e.more) return;
      ordered.push(e);
      if (e.row.pool && pending[e.row.pool] && e.row.strongest) { ordered.push(pending[e.row.pool]); delete pending[e.row.pool]; }
    });
    Object.keys(pending).forEach(function (k) { ordered.push(pending[k]); });
    return ordered;
  }
  function byElo(a, b) {
    const ea = typeof a.elo === 'number' ? a.elo : -1;
    const eb = typeof b.elo === 'number' ? b.elo : -1;
    return eb - ea;
  }
  function agentRows(rows, opts) {
    const list = rows.filter(function (r) { return hasRole(r, 'agent'); });
    return visibleRows(list, opts).filter(function (e) { return e.row; }).map(function (e) { return e.row; })
      .map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return byElo(a.r, b.r) || a.i - b.i; })
      .map(function (x) { return x.r; });
  }
  function subagentRows(rows, opts) {
    const list = rows.filter(function (r) { return hasRole(r, 'subagent'); });
    return visibleRows(list, opts).filter(function (e) { return e.row; }).map(function (e) { return e.row; });
  }

  // ------------------------------------------------------------ actions
  function errText(e) {
    if (e && e.status === 403) return 'Only the owner can change this';
    return (e && e.data && e.data.detail) || (e && e.message) || 'The engine did not answer.';
  }

  // ------------------------------------------------------------ pieces
  // The enable switch: the kit's 28x16 Toggle (as in Settings); a bare checkbox only where ui.js is not loaded.
  function Tick(props) {
    const UI = CC.ui;
    if (UI && typeof UI.Toggle === 'function') {
      return h(UI.Toggle, { checked: !!props.checked, label: (props.checked ? 'Turn off ' : 'Turn on ') + props.label,
        title: props.checked ? 'On: click to turn off' : 'Off: click to turn on', onChange: function () { props.onChange(); } });
    }
    return h('input', {
      type: 'checkbox', className: 'cc-md-sw', checked: !!props.checked, 'aria-label': (props.checked ? 'Turn off ' : 'Turn on ') + props.label,
      title: props.checked ? 'On: click to turn off' : 'Off: click to turn on', onChange: props.onChange
    });
  }

  // The shared route-health source (toggles.js): a model whose route cannot run greys out, reason in the tooltip.
  function routeDown(r) {
    const T = CC.toggles;
    if (!T || typeof T.downReason !== 'function' || !r) return null;
    try { return (r.route && T.downReason(r.route)) || T.downReason(r.id) || null; } catch (e) { return null; }
  }
  function rowClass(r) { return r.enabled && !routeDown(r) ? null : 'cc-md-off'; }

  function NameCell(r) {
    const tags = [];
    const down = routeDown(r);
    if (r.run_natively) {
      tags.push(h('span', { key: 'n', className: 'cc-md-native', title: r.run_natively_reason || 'Better used in its own app' }, 'Native'));
    }
    if (down) {
      tags.push(h('span', { key: 'r', className: 'cc-md-down', title: down, role: 'img', 'aria-label': 'Down: ' + down }));
    } else if (r.health && r.health.ok === false) {
      const why = r.health.reason || 'Failed its last health check';
      tags.push(h('span', { key: 'h', className: 'cc-md-down', title: why, role: 'img', 'aria-label': 'Down: ' + why }));
    }
    if (r.access === false) tags.push(h('span', { key: 'a', className: 'cc-md-tag', title: 'Not on your plan right now' }, 'No access'));
    return h('div', { className: 'cc-md-name' },
      h('span', { className: 'cc-md-label', title: [r.id, r.note, r.strongest_rule ? 'Pool pick: ' + r.strongest_rule : null].filter(Boolean).join('\n') }, r.label),
      tags);
  }

  // "Claude 5 hours" -> "5 h", "Codex week (all models)" -> "week"; '' when the label names no window.
  function windowOf(u) {
    const l = String((u && (u.label || u.pool)) || '').toLowerCase();
    const hrs = /(\d+)\s*(?:h\b|hours?|hrs?|_?h$)/.exec(l);
    if (hrs) return hrs[1] + ' h';
    const w = /(week|day|month)/.exec(l);
    return w ? w[1] : '';
  }
  // Usage as a thin meter and "55% · 5 h"; the reset and the pool name sit in the tooltip.
  function usageCell(r) {
    const u = r.usage;
    const known = !!(u && typeof u.remaining_percent === 'number');
    const stale = !!(u && u.status === 'STALE');
    const pct = known ? Math.max(0, Math.min(100, Math.round(u.remaining_percent))) : 0;
    const win = known ? windowOf(u) : '';
    const reset = known ? fmtReset(u.resets_at) : '';
    const title = u ? [u.label || u.pool, known ? pct + '% left' : null, reset ? 'resets ' + reset : null, stale ? 'last read earlier' : null].filter(Boolean).join(' · ') : null;
    return h('td', { key: 'u', 'data-col': 'usage', className: 'cc-num' + (stale ? ' cc-md-dim' : '') + (known && !stale && pct < 15 ? ' cc-md-low' : ''), title: title },
      known ? h('span', { className: 'cc-md-use' },
        h('span', { className: 'cc-md-mbar', 'aria-hidden': 'true' }, h('span', { style: { width: Math.max(2, pct) + '%' } })),
        h('span', null, pct + '%' + (win ? ' · ' + win : ''))) : null);
  }


  function factTitle(r, key) {
    return (r.sources && r.sources[key]) || null;
  }

  // Column widths for the fixed-layout tables; Name takes what is left.
  function Cols(names) {
    return h('colgroup', null, names.map(function (n) {
      return h('col', { key: n, className: 'cc-md-c-' + n, style: n === 'tick' ? { width: 48 } : undefined });
    }));
  }

  function AllTable(p) {
    const rows = p.rows;
    const kinds = p.kinds;
    const head = h('thead', { className: 'cc-md-sticky' }, h('tr', null,
      h('th', { className: 'cc-md-tick' }, h('span', { className: 'cc-md-meta' }, 'On')),
      h('th', null, 'Name'), h('th', { 'data-col': 'provider' }, 'Provider'), h('th', { className: 'cc-num' }, 'Elo'),
      h('th', { className: 'cc-num' }, 'Context'), h('th', { 'data-col': 'speed' }, 'Speed'), h('th', { className: 'cc-num' }, 'Usage')));
    const bodies = kinds.map(function (kind) {
      const mine = rows.filter(function (r) { return r.kind === kind; });
      if (!mine.length) return null;
      const entries = visibleRows(mine, p.opts);
      return h('tbody', { key: kind },
        h('tr', { className: 'cc-md-group' }, h('th', { colSpan: 7 }, KIND_TITLES[kind] || kind,
          h('span', { className: 'cc-md-meta', title: KIND_HINTS[kind] || null }, String(mine.length)))),
        entries.map(function (e) {
          if (e.more) {
            return h('tr', { key: 'more:' + e.more.pool, className: 'cc-md-more' }, h('td', null), h('td', { colSpan: 6 },
              h('button', { type: 'button', className: 'cc-md-link', onClick: function () { p.onExpand(e.more.pool); } },
                'Show ' + e.more.hidden + ' more ' + e.more.label + ' models')));
          }
          const r = e.row;
          const expanded = (p.opts.expanded || []).indexOf(r.pool) >= 0 && (r.pool_size || 1) > 1;
          return h('tr', { key: r.id, 'data-id': r.id, className: rowClass(r) },
            h('td', { className: 'cc-md-tick' }, h(Tick, { checked: r.enabled, label: r.label, onChange: function () { p.onToggle(r); } })),
            h('td', { 'data-col': 'name' }, NameCell(r),
              expanded && r.strongest ? h('button', { type: 'button', className: 'cc-md-link', onClick: function () { p.onCollapse(r.pool); } }, 'Show fewer') : null),
            h('td', { 'data-col': 'provider', title: providerName(r) }, providerShort(r)),
            h('td', { 'data-col': 'elo', className: 'cc-num', title: [effortText(r), factTitle(r, 'elo')].filter(Boolean).join('\n') || null }, fmtElo(r)),
            h('td', { 'data-col': 'context', className: 'cc-num', title: factTitle(r, 'context_window') }, fmtContext(r.context_window)),
            h('td', { 'data-col': 'speed', title: factTitle(r, 'speed') }, r.speed || ''),
            usageCell(r));
        }));
    });
    return h('table', { className: 'cc-md-table' }, Cols(['tick', 'name', 'provider', 'elo', 'context', 'speed', 'usage']), head, bodies);
  }

  function AgentTable(p) {
    const list = agentRows(p.rows, p.opts);
    return h('table', { className: 'cc-md-table' }, Cols(['tick', 'name', 'effort', 'context', 'speed', 'provider']),
      h('thead', { className: 'cc-md-sticky' }, h('tr', null,
        h('th', { className: 'cc-md-tick' }, h('span', { className: 'cc-md-meta' }, 'On')),
        h('th', null, 'Name'), h('th', null, 'Elo by effort'), h('th', { className: 'cc-num' }, 'Context'),
        h('th', { 'data-col': 'speed' }, 'Speed'), h('th', { 'data-col': 'provider' }, 'Provider'))),
      h('tbody', null, list.map(function (r) {
        const effort = effortText(r);
        return h('tr', { key: r.id, 'data-id': r.id, className: rowClass(r) },
          h('td', { className: 'cc-md-tick' }, h(Tick, { checked: r.enabled, label: r.label, onChange: function () { p.onToggle(r); } })),
          h('td', { 'data-col': 'name' }, NameCell(r)),
          h('td', { 'data-col': 'elo', title: factTitle(r, 'elo') }, effort || fmtElo(r)),
          h('td', { 'data-col': 'context', className: 'cc-num', title: factTitle(r, 'context_window') }, fmtContext(r.context_window)),
          h('td', { 'data-col': 'speed', title: factTitle(r, 'speed') }, r.speed || ''),
          h('td', { 'data-col': 'provider', title: providerName(r) }, providerShort(r)));
      })));
  }

  function SubagentList(p) {
    const list = subagentRows(p.rows, p.opts);
    const options = list.map(function (r) {
      const hint = [providerName(r), r.badge || [fmtElo(r), fmtContext(r.context_window), r.speed].filter(Boolean).join(' · '),
        r.run_natively ? 'better run natively' : null].filter(Boolean).join(' · ');
      return { value: r.id, label: r.label, hint: hint };
    });
    const on = list.filter(function (r) { return r.enabled; }).map(function (r) { return r.id; });
    function change(next) {
      const want = new Set(next);
      const enable = list.filter(function (r) { return !r.enabled && want.has(r.id); }).map(function (r) { return r.id; });
      const disable = list.filter(function (r) { return r.enabled && !want.has(r.id); }).map(function (r) { return r.id; });
      if (enable.length) p.onBulk(enable, true);
      if (disable.length) p.onBulk(disable, false);
    }
    return h('div', { className: 'cc-md-list' },
      h('div', { className: 'cc-md-note' }, 'Ticked models may run as subagents.'),
      CC.SelectAll ? h(CC.SelectAll, { options: options, value: on, onChange: change, ariaLabel: 'Subagent models' }) : null);
  }

  function KeySection(p) {
    const k = p.keys;
    const body = [];
    // Title only; how the pool differs from Antigravity sits in the title's tooltip, not in prose.
    const apart = (k && k.separate_from) || 'Separate from Antigravity (agy), which has its own sign-in and usage.';
    body.push(h('div', { key: 'h', className: 'cc-md-sec-h', title: apart }, 'Google AI Studio (Gemini API) key pool'));
    if (!k) {
      body.push(h('div', { key: 'l', className: 'cc-md-note' }, p.error ? 'Key pool not available from the engine.' : 'Loading key pool...'));
      return h('section', { className: 'cc-md-sec', 'data-section': 'gemini-keys' }, body);
    }
    const lose = k.active_state === 'not_in_pool';
    if (lose) body.push(h('div', { key: 'w', className: 'cc-md-note cc-bad' }, 'dsh is using a Gemini key that is not in this pool, so switching is off (it would be lost).'));
    if (k.active_state === 'credentials_missing') body.push(h('div', { key: 'c', className: 'cc-md-note cc-bad' }, 'dsh credentials file not found.'));
    if (k.active_state === 'no_dsh_key') body.push(h('div', { key: 'c', className: 'cc-md-note cc-bad' }, 'dsh has no Gemini API key set.'));
    const slots = k.slots || [];
    if (!slots.length) {
      body.push(h('div', { key: 'e', className: 'cc-md-note' }, 'No GEMINI_API_KEY slots found in the environment or .env.'));
    } else {
      body.push(h('table', { key: 't', className: 'cc-md-keys' },
        h('thead', null, h('tr', null, h('th', null, 'Slot'), h('th', null, 'Variable'), h('th', null, 'From'), h('th', null, 'State'), h('th', null, ''))),
        h('tbody', null, slots.map(function (s) {
          const state = s.active ? h('span', { className: 'cc-md-on' }, 'In use by dsh')
            : (s.same_as ? h('span', { className: 'cc-md-dim' }, 'same key as ' + s.same_as) : '');
          const blocked = s.active || !!s.same_as || lose || k.active_state === 'credentials_missing' || k.active_state === 'no_dsh_key' || p.busy;
          return h('tr', { key: s.slot },
            h('td', null, s.label || s.slot), h('td', { className: 'cc-md-dim' }, s.env), h('td', { className: 'cc-md-dim' }, s.from || ''),
            h('td', null, state),
            h('td', null, h('button', { type: 'button', className: 'cc-md-btn', disabled: blocked,
              onClick: function () { if (!blocked) p.onSwitch(s.slot); } }, 'Use in dsh')));
        }))));
    }
    // One short meta line: the rotation order and the restart rule (the engine's longer notes go in its tooltip).
    const rot = (k.subagent_rotation || []).join(' → ');
    const line = (rot ? 'Rotates ' + rot + ' on a 429. ' : '') + 'Restart dsh after a switch.';
    body.push(h('div', { key: 'r', className: 'cc-md-meta', title: [k.rotation_note, k.restart_hint].filter(Boolean).join(' ') || undefined }, line));
    if (p.note) body.push(h('div', { key: 'n', className: 'cc-md-note' + (p.noteBad ? ' cc-bad' : '') }, p.note));
    return h('section', { className: 'cc-md-sec', 'data-section': 'gemini-keys' }, body);
  }

  // ------------------------------------------------------------ page
  CC.ModelsPage = function ModelsPage(props) {
    const React = CC.React;
    const P = props || {};
    ensurePageStyle();
    if (CC.toggles && typeof CC.toggles.useToggles === 'function') CC.toggles.useToggles(); // re-render on switch or health change
    const fixed = P.data !== undefined;
    const live = CC.useEngine ? CC.useEngine(fixed ? null : '/api/models', ['pool']) : { data: null, loading: false };
    const liveKeys = CC.useEngine ? CC.useEngine(P.keys !== undefined ? null : '/api/models/gemini_keys', ['pool']) : { data: null };
    const data = fixed ? P.data : live.data;
    const error = fixed ? P.error : live.error;
    const loading = !fixed && live.loading;

    const sView = React.useState(P.initialView || 'all'), view = sView[0], setView = sView[1];
    const sExp = React.useState(P.initialExpanded || []), expanded = sExp[0], setExpanded = sExp[1];
    const sNA = React.useState(!!P.initialShowNoAccess), showNoAccess = sNA[0], setShowNoAccess = sNA[1];
    const sAll = React.useState(!!P.initialShowAll), showAll = sAll[0], setShowAll = sAll[1];
    const sOver = React.useState({}), over = sOver[0], setOver = sOver[1];
    const sNote = React.useState(null), note = sNote[0], setNote = sNote[1];
    const sKeys = React.useState(null), keysOver = sKeys[0], setKeysOver = sKeys[1];
    const sKNote = React.useState(null), keyNote = sKNote[0], setKeyNote = sKNote[1];
    const sBusy = React.useState(false), busy = sBusy[0], setBusy = sBusy[1];

    const keys = keysOver || (P.keys !== undefined ? P.keys : liveKeys.data);
    const rows = ((data && data.models) || []).filter(Boolean).map(function (r) {
      return Object.prototype.hasOwnProperty.call(over, r.id) ? Object.assign({}, r, { enabled: over[r.id] }) : r;
    });
    const kinds = (data && data.kinds) || ['chat', 'subagent', 'agent', 'manual'];
    const opts = { expanded: expanded, showNoAccess: showNoAccess, showAll: showAll };

    function applyResult(res, ids, enabled) {
      const next = {};
      ((res && res.models) || []).forEach(function (m) { next[m.id] = m.enabled; });
      ids.forEach(function (id) { if (!Object.prototype.hasOwnProperty.call(next, id)) next[id] = enabled; });
      setOver(function (prev) { return Object.assign({}, prev, next); });
    }
    function post(body, ids, enabled) {
      setNote(null);
      const pr = CC.api.post('/api/models/toggle', body);
      if (pr && pr.then) pr.then(function (res) { applyResult(res, ids, enabled); }, function (e) { setNote(errText(e)); });
    }
    function onToggle(r) { post({ id: r.id, enabled: !r.enabled }, [r.id], !r.enabled); }
    function onBulk(ids, enabled) { post({ ids: ids, enabled: enabled }, ids, enabled); }
    function onSwitch(slot) {
      setKeyNote(null);
      setBusy(true);
      const pr = CC.api.post('/api/models/gemini_keys/switch', { slot: slot });
      if (pr && pr.then) {
        pr.then(function (res) {
          setBusy(false);
          setKeysOver(res);
          setKeyNote({ text: 'dsh now uses slot ' + slot + '. ' + ((res && res.restart_hint) || ''), bad: false });
        }, function (e) { setBusy(false); setKeyNote({ text: errText(e), bad: true }); });
      }
    }

    // Standalone (cc-models) it is a page with the kit header; embedded in Settings it is a bare block.
    const UI = CC.ui;
    function frame(meta, mid, body) {
      if (P.embedded) {
        return h('div', { className: 'cc-root cc-md cc-md-embedded' }, mid ? h('div', { className: 'cc-md-bar' }, mid) : null, body);
      }
      if (UI && UI.Page) {
        return h(UI.Page, { id: 'models', className: 'cc-md cc-md-page', pad: false,
          header: h(UI.PageHeader, { title: 'Models', meta: meta, mid: mid, pageId: 'cc-models' }) }, body);
      }
      return h('div', { className: 'cc-root cc-md cc-md-page' }, h('div', { className: 'cc-ph' }, h('div', { className: 'cc-ph-title' }, 'Models'),
        meta ? h('div', { className: 'cc-ph-meta' }, meta) : null, mid ? h('div', { className: 'cc-ph-mid' }, mid) : null), body);
    }

    if (!data) {
      if (error && UI && typeof UI.CoreEmpty === 'function') return frame(null, null, h(UI.CoreEmpty, {}));
      return frame(null, null, h('div', { className: 'cc-md-empty', role: 'status' },
        error ? 'The Waypoint engine is not reachable, so the model list is unavailable.' : (loading || !fixed ? 'Loading models…' : 'No models.')));
    }

    const noAccess = rows.filter(function (r) { return r.access === false; }).length;
    const off = rows.filter(function (r) { return !r.enabled; }).length;
    const seg = [['all', 'All'], ['agent', 'Agent picker'], ['subagent', 'Subagents']];
    const content = view === 'agent'
      ? h(AgentTable, { rows: rows, opts: opts, onToggle: onToggle })
      : view === 'subagent'
        ? h(SubagentList, { rows: rows, opts: opts, onBulk: onBulk })
        : h(AllTable, { rows: rows, kinds: kinds, opts: opts, onToggle: onToggle,
          onExpand: function (pool) { setExpanded(function (x) { return x.concat([pool]); }); },
          onCollapse: function (pool) { setExpanded(function (x) { return x.filter(function (p) { return p !== pool; }); }); } });

    const meta = rows.length + ' models' + (off ? ' · ' + off + ' off' : '');
    // The view switch in the kit's segmented classes, then the two rare options.
    const mid = [
      h('div', { key: 'seg', className: 'cc-sg', role: 'group', 'aria-label': 'View' }, seg.map(function (s) {
        return h('button', { key: s[0], type: 'button', className: 'cc-sg-o', 'aria-pressed': view === s[0] ? 'true' : 'false',
          onClick: function () { if (view !== s[0]) setView(s[0]); } }, s[1]);
      })),
      P.embedded ? h('span', { key: 'meta', className: 'cc-md-meta' }, meta) : null,
      view !== 'all' ? h('label', { key: 'all', className: 'cc-md-opt' },
        h('input', { type: 'checkbox', checked: showAll, onChange: function () { setShowAll(!showAll); } }), 'Every model in each pool') : null,
      noAccess ? h('label', { key: 'na', className: 'cc-md-opt' },
        h('input', { type: 'checkbox', checked: showNoAccess, onChange: function () { setShowNoAccess(!showNoAccess); } }),
        'Show ' + noAccess + ' without access') : null
    ];
    return frame(meta, mid, [
      note ? h('div', { key: 'note', className: 'cc-md-note cc-bad', role: 'status' }, note) : null,
      h('div', { key: 'body', className: 'cc-md-scroll' },
        content,
        view === 'all' ? h(KeySection, { keys: keys, error: P.keys === undefined ? liveKeys.error : null, onSwitch: onSwitch, busy: busy,
          note: keyNote && keyNote.text, noteBad: keyNote && keyNote.bad }) : null)
    ]);
  };

  CC.modelsView = {
    STYLE: STYLE, fmtContext: fmtContext, fmtElo: fmtElo, effortText: effortText, fmtUsage: fmtUsage, fmtReset: fmtReset,
    providerName: providerName, providerShort: providerShort, routeText: routeText, visibleRows: visibleRows, agentRows: agentRows, subagentRows: subagentRows
  };
})(CC);
