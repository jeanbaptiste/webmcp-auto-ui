---
widget: leaflet-polygon
description: Draw a filled polygon on the map
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
      description: "Array of [lat, lng] vertices"
    color:
      type: string
    fillColor:
      type: string
    fillOpacity:
      type: number
    weight:
      type: number
  required: [latlngs]
---

## Polygon

Draws a closed polygon shape on the map. Auto-fits bounds.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-polygon", params: {latlngs: [[48.85, 2.34], [48.86, 2.36], [48.87, 2.35], [48.86, 2.33]], color: "#2c3e50", fillColor: "#3498db", fillOpacity: 0.4}})`

### Example

```json
{
  "latlngs": [[48.85, 2.34], [48.86, 2.36], [48.87, 2.35], [48.86, 2.33]],
  "color": "#2c3e50",
  "fillColor": "#3498db",
  "fillOpacity": 0.4
}
```
