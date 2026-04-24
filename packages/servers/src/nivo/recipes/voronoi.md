---
widget: nivo-voronoi
description: Voronoi tessellation of 2D points.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "[{id, x, y}, ...]" }
    xDomain: { type: array, description: "[min, max] for x (default [0, 100])" }
    yDomain: { type: array, description: "[min, max] for y (default [0, 100])" }
---

## When to use
Spatial partitioning visualization; nearest-neighbor geometry.

## Example
```
nivo_webmcp_widget_display({name: "nivo-voronoi", params: { data: [{id:1,x:10,y:20},{id:2,x:80,y:30},{id:3,x:40,y:70}] }})
```
