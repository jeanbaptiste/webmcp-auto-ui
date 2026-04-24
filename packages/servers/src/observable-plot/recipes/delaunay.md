---
widget: observable-plot-delaunay
description: Delaunay triangulation mesh over scatter points.
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
    fill: { type: string }
---

## When to use
Spatial interpolation, point adjacency visualizations.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-delaunay", params: { x:[1,2,3,4], y:[2,3,1,4] }})
```
