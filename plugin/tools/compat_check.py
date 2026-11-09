"""Upgrade guard: proves the Waypoint for dsh bundle still fits the installed dsh.

Run after every `npm i -g @deepseek-ai/dsh` (tools/after_dsh_upgrade.ps1 runs it). Exit 0 = fits, 1 = a check failed.
Checks only public contracts the plugin depends on; never writes anything.

Two layers:
- types: every slot and ctx service/member the plugin uses (a fixed baseline plus whatever the built
  bundle actually references) must be declared somewhere in the installed dsh `.d.ts` tree. The whole
  `@deepseek-ai/*/lib/types` tree is searched, so a file moving between packages is not a failure.
- bundle (default on, `--no-bundle` to skip): loads plugin/lib/client.js in a node vm with a fake
  `window.__ModuleLoader__`, fake React and a recording ctx, and asserts apply registers `main` and
  `sidebar.panellist` for every page and throws nothing, including against a broken ctx.

Usage: python tools/compat_check.py [--dsh-root PATH] [--profile-root PATH] [--plugin-dir PATH]
                                      [--no-live] [--no-profile] [--no-bundle] [--node PATH]
--no-profile skips the checks that read the dsh profile (install state); --no-live skips the running dsh.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import http.cookiejar
import urllib.request
from pathlib import Path

import os

PLUGIN_DIR = Path(__file__).resolve().parents[1]
# dsh keys the bundle by package name; the build writes the same name as the factory id.
NAME = json.loads((PLUGIN_DIR / "package.json").read_text(encoding="utf-8"))["name"]
OLD_NAME = "@waypoint/dsh-control-centre"  # the package this product was called before 1.0.0
PAGE_IDS = ("cc-approvals", "cc-projects", "cc-running", "cc-waypoint", "cc-todo", "cc-plan", "cc-create", "cc-sprints",
            "cc-agents", "cc-brain", "cc-learn")
# v4: Agents lives in Settings; cc-agents stays a routable page (old links) with no sidebar row.
# dsh v2 (9 Nov 2026): one tab per job; 1.x ids (Waypoint embed, Todo, Plan, Execute, Autonomous) open the tab that
# now does their job, with no sidebar row. cc-prefs shows only with its add-on, so it is not required here.
MAIN_ONLY = ("cc-agents", "cc-waypoint", "cc-todo", "cc-plan", "cc-create", "cc-sprints")
DEFAULT_DSH = Path(os.environ["DSH_INSTALL"]) if os.environ.get("DSH_INSTALL") else (
    Path.home() / "AppData" / "Roaming" / "npm" / "node_modules" / "@deepseek-ai" / "dsh")
DSH_HOME = Path(os.environ["DSH_HOME"]) if os.environ.get("DSH_HOME") else Path.home() / ".dsh"
DEFAULT_PROFILE = DSH_HOME / "profiles" / "web"
WARN_PREFIXES = ("[waypoint] ", "[control-centre] ")  # src files still log the old internal prefix

# Baseline the plugin depends on even if the bundle scan finds nothing (never shrinks the gate).
SLOTS = ("main", "sidebar.panellist")
SERVICES = {"slots": ("inject", "register"), "layout": ("selectPanel",)}
# Replaceable brand seats brand.js fills (registered below the official occupant). If one goes, dsh just
# shows its own brand there; the check flags it so CC.BRAND_SLOTS in plugin/src/brand.js can follow.
BRAND_SLOTS = ("sidebar.brand.mark", "sidebar.brand.name", "conversation.hero.brand.mark")

# Node probe: argv[2] = bundle path. Prints one JSON object on stdout.
PROBE = r"""
const fs = require('fs'), vm = require('vm');
const file = process.argv[2];
const out = { ok: true, errors: [], warns: [], injects: [], registers: [], inject: null, id: null, rendered: 0 };
const fail = (m) => { out.ok = false; out.errors.push(m); };
function el(type, props, ...children) { return { type, props: Object.assign({}, props || {}, { children }) }; }
class Component { constructor(p) { this.props = p; this.state = {}; } setState() {} forceUpdate() {} }
const React = { createElement: el, Component, PureComponent: Component, Fragment: 'Fragment',
  useState: (i) => [typeof i === 'function' ? i() : i, () => {}], useRef: (v) => ({ current: v === undefined ? null : v }),
  useEffect() {}, useLayoutEffect() {}, useMemo: (f) => f(), useCallback: (f) => f, useId: () => 'cc-id',
  useReducer: (r, i) => [i, () => {}], useContext: () => undefined, createContext: (d) => ({ Provider: 'P', Consumer: 'C', _v: d }),
  memo: (c) => c, forwardRef: (f) => f };
const fakeConsole = { log() {}, info() {}, debug() {}, error: (...a) => out.warns.push('error: ' + a.map(String).join(' ')),
  warn: (...a) => out.warns.push(a.map(String).join(' ')) };
const node = () => ({ style: {}, setAttribute() {}, appendChild() {}, removeChild() {}, addEventListener() {}, classList: { add() {}, remove() {}, contains: () => false } });
const document = Object.assign(node(), { head: node(), body: node(), documentElement: node(), createElement: node,
  createElementNS: node, createTextNode: node, querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] });
let def = null;
const window = { __ModuleLoader__: { load(d) { def = d; } }, document, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
const sandbox = vm.createContext({ window, document, console: fakeConsole, setTimeout, clearTimeout, setInterval, clearInterval,
  matchMedia: window.matchMedia, requestAnimationFrame: (f) => 0, cancelAnimationFrame() {} });
try {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  if (!def || typeof def.factory !== 'function') throw new Error('bundle did not call window.__ModuleLoader__.load({factory})');
  out.id = def.id;
  const exp = def.factory((name) => { if (name === 'react') return React; throw new Error('unexpected require ' + name); });
  out.inject = Array.isArray(exp.inject) ? [...exp.inject] : exp.inject;
  if (typeof exp.apply !== 'function') throw new Error('factory exports no apply()');
  const comps = [];
  const ctx = { layout: { selectPanel() {} }, slots: {
    inject(key, cb) { out.injects.push(key); const d = cb(); if (typeof d !== 'function' && !(d && d[Symbol.iterator])) fail('inject callback for ' + key + ' returned no disposer'); return () => {}; },
    register(spec, comp) { out.registers.push({ name: spec && spec.name, key: spec && spec.key, id: spec && spec.id,
      label: spec && typeof spec.label === 'function' ? spec.label() : (spec && spec.label), priority: spec && spec.priority }); comps.push(comp); return () => {}; } } };
  exp.apply(ctx);
  for (let i = 0; i < comps.length; i++) { const r = out.registers[i], c = comps[i]; if (typeof c !== 'function') { fail('registered a non-component'); continue; } const el = c({}); if (el != null) out.rendered++; else if (r.name === 'main' || r.name === 'sidebar.panellist') fail('component rendered null: ' + r.name + ' ' + (r.key || r.id)); }
  for (const bad of [{}, { slots: { inject() { throw new Error('unknown slot'); }, register() {} } },
                     { slots: { inject(k, cb) { return cb(); }, register() { throw new Error('bad slot'); } } }]) {
    try { exp.apply(bad); } catch (e) { fail('apply threw on a broken ctx: ' + (e && e.message)); }
  }
} catch (e) { fail(String(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e)); }
process.stdout.write(JSON.stringify(out));
"""


def pkg_dir(dsh_root: Path, name: str) -> Path:
    return dsh_root / "node_modules" / "@deepseek-ai" / name


def types_text(dsh_root: Path) -> str:
    """Concatenated text of every installed dsh package's type declarations."""
    base = dsh_root / "node_modules" / "@deepseek-ai"
    chunks = []
    for path in sorted(base.glob("*/lib/types/**/*.d.ts")):
        try:
            chunks.append(path.read_text(encoding="utf-8"))
        except OSError:
            continue
    return "\n".join(chunks)


def slot_declared(types: str, slot: str) -> bool:
    return re.search(rf"['\"]{re.escape(slot)}['\"]\s*:", types) is not None


def member_declared(types: str, name: str) -> bool:
    """`name: T`, `readonly name: T`, `name(...)` or `name<T>(...)` at the start of a declaration line."""
    return re.search(rf"^\s*(?:readonly\s+)?{re.escape(name)}\??\s*[:(<]", types, re.MULTILINE) is not None


def app_section(bundle: str) -> str:
    """The app.js part of the built bundle (where the plugin's own `ctx` lives)."""
    m = re.search(r"// ── app\.js\n(.*?)(?:\n\t*// ── |\n\t*exports\.apply)", bundle, re.DOTALL)
    return m.group(1) if m else ""


def bundle_usage(bundle: str) -> tuple[set[str], dict[str, set[str]]]:
    """Slot names and ctx service -> members referenced by the built bundle."""
    app = app_section(bundle)
    slots = set(re.findall(r"\bname:\s*['\"]([a-z][\w.]*)['\"]", app))
    slots |= set(re.findall(r"\.inject\(\s*['\"]([a-z][\w.]*)['\"]", bundle))
    services: dict[str, set[str]] = {}
    refs = re.findall(r"(?<![\w.])ctx\.(\w+)(?:\.(\w+))?", app) + re.findall(r"\bCC\.ctx\.(\w+)(?:\.(\w+))?", bundle)
    for svc, member in refs:
        services.setdefault(svc, set())
        if member:
            services[svc].add(member)
    return slots, services


def probe_bundle(client: Path, node: str) -> dict:
    proc = subprocess.run([node, "-", str(client)], input=PROBE, capture_output=True, text=True,
                          encoding="utf-8", timeout=60)
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {"ok": False, "errors": [f"node probe exit {proc.returncode}: {(proc.stderr or proc.stdout)[-400:]}"]}


def run(dsh_root: Path, profile_root: Path, live: bool, bundle: bool = True,
        plugin_dir: Path = PLUGIN_DIR, node: str | None = None, profile: bool = True) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []

    def check(label: str, ok: bool, detail: str = "") -> None:
        results.append((label, ok, detail))

    try:
        version = json.loads((dsh_root / "package.json").read_text(encoding="utf-8"))["version"]
        check("dsh installed", True, version)
    except Exception as exc:  # noqa: BLE001
        check("dsh installed", False, str(exc))
        return results

    types = types_text(dsh_root)
    client_src = plugin_dir / "lib" / "client.js"
    bundle_text = client_src.read_text(encoding="utf-8") if client_src.exists() else ""

    probe: dict = {}
    if bundle:
        node = node or shutil.which("node")
        if not node:
            check("bundle loads in node vm", False, "node not found on PATH")
        elif not bundle_text:
            check("bundle loads in node vm", False, f"missing {client_src} (run node tools/build.mjs)")
        else:
            probe = probe_bundle(client_src, node)
            check("bundle loads in node vm", probe.get("ok", False) and probe.get("id") == NAME,
                  "; ".join(probe.get("errors") or []) or f"id {probe.get('id')}")
            regs = probe.get("registers") or []
            for pid in PAGE_IDS:
                has_main = any(r.get("name") == "main" and r.get("key") == pid for r in regs)
                has_panel = any(r.get("name") == "sidebar.panellist" and r.get("id") == pid for r in regs)
                check(f"bundle apply registers {pid}", has_main and (has_panel or pid in MAIN_ONLY),
                      f"main={'yes' if has_main else 'no'} sidebar.panellist={'yes' if has_panel else 'no'}")
            brand = [r for r in regs if r.get("name") in BRAND_SLOTS]
            check("bundle apply fills brand slots below the official brand",
                  sorted(r.get("name") for r in brand) == sorted(BRAND_SLOTS)
                  and all(isinstance(r.get("priority"), (int, float)) and r["priority"] < 0 for r in brand),
                  ", ".join(f"{r.get('name')}@{r.get('priority')}" for r in brand) or "none registered")
            guard_warns = [w for w in probe.get("warns") or [] if not w.startswith(WARN_PREFIXES)]
            check("bundle warns only with [waypoint] or [control-centre] prefix", not guard_warns, "; ".join(guard_warns)[:300])

    used_slots, used_services = bundle_usage(bundle_text)
    used_slots |= set(probe.get("injects") or []) | {r.get("name") for r in probe.get("registers") or [] if r.get("name")}
    for svc in probe.get("inject") or []:
        used_services.setdefault(svc, set())
    for slot in sorted((set(SLOTS) | used_slots) - set(BRAND_SLOTS)):
        check(f"slot '{slot}' declared", slot_declared(types, slot), "dsh types")
    for slot in BRAND_SLOTS:
        check(f"brand slot '{slot}' declared", slot_declared(types, slot),
              "dsh types" if slot_declared(types, slot) else "gone: dsh shows its own brand here; update brand.js")
    services = {k: set(v) for k, v in SERVICES.items()}
    for svc, members in used_services.items():
        services.setdefault(svc, set()).update(members)
    for svc in sorted(services):
        check(f"service '{svc}' on ctx", member_declared(types, svc), "dsh types")
        for member in sorted(services[svc]):
            check(f"{svc}.{member} available", member_declared(types, member), "dsh types")

    cordis = pkg_dir(dsh_root, "cordis") / "package.json"
    cv = json.loads(cordis.read_text(encoding="utf-8"))["version"] if cordis.exists() else "missing"
    check("cordis major 4 (peer ~4)", cv.startswith("4."), cv)

    if profile:
        manifest_path = profile_root / "package.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
        bundles = manifest.get("dsh", {}).get("profile", {}).get("bundles", [])
        check("profile selects bundle", NAME in bundles, str(manifest_path))
        check("profile declares dependency", NAME in manifest.get("dependencies", {}), str(manifest_path))
        old_left = [what for what, hit in (("bundle entry", OLD_NAME in bundles),
                                           ("dependency", OLD_NAME in manifest.get("dependencies", {})))
                    if hit]
        check("profile has no old " + OLD_NAME, not old_left,
              ("still has " + ", ".join(old_left) + "; run install to migrate") if old_left else str(manifest_path))
        link = profile_root / "node_modules" / Path(*NAME.split("/"))
        client = link / "lib" / "client.js"
        check("link resolves to bundle", client.exists(), str(link))

    if live:
        url_file = DSH_HOME / "last_web_url.txt"
        try:
            url = url_file.read_text(encoding="utf-8").strip()
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            with opener.open(url, timeout=20) as resp:
                html = resp.read().decode("utf-8", "replace")
            check("running dsh boots the bundle", NAME in html, "boot graph in index")
        except Exception as exc:  # noqa: BLE001
            check("running dsh boots the bundle", False, f"dsh not reachable: {type(exc).__name__}")
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dsh-root", type=Path, default=DEFAULT_DSH)
    parser.add_argument("--profile-root", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--plugin-dir", type=Path, default=PLUGIN_DIR)
    parser.add_argument("--no-live", action="store_true")
    parser.add_argument("--no-profile", action="store_true",
                        help="skip the dsh profile install checks")
    parser.add_argument("--bundle", action=argparse.BooleanOptionalAction, default=True,
                        help="load the built bundle in a node vm and check apply (default on)")
    parser.add_argument("--node", default=None, help="node executable (default: node on PATH)")
    args = parser.parse_args(argv)
    results = run(args.dsh_root, args.profile_root, not args.no_live, args.bundle, args.plugin_dir, args.node,
                  not args.no_profile)
    for label, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {label}  ({detail})")
    failed = [r for r in results if not r[1]]
    print("compat: OK" if not failed else f"compat: {len(failed)} check(s) failed")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
