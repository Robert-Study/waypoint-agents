# Waypoint for dsh

Plan, run and review AI work inside dsh (DeepSeek Harness).

Waypoint for dsh adds a set of pages to the dsh sidebar. You describe a goal, Waypoint splits it into
small tasks with checks, hands them to the AI tools you have switched on, and shows progress, failures and
reviews in one place.

## How it fits together

- **Waypoint Core** (the rest of this repository) keeps your projects,
  tasks, questions, to-dos and usage in one data folder.
- This plugin adds the tabs to dsh and starts Core's small **Waypoint server** (`127.0.0.1:8762`) when dsh starts.
  The tabs read and write only through that server. See [INSTALL.md](INSTALL.md) to point it at Core and your data.
- It works with any models and connectors you set up in Core: see [docs/CONNECTORS.md](docs/CONNECTORS.md).

## Tabs

- **Approvals**: questions from your agents, answered in one click, and your to-dos (Approvals and Hands-on).
- **Projects**: projects by family with a version picker, the task graph, and a panel for each task.
- **Running**: what runs now, usage per pool with floors, providers on or off, and sprints.
- **Preferences** (add-on): review captured preferences and proposed skill edits; confirm toolbox items.
- **Brain** (add-on): your notes, skills and instructions as a list and a graph.
- **Learn** (add-on): topics in order, one teaching step at a time, and practice.
- **Settings**: which tabs show, the Waypoint server and data folder, models and connectors, add-ons, version.

Add-ons show only when the Waypoint server reports them available (Settings > Waypoint > Add-ons says how to turn
one on).

## Screenshots

See the repository README (`docs/screenshots/`).
## Quick start

You need dsh (`npm i -g @deepseek-ai/dsh`, run once), Node.js 20+, Python 3.11+ and Waypoint Core 1.2+.

```
git clone https://github.com/Robert-Study/waypoint-agents.git
cd waypoint-agents
cd plugin
node tools/build.mjs
python tools/install.py install
```

Restart dsh. The Waypoint tabs appear in the sidebar, and dsh starts the Waypoint server. Full steps, upgrades and uninstall are in
[INSTALL.md](INSTALL.md). Coming from "dsh Control Centre"? See [COMPAT.md](COMPAT.md).

## Privacy and zero spend

- Everything runs on your machine. The plugin only talks to the Waypoint server on `127.0.0.1`.
- No telemetry, no analytics, no cloud service of its own.
- No paid API route is used by default. Core keeps metered keys away from the tools it runs.

## Development

No build tools and no npm packages. `node tools/build.mjs` builds `lib/client.js`;
`node tools/test.mjs` runs every test. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT. See [LICENSE](LICENSE).
