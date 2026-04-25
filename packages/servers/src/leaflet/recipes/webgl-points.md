---
widget: leaflet-webgl-points
description: Render thousands of points using WebGL for high performance
group: advanced
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
      description: "Array of [lat, lng] points"
    color:
      type: string
      description: "Hex color for all points"
    size:
      type: number
      description: "Point size in pixels (default: 6)"
    opacity:
      type: number
  required: [points]
---

## WebGL Points

Renders massive point datasets (100k+) using GPU-accelerated WebGL via Leaflet.glify. Each point is a colored dot.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-webgl-points", params: {center: [48.85, 2.35], zoom: 11, points: [[48.856, 2.352], [48.857, 2.354]], color: "#e74c3c", size: 8}})`

## Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 11,
  "points": [[48.856, 2.352], [48.857, 2.354], [48.855, 2.350]],
  "color": "#e74c3c",
  "size": 8,
  "opacity": 0.9
}
```
