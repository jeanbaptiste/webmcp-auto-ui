---
title: Deployment
description: Deploy apps to production with deploy.sh, systemd and nginx
sidebar:
  order: 4
---

## Quick deploy

```bash
./scripts/deploy.sh                # deploy all apps
./scripts/deploy.sh flex           # deploy one app
./scripts/deploy.sh home viewer    # deploy specific apps
```

The script handles everything: package builds, app builds, old file cleanup on the server, copying to the correct path, sha256 verification, service restart, and confirmation.

**Always use this script. Never deploy manually with scp or rsync.**

## Server architecture

```
/opt/webmcp-demos/
  home/              # static -- nginx serves directly
  todo/              # static -- nginx serves directly
  showcase/          # static -- nginx serves directly
  flex/              # Node -- systemd: node index.js
  viewer/build/      # Node -- systemd: node build/index.js
```

### Deploy paths differ by app

| App | systemd ExecStart | Deploy destination | Type |
|-----|-------------------|--------------------|------|
| **flex** | `node index.js` | `/opt/webmcp-demos/flex/` (root) | Node |
| **viewer** | `node build/index.js` | `/opt/webmcp-demos/viewer/build/` | Node |
| home | static (nginx) | `/opt/webmcp-demos/home/` | Static |
| todo | static (nginx) | `/opt/webmcp-demos/todo/` | Static |
| showcase | static (nginx) | `/opt/webmcp-demos/showcase/` | Static |

**If you deploy to the wrong path, the old code keeps running.**

## Environment variables

| Variable | Apps | Server location |
|----------|------|----------------|
| `ANTHROPIC_API_KEY` | flex, viewer | `/opt/webmcp-demos/{app}/.env` |
| `PUBLIC_BASE_URL` | home (build-time) | Shell variable before `npm run build` |
| `PORT` | flex(3004), viewer(3002) | systemd `Environment=PORT=...` |

## Verify a deploy

```bash
# All pages return 200
for p in / /flex/ /viewer/ /showcase/ /todo/; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L https://demos.hyperskills.net$p) $p"
done

# Active services
ssh bot "systemctl is-active webmcp-flex webmcp-viewer"
```

## Common errors

### Deploy to wrong path

**Symptom**: Deploy + restart, but old version persists.

**Cause**: Files copied to `flex/build/` but the service runs `node index.js` from `flex/`.

**Fix**: Use `./scripts/deploy.sh` which knows the correct path for each app.

### Stale chunks not cleaned

**Symptom**: New code deployed but browser shows a mix of old and new.

**Cause**: SvelteKit produces hashed files. `scp` adds without removing. The browser loads cached old chunks.

**Fix**: `deploy.sh` removes old files before copying.

### PUBLIC_BASE_URL forgotten for home

**Symptom**: Home links point to `localhost:5173`.

**Fix**: `deploy.sh` automatically applies `PUBLIC_BASE_URL=https://demos.hyperskills.net`.

### Missing .env after deploy

**Symptom**: Service crashes with "ANTHROPIC_API_KEY is not defined".

**Cause**: The .env was deleted during cleanup.

**Fix**: `deploy.sh` preserves .env files. Never use `rsync --delete`.

## GitHub Pages (documentation)

The documentation (this site) is automatically deployed to GitHub Pages via a GitHub Action triggered on each push to `docs-site/`.

```yaml
# .github/workflows/deploy-docs.yml
on:
  push:
    branches: [main]
    paths: ['docs-site/**']
```
