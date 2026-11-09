// page_learn.js [brain-learn, C8] - Learn page (page id cc-learn): learn a set of concepts one small
// step at a time, from the engine's learn data (CONTRACT learn.py: concept_graph, next_step, record).
//   List (default): the left column lists every concept with its mastery; the right side shows the
//     selected concept. With nothing selected it shows the next step (the weakest concept whose
//     prerequisites are mastered) and one practice question: reveal the answer (Space), then record
//     how it went (Again / Hard / Good / Easy, keys 1-4; spaced repetition schedules the review).
//   Map: the prerequisite graph (FlowView) coloured by mastery; a concept opens in the side panel.
// Optional sections render only when the engine data carries them: worked examples per concept
// (`stories`), and focused practice (`roles`: a focus list of questions plus a copyable practice prompt).
// Data: GET /api/learn (falls back to the richer GET /api/interview snapshot), GET /api/interview/question?id=
//   (practise a chosen question), GET /api/interview/prep?q= and GET /api/learn/live_prompt (focused
//   practice), POST /api/learn/record {concept, outcome} (falls back to POST /api/interview/rate).
(function (CC) {
  'use strict';

  const VIEWS = [{ value: 'list', label: 'List' }, { value: 'map', label: 'Map' }];
  const LEARN_WORD = { mastered: 'Mastered', ready: 'Ready', learning: 'Learning', untouched: 'Locked' };
  const BOARD_TO_LEARN = { done: 'mastered', ready: 'ready', running: 'learning', not_started: 'untouched' };
  const LEARN_TO_BOARD = { mastered: 'done', ready: 'ready', learning: 'running', untouched: 'not_started' };
  const RATINGS = [
    { n: 1, id: 'again', label: 'Again' }, { n: 2, id: 'hard', label: 'Hard' },
    { n: 3, id: 'good', label: 'Good' }, { n: 4, id: 'easy', label: 'Easy' }];
  const MAX = 4;

  const STYLE = [
    '.cc-learn .cc-ln{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-learn .cc-ln-list{flex:none;width:320px;min-height:0;overflow:auto;border-right:1px solid var(--cc-line);padding:8px 8px 24px;}',
    '.cc-learn .cc-ln-list .cc-r{padding:4px 8px;}',
    // the bar alone in the list (mastery in the tooltip and the detail), so titles keep their room
    '.cc-learn .cc-ln-list .cc-mt-bar{width:32px;}',
    '.cc-learn .cc-ln-list .cc-mt > span:last-child{display:none;}',
    '.cc-learn .cc-ln-main{flex:1 1 auto;min-width:0;min-height:0;overflow:auto;position:relative;}',
    '.cc-learn .cc-ln-col{max-width:720px;padding:16px 24px 32px;display:flex;flex-direction:column;gap:16px;}',
    '.cc-learn .cc-ln-h{display:flex;flex-direction:column;gap:2px;}',
    '.cc-learn .cc-ln-t{font-size:14px;font-weight:600;line-height:1.35;}',
    '.cc-learn .cc-ln-m{font-size:11px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    '.cc-learn .cc-ln-l{font-size:11px;color:var(--cc-text-3);margin-bottom:4px;}',
    '.cc-learn .cc-ln-q{margin:0;font-size:14px;font-weight:600;line-height:1.45;}',
    '.cc-learn .cc-ln-p{margin:0;font-size:14px;line-height:1.55;color:var(--cc-text);}',
    '.cc-learn .cc-ln-s{margin:0;font-size:12px;line-height:1.5;color:var(--cc-text-2);}',
    '.cc-learn .cc-ln-notes{min-height:72px;}',
    '.cc-learn .cc-ln-act{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
    '.cc-learn .cc-ln-ans{display:flex;flex-direction:column;gap:12px;padding-top:12px;border-top:1px solid var(--cc-line);}',
    '.cc-learn .cc-ln-bul{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.5;}',
    '.cc-learn .cc-ln-bul li::marker{color:var(--cc-text-3);}',
    '.cc-learn .cc-ln-bul b{font-weight:600;}',
    '.cc-learn .cc-ln-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;line-height:1.5;}',
    '.cc-learn .cc-ln-rate{display:flex;gap:8px;flex-wrap:wrap;}',
    '.cc-learn .cc-ln-rate .cc-b{min-width:88px;}',
    '.cc-learn .cc-ln-iv{font-size:11px;color:var(--cc-text-3);font-weight:400;font-variant-numeric:tabular-nums;}',
    '.cc-learn details > summary{list-style:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--cc-text-2);}',
    '.cc-learn details > summary::-webkit-details-marker{display:none;}',
    '.cc-learn details > summary::before{content:"";flex:none;width:5px;height:5px;margin:0 2px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform 120ms;}',
    '.cc-learn details[open] > summary::before{transform:rotate(45deg);}',
    '.cc-learn details > summary:hover{color:var(--cc-text);}',
    '.cc-learn details > :not(summary){margin-top:8px;}',
    '.cc-learn .cc-ln-src{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}',
    '.cc-learn .cc-ln-src button{border:0;background:transparent;color:var(--cc-text-2);font-family:var(--cc-mono);font-size:11px;text-align:left;padding:2px 0;cursor:pointer;overflow-wrap:anywhere;}',
    '.cc-learn .cc-ln-src button:hover{color:var(--cc-text);}',
    '.cc-learn .cc-ln-ex{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;font-size:12px;line-height:1.5;margin:0;}',
    '.cc-learn .cc-ln-ex dt{color:var(--cc-text-3);}',
    '.cc-learn .cc-ln-ex dd{margin:0;}',
    '.cc-learn .cc-ln-focus{display:flex;gap:8px;align-items:center;}',
    '.cc-learn .cc-ln-focus .cc-in{flex:1 1 auto;min-width:120px;}',
    '.cc-learn .cc-ln-prompt{width:100%;min-height:120px;font-family:var(--cc-mono);font-size:11px;}',
    '.cc-learn .cc-ln-graph{position:relative;flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--cc-canvas);}',
    '.cc-learn .cc-ln-graph > .cc-graph{flex:1 1 auto;}',
    '.cc-learn .cc-ln-legend{display:flex;gap:12px;align-items:center;font-size:11px;color:var(--cc-text-3);}',
    '.cc-learn .cc-ln-legend span{display:inline-flex;align-items:center;gap:2px;}',
    '.cc-learn .cc-ln-dot{display:inline-flex;width:18px;justify-content:center;}',
    '.cc-learn .cc-ln-line{padding:12px 16px;font-size:12px;color:var(--cc-text-3);display:flex;gap:12px;align-items:center;}',
    '.cc-learn .cc-ln-line.cc-bad{color:var(--cc-error);}',
    '@media (max-width:1100px){.cc-learn .cc-ln-list{width:280px;}.cc-learn .cc-ln-col{padding:16px;}}',
    '@media (max-width:640px){.cc-learn .cc-ln-two{grid-template-columns:1fr;}}'
  ].join('\n');

  function ensureStyle() {
    if (CC.brainLearn && CC.brainLearn.ensureStyle) CC.brainLearn.ensureStyle();
    else if (CC.ensureStyles) CC.ensureStyles();
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || !document.head || document.getElementById('cc-learn-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-learn-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // Shared helpers from page_brain.js, with a local fallback when that file is not loaded.
  function BL() {
    return CC.brainLearn || {
      copy: function (t) { return typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(new Error('no clipboard')); },
      useToast: function () { return { msg: null, show: function () {} }; },
      errorText: function (e, what) { return e && e.status === 503 ? what + ' is not available in Waypoint Core yet.' : 'Waypoint Core is not running.'; },
      Menu: null
    };
  }

  // Accept GET /api/learn ({concept_graph, next_step, stories}) or the richer snapshot
  // ({graph, next, stories, questions, roles, total, due}).
  function normalize(d) {
    if (!d) return null;
    const graph = d.graph || d.concept_graph || d.board || (d.nodes ? d : null) || { nodes: [], edges: [] };
    const next = d.next !== undefined ? d.next : (d.next_step !== undefined ? d.next_step : null);
    const nodes = graph.nodes || [];
    const max = graph.max_mastery || MAX;
    const mastered = nodes.filter((n) => learnStatus(n) === 'mastered').length;
    return {
      graph: graph, next: next, stories: d.stories || [], questions: d.questions || [], roles: d.roles || [],
      total: d.total || nodes.length, mastered: mastered, confident: mastered, max: max,
      due: d.due != null ? d.due : (graph.due || 0)
    };
  }
  CC.learnNormalize = normalize;

  function learnStatus(n) {
    return n.learn_status || BOARD_TO_LEARN[n.display_status || n.status] || 'untouched';
  }

  // Concepts in learning order: prerequisite depth (wave), then the seed order.
  function conceptOrder(nodes) {
    return (nodes || []).map((n, i) => ({ n: n, i: i }))
      .sort((a, b) => ((a.n.wave || 0) - (b.n.wave || 0)) || a.i - b.i).map((x) => x.n);
  }
  CC.learnOrder = conceptOrder;

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function Dot(props) {
    const h = CC.h;
    return h('span', { className: 'cc-ln-dot', 'aria-hidden': 'true' },
      h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18' }, CC.StatusDot ? h(CC.StatusDot, { status: props.status }) : null));
  }

  function Sources(props) {
    const h = CC.h;
    const list = props.paths || [];
    if (!list.length && !props.also) return null;
    return h('details', null,
      h('summary', null, (props.label || 'Sources') + (list.length ? ' (' + list.length + ')' : '')),
      props.also ? h('div', { className: 'cc-ln-m' }, props.also) : null,
      list.length ? h('ul', { className: 'cc-ln-src' }, list.map((p) => h('li', { key: p },
        h('button', { type: 'button', title: 'Copy path', onClick: () => props.onCopy(p) }, p)))) : null);
  }

  // Optional phrasing pair from the engine ("avoid" / "say").
  function Phrasing(props) {
    const h = CC.h;
    const s = props.say;
    if (!s || (!s.avoid && !s.say)) return null;
    return h('div', { className: 'cc-ln-two' },
      h('div', null, h('div', { className: 'cc-ln-l' }, 'Avoid'), s.avoid),
      h('div', null, h('div', { className: 'cc-ln-l' }, 'Prefer'), s.say));
  }

  // Optional worked example (situation, task, action, result).
  function Example(props) {
    const h = CC.h;
    const s = props.story;
    const row = (k, v) => (v ? [h('dt', { key: k + 't' }, k), h('dd', { key: k + 'd' }, v)] : null);
    return h('details', null,
      h('summary', null, s.title),
      s.sixty ? h('p', { className: 'cc-ln-s' }, s.sixty) : null,
      h('dl', { className: 'cc-ln-ex' }, row('Situation', s.situation), row('Task', s.task), row('Turning point', s.pivot),
        row('Action', s.action), row('Result', s.result), row('Link', s.link)),
      h(Phrasing, { say: s.say_it }),
      s.limits ? h('p', { className: 'cc-ln-s' }, 'Limits: ' + s.limits) : null,
      h(Sources, { paths: s.evidence, onCopy: props.onCopy }));
  }

  // ---- next step / practice -------------------------------------------------------------
  function Answer(props) {
    const h = CC.h;
    const ma = props.ma || {};
    const bullets = ma.bullets || [];
    return h('section', { className: 'cc-ln-ans', 'aria-label': 'Answer' },
      h('div', { className: 'cc-ln-l' }, ma.story ? 'Answer, from the example "' + ma.story.title + '"' : 'Answer'),
      bullets.length ? h('ul', { className: 'cc-ln-bul' }, bullets.map((b, i) => h('li', { key: i },
        b.label ? h('b', null, b.label + ': ') : null, b.text))) : h('p', { className: 'cc-ln-s' }, 'No answer outline recorded.'),
      ma.kind === 'outline' && ma.angle ? h('p', { className: 'cc-ln-s' }, ma.angle) : null,
      ma.sixty ? h('details', null, h('summary', null, 'Short version'), h('p', { className: 'cc-ln-s' }, ma.sixty)) : null,
      h(Phrasing, { say: ma.say_it }),
      ma.limits ? h('p', { className: 'cc-ln-s' }, 'Limits: ' + ma.limits) : null,
      ma.also && ma.also.length ? h('div', { className: 'cc-ln-m' },
        'Other examples: ' + ma.also.filter(Boolean).map((s) => s.title).join('; ')) : null);
  }

  function Practice(props) {
    const h = CC.h;
    const ui = CC.ui;
    const step = props.step;
    const q = step.question || { id: step.concept, text: step.check_question };
    const iv = step.intervals || {};
    const mastery = Math.max(0, Math.min(MAX, step.mastery || 0));
    const context = props.focusLabel || (step.builds_on && step.builds_on.length
      ? 'Builds on ' + step.builds_on.map((b) => b.title).join(', ') : 'Starting point');
    const also = q.also_tests && q.also_tests.length ? 'Also covers ' + q.also_tests.map((x) => x.title).join(', ') : '';
    const meta = [props.chosen ? 'Practice' : 'Next step', context, 'Mastery ' + mastery + ' of ' + MAX,
      step.card && step.card.due ? 'Due' : (step.card && step.card.new ? 'New' : null)].filter(Boolean).join(' · ');
    return h('article', { className: 'cc-ln-col', 'aria-label': 'Practice' },
      h('div', { className: 'cc-ln-h' }, h('div', { className: 'cc-ln-t' }, step.title), h('div', { className: 'cc-ln-m' }, meta)),
      step.explain ? h('details', null, h('summary', null, 'Explanation'), h('p', { className: 'cc-ln-s' }, step.explain)) : null,
      h('div', null, h('div', { className: 'cc-ln-l' }, 'Practice question'), h('p', { className: 'cc-ln-q' }, q.text)),
      h('textarea', { key: q.id, className: 'cc-in cc-ln-notes', 'aria-label': 'Your answer', placeholder: 'Your answer' }),
      props.revealed ? h(Answer, { ma: step.model_answer }) : null,
      props.revealed
        ? h('div', null,
          h('div', { className: 'cc-ln-l' }, 'Record outcome · keys 1 to 4'),
          h('div', { className: 'cc-ln-rate', role: 'group', 'aria-label': 'Record outcome' }, RATINGS.map((r) => h('button', {
            key: r.id, type: 'button', className: 'cc-b', disabled: !!props.busy, onClick: () => props.onRate(r.n),
            'aria-label': r.label + (iv[r.id] ? ', review in ' + iv[r.id] : '')
          }, r.label, iv[r.id] ? h('span', { className: 'cc-ln-iv' }, iv[r.id]) : null))))
        : h('div', { className: 'cc-ln-act' },
          ui.Button({ kind: 'primary', onClick: props.onReveal, children: 'Reveal answer', action: 'reveal' }),
          h('span', { className: 'cc-ln-m' }, 'Space')),
      h(Sources, { paths: step.evidence, also: also, onCopy: props.onCopy }));
  }

  // ---- one concept ----------------------------------------------------------------------
  function Concept(props) {
    const h = CC.h;
    const ui = CC.ui;
    const n = props.node;
    const ls = learnStatus(n);
    const byId = props.byId;
    const qs = (n.questions || []).map((id) => props.qById[id]).filter(Boolean);
    const examples = (props.stories || []).filter((s) => (n.stories || []).indexOf(s.id) >= 0 ||
      (s.competencies || s.concepts || []).indexOf(n.id) >= 0);
    const meta = [LEARN_WORD[ls] || ls, 'Mastery ' + (n.mastery || 0) + ' of ' + MAX, n.due ? n.due + ' due' : null].filter(Boolean).join(' · ');
    const likert = CC.Likert ? h('div', null,
      h('div', { className: 'cc-ln-l' }, 'Your level'),
      h(CC.Likert, {
        scale: MAX + 1, value: n.mastery ? n.mastery + 1 : null, ariaLabel: 'Your level',
        labels: ['New to this', 'Mastered'],
        onChange: (v) => props.onSet(n.id, Math.max(0, Math.min(MAX, v - 1)))
      })) : null;
    const canPractise = (n.questions || []).length > 0;
    return h('article', { className: props.side ? 'cc-sp' : 'cc-ln-col', 'aria-label': 'Concept' },
      h('div', { className: props.side ? 'cc-sp-h' : 'cc-ln-h' },
        h('div', { style: { flex: '1 1 auto', minWidth: 0 } }, h('div', { className: 'cc-ln-t' }, n.title), h('div', { className: 'cc-ln-m' }, meta)),
        props.onClose ? ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close', onClick: props.onClose }) : null),
      n.deps && n.deps.length ? h('div', { className: 'cc-ln-m' }, 'Needs ' + n.deps.map((d) => (byId[d] ? byId[d].title : d)).join(', ')) : null,
      n.explain ? h('p', { className: props.side ? 'cc-ln-s' : 'cc-ln-p' }, n.explain) : null,
      canPractise ? h('div', { className: 'cc-ln-act' },
        ui.Button({ kind: 'primary', onClick: () => props.onPractise(n.questions[0]), children: 'Practise', action: 'practise' }),
        h('span', { className: 'cc-ln-m' }, plural(n.questions.length, 'question'))) : null,
      qs.length > 1 ? h(ui.Section, { title: 'Questions', meta: String(qs.length) },
        h(ui.List, { label: 'Questions' }, qs.map((q) => h(ui.Row, { key: q.id, id: q.id, title: q.text, tip: 'Practise this question', wrap: true,
          onClick: () => props.onPractise(q.id) })))) : null,
      likert,
      examples.length ? h(ui.Section, { title: 'Worked examples', meta: String(examples.length) },
        examples.map((s) => h(Example, { key: s.id, story: s, onCopy: props.onCopy }))) : null,
      h(Sources, { paths: n.evidence, onCopy: props.onCopy }));
  }

  // ---- optional: focused practice (only when the engine provides roles) ---------------------
  function Focus(props) {
    const React = CC.React;
    const h = CC.h;
    const ui = CC.ui;
    const textS = React.useState('');
    const text = (textS[0] || '').trim();
    const f = props.focus;
    const L = props.live;
    function submit(e) { if (e && e.preventDefault) e.preventDefault(); if (text) props.onFocus(text); }
    return h('section', { className: 'cc-ln-col', 'aria-label': 'Focused practice', style: { paddingBottom: '0' } },
      h('form', { className: 'cc-ln-focus', onSubmit: submit, role: 'search', 'aria-label': 'Focus' },
        h('input', { className: 'cc-in', type: 'text', value: textS[0], 'aria-label': 'Focus', placeholder: 'Focus, e.g. a role or topic',
          onChange: (e) => textS[1](e.target.value) }),
        ui.Button({ disabled: !text || props.busy, onClick: submit, children: props.busy ? 'Finding…' : 'Build list' }),
        ui.Button({ kind: 'quiet', disabled: !text || props.liveBusy, onClick: () => props.onLive(text),
          title: 'Copies a practice prompt with these questions, to answer out loud with a voice assistant',
          children: props.liveBusy ? 'Copying…' : 'Copy practice prompt' }),
        ui.Button({ kind: 'quiet', size: 'sm', icon: ui.ICONS.close, label: 'Close focused practice', onClick: props.onClose })),
      L ? h('div', { role: 'status' },
        h('div', { className: 'cc-ln-m' }, (L.copied ? 'Prompt copied' : 'Copy the prompt below') + ' · ' + L.target + ' · ' +
          plural((L.questions || []).length, 'question') + ' · ' + plural((L.stories || []).length, 'example')),
        h('details', { open: !L.copied }, h('summary', null, 'Show the prompt'),
          h('textarea', { className: 'cc-in cc-ln-prompt', readOnly: true, value: L.prompt, 'aria-label': 'Practice prompt',
            onFocus: (e) => { if (e.target && e.target.select) e.target.select(); } }))) : null,
      f ? h(ui.Section, { title: 'Focus list · ' + f.query, meta: f.note || null,
        actions: ui.Button({ kind: 'quiet', size: 'sm', onClick: props.onClear, children: 'Back to next step' }) },
      h(ui.List, { label: 'Focus list' }, (f.questions || []).map((q, i) => h(ui.Row, {
        key: q.id, id: q.id, title: q.text, wrap: true, selected: props.index === i,
        lead: h('span', { className: 'cc-ln-m', style: { minWidth: '16px' } }, String(i + 1)), onClick: () => props.onPick(i)
      }))),
      f.stories && f.stories.length ? h('div', { className: 'cc-ln-m', style: { marginTop: '8px' } },
        'Examples to have ready: ' + f.stories.map((s) => s.title).join('; ')) : null,
      h(Sources, { paths: (f.company_files || []).concat(f.company_files && f.company_files.length ? [] : (f.role_files || [])), onCopy: props.onCopy }))
        : null);
  }

  function Legend() {
    const h = CC.h;
    const item = (status, label) => h('span', { key: status }, h(Dot, { status: status }), label);
    return h('div', { className: 'cc-ln-legend' },
      item('done', 'Mastered'), item('ready', 'Ready'), item('running', 'Learning'), item('not_started', 'Locked'));
  }

  // ---- page ------------------------------------------------------------------
  function LearnPage(props) {
    const React = CC.React;
    const h = CC.h;
    const ui = CC.ui;
    const bl = BL();
    ensureStyle();
    const api = props.api || CC.api;
    const st = React.useState({ data: null, error: null, loading: true });
    const viewS = React.useState('list');
    const stepS = React.useState(null);        // the practice step on screen
    const chosenS = React.useState(false);     // the step was picked by hand (not the next step)
    const revealS = React.useState(false);
    const busyS = React.useState(false);
    const selS = React.useState(null);         // the selected concept id
    const focusOnS = React.useState(false);
    const focusS = React.useState(null);       // {query, questions, stories, ...}
    const focusBusyS = React.useState(false);
    const focusIdxS = React.useState(null);
    const liveS = React.useState(null);        // {prompt, target, questions, stories, copied}
    const liveBusyS = React.useState(false);
    const toast = bl.useToast();
    const state = st[0], view = viewS[0], step = stepS[0], focus = focusS[0], focusIdx = focusIdxS[0], sel = selS[0];

    function load() {
      return api.get('/api/learn').then((raw) => {
        if (!raw || (!raw.concept_graph && !raw.graph && !raw.nodes)) return api.get('/api/interview');
        return raw;
      }).catch((e) => {
        if (e && (e.status === 404 || e.status === 503)) return api.get('/api/interview');
        throw e;
      }).then(
        (raw) => { const d = normalize(raw); st[1]({ data: d, error: null, loading: false }); return d; },
        (error) => { st[1]((prev) => ({ data: prev.data, error: error, loading: false })); return null; });
    }
    React.useEffect(() => { load(); }, []);

    const data = state.data;
    React.useEffect(() => {
      if (data && !step) { stepS[1](data.next || null); chosenS[1](false); revealS[1](false); }
    }, [data]);

    function onCopy(path) {
      bl.copy(path).then(() => toast.show('Path copied'), () => toast.show('Could not copy'));
    }

    function show(next, chosen) { stepS[1](next || null); chosenS[1](!!chosen); revealS[1](false); selS[1](null); }

    function openQuestion(qid, idx) {
      return api.get('/api/interview/question?id=' + encodeURIComponent(qid)).then((s) => {
        focusIdxS[1](idx == null ? null : idx);
        show(s, true);
        viewS[1]('list');
      }, (e) => toast.show(bl.errorText(e, 'That question')));
    }

    function rate(qid, n) {
      return api.post('/api/learn/record', { concept: qid, outcome: n }).catch((e) => {
        if (e && e.status === 404 && !(e.data && e.data.detail)) return api.post('/api/interview/rate', { question: qid, rating: n });
        throw e;
      }).then((res) => (res && res.result) || res || {});
    }

    function onRate(n) {
      if (!step || busyS[0]) return;
      const qid = step.question ? step.question.id : step.concept;
      busyS[1](true);
      rate(qid, n).then((res) => {
        busyS[1](false);
        toast.show(RATINGS[n - 1].label + (res.next_review ? ' · next review in ' + res.next_review : '') +
          (res.mastery != null ? ' · mastery ' + res.mastery + ' of ' + MAX : ''));
        load();
        if (focus && focusIdx != null && focusIdx + 1 < (focus.questions || []).length) {
          openQuestion(focus.questions[focusIdx + 1].id, focusIdx + 1);
        } else {
          focusIdxS[1](null);
          show(res.next !== undefined ? res.next : null, false);
        }
      }, (error) => { busyS[1](false); toast.show(bl.errorText(error, 'Recording the outcome')); });
    }

    function onFocus(text) {
      focusBusyS[1](true);
      api.get('/api/interview/prep?q=' + encodeURIComponent(text)).then((p) => {
        focusBusyS[1](false);
        focusS[1](p);
        if (p && p.questions && p.questions.length) openQuestion(p.questions[0].id, 0);
      }, (e) => { focusBusyS[1](false); toast.show(bl.errorText(e, 'Focused practice')); });
    }
    function copyLive(live) {
      return bl.copy(live.prompt).then(() => true, () => false).then((ok) => {
        liveS[1](Object.assign({}, live, { copied: ok }));
        toast.show(ok ? 'Practice prompt copied' : 'Could not copy; the prompt is shown below');
      });
    }
    function onLive(text) {
      liveBusyS[1](true);
      api.get('/api/learn/live_prompt?company=&role=' + encodeURIComponent(text || '')).then(
        (live) => { liveBusyS[1](false); return copyLive(live); },
        (e) => { liveBusyS[1](false); toast.show(bl.errorText(e, 'The practice prompt')); });
    }
    function clearFocus() {
      focusS[1](null);
      focusIdxS[1](null);
      show(data ? data.next : null, false);
    }

    function onSet(conceptId, mastery) {
      api.post('/api/learn/record', { concept: conceptId, outcome: 'set:' + mastery }).then(
        () => load(), (e) => toast.show(bl.errorText(e, 'Saving your level')));
    }

    // Keyboard: Space or Enter reveals the answer, 1-4 record the outcome (never while typing).
    React.useEffect(() => {
      if (view !== 'list' || typeof document === 'undefined') return undefined;
      function onKey(e) {
        const tag = e.target && e.target.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
        if (!step || (sel && sel !== step.concept)) return;
        // only while the Learn page is on screen (dsh may keep hidden tabs mounted)
        if (document.querySelector) {
          const root = document.querySelector('.cc-learn');
          if (!root || (root.getClientRects && !root.getClientRects().length)) return;  // hidden: display:none has no boxes
        }
        if (!revealS[0] && (e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON') { e.preventDefault(); revealS[1](true); }
        else if (revealS[0] && /^[1-4]$/.test(e.key)) { e.preventDefault(); onRate(+e.key); }
      }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    });

    const nodes = data ? (data.graph.nodes || []) : [];
    const byId = {};
    nodes.forEach((n) => { byId[n.id] = n; });
    const qById = {};
    (data ? data.questions || [] : []).forEach((q) => { qById[q.id] = q; });
    const hasFocus = !!(data && data.roles && data.roles.length);
    const Menu = bl.Menu;

    const meta = data ? data.mastered + ' of ' + data.total + ' mastered' + (data.due ? ' · ' + data.due + ' due' : '') : null;
    const header = ui.PageHeader({
      title: 'Learn', pageId: 'cc-learn', meta: meta,
      mid: ui.Segmented({ label: 'View', options: VIEWS, value: view, onChange: viewS[1] }),
      actions: [
        view === 'map' ? h(Legend, { key: 'l' }) : null,
        hasFocus && Menu ? h(Menu, { key: 'm', label: 'More', items: [
          { label: focusOnS[0] ? 'Hide focused practice' : 'Focused practice', onClick: () => focusOnS[1](!focusOnS[0]) }] }) : null
      ]
    });

    let body;
    if (!data) {
      body = state.loading
        ? h('div', { className: 'cc-ln-line', role: 'status' }, 'Loading concepts…')
        : h('div', { className: 'cc-ln-line cc-bad', role: 'status' },
          h('span', null, bl.errorText(state.error, 'Learn') || 'Learn is unavailable.'),
          ui.Button({ kind: 'quiet', size: 'sm', onClick: load, children: 'Try again' }));
    } else if (!nodes.length) {
      body = h(ui.Empty, { title: 'No concepts yet', body: 'Add concepts to the learn seed file, then open Learn again.' });
    } else if (view === 'map') {
      const selNode = sel && byId[sel] ? byId[sel] : null;
      body = h('div', { className: 'cc-ln' },
        h('div', { className: 'cc-ln-graph' }, CC.FlowView
          ? h(CC.FlowView, { board: data.graph, filter: 'all', selected: sel, onSelect: selS[1], cameraKey: 'learn-map' })
          : h('div', { className: 'cc-ln-line' }, 'The map is still loading; List shows the same concepts.')),
        selNode ? h('aside', { className: 'cc-split-side', 'aria-label': 'Concept details' }, h(Concept, {
          node: selNode, byId: byId, qById: qById, stories: data.stories, side: true, onClose: () => selS[1](null),
          onCopy: onCopy, onSet: onSet, onPractise: (qid) => openQuestion(qid, null) })) : null);
    } else {
      const order = conceptOrder(nodes);
      const nextId = data.next ? data.next.concept : null;
      const current = sel || (step ? step.concept : null);
      const focusLabel = focus && focusIdx != null ? 'Question ' + (focusIdx + 1) + ' of ' + focus.questions.length + ' for ' + focus.query : null;
      const list = h('nav', { className: 'cc-ln-list', 'aria-label': 'Concepts' },
        h(ui.List, { label: 'Concepts' }, order.map((n) => {
          const ls = learnStatus(n);
          const pct = Math.round(100 * Math.max(0, Math.min(MAX, n.mastery || 0)) / MAX);
          return h(ui.Row, {
            key: n.id, id: n.id, title: n.title, tip: n.title + ' · ' + (LEARN_WORD[ls] || ls),
            lead: h(Dot, { status: n.display_status || LEARN_TO_BOARD[ls] || 'not_started' }),
            meta: n.id === nextId ? h(ui.Badge, { tone: 'action' }, 'Next') : (n.due ? n.due + ' due' : null),
            trail: h(ui.Meter, { value: pct, tone: ls === 'mastered' ? 'ok' : 'plain', title: 'Mastery ' + (n.mastery || 0) + ' of ' + MAX }),
            selected: n.id === current, onClick: () => selS[1](step && n.id === step.concept ? null : n.id)
          });
        })));
      let detail;
      if (sel && byId[sel] && !(step && step.concept === sel)) {
        detail = h(Concept, { node: byId[sel], byId: byId, qById: qById, stories: data.stories, onCopy: onCopy, onSet: onSet,
          onPractise: (qid) => openQuestion(qid, null) });
      } else if (step) {
        detail = h(Practice, { step: step, chosen: chosenS[0], revealed: revealS[0], busy: busyS[0], focusLabel: focusLabel,
          onReveal: () => revealS[1](true), onRate: onRate, onCopy: onCopy });
      } else {
        detail = h(ui.Empty, { title: 'Nothing due right now', body: 'Every concept is mastered and no review is due. Pick a concept to practise it again.' });
      }
      body = h('div', { className: 'cc-ln' }, list,
        h('div', { className: 'cc-ln-main' },
          hasFocus && focusOnS[0] ? h(Focus, { focus: focus, index: focusIdx, busy: focusBusyS[0], live: liveS[0], liveBusy: liveBusyS[0],
            onFocus: onFocus, onLive: onLive, onClear: clearFocus, onCopy: onCopy, onClose: () => focusOnS[1](false),
            onPick: (i) => openQuestion(focus.questions[i].id, i) }) : null,
          detail));
    }

    return ui.Page({
      id: 'cc-ready', className: 'cc-learn', header: header, raw: true,
      children: [
        h('div', { key: 'b', style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, position: 'relative' } }, body,
          toast.msg ? h('div', { className: 'cc-toast', role: 'status' }, toast.msg) : null)
      ]
    });
  }

  CC.LearnPage = LearnPage;
  CC.LearnPractice = Practice;
  CC.LearnConcept = Concept;
  CC.LearnFocus = Focus;
})(CC);
