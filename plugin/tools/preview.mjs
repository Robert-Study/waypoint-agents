// Waypoint preview harness: render the plugin from THIS checkout in a stand-in dsh frame, with
// neutral demo data, and take light/dark screenshots. Plain Node, no packages.
//
//   node plugin/tools/preview.mjs                       serve http://127.0.0.1:8790 (fixtures mode)
//     --port N             port (0 = any free port; the real one is printed)
//     --fixtures FILE      answers for /engine/* (default plugin/tools/preview/fixtures.json)
//     --engine URL         proxy /engine/* to a real engine instead (e.g. http://127.0.0.1:8761)
//     --no-build           do not rebuild plugin/lib/client.js first
//     --offline            never download React (the shell page is still served without it)
//     --log-requests FILE  write every /engine request seen to FILE (on exit / when shots finish)
//     --wpc-fixtures FILE  answers for the Waypoint server (CC.wpc, 127.0.0.1:8762), served at /wpc
//                          (default plugin/tools/preview/wpc_fixtures.json; regenerate it with
//                          node plugin/tools/preview/make_wpc_fixtures.mjs)
//
//   node plugin/tools/preview.mjs --shots OUTDIR [--pages todo,plan,...] [--themes light,dark]
//        [--widths 1440,1024] [--height 900] [--click "<css selector>"] [--name suffix]
//     Screenshots every page x theme x width to OUTDIR/<page>_<theme>_<width>[_<name>].png and
//     writes OUTDIR/index.json. Exit 1 when a page shows the error boundary or the bundle logs a
//     console error, or when a 2.0 tab shows the "server not running" / "could not answer" state.
//     Pages (2.0 tabs): approvals projects running prefs brain learn settings;
//     older ids: todo plan execute autonomous claude codex models.
//     --plain-names        name files <page>_<theme>.png (the README's names; use with one width)
//
// Open a page by hash: http://127.0.0.1:8790/#cc-plan ; force a theme with ?theme=dark|light.
// See /__missing for fixture paths the pages asked for that fixtures.json does not have.
// Record new fixtures with: <pinned python> plugin/tools/preview/record.py
import { createServer, request as httpRequest } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const PLUGIN = resolve(TOOLS, '..');
const ROOT = resolve(PLUGIN, '..');
const PREVIEW = join(TOOLS, 'preview');
const CACHE = join(TOOLS, '.cache');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const LIVE_ENGINE = 'http://127.0.0.1:8751';
const LIVE_WPC = 'http://127.0.0.1:8762'; // CC.wpc.base (plugin/src/wpc_client.js)
const ENGINE_ORIGIN = 'http://127.0.0.1:3080'; // the dsh web origin the engine allows
const REACT = [
  { file: 'react.production.min.js', url: 'https://unpkg.com/react@18.3.1/umd/react.production.min.js' },
  { file: 'react-dom.production.min.js', url: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js' }
];
const PAGES = { approvals: 'cc-approvals', projects: 'cc-projects', running: 'cc-running', prefs: 'cc-prefs', todo: 'cc-todo', plan: 'cc-plan', execute: 'cc-create', autonomous: 'cc-sprints', brain: 'cc-brain',
  learn: 'cc-learn', settings: 'cc-settings', claude: 'cc-claude', codex: 'cc-codex', models: 'cc-models' };

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const has = n => argv.includes(n);
function opt(n, dflt) { const i = argv.indexOf(n); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt; }
const list = (n, dflt) => String(opt(n, dflt)).split(',').map(s => s.trim()).filter(Boolean);
const SHOTS = opt('--shots', null);
const PORT = parseInt(opt('--port', SHOTS ? '0' : '8790'), 10);
const ENGINE = opt('--engine', null);
const FIXTURES = resolve(opt('--fixtures', join(PREVIEW, 'fixtures.json')));
const OFFLINE = has('--offline');
const LOG_FILE = opt('--log-requests', null);
const WPC_FIXTURES = resolve(opt('--wpc-fixtures', join(PREVIEW, 'wpc_fixtures.json')));
const PLAIN = has('--plain-names');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function die(msg) { console.error('preview: ' + msg); process.exit(2); }
if (ENGINE && /^https?:\/\/(127\.0\.0\.1|localhost):8751\b/.test(ENGINE)) die('refusing to use the live engine on 8751; start a sample engine (record.py) instead');

// ---------------------------------------------------------------- build and React
function build() {
  // The build moved to plugin/tools/build.mjs; scripts/build_plugin.mjs is the older forwarder.
  const script = [join(TOOLS, 'build.mjs'), join(ROOT, 'scripts', 'build_plugin.mjs')].find(f => existsSync(f));
  if (!script) die('no build script found (plugin/tools/build.mjs)');
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (r.status !== 0) die('build failed');
}
async function ensureReact() {
  mkdirSync(CACHE, { recursive: true });
  for (const r of REACT) {
    const file = join(CACHE, r.file);
    if (existsSync(file) && statSync(file).size > 1000) continue;
    if (OFFLINE) { console.warn('preview: ' + r.file + ' is not cached and --offline is set; the page will say so'); continue; }
    console.log('preview: downloading ' + r.url);
    const resp = await fetch(r.url);
    if (!resp.ok) die('download failed (' + resp.status + ') ' + r.url);
    const text = await resp.text();
    if (!/React/.test(text.slice(0, 400))) die('unexpected content from ' + r.url);
    writeFileSync(file, text);
  }
}

// ---------------------------------------------------------------- fixtures
let fixtures = { responses: {}, status: {} }, fixturesMtime = 0;
function loadFixtures() {
  try {
    const m = statSync(FIXTURES).mtimeMs;
    if (m === fixturesMtime) return fixtures;
    const data = JSON.parse(readFileSync(FIXTURES, 'utf8'));
    fixtures = { responses: data.responses || {}, status: data.status || {} };
    fixturesMtime = m;
  } catch (e) {
    if (fixturesMtime !== -1) console.warn('preview: no usable fixtures at ' + FIXTURES + ' (' + e.message + ')');
    fixturesMtime = -1;
  }
  return fixtures;
}
// Key: exact path+query, then the path without its query.
function lookup(pathAndQuery) {
  const fx = loadFixtures();
  const bare = pathAndQuery.split('?')[0];
  for (const k of [pathAndQuery, bare]) {
    if (Object.prototype.hasOwnProperty.call(fx.responses, k)) return { body: fx.responses[k], status: fx.status[k] || 200 };
  }
  return null;
}

// Waypoint server answers: { features, calls: { "<tool> <JSON input>": payload, "<tool>": payload } }.
// "@now", "@now-15m", "@now+3h", "@now+2d" strings become ISO times when served.
let wpcFx = { features: null, calls: {} }, wpcMtime = 0;
function loadWpc() {
  try {
    const m = statSync(WPC_FIXTURES).mtimeMs;
    if (m === wpcMtime) return wpcFx;
    const data = JSON.parse(readFileSync(WPC_FIXTURES, 'utf8'));
    wpcFx = { features: data.features || null, calls: data.calls || {} };
    wpcMtime = m;
  } catch (e) {
    if (wpcMtime !== -1) console.warn('preview: no usable wpc fixtures at ' + WPC_FIXTURES + ' (' + e.message + ')');
    wpcMtime = -1;
  }
  return wpcFx;
}
const UNIT = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 };
function timed(v, now) {
  if (typeof v === 'string') {
    const m = /^@now(?:([+-])(\d+)([smhd]))?$/.exec(v);
    if (!m) return v;
    const off = m[1] ? (m[1] === '-' ? -1 : 1) * Number(m[2]) * UNIT[m[3]] : 0;
    return new Date(now + off).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  if (Array.isArray(v)) return v.map(x => timed(x, now));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = timed(v[k], now); return o; }
  return v;
}
function wpcLookup(tool, input) {
  const calls = loadWpc().calls;
  for (const k of [tool + ' ' + JSON.stringify(input || {}), tool]) {
    if (Object.prototype.hasOwnProperty.call(calls, k)) return calls[k];
  }
  return undefined;
}

// ---------------------------------------------------------------- request bookkeeping
const missing = new Set();      // fixture paths asked for and not found
const seen = new Map();         // "METHOD path" -> {method, path, status, count}
let inflight = 0, lastActivity = Date.now();
function note(method, path, status) {
  const k = method + ' ' + path;
  const e = seen.get(k) || { method, path, status, count: 0 };
  e.status = status; e.count++;
  seen.set(k, e);
}
function writeLog() {
  if (!LOG_FILE) return;
  const rows = [...seen.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(LOG_FILE, JSON.stringify(rows, null, 2) + '\n');
}

// ---------------------------------------------------------------- the shell page
// fetch and EventSource are patched before the bundle loads, so the plugin's hard-coded
// http://127.0.0.1:8751 lands on this server's /engine instead.
const SHELL = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waypoint preview</title>
<link rel="stylesheet" href="/frame.css">
<script>
(function () {
  var t = new URLSearchParams(location.search).get('theme');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
  var LIVE = ${JSON.stringify(LIVE_ENGINE)}, WPC = ${JSON.stringify(LIVE_WPC)};
  function swap(u) {
    if (typeof u !== 'string') return u;
    if (u.indexOf(LIVE) === 0) return '/engine' + u.slice(LIVE.length);
    if (u.indexOf(WPC) === 0) return '/wpc' + u.slice(WPC.length);
    return u;
  }
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === 'string') return realFetch(swap(input), init);
    if (input && typeof input.url === 'string' && swap(input.url) !== input.url) return realFetch(new Request(swap(input.url), input), init);
    return realFetch(input, init);
  };
  var RealES = window.EventSource;
  if (RealES) {
    var ES = function (url, cfg) { return new RealES(swap(String(url)), cfg); };
    ES.prototype = RealES.prototype; ES.CONNECTING = 0; ES.OPEN = 1; ES.CLOSED = 2;
    window.EventSource = ES;
  }
})();
</script>
</head><body>
<div id="pv-root"></div>
<script src="/vendor/react.js"></script>
<script src="/vendor/react-dom.js"></script>
<script src="/frame.js"></script>
<script src="/lib/client.js"></script>
</body></html>
`;

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(obj));
function sendFile(res, file, type) {
  try { send(res, 200, type, readFileSync(file)); } catch { json(res, 404, { error: 'not_found', file: file.split(/[\\/]/).pop() }); }
}

function engine(req, res, path) {
  if (ENGINE) return proxy(req, res, path);
  const bare = path.split('?')[0];
  if (bare === '/api/stream') {
    note('GET', path, 200);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': preview stream\n\n');
    const beat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => clearInterval(beat));
    return;
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'GET') {
    req.resume();
    note(req.method, path, 200);
    return json(res, 200, { ok: true });
  }
  const hit = lookup(path);
  if (!hit) {
    missing.add(path);
    note('GET', path, 404);
    return json(res, 404, { error: 'no_fixture', path });
  }
  note('GET', path, hit.status);
  return json(res, hit.status, hit.body);
}

// The Waypoint server stand-in: POST /api/wpc/call {tool, input} -> {payload, isError}; GET /api/wpc/features.
// Writes answer {ok: true} without changing anything, so a click in the preview is harmless.
const WPC_WRITES = /^(answer|todo_tick|toggle_set|floor_set|pref_approve|pref_reject|pref_edit|learn_topic_set|learn_step_set|learn_prop_add|learn_practice_record)$/;
function wpc(req, res, path) {
  const bare = path.split('?')[0];
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (bare === '/api/wpc/features' || bare === '/health') {
    const f = loadWpc().features;
    if (!f) { missing.add('wpc:features'); note('GET', '/wpc' + bare, 404); return json(res, 404, { error: 'no_fixture' }); }
    note('GET', '/wpc' + bare, 200);
    return json(res, 200, bare === '/health' ? { ok: true } : f);
  }
  if (bare !== '/api/wpc/call' || req.method !== 'POST') { note(req.method, '/wpc' + path, 404); return json(res, 404, { error: 'not_found' }); }
  let body = '';
  req.setEncoding('utf8');
  req.on('data', c => { body += c; });
  req.on('end', () => {
    let msg = {};
    try { msg = JSON.parse(body || '{}'); } catch { return json(res, 400, { error: 'bad_json' }); }
    const tool = String(msg.tool || ''), input = msg.input || {};
    const label = 'wpc:' + tool + (Object.keys(input).length ? ' ' + JSON.stringify(input) : '');
    if (WPC_WRITES.test(tool)) { note('POST', label, 200); return json(res, 200, { payload: { ok: true, preview: true }, isError: false }); }
    const hit = wpcLookup(tool, input);
    if (hit === undefined) {
      missing.add(label); note('POST', label, 200);
      return json(res, 200, { payload: { error: 'no_fixture', message: 'The preview has no answer for ' + tool + '.' }, isError: true });
    }
    note('POST', label, 200);
    return json(res, 200, { payload: timed(hit, Date.now()), isError: false });
  });
}

function proxy(req, res, path) {
  const target = new URL(ENGINE);
  const headers = { Origin: ENGINE_ORIGIN, Accept: req.headers.accept || '*/*' };
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  if (req.headers['content-length']) headers['Content-Length'] = req.headers['content-length'];
  const up = httpRequest({ hostname: target.hostname, port: target.port, method: req.method, path, headers }, upRes => {
    note(req.method, path, upRes.statusCode);
    const h = { 'Content-Type': upRes.headers['content-type'] || 'application/json', 'Cache-Control': 'no-store' };
    res.writeHead(upRes.statusCode, h);
    upRes.pipe(res);
  });
  up.on('error', e => { note(req.method, path, 502); if (!res.headersSent) json(res, 502, { error: 'engine_unreachable', detail: e.message }); else res.end(); });
  req.on('close', () => { if (path.startsWith('/api/stream')) up.destroy(); });
  req.pipe(up);
}

function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;
  if (p.startsWith('/engine/') || p === '/engine') {
    const path = (p.slice('/engine'.length) || '/') + url.search;
    const streaming = path.startsWith('/api/stream');
    if (!streaming) { inflight++; lastActivity = Date.now(); res.on('close', () => { inflight--; lastActivity = Date.now(); }); }
    return engine(req, res, path);
  }
  if (p.startsWith('/wpc/')) {
    inflight++; lastActivity = Date.now(); res.on('close', () => { inflight--; lastActivity = Date.now(); });
    return wpc(req, res, p.slice('/wpc'.length) + url.search);
  }
  if (p === '/' || p === '/index.html') return send(res, 200, 'text/html; charset=utf-8', SHELL);
  if (p === '/frame.js') return sendFile(res, join(PREVIEW, 'frame.js'), 'text/javascript; charset=utf-8');
  if (p === '/frame.css') return sendFile(res, join(PREVIEW, 'frame.css'), 'text/css; charset=utf-8');
  if (p === '/lib/client.js') return sendFile(res, join(PLUGIN, 'lib', 'client.js'), 'text/javascript; charset=utf-8');
  if (p === '/vendor/react.js') return sendFile(res, join(CACHE, REACT[0].file), 'text/javascript; charset=utf-8');
  if (p === '/vendor/react-dom.js') return sendFile(res, join(CACHE, REACT[1].file), 'text/javascript; charset=utf-8');
  if (p === '/__missing') return json(res, 200, { missing: [...missing].sort() });
  if (p === '/__requests') return json(res, 200, { requests: [...seen.values()] });
  if (p === '/favicon.ico') { res.writeHead(204); return res.end(); }
  return json(res, 404, { error: 'not_found' });
}

function startServer(port) {
  return new Promise((ok, fail) => {
    const srv = createServer(handle);
    srv.on('error', fail);
    srv.listen(port, '127.0.0.1', () => ok(srv));
  });
}

// ---------------------------------------------------------------- screenshots (headless Edge over CDP)
async function shots(base) {
  const OUT = resolve(SHOTS);
  mkdirSync(OUT, { recursive: true });
  const pages = list('--pages', Object.keys(PAGES).join(','));
  for (const p of pages) if (!PAGES[p] && !/^cc-/.test(p)) die('unknown page ' + p + ' (known: ' + Object.keys(PAGES).join(', ') + ')');
  const themes = list('--themes', 'light,dark');
  for (const t of themes) if (t !== 'light' && t !== 'dark') die('unknown theme ' + t);
  const widths = list('--widths', '1440').map(Number);
  const height = Number(opt('--height', '900'));
  const click = opt('--click', null);
  const suffix = opt('--name', null);

  // Profiles Edge was still holding when an earlier run ended: remove those older than 10 minutes
  // (a profile in use by another run right now stays locked and is skipped).
  for (const d of readdirSync(tmpdir())) {
    if (!d.startsWith('wp-preview-edge-')) continue;
    const full = join(tmpdir(), d);
    try { if (Date.now() - statSync(full).mtimeMs > 600000) rmSync(full, { recursive: true, force: true }); } catch { /* in use */ }
  }
  const profile = mkdtempSync(join(tmpdir(), 'wp-preview-edge-'));
  const edge = spawn(EDGE, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-sync', '--disable-extensions',
    '--disable-features=msImplicitSignin,msEdgeSyncImplicitSignIn', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, `--window-size=${widths[0]},${height}`, 'about:blank'], { stdio: 'ignore' });
  // msedge.exe can hand off to a browser process outside the launcher's tree, so stopping Edge is three
  // steps: ask it to close over DevTools, kill the launcher's tree, then kill any msedge.exe still
  // using this run's temporary profile (matched by its folder name, so the owner's Edge is never touched).
  let browserWs = null, killed = false;
  const kill = () => {
    if (killed) return; killed = true;
    try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }); else edge.kill('SIGKILL'); } catch { /* gone */ }
    if (process.platform === 'win32') {
      const tag = basename(profile).replace(/'/g, '');
      spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${tag}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],
        { stdio: 'ignore', timeout: 30000 });
    }
  };
  async function closeBrowser() {
    if (!browserWs) return;
    try {
      const b = new WebSocket(browserWs);
      await new Promise((ok, fail) => { b.addEventListener('open', ok, { once: true }); b.addEventListener('error', fail, { once: true }); setTimeout(fail, 3000); });
      b.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      await sleep(800);
      try { b.close(); } catch { /* closed */ }
    } catch { /* fall through to the kill */ }
  }
  process.on('exit', kill);

  const files = [];
  let failures = 0, ws;
  try {
    let port = 0;
    for (let i = 0; i < 100 && !port; i++) { try { port = parseInt(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0], 10); } catch { await sleep(200); } }
    if (!port) throw new Error('Edge did not start');
    try { browserWs = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch { /* kill only */ }
    let wsUrl = null;
    for (let i = 0; i < 100 && !wsUrl; i++) {
      try { const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page'); if (t) wsUrl = t.webSocketDebuggerUrl; } catch { /* not yet */ }
      if (!wsUrl) await sleep(200);
    }
    if (!wsUrl) throw new Error('no page target in Edge');
    ws = new WebSocket(wsUrl);
    await new Promise((ok, fail) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', () => fail(new Error('devtools socket failed')), { once: true }); });
    let id = 0; const pending = new Map();
    let errors = [];
    const fromBundle = frames => (frames || []).some(f => /\/lib\/client\.js/.test(f.url || ''));
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        const frames = (m.params.stackTrace || {}).callFrames;
        errors.push({ kind: 'console', text: m.params.args.map(a => a.value !== undefined ? a.value : a.description || '').join(' ').slice(0, 400),
          from_bundle: fromBundle(frames), at: frames && frames[0] ? frames[0].url.replace(base, '') + ':' + frames[0].lineNumber : null });
      }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        const frames = (d.stackTrace || {}).callFrames || [{ url: d.url || '' }];
        errors.push({ kind: 'exception', text: ((d.exception && d.exception.description) || d.text || '').slice(0, 400), from_bundle: fromBundle(frames) });
      }
    });
    const cdp = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
    await cdp('Page.enable'); await cdp('Runtime.enable');

    // Settled: the page root is there, nothing says loading, no /engine request for 600 ms.
    const LOADED = `(() => { const m = document.querySelector('.pv-main'); if (!m) return false;
      if (document.querySelector('[data-pv-empty]')) return false;
      if (m.querySelector('[aria-busy="true"]')) return false;
      return !/(Loading\\u2026|Loading\\.\\.\\.|Building the index|still loading|Looking for duplicate|Connecting\\u2026)/i.test(m.innerText || ''); })()`;
    async function settle(maxMs = 12000) {
      const end = Date.now() + maxMs;
      while (Date.now() < end) {
        if (inflight === 0 && Date.now() - lastActivity > 600 && await evaluate(LOADED)) { await sleep(300); return true; }
        await sleep(150);
      }
      return false;
    }
    async function clickSel(sel) {
      const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' });
        const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
      if (!r) return false;
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
      return true;
    }

    let n = 0;
    for (const page of pages) for (const theme of themes) for (const width of widths) {
      const pid = PAGES[page] || page;
      const name = PAGES[page] ? page : pid.replace(/^cc-/, '');
      const file = PLAIN ? `${name}_${theme}${suffix ? '_' + suffix : ''}.png` : `${name}_${theme}_${width}${suffix ? '_' + suffix : ''}.png`;
      errors = [];
      const missingBefore = new Set(missing);
      await cdp('Storage.clearDataForOrigin', { origin: base, storageTypes: 'local_storage,session_storage' });
      await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
      await cdp('Page.navigate', { url: `${base}/?shot=${++n}#${pid}` });
      await sleep(400);
      const settled = await settle();
      let clicked = null;
      if (click) { clicked = await clickSel(click); await sleep(300); await settle(8000); }
      const boundary = await evaluate(`[...document.querySelectorAll('[data-cc-error]')].map(e => e.textContent.trim()).join(' | ')`) || '';
      const bodyText = await evaluate(`document.body.innerText`) || '';
      const shownError = /could not load just now/.test(boundary) || /could not load just now/.test(bodyText);
      // A 2.0 tab that could not reach the Waypoint stand-in (CC.WpcProblem) is a failed shot, not a picture.
      const problem = (/The Waypoint server is not running|Waypoint could not answer|This add-on is off/.exec(bodyText) || [])[0] || null;
      const r = await cdp('Page.captureScreenshot', { format: 'png' });
      if (!r.result || !r.result.data) throw new Error('screenshot failed for ' + file);
      writeFileSync(join(OUT, file), Buffer.from(r.result.data, 'base64'));
      const bundleErrors = errors.filter(e => e.from_bundle);
      const entry = { file, page: name, page_id: pid, theme, width, height, settled,
        console_errors: errors, missing_fixtures: [...missing].filter(x => !missingBefore.has(x)).sort() };
      if (click) entry.click = { selector: click, found: clicked };
      if (shownError) entry.error_boundary = boundary || 'could not load just now';
      if (problem) entry.wpc_problem = problem;
      const bad = shownError || !!problem || bundleErrors.length > 0;
      if (bad) failures++;
      files.push(entry);
      console.log(`${bad ? 'FAIL' : 'ok  '}  ${file}${settled ? '' : ' (not settled)'}${entry.missing_fixtures.length ? '  missing: ' + entry.missing_fixtures.join(' ') : ''}${shownError ? '  [error boundary]' : ''}${problem ? '  [' + problem + ']' : ''}${bundleErrors.length ? '  [' + bundleErrors.length + ' bundle error(s)]' : ''}`);
    }
    // A later run into the same folder (another --name, more pages) adds to the index; same file names are replaced.
    let earlier = [];
    try { earlier = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8')).files || []; } catch { /* first run */ }
    const mine = new Set(files.map(f => f.file));
    const all = earlier.filter(f => !mine.has(f.file) && existsSync(join(OUT, f.file))).concat(files);
    const index = { generated_at: new Date().toISOString(), mode: ENGINE ? 'engine' : 'fixtures', fixtures: ENGINE ? null : FIXTURES.replace(ROOT, '.').replace(/\\/g, '/'),
      files: all, missing_fixtures: [...new Set(all.flatMap(f => f.missing_fixtures || []))].sort() };
    writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  } finally {
    try { if (ws) ws.close(); } catch { /* closed */ }
    await closeBrowser();
    kill();
    // Edge lets go of its profile files a moment after it exits: keep trying for up to 30 s; a later run sweeps what is left.
    for (let i = 0; i < 60 && existsSync(profile); i++) {
      await sleep(500);
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* still locked */ }
    }
    if (existsSync(profile)) console.warn('preview: could not remove the Edge profile ' + profile);
  }
  if (missing.size) console.log('missing fixtures: ' + [...missing].sort().join(' '));
  console.log(`preview: ${files.length} screenshot(s) in ${OUT}; ${failures} failing`);
  return failures;
}

// ---------------------------------------------------------------- main
if (!has('--no-build')) build();
await ensureReact();
if (!ENGINE) loadFixtures();
loadWpc();
const server = await startServer(PORT);
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`preview: listening on ${base} (${ENGINE ? 'engine ' + ENGINE : 'fixtures ' + FIXTURES})`);
const stop = () => { writeLog(); server.close(); server.closeAllConnections && server.closeAllConnections(); };
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });

if (SHOTS) {
  let failures = 1;
  try { failures = await shots(base); }
  catch (e) { console.error('preview: shots failed: ' + (e && e.message ? e.message : e)); }
  stop();
  process.exit(failures ? 1 : 0);
}
