(function (CC) {
  // Live change counter (node L1): while a dsh turn runs, a quiet right-sidebar panel lists
  // +added / -removed lines per file, read from the streamed edit / write / str_replace_editor tool
  // results. Nothing is sent anywhere and no model is called: it only reads events dsh already has.
  //
  // How it fits dsh without editing it
  //  * `ctx.uiConversation.events.register(definition)` is dsh's public registry for Conversation event
  //    Definitions (the same door dsh's own changed-files card uses). Ours is state-only (no target, no
  //    transcript node): it sees `turn/start`, `tool/call` and `tool/result` as they stream in and folds
  //    them into one in-memory store.
  //  * `ctx.sidebarRightTabs.register(...)` plus the keyed `sidebar.right.pane.tab` seat add a "Changes"
  //    page to the right sidebar's guide (+ button); `CC.LiveDiffPanel` is that page's body and also
  //    works embedded in a Waypoint page.
  //  * dsh's end-of-turn changed-files card (needs Coding Tools on) shows the final numbers; this is
  //    the running view of the same turn.
  //
  // Where the counts come from, best source first (dsh's own result strings carry no counts, so the
  // arguments and the recorded diff hunks do the work; Antigravity-style strings are read when seen):
  //   1. a result string like "Made 1 replacement in X (+1/-1 lines)"
  //   2. `meta.diffs` on the result (dsh-tool-fs hunks with context: counted by a line diff)
  //   3. the call's own arguments (edit old/new_string, write content, str_replace_editor create/
  //      str_replace/insert); `replace_all` is counted once, as the arguments cannot say how often.
  // Failed results add nothing. Replayed history never counts twice (calls are de-duplicated per turn).
  var NAME_KIND = 'cc-live-diff';
  // Internal tab id, keyed to the bundle's package id (never shown). The id from before the package
  // rename is still accepted so a saved right sidebar keeps its Changes tab.
  var TAB_ID = '@waypoint/dsh-plugin/live-diff';
  var LEGACY_TAB_ID = '@waypoint/dsh-control-centre/live-diff';
  var DIFF_CELL_CAP = 4000000; // beyond this many line pairs, count the whole span as replaced

  function warn(what, err) {
    if (typeof CC.warn === 'function') return CC.warn(what, err);
    try { console.warn('[waypoint] ' + what + (err ? ': ' + (err.message || err) : '')); } catch (e) { /* never throw */ }
  }
  function noop() {}
  function isObj(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }

  // ---- parsing ----------------------------------------------------------------------------------

  var COUNTS = /\(\s*\+(\d+)\s*\/\s*[-−](\d+)\s*lines?\s*\)/;
  var TEXT_PATH = /\breplacements? in (.+?)(?: starting at line \d+)? \(\s*\+/;

  // "Made 1 replacement in X starting at line 9 (+1/-1 lines)." -> { added, removed, path }.
  function parseResultText(text) {
    if (typeof text !== 'string') return null;
    var m = COUNTS.exec(text);
    if (!m) return null;
    var p = TEXT_PATH.exec(text);
    return { added: parseInt(m[1], 10), removed: parseInt(m[2], 10), path: p ? p[1] : null };
  }

  function toLines(text) {
    if (typeof text !== 'string' || text === '') return [];
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  }
  function lineCount(text) { return toLines(text).length; }

  // Added / removed line counts between two texts: trim the shared head and tail, then a longest
  // common subsequence over what is left (rolling rows, bounded).
  function diffCounts(before, after) {
    var a = toLines(before);
    var b = toLines(after);
    var lo = 0;
    while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;
    var ea = a.length;
    var eb = b.length;
    while (ea > lo && eb > lo && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    var n = ea - lo;
    var m = eb - lo;
    if (n === 0) return { added: m, removed: 0 };
    if (m === 0) return { added: 0, removed: n };
    if (n * m > DIFF_CELL_CAP) return { added: m, removed: n };
    var prev = new Array(m + 1);
    var cur = new Array(m + 1);
    var j;
    for (j = 0; j <= m; j++) prev[j] = 0;
    for (var i = 1; i <= n; i++) {
      cur[0] = 0;
      var ai = a[lo + i - 1];
      for (j = 1; j <= m; j++) {
        cur[j] = ai === b[lo + j - 1] ? prev[j - 1] + 1 : (prev[j] >= cur[j - 1] ? prev[j] : cur[j - 1]);
      }
      var t = prev; prev = cur; cur = t;
    }
    var lcs = prev[m];
    return { added: m - lcs, removed: n - lcs };
  }

  // dsh-tool-fs result meta: [{ path, oldText: string|null, newText }] hunks (context lines in both).
  function statsFromDiffs(diffs) {
    if (!Array.isArray(diffs) || !diffs.length) return null;
    var added = 0;
    var removed = 0;
    for (var i = 0; i < diffs.length; i++) {
      var d = diffs[i];
      if (!isObj(d) || typeof d.path !== 'string' || typeof d.newText !== 'string' ||
        !(d.oldText === null || typeof d.oldText === 'string')) return null;
      if (d.oldText === null) { added += lineCount(d.newText); continue; }
      var c = diffCounts(d.oldText, d.newText);
      added += c.added;
      removed += c.removed;
    }
    return { added: added, removed: removed };
  }

  function parseArgs(args) {
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { return null; } }
    return isObj(args) ? args : null;
  }
  function str(v) { return typeof v === 'string' ? v : null; }

  // Counts implied by a mutation call's own arguments -> { added, removed, path } or null.
  function statsFromCall(name, rawArgs) {
    var a = parseArgs(rawArgs);
    if (!a) return null;
    var c;
    if (name === 'edit') {
      if (!str(a.file_path) || str(a.old_string) === null || str(a.new_string) === null) return null;
      c = diffCounts(a.old_string, a.new_string);
      return { added: c.added, removed: c.removed, path: a.file_path };
    }
    if (name === 'write') {
      if (!str(a.file_path) || str(a.content) === null) return null;
      return { added: lineCount(a.content), removed: 0, path: a.file_path };
    }
    if (name === 'str_replace_editor') {
      if (!str(a.path)) return null;
      if (a.command === 'create' && str(a.file_text) !== null) return { added: lineCount(a.file_text), removed: 0, path: a.path };
      if (a.command === 'str_replace' && str(a.old_str) !== null) {
        c = diffCounts(a.old_str, str(a.new_str) === null ? '' : a.new_str);
        return { added: c.added, removed: c.removed, path: a.path };
      }
      if (a.command === 'insert' && str(a.new_str) !== null) return { added: lineCount(a.new_str), removed: 0, path: a.path };
    }
    return null;
  }

  function resultText(message) {
    var c = message && message.content;
    if (typeof c === 'string') return c;
    if (!Array.isArray(c)) return '';
    return c.map(function (b) { return b && typeof b.text === 'string' ? b.text : ''; }).join('\n');
  }

  var MUTATIONS = { edit: 1, write: 1, str_replace_editor: 1 };

  // One settled result -> { added, removed, path } or null. `call` is the matching tool/call, if seen.
  function statsFromResult(call, message, meta) {
    if (!isObj(message) || message.isError === true) return null;
    var metaPath = isObj(meta) && typeof meta.path === 'string' && meta.path ? meta.path : null;
    var text = parseResultText(resultText(message));
    var fromCall = call && MUTATIONS[call.name] ? statsFromCall(call.name, call.args) : null;
    var diffs = call && MUTATIONS[call.name] && isObj(meta) ? statsFromDiffs(meta.diffs) : null;
    var counts = text || diffs || fromCall;
    if (!counts) return null;
    var args = call ? parseArgs(call.args) : null;
    var path = metaPath || (text && text.path) || (fromCall && fromCall.path) ||
      (diffs && meta.diffs[0].path) || (args && (args.file_path || args.path)) || null;
    if (typeof path !== 'string' || !path) return null;
    return { added: counts.added, removed: counts.removed, path: path };
  }

  // ---- the store --------------------------------------------------------------------------------

  // One turn's running list. `ingest` takes dsh session events ({ type, seq, data }); everything it
  // does not recognise is ignored. A new turn (or a different turn/start event) starts a fresh list.
  function createStore() {
    var s = { turn: null, startSeq: null, files: [], index: {}, calls: {}, seen: {}, revision: 0 };
    var listeners = [];
    var cache = null;

    function snapshot() {
      if (cache && cache.revision === s.revision) return cache;
      var files = s.files.map(function (f) { return { path: f.path, added: f.added, removed: f.removed, edits: f.edits }; });
      var t = { added: 0, removed: 0, files: files.length, edits: 0 };
      files.forEach(function (f) { t.added += f.added; t.removed += f.removed; t.edits += f.edits; });
      cache = { revision: s.revision, turn: s.turn, files: files, totals: t };
      return cache;
    }
    function notify() {
      s.revision++;
      var snap = snapshot();
      listeners.slice().forEach(function (fn) { try { fn(snap); } catch (e) { warn('live diff listener failed', e); } });
    }
    function reset(turn, seq) {
      s = { turn: turn, startSeq: seq, files: [], index: {}, calls: {}, seen: {}, revision: s.revision };
      notify();
    }
    function add(path, added, removed) {
      var f = s.index[path];
      if (!f) { f = { path: path, added: 0, removed: 0, edits: 0 }; s.index[path] = f; s.files.push(f); }
      f.added += added;
      f.removed += removed;
      f.edits += 1;
    }

    function ingest(event) {
      try {
        if (!isObj(event) || !isObj(event.data)) return;
        var d = event.data;
        var turn = typeof d.turn === 'number' ? d.turn : null;
        if (event.type === 'turn/start') {
          if (turn !== s.turn || (event.seq !== undefined && event.seq !== s.startSeq)) reset(turn, event.seq === undefined ? null : event.seq);
          return;
        }
        if (event.type !== 'tool/call' && event.type !== 'tool/result') return;
        if (turn !== null && turn !== s.turn) reset(turn, null); // a window without its turn/start
        if (event.type === 'tool/call') {
          if (d.callId !== undefined && d.callId !== null) s.calls[String(d.callId)] = { name: d.name, args: d.arguments };
          return;
        }
        var msg = d.message;
        var callId = isObj(msg) && isObj(msg.source) && msg.source.callId !== undefined ? String(msg.source.callId)
          : (isObj(msg) && msg.toolCallId !== undefined ? String(msg.toolCallId) : null);
        var key = callId !== null ? callId : (event.seq !== undefined ? 'seq:' + event.seq : null);
        if (key !== null && s.seen[key]) return;
        var st = statsFromResult(callId !== null ? s.calls[callId] : null, msg, d.meta);
        if (key !== null) s.seen[key] = true;
        if (!st) return;
        add(st.path, st.added, st.removed);
        notify();
      } catch (e) { warn('live diff event skipped', e); }
    }

    return {
      ingest: ingest,
      snapshot: snapshot,
      subscribe: function (fn) {
        listeners.push(fn);
        return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
      }
    };
  }

  // ---- dsh event Definition ---------------------------------------------------------------------

  var store = createStore();

  // State-only Definition: it publishes no transcript node, it just feeds the store. Replacement
  // (compaction) copies of tool results are skipped; only append-origin results are real calls.
  var definition = {
    kind: NAME_KIND,
    match: function (event) {
      if (!isObj(event) || !isObj(event.data)) return null;
      var t = event.type;
      if (t !== 'turn/start' && t !== 'tool/call' && t !== 'tool/result') return null;
      if (typeof event.data.turn !== 'number') return null;
      if (t === 'tool/result' && isObj(event.surfaceOp)) return null;
      return { id: String(event.data.turn), role: t === 'turn/start' ? 'start' : 'update' };
    },
    start: function (_context, match) {
      store.ingest(match.event);
      return { turn: match.event.data.turn };
    },
    update: function (context, match) {
      store.ingest(match.event);
      return context.state && context.state.turn === match.event.data.turn ? context.state : { turn: match.event.data.turn };
    }
  };

  // ---- panel ------------------------------------------------------------------------------------

  var MINUS = '−';

  function splitPath(p) {
    var clean = String(p).replace(/\\/g, '/');
    var i = clean.lastIndexOf('/');
    var name = i < 0 ? clean : clean.slice(i + 1);
    var dir = i < 0 ? '' : clean.slice(0, i).split('/').filter(Boolean);
    var tail = dir ? dir.slice(-2).join('/') : '';
    return { name: name || clean, dir: dir && dir.length > 2 ? '…/' + tail : tail };
  }

  function LiveDiffPanel() {
    var R = CC.React || {};
    var h = CC.h;
    var T = CC.tokens || {};
    var size = T.size || {};
    var font = T.font || {};
    var state = typeof R.useState === 'function' ? R.useState(function () { return store.snapshot(); }) : [store.snapshot(), noop];
    if (typeof R.useEffect === 'function') {
      R.useEffect(function () {
        state[1](store.snapshot());
        return store.subscribe(function (snap) { state[1](snap); });
      }, []);
    }
    try { if (CC.ensureStyles) CC.ensureStyles(); } catch (e) { warn('styles not injected', e); }
    var snap = state[0];
    var meta = { fontSize: size.meta || 11, color: 'var(--cc-text-3)' };
    var mono = { fontFamily: font.mono, fontVariantNumeric: 'tabular-nums', fontSize: size.label || 12, whiteSpace: 'nowrap' };

    var body;
    if (!snap.files.length) {
      body = h('div', { 'data-cc-live': 'empty', style: Object.assign({ padding: '12px 0' }, meta) }, 'No edits yet this turn');
    } else {
      var t = snap.totals;
      body = [
        h('div', { key: 'total', 'data-cc-live': 'total', style: Object.assign({ display: 'flex', gap: 8, alignItems: 'baseline', padding: '0 0 8px',
          borderBottom: '1px solid var(--cc-line)' }, meta) },
        h('span', null, t.files + (t.files === 1 ? ' file' : ' files')),
        h('span', { style: mono }, h('span', { style: { color: 'var(--cc-done)' } }, '+' + t.added), ' ',
          h('span', { style: { color: 'var(--cc-error)' } }, MINUS + t.removed))),
        snap.files.map(function (f) {
          var p = splitPath(f.path);
          return h('div', { key: f.path, 'data-cc-live-row': f.path, title: f.path, style: { display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '6px 0', borderBottom: '1px solid var(--cc-line)', minWidth: 0 } },
          h('div', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            h('span', { style: { fontSize: size.label || 12, fontWeight: 500 } }, p.name),
            p.dir ? h('span', { style: Object.assign({ marginLeft: 8 }, meta) }, p.dir) : null),
          h('span', { 'data-cc-live': 'added', style: Object.assign({ color: 'var(--cc-done)' }, mono) }, '+' + f.added),
          h('span', { 'data-cc-live': 'removed', style: Object.assign({ color: 'var(--cc-error)', minWidth: 28, textAlign: 'right' }, mono) }, MINUS + f.removed));
        })
      ];
    }
    return h('div', { className: 'cc-root', 'data-cc-live': 'panel', style: { padding: 12, minHeight: '100%', boxSizing: 'border-box' } }, body);
  }

  // ---- wiring -----------------------------------------------------------------------------------

  // Called from CC.apply (app.js). Every step is guarded: a dsh without these seats just has no panel.
  CC.applyLiveDiff = function applyLiveDiff(ctx) {
    try {
      if (!ctx) return;
      var conv = ctx.uiConversation;
      var tabs = ctx.sidebarRightTabs;
      if (!conv || !conv.events || typeof conv.events.register !== 'function' || !tabs || typeof tabs.register !== 'function') {
        warn('Live changes skipped: dsh does not expose uiConversation / sidebarRightTabs to this plugin');
        return;
      }
      try { conv.events.register(definition); } catch (e) { warn('Live changes: event feed not registered', e); return; }
      var title = function () { return 'Changes'; };
      var register = function () {
        var off = tabs.register({
          id: TAB_ID, kind: NAME_KIND, title: title, keepMounted: true,
          guide: [{ id: 'live-diff', order: 90, title: title, description: function () { return 'Lines added and removed, live'; } }]
        });
        // A sidebar saved before the package rename still names the old id: keep it resolvable, with
        // no guide entry, so the + menu lists "Changes" once.
        var legacy = null;
        try { legacy = tabs.register({ id: LEGACY_TAB_ID, kind: NAME_KIND, title: title, keepMounted: true, guide: [] }); }
        catch (e) { warn('Live changes: old tab id not kept', e); }
        return function () {
          if (typeof off === 'function') off();
          if (typeof legacy === 'function') legacy();
        };
      };
      try { if (typeof ctx.effect === 'function') ctx.effect(register, 'waypoint: live changes tab type'); else register(); } catch (e) { warn('Live changes tab not registered', e); return; }
      if (typeof CC.contribute === 'function') {
        CC.contribute(ctx, 'sidebar.right.pane.tab', { name: 'sidebar.right.pane.tab', key: TAB_ID }, LiveDiffPanel, 'live changes panel');
        CC.contribute(ctx, 'sidebar.right.pane.tab', { name: 'sidebar.right.pane.tab', key: LEGACY_TAB_ID }, LiveDiffPanel, 'live changes panel (old id)');
      }
    } catch (e) { warn('Live changes skipped', e); }
  };

  CC.liveDiff = {
    parseResultText: parseResultText, lineCount: lineCount, diffCounts: diffCounts, statsFromDiffs: statsFromDiffs,
    statsFromCall: statsFromCall, statsFromResult: statsFromResult, createStore: createStore, splitPath: splitPath
  };
  CC.liveDiffStore = store;
  CC.liveDiffDefinition = definition;
  CC.LiveDiffPanel = LiveDiffPanel;
})(CC);
