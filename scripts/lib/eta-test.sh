#!/usr/bin/env bash
# eta-test.sh — standalone tests for eta.sh
set +e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/eta.sh"

PASS=0
FAIL=0
RESULTS=()

_assert() {
  local name="$1" cond="$2" detail="${3:-}"
  if [ "$cond" -eq 0 ]; then
    PASS=$((PASS+1))
    RESULTS+=("PASS  $name")
  else
    FAIL=$((FAIL+1))
    RESULTS+=("FAIL  $name  $detail")
  fi
}

# ─── Backup existing cache ───────────────────────────────────────────────────
BACKUP=""
if [ -f "$ETA_CACHE_FILE" ]; then
  BACKUP="$ETA_CACHE_FILE.bak.$$"
  cp "$ETA_CACHE_FILE" "$BACKUP"
fi
restore_cache() {
  if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
    mv "$BACKUP" "$ETA_CACHE_FILE"
  else
    rm -f "$ETA_CACHE_FILE"
  fi
}
trap restore_cache EXIT

# ─── 1. reset + init ─────────────────────────────────────────────────────────
eta_reset_cache
eta_init
[ -d "$ETA_CACHE_DIR" ]; _assert "init: cache dir exists" $?

# ─── 2. record + estimate (median ~11) ───────────────────────────────────────
for v in 10 12 11 10 12 11 10 12 11 11 12 10 11 11 11; do
  eta_record "test.stage" "$v"
done
EST=$(eta_estimate "test.stage")
# Estimate = median * load_factor, load_factor >= 1.0, so EST >= 11.
# Allow up to 25 (loaded mac) — we just want it in a reasonable range.
if [ "$EST" -ge 10 ] && [ "$EST" -le 25 ]; then
  _assert "estimate within range (~11, got $EST)" 0
else
  _assert "estimate within range" 1 "got $EST, expected 10..25"
fi

# ─── 3. outlier detection (warning on stderr, median stays stable) ───────────
OUT_ERR=$(eta_record "test.stage" 100 2>&1 >/dev/null)
echo "$OUT_ERR" | grep -q "outlier"; _assert "outlier warning printed" $? "stderr was: $OUT_ERR"

# Median remains close to 11 because the outlier is now excluded from samples.
EST2=$(eta_estimate "test.stage")
if [ "$EST2" -ge 10 ] && [ "$EST2" -le 30 ]; then
  _assert "median stable after outlier (got $EST2)" 0
else
  _assert "median stable after outlier" 1 "got $EST2"
fi

# ─── 4. default value + ETA_UNRELIABLE ───────────────────────────────────────
EST3=$(eta_estimate "deploy.flex.build")
RELY=$(eta_last_unreliable)
if [ "$EST3" -ge 55 ] && [ "$EST3" -le 300 ] && [ "$RELY" -eq 1 ]; then
  _assert "default ~60 + ETA_UNRELIABLE=1 (got $EST3, unreliable=$RELY)" 0
else
  _assert "default ~60 + ETA_UNRELIABLE=1" 1 "got $EST3, unreliable=$RELY"
fi

# ─── 5. format_duration ──────────────────────────────────────────────────────
[ "$(eta_format_duration 42)" = "42s" ];     _assert "format 42s"   $?
[ "$(eta_format_duration 83)" = "1m23s" ];   _assert "format 1m23s" $? "got $(eta_format_duration 83)"
[ "$(eta_format_duration 8100)" = "2h15m" ]; _assert "format 2h15m" $? "got $(eta_format_duration 8100)"

# ─── 6. cores / loadavg / memfree are numeric ────────────────────────────────
CORES=$(eta_cores)
LOAD=$(eta_loadavg)
MEM=$(eta_mem_free_mb)
echo "$CORES" | grep -Eq '^[0-9]+$';                   _assert "cores numeric ($CORES)" $?
echo "$LOAD"  | grep -Eq '^[0-9]+(\.[0-9]+)?$';        _assert "loadavg numeric ($LOAD)" $?
echo "$MEM"   | grep -Eq '^[0-9]+$';                   _assert "memfree numeric ($MEM MB)" $?

# ─── 7. save + reload roundtrip ──────────────────────────────────────────────
eta_save
[ -f "$ETA_CACHE_FILE" ]; _assert "save: cache file written" $?
# Clear in-memory history then reload from disk.
_eta_h_clear
eta_init
RELOADED=$(_eta_h_get "test.stage")
[ -n "$RELOADED" ]; _assert "reload: test.stage present ($RELOADED)" $?

# ─── 8. eta_stats output ─────────────────────────────────────────────────────
echo
echo "── eta_stats dump ──"
eta_stats
echo "────────────────────"

# ─── 11. outlier filter — excluded from median, surfaced in stats ────────────
eta_reset_cache
eta_init
for v in 10 10 10 10 10; do
  eta_record "outlier.test" "$v"
done
MED_BEFORE=$(_eta_median "$(_eta_h_get "outlier.test")")
# Inject an outlier (>2× median). Redirect stderr to a tempfile so the side
# effect (outliers list mutation) happens in the current shell.
ERR11_FILE="$ETA_CACHE_DIR/.test11_err"
eta_record "outlier.test" 100 2>"$ERR11_FILE"
OUT_ERR11=$(cat "$ERR11_FILE")
rm -f "$ERR11_FILE"
echo "$OUT_ERR11" | grep -q "outlier"; _assert "test11: outlier warning emitted" $? "stderr was: $OUT_ERR11"
SAMPLES_AFTER=$(_eta_h_get "outlier.test")
OUTLIERS_AFTER=$(_eta_o_get "outlier.test")
SCNT=$(awk '{print NF}' <<< "$SAMPLES_AFTER")
OCNT=$(awk '{print NF}' <<< "$OUTLIERS_AFTER")
[ "$SCNT" -eq 5 ]; _assert "test11: samples count unchanged at 5 (got $SCNT)" $?
[ "$OCNT" -eq 1 ]; _assert "test11: outliers count = 1 (got $OCNT)" $?
MED_AFTER=$(_eta_median "$SAMPLES_AFTER")
# Median must remain ~10 (not pulled toward 100).
echo "$MED_AFTER" | awk '{exit !($1 >= 9 && $1 <= 11)}'
_assert "test11: median stable ~10 (before=$MED_BEFORE after=$MED_AFTER)" $?
STATS_OUT=$(eta_stats | grep "outlier.test")
echo "$STATS_OUT" | awk '{exit !($2 == 5 && $3 == 1)}'
_assert "test11: eta_stats reports count=5, outliers=1 ($STATS_OUT)" $?

# Roundtrip — save/reload preserves both samples and outliers.
eta_save
_eta_h_clear
eta_init
RS=$(_eta_h_get "outlier.test")
RO=$(_eta_o_get "outlier.test")
RSCNT=$(awk '{print NF}' <<< "$RS")
ROCNT=$(awk '{print NF}' <<< "$RO")
[ "$RSCNT" -eq 5 ] && [ "$ROCNT" -eq 1 ]
_assert "test11: roundtrip preserves samples=$RSCNT outliers=$ROCNT" $?

# ─── 12. eta_check_load — return code in {0,1,2}, stderr matches level ───────
LOAD_ERR=$(eta_check_load "test-host" 2>&1 >/dev/null)
LOAD_RC=$?
case "$LOAD_RC" in
  0|1|2) _assert "test12: eta_check_load rc in {0,1,2} (got $LOAD_RC)" 0 ;;
  *)     _assert "test12: eta_check_load rc in {0,1,2}" 1 "got $LOAD_RC" ;;
esac
if [ "$LOAD_RC" -eq 0 ]; then
  [ -z "$LOAD_ERR" ]; _assert "test12: rc=0 -> stderr silent" $? "stderr was: $LOAD_ERR"
else
  echo "$LOAD_ERR" | grep -qi "warning"; _assert "test12: rc>0 -> stderr has warning" $? "stderr was: $LOAD_ERR"
fi

# ─── 13. legacy format compat — bare array reads as samples ──────────────────
eta_reset_cache
cat > "$ETA_CACHE_FILE" <<'EOF'
{
  "legacy.stage": [5, 6, 7, 8, 9]
}
EOF
eta_init
LEG=$(_eta_h_get "legacy.stage")
LEG_OUT=$(_eta_o_get "legacy.stage")
LEGCNT=$(awk '{print NF}' <<< "$LEG")
LEG_OCNT=$(awk '{print NF}' <<< "$LEG_OUT")
[ "$LEGCNT" -eq 5 ] && [ "$LEG_OCNT" -eq 0 ]
_assert "test13: legacy bare-array read as samples=$LEGCNT outliers=$LEG_OCNT" $?

# ─── Report ──────────────────────────────────────────────────────────────────
echo
for line in "${RESULTS[@]}"; do
  echo "$line"
done
echo
echo "Total: $PASS passed, $FAIL failed."

if [ "$FAIL" -eq 0 ]; then
  exit 0
else
  exit 1
fi
