---
widget: deckgl-tile
description: Display a slippy-tile raster layer (XYZ pattern, e.g. OSM, satellite).
group: deckgl
schema:
  type: object
  required: [tileUrl]
  properties:
    tileUrl: { type: string, description: "Template like https://tile.openstreetmap.org/{z}/{x}/{y}.png" }
    minZoom: { type: number }
    maxZoom: { type: number }
    opacity: { type: number }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
---

## When to use
Show a custom raster tile source on top of the basemap (or as primary).

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-tile", params: {
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  center: [2, 48], zoom: 5
}})
```
