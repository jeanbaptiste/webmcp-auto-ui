---
widget: openlayers-mouse-position
description: Map with a MousePosition control displaying live coordinates as the cursor moves.
group: openlayers
schema:
  type: object
  properties:
    projection: { type: string, description: "Coordinate projection (default 'EPSG:4326')" }
    precision: { type: number, description: "Decimal places (default 4)" }
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
openlayers_webmcp_widget_display({name: "openlayers-mouse-position", params: { precision: 5 }})
```
