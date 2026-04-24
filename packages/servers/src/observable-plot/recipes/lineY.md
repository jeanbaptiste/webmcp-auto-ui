---
widget: observable-plot-lineY
description: Line with Y as the independent variable (X implicit).
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
    stroke: { type: string }
    curve: { type: string }
---

## When to use
Standard time-series line chart with implicit X index.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-lineY", params: { y: [1,4,9,16,25] }})
```
