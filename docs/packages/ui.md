# @webmcp-auto-ui/ui

34+ Svelte 5 components: theme system, primitives, block widgets, rich visualizations, and a window manager.

## Component catalog

### Theme

| Export | Type | Description |
|--------|------|-------------|
| `ThemeProvider` | Component | Wraps the app, injects CSS variables for theming |
| `getTheme()` | Function | Returns current theme tokens from context |
| `DARK_TOKENS` | Object | Dark mode token values |
| `LIGHT_TOKENS` | Object | Light mode token values |
| `THEME_MAP` | Object | Maps theme names to token sets |

### Base (shadcn-svelte pattern)

Built on `bits-ui` + `tailwind-variants`. Drop-in accessible primitives.

| Component | Description |
|-----------|-------------|
| `Button` | Button with variants (default, destructive, outline, ghost, link) |
| `Input` | Text input with label/error states |
| `Badge` | Inline badge with color variants |
| `NativeSelect` | Native `<select>` wrapper |
| `Tooltip` | Hover tooltip |
| `Dialog` | Modal dialog (+ `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`) |

### Primitives

Layout and container components.

| Component | Description |
|-----------|-------------|
| `Card` | Themed card container with optional header/footer |
| `GridLayout` | CSS grid wrapper with responsive columns |
| `List` | Ordered/unordered list renderer |
| `Panel` | Collapsible panel with title bar |
| `Window` | Draggable/resizable window chrome |

### Simple blocks

Lightweight data blocks. Each maps to a widget type.

| Component | Widget type | Description |
|-----------|-----------|-------------|
| `StatBlock` | `stat` | Single KPI with trend indicator |
| `KVBlock` | `kv` | Key-value pairs table |
| `ListBlock` | `list` | Ordered list of items |
| `ChartBlock` | `chart` | Simple bar chart |
| `AlertBlock` | `alert` | Alert banner (info/warn/error) |
| `CodeBlock` | `code` | Syntax-highlighted code block |
| `TextBlock` | `text` | Free-form text paragraph |
| `ActionsBlock` | `actions` | Row of action buttons |
| `TagsBlock` | `tags` | Group of tags/badges |

### Rich widgets

Complex visualizations for data-heavy use cases.

| Component | Widget type | Description |
|-----------|-----------|-------------|
| `StatCard` | `stat-card` | Enhanced stat with sparkline |
| `DataTable` | `data-table` | Sortable data table |
| `Timeline` | `timeline` | Event chronology with statuses |
| `ProfileCard` | `profile` | Profile card with avatar, fields, stats |
| `Trombinoscope` | `trombinoscope` | Grid of portrait cards |
| `JsonViewer` | `json-viewer` | Interactive JSON tree |
| `Hemicycle` | `hemicycle` | SVG parliament hemicycle |
| `Chart` | `chart-rich` | Multi-series chart (bar/line/area/pie/donut) |
| `Cards` | `cards` | Grid of content cards |
| `GridData` | `grid-data` | Data grid layout |
| `Sankey` | `sankey` | D3 Sankey flow diagram |
| `MapView` | `map` | Leaflet map with markers |
| `D3Widget` | `d3` | D3 presets (hex-heatmap, radial, treemap, force) |
| `JsSandbox` | `js-sandbox` | Sandboxed JavaScript execution |
| `LogViewer` | `log` | Log stream with levels and timestamps |
| `Gallery` | `gallery` | Image gallery with lightbox |
| `Carousel` | `carousel` | Slide carousel with auto-play |

### Window Manager

| Component | Description |
|-----------|-------------|
| `Pane` | Window pane with title bar, resize handles, close/minimize |
| `TilingLayout` | Automatic tiling layout (splits panes horizontally/vertically) |
| `FloatingLayout` | Free-form floating windows with z-index management, collapse/expand (double-click), fit-to-content button |
| `FlexLayout` | Auto-grid layout with size slider for adjusting block dimensions |
| `StackLayout` | Tabbed stack layout (one pane visible at a time) |

### Agent UI Widgets

| Component | Description |
|-----------|-------------|
| `ModelLoader` | Floating overlay with progress stream; auto-collapses to a pill once the model is loaded |
| `TokenBubble` | Real-time metrics display: req/min, input tokens/min, output tokens/min, cached tokens |
| `EphemeralBubble` | Transient notification bubble (moved from app to package for reuse) |
| `RemoteMCPserversDemo` | MCP server discovery component listing available demo servers from `MCP_DEMO_SERVERS` |
| `SettingsPanel` | Sliders with dynamic ranges for temperature, topK, maxTokens; displays effectivePrompt in readonly |
| `AgentConsole` | Scrollable agent log panel with iteration markers, tool calls, text output and token metrics |

## WidgetRenderer

`WidgetRenderer` is the primary rendering entry point. It dispatches `{ type, data }` to the matching widget component, with support for custom renderers from WebMCP servers.

```svelte
<script>
  import { WidgetRenderer } from '@webmcp-auto-ui/ui';
</script>

<WidgetRenderer type="stat" data={{ label: 'Users', value: '1,204', trend: '+5%', trendDir: 'up' }} />
<WidgetRenderer type="chart" data={{ title: 'Revenue', bars: [['Q1', 100], ['Q2', 140]] }} />
```

### Props

```ts
interface Props {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  servers?: WebMcpServer[];           // custom WebMCP servers for resolution
  oninteract?: (type: string, action: string, payload: unknown) => void;
}
```

### Resolution order

1. **Custom servers** — If `servers` is provided, looks for a matching widget in each server (first match wins)
2. **NATIVE_MAP** — Falls back to the built-in 26 native widget components
3. **Fallback** — Renders `[type]` text if no match found

### `servers` prop

Pass connected WebMCP servers to allow custom widget resolution:

```svelte
<script>
  import { WidgetRenderer } from '@webmcp-auto-ui/ui';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';

  let { servers }: { servers: WebMcpServer[] } = $props();
</script>

{#each widgets as widget}
  <WidgetRenderer type={widget.type} data={widget.data} {servers} />
{/each}
```

### WebMCP tool auto-registration

Each `WidgetRenderer` instance automatically registers 3 tools on `navigator.modelContext` (if available):
- `widget_{id}_get` — Read current widget data
- `widget_{id}_update` — Update widget data
- `widget_{id}_remove` — Remove widget from view

### FONC message bus

Each instance auto-registers on the FONC message bus, listening on `data-update`, `interact`, and `*` channels.

## BlockRenderer (deprecated)

`BlockRenderer` is deprecated in favor of `WidgetRenderer`. It remains exported for backward compatibility but does not support the `servers` prop.

```svelte
<!-- Deprecated — use WidgetRenderer instead -->
<BlockRenderer type="stat" data={{ label: 'Users', value: '1,204' }} />
```

### NATIVE_MAP

The static map of 26 native widget types to Svelte components is unchanged. All entries from `stat` to `js-sandbox` are supported.

## Theming

### Setup

Wrap your app with `ThemeProvider`:

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

### Accessing tokens

```svelte
<script>
  import { getTheme } from '@webmcp-auto-ui/ui';
  const theme = getTheme();
</script>

<div style:color={theme.primary}>Themed text</div>
```

## FONC message bus

Inter-component messaging inspired by Alan Kay's FONC/STEPS. Components never call each other directly.

```ts
import { bus } from '@webmcp-auto-ui/ui';
import type { BusMessage } from '@webmcp-auto-ui/ui';
```

### Register a component

```ts
const unregister = bus.register(
  'my-chart',        // unique ID
  'Chart',           // component type
  ['data', 'theme'], // channels to listen on
  (msg: BusMessage) => {
    console.log(`Received ${msg.channel} from ${msg.from}:`, msg.payload);
  }
);
```

### Send a message

```ts
bus.send('my-panel', 'my-chart', 'data', { values: [1, 2, 3] });
bus.broadcast('my-panel', 'theme', { mode: 'dark' });
```

### BusMessage shape

```ts
interface BusMessage {
  from: string;
  to: string | '*';
  channel: string;
  payload: unknown;
  timestamp: number;
}
```
