---
widget: openlayers-gpx
description: Render a GPX track/waypoints file on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "URL of a .gpx file" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-gpx", params: {
  url: "https://openlayers.org/en/latest/examples/data/gpx/fells_loop.gpx",
  center: [-71.1, 42.4], zoom: 13
}})
```
