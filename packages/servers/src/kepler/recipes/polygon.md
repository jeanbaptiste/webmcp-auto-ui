---
widget: kepler-polygon
description: GeoJSON polygons (admin boundaries, choropleths) with optional value-based fill.
group: kepler
schema:
  type: object
  required: [geojson]
  properties:
    title: { type: string }
    geojson: { type: object, description: "FeatureCollection<Polygon | MultiPolygon>" }
    colorField: { type: string, description: "Property name used for choropleth fill" }
---

## When to use
Render administrative boundaries, choropleths, isochrones — any polygon GeoJSON.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-polygon", params: { geojson: countries, colorField: "gdp" } })
```
