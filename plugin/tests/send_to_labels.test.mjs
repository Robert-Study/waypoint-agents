// send_to_labels.test.mjs - I3: Send-to rows say Run for Claude Code, Freebuff and Codex,
// and Open for Antigravity, Gemini App, ChatGPT Web and AI Studio Playground, which copy the prompt and open
// the app or site in one click. Codex runs only through the owner's own confirmed click
// (POST /api/node/run_owner, confirm: true); it is never sent through the Agents route.
// A route switched off in the Agents tab shows greyed out and its button does nothing.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, makeReact, test, done } from './harness.mjs';

const FILES = ['tokens.js', 'check_counts.js', 'page_create.js'];
const PROMPT = '# Task B: Build it\nDo the thing.';
const RUN = ['Claude Code', 'Freebuff', 'Codex'];
const OPEN = ['Antigravity', 'Gemini App', 'ChatGPT Web', 'AI Studio Playground'];

// A tiny stateful hooks stub so a click can change state and the next render sees it.
function hooks() {
  const states = [];
  let i = 0;
  const React = Object.assign(makeReact(), {
    useState(init) {
      const k = i++;
      if (!(k in states)) states[k] = typeof init === 'function' ? init() : init;
      return [states[k], (v) => { states[k] = typeof v === 'function' ? v(states[k]) : v; }];
    }
  });
  return { React, reset() { i = 0; } };
}

function setup(opts) {
  const o = Object.assign({ agents: null, runOwner: null, models: null, isEnabled: undefined }, opts || {});
  const node = { id: 'B', title: 'Build it', goal: 'Build the thing.', status: 'not_started', display_status: 'ready',
    deps: ['A'], check: { type: 'command', run: 'exit 0' }, recommended: null, claim: null };
  const calls = [], copied = [], opened = [], toasts = [];
  const engine = (path) => {
    if (!path) return { data: null };
    if (path.indexOf('/api/node/history') === 0) return { data: { history: [] } };
    if (path.indexOf('/api/node') === 0) return { data: { node, events: [] } };
    if (path.indexOf('/api/agents') === 0) return o.agents ? { data: o.agents } : { data: null, error: new Error('HTTP 404') };
    if (path.indexOf('/api/models') === 0) return o.models ? { data: o.models } : { data: null, error: new Error('HTTP 404') };
    return { data: null, error: new Error('HTTP 404') };
  };
  const api = {
    get() { return Promise.resolve({}); },
    post(path, body) {
      calls.push([path, body]);
      if (path === '/api/prompt') return Promise.resolve({ prompt: PROMPT });
      if (path === '/api/node/run_owner' && o.runOwner) return o.runOwner(body);
      return Promise.resolve({ ok: true, run_id: 'or-1' });
    }
  };
  const hk = hooks();
  const CC = loadCC(FILES, {
    React: hk.React, useEngine: engine, unpackBoard: (b) => b, api,
    copyText: (t) => { copied.push(t); return Promise.resolve(); },
    openUrl: (u) => { opened.push(u); }
  });
  if (o.isEnabled) CC.isEnabled = o.isEnabled;
  const props = { project: 'p', id: 'B', revision: 3, cwd: 'C:/repo', toast: (t) => toasts.push(t), onClose() {} };
  const draw = () => { hk.reset(); return render(CC.h(CC.createHelpers.Inspector, props)); };
  return { CC, draw, tree: draw(), calls, copied, opened, toasts };
}
const rows = (tree) => findAll(tree, hasClass('cc-send-row'));
const nameOf = (r) => textOf(findAll(r, hasClass('cc-send-n'))[0]);
const rowNamed = (tree, name) => rows(tree).find((r) => nameOf(r) === name);
const buttonIn = (el) => findAll(el, (n) => n.type === 'button')[0];
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0)); };
async function click(s, name) { buttonIn(rowNamed(s.draw(), name)).props.onClick(); await flush(); return s; }
// Switched-off routes fold into one trailing "N off" row; clicking it shows them, still greyed.
const offToggle = (tree) => findAll(tree, hasClass('cc-off-toggle'))[0];
function expandOff(s) { offToggle(s.draw()).props.onClick(); s.tree = s.draw(); return s; }

const r = {};
r.claude = await click(setup(), 'Claude Code');
r.freebuff = await click(setup(), 'Freebuff');
r.gemini = await click(setup(), 'Gemini App');
r.chatgpt = await click(setup(), 'ChatGPT Web');
r.studio = await click(setup(), 'AI Studio Playground');
r.agy = await click(setup({ agents: { agents: [{ id: 'antigravity', available: true }] } }), 'Antigravity');
r.agyUnknown = await click(setup(), 'Antigravity');
r.agyMissing = await click(setup({ agents: { agents: [{ id: 'antigravity', available: false }] } }), 'Antigravity');
r.codexOnce = await click(setup(), 'Codex');
r.codexTwice = await click(await click(setup(), 'Codex'), 'Codex');
r.codexFloor = await click(await click(setup({ runOwner: () => Promise.reject(Object.assign(new Error('HTTP 409'),
  { status: 409, data: { error: 'usage_floor', detail: 'codex_5h has 2% left' } })) }), 'Codex'), 'Codex');

test('the SEND_TO table says Run for automatic routes and Open for the 1-click ones', () => {
  const { SEND_TO } = setup().CC.createHelpers;
  const label = (n) => SEND_TO.find((x) => x.label === n);
  for (const n of RUN) assert.equal(label(n).action, 'Run', n);
  for (const n of OPEN) assert.equal(label(n).action, 'Open', n);
  assert.ok(!SEND_TO.some((x) => /send|command/i.test(x.action)), 'no Send / Copy command wording');
});

test('rendered rows: Run rows first, then Open rows, each button labelled', () => {
  const { tree } = setup();
  const names = rows(tree).map(nameOf);
  assert.deepEqual(names.slice(0, 7), RUN.concat(OPEN));
  for (const n of RUN) assert.equal(textOf(buttonIn(rowNamed(tree, n))), 'Run', n);
  for (const n of OPEN) assert.equal(textOf(buttonIn(rowNamed(tree, n))), 'Open', n);
  for (const n of RUN.concat(OPEN)) assert.match(buttonIn(rowNamed(tree, n)).props['aria-label'], new RegExp(n));
  const notes = rows(tree).map((x) => textOf(findAll(x, hasClass('cc-send-note'))[0] || ''));
  for (const t of notes) assert.ok(t.length <= 48 && t.indexOf('\n') < 0, 'one short line: ' + t);
});

test('Run on a CLI route sends the task prompt through the Agents route in the project folder', () => {
  for (const [k, agent] of [['claude', 'claude_code'], ['freebuff', 'freebuff']]) {
    const sent = r[k].calls.find((c) => c[0] === '/api/agents/send');
    assert.ok(sent, k);
    assert.equal(JSON.stringify(sent[1]), JSON.stringify({ agent, message: PROMPT, cwd: 'C:/repo' }));
  }
});

test('Open copies the prompt and opens ChatGPT in the browser (manual, like Gemini App)', () => {
  assert.deepEqual(r.chatgpt.copied, [PROMPT]);
  assert.deepEqual(r.chatgpt.opened, ['https://chatgpt.com/']);
  assert.ok(!r.chatgpt.calls.some((c) => c[0] === '/api/agents/send' || c[0] === '/api/node/run_owner'), 'no engine run, no bridge: the click only copies and opens');
});

test('Open copies the prompt and opens Gemini and AI Studio Playground', () => {
  assert.deepEqual(r.gemini.copied, [PROMPT]);
  assert.deepEqual(r.gemini.opened, ['https://gemini.google.com/app']);
  assert.deepEqual(r.studio.copied, [PROMPT]);
  assert.deepEqual(r.studio.opened, ['https://aistudio.google.com/prompts/new_chat']);
  for (const s of [r.gemini, r.studio]) {
    assert.ok(!s.calls.some((c) => c[0] === '/api/agents/send'));
    assert.ok(s.toasts.some((t) => /paste/i.test(t)));
  }
});

test('Open Antigravity copies and opens the app by its URL protocol; copy-only with a note when agy is missing', () => {
  for (const s of [r.agy, r.agyUnknown]) {
    assert.deepEqual(s.copied, [PROMPT]);
    assert.deepEqual(s.opened, ['antigravity://']);
  }
  assert.deepEqual(r.agyMissing.copied, [PROMPT]);
  assert.deepEqual(r.agyMissing.opened, []);
  const note = r.agyMissing.toasts.find((t) => /antigravity/i.test(t));
  assert.ok(note && note.indexOf('\n') < 0 && /paste/i.test(note), 'one-line note');
  for (const s of [r.agy, r.agyUnknown, r.agyMissing]) assert.ok(!s.calls.some((c) => c[0] === '/api/agents/send'));
});

test('Codex Run asks for one confirm click, then runs through run_owner with confirm: true', () => {
  assert.equal(r.codexOnce.calls.length, 0, 'the first click only arms the row');
  const armed = rowNamed(r.codexOnce.draw(), 'Codex');
  assert.equal(textOf(buttonIn(armed)), 'Confirm');
  assert.match(textOf(armed), /Codex plan/);
  const posts = r.codexTwice.calls.filter((c) => c[0] === '/api/node/run_owner');
  assert.equal(posts.length, 1);
  assert.equal(JSON.stringify(posts[0][1]), JSON.stringify({ project: 'p', id: 'B', route: 'codex', confirm: true }));
  assert.ok(!r.codexTwice.calls.some((c) => c[0] === '/api/agents/send'), 'never the Agents route');
  assert.deepEqual(r.codexTwice.copied, []);
  assert.ok(r.codexTwice.toasts.some((t) => /Codex/.test(t)));
  assert.equal(textOf(buttonIn(rowNamed(r.codexTwice.draw(), 'Codex'))), 'Run', 'disarmed after running');
});

const offByToggle = (id) => !['codex', 'gemini_app'].includes(id);
r.offCodex = await click(await click(expandOff(setup({ isEnabled: offByToggle })), 'Codex'), 'Codex');
r.offGemini = await click(expandOff(setup({ isEnabled: offByToggle })), 'Gemini App');
const MODELS_OFF = { models: [
  { id: 'agent:freebuff', route: 'freebuff', enabled: false },
  { id: 'deepseek-v4', route: 'freebuff', enabled: true },
  { id: 'manual:antigravity_manual', route: 'antigravity_manual', enabled: false },
  { id: 'claude-sonnet', route: 'claude_code', enabled: false },
  { id: 'claude-opus', route: 'claude_code', enabled: true }] };
r.offFree = await click(expandOff(setup({ models: MODELS_OFF })), 'Freebuff');

test('switched-off routes (CC.isEnabled) fold into one "N off" row, greyed out, and do nothing', () => {
  const folded = setup({ isEnabled: offByToggle });
  assert.equal(rowNamed(folded.tree, 'Codex'), undefined, 'off routes are folded away');
  assert.equal(textOf(offToggle(folded.tree)), '2 off');
  assert.equal(offToggle(folded.tree).props['aria-expanded'], 'false');
  const tree = expandOff(folded).tree;
  assert.equal(offToggle(tree).props['aria-expanded'], 'true');
  for (const n of ['Codex', 'Gemini App']) {
    const row = rowNamed(tree, n);
    assert.ok(/\bcc-off\b/.test(row.props.className), n + ' greyed');
    assert.equal(row.props['aria-disabled'], 'true');
    assert.equal(buttonIn(row).props.disabled, true);
    assert.match(textOf(row), /Off in Agents/);
  }
  for (const n of ['Claude Code', 'Antigravity', 'Copy prompt']) assert.ok(!/cc-off/.test(rowNamed(tree, n).props.className), n);
  for (const s of [r.offCodex, r.offGemini]) {
    assert.deepEqual(s.calls, []);
    assert.deepEqual(s.copied, []);
    assert.deepEqual(s.opened, []);
  }
  assert.equal(textOf(buttonIn(rowNamed(r.offCodex.draw(), 'Codex'))), 'Run', 'never arms');
});

test('without toggles.js the /api/models enabled flags decide', () => {
  const tree = expandOff(setup({ models: MODELS_OFF })).tree;
  assert.ok(/cc-off/.test(rowNamed(tree, 'Freebuff').props.className), 'agent:freebuff is off');
  assert.ok(/cc-off/.test(rowNamed(tree, 'Antigravity').props.className), 'manual:antigravity_manual is off');
  assert.ok(!/cc-off/.test(rowNamed(tree, 'Claude Code').props.className), 'one model off is not the whole route');
  assert.ok(!/cc-off/.test(rowNamed(tree, 'ChatGPT Web').props.className), 'unknown means on');
  assert.deepEqual(r.offFree.calls, []);
});

test('a refused Codex run shows the engine reason', () => {
  assert.ok(r.codexFloor.toasts.some((t) => /2% left/.test(t)));
});

done('send_to_labels');
