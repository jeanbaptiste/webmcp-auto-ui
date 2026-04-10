---
title: "component()"
description: Unified tool exposing 56 components to the LLM, smart vs explicit mode
sidebar:
  order: 2
---

`component()` is the unified tool that exposes 56 components (31 renderable, 25 non-renderable) to the LLM. In smart mode, it is the only visible UI tool.

## Smart vs explicit mode

| | Smart (default) | Explicit |
|--|---------------|----------|
| **UI tools** | 1 single: `component()` | 31 `render_*` + `component()` |
| **Discovery** | `component("help")` to list | LLM sees all tools |
| **Schema tokens** | ~200 tokens | ~3000 tokens |
| **Recommended for** | Cloud (Claude) | WASM (Gemma) or debug |

## Three call modes

### Global discovery

```
component("help")
```

Returns the list of 56 components with name, description, and `renderable` flag.

### Targeted discovery

```
component("help", "stat-card")
```

Returns the detailed schema, description and renderability of a specific component.

### Rendering

```
component("stat-card", { label: "Revenue", value: "$142K" })
```

Renders the component on the canvas via the `onBlock` callback.

## Component names

Names use dashes: `stat-card`, `data-table`, `chart-rich`. Legacy `render_*` names are accepted for backward compatibility.

### Canvas actions

| Short name | Legacy equivalent |
|-----------|------------------|
| `clear` | `clear_canvas` |
| `update` | `update_block` |
| `move` | `move_block` |
| `resize` | `resize_block` |
| `style` | `style_block` |

## Renderable components (31)

All block types used by `BlockRenderer`:

| Component | Description |
|-----------|-------------|
| `stat` | Single metric with trend |
| `kv` | Key-value pairs |
| `list` | Bulleted list |
| `chart` | Simple bar chart |
| `alert` | Alert banner |
| `code` | Code block |
| `text` | Text paragraph |
| `actions` | Action buttons |
| `tags` | Tag collection |
| `stat-card` | Enhanced stat with color |
| `data-table` | Sortable table |
| `timeline` | Event timeline |
| `profile` | Profile card |
| `trombinoscope` | Portrait grid |
| `json-viewer` | Interactive JSON tree |
| `hemicycle` | Parliament hemicycle |
| `chart-rich` | Multi-type chart |
| `cards` | Card grid |
| `grid-data` | Spreadsheet grid |
| `sankey` | Flow diagram |
| `map` | Leaflet map |
| `d3` | D3 widget (presets) |
| `log` | Log viewer |
| `gallery` | Image gallery |
| `carousel` | Slide carousel |
| `clear` | Clear the canvas |
| `update` | Update a block |
| `move` | Move a block |
| `resize` | Resize a block |
| `style` | Style a block |

## Non-renderable components (25)

Svelte components (primitives, base UI, layouts, agent UI, theme). They return their schema and a usage hint via `component("help", "name")`.

## API

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

### Register a custom component

```ts
componentRegistry.set('my-widget', {
  name: 'my-widget',
  toolName: 'my-widget',
  description: 'Custom widget.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
  renderable: false,
});
```

## ComponentAdapter

Filters components exposed to the LLM in explicit mode. Available presets:

```ts
import { ComponentAdapter, minimalPreset, nativePreset, allNativePreset } from '@webmcp-auto-ui/agent';

// Minimal: stat, kv, chart, table, text + clear, update
const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());

// By groups
adapter.registerAll(nativePreset('simple', 'rich', 'canvas'));

// Full
adapter.registerAll(allNativePreset());
```

### Groups

| Group | Components |
|-------|-----------|
| `simple` | stat, kv, list, chart, alert, code, text, actions, tags |
| `rich` | table, timeline, profile, trombinoscope, json, hemicycle, chart-rich, cards, sankey, log, stat-card, grid |
| `media` | gallery, carousel, map |
| `advanced` | d3, js-sandbox |
| `canvas` | clear, update, move, resize, style |

## Complete flow

```
1. App creates UILayer with or without ComponentAdapter
2. buildToolsFromLayers() generates AnthropicTool[]
3. LLM receives component() as the single UI tool (smart mode)
4. LLM calls component("help") -> discovery
5. LLM calls component("stat-card", {label, value}) -> render
6. onBlock callback -> canvas displays the block
```
