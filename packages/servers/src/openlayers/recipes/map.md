---
widget: openlayers-map
description: Base OpenLayers map (OSM tiles). Default Paris view, configurable center/zoom/rotation.
group: openlayers
schema:
  type: object
  properties:
    center: { type: array, items: { type: number }, description: "[lon, lat] in EPSG:4326" }
    zoom: { type: number, description: "Initial zoom level" }
    rotation: { type: number, description: "View rotation (radians)" }
---

## When to use
Display a basic OpenStreetMap-backed map. Starting point for most map demos.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-map", params: { center: [2.35, 48.85], zoom: 6 }})
```
