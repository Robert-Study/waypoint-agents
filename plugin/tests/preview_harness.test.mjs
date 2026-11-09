// The preview harness serves the shell page, the bundle and fixture answers (no browser, no network).
// Starts plugin/tools/preview.mjs on a free port with --offline (never downloads React) and
// --no-build when lib/client.js already exists, checks a handful of routes, then stops it.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = join(PLUGIN, 'tools', 'preview.mjs');
let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  (' + detail + ')'));
  if (!ok) failed++;
}

// A tiny fixtures file of our own, so the test does not depend on the recorded demo data.
const dir = mkdtempSync(join(tmpdir(), 'wp-preview-test-'));
const fixtures = join(dir, 'fixtures.json');
writeFileSync(fixtures, JSON.stringify({ responses: { '/api/todos': { todos: [], counts: { open: 0 } },
  '/api/board?project=demo': { project: 'demo', nodes: [] } } }));

const args = [TOOL, '--port', '0', '--offline', '--fixtures', fixtures];
if (existsSync(join(PLUGIN, 'lib', 'client.js'))) args.push('--no-build');
const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
child.stdout.on('data', d => { out += d; });
child.stderr.on('data', d => { out += d; });

try {
  const base = await new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(new Error('server did not start: ' + out)), 60000);
    child.stdout.on('data', () => { const m = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(out); if (m) { clearTimeout(timer); ok(m[1]); } });
    child.on('exit', code => { clearTimeout(timer); fail(new Error('server exited ' + code + ': ' + out)); });
  });

  let r = await fetch(base + '/');
  let t = await r.text();
  check('/ returns the shell HTML', r.status === 200 && /text\/html/.test(r.headers.get('content-type')) && t.includes('/lib/client.js') && t.includes('id="pv-root"'));
  check('shell page swaps the live engine address for /engine', t.includes("'/engine'"));

  r = await fetch(base + '/lib/client.js');
  t = await r.text();
  check('/lib/client.js returns the bundle', r.status === 200 && /javascript/.test(r.headers.get('content-type')) && t.includes('__ModuleLoader__'));

  r = await fetch(base + '/frame.js');
  check('/frame.js is served', r.status === 200 && (await r.text()).includes('__ModuleLoader__'));

  r = await fetch(base + '/engine/api/todos');
  let j = await r.json();
  check('a fixture path returns its JSON', r.status === 200 && Array.isArray(j.todos));

  r = await fetch(base + '/engine/api/board?project=demo');
  j = await r.json();
  check('a fixture key with a query matches exactly', r.status === 200 && j.project === 'demo');

  r = await fetch(base + '/engine/api/todos?archived=1');
  j = await r.json();
  check('a query falls back to the bare path', r.status === 200 && Array.isArray(j.todos));

  r = await fetch(base + '/engine/api/nothing-here');
  j = await r.json();
  check('a missing fixture returns 404 JSON', r.status === 404 && j.error === 'no_fixture');

  r = await fetch(base + '/__missing');
  j = await r.json();
  check('/__missing lists it', Array.isArray(j.missing) && j.missing.includes('/api/nothing-here'));

  r = await fetch(base + '/engine/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":"x"}' });
  j = await r.json();
  check('a POST returns ok', r.status === 200 && j.ok === true);

  const ac = new AbortController();
  r = await fetch(base + '/engine/api/stream', { signal: ac.signal });
  check('/engine/api/stream is an event stream', r.status === 200 && /text\/event-stream/.test(r.headers.get('content-type')));
  ac.abort();
} catch (e) {
  check('harness run', false, e && e.message ? e.message : String(e));
} finally {
  child.kill();
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ }
}
console.log(failed ? `preview_harness: ${failed} failing` : 'preview_harness: all passed');
process.exit(failed ? 1 : 0);
