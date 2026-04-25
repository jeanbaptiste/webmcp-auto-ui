---
widget: turf-random-point
description: Generate N random points within a bbox.
group: turf
schema:
  type: object
  required: [count, bbox]
  properties:
    count: { type: number, description: "Number of random points" }
    bbox: { type: array, items: { type: number }, description: "[w, s, e, n]" }
---

## When to use
Demo data, sampling, simulation seeds.

## Example
```
turf_webmcp_widget_display({name: "turf-random-point", params: {count: 100, bbox: [-10, 35, 30, 60]}})
```
