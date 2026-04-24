---
widget: observable-plot-voronoi
description: Voronoi cells around each point (filled).
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
    stroke: { type: string }
---

## When to use
Region of influence, nearest-neighbor partitions.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-voronoi", params: { x:[1,2,3], y:[1,3,2] }})
```
