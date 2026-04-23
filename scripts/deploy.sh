#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy webmcp-auto-ui apps to production
#
# Usage:
#   ./scripts/deploy.sh              # deploy all apps
#   ./scripts/deploy.sh viewer       # deploy one app
#   ./scripts/deploy.sh home flex    # deploy specific apps
#   ./scripts/deploy.sh --dry-run    # show what would be deployed (no changes)
#   ./scripts/deploy.sh --with-docs  # deploy + update documentation
#
# IMPORTANT: This script knows the correct deploy path for each app.
# DO NOT deploy manually with scp — use this script instead.
# ─────────────────────────────────────────────────────────────────────────────

SSH_HOST="bot"
REMOTE_BASE="/opt/webmcp-demos"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Parse flags
DRY_RUN=0
WITH_DOCS=false
FORCE=0
REAL_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --with-docs) WITH_DOCS=true ;;
    --force) FORCE=1 ;;
    *) REAL_ARGS+=("$arg") ;;
  esac
done
set -- "${REAL_ARGS[@]+"${REAL_ARGS[@]}"}"

# ── Fingerprint-based skip (rebuild only when sources changed) ───────────────
STATE_DIR="$LOCAL_ROOT/.deploy-state"

compute_fingerprint() {
  local app=$1
  {
    find "$LOCAL_ROOT/apps/$app" -type f \
      \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.svelte' \
         -o -name '*.css' -o -name '*.json' -o -name '*.html' -o -name '*.md' \
         -o -name '*.astro' -o -name '*.svg' -o -name '*.conf' -o -name '*.template' \) \
      -not -path '*/node_modules/*' -not -path '*/build/*' -not -path '*/dist/*' \
      -not -path '*/.svelte-kit/*' 2>/dev/null
    find "$LOCAL_ROOT"/packages \
      \( -path '*/src/*' -o -name 'package.json' \) -type f \
      -not -path '*/node_modules/*' -not -path '*/dist/*' \
      -not -path '*/.svelte-kit/*' 2>/dev/null
  } | LC_ALL=C sort | xargs shasum -a 256 2>/dev/null | shasum -a 256 | cut -c1-16
}

should_skip() {
  local app=$1
  [ "$FORCE" = "1" ] && return 1
  [ "$DRY_RUN" = "1" ] && return 1
  local f="$STATE_DIR/$app.sha"
  [ ! -f "$f" ] && return 1
  local stored current
  stored=$(cat "$f" 2>/dev/null)
  current=$(compute_fingerprint "$app")
  [ -n "$stored" ] && [ "$stored" = "$current" ]
}

record_fingerprint() {
  local app=$1
  [ "$DRY_RUN" = "1" ] && return 0
  mkdir -p "$STATE_DIR"
  compute_fingerprint "$app" > "$STATE_DIR/$app.sha"
}

# Local package version
LOCAL_VERSION=$(node -e "console.log(require('$LOCAL_ROOT/package.json').version)" 2>/dev/null || echo "?")

if [ "$DRY_RUN" = "1" ]; then
  echo "🔍 DRY RUN — no changes will be made"
  echo ""
fi

# ── Backup (rotate: keep only previous version) ────────────────────────────
BACKUP_BASE="/opt/webmcp-demos/.backups"

backup_app() {
  local app=$1
  if [ "$DRY_RUN" = "1" ]; then return; fi
  ssh "$SSH_HOST" "mkdir -p $BACKUP_BASE && rm -rf $BACKUP_BASE/$app.prev && cp -a $REMOTE_BASE/$app $BACKUP_BASE/$app.prev 2>/dev/null || true"
  echo "  [$app] backup → $BACKUP_BASE/$app.prev"
}

rollback_app() {
  local app=$1
  echo "  [$app] rolling back from backup..."
  ssh "$SSH_HOST" "rm -rf $REMOTE_BASE/$app && cp -a $BACKUP_BASE/$app.prev $REMOTE_BASE/$app"
  local svc="webmcp-$app"
  ssh "$SSH_HOST" "systemctl restart $svc 2>/dev/null || true"
  echo "  [$app] ✓ rolled back"
}

# ── Deploy path mapping ─────────────────────────────────────────────────────
# Node apps: ExecStart determines where index.js must be
#   flex, viewer, showcase, recipes, boilerplate → node index.js → deploy to root
#
# Static apps: served directly by nginx
#   home, todo → deploy to root

deploy_node_root() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  local remote_version
  remote_version=$(ssh "$SSH_HOST" "node -e \"try{console.log(require('$REMOTE_BASE/$app/package.json').version)}catch{console.log('?')}\"" 2>/dev/null || echo "?")
  if [ "$remote_version" != "?" ] && [ "$remote_version" = "$app_version" ]; then
    echo "  [$app] ⚠ version $app_version already deployed — continuing anyway"
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build + deploy v$app_version → $REMOTE_BASE/$app/ (node index.js)"
    return
  fi
  backup_app "$app"
  echo "  [$app] cleaning local build dir..."
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  echo "  [$app] building app..."
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  echo "  [$app] syncing build (rsync)..."
  # Copy package.json into build/ so rsync sends everything in one pass
  cp "$LOCAL_ROOT/apps/$app/package.json" "$LOCAL_ROOT/apps/$app/build/package.json"
  rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] verifying deploy integrity..."
  local expected actual
  expected=$(sha256sum "$LOCAL_ROOT/apps/$app/build/index.js" | cut -d' ' -f1)
  actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/index.js | cut -d' ' -f1")
  if [ "$expected" != "$actual" ]; then
    echo "  [$app] ✗ INTEGRITY ERROR — deployed file ≠ local build (sha256 mismatch)"
    exit 1
  fi
  # Install runtime deps if server code has external imports (e.g. @sveltejs/kit)
  if ssh "$SSH_HOST" "test -f $REMOTE_BASE/$app/package.json" 2>/dev/null; then
    echo "  [$app] installing runtime deps on server..."
    ssh "$SSH_HOST" "cd $REMOTE_BASE/$app && npm install --production --silent 2>/dev/null"
  fi
  echo "  [$app] restarting service..."
  ssh "$SSH_HOST" "systemctl restart webmcp-$app"
  echo "  [$app] ✓ deployed v$app_version (node index.js at root)"
}

deploy_node_build() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build + deploy v$app_version → $REMOTE_BASE/$app/build/ (node build/index.js)"
    return
  fi
  backup_app "$app"
  echo "  [$app] cleaning local build dir..."
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  echo "  [$app] building app..."
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  echo "  [$app] syncing build (rsync)..."
  ssh "$SSH_HOST" "mkdir -p $REMOTE_BASE/$app/build"
  cp "$LOCAL_ROOT/apps/$app/package.json" "$LOCAL_ROOT/apps/$app/build/package.json"
  rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/build/"
  echo "  [$app] verifying deploy integrity..."
  local expected actual
  expected=$(sha256sum "$LOCAL_ROOT/apps/$app/build/index.js" | cut -d' ' -f1)
  actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/build/index.js | cut -d' ' -f1")
  if [ "$expected" != "$actual" ]; then
    echo "  [$app] ✗ INTEGRITY ERROR — sha256 mismatch, rolling back"
    rollback_app "$app"
    return 1
  fi
  echo "  [$app] restarting service..."
  ssh "$SSH_HOST" "systemctl restart webmcp-$app"
  echo "  [$app] ✓ deployed v$app_version (node build/index.js)"
}

deploy_static() {
  local app=$1
  local env_prefix=""
  if [ "$app" = "home" ] || [ "$app" = "todo" ]; then
    env_prefix="PUBLIC_BASE_URL=https://demos.hyperskills.net "
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build with ${env_prefix}npm run build → $REMOTE_BASE/$app/ (static)"
    return
  fi
  backup_app "$app"
  echo "  [$app] cleaning local build dir..."
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  echo "  [$app] building with production env..."
  (cd "$LOCAL_ROOT/apps/$app" && eval "${env_prefix}npm run build" > /dev/null 2>&1)
  echo "  [$app] syncing build (rsync)..."
  rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] verifying deploy integrity..."
  local expected actual
  expected=$(sha256sum "$LOCAL_ROOT/apps/$app/build/index.html" | cut -d' ' -f1)
  actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/index.html | cut -d' ' -f1")
  if [ "$expected" != "$actual" ]; then
    echo "  [$app] ✗ INTEGRITY ERROR — sha256 mismatch, rolling back"
    rollback_app "$app"
    return 1
  fi
  echo "  [$app] ✓ deployed (static)"
}

deploy_vite_static() {
  local app=$1
  local env_prefix=""
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build + deploy → $REMOTE_BASE/$app/ (vite static)"
    return
  fi
  backup_app "$app"
  echo "  [$app] cleaning local dist dir..."
  rm -rf "$LOCAL_ROOT/apps/$app/dist"
  echo "  [$app] building with vite..."
  (cd "$LOCAL_ROOT/apps/$app" && ${env_prefix}npm run build > /dev/null 2>&1)
  echo "  [$app] syncing dist (rsync)..."
  rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/dist/" "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] verifying deploy integrity..."
  local expected actual
  expected=$(sha256sum "$LOCAL_ROOT/apps/$app/dist/index.html" | cut -d' ' -f1)
  actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/index.html | cut -d' ' -f1")
  if [ "$expected" != "$actual" ]; then
    echo "  [$app] ✗ INTEGRITY ERROR — sha256 mismatch, rolling back"
    rollback_app "$app"
    return 1
  fi
  echo "  [$app] ✓ deployed (vite static)"
}

deploy_astro_node() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build + deploy v$app_version → $REMOTE_BASE/$app/ (astro node)"
    return
  fi
  backup_app "$app"
  echo "  [$app] cleaning local dist dir..."
  rm -rf "$LOCAL_ROOT/apps/$app/dist"
  echo "  [$app] building astro..."
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  echo "  [$app] syncing dist (rsync)..."
  rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/dist/" "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] verifying deploy integrity..."
  local expected actual
  expected=$(sha256sum "$LOCAL_ROOT/apps/$app/dist/server/entry.mjs" | cut -d' ' -f1)
  actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/server/entry.mjs | cut -d' ' -f1")
  if [ "$expected" != "$actual" ]; then
    echo "  [$app] ✗ INTEGRITY ERROR — sha256 mismatch, rolling back"
    rollback_app "$app"
    return 1
  fi
  echo "  [$app] restarting service..."
  ssh "$SSH_HOST" "systemctl restart webmcp-$app"
  echo "  [$app] ✓ deployed v$app_version (astro node)"
}

deploy_notebook_viewer() {
  local app="notebook-viewer"
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build + compile server.ts + deploy (build/ + server.js + package.json) → $REMOTE_BASE/$app/"
    return
  fi
  backup_app "$app"
  echo "  [$app] cleaning local build dir..."
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  echo "  [$app] building static SPA..."
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  echo "  [$app] compiling server.ts..."
  (cd "$LOCAL_ROOT/apps/$app" && npx tsc server.ts --module nodenext --moduleResolution nodenext --target es2022 --outDir . --skipLibCheck > /dev/null 2>&1)
  echo "  [$app] syncing build/ (rsync)..."
  rsync -az --delete "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/build/"
  echo "  [$app] syncing server.js + package.json..."
  rsync -az "$LOCAL_ROOT/apps/$app/server.js" "$LOCAL_ROOT/apps/$app/package.json" "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] restarting systemd unit..."
  ssh "$SSH_HOST" "systemctl restart notebook-viewer"
  echo "  [$app] ✓ deployed (node+static hybrid)"
}

_dispatch_deploy() {
  local app=$1
  case "$app" in
    flex)                deploy_node_root "flex" ;;
    viewer)              deploy_node_root "viewer" ;;
    recipes)             deploy_node_root "recipes" ;;
    home)                deploy_static "home" ;;
    todo)                deploy_static "todo" ;;
    boilerplate)         deploy_node_root "boilerplate" ;;
    showcase)            deploy_node_root "showcase" ;;
    notebook-viewer)     deploy_notebook_viewer ;;
    *)
      echo "  [$app] ✗ unknown app (valid: home, flex, viewer, showcase, todo, recipes, boilerplate, notebook-viewer)"
      return 1
      ;;
  esac
}

deploy_app() {
  local app=$1
  if should_skip "$app"; then
    echo "  [$app] unchanged — skipping (use --force to redeploy)"
    return 0
  fi
  if _dispatch_deploy "$app"; then
    record_fingerprint "$app"
    return 0
  fi
  return 1
}

# ── Main ─────────────────────────────────────────────────────────────────────

echo "webmcp-auto-ui deploy"
echo ""

if [ $# -eq 0 ]; then
  APPS="home flex viewer showcase todo recipes boilerplate notebook-viewer"
else
  APPS="$*"
fi

# Sync all workspace versions to root
echo "Syncing versions..."
ROOT_VERSION=$(node -e "console.log(require('$LOCAL_ROOT/package.json').version)")
for pkg in "$LOCAL_ROOT"/apps/*/package.json "$LOCAL_ROOT"/packages/*/package.json; do
  node -e "const f=require('fs'); const p=JSON.parse(f.readFileSync('$pkg','utf8')); if(p.version!=='$ROOT_VERSION'){p.version='$ROOT_VERSION'; f.writeFileSync('$pkg', JSON.stringify(p,null,2)+'\n')}"
done
echo "  ✓ all workspaces → v$ROOT_VERSION"
echo ""

# Build packages first (order matters)
echo "Building packages..."
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/core 2>/dev/null && echo "  ✓ core")
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/sdk 2>/dev/null && echo "  ✓ sdk")
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/ui 2>/dev/null && echo "  ✓ ui")
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/agent 2>/dev/null && echo "  ✓ agent")
echo ""

# Build and deploy each app
echo "Deploying apps..."
for app in $APPS; do
  deploy_app "$app"
done

echo ""
echo "Verifying..."
for app in $APPS; do
  case "$app" in
    flex|viewer|recipes|showcase|boilerplate)
      status=$(ssh "$SSH_HOST" "systemctl is-active webmcp-$app 2>/dev/null" || echo "inactive")
      echo "  $app: $status"
      ;;
    notebook-viewer)
      status=$(ssh "$SSH_HOST" "systemctl is-active notebook-viewer 2>/dev/null" || echo "inactive")
      code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://nb.hyperskills.net/api/health" 2>/dev/null || echo "???")
      echo "  $app: $status · HTTP $code (https://nb.hyperskills.net)"
      ;;
    *)
      code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://demos.hyperskills.net/$app/" 2>/dev/null || echo "???")
      echo "  $app: HTTP $code"
      ;;
  esac
done

echo ""
echo "Deploy complete."

# ── Documentation update (optional) ──────────────────────────────────────────
if $WITH_DOCS; then
  echo ""
  echo "Updating documentation..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  "$SCRIPT_DIR/docs-update.sh" --all -y
fi
