---
widget: sigma-edge-weights
description: Graph where edge thickness encodes weight. Reveals strong vs weak ties.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?}]" }
    edges:
      type: array
      description: "Edges [{source, target, weight}] — weight maps to thickness"
    minSize: { type: number, description: "Min edge thickness (default 0.5)" }
    maxSize: { type: number, description: "Max edge thickness (default 8)" }
---

## When to use
Weighted networks: trade volumes, communication frequency, similarity scores.

## Example
```
sigma_webmcp_widget_display({name: "sigma-edge-weights", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}],
  edges: [
    {source: "a", target: "b", weight: 1},
    {source: "b", target: "c", weight: 5},
    {source: "a", target: "c", weight: 10}
  ]
}})
```
