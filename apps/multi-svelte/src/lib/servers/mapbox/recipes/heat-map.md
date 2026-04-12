---
widget: heat-map
description: Density heatmap visualization of point data
group: mapbox
schema:
  type: object
  properties:
    points:
      type: array
      description: Array of point objects with coordinates and optional weight/intensity
    radius:
      type: number
      description: Heatmap radius in pixels (default 15)
    opacity:
      type: number
      description: Heatmap opacity (default 0.8)
    colorLow:
      type: string
      description: Color for low density (default "#2c7fb8")
    colorHigh:
      type: string
      description: Color for high density (default "#d95f0e")
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
    style:
      type: string
      description: Map style URL (default dark)
---

## Usage

Visualize point density as a heatmap. Points with higher weight/intensity produce stronger color.

## Example

```json
{
  "points": [
    {"coordinates": [2.35, 48.85], "weight": 5},
    {"coordinates": [2.36, 48.86], "weight": 3},
    {"coordinates": [2.34, 48.84], "weight": 8}
  ],
  "radius": 20,
  "center": [2.35, 48.85],
  "zoom": 12
}
```
