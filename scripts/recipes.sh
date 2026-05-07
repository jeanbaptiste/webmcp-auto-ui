#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# recipes.sh — Validate and deploy MCP bridge recipes
#
# Usage:
#   ./scripts/recipes.sh                    # check only (default)
#   ./scripts/recipes.sh check              # validate frontmatter + diff vs VM
#   ./scripts/recipes.sh deploy             # rsync + restart changed bridges
#   ./scripts/recipes.sh deploy --dry-run   # simulate
#   ./scripts/recipes.sh deploy --force     # restart all bridges
#   ./scripts/recipes.sh deploy --server NAME [--server NAME ...]
#   ./scripts/recipes.sh deploy --no-restart
#
# Recipes live at mcp-proxies/servers/<srv>/recipes/*.md and are deployed to
# bot:/opt/mcp-bridge/recipes/<srv>/. Bridges parse them at process start, so
# any change requires a `systemctl restart mcp-<srv>`.
# ─────────────────────────────────────────────────────────────────────────────

LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVERS_ROOT="$LOCAL_ROOT/mcp-proxies/servers"
SSH_HOST="bot"
REMOTE_BASE="/opt/mcp-bridge/recipes"
REMOTE_BACKUP_BASE="/opt/mcp-bridge/.backups"
BACKUP_KEEP=10

# Server → systemd service / port (mirrors mcp-proxies/setup.sh).
# Using case statements for bash 3.2 compatibility (macOS).
service_for() {
  case "$1" in
    hackernews)  echo "mcp-hackernews" ;;
    metmuseum)   echo "mcp-metmuseum" ;;
    openmeteo)   echo "mcp-openmeteo" ;;
    wikipedia)   echo "mcp-wikipedia" ;;
    inaturalist) echo "mcp-inaturalist" ;;
    nasa)        echo "mcp-nasa" ;;
    datagouv)    echo "mcp-datagouv" ;;
    *) echo "" ;;
  esac
}

port_for() {
  case "$1" in
    hackernews)  echo 9006 ;;
    metmuseum)   echo 9001 ;;
    openmeteo)   echo 9002 ;;
    wikipedia)   echo 9005 ;;
    inaturalist) echo 9007 ;;
    nasa)        echo 9008 ;;
    datagouv)    echo 9009 ;;
    *) echo "" ;;
  esac
}

# ── Colour helpers ──────────────────────────────────────────────────────────
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
gray()   { printf '\033[90m%s\033[0m\n' "$*"; }

# ── Discover local servers with recipes ─────────────────────────────────────
discover_servers() {
  local list=()
  for d in "$SERVERS_ROOT"/*/recipes/; do
    [ -d "$d" ] || continue
    local srv
    srv="$(basename "$(dirname "$d")")"
    list+=("$srv")
  done
  printf '%s\n' "${list[@]}"
}

# ── Validate frontmatter for one .md ────────────────────────────────────────
validate_frontmatter() {
  local file="$1"
  python3 - "$file" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
text = p.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    sys.exit(f"{p}: missing frontmatter opening ---")
rest = text[4:]
end = rest.find('\n---')
if end < 0:
    sys.exit(f"{p}: missing frontmatter closing ---")
fm_text = rest[:end]
# Extract top-level keys (lines starting with non-space, then `key:`).
top_keys = set()
for line in fm_text.splitlines():
    if not line or line[0] in (' ', '\t', '#', '-'):
        continue
    m = re.match(r'^([A-Za-z_][A-Za-z0-9_-]*)\s*:', line)
    if m:
        top_keys.add(m.group(1))
required = ('id', 'name', 'description', 'servers')
missing = [k for k in required if k not in top_keys]
if missing:
    sys.exit(f"{p}: missing required fields {missing}")
PY
}

# ── Mode: check ─────────────────────────────────────────────────────────────
mode_check() {
  local servers=("$@")
  if [ ${#servers[@]} -eq 0 ]; then
    while IFS= read -r line; do servers+=("$line"); done < <(discover_servers)
  fi

  local errors=0
  local total=0
  echo "[check] validating frontmatter…"
  for srv in "${servers[@]}"; do
    local dir="$SERVERS_ROOT/$srv/recipes"
    [ -d "$dir" ] || { red "  $srv: no recipes dir"; ((errors++)); continue; }
    local count=0
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      ((count++)); ((total++))
      if ! validate_frontmatter "$f" 2>&1; then
        ((errors++))
      fi
    done
    gray "  $srv: $count recipes"
  done

  if [ "$errors" -gt 0 ]; then
    red "[check] $errors error(s) in frontmatter."
    return 1
  fi
  green "[check] $total recipes OK across ${#servers[@]} servers."

  # Diff vs VM (best-effort; non-fatal on ssh failure)
  echo "[check] comparing with $SSH_HOST:$REMOTE_BASE …"
  if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" true 2>/dev/null; then
    yellow "  ssh $SSH_HOST unreachable — skipping diff."
    return 0
  fi

  local divergent=0
  for srv in "${servers[@]}"; do
    local dir="$SERVERS_ROOT/$srv/recipes"
    [ -d "$dir" ] || continue
    local diff_count
    diff_count=$(rsync -avn --delete --itemize-changes \
      "$dir"/ "$SSH_HOST:$REMOTE_BASE/$srv/" 2>/dev/null \
      | awk '/^(>|<|\*deleting)/{n++} END{print n+0}')
    if [ "$diff_count" -gt 0 ]; then
      yellow "  $srv: $diff_count file(s) would change"
      ((divergent++))
    else
      gray "  $srv: in sync"
    fi
  done

  if [ "$divergent" -gt 0 ]; then
    yellow "[check] $divergent server(s) divergent from VM."
    return 1
  fi
  green "[check] all servers in sync with VM."
}

# ── Mode: deploy ────────────────────────────────────────────────────────────
mode_deploy() {
  local dry_run=0 force=0 no_restart=0
  local target_servers=()

  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) dry_run=1; shift ;;
      --force) force=1; shift ;;
      --no-restart) no_restart=1; shift ;;
      --server) target_servers+=("$2"); shift 2 ;;
      --server=*) target_servers+=("${1#--server=}"); shift ;;
      *) red "Unknown flag: $1"; exit 2 ;;
    esac
  done

  local servers=()
  if [ ${#target_servers[@]} -gt 0 ]; then
    servers=("${target_servers[@]}")
  else
    while IFS= read -r line; do servers+=("$line"); done < <(discover_servers)
  fi

  # Validate first (frontmatter only — diff would re-rsync)
  echo "[deploy] validating frontmatter…"
  local total=0
  for srv in "${servers[@]}"; do
    local dir="$SERVERS_ROOT/$srv/recipes"
    [ -d "$dir" ] || { red "  $srv: no recipes dir"; exit 1; }
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      ((total++))
      validate_frontmatter "$f" >&2 || exit 1
    done
  done
  if [ "$total" -eq 0 ]; then
    red "[deploy] refusing to run with 0 recipes locally — aborting."
    exit 1
  fi
  gray "  $total recipes validated."

  # Pre-check VM reachability
  if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" true 2>/dev/null; then
    red "[deploy] ssh $SSH_HOST unreachable — abort."
    exit 1
  fi

  # Pre-rsync tar backup (skipped on dry-run)
  local ts
  ts="$(date +%Y%m%d-%H%M%S)"
  local backup_dir="$REMOTE_BACKUP_BASE/recipes-rsync-$ts"
  if [ "$dry_run" = "0" ]; then
    echo "[deploy] backing up remote recipes → $REMOTE_BACKUP_BASE/recipes-$ts.tar.gz"
    ssh "$SSH_HOST" "mkdir -p '$REMOTE_BACKUP_BASE' && \
      if [ -d '$REMOTE_BASE' ]; then \
        tar czf '$REMOTE_BACKUP_BASE/recipes-$ts.tar.gz' -C /opt/mcp-bridge recipes; \
      fi"
  else
    yellow "[deploy] dry-run: skipping backup."
  fi

  # Rsync per server, capture which had transfers
  local changed_servers=()
  for srv in "${servers[@]}"; do
    local dir="$SERVERS_ROOT/$srv/recipes"
    local rsync_args=(-av --delete --itemize-changes
      --rsync-path="mkdir -p '$REMOTE_BASE/$srv' && rsync")
    [ "$dry_run" = "1" ] && rsync_args+=(--dry-run)
    [ "$dry_run" = "0" ] && rsync_args+=(--backup "--backup-dir=$backup_dir/$srv")

    local out
    set +e
    out=$(rsync "${rsync_args[@]}" "$dir"/ "$SSH_HOST:$REMOTE_BASE/$srv/" 2>&1)
    local rc=$?
    set -e
    if [ "$rc" -ne 0 ]; then
      red "[deploy] rsync failed for $srv:"
      echo "$out"
      exit 1
    fi

    local n
    n=$(echo "$out" | awk '/^(>|<|\*deleting)/{n++} END{print n+0}')
    if [ "$n" -gt 0 ]; then
      yellow "  $srv: $n change(s)"
      changed_servers+=("$srv")
    else
      gray "  $srv: no change"
    fi
  done

  if [ "$dry_run" = "1" ]; then
    yellow "[deploy] dry-run complete — no files transferred, no restarts."
    return 0
  fi

  # Restart bridges. NB: under `set -u`, expanding "${arr[@]}" on an empty
  # array errors out — guard with length check before expanding changed_servers.
  local restart_list=()
  if [ "$force" = "1" ]; then
    restart_list=("${servers[@]}")
  elif [ ${#changed_servers[@]} -gt 0 ]; then
    restart_list=("${changed_servers[@]}")
  fi

  if [ "$no_restart" = "1" ] || [ ${#restart_list[@]} -eq 0 ]; then
    if [ "$no_restart" = "1" ]; then
      yellow "[deploy] --no-restart: bridges NOT restarted."
    else
      green "[deploy] no changes — no restart needed."
    fi
  else
    local svc_units=()
    for srv in "${restart_list[@]}"; do
      local svc; svc="$(service_for "$srv")"
      [ -n "$svc" ] || { yellow "  $srv: no service mapping, skipping restart"; continue; }
      svc_units+=("$svc")
    done
    if [ ${#svc_units[@]} -gt 0 ]; then
      echo "[deploy] restarting: ${svc_units[*]}"
      ssh "$SSH_HOST" "systemctl restart ${svc_units[*]}"
      sleep 2
      # Healthcheck
      local payload='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"recipes.sh","version":"1.0"}}}'
      local fail=0
      for srv in "${restart_list[@]}"; do
        local port; port="$(port_for "$srv")"
        [ -n "$port" ] || continue
        local status
        status=$(ssh "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' \
          -X POST http://127.0.0.1:$port/mcp \
          -H 'Content-Type: application/json' \
          -d '$payload' --max-time 10" 2>/dev/null || echo "000")
        if [ "$status" = "200" ]; then
          green "  $srv (port $port): OK"
        else
          red "  $srv (port $port): FAILED ($status)"
          ((fail++))
        fi
      done
      if [ "$fail" -gt 0 ]; then
        red "[deploy] $fail bridge(s) unhealthy after restart."
        exit 1
      fi
    fi
  fi

  # Rotate backups (keep last $BACKUP_KEEP tar.gz)
  if [ "$dry_run" = "0" ]; then
    ssh "$SSH_HOST" "ls -1t '$REMOTE_BACKUP_BASE'/recipes-*.tar.gz 2>/dev/null | tail -n +$((BACKUP_KEEP+1)) | xargs -r rm -f" || true
  fi

  green "[deploy] done."
}

# ── Dispatch ────────────────────────────────────────────────────────────────
cmd="${1:-check}"
case "$cmd" in
  check) shift || true; mode_check "$@" ;;
  deploy) shift; mode_deploy "$@" ;;
  -h|--help)
    sed -n '4,17p' "$0"
    ;;
  *)
    red "Unknown command: $cmd"
    sed -n '4,17p' "$0"
    exit 2
    ;;
esac
