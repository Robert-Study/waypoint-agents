// chat_panel.js [worker-d] - CC.ChatPanel: one agent's direct chat (stream, resume, model + effort), shared by the
// Claude and Codex tabs (page_claude.js, page_codex.js). Left: that agent's chats and the subagent chats that
// orchestration models dispatched to it. Right: calm conversation + composer (Send, Ctrl+Enter).
// Engine: engine/cc_engine/agents.py (/api/agents*) and subagent_chats.py (/api/subagent_chats*).
(function (CC) {
  'use strict';
  const h = CC.h;

  const STYLE = [
    '.cc-root.cc-ag{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);color:var(--cc-text);}',
    '.cc-root .cc-ag-body{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-root .cc-ag-bar{flex:none;}',
    '.cc-root .cc-ag-side{width:240px;flex:none;display:flex;flex-direction:column;min-height:0;overflow:auto;padding-bottom:16px;border-right:1px solid var(--cc-line);background:var(--cc-surface);}',
    '.cc-root .cc-ag-h{display:flex;align-items:center;justify-content:space-between;gap:8px;height:32px;min-height:32px;margin:8px 0 0;padding:0 8px 0 16px;font-size:12px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-ag-subs{margin-top:8px;padding-top:4px;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-ag-emptywrap{width:100%;max-width:768px;margin:auto auto 0;padding:0 24px;}',
    '.cc-root .cc-ag-emptywrap .cc-em{padding:16px 8px 8px;}',
    '.cc-root .cc-ag-list{list-style:none;margin:0;padding:0 8px;display:flex;flex-direction:column;gap:2px;}',
    '.cc-root .cc-ag-row{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:0 8px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:background 120ms,color 120ms;}',
    '.cc-root .cc-ag-row:hover{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-ag-row.cc-sel{background:var(--cc-selection);color:var(--cc-text);font-weight:500;}',
    '.cc-root .cc-ag-row:focus-visible,.cc-root .cc-ag-send:focus-visible,.cc-root .cc-ag-ghost:focus-visible,.cc-root .cc-ag-chip:focus-visible,.cc-root .cc-ag-mode button:focus-visible{outline:2px solid var(--cc-accent);outline-offset:1px;}',
    '.cc-root .cc-ag-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-root .cc-ag-dot{flex:none;width:6px;height:6px;border-radius:50%;border:1.5px solid var(--cc-neutral);}',
    '.cc-root .cc-ag-dot.cc-on{background:var(--cc-done);border-color:var(--cc-done);}',
    '.cc-root .cc-ag-dot.cc-busy{background:var(--cc-running);border-color:var(--cc-running);animation:cc-pulse 1600ms ease-in-out infinite;}',
    '.cc-root .cc-ag-sessions{flex:none;}',
    '.cc-root .cc-ag-sub{font-size:11px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ag-sub.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-ag-empty{padding:4px 16px 8px;font-size:12px;color:var(--cc-text-3);}',
    '.cc-root .cc-ag-ghost{border:0;background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;font-weight:500;height:28px;padding:0 10px;border-radius:var(--cc-r-control);cursor:pointer;transition:background 120ms,color 120ms;}',
    '.cc-root .cc-ag-ghost:hover{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-ag-ghost:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-ag-h .cc-ag-ghost{height:24px;padding:0 8px;}',
    '.cc-root .cc-ag-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;}',
    // plain header, used only when the kit (ui.js) is missing
    '.cc-root .cc-ag-plain{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;border-bottom:1px solid var(--cc-line);}',
    '.cc-root .cc-ag-plain .cc-ag-title{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ag-scroll{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;}',
    '.cc-root .cc-ag-thread{width:100%;max-width:768px;margin:0 auto;padding:32px 24px 24px;display:flex;flex-direction:column;gap:20px;font-size:14px;line-height:1.6;}',
    '.cc-root .cc-ag-user{align-self:flex-end;max-width:80%;background:var(--cc-selection);color:var(--cc-text);border-radius:var(--cc-r-panel);padding:8px 12px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;}',
    '.cc-root .cc-ag-text{overflow-wrap:anywhere;color:var(--cc-text);}',
    '.cc-root .cc-ag-text p{margin:0 0 12px;white-space:pre-wrap;}',
    '.cc-root .cc-ag-text p:last-child{margin-bottom:0;}',
    '.cc-root .cc-ag-text code{font-family:var(--cc-mono);font-size:12px;background:var(--cc-surface-2);border-radius:4px;padding:1px 5px;}',
    '.cc-root .cc-ag-text pre{margin:0 0 12px;padding:12px 16px;background:var(--cc-surface);border:1px solid var(--cc-line);border-radius:var(--cc-r-panel);overflow:auto;font-family:var(--cc-mono);font-size:12px;line-height:1.55;white-space:pre;}',
    '.cc-root .cc-ag-text pre code{background:transparent;padding:0;}',
    '.cc-root .cc-ag-text .cc-ag-hd{font-weight:600;margin-top:4px;}',
    '.cc-root .cc-ag-tool{font-size:12px;color:var(--cc-text-3);font-family:var(--cc-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ag-err{font-size:12px;color:var(--cc-error);padding:8px 12px;border:1px solid var(--cc-line);border-radius:var(--cc-r-panel);}',
    '.cc-root .cc-ag-wait{font-size:12px;color:var(--cc-text-3);display:flex;align-items:center;gap:8px;}',
    '.cc-root .cc-ag-wait::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--cc-running);animation:cc-pulse 1600ms ease-in-out infinite;}',
    '.cc-root .cc-ag-hello{width:100%;max-width:560px;padding:24px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;color:var(--cc-text-2);}',
    '.cc-root .cc-ag-hello-line{font-size:14px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-ag-comp{flex:none;background:var(--cc-bg);}',
    '.cc-root .cc-ag-comp-in{max-width:768px;margin:0 auto;padding:8px 24px 20px;display:flex;flex-direction:column;gap:8px;}',
    '.cc-root .cc-ag-field{display:flex;flex-direction:column;gap:4px;padding:8px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);transition:border-color 120ms;}',
    '.cc-root .cc-ag-field:focus-within{border-color:var(--cc-accent);}',
    '.cc-root .cc-ag-input{width:100%;min-height:48px;max-height:240px;resize:none;border:0;outline:0;background:transparent;color:var(--cc-text);color-scheme:light dark;font:inherit;font-size:14px;line-height:1.5;padding:4px 8px;}',
    '.cc-root .cc-ag-input::placeholder{color:var(--cc-text-3);}',
    '.cc-root .cc-ag-comp-in{container-type:inline-size;}',
    '.cc-root .cc-ag-tools{display:flex;align-items:center;gap:4px;flex-wrap:nowrap;min-width:0;}',
    '.cc-root .cc-ag-tools > *{flex:none;}',
    '.cc-root .cc-ag-tools > .cc-ag-gap{flex:1 1 auto;min-width:0;}',
    '.cc-root .cc-ag-tools > .cc-ag-folder{flex:0 1 auto;min-width:56px;}',
    '.cc-root .cc-ag-att{display:inline-flex;align-items:center;gap:0;border-radius:var(--cc-r-control);color:var(--cc-text-3);cursor:text;}',
    '.cc-root .cc-ag-att svg{display:none;flex:none;margin:0 6px;}',
    '@container (max-width:600px){.cc-root .cc-ag-att svg{display:block;}.cc-root .cc-ag-tools .cc-ag-chip{padding:0 6px;}.cc-root .cc-ag-mode button{padding:0 8px;}' +
      '.cc-root .cc-ag-att input.cc-ag-attach{width:0;min-width:0;padding:0;}' +
      '.cc-root .cc-ag-att:hover{background:var(--cc-wash);color:var(--cc-text);}' +
      '.cc-root .cc-ag-att:focus-within input.cc-ag-attach{width:140px;padding:0 10px 0 0;}}',
    '.cc-root .cc-ag-chips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:0 4px;}',
    '.cc-root .cc-ag-chip{display:inline-flex;align-items:center;gap:6px;height:28px;max-width:240px;padding:0 10px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background 120ms,color 120ms;}',
    '.cc-root select.cc-ag-chip{appearance:none;cursor:pointer;color-scheme:light dark;field-sizing:content;max-width:180px;}',
    '.cc-root input.cc-ag-attach{field-sizing:content;min-width:84px;max-width:200px;}',
    '.cc-root select.cc-ag-chip:hover,.cc-root button.cc-ag-chip:hover,.cc-root input.cc-ag-chip:focus{background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root select.cc-ag-chip option{background:var(--cc-surface);color:var(--cc-text);}',
    '.cc-root select.cc-ag-chip:disabled{opacity:.5;cursor:default;}',
    '.cc-root .cc-ag-chips .cc-ag-chip{background:var(--cc-surface-2);border-radius:var(--cc-r-control);height:24px;font-size:11px;font-family:var(--cc-mono);cursor:pointer;}',
    '.cc-root .cc-ag-chip.cc-warn{color:var(--cc-error);}',
    '.cc-root .cc-ag-chip.cc-ag-stale{color:var(--cc-text-3);}',
    '.cc-root .cc-ag-choice{display:inline-flex;align-items:center;gap:0;}',
    '.cc-root button.cc-ag-chip{cursor:pointer;}',
    '.cc-root button.cc-ag-chip[aria-expanded=true]{background:var(--cc-surface-2);color:var(--cc-text);}',
    '.cc-root.cc-ag-pop{position:fixed;z-index:1000;min-width:380px;max-width:min(520px,calc(100vw - 24px));max-height:60vh;overflow:auto;padding:4px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);color:var(--cc-text);font-size:12px;}',
    '.cc-ag-pop .cc-fp-grid{display:grid;grid-template-columns:minmax(0,1fr) 60px 56px 52px;align-items:center;column-gap:8px;}',
    '.cc-ag-pop .cc-fp-head{padding:6px 10px 4px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-ag-pop .cc-fp-row{width:100%;min-height:28px;padding:4px 10px;border:0;border-radius:var(--cc-r-control);background:transparent;color:var(--cc-text);font:inherit;text-align:left;cursor:pointer;}',
    '.cc-ag-pop .cc-fp-row:hover,.cc-ag-pop .cc-fp-row.cc-fp-hi{background:var(--cc-wash);}',
    '.cc-ag-pop .cc-fp-row[aria-selected="true"]{box-shadow:inset 2px 0 0 var(--cc-accent);}',
    '.cc-ag-pop .cc-fp-row[aria-disabled="true"]{cursor:default;opacity:.45;}',
    '.cc-ag-pop .cc-fp-num{font-variant-numeric:tabular-nums;color:var(--cc-text-2);text-align:right;white-space:nowrap;}',
    '.cc-ag-pop .cc-fp-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cc-ag-pop .cc-fp-pick{color:var(--cc-accent);font-weight:500;}',
    '.cc-ag-pop .cc-fp-status{padding:6px 10px;font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-ag-sep{color:var(--cc-text-3);font-size:12px;margin:0 -4px;}',
    '.cc-root .cc-ag-hello .cc-ag-go{margin-left:-10px;}',
    '.cc-root .cc-ag-gap{flex:1;}',
    '.cc-root .cc-ag-keys{font-size:11px;color:var(--cc-text-3);}',
    '.cc-root .cc-ag-send{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;background:var(--cc-accent);color:var(--cc-on-status);font:inherit;font-size:12px;font-weight:600;min-width:28px;height:28px;padding:0;border-radius:var(--cc-r-control);cursor:pointer;transition:opacity 120ms;}',
    '.cc-root .cc-ag-send.cc-ag-wide{padding:0 12px;}',
    '.cc-root .cc-ag-send:disabled{opacity:.3;cursor:default;}',
    '.cc-root .cc-ag-send svg{display:block;}',
    '.cc-root .cc-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    '.cc-root .cc-ag-note{font-size:12px;color:var(--cc-text-2);padding:0 8px;}',
    '.cc-root .cc-ag-note.cc-bad{color:var(--cc-error);}',
    '.cc-root .cc-ag-off{opacity:.55;}',
    '.cc-root .cc-ag-code{position:relative;margin:0 0 12px;}',
    '.cc-root .cc-ag-code pre{margin:0;}',
    '.cc-root .cc-ag-copy{position:absolute;top:6px;right:6px;border:1px solid var(--cc-line);background:var(--cc-surface);color:var(--cc-text-2);font:inherit;font-size:11px;height:24px;padding:0 8px;border-radius:var(--cc-r-control);cursor:pointer;opacity:0;transition:opacity 120ms;}',
    '.cc-root .cc-ag-code:hover .cc-ag-copy,.cc-root .cc-ag-copy:focus-visible{opacity:1;}',
    '.cc-root .cc-ag-text ul,.cc-root .cc-ag-text ol{margin:0 0 12px;padding-left:20px;}',
    '.cc-root .cc-ag-text li{margin:0 0 4px;}',
    '.cc-root .cc-ag-steps{font-size:12px;color:var(--cc-text-3);border-left:2px solid var(--cc-line);padding-left:12px;}',
    '.cc-root .cc-ag-steps summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;min-height:24px;transition:color 120ms;}',
    '.cc-root .cc-ag-steps summary:hover{color:var(--cc-text);}',
    '.cc-root .cc-ag-steps summary::-webkit-details-marker{display:none;}',
    '.cc-root .cc-ag-steps .cc-ag-st{font-family:var(--cc-mono);font-size:11px;line-height:1.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-ag-add{color:var(--cc-done);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ag-del{color:var(--cc-error);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ag-mode{display:inline-flex;align-items:center;gap:2px;height:28px;padding:2px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);}',
    '.cc-root .cc-ag-mode button{border:1px solid transparent;background:transparent;color:var(--cc-text-2);font:inherit;font-size:12px;font-weight:500;height:24px;padding:0 10px;border-radius:calc(var(--cc-r-control) - 2px);cursor:pointer;transition:background 120ms,color 120ms;}',
    '.cc-root .cc-ag-mode button:hover{color:var(--cc-text);}',
    '.cc-root .cc-ag-mode button[aria-pressed=true]{background:var(--cc-surface);border-color:var(--cc-line);color:var(--cc-text);}',
    '.cc-root input.cc-ag-attach{width:104px;cursor:text;}',
    '.cc-root input.cc-ag-attach::placeholder{color:var(--cc-text-3);}',
    '.cc-root .cc-ag-plan{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 4px 4px 12px;border:1px solid var(--cc-line);border-radius:var(--cc-r-panel);background:var(--cc-surface);font-size:12px;color:var(--cc-text-2);}',
    '.cc-root .cc-ag-plan .cc-ag-ghost{color:var(--cc-accent);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-ag-dot.cc-busy,.cc-root .cc-ag-wait::before{animation:none;}.cc-root .cc-ag-row,.cc-root .cc-ag-chip,.cc-root .cc-ag-field{transition:none;}}'
  ].join('\n');

  function ensurePageStyle() {
    if (typeof document === 'undefined' || document.getElementById('cc-chat-style')) return;
    const el = document.createElement('style');
    el.id = 'cc-chat-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  // ------------------------------------------------------------ small pure helpers (node-testable)
  function ago(iso, now) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const s = Math.max(0, Math.round(((now || Date.now()) - t) / 1000));
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }

  // "Claude 5 hours" -> "5 h", "Codex week (all models)" -> "week".
  function windowShort(label) {
    const l = String(label || '').toLowerCase();
    const hrs = /(\d+)\s*(?:h\b|hours?|hrs?)/.exec(l);
    if (hrs) return hrs[1] + ' h';
    const w = /\b(week|day|month)\b/.exec(l);
    if (w) return w[1];
    return String(label || '').replace(/\s*\(.*\)\s*$/, '');
  }
  function clock(iso) {
    const t = new Date(iso || '');
    if (isNaN(t.getTime())) return '';
    const pad = function (x) { return (x < 10 ? '0' : '') + x; };
    return pad(t.getHours()) + ':' + pad(t.getMinutes());
  }

  // Composer chip: "73% week"; empty without a meter. Staleness is shown by tone and tooltip, never as text.
  function usageChipText(a) {
    if (!a || a.usage_percent == null) return '';
    const w = windowShort(a.usage_pool);
    return Math.round(a.usage_percent) + '%' + (w ? ' ' + w : '');
  }
  // Longer form for the confirm note: "Codex week 13% left".
  function usageLong(a) {
    if (!a || a.usage_percent == null) return 'Usage unknown';
    return (a.usage_pool ? String(a.usage_pool).replace(/\s*\(.*\)\s*$/, '') + ' ' : '') + Math.round(a.usage_percent) + '% left';
  }
  function usageTip(a) {
    const rows = (a && a.usage) || [];
    const lines = rows.map(function (u) {
      return (u.label || u.pool) + ': ' + (u.remaining_percent == null ? 'unknown' : Math.round(u.remaining_percent) + '% left');
    });
    if (a && a.usage_status === 'STALE') {
      const pick = rows.filter(function (u) { return u.status === 'STALE' && u.observed_at; })[0];
      lines.push(pick && clock(pick.observed_at) ? 'Last read ' + clock(pick.observed_at) : 'Last read a while ago');
    }
    return lines.join('\n');
  }

  // Option text: "Claude Opus 5.5" -> "Opus 5.5" inside the Claude tab; efforts capitalised.
  function modelText(agent, m) {
    const label = String(m.label || m.model || '');
    const fam = agent && agent.name ? String(agent.name).split(' ')[0] + ' ' : '';
    return fam && label.indexOf(fam) === 0 && label.length > fam.length ? label.slice(fam.length) : label;
  }
  function effortText(x) {
    const s = String(x || '');
    return s === 'xhigh' ? 'Extra high' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Split text into prose and fenced code blocks: [{code:bool, lang, text}].
  function splitFences(text) {
    const out = [];
    const re = /```([\w+-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ code: false, text: text.slice(last, m.index) });
      out.push({ code: true, lang: m[1] || '', text: m[2].replace(/\n$/, '') });
      last = re.lastIndex;
      if (m[0].length === 0) break;
    }
    if (last < text.length) out.push({ code: false, text: text.slice(last) });
    return out;
  }

  // Inline `code` and **bold**; everything else stays plain text (no HTML injection).
  function inline(text, keyBase) {
    const parts = [];
    const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
    let last = 0, m, i = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const tok = m[0];
      parts.push(tok[0] === '`' ? h('code', { key: keyBase + 'c' + (i++) }, tok.slice(1, -1))
        : h('strong', { key: keyBase + 'b' + (i++) }, tok.slice(2, -2)));
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  function copyText(t) {
    try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(t); } catch (e) { /* no clipboard */ }
  }

  function CodeBlock(props) {
    return h('div', { className: 'cc-ag-code' },
      h('button', { type: 'button', className: 'cc-ag-copy', 'aria-label': 'Copy code', onClick: function () { copyText(props.text); } }, 'Copy'),
      h('pre', { 'data-lang': props.lang || undefined }, h('code', null, props.text)));
  }

  const LI_RE = /^\s*(?:[-*]|\d+[.)])\s+/;

  function Markdownish(props) {
    const blocks = splitFences(String(props.text || ''));
    const kids = [];
    blocks.forEach(function (b, bi) {
      if (b.code) { kids.push(h(CodeBlock, { key: 'p' + bi, lang: b.lang, text: b.text })); return; }
      b.text.split(/\n{2,}/).forEach(function (para, pi) {
        const t = para.replace(/^\n+|\n+$/g, '');
        if (!t) return;
        const key = 'g' + bi + '-' + pi;
        const lines = t.split('\n');
        if (lines.every(function (l) { return LI_RE.test(l); })) {
          const ordered = /^\s*\d/.test(lines[0]);
          kids.push(h(ordered ? 'ol' : 'ul', { key: key }, lines.map(function (l, li) {
            return h('li', { key: li }, inline(l.replace(LI_RE, ''), key + '-' + li + '-'));
          })));
          return;
        }
        const hd = /^#{1,6}\s+(.*)$/.exec(t);
        kids.push(h('p', { key: key, className: hd ? 'cc-ag-hd' : undefined }, inline(hd ? hd[1] : t, key + '-')));
      });
    });
    return h('div', { className: 'cc-ag-text' }, kids);
  }

  // ---- tool steps: consecutive tool items fold into one row
  const EDIT_RE = /^(Edited|Edit|MultiEdit|Write|Wrote|Created)\s+(.+?)(?:\s+\+(\d+)\s+-(\d+))?$/;
  function groupItems(items) {
    const out = [];
    (items || []).forEach(function (it) {
      const last = out[out.length - 1];
      if (it.kind === 'tool') {
        if (last && last.kind === 'steps') last.steps.push(it); else out.push({ kind: 'steps', steps: [it] });
      } else out.push(it);
    });
    return out;
  }
  function stepSummary(steps) {
    const files = {}, order = [];
    let added = 0, removed = 0;
    function add(path, a, r) {
      if (!files[path]) { files[path] = { path: path, added: 0, removed: 0 }; order.push(path); }
      files[path].added += a; files[path].removed += r; added += a; removed += r;
    }
    (steps || []).forEach(function (st) {
      if (st.files && st.files.length) { st.files.forEach(function (f) { add(f.path, f.added || 0, f.removed || 0); }); return; }
      const m = EDIT_RE.exec(String(st.text || ''));
      if (!m) return;
      const parts = m[2].split(/,\s+/);
      parts.forEach(function (p) { add(p, parts.length === 1 ? Number(m[3] || 0) : 0, parts.length === 1 ? Number(m[4] || 0) : 0); });
    });
    return { count: (steps || []).length, added: added, removed: removed, files: order.map(function (p) { return files[p]; }) };
  }
  function StepsRow(props) {
    const sum = stepSummary(props.steps);
    const head = [sum.count + (sum.count === 1 ? ' step' : ' steps')];
    if (sum.files.length) head.push(sum.files.length + (sum.files.length === 1 ? ' file' : ' files'));
    const counts = sum.added || sum.removed;
    return h('details', { className: 'cc-ag-steps', open: props.open ? true : undefined },
      h('summary', null, head.join(' · '),
        counts ? h('span', { className: 'cc-ag-add' }, '+' + sum.added) : null,
        counts ? h('span', { className: 'cc-ag-del' }, '-' + sum.removed) : null),
      (props.steps || []).map(function (st, i) { return h('div', { key: i, className: 'cc-ag-st', title: st.text }, st.text); }));
  }

  // ---- modes (Plan / Autonomous), attachments
  const MODE_MARK = '[Waypoint mode]';
  function modeMessage(mode, message) {
    if (mode === 'plan') {
      return MODE_MARK + ' Plan: do not change anything yet. Reply with a short numbered checklist plan and wait for approval.\n---\n' + message;
    }
    if (mode === 'auto') {
      return MODE_MARK + ' Autonomous: work straight through and post brief progress as each step finishes.\n---\n' + message;
    }
    return message;
  }
  function withAttachments(message, paths) {
    if (!paths || !paths.length) return message;
    return message + '\n\nAttached files:\n' + paths.map(function (p) { return '- ' + p; }).join('\n');
  }
  function displayUser(text) {
    const t = String(text || '');
    if (t.indexOf(MODE_MARK) !== 0) return t;
    const i = t.indexOf('\n---\n');
    return i < 0 ? t : t.slice(i + 5);
  }

  // Stored rows -> render items. Live turn items are appended after.
  function rowsToItems(rows) {
    return (rows || []).map(function (r) {
      const kind = r.role === 'assistant' ? 'text' : r.role;
      return { kind: kind, text: kind === 'user' ? displayUser(r.text) : (r.text || ''), turn: r.turn_id };
    });
  }

  function applyEvent(live, ev) {
    if (!live || ev.turn_id !== live.turn_id) return live;
    const items = live.items.slice();
    if (ev.delta) {
      const lastItem = items[items.length - 1];
      if (lastItem && lastItem.kind === 'text') items[items.length - 1] = { kind: 'text', text: lastItem.text + ev.delta };
      else items.push({ kind: 'text', text: ev.delta });
    }
    if (ev.tool) items.push({ kind: 'tool', text: ev.tool });
    const next = Object.assign({}, live, { items: items, sse: true });
    if (ev.done) next.state = ev.error ? 'error' : (ev.stopped ? 'stopped' : 'done');
    if (ev.error) next.error = ev.error;
    return next;
  }

  // ---- model and effort ("Pick for me" asks GET /api/pick?kind=chat; a missing picker means the CLI default)
  const PICK = '__pick__';

  function resolveChoice(agent, choice, get) {
    const c = choice || {};
    if (c.model !== PICK) {
      const out = {};
      if (c.model) out.model = c.model;
      if (c.effort) out.effort = c.effort;
      return Promise.resolve(out);
    }
    let call;
    try { call = get('/api/pick?kind=chat'); } catch (e) { call = Promise.reject(e); }
    return Promise.resolve(call).then(function (pick) {
      const out = {};
      if (!pick) return out;
      const hit = ((agent && agent.models) || []).find(function (m) { return m.id === pick.model || m.model === pick.model; });
      if (hit) out.model = hit.model;
      let effort = pick.effort;
      if (effort === 'max' && agent && agent.id === 'codex') effort = 'xhigh';
      if (effort && ((agent && agent.efforts) || []).indexOf(effort) >= 0) out.effort = effort;
      return out;
    }, function () { return {}; });
  }

  function replyBody(chat, text, choice) {
    const body = { id: chat.id, message: String(text || '').trim() };
    if (choice && choice.model) body.model = choice.model;
    if (choice && choice.effort) body.effort = choice.effort;
    return body;
  }

  function subagentItems(chat) {
    const items = [];
    if (chat.prompt) items.push({ kind: 'user', text: chat.prompt });
    if (chat.output) items.push({ kind: 'text', text: chat.output });
    return items;
  }
  function subagentWait(chat) { return chat.status === 'running' && !chat.output; }

  // Smoke-test chats (scripts' "Reply with exactly: ..." probes, or titles tagged "[smoke]") stay out of the list.
  const SMOKE_RE = /^\s*(?:\[smoke\]|reply with exactly\b)/i;
  function isSmoke(s) { return !!(s && SMOKE_RE.test(String(s.title || ''))); }

  function fmtCtx(n) {
    if (CC.modelBadges && typeof CC.modelBadges.fmtCtx === 'function') return CC.modelBadges.fmtCtx(n);
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    return Math.round(n / 1000) + 'K';
  }
  // The agent's models as flat-picker rows (name, Elo, context, usage): strongest first, nothing selected
  // until you pick. Usage is the agent's own pool, the same number the composer chip shows.
  function modelRows(agent, model) {
    const a = agent || {};
    const usage = a.usage_percent == null ? 'n/a' : Math.round(a.usage_percent) + '%';
    const rows = (a.models || []).map(function (m, i) {
      const eloNum = typeof m.elo === 'number' && isFinite(m.elo) ? Math.round(m.elo) : null;
      let off = false;
      if (typeof CC.isEnabled === 'function') { try { off = CC.isEnabled(m.id || m.model) === false; } catch (e) { off = false; } }
      return { key: m.model, provider: a.id, model: m.model, name: modelText(a, m), eloNum: eloNum, i: i,
        elo: eloNum !== null ? '~' + eloNum : 'n/a', ctx: fmtCtx(m.context_window) || 'n/a', usage: usage,
        selected: !!model && model === m.model, disabled: off, note: off ? 'Switched off in Waypoint' : (m.label || m.id || null) };
    });
    rows.sort(function (x, y) {
      if (x.disabled !== y.disabled) return x.disabled ? 1 : -1;
      const ex = x.eloNum === null ? -1 : x.eloNum, ey = y.eloNum === null ? -1 : y.eloNum;
      return ey - ex || x.i - y.i;
    });
    return rows;
  }

  // The flat table from flat_picker.js (CC.FlatModelTable), so the Claude/Codex chats pick models the same way
  // as dsh chat. Effort is not in here: it stays its own quiet chip next to the Model chip.
  function ModelMenu(props) {
    const rows = modelRows(props.agent, props.model === PICK ? '' : props.model);
    const pos = props.pos;
    return h('div', {
      className: 'cc-root cc-ag-pop', 'data-cc-model-menu': '', onKeyDown: props.onKey, ref: props.menuRef,
      style: pos ? { bottom: pos.bottom, left: pos.left } : undefined
    }, h(CC.FlatModelTable, {
      rows: rows, highlight: typeof props.highlight === 'number' ? props.highlight : -1, empty: 'No models available',
      onPick: function (r) { props.onModel(r.model); }, onPickForMe: function () { props.onModel(PICK); }
    }));
  }

  function ModelChip(props) {
    const React = CC.React;
    const a = props.agent;
    const sOpen = React.useState(false), open = sOpen[0], setOpen = sOpen[1];
    const sPos = React.useState(null), pos = sPos[0], setPos = sPos[1];
    const sHi = React.useState(-1), hi = sHi[0], setHi = sHi[1];
    const trigRef = React.useRef(null), menuRef = React.useRef(null);
    const rows = modelRows(a, props.model === PICK ? '' : props.model);
    React.useEffect(function () {
      if (!open || typeof document === 'undefined') return undefined;
      const away = function (ev) {
        if (trigRef.current && trigRef.current.contains(ev.target)) return;
        if (menuRef.current && menuRef.current.contains(ev.target)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', away);
      return function () { document.removeEventListener('mousedown', away); };
    }, [open]);
    function close() { setOpen(false); try { if (trigRef.current) trigRef.current.focus(); } catch (e) { /* gone */ } }
    function pick(v) { props.onModel(v); close(); }
    function toggle() {
      if (open) { close(); return; }
      let p = { bottom: 80, left: 16 };
      try {
        const r = trigRef.current.getBoundingClientRect();
        const vh = window.innerHeight || 800, vw = window.innerWidth || 1200;
        p = { bottom: Math.max(8, vh - r.top + 6), left: Math.max(8, Math.min(r.left, vw - 532)) };
      } catch (e) { /* default spot */ }
      setPos(p);
      setHi(Math.max(0, rows.findIndex(function (r) { return r.selected; }) + 1));
      setOpen(true);
    }
    function onKey(e) {
      if (!open) return;
      const n = rows.length + 1;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const d = e.key === 'ArrowDown' ? 1 : -1;
        setHi(function (i) { return ((i < 0 ? 0 : i) + d + n) % n; });
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (hi === 0) pick(PICK);
        else if (rows[hi - 1] && !rows[hi - 1].disabled) pick(rows[hi - 1].model);
      }
    }
    const cur = (a.models || []).find(function (m) { return m.model === props.model; });
    const label = props.model === PICK ? 'Pick for me' : (cur ? modelText(a, cur) : 'Model');
    return h('span', { className: 'cc-ag-mwrap' },
      h('button', {
        type: 'button', ref: trigRef, className: 'cc-ag-chip', 'aria-label': 'Model', 'aria-haspopup': 'listbox',
        'aria-expanded': open, title: cur ? (cur.label || cur.model) : undefined, onClick: toggle, onKeyDown: onKey
      }, label),
      open ? h(ModelMenu, { agent: a, model: props.model, pos: pos, highlight: hi, onKey: onKey, menuRef: menuRef, onModel: pick }) : null);
  }

  // ------------------------------------------------------------ components
  function ChoiceSelects(props) {
    const a = props.agent;
    if (!a) return null;
    const models = a.models || [], efforts = a.efforts || [];
    const picking = props.model === PICK;
    const kids = [];
    if (models.length && typeof CC.FlatModelTable === 'function') {
      kids.push(h(ModelChip, { key: 'm', agent: a, model: props.model, onModel: props.onModel }));
    } else if (models.length) { // flat_picker.js missing: the plain select still works
      kids.push(h('select', {
        key: 'm', className: 'cc-ag-chip', 'aria-label': 'Model', value: props.model || '',
        onChange: function (e) { props.onModel(e.target.value); }
      }, [h('option', { key: '', value: '' }, 'Model'), h('option', { key: PICK, value: PICK }, 'Pick for me')]
        .concat(models.map(function (m) { return h('option', { key: m.model, value: m.model, title: m.label || m.id }, modelText(a, m)); }))));
    }
    // "Opus 5.5 · Medium" once both are chosen; empty pickers read "Model" and "Effort".
    if (models.length && efforts.length && props.model && props.effort && !picking) {
      kids.push(h('span', { key: 'dot', className: 'cc-ag-sep', 'aria-hidden': 'true' }, '·'));
    }
    if (efforts.length) {
      kids.push(h('select', {
        key: 'e', className: 'cc-ag-chip', 'aria-label': 'Effort', value: picking ? '' : (props.effort || ''), disabled: picking,
        onChange: function (e) { props.onEffort(e.target.value); }
      }, [h('option', { key: '', value: '' }, picking ? 'Auto' : 'Effort')]
        .concat(efforts.map(function (x) { return h('option', { key: x, value: x }, effortText(x)); }))));
    }
    return kids.length ? h('span', { className: 'cc-ag-choice' + (props.model || props.effort ? ' cc-ag-set' : '') }, kids) : null;
  }

  function SessionRow(props) {
    const s = props.session;
    return h('li', null, h('button', {
      type: 'button', className: 'cc-ag-row' + (props.selected ? ' cc-sel' : ''), title: s.cwd || '',
      onClick: props.onClick
    }, h('span', { className: 'cc-ag-name' }, s.title || 'Chat'),
    s.active_turn ? h('span', { className: 'cc-ag-dot cc-busy', 'aria-label': 'answering' }) :
      h('span', { className: 'cc-ag-sub' }, ago(s.last_at))));
  }

  function SubagentRow(props) {
    const c = props.chat;
    const tip = [c.agent_name, c.model, c.status].filter(Boolean).join(' · ');
    return h('li', null, h('button', {
      type: 'button', className: 'cc-ag-row' + (props.selected ? ' cc-sel' : ''), title: tip, onClick: props.onClick
    }, h('span', { className: 'cc-ag-name' }, c.title || 'Subagent'),
    c.status === 'running' ? h('span', { className: 'cc-ag-dot cc-busy', 'aria-label': 'running' })
      : c.status === 'error' ? h('span', { className: 'cc-ag-sub cc-bad' }, 'failed')
        : h('span', { className: 'cc-ag-sub' }, ago(c.started))));
  }

  function SubagentList(props) {
    const chats = props.chats || [];
    return h('div', { className: 'cc-ag-subs' },
      h('div', { className: 'cc-sec-h cc-ag-h' }, h('div', { className: 'cc-sec-t' }, 'Subagents')),
      chats.length ? h('ul', { className: 'cc-ag-list' }, chats.map(function (c) {
        return h(SubagentRow, { key: c.id, chat: c, selected: c.id === props.selected, onClick: function () { props.onOpen(c); } });
      })) : h('div', { className: 'cc-ag-empty' }, 'No subagent chats yet.'));
  }

  function Item(props) {
    const it = props.item;
    if (it.kind === 'user') return h('div', { className: 'cc-ag-user' }, it.text);
    if (it.kind === 'tool') return h('div', { className: 'cc-ag-tool', title: it.text }, '· ' + it.text);
    if (it.kind === 'error') return h('div', { className: 'cc-ag-err', role: 'status' }, it.text);
    return h(Markdownish, { text: it.text });
  }

  function folderLabel(folders, path) {
    const f = (folders || []).find(function (x) { return x.path === path; });
    if (f) return f.label;
    const parts = String(path || '').split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || path || '';
  }

  function agentEnabled(id) {
    if (typeof CC.isEnabled !== 'function') return true;
    try { return CC.isEnabled('agent:' + id) !== false; } catch (e) { return true; }
  }

  // A quiet small kit button; without the kit, the panel's own ghost button.
  function quietButton(label, onClick, disabled) {
    const ui = CC.ui;
    if (ui && typeof ui.Button === 'function') return ui.Button({ kind: 'quiet', size: 'sm', onClick: onClick, disabled: !!disabled, children: label });
    return h('button', { type: 'button', className: 'cc-ag-ghost', onClick: onClick, disabled: disabled }, label);
  }

  function SessionList(props) {
    const sessions = (props.sessions || []).filter(function (s) { return !isSmoke(s); });
    return h('div', { className: 'cc-ag-sessions' },
      h('div', { className: 'cc-sec-h cc-ag-h' }, h('div', { className: 'cc-sec-t' }, 'Chats'),
        h('div', { className: 'cc-sec-a' }, quietButton('New chat', props.onNew, props.disabled))),
      sessions.length ? h('ul', { className: 'cc-ag-list' }, sessions.map(function (s) {
        return h(SessionRow, { key: s.id, session: s, selected: s.id === props.selected, onClick: function () { props.onOpen(s.id); } });
      })) : h('div', { className: 'cc-ag-empty' }, 'No chats yet.'));
  }

  const SEND_ICON = h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M8 13V3.5M3.5 7.5 8 3l4.5 4.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }));

  const CLIP_ICON = h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7', fill: 'none', stroke: 'currentColor',
      strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }));

  function Composer(props) {
    const agent = props.agent, mode = props.mode || '';
    const modes = [['plan', 'Plan'], ['auto', 'Autonomous']];
    function onKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); props.onSend(); }
    }
    return h('div', { className: 'cc-ag-comp' + (props.on ? '' : ' cc-ag-off') }, h('div', { className: 'cc-ag-comp-in' },
      props.note ? h('div', { className: 'cc-ag-note' + (props.note.bad ? ' cc-bad' : ''), role: 'status' }, props.note.text) : null,
      props.planReady ? h('div', { className: 'cc-ag-plan' }, 'Plan ready.',
        h('button', { type: 'button', className: 'cc-ag-ghost', onClick: props.onApprove }, 'Approve and run')) : null,
      h('div', { className: 'cc-ag-field' },
      (props.attachments || []).length ? h('div', { className: 'cc-ag-chips' }, props.attachments.map(function (p) {
        return h('button', { key: p, type: 'button', className: 'cc-ag-chip', title: 'Remove ' + p, onClick: function () { props.onDetach(p); } }, p);
      })) : null,
      h('textarea', {
        className: 'cc-ag-input', value: props.text, rows: 3, 'aria-label': 'Message', disabled: !props.on,
        placeholder: props.placeholder || (agent ? 'Message ' + agent.name : 'Message'),
        onChange: function (e) { props.onText(e.target.value); }, onKeyDown: onKey
      }),
      h('div', { className: 'cc-ag-tools' }, props.lead,
        h(ChoiceSelects, { agent: agent, model: props.choice.model, effort: props.choice.effort, onModel: props.onModel, onEffort: props.onEffort }),
        h('span', { className: 'cc-ag-mode', role: 'group', 'aria-label': 'Mode' }, modes.map(function (m) {
          return h('button', { key: m[0], type: 'button', 'data-mode': m[0], 'aria-pressed': mode === m[0],
            onClick: function () { props.onMode(mode === m[0] ? '' : m[0]); } }, m[1]);
        })),
        h('label', { className: 'cc-ag-att', title: 'Attach file path' }, CLIP_ICON,
          h('input', { className: 'cc-ag-chip cc-ag-attach', placeholder: 'Attach path', 'aria-label': 'Attach file path',
            onKeyDown: function (e) {
              if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const v = e.target.value.trim(); if (v) { props.onAttach(v); e.target.value = ''; } }
            } })),
        props.trail, h('span', { className: 'cc-ag-gap' }),
        props.running ? h('button', { type: 'button', className: 'cc-ag-ghost', onClick: props.onStop }, 'Stop')
          : props.canRetry ? h('button', { type: 'button', className: 'cc-ag-ghost', onClick: props.onRetry }, 'Retry') : null,
        props.armed
          ? h('button', { type: 'button', className: 'cc-ag-send cc-ag-wide', disabled: !props.canSend, onClick: props.onSend }, 'Confirm send')
          : h('button', { type: 'button', className: 'cc-ag-send', disabled: !props.canSend, onClick: props.onSend, title: props.sendLabel || 'Send' },
            SEND_ICON, h('span', { className: 'cc-sr' }, props.sendLabel || 'Send'))))));
  }

  CC.ChatPanel = function ChatPanel(props) {
    const React = CC.React;
    ensurePageStyle();
    const aid = props.agentId;
    const list = CC.useEngine('/api/agents', ['pool']);
    const data = list.data || { agents: [], folders: [] };
    const agentsList = data.agents || [];
    const folders = data.folders || [];

    const sSess = React.useState([]), sessions = sSess[0], setSessions = sSess[1];
    const sSubs = React.useState([]), subs = sSubs[0], setSubs = sSubs[1];
    const sSub = React.useState(null), subSel = sSub[0], setSubSel = sSub[1];
    const sCur = React.useState(null), current = sCur[0], setCurrent = sCur[1];
    const sRows = React.useState([]), rows = sRows[0], setRows = sRows[1];
    const sLive = React.useState(null), live = sLive[0], setLive = sLive[1];
    const sText = React.useState(''), text = sText[0], setText = sText[1];
    const sFolder = React.useState(null), folder = sFolder[0], setFolder = sFolder[1];
    const sNote = React.useState(null), note = sNote[0], setNote = sNote[1];
    const sArm = React.useState(false), armed = sArm[0], setArmed = sArm[1];
    const sMode = React.useState(''), mode = sMode[0], setMode = sMode[1];
    const sAtt = React.useState([]), attachments = sAtt[0], setAttachments = sAtt[1];
    const stickRef = React.useRef(true);
    const sTick = React.useState(0), tick = sTick[0], setTick = sTick[1];
    const sChoice = React.useState({ model: '', effort: '' }), choice = sChoice[0], setChoice = sChoice[1];
    const liveRef = React.useRef(null);
    liveRef.current = live;
    const scrollRef = React.useRef(null);

    const agent = agentsList.find(function (a) { return a.id === aid; }) || null;
    const name = agent ? agent.name : (props.name || 'Chat');
    const on = agentEnabled(aid);
    function openAgents() {
      try { if (CC.ctx && CC.ctx.layout && typeof CC.ctx.layout.selectPanel === 'function') CC.ctx.layout.selectPanel('cc-agents'); } catch (e) { /* no layout */ }
    }
    const session = sessions.find(function (s) { return s.id === current; }) || null;
    const subChat = subs.find(function (c) { return c.id === subSel; }) || null;
    const showSub = !!(subChat && !current);   // a dispatched chat you have not replied to yet
    const folderPath = session ? session.cwd : (folder || data.default_folder || (folders[0] && folders[0].id));

    // This agent's chats.
    React.useEffect(function () {
      let alive = true;
      CC.api.get('/api/agents/sessions?agent=' + encodeURIComponent(aid)).then(function (d) {
        if (alive) setSessions((d && d.sessions) || []);
      }, function () {});
      return function () { alive = false; };
    }, [aid, tick]);

    // Subagent chats dispatched to this agent (a missing route just means none).
    React.useEffect(function () {
      let alive = true;
      const load = function () {
        CC.api.get('/api/subagent_chats?agent=' + encodeURIComponent(aid)).then(function (d) {
          if (alive) setSubs((d && d.chats) || []);
        }, function () {});
      };
      load();
      // Subagent dispatches surface as 'agent' events; no dedicated kind exists for the chat list itself,
      // so a 60 s fallback poll stays for anything the stream does not announce.
      const off = CC.api.subscribe(function (kind) { if (alive && kind === 'agent') load(); });
      const timer = setInterval(load, 60000);
      return function () { alive = false; clearInterval(timer); off(); };
    }, [aid, tick]);

    // Messages for the open chat (also picks up a turn already running after a reload).
    React.useEffect(function () {
      if (!current) { setRows([]); return undefined; }
      let alive = true;
      CC.api.get('/api/agents/messages?session=' + encodeURIComponent(current)).then(function (d) {
        if (!alive || !d) return;
        setRows(d.messages || []);
        const cur = liveRef.current;
        if (d.active && (!cur || cur.turn_id !== d.active.turn_id)) {
          setLive({ turn_id: d.active.turn_id, session_id: current, items: d.active.items || [], state: 'running' });
        } else if (!d.active && cur && cur.session_id === current && cur.state === 'running' && !cur.sse) {
          setLive(null);
        }
      }, function () {});
      return function () { alive = false; };
    }, [current, tick]);

    // Live deltas over SSE.
    React.useEffect(function () {
      return CC.api.subscribe(function (kind, ev) {
        if (kind !== 'agent' || !ev) return;
        const cur = liveRef.current;
        if (cur && ev.turn_id === cur.turn_id) {
          const next = applyEvent(cur, ev);
          liveRef.current = next;
          setLive(next);
          if (ev.done) setTick(function (t) { return t + 1; });
        } else if (ev.done) {
          setTick(function (t) { return t + 1; });
        }
      });
    }, []);

    // Fallback while a turn runs: poll its snapshot if no SSE deltas are arriving.
    React.useEffect(function () {
      if (!live || live.state !== 'running' || live.sse) return undefined;
      const sid = live.session_id, tid = live.turn_id;
      const timer = setInterval(function () {
        CC.api.get('/api/agents/messages?session=' + encodeURIComponent(sid)).then(function (d) {
          const cur = liveRef.current;
          if (!d || !cur || cur.turn_id !== tid || cur.sse) return;
          if (d.active && d.active.turn_id === tid) setLive(Object.assign({}, cur, { items: d.active.items || [] }));
          else { setRows(d.messages || []); setLive(null); setTick(function (t) { return t + 1; }); }
        }, function () {});
      }, 10000);  // runs only when no SSE deltas arrive (live.sse false): degraded-stream fallback
      return function () { clearInterval(timer); };
    }, [live && live.turn_id, live && live.state, live && live.sse]);

    // A finished live turn is replaced by the stored rows once they have loaded.
    React.useEffect(function () {
      if (live && live.state !== 'running' && rows.some(function (r) { return r.turn_id === live.turn_id && r.role !== 'user'; })) {
        setLive(null);
      }
    }, [rows, live && live.state]);

    // Keep the newest text in view.
    React.useEffect(function () {
      const el = scrollRef.current;
      if (el && stickRef.current) el.scrollTop = el.scrollHeight;
    }, [rows.length, live && live.items.length, live && live.items.length && live.items[live.items.length - 1].text.length]);

    function newChat() { setCurrent(null); setSubSel(null); setRows([]); setArmed(false); setNote(null); }
    function openSession(id) { setCurrent(id); setSubSel(null); setArmed(false); setNote(null); }
    function openSubagent(c) {
      setSubSel(c.id); setArmed(false); setNote(null);
      if (c.agent_session) setCurrent(c.agent_session); else { setCurrent(null); setRows([]); }
    }

    const running = !!(live && live.state === 'running' && (!current || live.session_id === current));
    const replyOk = !showSub || !!(subChat && subChat.resumable);
    const canSend = !!(on && agent && agent.available && text.trim() && !running && replyOk);

    function started(res, message) {
      setText('');
      const lv = { turn_id: res.turn_id, session_id: res.session_id, items: [], state: 'running', pending: message };
      liveRef.current = lv;
      setLive(lv);
      setCurrent(res.session_id);
      setTick(function (t) { return t + 1; });
    }
    function failed(err) {
      const d = (err && err.data) || {};
      if (d.error === 'confirm_usage') {
        setArmed(true);
        setNote({ text: usageLong(Object.assign({}, agent, d)) + '. Press Send again to confirm.' });
      } else {
        setNote({ bad: true, text: d.detail || d.error || (err && err.message) || 'Send failed.' });
      }
    }

    function send(over) {
      const raw = typeof over === 'string' ? over : null;
      if (raw === null ? !canSend : !(on && agent && agent.available && !running && replyOk)) return;
      if (agent.needs_confirm && !armed) {
        setArmed(true);
        setNote({ text: usageLong(agent) + '. This uses your ' + agent.name + ' plan; press Send again to confirm.' });
        return;
      }
      stickRef.current = true;
      const message = raw !== null ? raw : withAttachments(modeMessage(mode, text.trim()), attachments);
      setNote(null); setArmed(false);
      if (raw === null) setAttachments([]);
      resolveChoice(agent, choice, CC.api.get).then(function (pick) {
        let post;
        if (showSub) {
          const body = replyBody(subChat, message, pick);
          if (agent.needs_confirm) body.confirm = true;
          post = CC.api.post('/api/subagent_chats/reply', body);
        } else {
          const body = Object.assign({ agent: agent.id, message: message }, pick);
          if (current) body.session_id = current; else body.cwd = folderPath;
          if (agent.needs_confirm) body.confirm = true;
          post = CC.api.post('/api/agents/send', body);
        }
        return post.then(function (res) { started(res, message); }, failed);
      });
    }
    const lastUser = (function () {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].role === 'user') return rows[i].text;
      return '';
    })();
    const hasReply = rows.some(function (r) { return r.role === 'assistant'; });
    const lastIsAssistant = rows.length > 0 && rows[rows.length - 1].role === 'assistant';
    function retry() { if (lastUser) send(lastUser); }
    function approve() { setMode(''); send('Plan approved. Execute it now, step by step.'); }
    function stop() {
      if (!live) return;
      CC.api.post('/api/agents/stop', { turn_id: live.turn_id }).catch(function () {});
    }

    // Conversation items: a dispatched chat's prompt and output, or stored rows then the live turn.
    let items;
    if (showSub) {
      items = subagentItems(subChat);
      if (subagentWait(subChat)) items.push({ kind: 'wait' });
    } else {
      items = rowsToItems(rows);
      if (live && (live.session_id === current)) {
        const stored = rows.some(function (r) { return r.turn_id === live.turn_id && r.role !== 'user'; });
        if (!stored) {
          if (live.pending && !rows.some(function (r) { return r.turn_id === live.turn_id; })) {
            items.push({ kind: 'user', text: live.pending });
          }
          items = items.concat(live.items);
          if (live.state === 'running' && !live.items.length) items.push({ kind: 'wait' });
          if (live.state === 'error' && live.error) items.push({ kind: 'error', text: live.error });
        }
      }
    }

    const groups = groupItems(items);

    const side = h('aside', { className: 'cc-ag-side', 'aria-label': (agent ? agent.name : 'Agent') + ' chats' },
      list.error && !agentsList.length ? h('div', { className: 'cc-ag-empty' }, 'Waypoint Core is not answering.') : null,
      h(SessionList, { sessions: sessions, selected: subSel ? null : current, disabled: !agent, onNew: newChat, onOpen: openSession }),
      h(SubagentList, { chats: subs, selected: subSel, onOpen: openSubagent }));

    const thread = items.length ? h('div', { className: 'cc-ag-thread' }, groups.map(function (it, i) {
      if (it.kind === 'steps') return h(StepsRow, { key: 's' + i + (running && i === groups.length - 1 ? 'o' : 'c'), steps: it.steps, open: running && i === groups.length - 1 });
      if (it.kind === 'wait') return h('div', { key: 'w', className: 'cc-ag-wait' }, (agent ? agent.name : 'Agent') + ' is working…');
      return h(Item, { key: i, item: it });
    })) : agent && !on ? h('div', { className: 'cc-ag-hello' },
      h('div', { className: 'cc-ag-hello-line' }, 'Turned off in Agents.'),
      h('button', { type: 'button', className: 'cc-ag-ghost cc-ag-go', onClick: openAgents }, 'Open Agents'))
      : agent && !agent.available ? h('div', { className: 'cc-ag-hello' },
        h('div', { className: 'cc-ag-hello-line' }, agent.availability_detail || 'Not available right now.'))
        : !current && !showSub && agent ? h('div', { className: 'cc-ag-emptywrap' }, emptyState()) : null;

    const folderChip = session
      ? h('span', { className: 'cc-ag-chip cc-ag-folder', title: session.cwd }, folderLabel(folders, session.cwd))
      : showSub && subChat.cwd ? h('span', { className: 'cc-ag-chip cc-ag-folder', title: subChat.cwd }, folderLabel(folders, subChat.cwd))
        : h('select', {
          className: 'cc-ag-chip cc-ag-folder', 'aria-label': 'Working folder', value: folderPath || '',
          onChange: function (e) { setFolder(e.target.value); }
        }, folders.map(function (f) { return h('option', { key: f.id, value: f.id, title: f.path }, f.label); }));
    const staleUsage = !!(agent && agent.usage_status === 'STALE');
    const lowUsage = !!(agent && agent.usage_percent != null && agent.usage_percent <= 20);
    const usageChip = agent && usageChipText(agent) ? h('span', {
      className: 'cc-ag-chip cc-ag-use' + (staleUsage ? ' cc-ag-stale' : (lowUsage ? ' cc-warn' : '')), 'data-usage': '',
      title: usageTip(agent) || null
    }, usageChipText(agent)) : null;

    // Switched off in Agents: no composer, just the way back (the hello block above).
    const composer = agent && !on ? null : showSub && !replyOk
      ? h('div', { className: 'cc-ag-comp' }, h('div', { className: 'cc-ag-comp-in' },
        h('div', { className: 'cc-ag-note', role: 'status' }, subChat.resume_note || 'This chat cannot be resumed.')))
      : h(Composer, {
        agent: agent, on: on, text: text, note: note, armed: armed, running: running, canSend: canSend, canRetry: hasReply && !!lastUser,
        planReady: mode === 'plan' && lastIsAssistant && !running, mode: mode, attachments: attachments, choice: choice,
        sendLabel: showSub ? 'Reply' : 'Send', lead: folderChip, trail: usageChip,
        placeholder: agent ? (showSub ? 'Reply to ' + subChat.title : 'Message ' + agent.name) : 'Message',
        onText: function (v) { setText(v); if (armed) setArmed(false); }, onSend: function () { send(); }, onStop: stop, onRetry: retry, onApprove: approve,
        onMode: setMode, onAttach: function (p) { setAttachments(attachments.indexOf(p) < 0 ? attachments.concat([p]) : attachments); },
        onDetach: function (p) { setAttachments(attachments.filter(function (x) { return x !== p; })); },
        onModel: function (v) { setChoice(Object.assign({}, choice, { model: v })); },
        onEffort: function (v) { setChoice(Object.assign({}, choice, { effort: v })); }
      });

    const title = session ? session.title : (showSub ? subChat.title : name);
    // No route tag (the tab names the agent); an open chat shows its folder.
    const subline = showSub
      ? [subChat.agent_name, subChat.model, subChat.status].filter(Boolean).join(' · ')
      : (session ? folderLabel(folders, session.cwd) : '');

    const body = h('div', { className: 'cc-ag-body' }, side,
      h('main', { className: 'cc-ag-main' },
        h('div', { className: 'cc-ag-scroll', ref: scrollRef, onScroll: function (e) { const t = e.target; stickRef.current = t.scrollHeight - t.scrollTop - t.clientHeight < 60; } }, thread),
        composer));
    return frame(title, subline, body, props.pageId);
  };

  // No chat open: a compact left-aligned note just above the composer (the header names the agent).
  function emptyState() {
    const ui = CC.ui;
    const title = 'No chat open', body = 'Pick a chat on the left or type below.';
    if (ui && typeof ui.Empty === 'function') return ui.Empty({ title: title, body: body });
    return h('div', { className: 'cc-em' }, h('div', { className: 'cc-em-t' }, title), h('div', { className: 'cc-em-b' }, body));
  }

  // The page frame: the kit's Page and PageHeader (title, one meta line, app status at the right end).
  // Without the kit (ui.js not loaded) a plain header keeps the page usable.
  function frame(title, meta, body, pageId) {
    const ui = CC.ui;
    if (ui && typeof ui.Page === 'function' && typeof ui.PageHeader === 'function') {
      return ui.Page({ className: 'cc-ag', raw: true, children: body,
        header: h('div', { className: 'cc-ag-bar' }, ui.PageHeader({ title: title, meta: meta || null, pageId: pageId })) });
    }
    return h('div', { className: 'cc-root cc-page cc-ag' },
      h('div', { className: 'cc-ag-bar cc-ag-plain' },
        h('span', { className: 'cc-ag-title' }, title),
        meta ? h('span', { className: 'cc-ag-sub' }, meta) : null),
      body);
  }

  CC.chatInternals = {
    splitFences: splitFences, applyEvent: applyEvent, usageChipText: usageChipText, usageLong: usageLong, windowShort: windowShort, ago: ago, ChoiceSelects: ChoiceSelects,
    SubagentList: SubagentList, resolveChoice: resolveChoice, replyBody: replyBody, subagentItems: subagentItems,
    subagentWait: subagentWait, PICK: PICK, STYLE: STYLE, Composer: Composer, SessionList: SessionList, Markdownish: Markdownish,
    CodeBlock: CodeBlock, groupItems: groupItems, stepSummary: stepSummary, StepsRow: StepsRow, modeMessage: modeMessage,
    withAttachments: withAttachments, displayUser: displayUser, isSmoke: isSmoke, modelRows: modelRows, ModelMenu: ModelMenu,
    ModelChip: ModelChip
  };
})(CC);
