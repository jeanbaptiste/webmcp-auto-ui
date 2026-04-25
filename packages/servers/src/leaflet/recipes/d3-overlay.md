---
widget: leaflet-d3-overlay
description: Render D3.js visualizations as an SVG layer on the Leaflet map
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
      description: "Array of [lat, lng] points to render as D3 circles"
    radius:
      type: number
      description: "Circle radius in pixels (default: 5)"
    color:
      type: string
    opacity:
      type: number
  required: [points]
---

## D3 Overlay

Combines Leaflet maps with D3.js SVG rendering. Points are rendered as D3 circles that reposition on map pan/zoom. Useful for custom data-driven visualizations.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-d3-overlay", params: {center: [48.85, 2.35], zoom: 12, points: [[48.856, 2.352], [48.858, 2.355]], radius: 8, color: "#e74c3c"}})`

## Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 12,
  "points": [[48.856, 2.352], [48.858, 2.355], [48.854, 2.348]],
  "radius": 8,
  "color": "#e74c3c",
  "opacity": 0.7
}
```
