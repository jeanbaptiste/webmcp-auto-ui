---
widget: observable-plot-voronoiMesh
description: Voronoi edges only (no fill).
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
---

## When to use
Lightweight Voronoi overlays.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-voronoiMesh", params: { x:[1,2,3], y:[1,3,2] }})
```
