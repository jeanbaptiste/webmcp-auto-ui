---
widget: deckgl-text
description: Draw text labels at geo-points (city names, annotations).
group: deckgl
schema:
  type: object
  required: [labels]
  properties:
    labels: { type: array, description: "Array of {lng, lat, text, color?, size?}" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    sizeScale: { type: number }
    color: { description: "Fallback text color" }
---

## When to use
City labels, annotations, value overlays on top of other layers.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-text", params: {
  labels:[{lng:2.35,lat:48.85,text:"Paris"},{lng:-0.13,lat:51.51,text:"London"}],
  zoom: 4
}})
```
