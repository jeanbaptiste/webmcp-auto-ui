---
widget: g6-fruchterman
description: Fruchterman-Reingold force layout. Optional clustering for community separation.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    gravity: { type: number, description: "Pull toward center (default 10)" }
    speed: { type: number, description: "Iteration speed (default 5)" }
    maxIteration: { type: number, description: "Default 1000" }
    clustering: { type: boolean, description: "Group nodes by cluster attribute" }
---

## When to use
Dense graphs where Fruchterman's repulsion model gives cleaner separation than basic force.

## Example
```
g6_webmcp_widget_display({name: "g6-fruchterman", params: {
  nodes:[{id:"1"},{id:"2"},{id:"3"},{id:"4"},{id:"5"}],
  edges:[{source:"1",target:"2"},{source:"2",target:"3"},{source:"4",target:"5"}]
}})
```
