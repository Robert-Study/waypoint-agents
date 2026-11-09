// tab_approvals.js - CC.ApprovalsTab: everything that waits for the owner, in one place.
//   Needs you   open questions from agents (board_read needs): items (scale, choice, multi, text) answered
//               together, a choice question answered in one click per option, an approval with Approve/Reject.
//   Approvals   open to-dos that ask for a decision (every category except hands_on).
//   Hands-on    open to-dos in category hands_on: real effort, ticked with Done.
// Data: board_read with no project ({projects, todos, needs}). Writes: answer and todo_tick (with expected_rev),
// each through CC.wpc.act(..., ['board_read']) so the board reads again after the server answers.
// The answer input mirrors the reference page (sendAnswer): {decision, question, option | answers | text}.
(function (CC) {
  'use strict';
  var h = CC.h;

  var STYLE = [
    '.cc-root .cc-ap-q{padding:8px;border-bottom:1px solid var(--cc-line);font-size:12px;}',
    '.cc-root .cc-ap-q:last-child{border-bottom:0;}',
    '.cc-root .cc-ap-where{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--cc-text-3);font-size:11px;}',
    '.cc-root .cc-ap-prob{margin:4px 0 0;color:var(--cc-text);}',
    '.cc-root .cc-ap-res{margin:2px 0 0;color:var(--cc-text-2);}',
    '.cc-root .cc-ap-it{margin:8px 0 0;}',
    '.cc-root .cc-ap-it-p{margin:0 0 4px;color:var(--cc-text);}',
    '.cc-root .cc-ap-pick{display:flex;flex-wrap:wrap;gap:4px;align-items:center;}',
    '.cc-root .cc-ap-pick label{display:inline-flex;align-items:center;gap:6px;margin-right:8px;}',
    '.cc-root .cc-ap-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;}',
    '.cc-root .cc-ap-acts .cc-in{flex:1 1 200px;width:auto;height:28px;}',
    '.cc-root .cc-ap-msg{margin-top:4px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-ap-on{border-color:var(--cc-accent);color:var(--cc-accent);}'
  ].join('\n');

  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-approvals')) return;
    var el = document.createElement('style');
    el.id = 'cc-tab-approvals';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ---- pure helpers (tested)

  function kindOf(q) {
    if (q && q.items && q.items.length) return 'items';
    if (q && q.options && q.options.length) return 'choice';
    return 'approval';
  }

  // The next value of one item after the owner picks `value` (single pick toggles off; multi adds/removes).
  function pick(item, current, value) {
    if (item.kind === 'multi') {
      var list = Array.isArray(current) ? current.slice() : [];
      var at = list.indexOf(value);
      if (at >= 0) list.splice(at, 1); else list.push(value);
      return list;
    }
    if (item.kind === 'text') return value;
    return current === value ? undefined : value;
  }

  function trim(s) { return typeof s === 'string' ? s.trim() : ''; }

  // {input} ready for the answer tool, or {error} in plain words. form = {picks: {itemId: value}, text}.
  function buildAnswer(q, form, decision, option) {
    form = form || {};
    var input = { decision: decision, question: q.id };
    var text = trim(form.text);
    if (decision === 'answers') {
      var answers = {}, picks = form.picks || {};
      (q.items || []).forEach(function (it) {
        var v = picks[it.id];
        if (it.kind === 'scale') {
          var n = Number(v);
          if (v !== undefined && v !== null && v !== '' && n >= 1 && n <= 9 && Math.floor(n) === n) answers[it.id] = n;
        } else if (it.kind === 'choice') {
          if (v !== undefined && (it.options || []).indexOf(v) >= 0) answers[it.id] = v;
        } else if (it.kind === 'multi') {
          var on = (Array.isArray(v) ? v : []).filter(function (x) { return (it.options || []).indexOf(x) >= 0; });
          if (on.length) answers[it.id] = on;
        } else if (trim(v)) {
          answers[it.id] = trim(v);
        }
      });
      if (!Object.keys(answers).length) return { error: 'Pick at least one answer first.' };
      input.answers = answers;
      return { input: input };
    }
    if (decision === 'option') {
      if ((q.options || []).indexOf(option) < 0) return { error: 'That is not one of the options.' };
      input.option = option;
    }
    if (decision === 'reply' && !text) return { error: 'Write a reply first.' };
    if (text) input.text = text;
    return { input: input };
  }

  function isOpen(t) { return t && (!t.status || t.status === 'open'); }

  function splitTodos(todos) {
    var out = { approvals: [], handsOn: [] };
    (todos || []).forEach(function (t) {
      if (!isOpen(t)) return;
      (t.category === 'hands_on' ? out.handsOn : out.approvals).push(t);
    });
    return out;
  }

  function tickInput(t) {
    var input = { id: t.id };
    if (t.rev !== undefined && t.rev !== null && Number(t.rev) >= 1) input.expected_rev = Number(t.rev);
    return input;
  }

  function titles(projects) {
    var map = {};
    (projects || []).forEach(function (p) { if (p && p.id) map[p.id] = p.title || p.id; });
    return map;
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function meta(needs, split) {
    return plural(needs.length, 'question', 'questions') + ' · ' + plural(split.approvals.length, 'approval', 'approvals') +
      ' · ' + split.handsOn.length + ' hands-on';
  }

  // One write: say "Sending…", call the tool, refresh board_read, then say the result. Resolves to true on success.
  function send(tool, input, say) {
    say('Sending…');
    return CC.wpc.act(tool, input, ['board_read']).then(function () {
      say(tool === 'todo_tick' ? 'Done.' : 'Answered; sent to the agent.');
      return true;
    }, function (err) {
      say((tool === 'todo_tick' ? 'Not done: ' : 'Not sent: ') + ((err && err.message) || 'error'));
      return false;
    });
  }

  // ---- view

  function Chip(p) { return p.title ? CC.ui.Badge({ title: 'Project', children: p.title }) : null; }

  function Question(p) {
    var ui = CC.ui, q = p.q, form = p.form || {}, busy = p.busy, kind = kindOf(q);
    function go(decision, option) {
      var r = buildAnswer(q, form, decision, option);
      if (r.error) { p.say(r.error); return undefined; }
      return p.onSend(r.input);
    }
    function setPick(it, value) {
      var picks = Object.assign({}, form.picks || {});
      picks[it.id] = pick(it, picks[it.id], value);
      p.onForm(Object.assign({}, form, { picks: picks }));
    }
    var body = [];
    if (kind === 'items') {
      q.items.forEach(function (it) {
        var cur = (form.picks || {})[it.id], ctl;
        if (it.kind === 'scale' || it.kind === 'choice') {
          var opts = it.kind === 'scale' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : (it.options || []);
          ctl = opts.map(function (o) {
            return h(ui.Button, { key: String(o), size: 'sm', className: cur === o ? 'cc-ap-on' : '', title: String(o),
              onClick: function () { setPick(it, o); }}, String(o));
          });
        } else if (it.kind === 'multi') {
          ctl = (it.options || []).map(function (o) {
            return h('label', { key: o }, h('input', { type: 'checkbox', checked: Array.isArray(cur) && cur.indexOf(o) >= 0,
              onChange: function () { setPick(it, o); } }), o);
          });
        } else {
          ctl = h('input', { className: 'cc-in', type: 'text', value: cur || '', placeholder: 'Your answer (optional)',
            'aria-label': it.prompt, onChange: function (e) { setPick(it, e.target.value); } });
        }
        body.push(h('div', { key: it.id, className: 'cc-ap-it' },
          h('div', { className: 'cc-ap-it-p' }, it.id + '. ' + it.prompt,
            it.kind === 'scale' ? ' (1 disagree, 9 agree)' : it.kind === 'multi' ? ' (tick any)' : ''),
          h('div', { className: 'cc-ap-pick', 'data-item': q.id + '/' + it.id }, ctl)));
      });
    }
    var acts = [];
    if (kind === 'items') {
      acts.push(h(ui.Button, { key: 'send', kind: 'primary', size: 'sm', disabled: busy, action: 'answer-items',
        onClick: function () { go('answers'); }}, 'Send answers'));
    } else {
      if (q.resolution || kind === 'approval') {
        acts.push(h(ui.Button, { key: 'ok', size: 'sm', disabled: busy, action: 'answer-approve',
          onClick: function () { go('approve'); }}, 'Approve'));
      }
      (q.options || []).forEach(function (o) {
        acts.push(h(ui.Button, { key: 'o-' + o, size: 'sm', disabled: busy, action: 'answer-option',
          className: o === q.recommended ? 'cc-ap-on' : '', title: o === q.recommended ? 'Recommended' : o,
          onClick: function () { go('option', o); }}, o + (o === q.recommended ? ' (recommended)' : '')));
      });
    }
    acts.push(h(ui.Button, { key: 'no', size: 'sm', kind: 'danger', disabled: busy, action: 'answer-reject',
      onClick: function () { go('reject'); }}, 'Reject'));
    if (kind !== 'items') {
      acts.push(h('input', { key: 'reply', className: 'cc-in', type: 'text', value: form.text || '', placeholder: 'Note or reply (optional)',
        'aria-label': 'Reply', onChange: function (e) { p.onForm(Object.assign({}, form, { text: e.target.value })); },
        onKeyDown: function (e) { if (e && e.key === 'Enter') go('reply'); } }));
      acts.push(h(ui.Button, { key: 'send', size: 'sm', disabled: busy, action: 'answer-reply',
        onClick: function () { go('reply'); }}, 'Send'));
    }
    return h('div', { className: 'cc-ap-q', 'data-cc-row': q.id },
      h('div', { className: 'cc-ap-where' }, Chip({ title: p.project }), q.node ? h('span', null, q.node) : null),
      h('div', { className: 'cc-ap-prob' }, q.problem || '(no problem written)'),
      q.resolution ? h('div', { className: 'cc-ap-res' }, 'Proposed: ' + q.resolution) : null,
      body,
      h('div', { className: 'cc-ap-acts' }, acts),
      p.msg ? h('div', { className: 'cc-ap-msg', role: 'status' }, p.msg) : null);
  }

  function TodoRow(p) {
    var ui = CC.ui, t = p.t;
    return ui.Row({ key: t.id, id: t.id, wrap: true, lead: Chip({ title: p.project }), title: t.text || t.id,
      sub: p.msg || undefined,
      trail: [
        t.link ? h('a', { key: 'open', className: 'cc-b cc-b-sm cc-b-quiet', href: t.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open') : null,
        h(ui.Button, { key: 'done', size: 'sm', disabled: p.busy, action: 'todo-done', title: 'Mark this done',
          onClick: p.onDone}, 'Done')
      ] });
  }

  function ApprovalsTab(props) {
    var React = CC.React, ui = CC.ui;
    ensureCss();
    var board = CC.useWpc('board_read', {});
    var formsSt = React.useState({}), forms = formsSt[0], setForms = formsSt[1];
    var busySt = React.useState(null), busy = busySt[0], setBusy = busySt[1];
    var msgSt = React.useState({}), msgs = msgSt[0], setMsgs = msgSt[1];
    var statusSt = React.useState(''), status = statusSt[0], setStatus = statusSt[1];

    function sayFor(key) {
      return function (m) {
        setStatus(m);
        setMsgs(function (prev) { var n = Object.assign({}, prev); n[key] = m; return n; });
      };
    }
    function run(key, tool, input) {
      if (busy) return undefined;
      setBusy(key);
      return send(tool, input, sayFor(key)).then(function (ok) {
        setBusy(null);
        if (ok) setForms(function (prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
        return ok;
      });
    }

    var data = board.data;
    var header = ui.PageHeader({ title: 'Approvals', pageId: props && props.pageId,
      meta: data ? meta(data.needs || [], splitTodos(data.todos)) : null,
      actions: h(ui.Button, { size: 'sm', kind: 'quiet', title: 'Read the board again', onClick: board.reload}, 'Refresh') });

    if (!data) {
      var inner = board.error ? h(CC.WpcProblem, { error: board.error })
        : ui.Empty({ title: board.loading ? 'Loading…' : 'Nothing to show yet' });
      return ui.Page({ page: 'approvals', header: header, children: inner });
    }

    var names = titles(data.projects);
    var needs = data.needs || [];
    var split = splitTodos(data.todos);
    var banners = [
      board.error ? h(ui.Banner, { key: 'stale', tone: 'error' }, 'Could not refresh: ' + (board.error.message || board.error.code) + ' Showing the last board.') : null,
      status ? h(ui.Banner, { key: 'status' }, status) : null
    ].filter(Boolean);

    var body;
    if (!needs.length && !split.approvals.length && !split.handsOn.length) {
      body = ui.Empty({ title: 'Nothing waits for you', body: 'Agent questions and to-dos show here when they arrive.' });
    } else {
      var todoRows = function (list) {
        return ui.List({ label: 'To-dos', children: list.map(function (t) {
          return TodoRow({ key: t.id, t: t, project: names[t.project] || t.project, busy: !!busy, msg: msgs[t.id],
            onDone: function () { return run(t.id, 'todo_tick', tickInput(t)); } });
        }) });
      };
      body = [
        ui.Section({ key: 'needs', section: 'needs', title: 'Needs you', meta: String(needs.length),
          children: needs.length ? needs.map(function (q) {
            return h(Question, { key: q.id, q: q, project: names[q.project] || q.project, form: forms[q.id], busy: !!busy, msg: msgs[q.id],
              say: sayFor(q.id),
              onForm: function (f) { setForms(function (prev) { var n = Object.assign({}, prev); n[q.id] = f; return n; }); },
              onSend: function (input) { return run(q.id, 'answer', input); } });
          }) : h('div', { className: 'cc-ap-msg' }, 'No open questions.') }),
        ui.Section({ key: 'approvals', section: 'approvals', title: 'Approvals', meta: String(split.approvals.length),
          children: split.approvals.length ? todoRows(split.approvals) : h('div', { className: 'cc-ap-msg' }, 'No decisions waiting.') }),
        ui.Section({ key: 'hands-on', section: 'hands-on', title: 'Hands-on', meta: String(split.handsOn.length),
          children: split.handsOn.length ? todoRows(split.handsOn) : h('div', { className: 'cc-ap-msg' }, 'No hands-on work waiting.') })
      ];
    }
    return ui.Page({ page: 'approvals', header: header, banner: banners.length ? banners : null, col: true, children: body });
  }

  CC.ApprovalsTab = ApprovalsTab;
  CC.approvalsTabInternals = { kindOf: kindOf, pick: pick, buildAnswer: buildAnswer, splitTodos: splitTodos,
    tickInput: tickInput, titles: titles, meta: meta, send: send };
})(CC);
