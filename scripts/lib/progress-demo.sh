#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# progress-demo.sh — Demonstrates progress.sh: 3 parallel bars, one fail,
# animated cores/load header. Total runtime < 15s.
# ─────────────────────────────────────────────────────────────────────────────

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./progress.sh
source "$HERE/progress.sh"

pb_init

# ── Worker: bumps a bar from 0 → 100 over `duration` seconds, optional fail ──
worker() {
  local id=$1 duration=$2 fail_at=${3:-}
  local steps=20 i pct
  for ((i = 1; i <= steps; i++)); do
    pct=$(( i * 100 / steps ))
    if [ -n "$fail_at" ] && [ "$pct" -ge "$fail_at" ]; then
      pb_fail "$id" "simulated failure at $pct%"
      return 1
    fi
    pb_set_status "$id" "step $i/$steps"
    pb_tick "$id" "$pct"
    # Sleep a fraction of duration (use awk for fractional sleep).
    sleep "$(awk -v d="$duration" -v s="$steps" 'BEGIN{printf "%.3f", d/s}')"
  done
  pb_done "$id"
}

# Animated header: cores/load oscillate while bars run.
header_animator() {
  local stop_file=$1
  local i=0
  while [ ! -f "$stop_file" ]; do
    local active=$(( 4 + (i % 3) ))
    local throttled=$(( (i % 2) ))
    local load
    load=$(awk -v i="$i" 'BEGIN{printf "%.1f", 5 + (i%4)*0.6}')
    local cores; cores=$(pb_render_cpu_bar "$active" "$throttled" 10)
    local lb;    lb=$(pb_render_load_bar "$load" 10)
    pb_set_header "WebMCP demo — 3 apps, parallel
Cores $cores   Load $lb"
    sleep 0.5
    i=$((i + 1))
  done
}

STOP_FILE="$(mktemp -t pb-demo.XXXXXX)"
rm -f "$STOP_FILE"  # ensure it does not exist while running

header_animator "$STOP_FILE" &
HEADER_PID=$!

# Register bars
pb_register build:flex     "build flex"     2
pb_register build:viewer   "build viewer"   1
pb_register build:home     "build home"     1
pb_register deploy:broken  "deploy broken"  1

# Launch parallel workers (different speeds, one fails)
worker build:flex     6 & W1=$!
worker build:viewer   4 & W2=$!
worker build:home     5 & W3=$!
worker deploy:broken  6 67 & W4=$!

# Wait for workers only (allow failures). Don't `wait` without args — that
# would also block on $HEADER_PID, which only exits after STOP_FILE appears.
for pid in "$W1" "$W2" "$W3" "$W4"; do
  wait "$pid" 2>/dev/null || true
done

# Stop header animator
touch "$STOP_FILE"
wait "$HEADER_PID" 2>/dev/null || true
rm -f "$STOP_FILE"

pb_finish

# ─────────────────────────────────────────────────────────────────────────────
# Scenario 5 — Real parallel workers (subshells) using the file-based IPC
# backend. Without pb_watch_start, ticks from `&` workers would never reach
# the parent shell. With it, the watcher polls $PB_STATE_DIR and redraws.
# ─────────────────────────────────────────────────────────────────────────────

printf '\n── Scenario 5: parallel workers via IPC ──\n'
pb_init
pb_set_header "WebMCP demo — 3 parallel workers (real subshells)"

pb_register par:alpha "worker alpha" 1
pb_register par:beta  "worker beta"  1
pb_register par:gamma "worker gamma" 1

pb_watch_start 150

par_worker() {
  local id=$1 duration=$2
  local steps=10 i pct
  for ((i = 1; i <= steps; i++)); do
    pct=$(( i * 100 / steps ))
    pb_set_status "$id" "stage $i/$steps"
    pb_tick "$id" "$pct"
    sleep "$(awk -v d="$duration" -v s="$steps" 'BEGIN{printf "%.3f", d/s}')"
  done
  pb_done "$id"
}

par_worker par:alpha 3 &
PA=$!
par_worker par:beta  4 &
PB=$!
par_worker par:gamma 5 &
PG=$!

for pid in "$PA" "$PB" "$PG"; do
  wait "$pid" 2>/dev/null || true
done

pb_watch_stop
pb_finish
