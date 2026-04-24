---
widget: observable-plot-tip
description: Scatter plot with an interactive pointer tooltip (Plot.tip + Plot.pointer).
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
    fill: { type: string }
---

## When to use
Exploration of scatter data with hover tooltips.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-tip", params: { x:[1,2,3], y:[2,3,1] }})
```
