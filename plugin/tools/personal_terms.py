"""Loader for tools/personal_terms.json: the single list of personal terms that must never ship.

The terms are stored base64-encoded so the list never matches itself. Matching is a case-insensitive
substring test in which slashes and runs of backslashes count as one separator (so a path matches whether
it is written with /, \\ or an escaped \\\\).

    from personal_terms import TERMS, hits, allowed
    hits("some text") -> [(kind, term), ...]
"""
from __future__ import annotations

import base64
import json
import re
from pathlib import Path

_DATA = json.loads(Path(__file__).with_name("personal_terms.json").read_text(encoding="utf-8"))


def _decode(value: str) -> str:
    return base64.b64decode(value).decode("utf-8")


TERMS: list[tuple[str, str]] = [(t["kind"], _decode(t["b64"])) for t in _DATA["terms"]]
ALLOWED: set[tuple[str, str]] = {(a["file"], _decode(a["line_b64"])) for a in _DATA["allowed"]}
OWNER_FIRST: str = next(term for kind, term in TERMS if kind == "owner-first-name")
_SEP = re.compile(r"[\\/]+")


def normalise(text: str) -> str:
    return _SEP.sub("/", text).lower()


_NORMAL = [(kind, term, normalise(term)) for kind, term in TERMS]


def hits(text: str) -> list[tuple[str, str]]:
    """Every (kind, term) found in ``text``."""
    n = normalise(text)
    return [(kind, term) for kind, term, nt in _NORMAL if nt in n]


def allowed(file: str, line: str) -> bool:
    """True for the one permitted occurrence: the copyright line in LICENSE."""
    return (file, line.strip()) in ALLOWED
