// brand.test.mjs - the harness's own identity (brand.js) fills dsh's brand seats without ever
// throwing into dsh's startup, and degrades to dsh's own brand when the seats are missing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, test, done, SRC } from './harness.mjs';
import { personalHits } from './personal_terms.mjs';

const BRAND_SLOTS = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
class Component { constructor(props) { this.props = props; this.state = {}; } }

function fakeDocument(title, medias) {
  const head = { children: [], appendChild(n) { this.children.push(n); } };
  const link = (media) => ({ attrs: Object.assign({ rel: 'icon', href: './favicon.svg' }, media ? { media } : {}),
    getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; } });
  const links = (medias || []).map(link);
  return { title, head, links,
    querySelectorAll: (sel) => (sel.includes('icon') ? links.concat(head.children) : []),
    createElement: () => link(null) };
}

// Loads the src files into one vm context; `document` is a vm global (as in the browser) or absent.
function load(files, document, extra) {
  const globals = Object.assign({ CC: { h, React: Object.assign(makeReact(), { Component }) }, console }, extra || {});
  if (document) globals.document = document;
  const ctx = vm.createContext(globals);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return ctx.CC;
}
const full = (doc, extra) => load(['tokens.js', 'brand.js', 'app.js'], doc, extra);

function captureWarns(fn) {
  const warns = [];
  const orig = console.warn;
  console.warn = (...a) => warns.push(a.map(String).join(' '));
  try { fn(); } finally { console.warn = orig; }
  return warns;
}
function recorder(declared) {
  const rec = { injects: [], registers: [] };
  rec.ctx = { layout: { selectPanel() {} }, slots: {
    inject(key, cb) {
      rec.injects.push(key);
      // An undeclared seat: dsh's inject() waits for a declaration that never comes.
      if (declared && !declared(key)) return () => {};
      const r = cb(); assert.equal(typeof r, 'function'); return () => {};
    },
    register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
  } };
  return rec;
}
const brandRegs = (rec) => rec.registers.filter((r) => BRAND_SLOTS.includes(r.spec.name));

test('one brand constant: neutral name and a mark path', () => {
  const CC = full();
  assert.equal(typeof CC.BRAND.name, 'string');
  assert.ok(CC.BRAND.name.length > 0);
  assert.ok(!/deepseek|rob\b/i.test(CC.BRAND.name), CC.BRAND.name);
  assert.deepEqual(personalHits(CC.BRAND.name), [], CC.BRAND.name);
  assert.match(CC.BRAND.mark, /^M[\d\s.,MmAaCcSsQqTtLlHhVvZz-]+$/);
  assert.deepEqual([...CC.BRAND_SLOTS], BRAND_SLOTS);
});

test('apply fills all three brand seats below the official occupant, pages still registered', () => {
  const CC = full(fakeDocument('DeepSeek Harness', ['(prefers-color-scheme: dark)', '(prefers-color-scheme: light)']));
  const rec = recorder();
  const warns = captureWarns(() => CC.apply(rec.ctx));
  assert.deepEqual(warns, []);
  const regs = brandRegs(rec);
  assert.deepEqual(regs.map((r) => r.spec.name), BRAND_SLOTS);
  for (const r of regs) assert.ok(r.spec.priority < 0, r.spec.name + ' priority ' + r.spec.priority);
  assert.equal(rec.registers.filter((r) => r.spec.name === 'main').length, CC.PAGES.length);
});

test('mark renders monochrome currentColor svg at the requested size; name renders CC.BRAND.name', () => {
  const CC = full();
  const rec = recorder();
  CC.apply(rec.ctx);
  const [mark, name, hero] = brandRegs(rec).map((r) => r.comp);
  const svg = render(mark({ size: 24 }));
  assert.equal(svg.type, 'svg');
  assert.equal(svg.props.width, 24);
  assert.equal(svg.props.stroke, 'currentColor');
  assert.equal(svg.props.fill, 'none');
  assert.equal(findAll(svg, (n) => n.type === 'path')[0].props.d, CC.BRAND.mark);
  const heroSvg = render(hero({ size: 34, className: 'hostFish' }));
  assert.equal(heroSvg.props.className, 'hostFish');
  assert.equal(heroSvg.props.height, 34);
  assert.equal(render(mark({})).props.width, 24, 'default size when the host passes none');
  assert.equal(textOf(render(name({}))), CC.BRAND.name);
});

test('changing CC.BRAND changes every surface (single source)', () => {
  const doc = fakeDocument('DeepSeek Harness', ['(prefers-color-scheme: light)']);
  const CC = full(doc);
  CC.BRAND.name = 'Lumen';
  CC.BRAND.mark = 'M4 4h16v16H4z';
  const rec = recorder();
  CC.apply(rec.ctx);
  const [mark, name] = brandRegs(rec).map((r) => r.comp);
  assert.equal(textOf(render(name({}))), 'Lumen');
  assert.equal(findAll(render(mark({ size: 20 })), (n) => n.type === 'path')[0].props.d, 'M4 4h16v16H4z');
  assert.equal(doc.title, 'Lumen');
  assert.equal(doc.links[0].attrs.href, CC.BRAND.svgUri, 'the tab icon is the generated art (scripts/make_icons.py), not the in-app glyph');
});

test('tab title: upstream name replaced, any suffix kept, foreign titles left alone', () => {
  const CC = full();
  assert.equal(CC.brandTitle('DeepSeek Harness'), 'Waypoint');
  assert.equal(CC.brandTitle('Fix bug — DeepSeek Harness'), 'Fix bug — Waypoint');
  assert.equal(CC.brandTitle(''), 'Waypoint');
  assert.equal(CC.brandTitle('Waypoint'), 'Waypoint');
});

test('later dsh title writes (session title — product) are re-branded by one observer', () => {
  const observers = [];
  class FakeObserver {
    constructor(cb) { this.cb = cb; this.live = false; observers.push(this); }
    observe(target, opts) { this.live = true; this.target = target; this.opts = opts; }
    disconnect() { this.live = false; }
  }
  const doc = fakeDocument('DeepSeek Harness', []);
  const CC = full(doc, { MutationObserver: FakeObserver });
  CC.apply(recorder().ctx);
  assert.equal(doc.title, 'Waypoint');
  assert.equal(observers.length, 1);
  assert.equal(observers[0].target, doc.head);
  doc.title = 'Plan the week — DeepSeek Harness'; // what ui-layout's DocumentTitle writes
  observers[0].cb([]);
  assert.equal(doc.title, 'Plan the week — Waypoint');
  observers[0].cb([]); // our own write fires the observer again: no change, no loop
  assert.equal(doc.title, 'Plan the week — Waypoint');
  CC.apply(recorder().ctx); // HMR re-apply: previous observer disconnected, one live
  assert.equal(observers.filter((o) => o.live).length, 1);
});

test('favicon: dsh icon links (one per scheme) become the same full-colour vector tile; hi-res PNGs added', () => {
  const doc = fakeDocument('DeepSeek Harness', ['(prefers-color-scheme: dark)', '(prefers-color-scheme: light)']);
  const CC = full(doc);
  CC.apply(recorder().ctx);
  assert.equal(doc.title, 'Waypoint');
  const [dark, light] = doc.links;
  for (const l of [dark, light]) {
    assert.match(l.attrs.href, /^data:image\/svg\+xml,/);
    assert.equal(l.attrs.href, CC.BRAND.svgUri);
    assert.equal(l.attrs.type, 'image/svg+xml');
    assert.equal(l.attrs.sizes, 'any');
    assert.ok(!('media' in l.attrs) || l.attrs.media === 'all', 'one colour icon serves both schemes');
  }
  const added = doc.head.children;
  assert.deepEqual(added.map((l) => l.attrs.sizes), ['16x16', '32x32', '48x48', '256x256', '256x256']);
  assert.deepEqual(added.map((l) => l.attrs.rel), ['icon', 'icon', 'icon', 'icon', 'apple-touch-icon']);
  assert.ok(added.every((l) => /^data:image\/png;base64,/.test(l.attrs.href)));
  assert.equal(added[3].attrs.href, CC.BRAND.png[256]);
});

test('favicon: re-applying (HMR) updates the same links, never piles up duplicates', () => {
  const doc = fakeDocument('DeepSeek Harness', ['(prefers-color-scheme: light)']);
  const CC = full(doc);
  CC.apply(recorder().ctx);
  const before = doc.head.children.length;
  CC.apply(recorder().ctx);
  assert.equal(doc.head.children.length, before);
});

test('favicon: no icon link at all -> the vector icon, four PNG sizes and an apple-touch icon are added', () => {
  const doc = fakeDocument('DeepSeek Harness', []);
  const CC = full(doc);
  CC.apply(recorder().ctx);
  assert.equal(doc.head.children.length, 6);
  const [first, ...rest] = doc.head.children;
  assert.match(first.attrs.href, /^data:image\/svg\+xml,/);
  assert.equal(first.attrs.sizes, 'any');
  assert.deepEqual(rest.map((l) => l.attrs.sizes), ['16x16', '32x32', '48x48', '256x256', '256x256']);
});

test('seats missing in a future dsh: nothing registered, no warnings, pages unaffected', () => {
  const CC = full(fakeDocument('DeepSeek Harness', []));
  const rec = recorder((key) => !BRAND_SLOTS.includes(key));
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.apply(rec.ctx)));
  assert.deepEqual(warns, []);
  assert.equal(brandRegs(rec).length, 0);
  assert.equal(rec.registers.filter((r) => r.spec.name === 'main').length, CC.PAGES.length);
});

test('registry rejects the brand registration: one prefixed warning each, pages still registered', () => {
  const CC = full();
  const rec = recorder();
  const register = rec.ctx.slots.register;
  rec.ctx.slots.register = (spec, comp) => {
    if (BRAND_SLOTS.includes(spec.name)) throw new Error('single slot already has a registration');
    return register(spec, comp);
  };
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.apply(rec.ctx)));
  assert.equal(warns.length, BRAND_SLOTS.length);
  assert.ok(warns.every((w) => w.startsWith('[waypoint] ') && /brand/.test(w)), warns.join('\n'));
  assert.equal(rec.registers.filter((r) => r.spec.name === 'main').length, CC.PAGES.length);
});

test('throwing document access never escapes apply', () => {
  const bad = { get title() { throw new Error('blocked'); }, set title(v) { throw new Error('blocked'); },
    querySelectorAll() { throw new Error('blocked'); } };
  const CC = full(bad);
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.apply(recorder().ctx)));
  assert.equal(warns.length, 2);
  assert.ok(warns.every((w) => w.startsWith('[waypoint] ')));
});

test('no document (node / worker): brand seats still registered, no throw', () => {
  const CC = full();
  const rec = recorder();
  assert.doesNotThrow(() => CC.apply(rec.ctx));
  assert.equal(brandRegs(rec).length, BRAND_SLOTS.length);
});

test('brand.js alone without app.js helper: no throw, one warning', () => {
  const CC = load(['brand.js']);
  const warns = captureWarns(() => assert.doesNotThrow(() => CC.applyBrand(recorder().ctx)));
  assert.equal(warns.length, 1);
  assert.match(warns[0], /^\[waypoint\] brand helper missing/);
});

done('brand');
