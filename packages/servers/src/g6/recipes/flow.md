---
widget: g6-flow
description: Flowchart with rectangular nodes, orthogonal routed edges, and arrows.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array, description: "Each node label appears inside a rounded rectangle" }
    edges: { type: array }
    rankdir: { type: string, description: "'LR' (default) | 'TB' | 'BT' | 'RL'" }
    nodesep: { type: number }
    ranksep: { type: number }
---

## When to use
Process flows, state machines, BPMN-like diagrams — boxes connected by arrows.

## Example
```
g6_webmcp_widget_display({name: "g6-flow", params: {
  nodes:[{id:"start",label:"Start"},{id:"check",label:"Check"},{id:"done",label:"Done"}],
  edges:[{source:"start",target:"check",label:"go"},{source:"check",target:"done",label:"ok"}]
}})
```
