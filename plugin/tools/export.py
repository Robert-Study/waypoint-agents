"""Export Waypoint for dsh as its own product tree, then scan it. Standard library only.

    python tools/export.py <empty folder outside the repo>
    python tools/export.py --list            scan what would be exported; print findings only, copy nothing

The product tree is this plugin folder as the repository root: src, lib, assets, tests, tools (without .cache),
docs, .github, package.json, cordis.patch.yml and the top-level documents. Caches, node_modules and .git are
never copied. Source files are copied byte for byte: nothing is rewritten.

Every text file is then scanned for personal strings (case-insensitive) and secret patterns (API keys, tokens,
private keys). Findings are printed as file:line (secret matches masked) and the exit code is 1. The only
allowed personal string is the copyright line in LICENSE. Nothing is pushed or published.
Exit codes: 0 clean, 1 findings, 2 refused (target inside the repo or not empty).
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]

SKIP_PARTS = {"node_modules", ".cache", ".git", "__pycache__", ".pytest_cache", ".venv"}
SKIP_SUFFIX = (".pyc", ".log", ".tmp", ".token", ".sqlite", ".sqlite-wal", ".sqlite-shm")
SKIP_NAMES = {".env", ".DS_Store", "Thumbs.db"}
BINARY_SUFFIX = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".zip"}

# Personal terms come from tools/personal_terms.json (base64, so the list never matches itself).
sys.path.insert(0, str(Path(__file__).resolve().parent))
import personal_terms  # noqa: E402

# Same secret patterns as the Waypoint repo's standalone exporter.
SECRETS = [
    ("google api key", re.compile(r"AIza[0-9A-Za-z_\-]{35}")),
    ("sk- key", re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}")),
    ("groq key", re.compile(r"\bgsk_[A-Za-z0-9]{20,}")),
    ("github token", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}")),
    ("slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9\-]{10,}")),
    ("aws key id", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("private key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")),
    ("assigned secret", re.compile(
        r"""(?i)\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"][A-Za-z0-9_\-/+]{24,}['"]""")),
]
# The one personal string that is allowed (the LICENSE copyright line) is listed in personal_terms.json.


def mask(text: str) -> str:
    return text[:4] + "***" if len(text) > 8 else "***"


def file_set(root: Path = PLUGIN) -> list[Path]:
    """Relative paths of every file that belongs in the product tree."""
    out = []
    for p in sorted(root.rglob("*")):
        rel = p.relative_to(root)
        if set(rel.parts) & SKIP_PARTS or rel.name in SKIP_NAMES or rel.suffix in SKIP_SUFFIX:
            continue
        if p.is_file():
            out.append(rel)
    return out


def scan(root: Path, files: list[Path] | None = None) -> list[dict]:
    """Personal strings and secret patterns: [{file, line, kind, rule, match}] (secrets masked)."""
    found = []
    for rel in files if files is not None else file_set(root):
        p = root / rel
        if p.suffix.lower() in BINARY_SUFFIX:
            continue
        try:
            data = p.read_bytes()
        except OSError:
            continue
        if b"\0" in data[:4096]:
            continue
        text = data.decode("utf-8", errors="replace")
        relp = rel.as_posix()
        for no, line in enumerate(text.splitlines(), 1):
            if not personal_terms.allowed(relp, line):
                for rule, term in personal_terms.hits(line):
                    found.append({"file": relp, "line": no, "kind": "personal", "rule": rule, "match": term})
            for rule, rx in SECRETS:
                m = rx.search(line)
                if m:
                    found.append({"file": relp, "line": no, "kind": "secret", "rule": rule, "match": mask(m.group(0))})
    return found


def repo_root(path: Path) -> Path | None:
    try:
        out = subprocess.run(["git", "-C", str(path), "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return Path(out.stdout.strip()).resolve() if out.returncode == 0 and out.stdout.strip() else None


def inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def export(target: Path, root: Path = PLUGIN) -> dict:
    target = Path(target).resolve()
    guard = [root] + [r for r in (repo_root(root),) if r]
    for g in guard:
        if inside(target, g) or inside(g, target):
            raise ValueError(f"the target must be outside {g} (and not contain it)")
    if target.exists() and any(target.iterdir()):
        raise ValueError(f"target is not empty: {target}")
    files = file_set(root)
    for rel in files:
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / rel, dest)
    return {"files": [r.as_posix() for r in files], "findings": scan(target, files)}


def print_findings(findings: list[dict]) -> None:
    for f in findings:
        print(f"  {f['kind']:8} {f['rule']:16} {f['file']}:{f['line']}  {f['match']}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="export.py", description=__doc__.split("\n")[0])
    ap.add_argument("target", nargs="?", help="folder to create (outside the repo, empty or missing)")
    ap.add_argument("--list", action="store_true", help="scan the files that would be exported; print findings only")
    args = ap.parse_args(argv)
    if args.list:
        findings = scan(PLUGIN)
        print_findings(findings)
        print(f"export scan: {len(findings)} finding(s)")
        return 1 if findings else 0
    if not args.target:
        ap.error("give a target folder, or --list")
    try:
        result = export(Path(args.target))
    except ValueError as exc:
        print(f"export: refused: {exc}")
        return 2
    print(f"export: {len(result['files'])} files copied to {args.target}")
    if result["findings"]:
        print(f"export: FAILED, {len(result['findings'])} finding(s) in the exported tree (source not changed):")
        print_findings(result["findings"])
        return 1
    print("export: scan clean (no personal strings or secret patterns found)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
