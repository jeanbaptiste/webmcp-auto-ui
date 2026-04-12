---
widget: leaflet-rectangle
description: Draw a rectangle (bounding box) on the map
group: shapes
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    bounds:
      type: array
      description: "[[southWest lat, southWest lng], [northEast lat, northEast lng]]"
    color:
      type: string
    fillColor:
      type: string
    fillOpacity:
      type: number
    weight:
      type: number
  required: [bounds]
---

## Rectangle

Draws a rectangle defined by its south-west and north-east corners.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-rectangle", params: {bounds: [[48.84, 2.33], [48.87, 2.37]], color: "#e67e22", fillColor: "#f39c12", fillOpacity: 0.2}})`

### Example

```json
{
  "bounds": [[48.84, 2.33], [48.87, 2.37]],
  "color": "#e67e22",
  "fillColor": "#f39c12",
  "fillOpacity": 0.2
}
```
