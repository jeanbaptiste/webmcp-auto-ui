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
#
# Combines: commit → deploy → push → bump → push → tag (triggers npm publish via CI)
# ─────────────────────────────────────────────────────────────────────────────

LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)    DRY_RUN=1 ;;
    --no-deploy)  NO_DEPLOY=1 ;;
    --no-bump)    NO_BUMP=1 ;;
    --no-tag)     NO_TAG=1 ;;
    --no-docs)    NO_DOCS=1 ;;
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
      exit 1
      ;;
  esac
  shift
done

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

# Check git status
echo -e "${BOLD}Pre-checks${NC}"
step_start "pre-checks"

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

if [ "$HAS_LOCAL_CHANGES" = "0" ] && [ "$HAS_UNPUSHED" = "0" ]; then
  fail "nothing to do — working tree is clean and all commits are pushed"
  exit 0
fi

# Check gh auth
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  ok "gh authenticated"
else
  echo -e "  ${YELLOW}⚠${NC} gh not authenticated — HTTPS push fallback unavailable"
fi

step_end "pre-checks"
echo ""

# ── Step 1: Commit ──────────────────────────────────────────────────────────

echo -e "${BOLD}Step 1 — Commit${NC}"
step_start "commit"

if [ "$HAS_LOCAL_CHANGES" = "1" ]; then
  # Stage modified/deleted tracked files
  if [ -n "$MODIFIED" ]; then
    info "staging modified files..."
    git add -u
  fi

  # Stage untracked files only if they're in apps/ or packages/
  if [ -n "$UNTRACKED" ]; then
    RELEVANT_UNTRACKED=$(echo "$UNTRACKED" | grep -E '^(apps/|packages/)' || true)
    if [ -n "$RELEVANT_UNTRACKED" ]; then
      info "staging untracked files in apps/ and packages/..."
      echo "$RELEVANT_UNTRACKED" | xargs git add
    fi
  fi

  # Determine commit message
  if [ -z "$COMMIT_MSG" ]; then
    if [ -t 0 ]; then
      # Interactive — prompt
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
    git commit -m "$COMMIT_MSG"
    ok "committed: $COMMIT_MSG"
  fi
else
  ok "nothing to commit — using existing unpushed commits"
fi

step_end "commit"
echo ""

# ── Step 2: Docs update ────────────────────────────────────────────────────

if [ "$NO_DOCS" = "1" ]; then
  echo -e "${BOLD}Step 2 — Docs update${NC}"
  skip "docs update"
  echo ""
else
  echo -e "${BOLD}Step 2 — Docs update${NC}"
  step_start "docs"

  if [ "$DRY_RUN" = "1" ]; then
    skip "would run npm run docs:sync"
  else
    if npm run docs:sync --if-present > /dev/null 2>&1; then
      # Check if docs:sync created changes
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
  echo ""
fi

# ── Step 3: Deploy ──────────────────────────────────────────────────────────

if [ "$NO_DEPLOY" = "1" ]; then
  echo -e "${BOLD}Step 3 — Deploy${NC}"
  skip "deploy"
  echo ""
else
  echo -e "${BOLD}Step 3 — Deploy${NC}"
  step_start "deploy"

  if [ "$DRY_RUN" = "1" ]; then
    skip "would run ./scripts/deploy.sh --dry-run"
    "$LOCAL_ROOT/scripts/deploy.sh" --dry-run
  else
    "$LOCAL_ROOT/scripts/deploy.sh"
  fi

  step_end "deploy"
  echo ""
fi

# ── Step 4: Push ────────────────────────────────────────────────────────────

echo -e "${BOLD}Step 4 — Push${NC}"
step_start "push"

if [ "$DRY_RUN" = "1" ]; then
  skip "would push to origin"
else
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
      exit 1
    fi
  fi
fi

step_end "push"
echo ""

# ── Step 5: Bump ────────────────────────────────────────────────────────────

if [ "$NO_BUMP" = "1" ]; then
  echo -e "${BOLD}Step 5 — Bump version${NC}"
  skip "version bump"
  echo ""
else
  echo -e "${BOLD}Step 5 — Bump version${NC}"
  step_start "bump"

  CURRENT=$(current_version)
  NEXT=$(bump_patch "$CURRENT")

  if [ "$DRY_RUN" = "1" ]; then
    skip "would bump $CURRENT → $NEXT in ${#BUMP_FILES[@]} files"
  else
    info "bumping $CURRENT → $NEXT..."

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
    npm install --package-lock-only > /dev/null 2>&1
    ok "lock file updated"

    git add -A
    git commit -m "chore: bump version to $NEXT"
    ok "committed bump: $NEXT"

    info "pushing bump..."
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
        exit 1
      fi
    fi
  fi

  step_end "bump"
  echo ""
fi

# ── Step 6: Tag (triggers npm publish via CI) ──────────────────────────────

if [ "$NO_TAG" = "1" ] || [ "$NO_BUMP" = "1" ]; then
  echo -e "${BOLD}Step 6 — Tag npm publish${NC}"
  skip "npm publish tag"
  echo ""
else
  echo -e "${BOLD}Step 6 — Tag npm publish${NC}"
  step_start "tag"

  FINAL=$(current_version)
  TAG="v${FINAL}"

  if [ "$DRY_RUN" = "1" ]; then
    skip "would create and push tag $TAG"
  else
    if git tag "$TAG" 2>/dev/null; then
      info "created tag $TAG"
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
  echo ""
fi

# ── Summary ─────────────────────────────────────────────────────────────────

TOTAL_ELAPSED=$(( $(date +%s) - TOTAL_START ))
FINAL_VERSION=$(current_version)

echo -e "${BOLD}────────────────────────────────────────${NC}"
echo -e "${BOLD}Summary${NC}"
echo ""
echo -e "  version: ${BOLD}v${FINAL_VERSION}${NC}"
echo -e "  total:   ${TOTAL_ELAPSED}s"
echo ""

if [ "$DRY_RUN" = "1" ]; then
  echo -e "  ${YELLOW}Dry run complete — no changes were made.${NC}"
else
  echo -e "  ${GREEN}Release complete.${NC}"
fi
echo ""
