---
widget: deckgl-line
description: Straight-line segments between geo-points over a MapLibre basemap.
group: deckgl
schema:
  type: object
  required: [lines]
  properties:
    lines: { type: array, description: "Array of {from: [lng,lat], to: [lng,lat], color?, width?}" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
    color: { description: "Fallback color [r,g,b,a] or '#rrggbb'" }
---

## When to use
Connections between two points: O/D pairs, communication links, simple flows.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-line", params: {
  lines: [{from:[2.35,48.85], to:[-0.13,51.51], width: 3}],
  center: [1, 50], zoom: 5
}})
```
