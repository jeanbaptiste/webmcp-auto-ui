---
widget: openlayers-modify
description: Map with a Modify interaction — drag vertices to edit existing features.
group: openlayers
schema:
  type: object
  properties:
    features:
      type: array
      items:
        type: object
        properties:
          type: { type: string }
          coordinates: {}
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-modify", params: {
  features: [{ type: "Point", coordinates: [2.35, 48.85] }],
  center: [2.35, 48.85], zoom: 13
}})
```
