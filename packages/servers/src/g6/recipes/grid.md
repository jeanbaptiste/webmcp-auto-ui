---
widget: g6-grid
description: Nodes arranged on a regular grid. Stable, deterministic placement.
group: g6
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array }
    edges: { type: array }
    rows: { type: number }
    cols: { type: number }
    sortBy: { type: string, description: "Sort key for grid order (e.g. 'degree')" }
---

## When to use
Catalog views, sets without inherent topology, or to compare nodes side by side.

## Example
```
g6_webmcp_widget_display({name: "g6-grid", params: {
  nodes: [{id:"a"},{id:"b"},{id:"c"},{id:"d"}], edges: []
}})
```
