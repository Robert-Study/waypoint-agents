(function (CC) {
  // To-do page (page id cc-todo): one add field (Enter adds), then two lists. "For you" holds what
  // agents left for the owner, numbered in order with the next one marked; "For the computer" holds
  // what the owner jotted, each sent on with one click: Plan (a draft plan), Add to project (the
  // engine picks the project and writes a task with a done-check) or Run (a one-task item the
  // Autonomous tab starts). Done items fold into "Done (n)" at the bottom. The morning brief is one
  // meta line and its triage (merge duplicates, add to the project that fits) a compact list.
  // Engine routes: todo.py and brief.py (/api/todos*, /api/brief); the page renders with the engine down.
  'use strict';

  var PLAN_KEY = 'cc.plan.session';
  var CREATE_KEY = 'cc.create.project';
  var RUN_KEY = 'cc.autonomous.project';
  var TARGET_ORDER = ['plan', 'project', 'run'];
  var OPEN_STATES = { open: true, handed_off: true };

  var STYLE = [
    '.cc-root.cc-td{color:var(--cc-text);color-scheme:light;}',
    '@media (prefers-color-scheme: dark){.cc-root.cc-td:not([data-theme="light"]){color-scheme:dark;}}',
    '.cc-root.cc-td[data-theme="dark"],html[data-theme="dark"] .cc-root.cc-td,body.dark .cc-root.cc-td,body.theme-dark .cc-root.cc-td{color-scheme:dark;}',
    '.cc-root .cc-td-body{max-width:880px;}',
    // Add: one field; Enter adds. The small Add button is there for the mouse.
    '.cc-root .cc-td-add{display:flex;align-items:center;gap:8px;margin:0 0 8px;}',
    '.cc-root .cc-td-add .cc-in{flex:1 1 auto;min-width:0;}',
    '.cc-root .cc-td-err{font-size:12px;color:var(--cc-error);margin:0 0 8px;}',
    // Brief: one meta line; triage: a compact suggestion list, one button per row.
    '.cc-root .cc-td-brief{margin:0 0 4px;}',
    '.cc-root .cc-td-para{margin:0 0 8px;font-size:11px;line-height:16px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-td-tri{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-td-tri li{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(0,auto) auto;align-items:center;gap:10px;min-height:32px;padding:0 8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-td-tri li:last-child{border-bottom:0;}',
    '.cc-root .cc-td-tag{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-td-grow{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-td-to{max-width:280px;min-width:0;font-size:11px;color:var(--cc-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    // Rows: 32 px, a checkbox lead, text clamped to two lines (full text on hover; click expands).
    '.cc-root .cc-td-list{display:flex;flex-direction:column;}',
    '.cc-root .cc-td-row{display:grid;grid-template-columns:16px minmax(0,1fr) auto;column-gap:10px;row-gap:2px;align-items:start;min-height:32px;padding:7px 8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-td-row:last-child{border-bottom:0;}',
    '.cc-root .cc-td-row:hover{background:var(--cc-wash);}',
    '.cc-root .cc-td-row.cc-td-human{grid-template-columns:16px 16px minmax(0,1fr) auto;}',
    '.cc-root .cc-td-text{min-width:0;line-height:18px;overflow:hidden;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;cursor:pointer;}',
    '.cc-root .cc-td-text[aria-expanded="true"]{display:block;}',
    '.cc-root .cc-td-text:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;border-radius:2px;}',
    '.cc-root .cc-td-row.cc-td-closed .cc-td-text{color:var(--cc-text-3);text-decoration:line-through;}',
    // The checkbox itself is the kit's (ui.js: 16 px, accent); the lead span only sets it on the first text line.
    '.cc-root .cc-td-row > .cc-r-lead{height:18px;}',
    '.cc-root .cc-td input[type="checkbox"]:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    '.cc-root .cc-td-num{font-size:11px;line-height:18px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;text-align:right;}',
    '.cc-root .cc-td-tagnext,.cc-root .cc-td-tagnote{display:flex;align-items:center;min-height:18px;white-space:nowrap;}',
    '.cc-root .cc-td-tagnote{font-size:11px;color:var(--cc-text-3);}',
    // Row actions are quiet at rest: they show on hover or keyboard focus (and stay while a hand-off is in flight).
    '.cc-root .cc-td-acts{display:flex;gap:2px;align-items:center;margin:-3px 0;opacity:0;transition:opacity var(--cc-fast) ease;}',
    '.cc-root .cc-td-row:hover .cc-td-acts,.cc-root .cc-td-row:focus-within .cc-td-acts,.cc-root .cc-td-row.cc-td-live .cc-td-acts{opacity:1;}',
    '@media (hover: none){.cc-root .cc-td-acts{opacity:1;}}',
    '.cc-root .cc-td-hand{display:inline-flex;gap:2px;}',
    '.cc-root .cc-td-meta{grid-column:2 / -1;font-size:11px;line-height:16px;color:var(--cc-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-td-human .cc-td-meta,.cc-root .cc-td-human .cc-td-detail{grid-column:3 / -1;}',
    '.cc-root .cc-td-res{grid-column:2 / -1;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-td-res-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:18px;}',
    '.cc-root .cc-td-res-line > span:first-child{color:var(--cc-text-2);}',
    '.cc-root .cc-td-link{border:0;background:transparent;color:var(--cc-accent);font:inherit;font-size:11px;padding:0;cursor:pointer;}',
    '.cc-root .cc-td-link:hover{text-decoration:underline;}',
    '.cc-root .cc-td-link:focus-visible{outline:2px solid var(--cc-focus);outline-offset:1px;}',
    '.cc-root .cc-td-pick{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
    '.cc-root .cc-td-detail{grid-column:2 / -1;display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--cc-text-2);}',
    '.cc-root .cc-td-detail a{color:var(--cc-accent);text-decoration:none;overflow-wrap:anywhere;}',
    '.cc-root .cc-td-detail a:hover{text-decoration:underline;}',
    '.cc-root .cc-td-dl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}',
    '.cc-root .cc-td-empty{font-size:12px;color:var(--cc-text-3);padding:6px 8px;}',
    '.cc-root .cc-td-more{display:flex;align-items:center;gap:6px;}',
    '.cc-root .cc-td-more svg{transition:transform var(--cc-fast) ease;}',
    '.cc-root .cc-td-more[aria-expanded="true"] svg{transform:rotate(90deg);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-td-acts,.cc-root .cc-td-more svg{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-todo-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-todo-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // The shared kit (ui.js). A harness that loads this file without ui.js gets a bare stand-in with the
  // same class names, so the page never depends on load order.
  var LITE = {
    Page: function (p) {
      return CC.h('div', { className: 'cc-root cc-page ' + (p.className || ''), 'data-cc': p.id }, p.header || null,
        CC.h('div', { className: 'cc-pb cc-pb-pad' }, p.children));
    },
    PageHeader: function (p) {
      return CC.h('div', { className: 'cc-ph', role: 'toolbar', 'aria-label': p.title }, CC.h('div', { className: 'cc-ph-title' }, p.title),
        p.meta ? CC.h('div', { className: 'cc-ph-meta' }, p.meta) : null, CC.h('div', { className: 'cc-ph-gap' }));
    },
    Section: function (p) {
      return CC.h('section', { className: 'cc-sec ' + (p.className || ''), 'aria-label': p.title },
        CC.h('div', { className: 'cc-sec-h' }, CC.h('div', { className: 'cc-sec-t' }, p.title),
          p.meta !== undefined && p.meta !== null ? CC.h('div', { className: 'cc-sec-m' }, p.meta) : null), p.children);
    },
    Badge: function (p) { return CC.h('span', { className: 'cc-bd' + (p.tone ? ' cc-bd-' + p.tone : '') }, p.children); },
    Empty: function (p) { return CC.h('div', { className: 'cc-em' }, CC.h('div', { className: 'cc-em-t' }, p.title), p.body ? CC.h('div', { className: 'cc-em-b' }, p.body) : null); },
    Icon: function () { return null; },
    ICONS: {}
  };
  function kit() { return CC.ui || LITE; }

  // Kit button classes, written directly so tests and the bundle see the same <button>.
  function btn(kind, size) { return 'cc-b' + (kind && kind !== 'default' ? ' cc-b-' + kind : '') + (size === 'sm' ? ' cc-b-sm' : ''); }

  function remember(key, value) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch (e) { /* storage blocked: the tab just opens unselected */ }
  }
  function go(panel) {
    try {
      if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') { CC.ctx.layout.selectPanel(panel); return true; }
    } catch (e) { /* fall through */ }
    return false;
  }

  // ------------------------------------------------------------ pure helpers
  function isOpen(t) { return !!OPEN_STATES[t.status]; }

  // Open todos, newest first; done ones only when asked for; dropped (merged away) never.
  function visibleTodos(todos, showDone) {
    var out = (todos || []).filter(function (t) { return isOpen(t) || (showDone && t.status === 'done'); });
    return out.slice().reverse();
  }

  function checkLine(check) {
    var c = check || {};
    if (c.type === 'command') return 'Done when ' + (c.run || 'its command') + ' passes';
    if (c.type === 'files_exist') return 'Done when ' + ((c.paths || []).join(', ') || 'its files') + ' exist';
    if (c.type === 'text_present') return 'Done when ' + (c.path || 'its file') + ' says ' + JSON.stringify(c.text || '');
    return 'Done when you confirm';
  }

  // The latest hand-off per target, in the order Plan, Project, Run.
  function handoffLines(todo) {
    var latest = {};
    (todo.handoffs || []).forEach(function (e) { latest[e.to] = e; });
    return TARGET_ORDER.filter(function (to) { return latest[to]; }).map(function (to) {
      var e = latest[to], ref = e.ref || {};
      if (to === 'plan') return { to: to, text: 'Plan: questions started', meta: null, open: 'Open Plan', ref: ref };
      if (to === 'project') {
        return { to: to, text: 'Added to ' + (ref.title || ref.project) + ' as ' + ref.node,
          meta: ref.check ? checkLine(ref.check) : null, open: 'Open project', ref: ref };
      }
      return { to: to, text: 'Run: ready in Autonomous', meta: ref.check ? checkLine(ref.check) : null, open: 'Open Autonomous', ref: ref };
    });
  }

  // Triage entries that still apply to the todos as they are now.
  function triageView(brief, todos) {
    var tri = (brief && brief.triage) || {};
    var status = {};
    (todos || []).forEach(function (t) { status[t.id] = t.status; });
    function live(id) { return status[id] === undefined || status[id] === 'open'; }
    var merges = [];
    (tri.merges || []).forEach(function (m) {
      var keepStatus = status[m.keep];
      if (keepStatus !== undefined && keepStatus !== 'open') return;
      var rest = (m.merge || []).filter(live);
      if (rest.length) merges.push(Object.assign({}, m, { merge: rest }));
    });
    var suggestions = (tri.suggestions || []).filter(function (s) { return status[s.todo] === 'open'; });
    return { merges: merges, suggestions: suggestions };
  }

  // Sections: the engine sends sections.{computer,human}; an old engine sends none, so every item is the computer's.
  function sectionsOf(data, todos) {
    var sec = data && data.sections;
    var byId = {};
    (todos || []).forEach(function (t) { byId[t.id] = t; });
    if (!sec || !Array.isArray(sec.computer) || !Array.isArray(sec.human)) {
      return { sectioned: false, computer: todos || [], human: [] };
    }
    function pick(list) {
      return list.map(function (t) { return byId[t.id] || t; }).filter(function (t) { return t && t.status !== 'dropped'; });
    }
    var human = pick(sec.human).sort(function (a, b) { return (a.position || 0) - (b.position || 0); });
    return { sectioned: true, computer: pick(sec.computer), human: human };
  }

  // "archives in 5h" from archive_due_at (rounded up); null when unset.
  function archiveNote(t, now) {
    if (!t || !t.archive_due_at) return null;
    var due = Date.parse(t.archive_due_at);
    if (isNaN(due)) return null;
    var hrs = Math.ceil((due - (now === undefined ? Date.now() : now)) / 3600000);
    return hrs <= 0 ? 'archives soon' : 'archives in ' + hrs + 'h';
  }

  // Where a computer item went: "-> project X, task Y" or "-> run".
  function wentTo(t) {
    var n = t && t.node;
    if (n && n.project) return '→ project ' + n.project + (n.id ? ', task ' + n.id : '');
    var hs = (t && t.handoffs) || [];
    var last = hs[hs.length - 1];
    if (!last) return null;
    var ref = last.ref || {};
    if (last.to === 'project') return '→ project ' + (ref.title || ref.project || '') + (ref.node ? ', task ' + ref.node : '');
    if (last.to === 'run') return '→ run';
    return null;
  }

  function nextOpenId(human) {
    for (var i = 0; i < human.length; i++) if (isOpen(human[i])) return human[i].id;
    return null;
  }

  function errText(e) {
    if (!e) return 'Something went wrong';
    if (!e.status) return 'The engine is not running';
    if (e.status === 403) return 'Only the owner can change this';
    return (e.data && (e.data.detail || e.data.error)) || e.message || 'Something went wrong';
  }
  function quote(text) { return '“' + text + '”'; }

  // The brief paragraph without its "Usage left: ..." sentence; the header already shows usage.
  function briefText(paragraph) {
    return String(paragraph || '').replace(/\s*Usage left:[\s\S]*?(?:\.(?=\s|$)|$)/g, '').trim();
  }

  CC.todoView = { visibleTodos: visibleTodos, handoffLines: handoffLines, checkLine: checkLine, triageView: triageView,
    briefText: briefText, style: STYLE,
    sectionsOf: sectionsOf, archiveNote: archiveNote, wentTo: wentTo, nextOpenId: nextOpenId };

  // ------------------------------------------------------------ pieces
  // The brief as one meta line, then the triage as a compact list with one button per suggestion.
  function Brief(props) {
    var h = CC.h;
    var brief = props.brief;
    if (!brief || !brief.paragraph) return null;
    var para = briefText(brief.paragraph);
    var tri = triageView(brief, props.todos);
    var items = [];
    tri.merges.forEach(function (m) {
      items.push(h('li', { key: 'm-' + m.keep },
        h('span', { className: 'cc-td-tag' }, 'Merge'),
        h('span', { className: 'cc-td-grow', title: m.text }, quote(m.text)),
        h('span', { className: 'cc-td-to' }, m.merge.length + ' similar'),
        h('button', { className: btn('default', 'sm'), type: 'button', disabled: props.busy,
          onClick: function () { props.onMerge(m); } }, 'Merge')));
    });
    tri.suggestions.forEach(function (s) {
      items.push(h('li', { key: 's-' + s.todo },
        h('span', { className: 'cc-td-tag' }, 'Project'),
        h('span', { className: 'cc-td-grow', title: s.text }, quote(s.text)),
        h('span', { className: 'cc-td-to', title: s.title }, '→ ' + s.title),
        h('button', { className: btn('default', 'sm'), type: 'button', disabled: props.busy, title: 'Add to ' + s.title,
          onClick: function () { props.onSuggest(s); } }, 'Add')));
    });
    // The summary line sits under the add field; the suggestions come after the two lists.
    if (props.part === 'line') {
      return para ? h('div', { className: 'cc-td-brief', 'aria-label': 'Morning brief', role: 'region' },
        h('p', { className: 'cc-td-para', title: para }, para)) : null;
    }
    return items.length ? h(kit().Section, { className: 'cc-td-sugg', title: 'Suggestions', meta: String(items.length) },
      h('ul', { className: 'cc-td-tri' }, items)) : null;
  }

  function Result(props) {
    var h = CC.h;
    var todo = props.todo, st = props.state || {};
    var lines = handoffLines(todo);
    var pick = st.pick;
    if (!lines.length && !st.error && !pick) return null;
    return h('div', { className: 'cc-td-res', 'aria-live': 'polite' },
      lines.map(function (l) {
        return h('div', { key: l.to, className: 'cc-td-res-line', title: l.meta || undefined },
          h('span', null, l.text),
          h('button', { className: 'cc-td-link', type: 'button', onClick: function () { props.onOpen(l); } }, l.open));
      }),
      pick ? h('div', { className: 'cc-td-pick' },
        h('span', null, 'No project fits clearly. Choose one:'),
        pick.map(function (c) {
          return h('button', { key: c.project, className: btn('default', 'sm'), type: 'button', disabled: !!st.busy,
            onClick: function () { props.onPick(c.project); } }, c.title || c.project);
        })) : null,
      st.error ? h('div', { className: 'cc-td-err', role: 'status' }, st.error) : null);
  }

  function Detail(props) {
    var h = CC.h, t = props.todo;
    var parts = [];
    if (t.link) parts.push(h('div', { key: 'link' }, h('a', { href: t.link, target: '_blank', rel: 'noopener noreferrer' }, t.link)));
    if (t.node && t.node.project) parts.push(h('div', { key: 'node' }, 'Project ' + t.node.project + (t.node.id ? ', task ' + t.node.id : '')));
    var dl = t.deliverables || [];
    if (t.status === 'done' && dl.length) {
      parts.push(h('ul', { key: 'dl', className: 'cc-td-dl', 'aria-label': 'Deliverables' }, dl.map(function (d, i) {
        var ref = (d.project || '') + (d.node ? ' / ' + d.node : '');
        if (d.url) return h('li', { key: i }, h('a', { href: d.url, target: '_blank', rel: 'noopener noreferrer' }, d.label || d.url));
        return h('li', { key: i }, (d.label ? d.label + ': ' : '') + ref);
      })));
    }
    if (!parts.length) parts.push(h('div', { key: 'none', className: 'cc-td-tagnote' }, t.status === 'done' ? 'Nothing to review.' : 'No details yet.'));
    return h('div', { className: 'cc-td-detail' }, parts);
  }

  // The item text: two lines at most, full text in the tooltip; a click expands it with its details.
  function textButton(props, t) {
    var h = CC.h;
    return h('div', { className: 'cc-td-text', role: 'button', tabIndex: 0, 'aria-expanded': !!props.expanded, title: t.text,
      onClick: function () { props.onToggle(t); },
      onKeyDown: function (e) { if (e && (e.key === 'Enter' || e.key === ' ')) { if (e.preventDefault) e.preventDefault(); props.onToggle(t); } } }, t.text);
  }

  function tick(props, t) {
    // A plain checkbox in the kit's row lead, so the kit's one checkbox style applies.
    return CC.h('span', { className: 'cc-r-lead' }, CC.h('input', { type: 'checkbox', checked: !!t.done, 'aria-label': (t.done ? 'Reopen ' : 'Mark done: ') + t.text,
      onChange: function () { props.onDone(t); } }));
  }

  // One item "for you": number, tick, text, Next / auto, archive note, expandable detail.
  function HumanRow(props) {
    var h = CC.h, t = props.todo, closed = !isOpen(t);
    var auto = t.done_by === 'engine' && t.status === 'done';
    var note = archiveNote(t);
    var tag = props.next ? h('span', { className: 'cc-td-tagnext' }, h(kit().Badge, { title: 'Do this one next' }, 'Next'))
      : (auto ? h('span', { className: 'cc-td-tagnote', title: 'Ticked by the engine' }, 'auto') : h('span', null));
    return h('div', { className: 'cc-td-row' + (props.index == null ? '' : ' cc-td-human') + (closed ? ' cc-td-closed' : ''), role: 'listitem', 'data-kind': 'todo', 'data-section': 'human', 'data-id': t.id },
      // Done items (no number) line up with the computer's rows in the Done list.
      props.index == null ? null : h('span', { className: 'cc-td-num' }, props.index + 1),
      tick(props, t),
      textButton(props, t),
      tag,
      note ? h('div', { className: 'cc-td-meta' }, note) : null,
      props.expanded ? h(Detail, { todo: t }) : null);
  }

  function Row(props) {
    var h = CC.h;
    var t = props.todo, st = props.state || {}, busy = st.busy;
    var closed = !isOpen(t);
    var label = { plan: 'Starting…', project: 'Adding…', run: 'Queuing…' };
    function send(to, name) {
      return h('button', { key: to, type: 'button', className: btn('quiet', 'sm'), disabled: !!busy || closed,
        onClick: function () { props.onHandoff(t, to); } }, busy === to ? label[to] : name);
    }
    var live = !!(busy || st.error || st.pick);
    var remove = h('button', { className: btn('quiet', 'sm') + ' cc-b-icon', type: 'button', 'aria-label': 'Remove', title: 'Remove',
      onClick: function () { props.onRemove(t); } }, '×');
    var meta = [wentTo(t), archiveNote(t)].filter(Boolean).join(' · ');
    return h('div', { className: 'cc-td-row' + (closed ? ' cc-td-closed' : '') + (live ? ' cc-td-live' : ''), role: 'listitem', 'data-kind': 'todo', 'data-section': 'computer', 'data-id': t.id },
      tick(props, t),
      textButton(props, t),
      closed ? h('div', { className: 'cc-td-acts' }, remove)
        : h('div', { className: 'cc-td-acts' },
          h('div', { className: 'cc-td-hand', role: 'group', 'aria-label': 'Send on' }, send('plan', 'Plan'), send('project', 'Add to project'), send('run', 'Run')),
          remove),
      meta ? h('div', { className: 'cc-td-meta' }, meta) : null,
      h(Result, { todo: t, state: st, onOpen: props.onOpen, onPick: function (project) { props.onHandoff(t, 'project', project); } }),
      props.expanded ? h(Detail, { todo: t }) : null);
  }

  // ------------------------------------------------------------ page
  CC.TodoPage = function TodoPage(props) {
    var React = CC.React, h = CC.h, UI = kit();
    var P = props || {};
    ensurePageStyle();
    var fixed = P.data !== undefined;
    var live = CC.useEngine ? CC.useEngine(fixed ? null : '/api/todos', ['todo', 'state', 'question']) : { data: null, error: null, loading: false };
    var liveBrief = CC.useEngine ? CC.useEngine(P.brief !== undefined ? null : '/api/brief', ['state', 'question']) : { data: null };
    var data = fixed ? P.data : live.data;
    var error = P.error !== undefined ? P.error : live.error;
    var brief = P.brief !== undefined ? P.brief : liveBrief.data;

    var sText = React.useState(P.initialText || ''), text = sText[0], setText = sText[1];
    var sOver = React.useState({}), over = sOver[0], setOver = sOver[1];
    var sAdded = React.useState([]), added = sAdded[0], setAdded = sAdded[1];
    var sRes = React.useState(P.initialResults || {}), results = sRes[0], setResults = sRes[1];
    var sDone = React.useState(!!P.initialShowDone), showDone = sDone[0], setShowDone = sDone[1];
    var sNote = React.useState(null), note = sNote[0], setNote = sNote[1];
    var sBusy = React.useState(false), busy = sBusy[0], setBusy = sBusy[1];
    var sOpen = React.useState(P.initialExpanded || {}), expanded = sOpen[0], setExpanded = sOpen[1];

    var base = (data && data.todos) || [];
    var known = {};
    base.forEach(function (t) { known[t.id] = true; });
    var todos = base.concat(added.filter(function (t) { return !known[t.id]; })).map(function (t) { return over[t.id] || t; });
    var secs = sectionsOf(data, todos);
    if (secs.sectioned) {
      // Items just added here but not yet in the engine's list belong to the computer section.
      var listed = {};
      secs.computer.concat(secs.human).forEach(function (t) { listed[t.id] = true; });
      secs.computer = secs.computer.concat(added.filter(function (t) { return !listed[t.id]; }).map(function (t) { return over[t.id] || t; }));
    }
    // Open items in each list; done ones (from both) fold into "Done (n)" at the bottom.
    var computerOpen = visibleTodos(secs.computer, false);
    var humanOpen = secs.human.filter(isOpen);
    var doneHuman = secs.human.filter(function (t) { return t.status === 'done'; });
    var doneComputer = secs.computer.filter(function (t) { return t.status === 'done'; }).slice().reverse();
    var doneCount = doneHuman.length + doneComputer.length;
    var openCount = todos.filter(isOpen).length;
    var nextId = nextOpenId(secs.human);

    function apply(todo) { if (todo && todo.id) setOver(function (p) { var n = Object.assign({}, p); n[todo.id] = todo; return n; }); }
    function setState(id, st) { setResults(function (p) { var n = Object.assign({}, p); n[id] = st; return n; }); }

    function add() {
      var value = text.trim();
      if (!value || busy) return;
      setBusy(true); setNote(null);
      var pr = CC.api.post('/api/todos', secs.sectioned ? { text: value, section: 'computer' } : { text: value });
      pr.then(function (r) {
        setBusy(false); setText('');
        if (r && r.todo) setAdded(function (p) { return p.concat([r.todo]); });
      }, function (e) { setBusy(false); setNote(errText(e)); });
    }
    function patch(todo, body) {
      var pr = CC.api.post('/api/todos/update', Object.assign({ id: todo.id }, body));
      pr.then(function (r) { apply(r && r.todo); }, function (e) { setNote(errText(e)); });
    }
    function onToggle(todo) {
      var opening = !expanded[todo.id];
      setExpanded(function (p) { var n = Object.assign({}, p); n[todo.id] = !p[todo.id]; return n; });
      if (opening) {
        var pr = CC.api.post('/api/todos/click', { id: todo.id });
        pr.then(function (r) { apply(r && r.todo); }, function () { /* the click record is best effort */ });
      }
    }
    function onDone(todo) { patch(todo, { done: !todo.done }); }
    function onRemove(todo) { patch(todo, { status: 'dropped' }); }

    function onHandoff(todo, to, project) {
      var body = { id: todo.id, to: to };
      if (project) body.project = project;
      setState(todo.id, { busy: to });
      var pr = CC.api.post('/api/todos/handoff', body);
      pr.then(function (r) {
        setState(todo.id, {});
        apply(r && r.todo);
      }, function (e) {
        var d = e && e.data;
        if (e && e.status === 409 && d && d.error === 'no_match') {
          setState(todo.id, { pick: (d.candidates || []).map(function (c) { return { project: c.project, title: c.title }; }) });
        } else {
          setState(todo.id, { error: errText(e) });
        }
      });
    }
    function onOpen(line) {
      var ref = line.ref || {}, ok = false;
      if (line.to === 'plan') { remember(PLAN_KEY, ref.session); ok = go('cc-plan'); }
      else if (line.to === 'project') { remember(CREATE_KEY, ref.project); CC.pendingProject = ref.project; ok = go('cc-create'); }
      else { remember(RUN_KEY, ref.project); ok = go('cc-sprints'); }
      if (!ok) setNote('Open it from the sidebar');
    }
    function onMerge(m) {
      setBusy(true); setNote(null);
      var pr = CC.api.post('/api/todos/merge', { keep: m.keep, merge: m.merge });
      pr.then(function (r) {
        setBusy(false);
        ((r && r.merged) || []).forEach(apply);
        apply(r && r.todo);
      }, function (e) { setBusy(false); setNote(errText(e)); });
    }
    function onSuggest(s) {
      var t = todos.filter(function (x) { return x.id === s.todo; })[0] || { id: s.todo };
      onHandoff(t, 'project', s.project);
    }

    function computerRow(t) {
      return h(Row, { key: t.id, todo: t, state: results[t.id], expanded: !!expanded[t.id], onToggle: onToggle,
        onHandoff: onHandoff, onDone: onDone, onRemove: onRemove, onOpen: onOpen });
    }
    function humanRow(t, i, next) {
      return h(HumanRow, { key: t.id, todo: t, index: i, next: next, expanded: !!expanded[t.id], onToggle: onToggle, onDone: onDone });
    }

    var offline = !data && error;
    var body;
    if (offline) {
      body = !error.status && typeof UI.CoreEmpty === 'function' ? h(UI.CoreEmpty, {}) : h(UI.Empty, { title: !error.status ? 'The engine is not running' : 'Could not load your to-dos',
        body: !error.status ? 'It starts at sign-in.' : errText(error) });
    } else {
      body = h('div', { className: 'cc-td-body' },
        h('form', { key: 'add', className: 'cc-td-add', onSubmit: function (e) { if (e && e.preventDefault) e.preventDefault(); add(); } },
          h('input', { className: 'cc-in', type: 'text', value: text, 'aria-label': 'Add a todo', placeholder: 'Add a to-do and press Enter',
            maxLength: 2000, onChange: function (e) { setText(e.target.value); } }),
          h('button', { className: btn('default'), type: 'submit', disabled: !text.trim() || busy,
            onClick: function (e) { if (e && e.preventDefault) e.preventDefault(); add(); } }, 'Add')),
        note ? h('div', { key: 'note', className: 'cc-td-err', role: 'status' }, note) : null,
        brief ? h(Brief, { key: 'brief', part: 'line', brief: brief, todos: todos }) : null,
        !data ? h('div', { key: 'load', className: 'cc-td-empty', role: 'status' }, 'Loading…') : null,
        data && secs.sectioned ? h(UI.Section, { key: 'human', className: 'cc-td-sec', title: 'For you', meta: humanOpen.length ? String(humanOpen.length) : null },
          humanOpen.length
            ? h('div', { className: 'cc-td-list', role: 'list' }, humanOpen.map(function (t, i) { return humanRow(t, i, t.id === nextId); }))
            : h('div', { className: 'cc-td-empty' }, 'Nothing for you right now.')) : null,
        data ? h(UI.Section, { key: 'computer', className: 'cc-td-sec', title: 'For the computer', meta: computerOpen.length ? String(computerOpen.length) : null },
          computerOpen.length
            ? h('div', { className: 'cc-td-list', role: 'list' }, computerOpen.map(computerRow))
            : h('div', { className: 'cc-td-empty' }, 'Nothing to do.')) : null,
        brief && data ? h(Brief, { key: 'sugg', brief: brief, todos: todos, busy: busy, onMerge: onMerge, onSuggest: onSuggest }) : null,
        data && doneCount ? h('section', { key: 'done', className: 'cc-sec cc-td-sec cc-td-done', 'aria-label': 'Done' },
          h('button', { className: btn('quiet', 'sm') + ' cc-td-more', type: 'button', 'aria-expanded': showDone,
            onClick: function () { setShowDone(!showDone); } },
            UI.Icon && UI.ICONS && UI.ICONS.chevron ? h(UI.Icon, { d: UI.ICONS.chevron, size: 14 }) : null, 'Done (' + doneCount + ')'),
          showDone ? h('div', { className: 'cc-td-list', role: 'list' },
            doneHuman.map(function (t) { return humanRow(t, null, false); }),
            doneComputer.map(computerRow)) : null) : null);
    }

    return h(UI.Page, { id: 'todo', className: 'cc-td', header: h(UI.PageHeader, { title: 'To-do', meta: data ? openCount + ' open' : null, pageId: 'cc-todo' }) },
      body);
  };
})(CC);
