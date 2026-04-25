---
widget: deckgl-contour
description: Compute and draw contour lines from a weighted point density grid.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, weight?}" }
    cellSize: { type: number, description: "Grid cell size in meters" }
    contours: { type: array, description: "Array of {threshold, color, strokeWidth?}" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
---

## When to use
Iso-density contours, isolines, level curves on a map.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-contour", params: {
  points: [...{lng,lat,weight}],
  contours: [{threshold:1,color:[255,0,0]},{threshold:5,color:[0,255,0]},{threshold:10,color:[0,0,255]}]
}})
```
