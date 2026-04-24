---
widget: maplibre-raster
description: Pure raster tile map (OSM, satellite, any XYZ tile provider) — no vector style
group: maplibre
schema:
  type: object
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    tileUrl: { type: string, description: "XYZ template with {z}/{x}/{y}" }
    attribution: { type: string }
    tileSize: { type: number, description: "256 or 512" }
---

## When to use
Use a bespoke raster source (satellite imagery, historical maps, heatmaps-as-tiles).

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-raster", params: { center: [2.35, 48.85], zoom: 11, tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }})
```
