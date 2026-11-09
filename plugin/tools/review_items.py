"""Gate one surface of the UI review (docs/ui_review.md) on its checklist items.

Items have the form
    - [ ] <surface> · <severity high|med|low> · <finding> → <fix>
and are ticked as `- [x]`. The file must also carry a `Verdict:` line.

    python tools/review_items.py --surface create   exit 0 only when every create item is ticked
    python tools/review_items.py --summary          ticked/total per surface, exit 0
    --file PATH                                       another review file (tests)

Exit 1 lists the open items (or names the missing file / Verdict / malformed lines); exit 2 is a usage error.
A checklist line that does not parse fails every gate, so a typo can never hide an open item.
Stdlib only.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

SURFACES = ("create", "autonomous", "agents", "plan", "brain", "shell")
SEVERITIES = ("high", "med", "low")
_PLUGIN = Path(__file__).resolve().parents[1]
# docs/ui_review.md lives beside the plugin in the Waypoint repo; an exported tree may carry its own copy.
DEFAULT_FILE = next((p for p in (_PLUGIN / "docs" / "ui_review.md", _PLUGIN.parent / "docs" / "ui_review.md") if p.exists()),
                    _PLUGIN / "docs" / "ui_review.md")

CHECK_LINE = re.compile(r"^\s*[-*] \[( |x|X)\]\s")
ITEM = re.compile(
    r"^\s*[-*] \[(?P<tick>[ xX])\]\s+(?P<surface>[a-z]+)\s+·\s+(?P<severity>[a-z]+)\s+·\s+"
    r"(?P<finding>.+?)\s+(?:→|->)\s+(?P<fix>.+?)\s*$")
VERDICT = re.compile(r"^\s*(?:[#>*_\s]*)Verdict\s*(?:\*\*|__)?\s*:", re.MULTILINE)


@dataclass(frozen=True)
class Item:
    surface: str
    severity: str
    finding: str
    fix: str
    done: bool
    line: int


def parse(text: str) -> tuple[list[Item], list[str]]:
    """Return (items, malformed checklist lines)."""
    items: list[Item] = []
    bad: list[str] = []
    for n, raw in enumerate(text.splitlines(), 1):
        if not CHECK_LINE.match(raw):
            continue
        m = ITEM.match(raw)
        if not m or m["surface"] not in SURFACES or m["severity"] not in SEVERITIES:
            bad.append(raw.strip())
            continue
        items.append(Item(m["surface"], m["severity"], m["finding"].strip(), m["fix"].strip(),
                          m["tick"] in "xX", n))
    return items, bad


def has_verdict(text: str) -> bool:
    return bool(VERDICT.search(text))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Gate a UI review surface on its checklist items.")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--surface", choices=SURFACES)
    g.add_argument("--summary", action="store_true")
    ap.add_argument("--file", type=Path, default=DEFAULT_FILE)
    a = ap.parse_args(argv)

    if not a.file.is_file():
        print(f"review_items: {a.file} not found")
        return 1
    text = a.file.read_text(encoding="utf-8")
    items, bad = parse(text)

    if a.summary:
        for s in SURFACES:
            mine = [i for i in items if i.surface == s]
            print(f"{s}: {sum(i.done for i in mine)}/{len(mine)} ticked")
        for b in bad:
            print(f"malformed: {b}")
        print("verdict: " + ("present" if has_verdict(text) else "MISSING"))
        return 0

    mine = [i for i in items if i.surface == a.surface]
    open_items = [i for i in mine if not i.done]
    print(f"{a.surface}: {len(mine) - len(open_items)}/{len(mine)} ticked")
    for i in open_items:
        print(f"  open  line {i.line} [{i.severity}] {i.finding} → {i.fix}")
    for b in bad:
        print(f"  malformed: {b}")
    verdict = has_verdict(text)
    if not verdict:
        print("  no Verdict: line in the review")
    return 0 if not open_items and not bad and verdict else 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
