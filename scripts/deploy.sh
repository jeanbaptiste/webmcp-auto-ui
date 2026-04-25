#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy webmcp-auto-ui apps to production (instrumented)
#
# Usage:
#   ./scripts/deploy.sh                  # deploy all apps
#   ./scripts/deploy.sh viewer           # deploy one app
#   ./scripts/deploy.sh home flex        # deploy specific apps
#   ./scripts/deploy.sh --dry-run        # simulate, no changes
#   ./scripts/deploy.sh --with-docs      # deploy + update documentation
#   ./scripts/deploy.sh --force          # ignore fingerprint cache
#   ./scripts/deploy.sh -j N|--jobs N    # parallel workers (default min(4, n))
#   ./scripts/deploy.sh --no-progress    # disable progress bars (legacy)
#   ./scripts/deploy.sh --quiet          # silent (errors only)
#   ./scripts/deploy.sh --json           # JSON events on stderr
#   ./scripts/deploy.sh --stats          # show ETA cache stats and exit
#   ./scripts/deploy.sh --reset-cache    # reset ETA cache and exit
#   ./scripts/deploy.sh --help           # show this help
#
# IMPORTANT: each app has its own deploy path; never use scp manually.
# ─────────────────────────────────────────────────────────────────────────────

LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/progress.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/eta.sh"

SSH_HOST="bot"
REMOTE_BASE="/opt/webmcp-demos"
PUBLIC_BASE_URL="https://demos.hyperskills.net"
BACKUP_BASE="/opt/webmcp-demos/.backups"

STATE_DIR="$LOCAL_ROOT/.deploy-state"
BUILD_LOG_DIR="$LOCAL_ROOT/.deploy-state/build-logs"
RUN_DIR="$LOCAL_ROOT/.deploy-cache/run.$$"
mkdir -p "$RUN_DIR"

# ── Flag parsing ────────────────────────────────────────────────────────────
DRY_RUN=0
WITH_DOCS=false
FORCE=0
MAX_JOBS=""
NO_PROGRESS=0
QUIET=0
JSON=0
SHOW_STATS=0
RESET_CACHE=0
SHOW_HELP=0
REAL_ARGS=()

print_help() {
  sed -n '4,22p' "$0"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --with-docs) WITH_DOCS=true; shift ;;
    --force) FORCE=1; shift ;;
    -j|--jobs) MAX_JOBS="${2:-}"; shift 2 ;;
    --jobs=*) MAX_JOBS="${1#--jobs=}"; shift ;;
    --no-progress) NO_PROGRESS=1; shift ;;
    --quiet) QUIET=1; shift ;;
    --json) JSON=1; shift ;;
    --stats) SHOW_STATS=1; shift ;;
    --reset-cache) RESET_CACHE=1; shift ;;
    -h|--help) SHOW_HELP=1; shift ;;
    *) REAL_ARGS+=("$1"); shift ;;
  esac
done
set -- "${REAL_ARGS[@]+"${REAL_ARGS[@]}"}"

if [ "$SHOW_HELP" = "1" ]; then
  print_help
  exit 0
fi

if [ "$NO_PROGRESS" = "1" ]; then export PB_NO_PROGRESS=1; fi
if [ "$QUIET" = "1" ]; then export PB_NO_PROGRESS=1; fi
if [ "$JSON" = "1" ]; then export PB_JSON=1; fi

# ── Early-exit modes ────────────────────────────────────────────────────────
eta_init

if [ "$RESET_CACHE" = "1" ]; then
  eta_reset_cache
  echo "ETA cache reset: $ETA_CACHE_FILE"
  exit 0
fi

if [ "$SHOW_STATS" = "1" ]; then
  echo "ETA cache: $ETA_CACHE_FILE"
  echo
  eta_stats
  exit 0
fi

# ── App metadata ────────────────────────────────────────────────────────────
ALL_APPS=(home flex viewer showcase todo recipes boilerplate notebook-viewer)
KNOWN_APPS_RE='^(home|flex|viewer|showcase|todo|recipes|boilerplate|notebook-viewer)$'

app_healthcheck_url() {
  case "$1" in
    notebook-viewer) echo "https://nb.hyperskills.net/api/health" ;;
    flex|viewer|recipes|showcase|boilerplate|home|todo) echo "$PUBLIC_BASE_URL/$1/" ;;
    *) echo "" ;;
  esac
}

app_unit() {
  case "$1" in
    flex|viewer|recipes|showcase|boilerplate) echo "webmcp-$1" ;;
    notebook-viewer) echo "notebook-viewer" ;;
    *) echo "" ;;
  esac
}

say()  { [ "$QUIET" = "1" ] || printf '%s\n' "$*"; }
warn() { printf '%s\n' "$*" >&2; }

# ── Fingerprint-based skip ──────────────────────────────────────────────────
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

# ── Run helpers ─────────────────────────────────────────────────────────────
run_ssh() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY] ssh $SSH_HOST $*" >&2
    return 0
  fi
  ssh "$SSH_HOST" "$@"
}

run_rsync() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY] rsync $*" >&2
    return 0
  fi
  rsync "$@"
}

backup_app() {
  local app=$1
  [ "$DRY_RUN" = "1" ] && return 0
  run_ssh "mkdir -p $BACKUP_BASE && rm -rf $BACKUP_BASE/$app.prev && cp -a $REMOTE_BASE/$app $BACKUP_BASE/$app.prev 2>/dev/null || true"
}

rollback_app() {
  local app=$1
  warn "  [$app] rolling back from backup..."
  run_ssh "rm -rf $REMOTE_BASE/$app && cp -a $BACKUP_BASE/$app.prev $REMOTE_BASE/$app"
  local svc; svc=$(app_unit "$app")
  [ -n "$svc" ] && run_ssh "systemctl restart $svc 2>/dev/null || true"
}

# ── Build helpers ───────────────────────────────────────────────────────────
build_node() {
  local app=$1
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
}

build_static() {
  local app=$1
  local env_prefix=""
  if [ "$app" = "home" ] || [ "$app" = "todo" ]; then
    env_prefix="PUBLIC_BASE_URL=$PUBLIC_BASE_URL "
  fi
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  (cd "$LOCAL_ROOT/apps/$app" && eval "${env_prefix}npm run build" > /dev/null 2>&1)
}

build_notebook_viewer() {
  local app="notebook-viewer"
  rm -rf "$LOCAL_ROOT/apps/$app/build"
  (cd "$LOCAL_ROOT/apps/$app" && npm run build > /dev/null 2>&1)
  (cd "$LOCAL_ROOT/apps/$app" && npx tsc server.ts --module nodenext --moduleResolution nodenext --target es2022 --outDir . --skipLibCheck > /dev/null 2>&1)
}

_dispatch_build() {
  local app=$1
  case "$app" in
    flex|viewer|recipes|boilerplate|showcase) build_node "$app" ;;
    home|todo)                                build_static "$app" ;;
    notebook-viewer)                          build_notebook_viewer ;;
    *) warn "  [$app] ✗ unknown app (build phase)"; return 1 ;;
  esac
}

# ── Ship helpers ────────────────────────────────────────────────────────────
_have_pv() { command -v pv >/dev/null 2>&1; }

ship_node_root() {
  local app=$1
  cp "$LOCAL_ROOT/apps/$app/package.json" "$LOCAL_ROOT/apps/$app/build/package.json"
  run_rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/"
  if [ "$DRY_RUN" != "1" ]; then
    local expected actual
    expected=$(sha256sum "$LOCAL_ROOT/apps/$app/build/index.js" | cut -d' ' -f1)
    actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/index.js | cut -d' ' -f1")
    if [ "$expected" != "$actual" ]; then
      warn "  [$app] ✗ INTEGRITY ERROR — sha256 mismatch"
      return 1
    fi
    if ssh "$SSH_HOST" "test -f $REMOTE_BASE/$app/package.json" 2>/dev/null; then
      ssh "$SSH_HOST" "cd $REMOTE_BASE/$app && npm install --production --silent 2>/dev/null"
    fi
  fi
}

ship_static() {
  local app=$1
  run_rsync -az --delete --exclude='.env' "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/"
  if [ "$DRY_RUN" != "1" ]; then
    local expected actual
    expected=$(sha256sum "$LOCAL_ROOT/apps/$app/build/index.html" | cut -d' ' -f1)
    actual=$(ssh "$SSH_HOST" "sha256sum $REMOTE_BASE/$app/index.html | cut -d' ' -f1")
    if [ "$expected" != "$actual" ]; then
      warn "  [$app] ✗ INTEGRITY ERROR — sha256 mismatch"
      rollback_app "$app"
      return 1
    fi
  fi
}

ship_notebook_viewer() {
  local app="notebook-viewer"
  run_rsync -az --delete "$LOCAL_ROOT/apps/$app/build/" "$SSH_HOST:$REMOTE_BASE/$app/build/"
  run_rsync -az "$LOCAL_ROOT/apps/$app/server.js" "$LOCAL_ROOT/apps/$app/package.json" "$SSH_HOST:$REMOTE_BASE/$app/"
}

_dispatch_ship() {
  local app=$1
  case "$app" in
    flex|viewer|recipes|boilerplate|showcase) ship_node_root "$app" ;;
    home|todo)                                ship_static "$app" ;;
    notebook-viewer)                          ship_notebook_viewer ;;
    *) warn "  [$app] ✗ unknown app (ship phase)"; return 1 ;;
  esac
}

# ── Stage runners (clean / build / upload / restart / healthcheck) ──────────
# Stage weights (sum 100): clean=5 build=60 upload=25 restart=5 healthcheck=5

run_stage_clean() {
  local app=$1 id=$2
  pb_set_status "$id" "clean"
  local start; start=$(date +%s)
  eta_estimate "deploy.$app.clean" >/dev/null
  if [ "$DRY_RUN" = "1" ]; then
    sleep 0.05
  else
    backup_app "$app" || true
  fi
  pb_tick "$id" 5
  [[ "${DRY_RUN:-0}" == "1" ]] || eta_record "deploy.$app.clean" $(( $(date +%s) - start ))
}

run_stage_build() {
  local app=$1 id=$2
  pb_set_status "$id" "build"
  local start; start=$(date +%s)
  eta_estimate "deploy.$app.build" >/dev/null
  if [ "$DRY_RUN" = "1" ]; then
    local p
    for p in 15 25 40 55; do pb_tick "$id" "$p"; sleep 0.04; done
  else
    mkdir -p "$BUILD_LOG_DIR"
    if ! _dispatch_build "$app" > "$BUILD_LOG_DIR/$app.log" 2>&1; then
      pb_fail "$id" "build failed"
      echo "fail" > "$RUN_DIR/$app.status"
      return 1
    fi
  fi
  pb_tick "$id" 65
  [[ "${DRY_RUN:-0}" == "1" ]] || eta_record "deploy.$app.build" $(( $(date +%s) - start ))
}

run_stage_upload() {
  local app=$1 id=$2
  pb_set_status "$id" "upload"
  local start; start=$(date +%s)
  eta_estimate "deploy.$app.upload" >/dev/null
  if ! _have_pv && [ ! -f "$RUN_DIR/.pv_warned" ]; then
    warn "pv not installed, no live throughput display"
    : > "$RUN_DIR/.pv_warned"
  fi
  if [ "$DRY_RUN" = "1" ]; then
    local p
    for p in 75 82 88; do pb_tick "$id" "$p"; sleep 0.03; done
  else
    if ! _dispatch_ship "$app"; then
      pb_fail "$id" "upload/integrity failed"
      echo "fail" > "$RUN_DIR/$app.status"
      return 1
    fi
  fi
  pb_tick "$id" 90
  [[ "${DRY_RUN:-0}" == "1" ]] || eta_record "deploy.$app.upload" $(( $(date +%s) - start ))
}

run_stage_restart() {
  local app=$1 id=$2
  local unit; unit=$(app_unit "$app")
  if [ -z "$unit" ]; then
    pb_tick "$id" 95
    return 0
  fi
  pb_set_status "$id" "restart"
  local start; start=$(date +%s)
  eta_estimate "deploy.$app.restart" >/dev/null
  if [ "$DRY_RUN" = "1" ]; then
    sleep 0.05
  else
    if ! ssh "$SSH_HOST" "systemctl restart $unit" 2>>"$BUILD_LOG_DIR/$app.log"; then
      pb_fail "$id" "restart failed"
      echo "fail" > "$RUN_DIR/$app.status"
      return 1
    fi
  fi
  pb_tick "$id" 95
  [[ "${DRY_RUN:-0}" == "1" ]] || eta_record "deploy.$app.restart" $(( $(date +%s) - start ))
}

run_stage_healthcheck() {
  local app=$1 id=$2
  local url; url=$(app_healthcheck_url "$app")
  if [ -z "$url" ]; then
    pb_tick "$id" 100
    return 0
  fi
  pb_set_status "$id" "healthcheck"
  local start; start=$(date +%s)
  eta_estimate "deploy.$app.healthcheck" >/dev/null
  if [ "$DRY_RUN" = "1" ]; then
    sleep 0.05
  else
    local n=0 ok=0
    while [ $n -lt 3 ]; do
      if curl -fsSI --netrc-file "$LOCAL_ROOT/.netrc" --max-time 10 "$url" >/dev/null 2>&1; then
        ok=1; break
      fi
      n=$((n + 1)); sleep 1
    done
    if [ "$ok" != "1" ]; then
      pb_fail "$id" "healthcheck failed"
      echo "fail" > "$RUN_DIR/$app.status"
      return 1
    fi
  fi
  pb_tick "$id" 100
  [[ "${DRY_RUN:-0}" == "1" ]] || eta_record "deploy.$app.healthcheck" $(( $(date +%s) - start ))
}

# ── Worker pool ─────────────────────────────────────────────────────────────
deploy_one_app_locked() {
  local app=$1
  local id="deploy:$app"
  echo "running" > "$RUN_DIR/$app.status"
  run_stage_clean "$app" "$id" || return 1
  run_stage_build "$app" "$id" || return 1
  # Serialize uploads (single saturable network link). Use flock if available;
  # otherwise fall back to a simple mkdir-based spinlock.
  if command -v flock >/dev/null 2>&1; then
    (
      flock -x 200
      run_stage_upload "$app" "$id"
    ) 200>"$RUN_DIR/.upload.lock" || return 1
  else
    while ! mkdir "$RUN_DIR/.upload.lockdir" 2>/dev/null; do sleep 0.2; done
    run_stage_upload "$app" "$id"
    local _rc=$?
    rmdir "$RUN_DIR/.upload.lockdir" 2>/dev/null || true
    [ "$_rc" -eq 0 ] || return $_rc
  fi
  run_stage_restart "$app" "$id" || return 1
  run_stage_healthcheck "$app" "$id" || return 1
  pb_done "$id"
  echo "ok" > "$RUN_DIR/$app.status"
  if [ "$DRY_RUN" != "1" ]; then
    record_fingerprint "$app"
  fi
}

# ── Resource sampler (background) ───────────────────────────────────────────
SAMPLER_PID=""
PEAK_FILE="$RUN_DIR/peak"
echo "0 0.0 0 0" > "$PEAK_FILE"

start_sampler() {
  [ "$NO_PROGRESS" = "1" ] && return 0
  [ "$QUIET" = "1" ] && return 0
  local total_workers=$1 n_apps=$2
  (
    local cores; cores=$(eta_cores)
    local peak_w=0 peak_l=0 sum_w=0 samples=0
    while [ ! -f "$RUN_DIR/.stop_sampler" ]; do
      local active=0
      local app
      for app in "${ALL_APPS[@]}"; do
        [ -f "$RUN_DIR/$app.status" ] || continue
        local s; s=$(cat "$RUN_DIR/$app.status" 2>/dev/null || echo "")
        [ "$s" = "running" ] && active=$((active + 1))
      done
      local load; load=$(eta_loadavg)
      local load_int; load_int=$(awk -v l="$load" 'BEGIN{printf "%d", l + 0.5}')
      [ "$active" -gt "$peak_w" ] && peak_w=$active
      awk -v l="$load" -v p="$peak_l" 'BEGIN{exit !(l>p)}' && peak_l="$load"
      sum_w=$((sum_w + active))
      samples=$((samples + 1))
      local throttled=0
      if awk -v l="$load" -v c="$cores" 'BEGIN{exit !(l>2*c)}'; then
        throttled=1
      fi
      local cpu_bar load_bar
      cpu_bar=$(pb_render_cpu_bar "$active" "$throttled" "$cores")
      load_bar=$(pb_render_load_bar "$load_int" "$cores")
      local hdr="WebMCP deploy — $n_apps apps, $total_workers parallel workers
Cores $cpu_bar   Load $load_bar"
      pb_set_header "$hdr"
      printf '%d %s %d %d\n' "$peak_w" "$peak_l" "$sum_w" "$samples" > "$PEAK_FILE"
      sleep 2
    done
  ) &
  SAMPLER_PID=$!
}

stop_sampler() {
  [ -z "$SAMPLER_PID" ] && return 0
  : > "$RUN_DIR/.stop_sampler"
  kill "$SAMPLER_PID" 2>/dev/null || true
  wait "$SAMPLER_PID" 2>/dev/null || true
  SAMPLER_PID=""
}

cleanup() {
  stop_sampler 2>/dev/null || true
  pb_watch_stop 2>/dev/null || true
  rm -rf "$RUN_DIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Main ────────────────────────────────────────────────────────────────────
if [ $# -eq 0 ]; then
  APPS=("${ALL_APPS[@]}")
else
  APPS=("$@")
fi

TO_BUILD=()
SKIPPED=()
UNKNOWN=()
for app in "${APPS[@]}"; do
  if ! [[ "$app" =~ $KNOWN_APPS_RE ]]; then
    UNKNOWN+=("$app"); continue
  fi
  if [ "$DRY_RUN" != "1" ] && should_skip "$app"; then
    SKIPPED+=("$app")
  else
    TO_BUILD+=("$app")
  fi
done

for app in "${UNKNOWN[@]+"${UNKNOWN[@]}"}"; do
  warn "  [$app] ✗ unknown app (valid: ${ALL_APPS[*]})"
done

if [ ${#TO_BUILD[@]} -eq 0 ]; then
  say "Nothing to deploy."
  exit 0
fi

if [ -z "$MAX_JOBS" ]; then
  MAX_JOBS=${#TO_BUILD[@]}
  [ "$MAX_JOBS" -gt 4 ] && MAX_JOBS=4
fi

# ── Package fingerprint helpers ─────────────────────────────────────────────
pkg_fingerprint() {
  local pkg=$1
  local extra=""
  [ "$pkg" = "agent" ] && extra="$LOCAL_ROOT/packages/agent/recipes"
  {
    find "$LOCAL_ROOT/packages/$pkg/src" "$LOCAL_ROOT/packages/$pkg/package.json" $extra \
      -type f 2>/dev/null
  } | LC_ALL=C sort | xargs shasum -a 256 2>/dev/null | shasum -a 256 | cut -c1-16
}

pkg_changed() {
  local pkg=$1
  [ "$FORCE" = "1" ] && return 0
  local f="$STATE_DIR/pkg.$pkg.sha"
  [ ! -f "$f" ] && return 0
  local current; current=$(pkg_fingerprint "$pkg")
  [ "$(cat "$f")" = "$current" ] && return 1
  return 0
}

pkg_record() {
  local pkg=$1
  mkdir -p "$STATE_DIR"
  pkg_fingerprint "$pkg" > "$STATE_DIR/pkg.$pkg.sha"
}

# Preamble: workspace versions sync + package builds (skipped on dry-run)
if [ "$DRY_RUN" != "1" ]; then
  ROOT_VERSION=$(node -e "console.log(require('$LOCAL_ROOT/package.json').version)")
  for pkg in "$LOCAL_ROOT"/apps/*/package.json "$LOCAL_ROOT"/packages/*/package.json; do
    node -e "const f=require('fs'); const p=JSON.parse(f.readFileSync('$pkg','utf8')); if(p.version!=='$ROOT_VERSION'){p.version='$ROOT_VERSION'; f.writeFileSync('$pkg', JSON.stringify(p,null,2)+'\n')}"
  done
  for pkg in core sdk ui agent; do
    if pkg_changed "$pkg"; then
      if (cd "$LOCAL_ROOT" && npm run build --workspace=packages/$pkg > /dev/null 2>&1); then
        pkg_record "$pkg"
      else
        warn "  [pkg:$pkg] build failed"
      fi
    fi
  done
fi

# ── Progress + sampler ──────────────────────────────────────────────────────
pb_init
pb_set_header "WebMCP deploy — ${#TO_BUILD[@]} apps, $MAX_JOBS parallel workers"

for app in "${TO_BUILD[@]}"; do
  unrel=""
  eta_estimate "deploy.$app.build" >/dev/null
  if [ "$(eta_last_unreliable)" = "1" ]; then unrel=" (unreliable estimate)"; fi
  pb_register "deploy:$app" "$app$unrel" 1
done

START_TS=$(date +%s)
pb_watch_start 200
start_sampler "$MAX_JOBS" "${#TO_BUILD[@]}"

# ── Worker pool with MAX_JOBS cap ───────────────────────────────────────────
PIDS=()
active=0

reap_one() {
  local i
  for i in $(seq 0 $((${#PIDS[@]} - 1))); do
    [ -z "${PIDS[$i]:-}" ] && continue
    local pid="${PIDS[$i]}"
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null || true
      PIDS[$i]=""
      active=$((active - 1))
    fi
  done
}

if [ "$MAX_JOBS" = "1" ]; then
  for app in "${TO_BUILD[@]}"; do
    deploy_one_app_locked "$app" || true
  done
else
  for app in "${TO_BUILD[@]}"; do
    while [ "$active" -ge "$MAX_JOBS" ]; do
      reap_one
      [ "$active" -ge "$MAX_JOBS" ] && sleep 0.5
    done
    ( deploy_one_app_locked "$app" ) &
    PIDS+=("$!")
    active=$((active + 1))
  done
  while [ "$active" -gt 0 ]; do
    reap_one
    [ "$active" -gt 0 ] && sleep 0.5
  done
fi

stop_sampler
pb_watch_stop

[[ "${DRY_RUN:-0}" == "1" ]] || eta_save 2>/dev/null || true

END_TS=$(date +%s)
TOTAL_DUR=$(( END_TS - START_TS ))

FAIL_COUNT=0
for app in "${TO_BUILD[@]}"; do
  s=$(cat "$RUN_DIR/$app.status" 2>/dev/null || echo "?")
  [ "$s" != "ok" ] && FAIL_COUNT=$((FAIL_COUNT + 1))
done

PEAK_W=0; PEAK_L="0.0"; SUM_W=0; SAMPLES=0; AVG_W="0.0"
if [ -f "$PEAK_FILE" ]; then
  read -r PEAK_W PEAK_L SUM_W SAMPLES < "$PEAK_FILE" || true
  if [ "${SAMPLES:-0}" -gt 0 ]; then
    AVG_W=$(awk -v s="$SUM_W" -v n="$SAMPLES" 'BEGIN{printf "%.1f", s/n}')
  fi
fi

pb_finish

if [ "$NO_PROGRESS" != "1" ] && [ "$QUIET" != "1" ]; then
  printf '\nDone in %s — peak: %s workers, peak load %s, avg cores used: %s\n' \
    "$(eta_format_duration "$TOTAL_DUR")" "$PEAK_W" "$PEAK_L" "$AVG_W"
  [ "$DRY_RUN" = "1" ] && printf '(dry-run: cache ETA non mis à jour)\n'
fi

if [ ${#SKIPPED[@]} -gt 0 ]; then
  say "Skipped (unchanged): ${SKIPPED[*]}"
fi

if [ "$FAIL_COUNT" -gt 0 ]; then
  warn "✗ $FAIL_COUNT app(s) failed."
  exit 1
fi

if $WITH_DOCS && [ "$DRY_RUN" != "1" ]; then
  say "Updating documentation..."
  "$SCRIPT_DIR/docs-update.sh" --all -y
fi

exit 0
