---
widget: openlayers-popup
description: Map with clickable point markers that show popup content on click.
group: openlayers
schema:
  type: object
  required: [markers]
  properties:
    markers:
      type: array
      items:
        type: object
        properties:
          lon: { type: number }
          lat: { type: number }
          content: { type: string, description: "HTML or text shown in the popup" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-popup", params: {
  markers: [
    { lon: 2.3522, lat: 48.8566, content: "<b>Paris</b>" },
    { lon: 2.3376, lat: 48.8606, content: "Louvre" }
  ],
  center: [2.35, 48.85], zoom: 13
}})
```
