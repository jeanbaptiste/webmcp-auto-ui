# Deploy to Production

## Quick deploy (recommended)

```bash
./scripts/deploy.sh                # deploy all apps
./scripts/deploy.sh composer       # deploy one app
./scripts/deploy.sh mobile home    # deploy specific apps
```

The script handles everything: builds packages, **builds apps**, cleans old
files on the server, copies to the correct location, **verifies sha256
integrity**, restarts services, and confirms.

**Always use this script. Never deploy manually with scp.**

---

## Server architecture

```
/opt/webmcp-demos/
  home/              # static — nginx serves directly
  todo/              # static — nginx serves directly
  showcase/          # static — nginx serves directly
  composer/          # Node — systemd runs: node index.js
  viewer/build/      # Node — systemd runs: node build/index.js
  mobile/            # Node — systemd runs: node index.js
```

### CRITICAL: Deploy paths are NOT the same for all Node apps

| App | systemd ExecStart | Deploy destination | Why |
|-----|-------------------|--------------------|-----|
| **composer** | `node index.js` | `/opt/webmcp-demos/composer/` (root) | ExecStart has no `build/` prefix |
| **mobile** | `node index.js` | `/opt/webmcp-demos/mobile/` (root) | ExecStart has no `build/` prefix |
| **viewer** | `node build/index.js` | `/opt/webmcp-demos/viewer/build/` | ExecStart includes `build/` |
| home | static (nginx) | `/opt/webmcp-demos/home/` | — |
| todo | static (nginx) | `/opt/webmcp-demos/todo/` | — |
| showcase | static (nginx) | `/opt/webmcp-demos/showcase/` | — |

**If you deploy to the wrong path, the old code keeps running and your
changes appear to not take effect.** This is the #1 deployment pitfall.

### Why the paths differ

The systemd services were created at different times. Composer and mobile
use `ExecStart=/usr/bin/node index.js` (working directory is the app root).
Viewer uses `ExecStart=/usr/bin/node build/index.js`. The deploy script
abstracts this difference — use the script.

---

## Manual deploy (if you must)

### Static apps (home, todo, showcase)

```bash
# Build with production base URL (REQUIRED for home)
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/home run build

# Clean old assets and copy
ssh bot "rm -rf /opt/webmcp-demos/home/_app"
scp -r apps/home/build/* bot:/opt/webmcp-demos/home/
```

### Node apps — composer and mobile (root deploy)

```bash
npm -w apps/composer run build

# MUST clean old files first — stale chunks cause the old version to be served
ssh bot "cd /opt/webmcp-demos/composer && rm -f index.js handler.js env.js shims.js && rm -rf client server"
scp -r apps/composer/build/* bot:/opt/webmcp-demos/composer/
ssh bot "systemctl restart webmcp-composer"
```

### Node apps — viewer (build/ deploy)

```bash
npm -w apps/viewer run build

ssh bot "rm -rf /opt/webmcp-demos/viewer/build"
ssh bot "mkdir -p /opt/webmcp-demos/viewer/build"
scp -r apps/viewer/build/* bot:/opt/webmcp-demos/viewer/build/
ssh bot "systemctl restart webmcp-viewer"
```

---

## Common mistakes

### 1. Deploying to the wrong path

**Symptom**: You deploy, restart the service, but the old version still shows.

**Cause**: You copied files to `composer/build/` but the service runs
`node index.js` from `composer/` — it uses the old `index.js` at root.

**Fix**: Use `./scripts/deploy.sh` or check the ExecStart path in the
systemd service file.

### 2. Not cleaning old chunks

**Symptom**: New code is deployed but the browser shows a mix of old and
new behavior.

**Cause**: SvelteKit produces hashed chunk filenames. `scp` copies new
chunks but doesn't remove old ones. The browser may load cached old chunks.

**Fix**: Always delete old files before copying:
```bash
ssh bot "rm -rf /opt/webmcp-demos/composer/{client,server,index.js,handler.js}"
```

### 3. Forgetting PUBLIC_BASE_URL for home

**Symptom**: Home page links point to `localhost:5173`.

**Cause**: SvelteKit adapter-static bakes `PUBLIC_BASE_URL` at build time.

**Fix**: Build with `PUBLIC_BASE_URL=https://demos.hyperskills.net`.

### 4. Missing .env after deploy

**Symptom**: Service crashes with "ANTHROPIC_API_KEY is not defined".

**Cause**: The .env file was in the app root and got deleted during cleanup.

**Fix**: The deploy script preserves .env files. If deploying manually,
don't delete .env:
```bash
# DO NOT do: rm -rf /opt/webmcp-demos/composer/*
# DO this instead: rm specific files, keep .env
```

### 5. Using rsync instead of scp

**Never use rsync.** `rsync --delete` has previously wiped `.env` files
containing API keys from production. Use `scp -r` only.

### 6. Deploying without rebuilding the app (fixed in script)

**Symptom**: You fix a Svelte bug, deploy, the bug is still there. Services
show `active`. No error anywhere.

**Cause**: The old `deploy.sh` rebuilt packages (`packages/*/dist/`) but
copied the existing `apps/*/build/` without rebuilding it. Any change to
`apps/*/src/` was silently ignored.

**Fix applied**: `deploy.sh` now runs `npm run build` inside each app before
copying. The sha256 check then verifies the deployed file matches the local
build.

**How to detect manually**:
```bash
sha256sum apps/composer/build/index.js
ssh bot "sha256sum /opt/webmcp-demos/composer/index.js"
# These must match. If they differ, the wrong file was deployed.
```

See [contributing.md](../contributing.md) for the full debug checklist.

---

## Verifying a deploy

```bash
# All pages return 200
for p in / /composer/ /viewer/ /showcase/ /mobile/ /todo/; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L https://demos.hyperskills.net$p) $p"
done

# Chat API works (Node apps)
curl -s https://demos.hyperskills.net/composer/api/chat \
  -X POST -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}],"model":"claude-haiku-4-5-20251001","max_tokens":5}' \
  | head -c 50

# Services are active
ssh bot "systemctl is-active webmcp-composer webmcp-viewer webmcp-mobile"
```

---

## Environment

| Variable | Apps | Location on server |
|----------|------|--------------------|
| `ANTHROPIC_API_KEY` | composer, viewer, mobile | `/opt/webmcp-demos/{app}/.env` |
| `PUBLIC_BASE_URL` | home (build-time only) | Set in shell before `npm run build` |
| `PORT` | composer(3001), viewer(3002), mobile(3003) | systemd `Environment=PORT=...` |
