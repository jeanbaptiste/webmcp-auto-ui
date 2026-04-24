---
widget: vega-force
description: Force-directed graph layout (Vega native) — nodes + links simulation.
group: vega
schema:
  type: object
  required: [nodes, links]
  properties:
    title: { type: string }
    nodes: { type: array, description: "Array of { index, name, group? }. index should be 0..n-1" }
    links: { type: array, description: "Array of { source, target }. Indices refer to nodes." }
    height: { type: number, description: Chart height in px (default 400) }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-force", params: { nodes:[{index:0,name:"A",group:1},{index:1,name:"B",group:1},{index:2,name:"C",group:2}], links:[{source:0,target:1},{source:1,target:2}] } })
```
