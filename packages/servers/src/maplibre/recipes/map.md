---
widget: maplibre-map
description: Base MapLibre GL map — vector-tile basemap (Carto styles), configurable center/zoom/pitch/bearing
group: maplibre
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
      description: "[lng, lat] — MapLibre convention (longitude first)"
    zoom: { type: number, description: "Zoom level (0–22)" }
    style:
      type: string
      description: "'voyager' (default), 'dark', 'positron', or a full style URL"
    pitch: { type: number, description: "Camera tilt in degrees (0–60)" }
    bearing: { type: number, description: "Map rotation in degrees" }
---

## When to use
Base canvas for any map visualization. Sets up a Carto vector basemap with zoom/pan controls.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-map", params: { center: [2.3522, 48.8566], zoom: 11, style: "dark" }})
```
