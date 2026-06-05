# Publishing to npm

## Prerequisites

1. **npm account** — https://www.npmjs.com/signup
2. **Email verified** — npm sends verification
3. **Two-factor auth** — recommended (authenticator app)
4. **GitHub repo** — `kontroapi/kontroapi` (must match `repository` field in `packages/cli/package.json`)

## One-time setup

### 1. Create npm access token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **Generate New Token** → **Granular Access Token**
3. Permissions: `Read and write packages` for `kontroapi` and `@kontroapi/*`
4. Copy the token (you'll only see it once)

### 2. Add token to GitHub

1. Go to https://github.com/kontroapi/kontroapi/settings/secrets/actions
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: paste the token from step 1

### 3. Login locally (for testing)

```bash
npm login
# Enter username, password, email, OTP
```

## Publishing

### Option A: GitHub Actions (recommended)

```bash
# 1. Update version in packages/cli/package.json
# 2. Commit
git add packages/cli/package.json
git commit -m "chore: bump version to 0.1.1"

# 3. Create tag
git tag v0.1.1
git push origin main
git push origin v0.1.1

# 4. GitHub Actions runs publish.yml
#    - npm publish (auto)
#    - Docker build + push (auto)
```

### Option B: Manual publish

```bash
# 1. Build
cd packages/cli
rm -rf dist
npx tsc

# 2. Verify
npm pack --dry-run

# 3. Test install
npm install -g .
kontroapi --version

# 4. Publish
npm publish --access public

# 5. Verify
npm view kontroapi
npx kontroapi --help
```

## Versioning

- **Patch** (0.1.0 → 0.1.1): bug fixes
- **Minor** (0.1.0 → 0.2.0): new features (backwards compatible)
- **Major** (0.1.0 → 1.0.0): breaking changes

Use `npm version patch|minor|major` to bump and create a git tag in one go.

## Pre-release versions

For beta/alpha/RC:

```bash
npm version 0.2.0-beta.1
npm publish --tag beta
# Users install with: npm install -g kontroapi@beta
```

## After publishing

1. **GitHub Release** — Create at https://github.com/kontroapi/kontroapi/releases
   - Title: `v0.1.0`
   - Description: copy from `CHANGELOG.md`
   - Attach: `kontroapi-0.1.0.tgz` from the workflow artifacts

2. **Docker Hub** — Verify image at https://hub.docker.com/r/kontroapi/kontroapi

3. **Docs site** — Update https://docs.kontroapi.com with new version

4. **Social** — Tweet, post on LinkedIn, notify Discord/Telegram

## Troubleshooting

### "You do not have permission to publish"

Your npm account doesn't own `kontroapi`. Either:
- Get added as a maintainer on the existing package
- Or use a scoped name like `@kontroapi/cli`

### "package name too similar to existing"

npm blocks names that look like typos of popular packages. If blocked, use a scoped package:
- Rename `packages/cli/package.json` to `"@kontroapi/cli"`
- Update `bin` field
- Republish

### "402 Payment Required"

npm requires a paid account for private packages. Public packages are always free. Make sure `"access": "public"` is set in `publishConfig`.

### "Cannot find module" on install

Some dependencies might not be in `dependencies` vs `devDependencies`. Run:
```bash
npm install --save <package-name>
```

Then re-publish.
