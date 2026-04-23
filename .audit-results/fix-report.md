# Fix report — 3 confirmed bugs from reaudit.md

## Bug 1 — flattenPathMaps empty in lazy-discovery path

**Files changed**:
- `packages/agent/src/tool-layers.ts` — `activateServerTools` now returns `{ tools, pathMaps }` (new `ActivateServerToolsResult` interface). Applies `flattenSchema` to newly-activated tools when `schemaOptions.flatten` is on, and reports the resulting pathMaps to the caller.
- `packages/agent/src/loop.ts`:
  - L173 — replaced the global-singleton snapshot (`new Map(flattenPathMaps)`) with an empty local map; comment updated.
  - L401-405 — destructures `activateServerTools` result and merges returned `pathMaps` into `localPathMaps`.
  - L12 — removed unused `flattenPathMaps` import.

**Notes**:
- Public signature is "extended": old `activateServerTools(...)` callers reading the array directly would break, but the only in-tree caller is `loop.ts`. The re-export from `index.ts` is unchanged. `scripts/generate-diagrams.ts` only references the symbol name.
- The deprecated singleton `flattenPathMaps` is still exported and still populated by `buildToolsFromLayers` for back-compat. Loop no longer reads it.

## Bug 2 — sankey `widget:node-dblclick` had no listener

**Files changed**:
- `packages/ui/src/widgets/rich/sankey.ts`:
  - L10 (header doc) updated to advertise `widget:interact { action: 'node-dblclick' }`.
  - `emitInteract` action union now includes `'node-dblclick'`.
  - `emitNodeDblclick` rewritten to delegate to `emitInteract(container, 'node-dblclick', node)` — same channel as `nodeclick`/`linkclick`, no `WidgetRenderer` change needed.

## Bug 3 — `compress: 'none'` branch was dead

**Files changed**:
- `packages/sdk/src/index.ts:47` — `encodeHyperSkill` now uses `{ compress: json.length < 1024 ? 'none' : 'gz' }`.
- `packages/sdk/src/stores/canvas.ts:359` — `buildHyperskillParam` same threshold.

No other in-tree callers hardcode `compress: 'gz'` (verified by grep over `packages/sdk/src`).

## Build status

| Package | Status |
|---------|--------|
| `@webmcp-auto-ui/agent` | OK (tsc clean) |
| `@webmcp-auto-ui/ui` | OK (svelte-package) |
| `@webmcp-auto-ui/sdk` | OK (svelte-package) |

## Caveats / follow-ups

- Bug 1: any external (out-of-repo) caller of `activateServerTools` that consumed the return as `ProviderTool[]` directly will need updating to `.tools`. Not an issue in this monorepo.
- Bug 1: `flattenPathMaps` singleton is still exported. If no external consumers need it, it can be removed in a future cleanup.
- Bug 3: 1024-byte threshold is a reasonable heuristic but unverified empirically; tune if iOS Safari decompression timings warrant it.
