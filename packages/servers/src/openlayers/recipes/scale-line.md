---
widget: openlayers-scale-line
description: Map with a ScaleLine control showing real-world distances.
group: openlayers
schema:
  type: object
  properties:
    units: { type: string, description: "'metric' (default), 'imperial', 'nautical', 'us', 'degrees'" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-scale-line", params: { units: "metric", zoom: 6 }})
```
