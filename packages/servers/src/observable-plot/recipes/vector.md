---
widget: observable-plot-vector
description: Vector (arrow) mark positioned at (x, y) with length and rotation.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    length: { type: [number, string] }
    rotate: { type: [number, string] }
    stroke: { type: string }
    strokeWidth: { type: number }
    shape: { type: string, description: "'arrow' or 'spike'" }
---

## When to use
Wind maps, vector fields, gradients.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-vector", params: { data: [{x:0,y:0,r:45},{x:1,y:1,r:90}], rotate:'r', length:20 }})
```
