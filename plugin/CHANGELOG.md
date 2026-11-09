# Changelog

## 2.0.0 (2026-11-09): one tab per job, for any models and connectors

Waypoint 1.2 retired the always-on engine (port 8751) that the 1.x pages used. 2.0 is rebuilt on the Waypoint
data folder through Core's small Waypoint server.

### Tabs
- New native tabs, one per job: **Approvals**, **Projects**, **Running**, **Preferences** (add-on), **Brain** and
  **Learn** (add-ons), **Settings**.
- 1.x links still open: Todo and the 1.x Waypoint tab open Approvals; Plan and Execute open Projects; Autonomous
  opens Running. The Claude and Codex chat pages needed the retired engine; their links stay, with no sidebar row.

### Server and setup
- The plugin's host half starts the Waypoint server (`127.0.0.1:8762`) with dsh. Configure it in
  `~/.waypoint/config.json` (`core_dir`, `data_dir`, `python`, `prefs_tools`) or with `WAYPOINT_CORE`,
  `WAYPOINT_PYTHON`, `WAYPOINT_SERVER=off`.
- Only the dsh page may call the server; it checks the Host header and offers only the tabs' tools.
- Optional add-ons (preferences, Brain, Learn) are detected, never required. A new user without them gets a working
  app with those tabs hidden.
- Slow reads (a large preferences registry) are cached for a minute and never pile up.

### Docs
- README, INSTALL (config keys, troubleshooting) and a new [docs/CONNECTORS.md](docs/CONNECTORS.md).
- The upgrade guard checks the Waypoint server instead of the retired engine.

## 1.0.0 (2026-11-05): first release as Waypoint for dsh

The plugin that grew up as "dsh Control Centre" (0.1.0) now ships as its own product.

### Product and packaging
- New package name `@waypoint/dsh-plugin`, product name "Waypoint for dsh", cordis row id `waypoint`.
- Requires Waypoint Core API 1 (installed separately); `package.json` records `"waypoint": {"coreApi": 1}`.
- `tools/install.py install | remove | status` with `--profile`, `--dsh-home` and `--dry-run`. It migrates old
  `@waypoint/dsh-control-centre` installs and never deletes files.
- `tools/build.mjs` takes the module id and `CC.version` from `package.json`; the wrapper logs with `[waypoint]`.
- `tools/test.mjs` runs every node and Python test one file at a time; CI on Windows and Linux.
- `tools/export.py` builds the product tree and scans it for personal strings and secrets.
- The upgrade guard (`tools/after_dsh_upgrade.ps1`) also checks Waypoint Core's API version and gains `-SkipLive`.
- MIT licence. README, INSTALL, COMPAT, SECURITY and CONTRIBUTING written for the product.

### History before 1.0.0 (summarised from the plugin's git log)

**Foundations.** A spike proved the bundle loads inside dsh. Then came Create, Brain and Learn pages, the
flow chart and Plan tab, calm labels, and fixes from the first code review (run contract, security,
usage-safe execution).

**Second wave.** Sprints (later Autonomous), Agents and Interview pages; Brain overlaps; check counts on
nodes; a models registry and tab; a Gemini key switcher; claims; a Send-to inspector; Stars focus; project
import; chat picker badges and modes.

**Waypoint v2 and v3.** A feedback build of 47 tasks; loops; premium chat tabs; every route in Agents; three
waves of surface polish and design-review fixes; live-proved flows; a build guard that refuses a bundle that
does not parse; board kinds and "crosses" edges.

**v4.** A Claude-Code-style chat sidebar with subagent dropdowns; Agents moved into Settings; Interview became
Learn; neutral labels and a brand lint; Claude and Codex tabs off by default; dsh's own search and filter
hidden on Waypoint pages; a calmer overall feel.

**v5.** To-dos in two sections, the Execute tab, live updates over server-sent events and an app shell;
add-on switches read from the settings file; versions views (History and Skipped ideas).
