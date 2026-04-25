---
widget: g6-ego-network
description: Ego network — focal node and its k-hop neighborhood, others filtered out.
group: g6
schema:
  type: object
  required: [nodes, edges, focus]
  properties:
    nodes: { type: array }
    edges: { type: array }
    focus: { type: string, description: "Id of the focal (ego) node — drawn highlighted at center" }
    depth: { type: number, description: "Hops to include (default 1)" }
    unitRadius: { type: number, description: "Ring spacing (default 100)" }
---

## When to use
Show the immediate context of a single entity in a larger graph.

## Example
```
g6_webmcp_widget_display({name: "g6-ego-network", params: {
  nodes:[{id:"me"},{id:"a"},{id:"b"},{id:"c"},{id:"d"}],
  edges:[{source:"me",target:"a"},{source:"me",target:"b"},{source:"a",target:"c"},{source:"d",target:"a"}],
  focus:"me", depth: 1
}})
```
