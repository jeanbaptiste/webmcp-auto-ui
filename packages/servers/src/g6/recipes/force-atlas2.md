---
widget: g6-force-atlas2
description: ForceAtlas2 layout (Gephi). Designed for large social graphs.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    kr: { type: number, description: "Repulsion strength (default 5)" }
    kg: { type: number, description: "Gravity (default 1)" }
    mode: { type: string, description: "'normal' (default) | 'linlog'" }
    barnesHut: { type: boolean, description: "Approximate repulsion for large graphs" }
---

## When to use
Large networks (≥500 nodes) where you need readable structure with community separation.

## Example
```
g6_webmcp_widget_display({name: "g6-force-atlas2", params: {
  nodes:[{id:"a"},{id:"b"},{id:"c"}],
  edges:[{source:"a",target:"b"},{source:"b",target:"c"}]
}})
```
