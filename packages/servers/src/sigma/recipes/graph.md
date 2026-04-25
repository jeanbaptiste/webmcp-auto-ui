---
widget: sigma-graph
description: Generic WebGL graph (Sigma + Graphology). Default ForceAtlas2 layout. Use for any node/edge dataset without specific layout requirements.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes:
      type: array
      description: "Array of nodes: [{id, label?, x?, y?, size?, color?}]"
    edges:
      type: array
      description: "Array of edges: [{source, target, label?, weight?, color?}]"
---

## When to use
Default Sigma renderer. WebGL — handles thousands of nodes smoothly. Use when you want a graph drawn without specifying a layout strategy.

## Example
```
sigma_webmcp_widget_display({name: "sigma-graph", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}],
  edges: [{source: "a", target: "b"}, {source: "b", target: "c"}]
}})
```
