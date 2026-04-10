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
#
# IMPORTANT: This script knows the correct deploy path for each app.
# DO NOT deploy manually with scp — use this script instead.
# ─────────────────────────────────────────────────────────────────────────────

SSH_HOST="bot"
REMOTE_BASE="/opt/webmcp-demos"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Parse flags
DRY_RUN=0
REAL_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) REAL_ARGS+=("$arg") ;;
  esac
done
set -- "${REAL_ARGS[@]+"${REAL_ARGS[@]}"}"

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
#   flex2, viewer2, showcase2, recipes → node index.js → deploy to root
#
# Static apps: served directly by nginx
#   home, todo2 → deploy to root

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
  echo "  [$app] building app..."
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  echo "  [$app] cleaning old files on server..."
  ssh "$SSH_HOST" "cd $REMOTE_BASE/$app && rm -f index.js handler.js env.js shims.js && rm -rf client server build"
  echo "  [$app] copying build..."
  scp -r "$LOCAL_ROOT/apps/$app/build/"* "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] verifying deploy integrity..."
  local expected actual
  expected=$(sha256sum "$LOCAL_ROOT/apps/$app/build/index.js" | cut -d' ' -f1)
  actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/index.js | cut -d' ' -f1")
  if [ "$expected" != "$actual" ]; then
    echo "  [$app] ✗ INTEGRITY ERROR — deployed file ≠ local build (sha256 mismatch)"
    exit 1
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
  echo "  [$app] building app..."
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  echo "  [$app] cleaning old build..."
  ssh "$SSH_HOST" "rm -rf $REMOTE_BASE/$app/build"
  ssh "$SSH_HOST" "mkdir -p $REMOTE_BASE/$app/build"
  echo "  [$app] copying build..."
  scp -r "$LOCAL_ROOT/apps/$app/build/"* "$SSH_HOST:$REMOTE_BASE/$app/build/"
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
  if [ "$app" = "home" ] || [ "$app" = "todo2" ]; then
    env_prefix="PUBLIC_BASE_URL=https://demos.hyperskills.net "
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [$app] DRY RUN: would build with ${env_prefix}npm run build → $REMOTE_BASE/$app/ (static)"
    return
  fi
  backup_app "$app"
  echo "  [$app] building with production env..."
  (cd "$LOCAL_ROOT/apps/$app" && eval "${env_prefix}npm run build" > /dev/null 2>&1)
  echo "  [$app] cleaning old assets on server..."
  ssh "$SSH_HOST" "rm -rf $REMOTE_BASE/$app/_app"
  echo "  [$app] copying build..."
  scp -r "$LOCAL_ROOT/apps/$app/build/"* "$SSH_HOST:$REMOTE_BASE/$app/"
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

deploy_app() {
  local app=$1
  case "$app" in
    flex2)     deploy_node_root "flex2" ;;
    viewer2)   deploy_node_root "viewer2" ;;
    recipes)   deploy_node_root "recipes" ;;
    home)      deploy_static "home" ;;
    todo2)     deploy_static "todo2" ;;
    showcase2) deploy_node_root "showcase2" ;;
    *)
      echo "  [$app] ✗ unknown app (valid: home, flex2, viewer2, showcase2, todo2, recipes)"
      return 1
      ;;
  esac
}

# ── Main ─────────────────────────────────────────────────────────────────────

echo "webmcp-auto-ui deploy"
echo ""

if [ $# -eq 0 ]; then
  APPS="home flex2 viewer2 showcase2 todo2 recipes"
else
  APPS="$*"
fi

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
    flex2|viewer2|recipes|showcase2)
      status=$(ssh "$SSH_HOST" "systemctl is-active webmcp-$app 2>/dev/null" || echo "inactive")
      echo "  $app: $status"
      ;;
    *)
      code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://demos.hyperskills.net/$app/" 2>/dev/null || echo "???")
      echo "  $app: HTTP $code"
      ;;
  esac
done

echo ""
echo "Deploy complete."
