---
widget: maplibre-line
description: Draw polylines (routes, tracks, GPX trails) with per-path color/width
group: maplibre
schema:
  type: object
  required: [paths]
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    style: { type: string }
    paths:
      type: array
      items:
        type: object
        required: [coords]
        properties:
          coords: { type: array, description: "Array of [lng, lat] pairs" }
          color: { type: string }
          width: { type: number }
    color: { type: string, description: "Default color for all paths" }
    width: { type: number }
---

## When to use
Show routes, flight paths, GPX tracks, connecting lines between cities.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-line", params: { zoom: 4, paths: [{color: "#e74c3c", coords: [[2.35,48.85],[-0.13,51.51],[13.40,52.52]]}] }})
```
