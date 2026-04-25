---
widget: deckgl-scenegraph
description: Render glTF 3D models (with animations and PBR lighting) at geo-points.
group: deckgl
schema:
  type: object
  required: [points, scenegraph]
  properties:
    points: { type: array, description: "Array of {lng, lat, altitude?, orientation?}" }
    scenegraph: { type: string, description: "URL to a .glb / .gltf file" }
    sizeScale: { type: number }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Embed real 3D objects (cars, planes, buildings) on a map. Animated glTF supported.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-scenegraph", params: {
  points: [{lng:-122.45,lat:37.78,orientation:[0,0,90]}],
  scenegraph: "https://.../airplane.glb",
  sizeScale: 100, pitch: 45, zoom: 14
}})
```
