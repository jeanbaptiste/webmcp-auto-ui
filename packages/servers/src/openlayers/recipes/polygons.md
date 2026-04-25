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
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-polygons", params: {
  polygons: [{ coordinates: [[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9],[2.3,48.8]]], color: "#e44" }],
  center: [2.35, 48.85], zoom: 11
}})
```
