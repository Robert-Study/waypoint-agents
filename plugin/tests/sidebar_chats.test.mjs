// v4 S1: the owner's chats in the left sidebar on Waypoint pages, Claude Code style, with each chat's
// subagents as a collapsible dropdown. Data: ctx.sessions.list (SessionListState: ids + byId with
// parentId / origin 'subagent' / running / blank / updatedAt) and ctx.workspaces.list (archived and
// pinned sets); open through ctx.uiWorkspace.openSession; a subagent opens beside its parent through
// ctx.sidebarRight.openResource (dsh's own subagentchat resource).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { h, makeReact, render, findAll, textOf, hasClass, test, done, SRC } from './harness.mjs';

function load() {
  const CC = { h, React: Object.assign(makeReact(), { Component: class { constructor(p) { this.props = p; } } }) };
  const ctx = vm.createContext({ CC, console, Math, JSON, Object, Array, Set, Map, Number, String, Date, Promise,
    encodeURIComponent, setTimeout, clearTimeout });
  for (const f of ['tokens.js', 'sidebar_chats.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  return CC;
}

// Wed 5 Nov 2026 15:00 local.
const NOW = new Date(2026, 10, 5, 15, 0, 0).getTime();
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

function row(id, extra) {
  return Object.assign({ id, displayTitle: 'Chat ' + id, running: false, blank: false, updatedAt: NOW - HOUR, retainedBy: {} }, extra || {});
}
function sessionsState() {
  const rows = [
    row('a', { displayTitle: 'Fix the router', updatedAt: NOW - 5 * MIN, running: true }),
    row('b', { displayTitle: 'Plan the week', updatedAt: NOW - 20 * HOUR }), // yesterday (15:00 - 20h = 19:00 on 4 Nov)
    row('c', { displayTitle: 'Old notes', updatedAt: NOW - 3 * DAY }),
    row('d', { displayTitle: 'Ancient', updatedAt: NOW - 40 * DAY }),
    row('p', { displayTitle: 'Pinned one', updatedAt: NOW - 30 * DAY }),
    row('blank1', { displayTitle: '', blank: true, updatedAt: NOW }),
    row('arch', { displayTitle: 'Archived', updatedAt: NOW - 2 * MIN }),
    row('a1', { displayTitle: 'Explore code', parentId: 'a', origin: 'subagent', updatedAt: NOW - 4 * MIN }),
    row('a2', { displayTitle: 'Write tests', parentId: 'a', origin: 'subagent', updatedAt: NOW - 2 * MIN, running: true }),
    row('a2x', { displayTitle: 'Nested helper', parentId: 'a2', origin: 'subagent', updatedAt: NOW - MIN })
  ];
  const byId = {};
  rows.forEach((r) => { byId[r.id] = r; });
  // a2x is only a retained fallback row (byId, not ids), as the contract allows.
  return { ids: rows.filter((r) => r.id !== 'a2x').map((r) => r.id), byId, phase: 'ready', projectionsBySession: {} };
}
function store(value) {
  const subs = new Set();
  return { value, getSnapshot() { return this.value; }, subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    set(v) { this.value = v; subs.forEach((f) => f()); }, subs };
}
function fakeCtx(opts) {
  const o = opts || {};
  const rec = { opened: [], panels: [], resources: [], registers: [] };
  const services = {
    sessions: { list: store(sessionsState()), subagentAddress(id) {
      return id === 'a1' ? { parentSessionId: 'a', childSessionId: 'a1', mode: 'continuable' } : undefined; } },
    workspaces: { list: store({ items: [], archivedSessionIds: ['arch'], pinnedSessionIds: ['p'], state: 'idle', phase: 'ready', error: null }) },
    uiWorkspace: { openSession(t) { rec.opened.push(t); } },
    layout: { panelInfo: store({ activePanelId: o.panel === undefined ? 'cc-todo' : o.panel }), selectPanel(id) { rec.panels.push(id); this.panelInfo.set({ activePanelId: id }); } },
    sidebarRight: { mounted: store(o.mounted), openResource(addr, options) { rec.resources.push({ addr, options }); } }
  };
  if (o.drop) o.drop.forEach((k) => { delete services[k]; });
  const ctx = {
    get(name) { return services[name]; },
    slots: {
      inject(key, cb) { const r = cb(); assert.equal(typeof r, 'function'); return () => {}; },
      register(spec, comp) { rec.registers.push({ spec, comp }); return () => {}; }
    }
  };
  Object.assign(ctx, services);
  return { ctx, rec, services };
}

const plain = (x) => JSON.parse(JSON.stringify(x));
const isBtn = (n) => n.type === 'button';
const rowBtn = (tree, id) => findAll(tree, (n) => isBtn(n) && n.props['data-cc-chat'] === id)[0];
const subToggle = (tree, id) => findAll(tree, (n) => isBtn(n) && n.props['data-cc-sub-toggle'] === id)[0];

function view(CC, ctx, state) {
  const SC = CC.sidebarChats;
  const model = SC.model(ctx, NOW);
  return render(h(SC.View, Object.assign({ model, now: NOW, actions: SC.actions(ctx) }, state || {})));
}

test('groups: Pinned, Today, Yesterday, Previous 7 days, Older; blank, archived and subagents left out of the top level', () => {
  const CC = load();
  const { ctx } = fakeCtx();
  const m = CC.sidebarChats.model(ctx, NOW);
  assert.deepEqual(plain(m.groups.map((g) => g.label)), ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Older']);
  assert.deepEqual(plain(m.groups.map((g) => g.items.map((i) => i.id))), [['p'], ['a'], ['b'], ['c'], ['d']]);
});

test('subagents: direct children nested under their chat, newest first, grandchildren under the child', () => {
  const CC = load();
  const { ctx } = fakeCtx();
  const a = CC.sidebarChats.model(ctx, NOW).groups[1].items[0];
  assert.deepEqual(plain(a.children.map((c) => c.id)), ['a2', 'a1']);
  assert.deepEqual(plain(a.children[0].children.map((c) => c.id)), ['a2x']);
  assert.equal(a.children[1].children.length, 0);
});

test('each chat renders one button row with its title, relative time and a status dot', () => {
  const CC = load();
  const { ctx } = fakeCtx();
  const tree = view(CC, ctx);
  const a = rowBtn(tree, 'a');
  assert.ok(a, 'row button for chat a');
  assert.equal(a.props.type, 'button');
  assert.ok(textOf(a).includes('Fix the router'));
  assert.ok(textOf(a).includes('5m'));
  const dot = findAll(a, hasClass('cc-sbc-dot'))[0];
  assert.ok(dot && dot.props.className.includes('cc-sbc-live'), 'running chat has a live dot');
  const b = rowBtn(tree, 'b');
  assert.ok(!findAll(b, hasClass('cc-sbc-live')).length, 'idle chat has a quiet dot');
  assert.equal(CC.sidebarChats.relTime(NOW - 30 * 1000, NOW), 'now');
  assert.equal(CC.sidebarChats.relTime(NOW - 3 * HOUR, NOW), '3h');
  assert.equal(CC.sidebarChats.relTime(NOW - 2 * DAY, NOW), '2d');
  assert.equal(CC.sidebarChats.relTime(NOW - 40 * DAY, NOW), 'Sep 26');
});

test('clicking a chat opens that session and shows the conversation', () => {
  const CC = load();
  const { ctx, rec } = fakeCtx();
  rowBtn(view(CC, ctx), 'b').props.onClick();
  assert.deepEqual(rec.opened, ['b']);
  assert.deepEqual(rec.panels, [null], 'leaves the Waypoint page for the conversation');
});

test('subagents dropdown: collapsed by default with its count, aria-expanded, no child rows', () => {
  const CC = load();
  const { ctx } = fakeCtx();
  const tree = view(CC, ctx);
  const t = subToggle(tree, 'a');
  assert.ok(t, 'chat a has a subagents toggle');
  assert.equal(t.props['aria-expanded'], false);
  assert.ok(textOf(t).includes('2'), 'count shown');
  assert.ok(/subagent/i.test(t.props['aria-label']));
  assert.equal(rowBtn(tree, 'a1'), undefined);
  assert.equal(subToggle(tree, 'b'), undefined, 'a chat without children has no dropdown');
});

test('expanded dropdown lists the subagents; a subagent opens by its parent address', () => {
  const CC = load();
  const { ctx, rec } = fakeCtx();
  let toggled = null;
  const tree = view(CC, ctx, { subOpen: { a: true }, onToggleSub: (id) => { toggled = id; } });
  const t = subToggle(tree, 'a');
  assert.equal(t.props['aria-expanded'], true);
  t.props.onClick();
  assert.equal(toggled, 'a');
  assert.ok(rowBtn(tree, 'a1') && rowBtn(tree, 'a2'));
  assert.equal(rowBtn(tree, 'a2x'), undefined, 'grandchildren stay inside their own collapsed dropdown');
  assert.ok(subToggle(tree, 'a2'), 'a subagent with its own children has a dropdown too');
  rowBtn(tree, 'a1').props.onClick();
  assert.deepEqual(rec.opened, [{ parentSessionId: 'a', childSessionId: 'a1', mode: 'continuable' }]);
  rowBtn(tree, 'a2').props.onClick();
  assert.deepEqual(plain(rec.opened[1]), { parentSessionId: 'a', childSessionId: 'a2', mode: 'unknown' });
});

test('open beside: subagent rows only; opens dsh\'s subagent chat in the right sidebar of the parent', () => {
  const CC = load();
  const { ctx, rec } = fakeCtx({ panel: null, mounted: 'a' });
  const tree = view(CC, ctx, { subOpen: { a: true } });
  const beside = (id) => findAll(tree, (n) => isBtn(n) && n.props['data-cc-beside'] === id)[0];
  assert.equal(beside('a'), undefined, 'top-level chats have no beside action');
  const b = beside('a1');
  assert.ok(b && /beside/i.test(b.props['aria-label']));
  b.props.onClick();
  assert.equal(rec.resources.length, 1);
  assert.equal(rec.resources[0].addr, 'dsh-resource://subagentchat/session/a1?parent=a&mode=continuable');
  assert.equal(rec.resources[0].options.kind, 'subagentchat');
  assert.deepEqual(rec.opened, [], 'parent already on screen: not reopened');
});

test('open beside from a Waypoint page: opens the parent first, then the side chat once it is mounted', () => {
  const CC = load();
  const { ctx, rec, services } = fakeCtx({ mounted: undefined });
  CC.sidebarChats.actions(ctx).beside({ id: 'a2', parentId: 'a' });
  assert.deepEqual(rec.opened, ['a']);
  assert.equal(rec.resources.length, 0, 'waits for the parent to mount');
  services.sidebarRight.mounted.set('a');
  assert.equal(rec.resources.length, 1);
  assert.equal(rec.resources[0].addr, 'dsh-resource://subagentchat/session/a2?parent=a&mode=unknown');
  assert.equal(services.sidebarRight.mounted.subs.size, 0, 'unsubscribed after opening');
});

test('groups are collapsible buttons with aria-expanded', () => {
  const CC = load();
  const { ctx } = fakeCtx();
  let shut = null;
  const tree = view(CC, ctx, { groupShut: { older: true }, onToggleGroup: (id) => { shut = id; } });
  const heads = findAll(tree, (n) => isBtn(n) && n.props['data-cc-group']);
  assert.equal(heads.length, 5);
  const older = heads.find((g) => g.props['data-cc-group'] === 'older');
  assert.equal(older.props['aria-expanded'], false);
  assert.equal(rowBtn(tree, 'd'), undefined, 'a shut group hides its rows');
  assert.equal(heads[1].props['aria-expanded'], true);
  older.props.onClick();
  assert.equal(shut, 'older');
});

test('no search or filter controls', () => {
  const CC = load();
  const { ctx } = fakeCtx();
  const tree = view(CC, ctx, { subOpen: { a: true } });
  assert.equal(findAll(tree, (n) => n.type === 'input' || n.type === 'select').length, 0);
  assert.ok(!/search|filter/i.test(textOf(tree)));
});

test('hides nothing else: every style rule is gated on the chat list being on screen', () => {
  const CC = load();
  const css = CC.sidebarChats.css();
  const rules = css.split('}').map((r) => r.trim()).filter(Boolean);
  assert.ok(rules.length > 3);
  rules.forEach((r) => assert.ok(r.includes('cc-sbc'), 'ungated rule: ' + r));
  assert.ok(!/display\s*:\s*none/.test(css), 'never hides dsh elements');
  assert.ok(!/!important|gradient/.test(css));
});

test('stateful list: Waypoint pages only, wide sidebar only', () => {
  const CC = load();
  const on = fakeCtx();
  CC.ctx = on.ctx;
  const tree = render(h(CC.sidebarChats.SidebarChats, { wide: true }));
  assert.ok(tree && findAll(tree, hasClass('cc-sbc')).length === 1, 'renders on a Waypoint page');
  assert.equal(findAll(tree, (n) => n.type === 'nav').length, 1);
  assert.equal(render(h(CC.sidebarChats.SidebarChats, { wide: false })), null, 'rail: nothing');
  CC.ctx = fakeCtx({ panel: null }).ctx;
  assert.equal(render(h(CC.sidebarChats.SidebarChats, { wide: true })), null, 'chat pages keep dsh\'s own rows');
});

test('apply registers one sidebar.footer.action entry', () => {
  const CC = load();
  const { ctx, rec } = fakeCtx();
  CC.contribute = (c, slot, spec, comp) => c.slots.inject(slot, () => c.slots.register(spec, comp));
  CC.sidebarChats.apply(ctx);
  assert.equal(rec.registers.length, 1);
  assert.equal(rec.registers[0].spec.name, 'sidebar.footer.action');
  assert.equal(rec.registers[0].spec.id, 'cc-chats');
});

test('degrades to nothing without the sessions service, without ctx, or before the list is ready', () => {
  const CC = load();
  assert.doesNotThrow(() => CC.sidebarChats.apply(undefined));
  assert.doesNotThrow(() => CC.sidebarChats.apply({}));
  assert.deepEqual(plain(CC.sidebarChats.model(undefined, NOW).groups), []);
  for (const c of [undefined, null, {}, fakeCtx({ drop: ['sessions'] }).ctx, fakeCtx({ drop: ['workspaces', 'layout', 'uiWorkspace', 'sidebarRight'] }).ctx]) {
    CC.ctx = c;
    let out;
    assert.doesNotThrow(() => { out = render(h(CC.sidebarChats.SidebarChats, { wide: true })); });
    assert.equal(out, null, "no layout or no sessions: nothing");
  }
  const pending = fakeCtx();
  pending.services.sessions.list.set({ ids: [], byId: {}, phase: 'pending', projectionsBySession: {} });
  CC.ctx = pending.ctx;
  assert.equal(render(h(CC.sidebarChats.SidebarChats, { wide: true })), null);
  const broken = { get() { throw new Error('boom'); } };
  assert.doesNotThrow(() => CC.sidebarChats.actions(broken).open({ id: 'x' }));
});

done('sidebar_chats');
