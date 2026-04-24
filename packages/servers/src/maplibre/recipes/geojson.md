---
widget: maplibre-geojson
description: Render GeoJSON (points, lines, polygons) with auto-styling on a MapLibre map
group: maplibre
schema:
  type: object
  required: [geojson]
  properties:
    center:
      type: array
      items: { type: number }
    zoom: { type: number }
    style: { type: string }
    geojson: { type: object, description: "FeatureCollection or Feature" }
    type:
      type: string
      description: "'auto' (default), 'point', 'line', 'polygon'"
    paint:
      type: object
      description: "Override paint properties: {point: {...}, line: {...}, fill: {...}}"
---

## When to use
Display arbitrary GeoJSON with sensible default styling. Auto-detects geometry type.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-geojson", params: { zoom: 10, geojson: {type: "FeatureCollection", features: [{type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [[[2.33,48.84],[2.37,48.84],[2.37,48.87],[2.33,48.87],[2.33,48.84]]]}}]} }})
```
