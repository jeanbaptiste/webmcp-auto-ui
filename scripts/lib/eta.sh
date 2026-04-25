#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# eta.sh — Dynamic ETA estimation library (sourced, not executed)
#
# Maintains a rolling history of stage durations on disk and combines it with
# live system signals (loadavg, free RAM, ping) to predict how long a step is
# likely to take. Bash 4+, macOS + Linux compatible.
#
# Usage:
#   source scripts/lib/eta.sh
#   eta_init
#   start=$(date +%s)
#   ... do work ...
#   eta_record "deploy.viewer.build" $(( $(date +%s) - start ))
#   eta_save
#
# All math goes through `awk` because bash has no float arithmetic.
#
# Storage format (timings.json):
#   {
#     "stage.name": { "samples": [42, 38, 45], "outliers": [120] }
#   }
# Outliers (>2× median, computed at record time with ≥3 prior samples) are
# stored separately for audit but excluded from median/p95/stddev statistics.
# Legacy format (bare array) is read transparently and re-emitted in the new
# shape on the next eta_save.
# ─────────────────────────────────────────────────────────────────────────────

# Bash version detection. Bash 4+ is preferred (associative arrays). On
# bash 3.2 (default macOS) we fall back to a parallel-array shim with the
# same public API.
ETA_HAS_ASSOC=0
if [ -n "${BASH_VERSINFO:-}" ] && [ "${BASH_VERSINFO[0]}" -ge 4 ]; then
  ETA_HAS_ASSOC=1
fi

# Force C locale for awk math: avoids "1,23" decimal output on fr_FR locales.
export LC_ALL="${LC_ALL:-C}"
export LC_NUMERIC=C

ETA_CACHE_DIR="${ETA_CACHE_DIR:-/Users/m3/Desktop/TMP/webmcp-auto-ui/.deploy-cache}"
ETA_CACHE_FILE="${ETA_CACHE_FILE:-$ETA_CACHE_DIR/timings.json}"
ETA_HISTORY_MAX=20
ETA_OS="$(uname -s)"
ETA_UNRELIABLE=0

if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
  declare -A ETA_HISTORY
  declare -A ETA_OUTLIERS
  declare -A _ETA_PING_CACHE
else
  # Parallel arrays. _ETA_HKEYS[i] -> key, _ETA_HVALS[i] -> "v1 v2 v3"
  _ETA_HKEYS=()
  _ETA_HVALS=()
  _ETA_OKEYS=()
  _ETA_OVALS=()
  _ETA_PKEYS=()
  _ETA_PVALS=()
fi
_ETA_LOADAVG_CACHE=""
_ETA_MEMFREE_CACHE=""
_ETA_CORES=""
_ETA_HAS_JQ=0

# Shim helpers. _eta_h_get/set act like ETA_HISTORY[key]; _eta_p_get/set for
# the ping cache. On bash 4+ they delegate to associative arrays.
_eta_h_get() {
  local key="$1"
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval "printf '%s' \"\${ETA_HISTORY[\$key]:-}\""
  else
    local i
    for ((i = 0; i < ${#_ETA_HKEYS[@]}; i++)); do
      if [ "${_ETA_HKEYS[$i]}" = "$key" ]; then
        printf '%s' "${_ETA_HVALS[$i]}"
        return 0
      fi
    done
  fi
}
_eta_h_set() {
  local key="$1" val="$2"
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval "ETA_HISTORY[\$key]=\"\$val\""
  else
    local i
    for ((i = 0; i < ${#_ETA_HKEYS[@]}; i++)); do
      if [ "${_ETA_HKEYS[$i]}" = "$key" ]; then
        _ETA_HVALS[$i]="$val"
        return 0
      fi
    done
    _ETA_HKEYS+=("$key")
    _ETA_HVALS+=("$val")
  fi
}
_eta_h_keys() {
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval 'printf "%s\n" "${!ETA_HISTORY[@]}"'
  else
    local k
    for k in "${_ETA_HKEYS[@]}"; do printf "%s\n" "$k"; done
  fi
}
_eta_h_clear() {
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval 'ETA_HISTORY=()'
    eval 'ETA_OUTLIERS=()'
  else
    _ETA_HKEYS=()
    _ETA_HVALS=()
    _ETA_OKEYS=()
    _ETA_OVALS=()
  fi
}
# Outlier accessors (separate map keyed by stage).
_eta_o_get() {
  local key="$1"
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval "printf '%s' \"\${ETA_OUTLIERS[\$key]:-}\""
  else
    local i
    for ((i = 0; i < ${#_ETA_OKEYS[@]}; i++)); do
      if [ "${_ETA_OKEYS[$i]}" = "$key" ]; then
        printf '%s' "${_ETA_OVALS[$i]}"
        return 0
      fi
    done
  fi
}
_eta_o_set() {
  local key="$1" val="$2"
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval "ETA_OUTLIERS[\$key]=\"\$val\""
  else
    local i
    for ((i = 0; i < ${#_ETA_OKEYS[@]}; i++)); do
      if [ "${_ETA_OKEYS[$i]}" = "$key" ]; then
        _ETA_OVALS[$i]="$val"
        return 0
      fi
    done
    _ETA_OKEYS+=("$key")
    _ETA_OVALS+=("$val")
  fi
}
_eta_p_get() {
  local key="$1"
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval "printf '%s' \"\${_ETA_PING_CACHE[\$key]:-}\""
  else
    local i
    for ((i = 0; i < ${#_ETA_PKEYS[@]}; i++)); do
      if [ "${_ETA_PKEYS[$i]}" = "$key" ]; then
        printf '%s' "${_ETA_PVALS[$i]}"
        return 0
      fi
    done
  fi
}
_eta_p_set() {
  local key="$1" val="$2"
  if [ "$ETA_HAS_ASSOC" -eq 1 ]; then
    eval "_ETA_PING_CACHE[\$key]=\"\$val\""
  else
    local i
    for ((i = 0; i < ${#_ETA_PKEYS[@]}; i++)); do
      if [ "${_ETA_PKEYS[$i]}" = "$key" ]; then
        _ETA_PVALS[$i]="$val"
        return 0
      fi
    done
    _ETA_PKEYS+=("$key")
    _ETA_PVALS+=("$val")
  fi
}

# Default per-stage values when no history exists. Pattern matches use simple
# wildcard expansion (deploy.*.build). Wildcard fallback at the end is 30s.
_eta_default_for() {
  local stage="$1"
  case "$stage" in
    deploy.*.clean)       echo 3 ;;
    deploy.*.build)       echo 60 ;;
    deploy.*.upload)      echo 20 ;;
    deploy.*.restart)     echo 5 ;;
    deploy.*.healthcheck) echo 3 ;;
    batch.lint)           echo 10 ;;
    batch.test)           echo 30 ;;
    batch.build_packages) echo 90 ;;
    batch.publish)        echo 60 ;;
    batch.deploy)         echo 120 ;;
    *)                    echo 30 ;;
  esac
}

# ─── jq detection ────────────────────────────────────────────────────────────
if command -v jq >/dev/null 2>&1; then
  _ETA_HAS_JQ=1
else
  echo "eta.sh: jq not found, using fallback parser (slower)" >&2
fi

# ─── eta_init ────────────────────────────────────────────────────────────────
# Create cache dir, load history into ETA_HISTORY/ETA_OUTLIERS. Tolerates both
# the new {samples,outliers} object format and the legacy bare-array format.
eta_init() {
  mkdir -p "$ETA_CACHE_DIR"
  _eta_h_clear
  if [ ! -f "$ETA_CACHE_FILE" ]; then
    echo '{}' > "$ETA_CACHE_FILE"
    return 0
  fi
  local key vals outs
  if [ "$_ETA_HAS_JQ" -eq 1 ]; then
    # For each entry: emit "key<TAB>samples<TAB>outliers".
    # If the value is a bare array (legacy), treat it as samples and outliers=[].
    while IFS=$'\t' read -r key vals outs; do
      [ -z "$key" ] && continue
      _eta_h_set "$key" "$vals"
      [ -n "$outs" ] && _eta_o_set "$key" "$outs"
    done < <(jq -r '
      to_entries[] |
      if (.value | type) == "array" then
        "\(.key)\t\(.value | join(" "))\t"
      else
        "\(.key)\t\((.value.samples // []) | join(" "))\t\((.value.outliers // []) | join(" "))"
      end
    ' "$ETA_CACHE_FILE" 2>/dev/null)
    return 0
  else
    # Fallback awk parser. Detects either:
    #   "key": [ ... ]                                (legacy)
    #   "key": { "samples": [...], "outliers": [...] } (new)
    # Emits "key\tsamples\toutliers" on stdout.
    while IFS=$'\t' read -r key vals outs; do
      [ -z "$key" ] && continue
      _eta_h_set "$key" "$vals"
      [ -n "$outs" ] && _eta_o_set "$key" "$outs"
    done < <(awk '
      function arr_to_space(s,    t) {
        t = s;
        gsub(/,/, " ", t);
        gsub(/[[:space:]]+/, " ", t);
        sub(/^ /, "", t); sub(/ $/, "", t);
        return t;
      }
      {
        line = $0;
        # Match either object form or legacy array form.
        # Object: "key": { ... "samples": [..], "outliers": [..] ... }
        while (match(line, /"[^"]+"[[:space:]]*:[[:space:]]*\{[^}]*\}/)) {
          chunk = substr(line, RSTART, RLENGTH);
          line  = substr(line, RSTART + RLENGTH);
          kstart = index(chunk, "\"") + 1;
          rest   = substr(chunk, kstart);
          kend   = index(rest, "\"");
          k = substr(rest, 1, kend - 1);
          samples = ""; outliers = "";
          if (match(chunk, /"samples"[[:space:]]*:[[:space:]]*\[[^]]*\]/)) {
            seg = substr(chunk, RSTART, RLENGTH);
            si = index(seg, "["); ei = index(seg, "]");
            samples = arr_to_space(substr(seg, si + 1, ei - si - 1));
          }
          if (match(chunk, /"outliers"[[:space:]]*:[[:space:]]*\[[^]]*\]/)) {
            seg = substr(chunk, RSTART, RLENGTH);
            si = index(seg, "["); ei = index(seg, "]");
            outliers = arr_to_space(substr(seg, si + 1, ei - si - 1));
          }
          print k "\t" samples "\t" outliers;
        }
        # Legacy: "key": [ ... ]
        while (match(line, /"[^"]+"[[:space:]]*:[[:space:]]*\[[^]]*\]/)) {
          chunk = substr(line, RSTART, RLENGTH);
          line  = substr(line, RSTART + RLENGTH);
          kstart = index(chunk, "\"") + 1;
          rest   = substr(chunk, kstart);
          kend   = index(rest, "\"");
          k = substr(rest, 1, kend - 1);
          si = index(chunk, "["); ei = index(chunk, "]");
          v = arr_to_space(substr(chunk, si + 1, ei - si - 1));
          print k "\t" v "\t";
        }
      }' "$ETA_CACHE_FILE")
    return 0
  fi
}

# ─── eta_cores ───────────────────────────────────────────────────────────────
eta_cores() {
  if [ -n "$_ETA_CORES" ]; then
    echo "$_ETA_CORES"
    return 0
  fi
  local n=""
  case "$ETA_OS" in
    Darwin) n=$(sysctl -n hw.ncpu 2>/dev/null) ;;
    Linux)  n=$(nproc 2>/dev/null) ;;
  esac
  [ -z "$n" ] && n=4
  _ETA_CORES="$n"
  echo "$n"
}

# ─── eta_loadavg ─────────────────────────────────────────────────────────────
# 1-minute load average. 5s memo cache.
eta_loadavg() {
  local now epoch val
  now=$(date +%s)
  if [ -n "$_ETA_LOADAVG_CACHE" ]; then
    epoch="${_ETA_LOADAVG_CACHE%%:*}"
    val="${_ETA_LOADAVG_CACHE#*:}"
    if [ $((now - epoch)) -lt 5 ]; then
      echo "$val"
      return 0
    fi
  fi
  local load=""
  case "$ETA_OS" in
    Darwin)
      # vm.loadavg = "{ 1.23 1.10 0.95 }"
      load=$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}')
      ;;
    Linux)
      load=$(cut -d' ' -f1 /proc/loadavg 2>/dev/null)
      ;;
  esac
  [ -z "$load" ] && load="1.0"
  _ETA_LOADAVG_CACHE="$now:$load"
  echo "$load"
}

# ─── eta_mem_free_mb ─────────────────────────────────────────────────────────
# Free + inactive memory in MB. 5s memo cache.
eta_mem_free_mb() {
  local now epoch val
  now=$(date +%s)
  if [ -n "$_ETA_MEMFREE_CACHE" ]; then
    epoch="${_ETA_MEMFREE_CACHE%%:*}"
    val="${_ETA_MEMFREE_CACHE#*:}"
    if [ $((now - epoch)) -lt 5 ]; then
      echo "$val"
      return 0
    fi
  fi
  local mb=0
  case "$ETA_OS" in
    Darwin)
      # Page size + (free + inactive) pages. vm_stat reports pages with a
      # trailing dot we strip.
      local page_size free_pages inactive_pages
      page_size=$(vm_stat 2>/dev/null | awk '/page size of/ {print $8; exit}')
      [ -z "$page_size" ] && page_size=4096
      free_pages=$(vm_stat 2>/dev/null | awk '/Pages free/ {gsub(/\./,""); print $3; exit}')
      inactive_pages=$(vm_stat 2>/dev/null | awk '/Pages inactive/ {gsub(/\./,""); print $3; exit}')
      [ -z "$free_pages" ] && free_pages=0
      [ -z "$inactive_pages" ] && inactive_pages=0
      mb=$(awk -v fp="$free_pages" -v ip="$inactive_pages" -v ps="$page_size" \
        'BEGIN { printf "%d", (fp + ip) * ps / 1024 / 1024 }')
      ;;
    Linux)
      mb=$(free -m 2>/dev/null | awk '/^Mem:/ {print $7}')
      [ -z "$mb" ] && mb=0
      ;;
  esac
  _ETA_MEMFREE_CACHE="$now:$mb"
  echo "$mb"
}

# ─── eta_ping_ms <host> ──────────────────────────────────────────────────────
# Median of 3 pings, 5min cache per host. 999 on failure.
eta_ping_ms() {
  local host="$1"
  [ -z "$host" ] && { echo 999; return 0; }
  local now epoch val cached
  now=$(date +%s)
  cached=$(_eta_p_get "$host")
  if [ -n "$cached" ]; then
    epoch="${cached%%:*}"
    val="${cached#*:}"
    if [ $((now - epoch)) -lt 300 ]; then
      echo "$val"
      return 0
    fi
  fi
  local out median
  out=$(ping -c 3 -W 1 "$host" 2>/dev/null) || { _eta_p_set "$host" "$now:999"; echo 999; return 0; }
  # Extract individual time= values, sort, take middle.
  median=$(echo "$out" | awk -F'time=' '/time=/ {print $2}' | awk '{print $1}' | sort -n | awk '
    { a[NR]=$1 }
    END { if (NR==0) print 999; else print a[int((NR+1)/2)] }
  ')
  [ -z "$median" ] && median=999
  _eta_p_set "$host" "$now:$median"
  echo "$median"
}

# ─── eta_load_factor ─────────────────────────────────────────────────────────
# max(1.0, loadavg / cores), * 1.3 if RAM < 1024 MB.
eta_load_factor() {
  local load cores mem
  load=$(eta_loadavg)
  cores=$(eta_cores)
  mem=$(eta_mem_free_mb)
  awk -v load="$load" -v cores="$cores" -v mem="$mem" 'BEGIN {
    f = load / cores;
    if (f < 1.0) f = 1.0;
    if (mem < 1024) f = f * 1.3;
    printf "%.3f", f;
  }'
}

# ─── eta_check_load [label] ──────────────────────────────────────────────────
# Inspects current loadavg vs cores and emits a stderr warning if pressure is
# elevated. Never blocks. Return code:
#   0 — load ≤ 2× cores  (healthy)
#   1 — 2× < load ≤ 4× cores  (warning: degraded)
#   2 — load > 4× cores  (strong warning: consider waiting)
eta_check_load() {
  local label="${1:-localhost}"
  local load cores
  load=$(eta_loadavg)
  cores=$(eta_cores)
  local level
  level=$(awk -v l="$load" -v c="$cores" 'BEGIN {
    if (c <= 0) c = 1;
    r = l / c;
    if (r > 4.0) print 2;
    else if (r > 2.0) print 1;
    else print 0;
  }')
  local color_on="" color_off=""
  if [ -t 2 ]; then
    color_off=$'\033[0m'
  fi
  case "$level" in
    1)
      [ -t 2 ] && color_on=$'\033[33m'  # yellow
      printf '%seta.sh[%s]: Warning: load average %s exceeds 2x cores (%s) - performance may be degraded%s\n' \
        "$color_on" "$label" "$load" "$cores" "$color_off" >&2
      return 1
      ;;
    2)
      [ -t 2 ] && color_on=$'\033[1;33m' # bright yellow
      printf '%seta.sh[%s]: Warning: load average %s exceeds 4x cores (%s) - consider waiting for load to drop%s\n' \
        "$color_on" "$label" "$load" "$cores" "$color_off" >&2
      return 2
      ;;
    *)
      return 0
      ;;
  esac
}

# ─── _eta_median <space-separated-list> ──────────────────────────────────────
_eta_median() {
  awk '{
    n = split($0, a, " ");
    if (n == 0) { print 0; exit }
    # insertion sort, n is small (<=20)
    for (i = 2; i <= n; i++) {
      k = a[i]; j = i - 1;
      while (j > 0 && a[j] > k) { a[j+1] = a[j]; j-- }
      a[j+1] = k;
    }
    if (n % 2) printf "%.2f", a[(n+1)/2];
    else       printf "%.2f", (a[n/2] + a[n/2+1]) / 2;
  }' <<< "$1"
}

# Count whitespace-separated tokens.
_eta_count() { awk '{print NF}' <<< "$1"; }

# ─── eta_estimate <stage> ────────────────────────────────────────────────────
# Returns predicted seconds (integer). Sets ETA_UNRELIABLE=1 if no history.
# Uses normal samples only (outliers are excluded).
eta_estimate() {
  local stage="$1"
  local hist
  hist=$(_eta_h_get "$stage")
  ETA_UNRELIABLE=0
  local base
  if [ -z "$hist" ]; then
    base=$(_eta_default_for "$stage")
    ETA_UNRELIABLE=1
  else
    base=$(_eta_median "$hist")
  fi
  # Persist the unreliable flag to disk so callers that capture stdout via
  # $(eta_estimate ...) can still read the flag from the parent shell.
  echo "$ETA_UNRELIABLE" > "$ETA_CACHE_DIR/.last_unreliable" 2>/dev/null || true
  local factor result
  factor=$(eta_load_factor)
  result=$(awk -v b="$base" -v f="$factor" 'BEGIN { printf "%d", b * f + 0.5 }')
  echo "$result"
}

# Read the unreliable flag from the last eta_estimate call. Useful when the
# main eta_estimate was captured in a $(...) subshell.
eta_last_unreliable() {
  local f="$ETA_CACHE_DIR/.last_unreliable"
  if [ -f "$f" ]; then
    cat "$f"
  else
    echo 0
  fi
}

# ─── eta_record <stage> <duration_s> ─────────────────────────────────────────
# Append duration. Outlier (>2× current median, with ≥3 prior samples) is
# routed to the outliers list and excluded from the running median; a stderr
# warning is emitted. Otherwise the value joins samples with FIFO trim.
eta_record() {
  local stage="$1" duration="$2"
  [ -z "$stage" ] || [ -z "$duration" ] && return 1
  local hist count
  hist=$(_eta_h_get "$stage")
  count=$(_eta_count "$hist")
  if [ -n "$hist" ] && [ "$count" -ge 3 ]; then
    local median is_outlier
    median=$(_eta_median "$hist")
    is_outlier=$(awk -v d="$duration" -v m="$median" 'BEGIN {
      if (m > 0 && d > 2 * m) print 1; else print 0;
    }')
    if [ "$is_outlier" = "1" ]; then
      echo "eta.sh: outlier detected for '$stage': ${duration}s vs median ${median}s (excluded from samples)" >&2
      local outs
      outs=$(_eta_o_get "$stage")
      outs="${outs:+$outs }$duration"
      # Trim outliers list to ETA_HISTORY_MAX too, FIFO.
      local ocount
      ocount=$(_eta_count "$outs")
      if [ "$ocount" -gt "$ETA_HISTORY_MAX" ]; then
        local odrop=$((ocount - ETA_HISTORY_MAX))
        outs=$(awk -v d="$odrop" '{ for (i=d+1;i<=NF;i++) printf "%s%s", $i, (i==NF?"":" ") }' <<< "$outs")
      fi
      _eta_o_set "$stage" "$outs"
      return 0
    fi
  fi
  # Append + FIFO trim to ETA_HISTORY_MAX.
  hist="${hist:+$hist }$duration"
  count=$(_eta_count "$hist")
  if [ "$count" -gt "$ETA_HISTORY_MAX" ]; then
    local drop=$((count - ETA_HISTORY_MAX))
    hist=$(awk -v d="$drop" '{ for (i=d+1;i<=NF;i++) printf "%s%s", $i, (i==NF?"":" ") }' <<< "$hist")
  fi
  _eta_h_set "$stage" "$hist"
}

# ─── eta_save ────────────────────────────────────────────────────────────────
# Flush ETA_HISTORY/ETA_OUTLIERS to JSON in {samples,outliers} object form.
eta_save() {
  mkdir -p "$ETA_CACHE_DIR"
  local tmp="$ETA_CACHE_FILE.tmp"
  local key vals outs samples_arr outliers_arr
  if [ "$_ETA_HAS_JQ" -eq 1 ]; then
    local jq_input='{}'
    while IFS= read -r key; do
      [ -z "$key" ] && continue
      vals=$(_eta_h_get "$key")
      outs=$(_eta_o_get "$key")
      samples_arr=$(awk '{
        printf "[";
        for (i=1;i<=NF;i++) printf "%s%s", $i, (i==NF?"":",");
        printf "]";
      }' <<< "$vals")
      outliers_arr=$(awk '{
        printf "[";
        for (i=1;i<=NF;i++) printf "%s%s", $i, (i==NF?"":",");
        printf "]";
      }' <<< "$outs")
      jq_input=$(jq \
        --arg k "$key" \
        --argjson s "$samples_arr" \
        --argjson o "$outliers_arr" \
        '. + {($k): {samples: $s, outliers: $o}}' <<< "$jq_input")
    done < <(_eta_h_keys)
    echo "$jq_input" | jq '.' > "$tmp"
  else
    {
      echo '{'
      local first=1
      while IFS= read -r key; do
        [ -z "$key" ] && continue
        vals=$(_eta_h_get "$key")
        outs=$(_eta_o_get "$key")
        samples_arr=$(awk '{
          printf "[";
          for (i=1;i<=NF;i++) printf "%s%s", $i, (i==NF?"":", ");
          printf "]";
        }' <<< "$vals")
        outliers_arr=$(awk '{
          printf "[";
          for (i=1;i<=NF;i++) printf "%s%s", $i, (i==NF?"":", ");
          printf "]";
        }' <<< "$outs")
        if [ "$first" -eq 1 ]; then first=0; else echo ','; fi
        printf '  "%s": { "samples": %s, "outliers": %s }' "$key" "$samples_arr" "$outliers_arr"
      done < <(_eta_h_keys)
      echo
      echo '}'
    } > "$tmp"
  fi
  mv "$tmp" "$ETA_CACHE_FILE"
  return 0
}

# ─── eta_active_workers ──────────────────────────────────────────────────────
eta_active_workers() {
  jobs -r 2>/dev/null | wc -l | awk '{print $1}'
}

# ─── eta_format_duration <seconds> ───────────────────────────────────────────
eta_format_duration() {
  local s="${1:-0}"
  awk -v s="$s" 'BEGIN {
    s = int(s);
    if (s < 60) { printf "%ds", s; exit }
    if (s < 3600) {
      m = int(s/60); rs = s % 60;
      printf "%dm%02ds", m, rs; exit
    }
    h = int(s/3600); rem = s % 3600; m = int(rem/60);
    printf "%dh%02dm", h, m;
  }'
}

# ─── eta_stats ───────────────────────────────────────────────────────────────
# Pretty dump: stage  count  outliers  median  p95  stddev  (samples only)
eta_stats() {
  printf "%-32s %6s %8s %8s %8s %8s\n" "STAGE" "COUNT" "OUTLIER" "MEDIAN" "P95" "STDDEV"
  local key vals outs ocount
  while IFS= read -r key; do
    [ -z "$key" ] && continue
    vals=$(_eta_h_get "$key")
    outs=$(_eta_o_get "$key")
    ocount=$(_eta_count "$outs")
    awk -v k="$key" -v oc="$ocount" '{
      n = split($0, a, " ");
      if (n == 0) { printf "%-32s %6d %8d\n", k, 0, oc; exit }
      for (i = 2; i <= n; i++) {
        x = a[i]; j = i - 1;
        while (j > 0 && a[j] > x) { a[j+1] = a[j]; j-- }
        a[j+1] = x;
      }
      median = (n%2) ? a[(n+1)/2] : (a[n/2] + a[n/2+1]) / 2;
      p95idx = int(0.95 * n + 0.5);
      if (p95idx < 1) p95idx = 1;
      if (p95idx > n) p95idx = n;
      p95 = a[p95idx];
      sum = 0; for (i=1;i<=n;i++) sum += a[i];
      mean = sum / n;
      ss = 0; for (i=1;i<=n;i++) ss += (a[i]-mean)^2;
      stddev = (n>1) ? sqrt(ss/(n-1)) : 0;
      printf "%-32s %6d %8d %8.2f %8.2f %8.2f\n", k, n, oc, median, p95, stddev;
    }' <<< "$vals"
  done < <(_eta_h_keys)
  return 0
}

# ─── eta_reset_cache ─────────────────────────────────────────────────────────
eta_reset_cache() {
  rm -f "$ETA_CACHE_FILE"
  _eta_h_clear
}
