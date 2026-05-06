---
widget: openlayers-graticule
description: Lat/lon graticule overlay (meridians and parallels) on an OSM basemap.
group: openlayers
schema:
  type: object
  properties:
    showLabels: { type: boolean, description: "Show coordinate labels (default true)" }
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
openlayers_webmcp_widget_display({name: "openlayers-graticule", params: { zoom: 2 }})
```
