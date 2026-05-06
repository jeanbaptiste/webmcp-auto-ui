---
widget: openlayers-kml
description: Render a KML file (Google Earth, MyMaps, etc.) on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "URL of a .kml file" }
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
openlayers_webmcp_widget_display({name: "openlayers-kml", params: {
  url: "https://raw.githubusercontent.com/openlayers/openlayers/main/examples/data/kml/2012-02-10.kml",
  zoom: 2
}})
```
