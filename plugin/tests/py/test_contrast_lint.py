"""Tests for the WCAG contrast linter."""

import importlib.util
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[2] / "tools" / "contrast_lint.py"
spec = importlib.util.spec_from_file_location("contrast_lint", MODULE_PATH)
assert spec is not None and spec.loader is not None
contrast_lint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contrast_lint)

LIGHT = dict(bg="#ffffff", surface="#ffffff", surface2="#f9f9f9", canvas="#fafafa", hull="#eeeeee",
             selection="#cceedd", onStatus="#ffffff", text="#111111", text2="#444444", text3="#555555",
             accent="#0e7360", done="#16702f", ready="#2e9645", running="#0969da", error="#cf222e",
             neutral="#5a6068", lane0="#a0784c", lane1="#5a6fb0", lane2="#a45f8c", lane3="#3f8f83",
             lane4="#8f8a3a", lane5="#6e737c")
DARK = dict(bg="#101010", surface="#161616", surface2="#1d1d1d", canvas="#0b0b0b", hull="#1a1a1a",
            selection="#12382f", onStatus="#0b0b0b", text="#eeeeee", text2="#bbbbbb", text3="#aaaaaa",
            accent="#5ee0bd", done="#34c759", ready="#2a9d48", running="#2f8fff", error="#ff453a",
            neutral="#8e8e93", lane0="#c9a074", lane1="#8e9bd1", lane2="#c78bb0", lane3="#6fb5a8",
            lane4="#b8ad62", lane5="#9a9ea6")


def js(light=LIGHT, dark=DARK):
    def block(d):
        return ", ".join(f"{k}: '{v}'" for k, v in d.items()) + ", line: 'rgba(0,0,0,.08)', lineStrong: 'rgba(0,0,0,.16)'"
    return "const palette = {\n light: { %s },\n dark: { %s }\n};\n" % (block(light), block(dark))


def project(tmp_path: Path, tokens: str, other: str = "") -> tuple[Path, Path]:
    src = tmp_path / "plugin" / "src"
    src.mkdir(parents=True)
    (src / "tokens.js").write_text(tokens, encoding="utf-8")
    if other:
        (src / "view.js").write_text(other, encoding="utf-8")
    return src / "tokens.js", src


def test_contrast_known_values():
    assert contrast_lint.contrast("#000000", "#ffffff") == pytest.approx(21.0)
    assert contrast_lint.contrast("#ffffff", "#ffffff") == pytest.approx(1.0)
    assert contrast_lint.contrast("#777777", "#ffffff") == pytest.approx(4.48, abs=0.01)
    assert contrast_lint.contrast("#fff", "#000") == pytest.approx(21.0)


def test_camel_maps_css_names_to_palette_keys():
    assert contrast_lint.camel("text-3") == "text3"
    assert contrast_lint.camel("on-status") == "onStatus"
    assert contrast_lint.camel("line-strong") == "lineStrong"
    assert contrast_lint.camel("accent") == "accent"


def test_parse_palette_reads_both_themes_and_skips_rgba(tmp_path):
    tokens, _ = project(tmp_path, js())
    palette = contrast_lint.parse_palette(tokens.read_text(encoding="utf-8"))
    assert palette["light"]["text"] == "#111111" and palette["dark"]["accent"] == "#5ee0bd"
    assert "line" not in palette["light"]


def test_parse_palette_rejects_missing_theme():
    with pytest.raises(ValueError):
        contrast_lint.parse_palette("const palette = { light: { text: '#000000' } };")


def test_good_palette_passes(tmp_path):
    tokens, src = project(tmp_path, js())
    report = contrast_lint.run(tokens, src)
    assert report["failures"] == [] and report["problems"] == []
    assert report["checked"] > 100


def test_low_contrast_text_is_reported_with_theme_and_ratio(tmp_path):
    bad = dict(LIGHT, text3="#bbbbbb")
    tokens, src = project(tmp_path, js(light=bad))
    report = contrast_lint.run(tokens, src)
    hits = [f for f in report["failures"] if f["fg"] == "text3" and f["theme"] == "light"]
    assert hits and all(f["ratio"] < 4.5 for f in hits)
    assert not [f for f in report["failures"] if f["theme"] == "dark"]


def test_mark_needs_only_three_to_one(tmp_path):
    # ~3.2:1 on the lightest surfaces: fine as a mark, too low as text.
    mid = dict(LIGHT, lane0="#858585")
    tokens, src = project(tmp_path, js(light=mid))
    report = contrast_lint.run(tokens, src)
    assert not [f for f in report["failures"] if f["fg"] == "lane0"]
    mid = dict(LIGHT, lane0="#cccccc")
    tokens, src = project(tmp_path / "b", js(light=mid))
    assert [f for f in contrast_lint.run(tokens, src)["failures"] if f["fg"] == "lane0"]


def test_onstatus_on_fill_is_checked(tmp_path):
    bad = dict(DARK, onStatus="#34c759")
    tokens, src = project(tmp_path, js(dark=bad))
    fails = contrast_lint.run(tokens, src)["failures"]
    assert any(f["fg"] == "onStatus" and f["theme"] == "dark" for f in fails)


def test_literal_text_colour_outside_tokens_is_checked(tmp_path):
    tokens, src = project(tmp_path, js(), "const css = '.x{color:#bbbbbb;}';")
    report = contrast_lint.run(tokens, src)
    assert report["literal_text_colours"] == 1
    assert any(f["kind"] == "literal" and f["theme"] == "light" for f in report["failures"])


def test_discovers_text_tokens_used_in_source_but_not_border_color(tmp_path):
    other = "css = '.a{color:var(--cc-lane-3);} .b{border-color:var(--cc-surface);} .c{color:var(--cc-text-2);}'"
    tokens, src = project(tmp_path, js(), other)
    report = contrast_lint.run(tokens, src)
    assert "text2" in report["used_text_tokens"]
    assert "surface" not in report["used_text_tokens"]
    assert "lane3" in report["used_text_tokens"]


def test_missing_token_is_a_problem(tmp_path):
    light = {k: v for k, v in LIGHT.items() if k != "accent"}
    tokens, src = project(tmp_path, js(light=light))
    report = contrast_lint.run(tokens, src)
    assert any("light.accent" in p for p in report["problems"])


def test_main_exit_codes(tmp_path, capsys):
    tokens, src = project(tmp_path / "ok", js())
    assert contrast_lint.main(["--tokens", str(tokens), "--src", str(src)]) == 0
    tokens, src = project(tmp_path / "bad", js(light=dict(LIGHT, text="#dddddd")))
    assert contrast_lint.main(["--tokens", str(tokens), "--src", str(src)]) == 1
    assert "FAIL light: text" in capsys.readouterr().err
    assert contrast_lint.main(["--tokens", str(tmp_path / "none.js")]) == 2


def test_real_tokens_have_no_failing_pairs():
    report = contrast_lint.run(contrast_lint.TOKENS, contrast_lint.SRC)
    assert report["failures"] == [] and report["problems"] == []
