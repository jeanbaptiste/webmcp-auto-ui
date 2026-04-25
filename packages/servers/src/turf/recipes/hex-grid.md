---
widget: turf-hex-grid
description: Hexagonal grid covering a bbox.
group: turf
schema:
  type: object
  required: [bbox, cellSide]
  properties:
    bbox: { type: array, items: { type: number } }
    cellSide: { type: number }
    units: { type: string, description: "'kilometers' (default)" }
---

## When to use
Hexbinning for uniform-distance binning analyses.

## Example
```
turf_webmcp_widget_display({name: "turf-hex-grid", params: {bbox: [-5, 40, 10, 52], cellSide: 100}})
```
