# Models and connectors

Waypoint for dsh does not choose your models. It shows and switches what your Waypoint data folder knows about.

## Where the list comes from

- **Providers** (the agents, CLIs and API routes that can do work: for example a Claude, Codex, Gemini, DeepSeek or
  local Ollama route) are the agent toggles in your data folder. Waypoint Core writes them; the **Running** tab and
  **Settings > Waypoint > Models and connectors** read them with `ops_read` and switch them with `toggle_set`.
- **Usage pools** (a provider's 5-hour or weekly allowance, or a free pool) come from the usage readings in your
  data folder. Each pool can have a **floor**: below it, agents stop using that pool. Set it in the Running tab or
  in Settings; leave it empty for no floor.

Nothing in the plugin names a vendor. Add, remove or rename a provider in Waypoint Core and the tabs follow on the
next read.

## Add a provider

1. Register the route in Waypoint Core (see Core's own guide: agents and runners). It then appears in the data
   folder's agent toggles.
2. If it has a usage allowance, let Core record readings for it (a usage pool). Pools without readings show a dash,
   never an invented number.
3. Open **Running** in dsh: the provider shows with its state (up, down or failed, with the reason as a tip) and an
   on/off switch.

## Turn a provider off

Use its switch. Waypoint stops sending work there at once; running work finishes. The switch writes to the data
folder, so every Waypoint surface (dsh, the web page, the Claude mod) sees the same state.

## Spend

The plugin itself makes no model calls and has no keys. Paid routes stay off unless you switch them on in Core.
