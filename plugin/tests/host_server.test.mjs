// host_server.test.mjs - the plugin's host half starts the Waypoint server with dsh, for any user (dsh-v2 s-start).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureServer, findCore, serverCommand, PORT, apply } from '../lib/index.js';

function core(dir) {
  fs.mkdirSync(path.join(dir, 'runner', 'waypoint_runner'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'runner', 'waypoint_runner', 'wpc_http.py'), '');
  return dir;
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wp-host-'));

test('start: finds Core from WAYPOINT_CORE, then settings core_dir, then the source checkout', () => {
  const home = tmp(), a = core(tmp()), b = core(tmp());
  assert.equal(findCore({ env: { WAYPOINT_CORE: a }, home, pluginDir: '/nowhere/plugin' }), path.resolve(a));
  fs.mkdirSync(path.join(home, '.waypoint'));
  fs.writeFileSync(path.join(home, '.waypoint', 'config.json'), JSON.stringify({ core_dir: b }));
  assert.equal(findCore({ env: {}, home, pluginDir: '/nowhere/plugin' }), path.resolve(b));
  assert.equal(findCore({ env: {}, home: tmp(), pluginDir: path.join(a, 'plugin') }), path.resolve(a));
  assert.equal(findCore({ env: {}, home: tmp(), pluginDir: path.join(tmp(), 'plugin') }), null);
});

test('start: command uses WAYPOINT_PYTHON, else py -3 on Windows and python3 elsewhere', () => {
  const home = tmp();
  assert.deepEqual(serverCommand('/c', { env: { WAYPOINT_PYTHON: '/py' }, home }).args, ['-m', 'waypoint_runner.wpc_http', '--port', String(PORT)]);
  assert.equal(serverCommand('/c', { env: { WAYPOINT_PYTHON: '/py' }, home }).cmd, '/py');
  assert.deepEqual([serverCommand('/c', { env: {}, home, platform: 'win32' }).cmd, serverCommand('/c', { env: {}, home, platform: 'win32' }).args[0]], ['py', '-3']);
  assert.equal(serverCommand('/c', { env: {}, home, platform: 'linux' }).cmd, 'python3');
  assert.equal(serverCommand('/c', { env: {}, home }).cwd, path.join('/c', 'runner'));
});

test('start: spawns once, detached, only when the port is free and Core is found', async () => {
  const c = core(tmp());
  const runs = [], logs = [];
  const run = (cmd, args, opts) => { runs.push({ cmd, args, opts }); return { on() {}, unref() {} }; };
  const base = { env: { WAYPOINT_CORE: c, WAYPOINT_PYTHON: 'py' }, home: tmp(), run, log: (m) => logs.push(m) };
  assert.equal(await ensureServer({ ...base, isOpen: async () => true }), 'running');
  assert.equal(await ensureServer({ ...base, env: { ...base.env, WAYPOINT_SERVER: 'off' }, isOpen: async () => false }), 'off');
  assert.equal(runs.length, 0);
  assert.equal(await ensureServer({ ...base, isOpen: async () => false }), 'started');
  assert.equal(runs.length, 1);
  assert.equal(runs[0].opts.detached, true);
  assert.equal(runs[0].opts.cwd, path.join(c, 'runner'));
  assert.equal(await ensureServer({ ...base, env: {}, pluginDir: path.join(tmp(), 'plugin'), isOpen: async () => false }), 'no-core');
  assert.match(logs.at(-1), /WAYPOINT_CORE/);
});

test('start: apply never throws into dsh', () => {
  const prev = process.env.WAYPOINT_SERVER;
  process.env.WAYPOINT_SERVER = 'off';
  try { assert.doesNotThrow(() => apply()); } finally { if (prev === undefined) delete process.env.WAYPOINT_SERVER; else process.env.WAYPOINT_SERVER = prev; }
});
