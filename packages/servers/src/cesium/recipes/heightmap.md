---
widget: cesium-heightmap
description: Heatmap-style projection — colored disks whose color encodes a value at each location.
group: cesium
schema:
  type: object
  required: [points]
  properties:
    points:
      type: array
      description: Array of {longitude, latitude, value}
    radius: { type: number, description: Disk radius in meters (default 50000) }
    colorLow: { type: string, description: CSS color for min value }
    colorHigh: { type: string, description: CSS color for max value }
---

## When to use
Spatial heat surveys: temperature, population density, sensor readings, election margins.

## Example
```
cesium_webmcp_widget_display({name: "cesium-heightmap", params: { points: [{longitude: 2.35, latitude: 48.85, value: 18}, {longitude: -74, latitude: 40.7, value: 25}, {longitude: 139.7, latitude: 35.7, value: 22}], radius: 200000 }})
```
