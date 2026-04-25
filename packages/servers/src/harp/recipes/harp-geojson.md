---
widget: harp-geojson
description: Render a GeoJSON FeatureCollection on a Harp.gl map. Requires @here/harp-features-datasource (optional dep).
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    geojson: { type: object, description: A GeoJSON FeatureCollection }
    center: { type: array }
    zoom: { type: number }
    tilt: { type: number }
    apiKey: { type: string }
---

## When to use
Overlay polygons / lines / points from GeoJSON. Falls back to a notice if the optional features datasource package isn't installed.

## Example
```
harp_webmcp_widget_display({name: "harp-geojson", params: {
  geojson: { type: "FeatureCollection", features: [...] },
  center: [2.35, 48.86], zoom: 10
}})
```
