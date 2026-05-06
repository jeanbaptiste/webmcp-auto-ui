---
widget: openlayers-polygons
description: Polygon layer from inline ring coordinates on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [polygons]
  properties:
    polygons:
      type: array
      items:
        type: object
        properties:
          coordinates: { description: "[[[lon, lat], ...]] outer ring (and optional holes)" }
          color: { type: string }
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
openlayers_webmcp_widget_display({name: "openlayers-polygons", params: {
  polygons: [{ coordinates: [[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9],[2.3,48.8]]], color: "#e44" }],
  center: { lat: 48.85, lon: 2.35 }, zoom: 11
}})
```
