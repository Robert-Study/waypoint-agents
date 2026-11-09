(function (CC) {
  // Plan mode: describe a new project, pick the planner model and effort, and let the deep planner
  // (deep_plan.py: brief, research, questions, framework, graph, prompts, critique) work. The owner
  // answers only what research could not find, reviews the scored graph and accepts it. Engine
  // routes: /api/plan/deep* and /api/plan/accept; the classic /api/planner/* flow stays as the
  // fallback when the engine has no deep planner yet. Never a paid API.
  var POLL_MS = 2000;
  var SAFETY_POLL_MS = 60000;
  var SESSION_KEY = 'cc.plan.session';
  var DEEP_KEY = 'cc.plan.deep';
  var CREATE_KEY = 'cc.create.project';
  var BUSY = { asking: true, drafting: true, running: true };
  var PURPOSE_WORD = { preference: 'Your preference', generic: 'This project' };
  var CHECK_WORD = { command: 'command', files_exist: 'file', text_present: 'text', human: 'you' };
  // Summary counts: [singular, plural] per check type.
  var CHECK_COUNT = { command: ['command check', 'command checks'], files_exist: ['file check', 'file checks'],
    text_present: ['text check', 'text checks'], human: ['for you', 'for you'] };
  var EFFORT_LABEL = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max' };
  var PICK = '__pick__';
  // Used until GET /api/plan/deep/options answers (or when the engine is older).
  var FALLBACK_OPTIONS = {
    models: [
      { id: 'claude-opus', label: 'Claude Opus', free: false, enabled: true },
      { id: 'claude-sonnet', label: 'Claude Sonnet', free: false, enabled: true },
      { id: 'claude-fable', label: 'Claude Fable', free: false, enabled: true },
      { id: 'freebuff', label: 'Freebuff (free)', free: true, enabled: true }
    ],
    efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    default: { model: 'claude-opus', effort: 'high', why: null, source: 'fixed' }
  };
  var STAGE_WORD = { pending: 'Waiting', running: 'Working', done: 'Done', skipped: 'Skipped',
    waiting: 'Waiting for you', error: 'Stopped' };

  // Page chrome comes from the kit (ui.js: Page, PageHeader, cc-b buttons, cc-in fields); these
  // rules cover the stepper, the form column, questions, stages and the draft checklist.
  var STYLE = [
    '.cc-root.cc-plan{position:relative;color:var(--cc-text);}',
    // A disabled primary reads as disabled, not as washed-out mint.
    '.cc-root.cc-plan .cc-b-primary:disabled{opacity:1;background:var(--cc-surface-2);border-color:var(--cc-line-strong);color:var(--cc-text-3);}',
    '.cc-root .cc-pl-link{border:0;background:transparent;color:var(--cc-text-3);font:inherit;font-size:11px;padding:0;cursor:pointer;align-self:flex-start;}',
    '.cc-root .cc-pl-link:hover{color:var(--cc-text);}',
    '.cc-root .cc-pl-link:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-input::placeholder,.cc-root .cc-in::placeholder{color:var(--cc-text-3);}',
    '.cc-root .cc-in:disabled{opacity:.6;}',
    '.cc-root .cc-field{display:flex;flex-direction:column;gap:4px;min-width:0;}',
    '.cc-root .cc-field > label{font-size:12px;font-weight:500;color:var(--cc-text-2);}',
    '.cc-root .cc-toast{position:absolute;left:50%;bottom:64px;z-index:6;transform:translateX(-50%);background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);padding:6px 12px;font-size:12px;}',
    // Stepper in the header: small numbered marks joined by short rules; done steps carry a tick.
    '.cc-root .cc-pl-steps{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--cc-text-3);margin:0;padding:0;list-style:none;}',
    '.cc-root .cc-pl-step{display:flex;align-items:center;gap:6px;white-space:nowrap;}',
    '.cc-root .cc-pl-num{width:16px;height:16px;border-radius:50%;border:1px solid var(--cc-line-strong);display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;font-variant-numeric:tabular-nums;box-sizing:border-box;}',
    '.cc-root .cc-pl-step.cc-on{color:var(--cc-text);font-weight:500;}',
    '.cc-root .cc-pl-step.cc-on .cc-pl-num{border-color:var(--cc-accent);color:var(--cc-accent);}',
    '.cc-root .cc-pl-step.cc-past{color:var(--cc-text-2);}',
    '.cc-root .cc-pl-step.cc-past .cc-pl-num{border-color:var(--cc-done);color:var(--cc-done);}',
    '.cc-root .cc-pl-rule{width:12px;height:1px;background:var(--cc-line-strong);flex:none;}',
    // Form column: left aligned, at most 960 px, labels above fields.
    '.cc-root .cc-pl-scroll{flex:1;min-height:0;overflow:auto;position:relative;}',
    '.cc-root .cc-pl-col{max-width:960px;padding:16px 16px 32px;display:flex;flex-direction:column;gap:16px;}',
    '.cc-root .cc-pl-h{font-size:14px;font-weight:600;line-height:1.35;margin:0;}',
    '.cc-root .cc-pl-sub{font-size:12px;color:var(--cc-text-3);margin:-12px 0 0;}',
    '.cc-root .cc-pl-pick{display:grid;grid-template-columns:repeat(2,minmax(0,280px));gap:12px;}',
    '.cc-root .cc-pl-sel{color-scheme:light;}',
    '.cc-root .cc-pl-sel{background:var(--cc-surface);color:var(--cc-text);}',
    '.cc-root .cc-pl-sel:disabled{opacity:.45;}',
    '.cc-root .cc-pl-sel option{background:var(--cc-surface);color:var(--cc-text);}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]) .cc-pl-sel{color-scheme:dark;}}',
    '.cc-root[data-theme="dark"] .cc-pl-sel,html[data-theme="dark"] .cc-root .cc-pl-sel,body.dark .cc-root .cc-pl-sel{color-scheme:dark;}',
    '.cc-root .cc-pl-foot{display:flex;flex-direction:row-reverse;justify-content:flex-end;align-items:center;gap:12px;}',
    '.cc-root .cc-pl-foot .cc-in{flex:1;width:auto;}',
    '.cc-root .cc-pl-foot .cc-meta{min-width:0;}',
    '.cc-root .cc-pl-err{color:var(--cc-error);font-size:12px;}',
    // Questions: one numbered row each, answered inline; hairlines between them, no boxes.
    '.cc-root .cc-pl-qs{display:flex;flex-direction:column;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-q{display:grid;grid-template-columns:20px minmax(0,1fr);gap:6px 12px;padding:12px 0;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-qn{grid-row:1 / 4;width:18px;height:18px;margin-top:1px;border-radius:50%;border:1px solid var(--cc-line-strong);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--cc-text-2);font-variant-numeric:tabular-nums;box-sizing:border-box;}',
    '.cc-root .cc-pl-q.cc-pl-answered .cc-pl-qn{border-color:var(--cc-done);color:var(--cc-done);}',
    '.cc-root .cc-pl-qp{font-size:14px;font-weight:500;line-height:1.4;}',
    '.cc-root .cc-pl-qh{display:flex;justify-content:space-between;gap:12px;align-items:baseline;min-width:0;}',
    '.cc-root .cc-pl-q textarea{min-height:56px;}',
    '.cc-root .cc-pl-saved{color:var(--cc-done);}',
    // Stage strip: one 24 px line per stage.
    '.cc-root .cc-pl-stages{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-pl-stage{display:flex;align-items:center;gap:8px;height:24px;font-size:12px;min-width:0;}',
    '.cc-root .cc-pl-mark{width:8px;height:8px;border-radius:50%;flex:none;border:1.5px solid var(--cc-neutral);box-sizing:border-box;}',
    '.cc-root .cc-st-done .cc-pl-mark{background:var(--cc-done);border-color:var(--cc-done);}',
    '.cc-root .cc-st-running .cc-pl-mark{background:var(--cc-running);border-color:var(--cc-running);}',
    '.cc-root .cc-st-waiting .cc-pl-mark{border-color:var(--cc-accent);}',
    '.cc-root .cc-st-error .cc-pl-mark{background:var(--cc-error);border-color:var(--cc-error);}',
    '.cc-root .cc-st-skipped .cc-pl-mark{border-style:dashed;}',
    '.cc-root .cc-pl-slabel{width:80px;flex:none;color:var(--cc-text);}',
    '.cc-root .cc-st-pending .cc-pl-slabel,.cc-root .cc-st-skipped .cc-pl-slabel{color:var(--cc-text-3);}',
    '.cc-root .cc-pl-sline{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--cc-text-2);}',
    // Draft: the graph on the canvas, the plan as a dense checklist in the side panel, one action bar.
    '.cc-root .cc-pl-body{display:flex;flex:1;min-height:0;position:relative;}',
    '.cc-root .cc-pl-canvas{position:relative;background:var(--cc-canvas);overflow:hidden;}',
    '.cc-root .cc-pl-side{display:flex;flex-direction:column;font-size:12px;}',
    '.cc-root .cc-pl-sec{padding:12px 16px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-sec:last-child{border-bottom:0;}',
    '.cc-root .cc-pl-title{font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
    '.cc-root .cc-pl-brief{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);}',
    '.cc-root .cc-pl-cap{font-size:12px;font-weight:600;color:var(--cc-text);display:flex;justify-content:space-between;align-items:baseline;gap:8px;}',
    '.cc-root .cc-pl-cap .cc-meta{font-weight:400;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-pl-goal1{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-pl-more{display:flex;flex-direction:column;gap:8px;}',
    '.cc-root .cc-pl-more[hidden]{display:none;}',
    // The checklist: a header row and 28 px rows in aligned columns (wave or number, task, id, check).
    '.cc-root .cc-pl-th,.cc-root .cc-pl-task{display:grid;grid-template-columns:28px minmax(0,1fr) 52px 56px;align-items:center;gap:8px;}',
    '.cc-root .cc-pl-th{height:24px;padding:0 8px;margin:0 -8px;font-size:11px;color:var(--cc-text-3);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-tasks{list-style:none;margin:0 -8px;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-pl-tasks li + li{border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-pl-task{width:100%;height:28px;padding:0 8px;box-sizing:border-box;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer;}',
    '.cc-root .cc-pl-task:hover{background:var(--cc-wash);}',
    '.cc-root .cc-pl-task.cc-sel{background:var(--cc-selection);}',
    '.cc-root .cc-pl-task:focus-visible{outline:2px solid var(--cc-accent);outline-offset:-2px;}',
    '.cc-root .cc-pl-tn{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-pl-tt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-pl-tm,.cc-root .cc-pl-tc{font-size:11px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-pl-kv{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 12px;margin:0;font-size:12px;}',
    '.cc-root .cc-pl-kv dt{color:var(--cc-text-3);}',
    '.cc-root .cc-pl-kv dd{margin:0;min-width:0;overflow-wrap:anywhere;}',
    '.cc-root .cc-pl-mono{font-family:var(--cc-mono);font-size:11px;}',
    '.cc-root .cc-pl-folder{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-pl-chips{display:flex;flex-wrap:wrap;gap:4px;}',
    '.cc-root .cc-pl-chip{border:1px solid var(--cc-line-strong);background:transparent;color:var(--cc-text-2);font:inherit;font-size:11px;height:20px;padding:0 6px;border-radius:999px;cursor:pointer;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-pl-chip:hover{color:var(--cc-text);background:var(--cc-wash);}',
    '.cc-root .cc-pl-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px;font-size:12px;}',
    '.cc-root .cc-pl-act{display:flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-top:1px solid var(--cc-line);background:var(--cc-surface);flex:none;}',
    '.cc-root .cc-pl-act .cc-in{flex:1;min-width:0;width:auto;}',
    '.cc-root .cc-pl-lead{margin-right:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--cc-text-2);min-width:0;}',
    '.cc-root .cc-pl-ok{color:var(--cc-done);font-weight:600;}',
    '.cc-root .cc-pl-scores{display:flex;gap:16px;}',
    '.cc-root .cc-pl-score{display:flex;flex-direction:column;gap:2px;}',
    '.cc-root .cc-pl-score b{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;}'
  ].join('\n');

  function ensurePageStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || document.getElementById('cc-plan-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-plan-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function remember(key, value) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
    } catch (e) { /* storage blocked: the page still works, it just forgets */ }
  }
  function recall(key) {
    try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); } catch (e) { return null; }
  }

  function checkLine(check) {
    var helpers = CC.createHelpers;
    if (helpers && helpers.checkSummary) return helpers.checkSummary(check);
    return 'Done when its ' + ((check && CHECK_WORD[check.type]) || 'check') + ' passes';
  }

  // The step a classic session is on: 1 describe, 2 questions, 3 draft.
  function stepOf(s) {
    if (!s) return 1;
    if (s.status === 'asking' || (s.status === 'error' && s.phase === 'questions')) return 1;
    if (s.status === 'questions' || (s.status === 'drafting' && !s.draft)) return 2;
    return 3;
  }

  function answerBody(q, value) {
    return q.kind === 'text' ? { type: 'reply', value: value } : { type: 'answer', value: value };
  }
  function hasValue(v) {
    return v != null && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'string' && !v.trim());
  }
  function storedValue(q) {
    return q.answer && q.answer.type !== 'ignore' ? q.answer.value : undefined;
  }

  // ---------------------------------------------------------------- deep plan helpers
  function isDeep(s) { return !!(s && Array.isArray(s.stages)); }
  function stageWord(state) { return STAGE_WORD[state] || STAGE_WORD.pending; }
  function scoreParts(sc) {
    if (!sc) return [];
    function v(x) { return x == null ? '–' : String(x); }
    return [{ label: 'Critical path', value: v(sc.critical_path) }, { label: 'Width', value: v(sc.peak_width) },
      { label: 'Overlaps', value: v(sc.overlaps) }];
  }
  function modelRow(options, id) {
    return ((options && options.models) || []).filter(function (m) { return m.id === id; })[0] || null;
  }
  function effortLabel(x) { return EFFORT_LABEL[x] || (x ? x.charAt(0).toUpperCase() + x.slice(1) : ''); }
  function modelLine(s) {
    var label = s.model_label || s.model || '';
    return label + (s.effort && s.model !== 'freebuff' ? ' · ' + effortLabel(s.effort) : '');
  }
  // What Start planning sends, or null while a choice is missing. Pick for me takes the engine's pick.
  function resolveChoice(options, model, effort) {
    var opts = options || FALLBACK_OPTIONS;
    if (model === PICK) {
      var d = opts.default || {};
      return d.model ? { model: d.model, effort: d.effort || null } : null;
    }
    var row = modelRow(opts, model);
    if (!row || row.enabled === false) return null;
    if (row.free) return { model: model, effort: null };
    return effort ? { model: model, effort: effort } : null;
  }

  // One line per stage: a status mark, the stage name, and what it did.
  function PlanStages(props) {
    var h = CC.h;
    return h('ol', { className: 'cc-pl-stages', 'aria-label': 'Planning stages' },
      (props.stages || []).map(function (st) {
        return h('li', { key: st.id, className: 'cc-pl-stage cc-st-' + st.state, title: st.line || stageWord(st.state) },
          h('span', { className: 'cc-pl-mark' + (st.state === 'running' ? ' cc-pulse' : ''), 'aria-hidden': 'true' }),
          h('span', { className: 'cc-pl-slabel' }, st.label),
          h('span', { className: 'cc-pl-sline' }, st.line || (st.state === 'pending' ? '' : stageWord(st.state))));
      }));
  }

  function PlanScores(props) {
    var h = CC.h;
    var parts = scoreParts(props.scores);
    if (!parts.length) return null;
    return h('div', { className: 'cc-pl-scores', 'aria-label': 'Graph scores' },
      parts.map(function (p) {
        return h('div', { key: p.label, className: 'cc-pl-score' },
          h('span', { className: 'cc-meta' }, p.label), h('b', null, p.value));
      }));
  }

  function PlanModelPicker(props) {
    var h = CC.h;
    var opts = props.options || FALLBACK_OPTIONS;
    var row = modelRow(opts, props.model);
    var free = !!(row && row.free), picking = props.model === PICK;
    var why = opts.default && opts.default.why;
    return h('div', { className: 'cc-pl-pick' },
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-model' }, 'Planner model'),
        h('select', { id: 'cc-pl-model', className: 'cc-in cc-pl-sel', 'aria-label': 'Planner model', value: props.model || '',
          disabled: props.disabled, onChange: function (e) { props.onModel(e.target.value); } },
          [h('option', { key: '', value: '' }, 'Choose…'),
            h('option', { key: PICK, value: PICK, title: why || undefined }, 'Pick for me')].concat(
            opts.models.map(function (m) {
              return h('option', { key: m.id, value: m.id, disabled: m.enabled === false }, m.label);
            })))),
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-effort' }, 'Effort'),
        h('select', { id: 'cc-pl-effort', className: 'cc-in cc-pl-sel', 'aria-label': 'Effort', value: picking || free ? '' : (props.effort || ''),
          disabled: props.disabled || free || picking, onChange: function (e) { props.onEffort(e.target.value); } },
          [h('option', { key: '', value: '' }, picking ? 'Auto' : free ? 'None' : 'Choose…')].concat(
            (opts.efforts || []).map(function (x) { return h('option', { key: x, value: x }, effortLabel(x)); })))));
  }

  // ---------------------------------------------------------------- shared pieces
  function Steps(props) {
    var h = CC.h;
    var out = [];
    ['Describe', 'Questions', 'Draft'].forEach(function (label, i) {
      var n = i + 1, on = props.step === n, past = props.step > n;
      if (i) out.push(h('li', { key: 'r' + n, className: 'cc-pl-rule', 'aria-hidden': 'true' }));
      out.push(h('li', { key: label, className: 'cc-pl-step' + (on ? ' cc-on' : past ? ' cc-past' : ''), 'aria-current': on ? 'step' : undefined },
        h('span', { className: 'cc-pl-num', 'aria-hidden': 'true' }, past ? '✓' : String(n)), label));
    });
    return h('ol', { className: 'cc-pl-steps', 'aria-label': 'Steps' }, out);
  }

  function Describe(props) {
    var h = CC.h, React = CC.React;
    var s = props.session, init = props.initial || {};
    var opts = props.options || FALLBACK_OPTIONS;
    var f = React.useState({ title: (s && s.title) || init.title || '', goal: (s && s.goal) || init.goal || '' });
    var form = f[0], setForm = f[1];
    // Nothing preselected: empty until the owner chooses (a stopped session keeps the earlier choice).
    var mm = React.useState(null), modelPick = mm[0], setModel = mm[1];
    var ee = React.useState(null), effortPick = ee[0], setEffort = ee[1];
    var model = modelPick != null ? modelPick : (s && s.model) || '';
    var effort = effortPick != null ? effortPick : (s && s.effort) || '';
    var choice = resolveChoice(opts, model, effort);
    // The folder is Waypoint's choice (Drive by default); only a hand-over from elsewhere carries one.
    var cwd = (s && s.cwd) || init.cwd || null;
    function set(key) { return function (e) { var v = e.target.value; setForm(function (p) { var n = Object.assign({}, p); n[key] = v; return n; }); }; }
    var asking = s && s.status === 'asking';
    var ready = form.title.trim() && form.goal.trim() && choice && !props.busy && !asking;
    return h('div', { className: 'cc-pl-col' },
      h('h2', { className: 'cc-pl-h' }, 'What do you want to make?'),
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-title' }, 'Title'),
        h('input', { id: 'cc-pl-title', className: 'cc-in', value: form.title, disabled: asking, onChange: set('title') })),
      h('div', { className: 'cc-field' },
        h('label', { htmlFor: 'cc-pl-goal' }, 'Goal'),
        h('textarea', { id: 'cc-pl-goal', className: 'cc-in', rows: 5, value: form.goal, disabled: asking,
          placeholder: 'What is true when it is finished', onChange: set('goal') })),
      h(PlanModelPicker, { options: opts, model: model, effort: effort, disabled: asking || props.busy,
        onModel: setModel, onEffort: setEffort }),
      s && s.status === 'error' ? h('div', { className: 'cc-pl-err', role: 'status' }, s.error || 'The planner stopped.') : null,
      h('div', { className: 'cc-pl-foot' },
        asking ? h('span', { className: 'cc-meta' }, 'Writing a few questions…') : null,
        h('button', { className: 'cc-b cc-b-primary', type: 'button', disabled: !ready,
          onClick: function () {
            if (!choice) return;
            props.onStart({ title: form.title.trim(), goal: form.goal.trim(), cwd: cwd, model: choice.model, effort: choice.effort });
          } },
          asking ? 'Starting…' : 'Start planning')));
  }

  function Question(props) {
    var h = CC.h;
    var q = props.q, value = props.value, done = !!q.answered_at, filled = done || hasValue(value);
    var input;
    if (q.kind === 'likert' && CC.Likert) {
      input = h(CC.Likert, { scale: q.scale || 9, value: value == null ? null : value, labels: q.labels, ariaLabel: q.prompt, disabled: done || props.disabled, onChange: props.onChange });
    } else if (q.kind === 'select' && CC.SelectAll) {
      input = h(CC.SelectAll, { options: q.options || [], value: value || [], ariaLabel: q.prompt, disabled: done || props.disabled, onChange: props.onChange });
    } else {
      input = h('textarea', { className: 'cc-in', 'aria-label': q.prompt, value: value || '', disabled: done || props.disabled,
        onChange: function (e) { props.onChange(e.target.value); } });
    }
    return h('section', { className: 'cc-pl-q' + (filled ? ' cc-pl-answered' : ''), 'aria-label': q.prompt },
      h('span', { className: 'cc-pl-qn', 'aria-hidden': 'true' }, filled ? '✓' : String(props.n || '')),
      h('div', { className: 'cc-pl-qh' },
        h('div', { className: 'cc-pl-qp' }, q.prompt),
        h('span', { className: 'cc-meta' + (done ? ' cc-pl-saved' : '') }, done ? 'Saved' : (PURPOSE_WORD[q.purpose] || ''))),
      q.why ? h('div', { className: 'cc-meta' }, q.why) : null,
      h('div', null, input));
  }

  // The open questions as one numbered list.
  function QuestionList(props) {
    var h = CC.h;
    return h('div', { className: 'cc-pl-qs' }, props.questions.map(function (q, i) {
      return h(Question, { key: q.id, q: q, n: i + 1, disabled: props.disabled,
        value: q.answered_at ? storedValue(q) : props.answers[q.id],
        onChange: function (v) { props.onAnswer(q.id, v); } });
    }));
  }
  function answeredCount(qs, answers) {
    return qs.filter(function (q) { return q.answered_at || hasValue(answers[q.id]); }).length;
  }

  function Questions(props) {
    var h = CC.h;
    var s = props.session, qs = s.questions || [];
    var drafting = s.status === 'drafting';
    var count = answeredCount(qs, props.answers);
    return h('div', { className: 'cc-pl-col' },
      h('h2', { className: 'cc-pl-h' }, s.title),
      h('div', { className: 'cc-pl-sub' }, qs.length ? 'Answer what you can; skip anything that does not matter.' : 'No questions needed; the goal is clear enough to draft.'),
      qs.length ? h(QuestionList, { questions: qs, answers: props.answers, disabled: drafting || props.busy, onAnswer: props.onAnswer }) : null,
      h('div', { className: 'cc-pl-foot' },
        h('span', { className: 'cc-meta', 'aria-live': 'polite' },
          drafting ? 'Drafting the plan with Claude Code… this can take a few minutes.' : (qs.length ? count + ' of ' + qs.length + ' answered' : '')),
        h('button', { className: 'cc-b cc-b-primary', type: 'button', disabled: drafting || props.busy, onClick: props.onDraft },
          drafting ? 'Drafting…' : 'Draft the plan')));
  }

  function checkCounts(d) {
    var c = d.checks || {};
    var parts = Object.keys(CHECK_COUNT).filter(function (k) { return c[k]; }).map(function (k) {
      return c[k] + ' ' + CHECK_COUNT[k][c[k] === 1 ? 0 : 1];
    });
    return [d.tasks + ' task' + (d.tasks === 1 ? '' : 's')].concat(parts).join(' · ');
  }

  // Draft tasks in run order: grouped into waves (tasks in one wave can run side by side).
  function taskWaves(nodes) {
    var list = (nodes || []).filter(function (n) { return n && n.id != null; });
    if (CC.groupWaves) return CC.groupWaves(list).waves;
    return list.length ? [{ wave: 0, nodes: list, total: list.length }] : [];
  }

  // The selected task: what it does, how it is checked, what it needs.
  function TaskDetail(props) {
    var h = CC.h;
    var n = props.node;
    return h('div', { className: 'cc-pl-sec', 'aria-label': 'Task' },
      h('div', { className: 'cc-pl-qh' },
        h('div', { className: 'cc-pl-title' }, n.title || n.id),
        h('button', { className: 'cc-b cc-b-quiet cc-b-icon cc-b-sm', type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×')),
      n.goal ? h('p', { className: 'cc-pl-brief' }, n.goal) : null,
      h('dl', { className: 'cc-pl-kv' },
        h('dt', null, 'Id'), h('dd', { className: 'cc-pl-mono' }, n.id),
        h('dt', null, 'Check'), h('dd', null, checkLine(n.check)),
        n.deps && n.deps.length ? h('dt', null, 'Needs') : null,
        n.deps && n.deps.length ? h('dd', null, h('div', { className: 'cc-pl-chips' }, n.deps.map(function (d) {
          return h('button', { key: d, className: 'cc-pl-chip', type: 'button', onClick: function () { props.onSelect(String(d)); } }, d);
        }))) : null,
        n.files && n.files.length ? h('dt', null, 'Writes') : null,
        n.files && n.files.length ? h('dd', { className: 'cc-pl-mono' }, n.files.join(', ')) : null),
      props.onChange ? h('button', { className: 'cc-pl-link', type: 'button', onClick: function () { props.onChange(n); } }, 'Change this task') : null);
  }

  // The plan as a checklist in run order; the left column is the wave ("W1"), or the task number when the
  // plan is one wave. A row selects its node on the graph.
  function TaskList(props) {
    var h = CC.h;
    var waves = taskWaves(props.nodes);
    var many = waves.length > 1;
    var i = 0, rows = [];
    waves.forEach(function (w) {
      w.nodes.forEach(function (n) {
        var id = String(n.id), full = props.byId[id] || n;
        i += 1;
        rows.push(h('li', { key: id },
          h('button', { type: 'button', className: 'cc-pl-task' + (id === props.selected ? ' cc-sel' : ''), 'data-id': id,
            'aria-current': id === props.selected ? 'true' : undefined, title: full.goal || full.title || id,
            onClick: function () { props.onSelect(id === props.selected ? null : id); } },
            h('span', { className: 'cc-pl-tn' }, many ? 'W' + (w.wave + 1) : String(i)),
            h('span', { className: 'cc-pl-tt' }, full.title || id),
            h('span', { className: 'cc-pl-tm', title: id }, id),
            h('span', { className: 'cc-pl-tc' }, (full.check && CHECK_WORD[full.check.type]) || '–'))));
      });
    });
    return h('div', { className: 'cc-pl-sec' },
      h('div', { className: 'cc-pl-cap' }, h('span', null, 'Tasks'), h('span', { className: 'cc-meta' }, checkCounts(props.draft))),
      rows.length ? h('div', { className: 'cc-pl-th', 'aria-hidden': 'true' }, h('span', null, many ? 'Wave' : '#'), h('span', null, 'Task'), h('span', null, 'Id'), h('span', null, 'Check')) : null,
      rows.length ? h('ol', { className: 'cc-pl-tasks', 'aria-label': 'Tasks' }, rows)
        : h('div', { className: 'cc-meta' }, 'No tasks in this draft.'));
  }

  // The one line the summary shows at rest: the goal's first line, else the spec's first sentence.
  function oneLine(goal, brief) {
    var g = String(goal || '').trim().split(/\r?\n/)[0].trim();
    if (g) return g;
    var b = String(brief || '').trim().split(/\r?\n/)[0].trim();
    var m = /^[\s\S]*?[.!?](?=\s|$)/.exec(b);
    return m ? m[0] : b;
  }
  function hasKids(c) {
    return Array.isArray(c) ? c.some(hasKids) : !!c;
  }

  // Title, the one-line goal, and More: the full spec plus whatever the caller adds (scores, critique).
  function PlanSummary(props) {
    var h = CC.h, React = CC.React;
    var mm = React.useState(false), more = mm[0], setMore = mm[1];
    var brief = props.brief || '';
    var line = oneLine(props.goal, brief);
    var extra = hasKids(props.children);
    var hasMore = extra || (brief && brief !== line);
    return h('div', { className: 'cc-pl-sec' },
      h('div', { className: 'cc-pl-title' }, props.title),
      props.meta ? h('span', { className: 'cc-meta' }, props.meta) : null,
      props.folder ? h('span', { className: 'cc-meta cc-pl-mono cc-pl-folder', title: props.folder }, props.folder) : null,
      line ? h('p', { className: 'cc-pl-goal1', title: line }, line) : null,
      hasMore ? h('div', { className: 'cc-pl-more', hidden: !more },
        brief && brief !== line ? h('p', { className: 'cc-pl-brief' }, brief) : null,
        props.children) : null,
      hasMore ? h('button', { className: 'cc-pl-link', type: 'button', 'aria-expanded': more,
        onClick: function () { setMore(!more); } }, more ? 'Less' : 'More') : null);
  }

  // The side panel of a draft: summary, the selected task, then the checklist.
  function DraftSide(props) {
    var h = CC.h;
    var d = props.draft, node = props.selected ? props.byId[props.selected] : null;
    return h('aside', { className: 'cc-split-side cc-pl-side', 'aria-label': 'Plan' },
      h(PlanSummary, { title: d.title || props.title, meta: props.meta, folder: props.folder, goal: props.goal || d.goal, brief: d.brief }, props.extra),
      node ? h(TaskDetail, { node: node, onClose: function () { props.onSelect(null); }, onSelect: props.onSelect, onChange: props.onChange }) : null,
      h(TaskList, { draft: d, nodes: props.nodes, byId: props.byId, selected: props.selected, onSelect: props.onSelect }),
      props.after || null);
  }

  // The one action bar under a draft: accepted, or the lead text and the actions.
  function ActionBar(props) {
    var h = CC.h;
    if (props.accepted) {
      return h('div', { className: 'cc-pl-act' },
        h('span', { className: 'cc-pl-lead' }, h('span', { className: 'cc-pl-ok', 'aria-hidden': 'true' }, '✓'), 'Accepted. Its tasks run from Execute.'),
        h('button', { className: 'cc-b cc-b-primary', type: 'button', onClick: props.onOpen }, 'Open in Execute'));
    }
    return h('div', { className: 'cc-pl-act' }, props.children);
  }

  function boardNodes(data, d) {
    return data && data.nodes && data.nodes.length ? data.nodes : (d && d.nodes) || [];
  }

  // Classic planner draft (POST /api/planner/draft), kept for older engines.
  function Draft(props) {
    var h = CC.h, React = CC.React;
    var s = props.session, d = s.draft;
    var sl = React.useState(null), selected = sl[0], setSelected = sl[1];
    var nt = React.useState(''), note = nt[0], setNote = nt[1];
    var showDraft = d && (s.status === 'draft' || s.status === 'accepted' || s.status === 'drafting');
    var board = CC.useEngine(showDraft && s.project ? '/api/board?project=' + encodeURIComponent(s.project) : null, ['state']);
    var data = CC.unpackBoard(board.data) || { nodes: [], edges: [] };
    var byId = {};
    ((d && d.nodes) || []).forEach(function (n) { byId[n.id] = n; });
    var drafting = s.status === 'drafting';
    var accepted = s.status === 'accepted';

    var redraft = h('button', { key: 'r', className: 'cc-b', type: 'button',
      disabled: drafting || props.busy, onClick: function () { props.onRedraft(note.trim()); setNote(''); } }, drafting ? 'Drafting…' : 'Redraft');
    var noteBox = h('input', { key: 'n', className: 'cc-in', value: note, disabled: drafting || props.busy, 'aria-label': 'What should change',
      placeholder: 'What should change? Used by Redraft', onChange: function (e) { setNote(e.target.value); } });

    if (!showDraft) {
      return h('div', { className: 'cc-pl-scroll' }, h('div', { className: 'cc-pl-col' },
        h('h2', { className: 'cc-pl-h' }, s.title),
        s.status === 'problems' ? [
          h('div', { key: 'm' }, 'The draft did not pass its checks, so nothing was imported.'),
          h('ul', { key: 'l', className: 'cc-pl-list' }, (s.problems || []).map(function (p, i) { return h('li', { key: i }, p); }))
        ] : h('div', { className: 'cc-pl-err', role: 'status' }, s.error || 'The planner stopped.'),
        h('div', { className: 'cc-pl-foot' }, noteBox, h('button', { className: 'cc-b cc-b-primary', type: 'button',
          disabled: drafting || props.busy, onClick: function () { props.onRedraft(note.trim()); setNote(''); } }, drafting ? 'Drafting…' : 'Redraft'))));
    }
    return [
      h('div', { key: 'b', className: 'cc-split cc-pl-body' },
        h('div', { className: 'cc-split-main cc-pl-canvas' },
          CC.FlowView ? h(CC.FlowView, { board: data, filter: 'all', selected: selected, onSelect: setSelected, deselectOnBackground: true, dashUnnamed: true, cameraKey: s.project })
            : h('div', { className: 'cc-meta' }, 'Flow view unavailable')),
        h(DraftSide, { draft: d, title: s.title, folder: s.cwd, goal: s.goal, nodes: boardNodes(data, d), byId: byId, selected: selected, onSelect: setSelected,
          onChange: accepted ? null : function (n) { setNote(n.id + ' (' + (n.title || n.id) + '): '); } })),
      h(ActionBar, { key: 'a', accepted: accepted, onOpen: function () { props.onOpen(s.project); } },
        s.problems && s.problems.length ? h('span', { key: 'm', className: 'cc-pl-lead', style: { marginRight: 0, flex: 'none' } },
          h('span', { className: 'cc-pl-err' }, s.problems.length + ' problem(s)')) : null,
        noteBox, redraft,
        h('button', { key: 'ac', className: 'cc-b cc-b-primary', type: 'button', disabled: drafting || props.busy || !s.project,
          onClick: function () { props.onAccept(s.project, board.data && board.data.revision); } }, 'Accept plan'))
    ];
  }

  // ---------------------------------------------------------------- deep plan views
  // A deep plan at work, waiting for answers, or stopped: the stage strip and one action at most.
  function DeepRun(props) {
    var h = CC.h;
    var s = props.session, qs = s.questions || [];
    var waiting = s.status === 'questions';
    var stopped = s.status === 'error' || s.status === 'problems';
    var problem = s.status === 'problems' ? ((s.problems && s.problems[0]) || 'No usable graph') : s.error;
    return h('div', { className: 'cc-pl-col' },
      h('div', { className: 'cc-pl-qh' },
        h('h2', { className: 'cc-pl-h' }, s.title),
        h('span', { className: 'cc-meta' }, modelLine(s))),
      h(PlanStages, { stages: s.stages }),
      waiting && qs.length ? h(QuestionList, { questions: qs, answers: props.answers, disabled: props.busy, onAnswer: props.onAnswer }) : null,
      stopped ? h('div', { className: 'cc-pl-err', role: 'status' }, problem || 'The planner stopped.') : null,
      waiting || stopped ? h('div', { className: 'cc-pl-foot' },
        waiting ? h('span', { className: 'cc-meta', 'aria-live': 'polite' },
          qs.length ? answeredCount(qs, props.answers) + ' of ' + qs.length + ' answered' : '') : null,
        h('button', { className: 'cc-b cc-b-primary', type: 'button', disabled: props.busy,
          onClick: waiting ? props.onContinue : props.onRetry }, waiting ? 'Continue' : 'Try again')) : null);
  }

  // The drafted graph with its scores, checklist and stage strip beside it; Accept when it is right.
  function DeepDraft(props) {
    var h = CC.h, React = CC.React;
    var s = props.session, d = s.draft || { nodes: [], tasks: 0, checks: {} };
    var sl = React.useState(null), selected = sl[0], setSelected = sl[1];
    var board = CC.useEngine(s.project ? '/api/board?project=' + encodeURIComponent(s.project) : null, ['state']);
    var data = CC.unpackBoard(board.data) || { nodes: [], edges: [] };
    var byId = {};
    (d.nodes || []).forEach(function (n) { byId[n.id] = n; });
    var accepted = s.status === 'accepted';
    var extra = [
      scoreParts(s.scores).length ? h(PlanScores, { key: 'sc', scores: s.scores }) : null,
      s.critique && s.critique.summary ? h('div', { key: 'cr', className: 'cc-meta' }, s.critique.summary) : null
    ];
    var after = h('div', { className: 'cc-pl-sec' }, h('div', { className: 'cc-pl-cap' }, 'Stages'), h(PlanStages, { stages: s.stages }));
    return [
      h('div', { key: 'b', className: 'cc-split cc-pl-body' },
        h('div', { className: 'cc-split-main cc-pl-canvas' },
          CC.FlowView ? h(CC.FlowView, { board: data, filter: 'all', selected: selected, onSelect: setSelected, deselectOnBackground: true, dashUnnamed: true, cameraKey: s.project })
            : h('div', { className: 'cc-meta' }, checkCounts(d))),
        h(DraftSide, { draft: d, title: s.title, folder: s.cwd, goal: s.goal, meta: modelLine(s) + (s.critic_label ? ' · checked by ' + s.critic_label : ''),
          extra: extra, after: after, nodes: boardNodes(data, d), byId: byId, selected: selected, onSelect: setSelected })),
      h(ActionBar, { key: 'a', accepted: accepted, onOpen: function () { props.onOpen(s.project); } },
        h('span', { key: 'm', className: 'cc-pl-lead' }),
        h('button', { key: 'ac', className: 'cc-b cc-b-primary', type: 'button', disabled: props.busy || !s.project,
          onClick: function () { props.onAccept(s.project, board.data && board.data.revision); } }, 'Accept plan'))
    ];
  }

  CC.planHelpers = { stepOf: stepOf, answerBody: answerBody, hasValue: hasValue, isDeep: isDeep, stageWord: stageWord,
    scoreParts: scoreParts, fallbackOptions: FALLBACK_OPTIONS, style: STYLE, resolveChoice: resolveChoice,
    checkCounts: checkCounts, effortLabel: effortLabel };
  CC.PlanStages = PlanStages;
  CC.PlanScores = PlanScores;
  CC.PlanModelPicker = PlanModelPicker;
  CC.PlanDescribe = Describe;
  CC.PlanDeepRun = DeepRun;
  CC.PlanDeepDraft = DeepDraft;
  CC.PlanDraft = Draft;
  CC.PlanSteps = Steps;
  CC.PlanTaskList = TaskList;

  CC.PlanPage = function PlanPage() {
    var h = CC.h, React = CC.React, ui = CC.ui;
    ensurePageStyle();
    var dk = React.useState(function () { return recall(DEEP_KEY); }), deepId = dk[0], setDeepId = dk[1];
    var sd = React.useState(function () { return recall(DEEP_KEY) ? null : recall(SESSION_KEY); }), sid = sd[0], setSid = sd[1];
    var op = React.useState(FALLBACK_OPTIONS), opts = op[0], setOpts = op[1];
    var ss = React.useState(null), session = ss[0], setSession = ss[1];
    var an = React.useState({}), answers = an[0], setAnswers = an[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var tt = React.useState(null), toastText = tt[0], setToast = tt[1];
    var off = React.useState(false), offline = off[0], setOffline = off[1];

    function load(id) {
      if (!id) return Promise.resolve(null);
      return CC.api.get('/api/planner/session?id=' + encodeURIComponent(id)).then(function (data) {
        setOffline(false); setSession(data); return data;
      }, function (e) {
        if (e.status === 404) { remember(SESSION_KEY, null); setSid(null); setSession(null); }
        else if (!e.status) setOffline(true);
        return null;
      });
    }
    function loadDeep(id) {
      if (!id) return Promise.resolve(null);
      return CC.api.get('/api/plan/deep?id=' + encodeURIComponent(id)).then(function (data) {
        setOffline(false); setSession(data); return data;
      }, function (e) {
        if (e.status === 404) { remember(DEEP_KEY, null); setDeepId(null); setSession(null); }
        else if (!e.status) setOffline(true);
        return null;
      });
    }
    function reload() { if (deepId) loadDeep(deepId); else load(sid); }

    React.useEffect(function () {
      var alive = true;
      CC.api.get('/api/plan/deep/options').then(function (o) {
        if (alive && o && Array.isArray(o.models) && o.models.length) setOpts(o);
      }, function () { /* older engine: the fallback list and the classic planner */ });
      return function () { alive = false; };
    }, []);

    var status = session && session.status;
    React.useEffect(function () {
      if (!sid) return undefined;
      var alive = true;
      load(sid);
      // 'planner' events (planner.py notify) drive refresh; the slow poll is only a safety net if the stream drops.
      var unsub = CC.api.subscribe ? CC.api.subscribe(function (kind, data) {
        if (alive && kind === 'planner' && data && data.id === sid) load(sid);
      }) : null;
      var t = BUSY[status] ? setInterval(function () { if (alive) load(sid); }, SAFETY_POLL_MS) : null;
      return function () { alive = false; if (t) clearInterval(t); if (unsub) unsub(); };
    }, [sid, status]);

    React.useEffect(function () {
      if (!deepId) return undefined;
      var alive = true;
      loadDeep(deepId);
      // Stage changes arrive as 'deep_plan' events when the stream carries them; polling covers the rest.
      var unsub = CC.api.subscribe ? CC.api.subscribe(function (kind, data) {
        if (alive && kind === 'deep_plan' && data && data.id === deepId) loadDeep(deepId);
      }) : null;
      // Safety net only (stream dropped); 'deep_plan' events above carry every stage change.
      var t = BUSY[status] ? setInterval(function () { if (alive) loadDeep(deepId); }, SAFETY_POLL_MS) : null;
      return function () { alive = false; if (t) clearInterval(t); if (unsub) unsub(); };
    }, [deepId, status]);

    React.useEffect(function () {
      if (!toastText) return undefined;
      var t = setTimeout(function () { setToast(null); }, 2600);
      return function () { clearTimeout(t); };
    }, [toastText]);

    function fail(what) { return function (e) { setBusy(false); setToast(what + ': ' + ((e.data && e.data.detail) || e.message)); }; }
    function saveAnswers() {
      var qs = (session.questions || []).filter(function (q) { return !q.answered_at && hasValue(answers[q.id]); });
      // Save each new answer (preference answers go to the owner's notes).
      return qs.reduce(function (p, q) {
        return p.then(function () { return CC.api.post('/api/question/answer', { id: q.id, answer: answerBody(q, answers[q.id]) }); });
      }, Promise.resolve());
    }

    function onStart(form) {
      setBusy(true);
      CC.api.post('/api/plan/deep/start', form).then(function (r) {
        setBusy(false); setAnswers({});
        remember(SESSION_KEY, null); setSid(null);
        remember(DEEP_KEY, r.session.id); setDeepId(r.session.id); setSession(r.session);
      }, function (e) {
        if (e.status !== 404) { fail('Could not start')(e); return; }
        // The engine has no deep planner yet: the classic planner still works.
        CC.api.post('/api/planner/start', { title: form.title, goal: form.goal, cwd: form.cwd }).then(function (r) {
          setBusy(false); setAnswers({});
          remember(SESSION_KEY, r.session.id); setSid(r.session.id); setSession(r.session);
        }, fail('Could not start'));
      });
    }
    function onContinue() {
      setBusy(true);
      saveAnswers().then(function () {
        return CC.api.post('/api/plan/deep/continue', { id: session.id });
      }).then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not continue'));
    }
    function onRetry() {
      setBusy(true);
      CC.api.post('/api/plan/deep/continue', { id: session.id })
        .then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not try again'));
    }
    function onDraft() {
      setBusy(true);
      saveAnswers().then(function () {
        return CC.api.post('/api/planner/draft', { session: session.id });
      }).then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not draft'));
    }
    function onRedraft(note) {
      setBusy(true);
      CC.api.post('/api/planner/draft', { session: session.id, note: note || undefined })
        .then(function (r) { setBusy(false); setSession(r.session); }, fail('Could not redraft'));
    }
    function onAccept(project, revision) {
      setBusy(true);
      var body = { project: project };
      if (revision != null) body.revision = revision;
      CC.api.post('/api/plan/accept', body).then(function () {
        setBusy(false); setToast('Plan accepted'); reload();
      }, function (e) {
        setBusy(false);
        setToast(e.status === 409 ? 'Changed elsewhere — refreshed, try again' : 'Could not accept: ' + ((e.data && e.data.detail) || e.message));
        reload();
      });
    }
    function onOpen(project) {
      remember(CREATE_KEY, project);
      CC.pendingProject = project;
      try {
        if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') CC.ctx.layout.selectPanel('cc-create');
        else setToast('Open Execute from the sidebar');
      } catch (e) { setToast('Open Execute from the sidebar'); }
    }
    function onNew() {
      remember(SESSION_KEY, null); remember(DEEP_KEY, null);
      setSid(null); setDeepId(null); setSession(null); setAnswers({});
    }
    function onAnswer(id, v) { setAnswers(function (p) { var n = Object.assign({}, p); n[id] = v; return n; }); }

    var deep = isDeep(session);
    var step = deep ? 0 : stepOf(session);
    // Deep plans use the same three steps: research and questions are step 2, the graph step 3.
    var shown = deep ? (status === 'ready' || status === 'accepted' ? 3 : 2) : step;
    var body;
    if (offline && !session) {
      body = h('div', { className: 'cc-pl-scroll' }, ui.Empty({ title: 'Waypoint Core is not running', body: 'Start it and this page connects on its own.' }));
    } else if (deep && (status === 'ready' || status === 'accepted')) {
      body = h(DeepDraft, { key: session.project || session.id, session: session, busy: busy, onAccept: onAccept, onOpen: onOpen });
    } else if (deep) {
      body = h('div', { className: 'cc-pl-scroll' }, h(DeepRun, { session: session, answers: answers, busy: busy,
        onAnswer: onAnswer, onContinue: onContinue, onRetry: onRetry }));
    } else if (step === 1) {
      body = h('div', { className: 'cc-pl-scroll' }, h(Describe, { key: session ? session.id : 'new', session: session, busy: busy,
        options: opts, onStart: onStart }));
    } else if (step === 2) {
      body = h('div', { className: 'cc-pl-scroll' }, h(Questions, { session: session, answers: answers, busy: busy, onAnswer: onAnswer, onDraft: onDraft }));
    } else {
      body = h(Draft, { key: session.project || session.id, session: session, busy: busy, onRedraft: onRedraft, onAccept: onAccept, onOpen: onOpen });
    }

    var header = ui.PageHeader({
      title: 'Plan', pageId: 'cc-plan',
      meta: session && session.title ? session.title : null,
      mid: h(Steps, { step: shown }),
      actions: session ? h(ui.Button, { disabled: busy, onClick: onNew }, 'New plan') : null
    });
    var page = ui.Page({ className: 'cc-plan', raw: true, header: header,
      children: [].concat(Array.isArray(body) || !CC.React.cloneElement ? body : CC.React.cloneElement(body, { key: 'b' }), toastText ? [h('div', { key: 't', className: 'cc-toast', role: 'status' }, toastText)] : []) });
    // command_bar.js finds the page by data-cc-page; the kit frame does not set it yet.
    if (CC.React && typeof CC.React.cloneElement === 'function') return CC.React.cloneElement(page, { 'data-cc-page': 'plan' });
    page.props['data-cc-page'] = 'plan';
    return page;
  };
})(CC);
