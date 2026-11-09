"""ui_lint.py - anti-slop lint for the Waypoint for dsh plugin source (stdlib only).

Fails (exit 1) on:
  * `!important`
  * gradients (CSS *-gradient(), SVG linearGradient/radialGradient)
  * glows: box-shadow / text-shadow with a blur radius, drop-shadow()/blur() filters,
    backdrop-filter, SVG feGaussianBlur/feDropShadow
  * more than 5 distinct font sizes across all scanned files
  * raw colours (hex, rgb(), rgba(), hsl(), hsla()) outside plugin/src/tokens.js

Usage: python tools/ui_lint.py [files or folders ...]   (default: src)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Plugin root: plugin/ in the Waypoint repo, the repo root in the exported product tree.
REPO = Path(__file__).resolve().parent.parent
DEFAULT_TARGET = REPO / "src"
TOKENS_FILE = "tokens.js"
MAX_FONT_SIZES = 5
EXTENSIONS = {".js", ".mjs", ".css", ".html"}

IMPORTANT = re.compile(r"!\s*important", re.I)
GRADIENT = re.compile(r"(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|<?\b(?:linearGradient|radialGradient)\b", re.I)
GLOW_FILTER = re.compile(r"drop-shadow\s*\(|\bfilter\s*:\s*[^;'\"]*blur\s*\(|backdrop-?filter|feGaussianBlur|feDropShadow", re.I)
SHADOW = re.compile(r"(?:box-shadow|boxShadow|text-shadow|textShadow)\s*[:=]\s*['\"`]?([^;'\"`}]*)", re.I)
LENGTH = re.compile(r"(-?\d*\.?\d+)(px|rem|em)?")
FONT_SIZE = re.compile(
    r"font-size\s*:\s*['\"]?\s*(\d*\.?\d+)\s*(px|rem|em|pt)?"
    r"|fontSize\s*:\s*['\"]?(\d*\.?\d+)\s*(px|rem|em|pt)?"
    r"|font-size\s*=\s*['\"](\d*\.?\d+)\s*(px|rem|em|pt)?"
    r"|font-size\s*:\s*['\"]?\s*\+?\s*S\.(\w+)",  # tokens.js builds sizes from CC.tokens.size
    re.I,
)
HEX = re.compile(r"(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])")
FUNC_COLOUR = re.compile(r"\b(?:rgba?|hsla?)\s*\(", re.I)
URL_REF = re.compile(r"url\(\s*['\"]?#|href\s*=\s*['\"]#")


def strip_comments(text: str) -> str:
    """Remove // line and /* */ block comments (good enough for our hand-written sources)."""
    text = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    return re.sub(r"(?<![:'\"\\])//[^\n]*", "", text)


def shadow_is_glow(value: str) -> bool:
    """A shadow is allowed only as a hard ring/line: every blur radius must be 0."""
    value = value.strip()
    if not value or value.lower() in {"none", "inherit", "initial", "unset"}:
        return False
    for layer in value.split(","):
        lengths = [float(m.group(1)) for m in LENGTH.finditer(re.sub(r"var\([^)]*\)", "", layer))]
        if len(lengths) >= 3 and lengths[2] != 0:
            return True
    return False


def iter_files(targets: list[Path]):
    for t in targets:
        if t.is_dir():
            for p in sorted(t.rglob("*")):
                if p.is_file() and p.suffix in EXTENSIONS:
                    yield p
        elif t.is_file():
            yield t


def token_sizes(tokens_text: str) -> dict[str, str]:
    m = re.search(r"size\s*:\s*\{([^}]*)\}", tokens_text)
    out: dict[str, str] = {}
    if m:
        for k, v in re.findall(r"(\w+)\s*:\s*(\d+)", m.group(1)):
            out[k] = v
    return out


def lint(targets: list[Path]) -> int:
    problems: list[str] = []
    sizes: dict[str, list[str]] = {}
    files = list(iter_files(targets))
    tokens_path = DEFAULT_TARGET / TOKENS_FILE
    tok_sizes = token_sizes(tokens_path.read_text(encoding="utf-8")) if tokens_path.exists() else {}
    for path in files:
        try:
            rel = path.relative_to(REPO).as_posix()
        except ValueError:
            rel = path.as_posix()
        raw = path.read_text(encoding="utf-8")
        text = strip_comments(raw)
        is_tokens = path.name == TOKENS_FILE
        for n, line in enumerate(text.splitlines(), 1):
            where = f"{rel}:{n}"
            if IMPORTANT.search(line):
                problems.append(f"{where}: !important is not allowed")
            if GRADIENT.search(line):
                problems.append(f"{where}: gradients are not allowed")
            if GLOW_FILTER.search(line):
                problems.append(f"{where}: blur/glow filters are not allowed")
            for m in SHADOW.finditer(line):
                if shadow_is_glow(m.group(1)):
                    problems.append(f"{where}: shadow with blur (glow) is not allowed: {m.group(1).strip()[:60]}")
            for m in FONT_SIZE.finditer(line):
                if m.group(7):
                    val = tok_sizes.get(m.group(7))
                    unit = "px"
                    if val is None:
                        problems.append(f"{where}: unknown size token S.{m.group(7)}")
                        continue
                else:
                    val = m.group(1) or m.group(3) or m.group(5)
                    unit = (m.group(2) or m.group(4) or m.group(6) or "px").lower()
                key = f"{float(val):g}{unit}"
                sizes.setdefault(key, []).append(where)
            if not is_tokens:
                scrub = URL_REF.sub("", line)
                for m in HEX.finditer(scrub):
                    problems.append(f"{where}: raw colour {m.group(0)} outside tokens.js (use a --cc-* token)")
                if FUNC_COLOUR.search(scrub):
                    problems.append(f"{where}: raw rgb()/hsl() colour outside tokens.js (use a --cc-* token)")
    if len(sizes) > MAX_FONT_SIZES:
        detail = ", ".join(f"{k} ({len(v)}x, e.g. {v[0]})" for k, v in sorted(sizes.items()))
        problems.append(f"{len(sizes)} distinct font sizes (max {MAX_FONT_SIZES}): {detail}")
    for p in problems:
        print("FAIL " + p)
    print(f"ui_lint: {len(files)} files, font sizes {sorted(sizes) or '[]'}, {len(problems)} problem(s)")
    return 1 if problems else 0


def main(argv: list[str]) -> int:
    targets = [Path(a).resolve() for a in argv] if argv else [DEFAULT_TARGET]
    missing = [t for t in targets if not t.exists()]
    if missing:
        print("ui_lint: missing " + ", ".join(str(m) for m in missing))
        return 2
    return lint(targets)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
