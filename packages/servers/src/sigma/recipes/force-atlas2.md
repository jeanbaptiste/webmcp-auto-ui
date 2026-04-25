---
widget: sigma-force-atlas2
description: Graph rendered with ForceAtlas2 layout. Best for revealing community structure in medium-to-large networks.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?, color?, size?}]" }
    edges: { type: array, description: "Edges [{source, target, weight?}]" }
    iterations: { type: number, description: "FA2 iterations (default 100). More = better convergence, slower." }
---

## When to use
Reveal cluster structure in graphs that don't have explicit positions. Excellent for social networks, citation graphs, biological networks.

## Example
```
sigma_webmcp_widget_display({name: "sigma-force-atlas2", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}],
  edges: [{source: "a", target: "b"}, {source: "b", target: "c"}, {source: "c", target: "d"}, {source: "a", target: "d"}],
  iterations: 200
}})
```
