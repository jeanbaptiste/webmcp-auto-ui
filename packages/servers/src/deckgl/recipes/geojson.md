---
widget: deckgl-geojson
description: Render any GeoJSON FeatureCollection (points, lines, polygons) with one layer.
group: deckgl
schema:
  type: object
  required: [geojson]
  properties:
    geojson: { type: object, description: "GeoJSON FeatureCollection or Feature" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
    extruded: { type: boolean, description: "Extrude polygons by feature.properties.elevation" }
    fillColor: { description: "Fallback fill color" }
    lineColor: { description: "Fallback stroke color" }
---

## When to use
You already have a GeoJSON document. Single layer handles all geometry types.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-geojson", params: {
  geojson: { type:"FeatureCollection", features:[...] },
  zoom: 5
}})
```
