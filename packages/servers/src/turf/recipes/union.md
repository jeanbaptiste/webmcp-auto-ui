---
widget: turf-union
description: Merge two polygons into one and render input vs result on a map.
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "First polygon (Feature or geometry)" }
    b: { type: object, description: "Second polygon (Feature or geometry)" }
---

## When to use
Combine overlapping or adjacent polygons into a single shape (administrative merges, region aggregation).

## Example
```
turf_webmcp_widget_display({name: "turf-union", params: {a: {...polygonA}, b: {...polygonB}}})
```
