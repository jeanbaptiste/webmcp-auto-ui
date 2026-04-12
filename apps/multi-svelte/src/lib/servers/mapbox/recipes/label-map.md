---
widget: label-map
description: Map with labeled points shown as circles with text annotations
group: mapbox
schema:
  type: object
  properties:
    points:
      type: array
      description: Array of point objects with coordinates/lat/lng and label
    labels:
      type: array
      description: Alias for points
    circleRadius:
      type: number
      description: Point circle radius (default 6)
    circleColor:
      type: string
      description: Circle fill color (default "#6366f1")
    textSize:
      type: number
      description: Label text size (default 12)
    textColor:
      type: string
      description: Label text color (default "#1e293b")
    allowOverlap:
      type: boolean
      description: Allow label overlap (default false)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Display labeled points on the map. Each point has a circle marker and a text label beneath it.

## Example

```json
{
  "points": [
    {"coordinates": [2.3522, 48.8566], "label": "Paris"},
    {"coordinates": [-0.1276, 51.5074], "label": "London"},
    {"coordinates": [13.405, 52.52], "label": "Berlin"}
  ],
  "circleColor": "#6366f1"
}
```
