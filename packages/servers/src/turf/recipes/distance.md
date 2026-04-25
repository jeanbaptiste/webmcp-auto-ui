---
widget: turf-distance
description: Great-circle distance between two points (rendered as line + label).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "First point" }
    b: { type: object, description: "Second point" }
    units: { type: string, description: "'kilometers' (default), 'miles', 'meters'" }
---

## When to use
Display the haversine distance between two locations.

## Example
```
turf_webmcp_widget_display({name: "turf-distance", params: {a: [2.35, 48.85], b: [-0.13, 51.5]}})
```
