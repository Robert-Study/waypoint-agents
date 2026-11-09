"""Fingerprint the installed dsh (every package.json under @deepseek-ai: name, version, size, mtime).

Used to show the Waypoint for dsh install leaves the dsh npm install untouched.
Usage: python tools/dsh_install_fingerprint.py [--compare FILE]  -> prints one sha256 line.
DSH_INSTALL overrides the dsh install folder.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

ROOT = Path(os.environ["DSH_INSTALL"]) if os.environ.get("DSH_INSTALL") else (
    Path.home() / "AppData" / "Roaming" / "npm" / "node_modules" / "@deepseek-ai" / "dsh")


def fingerprint(root: Path = ROOT) -> str:
    digest = hashlib.sha256()
    targets = [root / "package.json", root / "lib" / "bin.js"]
    scoped = root / "node_modules" / "@deepseek-ai"
    targets += sorted(p / "package.json" for p in scoped.iterdir() if p.is_dir())
    targets += sorted(p / "lib" / "client.js" for p in scoped.iterdir() if (p / "lib" / "client.js").exists())
    for path in targets:
        st = os.stat(path)
        digest.update(f"{path.relative_to(root).as_posix()}|{st.st_size}|{int(st.st_mtime)}\n".encode())
    return digest.hexdigest()


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "--compare":
        expected = Path(sys.argv[2]).read_text(encoding="utf-8").strip()
        actual = fingerprint()
        print("dsh install unchanged" if actual == expected else f"dsh install CHANGED: {actual}")
        sys.exit(0 if actual == expected else 1)
    print(fingerprint())
