---
widget: sigma-hover-highlight
description: Interactive graph — hovering a node dims everything except the node and its direct neighbors.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?, color?}]" }
    edges: { type: array, description: "Edges [{source, target}]" }
---

## When to use
Dense graphs where the user needs to inspect local neighborhoods. Hover reveals 1-hop context.

## Example
```
sigma_webmcp_widget_display({name: "sigma-hover-highlight", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}],
  edges: [
    {source: "a", target: "b"}, {source: "a", target: "c"},
    {source: "b", target: "d"}, {source: "c", target: "d"}
  ]
}})
```
