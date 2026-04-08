# Composing UIs -- Agent Guide

> This document is designed to be injected into an AI agent's context. It contains everything needed to compose a UI from blocks using webmcp-auto-ui.

## What is a Composed UI?

A composed UI is a collection of **blocks** arranged in sequence. Each block is a set of instructions for specific tools, expressed as a `type` and a `data` object. The `BlockRenderer` component renders each block visually by dispatching it to the appropriate widget based on its type.

## The 24 Block Types

### Simple Blocks (9)

| Type | Description | Minimal data |
|------|-------------|-------------|
| `stat` | Single metric with optional trend | `{"label":"Revenue","value":"$142K","trend":"+12%","trendDir":"up"}` |
| `kv` | Key-value pair list | `{"title":"Info","rows":[["Status","Active"],["Uptime","99.9%"]]}` |
| `list` | Bulleted text list | `{"title":"Tasks","items":["Deploy API","Run tests"]}` |
| `chart` | Simple bar chart | `{"title":"Sales","bars":[["Q1",80],["Q2",120],["Q3",95]]}` |
| `alert` | Alert banner with level | `{"title":"Warning","message":"Disk usage at 90%","level":"warn"}` |
| `code` | Syntax-highlighted code block | `{"lang":"json","content":"{\"key\": \"value\"}"}` |
| `text` | Plain text paragraph | `{"content":"This is a description paragraph."}` |
| `actions` | Row of action buttons | `{"buttons":[{"label":"Approve","primary":true},{"label":"Reject"}]}` |
| `tags` | Tag/chip collection | `{"label":"Tags","tags":[{"text":"prod","active":true},{"text":"v2.1"}]}` |

### Rich Blocks (15)

| Type | Description | Minimal data |
|------|-------------|-------------|
| `stat-card` | Stat with variant color and trend | `{"label":"Users","value":8204,"variant":"success","trend":"up","delta":"+3.2%"}` |
| `data-table` | Sortable data table | `{"title":"Users","columns":[{"key":"name","label":"Name"},{"key":"email","label":"Email"}],"rows":[{"name":"Alice","email":"a@b.com"}]}` |
| `timeline` | Vertical timeline | `{"title":"History","events":[{"date":"2024-01","title":"Launch","status":"done"},{"date":"2024-03","title":"v2.0","status":"active"}]}` |
| `profile` | User profile card | `{"name":"Jane Doe","subtitle":"Engineer","fields":[{"label":"Email","value":"j@co.com"}],"stats":[{"label":"Projects","value":"12"}]}` |
| `trombinoscope` | People grid with avatars | `{"title":"Team","people":[{"name":"Alice","subtitle":"Lead"},{"name":"Bob","subtitle":"Dev"}],"columns":3}` |
| `json-viewer` | Interactive JSON tree | `{"title":"Response","data":{"status":"ok","items":[1,2,3]}}` |
| `hemicycle` | Parliamentary hemicycle chart | `{"title":"Assembly","groups":[{"id":"a","label":"Party A","seats":120,"color":"#3b82f6"},{"id":"b","label":"Party B","seats":80,"color":"#ef4444"}]}` |
| `chart-rich` | Multi-type chart (bar/line/area/pie/donut) | `{"title":"Revenue","type":"line","labels":["Jan","Feb","Mar"],"data":[{"label":"2024","values":[10,20,30]}]}` |
| `cards` | Card grid with images | `{"title":"Products","cards":[{"title":"Widget","description":"A useful widget","tags":["new"]}]}` |
| `grid-data` | Spreadsheet-like grid | `{"title":"Matrix","columns":[{"key":"a","label":"A"},{"key":"b","label":"B"}],"rows":[[1,2],[3,4]]}` |
| `sankey` | Flow diagram (sankey-style) | `{"title":"Traffic","nodes":[{"id":"a","label":"Google"},{"id":"b","label":"Site"}],"links":[{"source":"a","target":"b","value":500}]}` |
| `map` | Interactive Leaflet map | `{"title":"Offices","center":{"lat":48.85,"lng":2.35},"zoom":5,"markers":[{"lat":48.85,"lng":2.35,"label":"Paris"}]}` |
| `log` | Log viewer with levels | `{"title":"Logs","entries":[{"timestamp":"10:30:01","level":"info","message":"Server started"},{"level":"error","message":"Connection refused"}]}` |
| `gallery` | Image gallery with lightbox | `{"title":"Photos","images":[{"src":"https://picsum.photos/400/300","caption":"Sample"}],"columns":3}` |
| `carousel` | Slide carousel with autoplay | `{"title":"Slides","slides":[{"src":"https://picsum.photos/800/400","title":"Slide 1"}],"autoPlay":true,"interval":4000}` |

## Composing a Skill (Recipe)

A skill is a JSON object combining blocks with metadata:

```json
{
  "name": "kpi-dashboard",
  "description": "Key metrics overview",
  "mcp": "https://mcp.example.com/mcp",
  "mcpName": "my-server",
  "llm": "claude-sonnet",
  "tags": ["kpi", "dashboard"],
  "theme": {
    "color-accent": "#2563eb"
  },
  "blocks": [
    { "type": "stat", "data": { "label": "Revenue", "value": "$142K", "trend": "+12%", "trendDir": "up" } },
    { "type": "stat", "data": { "label": "Users", "value": "8,204", "trend": "+3.2%", "trendDir": "up" } },
    { "type": "chart", "data": { "title": "Monthly Revenue", "bars": [["Jan",80],["Feb",95],["Mar",120]] } }
  ]
}
```

Fields:
- `name` (required): skill identifier
- `description` (optional): human-readable description
- `mcp` (optional): MCP server URL
- `mcpName` (optional): display name for the MCP server
- `llm` (optional): preferred LLM model (`claude-haiku`, `claude-sonnet`, `gemma-e2b`, `auto`)
- `tags` (optional): array of string tags
- `theme` (optional): flat token overrides (`{"color-accent": "#2563eb"}`)
- `blocks` (required): array of `{ type, data }` objects

## HyperSkill URL Encoding

Skills can be encoded into a URL parameter `?hs=` for sharing:

- The skill is serialized as JSON
- If < 6KB: base64 encoded directly
- If >= 6KB: gzip compressed, then base64 encoded with `gz.` prefix

URL format: `https://domain.com/viewer?hs=<base64>` or `https://domain.com/composer?hs=<base64>`

To decode: read the `hs` query param, check for `gz.` prefix, decompress if needed, base64-decode, JSON.parse.

## Workflow: Building a Dashboard

When a designer says "I want a KPI dashboard":

1. Identify the key metrics -- use `stat` blocks (3-4 max at the top)
2. Add a chart for trends -- use `chart` (simple) or `chart-rich` (multi-series, pie, line)
3. Add a data table for details -- use `data-table` for tabular data
4. Add contextual info -- use `kv` for metadata pairs, `alert` for warnings
5. Wrap with a theme if branding matters

## Composition Examples

### Dashboard KPI (3 stats + chart)

```json
{
  "blocks": [
    { "type": "stat", "data": { "label": "Revenue", "value": "$142K", "trend": "+12.4%", "trendDir": "up" } },
    { "type": "stat", "data": { "label": "Users", "value": "8,204", "trend": "+3.2%", "trendDir": "up" } },
    { "type": "stat", "data": { "label": "Churn", "value": "2.1%", "trend": "-0.4%", "trendDir": "down" } },
    { "type": "chart-rich", "data": { "title": "Revenue Trend", "type": "area", "labels": ["Jan","Feb","Mar","Apr"], "data": [{ "label": "2024", "values": [98,112,128,142] }] } }
  ]
}
```

### User Profile (profile + timeline + stats)

```json
{
  "blocks": [
    { "type": "profile", "data": { "name": "Jane Doe", "subtitle": "Senior Engineer", "badge": { "text": "Active", "variant": "success" }, "fields": [{ "label": "Email", "value": "jane@example.com" }, { "label": "Team", "value": "Platform" }], "stats": [{ "label": "Projects", "value": "12" }, { "label": "Commits", "value": "847" }] } },
    { "type": "timeline", "data": { "title": "Activity", "events": [{ "date": "2024-03-15", "title": "Promoted to Senior", "status": "done" }, { "date": "2024-01-10", "title": "Shipped v3.0", "status": "done" }, { "date": "2023-09-01", "title": "Joined team", "status": "done" }] } }
  ]
}
```

### Monitoring (alert + kv + log)

```json
{
  "blocks": [
    { "type": "alert", "data": { "title": "Database degraded", "message": "High latency on primary-eu. Investigating.", "level": "warn" } },
    { "type": "kv", "data": { "title": "Service Status", "rows": [["API","OK"],["Database","Degraded"],["CDN","OK"],["Queue","Warning"]] } },
    { "type": "log", "data": { "title": "Recent Logs", "entries": [{ "timestamp": "14:32:01", "level": "error", "source": "db", "message": "Connection timeout after 5000ms" }, { "timestamp": "14:31:45", "level": "warn", "source": "api", "message": "Slow query detected: 3200ms" }, { "timestamp": "14:30:00", "level": "info", "source": "cdn", "message": "Cache purge completed" }] } }
  ]
}
```

## Unified `component` tool

Instead of calling individual `render_*` tools, you can use the unified `component` tool:

- `component("help")` -- list all available components
- `component("help", "stat-card")` -- get the schema for a specific component
- `component("stat-card", { label: "Revenue", value: "$142K" })` -- render a component

Both approaches (individual `render_*` tools and unified `component`) work simultaneously.

The `component` tool also exposes canvas actions under short names:

| Short name | Equivalent tool |
|------------|-----------------|
| `clear` | `clear_canvas` |
| `update` | `update_block` |
| `move` | `move_block` |
| `resize` | `resize_block` |
| `style` | `style_block` |

Component names use dashes instead of underscores (e.g. `stat-card` instead of `render_stat_card`). The original `render_*` names are also accepted for backward compatibility.

### All registered components

The `component("help")` response includes **all** components in the system, not just the renderable widgets. Each entry includes a `renderable` flag:

- **renderable: true** — can be rendered via the agent tool pipeline (all `render_*` tools + canvas actions)
- **renderable: false** — Svelte component available for direct usage via `@webmcp-auto-ui/ui`, but cannot be rendered through `component("name", {...})`. Calling render on these returns their schema and a usage hint instead.

#### Primitives (layout containers)

| Name | Description |
|------|-------------|
| `card` | Container card with optional header and footer slots |
| `grid-layout` | Responsive grid layout (stacks on mobile) |
| `list-primitive` | Scrollable list container with item snippet |
| `panel` | Panel with optional title header |
| `window` | Window with draggable title bar |

#### Base (shadcn-style UI primitives)

| Name | Description |
|------|-------------|
| `button` | Button with variants: default, outline, destructive, ghost |
| `input` | Text input field |
| `badge` | Badge/tag with variants: default, success, warning, destructive, outline |
| `select` | Native dropdown select |
| `tooltip` | Tooltip on hover |
| `dialog` | Modal dialog overlay |

#### Layouts (window manager)

| Name | Description |
|------|-------------|
| `tiling-layout` | Tiling window manager layout |
| `floating-layout` | Floating drag-and-drop window manager |
| `stack-layout` | Stacked vertical scroll or single-window layout |
| `pane` | Window pane with title bar, badge, fold/close actions |

#### Agent UI

| Name | Description |
|------|-------------|
| `llm-selector` | LLM model dropdown grouped by type |
| `mcp-status` | MCP connection status indicator |
| `mcp-connector` | MCP connection form with URL/token/status |
| `agent-progress` | Agent progress bar (time, tools, tokens/sec) |
| `gemma-loader` | Gemma WASM model loader with progress |
| `chat-panel` | Full chat panel with feed, progress, and input |
| `agent-console` | Collapsible agent debug console |
| `settings-panel` | Agent settings (system prompt, tokens, cache) |
| `remote-mcp-servers` | Remote MCP server list with connect/disconnect |

#### Theme

| Name | Description |
|------|-------------|
| `theme-provider` | Theme provider (dark/light) with CSS custom properties |

## Constraints

- Block `type` must be one of the 24 valid types listed above.
- Block `data` must match the expected shape for that type (see the ui-widgets.md agent guide for full specs).
- Blocks are rendered in order, top to bottom.
- Keep skill size under ~6KB before gzip for HyperSkill URL encoding (browser URL length limits).
- `stat` blocks work best in groups of 2-4 for visual rhythm.
- `data-table` supports up to 200 displayed rows (overflow is indicated).

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Using `chart` when you need multiple datasets | `chart` only supports single-series bars | Use `chart-rich` with `data` array for multi-series |
| Putting too many blocks (10+) in one skill | Overwhelming UI, slow rendering | Split into focused skills or use tabs |
| Missing `type` field on a block | BlockRenderer shows `[undefined]` placeholder | Always include `type` on every block |
| Wrong data shape for block type | Widget renders empty or errors silently | Check the expected interface for each type |
| Using `chart-rich` type as `chart` | Renders as simple bar chart, ignoring pie/line config | Use type `chart-rich` for Chart.svelte, `chart` for ChartBlock.svelte |
