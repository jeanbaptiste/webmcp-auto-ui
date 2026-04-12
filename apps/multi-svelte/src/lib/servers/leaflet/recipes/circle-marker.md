---
widget: leaflet-circle-marker
description: Draw circle markers with a fixed pixel radius (does not scale with zoom)
group: shapes
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    markers:
      type: array
      items:
        type: object
        properties:
          latlng:
            type: array
            items: { type: number }
          radius:
            type: number
            description: "Radius in pixels"
          color:
            type: string
          fillColor:
            type: string
          fillOpacity:
            type: number
          popup:
            type: string
---

## Circle Marker

Like a circle, but its radius is defined in pixels and stays constant regardless of zoom level. Useful for proportional symbol maps.

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 12,
  "markers": [
    { "latlng": [48.856, 2.352], "radius": 12, "color": "#9b59b6", "popup": "Large" },
    { "latlng": [48.86, 2.34], "radius": 6, "color": "#3498db", "popup": "Small" }
  ]
}
```
