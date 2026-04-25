---
widget: s2-neighbors
description: Render an S2 cell + its allNeighbors at the same level (highlighting the center).
group: s2
schema:
  type: object
  properties:
    lat: { type: number }
    lng: { type: number }
    level: { type: number, description: "S2 level (default 12)" }
    cellId: { type: string, description: "Cell token / decimal / 'face/path' string (alt to lat+lng)" }
    style: { type: string }
---

## When to use
Inspect topology around a cell — which cells share an edge or vertex.

## Example
```
s2_webmcp_widget_display({name: "s2-neighbors", params: { lat: 40.7128, lng: -74.006, level: 12 }})
```
