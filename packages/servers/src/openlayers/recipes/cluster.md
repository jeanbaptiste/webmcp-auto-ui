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
    center:
      description: "Map center. Use object form { lat, lon } to avoid lat/lon swap. Array form [lon, lat] also accepted (note: longitude FIRST, latitude second)."
      oneOf:
        - type: array
          items: { type: number }
          minItems: 2
          maxItems: 2
        - type: object
          required: [lat, lon]
          properties:
            lat: { type: number, minimum: -90, maximum: 90 }
            lon: { type: number, minimum: -180, maximum: 180 }
    zoom: { type: number }
---

## When to use
Reduce visual clutter when displaying hundreds or thousands of points.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-cluster", params: {
  points: [[2.35, 48.85], [2.36, 48.86], [2.34, 48.84]],
  center: { lat: 48.85, lon: 2.35 }, zoom: 12
}})
```
