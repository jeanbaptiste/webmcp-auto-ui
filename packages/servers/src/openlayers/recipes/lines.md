---
widget: openlayers-lines
description: Polyline layer from inline coordinate sequences on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [lines]
  properties:
    lines:
      type: array
      items:
        type: object
        properties:
          coordinates: { description: "[[lon, lat], ...]" }
          color: { type: string }
          width: { type: number }
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
openlayers_webmcp_widget_display({name: "openlayers-lines", params: {
  lines: [{ coordinates: [[2.35,48.85],[4.85,45.75],[5.37,43.30]], color: "#3388ff", width: 3 }],
  center: { lat: 46, lon: 3.5 }, zoom: 6
}})
```
