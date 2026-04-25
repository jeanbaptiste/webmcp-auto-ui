---
widget: kepler-3d-buildings
description: Extruded 3D polygons (buildings, terrain blocks) by a height attribute.
group: kepler
schema:
  type: object
  properties:
    title: { type: string }
    geojson: { type: object, description: "FeatureCollection<Polygon> with `height` property" }
    rows: { type: array, description: "Alternative tabular input" }
    elevationScale: { type: number, description: "Vertical exaggeration (default 5)" }
---

## When to use
Visualize building footprints, density blocks, or any extrudable polygon dataset in 3D.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-3d-buildings", params: { geojson: buildings } })
```
