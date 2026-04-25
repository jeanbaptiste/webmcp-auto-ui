---
widget: protomaps-with-overlay
description: Protomaps basemap + arbitrary GeoJSON overlay on top. Auto-detects fill/line/circle layer type.
group: protomaps
schema:
  type: object
  required: [geojson]
  properties:
    url: { type: string, description: "Pmtiles HTTPS URL (default: public demo)" }
    theme: { type: string, description: "'light' | 'dark' | 'grayscale' | 'white' | 'black'" }
    geojson: { type: object, description: "GeoJSON FeatureCollection or Feature to overlay" }
    overlayType: { type: string, description: "'fill' | 'line' | 'circle' (default: auto from geometry)" }
    paint: { type: object, description: "MapLibre paint overrides for the overlay" }
    center: { type: array }
    zoom: { type: number }
---

## When to use
Basemap context for any GeoJSON dataset (regions, paths, points of interest).

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-with-overlay", params: {
  theme: "grayscale",
  geojson: { type: "FeatureCollection", features: [
    { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [2.35, 48.85] } }
  ]},
  center: [2.35, 48.85], zoom: 11
}})
```
