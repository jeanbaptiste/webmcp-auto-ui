---
widget: leaflet-polyline
description: Draw a polyline (path/route) on the map
group: shapes
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    latlngs:
      type: array
      items:
        type: array
        items: { type: number }
      description: "Array of [lat, lng] points"
    color:
      type: string
    weight:
      type: number
    opacity:
      type: number
    dashArray:
      type: string
      description: "Dash pattern (e.g. '5, 10')"
  required: [latlngs]
---

## Polyline

Draws a connected series of line segments on the map. Auto-fits the map bounds to the line.

### Example

```json
{
  "latlngs": [[48.856, 2.352], [48.858, 2.355], [48.860, 2.350], [48.862, 2.348]],
  "color": "#e74c3c",
  "weight": 4,
  "dashArray": "10, 5"
}
```
