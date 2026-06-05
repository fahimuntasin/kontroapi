# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Dashboard self-hosted mode (JWT-based auth)
- Pre-built Docker image
- Single binary distribution (pkg)
- Web UI for session management
- Webhook event explorer

## [0.1.0] - 2026-06-04

### Added
- Initial public release
- AGPL-3.0 license
- `kontroapi` CLI: `init`, `start`, `stop`, `status`, `update`, `config`
- One-command setup: Postgres + Redis + admin user + DB schema
- Docker Compose for local Postgres 16 + Redis 7
- Dockerfile for single-container deployment
- Self-hosted mode: full REST API without external dependencies
- Cloud mode: Supabase + NaafiPay (for hosted version)
- Local JWT auth (login, register, me endpoints)
- NaafiPay payment integration (cloud mode)
- Multi-session WhatsApp support
- REST API: sessions, messages, contacts, groups, channels, webhooks, tokens
- Chat inbox UI with real-time messaging
- Auto-migrations on first start
- Webhook HMAC-SHA256 verification
- AES-256-GCM encryption for stored secrets
- Rate limiting
- Comprehensive documentation: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- GitHub Actions CI (lint, typecheck, build)
- GitHub Actions publish (npm on tag, Docker on tag)

[Unreleased]: https://github.com/kontroapi/kontroapi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kontroapi/kontroapi/releases/tag/v0.1.0
