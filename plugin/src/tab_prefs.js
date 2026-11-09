// tab_prefs.js - CC.PrefsTab: the Preferences and toolbox tab (an add-on).
// Preferences: pending notes from pref_list; Approve, Reject or Edit each one (pref_approve / pref_reject / pref_edit).
// A note may carry proposed skill_edits: one Approve applies the note and those skill rules together.
// "Harness only" (default on) keeps notes about the harness, dsh, Waypoint, agents, models or skills; 25 per page.
// Toolbox: items from toolbox_read, filtered by kind and text; a status other than on/off needs approval.
// Every write goes through CC.wpc.act and then reads pref_list again; nothing changes before the server answers.
(function (CC) {
  'use strict';
  var h = CC.h;
  var PAGE = 25;
  var HARNESS = /harness|\bdsh\b|waypoint|agent|\bmodels?\b|skill/i;
  var KIND_ORDER = ['subscription', 'model', 'route', 'mcp', 'cli', 'tool', 'skill-runtime'];

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  // True when the note's title, text, tags or skill edits mention the harness and its parts.
  function isHarness(p) {
    if (!p) return false;
    if ((p.skill_edits || []).length) return true;
    var parts = [p.title].concat(p.paragraphs || [], p.tags || []);
    return HARNESS.test(parts.map(str).join(' \n '));
  }
  function filterPrefs(list, harnessOnly) {
    return (list || []).filter(function (p) { return !harnessOnly || isHarness(p); });
  }
  function pageOf(list, shown) { return (list || []).slice(0, Math.max(0, shown || 0)); }

  // Blank line = new paragraph; each paragraph is trimmed; empty ones drop.
  function splitParagraphs(text) {
    return str(text).split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function draftOf(p) {
    return { text: (p.paragraphs || []).join('\n\n'), skills: (p.skill_edits || []).map(function (e) { return e.text || ''; }) };
  }
  // The pref_edit input for a draft, or null when no paragraph is left.
  function editInput(p, draft) {
    var paragraphs = splitParagraphs(draft && draft.text);
    if (!paragraphs.length) return null;
    var input = { id: p.id, paragraphs: paragraphs };
    var edits = p.skill_edits || [];
    if (edits.length) {
      var skills = (draft && draft.skills) || [];
      input.skill_edits = edits.map(function (e, i) {
        var copy = Object.assign({}, e);
        var t = str(skills[i]).trim();
        if (t && e.text) copy.text = t;
        return copy;
      });
    }
    return input;
  }

  function needsApproval(item) { return !item || (item.status !== 'on' && item.status !== 'off'); }
  function countNeeds(items) { return (items || []).filter(needsApproval).length; }
  function kindRank(k) { var i = KIND_ORDER.indexOf(k); return i < 0 ? 99 : i; }
  function filterToolbox(items, kind, query) {
    var q = str(query).trim().toLowerCase();
    return (items || []).filter(function (i) {
      if (kind && kind !== 'all' && i.kind !== kind) return false;
      if (!q) return true;
      return [i.name, i.provider, i.access, i.notes, i.id, i.kind].map(str).join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) {
      var ua = needsApproval(a), ub = needsApproval(b);
      if (ua !== ub) return ua ? -1 : 1;
      return kindRank(a.kind) - kindRank(b.kind) || str(a.name).localeCompare(str(b.name));
    });
  }
  function kindOptions(items) {
    var counts = {};
    (items || []).forEach(function (i) { counts[i.kind] = (counts[i.kind] || 0) + 1; });
    var kinds = Object.keys(counts).sort(function (a, b) { return kindRank(a) - kindRank(b) || a.localeCompare(b); });
    return [{ value: 'all', label: 'All', count: (items || []).length }].concat(kinds.map(function (k) {
      return { value: k, label: k, count: counts[k] };
    }));
  }

  // One write: show "Working", call the server, then show its answer. Returns the promise.
  function runAct(cc, job, setStatus, setBusy) {
    if (setBusy) setBusy(job.key || job.tool);
    setStatus({ text: 'Working…' });
    var p;
    try { p = cc.wpc.act(job.tool, job.input, ['pref_list']); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).then(function () {
      setStatus({ text: job.label || 'Done.' });
      if (job.after) job.after();
    }, function (err) {
      setStatus({ text: 'Not saved: ' + ((err && (err.message || err.code)) || 'error') + '.', tone: 'error' });
    }).then(function () { if (setBusy) setBusy(null); });
  }

  function SkillEdits(p) {
    var edits = p.pref.skill_edits || [];
    if (!edits.length) return null;
    var draft = p.draft || { skills: [] };
    return h('div', { className: 'cc-pf-skill' },
      h('div', { className: 'cc-pf-sh' }, 'Approve also changes ' + edits.length + ' skill rule' + (edits.length > 1 ? 's' : '')),
      edits.map(function (e, i) {
        var body;
        if (p.editing && e.text) {
          body = h('textarea', { className: 'cc-in', rows: 3, 'aria-label': 'New rule text', 'data-skill-i': i,
            value: str(draft.skills[i]), onChange: function (ev) {
              var skills = (draft.skills || []).slice(); skills[i] = ev.target.value;
              p.onDraft(Object.assign({}, draft, { skills: skills }));
            } });
        } else if (e.text) {
          body = [e.replaces ? h('p', { key: 'o', className: 'cc-pf-old' }, h('s', null, e.replaces)) : null,
            h('p', { key: 'n' }, e.text)];
        } else {
          body = h('p', { className: 'cc-pf-ev' }, 'Rule text stays; this note becomes its source.');
        }
        return h('div', { key: i, className: 'cc-pf-se' },
          h('div', { className: 'cc-pf-st' }, str(e.skill) + ' · ' + str(e.section)),
          body,
          h('p', { className: 'cc-pf-ev' }, 'Evidence row: ' + str(e.evidence)));
      }));
  }

  // One pending note. Props: pref, editing, draft, busy, onAct(kind, pref), onEdit(pref), onDraft, onSave, onCancel.
  function PrefCard(p) {
    var B = CC.ui.Button, pref = p.pref, busy = !!p.busy;
    var draft = p.draft || { text: '', skills: [] };
    var text = p.editing
      ? h('div', { className: 'cc-pf-edit' },
        h('textarea', { className: 'cc-in', rows: 6, 'aria-label': 'Preference text', value: draft.text,
          onChange: function (ev) { p.onDraft(Object.assign({}, draft, { text: ev.target.value })); } }),
        h('div', { className: 'cc-pf-bar' },
          h(B, { kind: 'primary', size: 'sm', disabled: busy, onClick: function () { p.onSave(pref); } }, 'Save'),
          h(B, { size: 'sm', disabled: busy, onClick: function () { p.onCancel(); } }, 'Cancel'),
          h('span', { className: 'cc-pf-hint' }, 'A blank line starts a new paragraph. Quotes stay as said.')))
      : h('div', { className: 'cc-pf-text' }, (pref.paragraphs || []).map(function (pg, i) { return h('p', { key: i }, pg); }));
    return h('div', { className: 'cc-pf', 'data-pref-id': pref.id },
      h('div', { className: 'cc-pf-head' },
        h('div', { className: 'cc-pf-t' }, str(pref.title)),
        h('div', { className: 'cc-pf-act' },
          h(B, { kind: 'primary', size: 'sm', disabled: busy || p.editing, action: 'approve', onClick: function () { p.onAct('approve', pref); } }, 'Approve'),
          h(B, { size: 'sm', disabled: busy || p.editing, action: 'reject', onClick: function () { p.onAct('reject', pref); } }, 'Reject'),
          p.editing ? null : h(B, { kind: 'quiet', size: 'sm', disabled: busy, action: 'edit', onClick: function () { p.onEdit(pref); } }, 'Edit'))),
      text,
      (pref.sources || []).map(function (s, i) {
        var skillText = s.origin === 'derived_from_skill_text';
        var when = skillText && s.location ? ' (' + s.location + ')' : (s.stated_at ? ' (' + s.stated_at + ')' : '');
        return h('p', { key: 'q' + i, className: 'cc-pf-q' }, skillText ? h('b', null, 'Skill text, not your words: ') : null,
          '“' + str(s.verbatim) + '”' + when);
      }),
      h(SkillEdits, { pref: pref, editing: p.editing, draft: draft, onDraft: p.onDraft }),
      h('div', { className: 'cc-pf-meta' }, str(pref.id) + ' · weight ' + (pref.weight === undefined || pref.weight === null ? '–' : pref.weight) +
        ((pref.tags || []).length ? ' · ' + pref.tags.join(', ') : '')));
  }

  var CSS = [
    '.cc-root .cc-pf{padding:12px 0;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-pf-head{display:flex;align-items:flex-start;gap:12px;}',
    '.cc-root .cc-pf-t{flex:1 1 auto;font-weight:600;min-width:0;}',
    '.cc-root .cc-pf-act,.cc-root .cc-pf-bar,.cc-root .cc-pf-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.cc-root .cc-pf-text p,.cc-root .cc-pf-skill p{margin:6px 0;}',
    '.cc-root .cc-pf-edit textarea{width:100%;margin:8px 0;}',
    '.cc-root .cc-pf-q{margin:6px 0;color:var(--cc-text-2);font-style:italic;}',
    '.cc-root .cc-pf-skill{margin-top:8px;padding-left:10px;border-left:2px solid var(--cc-line-strong);}',
    '.cc-root .cc-pf-skill textarea{width:100%;}',
    '.cc-root .cc-pf-sh,.cc-root .cc-pf-st{font-weight:600;}',
    '.cc-root .cc-pf-old{color:var(--cc-text-3);}',
    '.cc-root .cc-pf-ev,.cc-root .cc-pf-meta,.cc-root .cc-pf-hint{color:var(--cc-text-3);font-size:12px;}',
    '.cc-root .cc-pf-tools{margin-bottom:8px;}',
    '.cc-root .cc-pf-more{padding:12px 0;}'
  ].join('');
  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    if (document.getElementById && document.getElementById('cc-tab-prefs')) return;
    var el = document.createElement('style'); el.id = 'cc-tab-prefs'; el.textContent = CSS; document.head.appendChild(el);
  }

  function PrefsSection(p) {
    var React = CC.React, ui = CC.ui;
    var res = p.res;
    var harnessSt = React.useState(true), harnessOnly = harnessSt[0];
    var shownSt = React.useState(PAGE), shown = shownSt[0];
    var editSt = React.useState(null), editing = editSt[0];
    var draftSt = React.useState(null), draft = draftSt[0];
    var busySt = React.useState(null), busy = busySt[0];
    var setStatus = p.setStatus;

    if (p.off) {
      return h(ui.Section, { title: 'Preferences', section: 'prefs' },
        h(ui.Empty, { title: 'The preferences add-on is off', body: 'Turn it on in Settings, under Add-ons. The toolbox below still works.' }));
    }
    var data = res.data;
    if (!data) {
      return h(ui.Section, { title: 'Preferences', section: 'prefs' },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading preferences…' }));
    }
    var pending = data.pending || [];
    var list = filterPrefs(pending, harnessOnly);
    var page = pageOf(list, shown);
    var active = (data.counts && data.counts.active) || 0;

    function act(kind, pref) {
      runAct(CC, { tool: kind === 'approve' ? 'pref_approve' : 'pref_reject', input: { id: pref.id }, key: pref.id,
        label: (kind === 'approve' ? 'Approved ' : 'Rejected ') + pref.id + '.' }, setStatus, busySt[1]);
    }
    function save(pref) {
      var input = editInput(pref, draft || draftOf(pref));
      if (!input) { setStatus({ text: 'Write at least one paragraph.', tone: 'error' }); return; }
      runAct(CC, { tool: 'pref_edit', input: input, key: pref.id, label: 'Saved ' + pref.id + '.',
        after: function () { editSt[1](null); draftSt[1](null); } }, setStatus, busySt[1]);
    }

    var tools = h('div', { className: 'cc-pf-tools' },
      h(ui.Toggle, { checked: harnessOnly, label: 'Harness only', onChange: function (v) { harnessSt[1](v); shownSt[1](PAGE); } }),
      h('span', null, 'Harness only'));
    var body;
    if (!pending.length) {
      body = h(ui.Empty, { title: 'No preferences wait for approval', body: active + ' active.' });
    } else if (!list.length) {
      body = h(ui.Empty, { title: 'No harness preferences wait', body: pending.length + ' other notes wait. Turn off Harness only to see them.' });
    } else {
      body = [h('div', { key: 'cards' }, page.map(function (pref) {
        var isEd = editing === pref.id;
        return h(PrefCard, { key: pref.id, pref: pref, editing: isEd, draft: isEd ? (draft || draftOf(pref)) : null,
          busy: busy === pref.id, onAct: act, onSave: save,
          onEdit: function (x) { editSt[1](x.id); draftSt[1](draftOf(x)); },
          onDraft: function (d) { draftSt[1](d); },
          onCancel: function () { editSt[1](null); draftSt[1](null); } });
      })),
      page.length < list.length ? h('div', { key: 'more', className: 'cc-pf-more' },
        h(ui.Button, { onClick: function () { shownSt[1](shown + PAGE); } }, 'Show more')) : null];
    }
    return h(ui.Section, { title: 'Preferences', section: 'prefs',
      meta: list.length ? 'Showing ' + page.length + ' of ' + list.length + (harnessOnly ? ' (' + pending.length + ' pending in all)' : '') : null },
    res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '. Showing the last list.') : null,
    tools, body);
  }

  function ToolboxSection(p) {
    var React = CC.React, ui = CC.ui;
    var res = p.res;
    var kindSt = React.useState('all'), kind = kindSt[0];
    var qSt = React.useState(''), query = qSt[0];
    var data = res.data;
    if (!data) {
      return h(ui.Section, { title: 'Toolbox', section: 'toolbox' },
        res.error ? h(CC.WpcProblem, { error: res.error }) : h(ui.Empty, { title: 'Reading the toolbox…' }));
    }
    var items = data.items || [];
    if (data.missing || !items.length) {
      return h(ui.Section, { title: 'Toolbox', section: 'toolbox' },
        h(ui.Empty, { title: data.missing ? 'No toolbox file yet' : 'The toolbox is empty',
          body: 'Add items to toolbox.json in the Waypoint data folder.' }));
    }
    var shown = filterToolbox(items, kind, query);
    var needs = countNeeds(items);
    return h(ui.Section, { title: 'Toolbox', section: 'toolbox',
      meta: needs + ' to confirm' + (data.updated_at ? ' · updated ' + data.updated_at : '') },
    res.error ? h(ui.Banner, { tone: 'error' }, 'Could not refresh: ' + (res.error.message || res.error.code) + '.') : null,
    h('div', { className: 'cc-pf-tools' },
      h(ui.Segmented, { label: 'Kind', value: kind, options: kindOptions(items), onChange: function (v) { kindSt[1](v); } }),
      h('input', { className: 'cc-in', type: 'search', placeholder: 'Filter', 'aria-label': 'Filter the toolbox', value: query,
        onChange: function (ev) { qSt[1](ev.target.value); } })),
    shown.length ? h(ui.List, { label: 'Toolbox items' }, shown.map(function (i) {
      var st = i.status === 'on' ? h(ui.Badge, { tone: 'run' }, 'on') : i.status === 'off' ? h(ui.Badge, {}, 'off')
        : h(ui.Badge, { tone: 'action', title: 'Status is ' + (i.status || 'not set') }, 'to confirm');
      return h(ui.Row, { key: i.id || i.name, id: i.id, wrap: true, title: str(i.name), sub: i.notes || null,
        meta: [i.kind, i.provider, i.cost].filter(Boolean).join(' · '), trail: st });
    })) : h(ui.Empty, { title: 'No match', body: 'Change the kind or the filter text.' }));
  }

  function PrefsTab(p) {
    ensureCss();
    var React = CC.React, ui = CC.ui;
    var features = CC.useWpcFeatures();
    var off = !!(features && features.addons && features.addons.preferences === false);
    var prefs = CC.useWpc(off ? null : 'pref_list', {}, { every: 120000 });  // a large registry reads slowly
    var toolbox = CC.useWpc('toolbox_read', {}, { every: 300000 });
    var statusSt = React.useState(null), status = statusSt[0];
    var pendingN = !off && prefs.data ? (prefs.data.pending || []).length : null;
    var needsN = toolbox.data ? countNeeds(toolbox.data.items) : null;
    var meta = [pendingN === null ? null : pendingN + ' pending', needsN === null ? null : needsN + ' tools to confirm'].filter(Boolean).join(' · ');
    return h(ui.Page, { page: 'prefs', col: true,
      header: h(ui.PageHeader, { title: 'Preferences and toolbox', meta: meta || null, pageId: p && p.pageId }),
      banner: status ? h(ui.Banner, { tone: status.tone }, status.text) : null },
    h(PrefsSection, { res: prefs, off: off, setStatus: statusSt[1] }),
    h(ToolboxSection, { res: toolbox }));
  }

  CC.PrefsTab = PrefsTab;
  CC.prefsTabInternals = { PAGE: PAGE, isHarness: isHarness, filterPrefs: filterPrefs, pageOf: pageOf,
    splitParagraphs: splitParagraphs, draftOf: draftOf, editInput: editInput, needsApproval: needsApproval,
    countNeeds: countNeeds, filterToolbox: filterToolbox, kindOptions: kindOptions, runAct: runAct, PrefCard: PrefCard };
})(CC);
