---
widget: leaflet-heatmap
description: Render a heatmap layer from geographic point data
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
    radius:
      type: number
      description: "Radius of each point (default: 25)"
    blur:
      type: number
      description: "Blur radius (default: 15)"
    maxZoom:
      type: number
    max:
      type: number
      description: "Maximum intensity value (default: 1.0)"
    gradient:
      type: object
      description: "Custom gradient (e.g. {0.4: 'blue', 0.65: 'lime', 1: 'red'})"
  required: [points]
---

## Heatmap

Renders a density heatmap using leaflet.heat. Points can optionally include an intensity value as a third element.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-heatmap", params: {center: [48.85, 2.35], zoom: 13, points: [[48.856, 2.352, 0.8], [48.857, 2.354, 0.5]], radius: 30, blur: 20}})`

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 13,
  "points": [[48.856, 2.352, 0.8], [48.857, 2.354, 0.5], [48.855, 2.350, 1.0]],
  "radius": 30,
  "blur": 20
}
```
