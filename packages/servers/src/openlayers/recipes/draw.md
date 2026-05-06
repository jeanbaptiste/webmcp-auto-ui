---
widget: openlayers-draw
description: Drawing tool — click on the map to draw points, lines, or polygons.
group: openlayers
schema:
  type: object
  properties:
    type: { type: string, description: "'Point' | 'LineString' | 'Polygon' | 'Circle' (default 'Point')" }
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
openlayers_webmcp_widget_display({name: "openlayers-draw", params: { type: "Polygon", zoom: 12 }})
```
