---
widget: turf-clean-coords
description: Remove redundant collinear coordinates from a feature.
group: turf
schema:
  type: object
  required: [feature]
  properties:
    feature: { type: object, description: "Any Feature or geometry" }
---

## When to use
Clean up GeoJSON before storage or comparison — drops duplicate or colinear vertices.

## Example
```
turf_webmcp_widget_display({name: "turf-clean-coords", params: {feature: {...}}})
```
