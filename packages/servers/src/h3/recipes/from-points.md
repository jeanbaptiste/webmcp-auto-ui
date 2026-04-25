---
widget: h3-from-points
description: Index a point cloud into H3 cells and color hexagons by point density
group: h3
schema:
  type: object
  required: [points]
  properties:
    points:
      type: array
      description: "Points to bin"
      items:
        type: object
        required: [lat, lng]
        properties:
          lat: { type: number }
          lng: { type: number }
          weight: { type: number, description: "Per-point weight (default 1)" }
    resolution: { type: number, description: "H3 resolution 0-15 (default 8)" }
    style: { type: string, description: "Basemap (default 'positron')" }
    ramp: { type: array, description: "Color ramp from low to high density" }
    opacity: { type: number, description: "Fill opacity (default 0.7)" }
---

## When to use
Aggregate raw lat/lng events (clicks, sightings, GPS pings) into an H3 grid and visualize density.

## Example
```
h3_webmcp_widget_display({name: "h3-from-points", params: { resolution: 9, points: [{lat:48.85,lng:2.35},{lat:48.86,lng:2.36,weight:3},{lat:48.85,lng:2.34}] }})
```
