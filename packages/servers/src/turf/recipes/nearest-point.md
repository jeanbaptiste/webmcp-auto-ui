---
widget: turf-nearest-point
description: Find the nearest point to a target from a set of candidates.
group: turf
schema:
  type: object
  required: [target, points]
  properties:
    target: { type: object, description: "Target point" }
    points: { type: object, description: "FeatureCollection of candidate points" }
---

## When to use
Closest-store, closest-station queries.

## Example
```
turf_webmcp_widget_display({name: "turf-nearest-point", params: {target: [2.35, 48.85], points: {...}}})
```
