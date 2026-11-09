// In-dsh smoke test: opens dsh in headless Edge over CDP, clicks each Waypoint for dsh
// sidebar entry and checks its page renders. Exit 0 = all pages load inside dsh.
// Usage: node tools/smoke_dsh.mjs [--screens DIR]   (Windows: needs Microsoft Edge; DSH_HOME overrides ~/.dsh)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PAGES = ['Todo', 'Plan', 'Execute', 'Autonomous', 'Brain', 'Learn', 'Settings'];  // sidebar labels in src/app.js
const port = 9300 + Math.floor(Math.random() * 500);
const screensArg = process.argv.indexOf('--screens');
const screens = screensArg > 0 ? process.argv[screensArg + 1] : null;
const url = readFileSync(join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'last_web_url.txt'), 'utf8').trim();
const profile = mkdtempSync(join(tmpdir(), 'cc-smoke-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('edge did not start');
}

let failures = 0;
try {
  const ws = new WebSocket(await target());
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

  await send('Page.enable');
  await send('Page.navigate', { url });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) { await sleep(500); ready = await evaluate(`!!document.querySelector('[aria-label="Plan"], [title="Plan"]')`); }
  if (!ready) { console.log('FAIL  sidebar entry "Plan" not found'); failures++; }
  const engine = await evaluate(`fetch('http://127.0.0.1:8751/health').then(r => 'HTTP ' + r.status, e => 'error: ' + e.message)`);
  console.log(`${String(engine).startsWith('HTTP 200') ? 'PASS' : 'FAIL'}  engine reachable from dsh page (${engine})`);
  if (!String(engine).startsWith('HTTP 200')) failures++;
  for (const label of PAGES) {
    const clicked = await evaluate(`(() => { const b = document.querySelector('[aria-label="${label}"], [title="${label}"]'); if (!b) return false; b.click(); return true; })()`);
    let ok = false;
    for (let i = 0; i < 30 && clicked && !ok; i++) { await sleep(300); ok = await evaluate(`!!document.querySelector('.cc-root')`); }
    const errText = await evaluate(`(document.querySelector('.cc-root [data-cc-error]')||{}).textContent || ''`);
    console.log(`${ok && !errText ? 'PASS' : 'FAIL'}  page ${label}${errText ? ' error: ' + errText : ''}`);
    if (!ok || errText) failures++;
    if (screens && ok) {
      await sleep(1200);
      mkdirSync(screens, { recursive: true });
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(screens, `${label.toLowerCase()}.png`), Buffer.from(shot.result.data, 'base64'));
    }
  }
  ws.close();
} catch (e) {
  console.log('FAIL ', e.message); failures++;
} finally {
  edge.kill();
}
console.log(failures ? `smoke: ${failures} failure(s)` : 'smoke: OK');
process.exit(failures ? 1 : 0);
