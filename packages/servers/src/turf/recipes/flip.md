---
widget: turf-flip
description: Swap longitude and latitude coordinates of a feature (visualize before/after).
group: turf
schema:
  type: object
  required: [feature]
  properties:
    feature: { type: object, description: "Any Feature or geometry" }
---

## When to use
Quickly fix lat/lng swap mistakes from external data sources.

## Example
```
turf_webmcp_widget_display({name: "turf-flip", params: {feature: {...}}})
```
