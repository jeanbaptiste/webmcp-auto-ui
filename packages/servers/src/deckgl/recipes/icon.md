---
widget: deckgl-icon
description: Place icon symbols at geo-points. Default is a red circle if no iconUrl.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, size?}" }
    iconUrl: { type: string, description: "URL of single icon image (PNG/SVG, ~48px)" }
    sizeScale: { type: number }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
---

## When to use
POI pins, custom-shaped markers, sprite-based decoration.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-icon", params: {
  points:[{lng:2.35,lat:48.85},{lng:-0.13,lat:51.51}],
  zoom: 4
}})
```
