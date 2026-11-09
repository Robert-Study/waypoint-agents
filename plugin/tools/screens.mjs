// Screenshot every Waypoint surface in the live dsh: headless Edge over CDP, plain Node, no packages.
// Captures each sidebar tab and the key states in light and dark at 1440x900 and 1024x768 into
// <out>/<surface>_<state>_<theme>_<w>.png and writes <out>/index.json. Default <out>: data/screens-v3 beside
// the plugin when that data folder exists (Waypoint repo), else tools/.cache/screens-v3.
//
//   node tools/screens.mjs            capture, write the index, print a one-line summary
//   node tools/screens.mjs --check    capture, then exit 1 on a missing tab, a page error, a skipped
//                                       state or a missing/empty file. Known benign console errors that are
//                                       not Waypoint's (ALLOWED_ERRORS) are listed as allowed_errors instead.
//   node tools/screens.mjs --verify   no browser: re-check the existing index and files
//   --strict   also fail on skipped states (implied by --check on a full run)     --out DIR   other output folder
//
// Targeted run (one PNG per tab x theme at 1440x900, no extra states):
//   node tools/screens.mjs --tabs agents,claude,codex --themes dark,light --out <dir>
//   --tabs a,b      only these sidebar tabs (case-insensitive); implies no states unless --states
//   --themes a,b    only these themes (light, dark)          --states   also capture the key states
//   --dry-run       print the plan (tabs, themes, viewports, file names) and exit; no browser, no token read
//
// The dsh URL carries a token: it is read from $DSH_HOME/last_web_url.txt (default ~/.dsh), used for one navigation and
// never printed or written; text copied into the index is scrubbed of it.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, statSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TOOLS = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(TOOLS, '..');  // plugin root
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const DEFAULT_OUT = existsSync(join(ROOT, '..', 'data')) ? join(ROOT, '..', 'data', 'screens-v3') : join(TOOLS, '.cache', 'screens-v3');
const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const outArg = argv.indexOf('--out');
const OUT = outArg >= 0 ? resolve(argv[outArg + 1]) : DEFAULT_OUT;
const INDEX = join(OUT, 'index.json');
const CHECK = flag('--check'), STRICT = flag('--strict') || (flag('--check') && !argv.includes('--tabs')), VERIFY = flag('--verify'), DRY = flag('--dry-run');
const listArg = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1].split(',').map(x => x.trim()).filter(Boolean) : null; };

// Sidebar order from plugin/src/app.js. A tab whose build is not live yet is skipped with a warning.
// v4: Agents lives in Settings, Interview is labelled Learn, and the Claude and Codex tabs start off (they run from the main chat).
const TABS = ['Todo', 'Plan', 'Execute', 'Autonomous', 'Brain', 'Learn', 'Settings'];
const ALL_THEMES = ['light', 'dark'];
const TAB_ARG = listArg('--tabs'), THEME_ARG = listArg('--themes');
for (const a of ['--tabs', '--themes', '--out']) if (argv.includes(a) && !(a === '--out' ? argv[argv.indexOf(a) + 1] : listArg(a))) { console.error(`screens: ${a} needs a value`); process.exit(2); }
const THEMES = THEME_ARG ? THEME_ARG.map(t => t.toLowerCase()) : ALL_THEMES;
for (const t of THEMES) if (!ALL_THEMES.includes(t)) { console.error(`screens: unknown theme "${t}" (light, dark)`); process.exit(2); }
const VIEWPORTS = TAB_ARG ? [[1440, 900]] : [[1440, 900], [1024, 768]];
const WANT_STATES = TAB_ARG ? flag('--states') : true;
// --tabs narrows TABS to the named ones, in the sidebar's order.
if (TAB_ARG) {
  const want = TAB_ARG.map(t => TABS.find(x => x.toLowerCase() === t.toLowerCase()) || null);
  const bad = TAB_ARG.filter((_, i) => !want[i]);
  if (bad.length) { console.error(`screens: unknown tab(s) ${bad.join(', ')} (known: ${TABS.join(', ')})`); process.exit(2); }
  TABS.splice(0, TABS.length, ...TABS.filter(t => want.includes(t)));
}
const PROJECT = 'meridian-v3';
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function fileNameOf(surface, state, theme, w) { return `${slug(surface)}_${slug(state)}_${theme}_${w}.png`; }
const warn = m => console.warn('warn  ' + m);

// ------------------------------------------------------------------ dry run: the plan, nothing else
if (DRY) {
  console.log(`screens plan (dry run): out ${OUT}`);
  console.log(`  tabs     ${TABS.join(', ')}`);
  console.log(`  themes   ${THEMES.join(', ')}`);
  console.log(`  viewport ${VIEWPORTS.map(([w, h]) => w + 'x' + h).join(', ')}`);
  console.log(`  states   ${WANT_STATES ? 'yes' : 'no'}`);
  console.log(`  target   http://127.0.0.1:3080 (token read from ~/.dsh/last_web_url.txt at run time, never printed)`);
  let n = 0;
  for (const t of TABS) for (const th of THEMES) for (const [w] of VIEWPORTS) { n++; console.log('  file     ' + fileNameOf(t, 'main', th, w)); }
  console.log(`  ${n} tab screenshot(s)`);
  process.exit(0);
}

// ------------------------------------------------------------------ verify an existing index
function verifyIndex(dir) {
  const problems = [];
  let idx;
  try { idx = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')); } catch { return ['index.json is missing or not JSON']; }
  if (!Array.isArray(idx.files) || !idx.files.length) problems.push('index lists no files');
  for (const f of idx.files || []) {
    let size = 0;
    try { size = statSync(join(dir, f.file)).size; } catch { /* missing */ }
    if (!size) problems.push('missing or empty file: ' + f.file);
  }
  if ((idx.missing_tabs || []).length) problems.push('missing tabs: ' + idx.missing_tabs.join(', '));
  if ((idx.errors || []).length) problems.push(idx.errors.length + ' page error(s)');
  return problems;
}

if (VERIFY) {
  const problems = verifyIndex(OUT);
  console.log(problems.length ? 'screens: FAIL  ' + problems.join('; ') : 'screens: OK (index verified)');
  process.exit(problems.length ? 1 : 0);
}

// ------------------------------------------------------------------ secrets never leave this process
const dshUrl = readFileSync(join(DSH_HOME, 'last_web_url.txt'), 'utf8').trim();
const secrets = (() => {
  const s = new Set();
  try {
    const u = new URL(dshUrl);
    for (const v of u.searchParams.values()) if (v.length >= 4) s.add(v);
    if (u.hash.length > 4) s.add(u.hash.slice(1));
    if (u.password) s.add(u.password);
    for (const seg of u.pathname.split('/')) if (seg.length >= 16) s.add(seg);
  } catch { /* not a URL */ }
  s.add(dshUrl);
  return [...s].sort((a, b) => b.length - a.length);
})();
function scrub(text) {
  let t = String(text == null ? '' : text);
  for (const s of secrets) t = t.split(s).join('[redacted]');
  return t.replace(/(https?:\/\/[^\s"'<>?#]+)[?#][^\s"'<>]*/g, '$1').replace(/\s+/g, ' ').trim().slice(0, 400);
}

// ------------------------------------------------------------------ browser
const profile = mkdtempSync(join(tmpdir(), 'cc-screens-'));
const dshSessionsDir = join(DSH_HOME, 'sessions');
const sessionDirsBefore = new Set(listDirs(dshSessionsDir));
function listDirs(dir) {
  try { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? [e.name].concat(listDirs(join(dir, e.name)).map(c => e.name + '/' + c)) : []); } catch { return []; }
}
const edge = spawn(EDGE, ['--headless=new', '--disable-sync', '--no-first-run',
  '--disable-features=msImplicitSignin,msEdgeSyncImplicitSignIn', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

async function debugPort() {
  for (let i = 0; i < 100; i++) {
    try { const p = parseInt(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0], 10); if (p) return p; } catch { /* not yet */ }
    await sleep(200);
  }
  throw new Error('edge did not start');
}
async function pageSocket(port) {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && (t.url.startsWith('http://127.0.0.1:3080') || t.url === 'about:blank'));
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('no page target');
}

const files = [], skipped = [], errors = [], allowed = [];
let cx = { surface: '-', state: '-', theme: '-', width: 0 };   // what is on screen now, for error attribution
let send, evaluate;
const seenErr = new Set();
// Known benign console errors that are not Waypoint's: each is listed in the index under allowed_errors
// and never fails --check. Keep this list short and explicit; anything else is a real page error.
const ALLOWED_ERRORS = [
  { kind: 'console', re: /^\[deepseek-account\] account read failed\b/, why: "dsh's own account probe (not Waypoint)" }
];
function recordError(kind, text) {
  const t = scrub(text);
  if (!t) return;
  const key = kind + '|' + cx.surface + '|' + cx.state + '|' + t;
  if (seenErr.has(key)) return;
  seenErr.add(key);
  const entry = { surface: cx.surface, state: cx.state, theme: cx.theme, width: cx.width, kind, text: t };
  const ok = ALLOWED_ERRORS.find(a => a.kind === kind && a.re.test(t));
  if (ok) allowed.push(Object.assign(entry, { allowed_because: ok.why }));
  else errors.push(entry);
}

async function waitFor(expr, ms = 8000, step = 150) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await evaluate(`!!(${expr})`)) return true; await sleep(step); }
  return false;
}
async function mouse(type, x, y) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 }); }
// Real pointer events (menus open on pointerdown, not on a scripted .click()). `find` is a JS
// expression for the element; SVG groups click at their hit rectangle.
async function clickEl(find) {
  const r = await evaluate(`(() => { const e = (${find}); if (!e) return null; try { e.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
    const t = e.querySelector && e.querySelector('.cc-hit') || e; const b = t.getBoundingClientRect();
    return b.width && b.height ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; })()`);
  if (!r || r.error) return false;
  await mouse('mouseMoved', r.x, r.y); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y);
  return true;
}
// A plain onClick (sidebar rows can be hover-only, with no box to aim at).
async function jsClick(find) { return evaluate(`(() => { const e = (${find}); if (!e) return false; e.click(); return true; })()`); }
async function key(k, code, vk, modifiers = 0) {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
}
const escape = () => key('Escape', 'Escape', 27);

async function dismissNotice() {
  // dsh's 'Preview Notice' dialog: press Continue.
  const done = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === 'Continue'
    && /preview/i.test(((x.closest('[role=dialog],[role=alertdialog],dialog') || x.parentElement.parentElement || {}).textContent) || ''));
    if (!b) return false; b.click(); return true; })()`);
  if (done) await sleep(500);
  return done;
}

async function emulate(theme, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
  await sleep(500);
}

const fileName = fileNameOf;
async function shot(surface, state, theme, w, h, note) {
  await dismissNotice();
  const name = fileName(surface, state, theme, w);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (!r.result || !r.result.data) throw new Error('screenshot failed for ' + name);
  const buf = Buffer.from(r.result.data, 'base64');
  writeFileSync(join(OUT, name), buf);
  const entry = { file: name, surface: slug(surface), state: slug(state), theme, width: w, height: h, bytes: buf.length };
  if (note) entry.note = note;
  files.push(entry);
}

// ------------------------------------------------------------------ page readers
const q = s => `document.querySelector(${JSON.stringify(s)})`;
async function pageErrors() {
  const t = await evaluate(`[...document.querySelectorAll('[data-cc-error]')].map(e => e.textContent.trim()).filter(Boolean).join(' | ')`);
  if (t) recordError('data-cc-error', t);
}
const sidebarBtn = label => `(document.querySelector('button[aria-label=${JSON.stringify(label)}]') || document.querySelector('[aria-label=${JSON.stringify(label)}], [title=${JSON.stringify(label)}]'))`;
async function openTab(label) {
  const ok = await evaluate(`(() => { const b = ${sidebarBtn(label)}; if (!b) return false; b.click(); return true; })()`);
  if (!ok) return false;
  return waitFor(`${q('.cc-root')}`, 15000);
}
async function settle(ms = 1200) { await sleep(ms); }
// A tab is loaded when its root shows no loading text and nothing is aria-busy (Brain, Interview and the
// chat tabs fetch after mount; a shot taken before that is half-loaded). Gives up after `ms` with a warning.
const LOADING_RE = '(Loading\u2026|Loading\\.\\.\\.|Building the index|still loading|Looking for duplicate|Connecting\u2026)';
const LOADED = `(() => { const r = document.querySelector('.cc-root'); if (!r) return false;
  if (r.querySelector('[aria-busy="true"]')) return false;
  return !new RegExp(${JSON.stringify(LOADING_RE)}, 'i').test(r.innerText || ''); })()`;
async function waitLoaded(label, ms = 15000) {
  if (await waitFor(LOADED, ms, 250)) { await sleep(400); return true; }
  warn(`${label} still showing loading text after ${ms / 1000}s; shot anyway`);
  return false;
}
async function pressedSeg(group, text) {
  const find = `[...document.querySelectorAll('.cc-seg[aria-label=${JSON.stringify(group)}] button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`;
  if (!await evaluate(`!!(${find})`)) return false;
  await clickEl(find);
  return waitFor(`(${find}).getAttribute('aria-pressed') === 'true'`, 4000);
}
async function selectProject(id) {
  await waitFor(`${q('select.cc-project')} && [...${q('select.cc-project')}.options].some(o => o.value === ${JSON.stringify(id)})`, 10000);
  const has = await evaluate(`!!(${q('select.cc-project')} && [...${q('select.cc-project')}.options].some(o => o.value === ${JSON.stringify(id)}))`);
  if (!has) return false;
  await evaluate(`(() => { const s = ${q('select.cc-project')}; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, ${JSON.stringify(id)});
    s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await waitFor(`${q('g.cc-node')}`, 8000);
  await settle(600);
  return evaluate(`${q('select.cc-project')}.value === ${JSON.stringify(id)}`);
}

// A state = { surface, state, setup() -> true|string(reason), ready() -> bool, after() }.
// Each state is set up once, then shot at every theme x viewport; if a resize closes it, set it up again.
const READY_NODE = `[...document.querySelectorAll('g.cc-node')].find(g => g.querySelector('.cc-f-ready')) || [...document.querySelectorAll('g.cc-node')].find(g => /\\bready\\b/i.test((g.querySelector('title') || {}).textContent || ''))`;
const modelTrigger = `(${q('[data-cc-flat-picker="trigger"]')} || document.querySelector('button[aria-label^="Select model"]'))`;
// dsh's mode seat (dsh-client-ui-agent-preset) shows the chosen mode's own name ("Build", "Standard mode"), so
// find it by its CSS-module class or its fixed title first; the "mode" text test is the last resort.
const modeButton = `(document.querySelector('button[aria-haspopup="menu"][class*="_seat"]')
  || document.querySelector('button[aria-haspopup="menu"][title^="Choose the agent preset"]')
  || [...document.querySelectorAll('button[aria-haspopup="menu"]')].find(b => /\\bmode\\b/i.test(b.textContent || '') && !/^Access mode/i.test(b.getAttribute('aria-label') || '')))`;

// fresh = start a new session even when a composer is already open (dsh's mode seat is on new sessions only).
async function openChat(fresh = false) {
  if (!fresh && await evaluate(`!!(${modelTrigger})`)) return true;
  // dsh's home sidebar offers 'New session in <workspace>'; on a Waypoint page it does not, so start from
  // the top 'New session' button and pick the workspace from the composer's chooser.
  const inWs = `[...document.querySelectorAll('button')].find(b => /^New session in Control Centre/.test(b.getAttribute('aria-label') || ''))
    || [...document.querySelectorAll('button')].find(b => /^New session in /.test(b.getAttribute('aria-label') || ''))`;
  const top = `[...document.querySelectorAll('button[aria-label="New session"]')].find(b => /new session/i.test(b.textContent || ''))`;
  const dbg = m => { if (process.env.SCREENS_DEBUG) console.log('DEBUG openChat', m); };
  if (await evaluate(`!!(${inWs})`)) { dbg('inWs ' + await jsClick(inWs)); }
  else if (await evaluate(`!!(${top})`)) { dbg('top ' + await jsClick(top)); }
  else { dbg('no new-session button'); return false; }
  if (await waitFor(modelTrigger, 6000)) return true;
  const choose = `document.querySelector('button[aria-label="Choose workspace"]')`;
  dbg('trigger not yet; choose=' + await evaluate(`!!(${choose})`));
  if (await waitFor(choose, 8000)) {
    await clickEl(choose);
    const item = `[...document.querySelectorAll('button[role="menuitem"]')].find(b => b.textContent.trim() === 'Control Centre') || document.querySelector('button[role="menuitem"]')`;
    if (await waitFor(item, 4000)) await clickEl(item);
  }
  return waitFor(modelTrigger, 15000);
}

const planPick = {};
let todoFixtureOn = false;
const TODO_FIXTURE = { todos: [
  { id: 'fx-1', text: 'Tighten the Execute inspector header at 1024 wide', done: false, status: 'open', handoffs: [] },
  { id: 'fx-2', text: 'Draft the Interview prep outline for Thursday', done: false, status: 'handed_off',
    handoffs: [{ to: 'project', ref: { project: 'waypoint-v3', title: 'Waypoint v3', node: 'U9', check: { type: 'text_present', path: 'docs/ui_review.md', text: 'Verdict' } } }] },
  { id: 'fx-3', text: 'Book the dentist', done: true, status: 'done', handoffs: [] }
], counts: { open: 2, total: 3 } };
const STATES = [
  { surface: 'create', state: 'inspector',
    async setup() {
      if (!await openTab('Execute')) return 'Execute tab not available';
      await settle(800);
      if (!await selectProject(PROJECT)) { warn(`project ${PROJECT} is not in the Execute select`); }
      const node = READY_NODE;
      if (!await evaluate(`!!(${node})`)) return 'no ready node on the board';
      await clickEl(node);
      return (await waitFor(`${q('aside.cc-side[aria-label="Step details"]')}`, 8000)) ? (await waitLoaded('create/inspector'), true) : 'inspector did not open';
    },
    ready: `${q('aside.cc-side')} && ${q('select.cc-project')} && ${q('select.cc-project')}.value === ${JSON.stringify(PROJECT)}` },
  { surface: 'create', state: 'stars',
    async setup() {
      if (!await openTab('Execute')) return 'Execute tab not available';
      await settle(800);
      await selectProject(PROJECT);
      if (!await pressedSeg('View', 'Stars')) return 'Stars view button not found';
      await settle(1200);
      return true;
    },
    ready: `[...document.querySelectorAll('.cc-seg[aria-label="View"] button')].some(b => b.textContent.trim() === 'Stars' && b.getAttribute('aria-pressed') === 'true')` },
  { surface: 'create', state: 'waves',
    async setup() {
      if (!await openTab('Execute')) return 'Execute tab not available';
      await settle(800);
      await selectProject(PROJECT);
      if (!await pressedSeg('View', 'Waves')) return 'Waves view button not found';
      await settle(1200);
      return true;
    },
    ready: `[...document.querySelectorAll('.cc-seg[aria-label="View"] button')].some(b => b.textContent.trim() === 'Waves' && b.getAttribute('aria-pressed') === 'true')` },
  { surface: 'todo', state: 'hand-off',
    // The first open row with its 'Send on' group lit (focus-within): no button is pressed, nothing is sent.
    // An empty live list is replaced, for this state only, by TODO_FIXTURE (intercepted GET, nothing written).
    async setup() {
      const live = await evaluate(`fetch('http://127.0.0.1:8751/api/todos').then(r => r.json()).then(d => (d.todos || []).filter(t => t.status === 'open' || t.status === 'handed_off').length).catch(() => -1)`);
      if (live === 0 && !todoFixtureOn) {
        todoFixtureOn = true;
        await send('Fetch.enable', { patterns: [{ urlPattern: 'http://127.0.0.1:8751/api/todos*', requestStage: 'Request' }] });
        this.noteText = 'fixture todos (the live list is empty)';
      }
      await openTab('Execute'); await settle(300);              // remount Todo so it refetches
      if (!await openTab('Todo')) return 'Todo tab not available';
      if (!await waitFor(`${q('.cc-td-row .cc-td-hand button')}`, 8000)) return 'no open todo with a hand-off group';
      await evaluate(`(() => { const b = ${q('.cc-td-row .cc-td-hand button')}; b.scrollIntoView({ block: 'center' }); b.focus(); })()`);
      await settle(500);
      return true;
    },
    ready: q('.cc-td-row:focus-within'),
    cleanup: async () => { if (todoFixtureOn) { todoFixtureOn = false; await send('Fetch.disable'); } },
    note() { return this.noteText; } },
  { surface: 'brain', state: 'list',
    async setup() {
      if (!await openTab('Brain')) return 'Brain tab not available';
      await settle(1500);
      if (!await pressedSeg('View', 'List')) return 'List view button not found';
      await waitLoaded('brain/list');
      return true;
    },
    ready: `[...document.querySelectorAll('.cc-seg button')].some(b => b.textContent.trim() === 'List' && b.getAttribute('aria-pressed') === 'true')` },
  { surface: 'plan', state: 'stages',
    async setup() {
      // A saved plan session shows the stage strip: a deep plan if the engine lists one, else the classic planner's.
      if (!planPick.key) {
        const pick = await evaluate(`(async () => {
          for (const [path, key] of [['/api/plan/deep/sessions', 'cc.plan.deep'], ['/api/planner/sessions', 'cc.plan.session']]) {
            try { const r = await fetch('http://127.0.0.1:8751' + path); if (!r.ok) continue; const d = await r.json();
              const s = (d.sessions || [])[0]; if (s && s.id) return { key, id: s.id }; } catch (e) { /* engine down */ }
          } return null; })()`);
        if (!pick) return 'no saved plan session to show';
        Object.assign(planPick, pick);
      }
      await openTab('Execute'); await settle(300);             // leave Plan so it remounts and reads the saved id
      await evaluate(`(() => { try { localStorage.removeItem('cc.plan.deep'); localStorage.removeItem('cc.plan.session'); localStorage.setItem(${JSON.stringify(planPick.key)}, ${JSON.stringify(planPick.id)}); } catch (e) {} })()`);
      if (!await openTab('Plan')) return 'Plan tab not available';
      // The Describe stepper alone is not the saved session: wait for its side panel too.
      if (!await waitFor(`(${q('.cc-pl-stages')} || ${q('.cc-pl-steps')}) && ${q('.cc-pl-side')}`, 12000)) return 'plan session did not render stages';
      await waitLoaded('plan/stages');
      return true;
    },
    cleanup: `(() => { try { localStorage.removeItem('cc.plan.deep'); localStorage.removeItem('cc.plan.session'); } catch (e) {} })()`,
    ready: `(${q('.cc-pl-stages')} || ${q('.cc-pl-steps')}) && ${q('.cc-pl-side')}`,
    note: () => (planPick.key === 'cc.plan.deep' ? 'deep plan stages' : 'classic planner steps (deep planner not live)') },
  { surface: 'command-bar', state: 'open',
    async setup() {
      const tab = TABS.find(t => present.includes(t));
      if (!tab || !await openTab(tab)) return 'no Waypoint page to open the command bar on';
      await settle(800);
      await key('k', 'KeyK', 75, 2);
      return (await waitFor(`${q('[data-cc="command-bar"]')}`, 3000)) ? (await settle(500), true) : 'Ctrl+K opened nothing (command bar not built in this bundle)';
    },
    ready: q('[data-cc="command-bar"]'), close: escape },
  { surface: 'chat', state: 'model-picker',
    async setup() {
      if (!await openChat()) return 'could not open a chat composer';
      await settle(800);
      await clickEl(modelTrigger);
      const open = await waitFor(`(${modelTrigger}).getAttribute('aria-expanded') === 'true' || ${q('[role=menu]')} || ${q('[role=listbox][aria-label="Model"]')}`, 4000);
      await settle(900);
      return open ? true : 'model picker did not open';
    },
    ready: `(${modelTrigger}) && ((${modelTrigger}).getAttribute('aria-expanded') === 'true' || ${q('[role=menu]')} || ${q('[role=listbox][aria-label="Model"]')})`, close: escape },
  { surface: 'chat', state: 'mode-menu',
    async setup() {
      if (!await openChat()) return 'could not open a chat composer';
      await settle(500);
      if (!await waitFor(modeButton, 3000)) {
        // An open chat with messages has no mode seat: start a new session and look again.
        await openChat(true);
        await waitFor(modeButton, 8000);
      }
      if (!await evaluate(`!!(${modeButton})`)) {
        if (process.env.SCREENS_DEBUG) console.log('DEBUG buttons', JSON.stringify(await evaluate(`[...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || '') + '|' + (b.textContent || '').slice(0, 20) + '|' + (b.getAttribute('aria-haspopup') || ''))`)));
        return 'mode button not found';
      }
      await clickEl(modeButton);
      const open = await waitFor(`(${modeButton}).getAttribute('aria-expanded') === 'true' || ${q('[role=menu]')}`, 4000);
      await settle(700);
      return open ? true : 'mode menu did not open';
    },
    ready: `(${modeButton}) && ((${modeButton}).getAttribute('aria-expanded') === 'true' || ${q('[role=menu]')})`, close: escape }
];

let present = [];

// ------------------------------------------------------------------ run
let failed = null;
try {
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(join(OUT, f), { force: true });   // stale shots never pass for fresh ones
  const ws = new WebSocket(await pageSocket(await debugPort()));
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', () => rej(new Error('devtools socket failed')), { once: true }); });
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const top = ((m.params.stackTrace || {}).callFrames || [])[0];
      if (process.env.SCREENS_DEBUG) console.log('DEBUG console.error from', top ? scrub(top.url) + ':' + top.lineNumber : '(no stack)');
      recordError('console', m.params.args.map(a => a.value !== undefined ? a.value : a.description || '').join(' '));
    }
    if (m.method === 'Fetch.requestPaused') {
      const p = m.params, isList = p.request.method === 'GET' && /\/api\/todos(\?|$)/.test(p.request.url);
      const n = ++id;
      ws.send(JSON.stringify(isList && todoFixtureOn
        ? { id: n, method: 'Fetch.fulfillRequest', params: { requestId: p.requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
            body: Buffer.from(JSON.stringify(TODO_FIXTURE)).toString('base64') } }
        : { id: n, method: 'Fetch.continueRequest', params: { requestId: p.requestId } }));
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') recordError('exception', (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text);
  });
  send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    return r.result && r.result.exceptionDetails ? { error: scrub((r.result.exceptionDetails.exception || {}).description || r.result.exceptionDetails.text) } : r.result && r.result.result && r.result.result.value;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await emulate('light', 1440, 900);
  cx = { surface: 'load', state: 'load', theme: 'light', width: 1440 };
  await send('Page.navigate', { url: dshUrl });
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) {
    await sleep(500);
    await dismissNotice();
    ready = await evaluate(`!!document.querySelector('button[aria-label], [aria-label="Execute"], [title="Execute"]')`);
  }
  if (!ready) throw new Error('dsh did not load (is it running?)');
  await waitFor(`${sidebarBtn('Execute')} || ${sidebarBtn('Plan')}`, 15000);
  await sleep(1500); await dismissNotice();

  // Read the sidebar's labels.
  present = await evaluate(`(() => { const want = ${JSON.stringify(TABS)}; const have = new Set([...document.querySelectorAll('[aria-label],[title]')]
    .map(e => e.getAttribute('aria-label') || e.getAttribute('title'))); return want.filter(l => have.has(l)); })()`) || [];
  const missingTabs = TABS.filter(t => !present.includes(t));
  for (const t of missingTabs) warn(`sidebar tab "${t}" is not in this build of dsh yet; skipped`);

  // Tabs: every theme x viewport, one tab at a time.
  for (const tab of present) {
    let opened = false;
    for (const theme of THEMES) for (const [w, h] of VIEWPORTS) {
      cx = { surface: slug(tab), state: 'main', theme, width: w };
      await emulate(theme, w, h);
      if (!opened || !await evaluate(`!!${q('.cc-root')}`)) { opened = await openTab(tab); await settle(1500); }
      if (!opened) { warn(`tab "${tab}" did not render`); recordError('missing', `tab ${tab} did not render`); continue; }
      await waitLoaded(`${tab} ${theme} ${w}`);
      await pageErrors();
      await shot(tab, 'main', theme, w, h);
    }
  }

  // States.
  for (const st of WANT_STATES ? STATES : []) {
    let ok = false, why = null;
    for (const theme of THEMES) for (const [w, h] of VIEWPORTS) {
      cx = { surface: st.surface, state: st.state, theme, width: w };
      await emulate(theme, w, h);
      if (why) continue;
      if (!ok || !await evaluate(`!!(${st.ready})`)) {
        if (st.close) { await st.close(); await sleep(200); }
        const r = await st.setup();
        if (r !== true) { why = typeof r === 'string' ? r : 'setup failed'; continue; }
        ok = true;
      }
      await pageErrors();
      await shot(st.surface, st.state, theme, w, h, st.note ? st.note.call(st) : undefined);
    }
    if (st.close) { await st.close(); await sleep(200); }
    if (typeof st.cleanup === 'function') await st.cleanup(); else if (st.cleanup) await evaluate(st.cleanup);
    if (why) { skipped.push({ surface: st.surface, state: st.state, reason: why }); warn(`${st.surface}/${st.state} skipped: ${why}`); }
  }

  const index = {
    generated_at: new Date().toISOString(),
    themes: THEMES, viewports: VIEWPORTS.map(([w, h]) => ({ width: w, height: h })),
    expected_tabs: TABS, present_tabs: present, missing_tabs: missingTabs,
    files, skipped, errors,
    allowed_errors: allowed
  };
  writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n');
  ws.close();
} catch (e) {
  failed = scrub(e && e.message ? e.message : e);
} finally {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }); else edge.kill(); } catch { /* gone */ }
  // Opening a chat made dsh create empty session folders: remove the ones this run added.
  for (const d of listDirs(dshSessionsDir).filter(d => !sessionDirsBefore.has(d)).sort((a, b) => b.length - a.length)) {
    try { rmdirSync(join(dshSessionsDir, d)); } catch { /* not empty: it is real, leave it */ }
  }
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* temp; the OS will clean it */ }
}

if (failed) { console.log('screens: FAIL  ' + failed); process.exit(1); }
const problems = verifyIndex(OUT);
const missing = JSON.parse(readFileSync(INDEX, 'utf8')).missing_tabs;
console.log(`screens: ${files.length} files in ${OUT} | tabs ${present.length}/${TABS.length}` +
  (missing.length ? ` (missing ${missing.join(', ')})` : '') + ` | ${skipped.length} state(s) skipped | ${errors.length} page error(s)` +
  (allowed.length ? ` (+${allowed.length} allowlisted)` : '') +
  (CHECK ? (problems.length || (STRICT && skipped.length) ? ' | check FAIL' : ' | check OK') : ''));
for (const e of errors) console.log(`  error [${e.kind}] ${e.surface}/${e.state} ${e.theme} ${e.width}: ${e.text}`);
if (CHECK && (problems.length || (STRICT && skipped.length))) process.exit(1);
process.exit(0);
