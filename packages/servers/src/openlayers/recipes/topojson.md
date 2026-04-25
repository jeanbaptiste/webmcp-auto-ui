---
widget: openlayers-topojson
description: Render a TopoJSON file on an OSM basemap (compact alternative to GeoJSON).
group: openlayers
schema:
  type: object
  properties:
    url: { type: string }
    topojson: { type: object, description: "Inline TopoJSON object" }
    style:
      type: object
      properties:
        fill: { type: string }
        stroke: { type: string }
        strokeWidth: { type: number }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-topojson", params: {
  url: "https://openlayers.org/en/latest/examples/data/topojson/world-110m.json",
  zoom: 1
}})
```
