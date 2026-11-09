# Security

## What the plugin does and trusts

- It runs inside the dsh web app, in your browser, on your machine.
- It talks to one place: Waypoint Core at `http://127.0.0.1:8751`. It opens no ports and calls no cloud
  service of its own. No telemetry.
- Core accepts browser calls only from the dsh web origin (`http://127.0.0.1:3080` by default). Write calls
  are revision-checked by Core.
- The installer writes only the dsh profile `package.json` (with a backup) and one link in that profile's
  `node_modules`. It never edits the dsh install or any `cordis.patch.yml`, and removing the link never
  deletes files.
- Keys stay in your own environment. The plugin never stores, prints or sends API keys.

## Supported versions

Only the latest release gets security fixes.

## Reporting a problem

Please open a private security advisory on the repository (Security tab, "Report a vulnerability").
Include the version (`package.json`), your OS, your dsh version and the steps to reproduce. Do not post
exploit details in public issues until a fix is out.

## Before you publish a fork

- Run `python tools/export.py <empty folder>`. It scans every file for personal paths, names and secret
  patterns and lists what it finds.
- Check your git history for secrets too. A clean tree does not clean old commits.
