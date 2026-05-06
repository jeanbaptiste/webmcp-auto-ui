---
widget: openlayers-select
description: Map with a Select interaction — click a point to highlight it.
group: openlayers
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "[[lon, lat], ...] or [{lon, lat}, ...]" }
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

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-select", params: {
  points: [[2.35, 48.85], [2.4, 48.9]],
  center: { lat: 48.85, lon: 2.35 }, zoom: 11
}})
```
