#!/bin/bash
set -e
cd "$(dirname "$0")/.."
node scripts/generate-docs.mjs "$@"
