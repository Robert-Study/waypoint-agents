"""Install, remove or inspect Waypoint for dsh in a dsh profile. Standard library only.

    python tools/install.py install [--profile web] [--dsh-home PATH] [--dry-run]
    python tools/install.py remove  [--profile web] [--dsh-home PATH] [--dry-run]
    python tools/install.py status  [--profile web] [--dsh-home PATH]

The dsh home is --dsh-home, else the DSH_HOME environment variable, else ~/.dsh.
Install writes only two things:
  * <dsh home>/profiles/<profile>/package.json (the dependency and the bundle entry). A copy of the
    original is kept once as package.json.waypoint-backup, before the first change.
  * the link <profile>/node_modules/@waypoint/dsh-plugin -> this plugin folder
    (a directory junction on Windows, a symlink elsewhere).
It never touches the dsh install or any cordis.patch.yml. Removing a link never deletes the plugin files.
Older installs called "dsh Control Centre" (@waypoint/dsh-control-centre) are migrated: their dependency,
bundle entry and link are removed. Running install twice changes nothing the second time.
Exit codes: 0 done, 1 refused (something unsafe), 2 profile not found.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

PLUGIN_DIR = Path(__file__).resolve().parents[1]
NAME = json.loads((PLUGIN_DIR / "package.json").read_text(encoding="utf-8"))["name"]  # @waypoint/dsh-plugin
OLD_NAME = "@waypoint/dsh-control-centre"
BACKUP_SUFFIX = ".waypoint-backup"
IS_WINDOWS = os.name == "nt"


class Refused(Exception):
    """An action that could lose data; nothing further is changed."""


def dsh_home(arg: str | None) -> Path:
    if arg:
        return Path(arg).expanduser()
    if os.environ.get("DSH_HOME"):
        return Path(os.environ["DSH_HOME"]).expanduser()
    return Path.home() / ".dsh"


def link_path(profile_root: Path, name: str) -> Path:
    return profile_root.joinpath("node_modules", *name.split("/"))


def is_link(path: Path) -> bool:
    """True for a symlink or a Windows junction (any reparse point), without following it."""
    try:
        st = os.lstat(path)
    except OSError:
        return False
    if stat.S_ISLNK(st.st_mode):
        return True
    attrs = getattr(st, "st_file_attributes", 0)
    return bool(attrs & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400))


def link_target(path: Path) -> str | None:
    try:
        target = os.readlink(path)
    except OSError:
        return None
    for prefix in ("\\\\?\\", "\\??\\"):
        if target.startswith(prefix):
            target = target[len(prefix):]
    return target


def same_path(a: str | Path | None, b: Path) -> bool:
    if a is None:
        return False
    try:
        return os.path.normcase(os.path.realpath(a)) == os.path.normcase(os.path.realpath(b))
    except OSError:
        return False


def make_link(link: Path, target: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    if IS_WINDOWS:
        proc = subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(target)], capture_output=True, text=True)
        if proc.returncode != 0:
            raise Refused(f"could not create the junction {link}: {(proc.stderr or proc.stdout).strip()}")
    else:
        os.symlink(str(target), str(link), target_is_directory=True)


def remove_link(link: Path) -> None:
    """Remove a symlink or junction itself. Refuses a real folder, so target files are never deleted."""
    if not is_link(link):
        raise Refused(f"{link} is a real folder, not a link; remove it yourself if it is not needed")
    try:
        os.unlink(link)  # a symlink, or a junction on Windows (removes the link only)
    except OSError:
        os.rmdir(link)   # a directory link on some systems; rmdir on a link never empties the target
    scope = link.parent
    try:
        if scope.name.startswith("@") and not any(scope.iterdir()):
            scope.rmdir()
    except OSError:
        pass


class Profile:
    def __init__(self, home: Path, name: str):
        self.home = home
        self.name = name
        self.root = home / "profiles" / name
        self.manifest_path = self.root / "package.json"
        if not self.manifest_path.is_file():
            raise FileNotFoundError(
                f"dsh profile '{name}' not found: {self.manifest_path} does not exist. Start dsh once with that profile "
                f"so it creates it, or point --dsh-home (or DSH_HOME) at your dsh home folder.")
        self.text = self.manifest_path.read_text(encoding="utf-8")
        self.manifest = json.loads(self.text)

    def deps(self) -> dict:
        return self.manifest.get("dependencies") or {}

    def bundles(self) -> list:
        return ((self.manifest.get("dsh") or {}).get("profile") or {}).get("bundles") or []

    def describe(self, name: str) -> dict:
        link = link_path(self.root, name)
        linked = is_link(link)
        target = link_target(link) if linked else None
        return {"dependency": name in self.deps(), "bundle": name in self.bundles(), "link": link,
                "linked": linked, "real_dir": link.exists() and not linked, "target": target,
                "target_ok": bool(target) and os.path.isdir(target)}

    def save(self, dry_run: bool, say) -> None:
        new_text = json.dumps(self.manifest, indent=2) + "\n"
        if new_text == self.text:
            return
        backup = self.manifest_path.with_name(self.manifest_path.name + BACKUP_SUFFIX)
        if not backup.exists():
            say(f"kept a backup of the original profile file as {backup.name}")
            if not dry_run:
                shutil.copy2(self.manifest_path, backup)
        if not dry_run:
            self.manifest_path.write_text(new_text, encoding="utf-8")
        self.text = new_text


def plan_remove_old(profile: Profile, say, dry_run: bool) -> None:
    """Take out the old dsh Control Centre entries (one line), leaving the new package alone."""
    old = profile.describe(OLD_NAME)
    if not (old["dependency"] or old["bundle"] or old["linked"]):
        return
    if old["real_dir"]:
        raise Refused(f"{old['link']} is a real folder, not a link; move it away, then run this again")
    parts = [p for p, hit in (("dependency", old["dependency"]), ("bundle entry", old["bundle"]),
                              ("link", old["linked"])) if hit]
    say(f"migrated from dsh Control Centre: removed the old {OLD_NAME} " + ", ".join(parts)
        + " (plugin files untouched)")
    profile.manifest.get("dependencies", {}).pop(OLD_NAME, None)
    if old["linked"] and not dry_run:
        remove_link(old["link"])


def install(profile: Profile, plugin_dir: Path, dry_run: bool, say) -> None:
    old_bundle_index = profile.bundles().index(OLD_NAME) if OLD_NAME in profile.bundles() else None
    plan_remove_old(profile, say, dry_run)
    deps = profile.manifest.setdefault("dependencies", {})
    spec = "link:" + plugin_dir.as_posix()
    if deps.get(NAME) != spec:
        say(f"{'updated' if NAME in deps else 'added'} dependency {NAME} -> {plugin_dir.as_posix()} in {profile.manifest_path}")
        deps[NAME] = spec
    bundles = profile.manifest.setdefault("dsh", {}).setdefault("profile", {}).setdefault("bundles", [])
    if old_bundle_index is not None:
        bundles.remove(OLD_NAME)
    if NAME not in bundles:
        if old_bundle_index is not None:
            bundles.insert(old_bundle_index, NAME)  # same place in the load order as the old entry
        else:
            bundles.append(NAME)
        say(f"added {NAME} to the bundles of profile {profile.name}")
    profile.save(dry_run, say)

    link = link_path(profile.root, NAME)
    if is_link(link):
        current = link_target(link)
        if same_path(current, plugin_dir):
            return
        say(f"relinked {link} -> {plugin_dir} (it pointed to {current})")
        if not dry_run:
            remove_link(link)
            make_link(link, plugin_dir)
    elif link.exists():
        raise Refused(f"{link} is a real folder, not a link; move it away, then run this again")
    else:
        say(f"linked {link} -> {plugin_dir}")
        if not dry_run:
            make_link(link, plugin_dir)


def remove(profile: Profile, dry_run: bool, say) -> None:
    plan_remove_old(profile, say, dry_run)
    if OLD_NAME in profile.bundles():
        profile.bundles().remove(OLD_NAME)
    new = profile.describe(NAME)
    if new["dependency"]:
        say(f"removed dependency {NAME} from {profile.manifest_path}")
        profile.manifest["dependencies"].pop(NAME, None)
    if new["bundle"]:
        say(f"removed {NAME} from the bundles of profile {profile.name}")
        profile.bundles().remove(NAME)
    profile.save(dry_run, say)
    if new["linked"]:
        say(f"removed the link {new['link']} (plugin files untouched)")
        if not dry_run:
            remove_link(new["link"])
    elif new["real_dir"]:
        raise Refused(f"{new['link']} is a real folder, not a link; it was left alone")


def status(profile: Profile, say) -> None:
    say(f"profile {profile.name}: {profile.manifest_path}")
    found = []
    for label, name in (("new", NAME), ("old", OLD_NAME)):
        d = profile.describe(name)
        present = d["dependency"] or d["bundle"] or d["linked"] or d["real_dir"]
        if present:
            found.append(label)
        if d["linked"]:
            link = f"link -> {d['target']} ({'target exists' if d['target_ok'] else 'TARGET MISSING'})"
        elif d["real_dir"]:
            link = "a real folder sits where the link should be"
        else:
            link = "no link"
        yn = lambda b: "yes" if b else "no"  # noqa: E731
        say(f"{label} {name}: dependency {yn(d['dependency'])}, bundle entry {yn(d['bundle'])}, {link}")
    state = {("new",): "new", ("old",): "old", ("new", "old"): "both"}.get(tuple(found), "none")
    say(f"installed: {state}" + {"old": " (run: python tools/install.py install to migrate)",
                                  "both": " (run: python tools/install.py install to finish the migration)",
                                  "none": ""}.get(state, ""))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="install.py", description="Install, remove or inspect Waypoint for dsh in a dsh profile.")
    ap.add_argument("command", choices=("install", "remove", "status"))
    ap.add_argument("--profile", default="web", help="dsh profile name (default: web)")
    ap.add_argument("--dsh-home", default=None, help="dsh home folder (default: $DSH_HOME, then ~/.dsh)")
    ap.add_argument("--dry-run", action="store_true", help="print what would change and write nothing")
    ap.add_argument("--plugin-dir", default=str(PLUGIN_DIR), help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    prefix = "would: " if args.dry_run and args.command != "status" else ""
    changes: list[str] = []

    def say(line: str) -> None:
        changes.append(line)
        print(prefix + line)

    try:
        profile = Profile(dsh_home(args.dsh_home), args.profile)
    except FileNotFoundError as exc:
        print(f"error: {exc}")
        return 2
    except json.JSONDecodeError as exc:
        print(f"error: the profile package.json is not valid JSON ({exc}); nothing changed")
        return 1
    try:
        if args.command == "status":
            status(profile, say)
            return 0
        if args.command == "install":
            install(profile, Path(args.plugin_dir).resolve(), args.dry_run, say)
        else:
            remove(profile, args.dry_run, say)
    except Refused as exc:
        print(f"refused: {exc}")
        return 1
    if not changes:
        print(f"nothing to do: {NAME} is already {'installed' if args.command == 'install' else 'absent'} in profile {args.profile}")
    elif not args.dry_run:
        print("restart dsh to load the change")
    return 0


if __name__ == "__main__":
    sys.exit(main())
