---
widget: s2-from-points
description: Index points → S2 cells, color cells by point density (count per cell).
group: s2
schema:
  type: object
  required: [points]
  properties:
    points:
      type: array
      description: "Array of {lat, lng} (or [lng, lat] tuples)"
    level: { type: number, description: "S2 level for indexing (default 10)" }
    style: { type: string }
---

## When to use
Aggregate point datasets into S2 cells for choropleth-style density maps.

## Example
```
s2_webmcp_widget_display({name: "s2-from-points", params: { level: 9, points: [{lat: 48.85, lng: 2.35}, {lat: 48.86, lng: 2.36}] }})
```
