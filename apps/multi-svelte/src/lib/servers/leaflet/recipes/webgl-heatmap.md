---
widget: leaflet-webgl-heatmap
description: GPU-accelerated heatmap for large datasets using WebGL
group: data
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    points:
      type: array
      items:
        type: array
        items: { type: number }
      description: "Array of [lat, lng, intensity?] points"
    size:
      type: number
      description: "Point size in meters (default: 30000)"
    opacity:
      type: number
    alphaRange:
      type: number
  required: [points]
---

## WebGL Heatmap

GPU-accelerated heatmap renderer for very large point datasets (10k+ points). Uses WebGL for smooth performance.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-webgl-heatmap", params: {center: [48.85, 2.35], zoom: 10, points: [[48.856, 2.352, 0.5], [48.860, 2.340, 0.8]], size: 20000, opacity: 0.8}})`

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 10,
  "points": [[48.856, 2.352, 0.5], [48.860, 2.340, 0.8]],
  "size": 20000,
  "opacity": 0.8
}
```
