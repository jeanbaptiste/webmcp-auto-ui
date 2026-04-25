---
widget: cesium-points
description: Dense 3D point cloud projected on the globe (no labels, single color).
group: cesium
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: Array of [longitude, latitude, height?] tuples }
    color: { type: string, description: CSS color }
    size: { type: number, description: Pixel size of each point (default 6) }
---

## When to use
Render thousands of geolocated samples (lightning strikes, GPS traces, observations).

## Example
```
cesium_webmcp_widget_display({name: "cesium-points", params: { points: [[2.35, 48.85, 0], [2.30, 48.86, 100], [2.36, 48.87, 0]], color: "#22d3ee" }})
```
