// tab_learn.js - CC.LearnTab: learning topics (an add-on).
// learn_read gives topics (steps with deps and status todo/taught/repair), claims ("ideas") with premises, and the
// claims due for practice. Writes, with inputs built as the Waypoint Claude v8 page builds them:
//   learn_topic_set        {id: slug(title), title, goal?}      (v8 slug: lower case, a-z0-9 runs joined by "-", 48 max)
//   learn_step_set         {topic, step, status, note?}         (status taught or repair)
//   learn_prop_add         {topic, text, premises: [claim ids]}
//   learn_practice_record  {id, outcome}                        (again, hard, good, easy)
// Every write goes through CC.wpc.act and then reads learn_read again; nothing changes before the server answers.
// The tutor itself runs in a Claude chat with "/learn <topic>" (the learn skill uses the same tools).
(function (CC) {
  'use strict';
  var h = CC.h;
  var EVERY = 60000;
  var OUTCOMES = ['again', 'hard', 'good', 'easy'];
  var OUTCOME_LABEL = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
  var STEP_STATUS = ['todo', 'taught', 'repair'];

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  // Same as the v8 page's slug(): the topic id made from what the learner typed.
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'topic'; }

  function progress(t) {
    var steps = (t && t.steps) || [];
    var taught = steps.filter(function (s) { return s.status === 'taught'; }).length;
    return { taught: taught, total: steps.length, pct: steps.length ? Math.round(100 * taught / steps.length) : null };
  }

  // The step to teach now: a step marked repair first (build nothing on a confusion), else the first todo step
  // whose needed steps are all taught. Null when every step is taught.
  function currentStep(t) {
    var steps = (t && t.steps) || [];
    var repair = steps.filter(function (s) { return s.status === 'repair'; })[0];
    if (repair) return repair;
    var taught = {};
    steps.forEach(function (s) { if (s.status === 'taught') taught[s.id] = 1; });
    var ready = steps.filter(function (s) {
      return s.status !== 'taught' && (s.deps || []).every(function (d) { return taught[d]; });
    })[0];
    return ready || steps.filter(function (s) { return s.status !== 'taught'; })[0] || null;
  }

  function topicInput(title, goal) {
    var t = str(title).trim();
    if (!t) return null;
    var input = { id: slug(t), title: t };
    var g = str(goal).trim();
    if (g) input.goal = g;
    return input;
  }
  function stepInput(topic, step, status, note) {
    if (!topic || !step || STEP_STATUS.indexOf(status) < 0) return null;
    var input = { topic: topic, step: step, status: status };
    var n = str(note).trim();
    if (n) input.note = n;
    return input;
  }
  // premisesText: claim ids split by commas or spaces; each must be a known claim id.
  function propInput(topic, text, premisesText, knownIds) {
    var t = str(text).trim();
    if (!topic) return { ok: false, error: 'Pick a topic first.' };
    if (!t) return { ok: false, error: 'Write the idea first.' };
    var known = {};
    (knownIds || []).forEach(function (id) { known[id] = 1; });
    var prem = [], bad = [];
    str(premisesText).split(/[\s,]+/).filter(Boolean).forEach(function (id) {
      if (!known[id]) { if (bad.indexOf(id) < 0) bad.push(id); } else if (prem.indexOf(id) < 0) prem.push(id);
    });
    if (bad.length) return { ok: false, error: 'No idea has the id ' + bad.join(', ') + '.' };
    return { ok: true, input: { topic: topic, text: t, premises: prem } };
  }
  function practiceInput(id, outcome) {
    if (!id || OUTCOMES.indexOf(outcome) < 0) return null;
    return { id: id, outcome: outcome };
  }

  // One write: show "Working", call the server, then show its answer. Returns the promise.
  function runAct(cc, job, setStatus, setBusy) {
    if (setBusy) setBusy(job.key || job.tool);
    setStatus({ text: 'Working…' });
    var p;
    try { p = cc.wpc.act(job.tool, job.input, ['learn_read']); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).then(function () {
      setStatus({ text: job.label || 'Saved.' });
      if (job.after) job.after();
    }, function (err) {
      setStatus({ text: 'Not saved: ' + ((err && (err.message || err.code)) || 'error') + '.', tone: 'error' });
    }).then(function () { if (setBusy) setBusy(null); });
  }

  var CSS = [
    '.cc-root .cc-ln-form{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;}',
    '.cc-root .cc-ln-form .cc-fd{flex:1 1 200px;}',
    '.cc-root .cc-ln-form input,.cc-root .cc-ln-form textarea{width:100%;}',
    '.cc-root .cc-ln-t{padding:12px 0;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-ln-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
    '.cc-root .cc-ln-title{font-weight:600;flex:1 1 auto;min-width:0;}',
    '.cc-root .cc-ln-steps{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;}',
    '.cc-root .cc-ln-now{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;}',
    '.cc-root .cc-ln-sub{color:var(--cc-text-3);font-size:12px;margin:4px 0;}',
    '.cc-root .cc-ln-acts{display:flex;gap:6px;flex-wrap:wrap;}'
  ].join('');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-learn')) return;
    var el = document.createElement('style'); el.id = 'cc-tab-learn'; el.textContent = CSS; document.head.appendChild(el);
  }

  function stepBadge(s) {
    var tone = s.status === 'taught' ? 'run' : s.status === 'repair' ? 'action' : null;
    var tip = ((s.deps || []).length ? 'Needs ' + s.deps.join(', ') + '. ' : '') + (s.note || s.status || 'todo');
    return h(CC.ui.Badge, { key: s.id, tone: tone, title: tip }, str(s.title || s.id));
  }

  // One topic: progress, steps, the current step with Taught / Needs repair, and the add-an-idea form.
  function TopicCard(p) {
    var ui = CC.ui, t = p.topic, d = p.draft || {}, busy = p.busy;
    var pr = progress(t), cur = currentStep(t), ideas = p.ideas || [];
    var set = function (k, v) { p.onDraft(t.id, k, v); };
    return h('div', { className: 'cc-ln-t', 'data-topic': t.id },
      h('div', { className: 'cc-ln-head' },
        h('div', { className: 'cc-ln-title' }, str(t.title || t.id)),
        h(ui.Meter, { value: pr.pct, label: pr.taught + '/' + pr.total + ' steps' }),
        t.status && t.status !== 'active' ? h(ui.Badge, null, t.status) : null),
      t.goal ? h('div', { className: 'cc-ln-sub' }, 'Goal: ' + t.goal) : null,
      pr.total ? h('div', { className: 'cc-ln-steps' }, (t.steps || []).map(stepBadge))
        : h('div', { className: 'cc-ln-sub' }, 'No plan yet. Run "/learn ' + str(t.title || t.id) + '" in a chat to measure and plan.'),
      cur ? h('div', { className: 'cc-ln-now' },
        h('span', null, 'Next step: ' + str(cur.title || cur.id) + (cur.status === 'repair' ? ' (needs repair' + (cur.note ? ': ' + cur.note : '') + ')' : '')),
        h('input', { className: 'cc-in', type: 'text', placeholder: 'Note (optional)', 'aria-label': 'Step note', value: str(d.note),
          onChange: function (ev) { set('note', ev.target.value); } }),
        h(ui.Button, { size: 'sm', kind: 'primary', disabled: busy, onClick: function () { p.onStep(t, cur, 'taught'); } }, 'Taught'),
        h(ui.Button, { size: 'sm', disabled: busy, onClick: function () { p.onStep(t, cur, 'repair'); } }, 'Needs repair'))
        : (pr.total ? h('div', { className: 'cc-ln-sub' }, 'Every step is taught.') : null),
      h('div', { className: 'cc-ln-sub' }, ideas.length + (ideas.length === 1 ? ' idea' : ' ideas') +
        (ideas.length ? ': ' + ideas.map(function (x) { return x.id; }).join(', ') : '')),
      h('div', { className: 'cc-ln-form' },
        h(ui.Field, { label: 'Add an idea' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'One sentence you now hold', value: str(d.text),
            onChange: function (ev) { set('text', ev.target.value); } })),
        h(ui.Field, { label: 'Rests on', hint: 'Idea ids, for example p1, p3' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'p1, p2', value: str(d.prem),
            onChange: function (ev) { set('prem', ev.target.value); } })),
        h(ui.Button, { disabled: busy, onClick: function () { p.onIdea(t); } }, 'Add idea')));
  }

  function LearnTab(p) {
    ensureCss();
    var React = CC.React, ui = CC.ui;
    var features = CC.useWpcFeatures();
    var off = !!(features && features.addons && features.addons.learn === false);
    var res = CC.useWpc(off ? null : 'learn_read', {}, { every: EVERY });
    var statusSt = React.useState(null), status = statusSt[0], setStatus = statusSt[1];
    var busySt = React.useState(null), busy = busySt[0], setBusy = busySt[1];
    var newSt = React.useState({ title: '', goal: '' }), draftNew = newSt[0];
    var draftsSt = React.useState({}), drafts = draftsSt[0];
    var header = function (meta) { return h(ui.PageHeader, { title: 'Learn', meta: meta || null, pageId: p && p.pageId }); };
    var banner = status ? h(ui.Banner, { tone: status.tone }, status.text) : null;
    if (off) {
      return h(ui.Page, { page: 'learn', col: true, header: header() },
        h(ui.Empty, { title: 'The learn add-on is off', body: 'Turn it on in Settings, under Add-ons.' }));
    }
    var data = res.data;
    if (!data) {
      return h(ui.Page, { page: 'learn', col: true, header: header() },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading learning topics…' }));
    }
    var topics = data.topics || [], props = data.props || [], due = data.due || [];
    var ids = props.map(function (x) { return x.id; });
    var titles = {};
    topics.forEach(function (t) { titles[t.id] = t.title || t.id; });
    var setDraft = function (tid, k, v) {
      draftsSt[1](function (prev) { var n = Object.assign({}, prev); n[tid] = Object.assign({}, n[tid] || {}); n[tid][k] = v; return n; });
    };
    var clearDraft = function (tid, keys) {
      draftsSt[1](function (prev) { var n = Object.assign({}, prev); n[tid] = Object.assign({}, n[tid] || {}); keys.forEach(function (k) { n[tid][k] = ''; }); return n; });
    };

    function addTopic() {
      var input = topicInput(draftNew.title, draftNew.goal);
      if (!input) { setStatus({ text: 'Write what you want to understand first.', tone: 'error' }); return; }
      runAct(CC, { tool: 'learn_topic_set', input: input, key: 'new', label: 'Added topic ' + input.title + '.',
        after: function () { newSt[1]({ title: '', goal: '' }); } }, setStatus, setBusy);
    }
    function setStep(t, s, st) {
      var input = stepInput(t.id, s.id, st, (drafts[t.id] || {}).note);
      if (!input) return;
      runAct(CC, { tool: 'learn_step_set', input: input, key: t.id, label: (s.title || s.id) + (st === 'taught' ? ' is taught.' : ' needs repair.'),
        after: function () { clearDraft(t.id, ['note']); } }, setStatus, setBusy);
    }
    function addIdea(t) {
      var d = drafts[t.id] || {};
      var r = propInput(t.id, d.text, d.prem, ids);
      if (!r.ok) { setStatus({ text: r.error, tone: 'error' }); return; }
      runAct(CC, { tool: 'learn_prop_add', input: r.input, key: t.id, label: 'Idea added to ' + (t.title || t.id) + '.',
        after: function () { clearDraft(t.id, ['text', 'prem']); } }, setStatus, setBusy);
    }
    function practise(x, outcome) {
      var input = practiceInput(x.id, outcome);
      if (!input) return;
      runAct(CC, { tool: 'learn_practice_record', input: input, key: 'p:' + x.id, label: 'Recorded ' + outcome + ' for ' + x.id + '.' }, setStatus, setBusy);
    }

    var stale = res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '. Showing the last topics.') : null;
    var start = h(ui.Section, { title: 'Start a topic', section: 'learn-new' },
      h('div', { className: 'cc-ln-form' },
        h(ui.Field, { label: 'Topic' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'What do you want to understand?', value: draftNew.title,
            onChange: function (ev) { newSt[1](Object.assign({}, draftNew, { title: ev.target.value })); } })),
        h(ui.Field, { label: 'Goal (optional)' },
          h('input', { className: 'cc-in', type: 'text', placeholder: 'What you want to be able to do', value: draftNew.goal,
            onChange: function (ev) { newSt[1](Object.assign({}, draftNew, { goal: ev.target.value })); } })),
        h(ui.Button, { kind: 'primary', disabled: busy === 'new', onClick: addTopic }, 'Add topic')),
      h('div', { className: 'cc-ln-sub' }, 'To be taught, run "/learn <topic>" in a chat: the tutor measures, plans and teaches one step at a time, and saves here.'));
    var practice = due.length ? h(ui.Section, { title: 'Practice due', section: 'learn-due', meta: due.length + ' due' },
      h(ui.List, { label: 'Ideas due for practice' }, due.map(function (x) {
        return h(ui.Row, { key: x.id, id: x.id, wrap: true, title: str(x.text), sub: (titles[x.topic] || x.topic) + ' · ' + x.id,
          trail: h('div', { className: 'cc-ln-acts' }, OUTCOMES.map(function (o) {
            return h(ui.Button, { key: o, size: 'sm', kind: o === 'good' ? 'primary' : undefined, disabled: busy === 'p:' + x.id,
              onClick: function () { practise(x, o); } }, OUTCOME_LABEL[o]);
          })) });
      })),
      h('div', { className: 'cc-ln-sub' }, 'Answer from memory first, then say how it went.')) : null;
    var list = topics.length ? h(ui.Section, { title: 'Topics', section: 'learn-topics', meta: topics.length + ' topics · ' + props.length + ' ideas' },
      topics.map(function (t) {
        return h(TopicCard, { key: t.id, topic: t, draft: drafts[t.id], busy: busy === t.id,
          ideas: props.filter(function (x) { return x.topic === t.id; }),
          onDraft: setDraft, onStep: setStep, onIdea: addIdea });
      }))
      : h(ui.Section, { title: 'Topics', section: 'learn-topics' },
        h(ui.Empty, { title: 'No topics yet', body: 'Add one above. What you learn is kept as ideas and the ideas they rest on.' }));
    var meta = topics.length + ' topics' + (due.length ? ' · ' + due.length + ' due' : '');
    return h(ui.Page, { page: 'learn', col: true, header: header(meta), banner: banner },
      stale, practice, list, start);
  }

  CC.LearnTab = LearnTab;
  CC.learnTabInternals = { EVERY: EVERY, OUTCOMES: OUTCOMES, slug: slug, progress: progress, currentStep: currentStep,
    topicInput: topicInput, stepInput: stepInput, propInput: propInput, practiceInput: practiceInput, runAct: runAct, TopicCard: TopicCard };
})(CC);
