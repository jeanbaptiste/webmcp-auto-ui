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
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-lines", params: {
  lines: [{ coordinates: [[2.35,48.85],[4.85,45.75],[5.37,43.30]], color: "#3388ff", width: 3 }],
  center: [3.5, 46], zoom: 6
}})
```
