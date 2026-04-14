---
widget: satellite-map
description: Satellite imagery with optional labels, markers, and polygon overlays
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
    labels:
      type: boolean
      description: Show street labels over satellite (default true)
    markers:
      type: array
      description: Array of marker objects with coordinates, optional color and label
    polygon:
      type: array
      description: Polygon coordinates array for overlay
    polygonColor:
      type: string
      description: Polygon fill/stroke color (default "#3b82f6")
---

## Usage

Display satellite imagery. Optionally overlay markers or polygons on the satellite base layer.

## How
1. Call `mapbox_webmcp_widget_display({name: "satellite-map", params: {center: [2.2945, 48.8584], zoom: 15, markers: [{coordinates: [2.2945, 48.8584], label: "Eiffel Tower", color: "#ef4444"}]}})`

## Example

```json
{
  "center": [2.2945, 48.8584],
  "zoom": 15,
  "markers": [{"coordinates": [2.2945, 48.8584], "label": "Eiffel Tower", "color": "#ef4444"}]
}
```
