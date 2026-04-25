---
widget: s2-grid
description: Grid of S2 cells around a center point, expanded N rings via allNeighbors.
group: s2
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number }
    lng: { type: number }
    level: { type: number, description: "S2 level (default 12)" }
    rings: { type: number, description: "BFS rings of allNeighbors (default 2, max 8)" }
    style: { type: string }
---

## When to use
Visualize a local neighborhood of S2 cells around a center.

## Example
```
s2_webmcp_widget_display({name: "s2-grid", params: { lat: 51.5074, lng: -0.1278, level: 12, rings: 3 }})
```
