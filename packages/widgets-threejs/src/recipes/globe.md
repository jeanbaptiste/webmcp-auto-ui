---
widget: globe
description: Interactive 3D globe with clickable points and arcs between locations. Geography, routes, connections.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
      description: Optional title displayed above the globe
    points:
      type: array
      description: Locations to place on the globe
      items:
        type: object
        required:
          - lat
          - lon
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
      description: Arcs connecting two points by index
      items:
        type: object
        required:
          - from
          - to
        properties:
          from:
            type: number
            description: Index into points array
          to:
            type: number
            description: Index into points array
          color:
            type: string
            description: CSS color (default #44aaff)
    radius:
      type: number
      description: Globe radius (default 1)
    autoRotate:
      type: boolean
      description: Auto-rotate the globe (default true)
---

## When to use

Display geographic data on an interactive 3D globe: city locations, flight routes,
network connections between countries, shipping lanes, data center locations.

## How

Call `widget_display('globe', { points: [...], arcs: [...] })`.

Each point needs `lat` and `lon`. Arcs reference points by their array index.
The globe auto-rotates by default and supports mouse drag to rotate and scroll to zoom.

Example — flight routes:
```
widget_display('globe', {
  title: "Major Flight Routes",
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

## Common errors

- Swapping lat/lon order (lat is Y, lon is X)
- Using degrees outside valid range (lat: -90..90, lon: -180..180)
- Referencing arc indices that don't exist in the points array
- Adding too many points (>500) — performance degrades, aggregate nearby points instead
