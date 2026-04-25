---
widget: turf-points-within-polygon
description: Filter a point set to those inside a polygon (visualize inside/outside).
group: turf
schema:
  type: object
  required: [points, polygon]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
    polygon: { type: object, description: "Polygon Feature or geometry" }
---

## When to use
Spatial filtering — find which points fall in a region.

## Example
```
turf_webmcp_widget_display({name: "turf-points-within-polygon", params: {points: {...}, polygon: {...}}})
```
