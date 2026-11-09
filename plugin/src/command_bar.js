(function (CC) {
  // F3: Ctrl+K command bar. A plain request ('run Career tonight', 'move Efficient Frontiers up',
  // 'add todo renew passport', 'open Brain') becomes a one-line action preview; Enter runs it,
  // Esc cancels. A deterministic rule parser runs first; only when it gives up, an optional engine
  // model fallback (POST /api/command/parse {text, projects, tabs, kinds} -> {action}) may suggest an
  // action, which is turned back into a rule sentence and re-parsed, so the same checks apply.
  // Only owner actions that already exist can run:
  //   add_todo      POST /api/todos {text}                       (todo.py)
  //   run_project   POST /api/sprints/plan {project, pool, start_at} (sprints.py, owner only)
  //   move_project  POST /api/autonomous/settings {settings}     (sprints.py, the Autonomous order)
  //   open_tab      ctx.layout.selectPanel(id)                   (dsh layout)
  // Ctrl+K belongs to the bar only while a Waypoint page is on screen; elsewhere dsh's own Ctrl+K
  // (search sessions) keeps working. The overlay is contributed to dsh's frame-wide `shell.overlay`.
  var KINDS = ['add_todo', 'run_project', 'move_project', 'open_tab'];
  var POOLS = [
    { id: 'claude_code', label: 'Claude Code', words: ['claude', 'claude code'] },
    { id: 'freebuff', label: 'Freebuff', words: ['freebuff'] }
  ];
  var DEFAULT_POOL = 'claude_code';
  var TONIGHT = 22;
  var MORNING = 9;

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fail(reason) { return { ok: false, reason: reason || 'Not understood' }; }

  function matchOne(query, items, keys) {
    var q = norm(query);
    if (!q) return { hit: null };
    var tiers = [
      function (v) { return v === q; },
      function (v) { return v.indexOf(q) === 0; },
      function (v) { return (' ' + v + ' ').indexOf(' ' + q + ' ') >= 0; },
      function (v) { return q.split(' ').every(function (w) { return v.indexOf(w) >= 0; }); }
    ];
    for (var t = 0; t < tiers.length; t++) {
      var found = items.filter(function (it) { return keys.some(function (k) { return tiers[t](norm(it[k])); }); });
      if (found.length === 1) return { hit: found[0] };
      if (found.length > 1) return { hit: null, many: found };
    }
    return { hit: null };
  }
  function project(query, env) {
    var m = matchOne(query, (env && env.projects) || [], ['title', 'id']);
    if (m.hit) return { project: m.hit };
    if (m.many) return { reason: 'Several projects match: ' + m.many.slice(0, 3).map(function (p) { return p.title || p.id; }).join(', ') };
    return { reason: 'No project called ' + String(query).trim() };
  }
  function title(p) { return p.title || p.id; }

  // ---- time ----------------------------------------------------------------------------------
  function when(word, now) {
    var d = new Date(now.getTime());
    if (!word || word === 'now') return { at: d, text: 'now' };
    if (word === 'tonight') {
      var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TONIGHT, 0, 0, 0);
      return t.getTime() > now.getTime() ? { at: t, text: 'tonight at ' + hm(t) } : { at: d, text: 'now' };
    }
    if (word === 'tomorrow') {
      var m = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, MORNING, 0, 0, 0);
      return { at: m, text: 'tomorrow at ' + hm(m) };
    }
    var at = /^at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(word);
    if (!at) return null;
    var hour = parseInt(at[1], 10), min = at[2] ? parseInt(at[2], 10) : 0;
    if (at[3] === 'pm' && hour < 12) hour += 12;
    if (at[3] === 'am' && hour === 12) hour = 0;
    if (hour > 23 || min > 59) return null;
    var s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0, 0);
    var day = 'today';
    if (s.getTime() <= now.getTime()) { s = new Date(s.getTime() + 86400000); day = 'tomorrow'; }
    return { at: s, text: day + ' at ' + hm(s) };
  }

  // ---- the Autonomous order ------------------------------------------------------------------
  function moveIn(sequence, pid, dir) {
    var rows = (sequence || []).map(function (row) { return row.map(function (i) { return { project: i.project, model: i.model || null }; }); });
    var from = -1, item = null;
    rows.forEach(function (row, r) { row.forEach(function (i) { if (i.project === pid) { from = r; item = i; } }); });
    if (from < 0) {
      item = { project: pid, model: null };
      if (dir === 'up' || dir === 'top') rows.unshift([item]); else rows.push([item]);
      return { rows: rows, from: null, to: dir === 'up' || dir === 'top' ? 1 : rows.length };
    }
    var alone = rows[from].length === 1;
    var last = rows.length - 1;
    if ((dir === 'up' || dir === 'top') && from === 0 && alone) return { already: 'first' };
    if ((dir === 'down' || dir === 'bottom') && from === last && alone) return { already: 'last' };
    rows[from] = rows[from].filter(function (i) { return i.project !== pid; });
    var to;
    if (dir === 'top') { to = 0; rows.unshift([item]); }
    else if (dir === 'bottom') { rows.push([item]); to = rows.length - 1; }
    else if (!alone) { to = dir === 'up' ? from : from + 1; rows.splice(to, 0, [item]); }
    else if (dir === 'up') { to = from - 1; rows[from] = rows[to]; rows[to] = [item]; }
    else { to = from + 1; rows[from] = rows[to]; rows[to] = [item]; }
    rows = rows.filter(function (r) { return r.length; });
    rows.forEach(function (r, i) { if (r[0] && r.some(function (x) { return x.project === pid; })) to = i; });
    return { rows: rows, from: from + 1, to: to + 1 };
  }

  function tabs() { return (CC.PAGES || []).map(function (p) { return { id: p.id, label: p.label }; }); }

  // ---- rule parser ---------------------------------------------------------------------------
  function parse(text, env) {
    env = env || {};
    var raw = String(text || '').trim().replace(/\s+/g, ' ');
    if (!raw) return fail('Type a request');
    if (/^(?:add\s+(?:a\s+)?)?todo\s*[:\-]?$/i.test(raw)) return fail('Type the todo');
    var low = raw.toLowerCase();
    var m;

    if ((m = /^(?:add\s+(?:a\s+)?)?todo\s*[:\-]?\s+(.+)$/i.exec(raw)) || (m = /^remind me to\s+(.+)$/i.exec(raw))
        || (m = /^add\s+(.+?)\s+to\s+(?:my\s+)?(?:todos?|todo list)$/i.exec(raw))) {
      var t = m[1].trim();
      return { ok: true, action: { kind: 'add_todo', text: t }, preview: 'Add todo: ' + t };
    }

    if ((m = /^(?:open|go to|show|switch to)\s+(?:the\s+)?(.+?)(?:\s+(?:tab|page))?$/.exec(low))) {
      var tab = matchOne(m[1], tabs(), ['label', 'id']).hit;
      if (!tab) return fail('No tab called ' + m[1]);
      return { ok: true, action: { kind: 'open_tab', id: tab.id, label: tab.label }, preview: 'Open ' + tab.label };
    }

    if ((m = /^(?:run|start)\s+(.+)$/.exec(low))) {
      var rest = m[1], pool = null;
      POOLS.forEach(function (p) {
        p.words.forEach(function (w) {
          var tail = ' on ' + w;
          if (!pool && rest.slice(-tail.length) === tail) { pool = p; rest = rest.slice(0, -tail.length).trim(); }
        });
      });
      var tm = /\s+(now|tonight|tomorrow|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/.exec(rest);
      var word = null;
      if (tm) { word = tm[1]; rest = rest.slice(0, tm.index).trim(); }
      var w = when(word, env.now || new Date());
      if (!w) return fail('Could not read the time');
      var pr = project(rest, env);
      if (!pr.project) return fail(pr.reason);
      pool = pool || POOLS.filter(function (p) { return p.id === DEFAULT_POOL; })[0];
      return { ok: true, action: { kind: 'run_project', project: pr.project.id, title: title(pr.project), pool: pool.id,
        start_at: w.at.toISOString() }, preview: 'Run ' + title(pr.project) + ' ' + w.text + ' on ' + pool.label };
    }

    if ((m = /^(?:move|bump|push)\s+(.+?)\s+(up|down|to (?:the )?top|to (?:the )?bottom|first|last)$/.exec(low))
        || (m = /^(prioriti[sz]e)\s+(.+)$/.exec(low))) {
      var name = m[1], dir = m[2];
      if (name === 'prioritise' || name === 'prioritize') { name = m[2]; dir = 'up'; }
      dir = /top|first/.test(dir) ? 'top' : /bottom|last/.test(dir) ? 'bottom' : dir;
      var pj = project(name, env);
      if (!pj.project) return fail(pj.reason);
      var seq = env.sequence || (env.settings && env.settings.sequence) || [];
      var mv = moveIn(seq, pj.project.id, dir);
      if (mv.already) return fail(title(pj.project) + ' is already ' + mv.already);
      var preview = mv.from === null
        ? 'Add ' + title(pj.project) + ' to the Autonomous order at row ' + mv.to
        : 'Move ' + title(pj.project) + ' from row ' + mv.from + ' to row ' + mv.to;
      return { ok: true, action: { kind: 'move_project', project: pj.project.id, title: title(pj.project), direction: dir,
        sequence: mv.rows }, preview: preview };
    }
    return fail('Not understood');
  }

  // An engine suggestion is only a hint: it is rewritten as a rule sentence and parsed again.
  function sentence(a) {
    if (!a || typeof a !== 'object' || KINDS.indexOf(a.kind) < 0) return null;
    var s = function (v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); };
    if (a.kind === 'add_todo') return s(a.text) ? 'add todo ' + s(a.text) : null;
    if (a.kind === 'open_tab') return s(a.label || a.id) ? 'open ' + s(a.label || a.id) : null;
    if (a.kind === 'run_project') {
      if (!s(a.project)) return null;
      var w = s(a.when).toLowerCase();
      var pool = POOLS.filter(function (p) { return p.id === a.pool; })[0];
      return 'run ' + s(a.project) + (w ? ' ' + w : '') + (pool ? ' on ' + pool.words[0] : '');
    }
    if (a.kind === 'move_project') {
      var d = ({ up: 'up', down: 'down', top: 'to the top', bottom: 'to the bottom' })[s(a.direction).toLowerCase()];
      return s(a.project) && d ? 'move ' + s(a.project) + ' ' + d : null;
    }
    return null;
  }

  function resolve(text, env) {
    var r = parse(text, env);
    if (r.ok || !String(text || '').trim()) return Promise.resolve(r);
    var body = { text: String(text), kinds: KINDS.slice(), tabs: tabs().map(function (t) { return t.label; }),
      projects: ((env && env.projects) || []).map(function (p) { return p.title || p.id; }) };
    var p;
    try { p = CC.api.post('/api/command/parse', body); } catch (e) { return Promise.resolve(r); }
    return Promise.resolve(p).then(function (res) {
      var again = sentence(res && res.action);
      if (!again) return r;
      var out = parse(again, env);
      if (out.ok) out.via = 'model';
      return out.ok ? out : r;
    }, function () { return r; });
  }

  function execute(action, env) {
    var a = action || {};
    if (a.kind === 'add_todo') return CC.api.post('/api/todos', { text: a.text });
    if (a.kind === 'run_project') return CC.api.post('/api/sprints/plan', { project: a.project, pool: a.pool, start_at: a.start_at });
    if (a.kind === 'move_project') {
      var settings = Object.assign({}, (env && env.settings) || {}, { sequence: a.sequence });
      return CC.api.post('/api/autonomous/settings', { settings: settings });
    }
    if (a.kind === 'open_tab') {
      return new Promise(function (resolveIt, reject) {
        try { CC.ctx.layout.selectPanel(a.id); resolveIt({ ok: true }); } catch (e) { reject(e); }
      });
    }
    return Promise.reject(new Error('That is not one of the allowed actions'));
  }

  // Which key does what: 'open' | 'confirm' | 'cancel' | null.
  function keyAction(e, st) {
    if (!e) return null;
    var k = String(e.key || '');
    if (!st.open) return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k.toLowerCase() === 'k' && st.onPage ? 'open' : null;
    if (k === 'Escape') return 'cancel';
    if (k === 'Enter' && st.ready) return 'confirm';
    return null;
  }

  // Under an empty input: a few starting points (one click fills the input; Enter still runs it).
  // Fixed and deterministic: Add todo, then the first sidebar tabs.
  var EMPTY_MAX = 5;
  function emptyList() {
    var out = [{ label: 'Add todo', text: 'todo ' }];
    (CC.PAGES || []).filter(function (p) { return p.sidebar !== false; }).slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .forEach(function (p) { out.push({ label: 'Open ' + p.label, text: 'open ' + p.label }); });
    return out.slice(0, EMPTY_MAX);
  }

  // The content column's left edge (the Waypoint page beside dsh's sidebar), so the bar centres on
  // the page you are looking at rather than on the whole window. 0 when it cannot be measured.
  function contentLeft() {
    try {
      var el = document.querySelector('[data-cc-frame]') || document.querySelector('.cc-root[data-cc-page]');
      var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return r && r.left > 0 && r.left < (window.innerWidth || 0) / 2 ? Math.round(r.left) : 0;
    } catch (e) { return 0; }
  }

  // ---- UI ------------------------------------------------------------------------------------
  // A quiet scrim, one panel with a hairline (no blur, no shadow), a 48 px input row with a prompt
  // glyph, and one preview row whose dot says ready (accent) or not understood (neutral). Sizes,
  // radii and colours are tokens.js variables.
  var CSS = [
    '.cc-root.cc-cmd-back{position:fixed;inset:0;z-index:1000;background:var(--cc-scrim);display:flex;justify-content:center;align-items:flex-start;padding:14vh 16px 0;}',
    '.cc-root .cc-cmd{width:600px;max-width:100%;background:var(--cc-surface);border:1px solid var(--cc-line-strong);',
    'border-radius:var(--cc-r-panel);overflow:hidden;}',
    '.cc-root .cc-cmd-in{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;color:var(--cc-text-3);}',
    '.cc-root .cc-cmd-in svg{flex:none;}',
    '.cc-root .cc-cmd input{flex:1;min-width:0;height:100%;border:0;outline:none;background:transparent;color:var(--cc-text);color-scheme:light dark;',
    'font:inherit;font-size:var(--cc-fs-body);padding:0;}',
    '.cc-root .cc-cmd input:focus-visible{outline:none;}',
    '.cc-root .cc-cmd-p{display:flex;align-items:center;gap:12px;border-top:1px solid var(--cc-line);padding:0 16px;font-size:var(--cc-fs-label);height:36px;background:var(--cc-surface-2);}',
    '.cc-root .cc-cmd-t{display:flex;align-items:center;gap:8px;flex:1;min-width:0;}',
    '.cc-root .cc-cmd-t>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-cmd-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--cc-neutral);}',
    '.cc-root .cc-cmd-ok{color:var(--cc-text);}',
    '.cc-root .cc-cmd-ok .cc-cmd-dot{background:var(--cc-accent);}',
    '.cc-root .cc-cmd-no{color:var(--cc-text-3);}',
    '.cc-root .cc-cmd-k{display:flex;align-items:center;gap:4px;font-size:var(--cc-fs-meta);color:var(--cc-text-3);white-space:nowrap;}',
    '.cc-root .cc-cmd-k kbd+span{margin-right:8px;}',
    '.cc-root .cc-cmd-k span:last-child{margin-right:0;}',
    '.cc-root .cc-cmd-list{border-top:1px solid var(--cc-line);padding:4px;}',
    '.cc-root .cc-cmd-item{display:flex;align-items:center;width:100%;height:32px;padding:0 12px;border:0;border-radius:var(--cc-r-control);background:transparent;',
    'color:var(--cc-text-2);font:inherit;font-size:var(--cc-fs-label);text-align:left;cursor:pointer;}',
    '.cc-root .cc-cmd-item:hover,.cc-root .cc-cmd-item:focus-visible{background:var(--cc-wash);color:var(--cc-text);outline:none;}'
  ].join('');
  function ensureCss() {
    try {
      if (typeof document === 'undefined' || !document || !document.head) return;
      var el = document.getElementById('cc-command-bar-css');
      if (!el) { el = document.createElement('style'); el.id = 'cc-command-bar-css'; document.head.appendChild(el); }
      if (el.textContent !== CSS) el.textContent = CSS;
    } catch (e) { /* cosmetic only */ }
  }

  function Prompt() {
    return CC.h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, CC.h('path', { d: 'M5 7l5 5l-5 5M12 18h7' }));
  }

  function Panel(props) {
    var h = CC.h, r = props.result;
    var line = props.message || (r ? (r.ok ? r.preview : r.reason) : '');
    var ready = !!(r && r.ok) && !props.busy && !props.message;
    var empty = !String(props.text || '').trim() && !line;
    var left = props.left > 0 ? props.left : 0;
    return h('div', { className: 'cc-root cc-cmd-back', 'data-cc': 'command-bar', style: left ? { paddingLeft: left + 16 } : undefined, onMouseDown: function (e) {
      if (e && e.target === e.currentTarget && props.onCancel) props.onCancel();
    } },
      h('div', { className: 'cc-cmd', role: 'dialog', 'aria-label': 'Command bar' },
        h('div', { className: 'cc-cmd-in' }, h(Prompt),
          h('input', { type: 'text', value: props.text || '', autoFocus: true, spellCheck: false, 'aria-label': 'Request',
            placeholder: 'Add todo, run, move or open', onChange: function (e) { props.onText(e.target.value); } })),
        line ? h('div', { className: 'cc-cmd-p' },
          h('div', { className: 'cc-cmd-t ' + (ready ? 'cc-cmd-ok' : 'cc-cmd-no') },
            h('i', { className: 'cc-cmd-dot', 'aria-hidden': 'true' }), h('span', null, props.busy ? 'Working…' : line)),
          ready ? h('div', { className: 'cc-cmd-k' },
            h('kbd', null, 'Enter'), h('span', null, 'run'), h('kbd', null, 'Esc'), h('span', null, 'cancel')) : null) : null,
        empty ? h('div', { className: 'cc-cmd-list', role: 'listbox', 'aria-label': 'Suggestions' }, emptyList().map(function (it) {
          return h('button', { key: it.text, type: 'button', role: 'option', 'aria-selected': false, className: 'cc-cmd-item',
            onMouseDown: function (e) { if (e && e.preventDefault) e.preventDefault(); },
            onClick: function () { props.onText(it.text); } }, it.label);
        })) : null));
  }

  function onPage() {
    try { return typeof document !== 'undefined' && !!document.querySelector && !!document.querySelector('[data-cc-frame], .cc-root[data-cc-page]'); }
    catch (e) { return false; }
  }
  function loadEnv() {
    var get = function (p) { try { return Promise.resolve(CC.api.get(p)).then(function (x) { return x; }, function () { return null; }); } catch (e) { return Promise.resolve(null); } };
    return Promise.all([get('/api/projects'), get('/api/autonomous')]).then(function (r) {
      var settings = (r[1] && r[1].settings) || null;
      return { projects: (r[0] && r[0].projects) || [], settings: settings, sequence: (settings && settings.sequence) || [] };
    });
  }

  function Overlay() {
    var React = CC.React, h = CC.h;
    var s = React.useState({ open: false, text: '', result: null, busy: false, message: null, left: 0 });
    var st = s[0], setSt = s[1];
    var ref = React.useRef(null);
    ref.current = st;
    var envRef = React.useRef({ projects: [], sequence: [], settings: null });
    var seq = React.useRef(0);
    var running = React.useRef(false);
    function patch(p) { setSt(function (prev) { return Object.assign({}, prev, p); }); }
    function close() { patch({ open: false, text: '', result: null, busy: false, message: null }); }
    function setText(t) {
      var n = ++seq.current;
      var env = Object.assign({}, envRef.current, { now: new Date() });
      var quick = parse(t, env);
      patch({ text: t, result: quick, message: null });
      if (!quick.ok && String(t).trim()) {
        setTimeout(function () {
          if (n !== seq.current) return;
          resolve(t, env).then(function (r) { if (n === seq.current) patch({ result: r }); });
        }, 600);
      }
    }
    function confirm() {
      var cur = ref.current;
      if (!cur.result || !cur.result.ok || running.current) return;
      running.current = true;
      patch({ busy: true });
      execute(cur.result.action, envRef.current).then(function () { running.current = false; close(); }, function (e) {
        running.current = false;
        patch({ busy: false, message: (e && e.data && e.data.detail) || (e && e.message) || 'That did not work' });
      });
    }
    function handle(e) {
      var cur = ref.current;
      var act = keyAction(e, { open: cur.open, onPage: onPage(), ready: !!(cur.result && cur.result.ok) && !cur.busy && !cur.message });
      if (!act) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      if (act === 'open') {
        ensureCss();
        patch({ open: true, text: '', result: null, message: null, left: contentLeft() });
        loadEnv().then(function (env) { envRef.current = env; });
      } else if (act === 'cancel') close();
      else if (act === 'confirm') confirm();
    }
    React.useEffect(function () {
      if (typeof document === 'undefined' || !document.addEventListener) return undefined;
      document.addEventListener('keydown', handle, true);
      return function () { document.removeEventListener('keydown', handle, true); };
    }, []);
    if (!st.open) return null;
    // Keys reach handle() once, through the document capture listener (the input has no handler).
    return h(Panel, { text: st.text, result: st.result, busy: st.busy, message: st.message, left: st.left, onText: setText, onCancel: close });
  }

  function apply(ctx) {
    if (!ctx || !ctx.slots) return;
    if (CC.contribute) CC.contribute(ctx, 'shell.overlay', { name: 'shell.overlay', id: 'cc-command-bar' }, Overlay, 'command bar');
  }

  CC.commandBar = { parse: parse, resolve: resolve, execute: execute, keyAction: keyAction, Panel: Panel, Overlay: Overlay,
    apply: apply, kinds: KINDS, sentence: sentence, emptyList: emptyList, contentLeft: contentLeft, css: CSS };
})(CC);
