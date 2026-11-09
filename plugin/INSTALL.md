# Install Waypoint for dsh

## What you need

- dsh: `npm i -g @deepseek-ai/dsh`. Run `dsh` once so it creates its home folder (`~/.dsh`), then close it.
- Node.js 20 or newer, and Python 3.11 or newer. No npm packages are needed.
- Waypoint Core 1.2 or newer (the folder that holds `runner/`, see the Core project's own install guide) and a
  Waypoint data folder. The plugin starts Core's small Waypoint server (`127.0.0.1:8762`) itself each time dsh
  starts; you do not run anything else.

## Tell the plugin where Waypoint is

The plugin reads `~/.waypoint/config.json` (create it if it is missing). All keys are optional:

```json
{
  "core_dir": "C:/path/to/waypoint",
  "data_dir": "C:/path/to/waypoint-data",
  "python": "C:/path/to/python.exe",
  "prefs_tools": "C:/path/to/your/preference-tools"
}
```

- `core_dir`: Waypoint Core. Not needed when the plugin sits inside a Core checkout. Or set `WAYPOINT_CORE`.
- `data_dir`: your Waypoint data folder (projects, to-dos, questions, usage). Default `~/.waypoint/data`.
- `python`: the Python that runs the server. Default `py -3` on Windows, `python3` elsewhere. Or `WAYPOINT_PYTHON`.
- `prefs_tools`: the optional Preferences add-on (a folder with `mcp_preferences.py`). Leave it out and the
  Preferences tab says the add-on is off.
- Set `WAYPOINT_SERVER=off` if you start the server yourself (`python -m waypoint_runner.wpc_http` in Core's `runner/`).

## Fresh clone to dsh

Windows (PowerShell):

```
git clone https://github.com/Robert-Study/waypoint-agents.git
cd waypoint-agents
cd plugin
node tools\build.mjs
python tools\install.py install
```

macOS and Linux:

```
git clone https://github.com/Robert-Study/waypoint-agents.git
cd waypoint-agents
cd plugin
node tools/build.mjs
python3 tools/install.py install
```

Then restart dsh. The Waypoint pages appear in the sidebar.

What install does:

- It adds `@waypoint/dsh-plugin` to the dependencies and the bundle list in
  `~/.dsh/profiles/web/package.json`. The first time it changes that file it keeps a copy beside it as
  `package.json.waypoint-backup`.
- It links `~/.dsh/profiles/web/node_modules/@waypoint/dsh-plugin` to your clone (a directory junction on
  Windows, a symlink elsewhere).
- It never touches the dsh install or any `cordis.patch.yml`.

Options:

- `--profile <name>`: another dsh profile (default `web`).
- `--dsh-home <folder>`: another dsh home. Without it the `DSH_HOME` environment variable is used, then `~/.dsh`.
- `--dry-run`: print what would change and write nothing.

Check what is installed at any time:

```
python tools/install.py status
```

It prints `installed: new`, `old`, `both` or `none`, and whether the link target exists.

## Upgrade from dsh Control Centre

Older installs used the package name `@waypoint/dsh-control-centre`. Run install once:

```
python tools/install.py install
```

It removes the old dependency, bundle entry and link (the old files are not deleted), adds the new
package in the same place in the load order, and says so in one line. Restart dsh. Your saved layout and
settings carry over. Details are in [COMPAT.md](COMPAT.md).

## Uninstall

```
python tools/install.py remove
```

This removes the dependency, the bundle entry and the link. Your clone is left as it is. Restart dsh.
To restore the profile file exactly as it was before the first install, copy
`package.json.waypoint-backup` back over `package.json`.

## After a dsh upgrade

After `npm i -g @deepseek-ai/dsh`, run the upgrade guard.

Windows:

```
powershell -NoProfile -File tools\after_dsh_upgrade.ps1
```

macOS and Linux (PowerShell 7 as `pwsh`):

```
pwsh -NoProfile -File tools/after_dsh_upgrade.ps1
```

It rebuilds the bundle, checks it still fits the new dsh, checks Waypoint Core's API version, and (on
Windows with Edge, while dsh runs) opens each page in a hidden browser. It ends with one line:
`VERDICT: OK - ...` or `VERDICT: FAIL - <what>. Next: <what to do>`. Add `-SkipLive` to skip the checks that
read your live dsh profile, and `-SkipSmoke` to skip the browser test.

Without PowerShell, run the two main checks yourself:

```
node tools/build.mjs
python3 tools/compat_check.py --dsh-root "$(npm root -g)/@deepseek-ai/dsh"
```

## Troubleshooting

- **A tab says the Waypoint server is not running.** dsh's log shows one `[waypoint]` line saying why (Core not
  found, or Python failed). Fix `core_dir` or `python` in `~/.waypoint/config.json`, then restart dsh.
- **The upgrade guard says Core API 2 (or another number).** This release needs API 1. Install the matching
  Core release, or a Waypoint for dsh release made for that API.
- **Install says a real folder sits where the link should be.** Move that folder away and run install again.
  Install never deletes folders.
