---
widget: g6-circular
description: Nodes on a single ring. Highlights cycle structure / dense connectivity.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    radius: { type: number, description: "Ring radius (auto if omitted)" }
    angleRatio: { type: number, description: "Fraction of full circle to use (default 1)" }
    ordering: { type: string, description: "'topology' | 'degree' | null" }
---

## When to use
Show a ring of N entities where every connection is meaningful (cycles, fully-connected subgraphs).

## Example
```
g6_webmcp_widget_display({name: "g6-circular", params: {
  nodes: [{id:"1"},{id:"2"},{id:"3"},{id:"4"},{id:"5"}],
  edges: [{source:"1",target:"2"},{source:"2",target:"3"},{source:"3",target:"4"},{source:"4",target:"5"},{source:"5",target:"1"}]
}})
```
