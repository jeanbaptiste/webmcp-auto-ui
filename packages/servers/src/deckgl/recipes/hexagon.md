---
widget: deckgl-hexagon
description: Aggregate points into 3D-extruded hexagonal bins (HexagonLayer). Classic kepler.gl visual.
group: deckgl
schema:
  type: object
  required: [points]
  properties:
    points: { type: array, description: "Array of {lng, lat, weight?}" }
    radius: { type: number, description: "Hex radius in meters (default 1000)" }
    extruded: { type: boolean }
    elevationScale: { type: number }
    coverage: { type: number, description: "0..1 hex coverage ratio" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Density of millions of geo-points. Best with `pitch: 40+` for 3D bars.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-hexagon", params: {
  points: [...big array of {lng,lat,weight}],
  radius: 500, pitch: 45, zoom: 12
}})
```
