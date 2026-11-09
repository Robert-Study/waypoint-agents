// inputs.test.mjs - Likert and SelectAll: no preselection, ascending scale, keyboard, callbacks.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, textOf, test, done } from './harness.mjs';

const CC = loadCC(['tokens.js', 'inputs.js']);
const key = (k) => ({ key: k, preventDefault() {} });

const radios = (t) => findAll(t, (n) => n.props.role === 'radio');
const boxes = (t) => findAll(t, (n) => n.type === 'input' && n.props.type === 'checkbox');
const button = (t, label) => findAll(t, (n) => n.type === 'button' && textOf(n) === label)[0];

test('Likert: N options ascending 1..N, nothing selected initially', () => {
  for (const scale of [2, 5, 7, 9]) {
    const t = render(CC.h(CC.Likert, { scale, labels: ['Disagree', 'Agree'] }));
    const r = radios(t);
    assert.equal(r.length, scale);
    assert.deepEqual(r.map((x) => textOf(x)), Array.from({ length: scale }, (_, i) => String(i + 1)));
    assert.equal(r.filter((x) => x.props['aria-checked'] === 'true').length, 0);
  }
});
test('Likert: labelled ends and radiogroup role', () => {
  const t = render(CC.h(CC.Likert, { scale: 9, labels: { low: 'Not at all', high: 'Completely' }, ariaLabel: 'Confidence' }));
  const text = textOf(t);
  assert.match(text, /Not at all/);
  assert.match(text, /Completely/);
  assert.equal(findAll(t, (n) => n.props.role === 'radiogroup' && n.props['aria-label'] === 'Confidence').length, 1);
  const r = radios(t);
  assert.match(r[0].props['aria-label'], /1 of 9, Not at all/);
  assert.match(r[8].props['aria-label'], /9 of 9, Completely/);
});
test('Likert: roving tabindex (first focusable when empty, selected when set)', () => {
  let r = radios(render(CC.h(CC.Likert, { scale: 5 })));
  assert.deepEqual(r.map((x) => x.props.tabIndex), [0, -1, -1, -1, -1]);
  r = radios(render(CC.h(CC.Likert, { scale: 5, value: 4 })));
  assert.deepEqual(r.map((x) => x.props.tabIndex), [-1, -1, -1, 0, -1]);
  assert.equal(r[3].props['aria-checked'], 'true');
});
test('Likert: click and keyboard call onChange with ascending values', () => {
  const got = [];
  const r = radios(render(CC.h(CC.Likert, { scale: 7, value: 3, onChange: (v) => got.push(v) })));
  r[5].props.onClick();
  r[2].props.onKeyDown(key('ArrowRight'));
  r[2].props.onKeyDown(key('ArrowLeft'));
  r[2].props.onKeyDown(key('Home'));
  r[2].props.onKeyDown(key('End'));
  r[2].props.onKeyDown(key(' '));
  r[6].props.onKeyDown(key('ArrowRight'));
  r[2].props.onKeyDown(key('x'));
  assert.deepEqual(got, [6, 4, 2, 1, 7, 3, 7]);
});
test('Likert: disabled ignores input', () => {
  const got = [];
  const r = radios(render(CC.h(CC.Likert, { scale: 5, disabled: true, onChange: (v) => got.push(v) })));
  r[1].props.onClick();
  assert.deepEqual(got, []);
});
test('SelectAll: nothing preselected, even when options carry flags', () => {
  const options = [
    { value: 'a', label: 'Alpha', checked: true, recommended: true },
    { value: 'b', label: 'Beta', selected: true, preselected: true },
    'c'
  ];
  const t = render(CC.h(CC.SelectAll, { options }));
  const b = boxes(t);
  assert.equal(b.length, 3);
  assert.equal(b.filter((x) => x.props.checked).length, 0);
  assert.match(textOf(t), /0 of 3 selected/);
  assert.equal(button(t, 'Clear').props.disabled, true);
  assert.equal(button(t, 'Select all').props.disabled, false);
});
test('SelectAll: Select all, Clear, toggle keep option order', () => {
  const got = [];
  const opts = ['x', 'y', 'z'];
  let t = render(CC.h(CC.SelectAll, { options: opts, value: ['z'], onChange: (v) => got.push(v) }));
  button(t, 'Select all').props.onClick();
  button(t, 'Clear').props.onClick();
  boxes(t)[0].props.onChange();
  boxes(t)[2].props.onChange();
  assert.deepEqual(JSON.parse(JSON.stringify(got)), [['x', 'y', 'z'], [], ['x', 'z'], []]);
  t = render(CC.h(CC.SelectAll, { options: opts, value: ['x', 'y', 'z'] }));
  assert.equal(button(t, 'Select all').props.disabled, true);
  assert.match(textOf(t), /3 of 3 selected/);
});
test('SelectAll: options render as labelled checkboxes with hints', () => {
  const t = render(CC.h(CC.SelectAll, { options: [{ value: 'claude', label: 'Claude Code', hint: 'Max plan' }] }));
  const lbl = findAll(t, (n) => n.type === 'label')[0];
  assert.match(textOf(lbl), /Claude Code/);
  assert.match(textOf(lbl), /Max plan/);
});

done('inputs');
