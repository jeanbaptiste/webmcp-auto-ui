---
widget: openlayers-kml
description: Render a KML file (Google Earth, MyMaps, etc.) on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "URL of a .kml file" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-kml", params: {
  url: "https://openlayers.org/en/latest/examples/data/kml/2012-02-10.kml",
  zoom: 2
}})
```
