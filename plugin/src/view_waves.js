// view_waves.js [views, C4] - dispatch list batched into waves; auto-scrolls to the current wave.
// Props: {board:{nodes,edges}, filter, selected, onSelect, onOpen?, colorBy?}
// Current wave = lowest wave with an unfinished node. The list scrolls only when that changes,
// so the user's own scrolling is never fought.
(function (CC) {
  'use strict';

  function WavesView(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const board = props.board || {};
    const nodes = board.nodes || [];
    const filter = props.filter || 'all';
    const selected = props.selected == null ? null : String(props.selected);
    const onSelect = props.onSelect || function () {};
    const colorBy = props.colorBy || 'status';

    const g = React.useMemo(() => CC.groupWaves(nodes), [nodes]);
    const scroller = React.useRef(null);
    const sections = React.useRef({});

    React.useEffect(() => {
      const box = scroller.current;
      const target = g.current == null ? null : sections.current[g.current];
      if (!box || !target || typeof box.scrollTo !== 'function') return;
      box.scrollTo({ top: Math.max(0, target.offsetTop - 4), behavior: CC.prefersReducedMotion() ? 'auto' : 'smooth' });
    }, [g.current]);

    function onKeyDown(e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const box = scroller.current;
      if (!box || !box.querySelectorAll) return;
      const rows = Array.prototype.slice.call(box.querySelectorAll('.cc-row'));
      const i = rows.indexOf(typeof document !== 'undefined' ? document.activeElement : null);
      const next = rows[i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); }
    }

    const groups = g.waves.map((w) => {
      const rows = w.nodes.filter((n) => CC.matchesFilter(n, filter));
      if (!rows.length) return null;
      const isCur = w.wave === g.current;
      return h('section', {
        key: w.wave,
        className: 'cc-wave' + (isCur ? ' cc-wave-cur' : ''),
        ref: (el) => { if (el) sections.current[w.wave] = el; else delete sections.current[w.wave]; },
        'aria-label': 'Wave ' + (w.wave + 1),
        'aria-current': isCur ? 'step' : undefined
      },
      h('div', { className: 'cc-wave-h' },
        h('span', null, 'Wave ' + (w.wave + 1)),
        h('span', { className: 'cc-meta', style: { fontVariantNumeric: 'tabular-nums' } }, w.done + ' of ' + w.total + ' done'),
        h('span', { className: 'cc-wave-bar', 'aria-hidden': 'true',
          style: { alignSelf: 'center', width: 48, height: 3, borderRadius: 2, background: 'var(--cc-line-strong)', overflow: 'hidden', flex: 'none' } },
          h('span', { style: { display: 'block', height: '100%', width: (w.total ? Math.round(100 * w.done / w.total) : 0) + '%', background: 'var(--cc-done)' } })),
        isCur ? h('span', { className: 'cc-wave-tag' }, 'Current') : null),
      h('ul', { className: 'cc-rows' }, rows.map((n) => {
        const id = String(n.id);
        const st = CC.statusOf(n);
        const lane = colorBy === 'lane' ? CC.laneIndex(n.lane || n.pool) : null;
        return h('li', { key: id },
          h('button', {
            type: 'button',
            className: 'cc-row' + (id === selected ? ' cc-sel' : ''),
            'aria-current': id === selected ? 'true' : undefined,
            'data-id': id,
            onClick: () => onSelect(id),
            onDoubleClick: () => { if (props.onOpen) props.onOpen(id); }
          },
          h('svg', { className: 'cc-dot-svg', viewBox: '-9 -9 18 18', 'aria-hidden': 'true' },
            h(CC.StatusDot, { status: st, lane: lane })),
          h('span', { className: 'cc-row-t' }, n.title || id),
          h('span', { className: 'cc-row-m' }, [id, CC.statusLabel(st), (CC.isCodeNode ? CC.isCodeNode(n) : n.kind === 'code') ? 'Code' : n.model].filter(Boolean).join(' · '))));
      })));
    });

    return h('div', {
      ref: scroller,
      className: 'cc-waves',
      role: 'region',
      'aria-label': 'Dispatch waves',
      onKeyDown: onKeyDown
    }, nodes.length ? groups : h('div', { className: 'cc-meta', style: { padding: 16 } }, 'No tasks yet'));
  }

  CC.WavesView = WavesView;
})(CC);
