---
title: UI Widgets
description: The 31 renderable components, BlockRenderer, and data interfaces
sidebar:
  order: 4
---

Comprehensive catalog of webmcp-auto-ui widgets with interfaces and examples.

## BlockRenderer

`BlockRenderer` receives `{ type, data }` and dispatches to the matching widget:

```svelte
<BlockRenderer type="stat" data={{ label: 'Revenue', value: '$142K' }} />
```

- Simple blocks: data via the `data` prop
- Rich blocks: data via the `spec` prop
- Unknown types: placeholder `[type]`

Each block auto-registers WebMCP tools (`block_<id>_get`, `block_<id>_update`, `block_<id>_remove`) when `navigator.modelContext` is available.

## Simple blocks (9)

### stat -- Single metric

```ts
interface StatBlockData {
  label: string;
  value: string;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
}
```

```json
{ "type": "stat", "data": { "label": "Revenue", "value": "$142K", "trend": "+12.4%", "trendDir": "up" } }
```

### kv -- Key-value pairs

```ts
interface KVBlockData {
  title?: string;
  rows: [string, string][];
}
```

### list -- Text list

```ts
interface ListBlockData {
  title?: string;
  items: string[];
}
```

### chart -- Simple bar chart

```ts
interface ChartBlockData {
  title?: string;
  bars: [string, number][];
}
```

For multi-series, pie, line, area: use `chart-rich`.

### alert -- Alert banner

```ts
interface AlertBlockData {
  title?: string;
  message?: string;
  level?: 'info' | 'warn' | 'error';
}
```

### code -- Code block

```ts
interface CodeBlockData {
  lang?: string;
  content?: string;
}
```

### text -- Text paragraph

```ts
interface TextBlockData { content?: string; }
```

### actions -- Action buttons

```ts
interface ActionsBlockData {
  buttons: { label: string; primary?: boolean }[];
}
```

### tags -- Tag collection

```ts
interface TagsBlockData {
  label?: string;
  tags: { text: string; active?: boolean }[];
}
```

## Rich widgets (16)

### stat-card -- Enhanced stat

```ts
interface StatCardSpec {
  label?: string;
  value?: unknown;
  unit?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat' | { direction: 'up' | 'down' | 'flat'; value?: string; positive?: boolean };
  previousValue?: unknown;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}
```

### data-table -- Sortable table

```ts
interface DataTableSpec {
  title?: string;
  columns?: { key: string; label: string; align?: string; type?: string }[];
  rows?: Record<string, unknown>[];
  compact?: boolean;
  striped?: boolean;
}
```

Max 200 rows displayed.

### timeline -- Event timeline

```ts
interface TimelineSpec {
  title?: string;
  events?: { date?: string; title?: string; description?: string; status?: 'done' | 'active' | 'pending' }[];
}
```

### profile -- Profile card

```ts
interface ProfileSpec {
  name?: string;
  subtitle?: string;
  avatar?: { src: string; alt?: string };
  badge?: { text: string; variant?: string };
  fields?: { label: string; value: string }[];
  stats?: { label: string; value: string }[];
}
```

### hemicycle -- Parliament hemicycle

```ts
interface HemicycleSpec {
  title?: string;
  groups?: { id: string; label: string; seats: number; color: string }[];
  totalSeats?: number;
  rows?: number;
}
```

### chart-rich -- Multi-type chart

```ts
interface ChartSpec {
  title?: string;
  type?: 'bar' | 'line' | 'area' | 'pie' | 'donut';
  labels?: string[];
  data?: { label?: string; values: number[]; color?: string }[];
  legend?: boolean;
}
```

### sankey -- Flow diagram

```ts
interface SankeySpec {
  title?: string;
  nodes?: { id: string; label: string; color?: string }[];
  links?: { source: string; target: string; value: number }[];
}
```

### map -- Interactive map

```ts
interface MapSpec {
  title?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: { lat: number; lng: number; label?: string; color?: string }[];
}
```

### log -- Log viewer

```ts
interface LogViewerSpec {
  title?: string;
  entries?: { timestamp?: string; level?: 'debug' | 'info' | 'warn' | 'error'; message: string }[];
}
```

### gallery -- Image gallery

```ts
interface GallerySpec {
  title?: string;
  images?: { src: string; alt?: string; caption?: string }[];
  columns?: number;
}
```

Keyboard navigation in lightbox (Escape, arrows).

### carousel -- Slide carousel

```ts
interface CarouselSpec {
  title?: string;
  slides?: { src?: string; content?: string; title?: string; subtitle?: string }[];
  autoPlay?: boolean;
  interval?: number;
}
```

## Constraints

- Block `type` must be exactly one of the listed types (case-sensitive)
- Valid JSON, strings in double-quotes
- Image URLs must be accessible (CORS)
- `data-table`: max 200 rows
- `map`: Leaflet loads dynamically

## Common mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| `chart` for pie/donut | `chart` = bars only | `chart-rich` with `type: "pie"` |
| Object `rows` in `grid-data` | Grid expects `unknown[][]` | `data-table` for objects |
| No `id` on hemicycle groups | Click events break | Always include `id` |
| `columns.key` doesn't match rows | Empty cells | `key` must match row object keys |
