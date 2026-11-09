"""U1/U3-U8: tools/review_items.py reads docs/ui_review.md checklist items
`- [ ] <surface> · <severity high|med|low> · <finding> → <fix>` and gates one surface.
Stdlib + pytest only; every test writes its own review file under tmp_path."""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

PLUGIN = Path(__file__).resolve().parents[2]
SCRIPT = PLUGIN / "tools" / "review_items.py"

spec = importlib.util.spec_from_file_location("review_items", SCRIPT)
ri = importlib.util.module_from_spec(spec)
sys.modules["review_items"] = ri   # dataclasses look the module up while the class is built
spec.loader.exec_module(ri)

DOC = """# UI review

## Create
- [x] create · high · Inspector header wraps at 1024 → page_create.js: clamp title to one line
- [ ] create · med · Star labels collide → view_star.js: offset labels by 6px

## Shell
- [X] shell · low · Command bar hint is junk text → command_bar.js: drop the hint row
- [x] shell · med · Settings rows use 13px → settings.js: use 12px

Verdict: not ready; Create has one open item.
"""


def run(tmp_path: Path, text: str | None, *args: str) -> subprocess.CompletedProcess:
    f = tmp_path / "ui_review.md"
    if text is not None:
        f.write_text(text, encoding="utf-8")
    return subprocess.run([sys.executable, str(SCRIPT), "--file", str(f), *args],
                          capture_output=True, text=True, encoding="utf-8")


def test_parse_items():
    items, bad = ri.parse(DOC)
    assert bad == []
    assert [(i.surface, i.severity, i.done) for i in items] == [
        ("create", "high", True), ("create", "med", False), ("shell", "low", True), ("shell", "med", True)]
    assert items[1].finding == "Star labels collide"
    assert items[1].fix == "view_star.js: offset labels by 6px"


def test_ascii_separators_are_accepted():
    items, bad = ri.parse("- [ ] plan . low . x -> y\n- [ ] plan | low | x -> y\n- [ ] plan · low · x -> y\n")
    assert bad == ["- [ ] plan . low . x -> y", "- [ ] plan | low | x -> y"]
    assert len(items) == 1 and items[0].fix == "y"


def test_has_verdict():
    assert ri.has_verdict(DOC)
    assert ri.has_verdict("**Verdict:** ship it\n")
    assert not ri.has_verdict("No verdict here\n- [x] shell · low · a → b\n")


def test_surface_all_ticked_exits_zero(tmp_path):
    r = run(tmp_path, DOC, "--surface", "shell")
    assert r.returncode == 0, r.stdout + r.stderr
    assert "shell: 2/2" in r.stdout


def test_surface_with_open_item_exits_one_and_prints_it(tmp_path):
    r = run(tmp_path, DOC, "--surface", "create")
    assert r.returncode == 1
    assert "Star labels collide" in r.stdout
    assert "Inspector header wraps" not in r.stdout   # ticked items are not reprinted


def test_missing_verdict_fails_even_when_ticked(tmp_path):
    r = run(tmp_path, DOC.replace("Verdict:", "Summary:"), "--surface", "shell")
    assert r.returncode == 1
    assert "Verdict" in r.stdout


def test_missing_file_fails(tmp_path):
    r = run(tmp_path, None, "--surface", "shell")
    assert r.returncode == 1
    assert "not found" in r.stdout


def test_malformed_item_for_surface_fails_closed(tmp_path):
    r = run(tmp_path, DOC + "- [ ] shell - low - broken line\n", "--surface", "shell")
    assert r.returncode == 1
    assert "malformed" in r.stdout


def test_unknown_item_surface_or_severity_is_malformed():
    _, bad = ri.parse("- [ ] sidebar · high · a → b\n- [ ] shell · urgent · a → b\n")
    assert len(bad) == 2


def test_surface_with_no_items_passes_with_verdict(tmp_path):
    r = run(tmp_path, DOC, "--surface", "brain")
    assert r.returncode == 0
    assert "brain: 0/0" in r.stdout


def test_unknown_surface_argument_is_usage_error(tmp_path):
    r = run(tmp_path, DOC, "--surface", "sidebar")
    assert r.returncode == 2


def test_summary_counts_every_surface(tmp_path):
    r = run(tmp_path, DOC, "--summary")
    assert r.returncode == 0
    assert "create: 1/2" in r.stdout and "shell: 2/2" in r.stdout and "agents: 0/0" in r.stdout


@pytest.mark.parametrize("surface", ri.SURFACES)
def test_every_surface_name_is_accepted(tmp_path, surface):
    r = run(tmp_path, f"- [x] {surface} · low · a → b\nVerdict: ok\n", "--surface", surface)
    assert r.returncode == 0, r.stdout
