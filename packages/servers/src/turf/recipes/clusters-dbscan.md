---
widget: turf-clusters-dbscan
description: DBSCAN density-based clustering (noise points highlighted).
group: turf
schema:
  type: object
  required: [points, maxDistance]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
    maxDistance: { type: number, description: "Max distance between points in same cluster" }
    units: { type: string, description: "'kilometers' (default)" }
    minPoints: { type: number, description: "Minimum points per cluster (default 3)" }
---

## When to use
Find dense clusters and noise — variable cluster count, density-based.

## Example
```
turf_webmcp_widget_display({name: "turf-clusters-dbscan", params: {points: {...}, maxDistance: 50}})
```
