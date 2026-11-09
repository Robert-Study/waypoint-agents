// live_diff.test.mjs - L1: a quiet panel lists +added / -removed lines per file during a dsh turn,
// read from the streamed edit / write / str_replace_editor tool results. No model calls, no network.
// Covers the pure parser, the per-turn aggregation, the dsh event Definition, the panel and its wiring.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';

class Component { constructor(props) { this.props = props; this.state = {}; } }
const fresh = (extra) => loadCC(['tokens.js', 'live_diff.js', 'app.js'], extra);
// Values built inside the vm context have another realm's prototypes; compare them as plain JSON.
const plain = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const LD = () => {
  const l = fresh().liveDiff;
  const out = {};
  for (const k of Object.keys(l)) out[k] = typeof l[k] === 'function' && k !== 'createStore' ? (...a) => plain(l[k](...a)) : l[k];
  return out;
};

// Session events as dsh's client receives them (SessionEventLike: { type, seq, data }).
let seq = 0;
const ev = (type, data) => ({ type, seq: ++seq, time: seq, data });
const turnStart = (turn) => ev('turn/start', { turn });
const call = (turn, callId, name, args) => ev('tool/call', { turn, step: 1, callId, name, arguments: typeof args === 'string' ? args : JSON.stringify(args) });
const result = (turn, callId, text, extra) => ev('tool/result', Object.assign({ turn, step: 1,
  message: { role: 'tool', source: { kind: 'tool', callId }, toolCallId: callId, content: [{ type: 'text', text }], isError: false } }, extra || {}));
const failed = (turn, callId, text) => { const e = result(turn, callId, text); e.data.message.isError = true; return e; };

// ---- parser -----------------------------------------------------------------------------------

test('Antigravity-style result strings give +added/-removed and the path', () => {
  const p = LD().parseResultText('Made 1 replacement in C:\\Users\\alex\\proj\\dashboard_launch.py starting at line 1441 (+1/-1 lines).');
  assert.deepEqual({ a: p.added, r: p.removed, f: p.path }, { a: 1, r: 1, f: 'C:\\Users\\alex\\proj\\dashboard_launch.py' });
  const q = LD().parseResultText('Made 3 replacements in /home/me/a b/c.ts (+12/-0 lines).');
  assert.deepEqual({ a: q.added, r: q.removed, f: q.path }, { a: 12, r: 0, f: '/home/me/a b/c.ts' });
  assert.equal(LD().parseResultText('Wrote x (+7/\u22123 lines)').removed, 3, 'unicode minus');
  assert.equal(LD().parseResultText('Made 1 replacement (+1/-1 line)').added, 1, 'singular "line"');
});

test('strings without counts, or not strings, parse to null', () => {
  for (const t of ['The file x.js has been updated successfully.', '', 'Created file', null, undefined, 42, {}]) {
    assert.equal(LD().parseResultText(t), null, String(t));
  }
});

test('lineCount counts lines, not newlines', () => {
  const { lineCount } = LD();
  assert.equal(lineCount(''), 0);
  assert.equal(lineCount('a'), 1);
  assert.equal(lineCount('a\n'), 1);
  assert.equal(lineCount('a\nb'), 2);
  assert.equal(lineCount('a\r\nb\r\n\r\n'), 3);
  assert.equal(lineCount(null), 0);
});

test('diffCounts: replace, insert, delete, repeated lines, line endings', () => {
  const { diffCounts: d } = LD();
  assert.deepEqual(d('a\nb\nc', 'a\nB\nc'), { added: 1, removed: 1 });
  assert.deepEqual(d('a\nc', 'a\nb\nc'), { added: 1, removed: 0 });
  assert.deepEqual(d('a\nb\nc', 'a\nc'), { added: 0, removed: 1 });
  assert.deepEqual(d('x', 'x'), { added: 0, removed: 0 });
  assert.deepEqual(d('', 'a\nb'), { added: 2, removed: 0 });
  assert.deepEqual(d('a\nb', ''), { added: 0, removed: 2 });
  assert.deepEqual(d('a\na\na', 'a\na'), { added: 0, removed: 1 });
  assert.deepEqual(d('a\r\nb', 'a\nb'), { added: 0, removed: 0 }, 'CRLF is not a change');
  assert.deepEqual(d('1\n2\n3\n4\n5', '1\n3\n4\n5\n6'), { added: 1, removed: 1 });
});

test('diffCounts stays bounded on very large inputs', () => {
  const big = Array.from({ length: 6000 }, (_, i) => 'line ' + i).join('\n');
  const big2 = Array.from({ length: 6000 }, (_, i) => 'other ' + i).join('\n');
  const t0 = Date.now();
  const r = LD().diffCounts(big, big2);
  assert.ok(Date.now() - t0 < 1500, 'took ' + (Date.now() - t0) + 'ms');
  assert.deepEqual(r, { added: 6000, removed: 6000 });
});

test('statsFromDiffs reads dsh meta.diffs hunks (context lines cancel) and creations', () => {
  const { statsFromDiffs } = LD();
  const s = statsFromDiffs([{ path: '/p/a.js', oldText: 'x\nb\nc', newText: 'x\nB\nc' }, { path: '/p/a.js', oldText: null, newText: 'new1\nnew2' }]);
  assert.deepEqual(s, { added: 3, removed: 1 });
  assert.equal(statsFromDiffs([]), null);
  assert.equal(statsFromDiffs('nope'), null);
  assert.equal(statsFromDiffs([{ path: 1 }]), null);
});

test('statsFromCall derives counts from edit / write / str_replace_editor arguments', () => {
  const { statsFromCall: c } = LD();
  assert.deepEqual(c('edit', { file_path: '/a', old_string: 'a\nb', new_string: 'a\nB\nC' }), { added: 2, removed: 1, path: '/a' });
  assert.deepEqual(c('write', { file_path: '/a', content: '1\n2\n3\n' }), { added: 3, removed: 0, path: '/a' });
  assert.deepEqual(c('str_replace_editor', { command: 'create', path: '/b', file_text: 'x\ny' }), { added: 2, removed: 0, path: '/b' });
  assert.deepEqual(c('str_replace_editor', { command: 'str_replace', path: '/b', old_str: 'x', new_str: 'y\nz' }), { added: 2, removed: 1, path: '/b' });
  assert.deepEqual(c('str_replace_editor', { command: 'insert', path: '/b', insert_line: 2, new_str: 'q' }), { added: 1, removed: 0, path: '/b' });
  assert.equal(c('str_replace_editor', { command: 'view', path: '/b' }), null);
  assert.equal(c('bash', { command: 'ls' }), null);
  assert.equal(c('edit', { file_path: '/a' }), null, 'missing strings');
  assert.equal(c('edit', null), null);
});

// ---- aggregation ------------------------------------------------------------------------------

function run(events) {
  const CC = fresh();
  const store = CC.liveDiff.createStore();
  events.forEach((e) => store.ingest(e));
  return store;
}
const rows = (store) => plain(store.snapshot().files.map((f) => [f.path, f.added, f.removed, f.edits]));

test('edit results accumulate per file within a turn, in first-touched order', () => {
  const s = run([
    turnStart(1),
    call(1, 'c1', 'edit', { file_path: '/p/a.js', old_string: 'a', new_string: 'b\nc' }),
    result(1, 'c1', 'The file /p/a.js has been updated successfully.'),
    call(1, 'c2', 'write', { file_path: '/p/b.js', content: '1\n2\n3' }),
    result(1, 'c2', '<path>/p/b.js</path>\n<type>file</type>\n<content>\nCreated file\n</content>'),
    call(1, 'c3', 'edit', { file_path: '/p/a.js', old_string: 'c', new_string: 'd' }),
    result(1, 'c3', 'The file /p/a.js has been updated successfully.')
  ]);
  assert.deepEqual(rows(s), [['/p/a.js', 3, 2, 2], ['/p/b.js', 3, 0, 1]]);
  assert.deepEqual(plain(s.snapshot().totals), { added: 6, removed: 2, files: 2, edits: 3 });
});

test('result meta.diffs wins over arguments; recorded meta.path names the file', () => {
  const s = run([
    turnStart(1),
    call(1, 'c1', 'edit', { file_path: 'rel/a.js', old_string: 'zzz', new_string: 'yyy' }),
    result(1, 'c1', 'ok', { meta: { path: '/abs/rel/a.js', diffs: [{ path: 'rel/a.js', oldText: 'k\nb\nm', newText: 'k\nB\nB2\nm' }] } })
  ]);
  assert.deepEqual(rows(s), [['/abs/rel/a.js', 2, 1, 1]]);
});

test('a result string with counts wins over everything else, and needs no matching call', () => {
  const s = run([
    turnStart(2),
    result(2, 'x9', 'Made 1 replacement in C:\\w\\f.py starting at line 3 (+4/-2 lines).')
  ]);
  assert.deepEqual(rows(s), [['C:\\w\\f.py', 4, 2, 1]]);
});

test('failed results, reads and unknown tools add nothing', () => {
  const s = run([
    turnStart(1),
    call(1, 'c1', 'edit', { file_path: '/a', old_string: 'a', new_string: 'b' }),
    failed(1, 'c1', 'No replacement was performed'),
    call(1, 'c2', 'read', { file_path: '/a' }), result(1, 'c2', 'file text'),
    call(1, 'c3', 'bash', { command: 'sed -i s/a/b/ a' }), result(1, 'c3', 'done'),
    call(1, 'c4', 'edit', 'not json{'), result(1, 'c4', 'The file /a has been updated successfully.')
  ]);
  assert.deepEqual(rows(s), []);
  assert.equal(s.snapshot().totals.files, 0);
});

test('replayed events (history reload) never double count; a new turn starts a fresh list', () => {
  const a = [turnStart(1), call(1, 'c1', 'write', { file_path: '/a', content: 'x\ny' }), result(1, 'c1', 'Created file')];
  const s = run([...a, ...a]);
  assert.deepEqual(rows(s), [['/a', 2, 0, 1]]);
  s.ingest(turnStart(2));
  assert.deepEqual(rows(s), [], 'new turn clears');
  assert.equal(s.snapshot().turn, 2);
  s.ingest(call(2, 'c1', 'write', { file_path: '/z', content: 'q' })); // same callId text, new turn: counted
  s.ingest(result(2, 'c1', 'Created file'));
  assert.deepEqual(rows(s), [['/z', 1, 0, 1]]);
});

test('subscribers hear every change; unsubscribe stops it; one bad listener cannot break ingest', () => {
  const CC = fresh();
  const store = CC.liveDiff.createStore();
  const seen = [];
  const off = store.subscribe((snap) => seen.push(snap.totals.added));
  store.subscribe(() => { throw new Error('listener bug'); });
  store.ingest(turnStart(1));
  store.ingest(call(1, 'c', 'write', { file_path: '/a', content: '1' }));
  store.ingest(result(1, 'c', 'ok'));
  assert.deepEqual(plain(seen), [0, 1]);
  off();
  store.ingest(call(1, 'd', 'write', { file_path: '/b', content: '1' }));
  store.ingest(result(1, 'd', 'ok'));
  assert.deepEqual(seen, [0, 1]);
});

test('garbage events are ignored', () => {
  const s = run([null, undefined, 5, {}, { type: 'tool/result' }, { type: 'tool/result', data: {} },
    { type: 'tool/call', data: { callId: 1 } }, ev('tool/result', { message: { content: 'text only', source: {} } })]);
  assert.deepEqual(rows(s), []);
});

// ---- dsh event Definition ---------------------------------------------------------------------

test('Definition matches only turn/start, tool/call and tool/result and folds them into the shared store', () => {
  const CC = fresh();
  const def = CC.liveDiffDefinition;
  assert.equal(def.kind, 'cc-live-diff');
  assert.equal(def.target, undefined, 'state-only: publishes no transcript node');
  assert.equal(def.match(ev('assistant/message', {})), null);
  assert.equal(def.match(ev('step/start', { turn: 1 })), null);
  const m = def.match(turnStart(7));
  assert.deepEqual({ id: m.id, role: m.role }, { id: '7', role: 'start' });
  assert.equal(def.match(call(7, 'c', 'edit', {})).role, 'update');
  assert.equal(def.match(result(7, 'c', 't')).role, 'update');
  const events = [turnStart(7), call(7, 'c', 'write', { file_path: '/f', content: 'a\nb' }), result(7, 'c', 'ok')];
  let state = def.start({ state: undefined }, { event: events[0], role: 'start' });
  for (const e of events.slice(1)) state = def.update({ state }, { event: e, role: 'update' });
  assert.deepEqual(plain(CC.liveDiffStore.snapshot().files.map((f) => [f.path, f.added, f.removed])), [['/f', 2, 0]]);
  assert.equal(state.turn, 7);
});

test('replacement surface events are not counted twice (only append-origin tool results)', () => {
  const CC = fresh();
  const def = CC.liveDiffDefinition;
  const r = result(1, 'c1', 'Made 1 replacement in /a (+1/-1 lines).');
  r.surfaceOp = { op: 'replace', startSeq: 1, endSeq: 2 };
  assert.equal(def.match(r), null);
  r.surfaceOp = 'append';
  assert.ok(def.match(r));
});

// ---- panel ------------------------------------------------------------------------------------

const panelOf = (CC) => render(CC.h(CC.LiveDiffPanel, {}));

test('panel: empty state is one quiet line', () => {
  const CC = fresh();
  const t = textOf(panelOf(CC));
  assert.match(t, /No edits yet/);
  assert.ok(t.length < 80, t);
});

test('panel lists each file with +added and -removed, a totals line, path tail muted', () => {
  const CC = fresh();
  [turnStart(1),
    call(1, 'a', 'edit', { file_path: 'C:\\proj\\src\\app.js', old_string: 'a', new_string: 'b\nc' }), result(1, 'a', 'ok'),
    call(1, 'b', 'write', { file_path: '/home/me/notes.md', content: '1\n2\n3' }), result(1, 'b', 'ok')
  ].forEach((e) => CC.liveDiffStore.ingest(e));
  const tree = panelOf(CC);
  const t = textOf(tree);
  assert.match(t, /app\.js/);
  assert.match(t, /notes\.md/);
  assert.match(t, /\+2/);
  assert.match(t, /\u22121/);
  assert.match(t, /\+3/);
  assert.match(t, /2 files/);
  assert.match(t, /\+5/);
  const rowsFound = findAll(tree, (n) => n.props && n.props['data-cc-live-row']);
  assert.equal(rowsFound.length, 2);
  assert.equal(rowsFound[0].props['data-cc-live-row'], 'C:\\proj\\src\\app.js');
  const added = findAll(tree, (n) => n.props && n.props['data-cc-live'] === 'added');
  assert.ok(added.every((n) => /done|green/.test(JSON.stringify(n.props.style))), 'added uses the done status colour token');
});

test('panel markup follows the UI rules: tokens only, no gradients, glows or !important', () => {
  const src = fs.readFileSync(path.join(SRC, 'live_diff.js'), 'utf8');
  assert.ok(!/gradient|box-shadow|boxShadow|text-shadow|drop-shadow|blur\(|!important/i.test(src));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\/.*$/gm, '')), 'no raw hex colours');
  assert.ok(!/\brgba?\(|\bhsla?\(/i.test(src));
});

test('no model calls and no network in the module', () => {
  const src = fs.readFileSync(path.join(SRC, 'live_diff.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/\bfetch\s*\(|XMLHttpRequest|EventSource|WebSocket|CC\.api/.test(src));
});

// ---- wiring -----------------------------------------------------------------------------------

function recorder(opts) {
  const o = opts || {};
  const rec = { definitions: [], tabTypes: [], registers: [], injects: [], effects: 0 };
  rec.ctx = {
    effect(fn) { rec.effects++; return fn(); },
    slots: {
      inject(key, cb) { rec.injects.push(key); cb(); return () => {}; },
      register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
    }
  };
  if (!o.noConversation) rec.ctx.uiConversation = { events: { register(def) { rec.definitions.push(def); return () => {}; } } };
  if (!o.noTabs) rec.ctx.sidebarRightTabs = { register(def) { if (o.tabsThrow) throw new Error('boom'); rec.tabTypes.push(def); return () => {}; } };
  return rec;
}
function captureWarns(fn) {
  const warns = [];
  const orig = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  try { fn(); } finally { console.warn = orig; }
  return warns;
}

test('apply registers the event Definition, a right-sidebar tab type with a guide entry, and its body', () => {
  const CC = fresh({ React: Object.assign(makeReact(), { Component }) });
  const rec = recorder();
  const warns = captureWarns(() => CC.applyLiveDiff(rec.ctx));
  assert.deepEqual(warns, []);
  assert.deepEqual(rec.definitions, [CC.liveDiffDefinition]);
  assert.equal(rec.tabTypes.length, 2, 'the tab type plus the pre-rename id');
  const t = rec.tabTypes[0];
  assert.equal(t.kind, 'cc-live-diff');
  assert.equal(t.id, '@waypoint/dsh-plugin/live-diff');
  assert.equal(typeof t.title(), 'string');
  assert.ok(t.title().length > 0 && t.title().length <= 24);
  assert.equal(t.guide.length, 1);
  assert.equal(typeof t.guide[0].title(), 'string');
  const old = rec.tabTypes[1];
  assert.equal(old.id, '@waypoint/dsh-control-centre/live-diff', 'a saved sidebar with the old id still resolves');
  assert.equal(old.kind, 'cc-live-diff');
  assert.equal(old.guide.length, 0, 'the + menu lists Changes once');
  const bodies = rec.registers.filter((r) => r.spec.name === 'sidebar.right.pane.tab');
  assert.deepEqual(bodies.map((b) => b.spec.key), [t.id, old.id], 'a body for each id');
  assert.ok(bodies.every((b) => typeof b.comp === 'function'));
});

test('apply degrades quietly: missing services, throwing registries, no ctx', () => {
  const CC = fresh();
  let w = captureWarns(() => assert.doesNotThrow(() => CC.applyLiveDiff(recorder({ noConversation: true, noTabs: true }).ctx)));
  assert.ok(w.length <= 1 && w.every((x) => x.startsWith('[waypoint] ')), w.join('|'));
  w = captureWarns(() => assert.doesNotThrow(() => CC.applyLiveDiff(recorder({ tabsThrow: true }).ctx)));
  assert.ok(w.length >= 1 && w.every((x) => x.startsWith('[waypoint] ')));
  assert.doesNotThrow(() => captureWarns(() => CC.applyLiveDiff(undefined)));
  assert.doesNotThrow(() => captureWarns(() => CC.applyLiveDiff({})));
});

test('apply is part of CC.apply only through app.js; live_diff.js alone never touches dsh at load', () => {
  const CC = loadCC(['live_diff.js']);
  assert.equal(typeof CC.applyLiveDiff, 'function');
  assert.equal(typeof CC.liveDiff.parseResultText, 'function');
});

done('live_diff');
