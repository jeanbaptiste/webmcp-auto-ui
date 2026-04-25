---
widget: turf-difference
description: Subtract polygon B from polygon A (A minus B).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "Base polygon" }
    b: { type: object, description: "Polygon to subtract" }
---

## When to use
Carve out an area from another (e.g. exclusion zone within a service area).

## Example
```
turf_webmcp_widget_display({name: "turf-difference", params: {a: {...A}, b: {...B}}})
```
