---
widget: deckgl-heatmap
description: GPU-accelerated heatmap (HeatmapLayer). Smooth color gradient over weighted points.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, weight?}" }
    radiusPixels: { type: number, description: "Default 40" }
    intensity: { type: number, description: "Default 1" }
    threshold: { type: number, description: "Min weight cutoff (0..1, default 0.05)" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
---

## When to use
Heat density visualization, traffic, sentiment, weather intensity.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-heatmap", params: {
  points: [...{lng,lat,weight}], radiusPixels: 60, intensity: 1.5
}})
```
