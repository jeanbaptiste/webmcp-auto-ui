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

Lightweight data blocks used by `BlockRenderer`. Each maps to a `render_*` agent tool.

| Component | Block type | Agent tool | Description |
|-----------|-----------|------------|-------------|
| `StatBlock` | `stat` | `render_stat` | Single KPI with trend indicator |
| `KVBlock` | `kv` | `render_kv` | Key-value pairs table |
| `ListBlock` | `list` | `render_list` | Ordered list of items |
| `ChartBlock` | `chart` | `render_chart` | Simple bar chart |
| `AlertBlock` | `alert` | `render_alert` | Alert banner (info/warn/error) |
| `CodeBlock` | `code` | `render_code` | Syntax-highlighted code block |
| `TextBlock` | `text` | `render_text` | Free-form text paragraph |
| `ActionsBlock` | `actions` | `render_actions` | Row of action buttons |
| `TagsBlock` | `tags` | `render_tags` | Group of tags/badges |

### Rich widgets

Complex visualizations for data-heavy use cases.

| Component | Block type | Agent tool | Description |
|-----------|-----------|------------|-------------|
| `StatCard` | `stat-card` | -- | Enhanced stat with sparkline |
| `DataTable` | `data-table` | `render_table` | Sortable data table |
| `Timeline` | `timeline` | `render_timeline` | Event chronology with statuses |
| `ProfileCard` | `profile` | `render_profile` | Profile card with avatar, fields, stats |
| `Trombinoscope` | `trombinoscope` | `render_trombinoscope` | Grid of portrait cards |
| `JsonViewer` | `json-viewer` | `render_json` | Interactive JSON tree |
| `Hemicycle` | `hemicycle` | `render_hemicycle` | SVG parliament hemicycle |
| `Chart` | `chart-rich` | `render_chart_rich` | Multi-series chart (bar/line/area/pie/donut) |
| `Cards` | `cards` | `render_cards` | Grid of content cards |
| `GridData` | `grid-data` | -- | Data grid layout |
| `Sankey` | `sankey` | `render_sankey` | D3 Sankey flow diagram |
| `MapView` | `map` | -- | Leaflet map with markers |
| `D3Widget` | `d3` | `render_d3` | D3 presets (hex-heatmap, radial, treemap, force) |
| `LogViewer` | `log` | `render_log` | Log stream with levels and timestamps |
| `Gallery` | `gallery` | `render_gallery` | Image gallery with lightbox |
| `Carousel` | `carousel` | `render_carousel` | Slide carousel with auto-play |

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
| `GemmaLoader` | Floating overlay with progress stream; auto-collapses to a pill once the model is loaded |
| `TokenBubble` | Real-time metrics display: req/min, input tokens/min, output tokens/min, cached tokens |
| `EphemeralBubble` | Transient notification bubble (moved from app to package for reuse) |
| `RemoteMCPserversDemo` | MCP server discovery component listing available demo servers from `MCP_DEMO_SERVERS` |
| `SettingsPanel` | Sliders with dynamic ranges for temperature, topK, and maxTokens controls |

### BlockRenderer

```svelte
<script>
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
</script>

<BlockRenderer type="stat" data={{ label: 'Users', value: '1,204', trend: '+5%', trendDir: 'up' }} />
<BlockRenderer type="chart" data={{ title: 'Revenue', bars: [['Q1', 100], ['Q2', 140]] }} />
```

`BlockRenderer` dispatches `{ type, data }` to the matching widget component. It is the single rendering entry point used by the canvas.

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

Pass a `theme.json` object to override specific tokens:

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
// later: unregister()
```

### Send a message

```ts
// To a specific component
bus.send('my-panel', 'my-chart', 'data', { values: [1, 2, 3] });

// Broadcast to all listeners on a channel
bus.broadcast('my-panel', 'theme', { mode: 'dark' });
```

### Subscribe without registering a component

```ts
const unsub = bus.subscribe(['data'], (msg) => {
  console.log('Data update:', msg.payload);
});
```

### Inspect the bus

```ts
bus.listPeers();  // [{ id: 'my-chart', type: 'Chart' }, ...]
bus.peerCount;    // 3
bus.lastMessage;  // most recent BusMessage or null
```

### BusMessage shape

```ts
interface BusMessage {
  from: string;       // sender ID
  to: string | '*';   // target ID or broadcast
  channel: string;    // channel name
  payload: unknown;   // message data
  timestamp: number;  // Date.now()
}
```
