---
widget: bubble-map
description: Proportional bubble map with circles sized by data values
group: mapbox
schema:
  type: object
  properties:
    points:
      type: array
      description: Array of point objects with coordinates, value, and optional label
    bubbles:
      type: array
      description: Alias for points
    valueProperty:
      type: string
      description: Property name for sizing (default "value")
    maxRadius:
      type: number
      description: Maximum circle radius in pixels (default 40)
    minRadius:
      type: number
      description: Minimum circle radius in pixels (default 5)
    color:
      type: string
      description: Bubble color (default "#6366f1")
    opacity:
      type: number
      description: Bubble opacity (default 0.6)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Display proportionally sized circles on the map. Circle size scales linearly with the value property.

## How
1. Call `mapbox_webmcp_widget_display({name: "bubble-map", params: {points: [{coordinates: [2.35, 48.85], label: "Paris", value: 2100000}, {coordinates: [-3.70, 40.41], label: "Madrid", value: 3200000}], color: "#f97316", maxRadius: 50}})`

## Example

```json
{
  "points": [
    {"coordinates": [2.35, 48.85], "label": "Paris", "value": 2100000},
    {"coordinates": [-3.70, 40.41], "label": "Madrid", "value": 3200000},
    {"coordinates": [12.49, 41.89], "label": "Rome", "value": 2800000}
  ],
  "color": "#f97316",
  "maxRadius": 50
}
```
