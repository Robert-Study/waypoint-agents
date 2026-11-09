"""Neutral values for answers that would otherwise show this machine (record.py calls apply()).

The sample engine runs on this computer, so a few answers still describe it: which command-line
tools are installed and where, which bridges and helper scripts exist, git repositories, API key
slots and the model lineup from this machine's dsh. Those are replaced here by a small, plausible
set: Claude Code, Codex, Gemini CLI and a local model, all reachable, with usage around 30-70 %
(the usage numbers themselves come from the seeded usage cache, see record.py).
"""
from __future__ import annotations

import copy

NEUTRAL_HOME = "C:\\Users\\alex"

# Routes this demo does not show at all (browser bridges and helpers that are host-specific).
DROP_IDS = {"chatmode", "agent:chatmode", "groq", "copilot"}

# Display names: product names on the host become the neutral lineup.
TEXT = [
    ("Antigravity Gemini 4 Argon", "Gemini CLI Pro"),
    ("Antigravity Claude/GPT", "Gemini CLI partner models"),
    ("Antigravity Gemini", "Gemini CLI"),
    ("Antigravity (agy CLI), an agentic coder. Not the Gemini API key pool.", "Gemini CLI, an agentic coder. Not the Gemini API key pool."),
    ("Antigravity (agy)", "Gemini CLI"),
    ("Antigravity", "Gemini CLI"),
    ("agy CLI", "gemini CLI"),
    ("DeepSeek V4.1 Flash via Freebuff, free; text only", "A local model on this computer, free; text only"),
    ("Free pool through the local proxy, DeepSeek V4.1 Flash first.", "A local model served on this computer; free, text only."),
    ("Freebuff (free)", "Local model (free)"),
    ("Freebuff", "Local model"),
    ("Meridian", "Waypoint"),
    ("Max subscription", "Team subscription"),
    ("Plus subscription", "Team subscription"),
]


PROVIDERS = {"freebuff": "ollama", "antigravity": "google"}


def _text(s: str) -> str:
    for a, b in TEXT:
        if a in s:
            s = s.replace(a, b)
    return s


def _walk(x):
    """Relabel strings and drop rows of routes this demo does not show."""
    if isinstance(x, str):
        return _text(x)
    if isinstance(x, list):
        out = []
        for v in x:
            if isinstance(v, dict) and (v.get("id") in DROP_IDS or v.get("agent_id") in DROP_IDS
                                        or v.get("route") in DROP_IDS):
                continue
            if isinstance(v, str) and v in DROP_IDS:
                continue
            out.append(_walk(v))
        return out
    if isinstance(x, dict):
        if x.get("provider") in PROVIDERS:  # the provider column shows this id's display name
            x = dict(x, provider=PROVIDERS[x["provider"]])
        return {k: _walk(v) for k, v in x.items()
                if not (isinstance(k, str) and (k in DROP_IDS or any(k.endswith(":" + d) for d in DROP_IDS)))}
    return x


CONNECTIONS = [
    {"id": "claude_code", "name": "Claude Code", "agent_id": "claude_code", "state": "ready", "line": "Ready", "ok": True, "enabled": True, "dispatchable": True},
    {"id": "codex", "name": "Codex", "agent_id": "codex", "state": "ready", "line": "Ready", "ok": True, "enabled": True, "dispatchable": True},
    {"id": "antigravity_manual", "name": "Gemini CLI", "agent_id": "antigravity", "state": "ready", "line": "Ready", "ok": True, "enabled": True, "dispatchable": True},
    {"id": "freebuff", "name": "Local model", "agent_id": "freebuff", "state": "ready", "line": "Ready", "ok": True, "enabled": True, "dispatchable": True},
    {"id": "gemini_studio", "name": "Gemini API (AI Studio)", "agent_id": None, "state": "ready", "line": "Ready: 2 keys", "ok": True, "enabled": True, "dispatchable": True},
    {"id": "gemini_app", "name": "Gemini App", "agent_id": None, "state": "ready", "line": "Manual: Copy Prompt", "ok": True, "enabled": True, "dispatchable": True},
    {"id": "deepseek_dsh", "name": "Built-in agent (dsh)", "agent_id": None, "state": "ready", "line": "Ready", "ok": True, "enabled": True, "dispatchable": True},
]
DETAIL = {"claude_code": "claude on PATH", "codex": "codex on PATH", "antigravity": "gemini on PATH",
          "freebuff": "listening on port 11434"}


# The models each agent offers in its chat composer's Model chip (chat_panel.js reads agents[].models).
def _m(model, label, elo, ctx):
    return {"id": model, "model": model, "label": label, "elo": elo, "context_window": ctx}


AGENT_MODELS = {
    "claude_code": [_m("opus", "Claude Opus 5", 1468, 200000), _m("sonnet", "Claude Sonnet 5", 1452, 200000),
                    _m("haiku", "Claude Haiku 5", 1371, 200000)],
    "codex": [_m("gpt-5.5-codex", "GPT-5.5 Codex", 1460, 400000), _m("gpt-5.5-mini", "GPT-5.5 mini", 1389, 400000)],
    "antigravity": [_m("gemini-3-pro", "Gemini 3 Pro", 1447, 1048576), _m("gemini-3-flash", "Gemini 3 Flash", 1402, 1048576)],
    "freebuff": [_m("qwen3-8b", "Qwen3 8B", 1214, 32768), _m("llama-4-scout", "Llama 4 Scout", 1236, 131072)],
}
CHAT_PICK = {"model": "sonnet", "effort": "medium", "why": "Strongest switched-on model with the most usage left this week.",
             "label": "Claude Sonnet 5", "route": "claude_code", "dsh": None}


def _agents(d):
    for a in d.get("agents") or []:
        if a.get("id") in AGENT_MODELS and not a.get("models"):
            a["models"] = copy.deepcopy(AGENT_MODELS[a["id"]])
        if a.get("id") in DETAIL:
            a["available"] = True
            a["availability_detail"] = DETAIL[a["id"]]
        if a.get("id") == "freebuff":
            a["route"] = "local server"
            a["note"] = "Runs on this computer; free; text only"
    d["connections"] = copy.deepcopy(CONNECTIONS)
    d["folders"] = [{"id": "drive", "label": "Notes", "path": NEUTRAL_HOME + "\\Notes"},
                    {"id": "docs-site", "label": "docs-site", "path": NEUTRAL_HOME + "\\Projects\\docs-site"}]
    d["default_folder"] = "drive"
    return d


def _chat_row(rid, label, provider, model, elo, ctx, speed, note, kind="chat", pool=None, in_picker=True, usage=None):
    return {"id": rid, "label": label, "provider": provider, "provider_label": None, "kind": kind, "model": model,
            "route": None, "runner": None, "roles": [], "pool": pool, "enabled": True, "access": None, "elo": elo,
            "elo_by_effort": {"low": "n/a", "medium": str(elo), "high": "n/a", "xhigh": "n/a", "max": "n/a"},
            "effort": None, "context_window": ctx, "speed": speed, "usage": usage, "run_natively": False,
            "run_natively_reason": None, "note": note, "strongest": True, "strongest_rule": None, "pool_size": 1,
            "source": "demo lineup", "sources": {}, "dsh": None, "canonical": model, "badge": None,
            "in_picker": in_picker, "health": None}


CHAT_ROWS = [
    _chat_row("chat:anthropic/claude-sonnet-5", "Claude Sonnet 5", "anthropic", "claude-sonnet-5", 1452, 200000, "medium",
              "Balanced model for everyday chat and review."),
    _chat_row("chat:google/gemini-3-pro", "Gemini 3 Pro", "google", "gemini-3-pro", 1447, 1048576, "medium",
              "Long context; good for reading many files at once."),
    _chat_row("chat:deepseek/deepseek-v4-flash", "DeepSeek V4 Flash", "deepseek", "deepseek-v4-flash", 1391, 131072, "fast",
              "Fast and cheap for drafts and summaries."),
    _chat_row("chat:ollama/qwen3-8b", "Qwen3 8B (local)", "ollama", "qwen3-8b", 1214, 32768, "fast",
              "Runs on this computer; free."),
    _chat_row("subagent:gemini/gemini-3-flash", "Gemini 3 Flash", "google", "gemini-3-flash", 1402, 1048576, "fast",
              "Gemini API key pool; free tier.", kind="subagent", in_picker=False),
]

KEYS = {"provider": "Google AI Studio (Gemini API)",
        "separate_from": "Gemini CLI is a different product with its own sign-in and usage; this pool is only the Google AI Studio Gemini API keys.",
        "slots": [{"slot": "Primary", "label": "Primary", "env": "GEMINI_API_KEY", "present": True, "active": True, "same_as": None, "from": ".env"},
                  {"slot": "Backup", "label": "Backup", "env": "GEMINI_API_KEY_2", "present": True, "active": False, "same_as": None, "from": ".env"}],
        "active": "Primary", "active_state": "ok",
        "dsh_target": "~/.dsh/.credentials.yaml refs.GEMINI_API_KEY (dsh's Google AI Studio provider)",
        "subagent_rotation": ["Primary", "Backup"],
        "rotation_note": "The Gemini subagent starts at the first slot and moves to the next on a 429.",
        "restart_hint": "dsh reads its credentials when it starts: restart dsh for a switch to reach the chat picker.",
        "source": ".env + environment (names only)"}


def _sync(d):
    stamp = d.get("checked_at")
    return {"mode": "Local", "repos": [
        {"name": "docs-site", "path": NEUTRAL_HOME + "\\Projects\\docs-site", "branch": "main", "upstream": "origin/main",
         "ahead": 0, "behind": 0, "dirty": False, "cloud_ahead": False, "state": "up_to_date", "detail": None},
        {"name": "onboarding-emails", "path": NEUTRAL_HOME + "\\Projects\\onboarding-emails", "branch": "main",
         "upstream": "origin/main", "ahead": 1, "behind": 0, "dirty": False, "cloud_ahead": False, "state": "ahead", "detail": None}],
        "needs_merge": False, "last": None, "checked_at": stamp}


def apply(responses: dict, pids=None, owner="Alex") -> dict:
    out = {}
    for path, body in responses.items():
        body = copy.deepcopy(body)
        bare = path.split("?")[0]
        if bare == "/api/agents" and isinstance(body, dict):
            body = _agents(body)
        elif bare == "/api/models" and isinstance(body, dict):
            body["models"] = list(body.get("models") or []) + copy.deepcopy(CHAT_ROWS)
        elif bare == "/api/models/gemini_keys":
            body = copy.deepcopy(KEYS)
        elif bare == "/api/sync/status" and isinstance(body, dict):
            body = _sync(body)
        elif path == "/api/pick?kind=chat":
            body = copy.deepcopy(CHAT_PICK)
        elif bare == "/api/model_health" and isinstance(body, dict):
            body["routes"], body["lists"] = {}, {}
        out[path] = _walk(body)
    return out
