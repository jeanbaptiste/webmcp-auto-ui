---
widget: turf-convex
description: Compute the convex hull of a set of points and visualize it.
group: turf
schema:
  type: object
  required: [points]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
---

## When to use
Show the smallest convex polygon enclosing a point cloud (territorial extent, candidate region).

## Example
```
turf_webmcp_widget_display({name: "turf-convex", params: {points: {type:"FeatureCollection", features:[...]}}})
```
