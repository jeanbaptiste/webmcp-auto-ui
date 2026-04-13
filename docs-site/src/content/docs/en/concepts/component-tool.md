---
title: "component()"
description: Unified tool exposing 56 components to the LLM, smart vs explicit mode
sidebar:
  order: 2
---

:::caution[Deprecated page]
This page describes the old `component()` / `componentRegistry` API removed in Phase 8. See [Architecture](/guide/architecture/) for the current API based on WebMCP servers and `widget_display`.
:::

Three separate tools expose 56 components (31 renderable, 25 non-renderable) to the LLM. In smart mode, these are the only visible UI tools.

## Smart vs explicit mode

| | Smart (default) | Explicit |
|--|---------------|----------|
| **UI tools** | 3: `list_components()`, `get_component()`, `component()` | 31 `render_*` + `component()` |
| **Discovery** | `list_components()` + `get_component(name)` | LLM sees all tools |
| **Schema tokens** | ~200 tokens | ~3000 tokens |
| **Recommended for** | Cloud (Claude) | WASM (Gemma) or debug |

## Three tools

### list_components() -- Global discovery

```
list_components()
```

Returns the list of 56 components with name, description, and `renderable` flag, plus available recipes.

### get_component(name) -- Detailed schema

```
get_component("stat-card")
```

Returns the detailed JSON schema, description and renderability of a specific component. Call `list_components()` first to see available names.

### component(name, params) -- Rendering

```
component("stat-card", { label: "Revenue", value: "$142K" })
```

Renders the component on the canvas via the `onWidget` callback. Call `get_component(name)` first for the expected parameters.

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

Svelte components (primitives, base UI, layouts, agent UI, theme). They return their schema and a usage hint via `get_component("name")`.

## API

```ts
import { autoui, NATIVE_WIDGET_NAMES } from '@webmcp-auto-ui/agent';
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

## autoui server

The `autoui` server pre-registers all native widgets. Use `autoui.layer()` to get a WebMcpLayer:

```ts
import { autoui } from '@webmcp-auto-ui/agent';

const layer = autoui.layer();
// { protocol: 'webmcp', serverName: 'autoui', tools: [...] }
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
1. App adds autoui.layer() to layers
2. buildToolsFromLayers() generates ProviderTool[]
3. LLM receives discovery tools (search_recipes, list_recipes, etc.)
4. LLM calls widget_display("stat-card", {label, value}) -> render
5. onWidget callback -> canvas displays the widget
```
