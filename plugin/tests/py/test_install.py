"""tools/install.py against a fake dsh home in tmp_path. Never touches a real ~/.dsh.

Runs on Windows (junctions) and Linux/macOS (symlinks). Stdlib + pytest only.
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

PLUGIN = Path(__file__).resolve().parents[2]
SCRIPT = PLUGIN / "tools" / "install.py"
spec = importlib.util.spec_from_file_location("waypoint_install", SCRIPT)
inst = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inst)

NEW = inst.NAME
OLD = inst.OLD_NAME
BASE = ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@deepseek-ai/dsh-experimental-voice-input-bundle"]


@pytest.fixture(autouse=True)
def _no_real_home(monkeypatch, tmp_path):
    # Belt and braces: nothing here may fall back to the real ~/.dsh.
    monkeypatch.setenv("DSH_HOME", str(tmp_path / "unused-dsh-home"))


def fake_home(tmp: Path, bundles=None, deps=None) -> Path:
    home = tmp / "dsh-home"
    profile = home / "profiles" / "web"
    profile.mkdir(parents=True)
    manifest = {"name": "dsh-profile-web", "private": True, "dsh": {"profile": {"bundles": list(bundles or BASE)}}}
    if deps is not None:
        manifest["dependencies"] = deps
    (profile / "package.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (profile / "cordis.patch.yml").write_text("[]\n", encoding="utf-8")
    return home


def run(home: Path, *args: str) -> tuple[int, str]:
    proc = subprocess.run([sys.executable, str(SCRIPT), *args, "--dsh-home", str(home)],
                          capture_output=True, text=True, timeout=60)
    return proc.returncode, proc.stdout + proc.stderr


def manifest(home: Path) -> dict:
    return json.loads((home / "profiles" / "web" / "package.json").read_text(encoding="utf-8"))


def snapshot(root: Path) -> dict:
    """Every file, folder and link under root; links are recorded, never followed."""
    out = {}
    stack = [root]
    while stack:
        for p in sorted(stack.pop().iterdir()):
            rel = p.relative_to(root).as_posix()
            if inst.is_link(p):
                out[rel] = "link:" + str(inst.link_target(p))
            elif p.is_dir():
                out[rel] = "dir"
                stack.append(p)
            else:
                out[rel] = p.read_bytes()
    return out


def make_old_install(tmp: Path) -> tuple[Path, Path]:
    """A profile as dsh Control Centre left it: old dependency, bundle entry in the middle, link to a checkout."""
    old_checkout = tmp / "old-checkout" / "plugin"
    (old_checkout / "lib").mkdir(parents=True)
    (old_checkout / "lib" / "client.js").write_text("// old bundle", encoding="utf-8")
    home = fake_home(tmp, bundles=BASE[:2] + [OLD] + BASE[2:], deps={OLD: "link:" + old_checkout.as_posix()})
    inst.make_link(inst.link_path(home / "profiles" / "web", OLD), old_checkout)
    return home, old_checkout


def test_fresh_install(tmp_path):
    home = fake_home(tmp_path)
    code, out = run(home, "install")
    assert code == 0, out
    m = manifest(home)
    assert m["dependencies"][NEW] == "link:" + PLUGIN.as_posix()
    assert m["dsh"]["profile"]["bundles"] == BASE + [NEW]
    link = inst.link_path(home / "profiles" / "web", NEW)
    assert inst.is_link(link) and inst.same_path(inst.link_target(link), PLUGIN)
    assert (link / "package.json").is_file()
    backup = home / "profiles" / "web" / "package.json.waypoint-backup"
    assert backup.is_file() and NEW not in backup.read_text(encoding="utf-8")
    assert (home / "profiles" / "web" / "cordis.patch.yml").read_text(encoding="utf-8") == "[]\n"
    assert "linked" in out and "added dependency" in out


def test_reinstall_is_a_no_op(tmp_path):
    home = fake_home(tmp_path)
    assert run(home, "install")[0] == 0
    before = snapshot(home)
    code, out = run(home, "install")
    assert code == 0 and "nothing to do" in out, out
    assert snapshot(home) == before


def test_migration_from_old_package(tmp_path):
    home, old_checkout = make_old_install(tmp_path)
    code, out = run(home, "install")
    assert code == 0, out
    m = manifest(home)
    assert OLD not in m["dependencies"] and NEW in m["dependencies"]
    # The new entry takes the old entry's place in the load order.
    assert m["dsh"]["profile"]["bundles"] == BASE[:2] + [NEW] + BASE[2:]
    profile = home / "profiles" / "web"
    assert not os.path.lexists(inst.link_path(profile, OLD))
    assert not (profile / "node_modules" / "@rob").exists()  # empty scope folder tidied
    assert (old_checkout / "lib" / "client.js").read_text(encoding="utf-8") == "// old bundle"  # target untouched
    migrated = [line for line in out.splitlines() if "migrated" in line]
    assert len(migrated) == 1 and OLD in migrated[0]
    code, out = run(home, "status")
    assert "installed: new" in out


def test_remove(tmp_path):
    home = fake_home(tmp_path)
    run(home, "install")
    code, out = run(home, "remove")
    assert code == 0, out
    m = manifest(home)
    assert NEW not in m.get("dependencies", {}) and m["dsh"]["profile"]["bundles"] == BASE
    assert not os.path.lexists(inst.link_path(home / "profiles" / "web", NEW))
    assert (PLUGIN / "package.json").is_file() and (PLUGIN / "tools" / "install.py").is_file()  # plugin intact
    assert run(home, "remove")[1].strip().startswith("nothing to do")


def test_remove_also_takes_out_old_package(tmp_path):
    home, old_checkout = make_old_install(tmp_path)
    code, out = run(home, "remove")
    assert code == 0, out
    assert manifest(home)["dsh"]["profile"]["bundles"] == BASE
    assert (old_checkout / "lib" / "client.js").exists()


def test_status_reports_none_old_new_both(tmp_path):
    home = fake_home(tmp_path)
    assert "installed: none" in run(home, "status")[1]
    run(home, "install")
    out = run(home, "status")[1]
    assert "installed: new" in out and "target exists" in out
    old_home, _ = make_old_install(tmp_path / "o")
    assert "installed: old" in run(old_home, "status")[1]
    # Both: old entries plus a new dependency added by hand.
    m = manifest(old_home)
    m["dependencies"][NEW] = "link:x"
    (old_home / "profiles" / "web" / "package.json").write_text(json.dumps(m), encoding="utf-8")
    assert "installed: both" in run(old_home, "status")[1]


def test_status_flags_missing_link_target(tmp_path):
    home = fake_home(tmp_path)
    gone = tmp_path / "gone"
    gone.mkdir()
    inst.make_link(inst.link_path(home / "profiles" / "web", NEW), gone)
    gone.rmdir()
    out = run(home, "status")[1]
    assert "TARGET MISSING" in out


def test_dry_run_writes_nothing(tmp_path):
    home, _ = make_old_install(tmp_path)
    before = snapshot(home)
    code, out = run(home, "install", "--dry-run")
    assert code == 0 and out.startswith("would: "), out
    assert snapshot(home) == before
    fresh = fake_home(tmp_path / "f")
    before = snapshot(fresh)
    assert run(fresh, "install", "--dry-run")[0] == 0
    assert snapshot(fresh) == before


def test_missing_profile_gives_clear_error(tmp_path):
    home = tmp_path / "empty-home"
    home.mkdir()
    code, out = run(home, "install")
    assert code == 2
    assert "dsh profile 'web' not found" in out and "--dsh-home" in out
    assert not any(home.iterdir())


def test_real_folder_in_link_place_is_refused(tmp_path):
    home = fake_home(tmp_path)
    real = inst.link_path(home / "profiles" / "web", NEW)
    real.mkdir(parents=True)
    (real / "keep.txt").write_text("mine", encoding="utf-8")
    code, out = run(home, "install")
    assert code == 1 and "refused" in out
    assert (real / "keep.txt").read_text(encoding="utf-8") == "mine"


def test_dsh_home_env_is_used(tmp_path, monkeypatch):
    home = fake_home(tmp_path)
    env = dict(os.environ, DSH_HOME=str(home))
    proc = subprocess.run([sys.executable, str(SCRIPT), "status"], capture_output=True, text=True, env=env, timeout=60)
    assert proc.returncode == 0 and str(home / "profiles" / "web") in proc.stdout


def test_scripts_wrapper_translates_old_flags():
    wrapper = PLUGIN.parent / "scripts" / "install_plugin.py"
    if not wrapper.is_file():
        pytest.skip("scripts/install_plugin.py exists only in the Waypoint repo, not the exported product tree")
    spec2 = importlib.util.spec_from_file_location("install_plugin_wrapper", wrapper)
    w = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(w)
    assert w.translate([]) == ["install"]
    assert w.translate(["--remove"]) == ["remove"]
    assert w.translate(["--profile", "web"]) == ["install", "--profile", "web"]
    assert w.translate(["status", "--dsh-home", "x"]) == ["status", "--dsh-home", "x"]
