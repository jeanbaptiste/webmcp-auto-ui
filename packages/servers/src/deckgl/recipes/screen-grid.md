---
widget: deckgl-screen-grid
description: Aggregate points into screen-space cells (resolution stays constant when zooming).
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, weight?}" }
    cellSizePixels: { type: number, description: "Default 40" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
---

## When to use
Quick density preview at any zoom level. Cells stay the same on-screen size.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-screen-grid", params: {
  points: [...{lng,lat,weight}], cellSizePixels: 30
}})
```
