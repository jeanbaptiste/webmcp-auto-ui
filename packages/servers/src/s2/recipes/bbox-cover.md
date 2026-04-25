---
widget: s2-bbox-cover
description: Cover a lat/lng bounding box with S2 cells via RegionCoverer.
group: s2
schema:
  type: object
  properties:
    bbox: { type: array, description: "[minLng, minLat, maxLng, maxLat]" }
    minLat: { type: number }
    maxLat: { type: number }
    minLng: { type: number }
    maxLng: { type: number }
    minLevel: { type: number, description: "default 4" }
    maxLevel: { type: number, description: "default 12" }
    maxCells: { type: number, description: "default 32" }
    style: { type: string }
---

## When to use
Generate an S2 cell covering for a rectangular AOI.

## Example
```
s2_webmcp_widget_display({name: "s2-bbox-cover", params: { bbox: [-74.05, 40.65, -73.85, 40.85], maxCells: 24 }})
```
