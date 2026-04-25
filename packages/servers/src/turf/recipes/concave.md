---
widget: turf-concave
description: Compute the concave hull (alpha shape) of a set of points.
group: turf
schema:
  type: object
  required: [points, maxEdge]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
    maxEdge: { type: number, description: "Maximum allowed edge length (controls concavity)" }
    units: { type: string, description: "'kilometers' (default), 'miles', 'meters'" }
---

## When to use
Capture a tighter outline than convex hull — useful for non-convex point clouds.

## Example
```
turf_webmcp_widget_display({name: "turf-concave", params: {points: {...}, maxEdge: 100, units: "kilometers"}})
```
