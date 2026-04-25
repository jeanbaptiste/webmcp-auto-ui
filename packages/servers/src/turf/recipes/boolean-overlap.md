---
widget: turf-boolean-overlap
description: Test whether two same-dimension features overlap (visual YES/NO).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object }
    b: { type: object }
---

## When to use
Detect overlap between two polygons/lines of same dimension.

## Example
```
turf_webmcp_widget_display({name: "turf-boolean-overlap", params: {a: {...}, b: {...}}})
```
