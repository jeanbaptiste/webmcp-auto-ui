---
widget: turf-along
description: Get a point along a LineString at a given distance from the start.
group: turf
schema:
  type: object
  required: [line, distance]
  properties:
    line: { type: object, description: "LineString Feature or geometry" }
    distance: { type: number, description: "Distance from start" }
    units: { type: string, description: "'kilometers' (default), 'miles', 'meters'" }
---

## When to use
Place a marker at distance N along a route (animations, milestones).

## Example
```
turf_webmcp_widget_display({name: "turf-along", params: {line: {...}, distance: 100, units: "kilometers"}})
```
