# Re-audit — sub-issues SYNTHESIS

## Summary
- ✅ Fixed: 7
- 🔴 Still bug: 3
- 🟡 Intentional: 1
- ❓ Unclear: 1

## Items

### 1. loop.ts:405 — toolDef from filtered iterationTools
**Status**: ✅ FIXED
**Evidence**: `packages/agent/src/loop.ts:418`
```ts
const toolDef = activeTools.find(t => t.name === block.name);
```
**Verdict**: Resolution now uses the unfiltered `activeTools`, with an explicit comment (lines 414-416) explaining why iterationTools is unsafe. Auto-repair + schema validation run as expected.

---

### 2. loop.ts:455 — flattenPathMaps from global singleton
**Status**: 🔴 STILL BUG (mitigation incomplete)
**Evidence**: `packages/agent/src/loop.ts:173`
```ts
const localPathMaps = new Map<string, Record<string, string[]>>(flattenPathMaps);
```
**Verdict**: A snapshot is now taken at loop entry (parallel-safe at dispatch time), BUT the loop uses `buildDiscoveryToolsWithAliases` + `activateServerTools` for lazy discovery, neither of which populates `flattenPathMaps`. Only `buildToolsFromLayers` writes to the singleton (tool-layers.ts:355-356). When the loop runs with `schemaOptions.flatten` enabled and lazy discovery, `localPathMaps` is empty (or polluted by stale entries from a prior `buildToolsFromLayers` call elsewhere) — `unflattenParams` is silently skipped at loop.ts:469-471. The fix should populate pathMaps when activating server tools, or have `activateServerTools` return them via a `BuildToolsResult`-shaped value.

---

### 3. loop.ts:636 — trimConversationHistory only purges leading orphans
**Status**: ✅ FIXED
**Evidence**: `packages/agent/src/loop.ts:659-675`
```ts
const validToolUseIds = new Set<string>();
for (let i = 0; i < trimmed.length; i++) { ... }
msg.content = (msg.content as any[]).filter(b => {
  if (b?.type !== 'tool_result') return true;
  return typeof b.tool_use_id === 'string' && validToolUseIds.has(b.tool_use_id);
});
```
**Verdict**: Two-pass interior orphan pruning is now implemented, plus empty-message dropping (line 677-680) and leading-assistant fixup (684-689).

---

### 4. multi-mcp-bridge.ts — bridge dies if getCanvas() null at start()
**Status**: ✅ FIXED
**Evidence**: `packages/core/src/multi-mcp-bridge.ts:124-126`
```ts
// Canvas not ready yet — retry shortly...
setTimeout(() => this.start(), 50);
```
**Verdict**: Retry-on-null with 50ms backoff. `started` flag is set only after subscription succeeds (line 117), so the retry path stays correct.

---

### 5. polyfill.ts — cleanup removes native WebMCP
**Status**: ✅ FIXED
**Evidence**: `packages/core/src/polyfill.ts:50, 836-851`
```ts
didOverride: boolean; // True only when we actually overrode navigator.modelContext
...
if (installState.didOverride) { ... restore or delete ... }
```
**Verdict**: `didOverride` is set only when polyfill actually replaces native (line 796). Cleanup is gated on this flag, so when native was present we never touch navigator.

---

### 6. webmcp-server.ts — layer() mutates builtinTools[widget_display].description
**Status**: ✅ FIXED
**Evidence**: `packages/core/src/webmcp-server.ts:589-598`
```ts
// Clone the tool descriptor rather than mutating builtinTools in place,
// so concurrent layer() calls from different layers do not stomp each
// other's description (the function refs are preserved).
for (const tool of builtinTools) {
  if (tool.name === 'widget_display') {
    allTools.push({ ...tool, description: dynamicDescription });
```
**Verdict**: Spread-clone replaces in-place mutation. Comment confirms intent.

---

### 7. sankey.ts:51-55 — emits widget:node-dblclick, never forwarded
**Status**: 🔴 STILL BUG (cosmetic — no listener)
**Evidence**: `packages/ui/src/widgets/rich/sankey.ts:51-58`
```ts
function emitNodeDblclick(container: HTMLElement, node: SankeyNode): void {
  container.dispatchEvent(new CustomEvent('widget:node-dblclick', {
    detail: { nodeId: node.id, nodeData: node }, bubbles: true,
  }));
}
```
**Verdict**: Source-tree grep finds zero `addEventListener('widget:node-dblclick')` or `on:widget:node-dblclick` consumers in `packages/ui/src` or `apps/*/src` (only the same-pattern emitters in `packages/servers/src/cytoscape/widgets/animated-flow.ts`, `packages/servers/src/d3/widgets/tree.ts`). The event bubbles to the document and is silently dropped. Either wire it through `WidgetRenderer` (translate to `oninteract('node-dblclick', ...)`) or replace with the existing `widget:interact` channel.

---

### 8. d3.ts:404-405 — crashes if data null
**Status**: ✅ FIXED
**Evidence**: `packages/ui/src/widgets/rich/d3.ts:404-410`
```ts
export function render(container: HTMLElement, data: D3Spec): () => void {
  const spec = data;
  if (!spec || !spec.preset) {
    const slot = buildChrome(container, spec?.title);
    slot.innerHTML = '<div class="widget-empty"...>No data</div>';
    return () => { container.innerHTML = ''; };
  }
```
**Verdict**: Null guard with empty-state UI before reaching the preset switch.

---

### 9. WidgetRenderer.svelte:84 — busId = Date.now() collides
**Status**: ✅ FIXED
**Evidence**: `packages/ui/src/widgets/WidgetRenderer.svelte:6-12, 105`
```ts
let busIdCounter = 0;
function makeBusId(widgetType: string): string {
  return `block_${widgetType}_${Date.now()}-${++busIdCounter}`;
}
const busId = id ?? makeBusId(type);
```
**Verdict**: Monotonic counter suffix makes IDs collision-free even on sub-ms remounts. Comment at line 6 calls out the original bug.

---

### 10. hyperskills compress: 'none' option never passed
**Status**: 🔴 STILL BUG (dead code path)
**Evidence**:
- `packages/sdk/src/index.ts:47` → `return encode(base, json, { compress: 'gz' });`
- `packages/sdk/src/stores/canvas.ts:359` → `await encode('https://x.local', json, { compress: 'gz' });`
- `packages/sdk/src/hyperskills.ts:58-60` (the `'none'` branch) is unreachable from any in-tree caller.
**Verdict**: Both wrapper callers hard-code `'gz'`. The "skip gzip for small payloads" optimization at hyperskills.ts:58-60 has no entry point. Either delete the dead branch, or add a size-threshold check in the wrappers (e.g. `compress: json.length < 1024 ? 'none' : 'gz'`).

---

### 11. hyperskills.ts:93 — getHsParam() no SSR guard
**Status**: ✅ FIXED
**Evidence**: `packages/sdk/src/hyperskills.ts:93-94`
```ts
if (typeof window === 'undefined') return null;
return hs.getHsParam();
```
**Verdict**: SSR guard returns `null` before delegating. Note line 87 already SSR-guards the URL-arg path.

---

### 12. canvas.ts:257-269 — setMcpConnected(false) preserves name, clears tools
**Status**: 🟡 INTENTIONAL
**Evidence**: `packages/sdk/src/stores/canvas.ts:264-266`
```ts
_servers = _servers.map((s) => s.primary
  ? { ...s, connected: false, connecting: false, tools: [], error: undefined }
  : s);
```
Downstream UI: `packages/ui/src/agent/McpStatus.svelte:84`
```svelte
{connecting ? 'connecting…' : connected ? name : 'not connected'}
```
**Verdict**: The preserved `name` is gated by `connected` in the only consuming UI (`McpStatus`) — when disconnected the label shows "not connected", not the stale name. Identity (name + url + enabled + primary) is kept on purpose so the reconciler can reconnect to the same logical server. The original "stale UI" claim is not reproducible in current code. If the user sees stale state in another consumer, flag the file/line.

---

## Recommended next actions

1. **Item 2 — pathMaps for lazy discovery** (`packages/agent/src/loop.ts`, `packages/agent/src/tool-layers.ts`)
   - Make `activateServerTools` return `{ tools, pathMaps }` like `buildToolsFromLayers` does, and merge into `localPathMaps` at loop.ts:401.
   - Drop the snapshot from the global singleton at loop.ts:173 once the local accumulation is in place.

2. **Item 7 — sankey node-dblclick wiring** (`packages/ui/src/widgets/rich/sankey.ts`, `packages/ui/src/widgets/WidgetRenderer.svelte`)
   - Either: change the dispatcher to use `widget:interact` with `action: 'node-dblclick'`, picked up by WidgetRenderer's existing interact handler (consistent with `nodeclick`/`linkclick`).
   - Or: add `container.addEventListener('widget:node-dblclick', ...)` in WidgetRenderer that forwards to `oninteract`.

3. **Item 10 — compress: 'none' threshold** (`packages/sdk/src/index.ts:47`, `packages/sdk/src/stores/canvas.ts:359`)
   - Add a size-based switch: `{ compress: json.length < 1024 ? 'none' : 'gz' }` in both call sites — small payloads avoid gzip overhead and decompression delay on iOS Safari.
   - Or delete the `'none'` branch in `hyperskills.ts:58-60` if the optimization isn't wanted.
