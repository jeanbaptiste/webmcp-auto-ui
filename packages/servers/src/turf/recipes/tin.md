---
widget: turf-tin
description: Triangulated Irregular Network (Delaunay triangles) over a point set.
group: turf
schema:
  type: object
  required: [points]
  properties:
    points: { type: object, description: "FeatureCollection of points (>=3)" }
    z: { type: string, description: "Optional point property name to use as Z (height)" }
---

## When to use
Surface interpolation, terrain meshing, irregular grids.

## Example
```
turf_webmcp_widget_display({name: "turf-tin", params: {points: {...}}})
```
