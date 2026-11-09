# Compatibility notes

## From dsh Control Centre to Waypoint for dsh (1.0.0)

Waypoint for dsh was first built as "dsh Control Centre". Version 1.0.0 is the same plugin under its own
product name.

What changed:

| Before | Now |
| --- | --- |
| package `@waypoint/dsh-control-centre` 0.1.0 | package `@waypoint/dsh-plugin` 1.0.0 |
| cordis row id `rob-cc` | cordis row id `waypoint` |
| link `node_modules/@waypoint/dsh-control-centre` | link `node_modules/@waypoint/dsh-plugin` |
| backup `package.json.cc-backup` | backup `package.json.waypoint-backup` |
| `scripts/build_plugin.mjs`, `scripts/install_plugin.py --remove` | `tools/build.mjs`, `tools/install.py install / remove / status` |
| console prefix `[control-centre]` from the bundle wrapper | `[waypoint]` (some page code still logs `[control-centre]`; both are accepted) |
| engine bundled in the same repository | Waypoint Core is a separate product; this plugin needs Core API 1 |

Migration command (safe to run more than once):

```
python tools/install.py install
```

It removes the old dependency, bundle entry and link (the link only; no files are deleted), puts the new
package in the old one's place in the bundle order, and prints one line saying it migrated. Restart dsh.
`python tools/install.py status` shows `old`, `new`, `both` or `none`.

### Internal ids that stay

These names are internal. They keep the old prefix on purpose, so saved state and dsh's remembered layout
survive the rename:

- **CSS prefix `cc-`** (classes and CSS variables such as `--cc-text`): page styles and tokens. Renaming them
  would touch every page for no user benefit.
- **Page ids `cc-todo`, `cc-plan`, `cc-create`, `cc-sprints`, `cc-brain`, `cc-learn`, `cc-settings` and the
  rest**: dsh stores the selected panel and sidebar order by these ids. New ids would reset each person's
  layout and break old links.
- **The `CC` JavaScript namespace**: the shared object every source file attaches to. It never leaves the
  bundle.
- **localStorage keys** (they start with `cc-` or `cc.`): remembered filters, tab choices and panel sizes.

### The MCP server `rob_control_centre` is not part of this plugin

Some setups have an MCP client row named `rob_control_centre` in `~/.dsh/cordis.patch.yml`. The owner's own
dsh launcher writes that row to reach the Waypoint Core MCP server. It is not written, read or removed by this
plugin or its installer, and renaming the plugin does not affect it.

## How dsh uses the bundle id

Read from the dsh 0.2.1 sources (`@deepseek-ai/dsh-app-boot`, `@deepseek-ai/dsh-client-modules`):

- A profile's tree is built from the bundles in `dsh.profile.bundles` (in `profiles/<name>/package.json`),
  in order. Each bundle is an npm package whose `package.json` has `"dsh": {"bundle": {"patch": ...}}`; dsh
  applies that patch file, then the profile's own `cordis.patch.yml`. The bundle name resolves first from the
  dsh install, then from the profile folder (its `node_modules`).
- **The cordis row `name` must equal the package name.** The loader resolves the row's `name` as a package and
  reads its `dsh.client` block and `exports["./client"]`. The client module table is keyed by that name.
- **The `__ModuleLoader__.load({id})` id must equal the package name too.** The browser module system looks
  up each boot-graph row by its id (the package name) and materialises the factory registered under the same
  id. A bundle that registers under any other id fails with "bundle loaded without registering ...".
  `tools/build.mjs` therefore reads the id from `package.json`.
- **The cordis row `id` is only the entry's identity in the tree.** Later patch layers use it to target the
  row (update or remove it); dsh generates one when a row omits it. It does not have to match the package
  name. It is `waypoint` now; nothing else refers to the old `rob-cc`.

## dsh and Core versions

- dsh: tested with 0.2.1 (cordis 4). `tools/compat_check.py` checks every slot and service the bundle uses
  against the installed dsh types after each upgrade.
- Waypoint Core: API 1 (`package.json` → `"waypoint": {"coreApi": 1}`). The upgrade guard fails when Core
  reports a different `api`.
