---
widget: observable-plot-density
description: 2D kernel density estimation contour lines.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    x: { type: array }
    y: { type: array }
    xKey: { type: string }
    yKey: { type: string }
    bandwidth: { type: number }
    thresholds: { type: number }
    stroke: { type: string }
    fill: { type: string }
---

## When to use
Continuous 2D distributions, bivariate density estimation.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-density", params: { x:[1,2,3,4,5], y:[2,3,2,4,5] }})
```
