---
widget: deckgl-simple-mesh
description: Replicate a single 3D mesh (cube/sphere/cone) at multiple geo-points with rotation and color.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, altitude?, orientation?, color?}" }
    shape: { type: string, description: "'cube' (default), 'sphere', 'cone'" }
    sizeScale: { type: number }
    color: { description: "Fallback mesh color" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Symbolic 3D markers (sensor stations, equipment positions).

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-simple-mesh", params: {
  points:[{lng:2.35,lat:48.85,color:"#3498db"}],
  shape: "sphere", sizeScale: 200, pitch: 45, zoom: 14
}})
```
