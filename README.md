# KontroAPI

**Open source WhatsApp Business API gateway. Self-host in 30 seconds.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green)]()
[![npm](https://img.shields.io/npm/v/@kontroapis/cli)](https://www.npmjs.com/package/@kontroapis/cli)

KontroAPI is a self-hostable WhatsApp Business API platform built on [Baileys](https://github.com/WhiskeySockets/Baileys). REST API, multi-session, webhooks, chat inbox, API keys — all under your control.

---

## Quick Start

```bash
# Install CLI
npm install -g @kontroapis/cli

# Generate config + docker-compose
kontroapi init -y

# Start the gateway
kontroapi start -d
```

Then open `http://localhost:3001` — the web setup wizard will guide you through:
- Creating your admin account
- Configuring your domain (Cloudflare Tunnel or Nginx auto-setup)
- Activating your license

**Zero terminal commands. Everything in the browser.**

---

## Features

- 📨 **REST API** — send/receive WhatsApp messages
- 🔐 **API Keys** — per-session tokens with scoped permissions
- 🪝 **Webhooks** — real-time message delivery with HMAC signatures
- 💬 **Chat Inbox** — web UI for viewing conversations
- 📊 **Dashboard** — session management, logs, analytics
- 🔄 **Multi-Session** — run multiple WhatsApp numbers
- 📱 **SMS Gateway** — OTP verification + fallback delivery
- 🧩 **n8n Integration** — drag-and-drop WhatsApp automation
- 🐳 **Docker** — one command deploy with Postgres + Redis

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Dashboard  │────▶│    Engine    │────▶│ WhatsApp│
│  (Next.js)  │     │  (Express)   │     │ (Baileys)│
│  :3001      │     │  :3000       │     └─────────┘
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  BullMQ      │
                    │  + Redis     │
                    └──────────────┘
```

## CLI Commands

| Command | Description |
|---|---|
| `kontroapi init` | Generate docker-compose.yml + .env |
| `kontroapi init -y` | Non-interactive, use defaults |
| `kontroapi start` | Start in foreground |
| `kontroapi start -d` | Start detached (background) |
| `kontroapi stop` | Stop all services |
| `kontroapi status` | Show container health |
| `kontroapi update` | Update CLI + Docker images |
| `kontroapi config` | View/edit configuration |

## Requirements

- Docker Engine 20.10+ & Docker Compose v2
- Node.js 20+
- 4 GB RAM recommended
- 10 GB disk space

## License

AGPL-3.0 — free for self-hosting. [Contact us](mailto:team@kontroapi.com) for commercial/SaaS licensing.

---

**Built by [KontroAPI](https://kontroapi.com)**
