---
widget: globe-3d
description: Interactive 3D globe with points and arcs between locations. Geography, routes, connections.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
      description: Optional title above the globe
    points:
      type: array
      description: Locations on the globe
      items:
        type: object
        required: [lat, lon]
        properties:
          lat:
            type: number
            description: Latitude (-90 to 90)
          lon:
            type: number
            description: Longitude (-180 to 180)
          label:
            type: string
          color:
            type: string
            description: CSS color (default #ff4444)
          size:
            type: number
            description: Point radius (default 0.02)
    arcs:
      type: array
      description: Arcs connecting points by index
      items:
        type: object
        required: [from, to]
        properties:
          from:
            type: number
          to:
            type: number
          color:
            type: string
    radius:
      type: number
      description: Globe radius (default 1)
    autoRotate:
      type: boolean
      description: Auto-rotate (default true)
---

## When to use

Display geographic data on an interactive 3D globe: cities, flight routes, network connections, shipping lanes.

## How

Call `widget_display('globe-3d', { points: [...], arcs: [...] })`.

Example:
```
widget_display('globe-3d', {
  title: "Flight Routes",
  points: [
    { lat: 48.86, lon: 2.35, label: "Paris" },
    { lat: 40.71, lon: -74.01, label: "New York" },
    { lat: 35.68, lon: 139.69, label: "Tokyo" }
  ],
  arcs: [
    { from: 0, to: 1, color: "#ff8800" },
    { from: 1, to: 2, color: "#00ff88" }
  ]
})
```
