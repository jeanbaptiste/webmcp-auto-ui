---
widget: openlayers-circles
description: Geographic circles (radius in meters) drawn on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [circles]
  properties:
    circles:
      type: array
      items:
        type: object
        properties:
          lon: { type: number }
          lat: { type: number }
          radius: { type: number, description: "Radius in meters" }
          color: { type: string }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-circles", params: {
  circles: [{ lon: 2.35, lat: 48.85, radius: 5000, color: "#e44" }],
  center: [2.35, 48.85], zoom: 11
}})
```
