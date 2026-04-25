---
widget: sigma-circular
description: Graph with nodes evenly placed on a circle. Useful for showing pairwise relations without visual hierarchy.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?, color?, size?}]" }
    edges: { type: array, description: "Edges [{source, target}]" }
---

## When to use
Pairwise relationship matrices, chord-style displays, or when every node should have equal visual weight.

## Example
```
sigma_webmcp_widget_display({name: "sigma-circular", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}],
  edges: [{source: "a", target: "b"}, {source: "b", target: "c"}, {source: "c", target: "d"}]
}})
```
