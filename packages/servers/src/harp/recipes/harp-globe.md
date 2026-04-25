---
widget: harp-globe
description: Sphere projection (3D globe view) of Harp.gl vector tiles.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    center: { type: array, description: "[lng, lat]" }
    zoom: { type: number, description: Zoom level (default 4) }
    tilt: { type: number }
    heading: { type: number }
    apiKey: { type: string, description: HERE Vector Tile API key }
---

## When to use
World-scale view with sphere projection.

## Example
```
harp_webmcp_widget_display({name: "harp-globe", params: { center: [0, 20], zoom: 3 }})
```
