---
widget: turf-tag
description: Tag points with the polygon they fall in (categorical coloring).
group: turf
schema:
  type: object
  required: [points, polygons]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
    polygons: { type: object, description: "FeatureCollection of polygons" }
    field: { type: string, description: "Polygon property to read (default 'name')" }
    outField: { type: string, description: "Output property on points (default 'tag')" }
---

## When to use
Categorize points by region (e.g. assign country/admin region to each point).

## Example
```
turf_webmcp_widget_display({name: "turf-tag", params: {points: {...}, polygons: {...}, field: "name"}})
```
