---
widget: openlayers-overview
description: Main map with an attached OverviewMap (mini-map) control.
group: openlayers
schema:
  type: object
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-overview", params: { center: [2.35, 48.85], zoom: 8 }})
```
