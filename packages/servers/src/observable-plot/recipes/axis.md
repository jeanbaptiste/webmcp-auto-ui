---
widget: observable-plot-axis
description: Render an empty frame with custom X/Y axes. Useful as a scaffold.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    xTicks: { type: [number, array] }
    yTicks: { type: [number, array] }
    xLabel: { type: string }
    yLabel: { type: string }
    xDomain: { type: array }
    yDomain: { type: array }
---

## When to use
Custom axes, testing projections.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-axis", params: { xDomain:[0,10], yDomain:[0,100], xLabel:'t' }})
```
