---
widget: deckgl-h3-hexagon
description: Render Uber H3 hex cells. Pass H3 indices directly (precomputed bins).
group: deckgl
schema:
  type: object
  required: [cells]
  properties:
    cells: { type: array, description: "Array of {hex: H3 index, value?, color?, elevation?}" }
    extruded: { type: boolean }
    elevationScale: { type: number }
    fillColor: { description: "Fallback fill color" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
You already have H3-indexed data (Uber H3 geo-binning system).

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-h3-hexagon", params: {
  cells: [{hex:"8928308280fffff",value:42,color:"#e74c3c"}],
  center: [-122.4, 37.78], zoom: 11, pitch: 45, extruded: true
}})
```
