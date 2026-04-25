---
widget: vegalite-tick
description: Strip plot — short vertical ticks showing distribution along a categorical y axis (Vega-Lite).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] — y is categorical" }
    x: { type: array }
    y: { type: array }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show one-dimensional distribution across categories (alternative to boxplot).

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-tick", params: { title: "Response times by endpoint", values: [{x:120,y:"GET /api"},{x:95,y:"GET /api"},{x:310,y:"POST /upload"},{x:280,y:"POST /upload"},{x:55,y:"GET /health"},{x:60,y:"GET /health"}], xLabel: "ms", yLabel: "Endpoint" }})
```
