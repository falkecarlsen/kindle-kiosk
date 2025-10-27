# server

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run 
```

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Home Assistant control

Set the following environment variables before starting the server so it can capture and control the dashboard session:

- `HA_URL` – Base URL of your Home Assistant instance (e.g. `http://homeassistant.local:8123`).
- `HA_TOKEN` – Long-lived access token with permission to load the Kindle Lovelace view.
- `TOUCH_MAX_X` / `TOUCH_MAX_Y` (optional) – Raw touch bounds reported by the Kindle input client; defaults to the 1072x1448 viewport.
- `HA_DASHBOARD_PATH` (optional) – Default Lovelace route to load, defaults to `lovelace/kindle`.
- `HA_DEFAULT_PAGE` (optional) – Initial logical page id used by the server state; pairs with `HA_DASHBOARD_VIEWS`.
- `HA_DASHBOARD_VIEWS` (optional) – Comma-separated overrides mapping logical ids to Lovelace routes, e.g. `main=lovelace/kindle,alt=lovelace/alternate`.

Example:

```bash
HA_URL=http://homeassistant.local:8123 \
HA_TOKEN=abcdef123... \
HA_DASHBOARD_VIEWS="main=lovelace/kindle,alt=lovelace/alternate" \
bun run server.ts
```
