---
widget: deckgl-mvt
description: Mapbox Vector Tile (MVT) layer. Renders pbf vector tiles directly.
group: deckgl
schema:
  type: object
  required: [tileUrl]
  properties:
    tileUrl: { type: string, description: "Template like https://.../{z}/{x}/{y}.pbf" }
    minZoom: { type: number }
    maxZoom: { type: number }
    fillColor: { description: "Fallback color" }
    lineColor: { description: "Fallback color" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Custom MVT vector tile source on top of the basemap.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-mvt", params: {
  tileUrl: "https://.../tiles/{z}/{x}/{y}.pbf", zoom: 5
}})
```
