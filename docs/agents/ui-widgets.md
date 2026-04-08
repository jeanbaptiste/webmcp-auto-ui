# UI Widgets -- Agent Guide

> This document is designed to be injected into an AI agent's context. It is the exhaustive catalogue of all webmcp-auto-ui widgets with their props and data examples.

## How BlockRenderer Works

The `BlockRenderer` component receives `{ type, data }` and dispatches to the correct widget:
- Simple blocks receive data as the `data` prop
- Rich blocks receive data as the `spec` prop
- Unknown types render a `[type]` placeholder

Each block auto-registers WebMCP tools (`block_<id>_get`, `block_<id>_update`, `block_<id>_remove`) when `navigator.modelContext` is available.

> **Note**: All widgets listed below (plus primitives, base components, layouts, and agent UI) are also accessible via the unified `component()` tool from `@webmcp-auto-ui/agent`. Call `component("help")` to list all 56 components, or `component("help", "stat-card")` to get the schema for a specific one. See [composing.md](composing.md#unified-component-tool) and the [agent package docs](../packages/agent.md#unified-component-tool) for details.

---

## Category: Simple Blocks (9)

### stat -- Single Metric

Displays a single metric value with optional trend indicator.

```typescript
interface StatBlockData {
  label: string;       // metric name
  value: string;       // displayed value
  trend?: string;      // trend text (e.g. "+12%")
  trendDir?: 'up' | 'down' | 'neutral';
}
```

```json
{ "type": "stat", "data": { "label": "Revenue", "value": "$142K", "trend": "+12.4%", "trendDir": "up" } }
```

Use when: displaying a single KPI, metric, or counter.

### kv -- Key-Value Pairs

Displays a list of key-value pairs with a divider between each row.

```typescript
interface KVBlockData {
  title?: string;
  rows: [string, string][];  // array of [key, value] tuples
}
```

```json
{ "type": "kv", "data": { "title": "Server Info", "rows": [["Host", "prod-eu-01"], ["CPU", "42%"], ["Memory", "6.2 GB"]] } }
```

Use when: showing metadata, config values, or property lists.

### list -- Text List

Simple bulleted list of text items.

```typescript
interface ListBlockData {
  title?: string;
  items: string[];
}
```

```json
{ "type": "list", "data": { "title": "Action Items", "items": ["Review PR #42", "Update docs", "Deploy to staging"] } }
```

Use when: displaying ordered or unordered lists of items.

### chart -- Simple Bar Chart

Minimal bar chart with labeled bars.

```typescript
interface ChartBlockData {
  title?: string;
  bars: [string, number][];  // [label, value] tuples
}
```

```json
{ "type": "chart", "data": { "title": "Monthly Sales", "bars": [["Jan", 80], ["Feb", 95], ["Mar", 120], ["Apr", 110]] } }
```

Use when: showing a simple single-series bar chart. For multi-series, pie, line, or area charts, use `chart-rich`.

### alert -- Alert Banner

Colored alert with a level indicator (border-left accent).

```typescript
interface AlertBlockData {
  title?: string;
  message?: string;
  level?: 'info' | 'warn' | 'error';
}
```

```json
{ "type": "alert", "data": { "title": "Deployment failed", "message": "Build step 3 returned exit code 1.", "level": "error" } }
```

Use when: showing warnings, errors, or informational notices.

### code -- Code Block

Monospaced code display with language label.

```typescript
interface CodeBlockData {
  lang?: string;     // language label (display only, no syntax highlighting)
  content?: string;  // code content
}
```

```json
{ "type": "code", "data": { "lang": "sql", "content": "SELECT * FROM users WHERE active = true LIMIT 10;" } }
```

Use when: displaying code snippets, SQL queries, or technical output.

### text -- Text Paragraph

Plain text content block.

```typescript
interface TextBlockData {
  content?: string;
}
```

```json
{ "type": "text", "data": { "content": "This report summarizes Q1 performance across all regions." } }
```

Use when: adding descriptive text between other blocks.

### actions -- Action Buttons

Row of buttons (primary and secondary variants).

```typescript
interface ActionButton { label: string; primary?: boolean; }
interface ActionsBlockData {
  buttons: ActionButton[];
}
```

```json
{ "type": "actions", "data": { "buttons": [{ "label": "Approve", "primary": true }, { "label": "Reject" }, { "label": "Skip" }] } }
```

Use when: presenting action choices to the user.

### tags -- Tag Collection

Horizontal list of tag chips with optional active state.

```typescript
interface TagItem { text: string; active?: boolean; }
interface TagsBlockData {
  label?: string;
  tags: TagItem[];
}
```

```json
{ "type": "tags", "data": { "label": "Filters", "tags": [{ "text": "production", "active": true }, { "text": "staging" }, { "text": "v3.1", "active": true }] } }
```

Use when: showing categories, filters, status badges, or labels.

---

## Category: Rich Widgets (15)

### stat-card -- Enhanced Stat Card

Stat with colored variant, trend object, and previous value.

```typescript
interface StatCardTrend { direction: 'up' | 'down' | 'flat'; value?: string; positive?: boolean; }
interface StatCardSpec {
  label?: string;
  value?: unknown;       // string or number
  unit?: string;
  delta?: string;        // fallback trend text when trend is a string
  trend?: 'up' | 'down' | 'flat' | StatCardTrend;
  previousValue?: unknown;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}
```

```json
{ "type": "stat-card", "data": { "label": "Active Users", "value": 8204, "unit": "users", "trend": { "direction": "up", "value": "+3.2%", "positive": true }, "variant": "success" } }
```

Use when: you need a visually distinct stat card with color-coded variant.

### data-table -- Sortable Table

Full-featured data table with column definitions, sorting, and row click.

```typescript
interface DataTableColumn { key: string; label: string; align?: 'left' | 'center' | 'right'; type?: 'text' | 'number' | 'boolean' | 'link'; }
interface DataTableSpec {
  title?: string;
  columns?: DataTableColumn[];   // auto-inferred from rows if omitted
  rows?: Record<string, unknown>[];
  compact?: boolean;
  striped?: boolean;
  emptyMessage?: string;
}
```

```json
{ "type": "data-table", "data": { "title": "Users", "columns": [{ "key": "name", "label": "Name" }, { "key": "email", "label": "Email" }, { "key": "active", "label": "Active", "type": "boolean" }], "rows": [{ "name": "Alice", "email": "alice@co.com", "active": true }, { "name": "Bob", "email": "bob@co.com", "active": false }] } }
```

Use when: displaying tabular data. Supports up to 200 displayed rows.

### timeline -- Vertical Timeline

Chronological event list with status indicators.

```typescript
interface TimelineEvent {
  date?: string;
  title?: string;
  description?: string;
  status?: 'done' | 'active' | 'pending';
  color?: string;
  href?: string;
  tags?: string[];
}
interface TimelineSpec {
  title?: string;
  events?: TimelineEvent[];
}
```

```json
{ "type": "timeline", "data": { "title": "Project History", "events": [{ "date": "2024-01-15", "title": "Project started", "status": "done" }, { "date": "2024-03-01", "title": "Beta launch", "status": "active" }, { "date": "2024-06-01", "title": "GA release", "status": "pending" }] } }
```

Use when: showing chronological events, history, or process steps.

### profile -- Profile Card

User/entity profile with avatar, fields, stats, and actions.

```typescript
interface ProfileField { label: string; value: string; href?: string; }
interface ProfileStat { label: string; value: string; }
interface ProfileAction { label: string; href?: string; variant?: 'primary' | 'secondary' | 'danger'; }
interface ProfileSpec {
  name?: string;
  subtitle?: string;
  avatar?: { src: string; alt?: string };
  badge?: { text: string; variant?: 'default' | 'success' | 'warning' | 'error' };
  fields?: ProfileField[];
  stats?: ProfileStat[];
  actions?: ProfileAction[];
}
```

```json
{ "type": "profile", "data": { "name": "Jane Doe", "subtitle": "Senior Engineer", "badge": { "text": "Active", "variant": "success" }, "fields": [{ "label": "Email", "value": "jane@example.com" }, { "label": "Location", "value": "Paris, FR" }], "stats": [{ "label": "Projects", "value": "12" }, { "label": "Commits", "value": "847" }], "actions": [{ "label": "Message", "variant": "primary" }, { "label": "View Profile", "variant": "secondary" }] } }
```

Use when: displaying a person, user, or entity profile.

### trombinoscope -- People Grid

Grid of people with avatars and badges.

```typescript
interface TrombinoscopePerson {
  name: string;
  subtitle?: string;
  avatar?: string;      // image URL
  badge?: string;
  color?: string;
  badgeColor?: string;
}
interface TrombinoscopeSpec {
  title?: string;
  people?: TrombinoscopePerson[];
  columns?: number;      // default: 4
  showBadge?: boolean;   // default: true
}
```

```json
{ "type": "trombinoscope", "data": { "title": "Engineering Team", "columns": 4, "people": [{ "name": "Alice Martin", "subtitle": "Lead", "badge": "TL" }, { "name": "Bob Chen", "subtitle": "Backend" }, { "name": "Carol Silva", "subtitle": "Frontend" }] } }
```

Use when: displaying a team directory, org chart, or people listing.

### json-viewer -- Interactive JSON Tree

Collapsible tree view for JSON data.

```typescript
interface JsonViewerSpec {
  title?: string;
  data?: unknown;       // any JSON-serializable value
  maxDepth?: number;    // default: 5
  expanded?: boolean;   // default: true (first 2 levels open)
}
```

```json
{ "type": "json-viewer", "data": { "title": "API Response", "data": { "status": "ok", "users": [{ "id": 1, "name": "Alice" }, { "id": 2, "name": "Bob" }], "meta": { "total": 2, "page": 1 } } } }
```

Use when: displaying raw JSON data for inspection or debugging.

### hemicycle -- Parliamentary Chart

SVG hemicycle visualization for seat distribution.

```typescript
interface HemicycleGroup {
  id: string;
  label: string;
  seats: number;
  color: string;       // hex color
}
interface HemicycleSpec {
  title?: string;
  groups?: HemicycleGroup[];
  totalSeats?: number;  // auto-calculated from groups if omitted
  rows?: number;        // auto-calculated, 3-7 based on total seats
}
```

```json
{ "type": "hemicycle", "data": { "title": "National Assembly", "groups": [{ "id": "left", "label": "Left Coalition", "seats": 150, "color": "#ef4444" }, { "id": "center", "label": "Center", "seats": 120, "color": "#f59e0b" }, { "id": "right", "label": "Right Coalition", "seats": 130, "color": "#3b82f6" }] } }
```

Use when: visualizing parliamentary seats, vote distribution, or proportional data.

### chart-rich -- Multi-Type Chart

Full-featured chart supporting bar, line, area, pie, and donut types.

```typescript
interface ChartDataset { label?: string; values: number[]; color?: string; }
interface ChartSpec {
  title?: string;
  type?: 'bar' | 'line' | 'area' | 'pie' | 'donut';  // default: 'bar'
  labels?: string[];        // x-axis labels
  data?: ChartDataset[];    // one or more datasets
  legend?: boolean;         // default: true when multiple datasets
  xAxis?: { label?: string };
  yAxis?: { label?: string };
}
```

```json
{ "type": "chart-rich", "data": { "title": "Revenue by Region", "type": "bar", "labels": ["EU", "US", "APAC"], "data": [{ "label": "2023", "values": [80, 120, 60], "color": "#6366f1" }, { "label": "2024", "values": [95, 140, 85], "color": "#22d3ee" }] } }
```

Pie/donut example:
```json
{ "type": "chart-rich", "data": { "title": "Market Share", "type": "donut", "labels": ["Chrome", "Safari", "Firefox", "Other"], "data": [{ "values": [65, 18, 10, 7] }] } }
```

Use when: you need multi-series, line, area, pie, or donut charts. For single-series bars, `chart` is simpler.

### cards -- Card Grid

Responsive card grid with optional images and tags.

```typescript
interface CardItem {
  title: string;
  description?: string;
  subtitle?: string;
  image?: string;       // image URL
  tags?: string[];
  href?: string;
}
interface CardsSpec {
  title?: string;
  cards?: CardItem[];
  minCardWidth?: string;   // default: '180px'
  gap?: string;            // default: '1rem'
  emptyMessage?: string;
}
```

```json
{ "type": "cards", "data": { "title": "Products", "cards": [{ "title": "Pro Plan", "description": "For teams of 5-50", "tags": ["popular"] }, { "title": "Enterprise", "description": "Custom solutions", "subtitle": "Contact sales" }] } }
```

Use when: displaying collections of items as visual cards (products, articles, features).

### grid-data -- Spreadsheet Grid

Low-level grid with row/column data and optional cell highlights.

```typescript
interface GridDataColumn { key: string; label: string; width?: string; }
interface GridDataHighlight { row: number; col: number; color?: string; }
interface GridDataSpec {
  title?: string;
  columns?: GridDataColumn[];
  rows?: unknown[][];            // 2D array of cell values
  highlights?: GridDataHighlight[];
  cellHeight?: number;           // default: 32
}
```

```json
{ "type": "grid-data", "data": { "title": "Correlation Matrix", "columns": [{ "key": "a", "label": "A" }, { "key": "b", "label": "B" }, { "key": "c", "label": "C" }], "rows": [[1.0, 0.8, 0.3], [0.8, 1.0, 0.5], [0.3, 0.5, 1.0]], "highlights": [{ "row": 0, "col": 1, "color": "rgba(59,130,246,0.2)" }] } }
```

Use when: showing matrix data, heatmaps, or spreadsheet-like grids.

### sankey -- Flow Diagram

Horizontal flow visualization with nodes and links.

```typescript
interface SankeyNode { id: string; label: string; color?: string; }
interface SankeyLink { source: string; target: string; value: number; label?: string; }
interface SankeySpec {
  title?: string;
  nodes?: SankeyNode[];
  links?: SankeyLink[];
}
```

```json
{ "type": "sankey", "data": { "title": "Traffic Flow", "nodes": [{ "id": "google", "label": "Google", "color": "#4285f4" }, { "id": "direct", "label": "Direct", "color": "#34a853" }, { "id": "landing", "label": "Landing Page", "color": "#fbbc05" }, { "id": "signup", "label": "Signup", "color": "#ea4335" }], "links": [{ "source": "google", "target": "landing", "value": 500 }, { "source": "direct", "target": "landing", "value": 300 }, { "source": "landing", "target": "signup", "value": 200 }] } }
```

Use when: visualizing flows, conversions, or resource distribution.

### map -- Interactive Map

Leaflet-based map with circle markers.

```typescript
interface LatLng { lat: number; lng: number; }
interface MapMarker { lat: number; lng: number; label?: string; color?: string; }
interface MapSpec {
  title?: string;
  center?: LatLng;       // default: { lat: 46.6, lng: 2.3 } (France)
  zoom?: number;         // default: 6
  height?: string;       // default: '400px'
  markers?: MapMarker[];
}
```

```json
{ "type": "map", "data": { "title": "Office Locations", "center": { "lat": 48.85, "lng": 2.35 }, "zoom": 5, "markers": [{ "lat": 48.8566, "lng": 2.3522, "label": "Paris HQ" }, { "lat": 51.5074, "lng": -0.1278, "label": "London Office", "color": "#22d3ee" }] } }
```

Use when: showing geographic data, locations, or spatial information.

### log -- Log Viewer

Monospaced log viewer with level coloring.

```typescript
interface LogEntry {
  timestamp?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}
interface LogViewerSpec {
  title?: string;
  entries?: LogEntry[];
  maxHeight?: string;    // default: '320px'
}
```

```json
{ "type": "log", "data": { "title": "Application Logs", "entries": [{ "timestamp": "2024-03-15 14:30:01", "level": "info", "source": "api", "message": "Request processed in 42ms" }, { "timestamp": "2024-03-15 14:30:02", "level": "error", "source": "db", "message": "Connection pool exhausted" }] } }
```

Use when: showing application logs, event streams, or audit trails.

### gallery -- Image Gallery

Responsive image grid with built-in lightbox.

```typescript
interface GalleryImage {
  src: string;           // image URL
  alt?: string;
  caption?: string;
  href?: string;
}
interface GallerySpec {
  title?: string;
  images?: GalleryImage[];
  columns?: number;       // default: 3
  gap?: string;
  emptyMessage?: string;
}
```

```json
{ "type": "gallery", "data": { "title": "Project Screenshots", "columns": 3, "images": [{ "src": "https://picsum.photos/400/300?1", "caption": "Dashboard" }, { "src": "https://picsum.photos/400/300?2", "caption": "Settings" }, { "src": "https://picsum.photos/400/300?3", "caption": "Profile" }] } }
```

Use when: displaying image collections. Supports keyboard navigation in lightbox (Escape, Arrow keys).

### carousel -- Slide Carousel

Horizontal slider with autoplay and touch/swipe support.

```typescript
interface CarouselSlide {
  src?: string;           // image URL
  content?: string;       // text content
  title?: string;
  subtitle?: string;
}
interface CarouselSpec {
  title?: string;
  slides?: CarouselSlide[];
  autoPlay?: boolean;      // default: true
  interval?: number;       // default: 5000 (ms)
}
```

```json
{ "type": "carousel", "data": { "title": "Feature Highlights", "autoPlay": true, "interval": 4000, "slides": [{ "src": "https://picsum.photos/800/400?1", "title": "New Dashboard", "subtitle": "Redesigned for clarity" }, { "src": "https://picsum.photos/800/400?2", "title": "Team View", "content": "See your whole team at a glance" }] } }
```

Use when: showcasing features, images, or content in a rotating view.

---

## Category: Primitives (5)

These are layout components used internally. They are not block types but can be used when building custom layouts:

| Component | Purpose |
|-----------|---------|
| `Window` | Draggable window container with title bar |
| `Card` | Basic card wrapper |
| `Panel` | Panel container |
| `List` | Primitive list |
| `GridLayout` | Grid layout wrapper |

---

## Category: Base Components (7)

UI primitives exported from `@webmcp-auto-ui/ui/base`:

| Component | Purpose |
|-----------|---------|
| `Button` | Styled button with variants |
| `Input` | Text input field |
| `Badge` | Status badge with variants |
| `NativeSelect` | Native select dropdown |
| `Tooltip` | Tooltip wrapper |
| `Dialog` | Modal dialog (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription) |

---

## Constraints

- Block `type` must exactly match one of the 24 block types (case-sensitive).
- Simple blocks use `data` prop; rich blocks use `spec` prop. The `BlockRenderer` handles this mapping automatically -- you always pass `data` in the block definition.
- JSON data must be syntactically valid. All strings must be double-quoted.
- Image URLs in `gallery`, `carousel`, `cards`, `profile` must be accessible (CORS-friendly).
- `data-table` renders max 200 rows. Provide the most relevant subset.
- `map` requires Leaflet (loaded dynamically). First render shows a loading state.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Using `chart` type for pie/donut | `chart` only renders bars | Use `chart-rich` with `type: "pie"` |
| Passing `rows` as objects to `grid-data` | Grid expects 2D arrays `unknown[][]` | Use `data-table` for object rows, `grid-data` for arrays |
| Missing `id` on hemicycle groups | Click events cannot identify the group | Always include `id` on each group |
| `data-table` columns with wrong `key` | Cells render as empty/null | Column `key` must match the keys in row objects |
| Gallery images without `src` | Broken image placeholders | Ensure every image has a valid `src` URL |
| Using `trend` string on `stat-card` without `delta` | Trend arrow shows but no value text | Set `delta` when `trend` is a simple string, or use the object form |
