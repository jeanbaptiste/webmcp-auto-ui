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
openlayers_webmcp_widget_display({name: "openlayers-topojson", params: {
  url: "https://raw.githubusercontent.com/openlayers/openlayers/main/examples/data/topojson/world-110m.json",
  zoom: 1
}})
```
