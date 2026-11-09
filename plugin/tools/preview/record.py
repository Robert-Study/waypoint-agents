"""Record neutral demo fixtures for the Waypoint preview harness.

    <pinned python> plugin/tools/preview/record.py [--core ENGINE_DIR] [--port 8761] [--out FILE]
                                                   [--discover] [--paths-log FILE] [--keep] [--raw FILE]

What it does, in order:
1. makes a throwaway folder (home, notes, projects, data) and a settings file that points every
   drive / notes / config path at it, with owner_name "Alex";
2. seeds a fresh database through the engine's own store API: the demo plans in demo_plan.json,
   a mix of task statuses, claims, a question, to-dos, runs and a version family;
3. starts a sample engine on --port (never 8751) from the core folder, GETs every path the pages
   ask for (a fixed list, per-project and per-task paths, and with --discover every path seen
   while the preview harness visits each page against this engine) and stops it, whatever happens;
4. replaces everything that reflects this machine (agents, usage, models, sync, local paths) with
   neutral values (neutral.py), fails if any banned word is left, and writes fixtures.json.

Standard library only. The live engine (port 8751) and the live data folder are never touched.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORIGINAL_ENV = dict(os.environ)  # for the browser in --discover; seed() changes os.environ
TOOLS = HERE.parent
DEFAULT_CORE = (HERE / ".." / ".." / ".." / "engine").resolve()
OWNER_NAME = "Alex"
LIVE_PORT = 8751

# Where the throwaway folders appear in the fixtures (neutral, made-up paths).
NEUTRAL_HOME = "C:\\Users\\alex"

# Words that must never reach the fixtures: the shared list in tools/personal_terms.json (base64, so the
# list never matches itself). Checked case-insensitively, with / and \ treated alike.
sys.path.insert(0, str(TOOLS))
import personal_terms  # noqa: E402
BANNED = [term for _, term in personal_terms.TERMS]

# The engine's serve command, with one change: the usage refresher is replaced by a no-op so the
# sample engine never launches the claude / codex / agy command-line tools to read this machine's
# real usage. Everything else is the normal `python -m cc_engine serve`.
BOOT = r"""
import sys
from cc_engine import usage
class _NoRefresh:
    def stop(self):
        pass
usage.start_refresher = lambda *a, **k: _NoRefresh()
from cc_engine.__main__ import main
sys.exit(main(['serve', '--port', sys.argv[1], '--db', sys.argv[2]]))
"""

STATIC_PATHS = [
    "/health", "/api/health", "/api/toggles", "/api/todos", "/api/brief", "/api/projects", "/api/questions?open=1",
    "/api/runs", "/api/agents", "/api/models", "/api/models/gemini_keys", "/api/sync/status", "/api/autonomous",
    "/api/sprints/timeline?hours=12", "/api/sprints/timeline?hours=24", "/api/sprints/timeline?hours=48",
    "/api/brain", "/api/brain/overlaps", "/api/interview", "/api/learn", "/api/plan/deep/options",
    "/api/pick?kind=chat", "/api/usage", "/api/planner/sessions", "/api/plan/deep/sessions", "/api/claims",
    "/api/model_health",
]


# ---------------------------------------------------------------- the throwaway world
def make_world(tmp: Path, core: Path) -> dict:
    home, drive, projects, data = tmp / "home", tmp / "drive", tmp / "projects", tmp / "data"
    notes = drive / "Notes"
    for d in (home, drive, projects, data):
        d.mkdir(parents=True, exist_ok=True)
    shutil.copytree(HERE / "sample_notes", notes)
    for proj, subs in {"docs-site": ["content", "src", "deploy", "public"],
                       "onboarding-emails": ["emails", "templates"],
                       "mobile-app": ["app", "tests"]}.items():
        for s in subs:
            (projects / proj / s).mkdir(parents=True, exist_ok=True)
    settings = {
        "owner_name": OWNER_NAME, "user_home": str(home), "drive_root": str(drive), "exchange_dir": "Notes",
        "workspace_root": str(projects), "python": "python",
        "chatmode_home": str(home / "chatmode"), "tools_dir": str(home / "tools"), "workspace_dir": str(projects),
        "worktrees_root": str(projects / "worktrees"), "env_file": str(home / ".env"),
        "instructions": str(notes / "AGENTS.md"), "dsh_dir": str(home / ".dsh"), "agy_exe": str(home / "agy.exe"),
        "npm_root": str(home / "npm"), "claude_memory_index": str(home / "memory" / "MEMORY.md"),
        "learn_seed": str(HERE / "learn_seed.json"), "data_dir": str(data),
        "launcher": str(home / "tools" / "start.py"),
        "addons": {"gemini_key_rotator": True, "free_runners": True, "claude_codex_pages": True, "brain_learn": True},
    }
    cfg = tmp / "waypoint_config.json"
    cfg.write_text(json.dumps(settings, indent=2), encoding="utf-8")
    # Drop inherited engine settings (they could point at the live database or notes), then set ours.
    # API keys and tokens are dropped too: the sample engine has no business seeing them.
    secret = ("KEY", "TOKEN", "SECRET", "PASSWORD", "CREDENTIAL")
    env = {k: v for k, v in os.environ.items()
           if not k.upper().startswith(("CC_", "WAYPOINT_", "AI_")) and not any(s in k.upper() for s in secret)}
    env.update({
        "WAYPOINT_CONFIG": str(cfg), "WAYPOINT_OWNER_NAME": OWNER_NAME, "WAYPOINT_USER_HOME": str(home),
        "WAYPOINT_EXCHANGE_DIR": "Notes", "WAYPOINT_FF_REPO": str(projects / "analysis"), "AI_DRIVE_ROOT": str(drive), "AI_WORKSPACE_ROOT": str(projects),
        "AI_DISK_ROOT": str(projects), "CC_DATA_DIR": str(data), "WAYPOINT_DATA_DIR": str(data),
        "CC_DB": str(data / "cc.sqlite"), "CC_TOKEN_FILE": str(data / "engine.token"),
        "CC_SNAPSHOT_DIR": str(data / "snapshots"), "CC_SYNC_REPOS": str(projects / "docs-site"),
        "CC_SYNC_ROOT": str(projects), "CC_CLI_BRIDGE": "0", "CC_NO_MODEL_PROBE": "1",
        "WAYPOINT_LEARN_SEED": settings["learn_seed"], "WAYPOINT_DSH_DIR": str(home / ".dsh"),
        "WAYPOINT_TOOLS_DIR": str(home / "tools"), "WAYPOINT_ENV_FILE": str(home / ".env"),
        "WAYPOINT_INSTRUCTIONS": settings["instructions"], "WAYPOINT_PYTHON": "python",
        "USERPROFILE": str(home), "HOME": str(home), "PYTHONIOENCODING": "utf-8", "PYTHONDONTWRITEBYTECODE": "1",
    })
    return {"home": home, "drive": drive, "notes": notes, "projects": projects, "data": data, "env": env,
            "db": data / "cc.sqlite", "config": cfg}


def seed(world: dict, core: Path) -> list:
    """Fill the fresh database through the engine's store API. Returns the project ids."""
    os.environ.update(world["env"])  # the engine reads its settings at import time
    sys.path.insert(0, str(core))
    from cc_engine import needs, todo, versions  # noqa: E402  (after the environment is set)
    from cc_engine.plan import import_plan
    from cc_engine.store import OWNER, Store

    demo = json.loads((HERE / "demo_plan.json").read_text(encoding="utf-8"))
    store = Store(world["db"])
    pids = []
    try:
        for raw in demo["plans"]:
            plan = {k: v for k, v in raw.items() if not k.startswith("demo_")}
            if plan.get("cwd"):
                plan["cwd"] = plan["cwd"].replace("{projects}", str(world["projects"])).replace("/", os.sep)
            pid = import_plan(store, plan, actor=OWNER)
            pids.append(pid)
            evidence = raw.get("demo_evidence") or {}
            for nid, status in (raw.get("demo_status") or {}).items():
                store.set_node_status(pid, nid, status, OWNER, evidence=evidence.get(nid))
            for nid, who in (raw.get("demo_claims") or {}).items():
                store.put_claim(pid, nid, who, cwd=plan.get("cwd"), environment="local")
            for q in raw.get("demo_questions") or []:
                needs.ask(store, pid, q.get("node"), kind=q.get("kind", "text"), prompt=q["prompt"],
                          options=q.get("options"), purpose=q.get("purpose"))
        fam = demo.get("family")
        if fam:
            versions.set_family(store, fam["id"], fam["title"], fam["members"], OWNER)
        needs.ask(store, None, None, kind="likert", prompt="How much detail do you want in the daily summary?",
                  purpose="preference")
        # To-dos: some for Alex (in order), some for the computer, one already done.
        human = [
            "Read the proposed docs navigation and approve it or ask for changes.",
            "Open the search results page on a phone and say whether the highlighted sentences read well.",
            "Book a 30-minute walkthrough of the v2 preview with the support team.",
            "Pick the launch date for Docs site v2 once the link check is clean.",
        ]
        computer = [
            "Summarise this week's docs feedback into five themes.",
            "Draft release notes for the new search box.",
            "Check which v1 pages still get traffic from old links.",
        ]
        made = [todo.add_todo(store, t, section="human") for t in human]
        made += [todo.add_todo(store, t, section="computer") for t in computer]
        todo.update_todo(store, made[0]["id"], done=True)
        todo.update_todo(store, made[4]["id"], done=True)
        # Runs: a finished one on v1 and the current one on v2.
        settings = {"preset": "balanced", "pools": ["claude", "codex", "freebuff"], "default_pool": "claude"}
        store.create_run("run-20261028-0900-a1f3", "docs-site-v1", settings, status="done")
        store.update_run("run-20261028-0900-a1f3", started_at="2026-10-28T09:00:12+00:00",
                         ended_at="2026-10-28T11:42:05+00:00")
        store.create_run("run-20261105-0815-b7c2", "docs-site-v2", settings, status="running")
        store.update_run("run-20261105-0815-b7c2", started_at="2026-11-05T08:15:40+00:00")
    finally:
        store.close()
    seed_usage()
    try:  # Learn: some progress on the Git basics topic (mastery is out of 4).
        from cc_engine import learn
        for target, outcome in [("repo", "known"), ("q-commit", "good"), ("q-commit", "good"), ("commit", "set:3"),
                                ("q-branch", "good"), ("q-remote", "hard")]:
            learn.record(target, outcome)
    except Exception as exc:
        print(f"record: learn progress not set ({type(exc).__name__}: {exc})", file=sys.stderr)
    try:  # Codex starts switched off on a new install; the demo shows it on.
        from cc_engine import toggles
        toggles.set_enabled("codex", True, actor=OWNER)
    except Exception as exc:
        print(f"record: Codex switch not set ({type(exc).__name__}: {exc})", file=sys.stderr)
    return pids


def seed_usage():
    """Neutral usage readings (30-70 % left) in the sample engine's usage cache, observed now."""
    from datetime import datetime, timedelta, timezone

    from cc_engine import usage
    now = datetime.now(timezone.utc)
    hours = lambda n: now + timedelta(hours=n)  # noqa: E731
    readings = {
        "claude": [("claude_5h", 62, hours(3)), ("claude_week", 41, hours(80))],
        "codex": [("codex_5h", 70, hours(2)), ("codex_week", 55, hours(100))],
        "antigravity": [("antigravity_week", 48, hours(120)), ("antigravity_gemini_5h", 66, hours(4)),
                        ("antigravity_claude_week", 37, hours(120)), ("antigravity_claude_5h", 58, hours(4)),
                        ("antigravity_argon_week", 44, hours(120))],
    }
    for source, rows in readings.items():
        obs = [usage.obs(pool, left, now, resets, f"{source} usage (demo)") for pool, left, resets in rows]
        usage.store_source(usage.default_cache_path(), source, obs, now)


# ---------------------------------------------------------------- engine process
def start_engine(world: dict, core: Path, port: int, log: Path):
    out = open(log, "w", encoding="utf-8")
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    proc = subprocess.Popen([sys.executable, "-c", BOOT, str(port), str(world["db"])], cwd=str(core),
                            env=world["env"], stdout=out, stderr=subprocess.STDOUT, creationflags=flags)
    base = f"http://127.0.0.1:{port}"
    for _ in range(100):
        if proc.poll() is not None:
            break
        try:
            with urllib.request.urlopen(base + "/health", timeout=2) as r:
                if r.status == 200:
                    return proc, out, base
        except (urllib.error.URLError, OSError):
            time.sleep(0.3)
    stop_engine(proc, out)
    raise RuntimeError("the sample engine did not start; see " + str(log))


def stop_engine(proc, out):
    try:
        if proc and proc.poll() is None:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True, timeout=30)
            else:
                proc.kill()
            proc.wait(timeout=15)
    except Exception:
        pass
    try:
        out.close()
    except Exception:
        pass


def get(base: str, path: str):
    req = urllib.request.Request(base + path, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8") or "null")
        except ValueError:
            return e.code, None
    except (urllib.error.URLError, OSError, ValueError) as e:
        return 0, {"error": str(e)}


def paths_for(base: str, pids: list, family: str | None) -> list:
    from urllib.parse import quote
    out = list(STATIC_PATHS)
    for pid in pids:
        q = quote(pid)
        out += [f"/api/board?project={q}", f"/api/constraints?project={q}", f"/api/events?project={q}&since=0&auto=1",
                f"/api/history?project={q}"]
        status, board = get(base, f"/api/board?project={q}")
        nodes = (board or {}).get("nodes") or []
        fields = (board or {}).get("fields")
        for row in nodes:
            nid = row[fields.index("id")] if fields and isinstance(row, list) else (row or {}).get("id")
            if not nid:
                continue
            nq = f"project={q}&id={quote(str(nid))}"
            out += [f"/api/node?{nq}", f"/api/node/history?{nq}", f"/api/pick?kind=task&{nq}"]
    if family:
        out.append(f"/api/history?family={quote(family)}")
    status, agents = get(base, "/api/agents")
    for a in (agents or {}).get("agents") or []:
        aid = a.get("id") if isinstance(a, dict) else None
        if aid:
            out += [f"/api/agents/sessions?agent={quote(aid)}", f"/api/subagent_chats?agent={quote(aid)}"]
    return out


def discover(base: str, tmp: Path) -> list:
    """Visit every page with the preview harness against the sample engine; return the GET paths seen."""
    log = tmp / "requests.json"
    cmd = ["node", str(TOOLS / "preview.mjs"), "--engine", base, "--shots", str(tmp / "discover"),
           "--themes", "light", "--log-requests", str(log), "--no-build"]
    subprocess.run(cmd, cwd=str(TOOLS.parent.parent), env=ORIGINAL_ENV, timeout=900)
    try:
        rows = json.loads(log.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [r["path"] for r in rows if r.get("method") == "GET" and not r["path"].startswith("/api/stream")]


# ---------------------------------------------------------------- neutral values and the scrub
def replacements(tmp: Path, world: dict, core: Path) -> list:
    pairs = [
        (world["drive"] / "Notes", NEUTRAL_HOME + "\\Notes"),
        (world["drive"], NEUTRAL_HOME + "\\Notes"),
        (world["projects"], NEUTRAL_HOME + "\\Projects"),
        (world["home"], NEUTRAL_HOME),
        (world["data"], NEUTRAL_HOME + "\\.waypoint\\data"),
        (tmp, NEUTRAL_HOME + "\\.waypoint"),
        (core.parent, NEUTRAL_HOME + "\\Projects\\waypoint"),
        (Path(sys.executable), "python"),
        (Path.home(), NEUTRAL_HOME),
    ]
    out = []
    for p, neutral in pairs:
        for form in {str(p), os.path.realpath(str(p)), str(p).replace("\\", "/"), os.path.realpath(str(p)).replace("\\", "/")}:
            out.append((form, neutral if "/" not in form else neutral.replace("\\", "/")))
            out.append((form.lower(), neutral if "/" not in form else neutral.replace("\\", "/")))
    out.sort(key=lambda kv: -len(kv[0]))
    return out


def rewrite(obj, pairs):
    if isinstance(obj, str):
        s = obj
        for a, b in pairs:
            if a and a in s:
                s = s.replace(a, b)
        first = personal_terms.OWNER_FIRST
        return s.replace(first + "'s", OWNER_NAME + "'s").replace(first, OWNER_NAME)
    if isinstance(obj, list):
        return [rewrite(x, pairs) for x in obj]
    if isinstance(obj, dict):
        return {rewrite(k, pairs): rewrite(v, pairs) for k, v in obj.items()}
    return obj


def scrub_problems(obj) -> list:
    found = []

    def walk(x, where):
        if isinstance(x, str):
            for _, w in personal_terms.hits(x):
                found.append(f"{where}: '{w}' in {x[:120]!r}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                walk(v, f"{where}[{i}]")
        elif isinstance(x, dict):
            for k, v in x.items():
                walk(k, f"{where} key")
                walk(v, f"{where}.{k}")

    walk(obj, "$")
    return found


# ---------------------------------------------------------------- main
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--core", default=str(DEFAULT_CORE), help="engine folder that contains cc_engine/")
    ap.add_argument("--port", type=int, default=8761)
    ap.add_argument("--out", default=str(HERE / "fixtures.json"))
    ap.add_argument("--discover", action="store_true", help="also visit every page with the harness to find paths")
    ap.add_argument("--paths-log", help="a --log-requests file from preview.mjs; its GET paths are recorded too")
    ap.add_argument("--raw", help="also write the unneutralised responses here (for inspection; never commit)")
    ap.add_argument("--keep", action="store_true", help="keep the throwaway folder")
    args = ap.parse_args(argv)
    if args.port == LIVE_PORT:
        print("record: refusing port 8751 (the live engine)", file=sys.stderr)
        return 2
    core = Path(args.core).resolve()
    if not (core / "cc_engine" / "__init__.py").is_file():
        print(f"record: no cc_engine package under {core}", file=sys.stderr)
        return 2

    tmp = Path(tempfile.mkdtemp(prefix="wp-preview-engine-"))
    proc = out = None
    try:
        world = make_world(tmp, core)
        pids = seed(world, core)
        demo = json.loads((HERE / "demo_plan.json").read_text(encoding="utf-8"))
        family = (demo.get("family") or {}).get("id")
        proc, out, base = start_engine(world, core, args.port, tmp / "engine.log")
        paths = paths_for(base, pids, family)
        if args.paths_log:
            rows = json.loads(Path(args.paths_log).read_text(encoding="utf-8"))
            paths += [r["path"] for r in rows if r.get("method") == "GET"]
        if args.discover:
            paths += discover(base, tmp)
        responses, status = {}, {}
        for p in dict.fromkeys(x for x in paths if not x.startswith("/api/stream")):
            code, body = get(base, p)
            if code == 0:
                print(f"record: {p} failed: {body}", file=sys.stderr)
                continue
            responses[p] = body
            if code != 200:
                status[p] = code
        if args.raw:
            Path(args.raw).write_text(json.dumps({"responses": responses, "status": status}, indent=1), encoding="utf-8")
        sys.path.insert(0, str(HERE))
        import neutral  # noqa: E402
        responses = neutral.apply(responses, pids=pids, owner=OWNER_NAME)
        fixtures = rewrite({"_about": "Neutral demo answers for plugin/tools/preview.mjs, written by record.py. "
                                      "Regenerate; do not hand-edit.",
                            "responses": responses, "status": status}, replacements(tmp, world, core))
        problems = scrub_problems(fixtures)
        if problems:
            print("record: FAIL scrub check, banned text left in fixtures:", file=sys.stderr)
            for p in problems[:40]:
                print("  " + p, file=sys.stderr)
            return 1
        Path(args.out).write_text(json.dumps(fixtures, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"record: {len(responses)} responses ({len(status)} non-200) -> {args.out}")
        return 0
    finally:
        stop_engine(proc, out)
        if args.keep:
            print(f"record: kept {tmp}")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
