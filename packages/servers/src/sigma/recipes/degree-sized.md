---
widget: sigma-degree-sized
description: Graph where node size encodes degree (number of connections). Highlights hubs.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?, color?}]" }
    edges: { type: array, description: "Edges [{source, target}]" }
    minSize: { type: number, description: "Min node radius (default 3)" }
    maxSize: { type: number, description: "Max node radius (default 20)" }
---

## When to use
Identify hubs and bridge nodes. Degree is a quick proxy for centrality.

## Example
```
sigma_webmcp_widget_display({name: "sigma-degree-sized", params: {
  nodes: [{id: "hub"}, {id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}],
  edges: [
    {source: "hub", target: "a"}, {source: "hub", target: "b"},
    {source: "hub", target: "c"}, {source: "hub", target: "d"}
  ]
}})
```
