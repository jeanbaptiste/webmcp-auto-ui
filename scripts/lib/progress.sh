#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# progress.sh — Multi-line ANSI progress bars for deploy.sh / batch.sh
#
# Usage (source, do not exec):
#   source scripts/lib/progress.sh
#   pb_init
#   pb_set_header "WebMCP deploy — 3 apps"
#   pb_register build:flex "build flex" 1
#   pb_tick build:flex 42
#   pb_set_status build:flex "compiling chunks"
#   pb_done build:flex
#   pb_finish
#
# Modes:
#   - TTY (default)     : redraw with tput cup
#   - non-TTY           : line-by-line timestamped output
#   - PB_JSON=1         : JSON events on fd 3 (or stderr if fd 3 closed)
#   - PB_NO_PROGRESS=1  : silent (only final pb_done one-liners)
#   - NO_COLOR=1        : disable ANSI colors
#
# Bash 3.2 compatible: uses parallel-array shim (no associative arrays).
# ─────────────────────────────────────────────────────────────────────────────

# Force C locale for awk math (avoids "1,23" decimals on fr_FR locales).
export LC_ALL="${LC_ALL:-C}"
export LC_NUMERIC=C

PB_HAS_ASSOC=0
if [ -n "${BASH_VERSINFO:-}" ] && [ "${BASH_VERSINFO[0]}" -ge 4 ]; then
  PB_HAS_ASSOC=1
fi

# ── State ──────────────────────────────────────────────────────────────────
#
# Bash 3.2 has no associative arrays, so we use parallel arrays indexed by
# position. PB_IDS is the registration order; PB_*_AT[i] holds the value for
# the id at PB_IDS[i]. _pb_idx_of resolves an id to its position.

PB_IDS=()
PB_LABEL_AT=()
PB_PCT_AT=()
PB_START_AT=()
PB_WEIGHT_AT=()
PB_STATUS_AT=()       # running | done | fail
PB_STATUS_TEXT_AT=()
PB_DONE_AT_AT=()
PB_FAIL_MSG_AT=()
PB_ROW_AT=()          # row index (within bars region) per id

PB_HEADER=""
PB_HEADER_LINES=0
PB_BARS_ROW=0                   # absolute terminal row where bars start
PB_TOTAL=0                      # total registered
PB_DONE_COUNT=0
PB_TTY=0
PB_COLS=80
PB_LOCK="/tmp/webmcp-pb.$$.lock"
PB_INITED=0
PB_BAR_WIDTH=10

# ── IPC backend (file-based, for parallel workers in subshells) ────────────
PB_STATE_DIR=""        # set by pb_init
PB_WATCH_PID=""        # background watcher pid (empty if not running)
PB_WATCH_INTERVAL_MS=200
PB_OS="$(uname -s 2>/dev/null || echo Unknown)"

# ── Index helpers ──────────────────────────────────────────────────────────

_pb_idx_of() {
  # _pb_idx_of <id> → echoes the index in PB_IDS, or empty if not found.
  local id="$1" i
  for ((i = 0; i < ${#PB_IDS[@]}; i++)); do
    if [ "${PB_IDS[$i]}" = "$id" ]; then
      printf '%d' "$i"
      return 0
    fi
  done
  return 1
}

_pb_has() {
  # _pb_has <id> → 0 if registered, 1 otherwise. Quiet.
  _pb_idx_of "$1" >/dev/null 2>&1
}

# ── Capability detection ───────────────────────────────────────────────────

_pb_is_tty()      { [ -t 1 ]; }
_pb_use_color()   { [ "${NO_COLOR:-0}" != "1" ] && _pb_is_tty; }
_pb_silent()      { [ "${PB_NO_PROGRESS:-0}" = "1" ]; }
_pb_json()        { [ "${PB_JSON:-0}" = "1" ]; }

# ── Colors ─────────────────────────────────────────────────────────────────

_pb_c() {
  # _pb_c <color> <text>
  if _pb_use_color; then
    case "$1" in
      green)  printf '\033[32m%s\033[0m' "$2" ;;
      yellow) printf '\033[33m%s\033[0m' "$2" ;;
      red)    printf '\033[31m%s\033[0m' "$2" ;;
      gray)   printf '\033[90m%s\033[0m' "$2" ;;
      bold)   printf '\033[1m%s\033[0m'  "$2" ;;
      *)      printf '%s' "$2" ;;
    esac
  else
    printf '%s' "$2"
  fi
}

# ── Time helpers ───────────────────────────────────────────────────────────

_pb_now()    { date +%s; }
_pb_iso()    { date -u +%Y-%m-%dT%H:%M:%SZ; }

_pb_fmt_dur() {
  local s=$1
  if [ "$s" -lt 0 ]; then s=0; fi
  if [ "$s" -ge 60 ]; then
    printf '%dm%02ds' $((s / 60)) $((s % 60))
  else
    printf '%ds' "$s"
  fi
}

# ── JSON event emission ────────────────────────────────────────────────────

_pb_emit_json() {
  # _pb_emit_json <event> <id> <pct> <eta> <status_text> [extra]
  local ev=$1 id=$2 pct=$3 eta=$4 st=$5 extra=${6:-}
  local line
  printf -v line '{"event":"%s","id":"%s","pct":%d,"eta_s":%d,"status":"%s","ts":"%s"%s}\n' \
    "$ev" "$id" "$pct" "$eta" "${st//\"/\\\"}" "$(_pb_iso)" \
    "${extra:+,$extra}"
  # fd 3 if open, else stderr
  if { true >&3; } 2>/dev/null; then
    printf '%s' "$line" >&3
  else
    printf '%s' "$line" >&2
  fi
}

# ── Init / finish ──────────────────────────────────────────────────────────

pb_init() {
  PB_INITED=1
  PB_TOTAL=0
  PB_DONE_COUNT=0
  PB_IDS=()
  PB_LABEL_AT=()
  PB_PCT_AT=()
  PB_START_AT=()
  PB_WEIGHT_AT=()
  PB_STATUS_AT=()
  PB_STATUS_TEXT_AT=()
  PB_DONE_AT_AT=()
  PB_FAIL_MSG_AT=()
  PB_ROW_AT=()
  PB_HEADER=""
  PB_HEADER_LINES=0
  PB_BARS_ROW=0

  if _pb_is_tty; then
    PB_TTY=1
    PB_COLS=$(tput cols 2>/dev/null || echo 80)
    if ! _pb_silent; then
      tput civis 2>/dev/null || true
    fi
  else
    PB_TTY=0
    PB_COLS=200
  fi

  : > "$PB_LOCK" 2>/dev/null || true

  # IPC state directory. Try primary path; fall back to TMPDIR if not writable.
  PB_STATE_DIR="/tmp/webmcp-pb.$$"
  if ! mkdir -p "$PB_STATE_DIR" 2>/dev/null || [ ! -w "$PB_STATE_DIR" ]; then
    PB_STATE_DIR="${TMPDIR:-/tmp}/pb-$$"
    mkdir -p "$PB_STATE_DIR" 2>/dev/null || true
  fi
  # Export so subshells (workers spawned with &) inherit and can write here.
  export PB_STATE_DIR
  PB_WATCH_PID=""

  trap '_pb_restore' EXIT INT TERM
}

# ── IPC helpers ────────────────────────────────────────────────────────────

_pb_state_file() {
  # Sanitize id (replace / with _) so we get a flat file per bar.
  local id="$1"
  local safe="${id//\//_}"
  printf '%s/%s.state' "$PB_STATE_DIR" "$safe"
}

_pb_state_write() {
  # _pb_state_write <id> <pct> <status> <status_text> [seen]
  # Atomic write: tmp + mv. Format: pct|status|status_text|seen
  [ -z "$PB_STATE_DIR" ] && return 0
  [ -d "$PB_STATE_DIR" ] || return 0
  local id=$1 pct=$2 status=$3 stext=$4 seen=${5:-0}
  local f; f=$(_pb_state_file "$id")
  printf '%s|%s|%s|%s\n' "$pct" "$status" "$stext" "$seen" > "$f.tmp" 2>/dev/null \
    && mv -f "$f.tmp" "$f" 2>/dev/null || true
}

_pb_state_read() {
  # _pb_state_read <file>  → echoes "pct|status|status_text|seen"
  local f=$1
  [ -f "$f" ] || return 1
  IFS= read -r line < "$f" 2>/dev/null || return 1
  printf '%s' "$line"
}

_pb_mtime() {
  # Cross-platform mtime in epoch seconds (returns 0 on failure).
  local f=$1
  if [ "$PB_OS" = "Darwin" ]; then
    stat -f %m "$f" 2>/dev/null || echo 0
  else
    stat -c %Y "$f" 2>/dev/null || echo 0
  fi
}

# Capture the current values from internal arrays into the state file for <id>.
_pb_sync_state() {
  local id=$1
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  _pb_state_write "$id" \
    "${PB_PCT_AT[$idx]}" \
    "${PB_STATUS_AT[$idx]}" \
    "${PB_STATUS_TEXT_AT[$idx]:-}" \
    1
}

_pb_restore() {
  if [ "$PB_TTY" = "1" ]; then
    tput cnorm 2>/dev/null || true
  fi
  # Stop watcher if still running
  if [ -n "$PB_WATCH_PID" ]; then
    [ -n "$PB_STATE_DIR" ] && touch "$PB_STATE_DIR/.stop" 2>/dev/null || true
    kill "$PB_WATCH_PID" 2>/dev/null || true
    wait "$PB_WATCH_PID" 2>/dev/null || true
    PB_WATCH_PID=""
  fi
  rm -f "$PB_LOCK" 2>/dev/null || true
  if [ -n "$PB_STATE_DIR" ] && [ -d "$PB_STATE_DIR" ]; then
    rm -rf "$PB_STATE_DIR" 2>/dev/null || true
  fi
}

pb_finish() {
  [ "$PB_INITED" = "1" ] || return 0
  if [ "$PB_TTY" = "1" ] && ! _pb_silent; then
    # Move below all bars
    local last_row=$((PB_BARS_ROW + ${#PB_IDS[@]}))
    tput cup "$last_row" 0 2>/dev/null || true
    printf '\n'
    tput cnorm 2>/dev/null || true
  fi

  # Final recap
  if ! _pb_silent || [ "${#PB_IDS[@]}" -gt 0 ]; then
    printf '\n'
    _pb_c bold "── Recap ──"; printf '\n'
    local i id dur status_label start done_at status label
    for ((i = 0; i < ${#PB_IDS[@]}; i++)); do
      id="${PB_IDS[$i]}"
      start="${PB_START_AT[$i]:-0}"
      done_at="${PB_DONE_AT_AT[$i]:-}"
      [ -z "$done_at" ] && done_at=$(_pb_now)
      dur=$((done_at - start))
      status="${PB_STATUS_AT[$i]:-running}"
      label="${PB_LABEL_AT[$i]}"
      case "$status" in
        done) status_label=$(_pb_c green "✓") ;;
        fail) status_label=$(_pb_c red   "✗") ;;
        *)    status_label=$(_pb_c yellow "…") ;;
      esac
      printf '  %s %-20s %s\n' "$status_label" "$label" "$(_pb_fmt_dur "$dur")"
    done
  fi

  rm -f "$PB_LOCK" 2>/dev/null || true
  PB_INITED=0
}

# ── Header ─────────────────────────────────────────────────────────────────

pb_set_header() {
  PB_HEADER="$1"
  # Count newlines (header may be multi-line)
  local nl="${PB_HEADER//[^$'\n']/}"
  PB_HEADER_LINES=$(( ${#nl} + 1 ))
  PB_BARS_ROW=$(( PB_HEADER_LINES + 1 ))
  _pb_redraw
}

# ── Register / update ──────────────────────────────────────────────────────

pb_register() {
  local id=$1 label=$2 weight=${3:-1}
  # If already registered, update in place.
  local idx
  if idx=$(_pb_idx_of "$id"); then
    PB_LABEL_AT[$idx]="$label"
    PB_WEIGHT_AT[$idx]="$weight"
    _pb_redraw_or_log "$id"
    return 0
  fi

  PB_IDS+=("$id")
  PB_LABEL_AT+=("$label")
  PB_PCT_AT+=("0")
  PB_START_AT+=("$(_pb_now)")
  PB_WEIGHT_AT+=("$weight")
  PB_STATUS_AT+=("running")
  PB_STATUS_TEXT_AT+=("")
  PB_DONE_AT_AT+=("")
  PB_FAIL_MSG_AT+=("")
  PB_ROW_AT+=("$PB_TOTAL")
  PB_TOTAL=$((PB_TOTAL + 1))

  # IPC: initial state (-1 = registered, not yet ticked). seen=1 since main
  # process already knows about it; the watcher won't re-emit a tick event.
  _pb_state_write "$id" "-1" "running" "" 1

  if [ "$PB_TTY" = "1" ] && ! _pb_silent; then
    # On first register, snapshot current cursor row as bars region start
    if [ "$PB_BARS_ROW" -eq 0 ]; then
      PB_BARS_ROW=$((PB_HEADER_LINES + 1))
      # Reserve lines (print blank lines so we don't push existing content)
      local i
      for ((i = 0; i < PB_HEADER_LINES + PB_TOTAL; i++)); do printf '\n'; done
    else
      printf '\n'
    fi
    _pb_redraw
  fi
}

pb_tick() {
  local id=$1 pct=$2
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  if [ "$pct" -lt 0 ]; then pct=0; fi
  if [ "$pct" -gt 100 ]; then pct=100; fi
  PB_PCT_AT[$idx]=$pct

  local start="${PB_START_AT[$idx]}"
  local elapsed=$(( $(_pb_now) - start ))
  local eta=0
  if [ "$pct" -gt 0 ] && [ "$pct" -lt 100 ]; then
    eta=$(( elapsed * (100 - pct) / pct ))
  fi

  # IPC write. seen=0 means: if a watcher is running, it will pick this up
  # and re-emit (JSON / redraw) in the parent process.
  _pb_state_write "$id" "$pct" "${PB_STATUS_AT[$idx]:-running}" \
    "${PB_STATUS_TEXT_AT[$idx]:-}" 0

  if _pb_json; then
    _pb_emit_json tick "$id" "$pct" "$eta" "${PB_STATUS_TEXT_AT[$idx]:-}"
  fi
  _pb_redraw_or_log "$id"
}

pb_set_status() {
  local id=$1 text=$2
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  PB_STATUS_TEXT_AT[$idx]="$text"
  _pb_state_write "$id" "${PB_PCT_AT[$idx]:-0}" \
    "${PB_STATUS_AT[$idx]:-running}" "$text" 0
  _pb_redraw_or_log "$id"
}

pb_done() {
  local id=$1
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  PB_PCT_AT[$idx]=100
  PB_STATUS_AT[$idx]="done"
  local now; now=$(_pb_now)
  PB_DONE_AT_AT[$idx]="$now"
  PB_DONE_COUNT=$((PB_DONE_COUNT + 1))
  _pb_state_write "$id" 100 "done" "${PB_STATUS_TEXT_AT[$idx]:-}" 0
  if _pb_json; then
    local dur=$(( now - PB_START_AT[$idx] ))
    _pb_emit_json done "$id" 100 0 "${PB_STATUS_TEXT_AT[$idx]:-}" "\"duration_s\":$dur"
  fi
  if _pb_silent; then
    printf '[%s] %s ✓ done in %s\n' \
      "$(_pb_iso)" "${PB_LABEL_AT[$idx]}" \
      "$(_pb_fmt_dur $(( now - PB_START_AT[$idx] )))"
    return 0
  fi
  _pb_redraw_or_log "$id"
}

pb_fail() {
  local id=$1 msg=${2:-failed}
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  PB_STATUS_AT[$idx]="fail"
  PB_DONE_AT_AT[$idx]=$(_pb_now)
  PB_FAIL_MSG_AT[$idx]="$msg"
  _pb_state_write "$id" "${PB_PCT_AT[$idx]:-0}" "fail" "$msg" 0
  if _pb_json; then
    _pb_emit_json fail "$id" "${PB_PCT_AT[$idx]}" 0 "$msg"
  fi
  if _pb_silent; then
    printf '[%s] %s ✗ %s\n' "$(_pb_iso)" "${PB_LABEL_AT[$idx]}" "$msg"
    return 0
  fi
  _pb_redraw_or_log "$id"
}

# ── Rendering ──────────────────────────────────────────────────────────────

_pb_bar_str() {
  # _pb_bar_str <pct>   →  ▰▰▰▰▱▱▱▱▱▱
  local pct=$1
  local filled=$(( pct * PB_BAR_WIDTH / 100 ))
  if [ "$filled" -gt "$PB_BAR_WIDTH" ]; then filled=$PB_BAR_WIDTH; fi
  local i out=""
  for ((i = 0; i < filled; i++)); do out+="▰"; done
  for ((i = filled; i < PB_BAR_WIDTH; i++)); do out+="▱"; done
  printf '%s' "$out"
}

_pb_pad_label() {
  # Pad to 20 chars (truncate if longer)
  local s=$1 width=20
  if [ "${#s}" -gt "$width" ]; then
    printf '%s' "${s:0:width}"
  else
    printf '%-*s' "$width" "$s"
  fi
}

_pb_format_line() {
  local id=$1
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  local idx1=$((${PB_ROW_AT[$idx]} + 1))
  local label_p; label_p=$(_pb_pad_label "${PB_LABEL_AT[$idx]}")
  local pct=${PB_PCT_AT[$idx]}
  local status=${PB_STATUS_AT[$idx]}
  local stext=${PB_STATUS_TEXT_AT[$idx]:-}
  local prefix; printf -v prefix '[%d/%d]' "$idx1" "$PB_TOTAL"

  case "$status" in
    done)
      local dur=$(( PB_DONE_AT_AT[$idx] - PB_START_AT[$idx] ))
      printf '%s %s %s %s ✓ done in %s' \
        "$prefix" "$label_p" \
        "$(_pb_c green "$(_pb_bar_str 100)")" \
        "$(_pb_c green '100%')" \
        "$(_pb_fmt_dur "$dur")"
      ;;
    fail)
      printf '%s %s %s %s' \
        "$prefix" "$label_p" \
        "$(_pb_c red "$(_pb_bar_str "$pct")")" \
        "$(_pb_c red "✗ failed: ${PB_FAIL_MSG_AT[$idx]:-}")"
      ;;
    *)
      local elapsed=$(( $(_pb_now) - PB_START_AT[$idx] ))
      local eta=0
      if [ "$pct" -gt 0 ] && [ "$pct" -lt 100 ]; then
        eta=$(( elapsed * (100 - pct) / pct ))
      fi
      local eta_s; eta_s=$(_pb_fmt_dur "$eta")
      local pct_s; printf -v pct_s '%3d%%' "$pct"
      printf '%s %s %s %s' \
        "$prefix" "$label_p" \
        "$(_pb_bar_str "$pct")" \
        "$pct_s"
      if [ -n "$stext" ]; then
        printf ' — %s' "$(_pb_c gray "$stext")"
      fi
      if [ "$pct" -gt 0 ] && [ "$pct" -lt 100 ]; then
        printf ' — ETA %s' "$eta_s"
      fi
      ;;
  esac
}

_pb_log_line() {
  # Non-TTY single-line emission
  local id=$1
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  local pct=${PB_PCT_AT[$idx]}
  local status=${PB_STATUS_AT[$idx]}
  local stext=${PB_STATUS_TEXT_AT[$idx]:-}
  local elapsed=$(( $(_pb_now) - PB_START_AT[$idx] ))
  local eta=0
  if [ "$pct" -gt 0 ] && [ "$pct" -lt 100 ]; then
    eta=$(( elapsed * (100 - pct) / pct ))
  fi
  case "$status" in
    done)
      printf '[%s] [%s] done in %s\n' "$(_pb_iso)" "${PB_LABEL_AT[$idx]}" \
        "$(_pb_fmt_dur $((PB_DONE_AT_AT[$idx] - PB_START_AT[$idx])))"
      ;;
    fail)
      printf '[%s] [%s] FAIL: %s\n' "$(_pb_iso)" "${PB_LABEL_AT[$idx]}" \
        "${PB_FAIL_MSG_AT[$idx]:-}"
      ;;
    *)
      printf '[%s] [%s] %d%% ETA %s%s\n' \
        "$(_pb_iso)" "${PB_LABEL_AT[$idx]}" "$pct" \
        "$(_pb_fmt_dur "$eta")" \
        "${stext:+ ($stext)}"
      ;;
  esac
}

_pb_format_line_state() {
  # Like _pb_format_line, but reads pct/status/stext from arguments instead of
  # the (possibly stale) internal arrays. Used by the watcher.
  local id=$1 pct=$2 status=$3 stext=$4
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  local idx1=$((${PB_ROW_AT[$idx]} + 1))
  local label_p; label_p=$(_pb_pad_label "${PB_LABEL_AT[$idx]}")
  local prefix; printf -v prefix '[%d/%d]' "$idx1" "$PB_TOTAL"

  case "$status" in
    done)
      local dur=$(( $(_pb_now) - PB_START_AT[$idx] ))
      printf '%s %s %s %s ✓ done in %s' \
        "$prefix" "$label_p" \
        "$(_pb_c green "$(_pb_bar_str 100)")" \
        "$(_pb_c green '100%')" \
        "$(_pb_fmt_dur "$dur")"
      ;;
    fail)
      printf '%s %s %s %s' \
        "$prefix" "$label_p" \
        "$(_pb_c red "$(_pb_bar_str "$pct")")" \
        "$(_pb_c red "✗ failed: $stext")"
      ;;
    *)
      local p=$pct; [ "$p" -lt 0 ] && p=0
      local elapsed=$(( $(_pb_now) - PB_START_AT[$idx] ))
      local eta=0
      if [ "$p" -gt 0 ] && [ "$p" -lt 100 ]; then
        eta=$(( elapsed * (100 - p) / p ))
      fi
      local eta_s; eta_s=$(_pb_fmt_dur "$eta")
      local pct_s; printf -v pct_s '%3d%%' "$p"
      printf '%s %s %s %s' \
        "$prefix" "$label_p" \
        "$(_pb_bar_str "$p")" \
        "$pct_s"
      if [ -n "$stext" ]; then
        printf ' — %s' "$(_pb_c gray "$stext")"
      fi
      if [ "$p" -gt 0 ] && [ "$p" -lt 100 ]; then
        printf ' — ETA %s' "$eta_s"
      fi
      ;;
  esac
}

_pb_redraw_one_state() {
  # Draw a single bar line in-place using values from the watcher.
  local id=$1 pct=$2 status=$3 stext=$4
  [ "$PB_TTY" = "1" ] || return 0
  _pb_silent && return 0
  local idx
  idx=$(_pb_idx_of "$id") || return 0
  local row=$(( PB_BARS_ROW + PB_ROW_AT[$idx] - 1 ))
  (
    flock -x 9 2>/dev/null || true
    tput cup "$row" 0 2>/dev/null || true
    tput el 2>/dev/null || true
    _pb_format_line_state "$id" "$pct" "$status" "$stext"
  ) 9>"$PB_LOCK"
}

_pb_id_from_file() {
  # Reverse the sanitization in _pb_state_file. Since we only replace '/' with
  # '_', and ids in this codebase don't contain '_' suffixes that conflict,
  # we look up by scanning PB_IDS for a matching sanitized form.
  local base=$1 i id safe
  for ((i = 0; i < ${#PB_IDS[@]}; i++)); do
    id="${PB_IDS[$i]}"
    safe="${id//\//_}"
    if [ "$safe" = "$base" ]; then
      printf '%s' "$id"
      return 0
    fi
  done
  return 1
}

_pb_watch_loop() {
  # Background loop. Scans $PB_STATE_DIR for changes and redraws bars whose
  # state file has been modified since last seen. Exits when .stop appears.
  local interval_ms=${1:-200}
  local sleep_s
  sleep_s=$(awk -v m="$interval_ms" 'BEGIN{printf "%.3f", m/1000.0}')

  # Per-file last-mtime memo (parallel arrays, since bash 3.2).
  local _wf_keys=() _wf_mt=()
  local stop_file="$PB_STATE_DIR/.stop"

  while [ ! -f "$stop_file" ]; do
    local f base id line pct status stext seen mt cached_mt found j
    for f in "$PB_STATE_DIR"/*.state; do
      [ -f "$f" ] || continue
      base=$(basename "$f" .state)
      mt=$(_pb_mtime "$f")
      cached_mt=""
      found=-1
      for ((j = 0; j < ${#_wf_keys[@]}; j++)); do
        if [ "${_wf_keys[$j]}" = "$base" ]; then
          cached_mt="${_wf_mt[$j]}"
          found=$j
          break
        fi
      done
      if [ "$mt" = "$cached_mt" ]; then continue; fi
      if [ "$found" -ge 0 ]; then
        _wf_mt[$found]="$mt"
      else
        _wf_keys+=("$base")
        _wf_mt+=("$mt")
      fi

      line=$(_pb_state_read "$f") || continue
      [ -z "$line" ] && continue

      # Parse pct|status|stext|seen
      pct="${line%%|*}"; line="${line#*|}"
      status="${line%%|*}"; line="${line#*|}"
      stext="${line%%|*}"; line="${line#*|}"
      seen="$line"

      id=$(_pb_id_from_file "$base") || continue

      # Redraw line using state values
      _pb_redraw_one_state "$id" "$pct" "$status" "$stext"

      # JSON emission for unseen rows (consume by setting seen=1)
      if [ "$seen" = "0" ]; then
        if _pb_json; then
          local ev=tick eta=0
          case "$status" in
            done) ev=done ;;
            fail) ev=fail ;;
          esac
          _pb_emit_json "$ev" "$id" "${pct:-0}" "$eta" "$stext"
        fi
        _pb_state_write "$id" "$pct" "$status" "$stext" 1
        # Update memo with the new mtime resulting from our own write
        local new_mt; new_mt=$(_pb_mtime "$f")
        for ((j = 0; j < ${#_wf_keys[@]}; j++)); do
          if [ "${_wf_keys[$j]}" = "$base" ]; then
            _wf_mt[$j]="$new_mt"
            break
          fi
        done
      fi
    done
    sleep "$sleep_s"
  done
}

pb_watch_start() {
  # pb_watch_start [interval_ms]
  [ "$PB_INITED" = "1" ] || return 0
  [ -n "$PB_WATCH_PID" ] && return 0   # idempotent
  [ -z "$PB_STATE_DIR" ] && return 0
  local interval=${1:-$PB_WATCH_INTERVAL_MS}
  rm -f "$PB_STATE_DIR/.stop" 2>/dev/null || true
  _pb_watch_loop "$interval" &
  PB_WATCH_PID=$!
}

pb_watch_stop() {
  [ -z "$PB_WATCH_PID" ] && return 0
  [ -n "$PB_STATE_DIR" ] && touch "$PB_STATE_DIR/.stop" 2>/dev/null || true
  wait "$PB_WATCH_PID" 2>/dev/null || true
  PB_WATCH_PID=""

  # After workers finished, sync internal arrays with final state files so
  # that pb_finish's recap reflects done/fail status set from subshells.
  local f base id line pct status stext idx
  for f in "$PB_STATE_DIR"/*.state; do
    [ -f "$f" ] || continue
    base=$(basename "$f" .state)
    id=$(_pb_id_from_file "$base") || continue
    line=$(_pb_state_read "$f") || continue
    pct="${line%%|*}"; line="${line#*|}"
    status="${line%%|*}"; line="${line#*|}"
    stext="${line%%|*}"
    idx=$(_pb_idx_of "$id") || continue
    [ "$pct" = "-1" ] || PB_PCT_AT[$idx]="$pct"
    PB_STATUS_AT[$idx]="$status"
    PB_STATUS_TEXT_AT[$idx]="$stext"
    if [ "$status" = "done" ] || [ "$status" = "fail" ]; then
      [ -z "${PB_DONE_AT_AT[$idx]:-}" ] && PB_DONE_AT_AT[$idx]=$(_pb_now)
      if [ "$status" = "fail" ]; then
        PB_FAIL_MSG_AT[$idx]="$stext"
      fi
    fi
  done
}

_pb_redraw_or_log() {
  local id=$1
  if _pb_silent; then return 0; fi
  if [ "$PB_TTY" = "1" ]; then
    _pb_redraw
  else
    _pb_log_line "$id"
  fi
}

_pb_redraw() {
  [ "$PB_INITED" = "1" ] || return 0
  [ "$PB_TTY" = "1" ] || return 0
  _pb_silent && return 0

  (
    flock -x 9 2>/dev/null || true

    # Header
    if [ -n "$PB_HEADER" ]; then
      local lineno=1
      while IFS= read -r hline; do
        tput cup $((lineno - 1)) 0 2>/dev/null || true
        tput el 2>/dev/null || true
        printf '%s' "$hline"
        lineno=$((lineno + 1))
      done <<< "$PB_HEADER"
    fi

    # Bars
    local i id row
    for ((i = 0; i < ${#PB_IDS[@]}; i++)); do
      id="${PB_IDS[$i]}"
      row=$(( PB_BARS_ROW + PB_ROW_AT[$i] - 1 ))
      tput cup "$row" 0 2>/dev/null || true
      tput el 2>/dev/null || true
      _pb_format_line "$id"
    done
  ) 9>"$PB_LOCK"
}

# ── CPU / Load bars (header glyphs) ────────────────────────────────────────

pb_render_cpu_bar() {
  # pb_render_cpu_bar <active> <throttled> <total>
  local active=$1 throttled=$2 total=$3
  local i out="["
  for ((i = 0; i < total; i++)); do
    if [ "$i" -lt "$active" ]; then
      out+="$(_pb_c green '█')"
    elif [ "$i" -lt $((active + throttled)) ]; then
      out+="$(_pb_c yellow '▓')"
    else
      out+="$(_pb_c gray '░')"
    fi
  done
  out+="] $active/$total active"
  printf '%s' "$out"
}

pb_render_load_bar() {
  # pb_render_load_bar <load> <total>   (load may be float)
  local load=$1 total=$2
  # Integer share: filled = int(load * total / total)
  local load_int
  load_int=$(awk -v l="$load" 'BEGIN{printf "%d", l+0.5}')
  local filled=$load_int
  if [ "$filled" -gt "$total" ]; then filled=$total; fi
  local i out="["
  local color="green"
  if awk -v l="$load" -v t="$total" 'BEGIN{exit !(l>t)}'; then
    color="red"
  fi
  for ((i = 0; i < total; i++)); do
    if [ "$i" -lt "$filled" ]; then
      out+="$(_pb_c "$color" '█')"
    else
      out+="$(_pb_c gray '░')"
    fi
  done
  out+="] $load/$total"
  printf '%s' "$out"
}
