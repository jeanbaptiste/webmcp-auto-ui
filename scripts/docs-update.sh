#!/bin/bash
exec node "$(dirname "$0")/docs-update.mjs" "$@"
