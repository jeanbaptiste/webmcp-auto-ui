# Deploy to Production

This tutorial walks through building and deploying the entire webmcp-auto-ui monorepo to `demos.hyperskills.net`.

## Prerequisites

- SSH access to the server (configured as `bot` in `~/.ssh/config`)
- The server has nginx configured for `demos.hyperskills.net`
- Node.js 20+ on your local machine
- `ANTHROPIC_API_KEY` set in `.env` files on the server for Node apps

## Architecture

The deployment target has this layout on the server:

```
/opt/webmcp-demos/
  home/              # static — served by nginx
  todo/              # static — served by nginx
  showcase/          # static — served by nginx
  composer/build/    # Node app — systemd service
  viewer/build/      # Node app — systemd service
  mobile/build/      # Node app — systemd service
```

Static apps (home, todo, showcase) are served directly by nginx from their directories. Node apps (composer, viewer, mobile) run as systemd services (`webmcp-composer.service`, `webmcp-viewer.service`, `webmcp-mobile.service`) with nginx as reverse proxy.

---

## Step 1: Build packages

Packages must be built in dependency order. Core has no dependencies, SDK and UI depend on Core, and Agent depends on Core.

```bash
# From the monorepo root
npm -w packages/core run build
npm -w packages/sdk  run build
npm -w packages/ui   run build
npm -w packages/agent run build
```

Or in short, since the dependency chain is core -> sdk/ui -> agent:

```bash
npm -w packages/core run build && \
npm -w packages/sdk run build && \
npm -w packages/ui run build && \
npm -w packages/agent run build
```

Verify each package built successfully by checking that `packages/*/dist/` directories exist.

---

## Step 2: Build static apps

Static apps (home, todo, showcase) use `@sveltejs/adapter-static` and produce a `build/` directory. They require `PUBLIC_BASE_URL` to generate correct asset paths and API URLs for production.

```bash
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/home run build
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/todo run build
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/showcase run build
```

After each build, verify the output exists:

```bash
ls apps/home/build/index.html
ls apps/todo/build/index.html
ls apps/showcase/build/index.html
```

**Common mistake**: forgetting `PUBLIC_BASE_URL`. Without it, the apps will try to load assets from `localhost` paths and fail in production.

---

## Step 3: Build Node apps

Node apps (composer, viewer, mobile) use `@sveltejs/adapter-node` and produce a `build/` directory with a Node server.

```bash
npm -w apps/composer run build
npm -w apps/viewer run build
npm -w apps/mobile run build
```

Verify:

```bash
ls apps/composer/build/index.js
ls apps/viewer/build/index.js
ls apps/mobile/build/index.js
```

---

## Step 4: Deploy static apps

Copy each static app's build output to the server. Use `scp -r` (not rsync).

```bash
scp -r apps/home/build/* bot:/opt/webmcp-demos/home/
scp -r apps/todo/build/* bot:/opt/webmcp-demos/todo/
scp -r apps/showcase/build/* bot:/opt/webmcp-demos/showcase/
```

These are served immediately by nginx after the copy completes. No restart needed.

---

## Step 5: Deploy Node apps

Copy each Node app's build output to the server:

```bash
scp -r apps/composer/build/* bot:/opt/webmcp-demos/composer/build/
scp -r apps/viewer/build/* bot:/opt/webmcp-demos/viewer/build/
scp -r apps/mobile/build/* bot:/opt/webmcp-demos/mobile/build/
```

---

## Step 6: Restart Node services

After deploying the Node apps, restart their systemd services:

```bash
ssh bot "systemctl restart webmcp-composer webmcp-viewer webmcp-mobile"
```

Verify the services started correctly:

```bash
ssh bot "systemctl status webmcp-composer webmcp-viewer webmcp-mobile --no-pager"
```

All three should show `active (running)`.

---

## Step 7: Verify deployment

### Quick curl checks

```bash
# Static apps — should return 200
curl -s -o /dev/null -w "%{http_code}" https://demos.hyperskills.net/
curl -s -o /dev/null -w "%{http_code}" https://demos.hyperskills.net/todo/
curl -s -o /dev/null -w "%{http_code}" https://demos.hyperskills.net/showcase/

# Node apps — should return 200
curl -s -o /dev/null -w "%{http_code}" https://demos.hyperskills.net/composer/
curl -s -o /dev/null -w "%{http_code}" https://demos.hyperskills.net/viewer/
curl -s -o /dev/null -w "%{http_code}" https://demos.hyperskills.net/mobile/
```

### Smoke test

1. Open `https://demos.hyperskills.net/` in a browser — the landing page should load with all assets
2. Open the Composer — it should connect to the Anthropic API and respond to prompts
3. Open the Showcase — all 32 components should render with mock data
4. Open the Todo app — WebMCP tools should appear in the browser extension (Chrome 146+)

---

## Troubleshooting

### `.env` file missing on the server

**Symptom**: Composer or Viewer returns 500 errors, logs show `ANTHROPIC_API_KEY is not defined`.

**Fix**: Create the `.env` file on the server:

```bash
ssh bot "echo 'ANTHROPIC_API_KEY=sk-ant-...' > /opt/webmcp-demos/composer/.env"
ssh bot "echo 'ANTHROPIC_API_KEY=sk-ant-...' > /opt/webmcp-demos/viewer/.env"
ssh bot "echo 'ANTHROPIC_API_KEY=sk-ant-...' > /opt/webmcp-demos/mobile/.env"
```

Then restart the services (Step 6).

### `PUBLIC_BASE_URL` not set during build

**Symptom**: Static apps load but show broken images, missing CSS, or API calls go to `localhost`.

**Fix**: Rebuild the static apps with `PUBLIC_BASE_URL=https://demos.hyperskills.net` (Step 2) and redeploy (Step 4).

### Service fails to start

**Symptom**: `systemctl status` shows `failed` or `inactive`.

**Diagnose**:

```bash
ssh bot "journalctl -u webmcp-composer -n 50 --no-pager"
```

Common causes:
- **Port conflict**: another process is using the port. Check with `ss -tlnp | grep <port>`
- **Missing `.env`**: see above
- **Missing `node_modules`**: Node apps built with `adapter-node` bundle their dependencies, but if you see module resolution errors, check that the build completed successfully locally
- **Wrong Node version**: ensure the server runs Node 20+

### nginx returns 502 Bad Gateway for Node apps

**Symptom**: Static apps work but Composer/Viewer/Mobile return 502.

**Diagnose**:

```bash
ssh bot "systemctl status webmcp-composer --no-pager"
ssh bot "journalctl -u webmcp-composer -n 20 --no-pager"
```

The service may have crashed on startup. Fix the underlying issue (usually `.env` or port) and restart.

---

## Full deploy script

Here is a single script that runs all steps in sequence:

```bash
#!/bin/bash
set -e

echo "=== Building packages ==="
npm -w packages/core run build
npm -w packages/sdk  run build
npm -w packages/ui   run build
npm -w packages/agent run build

echo "=== Building static apps ==="
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/home run build
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/todo run build
PUBLIC_BASE_URL=https://demos.hyperskills.net npm -w apps/showcase run build

echo "=== Building Node apps ==="
npm -w apps/composer run build
npm -w apps/viewer run build
npm -w apps/mobile run build

echo "=== Deploying static apps ==="
scp -r apps/home/build/* bot:/opt/webmcp-demos/home/
scp -r apps/todo/build/* bot:/opt/webmcp-demos/todo/
scp -r apps/showcase/build/* bot:/opt/webmcp-demos/showcase/

echo "=== Deploying Node apps ==="
scp -r apps/composer/build/* bot:/opt/webmcp-demos/composer/build/
scp -r apps/viewer/build/* bot:/opt/webmcp-demos/viewer/build/
scp -r apps/mobile/build/* bot:/opt/webmcp-demos/mobile/build/

echo "=== Restarting services ==="
ssh bot "systemctl restart webmcp-composer webmcp-viewer webmcp-mobile"

echo "=== Verifying ==="
for path in / /todo/ /showcase/ /composer/ /viewer/ /mobile/; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://demos.hyperskills.net${path}")
  echo "  ${path} -> ${code}"
done

echo "=== Done ==="
```

Save this as `deploy.sh` at the monorepo root, make it executable (`chmod +x deploy.sh`), and run it.
