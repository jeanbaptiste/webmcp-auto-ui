#!/bin/bash
set -e
cd "$(dirname "$0")/.."
npx tsx scripts/generate-docs.ts "$@"
