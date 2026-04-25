---
widget: openlayers-draw
description: Drawing tool — click on the map to draw points, lines, or polygons.
group: openlayers
schema:
  type: object
  properties:
    type: { type: string, description: "'Point' | 'LineString' | 'Polygon' | 'Circle' (default 'Point')" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-draw", params: { type: "Polygon", zoom: 12 }})
```
