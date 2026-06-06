# @kontroapis/cli

Self-hostable WhatsApp Business API gateway — one command, full control.

## Quick Start

```bash
npm install -g @kontroapis/cli
kontroapi init -y
kontroapi start -d
```

Open `http://localhost:3001` — the web wizard handles admin setup, domain config, and activation.

## Commands

| Command | Description |
|---|---|
| `kontroapi init -y` | Generate config + docker-compose.yml |
| `kontroapi start -d` | Start engine + dashboard (background) |
| `kontroapi stop` | Stop all services |
| `kontroapi status` | Show container health |
| `kontroapi update` | Update CLI + pull latest images |
| `kontroapi config` | View/edit configuration |

## Requirements

- Docker + Docker Compose v2
- Node.js 20+

## License

AGPL-3.0

[GitHub](https://github.com/fahimuntasin/kontroapi) · [Website](https://kontroapi.com)
