// Host half of Waypoint for dsh: runs once inside the dsh host when dsh starts.
// Its one job: make sure the Waypoint server (Waypoint Core's runner/waypoint_runner/wpc_http.py, 127.0.0.1:8762)
// is running, so the Waypoint tabs have live data for any user, with no extra start step.
// It never throws into dsh: every failure is one console line, and dsh starts as before.
//   WAYPOINT_SERVER=off          do not start it (you run it yourself)
//   WAYPOINT_CORE=<folder>       Waypoint Core (the folder holding runner/); else core_dir in ~/.waypoint/config.json,
//                                else the repository this plugin sits in (a source checkout)
//   WAYPOINT_PYTHON=<python>     the Python to use; else python in ~/.waypoint/config.json, else py -3 / python3
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORT = 8762;
const PLUGIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.join('runner', 'waypoint_runner', 'wpc_http.py');

function settings(home) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(home, '.waypoint', 'config.json'), 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch (e) { return {}; }
}

/** The Waypoint Core folder that holds the server, or null. */
export function findCore({ env = process.env, home = os.homedir(), pluginDir = PLUGIN_DIR, exists = fs.existsSync } = {}) {
  const tries = [env.WAYPOINT_CORE, settings(home).core_dir, path.resolve(pluginDir, '..')].filter(Boolean);
  for (const dir of tries) if (exists(path.join(dir, SERVER))) return path.resolve(dir);
  return null;
}

/** The command that starts the server: {cmd, args, cwd}. */
export function serverCommand(core, { env = process.env, home = os.homedir(), platform = process.platform } = {}) {
  const py = env.WAYPOINT_PYTHON || settings(home).python;
  const base = py ? [py] : platform === 'win32' ? ['py', '-3'] : ['python3'];
  return { cmd: base[0], args: base.slice(1).concat(['-m', 'waypoint_runner.wpc_http', '--port', String(PORT)]),
    cwd: path.join(core, 'runner') };
}

export function portOpen(port = PORT, host = '127.0.0.1', timeout = 400) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    const done = (v) => { s.destroy(); resolve(v); };
    s.setTimeout(timeout, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

/** Start the server unless it runs already or is switched off. Resolves to what happened (for tests and logs). */
export async function ensureServer({ env = process.env, home = os.homedir(), pluginDir = PLUGIN_DIR,
  isOpen = portOpen, run = spawn, log = (m) => console.log('[waypoint] ' + m) } = {}) {
  if (String(env.WAYPOINT_SERVER || '').toLowerCase() === 'off') return 'off';
  if (await isOpen(PORT)) return 'running';
  const core = findCore({ env, home, pluginDir });
  if (!core) { log('Waypoint Core not found: set WAYPOINT_CORE to the folder that holds runner/, then restart dsh.'); return 'no-core'; }
  const c = serverCommand(core, { env, home });
  const child = run(c.cmd, c.args, { cwd: c.cwd, detached: true, stdio: 'ignore', windowsHide: true, env });
  if (child && typeof child.on === 'function') child.on('error', (e) => log('server did not start: ' + (e && e.message)));
  if (child && typeof child.unref === 'function') child.unref();
  log('started the Waypoint server on 127.0.0.1:' + PORT + ' (' + c.cmd + ' in ' + c.cwd + ').');
  return 'started';
}

export function apply() {
  try { ensureServer().catch((e) => console.warn('[waypoint] server check skipped: ' + (e && e.message))); }
  catch (e) { try { console.warn('[waypoint] server check skipped: ' + (e && e.message)); } catch (_) { /* never into dsh */ } }
}
