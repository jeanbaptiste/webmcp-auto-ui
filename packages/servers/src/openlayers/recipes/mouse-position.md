---
widget: openlayers-mouse-position
description: Map with a MousePosition control displaying live coordinates as the cursor moves.
group: openlayers
schema:
  type: object
  properties:
    projection: { type: string, description: "Coordinate projection (default 'EPSG:4326')" }
    precision: { type: number, description: "Decimal places (default 4)" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-mouse-position", params: { precision: 5 }})
```
