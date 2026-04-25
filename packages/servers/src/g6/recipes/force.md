---
widget: g6-force
description: Classic spring/charge force-directed graph layout. Best for general networks.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes:
      type: array
      description: "Array of {id, label?}"
    edges:
      type: array
      description: "Array of {source, target, label?}"
    linkDistance: { type: number, description: "Target edge length (default 80)" }
    nodeStrength: { type: number, description: "Charge force; negative = repel (default -50)" }
---

## When to use
General undirected networks where structural community matters more than hierarchy.

## Example
```
g6_webmcp_widget_display({name: "g6-force", params: {
  nodes: [{id:"A"},{id:"B"},{id:"C"},{id:"D"}],
  edges: [{source:"A",target:"B"},{source:"B",target:"C"},{source:"C",target:"D"},{source:"D",target:"A"}]
}})
```
