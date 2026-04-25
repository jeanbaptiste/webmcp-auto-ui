---
widget: turf-center-of-mass
description: Center of mass of a polygon (geometric centroid weighted by area).
group: turf
schema:
  type: object
  required: [feature]
  properties:
    feature: { type: object, description: "Polygon Feature or geometry" }
---

## When to use
True geometric centroid for irregular polygons (more accurate than vertex centroid).

## Example
```
turf_webmcp_widget_display({name: "turf-center-of-mass", params: {feature: {...polygon}}})
```
