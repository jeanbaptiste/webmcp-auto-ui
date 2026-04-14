---
widget: leaflet-circle
description: Draw circles with a real-world radius (in meters) on the map
group: shapes
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    circles:
      type: array
      items:
        type: object
        properties:
          latlng:
            type: array
            items: { type: number }
          radius:
            type: number
            description: "Radius in meters"
          color:
            type: string
          fillColor:
            type: string
          fillOpacity:
            type: number
          weight:
            type: number
---

## Circle

Draws geographic circles with a radius in meters. The circle scales with zoom level to represent real-world distance.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-circle", params: {center: [48.85, 2.35], zoom: 12, circles: [{latlng: [48.8566, 2.3522], radius: 1000, color: "#e74c3c", fillOpacity: 0.2}]}})`

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 12,
  "circles": [
    { "latlng": [48.8566, 2.3522], "radius": 1000, "color": "#e74c3c", "fillOpacity": 0.2 },
    { "latlng": [48.87, 2.33], "radius": 500, "color": "#2ecc71" }
  ]
}
```
