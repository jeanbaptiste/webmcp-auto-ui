---
widget: g6-d3-force
description: D3-flavored force layout (link/manyBody/collide). Good for medium graphs with clear separation.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    linkDistance: { type: number, description: "Target edge length (default 80)" }
    manyBodyStrength: { type: number, description: "Repulsion strength (default -80)" }
    collideRadius: { type: number, description: "Collision radius per node (default 20)" }
---

## When to use
Medium-size networks where you want d3-force's collision avoidance and tunable charge.

## Example
```
g6_webmcp_widget_display({name: "g6-d3-force", params: {
  nodes: [{id:"x"},{id:"y"},{id:"z"}],
  edges: [{source:"x",target:"y"},{source:"y",target:"z"}]
}})
```
