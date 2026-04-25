---
widget: openlayers-select
description: Map with a Select interaction — click a point to highlight it.
group: openlayers
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "[[lon, lat], ...] or [{lon, lat}, ...]" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-select", params: {
  points: [[2.35, 48.85], [2.4, 48.9]],
  center: [2.35, 48.85], zoom: 11
}})
```
