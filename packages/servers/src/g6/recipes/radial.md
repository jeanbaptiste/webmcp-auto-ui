---
widget: g6-radial
description: Concentric rings around a focus node, by graph distance.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    focusNode: { type: string, description: "Center node id" }
    unitRadius: { type: number, description: "Distance between rings (default 80)" }
    nodeSize: { type: number, description: "Estimated node diameter for overlap (default 30)" }
---

## When to use
Highlight everything reachable from a chosen entity, organized by hop distance.

## Example
```
g6_webmcp_widget_display({name: "g6-radial", params: {
  nodes:[{id:"root"},{id:"a"},{id:"b"},{id:"c"}],
  edges:[{source:"root",target:"a"},{source:"root",target:"b"},{source:"a",target:"c"}],
  focusNode:"root"
}})
```
