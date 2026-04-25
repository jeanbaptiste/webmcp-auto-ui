---
widget: g6-mds
description: Multi-Dimensional Scaling layout — Euclidean distance approximates graph distance.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    linkDistance: { type: number, description: "Reference unit distance (default 100)" }
---

## When to use
Show "graph-theoretic similarity" geometrically — close nodes = few hops between them.

## Example
```
g6_webmcp_widget_display({name: "g6-mds", params: {
  nodes:[{id:"a"},{id:"b"},{id:"c"},{id:"d"}],
  edges:[{source:"a",target:"b"},{source:"b",target:"c"},{source:"c",target:"d"}]
}})
```
