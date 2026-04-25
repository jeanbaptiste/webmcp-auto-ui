---
widget: sigma-random
description: Graph with random node positions. Useful as a starting point or to emphasize that no structure was inferred.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?, color?}]" }
    edges: { type: array, description: "Edges [{source, target}]" }
---

## When to use
Quick render without applying any structural layout. Often useful as a baseline before applying ForceAtlas2 client-side.

## Example
```
sigma_webmcp_widget_display({name: "sigma-random", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}],
  edges: [{source: "a", target: "b"}]
}})
```
