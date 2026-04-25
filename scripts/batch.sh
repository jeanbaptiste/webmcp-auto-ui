#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# batch.sh — Full release pipeline: commit + deploy + push + bump + push
#
# Usage:
#   ./scripts/batch.sh                    # full pipeline
#   ./scripts/batch.sh --no-deploy        # skip deploy
#   ./scripts/batch.sh --no-bump          # skip version bump
#   ./scripts/batch.sh --no-tag           # skip npm publish tag
#   ./scripts/batch.sh --no-docs          # skip docs update
#   ./scripts/batch.sh --message "msg"    # custom commit message
#   ./scripts/batch.sh --dry-run          # show what would be done
#   ./scripts/batch.sh --no-progress      # disable progress bars
#   ./scripts/batch.sh --json             # JSON events on stderr
#   ./scripts/batch.sh --quiet            # silent (errors only)
#   ./scripts/batch.sh --stats            # dump timings cache and exit
#   ./scripts/batch.sh --reset-cache      # reset ETA cache and exit
#
# Combines: commit → docs → deploy → push → bump → push → tag
# ─────────────────────────────────────────────────────────────────────────────

LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Source instrumentation libs ──────────────────────────────────────────────

# shellcheck disable=SC1091
source "$LOCAL_ROOT/scripts/lib/progress.sh"
# shellcheck disable=SC1091
source "$LOCAL_ROOT/scripts/lib/eta.sh"

# ── Colors ──────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; }
skip() { echo -e "  ${YELLOW}⊘${NC} $* ${YELLOW}(skipped)${NC}"; }
info() { echo -e "  ${CYAN}→${NC} $*"; }

# ── Parse flags ─────────────────────────────────────────────────────────────

DRY_RUN=0
NO_DEPLOY=0
NO_BUMP=0
NO_TAG=0
NO_DOCS=0
COMMIT_MSG=""
SHOW_STATS=0
RESET_CACHE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)     DRY_RUN=1 ;;
    --no-deploy)   NO_DEPLOY=1 ;;
    --no-bump)     NO_BUMP=1 ;;
    --no-tag)      NO_TAG=1 ;;
    --no-docs)     NO_DOCS=1 ;;
    --no-progress) export PB_NO_PROGRESS=1 ;;
    --json)        export PB_JSON=1 ;;
    --quiet)       export PB_NO_PROGRESS=1 ;;
    --stats)       SHOW_STATS=1 ;;
    --reset-cache) RESET_CACHE=1 ;;
    --message)
      shift
      COMMIT_MSG="$1"
      ;;
    -m)
      shift
      COMMIT_MSG="$1"
      ;;
    *)
      echo "Unknown flag: $1"
      echo "Usage: ./scripts/batch.sh [--no-deploy] [--no-bump] [--no-docs] [--message \"msg\"] [--dry-run]"
      echo "                          [--no-progress] [--json] [--quiet] [--stats] [--reset-cache]"
      exit 1
      ;;
  esac
  shift
done

# ── --stats / --reset-cache short-circuits ──────────────────────────────────

if [ "$SHOW_STATS" = "1" ]; then
  eta_init
  eta_stats
  exit 0
fi

if [ "$RESET_CACHE" = "1" ]; then
  eta_init
  eta_reset_cache
  echo "ETA cache reset: $ETA_CACHE_FILE"
  exit 0
fi

# ── Load ETA history ────────────────────────────────────────────────────────

eta_init

# ── Stage definitions (id, label, weight) ───────────────────────────────────

# Stages match the actual pipeline (from backup): pre-checks, commit, docs,
# deploy, push, bump, tag. Weights sum to ~100.
STAGE_IDS=(pre-checks commit docs deploy push bump tag)
STAGE_LABELS=("pre-checks" "commit" "docs" "deploy" "push" "bump" "tag")
STAGE_WEIGHTS=(2 8 5 40 5 25 15)

# Per-stage start time (for eta_record on success).
STAGE_START=()
for _ in "${STAGE_IDS[@]}"; do STAGE_START+=("0"); done

# ── Timer helpers ───────────────────────────────────────────────────────────

TOTAL_START=$(date +%s)

step_start() {
  local key="${1//[^a-zA-Z0-9]/_}"
  eval "_STEP_TIME_${key}=$(date +%s)"
}

step_end() {
  local name=$1
  local key="${1//[^a-zA-Z0-9]/_}"
  local start
  eval "start=\${_STEP_TIME_${key}}"
  local elapsed=$(( $(date +%s) - start ))
  echo -e "  ${CYAN}⏱${NC}  ${name}: ${elapsed}s"
}

# ── Active package.json files (for bump) ────────────────────────────────────

BUMP_FILES=(
  "$LOCAL_ROOT/package.json"
  "$LOCAL_ROOT/apps/boilerplate/package.json"
  "$LOCAL_ROOT/apps/flex/package.json"
  "$LOCAL_ROOT/apps/home/package.json"
  "$LOCAL_ROOT/apps/recipes/package.json"
  "$LOCAL_ROOT/apps/showcase/package.json"
  "$LOCAL_ROOT/apps/todo/package.json"
  "$LOCAL_ROOT/apps/viewer/package.json"
  "$LOCAL_ROOT/packages/agent/package.json"
  "$LOCAL_ROOT/packages/core/package.json"
  "$LOCAL_ROOT/packages/sdk/package.json"
  "$LOCAL_ROOT/packages/ui/package.json"
)

# ── Helpers ─────────────────────────────────────────────────────────────────

current_version() {
  node -e "console.log(require('$LOCAL_ROOT/package.json').version)"
}

bump_patch() {
  local ver=$1
  local major minor patch
  IFS='.' read -r major minor patch <<< "$ver"
  echo "${major}.${minor}.$(( patch + 1 ))"
}

# ── Progress init ───────────────────────────────────────────────────────────

PB_INSTRUMENTED=0
if [ "${PB_NO_PROGRESS:-0}" != "1" ]; then
  pb_init
  pb_set_header "$(printf '%bbatch — release pipeline%b' "$BOLD" "$NC")"
  for i in "${!STAGE_IDS[@]}"; do
    pb_register "batch:${STAGE_IDS[$i]}" "${STAGE_LABELS[$i]}" "${STAGE_WEIGHTS[$i]}"
  done
  PB_INSTRUMENTED=1
fi

# Wrappers: noop when progress disabled.
_p_set()  { [ "$PB_INSTRUMENTED" = "1" ] && pb_set_status "batch:$1" "$2" || true; }
_p_tick() { [ "$PB_INSTRUMENTED" = "1" ] && pb_tick "batch:$1" "$2" || true; }
_p_done() { [ "$PB_INSTRUMENTED" = "1" ] && pb_done "batch:$1" || true; }
_p_fail() { [ "$PB_INSTRUMENTED" = "1" ] && pb_fail "batch:$1" "${2:-failed}" || true; }

# Track which stage is currently active (for trap).
CURRENT_STAGE=""

stage_begin() {
  CURRENT_STAGE="$1"
  local i
  for i in "${!STAGE_IDS[@]}"; do
    if [ "${STAGE_IDS[$i]}" = "$1" ]; then
      STAGE_START[$i]=$(date +%s)
      break
    fi
  done
  _p_tick "$1" 1
}

stage_end_ok() {
  local id="$1"
  local i
  for i in "${!STAGE_IDS[@]}"; do
    if [ "${STAGE_IDS[$i]}" = "$id" ]; then
      local dur=$(( $(date +%s) - ${STAGE_START[$i]} ))
      [[ "${DRY_RUN:-0}" == "1" ]] || eta_record "batch.${id}" "$dur" || true
      break
    fi
  done
  _p_done "$id"
  CURRENT_STAGE=""
}

stage_skip() {
  local id="$1"
  _p_set "$id" "skipped"
  _p_done "$id"
}

# ── Trap: on error, mark current stage failed and finish bars ───────────────

_on_err() {
  local code=$?
  if [ -n "$CURRENT_STAGE" ]; then
    _p_fail "$CURRENT_STAGE" "exited with code $code"
  fi
  if [ "$PB_INSTRUMENTED" = "1" ]; then
    pb_finish || true
  fi
  [[ "${DRY_RUN:-0}" == "1" ]] || eta_save 2>/dev/null || true
  exit "$code"
}
trap _on_err ERR

# ── Pre-checks ──────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}webmcp-auto-ui batch release${NC}"
echo ""

VERSION=$(current_version)
echo -e "  version: ${BOLD}v${VERSION}${NC}"

if [ "$DRY_RUN" = "1" ]; then
  echo -e "  mode:    ${YELLOW}dry run${NC}"
fi
echo ""

echo -e "${BOLD}Pre-checks${NC}"
step_start "pre-checks"
stage_begin "pre-checks"

cd "$LOCAL_ROOT"

MODIFIED=$(git diff --name-only 2>/dev/null || true)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null || true)
UNPUSHED=$(git log @{upstream}..HEAD --oneline 2>/dev/null || true)

HAS_LOCAL_CHANGES=0
HAS_UNPUSHED=0

if [ -n "$MODIFIED" ] || [ -n "$STAGED" ] || [ -n "$UNTRACKED" ]; then
  HAS_LOCAL_CHANGES=1
  ok "uncommitted changes detected"
fi

if [ -n "$UNPUSHED" ]; then
  HAS_UNPUSHED=1
  UNPUSHED_COUNT=$(echo "$UNPUSHED" | wc -l | tr -d ' ')
  ok "$UNPUSHED_COUNT unpushed commit(s)"
fi

if [ "$HAS_LOCAL_CHANGES" = "0" ] && [ "$HAS_UNPUSHED" = "0" ] && [ "$DRY_RUN" != "1" ]; then
  fail "nothing to do — working tree is clean and all commits are pushed"
  stage_end_ok "pre-checks"
  [ "$PB_INSTRUMENTED" = "1" ] && pb_finish
  exit 0
fi

# Check gh auth
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  ok "gh authenticated"
else
  echo -e "  ${YELLOW}⚠${NC} gh not authenticated — HTTPS push fallback unavailable"
fi

step_end "pre-checks"
stage_end_ok "pre-checks"
echo ""

# ── Step 1: Commit ──────────────────────────────────────────────────────────

echo -e "${BOLD}Step 1 — Commit${NC}"
step_start "commit"
stage_begin "commit"

if [ "$HAS_LOCAL_CHANGES" = "1" ]; then
  if [ -n "$MODIFIED" ]; then
    info "staging modified files..."
    _p_set "commit" "staging modified"
    [ "$DRY_RUN" = "1" ] || git add -u
  fi

  if [ -n "$UNTRACKED" ]; then
    RELEVANT_UNTRACKED=$(echo "$UNTRACKED" | grep -E '^(apps/|packages/)' || true)
    if [ -n "$RELEVANT_UNTRACKED" ]; then
      info "staging untracked files in apps/ and packages/..."
      _p_set "commit" "staging untracked"
      [ "$DRY_RUN" = "1" ] || echo "$RELEVANT_UNTRACKED" | xargs git add
    fi
  fi

  if [ -z "$COMMIT_MSG" ]; then
    if [ -t 0 ] && [ "$DRY_RUN" != "1" ]; then
      echo -e "  ${CYAN}?${NC} Commit message (default: release: v${VERSION}):"
      read -r -p "    > " COMMIT_MSG
    fi
    if [ -z "$COMMIT_MSG" ]; then
      COMMIT_MSG="release: v${VERSION}"
    fi
  fi

  if [ "$DRY_RUN" = "1" ]; then
    skip "would commit with message: \"$COMMIT_MSG\""
    STAGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
    info "$STAGED_COUNT files staged"
    git reset HEAD -- . > /dev/null 2>&1 || true
  else
    _p_set "commit" "git commit"
    git commit -m "$COMMIT_MSG"
    ok "committed: $COMMIT_MSG"
  fi
else
  ok "nothing to commit — using existing unpushed commits"
fi

step_end "commit"
stage_end_ok "commit"
echo ""

# ── Step 2: Docs update ────────────────────────────────────────────────────

if [ "$NO_DOCS" = "1" ]; then
  echo -e "${BOLD}Step 2 — Docs update${NC}"
  skip "docs update"
  stage_skip "docs"
  echo ""
else
  echo -e "${BOLD}Step 2 — Docs update${NC}"
  step_start "docs"
  stage_begin "docs"

  if [ "$DRY_RUN" = "1" ]; then
    skip "would run npm run docs:sync"
  else
    _p_set "docs" "npm run docs:sync"
    if npm run docs:sync --if-present > /dev/null 2>&1; then
      if [ -n "$(git diff --name-only 2>/dev/null)" ]; then
        git add -u
        git commit -m "docs: sync after v${VERSION}"
        ok "docs synced and committed"
      else
        ok "docs already up to date"
      fi
    else
      echo -e "  ${YELLOW}⚠${NC} docs:sync not available or failed — continuing"
    fi
  fi

  step_end "docs"
  stage_end_ok "docs"
  echo ""
fi

# ── Step 3: Deploy ──────────────────────────────────────────────────────────

if [ "$NO_DEPLOY" = "1" ]; then
  echo -e "${BOLD}Step 3 — Deploy${NC}"
  skip "deploy"
  stage_skip "deploy"
  echo ""
else
  echo -e "${BOLD}Step 3 — Deploy${NC}"
  step_start "deploy"
  stage_begin "deploy"

  # Pass --no-progress to deploy.sh so its bars don't collide with batch's
  # global stages. If deploy.sh doesn't (yet) accept --no-progress, retry
  # without the flag.
  if [ "$DRY_RUN" = "1" ]; then
    skip "would run ./scripts/deploy.sh --force --dry-run"
    if ! "$LOCAL_ROOT/scripts/deploy.sh" --force --dry-run --no-progress 2>/dev/null; then
      "$LOCAL_ROOT/scripts/deploy.sh" --force --dry-run || true
    fi
  else
    _p_set "deploy" "./scripts/deploy.sh --force"
    if ! PB_NO_PROGRESS=1 "$LOCAL_ROOT/scripts/deploy.sh" --force --no-progress 2>/dev/null; then
      "$LOCAL_ROOT/scripts/deploy.sh" --force
    fi
  fi

  step_end "deploy"
  stage_end_ok "deploy"
  echo ""
fi

# ── Step 4: Push ────────────────────────────────────────────────────────────

echo -e "${BOLD}Step 4 — Push${NC}"
step_start "push"
stage_begin "push"

if [ "$DRY_RUN" = "1" ]; then
  skip "would push to origin"
else
  _p_set "push" "git push"
  if git push 2>/dev/null; then
    ok "pushed via SSH"
  else
    echo -e "  ${YELLOW}⚠${NC} SSH push failed — trying HTTPS via gh..."
    REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true)
    BRANCH=$(git branch --show-current)
    if [ -n "$REPO" ]; then
      git push "https://github.com/${REPO}.git" "$BRANCH"
      ok "pushed via HTTPS"
    else
      fail "push failed (both SSH and HTTPS)"
      _p_fail "push" "ssh+https failed"
      exit 1
    fi
  fi
fi

step_end "push"
stage_end_ok "push"
echo ""

# ── Step 5: Bump ────────────────────────────────────────────────────────────

if [ "$NO_BUMP" = "1" ]; then
  echo -e "${BOLD}Step 5 — Bump version${NC}"
  skip "version bump"
  stage_skip "bump"
  echo ""
else
  echo -e "${BOLD}Step 5 — Bump version${NC}"
  step_start "bump"
  stage_begin "bump"

  CURRENT=$(current_version)
  NEXT=$(bump_patch "$CURRENT")

  if [ "$DRY_RUN" = "1" ]; then
    skip "would bump $CURRENT → $NEXT in ${#BUMP_FILES[@]} files"
  else
    info "bumping $CURRENT → $NEXT..."
    _p_set "bump" "$CURRENT → $NEXT"

    for pkg in "${BUMP_FILES[@]}"; do
      if [ -f "$pkg" ]; then
        node -e "
          const fs = require('fs');
          const p = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
          p.version = '$NEXT';
          fs.writeFileSync('$pkg', JSON.stringify(p, null, 2) + '\n');
        "
      fi
    done
    ok "updated ${#BUMP_FILES[@]} package.json files"

    info "updating package-lock.json..."
    _p_set "bump" "npm install lock"
    npm install --package-lock-only > /dev/null 2>&1
    ok "lock file updated"

    git add -A
    git commit -m "chore: bump version to $NEXT"
    ok "committed bump: $NEXT"

    info "pushing bump..."
    _p_set "bump" "pushing bump"
    if git push 2>/dev/null; then
      ok "pushed bump via SSH"
    else
      echo -e "  ${YELLOW}⚠${NC} SSH push failed — trying HTTPS via gh..."
      REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true)
      BRANCH=$(git branch --show-current)
      if [ -n "$REPO" ]; then
        git push "https://github.com/${REPO}.git" "$BRANCH"
        ok "pushed bump via HTTPS"
      else
        fail "bump push failed"
        _p_fail "bump" "push failed"
        exit 1
      fi
    fi
  fi

  step_end "bump"
  stage_end_ok "bump"
  echo ""
fi

# ── Step 6: Tag (triggers npm publish via CI) ──────────────────────────────

if [ "$NO_TAG" = "1" ] || [ "$NO_BUMP" = "1" ]; then
  echo -e "${BOLD}Step 6 — Tag npm publish${NC}"
  skip "npm publish tag"
  stage_skip "tag"
  echo ""
else
  echo -e "${BOLD}Step 6 — Tag npm publish${NC}"
  step_start "tag"
  stage_begin "tag"

  FINAL=$(current_version)
  TAG="v${FINAL}"

  if [ "$DRY_RUN" = "1" ]; then
    skip "would create and push tag $TAG"
  else
    _p_set "tag" "git tag $TAG"
    if git tag "$TAG" 2>/dev/null; then
      info "created tag $TAG"
      _p_set "tag" "git push tag"
      if git push origin "$TAG" 2>/dev/null; then
        ok "pushed tag $TAG — npm publish workflow triggered"
      else
        echo -e "  ${YELLOW}⚠${NC} SSH push failed — trying HTTPS via gh..."
        REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true)
        if [ -n "$REPO" ]; then
          git push "https://github.com/${REPO}.git" "$TAG"
          ok "pushed tag $TAG via HTTPS"
        else
          fail "tag push failed"
        fi
      fi
    else
      echo -e "  ${YELLOW}⚠${NC} tag $TAG already exists — skipping"
    fi
  fi

  step_end "tag"
  stage_end_ok "tag"
  echo ""
fi

# ── Save ETA history ────────────────────────────────────────────────────────

[[ "${DRY_RUN:-0}" == "1" ]] || eta_save 2>/dev/null || true

# ── Finish progress ─────────────────────────────────────────────────────────

if [ "$PB_INSTRUMENTED" = "1" ]; then
  pb_finish
fi

# ── Summary ─────────────────────────────────────────────────────────────────

TOTAL_ELAPSED=$(( $(date +%s) - TOTAL_START ))
FINAL_VERSION=$(current_version)
TOTAL_FMT=$(eta_format_duration "$TOTAL_ELAPSED")

echo -e "${BOLD}────────────────────────────────────────${NC}"
echo -e "${BOLD}Summary${NC}"
echo ""
echo -e "  version: ${BOLD}v${FINAL_VERSION}${NC}"
echo -e "  total:   ${TOTAL_FMT}"
echo ""

if [ "$DRY_RUN" = "1" ]; then
  echo -e "  ${YELLOW}Dry run complete — no changes were made.${NC}"
  echo -e "  Batch dry-run finished in ${TOTAL_FMT}."
  echo -e "  (dry-run: cache ETA non mis à jour)"
else
  echo -e "  ${GREEN}Release complete.${NC}"
  echo -e "  Batch done in ${TOTAL_FMT}."
fi
echo ""
