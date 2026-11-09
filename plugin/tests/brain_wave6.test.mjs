// brain_wave6.test.mjs - Waypoint v3 wave 6, Brain review items: skill names in sentence case
// (id in the tooltip), "Indexed 23:25" stamp, constellation labels in regular weight, one per cluster.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCC, test, done, SRC } from './harness.mjs';

const CC = loadCC(['tokens.js', 'page_brain.js', 'view_star.js', 'page_learn.js']);
const src = fs.readFileSync(path.join(SRC, 'page_brain.js'), 'utf8');

test('skill ids read as sentence case names; other notes are untouched', () => {
  assert.equal(CC.brainNoteName({ kind: 'skill', label: 'bounded-task-packets' }), 'Bounded task packets');
  assert.equal(CC.brainNoteName({ kind: 'skill', label: 'codex-quota-guard' }), 'Codex quota guard');
  assert.equal(CC.brainNoteName({ kind: 'skill', label: 'eval_gate' }), 'Eval gate');
  assert.equal(CC.brainNoteName({ kind: 'preference', label: 'keep-this-id' }), 'keep-this-id');
});

test('the indexed stamp is a time today and a short date otherwise', () => {
  const now = new Date(2026, 10, 4, 23, 40);
  assert.equal(CC.brainStamp('2026-11-04T23:25:10', now), '23:25');
  assert.equal(CC.brainStamp('2026-11-03T09:05:00', now), '3 Nov 09:05');
  assert.equal(CC.brainStamp('2026-11-04 23:25', now), '23:25');
});

test('the header shows the short stamp with the full time in the tooltip', () => {
  assert.match(src, /stamp\(built\)/);
  assert.match(src, /fullStamp\(built\)/);
});

test('constellation labels are regular weight and named by cluster, notes on hover', () => {
  assert.match(src, /\.cc-brain \.cc-t-label\{font-weight:400;\}/);
  assert.match(src, /labelMode: 'regions'/);
});
done();
