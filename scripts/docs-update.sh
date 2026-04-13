#!/bin/bash
# ============================================================================
# docs-update.sh — Documentation updater for webmcp-auto-ui
# ============================================================================
#
# Keeps the Starlight documentation in sync with the codebase, without
# overwriting files that haven't been affected by code changes.
#
# PHILOSOPHY:
#   The script never touches a doc file unless it has a reason to.
#   It uses a two-pass approach:
#     Pass 1 (cheap) — Ask Claude to produce a MANIFEST of impacted files
#     Pass 2 (targeted) — For each impacted file, ask Claude to update it
#
# DEPENDENCIES:
#   - claude (Claude Code CLI) — uses your existing plan, no API key needed
#   - repomix (npx) — creates a faithful snapshot of the git-tracked codebase
#   - mmdc (npx @mermaid-js/mermaid-cli) — pre-renders Mermaid diagrams to SVG
#   - jq — parses the manifest JSON
#
# USAGE:
#   ./scripts/docs-update.sh                  # auto-detect changes since last run
#   ./scripts/docs-update.sh --all            # regenerate everything
#   ./scripts/docs-update.sh --dry-run        # show manifest without applying
#   ./scripts/docs-update.sh --file guide/getting-started
#                                              # update a single file (no confirmation)
#   ./scripts/docs-update.sh --svg-only       # only re-render Mermaid SVGs
#
# ============================================================================

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
#
# ROOT        — monorepo root (auto-detected from script location)
# DOCS_FR     — Starlight French docs (root locale)
# DOCS_EN     — Starlight English docs
# DIAGRAMS    — where pre-rendered SVGs live (served by Astro as static assets)
# MANIFEST    — JSON file listing which docs need updating (gitignored)
# LASTRUN     — timestamp file to track when the last run happened

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS_FR="$ROOT/docs-site/src/content/docs"
DOCS_EN="$ROOT/docs-site/src/content/docs/en"
DIAGRAMS="$ROOT/docs-site/public/diagrams"
SNAPSHOT_LIGHT="$ROOT/.docs-snapshot-light.txt"
MANIFEST="$ROOT/.docs-manifest.json"
LASTRUN="$ROOT/.docs-lastrun"

# Claude model for each pass
MODEL_ANALYZE="opus"
MODEL_WRITE="opus"

# Parallelism — how many files to update concurrently.
# Each worker runs claude -p independently. 4-6 is safe for most plans.
# Set to 1 for sequential (easier to debug).
PARALLEL=4

# ─── Argument parsing ──────────────────────────────────────────────────────
#
# We support 4 modes:
#   (default)   — auto-detect changes since last run, produce manifest, apply
#   --all       — skip change detection, regenerate all docs
#   --dry-run   — produce manifest but don't apply any changes
#   --file X    — update a single file (skip manifest entirely)
#   --svg-only  — only re-render Mermaid blocks to SVG

MODE="auto"
DRY_RUN=false
AUTO_YES=false
TARGET_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)      MODE="all";      shift ;;
    --dry-run)  DRY_RUN=true;    shift ;;
    --svg-only) MODE="svg-only"; shift ;;
    --yes|-y)   AUTO_YES=true;   shift ;;
    --file)     MODE="file"; TARGET_FILE="$2"; shift 2 ;;
    *)          echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Helpers ────────────────────────────────────────────────────────────────

log()  { echo "  [docs] $*"; }
step() { echo ""; echo "=== $* ==="; }
die()  { echo "ERROR: $*" >&2; exit 1; }

# Check that a command exists, or explain how to install it.
require() {
  local cmd="$1" install_hint="$2"
  if ! command -v "$cmd" &>/dev/null; then
    die "'$cmd' not found. Install with: $install_hint"
  fi
}

# ─── Preflight checks ──────────────────────────────────────────────────────
#
# Make sure all tools are available before doing any work.
# CRITICAL: test write permissions FIRST, before spending tokens on Claude.
# Without this, the script can run for hours generating content and then
# fail silently when it tries to write the results.

preflight_write_test() {
  local test_file="$DOCS_FR/.write-test-$$"
  if ! echo "write-test" > "$test_file" 2>/dev/null; then
    die "Cannot write to $DOCS_FR — check permissions."
  fi
  rm -f "$test_file"

  local test_svg="$DIAGRAMS/.write-test-$$"
  mkdir -p "$DIAGRAMS"
  if ! echo "write-test" > "$test_svg" 2>/dev/null; then
    die "Cannot write to $DIAGRAMS — check permissions."
  fi
  rm -f "$test_svg"

  local test_en="$DOCS_EN/.write-test-$$"
  mkdir -p "$DOCS_EN"
  if ! echo "write-test" > "$test_en" 2>/dev/null; then
    die "Cannot write to $DOCS_EN — check permissions."
  fi
  rm -f "$test_en"

  log "Write permissions OK (FR, EN, diagrams)"
}

preflight_write_test

require claude  "https://docs.anthropic.com/en/docs/claude-code"
require jq      "brew install jq"

# repomix and mmdc are run via npx, so we just need node/npm.
require node "brew install node"

# ============================================================================
# STEP 1 — Create a snapshot of the codebase
# ============================================================================
#
# repomix reads only git-tracked files (respects .gitignore) and concatenates
# them into a single text file with clear delimiters. This is the "source of
# truth" that Claude reads — no summarization, no compression, just raw code.
#
# The snapshot is gitignored (it's ~1MB and changes every run).

create_snapshot() {
  step "Step 1 — Creating codebase snapshot with repomix"

  # Light snapshot — used for manifest analysis (Step 3) and targeted updates (Step 5)
  # Only includes barrel exports, types, configs, and key source files.
  # This keeps the prompt under ~200K chars so claude -p doesn't choke.
  npx --yes repomix \
    --output "$SNAPSHOT_LIGHT" \
    --include "packages/*/src/index.ts,packages/*/src/types.ts,packages/*/package.json,apps/*/package.json,apps/*/src/routes/+page.svelte,CLAUDE.md,README.md,scripts/deploy.sh,mcp-proxies/README.md" \
    --ignore "**/node_modules/**,.docs-*" \
    2>&1 | tail -3

  local light_size
  light_size=$(wc -c < "$SNAPSHOT_LIGHT" | tr -d ' ')
  log "Light snapshot: $(wc -l < "$SNAPSHOT_LIGHT" | tr -d ' ') lines, $((light_size / 1024))KB"
}

# ============================================================================
# STEP 2 — Detect what changed since the last run
# ============================================================================
#
# We use git log to find commits since the last run. This gives Claude the
# context of WHAT changed (not just THAT something changed). If there's no
# lastrun file, we treat it as --all.

detect_changes() {
  step "Step 2 — Detecting changes since last run"

  if [[ "$MODE" == "all" ]]; then
    log "Mode --all: skipping change detection, will analyze everything"
    CHANGELOG="(full regeneration requested — analyze all documentation)"
    return
  fi

  if [[ ! -f "$LASTRUN" ]]; then
    log "No .docs-lastrun file found — treating as first run (--all)"
    CHANGELOG="(first run — analyze all documentation)"
    return
  fi

  local since
  since=$(cat "$LASTRUN")
  CHANGELOG=$(git -C "$ROOT" log --since="$since" --stat --oneline 2>/dev/null || echo "(no commits)")

  if [[ "$CHANGELOG" == "(no commits)" || -z "$CHANGELOG" ]]; then
    log "No commits since last run ($since). Nothing to do."
    exit 0
  fi

  local count
  count=$(echo "$CHANGELOG" | grep -c '^[0-9a-f]' || true)
  log "$count commits since $since"
}

# ============================================================================
# STEP 3 — Generate the manifest
# ============================================================================
#
# This is the CHEAP pass. We send Claude:
#   1. The changelog (what changed)
#   2. The list of existing doc files (not their content — just filenames)
#   3. The codebase snapshot (for accuracy)
#
# Claude returns a JSON manifest:
#   {
#     "skip": ["guide/deploy.mdx"],
#     "update": [
#       {"file": "packages/agent.mdx", "reason": "new export TokenTracker", "sections": ["## Exports"]}
#     ],
#     "create": [
#       {"file": "apps/boilerplate.md", "reason": "new app in apps/"}
#     ]
#   }
#
# The manifest is saved to .docs-manifest.json for review.

generate_manifest() {
  step "Step 3 — Generating manifest (which docs are impacted?)"

  # List all existing doc files (just paths, no content)
  local doc_list
  doc_list=$(find "$DOCS_FR" -path "$DOCS_EN" -prune -o \( -name '*.mdx' -o -name '*.md' \) -print | sed "s|$DOCS_FR/||" | sort)

  # Also list READMEs
  local readmes
  readmes=$(find "$ROOT" -maxdepth 3 -name 'README.md' -not -path '*/node_modules/*' | sed "s|$ROOT/||" | sort)

  # Build the prompt
  local prompt
  prompt="You are a documentation auditor for the webmcp-auto-ui monorepo.

CHANGELOG (commits since last doc update):
$CHANGELOG

EXISTING DOC FILES (Starlight FR — EN mirrors these):
$doc_list

README FILES:
$readmes

CODEBASE (package exports, app configs, key files):
$(cat "$SNAPSHOT_LIGHT")

YOUR TASK:
Analyze the changelog and codebase. Determine which documentation files
need to be updated or created to stay in sync with the code.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  \"skip\": [\"file1.mdx\", \"file2.md\"],
  \"update\": [
    {\"file\": \"guide/getting-started.mdx\", \"reason\": \"boilerplate added\", \"sections\": [\"## Installation\"]}
  ],
  \"create\": [
    {\"file\": \"apps/newapp.md\", \"reason\": \"new app in apps/\"}
  ]
}

Rules:
- A file goes in 'skip' if the code changes don't affect it at all
- A file goes in 'update' if some sections need changes (list which ones)
- A file goes in 'create' if it doesn't exist yet but should
- Be conservative: don't flag a file unless the changelog clearly impacts it
- Check model names, provider APIs, app names, exports, imports
- Include README.md files if the apps table or package descriptions are outdated
- Return valid JSON only, no trailing commas"

  log "Calling Claude ($MODEL_ANALYZE) for manifest..."
  local raw
  raw=$(echo "$prompt" | claude -p --model "$MODEL_ANALYZE" --output-format json 2>/dev/null)

  # claude -p --output-format json returns {"type":"result","result":"<text>",...}
  # The manifest JSON is embedded inside the "result" string field.
  # Step 1: extract the .result text field
  local result_text
  result_text=$(echo "$raw" | jq -r '.result // .' 2>/dev/null || echo "$raw")

  # Step 2: extract the JSON manifest from the text
  # It may be wrapped in ```json ... ``` or preceded by explanation text
  local json

  # Try: extract ```json block
  json=$(echo "$result_text" | sed -n '/```json/,/```/p' | sed '1d;$d')

  # Fallback: find the first { ... } block that parses as valid JSON
  if [[ -z "$json" ]] || ! echo "$json" | jq . &>/dev/null; then
    json=$(echo "$result_text" | perl -0777 -ne 'print $1 if /(\{.*\})/s' 2>/dev/null)
  fi

  # Fallback: maybe the result_text itself is valid JSON
  if [[ -z "$json" ]] || ! echo "$json" | jq . &>/dev/null; then
    json="$result_text"
  fi

  if ! echo "$json" | jq . &>/dev/null; then
    log "WARNING: Could not extract valid JSON. Saving raw output."
    echo "$result_text" > "$MANIFEST"
    die "Invalid manifest. Review $MANIFEST manually."
  fi

  echo "$json" | jq . > "$MANIFEST"

  # Print summary
  local n_skip n_update n_create
  n_skip=$(jq '.skip | length' "$MANIFEST")
  n_update=$(jq '.update | length' "$MANIFEST")
  n_create=$(jq '.create | length' "$MANIFEST")
  log "Manifest: $n_skip skip, $n_update update, $n_create create"
  log "Saved to $MANIFEST"

  # Show the manifest
  echo ""
  jq . "$MANIFEST"
}

# ============================================================================
# STEP 4 — Wait for user validation
# ============================================================================
#
# The manifest is a PROPOSAL. The user can edit it before proceeding.
# In --dry-run mode, we stop here.

validate_manifest() {
  step "Step 4 — Validate manifest"

  if $DRY_RUN; then
    log "Dry run — stopping here. Review $MANIFEST and re-run without --dry-run."
    exit 0
  fi

  if $AUTO_YES; then
    log "Auto-yes mode — skipping manual validation."
    return
  fi

  echo ""
  echo "Review the manifest above."
  echo "  - Edit $MANIFEST to remove entries you don't want to update."
  echo "  - Press ENTER to proceed, or Ctrl+C to abort."
  echo ""
  read -r
}

# ============================================================================
# STEP 5 — Apply updates
# ============================================================================
#
# For each entry in the manifest:
#   "update" → read the existing file + relevant code, ask Claude to patch it
#   "create" → ask Claude to generate the file from scratch
#
# Each file is processed independently. Claude receives:
#   - The existing doc (for updates)
#   - The relevant source code (extracted from the snapshot)
#   - Clear instructions on what to change
#
# Both FR and EN versions are handled: FR is written/updated first,
# then EN is translated from the FR version.

# ── Worker: process a single manifest entry (FR update/create + EN translate)
#
# Designed to be called from xargs -P for parallel execution.
# Each invocation is self-contained: reads the manifest, calls Claude,
# writes both FR and EN files. Output is buffered per-worker to avoid
# interleaved logs from parallel processes.
#
# Usage: process_entry <action> <index>
#   action = "update" or "create"
#   index  = numeric index into manifest.update[] or manifest.create[]

process_entry() {
  set +e  # workers must not die on non-zero exits
  local action="$1" index="$2"
  local file reason sections fr_path en_path

  # ── Read manifest entry ──
  if [[ "$action" == "update" ]]; then
    file=$(jq -r ".update[$index].file" "$MANIFEST")
    reason=$(jq -r ".update[$index].reason" "$MANIFEST")
    sections=$(jq -r ".update[$index].sections | join(\", \")" "$MANIFEST")
  else
    file=$(jq -r ".create[$index].file" "$MANIFEST")
    reason=$(jq -r ".create[$index].reason" "$MANIFEST")
    sections="(new file)"
  fi

  if [[ "$file" == "null" || -z "$file" ]]; then
    echo "  [worker $index] SKIP: null/empty file entry"
    return
  fi

  if [[ "$file" == en/* ]]; then
    echo "  [worker $index] SKIP (EN mirror, auto-translated from FR): $file"
    return
  fi

  fr_path="$DOCS_FR/$file"
  en_path="$DOCS_EN/$file"

  # ── UPDATE: patch existing file ──
  if [[ "$action" == "update" ]]; then
    if [[ ! -f "$fr_path" ]]; then
      echo "  [worker $index] SKIP (not found): $file"
      return
    fi

    local existing prompt updated
    existing=$(cat "$fr_path")

    prompt="You are updating a documentation file for the webmcp-auto-ui project.

REASON FOR UPDATE: $reason
SECTIONS TO UPDATE: $sections

EXISTING FILE ($file):
$existing

CODEBASE (source of truth):
$(cat "$SNAPSHOT_LIGHT")

YOUR TASK:
Update ONLY the sections listed above. Do NOT rewrite sections that are correct.
Return the COMPLETE updated file (not a diff), preserving all unchanged sections exactly.

Rules:
- Keep the frontmatter identical (title, description, sidebar order)
- Use relative links (./foo, ../bar), never absolute (/guide/...)
- npm not pnpm
- RemoteLLMProvider uses proxyUrl, not apiKey
- Model aliases: 'haiku', 'sonnet', 'opus' (not claude-3-5-sonnet-20241022)
- GitHub org is 'jeanbaptiste' (NOT 'hyperskills'). URLs: github.com/jeanbaptiste/webmcp-auto-ui, degit jeanbaptiste/webmcp-auto-ui/...
- No emojis
- Escape < in MDX (use &lt; or backticks)
- NEVER use inline \`\`\`mermaid blocks. Always reference pre-rendered SVGs with <img src=\"/diagrams/...svg\" alt=\"...\" />
- Return ONLY the file content, no explanation before or after"

    local stderr_file="/tmp/docs-update-stderr-$$-$index"
    updated=$(echo "$prompt" | claude -p --model "$MODEL_WRITE" 2>"$stderr_file")
    if [[ $? -ne 0 ]]; then
      echo "  [worker $index] ERROR: claude -p failed: $(cat "$stderr_file")"
      rm -f "$stderr_file"
      return
    fi
    rm -f "$stderr_file"

    # Safety: don't overwrite with garbage if Claude failed
    if [[ -z "$updated" ]] \
      || echo "$updated" | head -1 | grep -qv '^---' \
      || echo "$updated" | grep -q "Prompt is too long"; then
      echo "  [worker $index] ERROR: Claude returned garbage for $file — file NOT overwritten"
      return
    fi

    printf '%s\n' "$updated" > "$fr_path"
    echo "  [worker $index] Wrote FR: $file"

  # ── CREATE: generate from scratch ──
  else
    local template_content="" template prompt content
    template=$(find "$DOCS_FR/$(dirname "$file")" -name '*.md' -o -name '*.mdx' 2>/dev/null | head -1)
    [[ -n "$template" ]] && template_content="USE THIS EXISTING FILE AS FORMAT TEMPLATE:
$(cat "$template")"

    prompt="You are creating a new documentation file for the webmcp-auto-ui project.

FILE TO CREATE: $file
REASON: $reason

$template_content

CODEBASE (source of truth):
$(cat "$SNAPSHOT_LIGHT")

YOUR TASK:
Create the documentation file in French. Follow the format of the template if provided.
Include: frontmatter (title, description, sidebar order), features, architecture, usage.

Rules:
- npm not pnpm, proxyUrl not apiKey, model aliases not full names
- GitHub org is 'jeanbaptiste' (NOT 'hyperskills'). URLs: github.com/jeanbaptiste/webmcp-auto-ui
- Relative links only, no emojis, escape < in MDX
- NEVER use inline \`\`\`mermaid blocks. Always reference pre-rendered SVGs with <img src=\"/diagrams/...svg\" alt=\"...\" />
- Return ONLY the file content, no explanation"

    local stderr_file="/tmp/docs-update-stderr-$$-$index"
    content=$(echo "$prompt" | claude -p --model "$MODEL_WRITE" 2>"$stderr_file")
    if [[ $? -ne 0 ]]; then
      echo "  [worker $index] ERROR: claude -p failed: $(cat "$stderr_file")"
      rm -f "$stderr_file"
      return
    fi
    rm -f "$stderr_file"

    if [[ -z "$content" ]] \
      || echo "$content" | head -1 | grep -qv '^---' \
      || echo "$content" | grep -q "Prompt is too long"; then
      echo "  [worker $index] ERROR: Claude returned garbage for $file — file NOT created"
      return
    fi

    mkdir -p "$(dirname "$fr_path")"
    printf '%s\n' "$content" > "$fr_path"
    echo "  [worker $index] Wrote FR (new): $file"
  fi

  # ── Translate to EN ──
  if [[ -f "$en_path" ]] || [[ -d "$DOCS_EN/$(dirname "$file")" ]]; then
    local en_prompt translated
    en_prompt="Translate this documentation file from French to English.
Keep the MDX structure, frontmatter, and code blocks identical.
Translate title and description in frontmatter.
Only translate comments inside code blocks, not the code itself.
Translate Mermaid diagram labels.
Return ONLY the translated file, no explanation.

$(cat "$fr_path")"

    local stderr_file_en="/tmp/docs-update-stderr-$$-$index-en"
    translated=$(echo "$en_prompt" | claude -p --model "$MODEL_WRITE" 2>"$stderr_file_en")
    if [[ $? -ne 0 ]]; then
      echo "  [worker $index] ERROR: EN translation claude -p failed: $(cat "$stderr_file_en")"
      rm -f "$stderr_file_en"
    fi
    rm -f "$stderr_file_en"

    if [[ -n "$translated" ]] \
      && echo "$translated" | head -1 | grep -q '^---' \
      && ! echo "$translated" | grep -q "Prompt is too long"; then
      mkdir -p "$(dirname "$en_path")"
      printf '%s\n' "$translated" > "$en_path"
      echo "  [worker $index] Wrote EN: $file"
    else
      echo "  [worker $index] ERROR: EN translation failed for $file — skipped"
    fi
  fi

  echo "  [worker $index] DONE: $file"
}

# Export everything workers need (xargs -P spawns subshells)
export DOCS_FR DOCS_EN MANIFEST SNAPSHOT_LIGHT MODEL_WRITE ROOT DIAGRAMS
export -f process_entry

apply_updates() {
  step "Step 5 — Applying updates ($PARALLEL workers in parallel)"

  local n_update n_create total
  n_update=$(jq '.update | length' "$MANIFEST")
  n_create=$(jq '.create | length' "$MANIFEST")
  total=$((n_update + n_create))

  echo "  [docs] $n_update updates + $n_create creates = $total files, $PARALLEL parallel workers"

  # Build task list: one line per entry, format "action index"
  {
    for i in $(seq 0 $((n_update - 1))); do echo "update $i"; done
    for i in $(seq 0 $((n_create - 1))); do echo "create $i"; done
  } | xargs -P "$PARALLEL" -L1 bash -c 'process_entry "$@"' _

  echo "  [docs] All $total files processed."
}

# ============================================================================
# STEP 5b — Apply a single file update (--file mode)
# ============================================================================
#
# When you know exactly which file needs updating, skip the manifest
# and go straight to the update.

apply_single_file() {
  step "Step 5 — Updating single file: $TARGET_FILE"

  local fr_path="$DOCS_FR/${TARGET_FILE}.mdx"
  [[ ! -f "$fr_path" ]] && fr_path="$DOCS_FR/${TARGET_FILE}.md"
  [[ ! -f "$fr_path" ]] && die "File not found: $TARGET_FILE (.mdx or .md)"

  local existing
  existing=$(cat "$fr_path")

  local prompt
  prompt="You are updating a documentation file for the webmcp-auto-ui project.

EXISTING FILE ($TARGET_FILE):
$existing

CODEBASE (source of truth):
$(cat "$SNAPSHOT_LIGHT")

YOUR TASK:
Compare the existing documentation against the codebase. Update any sections
that are outdated, incorrect, or incomplete. Do NOT rewrite sections that are
already correct.

Return the COMPLETE updated file, preserving unchanged sections exactly.

Rules:
- Keep the frontmatter identical unless title/description are wrong
- npm not pnpm, proxyUrl not apiKey, model aliases not full names
- GitHub org is 'jeanbaptiste' (NOT 'hyperskills'). URLs: github.com/jeanbaptiste/webmcp-auto-ui
- Relative links, no emojis, escape < in MDX
- NEVER use inline \`\`\`mermaid blocks. Always reference pre-rendered SVGs with <img src=\"/diagrams/...svg\" alt=\"...\" />
- Return ONLY the file content, no explanation"

  log "Calling Claude ($MODEL_WRITE)..."
  local updated exit_code=0
  updated=$(echo "$prompt" | claude -p --model "$MODEL_WRITE" 2>/dev/null) || exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    die "Claude exited with code $exit_code for $TARGET_FILE"
  fi

  if [[ -z "$updated" ]] || echo "$updated" | head -1 | grep -qv '^---'; then
    die "Claude returned invalid content for $TARGET_FILE — file NOT overwritten"
  fi

  printf '%s\n' "$updated" > "$fr_path"
  log "Wrote FR: $fr_path"

  # EN translation
  local en_path
  en_path=$(echo "$fr_path" | sed "s|$DOCS_FR|$DOCS_EN|")
  if [[ -f "$en_path" ]] || [[ -d "$(dirname "$en_path")" ]]; then
    local en_prompt
    en_prompt="Translate from French to English. Keep MDX structure, code blocks,
frontmatter. Translate title, description, comments. Return ONLY the file.

$updated"

    local translated exit_code_en=0
    translated=$(echo "$en_prompt" | claude -p --model "$MODEL_WRITE" 2>/dev/null) || exit_code_en=$?

    if [[ $exit_code_en -ne 0 ]]; then
      log "WARNING: EN translation Claude exited with code $exit_code_en"
    elif [[ -z "$translated" ]] || echo "$translated" | head -1 | grep -qv '^---'; then
      die "Claude returned invalid content for EN translation of $TARGET_FILE — file NOT overwritten"
    else
      mkdir -p "$(dirname "$en_path")"
      printf '%s\n' "$translated" > "$en_path"
      log "Wrote EN: $en_path"
    fi
  fi
}

# ============================================================================
# STEP 6 — Re-render Mermaid diagrams to SVG
# ============================================================================
#
# Instead of relying on client-side Mermaid (CDN, fragile JS parsing),
# we pre-render all ```mermaid blocks to static SVG files.
#
# Known gotchas with mmdc (Mermaid CLI):
#   - "Loop" is a reserved keyword — use "AL" or "AgentLoop" as participant
#   - "break" needs an "end" — use "Note over X: Done" instead
#   - \n in labels doesn't work — remove or use single-line labels
#   - <br/> in edge labels (between |...|) crashes the parser
#   - Angle brackets in text crash MDX — always escape

render_svgs() {
  step "Step 6 — Rendering Mermaid diagrams to SVG"

  mkdir -p "$DIAGRAMS"
  local tmp_dir
  tmp_dir=$(mktemp -d)
  local pass=0 fail=0

  # Find all .mdx files with mermaid blocks (FR only — EN shares same SVGs)
  while IFS= read -r file; do
    local base
    base=$(basename "$file" .mdx)
    [[ "$base" == "$(basename "$file" .md)" ]] || base=$(basename "$file" .md)
    local idx=0
    local in_block=false
    local content=""

    while IFS= read -r line; do
      if [[ "$line" == '```mermaid' ]]; then
        in_block=true
        content=""
        continue
      fi
      if $in_block && [[ "$line" == '```' ]]; then
        in_block=false
        idx=$((idx + 1))
        local name="${base}-${idx}"
        echo "$content" > "$tmp_dir/${name}.mmd"

        if npx --yes @mermaid-js/mermaid-cli \
          -i "$tmp_dir/${name}.mmd" \
          -o "$DIAGRAMS/${name}.svg" \
          --backgroundColor transparent -q 2>/dev/null; then
          log "  OK: ${name}.svg"
          pass=$((pass + 1))
        else
          log "  FAIL: ${name}.svg (check $tmp_dir/${name}.mmd)"
          fail=$((fail + 1))
        fi
        continue
      fi
      if $in_block; then
        content="${content}${line}
"
      fi
    done < "$file"
  done < <(find "$DOCS_FR" -name '*.mdx' -exec grep -l '```mermaid' {} \;)

  # Also render standalone .mmd files from docs/diagrams/
  for mmd in "$ROOT"/docs/diagrams/*.mmd; do
    [[ -f "$mmd" ]] || continue
    local name="standalone-$(basename "$mmd" .mmd)"
    if npx --yes @mermaid-js/mermaid-cli \
      -i "$mmd" \
      -o "$DIAGRAMS/${name}.svg" \
      --backgroundColor transparent -q 2>/dev/null; then
      log "  OK: ${name}.svg"
      pass=$((pass + 1))
    else
      log "  FAIL: ${name}.svg"
      fail=$((fail + 1))
    fi
  done

  rm -rf "$tmp_dir"
  log "Done: $pass rendered, $fail failed"
}

# ============================================================================
# STEP 7 — Sync and build
# ============================================================================
#
# Run the existing sync-docs.js (updates AUTO sections in docs/*.md),
# then build the Starlight site to catch any errors.

sync_and_build() {
  step "Step 7 — Sync and build"

  log "Running npm run docs:sync..."
  npm --prefix "$ROOT" run docs:sync 2>&1 | tail -3

  log "Building docs-site..."
  npm --prefix "$ROOT/docs-site" run build 2>&1 | tail -5

  # Save timestamp for next run
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LASTRUN"
  log "Saved lastrun timestamp to $LASTRUN"
}

# ============================================================================
# MAIN — Orchestrate the pipeline
# ============================================================================

main() {
  echo "docs-update.sh — webmcp-auto-ui documentation updater"
  echo ""

  case "$MODE" in
    svg-only)
      render_svgs
      ;;
    file)
      create_snapshot
      apply_single_file
      render_svgs
      sync_and_build
      ;;
    auto|all)
      create_snapshot
      detect_changes
      generate_manifest
      validate_manifest
      apply_updates
      render_svgs
      sync_and_build
      ;;
  esac

  echo ""
  echo "Done."
}

main
