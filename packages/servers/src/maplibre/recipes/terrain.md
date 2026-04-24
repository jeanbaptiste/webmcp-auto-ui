---
widget: maplibre-terrain
description: 3D terrain with hillshade — uses MapLibre demo DEM tiles (no key required)
group: maplibre
schema:
  type: object
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    pitch: { type: number, description: "Default 60 for dramatic relief" }
    bearing: { type: number }
    style: { type: string }
    exaggeration: { type: number, description: "Vertical scale (default 1.5)" }
---

## When to use
Mountain ranges, hiking trails, geomorphology — any context where elevation matters.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-terrain", params: { center: [6.8652, 45.8326], zoom: 11, pitch: 70, exaggeration: 2 }})
```
