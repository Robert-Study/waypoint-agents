// ui.js - the shared component kit. Every page builds its chrome from these pieces so headers,
// buttons, rows, switches and meters look and behave the same everywhere (DESIGN.md).
// Colours, sizes and radii come only from tokens.js CSS variables; this file holds no raw colour.
(function (CC) {
  'use strict';
  const h = CC.h;
  const S = CC.tokens.size;

  // Joins class names, skipping empty ones.
  function cx() {
    const out = [];
    for (let i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }

  const css = [
    // Page frame: one header bar, then a scrolling body with one gutter.
    '.cc-root.cc-page{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--cc-bg);}',
    '.cc-root .cc-ph{flex:none;display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;border-bottom:1px solid var(--cc-line);min-width:0;}',
    '.cc-root .cc-ph-title{font-size:' + S.section + 'px;font-weight:600;line-height:1.2;white-space:nowrap;letter-spacing:-.01em;}',
    '.cc-root .cc-ph-meta{font-size:' + S.label + 'px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-ph-mid{display:flex;align-items:center;gap:8px;min-width:0;}',
    '.cc-root .cc-ph-gap{flex:1 1 auto;min-width:8px;}',
    '.cc-root .cc-ph-act{display:flex;align-items:center;gap:8px;flex:none;}',
    '.cc-root .cc-pb{flex:1 1 auto;min-height:0;overflow:auto;}',
    '.cc-root .cc-pb-pad{padding:16px;}',
    '.cc-root .cc-pb-col{max-width:var(--cc-content-max);}',
    // Buttons: default (hairline), primary (accent fill, one per view), quiet (text only), danger.
    '.cc-root .cc-b{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--cc-line-strong);' +
      'border-radius:var(--cc-r-control);background:var(--cc-surface);color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;font-weight:500;' +
      'line-height:1;white-space:nowrap;cursor:pointer;user-select:none;}',
    '.cc-root .cc-b:hover:not(:disabled){background:var(--cc-surface-2);}',
    '.cc-root .cc-b:disabled{opacity:.45;cursor:default;}',
    '.cc-root .cc-b-sm{height:24px;padding:0 8px;font-size:' + S.meta + 'px;}',
    '.cc-root .cc-b-primary{background:var(--cc-accent);border-color:var(--cc-accent);color:var(--cc-on-status);}',
    '.cc-root .cc-b-primary:hover:not(:disabled){background:var(--cc-accent);filter:brightness(1.06);}',
    '.cc-root .cc-b-quiet{border-color:transparent;background:transparent;color:var(--cc-text-2);}',
    '.cc-root .cc-b-quiet:hover:not(:disabled){background:var(--cc-wash);color:var(--cc-text);}',
    '.cc-root .cc-b-danger{color:var(--cc-error);}',
    '.cc-root .cc-b-icon{width:28px;padding:0;}',
    '.cc-root .cc-b-sm.cc-b-icon{width:24px;}',
    '.cc-root .cc-b svg{flex:none;}',
    // Segmented control: a quiet track with the chosen option raised.
    '.cc-root .cc-sg{display:inline-flex;align-items:center;gap:2px;height:28px;padding:2px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);flex:none;}',
    '.cc-root .cc-sg-o{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border:1px solid transparent;border-radius:calc(var(--cc-r-control) - 2px);' +
      'background:transparent;color:var(--cc-text-2);font:inherit;font-size:' + S.label + 'px;font-weight:500;cursor:pointer;white-space:nowrap;}',
    '.cc-root .cc-sg-o:hover{color:var(--cc-text);}',
    '.cc-root .cc-sg-o[aria-pressed="true"]{background:var(--cc-surface);border-color:var(--cc-line);color:var(--cc-text);}',
    '.cc-root .cc-sg-n{font-size:' + S.meta + 'px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    // Switch.
    '.cc-root .cc-sw{position:relative;flex:none;width:28px;height:16px;padding:0;border:0;border-radius:999px;background:var(--cc-line-strong);cursor:pointer;}',
    '.cc-root .cc-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--cc-surface);transition:transform var(--cc-fast) var(--cc-ease);}',
    '.cc-root .cc-sw[aria-checked="true"]{background:var(--cc-accent);}',
    '.cc-root .cc-sw[aria-checked="true"]::after{transform:translateX(12px);}',
    '.cc-root .cc-sw:disabled{opacity:.45;cursor:default;}',
    // Sections: a header row and content, separated by hairlines, never boxed.
    '.cc-root .cc-sec{padding:12px 0;border-top:1px solid var(--cc-line);}',
    '.cc-root .cc-sec:first-child{border-top:0;padding-top:0;}',
    '.cc-root .cc-sec-h{display:flex;align-items:center;gap:8px;min-height:24px;margin-bottom:4px;}',
    '.cc-root .cc-sec-t{font-size:' + S.label + 'px;font-weight:600;color:var(--cc-text);}',
    '.cc-root .cc-sec-m{font-size:' + S.meta + 'px;color:var(--cc-text-3);font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-sec-a{margin-left:auto;display:flex;gap:6px;align-items:center;}',
    // Rows: 32 px, hairline separated; lead (status/check), title, meta, trailing controls.
    '.cc-root .cc-ls{list-style:none;margin:0;padding:0;}',
    '.cc-root .cc-r{display:flex;align-items:center;gap:10px;min-height:32px;padding:4px 8px;border-bottom:1px solid var(--cc-line);font-size:' + S.label + 'px;}',
    '.cc-root .cc-r:last-child{border-bottom:0;}',
    '.cc-root .cc-r-click{cursor:pointer;border-radius:var(--cc-r-control);}',
    '.cc-root .cc-r-click:hover{background:var(--cc-wash);}',
    '.cc-root .cc-r[aria-selected="true"]{background:var(--cc-selection);}',
    '.cc-root .cc-r-lead{flex:none;display:flex;align-items:center;}',
    '.cc-root .cc-r-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cc-text);}',
    '.cc-root .cc-r-wrap .cc-r-t{white-space:normal;}',
    '.cc-root .cc-r-sub{display:block;font-size:' + S.meta + 'px;color:var(--cc-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cc-root .cc-r-m{flex:none;font-size:' + S.meta + 'px;color:var(--cc-text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cc-root .cc-r-trail{flex:none;display:flex;align-items:center;gap:6px;}',
    '.cc-root .cc-r-off{opacity:.5;}',
    // Meter: a thin bar with a tabular number.
    '.cc-root .cc-mt{display:inline-flex;align-items:center;gap:6px;font-size:' + S.meta + 'px;color:var(--cc-text-2);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.cc-root .cc-mt-bar{position:relative;width:48px;height:4px;border-radius:2px;background:var(--cc-line-strong);overflow:hidden;}',
    '.cc-root .cc-mt-fill{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:var(--cc-text-2);}',
    '.cc-root .cc-mt-ok .cc-mt-fill{background:var(--cc-done);}',
    '.cc-root .cc-mt-low .cc-mt-fill{background:var(--cc-error);}',
    '.cc-root .cc-mt-run .cc-mt-fill{background:var(--cc-running);}',
    // Badge: only for something that needs action, or a count of it.
    '.cc-root .cc-bd{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:999px;font-size:' + S.meta + 'px;font-weight:600;' +
      'line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums;border:1px solid var(--cc-line-strong);color:var(--cc-text-2);}',
    '.cc-root .cc-bd-action{border-color:var(--cc-accent);color:var(--cc-accent);}',
    '.cc-root .cc-bd-error{border-color:var(--cc-error);color:var(--cc-error);}',
    '.cc-root .cc-bd-run{border-color:var(--cc-running);color:var(--cc-running);}',
    // Banner: one line across the top of a page body.
    '.cc-root .cc-bn{display:flex;align-items:center;gap:10px;min-height:36px;padding:6px 16px;border-bottom:1px solid var(--cc-line);font-size:' + S.label + 'px;color:var(--cc-text-2);background:var(--cc-surface-2);}',
    '.cc-root .cc-bn-error{color:var(--cc-error);}',
    '.cc-root .cc-bn-t{flex:1 1 auto;min-width:0;}',
    // Empty state: left aligned, compact.
    '.cc-root .cc-em{padding:24px 16px;max-width:560px;}',
    '.cc-root .cc-em-t{font-size:' + S.body + 'px;font-weight:600;}',
    '.cc-root .cc-em-b{margin-top:4px;font-size:' + S.label + 'px;color:var(--cc-text-3);}',
    '.cc-root .cc-em-a{margin-top:12px;display:flex;gap:8px;}',
    // Form fields.
    '.cc-root .cc-fd{display:flex;flex-direction:column;gap:4px;min-width:0;}',
    '.cc-root .cc-fd-l{font-size:' + S.label + 'px;font-weight:500;color:var(--cc-text-2);}',
    '.cc-root .cc-fd-h{font-size:' + S.meta + 'px;color:var(--cc-text-3);}',
    '.cc-root .cc-in{width:100%;height:32px;padding:0 10px;border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-control);background:var(--cc-surface);' +
      'color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;}',
    '.cc-root textarea.cc-in{height:auto;min-height:72px;padding:8px 10px;line-height:1.45;resize:vertical;}',
    '.cc-root select.cc-in{padding-right:24px;}',
    '.cc-root .cc-in:focus{outline:none;border-color:var(--cc-accent);}',
    // Split view: main area and a fixed-width side panel with a hairline.
    '.cc-root .cc-split{display:flex;flex:1 1 auto;min-height:0;}',
    '.cc-root .cc-split-main{flex:1 1 auto;min-width:0;min-height:0;overflow:auto;}',
    '.cc-root .cc-split-side{flex:none;width:360px;min-height:0;overflow:auto;border-left:1px solid var(--cc-line);background:var(--cc-surface);}',
    // Key/value grid for inspectors.
    '.cc-root .cc-kv{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;font-size:' + S.label + 'px;}',
    '.cc-root .cc-kv dt{color:var(--cc-text-3);}',
    '.cc-root .cc-kv dd{margin:0;min-width:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;}',
    // Menu: a "More" button with a small popover list for rare actions (hairline, no shadow).
    '.cc-root .cc-mn{position:relative;display:inline-flex;flex:none;}',
    '.cc-root .cc-mn-pop{position:absolute;right:0;top:calc(100% + 4px);z-index:60;min-width:160px;max-width:280px;padding:4px;margin:0;list-style:none;' +
      'border:1px solid var(--cc-line-strong);border-radius:var(--cc-r-panel);background:var(--cc-surface);}',
    '.cc-root .cc-mn-left .cc-mn-pop{right:auto;left:0;}',
    '.cc-root .cc-mn-i{display:flex;align-items:center;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--cc-r-control);background:transparent;' +
      'color:var(--cc-text);font:inherit;font-size:' + S.label + 'px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}',
    '.cc-root .cc-mn-i:hover:not(:disabled),.cc-root .cc-mn-i:focus-visible{background:var(--cc-wash);outline:none;}',
    '.cc-root .cc-mn-i:disabled{color:var(--cc-text-3);cursor:default;}',
    '.cc-root .cc-mn-danger{color:var(--cc-error);}',
    '.cc-root .cc-mn-sep{height:1px;margin:4px 0;background:var(--cc-line);}',
    // Native checkboxes: 16 px, the accent when checked, sitting on the text line of their row.
    '.cc-root input[type="checkbox"]{flex:none;width:16px;height:16px;margin:0;accent-color:var(--cc-accent);vertical-align:-3px;cursor:pointer;}',
    '.cc-root input[type="checkbox"]:disabled{cursor:default;}',
    '.cc-root .cc-em code{font-family:var(--cc-mono);font-size:' + S.meta + 'px;padding:1px 4px;border-radius:var(--cc-r-control);background:var(--cc-surface-2);color:var(--cc-text);}',
    '@media (prefers-reduced-motion: reduce){.cc-root .cc-sw::after{transition:none;}}'
  ].join('\n');

  function ensureCss() {
    if (typeof document === 'undefined' || !document.head || !document.createElement) return;
    const had = document.getElementById ? document.getElementById('cc-ui-kit') : null;
    if (had) { if (had.textContent !== css) had.textContent = css; return; }
    const el = document.createElement('style');
    el.id = 'cc-ui-kit';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // A whole page: header bar + body. `pad` adds the 16 px gutter; `col` caps width for forms.
  // `page` sets data-cc-page (the page's stable name for tests and screenshots); `boxRef` reaches the root.
  function Page(p) {
    ensureCss();
    return h('div', { className: cx('cc-root', 'cc-page', p.className), 'data-cc': p.id || undefined,
      'data-cc-page': p.page || undefined, ref: p.boxRef || undefined },
      p.header || null,
      p.banner || null,
      p.raw ? p.children : h('div', { className: cx('cc-pb', p.pad !== false && 'cc-pb-pad') },
        p.col ? h('div', { className: 'cc-pb-col' }, p.children) : p.children));
  }

  // Header bar: title, one meta line, optional middle controls (view switch), right-hand actions.
  function PageHeader(p) {
    ensureCss();
    return h('div', { className: 'cc-ph', role: 'toolbar', 'aria-label': p.label || (typeof p.title === 'string' ? p.title : undefined) },
      h('div', { className: 'cc-ph-title' }, p.title),
      p.meta ? h('div', { className: 'cc-ph-meta' }, p.meta) : null,
      p.mid ? h('div', { className: 'cc-ph-mid' }, p.mid) : null,
      h('div', { className: 'cc-ph-gap' }),
      p.actions ? h('div', { className: 'cc-ph-act' }, p.actions) : null,
      // App-wide status (sync mode, Waypoint Core link) sits at the right end of every header,
      // so no page needs a second bar. topbar.js defines it; absent in tests.
      typeof CC.HeaderStatus === 'function' && p.status !== false ? h(CC.HeaderStatus, { pageId: p.pageId }) : null);
  }

  function Button(p) {
    const kind = p.kind || 'default';
    return h('button', {
      type: 'button', className: cx('cc-b', kind !== 'default' && 'cc-b-' + kind, p.size === 'sm' && 'cc-b-sm',
        p.icon && !p.children && 'cc-b-icon', p.className),
      onClick: p.onClick, disabled: !!p.disabled, title: p.title, 'aria-label': p.label || p.title,
      'data-cc-action': p.action || undefined
    }, p.icon ? Icon({ d: p.icon, size: p.size === 'sm' ? 14 : 16 }) : null, p.children);
  }

  function Segmented(p) {
    return h('div', { className: 'cc-sg', role: 'group', 'aria-label': p.label },
      (p.options || []).map(function (o) {
        const value = typeof o === 'object' ? o.value : o;
        const text = typeof o === 'object' ? o.label : o;
        return h('button', {
          key: String(value), type: 'button', className: 'cc-sg-o', 'aria-pressed': p.value === value ? 'true' : 'false',
          title: o.title, onClick: function () { if (p.onChange && p.value !== value) p.onChange(value); }
        }, text, o.count !== undefined && o.count !== null ? h('span', { className: 'cc-sg-n' }, String(o.count)) : null);
      }));
  }

  function Toggle(p) {
    return h('button', {
      type: 'button', role: 'switch', className: 'cc-sw', 'aria-checked': p.checked ? 'true' : 'false',
      'aria-label': p.label, title: p.title || p.label, disabled: !!p.disabled, 'data-id': p.id || undefined,
      onClick: function () { if (p.onChange) p.onChange(!p.checked); }
    });
  }

  // `section` sets data-section (a stable hook for tests and scroll targets); `boxRef` reaches the element.
  function Section(p) {
    return h('section', { key: p.key, className: cx('cc-sec', p.className), 'aria-label': p.title,
      'data-section': p.section || undefined, ref: p.boxRef || undefined },
      p.title || p.actions ? h('div', { className: 'cc-sec-h' },
        p.title ? h('div', { className: 'cc-sec-t' }, p.title) : null,
        p.meta !== undefined && p.meta !== null ? h('div', { className: 'cc-sec-m' }, p.meta) : null,
        p.actions ? h('div', { className: 'cc-sec-a' }, p.actions) : null) : null,
      p.children);
  }

  function List(p) { return h('ul', { className: cx('cc-ls', p.className), 'aria-label': p.label }, p.children); }

  function Row(p) {
    const click = typeof p.onClick === 'function';
    return h('li', {
      key: p.key, className: cx('cc-r', click && 'cc-r-click', p.wrap && 'cc-r-wrap', p.off && 'cc-r-off', p.className),
      'aria-selected': p.selected ? 'true' : undefined, role: click ? 'button' : undefined, tabIndex: click ? 0 : undefined,
      // Enter/Space on the row itself only: a key on a control inside the row (a switch, a menu) is that control's.
      onClick: p.onClick, onKeyDown: click ? function (e) {
        if (e.target && e.currentTarget && e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onClick(e); }
      } : undefined,
      'data-cc-row': p.id || undefined, title: p.tip
    },
      p.lead ? h('span', { className: 'cc-r-lead' }, p.lead) : null,
      h('span', { className: 'cc-r-t' }, p.title, p.sub ? h('span', { className: 'cc-r-sub' }, p.sub) : null),
      p.meta !== undefined && p.meta !== null && p.meta !== '' ? h('span', { className: 'cc-r-m' }, p.meta) : null,
      p.trail ? h('span', { className: 'cc-r-trail', onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); } }, p.trail) : null);
  }

  // value 0-100 or null (unknown: an empty bar and a dash, never an invented number).
  function Meter(p) {
    const known = typeof p.value === 'number' && isFinite(p.value);
    const v = known ? Math.max(0, Math.min(100, p.value)) : 0;
    const tone = p.tone || (known ? (v < 15 ? 'low' : 'ok') : '');
    return h('span', { className: cx('cc-mt', tone && 'cc-mt-' + tone), title: p.title },
      h('span', { className: 'cc-mt-bar', 'aria-hidden': true }, h('span', { className: 'cc-mt-fill', style: { width: v + '%' } })),
      h('span', null, known ? Math.round(v) + '%' : '–', p.label ? ' ' + p.label : ''));
  }

  function Badge(p) {
    return h('span', { className: cx('cc-bd', p.tone && 'cc-bd-' + p.tone), title: p.title }, p.children);
  }

  function Banner(p) {
    return h('div', { className: cx('cc-bn', p.tone && 'cc-bn-' + p.tone), role: 'status' },
      h('span', { className: 'cc-bn-t' }, p.children), p.action || null);
  }

  function Empty(p) {
    return h('div', { className: 'cc-em' },
      h('div', { className: 'cc-em-t' }, p.title),
      p.body ? h('div', { className: 'cc-em-b' }, p.body) : null,
      p.action ? h('div', { className: 'cc-em-a' }, p.action) : null);
  }

  // Empty state for a page that has no data because Waypoint Core is not reachable. Pages show this
  // only when they have nothing at all to draw; otherwise the header's Core chip is the one signal.
  function coreProblem(core) {
    const c = core || CC.core;
    return !!c && (c.state === 'down' || c.state === 'mismatch');
  }
  function CoreEmpty(p) {
    const c = (p && p.core) || CC.core || {};
    if (c.state === 'mismatch') {
      return Empty({ title: 'Waypoint Core speaks API ' + c.api,
        body: 'This plugin needs API ' + (CC.CORE_API || 1) + '. Update Waypoint for dsh or Core so both match.' });
    }
    return Empty({ title: 'The Waypoint server is not running',
      body: ['dsh starts it; if it does not, see INSTALL.md (Tell the plugin where Waypoint is).'] });
  }

  // "More" menu for rare actions: items [{label, onClick, danger, disabled, sep}]. Escape, an outside
  // click or choosing an item closes it; arrow keys move between items. Menu() can be called like the
  // other kit functions or used as h(CC.ui.Menu, ...): either way its state lives in MenuBox.
  function Menu(p) { return h(MenuBox, p); }
  function MenuBox(p) {
    const React = CC.React;
    const st = React.useState(!!p.defaultOpen), open = st[0], setOpen = st[1];
    const ref = React.useRef(null);
    React.useEffect(function () {
      if (!open || typeof document === 'undefined' || !document.addEventListener) return undefined;
      const outside = function (ev) {
        const root = ref.current;
        if (root && root.contains && ev && ev.target && root.contains(ev.target)) return;
        setOpen(false);
      };
      const esc = function (ev) { if (ev && ev.key === 'Escape') setOpen(false); };
      document.addEventListener('mousedown', outside);
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
    }, [open]);
    function onKey(e) {
      if (!e || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const root = ref.current;
      const list = root && root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('.cc-mn-i:not(:disabled)')) : [];
      if (!list.length) return;
      e.preventDefault();
      const at = list.indexOf(typeof document !== 'undefined' ? document.activeElement : null);
      const next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at <= 0 ? list.length - 1 : at - 1);
      if (list[next] && list[next].focus) list[next].focus();
    }
    const items = (p.items || []).filter(Boolean);
    const label = p.label || 'More';
    return h('div', { className: cx('cc-mn', p.align === 'left' && 'cc-mn-left', p.className), ref: ref, onKeyDown: onKey },
      h('button', {
        // Always the quiet 28 px square icon button with the kit's More icon (never text dots).
        type: 'button', className: cx('cc-b', 'cc-b-quiet', 'cc-b-icon', p.size === 'sm' && 'cc-b-sm'), 'data-cc-menu': 'more',
        'aria-haspopup': 'menu', 'aria-expanded': open ? 'true' : 'false', 'aria-label': label, title: label,
        disabled: !!p.disabled || !items.length, onClick: function () { setOpen(!open); }
      }, Icon({ d: ICONS.more, size: p.size === 'sm' ? 14 : 16 })),
      open ? h('div', { className: 'cc-mn-pop', role: 'menu', 'aria-label': label },
        items.map(function (it, i) {
          if (it.sep) return h('div', { key: 'sep' + i, className: 'cc-mn-sep', role: 'separator' });
          return h('button', {
            key: it.key || it.label || i, type: 'button', role: 'menuitem', className: cx('cc-mn-i', it.danger && 'cc-mn-danger'),
            disabled: !!it.disabled, title: it.title || it.label, 'data-cc-action': it.action || undefined,
            onClick: function (e) { setOpen(false); if (!it.disabled && typeof it.onClick === 'function') it.onClick(e); }
          }, it.label);
        })) : null);
  }

  function Field(p) {
    return h('label', { className: cx('cc-fd', p.className) },
      h('span', { className: 'cc-fd-l' }, p.label),
      p.children,
      p.hint ? h('span', { className: 'cc-fd-h' }, p.hint) : null);
  }

  function Icon(p) {
    const size = p.size || 16;
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: p.d }));
  }

  // Common icon paths (24 px grid, stroke only).
  const ICONS = {
    play: 'M8 5l11 7l-11 7z', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5l9-10',
    more: 'M6.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0M13.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0M20.5 12a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0', chevron: 'M9 6l6 6l-6 6', down: 'M6 9l6 6l6-6', copy: 'M9 9h10v10H9zM5 15V5h10',
    stop: 'M7 7h10v10H7z', search: 'M11 18a7 7 0 1 0 0-14a7 7 0 0 0 0 14zM20 20l-4-4', back: 'M15 6l-6 6l6 6'
  };

  CC.ui = { css: css, ensureCss: ensureCss, cx: cx, Page: Page, PageHeader: PageHeader, Button: Button, Segmented: Segmented,
    Toggle: Toggle, Section: Section, List: List, Row: Row, Meter: Meter, Badge: Badge, Banner: Banner, Empty: Empty,
    Field: Field, Icon: Icon, ICONS: ICONS, Menu: Menu, CoreEmpty: CoreEmpty, coreProblem: coreProblem };
})(CC);
