---
widget: maplibre-vector-tiles
description: Render an arbitrary vector-tile source (MVT) with a single styled layer
group: maplibre
schema:
  type: object
  required: [tilesUrl, sourceLayer]
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    tilesUrl: { type: string, description: "XYZ template with {z}/{x}/{y}.pbf" }
    sourceLayer: { type: string, description: "Vector tile source-layer name" }
    layerType: { type: string, description: "'line' (default), 'fill', 'circle'" }
    paint: { type: object, description: "MapLibre paint overrides" }
---

## When to use
Consume a custom MVT tileset (buildings, roads, administrative boundaries) without a full style.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-vector-tiles", params: { zoom: 10, tilesUrl: "https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf", sourceLayer: "countries", layerType: "fill" }})
```
