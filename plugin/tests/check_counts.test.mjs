// check_counts.test.mjs [C10] - per-node check counts, "blocked by a failing check", Flow badge, Inspector line.
// Board nodes carry `checks: [passed, failed, last]` (last 'pass'|'fail'|null) or null when the
// check has never run. Without the field (older engine) counts fall back to status + actor.
import assert from 'node:assert/strict';
import { loadCC, render, findAll, hasClass, textOf, test, done } from './harness.mjs';

const N = (id, deps = [], extra = {}) => Object.assign({ id, title: 'Task ' + id, deps, status: 'not_started' }, extra);

const CC = loadCC(['tokens.js', 'check_counts.js', 'layout_flow.js', 'waves.js', 'view_flow.js']);

// ---------------------------------------------------------------- counts
test('checkCounts reads the engine row field [passed, failed, last]', () => {
  const c = CC.checkCounts(N('A', [], { checks: [2, 1, 'pass'] }));
  assert.equal(c.passed, 2); assert.equal(c.failed, 1); assert.equal(c.runs, 3);
  assert.equal(c.pending, 0); assert.equal(c.last, 'pass');
  const f = CC.checkCounts(N('B', [], { checks: [0, 2, 'fail'] }));
  assert.equal(f.passed, 0); assert.equal(f.failed, 2); assert.equal(f.last, 'fail'); assert.equal(f.pending, 0);
});

test('checkCounts: never run (null) is pending, not failed', () => {
  const c = CC.checkCounts(N('A', [], { checks: null, status: 'error', actor: 'check:command' }));
  assert.deepEqual([c.passed, c.failed, c.runs, c.pending, c.last], [0, 0, 0, 1, null]);
});

test('checkCounts accepts the object form too', () => {
  const c = CC.checkCounts(N('A', [], { checks: { passed: 1, failed: 0, last: 'pass' } }));
  assert.deepEqual([c.passed, c.failed, c.pending, c.last], [1, 0, 0, 'pass']);
});

test('checkCounts falls back to status + check actor when the board has no checks field', () => {
  const fail = CC.checkCounts(N('A', [], { status: 'error', actor: 'check:command' }));
  assert.deepEqual([fail.passed, fail.failed, fail.last], [0, 1, 'fail']);
  const pass = CC.checkCounts(N('B', [], { status: 'done', actor: 'check:files_exist' }));
  assert.deepEqual([pass.passed, pass.failed, pass.last], [1, 0, 'pass']);
  // The owner marking done is not a check result; neither is an error from a dispatcher.
  assert.equal(CC.checkCounts(N('C', [], { status: 'done', actor: 'owner' })).pending, 1);
  assert.equal(CC.checkCounts(N('D', [], { status: 'error', actor: 'dispatch:claude_code' })).pending, 1);
  assert.equal(CC.checkCounts(N('E')).pending, 1);
});

test('unpackBoard: a short row (check never ran) reads checks as null, i.e. pending', () => {
  const A = loadCC(['tokens.js', 'check_counts.js', 'api.js']);
  const b = A.unpackBoard({ fields: ['id', 'status', 'actor', 'checks'],
    nodes: [['A', 'error', 'check:command', [0, 1, 'fail']], ['B', 'error', 'check:command']] });
  assert.equal(b.nodes[1].checks, null);
  assert.equal(A.checkCounts(b.nodes[1]).pending, 1);
  assert.equal(A.checkCounts(b.nodes[0]).last, 'fail');
});

// ---------------------------------------------------------------- blocking
// A fails -> B -> C are blocked; E (done) shields F; H failed but the owner marked it done.
const board = {
  nodes: [
    N('A', [], { status: 'error', checks: [0, 1, 'fail'] }),
    N('B', ['A']),
    N('C', ['B']),
    N('D', [], { status: 'done', checks: [1, 0, 'pass'] }),
    N('E', ['A'], { status: 'done', checks: [1, 0, 'pass'] }),
    N('F', ['E']),
    N('H', [], { status: 'done', actor: 'owner', checks: [0, 1, 'fail'] }),
    N('G', ['H', 'D']),
    N('R', [], { status: 'running', checks: [0, 1, 'fail'] }),   // retrying after a failed check
    N('S', ['R'])
  ],
  edges: [['A', 'B'], ['B', 'C'], ['A', 'E'], ['E', 'F'], ['H', 'G'], ['D', 'G'], ['R', 'S']]
};

test('blockedByFailedCheck marks direct and transitive dependants of a failing check', () => {
  const b = CC.blockedByFailedCheck(board);
  assert.deepEqual(b.B, ['A']);
  assert.deepEqual(b.C, ['A']);
  assert.deepEqual(b.S, ['R'], 'a node retrying after a failed check still blocks');
});

test('blockedByFailedCheck: done nodes are neither blocked nor pass the block on; owner-done clears it', () => {
  const b = CC.blockedByFailedCheck(board);
  assert.equal(b.E, undefined);
  assert.equal(b.F, undefined);
  assert.equal(b.G, undefined);
  assert.equal(b.A, undefined, 'the failing node itself is failing, not blocked');
  assert.equal(b.D, undefined);
});

test('blockedByFailedCheck takes a plain node list and tolerates cycles / missing deps', () => {
  const b = CC.blockedByFailedCheck([N('X', ['Y'], { checks: [0, 1, 'fail'] }), N('Y', ['X']), N('Z', ['missing'])]);
  assert.deepEqual(b.Y, ['X']);
  assert.equal(b.Z, undefined);
});

test('checkLine gives one plain sentence for the Inspector', () => {
  assert.equal(CC.checkLine(CC.checkCounts(N('A', [], { checks: null }))), 'Check not run yet');
  assert.equal(CC.checkLine(CC.checkCounts(N('A', [], { checks: [2, 1, 'pass'] }))), 'Check passing · 2 of 3 runs passed');
  assert.equal(CC.checkLine(CC.checkCounts(N('A', [], { checks: [0, 1, 'fail'] }))), 'Check failing · 0 of 1 run passed');
  assert.equal(CC.blockedLine(['A', 'R']), 'Blocked: the check on A, R is failing');
  assert.equal(CC.blockedLine([]), null);
});

// ---------------------------------------------------------------- Flow render
const tree = render(CC.h(CC.FlowView, { board, filter: 'all', selected: null, onSelect: () => {} }));
const nodeEl = (id) => findAll(tree, (n) => n.props['data-id'] === id)[0];
const badge = (id) => findAll(nodeEl(id), hasClass('cc-check'))[0];

test('Flow: badge shows passed/runs with a pass or fail mark', () => {
  const a = badge('A');
  assert.ok(a, 'failing node has a badge');
  assert.ok(hasClass('cc-check-fail')(a));
  assert.equal(textOf(a), '✕ 0/1');
  const d = badge('D');
  assert.ok(hasClass('cc-check-pass')(d));
  assert.equal(textOf(d), '✓ 1/1');
});

test('Flow: a never-run check draws no badge (calm), but says so on hover', () => {
  assert.equal(badge('C'), undefined);
  assert.match(textOf(findAll(nodeEl('C'), (n) => n.type === 'title')[0]), /check not run yet/);
});

test('Flow: dependants of a failing check are marked blocked and say by what', () => {
  const b = nodeEl('B');
  assert.ok(hasClass('cc-blocked')(b));
  assert.ok(hasClass('cc-blocked')(nodeEl('C')));
  assert.ok(hasClass('cc-blocked')(nodeEl('S')));
  assert.ok(!hasClass('cc-blocked')(nodeEl('F')));
  assert.ok(!hasClass('cc-blocked')(nodeEl('G')));
  assert.match(textOf(findAll(b, hasClass('cc-t-meta'))[0]), /Blocked/);
  assert.match(textOf(findAll(b, (n) => n.type === 'title')[0]), /Blocked: the check on A is failing/);
});

test('Flow: edges out of a failing check are drawn as blocked', () => {
  const edges = findAll(tree, hasClass('cc-edge'));
  assert.equal(edges.length, board.edges.length);
  const blocked = edges.filter(hasClass('cc-edge-blocked')).map((e) => e.key);
  assert.equal(blocked.length, 3, 'A>B, B>C and R>S');
});

test('tokens: blocked + badge styles use existing tokens only', () => {
  for (const sel of ['.cc-check-fail', '.cc-check-pass', '.cc-blocked', '.cc-edge-blocked']) assert.ok(CC.css.includes(sel), sel);
  const rules = CC.css.split('\n').filter((l) => /cc-check-(pass|fail)|cc-blocked/.test(l)).join('\n');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(rules), 'no raw colours');
  assert.ok(/var\(--cc-error\)/.test(rules));
});

// ---------------------------------------------------------------- Inspector
const detail = { node: { id: 'B', title: 'Task B', goal: 'g', status: 'not_started', deps: ['A'], check: { type: 'command', run: 'exit 0' }, checks: [1, 2, 'fail'] }, events: [] };
const PC = loadCC(['tokens.js', 'check_counts.js', 'page_create.js'], { useEngine: () => ({ data: detail }) });

test('Inspector check summary shows the counts and the block', () => {
  const t = render(PC.h(PC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 1, blockedBy: ['A'], toast: () => {}, onClose: () => {} }));
  const line = findAll(t, hasClass('cc-check-line'));
  assert.equal(line.length, 1);
  assert.equal(textOf(line[0]), 'Check failing · 1 of 3 runs passed');
  const bl = findAll(t, hasClass('cc-blocked-line'));
  assert.equal(bl.length, 1);
  assert.equal(textOf(bl[0]), 'Blocked: the check on A is failing');
});

test('Inspector: no block line when nothing upstream is failing', () => {
  const t = render(PC.h(PC.createHelpers.Inspector, { project: 'p', id: 'B', revision: 1, toast: () => {}, onClose: () => {} }));
  assert.equal(findAll(t, hasClass('cc-blocked-line')).length, 0);
  assert.equal(findAll(t, hasClass('cc-check-line')).length, 1);
});

done('check_counts');
