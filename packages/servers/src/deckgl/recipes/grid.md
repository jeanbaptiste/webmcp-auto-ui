---
widget: deckgl-grid
description: Aggregate points into a square grid (GPU-based GridLayer). Faster than CPU equivalent.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, weight?}" }
    cellSize: { type: number, description: "Cell size in meters (default 1000)" }
    extruded: { type: boolean }
    elevationScale: { type: number }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Aggregate density. Square grid alternative to hexagon, simpler axes.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-grid", params: {
  points: [...{lng,lat,weight}], cellSize: 800, pitch: 45
}})
```
