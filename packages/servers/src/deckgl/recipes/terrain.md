---
widget: deckgl-terrain
description: 3D terrain mesh from elevation tiles, with optional surface texture.
group: deckgl
schema:
  type: object
  required: [elevationData]
  properties:
    elevationData: { type: string, description: "Tile template URL with {z}/{x}/{y} returning RGB-encoded elevation" }
    texture: { type: string, description: "Optional surface texture tile URL" }
    bounds: { type: array, description: "[w, s, e, n] for static elevation file" }
    elevationDecoder: { type: object, description: "{rScaler, gScaler, bScaler, offset} default mapbox-rgb" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
3D shaded relief, mountains, volcanic visualization, ski runs.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-terrain", params: {
  elevationData: "https://.../terrain/{z}/{x}/{y}.png",
  texture: "https://.../satellite/{z}/{x}/{y}.png",
  center: [6.86, 45.83], zoom: 12, pitch: 60
}})
```
