---
title: "@webmcp-auto-ui/ui"
description: 34+ Svelte 5 components, theme system, primitives, rich widgets and window manager
sidebar:
  order: 4
---

34+ Svelte 5 components: theme system, primitives, block widgets, rich visualizations, and window manager.

## Theme system

### Setup

```svelte
<script>
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
</script>

<ThemeProvider mode="dark">
  <slot />
</ThemeProvider>
```

### Token override

```svelte
<ThemeProvider mode="dark" overrides={{ '--color-primary': '#ff6600', '--radius': '0.5rem' }}>
  <slot />
</ThemeProvider>
```

### 11 CSS tokens

| Token | Role |
|-------|------|
| `color-bg` | Page background |
| `color-surface` | Card/panel background |
| `color-surface2` | Secondary surface |
| `color-border` | Primary border |
| `color-border2` | Secondary border |
| `color-accent` | Primary accent (buttons, links) |
| `color-accent2` | Secondary accent / danger |
| `color-amber` | Warning, caution |
| `color-teal` | Success, positive |
| `color-text1` | Primary text |
| `color-text2` | Secondary text |

## Base components (shadcn-svelte)

| Component | Description |
|-----------|-------------|
| `Button` | Button with variants (default, destructive, outline, ghost, link) |
| `Input` | Text input with label/error states |
| `Badge` | Inline badge with color variants |
| `NativeSelect` | Native `<select>` wrapper |
| `Tooltip` | Hover tooltip |
| `Dialog` | Modal dialog with header/footer |

## Simple blocks (9)

| Component | Block type | Agent tool | Description |
|-----------|-----------|------------|-------------|
| `StatBlock` | `stat` | `render_stat` | Single KPI with trend |
| `KVBlock` | `kv` | `render_kv` | Key-value pairs |
| `ListBlock` | `list` | `render_list` | Bulleted list |
| `ChartBlock` | `chart` | `render_chart` | Simple bar chart |
| `AlertBlock` | `alert` | `render_alert` | Alert banner |
| `CodeBlock` | `code` | `render_code` | Syntax-highlighted code |
| `TextBlock` | `text` | `render_text` | Text paragraph |
| `ActionsBlock` | `actions` | `render_actions` | Action buttons |
| `TagsBlock` | `tags` | `render_tags` | Tag group |

## Rich widgets (16)

| Component | Block type | Description |
|-----------|-----------|-------------|
| `StatCard` | `stat-card` | Enhanced stat with sparkline |
| `DataTable` | `data-table` | Sortable data table |
| `Timeline` | `timeline` | Event chronology |
| `ProfileCard` | `profile` | Profile card with avatar |
| `Trombinoscope` | `trombinoscope` | Portrait grid |
| `JsonViewer` | `json-viewer` | Interactive JSON tree |
| `Hemicycle` | `hemicycle` | SVG parliament hemicycle |
| `Chart` | `chart-rich` | Multi-series (bar/line/area/pie/donut) |
| `Cards` | `cards` | Content card grid |
| `GridData` | `grid-data` | Spreadsheet grid |
| `Sankey` | `sankey` | D3 Sankey flow diagram |
| `MapView` | `map` | Leaflet map with markers |
| `D3Widget` | `d3` | D3 presets (hex-heatmap, radial, treemap, force) |
| `LogViewer` | `log` | Log stream with levels |
| `Gallery` | `gallery` | Image gallery with lightbox |
| `Carousel` | `carousel` | Slide carousel with auto-play |

## Window Manager

| Component | Description |
|-----------|-------------|
| `Pane` | Window with title bar, resize handles, close/minimize |
| `TilingLayout` | Automatic tiling (horizontal/vertical splits) |
| `FloatingLayout` | Free-form floating windows with z-index, collapse/expand |
| `FlexLayout` | Auto-grid with size slider |
| `StackLayout` | Tabbed stack (one pane visible at a time) |

## Agent UI Widgets

| Component | Description |
|-----------|-------------|
| `GemmaLoader` | Floating overlay with progress bar, auto-collapses to pill |
| `TokenBubble` | Real-time metrics: req/min, input/output tokens |
| `EphemeralBubble` | Transient notification |
| `RemoteMCPserversDemo` | MCP demo server discovery |
| `SettingsPanel` | Sliders for temperature, topK, maxTokens |

## BlockRenderer

Single rendering entry point for blocks:

```svelte
<script>
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
</script>

<BlockRenderer type="stat" data={{ label: 'Users', value: '1,204', trend: '+5%', trendDir: 'up' }} />
<BlockRenderer type="chart" data={{ title: 'Revenue', bars: [['Q1', 100], ['Q2', 140]] }} />
```

`BlockRenderer` dispatches `{ type, data }` to the matching widget component. It is the single rendering entry point used by the canvas.

## FONC message bus

Inter-component messaging bus inspired by Alan Kay's FONC/STEPS. Components never call each other directly.

```ts
import { bus } from '@webmcp-auto-ui/ui';

const unregister = bus.register('my-chart', 'Chart', ['data', 'theme'], (msg) => {
  console.log(`${msg.channel} from ${msg.from}:`, msg.payload);
});

bus.send('my-panel', 'my-chart', 'data', { values: [1, 2, 3] });
bus.broadcast('my-panel', 'theme', { mode: 'dark' });
bus.listPeers();
```
