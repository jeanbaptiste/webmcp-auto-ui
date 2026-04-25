---
widget: turf-area
description: Compute the area of a polygon and display it on the map (km² or m²).
group: turf
schema:
  type: object
  required: [feature]
  properties:
    feature: { type: object, description: "Polygon Feature or geometry" }
---

## When to use
Visual surface measurement (region, plot, footprint).

## Example
```
turf_webmcp_widget_display({name: "turf-area", params: {feature: {...polygon}}})
```
