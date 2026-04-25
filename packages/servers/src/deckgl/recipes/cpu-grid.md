---
widget: deckgl-cpu-grid
description: CPU-based square grid aggregator (CPUGridLayer). Allows custom JS aggregation functions.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, weight?}" }
    cellSize: { type: number }
    extruded: { type: boolean }
    elevationScale: { type: number }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Like grid but slower and more flexible — use when you need custom aggregation hooks.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-cpu-grid", params: {
  points: [...{lng,lat,weight}], cellSize: 1000, pitch: 45
}})
```
