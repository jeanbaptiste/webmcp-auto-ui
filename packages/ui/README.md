# @webmcp-auto-ui/ui

32 Svelte 5 components for building data-dense interfaces. Built with Tailwind CSS and Svelte 5 runes.

## Components

### Primitives
`Card` · `Panel` · `GridLayout` · `List` · `Window`

Generic layout containers. No data assumptions.

### Simple blocks
`StatBlock` · `KVBlock` · `ListBlock` · `ChartBlock` · `AlertBlock` · `CodeBlock` · `TextBlock` · `ActionsBlock` · `TagsBlock`

Compact single-purpose blocks. Each takes a `data` prop.

### Rich widgets
`StatCard` · `DataTable` · `Timeline` · `ProfileCard` · `Trombinoscope` · `JsonViewer` · `Hemicycle` · `Chart` · `Cards` · `GridData` · `Sankey` · `MapView` · `LogViewer`

Higher-level components with more complex data shapes and interactivity.

### Window manager
`Pane` · `TilingLayout` · `FloatingLayout` · `FlexLayout` · `StackLayout`

Layout containers for multi-pane interfaces. `TilingLayout` uses a Fibonacci spiral. `FlexLayout` provides an auto-grid layout with a size slider for adjusting block dimensions. `FloatingLayout` supports collapse/expand (double-click) and a fit-to-content button.

### Agent UI widgets
`GemmaLoader` · `TokenBubble` · `EphemeralBubble` · `RemoteMCPserversDemo` · `SettingsPanel`

`GemmaLoader` — floating overlay with progress stream, auto-collapses to a pill once model is loaded. `TokenBubble` — real-time metrics display (req/min, input tokens/min, output tokens/min, cached tokens). `EphemeralBubble` — transient notification bubble (moved from app to package). `RemoteMCPserversDemo` — MCP server discovery component listing available demo servers. `SettingsPanel` — sliders with dynamic ranges for temperature, topK, and maxTokens controls.

### BlockRenderer

Dispatches a `type` string and `data` object to the right component. Used by the agent loop to render whatever the LLM asks for.

```svelte
<BlockRenderer type="stat" data={{ label: 'Revenue', value: '€142K', trendDir: 'up' }} />
```

## Install

```bash
npm install @webmcp-auto-ui/ui
```

Requires Svelte 5 and Tailwind CSS.

## Usage

```svelte
<script>
  import { StatCard, DataTable, Timeline, BlockRenderer } from '@webmcp-auto-ui/ui';
</script>

<StatCard spec={{ label: 'Users', value: '8 204', variant: 'success', delta: '+3.2%' }} />
```

Each component accepts a `spec` prop (rich widgets) or `data` prop (simple blocks). See the showcase app at `:5177` for all components with live data.

## License

AGPL-3.0-or-later
