---
widget: turf-collect
description: Aggregate point values into containing polygons (count colored choropleth).
group: turf
schema:
  type: object
  required: [points, polygons]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
    polygons: { type: object, description: "FeatureCollection of polygons" }
    inProperty: { type: string, description: "Point property to collect (default 'value')" }
    outProperty: { type: string, description: "Polygon property to write (default 'values')" }
---

## When to use
Choropleth from point density — counts of points per region.

## Example
```
turf_webmcp_widget_display({name: "turf-collect", params: {points: {...}, polygons: {...}}})
```
