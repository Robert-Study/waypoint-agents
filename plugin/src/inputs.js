// inputs.js [views, C6] - Likert and "select all that apply" inputs, usable on any surface.
// Nothing is ever preselected: option flags such as recommended/checked/selected are ignored.
//   CC.Likert({scale, value, onChange, labels, ariaLabel, disabled})
//     scale: N (>= 2), values 1..N ascending. labels: [low, high] | {low, high} | N per-option labels.
//   CC.SelectAll({options, value, onChange, ariaLabel, disabled})
//     options: ['a', ...] | [{value, label, hint}]. value: array of selected values (default []).
// Both work controlled (value given) or uncontrolled (internal state, starts empty).
(function (CC) {
  'use strict';

  function endLabels(labels, n) {
    if (!labels) return { low: null, high: null, each: null };
    if (Array.isArray(labels)) {
      if (labels.length === n && n > 2) return { low: labels[0], high: labels[n - 1], each: labels };
      return { low: labels[0] == null ? null : labels[0], high: labels[labels.length - 1] == null ? null : labels[labels.length - 1], each: null };
    }
    return { low: labels.low != null ? labels.low : labels.min, high: labels.high != null ? labels.high : labels.max, each: null };
  }

  function Likert(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const n = Math.max(2, Math.floor(+props.scale || 5));
    const controlled = props.value !== undefined;
    const st = React.useState(null);
    const value = controlled ? props.value : st[0];
    const refs = React.useRef([]);
    const lab = endLabels(props.labels, n);
    const disabled = !!props.disabled;

    function choose(v) {
      if (disabled) return;
      if (!controlled) st[1](v);
      if (props.onChange) props.onChange(v);
    }
    function onKeyDown(e, i) {
      let t = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') t = Math.min(n - 1, i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') t = Math.max(0, i - 1);
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = n - 1;
      else if (e.key === ' ' || e.key === 'Enter') t = i;
      if (t == null) return;
      e.preventDefault();
      choose(t + 1);
      const el = refs.current[t];
      if (el && el.focus) el.focus();
    }
    const focusIndex = value != null && value >= 1 && value <= n ? value - 1 : 0;
    const opts = [];
    for (let i = 0; i < n; i++) {
      const v = i + 1;
      const extra = lab.each ? lab.each[i] : (i === 0 ? lab.low : (i === n - 1 ? lab.high : null));
      opts.push(h('button', {
        key: v,
        type: 'button',
        role: 'radio',
        className: 'cc-likert-opt cc-num',
        'aria-checked': value === v ? 'true' : 'false',
        'aria-label': v + ' of ' + n + (extra ? ', ' + extra : ''),
        tabIndex: i === focusIndex ? 0 : -1,
        disabled: disabled,
        ref: (el) => { refs.current[i] = el; },
        onClick: () => choose(v),
        onKeyDown: (e) => onKeyDown(e, i)
      }, String(v)));
    }
    return h('div', { className: 'cc-likert' },
      h('div', { className: 'cc-likert-row', role: 'radiogroup', 'aria-label': props.ariaLabel || 'Rating, 1 to ' + n }, opts),
      lab.low != null || lab.high != null
        ? h('div', { className: 'cc-likert-ends', 'aria-hidden': 'true' },
          h('span', null, lab.low != null ? '1 · ' + lab.low : ''),
          h('span', null, lab.high != null ? lab.high + ' · ' + n : ''))
        : null);
  }

  function normOptions(options) {
    return (options || []).map((o) => {
      if (o != null && typeof o === 'object') {
        const v = o.value != null ? o.value : o.id;
        return { value: String(v), label: o.label != null ? String(o.label) : String(v), hint: o.hint || null };
      }
      return { value: String(o), label: String(o), hint: null };
    });
  }

  function SelectAll(props) {
    const React = CC.React;
    const h = CC.h;
    CC.ensureStyles();
    const opts = normOptions(props.options);
    const controlled = props.value !== undefined;
    const st = React.useState([]);
    const raw = (controlled ? props.value : st[0]) || [];
    const chosen = {};
    raw.forEach((v) => { chosen[String(v)] = true; });
    const count = opts.filter((o) => chosen[o.value]).length;
    const disabled = !!props.disabled;

    function commit(map) {
      if (disabled) return;
      const next = opts.filter((o) => map[o.value]).map((o) => o.value);
      if (!controlled) st[1](next);
      if (props.onChange) props.onChange(next);
    }
    function toggle(v) {
      const m = Object.assign({}, chosen);
      if (m[v]) delete m[v]; else m[v] = true;
      commit(m);
    }
    function all() {
      const m = {};
      opts.forEach((o) => { m[o.value] = true; });
      commit(m);
    }

    return h('div', { className: 'cc-select', role: 'group', 'aria-label': props.ariaLabel || 'Select all that apply' },
      h('div', { className: 'cc-select-bar' },
        h('button', { type: 'button', className: 'cc-btn', disabled: disabled || count === opts.length || !opts.length, onClick: all }, 'Select all'),
        h('button', { type: 'button', className: 'cc-btn', disabled: disabled || count === 0, onClick: () => commit({}) }, 'Clear'),
        h('span', { className: 'cc-meta cc-num', 'aria-live': 'polite' }, count + ' of ' + opts.length + ' selected')),
      opts.map((o) => h('label', { key: o.value, className: 'cc-check' },
        h('input', {
          type: 'checkbox',
          value: o.value,
          checked: !!chosen[o.value],
          disabled: disabled,
          onChange: () => toggle(o.value)
        }),
        h('span', null, o.label),
        o.hint ? h('span', { className: 'cc-check-hint' }, o.hint) : null)));
  }

  CC.Likert = Likert;
  CC.SelectAll = SelectAll;
})(CC);
