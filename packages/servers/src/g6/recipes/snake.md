---
widget: g6-snake
description: Serpentine grid (boustrophedon) — long ordered chains wrapped row by row.
group: g6
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Order matters — nodes flow left-right then snake back" }
    edges: { type: array }
    cols: { type: number, description: "Items per row (default ≈ √N)" }
    dx: { type: number, description: "Horizontal spacing (default 80)" }
    dy: { type: number, description: "Vertical spacing (default 80)" }
---

## When to use
Long sequences (timelines, processes) too wide for one row but where temporal order should remain visible.

## Example
```
g6_webmcp_widget_display({name: "g6-snake", params: {
  nodes:[{id:"1"},{id:"2"},{id:"3"},{id:"4"},{id:"5"},{id:"6"},{id:"7"},{id:"8"}],
  edges:[{source:"1",target:"2"},{source:"2",target:"3"},{source:"3",target:"4"},{source:"4",target:"5"},{source:"5",target:"6"},{source:"6",target:"7"},{source:"7",target:"8"}],
  cols: 4
}})
```
