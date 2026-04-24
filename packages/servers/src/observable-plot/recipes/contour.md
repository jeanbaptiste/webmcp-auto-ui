---
widget: observable-plot-contour
description: Contour plot of a bivariate function or scattered z-values.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    fillKey: { type: string }
    strokeKey: { type: string }
    thresholds: { type: number }
    bandwidth: { type: number }
---

## When to use
Z-value fields: elevation, temperature, field strength.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-contour", params: { data: [{x:0,y:0,v:1},{x:1,y:1,v:2}], fillKey:'v' }})
```
