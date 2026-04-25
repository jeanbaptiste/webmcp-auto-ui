---
widget: vegalite-square
description: Scatter with square marks (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    size: { type: number }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Alternative scatter shape; useful when circles collide visually with other layers.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-square", params: { title: "Test coverage vs complexity", values: [{x:2,y:95},{x:5,y:78},{x:8,y:60},{x:3,y:88},{x:10,y:45},{x:6,y:72}], xLabel: "Cyclomatic complexity", yLabel: "Coverage %" }})
```
