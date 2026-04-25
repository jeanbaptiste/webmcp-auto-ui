---
widget: openlayers-zoom-slider
description: Map with a vertical ZoomSlider control for fine zoom adjustment.
group: openlayers
schema:
  type: object
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-zoom-slider", params: { zoom: 6 }})
```
