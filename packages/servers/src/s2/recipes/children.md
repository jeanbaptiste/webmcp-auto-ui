---
widget: s2-children
description: Render the 4^depth descendants of a parent S2 cell at depth N.
group: s2
schema:
  type: object
  properties:
    cellId: { type: string, description: "Parent cell (token, decimal, or face/path)" }
    lat: { type: number, description: "Alt: derive parent from lat/lng + level" }
    lng: { type: number }
    level: { type: number, description: "Parent level when using lat/lng (default 8)" }
    depth: { type: number, description: "Levels below parent (default 1, max 4)" }
    style: { type: string }
---

## When to use
Visualize how a cell decomposes into 4 children (or 4^N descendants).

## Example
```
s2_webmcp_widget_display({name: "s2-children", params: { lat: 35.6762, lng: 139.6503, level: 8, depth: 2 }})
```
