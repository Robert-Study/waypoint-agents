// command_bar.test.mjs - F3: Ctrl+K command bar. Plain requests become an action preview the owner
// confirms with Enter (Esc cancels); a deterministic rule parser runs first, an optional engine
// model fallback second, and only owner actions that already exist can run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

function load() {
  const CC = { h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise, RegExp, setTimeout, clearTimeout });
  for (const f of ['tokens.js', 'api.js', 'settings.js', 'command_bar.js', 'app.js']) {
    vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  }
  return CC;
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const NOW = new Date(2026, 10, 4, 15, 30); // 15:30 local
const PROJECTS = [
  { id: 'career', title: 'Career' },
  { id: 'docs-site', title: 'Efficient Frontiers' },
  { id: 'cc', title: 'Control Centre' }
];
const SEQ = [[{ project: 'cc', model: null }], [{ project: 'career', model: null }], [{ project: 'docs-site', model: 'm1' }]];
const env = (over = {}) => Object.assign({ projects: PROJECTS, sequence: SEQ, settings: { preset: 'balanced', sequence: SEQ }, now: NOW }, over);

test('add todo: the text after "add todo" becomes the todo', () => {
  const CC = load();
  const r = CC.commandBar.parse('add todo renew passport', env());
  assert.equal(r.ok, true);
  assert.deepEqual(plain(r.action), { kind: 'add_todo', text: 'renew passport' });
  assert.equal(r.preview, 'Add todo: renew passport');
  assert.equal(CC.commandBar.parse('todo: call the bank', env()).action.text, 'call the bank');
});

test('run a project tonight plans a sprint at 22:00 on Claude Code', () => {
  const CC = load();
  const r = CC.commandBar.parse('run Career tonight', env());
  assert.equal(r.ok, true);
  assert.equal(r.action.kind, 'run_project');
  assert.equal(r.action.project, 'career');
  assert.equal(r.action.pool, 'claude_code');
  const at = new Date(r.action.start_at);
  assert.equal(at.getHours(), 22);
  assert.equal(at.getDate(), 4);
  assert.match(r.preview, /^Run Career tonight at 22:00 on Claude Code$/);
});

test('run variants: now, at a time, on a named pool, fuzzy project names', () => {
  const CC = load();
  const now = CC.commandBar.parse('run efficient frontiers', env());
  assert.equal(now.action.project, 'docs-site');
  assert.equal(new Date(now.action.start_at).getTime(), NOW.getTime());
  assert.match(now.preview, /now/);
  const at = CC.commandBar.parse('start career at 9pm on freebuff', env());
  assert.equal(new Date(at.action.start_at).getHours(), 21);
  assert.equal(at.action.pool, 'freebuff');
  const early = CC.commandBar.parse('run career at 9am', env()); // 09:00 already passed -> tomorrow
  assert.equal(new Date(early.action.start_at).getDate(), 5);
  const nope = CC.commandBar.parse('run Atlantis', env());
  assert.equal(nope.ok, false);
});

test('move a project up or down the Autonomous order', () => {
  const CC = load();
  const up = CC.commandBar.parse('move Efficient Frontiers up', env());
  assert.equal(up.ok, true);
  assert.equal(up.action.kind, 'move_project');
  assert.deepEqual(plain(up.action.sequence).map((row) => row.map((i) => i.project)), [['cc'], ['docs-site'], ['career']]);
  assert.equal(up.action.sequence[1][0].model, 'm1', 'per-project model kept');
  assert.match(up.preview, /Efficient Frontiers.*row 3.*row 2/);
  const top = CC.commandBar.parse('move career to the top', env());
  assert.deepEqual(plain(top.action.sequence).map((r) => r.map((i) => i.project)), [['career'], ['cc'], ['docs-site']]);
  const down = CC.commandBar.parse('move control centre down', env());
  assert.deepEqual(plain(down.action.sequence).map((r) => r.map((i) => i.project)), [['career'], ['cc'], ['docs-site']]);
  const first = CC.commandBar.parse('move control centre up', env());
  assert.equal(first.ok, false, 'already first');
  const absent = CC.commandBar.parse('move career up', env({ sequence: [], settings: { sequence: [] } }));
  assert.deepEqual(plain(absent.action.sequence).map((r) => r.map((i) => i.project)), [['career']]);
});

test('open a tab by its sidebar name', () => {
  const CC = load();
  const r = CC.commandBar.parse('open autonomous', env());
  assert.deepEqual(plain(r.action), { kind: 'open_tab', id: 'cc-sprints', label: 'Autonomous' });
  assert.equal(r.preview, 'Open Autonomous');
  assert.equal(CC.commandBar.parse('go to settings', env()).action.id, 'cc-settings');
  assert.equal(CC.commandBar.parse('open the moon', env()).ok, false);
});

test('anything else is not understood by the rules', () => {
  const CC = load();
  for (const t of ['', '   ', 'delete everything', 'mark D2 done', 'push to github']) {
    assert.equal(CC.commandBar.parse(t, env()).ok, false, t);
  }
});

test('model fallback: only allowed kinds survive and are re-checked by the rules', async () => {
  const CC = load();
  const posted = [];
  CC.api.post = (p, b) => { posted.push([p, b]); return Promise.resolve({ action: { kind: 'add_todo', text: 'book the dentist' } }); };
  const r = await CC.commandBar.resolve('could you note that I must book the dentist', env());
  assert.equal(posted[0][0], '/api/command/parse');
  assert.equal(r.ok, true);
  assert.deepEqual(plain(r.action), { kind: 'add_todo', text: 'book the dentist' });
  assert.match(r.preview, /^Add todo: book the dentist$/);
  assert.equal(r.via, 'model');

  CC.api.post = () => Promise.resolve({ action: { kind: 'mark_done', project: 'cc', node: 'D2' } });
  assert.equal((await CC.commandBar.resolve('finish D2 please', env())).ok, false, 'unknown kind refused');
  CC.api.post = () => Promise.resolve({ action: { kind: 'run_project', project: 'Atlantis' } });
  assert.equal((await CC.commandBar.resolve('launch the lost city', env())).ok, false, 'unknown project refused');
  CC.api.post = () => Promise.reject(Object.assign(new Error('not found'), { status: 404 }));
  const miss = await CC.commandBar.resolve('sing a song', env());
  assert.equal(miss.ok, false);
});

test('rules win: a request they understand never reaches the model', async () => {
  const CC = load();
  let called = 0;
  CC.api.post = () => { called++; return Promise.resolve({}); };
  const r = await CC.commandBar.resolve('add todo x', env());
  assert.equal(r.ok, true);
  assert.equal(called, 0);
});

test('execute maps each kind to the existing owner action only', async () => {
  const CC = load();
  const calls = [];
  CC.api.post = (p, b) => { calls.push([p, plain(b)]); return Promise.resolve({ ok: true }); };
  const picked = [];
  CC.ctx = { layout: { selectPanel: (id) => picked.push(id) } };
  const e = env();
  await CC.commandBar.execute(CC.commandBar.parse('add todo a', e).action, e);
  await CC.commandBar.execute(CC.commandBar.parse('run career tonight', e).action, e);
  await CC.commandBar.execute(CC.commandBar.parse('move efficient frontiers up', e).action, e);
  await CC.commandBar.execute(CC.commandBar.parse('open brain', e).action, e);
  assert.deepEqual(calls.map((c) => c[0]), ['/api/todos', '/api/sprints/plan', '/api/autonomous/settings']);
  assert.deepEqual(calls[0][1], { text: 'a' });
  assert.equal(calls[1][1].project, 'career');
  assert.equal(calls[1][1].pool, 'claude_code');
  assert.equal(calls[2][1].settings.preset, 'balanced', 'other saved settings kept');
  assert.deepEqual(calls[2][1].settings.sequence.map((r) => r.map((i) => i.project)), [['cc'], ['docs-site'], ['career']]);
  assert.deepEqual(picked, ['cc-brain']);
  await assert.rejects(() => CC.commandBar.execute({ kind: 'mark_done' }, e));
  assert.equal(calls.length, 3);
});

test('keys: Ctrl+K opens (only on a Waypoint page), Enter confirms, Esc cancels', () => {
  const CC = load();
  const K = CC.commandBar.keyAction;
  assert.equal(K({ key: 'k', ctrlKey: true }, { open: false, onPage: true }), 'open');
  assert.equal(K({ key: 'K', metaKey: true }, { open: false, onPage: true }), 'open');
  assert.equal(K({ key: 'k', ctrlKey: true }, { open: false, onPage: false }), null, "dsh's own Ctrl+K search elsewhere");
  assert.equal(K({ key: 'k' }, { open: false, onPage: true }), null);
  assert.equal(K({ key: 'Enter' }, { open: true, ready: true }), 'confirm');
  assert.equal(K({ key: 'Enter' }, { open: true, ready: false }), null, 'nothing to confirm yet');
  assert.equal(K({ key: 'Escape' }, { open: true }), 'cancel');
  assert.equal(K({ key: 'Escape' }, { open: false }), null);
});

test('panel shows the input and one preview line; Enter-to-run only with a preview', () => {
  const CC = load();
  const P = CC.commandBar.Panel;
  const withPreview = render(CC.h(P, { text: 'run career tonight', result: { ok: true, preview: 'Run Career tonight at 22:00 on Claude Code' }, onText() {}, onKey() {} }));
  assert.equal(findAll(withPreview, (n) => n.type === 'input').length, 1);
  assert.match(textOf(withPreview), /Run Career tonight at 22:00 on Claude Code/);
  assert.match(textOf(withPreview), /Enter/);
  const none = render(CC.h(P, { text: 'sing', result: { ok: false, reason: 'Not understood' }, onText() {}, onKey() {} }));
  assert.match(textOf(none), /Not understood/);
  assert.ok(!/Enter/.test(textOf(none)));
  assert.ok(!/Recommended|Meridian/.test(textOf(withPreview) + textOf(none)));
});

test('the bar is contributed to dsh through the frame-wide shell.overlay list', () => {
  const CC = load();
  const regs = [];
  CC.apply({ layout: { selectPanel() {} }, slots: { inject(k, cb) { cb(); return () => {}; }, register(spec, comp) { regs.push(spec); return () => {}; } } });
  assert.ok(regs.some((s) => s.name === 'shell.overlay' && s.id === 'cc-command-bar'));
});

done('command_bar');
