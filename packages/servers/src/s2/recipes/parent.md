---
widget: s2-parent
description: Render the parent S2 cell at a target level, with the child highlighted inside.
group: s2
schema:
  type: object
  properties:
    cellId: { type: string, description: "Child cell (token, decimal, or face/path)" }
    lat: { type: number, description: "Alt: derive child from lat/lng + level" }
    lng: { type: number }
    level: { type: number, description: "Child level when using lat/lng (default 14)" }
    parentLevel: { type: number, description: "Target parent level (default level - 4)" }
    style: { type: string }
---

## When to use
Show the spatial extent of a cell's ancestor at a coarser level.

## Example
```
s2_webmcp_widget_display({name: "s2-parent", params: { lat: -33.8688, lng: 151.2093, level: 14, parentLevel: 8 }})
```
