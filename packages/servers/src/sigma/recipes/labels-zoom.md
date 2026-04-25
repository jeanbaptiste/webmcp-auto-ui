---
widget: sigma-labels-zoom
description: Graph where labels appear progressively as the user zooms in. Reduces clutter on large graphs.
group: sigma
schema:
  type: object
  required: [nodes]
  properties:
    nodes: { type: array, description: "Nodes [{id, label?}]" }
    edges: { type: array, description: "Edges [{source, target}]" }
    labelDensity: { type: number, description: "Label density (default 0.07; higher = more labels)" }
    labelGridCellSize: { type: number, description: "Grid cell px (default 60)" }
    labelRenderedSizeThreshold: { type: number, description: "Min on-screen size before labels show (default 6)" }
---

## When to use
Large graphs (hundreds-to-thousands of nodes) where showing all labels at once is unreadable.

## Example
```
sigma_webmcp_widget_display({name: "sigma-labels-zoom", params: {
  nodes: [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}],
  edges: [{source: "a", target: "b"}, {source: "c", target: "d"}],
  labelDensity: 0.05
}})
```
