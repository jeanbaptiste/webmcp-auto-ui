---
widget: observable-plot-areaX
description: Area chart along X (X is the independent variable, filled region between Y1 and Y2).
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
    fillOpacity: { type: number }
    curve: { type: string }
---

## When to use
Cumulative trends, filled regions along horizontal axis.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-areaX", params: { x:[1,2,3,4], y:[1,4,9,16] }})
```
