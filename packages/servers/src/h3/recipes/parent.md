---
widget: h3-parent
description: cellToParent(cell, resolution) — show a cell and its ancestor at coarser resolution
group: h3
schema:
  type: object
  properties:
    cell: { type: string, description: "H3 index of the child (alternative to lat/lng)" }
    lat: { type: number }
    lng: { type: number }
    resolution: { type: number, description: "Child H3 resolution when using lat/lng (default 9)" }
    parentResolution: { type: number, description: "Parent resolution (default child − 1)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
---

## When to use
Show how a fine-resolution hex sits inside its parent hex — useful for hierarchical aggregation visualizations.

## Example
```
h3_webmcp_widget_display({name: "h3-parent", params: { lat: 37.7749, lng: -122.4194, resolution: 9, parentResolution: 6 }})
```
