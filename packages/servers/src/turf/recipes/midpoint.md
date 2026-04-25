---
widget: turf-midpoint
description: Midpoint between two points (great-circle).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "First point ([lng,lat] or Point feature)" }
    b: { type: object, description: "Second point ([lng,lat] or Point feature)" }
---

## When to use
Halfway marker between two locations.

## Example
```
turf_webmcp_widget_display({name: "turf-midpoint", params: {a: [2.35, 48.85], b: [-0.13, 51.5]}})
```
