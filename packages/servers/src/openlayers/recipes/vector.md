---
widget: openlayers-vector
description: Vector layer of inline features (Point/LineString/Polygon) on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [features]
  properties:
    features:
      type: array
      items:
        type: object
        properties:
          type: { type: string, description: "'Point' | 'LineString' | 'Polygon'" }
          coordinates: { description: "Point: [lon,lat]; LineString: [[lon,lat],...]; Polygon: [[[lon,lat],...]]" }
          properties: { type: object }
    style:
      type: object
      properties:
        fill: { type: string }
        stroke: { type: string }
        strokeWidth: { type: number }
        radius: { type: number }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## When to use
Display arbitrary geometries without a GeoJSON file.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-vector", params: {
  features: [{ type: "Point", coordinates: [2.35, 48.85] }],
  center: [2.35, 48.85], zoom: 12
}})
```
