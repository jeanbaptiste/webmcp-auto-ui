---
widget: turf-simplify
description: Reduce vertices of a line or polygon (Douglas-Peucker) and overlay original vs simplified.
group: turf
schema:
  type: object
  required: [feature]
  properties:
    feature: { type: object, description: "Line or Polygon Feature/geometry" }
    tolerance: { type: number, description: "Simplification tolerance (default 0.01)" }
    highQuality: { type: boolean, description: "Higher quality at slower cost (default false)" }
---

## When to use
Reduce data size while preserving shape (web rendering optimization, schematic maps).

## Example
```
turf_webmcp_widget_display({name: "turf-simplify", params: {feature: {...}, tolerance: 0.05}})
```
