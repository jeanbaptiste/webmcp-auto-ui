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
#   ./scripts/deploy.sh --jobs N     # cap parallel builds (default 3)
#
# IMPORTANT: This script knows the correct deploy path for each app.
# DO NOT deploy manually with scp — use this script instead.
#
# ─── Parallelisation ─────────────────────────────────────────────────────────
# Phase 1 (BUILD, parallel) : `npm run build` is run for all apps in parallel,
#   capped at MAX_JOBS=3 by default. A single Vite build for `flex` peaks at
#   ~2-3 GB RSS, so on a 16 GB Mac we keep the pool small to avoid swap death.
#   Stdout/stderr from each background build is buffered to a log file and
#   flushed (with [app] prefix) after the build completes — no interleaving.
#
# Phase 2 (SHIP, sequential) : rsync + sha256 integrity check + ssh restart
#   are run one app at a time. SSH multiplexing on the server side and shared
#   systemd state make sequential safer and rarely the bottleneck (most time
#   is in the build phase).
#
# Skip / fingerprint logic runs BEFORE phase 1, exactly as before.
# ─────────────────────────────────────────────────────────────────────────────

SSH_HOST="bot"
REMOTE_BASE="/opt/webmcp-demos"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Parse flags
DRY_RUN=0
WITH_DOCS=false
FORCE=0
MAX_JOBS=3
REAL_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --with-docs) WITH_DOCS=true; shift ;;
    --force) FORCE=1; shift ;;
    --jobs) MAX_JOBS="${2:-3}"; shift 2 ;;
    --jobs=*) MAX_JOBS="${1#--jobs=}"; shift ;;
    *) REAL_ARGS+=("$1"); shift ;;
  esac
done
set -- "${REAL_ARGS[@]+"${REAL_ARGS[@]}"}"

# ── Fingerprint-based skip (rebuild only when sources changed) ───────────────
STATE_DIR="$LOCAL_ROOT/.deploy-state"
BUILD_LOG_DIR="$LOCAL_ROOT/.deploy-state/build-logs"

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

# ── Build helpers (phase 1, run in parallel) ────────────────────────────────
# Each build_<kind> only does: clean local build dir + npm run build.
# It is safe to run in parallel because each app has its own build dir.

build_node() {
  local app=$1
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
}

build_static() {
  local app=$1
  local env_prefix=""
  if [ "$app" = "home" ] || [ "$app" = "todo" ]; then
    env_prefix="PUBLIC_BASE_URL=https://demos.hyperskills.net "
  fi
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  (cd "$LOCAL_ROOT/apps/$app" && eval "${env_prefix}npm run build" > /dev/null 2>&1)
}

build_vite_static() {
  local app=$1
  rm -rf "$LOCAL_ROOT/apps/$app/dist"
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
}

build_astro_node() {
  local app=$1
  rm -rf "$LOCAL_ROOT/apps/$app/dist"
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
}

build_notebook_viewer() {
  local app="notebook-viewer"
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  (cd "$LOCAL_ROOT/apps/$app" && npx tsc server.ts --module nodenext --moduleResolution nodenext --target es2022 --outDir . --skipLibCheck > /dev/null 2>&1)
}

# Dispatch build by app name → returns 0 ok, non-zero on failure.
_dispatch_build() {
  local app=$1
  case "$app" in
    flex|viewer|recipes|boilerplate|showcase) build_node "$app" ;;
    home|todo)                                build_static "$app" ;;
    notebook-viewer)                          build_notebook_viewer ;;
    *) echo "  [$app] ✗ unknown app (build phase)" >&2; return 1 ;;
  esac
}

# ── Ship helpers (phase 2, sequential) ──────────────────────────────────────
# Assume build dir is already populated from phase 1.

ship_node_root() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  local remote_version
  remote_version=$(ssh "$SSH_HOST" "node -e \"try{console.log(require('$REMOTE_BASE/$app/package.json').version)}catch{console.log('?')}\"" 2>/dev/null || echo "?")
  if [ "$remote_version" != "?" ] && [ "$remote_version" = "$app_version" ]; then
    echo "  [$app] ⚠ version $app_version already deployed — continuing anyway"
  fi
  backup_app "$app"
  echo "  [$app] syncing build (rsync)..."
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
  if ssh "$SSH_HOST" "test -f $REMOTE_BASE/$app/package.json" 2>/dev/null; then
    echo "  [$app] installing runtime deps on server..."
    ssh "$SSH_HOST" "cd $REMOTE_BASE/$app && npm install --production --silent 2>/dev/null"
  fi
  echo "  [$app] restarting service..."
  ssh "$SSH_HOST" "systemctl restart webmcp-$app"
  echo "  [$app] ✓ deployed v$app_version (node index.js at root)"
}

ship_node_build() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  backup_app "$app"
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

ship_static() {
  local app=$1
  backup_app "$app"
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

ship_vite_static() {
  local app=$1
  backup_app "$app"
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

ship_astro_node() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  backup_app "$app"
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

ship_notebook_viewer() {
  local app="notebook-viewer"
  backup_app "$app"
  echo "  [$app] syncing build/ (rsync)..."
  rsync -az --delete "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/build/"
  echo "  [$app] syncing server.js + package.json..."
  rsync -az "$LOCAL_ROOT/apps/$app/server.js" "$LOCAL_ROOT/apps/$app/package.json" "$SSH_HOST:$REMOTE_BASE/$app/"
  echo "  [$app] restarting systemd unit..."
  ssh "$SSH_HOST" "systemctl restart notebook-viewer"
  echo "  [$app] ✓ deployed (node+static hybrid)"
}

# Dispatch ship by app name (phase 2)
_dispatch_ship() {
  local app=$1
  case "$app" in
    flex)                ship_node_root "flex" ;;
    viewer)              ship_node_root "viewer" ;;
    recipes)             ship_node_root "recipes" ;;
    home)                ship_static "home" ;;
    todo)                ship_static "todo" ;;
    boilerplate)         ship_node_root "boilerplate" ;;
    showcase)            ship_node_root "showcase" ;;
    notebook-viewer)     ship_notebook_viewer ;;
    *)
      echo "  [$app] ✗ unknown app (valid: home, flex, viewer, showcase, todo, recipes, boilerplate, notebook-viewer)"
      return 1
      ;;
  esac
}

# Dry-run preview that mirrors the legacy per-app message
_dry_run_preview() {
  local app=$1
  local app_version
  app_version=$(node -e "console.log(require('$LOCAL_ROOT/apps/$app/package.json').version)" 2>/dev/null || echo "?")
  case "$app" in
    flex|viewer|recipes|boilerplate|showcase)
      echo "  [$app] DRY RUN: would build + deploy v$app_version → $REMOTE_BASE/$app/ (node index.js)" ;;
    home|todo)
      local env_prefix=""
      if [ "$app" = "home" ] || [ "$app" = "todo" ]; then
        env_prefix="PUBLIC_BASE_URL=https://demos.hyperskills.net "
      fi
      echo "  [$app] DRY RUN: would build with ${env_prefix}npm run build → $REMOTE_BASE/$app/ (static)" ;;
    notebook-viewer)
      echo "  [$app] DRY RUN: would build + compile server.ts + deploy (build/ + server.js + package.json) → $REMOTE_BASE/$app/" ;;
    *)
      echo "  [$app] DRY RUN: unknown app" ;;
  esac
}

# ── Parallel build pool (phase 1) ────────────────────────────────────────────
# Background builds with a cap of MAX_JOBS concurrent jobs. Output buffered
# per-app to a log file and flushed sequentially after each build finishes.
# Returns 0 only if all builds succeed.
#
# Portability: macOS ships with bash 3.2 which lacks `wait -n`. We use a
# poll loop on running PIDs (kill -0) with a small sleep — light enough for
# the few apps we deploy.

run_parallel_builds() {
  local apps=("$@")
  [ ${#apps[@]} -eq 0 ] && return 0

  mkdir -p "$BUILD_LOG_DIR"
  rm -f "$BUILD_LOG_DIR"/*.log "$BUILD_LOG_DIR"/*.status 2>/dev/null || true

  echo "Building apps (parallel, max ${MAX_JOBS} jobs)..."

  # Parallel arrays: pid_list[i] / app_list[i] / done_list[i]=0|1
  local pid_list=()
  local app_list=()
  local done_list=()
  local active=0
  local total=${#apps[@]}
  local launched=0

  # Reap any finished children (non-blocking poll). Flushes their log to
  # stdout with [app] prefix and records status. Returns the number reaped.
  reap_finished() {
    local reaped=0 idx
    for idx in $(seq 0 $((${#pid_list[@]} - 1))); do
      [ "${done_list[$idx]}" = "1" ] && continue
      local pid="${pid_list[$idx]}"
      if ! kill -0 "$pid" 2>/dev/null; then
        # Process exited — collect status (wait returns its rc)
        local rc=0
        wait "$pid" 2>/dev/null || rc=$?
        local a="${app_list[$idx]}"
        # Flush buffered log with prefix
        if [ -s "$BUILD_LOG_DIR/$a.log" ]; then
          while IFS= read -r line; do
            echo "  [$a] $line"
          done < "$BUILD_LOG_DIR/$a.log"
        fi
        if [ "$rc" -eq 0 ]; then
          echo "  [$a] ✓ build ok"
          echo "ok" > "$BUILD_LOG_DIR/$a.status"
        else
          echo "  [$a] ✗ build FAILED (rc=$rc)"
          echo "fail" > "$BUILD_LOG_DIR/$a.status"
        fi
        done_list[$idx]=1
        active=$((active - 1))
        reaped=$((reaped + 1))
      fi
    done
    return 0
  }

  local app
  for app in "${apps[@]}"; do
    # Throttle: wait until a slot frees up
    while [ "$active" -ge "$MAX_JOBS" ]; do
      reap_finished
      [ "$active" -ge "$MAX_JOBS" ] && sleep 1
    done
    echo "  [$app] starting build..."
    ( _dispatch_build "$app" ) > "$BUILD_LOG_DIR/$app.log" 2>&1 &
    pid_list+=("$!")
    app_list+=("$app")
    done_list+=("0")
    active=$((active + 1))
    launched=$((launched + 1))
  done

  # Drain
  while [ "$active" -gt 0 ]; do
    reap_finished
    [ "$active" -gt 0 ] && sleep 1
  done

  # Aggregate result
  local fail=0
  for app in "${apps[@]}"; do
    if [ "$(cat "$BUILD_LOG_DIR/$app.status" 2>/dev/null)" != "ok" ]; then
      fail=1
    fi
  done
  return $fail
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

# Build packages first (order matters — sequential)
echo "Building packages..."
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/core 2>/dev/null && echo "  ✓ core")
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/sdk 2>/dev/null && echo "  ✓ sdk")
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/ui 2>/dev/null && echo "  ✓ ui")
(cd "$LOCAL_ROOT" && npm run build --workspace=packages/agent 2>/dev/null && echo "  ✓ agent")
echo ""

# ── Phase 0 : skip filter + dry-run preview ─────────────────────────────────
TO_BUILD=()
SKIPPED=()
UNKNOWN=()
for app in $APPS; do
  case "$app" in
    flex|viewer|recipes|boilerplate|showcase|home|todo|notebook-viewer) ;;
    *) UNKNOWN+=("$app"); continue ;;
  esac
  if [ "$DRY_RUN" = "1" ]; then
    _dry_run_preview "$app"
    continue
  fi
  if should_skip "$app"; then
    echo "  [$app] unchanged — skipping (use --force to redeploy)"
    SKIPPED+=("$app")
  else
    TO_BUILD+=("$app")
  fi
done

for app in "${UNKNOWN[@]+"${UNKNOWN[@]}"}"; do
  echo "  [$app] ✗ unknown app (valid: home, flex, viewer, showcase, todo, recipes, boilerplate, notebook-viewer)"
done

if [ "$DRY_RUN" = "1" ]; then
  echo ""
  echo "Deploy complete (dry run)."
  exit 0
fi

# ── Phase 1 : parallel builds ────────────────────────────────────────────────
if [ ${#TO_BUILD[@]} -gt 0 ]; then
  if ! run_parallel_builds "${TO_BUILD[@]}"; then
    echo ""
    echo "✗ One or more builds failed — aborting before any rsync/restart."
    echo "  Check logs in $BUILD_LOG_DIR/"
    exit 1
  fi
  echo ""
fi

# ── Phase 2 : sequential ship (rsync + integrity + restart) ─────────────────
echo "Deploying built apps..."
for app in "${TO_BUILD[@]+"${TO_BUILD[@]}"}"; do
  if _dispatch_ship "$app"; then
    record_fingerprint "$app"
  fi
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
