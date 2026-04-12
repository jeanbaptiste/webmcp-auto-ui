---
widget: leaflet-draw-tools
description: Interactive drawing tools for creating shapes on the map
group: interactive
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    draw:
      type: object
      properties:
        polygon:
          type: boolean
        polyline:
          type: boolean
        rectangle:
          type: boolean
        circle:
          type: boolean
        marker:
          type: boolean
        circlemarker:
          type: boolean
      description: "Enable/disable specific drawing tools"
    edit:
      type: boolean
      description: "Enable editing of drawn shapes (default: true)"
---

## Draw Tools

Adds interactive drawing controls to the map. Users can draw polygons, polylines, rectangles, circles, and markers. Drawn shapes can be edited and deleted.

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 14,
  "draw": { "polygon": true, "polyline": true, "circle": true, "marker": true, "rectangle": true },
  "edit": true
}
```
