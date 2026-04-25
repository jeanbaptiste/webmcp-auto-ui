---
widget: turf-bezier
description: Smooth a LineString into a Bezier spline curve.
group: turf
schema:
  type: object
  required: [line]
  properties:
    line: { type: object, description: "LineString Feature or geometry" }
    resolution: { type: number, description: "Time in milliseconds between points (default 10000)" }
    sharpness: { type: number, description: "Curvature 0..1 (default 0.85)" }
---

## When to use
Render a smoothed path from a polyline (vehicle trajectory, route).

## Example
```
turf_webmcp_widget_display({name: "turf-bezier", params: {line: {type:"Feature", geometry:{type:"LineString", coordinates:[[2.3,48.8],[3,49],[4,49.2]]}, properties:{}}}})
```
