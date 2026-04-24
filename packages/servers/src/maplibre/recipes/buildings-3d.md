---
widget: maplibre-3d-buildings
description: Extrude building footprints as 3D blocks (requires vector-tile basemap)
group: maplibre
schema:
  type: object
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number, description: "Must be ≥ 14 to see extrusions" }
    pitch: { type: number, description: "Camera tilt (default 55)" }
    bearing: { type: number }
    style: { type: string }
---

## When to use
Urban 3D views — wayfinding, architecture, city context.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-3d-buildings", params: { center: [2.3522, 48.8566], zoom: 17, pitch: 60, bearing: -30 }})
```
