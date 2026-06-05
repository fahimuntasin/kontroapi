# Contributing to KontroAPI

Thanks for your interest in contributing! 🎉

## How to contribute

1. **Fork** the repo
2. **Create a branch** (`git checkout -b feature/amazing-feature`)
3. **Make changes** and test locally
4. **Run** `npm run lint && npm run typecheck`
5. **Commit** with a clear message
6. **Push** and open a **Pull Request**

## Local setup

```bash
git clone https://github.com/kontroapi/kontroapi.git
cd kontroapi
npm install
# Start Postgres + Redis
docker compose up -d
# Initialize database
psql "postgres://kontroapi:kontroapi@localhost:5433/kontroapi" -f apps/wa-engine/schema.sql
# Start dev mode
npm run dev
```

## Code style

- TypeScript strict mode
- ESLint config in `.eslintrc.js`
- Prettier for formatting (`npm run lint -- --fix`)
- 2-space indentation, single quotes, no semicolons (project convention)

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — tooling, deps, config
- `refactor:` — code change with no behavior change
- `test:` — add/fix tests

Example: `feat: add bulk message endpoint`

## Pull request

- One feature per PR
- Update docs if you change public API
- Add tests for new features (we use Vitest)
- Ensure CI passes

## Reporting bugs

Use [GitHub Issues](https://github.com/kontroapi/kontroapi/issues). Include:
- KontroAPI version (`kontroapi --version`)
- Node version (`node --version`)
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- Logs from `~/.kontroapi/kontroapi.log`

## Feature requests

Open a GitHub Issue with the `enhancement` label. Tell us:
- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

## License

By contributing, you agree your contributions are licensed under AGPL-3.0.
