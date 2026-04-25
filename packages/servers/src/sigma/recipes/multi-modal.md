---
widget: sigma-multi-modal
description: Graph with heterogeneous node types, each colored differently. Bipartite/multipartite networks.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes:
      type: array
      description: "Nodes [{id, type, label?}] — type is a string distinguishing kinds"
    edges: { type: array, description: "Edges [{source, target}]" }
---

## When to use
Graphs with multiple kinds of entities (users + items, papers + authors, genes + diseases). Color by `type`.

## Example
```
sigma_webmcp_widget_display({name: "sigma-multi-modal", params: {
  nodes: [
    {id: "u1", type: "user"}, {id: "u2", type: "user"},
    {id: "p1", type: "product"}, {id: "p2", type: "product"}
  ],
  edges: [
    {source: "u1", target: "p1"}, {source: "u1", target: "p2"},
    {source: "u2", target: "p2"}
  ]
}})
```
