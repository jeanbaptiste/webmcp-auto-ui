---
widget: s2-level-compare
description: Same lat/lng shown as nested cells at multiple S2 levels (outline only).
group: s2
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number }
    lng: { type: number }
    levels: { type: array, description: "S2 levels to draw (default [4,6,8,10,12])" }
    style: { type: string }
---

## When to use
Illustrate the hierarchy: how cell size shrinks as level increases.

## Example
```
s2_webmcp_widget_display({name: "s2-level-compare", params: { lat: 37.7749, lng: -122.4194, levels: [3,5,7,9,11,13] }})
```
