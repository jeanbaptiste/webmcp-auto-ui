---
widget: openlayers-cluster
description: Cluster a large set of points into aggregated bubbles labeled with cluster size.
group: openlayers
schema:
  type: object
  required: [points]
  properties:
    points:
      type: array
      description: "[[lon, lat], ...] or [{lon, lat}, ...]"
    distance: { type: number, description: "Cluster distance in pixels (default 40)" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## When to use
Reduce visual clutter when displaying hundreds or thousands of points.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-cluster", params: {
  points: [[2.35, 48.85], [2.36, 48.86], [2.34, 48.84]],
  center: [2.35, 48.85], zoom: 12
}})
```
