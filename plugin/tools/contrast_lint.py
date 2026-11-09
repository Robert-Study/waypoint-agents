#!/usr/bin/env python3
"""WCAG contrast lint for the plugin colour tokens (stdlib only).

Parses the light and dark palettes from plugin/src/tokens.js and checks:
  * text tokens on every surface (>= 4.5:1), plus every token that plugin/src/*.js
    actually uses as a CSS `color:` value (discovered, so new text colours are covered);
  * marks (status dots, accent, lanes) on every surface (>= 3:1);
  * onStatus labels on the filled status backgrounds (>= 4.5:1);
  * literal #hex colours used for `color:` outside tokens.js, against every surface
    of both themes (>= 4.5:1).
Divider tokens (line, lineStrong) are decorative and skipped. Exit 0 = no failing pair.

Usage: python tools/contrast_lint.py [--tokens FILE] [--src DIR] [--json]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # plugin root (repo plugin/ or exported product root)
TOKENS = ROOT / "src" / "tokens.js"
SRC = ROOT / "src"

BODY = 4.5
UI = 3.0
THEMES = ("light", "dark")
SURFACES = ("bg", "surface", "surface2", "canvas")
TEXT = ("text", "text2", "text3", "accent", "done", "running", "error", "neutral")
MARKS = ("accent", "done", "ready", "running", "error", "neutral",
         "lane0", "lane1", "lane2", "lane3", "lane4", "lane5")
FILLS = ("accent", "done", "running", "error")
SKIP_AS_TEXT = {"line", "lineStrong", "selection", "hull", "bg", "surface", "surface2", "canvas", "onStatus"}

HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
COLOR_USE = re.compile(r"(?<![\w-])color\s*:\s*var\(--cc-([a-z0-9-]+)")
LITERAL_COLOR = re.compile(r"(?<![\w-])color\s*:\s*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)")
ANY_VAR = re.compile(r"var\(--cc-([a-z0-9-]+)")


NON_HEX: dict[str, set[str]] = {}


def camel(kebab: str) -> str:
    """text-3 -> text3, on-status -> onStatus, surface-2 -> surface2, line-strong -> lineStrong."""
    parts = kebab.split("-")
    out = parts[0]
    for p in parts[1:]:
        out += p if p.isdigit() else p[:1].upper() + p[1:]
    return out


def parse_hex(value: str) -> tuple[int, int, int]:
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        raise ValueError(f"expected #rrggbb, got {value!r}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _lin(c: int) -> float:
    s = c / 255
    return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4


def luminance(value: str) -> float:
    r, g, b = (_lin(c) for c in parse_hex(value))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    x, y = luminance(a), luminance(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)


def _block(text: str, start: int) -> str:
    """Return the text of the {...} block whose opening brace is the first one at/after start."""
    i = text.index("{", start)
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                return text[i + 1:j]
    raise ValueError("unbalanced braces in palette")


def parse_palette(js: str) -> dict[str, dict[str, str]]:
    m = re.search(r"\bpalette\s*=\s*\{", js)
    if not m:
        raise ValueError("palette object not found in tokens.js")
    body = _block(js, m.start())
    palette: dict[str, dict[str, str]] = {}
    for theme in THEMES:
        tm = re.search(rf"\b{theme}\s*:\s*\{{", body)
        if not tm:
            raise ValueError(f"theme {theme!r} not found in palette")
        theme_body = _block(body, tm.start())
        palette[theme] = {k: v for k, v in re.findall(r"(\w+)\s*:\s*'(#[0-9a-fA-F]{3,6})'", theme_body)}
        # Non-hex tokens (rgba dividers) are defined but not contrast-checked.
        NON_HEX.setdefault(theme, set()).update(k for k, v in re.findall(r"(\w+)\s*:\s*'([^']*)'", theme_body)
                                                if not v.startswith("#"))
    return palette


def build_pairs(palette: dict, extra_text: set[str]) -> list[dict]:
    pairs: list[dict] = []
    for theme in THEMES:
        text = list(TEXT) + sorted(t for t in extra_text if t not in TEXT)
        for fg in text:
            for bg in SURFACES:
                pairs.append(dict(theme=theme, fg=fg, bg=bg, min=BODY, kind="text"))
        for fg in ("text", "text2"):
            pairs.append(dict(theme=theme, fg=fg, bg="hull", min=BODY, kind="text"))
        for bg in FILLS:
            pairs.append(dict(theme=theme, fg="onStatus", bg=bg, min=BODY, kind="on-fill"))
        pairs.append(dict(theme=theme, fg="text", bg="selection", min=BODY, kind="text"))
        for fg in MARKS:
            for bg in SURFACES + ("hull",):
                pairs.append(dict(theme=theme, fg=fg, bg=bg, min=UI, kind="mark"))
    return pairs


def discover(src: Path, tokens_file: Path) -> tuple[set[str], list[tuple[str, str]], set[str]]:
    """Scan plugin/src for text colour tokens, literal text colours and referenced tokens."""
    used_text: set[str] = set()
    literals: list[tuple[str, str]] = []
    referenced: set[str] = set()
    for path in sorted(src.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        for m in COLOR_USE.finditer(text):
            name = camel(m.group(1))
            if name not in SKIP_AS_TEXT:
                used_text.add(name)
        for m in ANY_VAR.finditer(text):
            if not m.group(1).endswith("-"):  # a dynamic name such as --cc-lane-' + i
                referenced.add(camel(m.group(1)))
        if path.resolve() != tokens_file.resolve():
            for m in LITERAL_COLOR.finditer(text):
                literals.append((path.name, m.group(1)))
    return used_text, literals, referenced


def run(tokens_file: Path, src: Path) -> dict:
    palette = parse_palette(tokens_file.read_text(encoding="utf-8"))
    used_text, literals, referenced = discover(src, tokens_file)
    problems: list[str] = []
    defined = set(palette["light"]) & set(palette["dark"])
    known = defined | (NON_HEX.get("light", set()) & NON_HEX.get("dark", set()))
    for theme in THEMES:
        missing = sorted((set(TEXT) | set(MARKS) | set(SURFACES) | {"hull", "onStatus", "selection"}) - set(palette[theme]))
        problems += [f"{theme}.{k} is missing from tokens.js" for k in missing]
    unknown_text = sorted(t for t in used_text if t not in defined)
    warnings = [f"color:var(--cc-{t}) used in plugin/src but not defined in both themes" for t in unknown_text]
    warnings += [f"var(--cc-{t}) referenced but not a palette token (may be a non-colour var)"
                 for t in sorted(referenced - known - {"mono"} - set(unknown_text))]
    failures: list[dict] = []
    checked = 0
    for pr in build_pairs(palette, {t for t in used_text if t in defined}):
        p = palette[pr["theme"]]
        if pr["fg"] not in p or pr["bg"] not in p:
            continue
        checked += 1
        ratio = contrast(p[pr["fg"]], p[pr["bg"]])
        if ratio < pr["min"]:
            failures.append({**pr, "fg_hex": p[pr["fg"]], "bg_hex": p[pr["bg"]], "ratio": round(ratio, 2)})
    for fname, hexv in literals:
        for theme in THEMES:
            for bg in SURFACES:
                if bg not in palette[theme]:
                    continue
                checked += 1
                ratio = contrast(hexv, palette[theme][bg])
                if ratio < BODY:
                    failures.append(dict(theme=theme, fg=f"literal {hexv} ({fname})", bg=bg, min=BODY, kind="literal",
                                         fg_hex=hexv, bg_hex=palette[theme][bg], ratio=round(ratio, 2)))
    return dict(checked=checked, failures=failures, problems=problems, warnings=warnings,
                used_text_tokens=sorted(used_text), literal_text_colours=len(literals))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--tokens", type=Path, default=TOKENS)
    ap.add_argument("--src", type=Path, default=SRC)
    ap.add_argument("--json", action="store_true", help="print the full report as JSON")
    args = ap.parse_args(argv)
    try:
        report = run(args.tokens, args.src)
    except (OSError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, indent=2))
    for w in report["warnings"]:
        print(f"warn: {w}", file=sys.stderr)
    for pr in report["problems"]:
        print(f"FAIL: {pr}", file=sys.stderr)
    for f in report["failures"]:
        print(f"FAIL {f['theme']}: {f['fg']} {f['fg_hex']} on {f['bg']} {f['bg_hex']} = {f['ratio']:.2f} < {f['min']}",
              file=sys.stderr)
    if report["failures"] or report["problems"]:
        print(f"FAIL: {len(report['failures'])} failing pairs of {report['checked']} checked", file=sys.stderr)
        return 1
    print(f"PASS: {report['checked']} pairs meet WCAG AA in light and dark")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
