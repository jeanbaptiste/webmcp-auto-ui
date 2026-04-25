---
widget: g6-concentric
description: Nodes on concentric rings ordered by degree (or another metric).
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    sortBy: { type: string, description: "'degree' (default), 'data.weight', etc." }
    minNodeSpacing: { type: number, description: "Spacing along each ring (default 30)" }
    equidistant: { type: boolean, description: "Equal spacing between rings" }
---

## When to use
Show importance hierarchy: high-degree nodes in the center, peripheral nodes outside.

## Example
```
g6_webmcp_widget_display({name: "g6-concentric", params: {
  nodes:[{id:"hub"},{id:"a"},{id:"b"},{id:"c"},{id:"d"}],
  edges:[{source:"hub",target:"a"},{source:"hub",target:"b"},{source:"hub",target:"c"},{source:"hub",target:"d"}]
}})
```
