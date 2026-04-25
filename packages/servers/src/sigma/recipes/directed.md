---
widget: sigma-directed
description: Directed graph rendered with arrowheads. Good for flows, dependencies, citations.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?, color?}]" }
    edges: { type: array, description: "Directed edges [{source, target}]" }
---

## When to use
Edges have direction (workflow, dependency tree, citation, transaction). Arrowheads make directionality explicit.

## Example
```
sigma_webmcp_widget_display({name: "sigma-directed", params: {
  nodes: [{id: "start"}, {id: "mid"}, {id: "end"}],
  edges: [{source: "start", target: "mid"}, {source: "mid", target: "end"}]
}})
```
