---
widget: g6-arc-diagram
description: Arc diagram — nodes on a horizontal axis, edges as arcs above.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array, description: "Order matters — nodes are placed left to right" }
    edges: { type: array }
    spacing: { type: number, description: "Horizontal spacing between adjacent nodes (default 50)" }
---

## When to use
Sequential or ordered datasets (timelines, narratives) where you want to see jumps between non-adjacent nodes.

## Example
```
g6_webmcp_widget_display({name: "g6-arc-diagram", params: {
  nodes:[{id:"1"},{id:"2"},{id:"3"},{id:"4"},{id:"5"}],
  edges:[{source:"1",target:"3"},{source:"2",target:"5"},{source:"4",target:"5"}]
}})
```
