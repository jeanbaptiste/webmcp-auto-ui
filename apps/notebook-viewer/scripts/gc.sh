#!/bin/bash
# -----------------------------------------------------------------------------
# notebook-viewer — GC old published notebooks
# Removes any published JSON file older than 365 days.
#
# Install on bot:
#   scp apps/notebook-viewer/scripts/gc.sh bot:/tmp/nb-gc.sh
#   ssh bot 'sudo mv /tmp/nb-gc.sh /opt/webmcp-demos/notebook-viewer/scripts/gc.sh'
#   ssh bot 'sudo chmod +x /opt/webmcp-demos/notebook-viewer/scripts/gc.sh'
#   ssh bot 'sudo chown notebook-viewer:notebook-viewer /opt/webmcp-demos/notebook-viewer/scripts/gc.sh'
#
# Wire via systemd (see apps/notebook-viewer/systemd/notebook-viewer-gc.{service,timer}).
# -----------------------------------------------------------------------------

set -euo pipefail

STORAGE="${NOTEBOOK_STORAGE:-/opt/webmcp-demos/notebook-viewer/storage}"
PUBLISHED_DIR="$STORAGE/published"
MAX_AGE_DAYS="${NOTEBOOK_GC_DAYS:-365}"

if [ ! -d "$PUBLISHED_DIR" ]; then
  echo "[nb-gc] storage dir not found: $PUBLISHED_DIR — nothing to do"
  exit 0
fi

COUNT_BEFORE=$(find "$PUBLISHED_DIR" -type f -name "*.json" | wc -l | tr -d ' ')
find "$PUBLISHED_DIR" -type f -name "*.json" -mtime +"$MAX_AGE_DAYS" -print -delete | wc -l | xargs -I{} echo "[nb-gc] deleted {} file(s) older than $MAX_AGE_DAYS days"
COUNT_AFTER=$(find "$PUBLISHED_DIR" -type f -name "*.json" | wc -l | tr -d ' ')
echo "[nb-gc] $COUNT_BEFORE → $COUNT_AFTER files in $PUBLISHED_DIR"
