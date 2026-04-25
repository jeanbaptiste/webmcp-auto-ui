---
widget: turf-boolean-intersects
description: Test whether two features intersect (visual YES/NO).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object }
    b: { type: object }
---

## When to use
Quick boolean spatial query.

## Example
```
turf_webmcp_widget_display({name: "turf-boolean-intersects", params: {a: {...}, b: {...}}})
```
