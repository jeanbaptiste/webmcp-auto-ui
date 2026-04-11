---
widget: mapbox-route
description: Route line drawn between waypoints on a vector map. Requires a Mapbox access token.
group: mapbox
schema:
  type: object
  required:
    - accessToken
    - waypoints
  properties:
    accessToken:
      type: string
      description: Mapbox public access token (pk.*)
    waypoints:
      type: array
      description: Ordered list of points defining the route
      items:
        type: object
        required:
          - lng
          - lat
        properties:
          lng:
            type: number
            description: Longitude
          lat:
            type: number
            description: Latitude
    lineColor:
      type: string
      description: "Line color (default #4264fb)"
    lineWidth:
      type: number
      description: Line width in pixels (default 4)
    style:
      type: string
      description: "Mapbox style URL (default mapbox://styles/mapbox/dark-v11)"
    zoom:
      type: number
      description: Initial zoom level (auto-fit if omitted)
---

## When to use

Trace a path between waypoints: delivery routes, hiking trails, road trips,
migration paths, supply chains. The line connects points in order.

This draws a straight-line path between waypoints (great-circle segments). It does NOT
use the Mapbox Directions API for road-following routes.

Requires a Mapbox access token.

## How

Call `widget_display('mapbox-route', { accessToken: '...', waypoints: [{lng, lat}, ...] })`.

The map auto-fits to show all waypoints. Override with explicit `zoom` if needed.

Example — European road trip:
```
widget_display('mapbox-route', {
  accessToken: "pk.xxx",
  waypoints: [
    { lng: 2.35, lat: 48.86 },
    { lng: 7.75, lat: 48.58 },
    { lng: 11.58, lat: 48.14 },
    { lng: 16.37, lat: 48.21 }
  ],
  lineColor: "#ff6600",
  lineWidth: 3
})
```

## Common errors

- Only 1 waypoint — need at least 2 to draw a line
- Expecting road-following routes — this widget draws straight lines, not driving directions
- Swapping lng/lat order in waypoints
