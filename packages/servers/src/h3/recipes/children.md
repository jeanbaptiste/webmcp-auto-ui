---
widget: h3-children
description: cellToChildren(parent, childRes) — show a parent hex and its child hexes
group: h3
schema:
  type: object
  properties:
    parent: { type: string, description: "Parent H3 index (alternative to lat/lng)" }
    lat: { type: number }
    lng: { type: number }
    parentResolution: { type: number, description: "Parent H3 resolution when using lat/lng (default 5)" }
    childResolution: { type: number, description: "Child resolution (default parent + 1)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
---

## When to use
Visualize H3 parent/child hierarchy: a coarse hex broken down into 7^n finer hexes.

## Example
```
h3_webmcp_widget_display({name: "h3-children", params: { lat: 37.7749, lng: -122.4194, parentResolution: 6, childResolution: 8 }})
```
