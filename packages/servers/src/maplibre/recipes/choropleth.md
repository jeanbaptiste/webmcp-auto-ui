---
widget: maplibre-choropleth
description: Color polygons by a numeric property (interpolated color ramp)
group: maplibre
schema:
  type: object
  required: [geojson]
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    style: { type: string }
    geojson: { type: object, description: "FeatureCollection of Polygons with a numeric property per feature" }
    valueProperty: { type: string, description: "Property name to color by (default 'value')" }
    colorRamp: { type: array, items: { type: string }, description: "Hex colors min → max" }
    opacity: { type: number }
---

## When to use
Map regional statistics (population density, election results, revenue per state).

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-choropleth", params: { geojson: {...}, valueProperty: "pop", colorRamp: ["#ffffcc","#41b6c4","#253494"] }})
```
