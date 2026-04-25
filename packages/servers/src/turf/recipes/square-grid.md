---
widget: turf-square-grid
description: Generate a grid of square cells covering a bbox.
group: turf
schema:
  type: object
  required: [bbox, cellSide]
  properties:
    bbox: { type: array, items: { type: number }, description: "[w, s, e, n]" }
    cellSide: { type: number, description: "Side length of each cell" }
    units: { type: string, description: "'kilometers' (default)" }
---

## When to use
Spatial binning, gridded analyses.

## Example
```
turf_webmcp_widget_display({name: "turf-square-grid", params: {bbox: [-5, 40, 10, 52], cellSide: 100}})
```
