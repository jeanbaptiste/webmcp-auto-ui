---
widget: maplibre-image-overlay
description: Overlay a georeferenced image (4 corner coordinates) on the map
group: maplibre
schema:
  type: object
  required: [url, coordinates]
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    style: { type: string }
    url: { type: string, description: "Image URL" }
    coordinates:
      type: array
      description: "Four [lng, lat] corners in order top-left, top-right, bottom-right, bottom-left"
    opacity: { type: number }
---

## When to use
Historical maps, floor plans, satellite snapshots, hand-drawn overlays.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-image-overlay", params: { zoom: 5, url: "https://maplibre.org/maplibre-gl-js/docs/assets/radar.gif", coordinates: [[-80.425, 46.437],[-71.516, 46.437],[-71.516, 37.936],[-80.425, 37.936]] }})
```
