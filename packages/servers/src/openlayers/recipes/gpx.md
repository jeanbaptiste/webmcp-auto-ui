---
widget: openlayers-gpx
description: Render a GPX track/waypoints file on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "URL of a .gpx file" }
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
openlayers_webmcp_widget_display({name: "openlayers-gpx", params: {
  url: "https://raw.githubusercontent.com/openlayers/openlayers/main/examples/data/gpx/fells_loop.gpx",
  center: { lat: 42.4, lon: -71.1 }, zoom: 13
}})
```
