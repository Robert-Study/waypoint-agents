(function (CC) {
  // Run pools: ids are exactly runsheet.POOLS (engine/cc_engine/runsheet.py); test_ui_contract checks it.
  // usage: /api/usage pool-name prefixes that belong to each Run pool.
  var POOLS = [
    { id: 'claude_code', label: 'Claude Code', short: 'Claude', note: 'Max subscription', usage: ['claude_'] },
    { id: 'freebuff', label: 'Freebuff', short: 'Freebuff', note: 'local proxy, free', usage: ['freebuff'] },
    { id: 'gemini_app', label: 'Gemini App', short: 'Gemini', note: 'Gemini 4 Argon, copy prompt', usage: ['gemini_app'] },
    { id: 'chatgpt_web', label: 'ChatGPT Web', short: 'ChatGPT', note: 'GPT 6 Sol, copy prompt', usage: ['chatgpt_web'] }
  ];
  // The default run settings (runs now start from the Autonomous tab; Create's Run button opens
  // it). Kept as a JSON literal so test_ui_contract.py can check it against runsheet.expand.
  var DEFAULT_RUN_SETTINGS = /*CC-DEFAULT-RUN-SETTINGS*/{"pools": ["claude_code", "freebuff"], "preset": "balanced", "use_pool_fully": false, "auto_resume": true, "power_off": false, "merge_resets": true, "advanced": {}, "sprints": []}/*END*/;
  var AUTONOMOUS_PAGE = 'cc-sprints';
  // Inspector "Send to" routes, in display order (owner decision, 4 Nov 2026): automatic routes say Run;
  // Antigravity, Gemini App and AI Studio Playground are 1-click Open (copy the prompt, open the
  // app or site). CLI routes go through the Agents route (owner only, usage floors enforced there).
  // Codex runs only on the owner's own confirmed click (POST /api/node/run_owner, confirm: true).
  // Gemini App and AI Studio (web, pasted) are not the Gemini API.
  var GEMINI_URL = 'https://gemini.google.com/app';
  var CHATGPT_URL = 'https://chatgpt.com/';
  var AI_STUDIO_URL = 'https://aistudio.google.com/prompts/new_chat';
  var ANTIGRAVITY_URL = 'antigravity://';
  var SEND_TO = [
    { id: 'claude_code', label: 'Claude Code', note: 'Max subscription', action: 'Run', kind: 'cli' },
    { id: 'freebuff', label: 'Freebuff', note: 'local proxy, free', action: 'Run', kind: 'cli' },
    { id: 'codex', label: 'Codex', note: 'Your Codex plan, after a confirm', action: 'Run', kind: 'owner' },
    { id: 'antigravity', label: 'Antigravity', note: 'Opens the app, prompt copied', action: 'Open', kind: 'open', url: ANTIGRAVITY_URL },
    { id: 'gemini_app', label: 'Gemini App', note: 'Opens Gemini, prompt copied', action: 'Open', kind: 'open', url: GEMINI_URL },
    { id: 'chatgpt_web', label: 'ChatGPT Web', note: 'Opens ChatGPT, prompt copied', action: 'Open', kind: 'open', url: CHATGPT_URL },
    { id: 'ai_studio', label: 'AI Studio Playground', note: 'Opens AI Studio, prompt copied', action: 'Open', kind: 'open', url: AI_STUDIO_URL },
    { id: 'copy', label: 'Copy prompt', note: 'Paste it anywhere', action: 'Copy', kind: 'copy' }
  ];
  var DESC_LIMIT = 120;
  // History dot per moment, drawn with the shared StatusDot shapes.
  var HISTORY_DOT = { prereqs_met: 'ready', started: 'plain', interrupted: 'not_started', failed: 'error', completed: 'done',
    returned: 'submitted', replanned: 'ready' };
  // Every route has one on/off switch in the Agents tab; a switched-off route is greyed out and its
  // button does nothing. CC.isEnabled (toggles.js) decides when present, else /api/models enabled.
  function routeEnabled(row, models) {
    if (row.kind === 'copy') return true;
    if (typeof CC.isEnabled === 'function') {
      try { return CC.isEnabled(row.id) !== false; } catch (e) { return true; }
    }
    var list = Array.isArray(models) ? models : [];
    var ids = [row.id, 'agent:' + row.id, 'manual:' + row.id, 'manual:' + row.id + '_manual'];
    var own = list.filter(function (m) { return m && ids.indexOf(m.id) >= 0; });
    if (own.length) return own.some(function (m) { return m.enabled !== false; });
    var onRoute = list.filter(function (m) { return m && m.route === row.id; });
    if (onRoute.length) return onRoute.some(function (m) { return m.enabled !== false; });
    return true;
  }
  var ANSWER_LABEL = { accept: 'Accept', edit: 'Edit', reply: 'Reply', ignore: 'Ignore' };
  var ANSWER_KEY = { a: 'accept', e: 'edit', r: 'reply', i: 'ignore' };
  var STATUS_WORD = {
    done: 'Done', ready: 'Ready', running: 'Running', submitted: 'Checking', error: 'Error',
    not_started: 'Not started', needs_you: 'Needs you', skipped: 'Skipped', carried: 'Carried'
  };

  var STYLE = [
    // Page frame: CC.ui.Page + PageHeader (ui.js); the page is a size container so the header can
    // drop its meta line and segment counts when the column is narrow (1024 with the sidebar).
    '.cc-root.cc-create{container-type:inline-size;}',
    '.cc-root.cc-create .cc-ph{position:relative;z-index:3;}',
    '.cc-root.cc-create .cc-ph-title{display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto;overflow:hidden;}',
    '.cc-root.cc-create .cc-ph-mid,.cc-root.cc-create .cc-ph-act{flex:none;}',
    '.cc-root.cc-create .cc-ph-meta{flex:0 100 auto;}',
    '@container (max-width:980px){.cc-root.cc-create .cc-ph-meta{display:none;}}',
    '@container (max-width:860px){.cc-root.cc-create .cc-sg-n,.cc-root.cc-create .cc-attn-l,.cc-root.cc-create .cc-vchip{display:none;}.cc-root.cc-create .cc-sg-o{padding:0 8px;}.cc-root.cc-create .cc-ph{gap:8px;}}',
    // Project picker: the title itself. A native <select> paints its popup with the page's
    // color-scheme and the select's own colours, so both are set per theme (same selectors as
    // tokens.js) and the options get explicit token colours.
    '.cc-root .cc-proj{position:relative;display:inline-flex;align-items:center;min-width:0;max-width:360px;height:32px;margin-left:-6px;}',
    // The select sits over an invisible copy of the current name, so it is exactly as wide as the name.
    '.cc-root .cc-proj-size{visibility:hidden;font-size:17px;font-weight:600;letter-spacing:-.01em;padding:0 24px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
    '.cc-root .cc-project{appearance:none;border:0;background-color:var(--cc-bg);color:var(--cc-text);color-scheme:light;font:inherit;font-size:17px;font-weight:600;letter-spacing:-.01em;position:absolute;left:0;top:0;width:100%;height:32px;padding:0 24px 0 6px;border-radius:var(--cc-r-control);cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '@media (prefers-color-scheme: dark){.cc-root:not([data-theme="light"]) .cc-project{color-scheme:dark;}}',
    '.cc-root[data-theme="dark"] .cc-project,html[data-theme="dark"] .cc-root .cc-project,body.dark .cc-root .cc-project,body.theme-dark .cc-root .cc-project{color-scheme:dark;}',
    'html[data-theme="light"] .cc-root .cc-project,body.light .cc-root .cc-project,body.theme-light .cc-root .cc-project{color-scheme:light;}',
    '.cc-root .cc-project option{background-color:var(--cc-surface);color:var(--cc-text);font-size:14px;font-weight:400;}',
    '.cc-root .cc-project:hover{background-color:var(--cc-wash);}',
    '.cc-root .cc-project:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-proj-chev{position:absolute;right:6px;top:50%;margin-top:-7px;pointer-events:none;color:var(--cc-text-3);display:flex;}',
    '.cc-root .cc-proj-wrap{display:inline-flex;align-items:center;min-width:0;}',
    '.cc-root .cc-proj-one{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}',
    '.cc-root .cc-vchip{flex:none;font-size:11px;font-weight:500;color:var(--cc-text-3);border:1px solid var(--cc-line-strong);border-radius:999px;padding:0 6px;line-height:16px;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-attn{color:var(--cc-accent);}',
    // Menus: a <details> whose summary looks like a kit button; the popover is the one place a
    // panel floats (hairline, no blur). Escape and an outside click close it.
    '.cc-root .cc-more,.cc-root .cc-pop{position:relative;flex:none;}',
    '.cc-root .cc-more > summary,.cc-root .cc-pop > summary{list-style:none;}',
    '.cc-root .cc-more > summary::-webkit-details-marker,.cc-root .cc-pop > summary::-webkit-details-marker{display:none;}',
    '.cc-root .cc-more > summary:focus-visible,.cc-root .cc-pop > summary:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-more-m{position:absolute;right:0;top:32px;z-index:5;min-width:184px;background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);padding:4px;display:flex;flex-direction:column;gap:2px;font-size:12px;}',
    '.cc-root .cc-more-m .cc-meta{padding:4px 8px;}',
    '.cc-root .cc-mi{display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text);font:inherit;font-size:12px;text-align:left;cursor:pointer;white-space:nowrap;}',
    '.cc-root .cc-mi:hover:not(:disabled){background:var(--cc-wash);}',
    '.cc-root .cc-mi:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-mi.cc-danger{color:var(--cc-error);}',
    '.cc-root .cc-more-sep{height:1px;margin:4px 0;background:var(--cc-line);}',
    // Body: graph edge to edge on the canvas colour, inspector as the fixed side panel.
    '.cc-root .cc-canvas{position:relative;overflow:hidden;background:var(--cc-canvas);container-type:inline-size;}',
    '.cc-root .cc-canvas > .cc-em{position:relative;z-index:1;}',
    '.cc-root .cc-legend{position:absolute;left:16px;bottom:10px;display:flex;align-items:center;gap:12px;font-size:11px;color:var(--cc-text-3);pointer-events:none;white-space:nowrap;}',
    '.cc-root .cc-legend span{display:inline-flex;align-items:center;gap:4px;}',
    '.cc-root .cc-legend svg{width:12px;height:12px;overflow:visible;}',
    '@container (max-width:520px){.cc-root .cc-legend{display:none;}}',
    // Inspector: title, status, goal, check, facts, one action row, then a quiet history.
    '.cc-root .cc-side{display:flex;flex-direction:column;}',
    '.cc-root .cc-side-h{display:flex;align-items:flex-start;gap:8px;padding:12px 12px 0 16px;}',
    '.cc-root .cc-side-t{flex:1;min-width:0;padding-top:4px;font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
    '.cc-root .cc-side-a{display:flex;align-items:center;gap:2px;flex:none;}',
    '.cc-root .cc-side-b{display:flex;flex-direction:column;gap:12px;padding:8px 16px 16px;}',
    '.cc-root .cc-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--cc-text-2);white-space:nowrap;align-self:flex-start;}',
    '.cc-root .cc-pill .cc-dot-svg{width:12px;height:12px;overflow:visible;}',
    '.cc-root .cc-desc{font-size:12px;line-height:1.5;color:var(--cc-text-2);overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;}',
    '.cc-root .cc-desc.cc-desc-open{display:block;-webkit-line-clamp:unset;}',
    '.cc-root .cc-desc-more{align-self:flex-start;border:0;background:none;padding:0;margin-top:-8px;font:inherit;font-size:11px;color:var(--cc-text-3);cursor:pointer;}',
    '.cc-root .cc-desc-more:hover{color:var(--cc-text-2);}',
    '.cc-root .cc-desc-more:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-facts{display:grid;grid-template-columns:72px minmax(0,1fr);gap:4px 12px;margin:0;font-size:12px;}',
    '.cc-root .cc-facts dt{color:var(--cc-text-3);}',
    '.cc-root .cc-facts dd{margin:0;min-width:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-facts .cc-check-line{color:var(--cc-text);}',
    '.cc-root .cc-facts .cc-blocked-line{color:var(--cc-error);}',
    '.cc-root .cc-side-act{display:flex;align-items:center;gap:6px;min-width:0;}',
    '.cc-root .cc-side-act > .cc-b{min-width:0;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-side-act > .cc-pop > summary{padding:0 8px;}',
    '.cc-root .cc-ro-note{font-size:12px;color:var(--cc-text-3);}',
    // Send to: the full route list in a popover; the planned route carries a quiet accent bar.
    '.cc-root .cc-send-menu .cc-more-m{left:0;right:auto;width:328px;padding:0;gap:0;}',
    '.cc-root .cc-send{display:flex;flex-direction:column;}',
    '.cc-root .cc-send-h{display:flex;align-items:center;gap:8px;min-height:28px;padding:4px 12px;border-bottom:1px solid var(--cc-line);font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-send-h > *{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}',
    '.cc-root .cc-send-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-send-row{display:flex;align-items:center;gap:8px;min-height:40px;padding:4px 8px 4px 12px;}',
    '.cc-root .cc-send-row + .cc-send-row,.cc-root .cc-send-row + .cc-send-offs,.cc-root .cc-send-offs + .cc-send-row{border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-send-row.cc-send-rec{box-shadow:inset 2px 0 0 var(--cc-accent);}',
    '.cc-root .cc-send-t{flex:1;min-width:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-send-n{font-size:12px;font-weight:500;}',
    '.cc-root .cc-send-note{font-size:11px;color:var(--cc-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-send-row.cc-armed .cc-send-note{color:var(--cc-accent);}',
    '.cc-root .cc-send-row .cc-b{flex:none;min-width:56px;}',
    '.cc-root .cc-send-row.cc-off{opacity:.45;}',
    '.cc-root .cc-send-row.cc-off .cc-b{cursor:default;}',
    '.cc-root .cc-send-plan{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-send-offs{display:flex;align-items:center;min-height:32px;padding:2px 4px;}',
    '.cc-root .cc-off-toggle{height:24px;padding:0 8px;border:0;background:transparent;font:inherit;font-size:11px;color:var(--cc-text-3);border-radius:var(--cc-r-control);cursor:pointer;}',
    '.cc-root .cc-off-toggle:hover{background:var(--cc-wash);color:var(--cc-text-2);}',
    // History: a quiet list, one line per moment.
    '.cc-root .cc-sub{display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-sub-h{font-size:12px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-hist-none{font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-log{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;font-size:12px;}',
    '.cc-root .cc-log li{display:flex;align-items:center;gap:8px;min-height:24px;min-width:0;}',
    '.cc-root .cc-log time{color:var(--cc-text-3);font-size:11px;font-variant-numeric:tabular-nums;flex:none;width:40px;}',
    '.cc-root .cc-history .cc-hist-dot{width:12px;height:12px;flex:none;overflow:visible;}',
    '.cc-root .cc-hist-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cc-text-2);}',
    '.cc-root .cc-history li[data-kind="returned"] .cc-hist-t,.cc-root .cc-history li[data-kind="replanned"] .cc-hist-t{color:var(--cc-text-3);}',
    '.cc-root .cc-rules{padding:4px 8px;}',
    '.cc-root .cc-rules summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--cc-text-3);width:max-content;}',
    '.cc-root .cc-rules summary::-webkit-details-marker{display:none;}',
    '.cc-root .cc-rules summary::before{content:"\\203A";display:inline-block;width:8px;transition:transform 120ms;}',
    '.cc-root .cc-rules[open] summary::before{transform:rotate(90deg);}',
    '.cc-root .cc-rules summary:focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px;border-radius:4px;}',
    '.cc-root .cc-rules-l{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--cc-text-2);white-space:normal;}',
    // Claim: who is on the task right now, and where (flat, hairline-separated).
    '.cc-root .cc-claim{display:flex;flex-direction:column;gap:6px;padding:8px 0;border-top:1px solid var(--cc-line);border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-claim-h{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;}',
    '.cc-root .cc-claim-h .cc-b{margin-left:auto;}',
    '.cc-root .cc-claim-stale{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-claim .cc-dot-svg{width:12px;height:12px;overflow:visible;}',
    // Sheets (Needs you, Changes, History) slide over the canvas from the right.
    '.cc-root .cc-scrim{position:absolute;inset:0;z-index:4;background:var(--cc-bg);opacity:.5;}',
    '.cc-root .cc-sheet{position:absolute;top:0;right:0;bottom:0;z-index:4;width:420px;max-width:100%;background:var(--cc-surface);border-left:1px solid var(--cc-line-strong);display:flex;flex-direction:column;}',
    '.cc-root .cc-sheet-h{flex:none;display:flex;align-items:center;gap:8px;height:48px;padding:0 8px 0 16px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-sheet-t{font-size:14px;font-weight:600;}',
    '.cc-root .cc-sheet-h .cc-gap{flex:1;}',
    '.cc-root .cc-sheet-b{flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:16px;}',
    '.cc-root .cc-sheet-f{display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-sheet-f .cc-keys{margin-right:auto;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-sheet .cc-log li{align-items:baseline;min-height:28px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-sheet .cc-log li:last-child{border-bottom:0;}',
    '.cc-root .cc-q{display:flex;flex-direction:column;gap:12px;font-size:14px;}',
    '.cc-root .cc-field{display:flex;flex-direction:column;gap:4px;}',
    '.cc-root .cc-field > label{font-size:12px;font-weight:500;color:var(--cc-text-2);}',
    '.cc-root .cc-sheet .cc-kv{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;font-size:12px;}',
    '.cc-root .cc-sheet .cc-kv dt{color:var(--cc-text-3);}',
    '.cc-root .cc-sheet .cc-kv dd{margin:0;overflow-wrap:anywhere;}',
    '.cc-root .cc-cap{font-size:12px;font-weight:600;margin-bottom:4px;}',
    '.cc-root .cc-vh-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}',
    '.cc-root .cc-vh-row{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;text-align:left;font:inherit;font-size:12px;color:var(--cc-text);background:transparent;border:0;border-bottom:1px solid var(--cc-line);padding:0 4px;cursor:pointer;}',
    '.cc-root .cc-vh-row:hover{background:var(--cc-wash);}',
    '.cc-root .cc-vh-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-vh-sk{font-size:12px;color:var(--cc-text-2);padding:6px 4px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-vh-sk summary{cursor:pointer;color:var(--cc-text);}',
    '.cc-root .cc-vh-sk .cc-meta{margin-top:2px;}',
    '.cc-root .cc-input{width:100%;border:1px solid var(--cc-line-strong);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:12px;border-radius:var(--cc-r-control);padding:6px 10px;box-sizing:border-box;}',
    '.cc-root .cc-input:focus{outline:none;border-color:var(--cc-accent);}',
    '.cc-root textarea.cc-input{min-height:72px;resize:vertical;line-height:1.45;}',
    '.cc-root .cc-toast{position:absolute;left:50%;bottom:16px;z-index:6;transform:translateX(-50%);background:var(--cc-surface);border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);padding:6px 12px;font-size:12px;}'
  ].join('\n');

  // Kit-class pieces that work even where ui.js is not loaded (plugin tests load page_create.js
  // alone): the class names are ui.js's, so the look is the kit's.
  var ICON = { down: 'M6 9l6 6l6-6', more: 'M5 12h.01M12 12h.01M19 12h.01' };
  function icon(d, size) {
    return CC.h('svg', { width: size || 14, height: size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, CC.h('path', { d: d }));
  }
  function btnClass(kind, size, iconOnly) {
    return 'cc-b' + (kind && kind !== 'default' ? ' cc-b-' + kind : '') + (size === 'sm' ? ' cc-b-sm' : '') + (iconOnly ? ' cc-b-icon' : '');
  }
  // A <details> popover closes on Escape and on a click outside it (DESIGN rule 11).
  function useDismiss(ref) {
    var React = CC.React;
    React.useEffect(function () {
      if (typeof document === 'undefined' || !document.addEventListener) return undefined;
      function close(e) {
        var el = ref.current;
        if (!el || !el.open) return;
        if (e.type === 'keydown' ? e.key === 'Escape' : !el.contains(e.target)) el.open = false;
      }
      document.addEventListener('pointerdown', close);
      document.addEventListener('keydown', close);
      return function () { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
    }, []);
  }
  // React elements are immutable; the harness's are plain objects.
  function withProps(el, extra) {
    if (!el) return el;
    if (CC.React && typeof CC.React.cloneElement === 'function') return CC.React.cloneElement(el, extra);
    Object.assign(el.props, extra);
    return el;
  }

  // A More menu: the kit's (CC.ui.Menu, icon trigger) when ui.js is loaded; otherwise a <details>
  // with the same items, for plugin tests that load this file on its own.
  function moreMenu(p) {
    var h = CC.h;
    var items = (p.items || []).filter(Boolean);
    if (CC.ui && CC.ui.Menu) return h(CC.ui.Menu, { key: p.key, label: p.label, className: p.className, items: items });
    return h('details', { key: p.key, className: 'cc-more' + (p.className ? ' ' + p.className : ''), ref: p.ref },
      h('summary', { className: btnClass('quiet', null, true), 'aria-label': p.label, title: p.label }, '…'),
      h('div', { className: 'cc-more-m', role: 'menu' }, items.map(function (it, i) {
        if (it.sep) return h('div', { key: 'sep' + i, className: 'cc-more-sep', role: 'separator' });
        return h('button', { key: it.label, className: 'cc-mi' + (it.danger ? ' cc-danger' : ''), type: 'button', role: 'menuitem',
          disabled: !!it.disabled, onClick: function (e) { if (p.ref && p.ref.current) p.ref.current.open = false; if (it.onClick) it.onClick(e); },
          onBlur: it.onBlur }, it.label);
      })));
  }

  function ensurePageStyle() {
    if (CC.ui && CC.ui.ensureCss) CC.ui.ensureCss();
    if (typeof document === 'undefined' || document.getElementById('cc-create-style')) return;
    var el = document.createElement('style');
    el.id = 'cc-create-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function hm(iso) {
    if (!iso) return '–';
    var d = new Date(iso);
    if (isNaN(d)) return '–';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function shortCommand(cmd) {
    // Drop folders from path-like words so the line stays readable.
    return String(cmd).trim().split(/\s+/).map(function (w) {
      var bare = w.replace(/^["']|["']$/g, '');
      return /[\\/]/.test(bare) && !/^-/.test(bare) ? bare.split(/[\\/]/).filter(Boolean).pop() || bare : bare;
    }).join(' ');
  }
  function clip(prefix, middle, suffix, limit) {
    var room = limit - prefix.length - suffix.length;
    if (middle.length > room) middle = middle.slice(0, Math.max(room - 1, 1)) + '…';
    return prefix + middle + suffix;
  }
  // One plain sentence for a done-check; the raw check stays behind Details.
  function checkSummary(check) {
    check = check || {};
    if (check.type === 'command' && check.run) {
      var cmd = shortCommand(check.run);
      if (/\bpytest\b/.test(cmd)) {
        var files = (cmd.match(/test_[\w-]+\.py/g) || []).map(function (f) { return f.replace(/^test_|\.py$/g, '').replace(/_/g, ' '); });
        var k = cmd.match(/-k\s+["']?([^"'\s]+)/);
        if (files.length) return clip('Done when the tests for the ', files.join(' and '), ' pass', 60);
        if (k) return clip('Done when the tests about ', k[1], ' pass', 60);
        return 'Done when the tests pass';
      }
      return clip('Done when `', cmd, '` succeeds', 60);
    }
    if (check.type === 'files_exist') {
      var n = (check.paths || []).length;
      return 'Done when ' + n + (n === 1 ? ' file exists' : ' files exist');
    }
    if (check.type === 'text_present') return clip('Done when ', shortCommand(check.path || 'a file'), ' has the expected text', 60);
    if (check.type === 'human') return 'Done when you confirm';
    return 'Done when its check passes';
  }
  // CC.copyText / CC.openUrl may be injected (plugin tests); otherwise the browser does it.
  function copy(text) {
    if (typeof CC.copyText === 'function') return CC.copyText(text);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    return Promise.resolve();
  }
  function openUrl(url) {
    if (typeof CC.openUrl === 'function') return CC.openUrl(url);
    if (typeof window !== 'undefined' && window.open) window.open(url, '_blank', 'noopener');
    return undefined;
  }
  // The Send to row a planned model belongs to: the catalogue's route when /api/models knows the
  // id, else a cautious guess from the id. A Gemini API model is not the Gemini App.
  var ROUTE_ROWS = { claude_code: 'claude_code', freebuff: 'freebuff', gemini_app: 'gemini_app', chatgpt_web: 'chatgpt_web',
    antigravity: 'antigravity', codex: 'codex' };
  function guessRoute(text) {
    var t = String(text || '').toLowerCase();
    if (/codex/.test(t)) return 'codex';
    if (/antigravity|\bagy\b/.test(t)) return 'antigravity';
    if (/gemini[-_ ]?app/.test(t)) return 'gemini_app';
    if (/chatgpt|chat[-_]web/.test(t)) return 'chatgpt_web';
    if (/freebuff|deepseek/.test(t)) return 'freebuff';
    if (/claude|opus|sonnet|haiku/.test(t)) return 'claude_code';
    return null;
  }
  function recommendedRoute(id, models) {
    if (!id) return { route: null, label: null };
    var m = (Array.isArray(models) ? models : []).find(function (x) { return x && x.id === id; });
    if (!m) return { route: guessRoute(id), label: id };
    var route = m.route && ROUTE_ROWS[m.route] ? ROUTE_ROWS[m.route]
      : (m.route && m.route !== 'manual' ? null : guessRoute([m.id, m.label, m.provider].join(' ')));
    return { route: route, label: m.label || id };
  }
  // What dispatch will use for a node while a run is active (engine scheduler._candidate_pools,
  // _initial_model and runsheet.expand): the node's own pool/model/effort first (a model the
  // scheduler already wrote counts as a pin), else the run's default or first ticked pool, its
  // ladder's first model (advanced.model_ladder, else the preset ladder) and the per-pool effort.
  // Preset values mirror runsheet.LADDERS / PRESETS; Codex and Antigravity ladders are left out.
  var PRESET_FIRST = {
    frugal: { claude_code: 'haiku', freebuff: 'deepseek-chat' }, balanced: { claude_code: 'sonnet', freebuff: 'deepseek-chat' },
    push: { claude_code: 'sonnet', freebuff: 'deepseek-reasoner' }, max: { claude_code: 'opus', freebuff: 'deepseek-reasoner' } };
  ['frugal', 'balanced', 'push', 'max'].forEach(function (p) {
    PRESET_FIRST[p].chatgpt_web = 'gpt-6-sol'; PRESET_FIRST[p].gemini_app = 'gemini-4-argon';
  });
  var PRESET_EFFORT = { frugal: 'low', balanced: 'medium', push: 'high', max: 'xhigh' };
  // dispatch.POOL_ROUTES -> the Send to row id.
  var POOL_ROW = { claude: 'claude_code', claude_code: 'claude_code', claude_max: 'claude_code', codex: 'codex', codex_cli: 'codex',
    chatgpt: 'chatgpt_web', chatgpt_web: 'chatgpt_web', freebuff: 'freebuff', deepseek: 'freebuff',
    gemini: 'gemini_app', gemini_app: 'gemini_app', antigravity: 'antigravity', antigravity_manual: 'antigravity', agy: 'antigravity' };
  var RUN_OVER = { done: 1, finished: 1, cancelled: 1, failed: 1, error: 1, stopped: 1 };
  function activeRun(runs, project) {
    return (Array.isArray(runs) ? runs : []).find(function (r) {
      return r && r.project_id === project && !RUN_OVER[String(r.status || '').toLowerCase()];
    }) || null;
  }
  function dispatchPlan(node, run) {
    if (!node || !run) return null;
    var s = run.settings || {};
    var raw = s.raw && typeof s.raw === 'object' ? s.raw : s;
    var pools = Array.isArray(raw.pools) ? raw.pools
      : raw.pools && typeof raw.pools === 'object' ? Object.keys(raw.pools).filter(function (k) { return raw.pools[k]; }) : [];
    var pool = node.pool || (raw.default_pool && pools.indexOf(raw.default_pool) >= 0 ? raw.default_pool : pools[0]);
    if (!pool) return null;
    var preset = PRESET_EFFORT[raw.preset] ? raw.preset : 'balanced';
    var adv = raw.advanced && typeof raw.advanced === 'object' ? raw.advanced : {};
    var ladder = adv.model_ladder && Array.isArray(adv.model_ladder[pool]) && adv.model_ladder[pool].length ? adv.model_ladder[pool] : null;
    var model = node.model || (ladder ? ladder[0] : PRESET_FIRST[preset][pool]) || null;
    var base = typeof adv.effort === 'string' ? adv.effort : PRESET_EFFORT[preset];
    var effort = node.effort || (raw.efforts && raw.efforts[pool]) || base;
    return { pool: pool, route: POOL_ROW[pool] || null, model: model, effort: effort };
  }
  // Review 2: route subtitles name the model without its family prefix ("Opus 5.5").
  function shortModel(label) { return String(label || '').split(' · ')[0].replace(/\s*\([^()]*\)\s*$/, '').replace(/^Claude\s+/i, '').trim(); }
  // A display name for a model id: the catalogue label (exact id, else a catalogue id ending in
  // "/<id>-…" such as subagent:claude/haiku-5.5 for "haiku"), else "Claude Haiku" for a bare alias.
  function modelLabel(id, models) {
    if (!id) return '';
    var list = Array.isArray(models) ? models : [];
    var esc = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('[/:]' + esc + '(-|$)', 'i');
    var m = list.find(function (x) { return x && x.id === id; }) || list.find(function (x) { return x && re.test(String(x.id || '')); });
    var s = m && m.label ? String(m.label).split(' · ')[0].replace(/\s*\([^()]*\)\s*$/, '').trim() : '';
    var bare = /^(opus|sonnet|haiku)(?:-(\d[\d.]*))?$/i.exec(s || String(id));
    if (bare) return 'Claude ' + bare[1].charAt(0).toUpperCase() + bare[1].slice(1).toLowerCase() + (bare[2] ? ' ' + bare[2] : '');
    return s || String(id);
  }
  // A PowerShell line the owner pastes by hand: the prompt as a literal here-string piped to Codex.
  function codexCommand(prompt, cwd) {
    var body = String(prompt || '').replace(/\r\n/g, '\n').replace(/^'@/gm, " '@");
    return "@'\n" + body + "\n'@ | codex exec --skip-git-repo-check" + (cwd ? ' -C "' + String(cwd).replace(/"/g, '') + '"' : '') + ' -';
  }
  // Extra StarView props Create uses: region names only and the live dependencies (C1).
  function viewProps(view) {
    return view === 'star' ? { labelMode: 'regions', edgeMode: 'active' } : {};
  }

  // The status pill: the board's display status (derived Ready, Draft-aware), stored status as fallback.
  function StatusDot(props) {
    var h = CC.h;
    return h('span', { className: 'cc-pill' },
      CC.StatusDot ? h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18', 'aria-hidden': true }, h(CC.StatusDot, { status: props.status })) : null,
      STATUS_WORD[props.status] || props.status);
  }
  function displayStatus(node) { return (node && (node.display_status || node.status)) || 'not_started'; }
  // The goal as one paragraph (whitespace folded); the CSS shows three lines, More the rest.
  var DESC_MORE = 150;
  function goalText(goal) { return String(goal || '').replace(/\s+/g, ' ').trim(); }
  // One line from the goal: its first sentence when that fits, else the start, clipped.
  function oneLine(goal) {
    var t = String(goal || '').replace(/\s+/g, ' ').trim();
    var m = t.match(/^(.+?[.!?])(\s|$)/);
    if (m && m[1].length <= DESC_LIMIT) return m[1];
    return t.length > DESC_LIMIT ? t.slice(0, DESC_LIMIT - 1).trimEnd() + '…' : t;
  }
  // HH:MM today, else "4 Nov".
  function when(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return '–';
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return hm(iso);
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  }
  function History(props) {
    var h = CC.h;
    var rows = Array.isArray(props.rows) ? props.rows : [];
    if (!rows.length) {
      return h('section', { className: 'cc-sub' }, h('div', { className: 'cc-sub-h' }, 'History'),
        h('div', { className: 'cc-meta cc-hist-none' }, 'No history yet'));
    }
    return h('section', { className: 'cc-sub' }, h('div', { className: 'cc-sub-h' }, 'History'),
      h('ol', { className: 'cc-log cc-history', 'aria-label': 'History' }, rows.map(function (r, i) {
      var text = String(r.text || '');
      var by = r.by && text.indexOf(r.by) < 0 ? r.by : null;
      return h('li', { key: i, 'data-kind': r.kind },
        h('time', { dateTime: r.at, title: r.at ? new Date(r.at).toLocaleString() : '' }, when(r.at)),
        CC.StatusDot ? h('svg', { className: 'cc-hist-dot', viewBox: '-9 -9 18 18', 'aria-hidden': true },
          h(CC.StatusDot, { status: HISTORY_DOT[r.kind] || 'not_started' })) : null,
        h('span', { className: 'cc-hist-t', title: text + (by ? ' · ' + by : '') }, text, by ? h('span', { className: 'cc-meta' }, ' · ' + by) : null));
    })));
  }

  // A quiet "Rules learned" list for the project (read-only, from /api/constraints); nothing when empty.
  function RulesLearned(props) {
    var h = CC.h;
    var rules = (props.rules || []).filter(function (r) { return r && r.line; });
    if (!rules.length) return null;
    return h('details', { className: 'cc-rules cc-sub' },
      h('summary', null, 'Rules learned · ' + rules.length),
      h('ul', { className: 'cc-rules-l' }, rules.slice(0, 12).map(function (r, i) {
        return h('li', { key: i }, String(r.line));
      })));
  }

  function Inspector(props) {
    var h = CC.h, React = CC.React;
    var q = props.project && props.id ? 'project=' + encodeURIComponent(props.project) + '&id=' + encodeURIComponent(props.id) : null;
    var detail = CC.useEngine(q ? '/api/node?' + q : null, ['state']);
    // Clean history (worker A's /api/node/history) and the optional Pick for me hint (/api/pick);
    // either may be absent (404) and the panel still works.
    var hist = CC.useEngine(q ? '/api/node/history?' + q : null, ['state']);
    var rulesQ = CC.useEngine(props.project ? '/api/constraints?project=' + encodeURIComponent(props.project) : null, ['state']);
    var pick = CC.useEngine(q ? '/api/pick?kind=task&' + q : null, ['state']);
    // Optional catalogue (/api/models) and agent availability (/api/agents); absent falls back.
    var models = CC.useEngine('/api/models', ['models']);
    var agents = CC.useEngine('/api/agents', ['agents']);
    // The project's active run decides what dispatch will use (Planned line); absent means none.
    var runs = CC.useEngine(props.project ? '/api/runs' : null, ['run', 'state']);
    var bz = React.useState(null), busy = bz[0], setBusy = bz[1];
    var ar = React.useState(null), armed = ar[0], setArmed = ar[1];
    var so = React.useState(false), showOff = so[0], setShowOff = so[1];
    var dm = React.useState(false), descOpen = dm[0], setDescOpen = dm[1];
    var sendRef = React.useRef(null), moreRef = React.useRef(null);
    useDismiss(sendRef);
    useDismiss(moreRef);
    var node = detail.data && (detail.data.node || detail.data);
    if (!node) return h('aside', { className: 'cc-split-side cc-side' }, h('div', { className: 'cc-side-b' },
      h('div', { className: 'cc-meta' }, detail.error ? 'Could not load this step.' : 'Loading…')));
    var check = node.check || node.check_json || {};
    if (typeof check === 'string') { try { check = JSON.parse(check); } catch (e) { check = { type: 'text', run: check }; } }
    var status = displayStatus(node);
    function setStatus(next) {
      CC.api.post('/api/node/status', { project: props.project, id: node.id, status: next, revision: props.revision })
        .then(function () { props.toast(next === 'done' ? 'Marked done' : 'Reopened'); },
          function (e) { props.toast(e.status === 409 ? 'Changed elsewhere — refreshed, try again' : 'Could not save: ' + e.message); });
    }
    var modelList = models.data && (models.data.models || models.data);
    // A code node runs its script, never a model. With an active run the Planned row and text are
    // what dispatch will use; the generic Pick for me hint shows only when no run is active.
    var isCode = CC.isCodeNode ? CC.isCodeNode(node) : node.kind === 'code';
    var plan = isCode ? null : dispatchPlan(node, activeRun(runs.data && (runs.data.runs || runs.data), props.project));
    var picked = !isCode && !plan && pick.data && pick.data.model ? pick.data : null;
    var rec = isCode ? { route: null, label: null }
      : plan ? { route: plan.route, label: modelLabel(plan.model, modelList) }
        : recommendedRoute(node.recommended || (picked && picked.model), modelList);
    var planText = plan ? [shortModel(rec.label), plan.effort].filter(Boolean).join(' · ') : '';
    var agentList = (agents.data && (agents.data.agents || agents.data)) || [];
    var agy = Array.isArray(agentList) ? agentList.find(function (a) { return a && a.id === 'antigravity'; }) : null;
    var codexInfo = Array.isArray(agentList) ? agentList.find(function (a) { return a && a.id === 'codex'; }) : null;
    function reason(e) { return (e && e.data && e.data.detail) || (e && e.message) || 'unknown error'; }
    function withPrompt(fn) {
      return CC.api.post('/api/prompt', { project: props.project, id: node.id }).then(function (r) { return fn(r.prompt); },
        function (e) { props.toast('Could not build prompt: ' + e.message); });
    }
    function runCodex() {
      // The owner's own confirmed click; the engine refuses anything else (I4).
      return CC.api.post('/api/node/run_owner', { project: props.project, id: node.id, route: 'codex', confirm: true })
        .then(function () { props.toast('Codex is running on this task'); },
          function (e) { props.toast('Codex did not start: ' + reason(e)); });
    }
    function sendTo(row) {
      if (busy || !routeEnabled(row, modelList)) return undefined;
      if (row.kind === 'owner' && armed !== row.id) { setArmed(row.id); return undefined; }
      setArmed(null);
      setBusy(row.id);
      var finish = function () { setBusy(null); };
      if (row.kind === 'owner') return runCodex().then(finish, finish);
      return withPrompt(function (prompt) {
        if (row.kind === 'cli') {
          var body = { agent: row.id, message: prompt };
          if (props.cwd) body.cwd = props.cwd;
          return CC.api.post('/api/agents/send', body).then(function () {
            props.toast('Running on ' + row.label + ' — follow it on the Agents tab');
          }, function (e) { props.toast('Could not run on ' + row.label + ': ' + reason(e)); });
        }
        return copy(prompt).then(function () {
          if (row.kind !== 'open') { props.toast('Prompt copied'); return; }
          if (row.id === 'antigravity' && agy && agy.available === false) {
            props.toast('Prompt copied — open Antigravity and paste it');
            return;
          }
          props.toast('Prompt copied — paste it into ' + row.label);
          openUrl(row.url);
        });
      }).then(finish, finish);
    }
    function release() {
      CC.api.post('/api/release', { project: props.project, node: node.id }).then(function () { props.toast('Claim released'); },
        function (e) { props.toast('Could not release: ' + e.message); });
    }
    var claim = node.claim && node.claim.by ? node.claim : null;
    var claimBox = claim ? h('div', { className: 'cc-claim', role: 'status' },
      h('div', { className: 'cc-claim-h' },
        h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18', 'aria-hidden': true }, h(CC.StatusDot, { status: claim.stale ? 'not_started' : 'running' })),
        h('span', null, claim.by + (claim.stale ? '' : ' is working on this')),
        props.readOnly ? null : h('button', { className: btnClass('quiet', 'sm'), type: 'button', onClick: release }, 'Release')),
      claim.stale ? h('div', { className: 'cc-claim-stale' }, 'Claim is stale: no refresh since ' + hm(claim.refreshed_at || claim.since)) : null,
      h('dl', { className: 'cc-facts' },
        h('dt', null, 'Worktree'), h('dd', null, claim.worktree || 'Main folder'),
        h('dt', null, 'Folder'), h('dd', null, claim.cwd || '–'),
        h('dt', null, 'Environment'), h('dd', null, claim.environment || '–'),
        h('dt', null, 'Since'), h('dd', null, hm(claim.since)))) : null;
    var codexLeft = codexInfo && codexInfo.usage_percent != null ? ' · ' + Math.round(codexInfo.usage_percent) + '% left' : '';
    var head = isCode ? h('span', { key: 'plan', className: 'cc-send-plan' }, 'Code · runs its script, no model')
      : !plan && node.recommended ? h('span', { key: 'plan', className: 'cc-send-plan' }, 'Planned: ' + (rec.label || node.recommended)) : null;
    // Switched-off routes stay greyed but fold into one quiet trailing "N off" row (shared rule).
    var onRows = SEND_TO.filter(function (row) { return routeEnabled(row, modelList); });
    var offRows = SEND_TO.filter(function (row) { return !routeEnabled(row, modelList); });
    // Pick for me sits in the subtitle of the route it picked (else the first route).
    var pickRoute = picked ? recommendedRoute(picked.model, modelList).route : null;
    var pickRow = picked ? (onRows.find(function (r) { return r.id === pickRoute; }) || onRows[0]) : null;
    var pickText = picked ? 'Pick for me · ' + shortModel(recommendedRoute(picked.model, modelList).label || picked.model) : '';
    function sendRow(row) {
      var isRec = !!rec.route && rec.route === row.id;
      var on = routeEnabled(row, modelList);
      var isArmed = on && armed === row.id;
      var label = isArmed ? 'Confirm' : row.action;
      var isPick = !!pickRow && pickRow.id === row.id && !isArmed;
      var note = !on ? 'Off in Agents' : isArmed ? 'Uses your Codex plan' + codexLeft : isPick ? pickText
        : isRec && planText ? planText : row.note;
      return h('li', { key: row.id, className: 'cc-send-row' + (isRec ? ' cc-send-rec' : '') + (isArmed ? ' cc-armed' : '') + (on ? '' : ' cc-off'),
        'aria-disabled': on ? undefined : 'true' },
        h('div', { className: 'cc-send-t' },
          h('span', { className: 'cc-send-n' }, row.label),
          h('span', { className: 'cc-meta cc-send-note' + (isPick ? ' cc-pick' : ''), title: isPick ? [picked.effort ? 'Effort ' + picked.effort : '', picked.why || ''].filter(Boolean).join('. ') : (isRec && !isArmed ? 'Planned' : undefined) },
            note)),
        h('button', { className: btnClass(isArmed ? 'primary' : 'default', 'sm'), type: 'button', disabled: !!busy || !on, 'aria-label': label + ': ' + row.label,
          onClick: function () { sendTo(row); } }, busy === row.id ? '…' : label));
    }
    var offToggle = offRows.length ? h('li', { key: 'off', className: 'cc-send-offs' },
      h('button', { className: 'cc-off-toggle', type: 'button', 'aria-expanded': showOff ? 'true' : 'false',
        title: offRows.map(function (r) { return r.label; }).join(', ') + ' · off in Agents',
        onClick: function () { setShowOff(!showOff); } }, offRows.length + ' off')) : null;
    var sendList = h('div', { className: 'cc-send' },
      head ? h('div', { className: 'cc-send-h' }, head) : null,
      h('ul', { className: 'cc-send-list' }, onRows.map(sendRow).concat(offToggle ? [offToggle] : [], showOff ? offRows.map(sendRow) : [])));
    // One action row: the planned route as a direct button (when it is switched on), Copy prompt,
    // and Send to for every other route. Codex still arms first and runs only on Confirm.
    var quick = rec.route ? onRows.find(function (r) { return r.id === rec.route && r.kind !== 'copy'; }) : null;
    var quickArmed = !!quick && armed === quick.id;
    var copyRow = SEND_TO.find(function (r) { return r.kind === 'copy'; });
    var actions = props.readOnly ? null : h('div', { className: 'cc-side-act' },
      quick ? h('button', { className: btnClass(quickArmed ? 'primary' : 'default'), type: 'button', disabled: !!busy, 'data-cc-quick': quick.id,
        title: quickArmed ? 'Uses your Codex plan' + codexLeft : (planText || rec.label || quick.note),
        onClick: function () { sendTo(quick); } }, busy === quick.id ? '…' : quickArmed ? 'Confirm Codex' : (quick.action === 'Open' ? 'Open in ' : 'Run on ') + quick.label) : null,
      h('button', { className: btnClass('default'), type: 'button', disabled: !!busy, 'data-cc-quick': 'copy',
        onClick: function () { sendTo(copyRow); } }, busy === 'copy' ? '…' : 'Copy prompt'),
      h('details', { className: 'cc-pop cc-send-menu', ref: sendRef },
        h('summary', { className: btnClass('quiet'), 'aria-label': 'Send to another route', title: 'Send to' }, 'Send to', icon(ICON.down, 14)),
        h('div', { className: 'cc-more-m' }, sendList)));
    // Overflow: Mark done / Reopen and the learned rules, out of the default view.
    // Overflow: Mark done / Reopen, out of the default view (the kit's More menu).
    var doneItem = props.readOnly ? null : node.status === 'done'
      ? { label: 'Reopen', onClick: function () { setStatus('not_started'); } }
      : { label: 'Mark done', onClick: function () { setStatus('done'); } };
    var more = doneItem ? moreMenu({ label: 'More actions', items: [doneItem], ref: moreRef }) : null;
    var historyRows = hist.data && (hist.data.history || hist.data);
    var deps = Array.isArray(node.deps) ? node.deps : [];
    var blockedLine = props.blockedBy && props.blockedBy.length && CC.blockedLine ? CC.blockedLine(props.blockedBy) : null;
    var modelName = isCode ? 'Code' : shortModel(rec.label) || node.model || '';
    var model = modelName && !isCode ? [modelName, plan ? plan.effort : node.effort].filter(Boolean).join(' · ') : modelName;
    var facts = h('dl', { className: 'cc-facts' },
      h('dt', null, 'Id'), h('dd', null, String(node.id)),
      h('dt', null, 'Needs'), h('dd', null, deps.length ? deps.join(', ') : 'Nothing'),
      model ? h('dt', null, 'Model') : null, model ? h('dd', null, model) : null,
      node.attempts ? h('dt', null, 'Attempts') : null, node.attempts ? h('dd', null, String(node.attempts)) : null,
      h('dt', null, 'Check'), h('dd', { title: checkSummary(check) }, checkSummary(check).replace(/^Done when /, '')),
      CC.checkCounts ? h('dt', null, 'Runs') : null,
      CC.checkCounts ? h('dd', { className: 'cc-check-line' }, CC.checkLine(CC.checkCounts(node))) : null,
      blockedLine ? h('dt', null, 'Blocked') : null,
      blockedLine ? h('dd', { className: 'cc-blocked-line' }, blockedLine) : null);
    return h('aside', { className: 'cc-split-side cc-side', 'aria-label': 'Step details' },
      h('div', { className: 'cc-side-h' },
        h('div', { className: 'cc-side-t' }, node.title || node.id),
        h('div', { className: 'cc-side-a' }, more,
          h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×'))),
      h('div', { className: 'cc-side-b' },
        h(StatusDot, { status: status }),
        h('div', { className: 'cc-desc' + (descOpen ? ' cc-desc-open' : ''), title: node.goal || '' }, goalText(node.goal)),
        goalText(node.goal).length > DESC_MORE ? h('button', { className: 'cc-desc-more', type: 'button', 'aria-expanded': descOpen ? 'true' : 'false',
          onClick: function () { setDescOpen(!descOpen); } }, descOpen ? 'Less' : 'More') : null,
        props.readOnly ? h('div', { className: 'cc-ro-note' }, 'Archived version, read-only') : null,
        facts,
        claimBox,
        actions,
        h(History, { rows: Array.isArray(historyRows) ? historyRows : [] }),
        h(RulesLearned, { rules: rulesQ.data && rulesQ.data.constraints })));
  }

  function allowedOf(q) {
    if (q.allowed && q.allowed.length) return q.allowed;
    return q.kind === 'text' ? ['reply', 'ignore'] : ['answer', 'ignore'];
  }
  function fieldText(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
  function isTyping(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el.isContentEditable;
  }

  // One question at a time (Agent Inbox model): buttons only for the question's allowed
  // answer types; nothing preselected or focused. Keys: A accept, E edit, R reply, I ignore, J/K next/prev.
  function NeedsYou(props) {
    var h = CC.h, React = CC.React;
    var ix = React.useState(0), index = ix[0], setIndex = ix[1];
    var md = React.useState(null), mode = md[0], setMode = md[1];          // null | 'edit' | 'reply'
    var dr = React.useState({ value: undefined, reply: '', edits: {} }), draft = dr[0], setDraft = dr[1];
    var cl = React.useState({}), closed = cl[0], setClosed = cl[1];        // answered here, awaiting refresh
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var replyRef = React.useRef(null);

    var list = (props.questions || []).filter(function (q) { return !closed[q.id]; });
    var at = Math.min(index, Math.max(list.length - 1, 0));
    var q = list[at] || null;
    var allowed = q ? allowedOf(q) : [];
    var can = function (t) { return allowed.indexOf(t) >= 0; };
    // A text question whose only real answer is a reply opens straight onto the reply box.
    var replyOnly = !!q && can('reply') && !can('accept') && !can('edit') && !can('answer');
    var activeMode = mode || (replyOnly ? 'reply' : null);
    var qid = q && q.id;

    React.useEffect(function () {
      setMode(null); setDraft({ value: undefined, reply: '', edits: {} });
    }, [qid]);

    function go(step) {
      if (!list.length) return;
      setIndex(Math.min(Math.max(at + step, 0), list.length - 1));
    }
    function send(type, value) {
      if (!q || busy || !can(type)) return;
      var id = q.id;
      setBusy(true);
      var body = { id: id, answer: value === undefined ? { type: type } : { type: type, value: value } };
      CC.api.post('/api/question/answer', body).then(function () {
        setBusy(false);
        setClosed(function (prev) { var n = Object.assign({}, prev); n[id] = true; return n; });
        props.toast({ accept: 'Accepted', edit: 'Changes saved', reply: 'Reply sent', ignore: 'Dismissed', answer: 'Answer saved' }[type]);
        if (list.length <= 1) props.onClose();
      }, function (e) { setBusy(false); props.toast('Could not save: ' + e.message); });
    }
    function startEdit() {
      if (!q || !can('edit')) return;
      var edits = {};
      Object.keys(q.proposal || {}).forEach(function (k) { edits[k] = fieldText(q.proposal[k]); });
      setDraft(function (d) { return Object.assign({}, d, { edits: edits }); });
      setMode('edit');
    }
    function startReply() {
      if (!q || !can('reply')) return;
      setMode('reply');
      setTimeout(function () { if (replyRef.current) replyRef.current.focus(); }, 0);
    }
    function changedFields() {
      var out = {};
      Object.keys(q.proposal || {}).forEach(function (k) {
        var was = q.proposal[k], now = draft.edits[k];
        if (now === undefined || now === fieldText(was)) return;
        if (typeof was === 'string') { out[k] = now; return; }
        try { out[k] = JSON.parse(now); } catch (e) { out[k] = now; }
      });
      return out;
    }
    function cancelMode() { setMode(null); }

    var handlers = { accept: function () { send('accept'); }, edit: startEdit, reply: startReply, ignore: function () { send('ignore'); } };
    var keyRef = React.useRef(null);
    keyRef.current = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { e.preventDefault(); if (mode) cancelMode(); else props.onClose(); return; }
      if (isTyping(e.target)) return;
      var k = (e.key || '').toLowerCase();
      if (k === 'j') { e.preventDefault(); go(1); return; }
      if (k === 'k') { e.preventDefault(); go(-1); return; }
      var type = ANSWER_KEY[k];
      if (type && can(type) && !mode) { e.preventDefault(); handlers[type](); }
    };
    React.useEffect(function () {
      function onKey(e) { if (keyRef.current) keyRef.current(e); }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, []);

    var body = null, footer = [];
    if (q) {
      var options = q.options || q.options_json || [];
      var proposal = q.proposal && Object.keys(q.proposal).length ? q.proposal : null;
      var answerInput = null;
      if (can('answer') && !activeMode) {
        answerInput = q.kind === 'likert' && CC.Likert
          ? h(CC.Likert, { scale: q.scale || 9, value: draft.value, labels: options, ariaLabel: q.prompt, onChange: function (v) { setDraft(function (d) { return Object.assign({}, d, { value: v }); }); } })
          : q.kind === 'select' && CC.SelectAll
            ? h(CC.SelectAll, { options: options, value: draft.value || [], ariaLabel: q.prompt, onChange: function (v) { setDraft(function (d) { return Object.assign({}, d, { value: v }); }); } })
            : h('textarea', { className: 'cc-input', 'aria-label': 'Answer', value: draft.value || '', onChange: function (e) { var v = e.target.value; setDraft(function (d) { return Object.assign({}, d, { value: v }); }); } });
      }
      var hasAnswer = draft.value != null && draft.value !== '' && !(Array.isArray(draft.value) && !draft.value.length);
      body = h('div', { className: 'cc-q', key: q.id },
        h('div', null, q.prompt),
        q.node_id ? h('div', { className: 'cc-meta' }, 'Step ' + q.node_id) : null,
        proposal && activeMode !== 'edit' ? h('div', { className: 'cc-field' }, h('label', null, 'Proposed'),
          h('dl', { className: 'cc-kv' }, Object.keys(proposal).map(function (k) {
            return [h('dt', { key: k + 'k' }, k), h('dd', { key: k + 'v' }, fieldText(proposal[k]))];
          }))) : null,
        activeMode === 'edit' ? h('div', { className: 'cc-field' }, h('label', null, 'Change the proposal'),
          h('dl', { className: 'cc-kv' }, Object.keys(q.proposal || {}).map(function (k) {
            return [h('dt', { key: k + 'k' }, h('label', { htmlFor: 'cc-edit-' + k }, k)), h('dd', { key: k + 'v' },
              h('input', { id: 'cc-edit-' + k, className: 'cc-input', value: draft.edits[k] == null ? '' : draft.edits[k],
                onChange: function (e) { var v = e.target.value; setDraft(function (d) { var ed = Object.assign({}, d.edits); ed[k] = v; return Object.assign({}, d, { edits: ed }); }); } }))];
          }))) : null,
        activeMode === 'reply' ? h('div', { className: 'cc-field' }, h('label', { htmlFor: 'cc-reply' }, 'Reply'),
          h('textarea', { id: 'cc-reply', ref: replyRef, className: 'cc-input', value: draft.reply,
            onChange: function (e) { var v = e.target.value; setDraft(function (d) { return Object.assign({}, d, { reply: v }); }); } })) : null,
        answerInput);

      if (activeMode === 'edit') {
        var changed = changedFields();
        footer = [
          h('button', { key: 'c', className: 'cc-b cc-b-quiet', type: 'button', onClick: cancelMode }, 'Cancel'),
          h('button', { key: 's', className: 'cc-b cc-b-primary', type: 'button', disabled: busy || !Object.keys(changed).length,
            onClick: function () { send('edit', changed); } }, 'Save changes')];
      } else if (activeMode === 'reply') {
        footer = [
          replyOnly && can('ignore') ? h('button', { key: 'i', className: 'cc-b cc-b-quiet', type: 'button', title: 'I', disabled: busy, onClick: handlers.ignore }, 'Ignore')
            : h('button', { key: 'c', className: 'cc-b cc-b-quiet', type: 'button', onClick: cancelMode }, 'Cancel'),
          h('button', { key: 's', className: 'cc-b cc-b-primary', type: 'button', disabled: busy || !draft.reply.trim(),
            onClick: function () { send('reply', draft.reply); } }, 'Send reply')];
      } else {
        // Order: Ignore, Reply, Edit, (Save answer), Accept. Accept is primary only when allowed;
        // otherwise Save answer is. Nothing is preselected or focused.
        ['ignore', 'reply', 'edit'].forEach(function (t) {
          if (!can(t)) return;
          footer.push(h('button', { key: t, className: t === 'ignore' ? 'cc-b cc-b-quiet' : 'cc-b', type: 'button', title: t.charAt(0).toUpperCase(),
            disabled: busy, onClick: handlers[t] }, ANSWER_LABEL[t]));
        });
        if (can('answer')) footer.push(h('button', { key: 'answer', className: can('accept') ? 'cc-b' : 'cc-b cc-b-primary', type: 'button',
          disabled: busy || !hasAnswer, onClick: function () { send('answer', draft.value); } }, 'Save answer'));
        if (can('accept')) footer.push(h('button', { key: 'accept', className: 'cc-b cc-b-primary', type: 'button', title: 'A',
          disabled: busy, onClick: handlers.accept }, 'Accept'));
      }
    }
    var keys = allowed.filter(function (t) { return ANSWER_LABEL[t]; }).map(function (t) { return t.charAt(0).toUpperCase() + ' ' + t; });
    if (list.length > 1) keys.push('J / K next, previous');

    return h('div', null,
      h('div', { className: 'cc-scrim', onClick: props.onClose }),
      h('section', { className: 'cc-sheet', role: 'dialog', 'aria-label': 'Needs you' },
        h('div', { className: 'cc-sheet-h' },
          h('div', { className: 'cc-sheet-t' }, 'Needs you'),
          list.length ? h('span', { className: 'cc-meta', 'aria-live': 'polite' }, (at + 1) + ' of ' + list.length) : null,
          h('div', { className: 'cc-gap' }),
          list.length > 1 ? h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Previous question', title: 'K', disabled: at === 0, onClick: function () { go(-1); } }, '‹') : null,
          list.length > 1 ? h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Next question', title: 'J', disabled: at >= list.length - 1, onClick: function () { go(1); } }, '›') : null,
          h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×')),
        h('div', { className: 'cc-sheet-b' }, body || h('div', { className: 'cc-meta' }, 'Nothing needs you right now.')),
        q ? h('div', { className: 'cc-sheet-f' }, h('span', { className: 'cc-keys' }, keys.join(' · ')), footer) : null));
  }


  var CHANGES_MAX = 30;
  // One line per task: the latest summary for each step (run-level events keep one line per
  // kind), newest first, at most CHANGES_MAX lines.
  function latestPerTask(events) {
    var seen = {}, out = [];
    (Array.isArray(events) ? events : []).filter(function (e) { return e && e.summary; })
      .slice().sort(function (a, b) { return (b.seq || 0) - (a.seq || 0); })
      .forEach(function (e) {
        var key = e.node_id ? 'node:' + e.node_id : 'run:' + (e.kind || '');
        if (seen[key] || out.length >= CHANGES_MAX) return;
        seen[key] = true;
        out.push(e);
      });
    return out;
  }

  // The header of a sheet: title, optional meta, close.
  function SheetHead(props) {
    var h = CC.h;
    return h('div', { className: 'cc-sheet-h' },
      h('div', { className: 'cc-sheet-t' }, props.title),
      props.meta ? h('span', { className: 'cc-meta' }, props.meta) : null,
      h('div', { className: 'cc-gap' }),
      h('button', { className: btnClass('quiet', null, true), type: 'button', 'aria-label': 'Close', title: 'Close', onClick: props.onClose }, '×'));
  }

  function Changes(props) {
    var h = CC.h;
    var events = CC.useEngine('/api/events?project=' + encodeURIComponent(props.project) + '&since=0&auto=1', ['state', 'run']);
    var list = latestPerTask(events.data && (events.data.events || events.data));
    return h('div', null,
      h('div', { className: 'cc-scrim', onClick: props.onClose }),
      h('section', { className: 'cc-sheet', role: 'dialog', 'aria-label': 'Changes' },
        h(SheetHead, { title: 'Changes', meta: list.length ? String(list.length) : null, onClose: props.onClose }),
        h('div', { className: 'cc-sheet-b' }, list.length ? h('ul', { className: 'cc-log' }, list.map(function (e) {
          return h('li', { key: e.seq }, h('time', null, hm(e.at)), h('span', { className: 'cc-hist-t', title: e.summary }, e.summary));
        })) : h('div', { className: 'cc-meta' }, 'No changes yet'))));
  }

  // Versions: one row per family (the current version). The engine already hides archived rows;
  // this keeps the highest version per family if a response ever carries several.
  function familyRows(list) {
    var best = {};
    (list || []).forEach(function (p) { if (p && p.family && !p.archived && (!best[p.family] || (p.version || 0) > (best[p.family].version || 0))) best[p.family] = p; });
    return (list || []).filter(function (p) { return p && (!p.family || (!p.archived && best[p.family] === p)); });
  }
  function VersionChip(props) {
    var h = CC.h;
    if (props.version == null) return null;
    var n = props.versions;
    return h('span', { className: 'cc-vchip', title: n > 1 ? 'Version ' + props.version + ' of ' + n : 'Version ' + props.version }, 'v' + props.version);
  }
  function countText(c) {
    c = c || {};
    var parts = [(c.done || 0) + ' done', (c.open || 0) + ' open', (c.skipped || 0) + ' skipped'];
    if (c.carried) parts.push(c.carried + ' carried');
    return parts.join(' · ');
  }
  // History: earlier versions oldest first (open one read-only) and the Skipped ideas list.
  function VersionHistory(props) {
    var h = CC.h;
    var q = props.family ? 'family=' + encodeURIComponent(props.family) : 'project=' + encodeURIComponent(props.project || '');
    var hist = CC.useEngine('/api/history?' + q, ['state']);
    var d = hist.data;
    var versions = ((d && d.versions) || []).filter(function (v) { return v.project !== d.current; });
    var skipped = (d && d.skipped) || [];
    return h('div', null,
      h('div', { className: 'cc-scrim', onClick: props.onClose }),
      h('section', { className: 'cc-sheet', role: 'dialog', 'aria-label': 'History' },
        h(SheetHead, { title: 'History', meta: d && d.family ? d.family.title : null, onClose: props.onClose }),
        h('div', { className: 'cc-sheet-b' },
          !d ? h('div', { className: 'cc-meta' }, hist.error ? 'Could not load history' : 'Loading…') : null,
          d ? h('div', null,
            h('div', { className: 'cc-cap' }, 'Earlier versions'),
            versions.length ? h('ul', { className: 'cc-vh-list' }, versions.map(function (v) {
              return h('li', { key: v.project }, h('button', { className: 'cc-vh-row', type: 'button', 'data-project': v.project,
                onClick: function () { props.onOpen(v.project, v.version); } },
              h(VersionChip, { version: v.version }),
              h('span', { className: 'cc-vh-t' }, v.title || v.project),
              h('span', { className: 'cc-meta' }, countText(v.counts))));
            })) : h('div', { className: 'cc-meta' }, 'No earlier versions')) : null,
          d ? h('div', null,
            h('div', { className: 'cc-cap' }, 'Skipped ideas'),
            skipped.length ? h('div', { className: 'cc-vh-list' }, skipped.map(function (k) {
              return h('details', { key: k.project + '/' + k.id, className: 'cc-vh-sk' },
                h('summary', null, (CC.statusGlyph ? CC.statusGlyph('skipped') + ' ' : '') + (k.title || k.id) + ' · v' + k.version),
                h('div', { className: 'cc-meta' }, k.reason || 'No reason recorded'),
                h('div', { className: 'cc-vh-goal' }, k.goal || ''));
            })) : h('div', { className: 'cc-meta' }, 'Nothing skipped')) : null)));
  }

  // The header "…" menu: History (earlier versions, skipped ideas) when the project has a family
  // with more than one version, and Archive project, which arms on the first click and archives on
  // the second (POST /api/project/archive). A 404 means the engine has not restarted onto that route.
  function ProjectMenu(props) {
    var h = CC.h, React = CC.React;
    var ar = React.useState(null), armed = ar[0], setArmed = ar[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var ref = React.useRef(null);
    useDismiss(ref);
    var canArchive = props.canArchive !== false && !!props.project;
    var isArmed = armed === props.project;
    function archive() {
      if (busy || !props.project) return undefined;
      if (!isArmed) { setArmed(props.project); return undefined; }
      setArmed(null);
      setBusy(true);
      var id = props.project;
      return CC.api.post('/api/project/archive', { project: id }).then(function () {
        setBusy(false);
        props.toast('Project archived');
        if (props.onArchived) props.onArchived(id);
      }, function (e) {
        setBusy(false);
        props.toast(e && e.status === 404 ? 'Archive arrives after the engine restarts'
          : 'Could not archive: ' + ((e && e.data && e.data.detail) || (e && e.message) || 'unknown error'));
      });
    }
    if (!canArchive && !props.onHistory) return null;
    // Archive arms on the first choice and archives on the second; the kit menu closes between
    // them, so the armed item reads Confirm archive when the menu opens again.
    return moreMenu({ label: 'Project actions', className: canArchive ? 'cc-proj-more' : null, ref: ref, items: [
      props.onHistory ? { label: 'History', onClick: props.onHistory } : null,
      props.onHistory && canArchive ? { sep: true } : null,
      canArchive ? { label: busy ? '…' : isArmed ? 'Confirm archive' : 'Archive project', danger: isArmed, disabled: busy || !props.project,
        onClick: archive, onBlur: function () { if (isArmed && !(CC.ui && CC.ui.Menu)) setArmed(null); } } : null] });
  }

  // The status legend: one quiet line in the corner of the canvas.
  var LEGEND = ['done', 'ready', 'running', 'error', 'needs_you', 'not_started'];
  function Legend() {
    var h = CC.h;
    if (!CC.StatusDot) return null;
    return h('div', { className: 'cc-legend', 'aria-label': 'Status key' }, LEGEND.map(function (s) {
      return h('span', { key: s },
        h('svg', { viewBox: '-9 -9 18 18', 'aria-hidden': true }, h(CC.StatusDot, { status: s })),
        s === 'error' ? 'Failing' : STATUS_WORD[s]);
    }));
  }

  function goPanel(id, fallback, toast) {
    try {
      if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') { CC.ctx.layout.selectPanel(id); return; }
    } catch (e) { /* fall through to the hint */ }
    toast(fallback);
  }

  // Pure helpers, exposed for plugin tests.
  CC.createHelpers = { POOLS: POOLS, DEFAULT_RUN_SETTINGS: DEFAULT_RUN_SETTINGS, SEND_TO: SEND_TO, STYLE: STYLE,
    checkSummary: checkSummary, latestPerTask: latestPerTask, viewProps: viewProps, codexCommand: codexCommand,
    recommendedRoute: recommendedRoute, routeEnabled: routeEnabled, oneLine: oneLine, displayStatus: displayStatus, Inspector: Inspector,
    ProjectMenu: ProjectMenu, VersionHistory: VersionHistory, familyRows: familyRows, dispatchPlan: dispatchPlan, activeRun: activeRun,
    modelLabel: modelLabel, headerMeta: headerMeta };

  // "12 done · 3 running · 1 failing": the counts that matter at a glance (board display statuses).
  function headerMeta(counts) {
    var c = counts || {};
    return [['done', 'done'], ['running', 'running'], ['error', 'failing']]
      .filter(function (k) { return c[k[0]]; }).map(function (k) { return c[k[0]] + ' ' + k[1]; }).join(' · ');
  }

  CC.CreatePage = function CreatePage() {
    var h = CC.h, React = CC.React, ui = CC.ui;
    ensurePageStyle();
    var projects = CC.useEngine('/api/projects', ['state']);
    // Plan's "Open in Execute" leaves the accepted project here; read it once.
    var pj = React.useState(function () {
      var id = CC.pendingProject || null;
      try { id = id || localStorage.getItem('cc.create.project'); localStorage.removeItem('cc.create.project'); } catch (e) { /* storage blocked */ }
      CC.pendingProject = null;
      return id;
    }), project = pj[0], setProject = pj[1];
    var vw = React.useState('flow'), view = vw[0], setView = vw[1];
    var fl = React.useState('all'), filter = fl[0], setFilter = fl[1];
    var sl = React.useState(null), selected = sl[0], setSelected = sl[1];
    var pn = React.useState(null), panel = pn[0], setPanel = pn[1];
    var tt = React.useState(null), toastText = tt[0], setToast = tt[1];
    var list = familyRows((projects.data && (projects.data.projects || projects.data)) || []);
    var current = project || (list[0] && list[0].id);
    var board = CC.useEngine(current ? '/api/board?project=' + encodeURIComponent(current) : null, ['state', 'run']);
    var questions = CC.useEngine('/api/questions?open=1', ['question', 'state']);
    var open = ((questions.data && (questions.data.questions || questions.data)) || []);

    React.useEffect(function () {
      if (!toastText) return undefined;
      var t = setTimeout(function () { setToast(null); }, 2600);
      return function () { clearTimeout(t); };
    }, [toastText]);

    function page(header, banner, body) {
      return withProps(ui.Page({ className: 'cc-create', raw: true, header: header, banner: banner, children: body }), { 'data-cc-page': 'create' });
    }
    if (projects.error && !projects.data) {
      return page(ui.PageHeader({ title: 'Execute', pageId: 'cc-create' }), null,
        h('div', { className: 'cc-pb' }, ui.Empty({ title: 'Waypoint Core is not running', body: 'Start it and this page connects on its own.' })));
    }
    var data = CC.unpackBoard(board.data) || { nodes: [], edges: [] };
    var nodes = data.nodes || [];
    // A board whose project is not in the picker (or is flagged archived) is an earlier version: read-only.
    var entry = list.find(function (p) { return p.id === current; }) || null;
    var bp = data.project || {};
    var archived = !!current && (bp.archived === true || bp.archived === 1 || (!entry && !!bp.id && bp.id === current && bp.version != null));
    var family = (entry && entry.family) || bp.family || null;
    var version = entry ? entry.version : bp.version;
    var versions = entry ? entry.versions : 0;
    var showHistory = !!current && !!family && (archived || versions > 1);
    var name = ((entry && entry.title) || bp.title || current || 'Execute');
    var View = view === 'star' ? CC.StarView : view === 'waves' ? CC.WaveView || CC.WavesView : CC.FlowView;
    var n = function (f) { return nodes.filter(function (x) { return CC.matchesFilter ? CC.matchesFilter(x, f) : true; }).length; };
    // Runs start from the Autonomous tab (usage-aware sprints); the Run button opens it.
    function openAutonomous() {
      CC.pendingAutonomousProject = current;
      try { localStorage.setItem('cc.autonomous.project', current); } catch (e) { /* storage blocked */ }
      goPanel(AUTONOMOUS_PAGE, 'Open Autonomous from the sidebar', setToast);
    }
    function pick(id) { setProject(id); setSelected(null); }

    var picker = list.length > 1
      ? h('span', { className: 'cc-proj' },
        h('span', { className: 'cc-proj-size', 'aria-hidden': 'true' }, name),
        h('select', { className: 'cc-project', value: current || '', 'aria-label': 'Project', title: name, onChange: function (e) { pick(e.target.value); } },
          (entry || !current ? [] : [h('option', { key: current, value: current }, (bp.title || current) + ' (archived)')])
            .concat(list.map(function (p) { return h('option', { key: p.id, value: p.id }, p.title); }))),
        h('span', { className: 'cc-proj-chev' }, icon(ICON.down, 14)))
      : h('span', { className: 'cc-proj-one', title: name }, name);
    var header = withProps(ui.PageHeader({
      pageId: 'cc-create',
      title: [h('span', { key: 'p', className: 'cc-proj-wrap' }, picker), h(VersionChip, { key: 'v', version: version, versions: versions })],
      meta: headerMeta(data.counts) || null,
      mid: [
        h(ui.Segmented, { key: 'v', label: 'View', value: view, onChange: setView,
          options: [{ value: 'flow', label: 'Flow' }, { value: 'star', label: 'Stars' }, { value: 'waves', label: 'Waves' }] }),
        h(ui.Segmented, { key: 'f', label: 'Show', value: filter, onChange: setFilter, options: [
          { value: 'all', label: 'All', count: nodes.length || null },
          { value: 'active', label: 'Active', count: nodes.length ? n('active') : null },
          { value: 'completed', label: 'Done', count: nodes.length ? n('completed') : null }] })],
      actions: [
        open.length ? h(ui.Button, { key: 'q', kind: 'quiet', className: 'cc-attn', onClick: function () { setPanel('needs'); },
          title: open.length + ' need' + (open.length === 1 ? 's' : '') + ' you' }, h('span', { className: 'cc-bd cc-bd-action' }, String(open.length)), h('span', { className: 'cc-attn-l' }, ' need' + (open.length === 1 ? 's' : '') + ' you')) : null,
        h(ui.Button, { key: 'c', onClick: function () { setPanel('changes'); }, disabled: !current }, 'Changes'),
        h(ui.Button, { key: 'r', kind: 'primary', disabled: !current || archived, title: 'Open Autonomous to plan and start sprints',
          onClick: openAutonomous }, 'Run'),
        current ? h(ProjectMenu, { key: 'm:' + current, project: archived ? null : current, canArchive: !archived, toast: setToast,
          onHistory: showHistory ? function () { setPanel('history'); } : null,
          onArchived: function (id) {
            var next = list.find(function (p) { return p.id !== id; });
            pick(next ? next.id : null);
          } }) : null]
    }), { 'aria-label': 'Execute: ' + name });
    var banner = archived ? ui.Banner({ children: 'Archived v' + (version == null ? '?' : version) + ', read-only',
      action: ui.Button({ size: 'sm', kind: 'quiet', onClick: function () { pick(null); }, children: 'Back to current' }) }) : null;

    var graph;
    if (!current) {
      graph = ui.Empty({ title: 'No projects yet', body: 'Plans you accept appear here.',
        action: ui.Button({ onClick: function () { goPanel('cc-plan', 'Open Plan from the sidebar', setToast); }, children: 'Open Plan' }) });
    } else if (board.data && !nodes.length) {
      graph = ui.Empty({ title: 'No tasks in this project', body: 'Draft a plan to add tasks.' });
    } else if (!View) {
      graph = h('div', { className: 'cc-meta', style: { padding: 16 } }, 'View unavailable');
    } else {
      graph = h(View, Object.assign({ board: data, filter: filter, selected: selected, onSelect: setSelected }, viewProps(view)));
    }
    var body = h('div', { className: 'cc-split' },
      h('div', { className: 'cc-split-main cc-canvas' },
        graph,
        current && nodes.length ? h(Legend) : null,
        panel === 'needs' ? h(NeedsYou, { questions: open, toast: setToast, onClose: function () { setPanel(null); } }) : null,
        panel === 'history' ? h(VersionHistory, { family: family, project: current, onClose: function () { setPanel(null); },
          onOpen: function (id) { pick(id); setPanel(null); } }) : null,
        panel === 'changes' ? h(Changes, { project: current, onClose: function () { setPanel(null); } }) : null,
        toastText ? h('div', { className: 'cc-toast', role: 'status' }, toastText) : null),
      selected && !panel ? h(Inspector, { project: current, id: selected, revision: data.revision, cwd: data.project && data.project.cwd, readOnly: archived,
        toast: setToast, onClose: function () { setSelected(null); },
        blockedBy: CC.blockedByFailedCheck ? CC.blockedByFailedCheck(data)[selected] : null }) : null);
    return page(header, banner, body);
  };
})(CC);
