// Waypoint for dsh test runner. Plain Node, no packages.
// Runs every tests/*.test.mjs one at a time (a child process each, 60 s timeout), then every
// tests/py/test_*.py with pytest (one file at a time), prints one line per file and a summary.
// Exit 1 on any failure.
//
//   node tools/test.mjs                    node tests, then python tests
//   node tools/test.mjs --python python    use this python for the python tests (CI)
//   node tools/test.mjs --node-only        node tests only
//   node tools/test.mjs --only app_guard   files whose name contains this text
//
// Python choice: --python, else WAYPOINT_PYTHON, else "python" in ~/.waypoint/config.json, else (inside the
// Waypoint repo on Windows) the interpreter scripts/waypoint_config.ps1 pins, else python3 / python on PATH.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const nodeOnly = argv.includes('--node-only');
const only = opt('--only');
const NODE_TIMEOUT = 60_000;
const PY_TIMEOUT = 600_000;

const results = [];
function record(kind, file, ok, ms, detail) {
  results.push({ kind, file, ok });
  const tail = detail ? '  ' + detail : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${kind.padEnd(6)} ${file}  (${(ms / 1000).toFixed(1)} s)${tail}`);
}
function lastLine(text) {
  const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1].slice(0, 200) : '';
}

// ---- node tests
const testsDir = join(root, 'tests');
const nodeTests = readdirSync(testsDir).filter(f => f.endsWith('.test.mjs') && (!only || f.includes(only))).sort();
for (const f of nodeTests) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(testsDir, f)], { cwd: root, encoding: 'utf8', timeout: NODE_TIMEOUT, maxBuffer: 64 * 1024 * 1024 });
  const ms = Date.now() - t0;
  if (r.error && r.error.code === 'ETIMEDOUT') record('node', f, false, ms, 'timed out after 60 s');
  else if (r.status !== 0) {
    record('node', f, false, ms, 'exit ' + r.status);
    const out = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).filter(l => /FAIL|Error|assert/i.test(l)).slice(0, 8);
    for (const l of out) console.log('        ' + l.slice(0, 240));
  } else record('node', f, true, ms, lastLine(r.stdout));
}

// ---- python tests
function works(py) {
  if (!py) return false;
  const r = spawnSync(py, ['-c', 'import pytest, sys; print(sys.version_info[0])'], { encoding: 'utf8', timeout: 30_000 });
  return r.status === 0 && /3/.test(r.stdout || '');
}
function pickPython() {
  const given = opt('--python');
  if (given) return given;
  if (process.env.WAYPOINT_PYTHON) return process.env.WAYPOINT_PYTHON;
  try {
    const cfg = JSON.parse(readFileSync(process.env.WAYPOINT_CONFIG || join(homedir(), '.waypoint', 'config.json'), 'utf8'));
    if (cfg && typeof cfg.python === 'string' && cfg.python) return cfg.python;
  } catch { /* no settings file */ }
  const helper = join(root, '..', 'scripts', 'waypoint_config.ps1');
  if (process.platform === 'win32' && existsSync(helper)) {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', `. '${helper.replace(/'/g, "''")}'; Get-WaypointPython`], { encoding: 'utf8', timeout: 30_000 });
    const p = (r.stdout || '').trim().split(/\r?\n/).pop();
    if (r.status === 0 && p && existsSync(p)) return p;
  }
  for (const c of ['python3', 'python']) if (works(c)) return c;
  return null;
}

const pyDir = join(testsDir, 'py');
const pyTests = !nodeOnly && existsSync(pyDir)
  ? readdirSync(pyDir).filter(f => /^test_.*\.py$/.test(f) && (!only || f.includes(only))).sort() : [];
if (pyTests.length) {
  const py = pickPython();
  if (!py || !works(py)) {
    for (const f of pyTests) record('python', f, false, 0, `no python with pytest found (${py || 'none'}); pass --python <path>`);
  } else {
    console.log(`python: ${py}`);
    for (const f of pyTests) {
      const t0 = Date.now();
      const r = spawnSync(py, ['-m', 'pytest', '-q', '-p', 'no:cacheprovider', join('tests', 'py', f)],
        { cwd: root, encoding: 'utf8', timeout: PY_TIMEOUT, maxBuffer: 64 * 1024 * 1024 });
      const ms = Date.now() - t0;
      if (r.error && r.error.code === 'ETIMEDOUT') record('python', f, false, ms, 'timed out');
      else {
        record('python', f, r.status === 0, ms, lastLine(r.stdout));
        if (r.status !== 0) for (const l of (r.stdout || '').split(/\r?\n/).filter(l => /^(FAILED|ERROR)/.test(l)).slice(0, 8)) console.log('        ' + l.slice(0, 240));
      }
    }
  }
}

const failed = results.filter(r => !r.ok);
const count = (k) => results.filter(r => r.kind === k).length;
console.log(`\ntests: ${results.length - failed.length}/${results.length} files passed (node ${count('node')}, python ${count('python')})` +
  (failed.length ? `; FAILED: ${failed.map(r => r.file).join(', ')}` : ''));
process.exit(failed.length ? 1 : 0);
