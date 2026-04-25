---
widget: turf-intersect
description: Compute the intersection of two polygons (overlap region).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "First polygon" }
    b: { type: object, description: "Second polygon" }
---

## When to use
Find the common area between two regions (overlap zones, shared service areas).

## Example
```
turf_webmcp_widget_display({name: "turf-intersect", params: {a: {...A}, b: {...B}}})
```
