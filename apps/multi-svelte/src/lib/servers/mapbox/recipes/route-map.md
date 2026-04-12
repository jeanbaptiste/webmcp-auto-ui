---
widget: route-map
description: Display a route or path on the map with start/end markers and optional waypoints
group: mapbox
schema:
  type: object
  properties:
    coordinates:
      type: array
      description: Array of [lng, lat] coordinate pairs forming the route
    route:
      type: array
      description: Alias for coordinates
    waypoints:
      type: array
      description: Array of waypoint objects with coordinates and optional label
    lineColor:
      type: string
      description: Route line color (default "#3b82f6")
    lineWidth:
      type: number
      description: Route line width (default 4)
    lineOpacity:
      type: number
      description: Line opacity (default 0.85)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Display a route as a colored line on the map. Start point gets a green marker, end point a red marker. Optionally add labeled waypoints along the route.

## How
1. Call `mapbox_webmcp_widget_display({name: "route-map", params: {coordinates: [[2.35, 48.85], [2.36, 48.86], [2.40, 48.88]], lineColor: "#3b82f6", lineWidth: 4}})`

## Example

```json
{
  "coordinates": [[2.35, 48.85], [2.36, 48.86], [2.38, 48.87], [2.40, 48.88]],
  "waypoints": [{"coordinates": [2.36, 48.86], "label": "Stop 1"}],
  "lineColor": "#3b82f6",
  "lineWidth": 4
}
```
