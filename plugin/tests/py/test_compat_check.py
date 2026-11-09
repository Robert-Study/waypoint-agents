"""compat_check.py against a fixture dsh tree (tmp_path) and, when present, the real install."""
from __future__ import annotations

import importlib.util
import json
import shutil
from pathlib import Path

import pytest

TOOLS = Path(__file__).resolve().parents[2] / "tools"
spec = importlib.util.spec_from_file_location("compat_check", TOOLS / "compat_check.py")
compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compat)

NODE = shutil.which("node")
REAL_BUNDLE = compat.PLUGIN_DIR / "lib" / "client.js"
needs_node = pytest.mark.skipif(not NODE or not REAL_BUNDLE.exists(), reason="node or built bundle missing")

# Declarations deliberately split across packages and odd paths: files moving must not matter.
SLOT_DECL = {
    "main": "        'main': {\n            kind: 'keyed';\n            scope: 'root';\n        };\n",
    "sidebar.panellist": "        'sidebar.panellist': {\n            kind: 'list';\n            scope: 'root';\n        };\n",
}
# Slots the bundle also uses (Sprints pin row, brand seats); always declared so each test varies one thing.
EXTRA_SLOTS = ("sidebar.panellist.actions", "sidebar.footer.action", "sidebar.brand.mark", "sidebar.brand.name", "conversation.hero.brand.mark",
               # v2 (4 Nov): workspace hide, flat picker, badges, command bar, live changes
               "conversation.hero.workspace", "conversation.input.model", "conversation.input.model.label",
               "shell.overlay", "sidebar.right.pane.tab")
for _slot in EXTRA_SLOTS:
    SLOT_DECL[_slot] = "        '" + _slot + "': {\n            kind: 'single';\n            scope: 'root';\n        };\n"
SERVICE_DECL = (
    "declare module '@deepseek-ai/cordis' {\n    interface Context {\n        layout: ILayout;\n        slots: SlotRegistry;\n        uiConversation: UiConversation;\n        sidebarRightTabs: SidebarRightTabs;\n    }\n}\n"
    "export interface ILayout {\n    selectPanel(panelId: string | null): void;\n}\n"
    "export declare class SlotRegistry {\n    readonly register: SlotCore['register'];\n"
    "    inject(key: string, callback: () => () => void): () => void;\n}\n"
)


def make_tree(tmp: Path, slots=("main", "sidebar.panellist"), services: str = SERVICE_DECL) -> tuple[Path, Path]:
    dsh = tmp / "dsh"
    mods = dsh / "node_modules" / "@deepseek-ai"
    (dsh).mkdir(parents=True)
    (dsh / "package.json").write_text(json.dumps({"name": "@deepseek-ai/dsh", "version": "9.9.9"}), encoding="utf-8")
    for i, slot in enumerate(tuple(slots) + EXTRA_SLOTS):
        f = mods / f"ui-pkg-{i}" / "lib" / "types" / "moved" / "deeper" / f"contract{i}.d.ts"
        f.parent.mkdir(parents=True)
        f.write_text("declare module 'x' {\n    interface SlotMap {\n" + SLOT_DECL[slot] + "    }\n}\n", encoding="utf-8")
    svc = mods / "runtime-pkg" / "lib" / "types" / "client" / "runtime.d.ts"
    svc.parent.mkdir(parents=True)
    svc.write_text(services, encoding="utf-8")
    (mods / "cordis").mkdir(parents=True)
    (mods / "cordis" / "package.json").write_text(json.dumps({"version": "4.1.0"}), encoding="utf-8")

    profile = tmp / "profile"
    link = profile / "node_modules" / Path(*compat.NAME.split("/")) / "lib"
    link.mkdir(parents=True)
    (link / "client.js").write_text("// fixture", encoding="utf-8")
    (profile / "package.json").write_text(json.dumps({
        "dsh": {"profile": {"bundles": [compat.NAME]}},
        "dependencies": {compat.NAME: "link:x"},
    }), encoding="utf-8")
    return dsh, profile


def run_main(capsys, *argv) -> tuple[int, list[str]]:
    code = compat.main(["--no-live", *argv])
    out = capsys.readouterr().out.splitlines()
    return code, [line for line in out if line.startswith("FAIL")]


@needs_node
def test_fixture_complete_passes(tmp_path, capsys):
    dsh, profile = make_tree(tmp_path)
    code, fails = run_main(capsys, "--dsh-root", str(dsh), "--profile-root", str(profile))
    assert fails == [] and code == 0


@needs_node
def test_fixture_missing_slot_fails(tmp_path, capsys):
    dsh, profile = make_tree(tmp_path, slots=("main",))
    code, fails = run_main(capsys, "--dsh-root", str(dsh), "--profile-root", str(profile))
    assert code == 1
    assert len(fails) == 1 and fails[0].startswith("FAIL  slot 'sidebar.panellist' declared")


@needs_node
def test_fixture_missing_service_member_fails(tmp_path, capsys):
    dsh, profile = make_tree(tmp_path, services=SERVICE_DECL.replace("    readonly register: SlotCore['register'];\n", ""))
    code, fails = run_main(capsys, "--dsh-root", str(dsh), "--profile-root", str(profile))
    assert code == 1
    assert [f.split("  ")[1] for f in fails] == ["slots.register available"]


def test_missing_slot_fails_without_bundle(tmp_path, capsys):
    dsh, profile = make_tree(tmp_path, slots=("sidebar.panellist",))
    code, fails = run_main(capsys, "--no-bundle", "--dsh-root", str(dsh), "--profile-root", str(profile))
    assert code == 1
    assert [f.split("  ")[1] for f in fails] == ["slot 'main' declared"]


@needs_node
def test_bundle_probe_catches_throwing_apply(tmp_path, capsys):
    dsh, profile = make_tree(tmp_path)
    plugin = tmp_path / "plugin"
    (plugin / "lib").mkdir(parents=True)
    (plugin / "lib" / "client.js").write_text(
        "window.__ModuleLoader__.load({ id: '" + compat.NAME + "', factory: function (require) {\n"
        "  return { inject: ['slots'], apply: function (ctx) { ctx.slots.inject('mian', function () {"
        " return ctx.slots.register({ name: 'mian', key: 'cc-create' }, function () { return {}; }); }); } };\n"
        "} });\n", encoding="utf-8")
    code, fails = run_main(capsys, "--dsh-root", str(dsh), "--profile-root", str(profile), "--plugin-dir", str(plugin))
    assert code == 1
    labels = [f.split("  ")[1] for f in fails]
    assert "bundle loads in node vm" in labels          # apply threw on a broken ctx
    assert "bundle apply registers cc-brain" in labels  # pages missing
    assert "slot 'mian' declared" in labels             # typo'd slot name caught from the bundle


@needs_node
@pytest.mark.skipif(not (compat.DEFAULT_DSH / "package.json").exists()
                    or not (compat.DEFAULT_PROFILE / "package.json").exists(), reason="dsh not installed")
def test_real_install_passes(capsys):
    manifest = json.loads((compat.DEFAULT_PROFILE / "package.json").read_text(encoding="utf-8"))
    if compat.NAME not in manifest.get("dsh", {}).get("profile", {}).get("bundles", []):
        pytest.skip(f"{compat.NAME} is not installed in the live dsh profile (run tools/install.py install)")
    code, fails = run_main(capsys)
    assert fails == [] and code == 0
