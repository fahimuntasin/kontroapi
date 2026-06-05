# @kontroapis/cli

Self-hostable WhatsApp Business API gateway — one command, full control.

## Quick start

```bash
# Install
npm install -g @kontroapis/cli

# Initialize (requires Docker)
kontroapi init

# Start
kontroapi start
```

Open `http://localhost:3001` and log in with the credentials shown in the init output.

## Commands

- `kontroapi init [-y]` — initialize a new instance (generates docker-compose.yml + .env + admin user)
- `kontroapi start [-d]` — start via `docker compose up` (`-d` for detached)
- `kontroapi stop` — stop all services
- `kontroapi status` — show service status
- `kontroapi update` — pull latest CLI + Docker images
- `kontroapi config [key] [value]` — view or edit configuration

## What it does

The `kontroapi` CLI orchestrates a complete self-hosted deployment:

- **Postgres 16** for all data (users, sessions, messages, billing)
- **Redis 7** for BullMQ job queues
- **`kontroapi/engine`** Docker image (Express + Baileys WhatsApp connection)
- **`kontroapi/dashboard`** Docker image (Next.js admin UI)

All state is stored in `~/.kontroapi/` (configurable via `KONTROAPI_HOME`).

## Architecture

```
~/.kontroapi/
├── config.json         # instance config (secrets, ports, billing)
├── .env                # secrets consumed by docker-compose
├── docker-compose.yml  # generated, edited via `kontroapi config`
├── data/
│   ├── sessions/       # Baileys auth state (mounted into engine)
│   └── logs/           # container logs
```

## Configuration

Override defaults with environment variables:

```bash
KONTROAPI_HOME=/var/lib/kontroapi         # config + data directory
KONTROAPI_ENGINE_IMAGE=ghcr.io/me/engine:v0.2.0  # custom engine image
KONTROAPI_DASHBOARD_IMAGE=ghcr.io/me/dashboard:v0.2.0
```

Use `kontroapi config` to update the running config (then `kontroapi start` to apply).

## License

AGPL-3.0 — free for self-hosting; commercial SaaS requires a license.
See [LICENSE](./LICENSE).

- Docs: https://docs.kontroapi.com
- GitHub: https://github.com/fahimuntasin/kontroapi
- Issues: https://github.com/fahimuntasin/kontroapi/issues
